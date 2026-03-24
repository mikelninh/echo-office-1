/**
 * comp-intelligence.mjs
 * Smart price intelligence engine for Card Sniper grading arbitrage platform.
 *
 * Exports:
 *   analyzeComps(soldPrices, options)   → smart FMV with confidence, volatility, trends
 *   detectPriceManipulation(soldPrices) → wash-trade / fake-sale detection
 *   getGradingROI(rawPrice, comps, gradingCost) → full PSA grading ROI breakdown
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sort an array of numbers ascending (non-mutating).
 */
function sorted(arr) {
  return [...arr].sort((a, b) => a - b);
}

/**
 * Percentile value from a sorted array (linear interpolation).
 * @param {number[]} sortedArr - already sorted ascending
 * @param {number}   p         - percentile 0–100
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

/**
 * Weighted median using (value, weight) pairs.
 * @param {Array<{price: number, weight: number}>} items
 */
function weightedMedian(items) {
  if (items.length === 0) return 0;
  const total = items.reduce((s, i) => s + i.weight, 0);
  const sorted = [...items].sort((a, b) => a.price - b.price);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= total / 2) return item.price;
  }
  return sorted[sorted.length - 1].price;
}

/**
 * Determine recency weight for a sale.
 * @param {number|null} daysAgo - days since sale; null = unknown → treat as 90d+
 */
function recencyWeight(daysAgo) {
  if (daysAgo === null || daysAgo === undefined) return 1;
  if (daysAgo <= 30) return 3;
  if (daysAgo <= 90) return 1.5;
  return 1;
}

/**
 * Normalise a soldPrices entry to { price, daysAgo }.
 * Accepts:
 *   - plain number             → { price: n, daysAgo: null }
 *   - { price, daysAgo? }     → as-is
 *   - { price, date }         → daysAgo computed from today
 *   - { price, soldAt }       → same
 */
function normalise(entry) {
  if (typeof entry === 'number') return { price: entry, daysAgo: null };
  const price = Number(entry.price ?? entry.value ?? entry);
  let daysAgo = entry.daysAgo ?? null;
  if (daysAgo === null) {
    const dateStr = entry.date ?? entry.soldAt ?? entry.timestamp ?? null;
    if (dateStr) {
      const ms = Date.now() - new Date(dateStr).getTime();
      daysAgo = Math.max(0, Math.round(ms / 86_400_000));
    }
  }
  return { price, daysAgo };
}

/**
 * Seasonal comment based on the current month.
 */
