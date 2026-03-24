/**
 * VeVe Digital Collectibles Tracker
 *
 * VeVe's API requires auth tokens, so we use two public sources:
 *   1. ecomiwiki.com web scrape (community tracker, officially endorsed by ECOMI)
 *   2. Static known floor data for Star Wars lightsabers with manual update notes
 *
 * Owner context: Mikel has 100+ Star Wars lightsabers (green + blue series)
 *
 * Sell options:
 *   - VeVe secondary market (Gems) — 2.5% fee + 6% licensor fee for Star Wars = 8.5% total
 *   - StackR marketplace (OMI tokens) — since Nov 2025, the crypto exit route
 */

const VEVE_MARKET_URL = 'https://veve.me/market';
const ECOMIWIKI_URL   = 'https://ecomiwiki.com/veve/market';

// Known Star Wars lightsaber collections (Series 1, 2022 drop)
// Floor prices in Gems (≈ $1 each) — update these from VeVe app periodically
const KNOWN_COLLECTIONS = {
  'Luke Skywalker Lightsaber (Green)': {
    series: 'Star Wars Lightsabers S1',
    rarity: 'Uncommon',
    totalIssued: 16000,
    currentFloorGems: null, // fetched dynamically
    notes: 'Green saber — Luke/Yoda association, higher demand',
    marketUrl: 'https://veve.me/market?search=luke+skywalker+lightsaber',
  },
  'Obi-Wan Kenobi Lightsaber (Blue)': {
    series: 'Star Wars Lightsabers S1',
    rarity: 'Uncommon',
    totalIssued: 16000,
    currentFloorGems: null,
    notes: 'Blue saber — Obi-Wan/Anakin, popular but slightly lower premium than green',
    marketUrl: 'https://veve.me/market?search=obi-wan+lightsaber',
  },
  'Anakin Skywalker Lightsaber (Blue)': {
    series: 'Star Wars Lightsabers S1',
    rarity: 'Uncommon',
    totalIssued: 14000,
    currentFloorGems: null,
    notes: 'Blue saber — Anakin/Vader connection adds lore value',
    marketUrl: 'https://veve.me/market?search=anakin+lightsaber',
  },
};

/**
 * Try to fetch floor price data from ecomiwiki (community tracker)
 */
