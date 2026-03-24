#!/usr/bin/env node
/**
 * Deal Intelligence V2 — Steal Score Algorithm
 *
 * A multi-signal scoring engine that evaluates raw TCG card listings for
 * grading arbitrage opportunity. V2 significantly expands signal coverage
 * beyond the original 4-signal model.
 *
 * Signal stack (max 100 base, with tier multiplier):
 *   [35] PSA8 safety net (unchanged from V1)
 *   [30] Price vs FMV ratio
 *   [20] EV ROI quality
 *   [15] Comp confidence
 *   [15] PSA Pop scarcity bonus       ← NEW V2
 *   [10] Listing freshness bonus      ← NEW V2
 *   [±10] Title quality signal        ← NEW V2
 *   [+5] Platform bonus (eBay.de)     ← NEW V2
 *   [×1.2] S-tier multiplier          ← NEW V2
 *   [ — ] Red flag alerts (warnings)  ← NEW V2
 *
 * Usage:
 *   import { calculateStealScoreV2, STEAL_GRADES } from './deal-intelligence-v2.mjs'
 */

// ── Grade thresholds ──────────────────────────────────────────────────────────

export const STEAL_GRADES = {
  HOLY_GRAIL:    { label: '🚨 HOLY_GRAIL',    minScore: 95 },
  OBVIOUS_STEAL: { label: '💀 OBVIOUS_STEAL', minScore: 88 },
  NO_BRAINER:    { label: '🔥 NO_BRAINER',    minScore: 80 },
  WATCH:         { label: '👀 WATCH',          minScore: 60 },
  SKIP:          { label: '⏭️  SKIP',           minScore: 0  },
};

/**
 * Resolve a numeric score to a grade string.
 * @param {number} score
 * @returns {'HOLY_GRAIL'|'OBVIOUS_STEAL'|'NO_BRAINER'|'WATCH'|'SKIP'}
 */
function resolveGrade(score) {
  if (score >= STEAL_GRADES.HOLY_GRAIL.minScore)    return 'HOLY_GRAIL';
  if (score >= STEAL_GRADES.OBVIOUS_STEAL.minScore) return 'OBVIOUS_STEAL';
  if (score >= STEAL_GRADES.NO_BRAINER.minScore)    return 'NO_BRAINER';
  if (score >= STEAL_GRADES.WATCH.minScore)         return 'WATCH';
  return 'SKIP';
}

// ── Individual signal calculators ─────────────────────────────────────────────

/**
 * Signal 1 — PSA 8 safety net (+35)
 * Is there a floor grade that still covers your total cost?
 * This is the most important risk-mitigation signal.
 */
function scorePsa8Safety(listing, comps) {
  const totalCost = listing.price + (listing.gradingCost ?? 40);
  const psa8Price = comps?.psa8SoldMedian ?? 0;
  if (psa8Price >= totalCost) {
    return { points: 35, detail: `PSA 8 (€${Math.round(psa8Price)}) covers total cost (€${Math.round(totalCost)})` };
  }
  return { points: 0, detail: `PSA 8 (€${Math.round(psa8Price)}) does NOT cover total cost (€${Math.round(totalCost)})` };
}

/**
 * Signal 2 — Price vs PSA10 FMV ratio (+30 max)
 * The core value signal: how deep below fair market value is this listing?
 */
function scorePriceRatio(listing, comps) {
  const fmv         = comps?.psa10SoldMedian ?? 0;
  const gradingCost = listing.gradingCost ?? 40;
  const totalCost   = listing.price + gradingCost;

  if (!fmv || fmv <= 0) {
    return { points: 0, pctOfFMV: null, detail: 'No PSA 10 FMV data available' };
  }

  const ratio = totalCost / fmv;
  const pctOfFMV = Math.round(ratio * 100);

  let points = 0;
  let detail = '';

  if (ratio <= 0.15)      { points = 30; detail = `Listed at ${pctOfFMV}% of FMV — insane mispricing`; }
  else if (ratio <= 0.25) { points = 25; detail = `Listed at ${pctOfFMV}% of FMV — extreme steal`; }
  else if (ratio <= 0.40) { points = 18; detail = `Listed at ${pctOfFMV}% of FMV — strong discount`; }
  else if (ratio <= 0.55) { points = 10; detail = `Listed at ${pctOfFMV}% of FMV — decent deal`; }
  else                    { points =  0; detail = `Listed at ${pctOfFMV}% of FMV — no significant discount`; }

  return { points, pctOfFMV, detail };
}

