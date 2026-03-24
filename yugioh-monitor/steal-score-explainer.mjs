#!/usr/bin/env node
/**
 * Steal Score Explainer — Human-readable deal narration
 *
 * Converts the structured V2 Steal Score result into punchy, conversational
 * prose that sounds like a tip from a sharp friend — not a spreadsheet.
 *
 * Usage:
 *   import { explainDeal, explainDealShort } from './steal-score-explainer.mjs'
 *
 *   const score = calculateStealScoreV2(listing, comps, marketContext);
 *   const text  = explainDeal(listing, comps, marketContext, score);
 *   // → "This card is listed at 43% of graded value. The seller has 847 feedback.
 *   //    PSA pop is 3 — only 3 perfect copies exist. Listed 40 minutes ago.
 *   //    This is as clean as it gets."
 */

import { calculateStealScoreV2 } from './deal-intelligence-v2.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, currency = '€') {
  if (n == null || isNaN(n)) return '?';
  return `${currency}${Math.round(n).toLocaleString('de-DE')}`;
}

function fmtAge(ageHours) {
  if (ageHours == null) return null;
  if (ageHours < 1) {
    const mins = Math.round(ageHours * 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  if (ageHours < 24) {
    const h = Math.round(ageHours);
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  const days = Math.round(ageHours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// ── Phrase banks (varied openings) ───────────────────────────────────────────

const GRADE_OPENERS = {
  HOLY_GRAIL: [
    "This is as clean as it gets.",
    "You won't find a better setup this week.",
    "This listing is a mistake on the seller's part.",
    "Once in a month find. Don't overthink it.",
  ],
  OBVIOUS_STEAL: [
    "This one's hard to ignore.",
    "Seller is leaving serious money on the table.",
    "Clear mispricing — the math doesn't lie.",
    "This falls well below fair market value.",
  ],
  NO_BRAINER: [
    "The numbers work. It's that simple.",
    "Solid play — well below graded value.",
    "Not flashy, but this is how you build a position.",
    "Decent discount on a card worth chasing.",
  ],
  WATCH: [
    "Interesting but not a slam dunk.",
    "Worth monitoring — not quite there yet.",
    "Some potential here, but the setup isn't perfect.",
  ],
  SKIP: [
    "Nothing special here.",
    "Doesn't pass the bar.",
    "Move on.",
  ],
};

function pickOpener(grade, scoreObj) {
  const options = GRADE_OPENERS[grade] ?? GRADE_OPENERS['SKIP'];
  // Deterministic-ish pick based on listing price to avoid always picking [0]
  const idx = scoreObj.score % options.length;
  return options[idx];
}

// ── Sentence builders ─────────────────────────────────────────────────────────

function sentencePrice(listing, comps) {
  const pctOfFMV = comps?.psa10SoldMedian && listing?.price
    ? Math.round(((listing.price + (listing.gradingCost ?? 40)) / comps.psa10SoldMedian) * 100)
    : null;

  if (pctOfFMV !== null) {
    return `This card is listed at ${fmt(listing.price)}${listing.gradingCost ? ` (${fmt(listing.price + listing.gradingCost)} all in)` : ''} — ${pctOfFMV}% of its graded value.`;
  }
  return `This card is listed at ${fmt(listing.price)}.`;
}

function sentenceGradedValue(comps) {
  const psa10 = comps?.psa10SoldMedian;
  const psa9  = comps?.psa9SoldMedian;
  const psa8  = comps?.psa8SoldMedian;

  if (!psa10) return null;

  const parts = [`PSA 10 comps sit at ${fmt(psa10)}`];
  if (psa9)  parts.push(`PSA 9 at ${fmt(psa9)}`);
  if (psa8)  parts.push(`PSA 8 at ${fmt(psa8)}`);

  return parts.join(', ') + '.';
}

function sentencePopScarcity(marketContext) {
  const pop = marketContext?.psa10Pop;
  if (pop == null) return null;

  if (pop < 5)       return `PSA pop is ${pop} — only ${pop} perfect ${pop === 1 ? 'copy exists' : 'copies exist'} in the world.`;
  if (pop < 20)      return `PSA pop report shows ${pop} PSA 10s — very scarce supply.`;
  if (pop < 50)      return `PSA pop is ${pop} — still a limited print.`;
  return `PSA 10 pop is ${pop} — supply is plentiful, no scarcity premium.`;
}

function sentenceFreshness(listing) {
  const listedAt = listing?.listedAt ? new Date(listing.listedAt) : null;
  if (!listedAt || isNaN(listedAt.getTime())) return null;

  const ageHours = (Date.now() - listedAt.getTime()) / (1000 * 60 * 60);
  const ageStr   = fmtAge(ageHours);

  if (ageHours < 2) return `Listed just ${ageStr} ago — the arbitrage window is wide open.`;
  if (ageHours < 6) return `Listed ${ageStr} ago — still very fresh.`;
  if (ageHours < 24) return `Listed ${ageStr} ago — still within the day.`;
  return `Listed ${ageStr} ago — window may have partially closed.`;
}

function sentenceSellerProfile(listing) {
  const fb = listing?.sellerFeedback ?? listing?.feedbackScore;
  if (fb == null) return null;

  if (fb >= 1000)  return `The seller has ${fb.toLocaleString('de-DE')} feedback — well-established.`;
  if (fb >= 100)   return `Seller feedback: ${fb} — decent track record.`;
  if (fb >= 50)    return `Seller has ${fb} feedback — acceptable but verify.`;
  return `Seller feedback is only ${fb} — proceed carefully.`;
}

function sentenceTitle(listing) {
  const title = listing?.title;
  if (!title) return null;

  const bulkKeywords = ['lot', 'bulk', 'collection', 'bundle', 'misc', 'random', 'huge', 'stack'];
  const isBulk = bulkKeywords.some(k => title.toLowerCase().includes(k));

  if (isBulk) {
    return `The listing title says "${title}" — seller likely doesn't know what they have.`;
  }
  return null; // Only call out bulk titles; detailed titles don't need a sentence
}

function sentencePlatform(listing) {
  const url = (listing?.url ?? '').toLowerCase();
  if (url.includes('ebay.de')) {
    return `EU-native listing on eBay.de — clean arbitrage, no cross-border friction.`;
  }
  return null;
}

function sentenceEV(comps) {
  const roi = comps?.evRoi;
  if (roi == null) return null;

  if (roi >= 800)  return `Weighted EV is ${roi}% ROI — exceptional risk-adjusted return.`;
  if (roi >= 400)  return `Expected ROI is ${roi}% — strong fundamentals.`;
  if (roi >= 200)  return `EV projects ${roi}% ROI — solid play.`;
  if (roi > 0)     return `EV ROI is ${roi}% — marginal, but positive.`;
  return `EV is negative at ${roi}% — check the grading math.`;
}

function sentenceRiskFlags(alerts) {
  if (!alerts || alerts.length === 0) return null;
  if (alerts.length === 1) return `One flag to note: ${alerts[0].replace(/^⚠️\s*/, '').toLowerCase()}`;
  return `${alerts.length} flags: ${alerts.map(a => a.replace(/^⚠️\s*/, '')).join('; ').toLowerCase()}.`;
}

function sentenceTier(marketContext) {
  const tier = marketContext?.tier;
  if (!tier) return null;

  const tierDesc = {
    S: 'S-tier blue chip',
    A: 'A-tier strong performer',
    B: 'B-tier mid-range card',
    C: 'C-tier speculative play',
  };
  return tierDesc[tier] ? `This is a ${tierDesc[tier]}.` : null;
}

function sentenceTrend(marketContext) {
  const trend = marketContext?.trend;
  if (!trend) return null;

  if (trend === 'RISING')  return 'Market is trending up — buying into momentum.';
  if (trend === 'FALLING') return 'Market is trending down — factor in potential further decline.';
  return null; // STABLE doesn't need a sentence
}

// ── Main explainer ────────────────────────────────────────────────────────────

/**
 * Full human-readable explanation of a deal.
 * Builds a narrative from available signals — skips sentences where data is missing.
 *
 * @param {object} listing        - Same listing object as calculateStealScoreV2
 * @param {object} comps          - Same comps object
 * @param {object} marketContext  - Same marketContext object
 * @param {object} [scoreObj]     - Optional pre-computed V2 score. Re-calculated if not provided.
 * @returns {string}              - Multi-sentence human explanation
 */
export function explainDeal(listing, comps, marketContext = {}, scoreObj = null) {
  const score = scoreObj ?? calculateStealScoreV2(listing, comps, marketContext);

  const sentences = [];

  // 1. Grade header line
  const gradeLabels = {
    HOLY_GRAIL:    '🚨 HOLY GRAIL',
    OBVIOUS_STEAL: '💀 OBVIOUS STEAL',
    NO_BRAINER:    '🔥 NO-BRAINER',
    WATCH:         '👀 WATCH',
    SKIP:          '⏭️  SKIP',
  };
  sentences.push(`${gradeLabels[score.grade] ?? score.grade}  [${score.score}/100]`);
  sentences.push('');

  // 2. Price context — the money line
  sentences.push(sentencePrice(listing, comps));

  // 3. Graded comps context
  const gradedVal = sentenceGradedValue(comps);
  if (gradedVal) sentences.push(gradedVal);

  // 4. EV if meaningful
  const evSentence = sentenceEV(comps);
  if (evSentence) sentences.push(evSentence);

  // 5. Seller profile
  const sellerSentence = sentenceSellerProfile(listing);
  if (sellerSentence) sentences.push(sellerSentence);

  // 6. Pop scarcity — strong signal, should appear prominently
  const popSentence = sentencePopScarcity(marketContext);
  if (popSentence) sentences.push(popSentence);

  // 7. Freshness
  const freshSentence = sentenceFreshness(listing);
  if (freshSentence) sentences.push(freshSentence);

  // 8. Title intelligence (only if bulk title)
  const titleSentence = sentenceTitle(listing);
  if (titleSentence) sentences.push(titleSentence);

  // 9. Platform
  const platformSentence = sentencePlatform(listing);
  if (platformSentence) sentences.push(platformSentence);

  // 10. Tier & trend context
  const tierSentence = sentenceTier(marketContext);
  if (tierSentence) sentences.push(tierSentence);
  const trendSentence = sentenceTrend(marketContext);
  if (trendSentence) sentences.push(trendSentence);

  // 11. Red flags
  const riskSentence = sentenceRiskFlags(score.alerts);
  if (riskSentence) sentences.push(riskSentence);

  // 12. Closing line — the punchy verdict
  sentences.push('');
  sentences.push(pickOpener(score.grade, score));

  return sentences.filter(s => s !== null).join(' ').replace(/ {2,}/g, ' ').split('  \n  ').join('\n\n')
    // Restore blank lines between sections
    .replace(/ (🚨|💀|🔥|👀|⏭️)/g, '\n$1')
    .trim()
    // Re-join the grade header properly
    .replace(/\n(🚨 HOLY GRAIL|💀 OBVIOUS STEAL|🔥 NO-BRAINER|👀 WATCH|⏭️  SKIP)/g, '\n\n$1');
}

/**
 * Short explainer — 2-3 sentence version for notifications / previews.
 *
 * @param {object} listing
 * @param {object} comps
 * @param {object} marketContext
 * @param {object} [scoreObj]
 * @returns {string}
 */
export function explainDealShort(listing, comps, marketContext = {}, scoreObj = null) {
  const score = scoreObj ?? calculateStealScoreV2(listing, comps, marketContext);

  const pctOfFMV = comps?.psa10SoldMedian && listing?.price
    ? Math.round(((listing.price + (listing.gradingCost ?? 40)) / comps.psa10SoldMedian) * 100)
    : null;

  const parts = [];

  if (pctOfFMV !== null) {
    parts.push(`Listed at ${pctOfFMV}% of graded value (${fmt(listing.price)}).`);
  }

  const pop = marketContext?.psa10Pop;
  if (pop != null && pop < 20) {
    parts.push(`PSA pop ${pop} — only ${pop} perfect ${pop === 1 ? 'copy' : 'copies'}.`);
  }

  const listedAt = listing?.listedAt ? new Date(listing.listedAt) : null;
  if (listedAt && !isNaN(listedAt.getTime())) {
    const ageHours = (Date.now() - listedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      parts.push(`Listed ${fmtAge(ageHours)} ago.`);
    }
  }

  const fb = listing?.sellerFeedback ?? listing?.feedbackScore;
  if (fb != null) {
    parts.push(`Seller has ${fb.toLocaleString('de-DE')} feedback.`);
  }

  // Closer
  parts.push(pickOpener(score.grade, score));

  return parts.join(' ');
}

/**
 * Telegram-formatted deal card.
 * Combines the score header, explanation, and action line into a single
 * ready-to-send Telegram message.
 *
 * @param {string}  cardName
 * @param {object}  listing
 * @param {object}  comps
 * @param {object}  marketContext
 * @param {object}  [scoreObj]
 * @returns {string}  — Telegram-safe plain text
 */
export function formatDealCard(cardName, listing, comps, marketContext = {}, scoreObj = null) {
  const score = scoreObj ?? calculateStealScoreV2(listing, comps, marketContext);

  const gradeEmojis = {
    HOLY_GRAIL:    '🚨',
    OBVIOUS_STEAL: '💀',
    NO_BRAINER:    '🔥',
    WATCH:         '👀',
    SKIP:          '⏭️',
  };

  const tierEmoji = { S: '👑', A: '💎', B: '📈', C: '🎯' }[marketContext?.tier ?? 'C'] ?? '📌';
  const gradeEmoji = gradeEmojis[score.grade] ?? '📌';

  const lines = [
    `${gradeEmoji} ${score.grade}  [${score.score}/100]`,
    `${tierEmoji} ${marketContext?.tier ?? '?'}-TIER  •  ${marketContext?.game ?? 'TCG'}`,
    ``,
    cardName,
    ``,
    explainDealShort(listing, comps, marketContext, score),
    ``,
    `🔗 ${listing.url ?? '—'}`,
    ``,
  ];

  // Strengths
  if (score.strengths.length) {
    score.strengths.slice(0, 3).forEach(s => lines.push(s));
    lines.push('');
  }

  // Alerts
  if (score.alerts.length) {
    score.alerts.forEach(a => lines.push(a));
    lines.push('');
  }

  lines.push(`▶ ${score.recommendation}`);

  return lines.join('\n');
}

// ── Self-test ─────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n📖 Steal Score Explainer — Self Test\n');
  console.log('─'.repeat(55));

  // Example from the spec: "This card is listed at 43% of graded value. The seller has
  // 847 feedback. PSA pop is 3 — only 3 perfect copies exist. Listed 40 minutes ago.
  // This is as clean as it gets."

  const listing = {
    price:          180,
    gradingCost:    40,
    title:          'Blue-Eyes White Dragon LOB-001 1st Edition 2002 PSA candidate NM',
    cardName:       'blue-eyes white dragon',
    url:            'https://www.ebay.de/itm/123456789',
    platform:       'ebay.de',
    listedAt:       new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 minutes ago
    sellerFeedback: 847,
    noReturns:      false,
    relistCount:    0,
  };

  const comps = {
    psa10SoldMedian: 5000,
    psa9SoldMedian:  2400,
    psa8SoldMedian:  1100,
    evRoi:           720,
    confidence:      'HIGH',
    sampleSize:      8,
  };

  const marketContext = {
    psa10Pop: 3,
    tier:     'S',
    trend:    'RISING',
    game:     'Yu-Gi-Oh!',
  };

  const score = calculateStealScoreV2(listing, comps, marketContext);

  console.log('\n── Full Explanation ──────────────────────────\n');
  console.log(explainDeal(listing, comps, marketContext, score));

  console.log('\n── Short Explanation ─────────────────────────\n');
  console.log(explainDealShort(listing, comps, marketContext, score));

  console.log('\n── Telegram Deal Card ────────────────────────\n');
  console.log(formatDealCard('Blue-Eyes White Dragon LOB-001 1st Ed', listing, comps, marketContext, score));

  console.log('\n── Score breakdown ───────────────────────────');
  console.log(`Score: ${score.score}/100 | Grade: ${score.grade}`);
  for (const [k, v] of Object.entries(score.components)) {
    if (v.points !== undefined) {
      console.log(`  ${k.padEnd(16)}: ${String(v.points).padStart(4)}pt  / ${String(v.max ?? '?').padStart(3)} max`);
    }
  }
}
