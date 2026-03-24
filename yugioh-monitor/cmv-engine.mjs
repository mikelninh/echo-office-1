#!/usr/bin/env node
/**
 * CMV Engine — Current Market Value Algorithm
 *
 * Computes real-time fair market value for TCG cards using:
 *   - Grade-isolated sold comp pools (raw NM / PSA 10 / PSA 9 / PSA 8)
 *   - Recency-weighted median (30-day half-life exponential decay)
 *   - Winsorized outlier trimming (10th/90th percentile)
 *   - Confidence scoring (sample size × variance × recency)
 *   - Trend detection (RISING / STABLE / FALLING)
 *
 * Usage:
 *   import { computeCMV, detectSteals, CMV_CONFIDENCE } from './cmv-engine.mjs'
 *   node cmv-engine.mjs "Blue-Eyes White Dragon LOB 1st Edition"
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CMV_CACHE_FILE = join(__dirname, 'cmv-cache.json');

// ── Constants ─────────────────────────────────────────────────────────────────

export const CMV_CONFIDENCE = {
  HIGH:        { label: '🟢 HIGH',   minSamples: 6,  maxCVpct: 30 },
  MEDIUM:      { label: '🟡 MED',    minSamples: 3,  maxCVpct: 55 },
  LOW:         { label: '🔴 LOW',    minSamples: 1,  maxCVpct: 999 },
  INSUFFICIENT:{ label: '⚫ N/A',    minSamples: 0,  maxCVpct: 999 },
};

export const STEAL_TIERS = {
  HOLY_GRAIL:  { label: '🚨 HOLY GRAIL',    maxRatio: 0.35, minScore: 95 },
  OBVIOUS:     { label: '💀 OBVIOUS STEAL', maxRatio: 0.50, minScore: 88 },
  NO_BRAINER:  { label: '🔥 NO-BRAINER',    maxRatio: 0.62, minScore: 80 },
  FREE_WIN:    { label: '✅ FREE WIN',       maxRatio: 0.75, minScore: 70 },
  DEAL:        { label: '📈 DEAL',          maxRatio: 0.88, minScore: 55 },
  FAIR:        { label: '📍 FAIR',          maxRatio: 1.05, minScore: 0  },
};

const DECAY_HALFLIFE_DAYS = 30;   // recency weight half-life
const CMV_CACHE_TTL       = 12 * 60 * 60 * 1000; // 12h cache per card/grade
const MAX_COMPS           = 25;   // max sold listings to collect

// ── Chrome ────────────────────────────────────────────────────────────────────

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
  ];
  for (const p of paths) { try { execSync(`test -f "${p}"`); return p; } catch {} }
  return null;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function loadCache() {
  if (!existsSync(CMV_CACHE_FILE)) return {};
  try { return JSON.parse(readFileSync(CMV_CACHE_FILE, 'utf8')); } catch { return {}; }
}
function saveCache(data) {
  writeFileSync(CMV_CACHE_FILE, JSON.stringify(data, null, 2));
}
function cacheKey(query, grade) {
  return `${query.toLowerCase().replace(/\s+/g, '-').slice(0, 60)}::${grade}`;
}

// ── Scraper — Sold Listings with Dates ───────────────────────────────────────

async function scrapeSoldWithDates(browser, query, grade, minPrice, maxPrice) {
  /**
   * Scrape eBay sold listings for a specific grade.
   * Returns array of { price, date, title, url }
   *
   * Grade-specific search strategy:
   *   raw   → exclude all graded, add NM/near-mint qualifier
   *   psa10 → include PSA 10, add price floor (raw est × 1.5) to exclude lower grades
   *   psa9  → PSA 9 specific, price range to exclude PSA 10 bleeds
   *   psa8  → PSA 8 specific
   */

  const gradeQueries = {
    raw:   `${query} NM -PSA -BGS -CGC -graded -slab -played -HP -LP`,
    psa10: `${query} PSA 10`,
    psa9:  `${query} PSA 9`,
    psa8:  `${query} PSA 8`,
  };

  const q   = encodeURIComponent(gradeQueries[grade] ?? query);
  const min = minPrice ? `&_udlo=${Math.round(minPrice)}` : '';
  const max = maxPrice ? `&_udhi=${Math.round(maxPrice)}` : '';
  const url = `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60${min}${max}`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

    for (let i = 0; i < 3; i++) {
      const u = page.url();
      if (u.includes('challenge') || u.includes('Interruption')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      } else break;
    }

    await page.waitForSelector('.srp-results', { timeout: 15000 }).catch(() => {});

    const results = await page.evaluate((maxComps) => {
      const out = [];
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');

      for (const card of cards) {
        const titleEl  = card.querySelector('.s-card__title span[role=heading]') || card.querySelector('.s-card__title');
        const priceEl  = card.querySelector('.s-card__price');
        const dateEl   = card.querySelector('[class*="sold-date"], [class*="ended-date"], .POSITIVE, [class*="item-ended"]');
        const linkEl   = card.querySelector('a[href*="ebay"]');

        if (!titleEl || !priceEl) continue;

        let title = (titleEl.textContent || '').trim()
          .replace(/Opens in a new window.*$/i, '')
          .replace(/Wird in neuem Fenster.*$/i, '').trim();
        if (!title || title === 'Shop on eBay') continue;

        // Parse price
        const priceTxt = priceEl.textContent.trim();
        const m = priceTxt.match(/([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)/);
        if (!m) continue;
        let n = m[1];
        if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
        else n = n.replace(/,/g, '');
        const price = parseFloat(n);
        if (!price || price <= 0 || price > 999999) continue;

        // Parse date — eBay shows "Sold Dec 15, 2024" or just "Dec 15"
        let dateStr = dateEl?.textContent?.trim() || null;

        out.push({ price, date: dateStr, title: title.slice(0, 80), url: linkEl?.href?.split('?')[0] || null });
        if (out.length >= maxComps) break;
      }
      return out;
    }, MAX_COMPS);

    return results;
  } catch (e) {
    console.error(`  [cmv] scrape failed (${grade}): ${e.message?.slice(0, 70)}`);
    return [];
  } finally {
    await page.close();
  }
}

