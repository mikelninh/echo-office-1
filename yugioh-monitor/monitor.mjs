#!/usr/bin/env node
/**
 * TCG & Collectibles Holy Grail Monitor v2
 * 
 * FREE TIER:  Holy grail alerts (€5k+ new listings)
 * PREMIUM:    Deal alerts (underpriced vs market), watchlist, price drops
 * 
 * Games: Yu-Gi-Oh, Pokémon, MTG, One Piece, Dragon Ball, Weiß Schwarz,
 *        Dandadan, Digimon, Lorcana, Union Arena
 * Platforms: eBay.com, eBay.de, TCGPlayer
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, existsSync as fsExists } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { getSoldComps } from './sold-scraper.mjs';
import { getPsaPop } from './psa-pop.mjs';
import { calcEV, estimateGradeRate } from './ev-calculator.mjs';
import { logAlert } from './alert-logger.mjs';
import { processNewListings } from './want-list-engine.mjs';
import { scrapeFanaticsCollect } from './fanatics-scraper.mjs';
import { recordSoldSnapshot } from './exit-signals.mjs';
import { postAlertToChannel } from './channel-bot.mjs';
import { join as pathJoin } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, 'seen.json');
const PRICE_HISTORY_FILE = join(__dirname, 'price-history.json');
const MIN_USD = 2500;
const MIN_EUR = 2500;

// Per-game minimum thresholds (USD) — used for games with lower price ceilings
// Falls back to MIN_USD / MIN_EUR if not specified
const GAME_MIN_USD = {
  riftbound: 500,   // Signature cards peak ~$1,300; alert from $500+
};
const GAME_MIN_EUR = {
  riftbound: 450,
};

// Deal detection thresholds (premium feature)
const DEAL_THRESHOLD_PCT = 0.20; // 20% below tracked average = deal alert (raised from 15%)
const PRICE_DROP_PCT = 0.12;     // 12% drop from last seen = price drop alert
const HOT_DEAL_MIN_SCORE = 70;   // minimum deal score (0-100) to trigger alert

// Affiliate link config — set campaign IDs to enable
const AFFILIATE_CONFIG = {
  ebayComCampaignId: '', // eBay.com EPN campaign ID
  ebayDeCampaignId: '', // eBay.de EPN campaign ID  
  enabled: false, // flip to true when IDs are set
};

function toAffiliateUrl(url) {
  if (!AFFILIATE_CONFIG.enabled) return url;
  const isDE = url.includes('ebay.de');
  const campaignId = isDE ? AFFILIATE_CONFIG.ebayDeCampaignId : AFFILIATE_CONFIG.ebayComCampaignId;
  if (!campaignId) return url;
  return `https://rover.ebay.com/rover/1/${campaignId}/2?mpre=${encodeURIComponent(url)}&toolid=10001&campid=${campaignId}`;
}

// Games to monitor with eBay category IDs and search terms
const GAMES = [
  { id: 'yugioh',    name: 'Yu-Gi-Oh',     ebayCategory: '183454', tcgLine: 'yugioh',         searchTerms: ['yugioh', 'yu-gi-oh'] },
  { id: 'pokemon',   name: 'Pokémon',       ebayCategory: '183454', tcgLine: 'pokemon',        searchTerms: ['pokemon tcg', 'pokemon card'] },
  { id: 'mtg',       name: 'Magic: The Gathering', ebayCategory: '183454', tcgLine: 'magic',   searchTerms: ['mtg', 'magic the gathering card'] },
  { id: 'onepiece',  name: 'One Piece',     ebayCategory: '183454', tcgLine: 'one-piece-card-game', searchTerms: ['one piece tcg card'] },
  { id: 'dragonball', name: 'Dragon Ball',  ebayCategory: '183454', tcgLine: 'dragon-ball-super-card-game', searchTerms: ['dragon ball super card game'] },
  { id: 'weiss',     name: 'Weiß Schwarz', ebayCategory: '183454', tcgLine: null,             searchTerms: ['weiss schwarz', 'weiß schwarz'] },
  { id: 'dandadan',  name: 'Dandadan (Weiß Schwarz)', ebayCategory: '183454', tcgLine: null,  searchTerms: ['dandadan weiss schwarz', 'dandadan card'] },
  { id: 'digimon',   name: 'Digimon',      ebayCategory: '183454', tcgLine: 'digimon-card-game', searchTerms: ['digimon card game tcg'] },
  { id: 'lorcana',   name: 'Lorcana',      ebayCategory: '183454', tcgLine: null,             searchTerms: ['disney lorcana tcg'] },
  { id: 'unionarena', name: 'Union Arena',  ebayCategory: '183454', tcgLine: null,             searchTerms: ['union arena tcg card'] },
  // Riftbound — League of Legends TCG (Riot Games, 2025)
  // Holy grail threshold lowered to ~$500 for this game (signature cards range $500–$1,300)
  // Cards use format: "riftbound ahri signature" OR "riftbound OGN 303*/298" on eBay
  { id: 'riftbound', name: 'Riftbound',    ebayCategory: '183454', tcgLine: null,             searchTerms: [
    'riftbound ahri signature',         // Ahri Nine-Tailed Fox Sig — $1,100-1,300
    'riftbound kaisa signature',         // Kai'Sa Sig — $1,300
    'riftbound jinx signature',          // Jinx Sig — $1,200
    'riftbound lee sin signature',       // Lee Sin Sig — $790-1,000
    'riftbound volibear signature',      // Volibear Sig — $650
    'riftbound miss fortune signature',  // Miss Fortune Sig
    'riftbound soraka signature',        // Soraka Sig
    'riftbound spiritforged signature',  // Set 2 chase sigs
    'riftbound ahri overnumbered',        // Ahri Overnumbered — $146
    'riftbound origins signature',        // Catch-all for any Origins sig
    'riftbound artist signed OGN',        // eBay listing format: "artist signed OGN*/298"
  ]},
];

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const p of paths) { if (existsSync(p)) return p; }
  return null;
}

