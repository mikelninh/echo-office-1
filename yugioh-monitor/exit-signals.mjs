#!/usr/bin/env node
/**
 * Exit Signal Detector
 *
 * Watches PSA 10/9 sold comp trends over time.
 * Tells subscribers WHEN TO SELL, not just when to buy.
 * This is what makes people stay subscribed — we're watching their portfolio.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getSoldComps } from './sold-scraper.mjs';
import { getPsaPop } from './psa-pop.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TREND_FILE    = join(__dirname, 'price-trends.json');
const PORTFOLIO_FILE = join(__dirname, 'portfolios.json');

// ── Signal thresholds ─────────────────────────────────────────────────

const SIGNALS = {
  SELL_NOW:      { trend14d: 0.20,  minSalesPerWeek: 2,  label: '🔴 SELL NOW',    urgency: 'high'   },
  SELL_CONSIDER: { trend14d: 0.10,  minSalesPerWeek: 1,  label: '🟡 CONSIDER SELLING', urgency: 'medium' },
  POP_WARNING:   { popGrowthPct: 0.15,                   label: '⚠️ POP WARNING',  urgency: 'medium' },
  ILLIQUID:      { maxSalesPerMonth: 2,                  label: '💤 ILLIQUID',     urgency: 'low'    },
  FLOOR_HOLD:    { trendDown: -0.12, popStable: true,    label: '🟢 FLOOR HOLD',   urgency: 'info'   },
};

// ── Data helpers ──────────────────────────────────────────────────────

function loadTrends() {
  if (!existsSync(TREND_FILE)) return {};
  try { return JSON.parse(readFileSync(TREND_FILE, 'utf8')); } catch { return {}; }
}

function saveTrends(data) { writeFileSync(TREND_FILE, JSON.stringify(data, null, 2)); }

export function loadPortfolios() {
  if (!existsSync(PORTFOLIO_FILE)) return [];
  try { return JSON.parse(readFileSync(PORTFOLIO_FILE, 'utf8')); } catch { return []; }
}

export function savePortfolios(data) { writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2)); }

function normalizeKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
}

// ── Trend analysis ────────────────────────────────────────────────────

/**
 * Record a new sold comp snapshot for a card.
 * Call this after each monitor run that gets sold comps.
 */
export function recordSoldSnapshot(title, grade, soldMedian, soldCount) {
  const trends = loadTrends();
  const key = `${normalizeKey(title)}-psa${grade}`;

  if (!trends[key]) trends[key] = { title, grade, snapshots: [] };

  trends[key].snapshots.push({
    median: soldMedian,
    count: soldCount,
    ts: Date.now(),
  });

  // Keep 60 days of snapshots
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  trends[key].snapshots = trends[key].snapshots.filter(s => s.ts > cutoff);

  saveTrends(trends);
}

/**
 * Analyse price trend for a card over the last N days.
 * Returns: { trend14d, trend30d, salesPerWeek, direction }
 */
function analyzeTrend(key) {
  const trends = loadTrends();
  const data = trends[key];
  if (!data || data.snapshots.length < 2) return null;

  const now = Date.now();
  const day14 = now - 14 * 24 * 60 * 60 * 1000;
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  const recent14  = data.snapshots.filter(s => s.ts >= day14);
  const recent30  = data.snapshots.filter(s => s.ts >= day30);
  const allSnaps  = data.snapshots;

  if (allSnaps.length < 2) return null;

  const first14  = recent14[0]?.median  || allSnaps[0].median;
  const last14   = recent14[recent14.length - 1]?.median || allSnaps[allSnaps.length - 1].median;
  const trend14d = first14 > 0 ? (last14 - first14) / first14 : 0;

  const first30  = recent30[0]?.median  || allSnaps[0].median;
  const last30   = recent30[recent30.length - 1]?.median || allSnaps[allSnaps.length - 1].median;
  const trend30d = first30 > 0 ? (last30 - first30) / first30 : 0;

  // Sales velocity: total sales count / weeks in window
  const totalSales30 = recent30.reduce((s, snap) => s + (snap.count || 1), 0);
  const salesPerWeek = totalSales30 / 4;

  const currentMedian = last14;

  return { trend14d, trend30d, salesPerWeek, currentMedian, snapshotCount: allSnaps.length };
}