// ── Math ──────────────────────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // Try partial dates like "Dec 15" (assume current year, or last year if in future)
  try {
    const now = new Date();
    const d2 = new Date(`${dateStr} ${now.getFullYear()}`);
    if (!isNaN(d2.getTime())) {
      if (d2 > now) d2.setFullYear(now.getFullYear() - 1);
      return d2;
    }
  } catch {}
  return null;
}

function recencyWeight(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return 0.5; // unknown date → neutral weight
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: w = 2^(-age/halflife)
  return Math.pow(2, -ageDays / DECAY_HALFLIFE_DAYS);
}

function winsorize(arr, lo = 0.10, hi = 0.90) {
  if (arr.length < 4) return arr;
  const s   = [...arr].sort((a, b) => a - b);
  const low = s[Math.floor(s.length * lo)];
  const hig = s[Math.floor(s.length * hi)];
  return s.filter(v => v >= low && v <= hig);
}

function weightedMedian(sales) {
  /** Recency-weighted median across sold sales */
  if (!sales.length) return 0;

  const weighted = sales.map(s => ({
    price:  s.price,
    weight: recencyWeight(s.date),
  })).sort((a, b) => a.price - b.price);

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let   cum   = 0;
  for (const w of weighted) {
    cum += w.weight;
    if (cum >= total / 2) return Math.round(w.price);
  }
  return Math.round(weighted[weighted.length - 1].price);
}

function coefficientOfVariation(prices) {
  if (prices.length < 2) return 0;
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  return mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;
}

