#!/usr/bin/env node
/**
 * Grade Advisor — Should I slab this card?
 *
 * Fetches raw NM sold comps + PSA 10 sold comps from eBay,
 * runs the grading math, and gives a clear GO / NO-GO verdict.
 *
 * Usage:
 *   node grade-advisor.mjs "Blue-Eyes White Dragon 1st Edition LOB"
 *   node grade-advisor.mjs "Luffy OP-05 Manga Alt Art" --grading-cost 35
 *   node grade-advisor.mjs "Charizard Base Set 1st Edition" --grading-cost 50 --min-raw 200
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getSoldComps } from './sold-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_GRADING_COST = 30;   // € PSA bulk tier (economy ~€20, regular ~€50)
const DEFAULT_MIN_MULTIPLIER = 2.5; // PSA10 must be ≥2.5× raw to be worth it
const DEFAULT_MIN_RAW = 30;        // don't bother under €30 raw value

// ── Helpers ──────────────────────────────────────────────────────────────────

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
  ];
  for (const p of paths) {
    try { execSync(`test -f "${p}"`); return p; } catch {}
  }
  return null;
}

function fmt(n) {
  return `€${Math.round(n).toLocaleString('de-DE')}`;
}

function verdict(profit, multiplier, rawPrice, psa10Price) {
  if (rawPrice < DEFAULT_MIN_RAW) {
    return { label: '🚫 SKIP', reason: `Raw value too low (${fmt(rawPrice)}) — grading cost eats the profit` };
  }
  if (multiplier < 1.5) {
    return { label: '🚫 SKIP', reason: `PSA10 only ${multiplier.toFixed(1)}× raw — not enough premium to justify slabbing` };
  }
  if (multiplier < 2.0) {
    return { label: '⚠️  MARGINAL', reason: `${multiplier.toFixed(1)}× multiplier is thin. Only grade if card is genuine NM/M and you have bulk pricing` };
  }
  if (multiplier < 3.0) {
    return { label: '✅ WORTH IT', reason: `${multiplier.toFixed(1)}× multiplier — solid upside (${fmt(profit)} profit after grading)` };
  }
  return { label: '🔥 STRONG BUY', reason: `${multiplier.toFixed(1)}× multiplier — excellent arb. Grade ASAP (${fmt(profit)} profit after grading)` };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function scrapeEbaySoldDirect(browser, query, minPrice = 30) {
  /** Scrape eBay sold listings using proven monitor.mjs selector pattern */
  const q = encodeURIComponent(query);
  const url = `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`;
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Handle captcha redirect
    for (let attempt = 0; attempt < 3; attempt++) {
      const currentUrl = page.url();
      if (currentUrl.includes('splashui/challenge') || currentUrl.includes('Interruption')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      } else break;
    }

    await page.waitForSelector('.srp-results', { timeout: 15000 }).catch(() => {});

    const prices = await page.evaluate((minP) => {
      const results = [];
      // Use proven selector from monitor.mjs
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');
      for (const card of cards) {
        const titleEl = card.querySelector('.s-card__title span[role=heading]') || card.querySelector('.s-card__title');
        const priceEl = card.querySelector('.s-card__price');
        if (!titleEl || !priceEl) continue;
        const titleTxt = titleEl.textContent.trim();
        if (!titleTxt || titleTxt === 'Shop on eBay') continue;
        // Parse price text like "$1,234.56" or "€2.345,67"
        const priceTxt = priceEl.textContent.trim();
        const m = priceTxt.match(/([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)/);
        if (!m) continue;
        let numStr = m[1];
        // EU format: "1.234,56"
        if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(numStr)) {
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
          numStr = numStr.replace(/,/g, '');
        }
        const parsed = parseFloat(numStr);
        if (parsed >= minP && parsed < 500000) results.push(parsed);
        if (results.length >= 12) break;
      }
      return results;
    }, minPrice);

    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const trim = prices.length >= 6 ? Math.floor(prices.length * 0.1) : 0;
    const filtered = sorted.slice(trim, sorted.length - trim);
    const med = filtered.length % 2
      ? filtered[Math.floor(filtered.length / 2)]
      : (filtered[Math.floor(filtered.length / 2) - 1] + filtered[Math.floor(filtered.length / 2)]) / 2;
    return { median: Math.round(med), min: Math.round(filtered[0]), max: Math.round(filtered[filtered.length - 1]), count: filtered.length };
  } catch (e) {
    console.error(`  [grade-advisor] scrape failed for "${query}": ${e.message?.slice(0, 80)}`);
    return null;
  } finally {
    await page.close();
  }
}

