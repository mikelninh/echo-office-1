#!/usr/bin/env node
/**
 * cardmarket-scraper.mjs — EU Deal Finder via Cardmarket.com
 *
 * Scans Cardmarket for underpriced raw (ungraded) NM/EX listings of cards
 * from the hunt list. Supplements the eBay-focused hunt-monitor with EU
 * seller coverage — often 20-40% cheaper than US market.
 *
 * For each card:
 *   1. Search Cardmarket for the product
 *   2. Navigate to product page, collect NM/EX/LP offers
 *   3. If cheapest NM listing ≤ DEAL_THRESHOLD × rawEstimateEur → fire alert
 *   4. Enqueue free-tier alert (48h delayed) in addition to paid real-time
 *   5. Cache results for 8h per card
 *
 * Usage:
 *   node cardmarket-scraper.mjs              — full scan
 *   node cardmarket-scraper.mjs --dry-run    — no alerts, log only
 *   node cardmarket-scraper.mjs --game Pokemon — one game only
 *   node cardmarket-scraper.mjs --tier S     — S-tier cards only
 *   node cardmarket-scraper.mjs --limit 10   — max N cards per run
 *   node cardmarket-scraper.mjs --card poke-001 — single card by ID
 *   node cardmarket-scraper.mjs --stats      — show cache stats only
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { enqueueAlert } from './free-alert-queue.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const DEAL_THRESHOLD        = 0.60;  // listing must be ≤60% of rawEstimateEur
const ALERT_THRESHOLD       = 0.78;  // send alert (without free-queue) if ≤78%
const CACHE_TTL             = 8 * 60 * 60 * 1000;   // 8h per card
const MAX_CARDS_PER_RUN     = 30;
const DELAY_BETWEEN_CARDS   = 3500;  // ms — be polite to CM servers
const MIN_LISTING_PRICE_EUR = 20;    // ignore junk listings below this

const TELEGRAM_BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN || '8675912510:AAFwKtU2WoheIrjtGUHa8gpZRH2AQ2Pkzt8';
const TELEGRAM_CHAT_ID      = '938367498';           // Mikel DM — always gets alerts
const TELEGRAM_CHANNEL_PAID = process.env.TELEGRAM_CHANNEL_PAID || '-1003702806533';

const HUNT_LIST_FILE        = join(__dirname, 'hunt-list.json');
const CM_CACHE_FILE         = join(__dirname, 'cardmarket-cache.json');
const CM_DEALS_FILE         = join(__dirname, 'cardmarket-deals.json');

// Cardmarket game path mapping
const GAME_TO_CM = {
  'Pokémon':              'Pokemon',
  'Yu-Gi-Oh':             'YuGiOh',
  'Magic: The Gathering': 'Magic',
  'One Piece':            'OnePiece',
  'Dragon Ball':          'DragonBallSuper',
  'Lorcana':              'Lorcana',
  'Weiß Schwarz':         'WeissSchwarz',
  'Riftbound':            null,  // not on Cardmarket yet
};

// Condition priority for grading (best to OK)
const GRADEABLE_CONDITIONS = ['Mint', 'Near Mint', 'Excellent'];
const CONDITION_WEIGHTS    = { 'Mint': 1.0, 'Near Mint': 0.97, 'Excellent': 0.90, 'Good': 0.75, 'Light Played': 0.60 };

// Tier emoji
const TIER_EMOJI = { S: '👑', A: '💎', B: '📈', C: '🎯' };

// ── Chrome ────────────────────────────────────────────────────────────────────

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const p of paths) {
    try { execSync(`test -f "${p}"`); return p; } catch {}
  }
  return null;
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

function loadJSON(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function loadHuntList() {
  const raw = readFileSync(HUNT_LIST_FILE, 'utf8');
  // Strip JS-style comments
  const clean = raw.replace(/\/\/.*/g, '');
  return JSON.parse(clean);
}