function detectTrend(sales) {
  /** Compare median of last 30d vs 30-90d to get direction */
  const now = Date.now();
  const d30 = 30 * 24 * 60 * 60 * 1000;
  const d90 = 90 * 24 * 60 * 60 * 1000;

  const recent = sales.filter(s => {
    const d = parseDate(s.date);
    return d && (now - d.getTime()) <= d30;
  });
  const older = sales.filter(s => {
    const d = parseDate(s.date);
    return d && (now - d.getTime()) > d30 && (now - d.getTime()) <= d90;
  });

  if (recent.length < 2 || older.length < 2) return 'STABLE';

  const recentMed = weightedMedian(recent);
  const olderMed  = weightedMedian(older);
  const changePct = olderMed > 0 ? ((recentMed - olderMed) / olderMed) * 100 : 0;

  if (changePct >= 12)  return `📈 RISING (+${Math.round(changePct)}% vs 30-90d)`;
  if (changePct <= -12) return `📉 FALLING (${Math.round(changePct)}% vs 30-90d)`;
  return `➡️  STABLE (${changePct >= 0 ? '+' : ''}${Math.round(changePct)}% vs 30-90d)`;
}

function getConfidenceLevel(sales, cmv) {
  if (!sales.length) return CMV_CONFIDENCE.INSUFFICIENT;
  const cv = coefficientOfVariation(sales.map(s => s.price));
  if (sales.length >= CMV_CONFIDENCE.HIGH.minSamples   && cv <= CMV_CONFIDENCE.HIGH.maxCVpct)   return CMV_CONFIDENCE.HIGH;
  if (sales.length >= CMV_CONFIDENCE.MEDIUM.minSamples && cv <= CMV_CONFIDENCE.MEDIUM.maxCVpct) return CMV_CONFIDENCE.MEDIUM;
  return CMV_CONFIDENCE.LOW;
}

// ── Core CMV Computation ──────────────────────────────────────────────────────

export async function computeCMV(browser, query, grade, opts = {}) {
  /**
   * Compute Current Market Value for a card at a specific grade.
   *
   * @param {object} browser - puppeteer browser
   * @param {string} query   - card name / eBay search string
   * @param {string} grade   - 'raw' | 'psa10' | 'psa9' | 'psa8'
   * @param {object} opts    - { minPrice, maxPrice, forceRefresh }
   * @returns {object}       - { cmv, confidence, trend, samples, min, max, grades }
   */
  const key   = cacheKey(query, grade);
  const cache = loadCache();

  if (!opts.forceRefresh && cache[key] && Date.now() - cache[key].cachedAt < CMV_CACHE_TTL) {
    return { ...cache[key].result, fromCache: true };
  }

  const raw = await scrapeSoldWithDates(browser, query, grade, opts.minPrice, opts.maxPrice);

  if (!raw.length) {
    return { cmv: null, confidence: CMV_CONFIDENCE.INSUFFICIENT, trend: 'UNKNOWN', samples: 0 };
  }

  // Filter by price range
  let sales = raw;
  if (opts.minPrice) sales = sales.filter(s => s.price >= opts.minPrice);
  if (opts.maxPrice) sales = sales.filter(s => s.price <= opts.maxPrice);

  // Winsorize to remove outliers
  const prices     = winsorize(sales.map(s => s.price));
  const cleanSales = sales.filter(s => prices.includes(s.price));

  if (!cleanSales.length) {
    return { cmv: null, confidence: CMV_CONFIDENCE.INSUFFICIENT, trend: 'UNKNOWN', samples: 0 };
  }

  const cmv        = weightedMedian(cleanSales);
  const confidence = getConfidenceLevel(cleanSales, cmv);
  const trend      = detectTrend(cleanSales);
  const cv         = Math.round(coefficientOfVariation(prices));

  const result = {
    cmv,
    confidence,
    trend,
    samples:    cleanSales.length,
    rawSamples: raw.length,
    min:        Math.round(Math.min(...prices)),
    max:        Math.round(Math.max(...prices)),
    cv,
    grade,
    query,
    computedAt: Date.now(),
    recentSales: cleanSales.slice(0, 5),
  };

  cache[key] = { result, cachedAt: Date.now() };
  saveCache(cache);

  return { ...result, fromCache: false };
}

// ── Steal Tier ────────────────────────────────────────────────────────────────