function loadSeen() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
    catch { return {}; }
  }
  return {};
}

function saveSeen(seen) {
  writeFileSync(STATE_FILE, JSON.stringify(seen, null, 2));
}

function parsePrice(priceStr) {
  if (priceStr.includes('EUR') || priceStr.includes('€')) {
    const cleaned = priceStr.replace(/[EUR€\s]/g, '').replace(/\./g, '').replace(',', '.');
    return { amount: parseFloat(cleaned), currency: 'EUR' };
  }
  if (priceStr.includes('$')) {
    const cleaned = priceStr.replace(/[$,\s]/g, '');
    return { amount: parseFloat(cleaned), currency: 'USD' };
  }
  return { amount: 0, currency: 'unknown' };
}

function meetsThreshold(price) {
  if (price.currency === 'USD') return price.amount >= MIN_USD;
  if (price.currency === 'EUR') return price.amount >= MIN_EUR;
  return false;
}

function formatPrice(price) {
  if (price.currency === 'USD') return `$${price.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (price.currency === 'EUR') return `€${price.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
  return `${price.amount}`;
}

const JUNK_PATTERNS = /\b(sleeves?|deck\s*box|playmat|binder|protectors?|card\s*case|booster\s*box|display\s*case|lot\s*of\s*\d+\s*random|bulk|repack|mystery)\b/i;

// ── Enhanced listing quality filter ──────────────────────────────────
// Catches fan art, custom cards, blankets, metal novelty cards, replicas, etc.
const NOT_A_REAL_CARD = [
  // Fan art / custom / proxy / replica
  /\bfan\s*art\b/i,
  /\bcustom\s*(made|card|print|art|painted|design)\b/i,
  /\bcustom\b(?=.*\b(card|pokemon|charizard|lugia|pikachu)\b)/i,
  /\b(proxy|proxies)\b/i,
  /\breplica\b/i,
  /\borica\b/i,
  /\bhandmade\b/i,
  /\bhand[\s-]*painted\b/i,
  /\bcommission\b/i,
  /\bartist\s*proof\b/i,
  /\b(unofficial|fan[\s-]*made|bootleg|fake)\b/i,
  
  // Metal novelty cards (NOT the real game cards)
  /\bmetal\s*(card|pokemon|charizard|pikachu|lugia|mewtwo)\b/i,
  /\b(gold|silver|iron|stainless|alumin\w*)\s*metal\s*card\b/i,
  /\bmetal\s*(gold|silver|iron|stainless)\b/i,
  
  // Non-card merchandise
  /\b(blanket|throw|fleece|comforter|bedding|duvet|pillow)\b/i,
  /\b(rug|carpet|tapestry|wall\s*hanging|wall\s*art|wall\s*scroll)\b/i,
  /\b(poster(?!\s*(serial|#|number|foil|rare|holo)))\b/i,
  /\b(figurine|statue|figure|plush|plushie|stuffed|toy)\b/i,
  /\b(t[\s-]*shirt|hoodie|clothing|apparel|costume|cosplay)\b/i,
  /\b(mug|cup|mousepad|mouse\s*pad|sticker|decal|tattoo|pin|badge|keychain)\b/i,
  /\b(painting|canvas\s*print|art\s*print|framed\s*print|lithograph)\b/i,
  /\b(phone\s*case|iphone|samsung|case\s*cover)\b/i,
  /\b(backpack|bag|wallet|purse|tote)\b/i,
  
  // Sealed product (not single cards)  
  /\b(sealed\s*case|master\s*case)\b/i,
  /\b(lot\s*of\s*\d+)\b/i,
  /\b(collection\s*lot|card\s*lot|huge\s*lot|massive\s*lot)\b/i,
  
  // Board games / non-TCG
  /\b(board\s*game|video\s*game|gameboy|console|cartridge)\b/i,
  /\b(coin|medallion|medal)\b(?!.*\b(card|tcg|holo|psa|bgs|cgc)\b)/i,
];

/**
 * Returns true if the listing title looks like a non-authentic card item.
 * Some edge cases (e.g., "Metal Charizard PSA 10" from Celebrations UPC) 
 * are real — we handle those with allowlist patterns.
 */
const METAL_CARD_ALLOWLIST = [
  /\bcelebrations?\b.*\bmetal\b/i,    // Celebrations UPC metal cards are real
  /\bupc\b.*\bmetal\b/i,              // UPC metal cards
  /\bmetal\b.*\bcelebrations?\b/i,
  /\bmetal\b.*\bupc\b/i,
];

function isJunkListing(title) {
  // First check: basic junk patterns (accessories)
  if (JUNK_PATTERNS.test(title)) return true;
  
  // Check against NOT_A_REAL_CARD patterns
  for (const pattern of NOT_A_REAL_CARD) {
    if (pattern.test(title)) {
      // Before rejecting, check allowlist (some "metal" cards are real)
      if (/metal/i.test(title)) {
        for (const allow of METAL_CARD_ALLOWLIST) {
          if (allow.test(title)) return false; // It's a real card
        }
      }
      return true; // Junk
    }
  }
  
  return false;
}

// ── Price History (for deal detection) ──────────────────────────────
function loadPriceHistory() {
  if (existsSync(PRICE_HISTORY_FILE)) {
    try { return JSON.parse(readFileSync(PRICE_HISTORY_FILE, 'utf8')); }
    catch { return {}; }
  }
  return {};
}

function savePriceHistory(history) {
  writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Update price history for an item and return deal info.
 * Returns: { isDeal, isPriceDrop, dealPct, avgPrice } or null
 */
function analyzeDeal(itemId, normalizedTitle, currentPrice, priceHistory) {
  const key = normalizedTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 60);
  if (!priceHistory[key]) {
    priceHistory[key] = { samples: [], firstSeen: new Date().toISOString() };
  }

  const record = priceHistory[key];
  const samples = record.samples || [];
  
  // Add current price to history (keep last 20 samples)
  samples.push({ price: currentPrice.amount, currency: currentPrice.currency, ts: Date.now(), id: itemId });
  if (samples.length > 20) samples.splice(0, samples.length - 20);
  record.samples = samples;

  if (samples.length < 3) return null; // need at least 3 data points

  // Calculate rolling average (excluding this sample)
  const prior = samples.slice(0, -1);
  const avg = prior.reduce((s, p) => s + p.price, 0) / prior.length;
  const lastPrice = prior[prior.length - 1]?.price;

  const isDeal = currentPrice.amount < avg * (1 - DEAL_THRESHOLD_PCT);
  const isPriceDrop = lastPrice && currentPrice.amount < lastPrice * (1 - PRICE_DROP_PCT);
  const dealPct = avg > 0 ? Math.round((1 - currentPrice.amount / avg) * 100) : 0;

  return { isDeal, isPriceDrop, dealPct, avgPrice: Math.round(avg), sampleCount: prior.length, key };
}

/**
 * Score a deal from 0–100. Only deals with score >= HOT_DEAL_MIN_SCORE get alerted.
 *
 * Scoring breakdown:
 *   - Discount %:       up to 50 pts (linear: 20%=0, 30%=20, 50%=50)
 *   - Sample count:     up to 20 pts (confidence: 3=5, 5=10, 10+=20)
 *   - Absolute saving:  up to 20 pts (€500=5, €1k=10, €2.5k=20)
 *   - Price drop bonus: +10 pts if also a price drop this run
 */
function scoreDeal(deal, currentPrice) {
  if (!deal?.isDeal) return 0;

  let score = 0;

  // Discount % (20% = baseline, anything below scores 0; cap at 50%)
  const discountScore = Math.min(50, Math.max(0, (deal.dealPct - 20) * 2));
  score += discountScore;

  // Sample confidence
  const samples = deal.sampleCount || 3;
  if (samples >= 10) score += 20;
  else if (samples >= 5) score += 10;
  else score += 5;

  // Absolute saving in EUR/USD
  const saving = deal.avgPrice - currentPrice.amount;
  if (saving >= 2500) score += 20;
  else if (saving >= 1000) score += 10;
  else if (saving >= 500) score += 5;

  // Price drop bonus
  if (deal.isPriceDrop) score += 10;

  return Math.min(100, Math.round(score));
}

function dealRating(score) {
  if (score >= 90) return '🔥🔥🔥 LEGENDARY';
  if (score >= 80) return '🔥🔥 HOT';
  if (score >= 70) return '🔥 SOLID';
  return null; // below threshold — no alert
}

// ── Shared browser instance ──────────────────────────────────────────
let _sharedBrowser = null;
async function getSharedBrowser() {
  if (_sharedBrowser) return _sharedBrowser;
  const chromePath = findChrome();
  if (!chromePath) throw new Error('Chrome not found');
  _sharedBrowser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-extensions', '--disable-gpu'],
  });
  return _sharedBrowser;
}
async function closeSharedBrowser() {
  if (_sharedBrowser) { await _sharedBrowser.close().catch(() => {}); _sharedBrowser = null; }
}

// ── eBay via Puppeteer ───────────────────────────────────────────────
async function checkEbay(domain, game, searchTermOverride) {
  const minUsd = GAME_MIN_USD[game.id] ?? MIN_USD;
  const minEur = GAME_MIN_EUR[game.id] ?? MIN_EUR;
  const udlo   = domain === 'de' ? minEur : minUsd;
  const searchTerm = encodeURIComponent(searchTermOverride ?? game.searchTerms[0]);
  const url = `https://www.ebay.${domain}/sch/i.html?_nkw=${searchTerm}&_sacat=${game.ebayCategory}&LH_Complete=1&LH_Sold=1&_udlo=${udlo}&_sop=13&rt=nc&_ipg=60`;

  let page;
  try {
    const browser = await getSharedBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    for (let attempt = 0; attempt < 3; attempt++) {
      const currentUrl = page.url();
      if (currentUrl.includes('splashui/challenge') || currentUrl.includes('Interruption')) {
        console.log(`  Captcha challenge on eBay.${domain} (${game.name}), waiting...`);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      } else break;
    }

    await page.waitForSelector('.srp-results', { timeout: 15000 }).catch(() => {});

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.srp-results > li.s-card[data-listingid]');
      const results = [];
      for (const card of cards) {
        const id = card.getAttribute('data-listingid');
        const linkEl = card.querySelector('a[href*="ebay"]');
        const titleEl = card.querySelector('.s-card__title span[role=heading]') || card.querySelector('.s-card__title');
        const priceEl = card.querySelector('.s-card__price');
        const imgEl = card.querySelector('img[src*="ebayimg"], img[data-src*="ebayimg"]');
        if (id && titleEl && priceEl) {
          let title = (titleEl.textContent || '').trim();
          title = title.replace(/Opens in a new window or\s*tab?/i, '').replace(/Wird in neuem Fenster oder\s*Tab geöffnet/i, '').trim();
          const imgSrc = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
          results.push({ id, title, price: (priceEl.textContent || '').trim(), url: linkEl ? linkEl.href : null, image: imgSrc });
        }
      }
      return results;
    });

    await page.close().catch(() => {});
    page = null;

    const results = [];
    for (const item of items) {
      const price = parsePrice(item.price);
      // Use per-game thresholds if defined, otherwise global
      const minUsdGame = GAME_MIN_USD[game.id] ?? MIN_USD;
      const minEurGame = GAME_MIN_EUR[game.id] ?? MIN_EUR;
      const passes = (price.currency === 'USD' && price.amount >= minUsdGame)
                  || (price.currency === 'EUR' && price.amount >= minEurGame);
      if (!passes) continue;
      if (isJunkListing(item.title)) continue;
      results.push({
        id: `ebay-${domain}-${item.id}`,
        title: item.title,
        price,
        platform: `eBay.${domain === 'com' ? 'com' : 'de'}`,
        url: `https://www.ebay.${domain}/itm/${item.id}`,
        affiliateUrl: toAffiliateUrl(`https://www.ebay.${domain}/itm/${item.id}`),
        game: game.id,
        gameName: game.name,
        image: item.image || null,
      });
    }
    return results;
  } catch (e) {
    console.error(`eBay.${domain} (${game.name}) error:`, e.message);
    if (page) await page.close().catch(() => {});
    // If the shared browser is broken, reset it so next call gets a fresh one
    if (_sharedBrowser) { await _sharedBrowser.close().catch(() => {}); _sharedBrowser = null; }
    return [];
  }
}

