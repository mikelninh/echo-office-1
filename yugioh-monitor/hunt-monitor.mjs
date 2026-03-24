#!/usr/bin/env node
/**
 * Hunt Monitor — Daily grading arb scanner
 *
 * Searches eBay for raw ungraded copies of 105 curated cards across 7 TCGs.
 * For each listing below the raw estimate threshold, calculates grading ROI
 * and sends a tiered alert.
 *
 * Usage:
 *   node hunt-monitor.mjs              — full scan (all tiers)
 *   node hunt-monitor.mjs --tier S     — S-tier only
 *   node hunt-monitor.mjs --game Pokemon — one game only
 *   node hunt-monitor.mjs --dry-run    — no alerts, just log
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { calcEV, GRADE_RATE_ESTIMATES, estimateGradeRate } from './ev-calculator.mjs';
import { computeCMV, detectSteals, computeStealScore, getStealTier, CMV_CONFIDENCE } from './cmv-engine.mjs';
import { enqueueAlert } from './free-alert-queue.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HUNT_LIST_FILE  = join(__dirname, 'hunt-list.json');
const HUNT_CACHE_FILE = join(__dirname, 'hunt-cache.json');
const HUNT_LOG_FILE   = join(__dirname, 'hunt-log.json');

// ── Config ───────────────────────────────────────────────────────────────────

const DEAL_THRESHOLD     = 0.55; // listing must be ≤55% of PSA10 FMV — genuine mispricing only
const COMP_CACHE_TTL     = 8 * 60 * 60 * 1000; // 8h
const MAX_CARDS_PER_RUN  = 40;
const TELEGRAM_CHAT_ID        = '938367498';              // Mikel DM — always gets alerts
const TELEGRAM_CHANNEL_PAID  = process.env.TELEGRAM_CHANNEL_PAID  || '-1003702806533'; // Private paid channel (@CardSniperAlpha once set private)
const TELEGRAM_CHANNEL_FREE  = process.env.TELEGRAM_CHANNEL_FREE  || '';               // Optional free/public teaser channel
const TELEGRAM_BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN || '8675912510:AAFwKtU2WoheIrjtGUHa8gpZRH2AQ2Pkzt8';
const FREE_ALERT_DELAY_HOURS = 48; // Free channel gets alerts 48h delayed
const MIN_STEAL_SCORE    = 80;   // composite score gate — only holy grail steals fire
const MIN_NET_PROFIT     = 1500; // hard floor: €1,500 net after grading
const RECENCY_DAYS_PRIME = 30;   // weight last 30d comps 3× in FMV

// Confidence thresholds
const CONF = {
  HIGH:   { minComps: 5, maxVariancePct: 25, label: '🟢 HIGH' },
  MEDIUM: { minComps: 3, maxVariancePct: 50, label: '🟡 MED'  },
  LOW:    { minComps: 1, maxVariancePct: 999, label: '🔴 LOW'  },
};

// Tier emoji map
const TIER_EMOJI = { S: '👑', A: '💎', B: '📈', C: '🎯' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
  ];
  for (const p of paths) { try { execSync(`test -f "${p}"`); return p; } catch {} }
  return null;
}

function loadJSON(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function fmt(n, currency = '€') {
  if (n == null) return '?';
  return `${currency}${Math.round(n).toLocaleString('de-DE')}`;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function getConfidence(comps, expectedPrice) {
  if (!comps || comps.length === 0) return CONF.LOW;
  const variancePct = expectedPrice > 0 ? (stddev(comps) / expectedPrice) * 100 : 999;
  if (comps.length >= CONF.HIGH.minComps && variancePct <= CONF.HIGH.maxVariancePct) return CONF.HIGH;
  if (comps.length >= CONF.MEDIUM.minComps && variancePct <= CONF.MEDIUM.maxVariancePct) return CONF.MEDIUM;
  return CONF.LOW;
}

// ── eBay Scraper ─────────────────────────────────────────────────────────────

async function scrapeEbayListings(browser, query, maxPrice, minPrice = 30) {
  /** Search ACTIVE (not sold) raw eBay listings under maxPrice */
  const q = encodeURIComponent(query);
  const maxP = Math.round(maxPrice);
  const url = `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=15&_udhi=${maxP}&_ipg=20`; // _sop=15 = time ending soonest

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Handle captcha
    for (let i = 0; i < 3; i++) {
      if (page.url().includes('challenge') || page.url().includes('Interruption')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      } else break;
    }

    await page.waitForSelector('.srp-results', { timeout: 12000 }).catch(() => {});

    const listings = await page.evaluate((minP, maxP) => {
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');
      const results = [];
      for (const card of cards) {
        const id       = card.getAttribute('data-listingid');
        const titleEl  = card.querySelector('.s-card__title span[role=heading]') || card.querySelector('.s-card__title');
        const priceEl  = card.querySelector('.s-card__price');
        const linkEl   = card.querySelector('a[href*="ebay"]');
        if (!id || !titleEl || !priceEl) continue;

        let title = titleEl.textContent.trim()
          .replace(/Opens in a new window or\s*tab?/i, '')
          .replace(/Wird in neuem Fenster.*geöffnet/i, '').trim();
        if (!title || title === 'Shop on eBay') continue;

        const priceTxt = priceEl.textContent.trim();
        const m = priceTxt.match(/([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)/);
        if (!m) continue;
        let numStr = m[1];
        if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(numStr)) {
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
          numStr = numStr.replace(/,/g, '');
        }
        const price = parseFloat(numStr);
        if (!price || price < minP || price > maxP * 1.05) continue;

        results.push({
          id, title, price,
          url: `https://www.ebay.com/itm/${id}`,
        });
        if (results.length >= 5) break;
      }
      return results;
    }, minPrice, maxPrice);

    return listings;
  } catch (e) {
    console.error(`  [hunt] listing scrape failed for "${query}": ${e.message?.slice(0, 60)}`);
    return [];
  } finally {
    await page.close();
  }
}