export function getStealTier(listingPrice, cmvRaw, cmvPsa10, gradingCost = 40) {
  /**
   * Determine steal tier for a raw listing vs CMV.
   *
   * Two perspectives:
   * 1. Raw steal: how cheap vs raw FMV?
   * 2. Grading play: how cheap vs PSA 10 FMV (including grade cost)?
   */
  const totalIn = listingPrice + gradingCost;

  // Primary: compare total cost (buy + grade) vs PSA 10 CMV
  const gradingRatio = cmvPsa10 > 0 ? totalIn / cmvPsa10 : 1;

  // Secondary: compare listing vs raw CMV
  const rawRatio     = cmvRaw > 0    ? listingPrice / cmvRaw : 1;

  // Use the better of the two ratios
  const ratio = Math.min(gradingRatio, rawRatio);

  for (const [, tier] of Object.entries(STEAL_TIERS)) {
    if (ratio <= tier.maxRatio) return { ...tier, ratio: Math.round(ratio * 100), gradingRatio: Math.round(gradingRatio * 100), rawRatio: Math.round(rawRatio * 100) };
  }
  return { ...STEAL_TIERS.FAIR, ratio: Math.round(ratio * 100), gradingRatio: Math.round(gradingRatio * 100), rawRatio: Math.round(rawRatio * 100) };
}

// ── Steal Score (composite) ───────────────────────────────────────────────────

export function computeStealScore({
  listingPrice,
  cmvRaw,
  cmvPsa10,
  cmvPsa9,
  cmvPsa8,
  gradingCost,
  gradeRate,
  confidence,
  tier,    // card tier S/A/B/C
}) {
  const totalIn     = listingPrice + gradingCost;
  const p9          = cmvPsa9  || Math.round(cmvPsa10 * 0.55);
  const p8          = cmvPsa8  || Math.round(cmvPsa10 * 0.25);
  const psa8Profit  = p8 - totalIn;
  const psa10Profit = cmvPsa10 - totalIn;
  const rawDiscount = cmvRaw > 0 ? 1 - (listingPrice / cmvRaw) : 0;

  // Weighted EV across grade outcomes
  const r10 = gradeRate;
  const r9  = Math.min(r10 * 1.8, 0.4);
  const r8  = Math.min(r10 * 1.2, 0.25);
  const r7  = Math.max(0, 1 - r10 - r9 - r8);
  const ev  = (cmvPsa10 * r10 + p9 * r9 + p8 * r8 + listingPrice * 0.8 * r7) - totalIn;
  const evROI = totalIn > 0 ? (ev / totalIn) * 100 : 0;

  let score = 0;

  // 1. PSA 8 safety floor (+35 max) — the most important signal
  if (psa8Profit > 500)       score += 35;
  else if (psa8Profit > 0)    score += 25;
  else if (psa8Profit > -200) score += 10; // nearly breaks even at PSA 8

  // 2. How far below raw CMV? (+25 max)
  if (rawDiscount >= 0.50)    score += 25;
  else if (rawDiscount >= 0.35) score += 20;
  else if (rawDiscount >= 0.20) score += 12;
  else if (rawDiscount >= 0.10) score += 6;

  // 3. Weighted EV ROI (+25 max)
  if (evROI >= 600)           score += 25;
  else if (evROI >= 300)      score += 18;
  else if (evROI >= 150)      score += 10;
  else if (evROI >= 80)       score += 4;

  // 4. Data confidence (+15 max)
  if (confidence?.label === CMV_CONFIDENCE.HIGH.label)   score += 15;
  else if (confidence?.label === CMV_CONFIDENCE.MEDIUM.label) score += 7;

  return Math.min(100, Math.round(score));
}

// ── Find Steals (Active Listings) ─────────────────────────────────────────────