// ── TCGPlayer ────────────────────────────────────────────────────────
async function checkTCGPlayer(game) {
  const results = [];
  try {
    const response = execSync(
      `curl -s -m 30 'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false&mpfev=2952' ` +
      `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' ` +
      `-H 'Content-Type: application/json' -H 'Accept: application/json' ` +
      `--data-raw '{"algorithm":"sales_exp_fields_experiment","from":0,"size":24,"filters":{"term":{"productLineName":["${game.tcgLine}"],"productTypeName":["Cards"]},"range":{"marketPrice":{"gte":2500}}},"listingSearch":{"filters":{"term":{},"range":{"quantity":{"gte":1}}},"context":{"cart":{}}},"context":{"cart":{},"shippingCountry":"US"},"settings":{},"sort":{"field":"product-recently-sold","order":"desc"}}'`,
      { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
    );
    const data = JSON.parse(response);
    const resultSets = data?.results?.[0]?.results || [];
    for (const item of resultSets) {
      const name = item.productName || item.name || 'Unknown';
      const price = item.marketPrice || item.lowestPrice || 0;
      if (price < MIN_USD) continue;
      const productId = item.productId || item.productID || '';
      const slug = (item.productUrlName || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      results.push({
        id: `tcg-${game.id}-${productId}`,
        title: name,
        price: { amount: price, currency: 'USD' },
        platform: 'TCGPlayer',
        url: `https://www.tcgplayer.com/product/${productId}/${slug}`,
        game: game.id,
        gameName: game.name,
      });
    }
  } catch (e) { /* fail silently */ }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const seen = loadSeen();
  const priceHistory = loadPriceHistory();
  const holyGrailAlerts = [];  // FREE tier — new €5k+ listings
  const dealAlerts = [];        // PREMIUM tier — underpriced vs market
  const priceDropAlerts = [];   // PREMIUM tier — price dropped 10%+
  const allResults = [];

  for (const game of GAMES) {
    console.log(`\n📦 ${game.name}`);
    
    // For games with multiple search terms (e.g. Riftbound), expand eBay searches
    const ebayComSources = game.searchTerms.length > 1
      ? game.searchTerms.map((term, i) => ({ label: `eBay.com [${term}]`, fn: () => checkEbay('com', game, term) }))
      : [{ label: 'eBay.com', fn: () => checkEbay('com', game) }];
    const ebayDeSources  = game.searchTerms.length > 1
      ? game.searchTerms.map((term, i) => ({ label: `eBay.de [${term}]`,  fn: () => checkEbay('de',  game, term) }))
      : [{ label: 'eBay.de',  fn: () => checkEbay('de', game) }];

    const minForFanatics = GAME_MIN_USD[game.id] ?? MIN_USD;
    const sources = [
      ...ebayComSources,
      ...ebayDeSources,
      ...(game.tcgLine ? [{ label: 'TCGPlayer', fn: () => checkTCGPlayer(game) }] : []),
      { label: 'Fanatics', fn: () => scrapeFanaticsCollect(game.searchTerms, minForFanatics) },
    ];

    for (const source of sources) {
      try {
        console.log(`  Checking ${source.label}...`);
        const results = await source.fn();
        console.log(`  Found ${results.length} items above threshold`);
        allResults.push(...results);

        for (const item of results) {
          // Deal analysis (builds price history regardless of seen status)
          const deal = analyzeDeal(item.id, item.title, item.price, priceHistory);

          const isNew = !seen[item.id];

          if (isNew) {
            seen[item.id] = {
              firstSeen: new Date().toISOString(),
              title: item.title,
              game: game.id,
              image: item.image || null,
              price: formatPrice(item.price),
              priceAmount: item.price.amount,
              affiliateUrl: item.affiliateUrl || null,
            };
            // FREE: holy grail alert for new listings
            // Enrich with sold comps + PSA pop + EV (async, best effort)
            try {
              const soldComps = await getSoldComps(browser, item.title, { minPrice: 500 });
              const rawListings = Object.values(seen).filter(s =>
                s.title?.toLowerCase().includes(item.title.toLowerCase().slice(0, 20))
              ).length;
              const psaPop = await getPsaPop(item.title, { rawListings });
              let evResult = null;
              if (soldComps?.median && soldComps.median > 0) {
                // Use real PSA grade rates if available, else estimate
                const gradeRate  = psaPop?.gradeRate10 || estimateGradeRate(item.gameName, '');
                const gradeRate9 = psaPop?.gradeRate9  || undefined;
                const gradeRate8 = psaPop?.gradeRate8  || undefined;
                evResult = calcEV({
                  rawPrice: item.price.amount,
                  psa10SoldMedian: soldComps.median,
                  soldCount: soldComps.count,
                  gradeRate,
                  gradeRate9,
                  gradeRate8,
                  evDiscount: psaPop?.evDiscount ?? 0,
                  gradingTier: 'regular',
                  psa10Pop: psaPop?.psa10Pop ?? null,
                  totalPop: psaPop?.totalPop ?? null,
                  rawListings,
                  popRisk: psaPop?.popRisk ?? 'UNKNOWN',
                });
              }
              // Grade risk lookup
              const gradeRisks = (() => {
                try {
                  const rf = pathJoin(__dirname, 'grade-risks.json');
                  if (!fsExists(rf)) return null;
                  const risks = JSON.parse(readFileSync(rf, 'utf8'));
                  const gameKey = item.gameName?.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  // Try specific set, then game prefix
                  return risks[`${gameKey}-lob-1st`] || risks[`${gameKey}-1st`] ||
                         risks[`${gameKey}-op01`] || risks[gameKey] || null;
                } catch { return null; }
              })();

              // Record sold comp snapshot for exit signal tracking
              if (soldComps?.median) {
                recordSoldSnapshot(item.title, 10, soldComps.median, soldComps.count || 1);
              }

              const alertEntry = { ...item, deal, soldComps, psaPop, evResult, gradeRisks };
              holyGrailAlerts.push(alertEntry);
              // Log every grail alert for the silent proof run
              logAlert({
                type: 'holyGrail',
                game: item.gameName,
                title: item.title,
                price: formatPrice(item.price),
                platform: item.platform,
                url: item.affiliateUrl || item.url,
                ev: evResult?.ev ?? null,
                evVerdict: evResult?.verdict ?? null,
                shouldGrade: evResult?.shouldAlert ?? false,
                gradeRiskLevel: gradeRisks?.riskLevel ?? null,
              });
            } catch (evErr) {
              console.error(`  [EV] enrichment failed for grail: ${evErr.message}`);
              holyGrailAlerts.push({ ...item, deal });
            }
          } else {
            // Update image if we now have one
            if (item.image && !seen[item.id].image) seen[item.id].image = item.image;
            // Track price changes
            const lastPrice = seen[item.id].priceAmount;
            if (lastPrice && item.price.amount !== lastPrice) {
              seen[item.id].priceAmount = item.price.amount;
              seen[item.id].price = formatPrice(item.price);
            }
          }

          // PREMIUM: deal alerts (works on new AND existing items) — score-gated
          if (deal?.isDeal) {
            const score = scoreDeal(deal, item.price);
            const rating = dealRating(score);
            if (rating) {
              dealAlerts.push({ ...item, deal: { ...deal, score, rating } });
              logAlert({ type: 'deal', game: item.gameName, title: item.title, price: formatPrice(item.price), platform: item.platform, url: item.affiliateUrl || item.url, dealPct: deal.dealPct, score, rating });
            } else console.log(`  ⬇️  Skipped low-score deal (${score}/100): ${item.title.slice(0, 50)}`);
          }
          if (deal?.isPriceDrop && !isNew) {
            const score = scoreDeal({ ...deal, isPriceDrop: true }, item.price);
            const rating = dealRating(score);
            if (rating) priceDropAlerts.push({ ...item, deal: { ...deal, score, rating } });
          }
        }
      } catch (e) { console.error(`  ${source.label} failed:`, e.message); }
    }
  }

  // ── Want List matching ───────────────────────────────────────────
  // Run ALL new listings (grails + deals) through subscriber want lists
  const allNewListings = [
    ...holyGrailAlerts.map(a => ({
      title: a.title, game: a.gameName, priceAmount: a.price.amount,
      price: formatPrice(a.price), platform: a.platform,
      url: a.affiliateUrl || a.url, evResult: a.evResult || null,
    })),
    ...dealAlerts.map(a => ({
      title: a.title, game: a.gameName, priceAmount: a.price.amount,
      price: formatPrice(a.price), platform: a.platform,
      url: a.affiliateUrl || a.url,
    })),
  ];
  const wantListMatches = processNewListings(allNewListings);
  if (wantListMatches.length > 0) {
    console.log(`\n🎯 ${wantListMatches.length} WANT LIST MATCH(ES):`);
    for (const match of wantListMatches) {
      console.log(`  → ${match.subscriber.name || match.subscriber.subscriberId}: "${match.target.cardName}" — ${match.listing.price} (score: ${match.score}%)`);
    }
  }

  // ── Output ───────────────────────────────────────────────────────
  const totalAlerts = holyGrailAlerts.length + dealAlerts.length + priceDropAlerts.length;

  if (holyGrailAlerts.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏆 ${holyGrailAlerts.length} NEW HOLY GRAIL(S) — FREE TIER:`);
    console.log('='.repeat(60));
    for (const alert of holyGrailAlerts) {
      console.log(`\n🐉 [${alert.gameName}] ${alert.title}`);
      console.log(`   Price: ${formatPrice(alert.price)} | ${alert.platform}`);
      console.log(`   Link: ${alert.affiliateUrl || alert.url}`);
      if (alert.deal?.isDeal) console.log(`   🔥 DEAL: ${alert.deal.dealPct}% below avg (avg: ${formatPrice({amount: alert.deal.avgPrice, currency: alert.price.currency})})`);
    }
  }

  if (dealAlerts.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`💰 ${dealAlerts.length} HOT DEAL(S) — PREMIUM TIER (score ≥ ${HOT_DEAL_MIN_SCORE}):`);
    console.log('='.repeat(60));
    for (const alert of dealAlerts) {
      console.log(`\n💰 [${alert.gameName}] ${alert.title}`);
      console.log(`   Price: ${formatPrice(alert.price)} (${alert.deal.dealPct}% below avg ${formatPrice({amount: alert.deal.avgPrice, currency: alert.price.currency})})`);
      console.log(`   ${alert.deal.rating} — Score: ${alert.deal.score}/100`);
      console.log(`   ${alert.platform} | ${alert.affiliateUrl || alert.url}`);
    }
  }

  if (priceDropAlerts.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📉 ${priceDropAlerts.length} PRICE DROP(S) — PREMIUM TIER:`);
    console.log('='.repeat(60));
    for (const alert of priceDropAlerts) {
      console.log(`\n📉 [${alert.gameName}] ${alert.title}`);
      console.log(`   Dropped to ${formatPrice(alert.price)} | ${alert.platform}`);
      console.log(`   ${alert.affiliateUrl || alert.url}`);
    }
  }

  if (totalAlerts === 0) console.log('\nNo new alerts this run.');

  // Structured output for cron agent to parse
  // NOTE FOR CRON AGENT: wantListMatches should be sent to match.telegramId directly
  // holyGrails + deals + priceDrops should be posted to the CHANNEL via postAlertToChannel
  // Channel ID is in CHANNEL_CONFIG — set TELEGRAM_CHANNEL_ID env var
  console.log('\n__ALERT_SUMMARY_JSON__');
  console.log(JSON.stringify({
    holyGrails: holyGrailAlerts.map(a => ({
      game: a.gameName, title: a.title, price: formatPrice(a.price),
      platform: a.platform, url: a.affiliateUrl || a.url, image: a.image || null,
      isDeal: a.deal?.isDeal || false, dealPct: a.deal?.dealPct || 0,
      // EV enrichment
      soldMedian: a.soldComps?.median ? `€${a.soldComps.median}` : null,
      soldCount: a.soldComps?.count || null,
      psa10Pop: a.psaPop?.psa10Pop || null,
      psa9Pop: a.psaPop?.psa9Pop || null,
      popRisk: a.psaPop?.popRisk || null,
      gradeRate10: a.psaPop?.gradeRate10 || null,
      ev: a.evResult?.ev || null,
      evVerdict: a.evResult?.verdict || null,
      evFormatted: a.evResult?.formatted || null,
      shouldGrade: a.evResult?.shouldAlert || false,
      // Grade risk
      gradeRiskLevel: a.gradeRisks?.riskLevel || null,
      gradeRiskTips: a.gradeRisks?.psa10Tips || null,
      gradeRiskIssues: a.gradeRisks?.knownIssues || null,
    })),
    deals: dealAlerts.map(a => ({
      game: a.gameName, title: a.title, price: formatPrice(a.price),
      avgPrice: formatPrice({amount: a.deal.avgPrice, currency: a.price.currency}),
      dealPct: a.deal.dealPct, score: a.deal.score, rating: a.deal.rating,
      platform: a.platform, url: a.affiliateUrl || a.url,
    })),
    priceDrops: priceDropAlerts.map(a => ({
      game: a.gameName, title: a.title, price: formatPrice(a.price),
      score: a.deal.score, rating: a.deal.rating,
      platform: a.platform, url: a.affiliateUrl || a.url,
    })),
    wantListMatches: wantListMatches.map(m => ({
      subscriberId: m.subscriber.subscriberId,
      telegramId: m.subscriber.telegramId,
      tier: m.subscriber.tier,
      targetCard: m.target.cardName,
      matchScore: m.score,
      listing: {
        title: m.listing.title, price: m.listing.price,
        platform: m.listing.platform, url: m.listing.url,
        evVerdict: m.listing.evResult?.verdict || null,
        ev: m.listing.evResult?.ev || null,
        evFormatted: m.listing.evResult?.formatted || null,
      },
    })),
  }));
  console.log('__END_SUMMARY__');

  // Save market stats for daily report
  const statsFile = join(__dirname, 'market-stats.json');
  let stats = {};
  if (existsSync(statsFile)) { try { stats = JSON.parse(readFileSync(statsFile, 'utf8')); } catch {} }
  const today = new Date().toISOString().slice(0, 10);
  if (!stats[today]) stats[today] = {};
  for (const game of GAMES) {
    const gameResults = allResults.filter(r => r.game === game.id);
    stats[today][game.id] = {
      totalListings: gameResults.length,
      avgPrice: gameResults.length ? Math.round(gameResults.reduce((s, r) => s + r.price.amount, 0) / gameResults.length) : 0,
      maxPrice: gameResults.length ? Math.round(Math.max(...gameResults.map(r => r.price.amount))) : 0,
      newAlerts: holyGrailAlerts.filter(a => a.game === game.id).length,
      platforms: {
        ebay: gameResults.filter(r => r.platform.startsWith('eBay')).length,
        tcgplayer: gameResults.filter(r => r.platform === 'TCGPlayer').length,
      }
    };
  }
  // Prune stats older than 30 days
  const statsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const date of Object.keys(stats)) { if (date < statsCutoff) delete stats[date]; }
  writeFileSync(statsFile, JSON.stringify(stats, null, 2));

  // Prune seen entries older than 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  for (const [id, data] of Object.entries(seen)) {
    if (new Date(data.firstSeen).getTime() < cutoff) delete seen[id];
  }

  saveSeen(seen);
  savePriceHistory(priceHistory);
  await closeSharedBrowser();
  console.log(`\nDone. ${Object.keys(seen).length} items tracked, ${allResults.length} listings scanned, ${Object.keys(priceHistory).length} price histories`);
}

main().catch(async (e) => { await closeSharedBrowser(); console.error(e); });