/**
 * Signal 3 — EV ROI quality (+20 max)
 * How good is the weighted expected return on investment?
 */
function scoreEvRoi(listing, comps) {
  const roi = comps?.evRoi ?? 0;

  let points = 0;
  let detail = '';

  if (roi >= 800)      { points = 20; detail = `EV ROI ${roi}% — exceptional return`; }
  else if (roi >= 400) { points = 14; detail = `EV ROI ${roi}% — strong return`; }
  else if (roi >= 200) { points =  8; detail = `EV ROI ${roi}% — decent return`; }
  else                 { points =  0; detail = `EV ROI ${roi}% — marginal or negative`; }

  return { points, evRoi: roi, detail };
}

/**
 * Signal 4 — Comp confidence (+15)
 * How reliable is our data? More comps + less variance = more actionable.
 */
function scoreCompConfidence(comps) {
  const confidence = comps?.confidence ?? 'LOW';
  const compCount  = comps?.sampleSize ?? 0;

  if (confidence === 'HIGH' || compCount >= 5) {
    return { points: 15, confidence, detail: `HIGH confidence (${compCount} comps, low variance)` };
  }
  if (confidence === 'MEDIUM' || compCount >= 3) {
    return { points: 8, confidence, detail: `MEDIUM confidence (${compCount} comps)` };
  }
  return { points: 0, confidence, detail: `LOW confidence (${compCount} comps) — data thin` };
}

/**
 * Signal 5 — PSA Pop Scarcity bonus (+15 max) [V2 NEW]
 * Fewer PSA 10 copies = tighter supply ceiling = more upside + FOMO from collectors.
 * Source: marketContext.psa10Pop (pop report integer)
 */
function scorePopScarcity(marketContext) {
  const pop = marketContext?.psa10Pop ?? null;

  if (pop === null) {
    return { points: 0, psa10Pop: null, detail: 'No pop report data available' };
  }

  let points = 0;
  let detail = '';

  if (pop < 5)        { points = 15; detail = `PSA 10 pop: ${pop} — ultra-rare, only ${pop} perfect copies exist`; }
  else if (pop < 20)  { points = 10; detail = `PSA 10 pop: ${pop} — very scarce supply`; }
  else if (pop < 50)  { points =  5; detail = `PSA 10 pop: ${pop} — limited supply`; }
  else                { points =  0; detail = `PSA 10 pop: ${pop} — supply not a scarcity driver`; }

  return { points, psa10Pop: pop, detail };
}

/**
 * Signal 6 — Listing freshness bonus (+10 max) [V2 NEW]
 * Newly listed cards are most likely to still be available.
 * Fresh listings haven't been seen by the crowd yet — arbitrage window is open.
 * Source: listing.listedAt (ISO timestamp or Date object)
 */
function scoreListingFreshness(listing) {
  const listedAt = listing?.listedAt ? new Date(listing.listedAt) : null;

  if (!listedAt || isNaN(listedAt.getTime())) {
    return { points: 0, ageHours: null, detail: 'No listing timestamp available' };
  }

  const ageMs    = Date.now() - listedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  let points = 0;
  let detail = '';

  if (ageHours < 2)  {
    const ageMin = Math.round(ageHours * 60);
    points = 10;
    detail = `Listed ${ageMin} minute${ageMin !== 1 ? 's' : ''} ago — window still open`;
  } else if (ageHours < 24) {
    const h = Math.floor(ageHours);
    points = 5;
    detail = `Listed ${h} hour${h !== 1 ? 's' : ''} ago — still fresh`;
  } else {
    const days = Math.round(ageHours / 24);
    points = 0;
    detail = `Listed ${days} day${days !== 1 ? 's' : ''} ago — window may have closed`;
  }

  return { points, ageHours: Math.round(ageHours * 10) / 10, detail };
}

