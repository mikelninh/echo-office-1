/**
 * test-comp-intelligence.mjs
 * Runs sample data through the comp-intelligence engine and prints results.
 * Usage: node test-comp-intelligence.mjs
 */

import { analyzeComps, detectPriceManipulation, getGradingROI } from './comp-intelligence.mjs';

// ANSI colours for readable terminal output
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  dim:    '\x1b[2m',
};

function header(title) {
  console.log('\n' + C.bold + C.cyan + '═'.repeat(60) + C.reset);
  console.log(C.bold + C.cyan + `  ${title}` + C.reset);
  console.log(C.bold + C.cyan + '═'.repeat(60) + C.reset);
}

function section(title) {
  console.log('\n' + C.bold + C.yellow + `▶ ${title}` + C.reset);
  console.log(C.dim + '─'.repeat(50) + C.reset);
}

function printKV(label, value, color = '') {
  const v = (value === null || value === undefined) ? C.dim + 'n/a' + C.reset : color + value + C.reset;
  console.log(`  ${C.dim}${label.padEnd(22)}${C.reset}${v}`);
}

function printAnalysis(result, label) {
  section(label);
  printKV('FMV',             result.fmv !== null ? `$${result.fmv}` : null, C.green);
  printKV('FMV Low (P25)',   result.fmvLow !== null ? `$${result.fmvLow}` : null);
  printKV('FMV High (P75)',  result.fmvHigh !== null ? `$${result.fmvHigh}` : null);
  printKV('Confidence',      result.confidence, result.confidence === 'HIGH' ? C.green : result.confidence === 'LOW' ? C.red : C.yellow);
  printKV('Sample Size',     result.sampleSize);
  printKV('Outliers Removed',result.outlierCount);
  printKV('Volatility',      result.priceVolatility,
    result.priceVolatility === 'VOLATILE' ? C.red :
    result.priceVolatility === 'TRENDING_UP' ? C.green :
    result.priceVolatility === 'TRENDING_DOWN' ? C.yellow : C.green);
  printKV('Trend 30d',       result.trend30d !== null ? `${result.trend30d > 0 ? '+' : ''}${result.trend30d}%` : null);
  printKV('Trend 90d',       result.trend90d !== null ? `${result.trend90d > 0 ? '+' : ''}${result.trend90d}%` : null);
  printKV('Seasonal Note',   result.seasonalNote);
  console.log(`  ${C.dim}Methodology:${C.reset}`);
  console.log(`    ${C.dim}${result.methodology}${C.reset}`);
}

function printManipulation(result, label) {
  section(label);
  const flag = result.suspicious ? C.red + '⚠ SUSPICIOUS' : C.green + '✓ CLEAN';
  printKV('Status', flag + C.reset);
  if (result.reason) {
    console.log(`  ${C.dim}Reason:${C.reset}`);
    console.log(`    ${C.yellow}${result.reason}${C.reset}`);
  }
}

function printROI(result) {
  section('Grading ROI');
  printKV('Raw Price',       `$${result.rawPrice}`);
  printKV('Grading Cost',    `$${result.gradingCost}`);
  printKV('Total Cost',      `$${result.totalCost}`, C.bold);
  printKV('Card Era',        result.cardEra);
  console.log();
  for (const grade of [result.psa10, result.psa9, result.psa8, result.belowPsa8]) {
    if (!grade) continue;
    const profitColor = grade.profit > 0 ? C.green : C.red;
    console.log(`  ${C.bold}${grade.label}${C.reset} (${grade.rate})`);
    console.log(`    Graded price: $${grade.gradedPrice}  |  Profit: ${profitColor}$${grade.profit}${C.reset}  |  ROI: ${profitColor}${grade.roi}${C.reset}  |  EV contribution: $${grade.ev}`);
  }
  console.log();
  printKV('Expected Value',  `$${result.expectedValue}`);
  printKV('Expected Profit', `$${result.expectedProfit}`, result.expectedProfit >= 0 ? C.green : C.red);
  printKV('Expected ROI',    result.expectedROI, result.expectedProfit >= 0 ? C.green : C.red);
  printKV('Break-even',      result.breakEven);
  console.log(`\n  ${result.recommendation}`);
}

// ===========================================================================
// Test datasets
// ===========================================================================

header('COMP INTELLIGENCE ENGINE — TEST SUITE');

// ---------------------------------------------------------------------------
// 1. Blue-Eyes White Dragon 1st Ed LOB — stable market, good data
// ---------------------------------------------------------------------------
{
  const sales = [
    { price: 420, daysAgo: 5 },
    { price: 435, daysAgo: 8 },
    { price: 410, daysAgo: 12 },
    { price: 445, daysAgo: 15 },
    { price: 425, daysAgo: 20 },
    { price: 415, daysAgo: 35 },
    { price: 430, daysAgo: 40 },
    { price: 400, daysAgo: 60 },
    { price: 390, daysAgo: 75 },
    { price: 405, daysAgo: 95 },
    { price: 380, daysAgo: 120 },
    { price: 850, daysAgo: 30 },  // ← outlier (damaged/wrong listing)
    { price: 95,  daysAgo: 45 },  // ← outlier (heavily played)
  ];

  header('SCENARIO 1 — Blue-Eyes White Dragon 1st Ed (Stable market)');
  printAnalysis(analyzeComps(sales, { debug: false }), 'FMV Analysis');
  printManipulation(detectPriceManipulation(sales), 'Manipulation Check');
}

