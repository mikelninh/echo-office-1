#!/usr/bin/env node
/**
 * Expected Value Calculator for TCG Grading Arbitrage
 *
 * EV = (PSA10_sold_median × grade_rate × (1 - pop_risk_discount))
 *      - raw_price - grading_cost
 *
 * Usage: import { calcEV, EV_VERDICT } from './ev-calculator.mjs'
 */

import { fileURLToPath } from 'url';

// Grading cost tiers (PSA, EUR approximate)
export const GRADING_TIERS = {
  economy:  { label: 'PSA Economy (~60 days)', cost: 25 },
  regular:  { label: 'PSA Regular (~20 days)', cost: 80 },
  express:  { label: 'PSA Express (~10 days)', cost: 150 },
  walkThru: { label: 'PSA Walk-Through (5 days)', cost: 300 },
};

export const EV_VERDICT = {
  STRONG_BUY:  { label: '🟢 STRONG BUY',  minEV: 500 },
  BUY:         { label: '🟡 BUY',          minEV: 200 },
  MARGINAL:    { label: '⚪ MARGINAL',     minEV: 50  },
  PASS:        { label: '🔴 PASS',         minEV: -Infinity },
};

function getVerdict(ev) {
  if (ev >= EV_VERDICT.STRONG_BUY.minEV) return EV_VERDICT.STRONG_BUY;
  if (ev >= EV_VERDICT.BUY.minEV)        return EV_VERDICT.BUY;
  if (ev >= EV_VERDICT.MARGINAL.minEV)   return EV_VERDICT.MARGINAL;
  return EV_VERDICT.PASS;
}

/**
 * Calculate Expected Value for a grading opportunity.
 * Accounts for PSA 10, 9, 8, and raw recovery — not just binary PSA 10/bust.
 *
 * Full EV formula:
 *   EV = Σ (grade_sell_price × grade_rate) - raw_price - grading_cost
 *   Where grades = 10, 9, 8, ≤7 (recovered at raw price)
 *
 * @param {object} params
 * @param {number} params.rawPrice         - Current listing price
 * @param {number} params.psa10SoldMedian  - Median sold price of PSA 10 comps
 * @param {number} params.psa9SoldMedian   - Median sold price of PSA 9 comps (optional)
 * @param {number} params.psa8SoldMedian   - Median sold price of PSA 8 comps (optional)
 * @param {number} params.gradeRate        - % (0-1) chance of PSA 10
 * @param {number} params.evDiscount       - Pop risk discount (0–0.4), negative = bonus
 * @param {string} params.gradingTier      - 'economy' | 'regular' | 'express' | 'walkThru'
 * @param {number} params.psa10Pop         - PSA 10 population
 * @param {number} params.totalPop         - All grades total
 * @param {number} params.rawListings      - Raw copies on market (supply proxy)
 * @param {string} params.popRisk          - 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY LOW'
 */