// ── Signal detection ──────────────────────────────────────────────────

/**
 * Detect exit signals for a card.
 * Returns array of signals (may be empty).
 */
export async function detectSignals(title, grade = 10, opts = {}) {
  const { rawListings = 0 } = opts;
  const key = `${normalizeKey(title)}-psa${grade}`;
  const trend = analyzeTrend(key);

  if (!trend) return []; // not enough history yet

  const signals = [];
  const { trend14d, trend30d, salesPerWeek, currentMedian } = trend;

  // SELL NOW: price up >20% in 14d + decent liquidity
  if (trend14d >= SIGNALS.SELL_NOW.trend14d && salesPerWeek >= SIGNALS.SELL_NOW.minSalesPerWeek) {
    signals.push({
      type: 'SELL_NOW',
      ...SIGNALS.SELL_NOW,
      message: `PSA ${grade} comps up ${Math.round(trend14d * 100)}% in 14 days with ${salesPerWeek.toFixed(1)} sales/week — market is hot`,
      trend14d, salesPerWeek, currentMedian,
    });
  }
  // CONSIDER SELLING
  else if (trend14d >= SIGNALS.SELL_CONSIDER.trend14d && salesPerWeek >= SIGNALS.SELL_CONSIDER.minSalesPerWeek) {
    signals.push({
      type: 'SELL_CONSIDER',
      ...SIGNALS.SELL_CONSIDER,
      message: `PSA ${grade} comps up ${Math.round(trend14d * 100)}% in 14 days — momentum building`,
      trend14d, salesPerWeek, currentMedian,
    });
  }

  // ILLIQUID: few sales in last 30 days
  if (salesPerWeek < 0.5) {
    signals.push({
      type: 'ILLIQUID',
      ...SIGNALS.ILLIQUID,
      message: `Only ~${(salesPerWeek * 4).toFixed(0)} PSA ${grade} sales in 30 days — hard to exit quickly`,
      salesPerWeek, currentMedian,
    });
  }

  // FLOOR HOLD: price down but pop stable (likely a temporary dip)
  if (trend14d < -0.12) {
    // Check if pop is growing (fetch fresh)
    const psaPop = await getPsaPop(title, { rawListings }).catch(() => null);
    const popStable = psaPop ? psaPop.psa10Pop < (opts.lastPop ?? Infinity) * 1.05 : true;
    if (popStable) {
      signals.push({
        type: 'FLOOR_HOLD',
        ...SIGNALS.FLOOR_HOLD,
        message: `Comps down ${Math.round(Math.abs(trend14d) * 100)}% but pop is stable — likely a temp dip, consider holding`,
        trend14d, currentMedian,
      });
    }
  }

  // POP WARNING: check if pop grew fast (requires psaPop)
  if (opts.currentPop && opts.lastPop) {
    const popGrowth = (opts.currentPop - opts.lastPop) / opts.lastPop;
    if (popGrowth >= SIGNALS.POP_WARNING.popGrowthPct) {
      signals.push({
        type: 'POP_WARNING',
        ...SIGNALS.POP_WARNING,
        message: `PSA 10 pop grew ${Math.round(popGrowth * 100)}% since last check (${opts.lastPop} → ${opts.currentPop}) — premium may compress`,
        popGrowth, currentPop: opts.currentPop,
      });
    }
  }

  return signals;
}

// ── Alert formatting ──────────────────────────────────────────────────