// ---------------------------------------------------------------------------
// 2. Pikachu Base Set 1st Ed — trending up market
// ---------------------------------------------------------------------------
{
  const sales = [
    { price: 520, daysAgo: 2 },
    { price: 510, daysAgo: 7 },
    { price: 495, daysAgo: 14 },
    { price: 470, daysAgo: 35 },
    { price: 455, daysAgo: 50 },
    { price: 430, daysAgo: 70 },
    { price: 400, daysAgo: 100 },
    { price: 380, daysAgo: 120 },
  ];

  header('SCENARIO 2 — Pikachu Base 1st Ed (Trending UP)');
  printAnalysis(analyzeComps(sales), 'FMV Analysis');

  // Grading ROI: found raw at $250
  const comps = { psa10: 2800, psa9: 950, psa8: 480, psa7: 300 };
  printROI(getGradingROI(250, comps, 35, 'pokemon-base-1st'));
}

// ---------------------------------------------------------------------------
// 3. One Piece OP01 — high pop rates, modern card
// ---------------------------------------------------------------------------
{
  const sales = [
    { price: 180, daysAgo: 3 },
    { price: 175, daysAgo: 6 },
    { price: 185, daysAgo: 9 },
    { price: 170, daysAgo: 14 },
    { price: 178, daysAgo: 20 },
    { price: 182, daysAgo: 28 },
  ];

  header('SCENARIO 3 — One Piece OP01 (Modern card, high PSA10 rate)');
  printAnalysis(analyzeComps(sales), 'FMV Analysis');

  const comps = { psa10: 280, psa9: 210, psa8: 170, below: 120 };
  printROI(getGradingROI(120, comps, 35, 'onepiece-op01'));
}

// ---------------------------------------------------------------------------
// 4. Manipulation detection — wash trading scenario
// ---------------------------------------------------------------------------
{
  const washSales = [
    { price: 299.99, daysAgo: 1 },
    { price: 299.99, daysAgo: 1 },
    { price: 299.99, daysAgo: 1 },
    { price: 299.99, daysAgo: 2 },
    { price: 299.99, daysAgo: 2 },
    { price: 299.99, daysAgo: 2 },
    { price: 300.00, daysAgo: 3 },
    { price: 299.99, daysAgo: 3 },
    { price: 150.00, daysAgo: 60 },
    { price: 155.00, daysAgo: 70 },
  ];

  header('SCENARIO 4 — Wash Trading Detection');
  printManipulation(detectPriceManipulation(washSales), 'Manipulation Check (wash trade)');

  // Spike + crash
  const spikeSales = [
    { price: 100, daysAgo: 100 },
    { price: 105, daysAgo: 80 },
    { price: 110, daysAgo: 60 },
    { price: 250, daysAgo: 40 },  // ← artificial spike
    { price: 108, daysAgo: 20 },  // ← crash back
    { price: 112, daysAgo: 10 },
  ];
  printManipulation(detectPriceManipulation(spikeSales), 'Manipulation Check (spike+crash)');
}

// ---------------------------------------------------------------------------
// 5. Insufficient data
// ---------------------------------------------------------------------------
{
  header('SCENARIO 5 — Insufficient Data (only 2 comps)');
  printAnalysis(analyzeComps([{ price: 120, daysAgo: 5 }, { price: 130, daysAgo: 10 }]), 'FMV Analysis');
}

// ---------------------------------------------------------------------------
// 6. Volatile market — collectible with wide price spread
// ---------------------------------------------------------------------------
{
  const volatile = [
    { price: 80,  daysAgo: 5 },
    { price: 200, daysAgo: 10 },
    { price: 60,  daysAgo: 15 },
    { price: 180, daysAgo: 20 },
    { price: 95,  daysAgo: 25 },
    { price: 220, daysAgo: 30 },
    { price: 75,  daysAgo: 35 },
    { price: 165, daysAgo: 40 },
    { price: 90,  daysAgo: 45 },
    { price: 210, daysAgo: 50 },
  ];

  header('SCENARIO 6 — Volatile Market (wide price spread)');
  printAnalysis(analyzeComps(volatile), 'FMV Analysis');
}

// ---------------------------------------------------------------------------
// 7. Date-string input format
// ---------------------------------------------------------------------------
{
  const now = Date.now();
  const daysMs = 86_400_000;
  const sales = [
    { price: 550, date: new Date(now - 5  * daysMs).toISOString() },
    { price: 540, date: new Date(now - 12 * daysMs).toISOString() },
    { price: 560, date: new Date(now - 20 * daysMs).toISOString() },
    { price: 520, date: new Date(now - 45 * daysMs).toISOString() },
    { price: 505, date: new Date(now - 80 * daysMs).toISOString() },
    { price: 490, date: new Date(now - 110 * daysMs).toISOString() },
  ];

  header('SCENARIO 7 — Date-String Input Format');
  printAnalysis(analyzeComps(sales), 'FMV Analysis (dates as ISO strings)');
}

// ---------------------------------------------------------------------------
// 8. Default-era grading ROI — marginal buy
// ---------------------------------------------------------------------------
{
  header('SCENARIO 8 — Marginal Grading Opportunity (default era)');
  const comps = { psa10: 120, psa9: 70, psa8: 45, psa7: 28 };
  printROI(getGradingROI(65, comps, 35, 'default'));
}

console.log('\n' + C.bold + C.green + '✓ All tests complete' + C.reset + '\n');