/**
 * Signal 7 — Title quality signal (+/-10) [V2 NEW]
 * A precise, detailed title (card name + condition + year/set) signals a
 * knowledgeable seller who priced correctly — or an uninformed one who
 * listed something rare with a vague bulk title (opportunity).
 *
 * Vague/bulk titles on high-value singles = seller doesn't know what they have.
 *
 * @param {object} listing  - listing.title (string), listing.cardName (string)
 */
function scoreTitleQuality(listing) {
  const title    = (listing?.title ?? '').toLowerCase();
  const cardName = (listing?.cardName ?? '').toLowerCase();

  if (!title) {
    return { points: 0, detail: 'No title available to evaluate' };
  }

  // Bulk/vague keywords that suggest the seller doesn't know what they have
  const bulkKeywords = [
    'lot', 'bulk', 'collection', 'bundle', 'misc', 'various',
    'mixed', 'job lot', 'random', 'huge', 'stack', 'cards',
    'see description', 'check photos',
  ];

  // High-signal detail words
  const conditionWords  = ['psa', 'bgs', 'cgc', 'nm', 'near mint', 'mint', '1st edition', 'holo', 'graded'];
  const yearPattern     = /\b(19|20)\d{2}\b/;
  const setPatterns     = /\b(lob|mrd|mrl|psv|sdk|sdy|sdj|op-?\d+|sv\d+|base set|fossil|jungle|team rocket)\b/i;

  const hasBulkKeyword  = bulkKeywords.some(k => title.includes(k));
  const hasCardName     = cardName && title.includes(cardName.split(' ')[0]);
  const hasCondition    = conditionWords.some(k => title.includes(k));
  const hasYear         = yearPattern.test(title);
  const hasSet          = setPatterns.test(title);

  // Scoring
  const detailCount = [hasCardName, hasCondition, hasYear || hasSet].filter(Boolean).length;

  if (hasBulkKeyword) {
    return {
      points: -10,
      isBulk: true,
      detail: 'Bulk/vague title — seller likely unaware of value (🔑 opportunity signal)',
    };
  }

  if (detailCount >= 3) {
    return { points: 10, isBulk: false, detail: 'Precise title (card + condition + set/year) — seller knows their stuff' };
  }

  if (detailCount >= 2) {
    return { points: 5, isBulk: false, detail: 'Reasonably detailed title' };
  }

  return { points: 0, isBulk: false, detail: 'Generic title — partial detail only' };
}

/**
 * Signal 8 — Platform bonus (+5 max) [V2 NEW]
 * eBay.de is EU-native: EU sellers, EU buyers, EU arbitrage window.
 * Cross-border comps (eBay.com) often overstate local EUR value due to currency /
 * shipping effects. EU-native listing = cleaner arbitrage.
 */
function scorePlatform(listing) {
  const url      = (listing?.url ?? '').toLowerCase();
  const platform = (listing?.platform ?? '').toLowerCase();

  const isEbayDe = url.includes('ebay.de') || platform.includes('ebay.de');

  if (isEbayDe) {
    return { points: 5, platform: 'ebay.de', detail: 'eBay.de listing — EU arbitrage window (+5)' };
  }

  const isEbay = url.includes('ebay.') || platform.includes('ebay');
  if (isEbay) {
    return { points: 0, platform: 'ebay', detail: 'eBay international listing — no EU bonus' };
  }

  return { points: 0, platform: platform || 'unknown', detail: 'Non-eBay platform' };
}

/**
 * Red flag detector — warnings that reduce confidence without deducting points
 * Returns an array of alert strings.
 */