export function calcEV(params) {
  const {
    rawPrice,
    psa10SoldMedian,
    psa9SoldMedian  = null,
    psa8SoldMedian  = null,
    gradeRate = 0.15,
    evDiscount = 0,
    gradingTier = 'regular',
    psa10Pop = null,
    totalPop = null,
    rawListings = 0,
    popRisk = 'UNKNOWN',
  } = params;

  const gradingCost = GRADING_TIERS[gradingTier]?.cost ?? 80;

  // Grade rate distribution — if we only know PSA 10 rate, estimate the rest
  // Based on community averages across TCG grading
  // If real PSA grade rates supplied, use them directly.
  // Otherwise estimate from PSA 10 rate using typical TCG distribution.
  const rate10 = gradeRate;
  const rate9  = params.gradeRate9  ?? gradeRate * 1.8;
  const rate8  = params.gradeRate8  ?? gradeRate * 1.2;
  // Clamp so total never exceeds 1.0
  const usedSoFar = rate10 + rate9 + rate8;
  const scale = usedSoFar > 1.0 ? 1.0 / usedSoFar : 1.0;
  const r10 = rate10 * scale;
  const r9  = rate9  * scale;
  const r8  = rate8  * scale;
  const rateLow = Math.max(0, 1 - r10 - r9 - r8);

  // Sell prices for each outcome
  // PSA 9: use real comps or estimate at 55% of PSA 10
  // PSA 8: use real comps or estimate at 25% of PSA 10
  // ≤7: recover raw price (sell back raw or at slight discount)
  const price10 = psa10SoldMedian * (1 - evDiscount);
  const price9  = psa9SoldMedian  ?? psa10SoldMedian * 0.55;
  const price8  = psa8SoldMedian  ?? psa10SoldMedian * 0.25;
  const priceLow = rawPrice * 0.80; // sell back at 80% of what you paid

  // Full EV across all grade outcomes (r10/r9/r8/rateLow are clamped, sum to 1.0)
  const ev10  = price10  * r10;
  const ev9   = price9   * r9;
  const ev8   = price8   * r8;
  const evLow = priceLow * rateLow;

  const totalExpectedReturn = ev10 + ev9 + ev8 + evLow;
  const ev = totalExpectedReturn - rawPrice - gradingCost;

  // Best/worst cases
  const bestCase  = psa10SoldMedian - rawPrice - gradingCost;
  const worstCase = priceLow - rawPrice - gradingCost; // ≤7, sell back

  const totalInvest = rawPrice + gradingCost;
  const roi = totalInvest > 0 ? Math.round((ev / totalInvest) * 100) : 0;
  const verdict = getVerdict(ev);

  return {
    ev: Math.round(ev),
    roi,
    verdict: verdict.label,
    shouldAlert: verdict.minEV >= EV_VERDICT.BUY.minEV,

    rawPrice,
    psa10SoldMedian,
    psa9SoldMedian: psa9SoldMedian ?? Math.round(price9),
    psa8SoldMedian: psa8SoldMedian ?? Math.round(price8),
    gradeRate,
    gradeRatePct: `${Math.round(rate10 * 100)}%`,
    gradingCost,
    gradingTier: GRADING_TIERS[gradingTier]?.label,
    evDiscount,
    popRisk,
    psa10Pop,
    totalPop,
    rawListings,

    // Grade breakdown (clamped rates)
    grades: {
      psa10: { rate: Math.round(r10     * 100), price: Math.round(price10),  ev: Math.round(ev10)  },
      psa9:  { rate: Math.round(r9      * 100), price: Math.round(price9),   ev: Math.round(ev9)   },
      psa8:  { rate: Math.round(r8      * 100), price: Math.round(price8),   ev: Math.round(ev8)   },
      low:   { rate: Math.round(rateLow * 100), price: Math.round(priceLow), ev: Math.round(evLow) },
    },

    bestCase: Math.round(bestCase),
    worstCase: Math.round(worstCase),

    formatted: formatEVMessage({
      ev: Math.round(ev), roi, verdict: verdict.label,
      rawPrice, psa10SoldMedian,
      psa9SoldMedian: psa9SoldMedian ?? Math.round(price9),
      psa8SoldMedian: psa8SoldMedian ?? Math.round(price8),
      gradeRate, gradeRatePct: `${Math.round(rate10 * 100)}%`,
      gradingCost, gradingTier: GRADING_TIERS[gradingTier]?.label,
      psa10Pop, totalPop, rawListings, popRisk, evDiscount,
      bestCase: Math.round(bestCase), worstCase: Math.round(worstCase),
      soldCount: params.soldCount ?? null,
      grades: {
        psa10: { rate: Math.round(r10     * 100), price: Math.round(price10),  ev: Math.round(ev10)  },
        psa9:  { rate: Math.round(r9      * 100), price: Math.round(price9),   ev: Math.round(ev9)   },
        psa8:  { rate: Math.round(r8      * 100), price: Math.round(price8),   ev: Math.round(ev8)   },
        low:   { rate: Math.round(rateLow * 100), price: Math.round(priceLow), ev: Math.round(evLow) },
      },
    }),
  };
}

/**
 * Format EV alert as punchy Telegram message.
 * Lead with the price. Make it feel like a tip from a sharp friend.
 */