async function scrapeActiveListings(browser, query, maxPrice) {
  const q   = encodeURIComponent(query);
  const url = `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=15&_udhi=${Math.round(maxPrice)}&_ipg=20`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    for (let i = 0; i < 3; i++) {
      const u = page.url();
      if (u.includes('challenge') || u.includes('Interruption')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      } else break;
    }
    await page.waitForSelector('.srp-results', { timeout: 12000 }).catch(() => {});

    return await page.evaluate((maxP) => {
      const out = [];
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');
      for (const card of cards) {
        const id      = card.getAttribute('data-listingid');
        const titleEl = card.querySelector('.s-card__title span[role=heading]') || card.querySelector('.s-card__title');
        const priceEl = card.querySelector('.s-card__price');
        if (!titleEl || !priceEl) continue;

        let title = (titleEl.textContent || '').trim()
          .replace(/Opens in a new window.*$/i, '').trim();
        if (!title || title === 'Shop on eBay') continue;

        const priceTxt = priceEl.textContent.trim();
        const m = priceTxt.match(/([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)/);
        if (!m) continue;
        let n = m[1];
        if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
        else n = n.replace(/,/g, '');
        const price = parseFloat(n);
        if (!price || price > maxP * 1.05) continue;

        out.push({ id, title, price, url: `https://www.ebay.com/itm/${id}` });
        if (out.length >= 8) break;
      }
      return out;
    }, maxPrice);
  } catch (e) {
    return [];
  } finally {
    await page.close();
  }
}

export async function detectSteals(browser, card, opts = {}) {
  /**
   * Full steal detection for a card:
   * 1. Compute CMV for raw / PSA10 / PSA9 / PSA8
   * 2. Search active raw listings
   * 3. Score each listing
   * 4. Return ranked steals
   */
  const { gradingCost = 40, gradeRate = 0.15, forceRefresh = false } = opts;

  console.log(`  Computing CMV: raw + PSA10/9/8...`);

  // Compute all grade CMVs in parallel would be nice but eBay rate limits — sequence them
  const rawCMV   = await computeCMV(browser, card.searchQuery, 'raw',   { minPrice: 20, forceRefresh });
  const psa10CMV = await computeCMV(browser, card.psa10Query,  'psa10', { minPrice: rawCMV.cmv ? rawCMV.cmv * 1.2 : 100, forceRefresh });
  const psa9CMV  = await computeCMV(browser, card.psa10Query.replace('PSA 10','PSA 9'), 'psa9', { minPrice: rawCMV.cmv ? rawCMV.cmv * 0.8 : 50, forceRefresh });
  const psa8CMV  = await computeCMV(browser, card.psa10Query.replace('PSA 10','PSA 8'), 'psa8', { minPrice: rawCMV.cmv ? rawCMV.cmv * 0.5 : 30, forceRefresh });

  console.log(`  CMV → raw: ${rawCMV.cmv ? '€'+rawCMV.cmv : 'N/A'} (${rawCMV.confidence?.label}) | PSA10: ${psa10CMV.cmv ? '€'+psa10CMV.cmv : 'N/A'} | PSA9: ${psa9CMV.cmv ? '€'+psa9CMV.cmv : 'N/A'} | PSA8: ${psa8CMV.cmv ? '€'+psa8CMV.cmv : 'N/A'}`);

  if (!rawCMV.cmv || !psa10CMV.cmv) {
    console.log(`  Insufficient CMV data — skipping steal detection`);
    return { steals: [], cmv: { raw: rawCMV, psa10: psa10CMV, psa9: psa9CMV, psa8: psa8CMV } };
  }

  // Search active listings at ≤65% of PSA10 CMV (generous net to catch edge cases)
  const searchMax = psa10CMV.cmv * 0.65;
  console.log(`  Searching active listings ≤ €${Math.round(searchMax)} (65% of PSA10 CMV €${psa10CMV.cmv})`);
  const listings  = await scrapeActiveListings(browser, card.searchQuery, searchMax);
  console.log(`  Found ${listings.length} active listings`);

  const steals = [];
  for (const listing of listings) {
    const score = computeStealScore({
      listingPrice: listing.price,
      cmvRaw:       rawCMV.cmv,
      cmvPsa10:     psa10CMV.cmv,
      cmvPsa9:      psa9CMV.cmv,
      cmvPsa8:      psa8CMV.cmv,
      gradingCost,
      gradeRate,
      confidence:   psa10CMV.confidence,
      tier:         card.tier,
    });

    const stealTier = getStealTier(listing.price, rawCMV.cmv, psa10CMV.cmv, gradingCost);

    steals.push({
      listing,
      score,
      stealTier,
      cmv: { raw: rawCMV.cmv, psa10: psa10CMV.cmv, psa9: psa9CMV.cmv || null, psa8: psa8CMV.cmv || null },
      trend: psa10CMV.trend,
    });
  }

  // Sort by score desc
  steals.sort((a, b) => b.score - a.score);

  return {
    steals,
    cmv: { raw: rawCMV, psa10: psa10CMV, psa9: psa9CMV, psa8: psa8CMV },
  };
}