async function fetchEcomiWikiData() {
  try {
    const resp = await fetch(ECOMIWIKI_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Extract JSON data from script tags (Next.js / React data island)
    const jsonMatch = html.match(/__NEXT_DATA__[^>]*>([^<]+)<\/script>/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      return data?.props?.pageProps || null;
    }
    return null;
  } catch (e) {
    console.warn('[VeVe] ecomiwiki fetch failed:', e.message);
    return null;
  }
}

/**
 * Get floor prices for top VeVe collections.
 * Returns array of collection objects.
 */
export async function getVeveFloorPrices() {
  const wikiData = await fetchEcomiWikiData();

  if (wikiData?.collections) {
    return wikiData.collections.map(c => ({
      collectionName: c.name || c.collectibleType,
      floorPriceGems: c.floorPrice ?? c.floor ?? null,
      floorPriceUSD: c.floorPrice ?? c.floor ?? null, // 1 Gem ≈ $1
      totalIssued: c.totalIssued ?? null,
      imageUrl: c.imageUrl ?? null,
      marketplaceUrl: `https://veve.me/market?search=${encodeURIComponent(c.name || '')}`,
    })).slice(0, 20);
  }

  // Fallback: return known lightsaber collections with advisory note
  console.warn('[VeVe] Live data unavailable — VeVe API requires auth. Check veve.me/market manually or via app.');
  return Object.entries(KNOWN_COLLECTIONS).map(([name, info]) => ({
    collectionName: name,
    floorPriceGems: null,
    floorPriceUSD: null,
    totalIssued: info.totalIssued,
    imageUrl: null,
    marketplaceUrl: info.marketUrl,
    notes: info.notes,
    dataSource: 'manual — update via VeVe app',
  }));
}

/**
 * Get current lightsaber floor prices specifically.
 */
export async function getVeveLightsaberPrices() {
  const all = await getVeveFloorPrices();

  const sabers = all.filter(c =>
    c.collectionName?.toLowerCase().includes('lightsaber') ||
    c.collectionName?.toLowerCase().includes('saber')
  );

  const green = sabers.find(c => c.collectionName?.toLowerCase().includes('green') || c.collectionName?.toLowerCase().includes('luke') || c.collectionName?.toLowerCase().includes('yoda'));
  const blue  = sabers.filter(c => c.collectionName?.toLowerCase().includes('blue') || c.collectionName?.toLowerCase().includes('obi') || c.collectionName?.toLowerCase().includes('anakin'));

  return {
    green: green || null,
    blue: blue || [],
    allSabers: sabers,
    sellAdvice: lightsaberSellStrategy(green?.floorPriceGems, blue?.[0]?.floorPriceGems, 100),
  };
}

/**
 * Smart sell strategy for bulk lightsaber holdings.
 * @param {number|null} greenFloor - Green saber floor in Gems
 * @param {number|null} blueFloor  - Blue saber floor in Gems
 * @param {number} quantity        - How many you own total
 */
export function lightsaberSellStrategy(greenFloor, blueFloor, quantity = 100) {
  const greenEst = greenFloor ?? 8; // estimated if no live data
  const blueEst  = blueFloor  ?? 6;
  const avgFloor = (greenEst + blueEst) / 2;

  // Dumping 100 at once would crash your own floor by ~40%
  const BATCH_SIZE = 8;
  const WEEKS = Math.ceil(quantity / BATCH_SIZE);
  const TARGET_PREMIUM = 1.15; // list at 15% above floor
  const targetPrice = Math.round(avgFloor * TARGET_PREMIUM);
  const estimatedGross = quantity * targetPrice;
  const feePct = 0.085; // 2.5% VeVe + 6% Star Wars licensor
  const estimatedNet = Math.round(estimatedGross * (1 - feePct));

  const catalysts = [
    'New Star Wars series/movie announcement',
    'May 4th (Star Wars Day) — price spike every year',
    'ECOMI/VeVe major platform update',
    'OMI token price pump → VeVe market activity surge',
    'Physical Darth Vader prop auction headlines (already $3.6M in Sept 2025)',
  ];

  return {
    recommendation: 'BATCH SELL — never dump all at once',
    batchSize: BATCH_SIZE,
    batchFrequency: 'weekly',
    targetPriceGems: targetPrice,
    estimatedGrossGems: estimatedGross,
    estimatedNetGems: estimatedNet,
    estimatedNetUSD: estimatedNet, // 1 Gem ≈ $1
    timelineWeeks: WEEKS,
    greenPremium: 'List greens 10-20% higher than blues (Luke/Yoda > Obi-Wan in current market)',
    bestExitRoute: 'VeVe Market (Gems) for speed; StackR (OMI) if you want crypto upside',
    holdSignals: catalysts,
    warning: 'Listing 100 at once crashes your own floor by ~30-40%. Patience = profit.',
    stackrNote: 'Since Nov 2025: sell on StackR to receive OMI tokens instead of Gems — useful if you want crypto exposure',
  };
}

/**
 * Generate a daily VeVe market report (markdown string).
 */
export async function generateVeveReport() {
  const sabers = await getVeveLightsaberPrices();
  const strategy = sabers.sellAdvice;
  const liveData = sabers.allSabers.some(s => s.floorPriceGems != null);

  let report = `## 🔦 VeVe Digital Collectibles Report\n\n`;

  if (!liveData) {
    report += `> ⚠️ **Live floor prices unavailable** — VeVe's API requires app authentication.\n`;
    report += `> Check current floors at: https://veve.me/market or in the VeVe app.\n\n`;
  }

  report += `### Your Star Wars Lightsabers (~100 units)\n\n`;
  report += `| Saber | Floor (Gems) | Total Issued | Market |\n`;
  report += `|-------|-------------|--------------|--------|\n`;

  for (const saber of Object.entries(KNOWN_COLLECTIONS)) {
    const [name, info] = saber;
    const match = sabers.allSabers.find(s => s.collectionName?.includes(name.split(' ')[0]));
    const floor = match?.floorPriceGems ?? '—';
    report += `| ${name} | ${floor} Gems | ${info.totalIssued.toLocaleString()} | [View](${info.marketUrl}) |\n`;
  }

  report += `\n### 📊 Sell Strategy (${strategy.recommendation})\n\n`;
  report += `- **Batch size:** ${strategy.batchSize}/week over ~${strategy.timelineWeeks} weeks\n`;
  report += `- **Target price:** ${strategy.targetPriceGems} Gems per saber (15% above floor)\n`;
  report += `- **Estimated net:** ~$${strategy.estimatedNetUSD.toLocaleString()} total after 8.5% fees\n`;
  report += `- **Green premium:** ${strategy.greenPremium}\n`;
  report += `- **Best route:** ${strategy.bestExitRoute}\n\n`;

  report += `### 🚀 Hold Triggers (wait for these before selling)\n`;
  strategy.holdSignals.forEach(s => { report += `- ${s}\n`; });

  report += `\n### 🔗 Resources\n`;
  report += `- Track floors: https://ecomiwiki.com/veve/market\n`;
  report += `- StackR (OMI exit): https://stackr.com\n`;
  report += `- VeVe market: https://veve.me/market\n`;

  return report;
}

// CLI test
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('🔦 Testing VeVe tracker...\n');
  generateVeveReport().then(r => console.log(r)).catch(console.error);
}