function fmt(n) {
  if (n == null) return '?';
  return `€${Math.round(n).toLocaleString('de-DE')}`;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function getCache() {
  return loadJSON(CM_CACHE_FILE, { cards: {}, lastRun: null, totalScanned: 0, totalDeals: 0 });
}

function getCacheEntry(cache, cardId) {
  const entry = cache.cards[cardId];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) return null; // expired
  return entry;
}

function setCacheEntry(cache, cardId, data) {
  cache.cards[cardId] = { ts: Date.now(), ...data };
}

// ── Cardmarket Scraper ────────────────────────────────────────────────────────

/**
 * Search Cardmarket for a card and return the product URL.
 * Returns null if not found or game not supported.
 */
async function findProductUrl(browser, card, cmGame) {
  const query = encodeURIComponent(
    card.cardName
      .replace(/\s+1st\s+Edition/i, '')  // CM has separate 1st Ed filters
      .replace(/\s+Holo$/i, '')
      .trim()
  );
  const searchUrl = `https://www.cardmarket.com/en/${cmGame}/Products/Singles?searchString=${query}&isFirstEd=Y&sortBy=relevance&perSite=20`;

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('.table-body, .no-results, [class*="productRow"]', { timeout: 10000 }).catch(() => {});

    const productUrl = await page.evaluate((game) => {
      // Try table-based results (main Singles search)
      const rows = document.querySelectorAll('.table-body .table-body-row, [class*="productRow"]');
      for (const row of rows) {
        const link = row.querySelector('a[href*="/Singles/"]');
        if (link) return link.href;
      }
      // Fallback: any link to Singles page
      const allLinks = document.querySelectorAll(`a[href*="${game}/Products/Singles/"]`);
      for (const a of allLinks) {
        const href = a.href;
        if (href.includes('/Singles/') && !href.includes('searchString')) return href;
      }
      return null;
    }, cmGame);

    return productUrl;
  } catch (e) {
    console.error(`  [cm] search failed for "${card.cardName}": ${e.message?.slice(0, 60)}`);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Scrape a Cardmarket product page for NM/EX listings.
 * Returns an array of { seller, condition, price, lang, isFoil, url }
 */
async function scrapeProductListings(browser, productUrl, card) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  try {
    // Add NM/EX condition filter and sort by price
    const url = new URL(productUrl);
    url.searchParams.set('minCondition', '2');  // Near Mint or better
    url.searchParams.set('sortBy', 'price_asc');
    url.searchParams.set('perSite', '20');
    // Skip altered cards, foil if raw grading target
    // Don't add isFoil filter - some cards ARE foil by nature

    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('.article-table, [class*="articleRow"], .no-results-container', {
      timeout: 12000,
    }).catch(() => {});

    const listings = await page.evaluate((minPrice) => {
      const results = [];

      // Modern CM layout — article table rows
      const rows = document.querySelectorAll(
        '.article-table .table-body .table-body-row, ' +
        '[data-component="ArticleTable"] [class*="articleRow"]'
      );

      for (const row of rows) {
        // Condition badge
        const condEl = row.querySelector('[class*="badge-condition"], [class*="Condition"], .badge');
        const condition = condEl ? condEl.textContent.trim() : null;

        // Skip played/damaged conditions (keep MT, NM, EX)
        if (condition && ['GD', 'LP', 'PL', 'HP', 'PR', 'P'].some(c => condition.includes(c))) continue;

        // Price
        const priceEl = row.querySelector('[class*="price"], .price-container, .col-offer .font-weight-bold');
        if (!priceEl) continue;
        const priceText = priceEl.textContent.trim().replace(/[^\d.,]/g, '');
        // Handle European number format (1.234,56 or 1,234.56)
        let price;
        if (/\d+\.\d{3},\d{2}$/.test(priceText)) {
          price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
        } else {
          price = parseFloat(priceText.replace(',', '.'));
        }
        if (!price || isNaN(price) || price < minPrice) continue;

        // Seller name
        const sellerEl = row.querySelector('[class*="seller"], .seller-name, .d-flex .font-weight-bold');
        const seller = sellerEl ? sellerEl.textContent.trim() : 'Unknown';

        // Language
        const langEl = row.querySelector('[class*="flag"], [class*="language"]');
        const lang = langEl ? (langEl.title || langEl.alt || langEl.textContent.trim()) : 'EN';

        // Foil
        const isFoil = !!row.querySelector('[class*="foil"], [title*="Foil"], [title*="foil"]');

        // Quantity
        const qtyEl = row.querySelector('[class*="amount"], [class*="quantity"]');
        const qty = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;

        results.push({ seller, condition: condition || 'NM', price, lang, isFoil, qty });
        if (results.length >= 8) break;
      }

      return results;
    }, MIN_LISTING_PRICE_EUR);

    // Also grab the market trend price if available
    const marketData = await page.evaluate(() => {
      const trendEl = document.querySelector('[class*="trend"], [data-testid*="trend"] .price, .info-list-container .price-container');
      const lowEl   = document.querySelector('[class*="low-price"], .price-low, .info-list-container .price-container:first-child');

      let trend = null, low = null;
      const parsePriceEl = (el) => {
        if (!el) return null;
        const t = el.textContent.replace(/[^\d.,]/g, '');
        if (/\d+\.\d{3},\d{2}$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
        return parseFloat(t.replace(',', '.'));
      };
      trend = parsePriceEl(trendEl);
      low   = parsePriceEl(lowEl);
      return { trend, low };
    });

    return { listings, marketData, pageUrl: url.toString() };
  } catch (e) {
    console.error(`  [cm] product scrape failed: ${e.message?.slice(0, 80)}`);
    return { listings: [], marketData: {}, pageUrl: productUrl };
  } finally {
    await page.close();
  }
}

// ── Deal Scorer ───────────────────────────────────────────────────────────────

function scoreDeal(card, listing) {
  const rawEst = card.rawEstimateEur;
  const condWeight = CONDITION_WEIGHTS[listing.condition] ?? 0.85;
  const effectiveValue = rawEst * condWeight;
  const ratio = listing.price / effectiveValue;

  // Steal tier thresholds (adjusted for raw → condition value)
  let tier;
  if (ratio <= 0.35)      tier = 'HOLY_GRAIL';
  else if (ratio <= 0.50) tier = 'OBVIOUS';
  else if (ratio <= 0.62) tier = 'NO_BRAINER';
  else if (ratio <= 0.75) tier = 'FREE_WIN';
  else if (ratio <= 0.88) tier = 'DEAL';
  else                     tier = 'FAIR';

  // Score 0-100 (inverse of ratio, clamped)
  const score = Math.max(0, Math.min(100, Math.round((1 - ratio) * 120)));

  const netProfit = (card.psa10EstimateEur ?? rawEst * (card.multiplier ?? 5))
    - listing.price
    - (card.gradingCost ?? 80)
    - (listing.price * 0.05); // shipping/fees estimate

  return { ratio, tier, score, netProfit, effectiveValue };
}

// ── Alert Formatter ───────────────────────────────────────────────────────────

function formatAlert(card, listing, scored, productUrl) {
  const { ratio, tier, score, netProfit, effectiveValue } = scored;
  const tierLabels = {
    HOLY_GRAIL:  '🚨 HOLY GRAIL',
    OBVIOUS:     '💀 OBVIOUS STEAL',
    NO_BRAINER:  '🔥 NO-BRAINER',
    FREE_WIN:    '✅ FREE WIN',
    DEAL:        '📈 DEAL',
    FAIR:        '📍 FAIR PRICE',
  };
  const cardTierEmoji = TIER_EMOJI[card.tier] ?? '🎯';

  const lines = [
    `🌍 <b>EU CARDMARKET DEAL</b> — ${tierLabels[tier]}`,
    ``,
    `${cardTierEmoji} <b>${card.cardName}</b>`,
    `🎮 ${card.game} · ${card.tier}-Tier Hunt Card`,
    ``,
    `💰 <b>Listed: ${fmt(listing.price)}</b>`,
    `📊 Condition: <b>${listing.condition}</b>${listing.lang !== 'EN' ? ` · ${listing.lang}` : ''}`,
    `📈 Raw NM Estimate: ${fmt(effectiveValue)} (raw est. ${fmt(card.rawEstimateEur)})`,
    `💎 PSA 10 Potential: ${fmt(card.psa10EstimateEur ?? card.rawEstimateEur * (card.multiplier ?? 5))}`,
    ``,
    `🔢 Price ratio: <b>${Math.round(ratio * 100)}%</b> of NM estimate`,
    `🚀 Net profit potential: <b>${fmt(netProfit)}</b> after grading`,
    `⭐ Steal Score: <b>${score}/100</b>`,
    ``,
    `🔗 <a href="${productUrl}">View on Cardmarket →</a>`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>Card Sniper Alpha · EU Coverage · Cardmarket.com</i>`,
  ];

  return lines.join('\n');
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const data = await res.json();
    if (!data.ok) console.error(`[cm] Telegram error: ${JSON.stringify(data)}`);
    return data.ok;
  } catch (e) {
    console.error(`[cm] Telegram network error: ${e.message}`);
    return false;
  }
}

// ── Deals Log ─────────────────────────────────────────────────────────────────

function recordDeal(card, listing, scored, productUrl) {
  const deals = loadJSON(CM_DEALS_FILE, { deals: [], lastUpdated: null, totalFound: 0 });

  const deal = {
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    foundAt: new Date().toISOString(),
    cardId: card.id,
    cardName: card.cardName,
    game: card.game,
    tier: card.tier,
    listing: {
      price: listing.price,
      condition: listing.condition,
      seller: listing.seller,
      lang: listing.lang,
      qty: listing.qty,
    },
    analysis: {
      ratio: Math.round(scored.ratio * 100) / 100,
      stealTier: scored.tier,
      stealScore: scored.score,
      netProfit: Math.round(scored.netProfit),
      rawEstimateEur: card.rawEstimateEur,
      psa10EstimateEur: card.psa10EstimateEur,
    },
    url: productUrl,
  };

  deals.deals.unshift(deal);
  // Keep last 100 deals
  if (deals.deals.length > 100) deals.deals = deals.deals.slice(0, 100);
  deals.totalFound = (deals.totalFound || 0) + 1;
  deals.lastUpdated = new Date().toISOString();

  saveJSON(CM_DEALS_FILE, deals);
  return deal;
}

// ── Main Scanner ──────────────────────────────────────────────────────────────

async function scan(opts = {}) {
  const { dryRun = false, gameFilter = null, tierFilter = null, cardIdFilter = null, limit = MAX_CARDS_PER_RUN } = opts;

  console.log(`\n[cm] 🌍 Cardmarket EU Scanner starting — ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
  console.log(`[cm] Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | limit: ${limit}`);

  const huntData = loadHuntList();
  let cards = huntData.cards.filter(c => {
    const cmGame = GAME_TO_CM[c.game];
    if (!cmGame) return false;
    if (gameFilter && c.game !== gameFilter) return false;
    if (tierFilter && c.tier !== tierFilter) return false;
    if (cardIdFilter && c.id !== cardIdFilter) return false;
    return true;
  });

  // Prioritize S and A tier
  cards.sort((a, b) => {
    const tierOrder = { S: 0, A: 1, B: 2, C: 3 };
    return (tierOrder[a.tier] ?? 4) - (tierOrder[b.tier] ?? 4);
  });

  cards = cards.slice(0, limit);
  console.log(`[cm] Scanning ${cards.length} cards across Cardmarket EU\n`);

  const cache = getCache();
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('[cm] ❌ Chrome not found. Install Chrome or Chromium.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=en-US'],
  });

  let scanned = 0, dealsFound = 0, alertsSent = 0;
  const summary = [];

  try {
    for (const card of cards) {
      const cmGame = GAME_TO_CM[card.game];
      console.log(`\n[cm] [${card.id}] ${card.tier} ${card.cardName} (${card.game})`);

      // Check cache
      const cached = getCacheEntry(cache, card.id);
      if (cached) {
        console.log(`  [cm] cache hit — ${cached.listingCount} listings, best: ${fmt(cached.bestPrice)} (${cached.bestCondition})`);
        scanned++;
        if (cached.isDeal) {
          console.log(`  [cm] 🔔 Cached deal — score ${cached.bestScore}`);
          summary.push({ card: card.cardName, tier: card.tier, score: cached.bestScore, price: cached.bestPrice, fromCache: true });
        }
        continue;
      }

      // Step 1: Find product URL
      let productUrl = cached?.productUrl ?? null;
      if (!productUrl) {
        console.log(`  [cm] Searching Cardmarket for product...`);
        productUrl = await findProductUrl(browser, card, cmGame);
        if (!productUrl) {
          console.log(`  [cm] ⚠️  Product not found on Cardmarket`);
          setCacheEntry(cache, card.id, { listingCount: 0, bestPrice: null, bestCondition: null, isDeal: false, productUrl: null, bestScore: 0 });
          scanned++;
          continue;
        }
        console.log(`  [cm] Found: ${productUrl.replace('https://www.cardmarket.com', '')}`);
      }

      // Step 2: Scrape listings
      await new Promise(r => setTimeout(r, 1200)); // polite delay
      const { listings, marketData, pageUrl } = await scrapeProductListings(browser, productUrl, card);

      console.log(`  [cm] Found ${listings.length} NM/EX listings`);
      if (marketData.trend) console.log(`  [cm] Market trend: ${fmt(marketData.trend)} | low: ${fmt(marketData.low)}`);

      if (!listings.length) {
        setCacheEntry(cache, card.id, { listingCount: 0, bestPrice: null, bestCondition: null, isDeal: false, productUrl, bestScore: 0 });
        scanned++;
        continue;
      }

      // Step 3: Score listings
      let bestDeal = null;
      for (const listing of listings) {
        const scored = scoreDeal(card, listing);
        console.log(`  [cm] ${listing.condition} ${fmt(listing.price)} by ${listing.seller} → ${scored.tier} (${scored.score}/100, ratio ${Math.round(scored.ratio * 100)}%)`);

        if (scored.tier !== 'FAIR' && (!bestDeal || scored.score > bestDeal.scored.score)) {
          bestDeal = { listing, scored };
        }
      }

      const bestListing = listings[0];
      const bestScored  = scoreDeal(card, bestListing);

      // Update cache
      setCacheEntry(cache, card.id, {
        listingCount: listings.length,
        bestPrice: bestListing.price,
        bestCondition: bestListing.condition,
        isDeal: bestDeal !== null,
        productUrl,
        bestScore: bestDeal ? bestDeal.scored.score : bestScored.score,
        marketTrend: marketData.trend,
        marketLow: marketData.low,
        scannedAt: new Date().toISOString(),
      });

      scanned++;

      // Step 4: Alert on deals
      if (!bestDeal) {
        console.log(`  [cm] No deal — best listing at ${Math.round(bestScored.ratio * 100)}% of estimate`);
        continue;
      }

      const { listing, scored } = bestDeal;
      console.log(`\n  [cm] 🔥 DEAL FOUND: ${card.cardName}`);
      console.log(`  [cm] Price: ${fmt(listing.price)} | Score: ${scored.score}/100 | Tier: ${scored.tier}`);
      console.log(`  [cm] Net profit potential: ${fmt(scored.netProfit)}`);

      dealsFound++;
      const alertText = formatAlert(card, listing, scored, pageUrl);
      summary.push({ card: card.cardName, tier: card.tier, score: scored.score, price: listing.price, stealTier: scored.tier });

      if (!dryRun) {
        // Record deal to JSON log
        recordDeal(card, listing, scored, pageUrl);

        // Send to Mikel DM
        await sendTelegram(TELEGRAM_CHAT_ID, alertText);
        console.log(`  [cm] ✅ Alert sent to Mikel`);
        await new Promise(r => setTimeout(r, 800));

        // Send to paid channel
        await sendTelegram(TELEGRAM_CHANNEL_PAID, alertText);
        console.log(`  [cm] ✅ Alert sent to paid channel`);
        alertsSent += 2;

        // Enqueue 48h-delayed free-tier alert
        enqueueAlert(alertText, {
          cardName: card.cardName,
          game: card.game,
          tier: card.tier,
          stealScore: scored.score,
          listingUrl: pageUrl,
        });
        console.log(`  [cm] ✅ Free-tier alert queued (48h delay)`);

        await new Promise(r => setTimeout(r, 800));
      } else {
        console.log(`  [cm] [DRY RUN] Would send alert:\n${alertText.slice(0, 200)}...\n`);
      }

      // Delay between cards
      if (cards.indexOf(card) < cards.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CARDS));
      }
    }
  } finally {
    await browser.close();
    // Save cache
    cache.lastRun = new Date().toISOString();
    cache.totalScanned = (cache.totalScanned || 0) + scanned;
    cache.totalDeals   = (cache.totalDeals   || 0) + dealsFound;
    saveJSON(CM_CACHE_FILE, cache);
  }

  // Summary report
  console.log('\n' + '═'.repeat(60));
  console.log('[cm] 📊 SCAN COMPLETE');
  console.log(`[cm] Scanned: ${scanned} cards | Deals: ${dealsFound} | Alerts sent: ${alertsSent}`);

  if (summary.length > 0) {
    console.log('\n[cm] 🎯 Deals found:');
    summary.forEach(d => {
      const fromCache = d.fromCache ? ' (cached)' : '';
      console.log(`  ${TIER_EMOJI[d.tier] ?? '🎯'} ${d.card} → ${fmt(d.price)} — Score ${d.score}/100${fromCache}`);
    });
  } else {
    console.log('[cm] No deals found this run. Market is fairly priced.');
  }

  console.log('═'.repeat(60) + '\n');

  return { scanned, dealsFound, alertsSent, summary };
}