async function scrapeSoldComps(browser, query, minPrice = 30) {
  /** Fetch sold comps for grading ROI calc */
  const q   = encodeURIComponent(query);
  const url = `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=40`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    for (let i = 0; i < 3; i++) {
      if (page.url().includes('challenge') || page.url().includes('Interruption')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      } else break;
    }
    await page.waitForSelector('.srp-results', { timeout: 12000 }).catch(() => {});

    const prices = await page.evaluate((minP) => {
      const results = [];
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');
      for (const card of cards) {
        const priceEl = card.querySelector('.s-card__price');
        if (!priceEl) continue;
        const txt = priceEl.textContent.trim();
        const m = txt.match(/([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)/);
        if (!m) continue;
        let n = m[1];
        if (/\d{1,3}(?:\.\d{3})+,\d{2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
        else n = n.replace(/,/g, '');
        const p = parseFloat(n);
        if (p >= minP && p < 500000) results.push(p);
        if (results.length >= 15) break;
      }
      return results;
    }, minPrice);

    return prices;
  } catch (e) {
    return [];
  } finally {
    await page.close();
  }
}

// ── Steal Score ───────────────────────────────────────────────────────────────
// 80+ = alert fires. Below 80 = silence. No exceptions.

function calcStealScore({ buyPrice, gradingCost, psa10Median, psa8Profitable, evRoi, highConfidence, tier }) {
  let score = 0;

  // Is PSA 8 still profitable? The ultimate safety net. (+35)
  if (psa8Profitable) score += 35;

  // How mispriced vs PSA 10 FMV? (+30 max)
  const pctOfFMV = psa10Median > 0 ? (buyPrice + gradingCost) / psa10Median : 1;
  if (pctOfFMV <= 0.15)      score += 30; // paying <15% of PSA10 value — insane
  else if (pctOfFMV <= 0.25) score += 25;
  else if (pctOfFMV <= 0.40) score += 18;
  else if (pctOfFMV <= 0.55) score += 10;

  // Weighted EV return quality (+20 max)
  if (evRoi >= 800)      score += 20;
  else if (evRoi >= 400) score += 14;
  else if (evRoi >= 200) score += 8;

  // Data confidence (+15)
  if (highConfidence) score += 15;

  return Math.min(100, score);
}

// ── Grade Rate Lookup ─────────────────────────────────────────────────────────

function getGradeRate(card) {
  // Map hunt list cards to grade rate estimates by era/game
  const name  = card.cardName.toLowerCase();
  const game  = card.game.toLowerCase();

  if (game.includes('yu-gi-oh') || game.includes('yugioh')) {
    if (name.includes('lob') || name.includes('legend of blue eyes')) return GRADE_RATE_ESTIMATES['yugioh-1st-ed-lob'];
    if (name.includes('mrd') || name.includes('mrl') || name.includes('psv')) return GRADE_RATE_ESTIMATES['yugioh-1st-ed-mrd'];
    return GRADE_RATE_ESTIMATES['yugioh-modern'];
  }
  if (game.includes('pokemon') || game.includes('pokémon')) {
    if (name.includes('1st edition') && (name.includes('base set') || name.includes('fossil') || name.includes('jungle'))) return GRADE_RATE_ESTIMATES['pokemon-1st-ed-base'];
    if (name.includes('shadowless')) return GRADE_RATE_ESTIMATES['pokemon-shadowless'];
    if (name.includes('unlimited') || name.includes('base set')) return GRADE_RATE_ESTIMATES['pokemon-unlimited'];
    return GRADE_RATE_ESTIMATES['pokemon-modern'];
  }
  if (game.includes('one piece')) {
    if (name.includes('op01') || name.includes('op-01')) return GRADE_RATE_ESTIMATES['onepiece-op01'];
    return GRADE_RATE_ESTIMATES['onepiece-op02'];
  }
  return GRADE_RATE_ESTIMATES['default'];
}

// ── Break-Even Grade ──────────────────────────────────────────────────────────

function getBreakEvenGrade(totalCost, psa10, psa9, psa8) {
  // Which grade do you need to at least break even?
  if (psa8 >= totalCost) return { grade: 8, safe: true,  msg: '✅ PSA 8 still profitable — low-risk play' };
  if (psa9 >= totalCost) return { grade: 9, safe: false, msg: '⚠️  Need PSA 9 or better to profit' };
  if (psa10 >= totalCost) return { grade: 10, safe: false, msg: '🎯 Must hit PSA 10 — high variance play' };
  return { grade: null, safe: false, msg: '🔴 No grade covers costs — skip' };
}

// ── Alert Formatter ──────────────────────────────────────────────────────────

function getAction(card, roi) {
  const horizon = card.holdHorizon ?? '';
  const isLongTerm  = horizon.includes('5-') || horizon.includes('7-') || horizon.includes('10+');
  const isShortTerm = horizon.startsWith('1-') || horizon.startsWith('2-');

  if (card.tier === 'S')                     return { label: '🏦 HOLD LONG',     detail: `Blue chip. Slab and hold ${horizon}. Do not sell early — these only go up.` };
  if (card.tier === 'A' && isLongTerm)       return { label: '🏦 HOLD',          detail: `Strong long-term hold. Let appreciation work for ${horizon}.` };
  if (roi >= 500 && isShortTerm)             return { label: '⚡ FLIP FAST',     detail: `Exceptional ROI. List PSA 10 within 3 months of receiving slab.` };
  if (roi >= 300)                            return { label: '📈 FLIP OR HOLD',  detail: `Strong ROI. Flip for liquidity or hold ${horizon} for bigger exit.` };
  return                                            { label: '📦 HOLD',          detail: `Grade and hold. Best exit at ${horizon}.` };
}

function getLongTermProjection(card, psa10Median) {
  // Historical PSA 10 appreciation by tier (conservative estimates)
  const projections = {
    S: { multiplier: 4.0, years: 10, basis: 'Blue chips historically 3-5× per decade (Charizard 1st Ed: ~20× in 10yr)' },
    A: { multiplier: 2.5, years:  7, basis: 'Strong IPs typically 2-3× over hold horizon' },
    B: { multiplier: 1.8, years:  4, basis: 'Mid-tier appreciation ~1.5-2× over medium hold' },
    C: { multiplier: 1.3, years:  2, basis: 'Speculative — sell on catalyst, don\'t over-hold' },
  };
  const p = projections[card.tier] ?? projections.C;
  const projectedValue = Math.round(psa10Median * p.multiplier);
  return { ...p, projectedValue };
}

function buildAlert(card, listing, psa10Median, psa9Median, psa8Median, rawComps, confidence, stealScore) {
  const buyPrice    = listing.price;
  const gradingCost = card.gradingCost ?? 40;
  const totalCost   = buyPrice + gradingCost;
  const gradeRate   = getGradeRate(card);

  // ── Full EV engine ────────────────────────────────────────────────
  const evResult = calcEV({
    rawPrice:        buyPrice,
    psa10SoldMedian: psa10Median,
    psa9SoldMedian:  psa9Median || null,
    psa8SoldMedian:  psa8Median || null,
    gradeRate,
    gradingTier: gradingCost <= 30 ? 'economy' : gradingCost <= 60 ? 'regular' : 'express',
    popRisk: 'UNKNOWN',
  });

  const g = evResult.grades;

  // ── Price outcomes ────────────────────────────────────────────────
  const p9  = psa9Median || Math.round(psa10Median * 0.55);
  const p8  = psa8Median || Math.round(psa10Median * 0.25);
  const p7  = Math.round(buyPrice * 0.80);
  const beg = getBreakEvenGrade(totalCost, psa10Median, p9, p8);

  // ── Short & long term ────────────────────────────────────────────
  const shortProfit = psa10Median - totalCost;
  const shortROI    = Math.round((shortProfit / totalCost) * 100);
  const moneyMult   = Math.round((psa10Median / totalCost) * 10) / 10;
  const lt          = getLongTermProjection(card, psa10Median);
  const longProfit  = lt.projectedValue - totalCost;
  const longROI     = Math.round((longProfit / totalCost) * 100);

  // ── Steal framing ─────────────────────────────────────────────────
  const pctOfFMV    = Math.round((totalCost / psa10Median) * 100);
  const tierEmoji   = TIER_EMOJI[card.tier] ?? '📌';
  const action      = getAction(card, shortROI);

  // Steal score label
  const stealLabel  = stealScore >= 95 ? '🚨 HOLY GRAIL'
    : stealScore >= 88                 ? '💀 OBVIOUS STEAL'
    : stealScore >= 80                 ? '🔥 NO-BRAINER'
    :                                    '✅ STRONG PLAY';

  const lines = [
    `${stealLabel}  [${stealScore}/100]`,
    `${tierEmoji} ${card.tier}-TIER | ${card.game}`,
    ``,
    `${card.cardName}`,
    ``,
    `Someone listed this for ${fmt(buyPrice)}.`,
    `PSA 10 sells for ${fmt(psa10Median)}.`,
    `You're buying at ${pctOfFMV}% of graded value.`,
    ``,
    `🔗 ${listing.url}`,
    ``,
    `── THE MATH ─────────────────────`,
    `Buy raw:    ${fmt(buyPrice)}`,
    `Grade (PSA): ${fmt(gradingCost)}`,
    `All in:     ${fmt(totalCost)}`,
    ``,
    `── WHAT COMES BACK ──────────────`,
    `PSA 10  ${String(g.psa10.rate+'%').padEnd(5)} → ${fmt(psa10Median).padEnd(10)} profit ${fmt(shortProfit)}`,
    `PSA  9  ${String(g.psa9.rate+'%').padEnd(5)} → ${fmt(p9).padEnd(10)} profit ${fmt(p9 - totalCost)}`,
    `PSA  8  ${String(g.psa8.rate+'%').padEnd(5)} → ${fmt(p8).padEnd(10)} profit ${fmt(p8 - totalCost)}`,
    `PSA ≤7  ${String(g.low.rate+'%').padEnd(5)} → ${fmt(p7).padEnd(10)} (sell back raw)`,
    ``,
    `Expected value: ${fmt(evResult.ev)}  (${evResult.roi}% weighted ROI)`,
    `${beg.msg}`,
    ``,
    `── IF YOU GRADE PSA 10 ──────────`,
    `Flip now:    ${fmt(shortProfit)}  (${shortROI}% ROI, ${moneyMult}× your money)`,
    `Hold ${lt.years} yrs:  ${fmt(longProfit)}  (${lt.multiplier}× today's price)`,
    ``,
    `── VERDICT ──────────────────────`,
    `${action.label} — ${action.detail}`,
  ];

  if (card.notes) lines.push(``, `📌 ${card.notes}`);
  lines.push(``, `Confidence: ${confidence.label} (${rawComps?.length ?? 0} comps) | Hold: ${card.holdHorizon}`);

  return lines.join('\n');
}

// ── Main Scanner ─────────────────────────────────────────────────────────────

async function runHuntMonitor(opts = {}) {
  const { tier, game, dryRun } = opts;

  // Load hunt list
  let huntList;
  try {
    const raw = readFileSync(HUNT_LIST_FILE, 'utf8')
      .replace(/\/\/[^\n]*/g, ''); // strip JS comments
    huntList = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load hunt-list.json:', e.message);
    process.exit(1);
  }

  let cards = huntList.cards;
  if (tier)  cards = cards.filter(c => c.tier === tier);
  if (game)  cards = cards.filter(c => c.game.toLowerCase().includes(game.toLowerCase()));

  // Prioritise: S > A > B > C, then shuffle within tier
  const tierOrder = { S: 0, A: 1, B: 2, C: 3 };
  cards.sort((a, b) => {
    const td = tierOrder[a.tier] - tierOrder[b.tier];
    if (td !== 0) return td;
    return Math.random() - 0.5;
  });

  // Cap per run to avoid timeout
  cards = cards.slice(0, MAX_CARDS_PER_RUN);

  console.log(`\n🎯 Hunt Monitor — scanning ${cards.length} cards`);
  if (tier) console.log(`   Filter: Tier ${tier}`);
  if (game) console.log(`   Filter: Game ${game}`);
  console.log('─'.repeat(50));

  const chromePath = findChrome();
  if (!chromePath) { console.error('Chrome not found'); process.exit(1); }

  let browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const cache    = loadJSON(HUNT_CACHE_FILE);
  const log      = loadJSON(HUNT_LOG_FILE);
  if (!Array.isArray(log.alerts)) log.alerts = [];

  const alerts   = [];
  const summary  = { scanned: 0, dealsFound: 0, alertsSent: 0 };

  try {
    for (const card of cards) {
      summary.scanned++;
      // Search for listings ≤ 55% of PSA10 estimate — we want genuine mispricing
      const threshold = (card.psa10EstimateEur ?? card.rawEstimateEur * 5) * DEAL_THRESHOLD;

      console.log(`\n[${summary.scanned}/${cards.length}] ${card.tier} | ${card.game} | ${card.cardName}`);
      console.log(`  Steal threshold: ${fmt(threshold)} (55% of PSA10 est ${fmt(card.psa10EstimateEur ?? 0)})`);

      // ── Per-card try/catch — never let one card crash the whole run ──
      let cmvSteals, cmvData;
      try {
        summary.dealsFound++; // increment — CMV engine handles listing search internally

        // CMV Engine — computes real market value + finds active steals in one pass
        const gradeRate   = getGradeRate(card);
        const gradingCost = card.gradingCost ?? 40;

        // Check if browser is still alive
        try { await browser.version(); } catch (browserErr) {
          console.log(`  ⚠️ Browser disconnected — restarting...`);
          try { await browser.close(); } catch {}
          browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });
          console.log(`  ✅ Browser restarted`);
        }

        ({ steals: cmvSteals, cmv: cmvData } = await detectSteals(browser, card, {
          gradingCost,
          gradeRate,
          forceRefresh: false,
        }));

        const psa10CMV = cmvData.psa10.cmv;
        const psa9CMV  = cmvData.psa9.cmv;
        const psa8CMV  = cmvData.psa8.cmv;
        const rawCMV   = cmvData.raw.cmv;

        if (!psa10CMV) {
          console.log(`  No CMV data — skipping`);
          continue;
        }

        // Use CMV confidence for gate
        const confidence = cmvData.psa10.confidence ?? CMV_CONFIDENCE.LOW;

        for (const steal of cmvSteals.slice(0, 2)) {
          const listing   = steal.listing;
          const totalCost = listing.price + gradingCost;
          const profit    = psa10CMV - totalCost;
          const stealScore = steal.score;

          if (profit < MIN_NET_PROFIT) {
            console.log(`  ${fmt(listing.price)} — profit ${fmt(profit)} below €${MIN_NET_PROFIT} floor, skip`);
            continue;
          }

          console.log(`  Steal score: ${stealScore}/100 | ${steal.stealTier.label} | PSA10 CMV: ${fmt(psa10CMV)}`);

          if (stealScore < MIN_STEAL_SCORE) {
            console.log(`  Score ${stealScore} below ${MIN_STEAL_SCORE} — not a holy grail steal, skip`);
            continue;
          }

          // Synthetic psa10Prices array for confidence calc compatibility
          const psa10Prices = cmvData.psa10.recentSales?.map(s => s.price) ?? [];
          const psa10Median = psa10CMV;
          const psa9Median  = psa9CMV;
          const psa8Median  = psa8CMV;

          const alertText = buildAlert(card, listing, psa10Median, psa9Median, psa8Median, psa10Prices, confidence, stealScore);
          alerts.push({ card, listing, psa10Median, psa9Median, psa8Median, profit, confidence, stealScore, alertText });
          summary.alertsSent++;

          const evResult = calcEV({
            rawPrice: listing.price, psa10SoldMedian: psa10Median,
            psa9SoldMedian: psa9Median, psa8SoldMedian: psa8Median,
            gradeRate,
            gradingTier: gradingCost <= 30 ? 'economy' : 'regular',
          });
          console.log(`  ✅ ALERT [${stealScore}/100]: in ${fmt(totalCost)} | PSA10 CMV ${fmt(psa10CMV)} | EV ${fmt(evResult.ev)} | Trend: ${cmvData.psa10.trend}`);

          log.alerts.push({
            timestamp:    new Date().toISOString(),
            cardId:       card.id,
            cardName:     card.cardName,
            game:         card.game,
            tier:         card.tier,
            stealScore,
            stealTier:    steal.stealTier.label,
            listingPrice: listing.price,
            psa10CMV:     psa10CMV,
            psa9CMV:      psa9CMV ?? null,
            psa8CMV:      psa8CMV ?? null,
            rawCMV:       rawCMV ?? null,
            trend:        cmvData.psa10.trend,
            ev:           evResult.ev,
            evRoi:        evResult.roi,
            profit,
            confidence:   confidence.label,
            url:          listing.url,
          });
        }

      } catch (cardErr) {
        console.log(`  ❌ Error on ${card.cardName}: ${cardErr.message}`);
        console.log(`  Continuing to next card...`);
        // If it's a browser crash, the next iteration's health check will restart it
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // Brief pause between searches to be polite
      await new Promise(r => setTimeout(r, 1500));
    }
  } finally {
    await browser.close();
    saveJSON(HUNT_CACHE_FILE, cache);
    saveJSON(HUNT_LOG_FILE, log);
  }

  // ── Send Alerts ─────────────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 Scan complete: ${summary.scanned} cards | ${summary.dealsFound} deals | ${summary.alertsSent} alerts`);

  if (!alerts.length) {
    console.log('No qualifying deals found this run.');

    // Daily digest even if no deals
    const digestMsg = buildDigest(summary, log.alerts);
    if (!dryRun) await sendTelegram(digestMsg);
    return;
  }

  // Sort alerts: S-tier first, then by profit desc
  alerts.sort((a, b) => {
    const td = tierOrder[a.card.tier] - tierOrder[b.card.tier];
    if (td !== 0) return td;
    return b.profit - a.profit;
  });

  // Send each alert
  for (const alert of alerts) {
    console.log(`\n─── ALERT ───\n${alert.alertText}`);
    if (!dryRun) {
      await sendTelegram(alert.alertText, {
        paid: true,
        free: true,  // enqueue for 48h delayed free channel dispatch
        dm: true,
        meta: {
          cardName:   alert.card?.name   ?? 'Unknown Card',
          game:       alert.card?.game   ?? 'Unknown',
          tier:       alert.card?.tier   ?? 'C',
          stealScore: alert.stealScore   ?? 0,
          listingUrl: alert.listing?.url ?? null,
        },
      });
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Daily digest summary
  const digestMsg = buildDigest(summary, log.alerts, alerts);
  if (!dryRun) await sendTelegram(digestMsg);
}

// ── Daily Digest ─────────────────────────────────────────────────────────────

function buildDigest(summary, allAlerts = [], todayAlerts = []) {
  const today = new Date().toLocaleDateString('de-DE');
  const last7 = allAlerts.filter(a => {
    const d = new Date(a.timestamp);
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  const lines = [
    `🎯 Card Sniper — High Conviction Only`,
    `${today} | ${summary.scanned} targets scanned`,
    `Filter: HIGH confidence • €${MIN_NET_PROFIT.toLocaleString()}+ profit • ${MIN_ROI}%+ ROI`,
  ];

  if (todayAlerts.length) {
    const totalShort = todayAlerts.reduce((s, a) => s + a.profit, 0);
    lines.push(``, `🔥 ${todayAlerts.length} HIGH-CONVICTION play${todayAlerts.length > 1 ? 's' : ''} today:`);
    for (const a of todayAlerts) {
      const totalCost = a.listing.price + (a.card.gradingCost ?? 40);
      const roi = Math.round((a.profit / totalCost) * 100);
      const lt  = getLongTermProjection(a.card, a.psa10Median);
      const longProfit = lt.projectedValue - totalCost;
      lines.push(`  ${TIER_EMOJI[a.card.tier]} ${a.card.cardName}`);
      lines.push(`     In: ${fmt(a.listing.price + (a.card.gradingCost ?? 40))} | Short: +${fmt(a.profit)} (${roi}% ROI) | Long: +${fmt(longProfit)} (${lt.years}yr)`);
    }
    lines.push(``, `  Pipeline short-term: ${fmt(totalShort)}`);
  } else {
    lines.push(``, `⏳ No plays cleared the bar today.`);
    lines.push(`Market fairly priced or comps too thin.`);
    lines.push(`Next scan: tomorrow 8 AM`);
  }

  if (last7.length) {
    const totalProfit = last7.reduce((s, a) => s + (a.profit ?? 0), 0);
    lines.push(``, `📅 7-day: ${last7.length} alerts | ${fmt(totalProfit)} potential`);
    const top = [...last7].sort((a, b) => b.profit - a.profit)[0];
    if (top) lines.push(`  Best: ${top.cardName} — ${fmt(top.profit)} net`);
  }

  lines.push(``, `Only big plays. Buy raw → grade → flip or hold.`);
  return lines.join('\n');
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function tgSend(chatId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const json = await res.json();
    if (!json.ok) console.error(`Telegram error (${chatId}):`, json.description);
    else console.log(`  📨 Sent to ${chatId} ✅`);
  } catch (e) {
    console.error(`Telegram fetch error (${chatId}):`, e.message);
  }
}

async function sendTelegram(text, opts = {}) {
  const { paid = true, free = false, dm = true } = opts;

  // 1. Always DM Mikel
  if (dm) await tgSend(TELEGRAM_CHAT_ID, text);

  // 2. Post real-time to paid private channel
  if (paid && TELEGRAM_CHANNEL_PAID) await tgSend(TELEGRAM_CHANNEL_PAID, text);

  // 3. Free channel: enqueue for 48h delayed dispatch (via free-tier-dispatcher.mjs)
  //    We always enqueue — the dispatcher handles the channel send when releaseAt arrives.
  if (free) {
    try {
      enqueueAlert(text, opts.meta ?? {});
    } catch (err) {
      console.warn('[hunt-monitor] ⚠️  Failed to enqueue free alert:', err.message);
    }
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const tier   = args.find((_, i) => args[i - 1] === '--tier');
  const game   = args.find((_, i) => args[i - 1] === '--game');
  const dryRun = args.includes('--dry-run');

  runHuntMonitor({ tier, game, dryRun })
    .then(() => process.exit(0))
    .catch(e => { console.error('Hunt monitor error:', e); process.exit(1); });
}

export { runHuntMonitor };