function detectRedFlags(listing, marketContext) {
  const alerts = [];

  // 1. No returns policy
  const returns = (listing?.returnsPolicy ?? listing?.returns ?? '').toLowerCase();
  if (returns.includes('no return') || returns.includes('no refund') || listing?.noReturns === true) {
    alerts.push('⚠️ No returns policy — grading risk is entirely on you');
  }

  // 2. Low seller feedback
  const feedback = listing?.sellerFeedback ?? listing?.feedbackScore ?? null;
  if (feedback !== null && feedback < 50) {
    alerts.push(`⚠️ Low seller feedback (${feedback}) — increased counterparty risk`);
  }

  // 3. Round number price (potential placeholder/lazy pricing)
  const price = listing?.price ?? 0;
  if (price > 0 && price % 50 === 0) {
    alerts.push(`⚠️ Round number price (€${price}) — may be a placeholder, not a researched price`);
  }

  // 4. Relisted / listed multiple times
  const relistCount = listing?.relistCount ?? listing?.relistCount ?? null;
  if (relistCount !== null && relistCount > 0) {
    alerts.push(`⚠️ Relisted ${relistCount}x — hasn't sold before, why now?`);
  }

  // 5. Zero or very low price (sanity check)
  if (price > 0 && price < 5) {
    alerts.push(`⚠️ Suspiciously low price (€${price}) — verify this is a real listing`);
  }

  // 6. No photos (if platform reports it)
  if (listing?.photoCount !== undefined && listing.photoCount === 0) {
    alerts.push('⚠️ No photos — impossible to assess card condition');
  }

  return alerts;
}

/**
 * Strength collector — positive non-scored signals to highlight
 */
function collectStrengths(signals, listing, marketContext) {
  const strengths = [];

  if (signals.psa8Safety.points === 35) {
    strengths.push('✅ PSA 8 covers costs — even the downside is profitable');
  }
  if (signals.priceRatio.pctOfFMV !== null && signals.priceRatio.pctOfFMV <= 40) {
    strengths.push(`✅ Paying only ${signals.priceRatio.pctOfFMV}% of graded value — deep discount`);
  }
  if (signals.popScarcity.psa10Pop !== null && signals.popScarcity.psa10Pop < 20) {
    strengths.push(`✅ PSA pop ${signals.popScarcity.psa10Pop} — genuine scarcity drives long-term value`);
  }
  if (signals.freshness.ageHours !== null && signals.freshness.ageHours < 6) {
    strengths.push(`✅ Listed recently — arbitrage window is still open`);
  }
  if (signals.titleQuality.isBulk === true) {
    strengths.push("✅ Vague bulk title — seller likely doesn't know what they have");
  }
  if (signals.platform.platform === 'ebay.de') {
    strengths.push('✅ EU-native listing — cleaner arbitrage, local comps apply');
  }
  if (signals.compConfidence.points === 15) {
    strengths.push('✅ HIGH confidence comps — price signal is reliable');
  }
  if (signals.evRoi.evRoi >= 400) {
    strengths.push(`✅ ${signals.evRoi.evRoi}% expected ROI — strong risk-adjusted return`);
  }

  return strengths;
}

/**
 * Tier multiplier — S-tier cards get a score boost because they're worth more risk
 * and their long-term upside justifies slightly lower immediate steal ratios.
 */
function applyTierMultiplier(score, marketContext) {
  const tier = marketContext?.tier ?? 'C';

  if (tier === 'S') {
    // Boost towards 100 (not beyond) — S-tier cards are blue chips
    const boosted = Math.round(score * 1.2);
    return {
      score:      Math.min(100, boosted),
      multiplier: 1.2,
      tier,
      detail: `S-tier card — 1.2× score multiplier applied (${score} → ${Math.min(100, boosted)})`,
    };
  }

  return {
    score,
    multiplier: 1.0,
    tier,
    detail: `${tier}-tier card — no multiplier`,
  };
}

/**
 * Build a punchy one-sentence recommendation based on grade + top signals.
 */
function buildRecommendation(grade, score, signals, alerts) {
  const hasAlerts = alerts.length > 0;

  switch (grade) {
    case 'HOLY_GRAIL':
      if (!hasAlerts) return 'Pull the trigger — this listing will not last another hour.';
      return `Screaming buy even with flags — score ${score}/100, proceed with eyes open.`;

    case 'OBVIOUS_STEAL':
      if (!hasAlerts) return 'Clear mispricing — buy this before someone else does.';
      return `Strong steal (${score}/100), but check the alerts before you click buy.`;

    case 'NO_BRAINER':
      if (signals.popScarcity.points >= 10) return 'Scarce pop + cheap price = rare combo — this is a no-brainer.';
      if (signals.freshness.points === 10) return 'Just listed and already mis-priced — act now.';
      return `Solid play at ${score}/100 — the math works in your favour.`;

    case 'WATCH':
      return `Interesting but not a slam dunk (${score}/100) — monitor and re-evaluate if price drops.`;

    case 'SKIP':
    default:
      if (alerts.length >= 3) return 'Too many red flags for the upside on offer — skip.';
      return `Doesn't clear the bar (${score}/100) — better opportunities exist.`;
  }
}