// ── Stats Command ─────────────────────────────────────────────────────────────

function showStats() {
  const cache  = loadJSON(CM_CACHE_FILE, { cards: {}, totalScanned: 0, totalDeals: 0 });
  const deals  = loadJSON(CM_DEALS_FILE, { deals: [], totalFound: 0 });

  console.log('\n[cm] 📊 Cardmarket Scanner Stats');
  console.log(`Total scanned: ${cache.totalScanned ?? 0}`);
  console.log(`Total deals:   ${cache.totalDeals ?? 0}`);
  console.log(`Last run:      ${cache.lastRun ?? 'Never'}`);
  console.log(`Deals in log:  ${deals.deals?.length ?? 0} (last 100)`);
  console.log(`All-time deals:${deals.totalFound ?? 0}`);

  const cached = Object.entries(cache.cards ?? {});
  const active = cached.filter(([, v]) => Date.now() - v.ts < 8 * 60 * 60 * 1000);
  console.log(`Cache entries: ${active.length} active / ${cached.length} total`);

  if (deals.deals?.length > 0) {
    console.log('\nRecent deals:');
    deals.deals.slice(0, 5).forEach(d => {
      console.log(`  ${d.foundAt?.slice(0, 10)} | ${d.cardName} | ${fmt(d.listing.price)} | Score ${d.analysis.stealScore}`);
    });
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    showStats();
    process.exit(0);
  }

  const dryRun     = args.includes('--dry-run');
  const gameIdx    = args.indexOf('--game');
  const tierIdx    = args.indexOf('--tier');
  const cardIdx    = args.indexOf('--card');
  const limitIdx   = args.indexOf('--limit');

  const opts = {
    dryRun,
    gameFilter:   gameIdx  >= 0 ? args[gameIdx  + 1] : null,
    tierFilter:   tierIdx  >= 0 ? args[tierIdx  + 1] : null,
    cardIdFilter: cardIdx  >= 0 ? args[cardIdx  + 1] : null,
    limit:        limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : MAX_CARDS_PER_RUN,
  };

  scan(opts)
    .then(result => {
      if (result.dealsFound > 0) {
        console.log(`\n[cm] 🎉 ${result.dealsFound} EU deal(s) found and alerted!`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('[cm] Fatal error:', err);
      process.exit(1);
    });
}

export { scan, showStats };