async function advise(cardName, opts = {}) {
  const gradingCost = opts.gradingCost ?? DEFAULT_GRADING_COST;
  const minRaw = opts.minRaw ?? DEFAULT_MIN_RAW;

  const chromePath = findChrome();
  if (!chromePath) throw new Error('Chrome not found — needed for eBay scraping');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  console.log(`\n🔍 Grading Advisor — "${cardName}"\n${'─'.repeat(50)}`);

  try {
    // 1. Raw NM comps — exclude graded cards
    console.log('📦 Fetching raw sold comps...');
    const rawQuery = `${cardName} -PSA -BGS -CGC -ACE -graded -slab`;
    const rawComps = await scrapeEbaySoldDirect(browser, rawQuery, minRaw);

    if (!rawComps || rawComps.count < 2) {
      console.log(`⚠️  Not enough raw sold data (found ${rawComps?.count ?? 0} comps). Try a more specific search.`);
      return null;
    }

    // 2. PSA 10 comps — specifically graded PSA 10
    const psa10Query = `${cardName} PSA 10`;
    console.log('🏆 Fetching PSA 10 sold comps...');
    const psa10Comps = await scrapeEbaySoldDirect(browser, psa10Query, minRaw);

    if (!psa10Comps || psa10Comps.count < 2) {
      console.log(`⚠️  Not enough PSA 10 sold data (found ${psa10Comps?.count ?? 0} comps).`);
      console.log(`    Try: node grade-advisor.mjs "${cardName} Holo" or add set name`);
      return null;
    }

    // 3. Math
    const rawPrice  = rawComps.median;
    const psa10Price = psa10Comps.median;
    const profit    = psa10Price - rawPrice - gradingCost;
    const roi       = ((profit / (rawPrice + gradingCost)) * 100).toFixed(0);
    const multiplier = psa10Price / rawPrice;

    const { label, reason } = verdict(profit, multiplier, rawPrice, psa10Price);

    // 4. Output
    console.log(`
┌─────────────────────────────────────────────┐
│  ${label.padEnd(43)}│
├─────────────────────────────────────────────┤
│  Card:        ${cardName.slice(0, 31).padEnd(31)}│
│  Raw median:  ${fmt(rawPrice).padEnd(31)}│
│  PSA 10 med:  ${fmt(psa10Price).padEnd(31)}│
│  Multiplier:  ${`${multiplier.toFixed(1)}×`.padEnd(31)}│
│  Grading:     ${fmt(gradingCost).padEnd(31)}│
│  Net profit:  ${fmt(profit).padEnd(31)}│
│  ROI:         ${`${roi}%`.padEnd(31)}│
├─────────────────────────────────────────────┤
│  ${reason.slice(0, 45).padEnd(45)}│
└─────────────────────────────────────────────┘`);

    console.log(`\n📊 Raw comps (${rawComps.count} sales): ${fmt(rawComps.min)} – ${fmt(rawComps.max)}`);
    console.log(`📊 PSA 10 comps (${psa10Comps.count} sales): ${fmt(psa10Comps.min)} – ${fmt(psa10Comps.max)}`);

    // Grade risk hint
    const gradeRisks = await import('./grade-risks.json', { assert: { type: 'json' } })
      .then(m => m.default).catch(() => null);
    if (gradeRisks) {
      const match = Object.entries(gradeRisks).find(([key]) =>
        cardName.toLowerCase().includes(key.toLowerCase())
      );
      if (match) {
        const risk = match[1];
        console.log(`\n⚠️  Grade Risk (${risk.level}): ${risk.tips?.[0] || ''}`);
      }
    }

    return { rawPrice, psa10Price, profit, roi: Number(roi), multiplier, label };

  } finally {
    await browser.close();
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('Usage: node grade-advisor.mjs "Card Name" [--grading-cost 35] [--min-raw 50]');
    process.exit(1);
  }

  // Parse flags: --grading-cost 35, --min-raw 50
  const flagArgs = new Set();
  let gradingCost = DEFAULT_GRADING_COST;
  let minRaw = DEFAULT_MIN_RAW;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--grading-cost' && args[i + 1]) { gradingCost = Number(args[i + 1]); flagArgs.add(i); flagArgs.add(i + 1); i++; }
    else if (args[i] === '--min-raw' && args[i + 1]) { minRaw = Number(args[i + 1]); flagArgs.add(i); flagArgs.add(i + 1); i++; }
  }
  const cardName = args.filter((_, i) => !flagArgs.has(i) && !args[i].startsWith('--')).join(' ');

  advise(cardName, { gradingCost, minRaw })
    .then(() => process.exit(0))
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

export { advise };