function formatEVMessage(d) {
  const c = '€';
  const fmt = n => Number(n).toLocaleString('de-DE');
  const popRiskEmoji = { 'VERY LOW': '🟢', 'LOW': '🟢', 'MEDIUM': '🟡', 'HIGH': '🔴', 'UNKNOWN': '⚪' };
  const riskEmoji = popRiskEmoji[d.popRisk] || '⚪';

  // Header: verdict + game context
  const lines = [
    d.verdict,
    ``,
  ];

  // THE MONEY LINE — what you pay vs what you can make
  lines.push(`💸 Buy it for    ${c}${fmt(d.rawPrice)}`);
  lines.push(`📬 Grading fee   ${c}${fmt(d.gradingCost)}  (${d.gradingTier?.split('(')[0]?.trim()})`);
  lines.push(``);

  // Grade outcome breakdown
  lines.push(`📊 What could come back:`);
  if (d.grades) {
    const g = d.grades;
    lines.push(`   PSA 10 — ${g.psa10.rate}% chance → sells ${c}${fmt(g.psa10.price)}  (+${c}${fmt(g.psa10.ev)} EV)`);
    lines.push(`   PSA  9 — ${g.psa9.rate}% chance → sells ${c}${fmt(g.psa9.price)}  (+${c}${fmt(g.psa9.ev)} EV)`);
    lines.push(`   PSA  8 — ${g.psa8.rate}% chance → sells ${c}${fmt(g.psa8.price)}  (+${c}${fmt(g.psa8.ev)} EV)`);
    lines.push(`   ≤ PSA 7 — ${g.low.rate}% chance → recover ~${c}${fmt(g.low.price)}`);
  }
  lines.push(``);

  // Bottom line
  const evSign = d.ev >= 0 ? '+' : '';
  lines.push(`🎯 Total expected value: ${evSign}${c}${fmt(d.ev)}  (${d.roi}% ROI)`);
  lines.push(`📈 Best case: +${c}${fmt(d.bestCase)} | Worst: ${c}${fmt(d.worstCase)}`);
  lines.push(``);

  // Supply intelligence
  if (d.psa10Pop !== null) {
    lines.push(`🔬 PSA 10 pop: ${fmt(d.psa10Pop)} cards graded`);
  }
  if (d.rawListings > 0) {
    lines.push(`📦 Raw float: ~${d.rawListings} ungraded copies on market`);
    lines.push(`${riskEmoji} Pop dilution risk: ${d.popRisk}${d.evDiscount > 0 ? ` (−${Math.round(d.evDiscount * 100)}% EV discount applied)` : ''}`);
  }

  return lines.join('\n');
}

/**
 * Grade rate estimates by game/era (when PSA data unavailable)
 * Based on community knowledge of typical PSA 10 rates
 */
export const GRADE_RATE_ESTIMATES = {
  'yugioh-1st-ed-lob':    0.08,  // 1st Ed Legend of Blue Eyes — very tough
  'yugioh-1st-ed-mrd':    0.10,
  'yugioh-mrd':           0.12,
  'yugioh-modern':        0.20,  // modern YGO grades easier
  'pokemon-1st-ed-base':  0.05,  // 1st Ed Base Set — near impossible PSA 10
  'pokemon-shadowless':   0.07,
  'pokemon-unlimited':    0.12,
  'pokemon-modern':       0.25,
  'onepiece-op01':        0.30,  // newer sets grade well
  'onepiece-op02':        0.35,
  'default':              0.15,  // conservative fallback
};

export function estimateGradeRate(gameName, setName) {
  const key = `${gameName}-${setName}`.toLowerCase().replace(/\s+/g, '-');
  // Try exact match first, then game prefix
  return GRADE_RATE_ESTIMATES[key] 
    ?? GRADE_RATE_ESTIMATES[gameName?.toLowerCase()]
    ?? GRADE_RATE_ESTIMATES['default'];
}

// ── Standalone test ──────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n📊 EV Calculator Test\n');

  // Example: Raw Luffy Manga Alt at €340, PSA 10 comps at €2800, pop 12
  const result = calcEV({
    rawPrice: 340,
    psa10SoldMedian: 2800,
    gradeRate: 0.18,
    evDiscount: 0,          // LOW pop risk
    gradingTier: 'regular',
    psa10Pop: 12,
    totalPop: 67,
    rawListings: 47,
    popRisk: 'LOW',
  });

  console.log('Luffy Manga Alt Example:');
  console.log(result.formatted);
  console.log(`\nEV: €${result.ev} | ROI: ${result.roi}% | Alert: ${result.shouldAlert}`);

  // Example 2: High pop risk scenario
  console.log('\n---\n');
  const result2 = calcEV({
    rawPrice: 340,
    psa10SoldMedian: 2800,
    gradeRate: 0.18,
    evDiscount: 0.40,       // HIGH pop risk — 500 raws floating
    gradingTier: 'regular',
    psa10Pop: 12,
    totalPop: 67,
    rawListings: 600,
    popRisk: 'HIGH',
  });

  console.log('High Pop Risk Example:');
  console.log(result2.formatted);
  console.log(`\nEV: €${result2.ev} | ROI: ${result2.roi}% | Alert: ${result2.shouldAlert}`);
}