// ── Format CMV Report ─────────────────────────────────────────────────────────

export function formatCMVReport(card, cmvData, steals = []) {
  const { raw, psa10, psa9, psa8 } = cmvData;
  const f = n => n ? `€${Math.round(n).toLocaleString('de-DE')}` : 'N/A';

  const lines = [
    `📊 CMV Report — ${card.cardName}`,
    ``,
    `Grade      CMV        Confidence    Trend`,
    `Raw NM:    ${f(raw.cmv).padEnd(10)} ${(raw.confidence?.label||'?').padEnd(14)} ${raw.trend||'?'}`,
    `PSA  8:    ${f(psa8.cmv).padEnd(10)} ${(psa8.confidence?.label||'?').padEnd(14)} ${psa8.samples||0} comps`,
    `PSA  9:    ${f(psa9.cmv).padEnd(10)} ${(psa9.confidence?.label||'?').padEnd(14)} ${psa9.samples||0} comps`,
    `PSA 10:    ${f(psa10.cmv).padEnd(10)} ${(psa10.confidence?.label||'?').padEnd(14)} ${psa10.trend||'?'}`,
  ];

  if (psa10.cmv && raw.cmv) {
    const mult = Math.round((psa10.cmv / raw.cmv) * 10) / 10;
    lines.push(``, `PSA 10 / Raw multiplier: ${mult}×`);
    if (psa10.cmv && psa8.cmv) {
      const gradCost = card.gradingCost ?? 40;
      const p8safe   = psa8.cmv - raw.cmv - gradCost > 0;
      lines.push(`PSA 8 safe floor: ${p8safe ? '✅ YES (PSA 8 still profitable)' : '⚠️  NO (need PSA 9+ to profit)'}`);
    }
  }

  if (steals.length) {
    lines.push(``, `── ACTIVE STEALS ──────────────────`);
    for (const s of steals.slice(0, 3)) {
      lines.push(`${s.stealTier.label}  [${s.score}/100]`);
      lines.push(`  Listed: ${f(s.listing.price)} (${s.stealTier.ratio}% of PSA10 CMV)`);
      lines.push(`  ${s.listing.url}`);
    }
  } else {
    lines.push(``, `No active steals found at current CMV threshold.`);
  }

  return lines.join('\n');
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cardName = process.argv.slice(2).join(' ') || 'Blue-Eyes White Dragon LOB 1st Edition';

  const chromePath = findChrome();
  if (!chromePath) { console.error('Chrome not found'); process.exit(1); }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox'],
  });

  try {
    // Build a minimal card object for the CLI
    const card = {
      cardName,
      searchQuery: `${cardName} -PSA -BGS -CGC -graded -slab`,
      psa10Query:  `${cardName} PSA 10`,
      gradingCost: 50,
      tier: 'A',
    };

    console.log(`\n🔍 CMV Engine — "${cardName}"\n`);
    const { steals, cmv } = await detectSteals(browser, card, { gradeRate: 0.12 });
    console.log('\n' + formatCMVReport(card, cmv, steals));

    if (steals.length) {
      console.log('\n── TOP STEAL DETAIL ──');
      const top = steals[0];
      console.log(`Score: ${top.score}/100 | Tier: ${top.stealTier.label}`);
      console.log(`Listed: €${top.listing.price} | Raw CMV: €${cmv.raw.cmv} | PSA10 CMV: €${cmv.psa10.cmv}`);
      console.log(`Trend: ${top.trend}`);
    }
  } finally {
    await browser.close();
  }
}