function seasonalNote(month /* 0-indexed */) {
  if (month >= 9 && month <= 11) {
    return 'Prices typically higher in Q4 (holiday gifting season)';
  }
  if (month >= 0 && month <= 1) {
    return 'Post-holiday price dip common in January–February';
  }
  if (month >= 5 && month <= 7) {
    return 'Summer tournament season may elevate meta-relevant cards';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grade-rate map (real-world PSA submission estimates by set/era)
// ---------------------------------------------------------------------------

const GRADE_RATES = {
  'yugioh-1st-ed-lob':  { psa10: 0.08, psa9: 0.25, psa8: 0.30, below: 0.37 },
  'pokemon-base-1st':   { psa10: 0.05, psa9: 0.15, psa8: 0.25, below: 0.55 },
  'pokemon-shadowless': { psa10: 0.07, psa9: 0.20, psa8: 0.28, below: 0.45 },
  'onepiece-op01':      { psa10: 0.30, psa9: 0.35, psa8: 0.20, below: 0.15 },
  'default':            { psa10: 0.15, psa9: 0.30, psa8: 0.25, below: 0.30 },
};

function gradeRates(cardEra) {
  return GRADE_RATES[cardEra] ?? GRADE_RATES['default'];
}

// ---------------------------------------------------------------------------
// analyzeComps
// ---------------------------------------------------------------------------

/**
 * Analyse a set of sold comps and return smart price intelligence.
 *
 * @param {Array<number | {price: number, daysAgo?: number, date?: string}>} soldPrices
 * @param {object} options
 * @param {string} [options.cardEra]   - for seasonal/grade context
 * @param {boolean} [options.debug]    - log internals to console
 * @returns {object} Price intelligence report
 */
export function analyzeComps(soldPrices, options = {}) {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed

  // --- Normalise input ---
  const raw = (soldPrices ?? []).map(normalise).filter(e => isFinite(e.price) && e.price > 0);

  if (raw.length < 3) {
    return {
      fmv: null,
      fmvLow: null,
      fmvHigh: null,
      confidence: 'INSUFFICIENT',
      sampleSize: raw.length,
      outlierCount: 0,
      priceVolatility: null,
      trend30d: null,
      trend90d: null,
      seasonalNote: seasonalNote(currentMonth),
      methodology: 'Insufficient data — fewer than 3 valid comps provided.',
    };
  }

  // --- IQR outlier removal ---
  const prices = raw.map(e => e.price);
  const sortedPrices = sorted(prices);
  const q1 = percentile(sortedPrices, 25);
  const q3 = percentile(sortedPrices, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const filtered = raw.filter(e => e.price >= lowerFence && e.price <= upperFence);
  const outlierCount = raw.length - filtered.length;

  if (options.debug) {
    console.log('[analyzeComps] IQR fences:', { q1, q3, iqr, lowerFence, upperFence });
    console.log('[analyzeComps] Filtered out', outlierCount, 'outliers');
  }

  // Need at least 3 after outlier removal
  if (filtered.length < 3) {
    const fallbackPrices = sorted(prices);
    return {
      fmv: percentile(fallbackPrices, 50),
      fmvLow: percentile(fallbackPrices, 25),
      fmvHigh: percentile(fallbackPrices, 75),
      confidence: 'INSUFFICIENT',
      sampleSize: raw.length,
      outlierCount,
      priceVolatility: null,
      trend30d: null,
      trend90d: null,
      seasonalNote: seasonalNote(currentMonth),
      methodology: 'Too few comps remained after outlier removal; using raw median fallback.',
    };
  }

  // --- Recency-weighted FMV ---
  const weightedItems = filtered.map(e => ({
    price: e.price,
    weight: recencyWeight(e.daysAgo),
  }));
  const fmv = weightedMedian(weightedItems);

  // --- Percentile bands on filtered (unweighted for stability) ---
  const filteredSorted = sorted(filtered.map(e => e.price));
  const fmvLow  = percentile(filteredSorted, 25);
  const fmvHigh = percentile(filteredSorted, 75);

  // --- Confidence ---
  const n = filtered.length;
  const confidence =
    n >= 8 ? 'HIGH' :
    n >= 5 ? 'MEDIUM' :
    'LOW';

  // --- Volatility (coefficient of variation) ---
  const mean = filteredSorted.reduce((s, p) => s + p, 0) / filteredSorted.length;
  const variance = filteredSorted.reduce((s, p) => s + (p - mean) ** 2, 0) / filteredSorted.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // --- Trend analysis ---
  const withDates = filtered.filter(e => e.daysAgo !== null);
  const recent30  = withDates.filter(e => e.daysAgo <= 30).map(e => e.price);
  const prev30to90 = withDates.filter(e => e.daysAgo > 30 && e.daysAgo <= 90).map(e => e.price);
  const prev90plus = withDates.filter(e => e.daysAgo > 90).map(e => e.price);

  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  const avg30  = avg(recent30);
  const avg60  = avg(prev30to90);
  const avg90p = avg(prev90plus);

  const trend30d = (avg30 !== null && avg60 !== null)
    ? Math.round(((avg30 - avg60) / avg60) * 100 * 10) / 10
    : null;

  const trend90d = (avg30 !== null && avg90p !== null)
    ? Math.round(((avg30 - avg90p) / avg90p) * 100 * 10) / 10
    : null;

  // --- Volatility label ---
  let priceVolatility;
  if (cv > 0.40) {
    priceVolatility = 'VOLATILE';
  } else if (trend30d !== null && Math.abs(trend30d) >= 10) {
    priceVolatility = trend30d > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  } else {
    priceVolatility = 'STABLE';
  }

  // --- Methodology string ---
  const methodParts = [
    `IQR outlier removal (fences $${lowerFence.toFixed(2)}–$${upperFence.toFixed(2)}, removed ${outlierCount})`,
    `recency weighting (30d=3×, 30–90d=1.5×, 90d+=1×)`,
    `weighted median on ${filtered.length} clean comps`,
    `CV=${(cv * 100).toFixed(1)}%`,
  ];
  const methodology = methodParts.join('; ');

  if (options.debug) {
    console.log('[analyzeComps] Result:', { fmv, fmvLow, fmvHigh, confidence, cv: (cv * 100).toFixed(1) + '%', trend30d, trend90d });
  }

  return {
    fmv: Math.round(fmv * 100) / 100,
    fmvLow: Math.round(fmvLow * 100) / 100,
    fmvHigh: Math.round(fmvHigh * 100) / 100,
    confidence,
    sampleSize: raw.length,
    outlierCount,
    priceVolatility,
    trend30d,
    trend90d,
    seasonalNote: seasonalNote(currentMonth),
    methodology,
  };
}

// ---------------------------------------------------------------------------
// detectPriceManipulation
// ---------------------------------------------------------------------------

/**
 * Detect wash-trading / fake-sale patterns in sold comps.
 *
 * Heuristics checked:
 *  1. Cluster of identical prices (>40% of sales at same price → suspicious)
 *  2. Abnormally tight price band (CV < 2% with 5+ sales → possibly staged)
 *  3. Price spike + crash pattern (sudden 2×+ jump then return within window)
 *  4. High velocity in a short window (≥5 sales within 48h at similar price)
 *
 * @param {Array<number | {price, daysAgo?, date?}>} soldPrices
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
export function detectPriceManipulation(soldPrices) {
  const raw = (soldPrices ?? []).map(normalise).filter(e => isFinite(e.price) && e.price > 0);

  if (raw.length < 3) {
    return { suspicious: false, reason: null };
  }

  const prices = raw.map(e => e.price);
  const reasons = [];

  // 1. Identical price clustering
  const freq = {};
  for (const p of prices) {
    const bucket = Math.round(p * 10) / 10; // 1-decimal bucket
    freq[bucket] = (freq[bucket] ?? 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq / prices.length > 0.4 && prices.length >= 5) {
    const dominantPrice = Object.entries(freq).find(([, v]) => v === maxFreq)?.[0];
    reasons.push(`${Math.round((maxFreq / prices.length) * 100)}% of sales clustered at $${dominantPrice} — possible wash trading`);
  }

  // 2. Abnormally tight price band (CV < 2% with 5+ sales)
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const stddev = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
  const cv = mean > 0 ? stddev / mean : 0;
  if (cv < 0.02 && prices.length >= 5) {
    reasons.push(`Suspiciously uniform prices (CV=${(cv * 100).toFixed(2)}%) across ${prices.length} sales — may be staged`);
  }

  // 3. Price spike + crash within the dated window
  const withDates = raw
    .filter(e => e.daysAgo !== null)
    .sort((a, b) => b.daysAgo - a.daysAgo); // oldest first

  if (withDates.length >= 5) {
    for (let i = 1; i < withDates.length - 1; i++) {
      const prev = withDates[i - 1].price;
      const curr = withDates[i].price;
      const next = withDates[i + 1].price;
      if (curr > prev * 2 && next < curr * 0.6) {
        reasons.push(`Price spike+crash detected: $${prev.toFixed(2)} → $${curr.toFixed(2)} → $${next.toFixed(2)} — possible manipulation`);
        break;
      }
    }
  }

  // 4. High-velocity burst (≥5 sales within 48h at similar price)
  const withDatesArr = raw.filter(e => e.daysAgo !== null);
  for (const anchor of withDatesArr) {
    const window = withDatesArr.filter(e =>
      Math.abs(e.daysAgo - anchor.daysAgo) <= 2 // within 48h
    );
    if (window.length >= 5) {
      const windowMean = window.reduce((s, e) => s + e.price, 0) / window.length;
      const allClose = window.every(e => Math.abs(e.price - windowMean) / windowMean < 0.05);
      if (allClose) {
        reasons.push(`${window.length} near-identical sales within 48h — possible velocity manipulation`);
        break;
      }
    }
  }

  if (reasons.length > 0) {
    return { suspicious: true, reason: reasons.join(' | ') };
  }
  return { suspicious: false, reason: null };
}

// ---------------------------------------------------------------------------
// getGradingROI
// ---------------------------------------------------------------------------

/**
 * Calculate full grading ROI for a raw card across PSA grades.
 *
 * @param {number} rawPrice   - what you're paying for the ungraded card
 * @param {object} comps      - grade-level comps: { psa10, psa9, psa8, psa7? }
 *                             Each value: number (price) or analyzeComps() result
 * @param {number} [gradingCost=35] - all-in cost to grade (submission + shipping)
 * @param {string} [cardEra='default'] - key into GRADE_RATES map
 * @returns {object}
 */
export function getGradingROI(rawPrice, comps, gradingCost = 35, cardEra = 'default') {
  const rates = gradeRates(cardEra);
  const totalCost = rawPrice + gradingCost;

  /**
   * Extract a price from a comp value (number or analyzeComps result).
   */
  function extractPrice(comp) {
    if (comp === null || comp === undefined) return null;
    if (typeof comp === 'number') return comp;
    return comp.fmv ?? comp.price ?? null;
  }

  const p10 = extractPrice(comps.psa10);
  const p9  = extractPrice(comps.psa9);
  const p8  = extractPrice(comps.psa8);
  const p7  = extractPrice(comps.psa7 ?? comps.below ?? rawPrice * 0.8); // fallback

  function gradeResult(gradedPrice, rate, label) {
    if (gradedPrice === null) return { label, gradedPrice: null, rate, profit: null, roi: null, ev: null };
    const profit = gradedPrice - totalCost;
    const roi = (profit / totalCost) * 100;
    const ev = gradedPrice * rate; // expected value contribution
    return {
      label,
      gradedPrice: Math.round(gradedPrice * 100) / 100,
      rate: `${Math.round(rate * 100)}%`,
      profit: Math.round(profit * 100) / 100,
      roi: `${Math.round(roi * 10) / 10}%`,
      ev: Math.round(ev * 100) / 100,
    };
  }

  const psa10Result = gradeResult(p10, rates.psa10, 'PSA 10');
  const psa9Result  = gradeResult(p9,  rates.psa9,  'PSA 9');
  const psa8Result  = gradeResult(p8,  rates.psa8,  'PSA 8');
  const belowResult = gradeResult(p7,  rates.below, 'PSA 7 or lower');

  // --- Expected value across all grades ---
  const evTotal =
    (p10 !== null ? p10 * rates.psa10 : 0) +
    (p9  !== null ? p9  * rates.psa9  : 0) +
    (p8  !== null ? p8  * rates.psa8  : 0) +
    (p7  !== null ? p7  * rates.below : 0);

  const expectedProfit = evTotal - totalCost;
  const expectedROI = totalCost > 0 ? (expectedProfit / totalCost) * 100 : 0;

  // --- Break-even grade ---
  let breakEven = 'Not profitable at any grade';
  if (p10 !== null && p10 >= totalCost) breakEven = 'PSA 10 needed';
  if (p9  !== null && p9  >= totalCost) breakEven = 'PSA 9 or better';
  if (p8  !== null && p8  >= totalCost) breakEven = 'PSA 8 or better';
  if (p7  !== null && p7  >= totalCost) breakEven = 'Even PSA 7 is profitable';

  // --- Recommendation ---
  let recommendation;
  if (expectedROI >= 40) {
    recommendation = '🔥 STRONG BUY — excellent expected ROI for grading';
  } else if (expectedROI >= 15) {
    recommendation = '✅ BUY — positive expected value for grading';
  } else if (expectedROI >= 0) {
    recommendation = '⚠️ MARGINAL — slim positive EV; only grade if card condition is strong';
  } else if (expectedROI >= -15) {
    recommendation = '❌ PASS — negative EV; not worth grading at this buy price';
  } else {
    recommendation = '🚫 AVOID — significant negative expected value';
  }

  return {
    rawPrice,
    gradingCost,
    totalCost: Math.round(totalCost * 100) / 100,
    cardEra,
    psa10: psa10Result,
    psa9:  psa9Result,
    psa8:  psa8Result,
    belowPsa8: belowResult,
    expectedValue: Math.round(evTotal * 100) / 100,
    expectedProfit: Math.round(expectedProfit * 100) / 100,
    expectedROI: `${Math.round(expectedROI * 10) / 10}%`,
    breakEven,
    recommendation,
  };
}