export function formatExitSignalAlert(title, grade, signals, currentMedian) {
  if (!signals.length) return null;

  const topSignal = signals[0];
  const c = '€';
  const fmt = n => Number(n).toLocaleString('de-DE');

  const lines = [
    `${topSignal.label}`,
    ``,
    `${title} — PSA ${grade}`,
    `Current comp median: ${c}${fmt(currentMedian)}`,
    ``,
  ];

  for (const sig of signals) {
    lines.push(`• ${sig.message}`);
  }

  if (topSignal.type === 'SELL_NOW' || topSignal.type === 'SELL_CONSIDER') {
    lines.push(``);
    lines.push(`💡 Now's the time to list if you're holding one.`);
  } else if (topSignal.type === 'ILLIQUID') {
    lines.push(``);
    lines.push(`💡 Price low if you need to exit quickly.`);
  } else if (topSignal.type === 'FLOOR_HOLD') {
    lines.push(``);
    lines.push(`💡 Patience likely rewarded — hold for now.`);
  }

  return lines.join('\n');
}

// ── Portfolio management ──────────────────────────────────────────────

export function addToPortfolio(subscriberId, card) {
  const portfolios = loadPortfolios();
  let sub = portfolios.find(p => p.subscriberId === subscriberId);
  if (!sub) {
    sub = { subscriberId, cards: [] };
    portfolios.push(sub);
  }
  sub.cards.push({
    ...card,
    addedAt: new Date().toISOString(),
    id: `card-${Date.now()}`,
  });
  savePortfolios(portfolios);
  return sub;
}

export function getPortfolio(subscriberId) {
  return loadPortfolios().find(p => p.subscriberId === subscriberId) || { subscriberId, cards: [] };
}

/**
 * Scan all portfolio cards for exit signals. Called daily.
 * Returns map of subscriberId → signals.
 */
export async function scanAllPortfolios() {
  const portfolios = loadPortfolios();
  const results = {};

  for (const sub of portfolios) {
    const subSignals = [];
    for (const card of sub.cards || []) {
      const signals = await detectSignals(card.title, card.grade || 10, {
        rawListings: card.rawListings || 0,
        currentPop: card.currentPop,
        lastPop: card.lastPop,
      });
      if (signals.length) {
        subSignals.push({ card, signals });
      }
    }
    if (subSignals.length) results[sub.subscriberId] = subSignals;
  }

  return results;
}

// ── Standalone test ───────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = process.argv[2] || 'demo';

  if (action === 'seed') {
    // Seed some fake trend data so we can test signal detection
    const title = 'Luffy Manga Alternate Art OP-01';
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const trends = loadTrends();
    const key = `${normalizeKey(title)}-psa10`;

    trends[key] = {
      title, grade: 10,
      snapshots: [
        { median: 2200, count: 3, ts: now - 30 * day },
        { median: 2300, count: 4, ts: now - 24 * day },
        { median: 2400, count: 3, ts: now - 17 * day },
        { median: 2600, count: 5, ts: now - 10 * day },
        { median: 2882, count: 4, ts: now - 3  * day },
      ],
    };
    saveTrends(trends);
    console.log('Seeded trend data for Luffy PSA 10');

  } else if (action === 'signals') {
    const title = process.argv[3] || 'Luffy Manga Alternate Art OP-01';
    const grade = parseInt(process.argv[4] || '10');
    console.log(`\nDetecting exit signals for: "${title}" PSA ${grade}\n`);
    const signals = await detectSignals(title, grade);
    if (!signals.length) {
      console.log('No signals detected (need more price history or thresholds not met)');
    } else {
      const trend = analyzeTrend(`${normalizeKey(title)}-psa${grade}`);
      console.log(formatExitSignalAlert(title, grade, signals, trend?.currentMedian));
    }

  } else {
    // Demo: show what a SELL NOW signal looks like
    console.log('Exit Signal Demo:\n');
    const demoSignals = [{
      type: 'SELL_NOW',
      label: '🔴 SELL NOW',
      message: 'PSA 10 comps up 31% in 14 days with 3.5 sales/week — market is hot',
    }];
    console.log(formatExitSignalAlert('Luffy Manga Alternate Art OP-01', 10, demoSignals, 2882));
  }
}
