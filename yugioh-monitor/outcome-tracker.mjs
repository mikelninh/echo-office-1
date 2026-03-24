#!/usr/bin/env node
/**
 * Outcome Tracker — Did our alerts actually work?
 * 
 * Reads alerts-log.json, checks each alerted listing on eBay:
 *   - Is it still active? → status: "active"
 *   - Has it sold? → status: "sold", soldPrice, soldDate
 *   - Has it ended unsold? → status: "expired"
 * 
 * Calculates paper-traded ROI for each alert.
 * Writes outcomes.json with full tracking data.
 * 
 * Usage: node outcome-tracker.mjs [--verbose]
 * Cron: run daily after hunt monitor
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERTS_FILE = path.join(__dirname, 'alerts-log.json');
const OUTCOMES_FILE = path.join(__dirname, 'outcomes.json');
const VERBOSE = process.argv.includes('--verbose');

// ── Helpers ────────────────────────────────────────────

function log(...args) { if (VERBOSE) console.log('[outcome]', ...args); }

function parsePrice(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9.,]/g, '');
  // Handle European format: 3.499,99 → 3499.99
  if (cleaned.match(/^\d{1,3}(\.\d{3})+(,\d+)?$/)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Handle US format: 3,499.99 → 3499.99
  return parseFloat(cleaned.replace(/,/g, ''));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Extract eBay item ID from URL
function extractItemId(url) {
  if (!url) return null;
  const match = url.match(/\/itm\/(\d+)/);
  return match ? match[1] : null;
}

// ── eBay Listing Status Check ──────────────────────────

async function checkListingStatus(url) {
  const itemId = extractItemId(url);
  if (!itemId) return { status: 'unknown', reason: 'no-item-id' };

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const html = await resp.text();

    // Check if listing has sold
    if (html.includes('This listing has ended') || html.includes('Bidding has ended')) {
      // Try to find sold price
      const soldMatch = html.match(/Winning bid:.*?([$€£][\d,]+\.?\d*)/i)
        || html.match(/Sold for:.*?([$€£][\d,]+\.?\d*)/i)
        || html.match(/Price:.*?([$€£][\d,]+\.?\d*)/i);
      
      const soldPrice = soldMatch ? parsePrice(soldMatch[1]) : null;

      // Check if it actually sold vs expired
      if (html.includes('sold') || html.includes('winner') || html.includes('Winning bid')) {
        return { status: 'sold', soldPrice };
      }
      return { status: 'expired' };
    }

    // Check for "item no longer available"
    if (html.includes('no longer available') || html.includes('This item is no longer available') || resp.status === 404) {
      return { status: 'removed' };
    }

    // Check current price (listing still active)
    const priceMatch = html.match(/itemprop="price"[^>]*content="([\d.]+)"/i)
      || html.match(/prcIsum.*?([$€£][\d,]+\.?\d*)/i);
    const currentPrice = priceMatch ? parseFloat(priceMatch[1]) || parsePrice(priceMatch[1]) : null;

    return { status: 'active', currentPrice };

  } catch (err) {
    if (err.name === 'TimeoutError') return { status: 'timeout' };
    log('  Error checking', url, err.message);
    return { status: 'error', reason: err.message };
  }
}

// ── ROI Calculator ─────────────────────────────────────

function calculateROI(alert, outcome) {
  const buyPrice = parsePrice(alert.price);
  if (!buyPrice) return null;

  // Estimate graded value based on score tier
  let estimatedGradedValue;
  const score = alert.score || 0;

  if (score >= 90) {
    // Legendary tier — typically 2-3x raw price for these grail-level cards
    estimatedGradedValue = buyPrice * 2.5;
  } else if (score >= 80) {
    estimatedGradedValue = buyPrice * 2.0;
  } else if (score >= 70) {
    estimatedGradedValue = buyPrice * 1.6;
  } else {
    estimatedGradedValue = buyPrice * 1.3;
  }

  // If we have a sold price, use actual data
  const exitPrice = outcome.soldPrice || estimatedGradedValue;
  
  // Grading cost estimate
  const gradingCost = buyPrice > 5000 ? 150 : buyPrice > 1000 ? 75 : 35;
  
  const totalCost = buyPrice + gradingCost;
  const netProfit = exitPrice - totalCost;
  const roi = totalCost > 0 ? ((netProfit / totalCost) * 100) : 0;

  return {
    buyPrice,
    gradingCost,
    totalCost,
    estimatedGradedValue: Math.round(estimatedGradedValue),
    exitPrice: Math.round(exitPrice),
    netProfit: Math.round(netProfit),
    roi: Math.round(roi),
    isRealData: !!outcome.soldPrice,
  };
}

// ── Main ───────────────────────────────────────────────

async function main() {
  console.log('📊 Outcome Tracker — Checking alert results...\n');

  // Load alerts
  if (!fs.existsSync(ALERTS_FILE)) {
    console.log('No alerts-log.json found. Nothing to track.');
    process.exit(0);
  }
  const alerts = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
  console.log(`Found ${alerts.length} alerts to track.\n`);

  // Load existing outcomes
  let outcomes = {};
  if (fs.existsSync(OUTCOMES_FILE)) {
    outcomes = JSON.parse(fs.readFileSync(OUTCOMES_FILE, 'utf8'));
  }

  // Deduplicate alerts by URL (same listing appears in multiple runs)
  const uniqueAlerts = new Map();
  for (const alert of alerts) {
    if (alert.url && !uniqueAlerts.has(alert.url)) {
      uniqueAlerts.set(alert.url, alert);
    }
  }
  console.log(`${uniqueAlerts.size} unique listings to check.\n`);

  let checked = 0;
  let sold = 0;
  let active = 0;
  let expired = 0;
  let errors = 0;
  let totalPaperProfit = 0;

  for (const [url, alert] of uniqueAlerts) {
    const itemId = extractItemId(url);
    if (!itemId) continue;

    // Skip if we already have a terminal status (sold/expired/removed)
    const existing = outcomes[itemId];
    if (existing && ['sold', 'expired', 'removed'].includes(existing.status)) {
      log(`  Skip ${itemId} — already ${existing.status}`);
      // Still count for stats
      if (existing.status === 'sold') sold++;
      if (existing.status === 'expired') expired++;
      continue;
    }

    // Rate limit — be nice to eBay
    await sleep(2000 + Math.random() * 2000);

    const game = alert.game || 'unknown';
    const shortTitle = (alert.title || '').slice(0, 50);
    process.stdout.write(`  [${++checked}/${uniqueAlerts.size}] ${game} | ${shortTitle}...`);

    const result = await checkListingStatus(url);
    const roi = calculateROI(alert, result);

    outcomes[itemId] = {
      ...alert,
      itemId,
      checkedAt: new Date().toISOString(),
      ...result,
      roi: roi || null,
    };

    if (result.status === 'sold') {
      sold++;
      console.log(` SOLD${result.soldPrice ? ' $' + result.soldPrice : ''}`);
    } else if (result.status === 'active') {
      active++;
      console.log(` active${result.currentPrice ? ' $' + result.currentPrice : ''}`);
    } else if (result.status === 'expired' || result.status === 'removed') {
      expired++;
      console.log(` ${result.status}`);
    } else {
      errors++;
      console.log(` ${result.status} (${result.reason || ''})`);
    }

    if (roi) totalPaperProfit += roi.netProfit;
  }

  // Write outcomes
  fs.writeFileSync(OUTCOMES_FILE, JSON.stringify(outcomes, null, 2));

  // Summary
  const totalTracked = Object.keys(outcomes).length;
  const allROIs = Object.values(outcomes).filter(o => o.roi).map(o => o.roi.roi);
  const avgROI = allROIs.length ? Math.round(allROIs.reduce((a, b) => a + b, 0) / allROIs.length) : 0;

  console.log('\n' + '─'.repeat(50));
  console.log('📊 OUTCOME SUMMARY');
  console.log('─'.repeat(50));
  console.log(`Total tracked:     ${totalTracked}`);
  console.log(`Active:            ${active}`);
  console.log(`Sold:              ${sold}`);
  console.log(`Expired/Removed:   ${expired}`);
  console.log(`Errors:            ${errors}`);
  console.log(`Avg Paper ROI:     ${avgROI}%`);
  console.log(`Total Paper Profit: $${totalPaperProfit.toLocaleString()}`);
  console.log('─'.repeat(50));

  // Copy to vault-dashboard for the wins page
  const vaultOutcomes = path.join(__dirname, '../../vault-dashboard/outcomes.json');
  try {
    fs.copyFileSync(OUTCOMES_FILE, vaultOutcomes);
    console.log(`\n✅ Outcomes synced to vault-dashboard`);
  } catch (e) {
    log('Could not sync to vault-dashboard:', e.message);
  }

  console.log(`\n✅ Done. Results saved to ${OUTCOMES_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