// ── Confidence label ──────────────────────────────────────────────────────────

function buildConfidenceLabel(signals, alerts) {
  const compConf  = signals.compConfidence.confidence ?? 'LOW';
  const flagCount = alerts.length;

  if (compConf === 'HIGH' && flagCount === 0) return 'HIGH — solid data, clean listing';
  if (compConf === 'HIGH' && flagCount >= 2)  return 'MEDIUM — good data but flags present';
  if (compConf === 'MEDIUM' && flagCount === 0) return 'MEDIUM — decent data, proceed carefully';
  if (compConf === 'LOW')                     return 'LOW — thin comps, higher uncertainty';
  return 'MEDIUM';
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * V2 Steal Score — 7-signal deal intelligence engine.
 *
 * @param {object} listing
 *   @param {number}  listing.price             - Current listing price (EUR)
 *   @param {number}  [listing.gradingCost=40]  - PSA grading cost (EUR)
 *   @param {string}  [listing.title]           - eBay listing title
 *   @param {string}  [listing.cardName]        - Card name to match against title
 *   @param {string}  [listing.url]             - Listing URL (used for platform detection)
 *   @param {string}  [listing.platform]        - 'ebay.de' | 'ebay.com' | etc.
 *   @param {string}  [listing.listedAt]        - ISO timestamp of listing date
 *   @param {string}  [listing.returnsPolicy]   - Return policy text
 *   @param {number}  [listing.sellerFeedback]  - Seller feedback score
 *   @param {number}  [listing.relistCount]     - Times the item has been relisted
 *   @param {boolean} [listing.noReturns]       - Explicit no-returns flag
 *   @param {number}  [listing.photoCount]      - Number of listing photos
 *
 * @param {object} comps
 *   @param {number}  comps.psa10SoldMedian     - PSA 10 median sold price (EUR)
 *   @param {number}  [comps.psa9SoldMedian]    - PSA 9 median sold price
 *   @param {number}  [comps.psa8SoldMedian]    - PSA 8 median sold price
 *   @param {number}  [comps.evRoi]             - Weighted expected ROI %
 *   @param {string}  [comps.confidence]        - 'HIGH' | 'MEDIUM' | 'LOW'
 *   @param {number}  [comps.sampleSize]        - Number of sold comps used
 *
 * @param {object} marketContext
 *   @param {number}  [marketContext.psa10Pop]  - PSA 10 pop report count
 *   @param {string}  [marketContext.tier]      - 'S' | 'A' | 'B' | 'C'
 *   @param {string}  [marketContext.trend]     - 'RISING' | 'STABLE' | 'FALLING'
 *   @param {string}  [marketContext.game]      - Game name string
 *
 * @returns {{
 *   score: number,
 *   grade: string,
 *   components: object,
 *   alerts: string[],
 *   strengths: string[],
 *   confidence: string,
 *   recommendation: string
 * }}
 */
export function calculateStealScoreV2(listing, comps, marketContext = {}) {
  // ── Compute each signal ─────────────────────────────────────────────────────
  const signals = {
    psa8Safety:    scorePsa8Safety(listing, comps),
    priceRatio:    scorePriceRatio(listing, comps),
    evRoi:         scoreEvRoi(listing, comps),
    compConfidence:scoreCompConfidence(comps),
    popScarcity:   scorePopScarcity(marketContext),
    freshness:     scoreListingFreshness(listing),
    titleQuality:  scoreTitleQuality(listing),
    platform:      scorePlatform(listing),
  };

  // ── Raw score ───────────────────────────────────────────────────────────────
  const rawScore = Object.values(signals).reduce((sum, s) => sum + (s.points ?? 0), 0);
  const clampedRaw = Math.max(0, Math.min(100, rawScore)); // title can go negative

  // ── Tier multiplier ─────────────────────────────────────────────────────────
  const tiered    = applyTierMultiplier(clampedRaw, marketContext);
  const finalScore = tiered.score;

  // ── Red flags ───────────────────────────────────────────────────────────────
  const alerts = detectRedFlags(listing, marketContext);

  // ── Strengths ───────────────────────────────────────────────────────────────
  const strengths = collectStrengths(signals, listing, marketContext);

  // ── Grade ───────────────────────────────────────────────────────────────────
  const grade = resolveGrade(finalScore);

  // ── Confidence ──────────────────────────────────────────────────────────────
  const confidence = buildConfidenceLabel(signals, alerts);

  // ── Recommendation ──────────────────────────────────────────────────────────
  const recommendation = buildRecommendation(grade, finalScore, signals, alerts);

  // ── Component breakdown ─────────────────────────────────────────────────────
  const components = {
    psa8Safety:     { points: signals.psa8Safety.points,     max: 35,  detail: signals.psa8Safety.detail },
    priceRatio:     { points: signals.priceRatio.points,     max: 30,  detail: signals.priceRatio.detail,     pctOfFMV: signals.priceRatio.pctOfFMV },
    evRoi:          { points: signals.evRoi.points,          max: 20,  detail: signals.evRoi.detail,          evRoi: signals.evRoi.evRoi },
    compConfidence: { points: signals.compConfidence.points, max: 15,  detail: signals.compConfidence.detail, confidence: signals.compConfidence.confidence },
    popScarcity:    { points: signals.popScarcity.points,    max: 15,  detail: signals.popScarcity.detail,    psa10Pop: signals.popScarcity.psa10Pop },
    freshness:      { points: signals.freshness.points,      max: 10,  detail: signals.freshness.detail,      ageHours: signals.freshness.ageHours },
    titleQuality:   { points: signals.titleQuality.points,   max: 10,  detail: signals.titleQuality.detail,   isBulk: signals.titleQuality.isBulk },
    platform:       { points: signals.platform.points,       max: 5,   detail: signals.platform.detail,       platform: signals.platform.platform },
    tierMultiplier: { multiplier: tiered.multiplier,                   detail: tiered.detail, tier: tiered.tier },
  };

  return {
    score:          finalScore,
    rawScore:       clampedRaw,
    grade,
    components,
    alerts,
    strengths,
    confidence,
    recommendation,
  };
}

// ── Convenience re-export: V1-compatible wrapper ──────────────────────────────
// Drop-in upgrade path: call with the same args as calcStealScore() from V1.

/**
 * V1-compatible thin wrapper around V2.
 * Accepts the same flat params as the V1 calcStealScore function and
 * returns the enhanced V2 result.
 */
export function calcStealScoreV2Compat({
  buyPrice,
  gradingCost = 40,
  psa10Median,
  psa8Profitable,
  evRoi,
  highConfidence,
  tier,
  // V2 extras (optional):
  listedAt,
  psa10Pop,
  title,
  cardName,
  url,
  platform,
  sellerFeedback,
  noReturns,
  relistCount,
  sampleSize,
}) {
  const listing = {
    price:          buyPrice,
    gradingCost,
    listedAt,
    title,
    cardName,
    url,
    platform,
    sellerFeedback,
    noReturns,
    relistCount,
  };

  const comps = {
    psa10SoldMedian: psa10Median,
    psa8SoldMedian:  psa8Profitable ? psa10Median * 0.25 : null, // rough proxy
    evRoi:           evRoi,
    confidence:      highConfidence ? 'HIGH' : 'MEDIUM',
    sampleSize,
  };

  const marketContext = {
    psa10Pop,
    tier: tier ?? 'C',
  };

  return calculateStealScoreV2(listing, comps, marketContext);
}

// ── Self-test ─────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n🧪 Deal Intelligence V2 — Self Test\n');

  // Scenario A: Holy Grail — S-tier, ultra pop, brand new listing
  const resultA = calculateStealScoreV2(
    {
      price:          120,
      gradingCost:    40,
      title:          'Blue-Eyes White Dragon LOB 1st Edition PSA 10 candidate 2002',
      cardName:       'blue-eyes white dragon',
      url:            'https://www.ebay.de/itm/123456',
      platform:       'ebay.de',
      listedAt:       new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 minutes ago
      sellerFeedback: 1240,
      noReturns:      false,
      relistCount:    0,
    },
    {
      psa10SoldMedian: 4500,
      psa9SoldMedian:  2100,
      psa8SoldMedian:  950,
      evRoi:           820,
      confidence:      'HIGH',
      sampleSize:      9,
    },
    {
      psa10Pop: 4,
      tier:     'S',
      trend:    'RISING',
      game:     'Yu-Gi-Oh!',
    }
  );

  console.log('=== Scenario A: Blue-Eyes LOB 1st Ed (should be HOLY_GRAIL) ===');
  console.log(`Score: ${resultA.score}/100 | Grade: ${resultA.grade}`);
  console.log(`Recommendation: ${resultA.recommendation}`);
  console.log('Strengths:');
  resultA.strengths.forEach(s => console.log(`  ${s}`));
  if (resultA.alerts.length) {
    console.log('Alerts:');
    resultA.alerts.forEach(a => console.log(`  ${a}`));
  }
  console.log('\nComponents:');
  for (const [k, v] of Object.entries(resultA.components)) {
    if (v.points !== undefined) {
      console.log(`  ${k.padEnd(16)}: ${String(v.points).padStart(3)}pt  — ${v.detail}`);
    } else {
      console.log(`  ${k.padEnd(16)}: ${v.multiplier}×   — ${v.detail}`);
    }
  }

  // Scenario B: SKIP — high pop, old listing, round price, no returns, new seller
  const resultB = calculateStealScoreV2(
    {
      price:          800,
      gradingCost:    40,
      title:          'card lot collection bulk tcg cards see photos',
      cardName:       'dark magician',
      url:            'https://www.ebay.com/itm/999999',
      platform:       'ebay.com',
      listedAt:       new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      sellerFeedback: 12,
      noReturns:      true,
      relistCount:    3,
    },
    {
      psa10SoldMedian: 900,
      psa9SoldMedian:  500,
      psa8SoldMedian:  200,
      evRoi:           5,
      confidence:      'LOW',
      sampleSize:      1,
    },
    {
      psa10Pop: 180,
      tier:     'C',
      trend:    'FALLING',
      game:     'Yu-Gi-Oh!',
    }
  );

  console.log('\n=== Scenario B: Overpriced bulk lot (should be SKIP) ===');
  console.log(`Score: ${resultB.score}/100 | Grade: ${resultB.grade}`);
  console.log(`Recommendation: ${resultB.recommendation}`);
  console.log('Alerts:');
  resultB.alerts.forEach(a => console.log(`  ${a}`));

  // Scenario C: NO_BRAINER — good value, decent pop
  const resultC = calculateStealScoreV2(
    {
      price:          280,
      gradingCost:    40,
      title:          'Charizard Base Set Unlimited Holo 1999 PSA candidate',
      cardName:       'charizard',
      url:            'https://www.ebay.de/itm/777888',
      platform:       'ebay.de',
      listedAt:       new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
      sellerFeedback: 342,
      noReturns:      false,
      relistCount:    0,
    },
    {
      psa10SoldMedian: 1800,
      psa9SoldMedian:  850,
      psa8SoldMedian:  420,
      evRoi:           310,
      confidence:      'MEDIUM',
      sampleSize:      4,
    },
    {
      psa10Pop: 35,
      tier:     'A',
      trend:    'STABLE',
      game:     'Pokémon',
    }
  );

  console.log('\n=== Scenario C: Charizard Base Unlimited (should be NO_BRAINER or OBVIOUS_STEAL) ===');
  console.log(`Score: ${resultC.score}/100 | Grade: ${resultC.grade}`);
  console.log(`Recommendation: ${resultC.recommendation}`);
  console.log('Strengths:');
  resultC.strengths.forEach(s => console.log(`  ${s}`));
}
