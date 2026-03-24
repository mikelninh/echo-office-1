#!/usr/bin/env node
/**
 * Sold Price Scraper — eBay completed/sold listings
 * Fetches actual transaction prices (not asking prices) for FMV baseline.
 *
 * Usage: import { getSoldComps } from './sold-scraper.mjs'
 * Returns: { median, avg, min, max, samples, currency, count }
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOLD_HISTORY_FILE = join(__dirname, 'sold-history.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — sold prices don't change retroactively

function loadSoldHistory() {
  if (!existsSync(SOLD_HISTORY_FILE)) return {};
  try { return JSON.parse(readFileSync(SOLD_HISTORY_FILE, 'utf8')); } catch { return {}; }
}

function saveSoldHistory(data) {
  writeFileSync(SOLD_HISTORY_FILE, JSON.stringify(data, null, 2));
}

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

function normalizeKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Scrape eBay sold listings for a card title.
 * Returns up to 10 recent sold prices.
 */
async function scrapeEbaySold(browser, title, site = 'com', minPrice = 100) {
  const domain = site === 'de' ? 'ebay.de' : 'ebay.com';
  const query = encodeURIComponent(title);
  // LH_Sold=1 + LH_Complete=1 = completed sold listings only
  const url = `https://www.${domain}/sch/i.html?_nkw=${query}&LH_Sold=1&LH_Complete=1&_sop=13&LH_PrefLoc=1`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const results = await page.evaluate((minP) => {
      const items = [];
      // eBay new layout uses [data-viewport] items
      const listings = document.querySelectorAll('[data-viewport]');
      for (const item of listings) {
        try {
          // eBay 2024+ layout: s-card__title for title
          // Price is inside su-styled-text elements — find the one that looks like a dollar amount
          const titleEl = item.querySelector('.s-card__title, .s-item__title, [class*="card__title"]');
          const soldDateEl = item.querySelector('[class*="ended-date"], [class*="sold-date"], .POSITIVE');
          const linkEl = item.querySelector('a[href*="/itm/"]');

          if (!titleEl) continue;
          let titleText = titleEl.textContent.trim();
          titleText = titleText.replace(/^New Listing\s*/i, '').trim();
          if (!titleText || titleText === 'Shop on eBay') continue;

          // Find price: look for su-styled-text elements that contain a currency pattern
          const allTextEls = item.querySelectorAll('[class*="su-styled-text"]');
          let price = 0;
          for (const el of allTextEls) {
            const txt = el.textContent.trim();
            // Match patterns like "$189.00", "€2,500.00", "EUR 1.234,56"
            const match = txt.match(/^[$€£]?\s*([\d]{1,3}(?:[,.][\d]{3})*(?:[.,]\d{1,2})?)\s*$/);
            if (match) {
              let numStr = match[1];
              // EU format detection: "1.234,56" → "1234.56"
              if (/\d{1,3}\.\d{3},\d{2}$/.test(numStr)) {
                numStr = numStr.replace(/\./g, '').replace(',', '.');
              } else {
                numStr = numStr.replace(/,/g, '');
              }
              const parsed = parseFloat(numStr);
              if (parsed > 0) { price = parsed; break; }
            }
          }
          if (!price || price < minP) continue;

          items.push({
            title: titleText,
            price,
            soldDate: soldDateEl?.textContent?.trim() || null,
            url: linkEl?.href?.split('?')[0] || null,
          });

          if (items.length >= 10) break;
        } catch {}
      }
      return items;
    }, minPrice);

    return results;
  } catch (e) {
    console.error(`  [sold-scraper] eBay ${site} failed for "${title}": ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Get sold comps for a card title.
 * Checks cache first (6h TTL), then scrapes.
 *
 * @param {object} browser - shared puppeteer browser instance
 * @param {string} title - card name/title to search
 * @param {object} opts - { minPrice, currency, sites }
 * @returns {{ median, avg, min, max, count, samples, currency, fromCache }}
 */
export async function getSoldComps(browser, title, opts = {}) {
  const { minPrice = 100, sites = ['com', 'de'] } = opts;
  const key = normalizeKey(title);
  const history = loadSoldHistory();

  // Check cache
  if (history[key] && Date.now() - history[key].fetchedAt < CACHE_TTL_MS) {
    return { ...history[key].stats, fromCache: true };
  }

  // Scrape
  let allSales = [];
  for (const site of sites) {
    const sales = await scrapeEbaySold(browser, title, site, minPrice);
    allSales = [...allSales, ...sales];
  }

  if (!allSales.length) {
    console.log(`  [sold-scraper] No sold comps found for "${title}"`);
    return null;
  }

  // Deduplicate by price+title similarity, take best 10
  const prices = allSales.map(s => s.price).filter(p => p > 0);
  
  // Remove outliers: drop top/bottom 10% if we have enough samples
  let filtered = prices;
  if (prices.length >= 6) {
    const sorted = [...prices].sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.1);
    filtered = sorted.slice(trim, sorted.length - trim);
  }

  const stats = {
    median: Math.round(median(filtered)),
    avg: Math.round(filtered.reduce((s, p) => s + p, 0) / filtered.length),
    min: Math.round(Math.min(...filtered)),
    max: Math.round(Math.max(...filtered)),
    count: filtered.length,
    rawCount: prices.length,
    samples: allSales.slice(0, 10).map(s => ({ price: s.price, date: s.soldDate, url: s.url })),
    fetchedAt: Date.now(),
  };

  // Cache it
  history[key] = { title, stats: { ...stats }, fetchedAt: Date.now() };
  saveSoldHistory(history);

  console.log(`  [sold-scraper] "${title}" → ${stats.count} comps | median: €${stats.median} | avg: €${stats.avg}`);
  return { ...stats, fromCache: false };
}

/**
 * Standalone test: node sold-scraper.mjs "Blue-Eyes White Dragon 1st Edition"
 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chromePath = (() => {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const p of paths) { try { execSync(`test -f "${p}"`); return p; } catch {} }
    return null;
  })();

  if (!chromePath) { console.error('Chrome not found'); process.exit(1); }

  const { launch } = await import('puppeteer-core');
  const browser = await launch({ executablePath: chromePath, headless: 'new' });

  const title = process.argv[2] || 'Luffy Manga Secret Rare One Piece';
  console.log(`\nFetching sold comps for: "${title}"\n`);

  const comps = await getSoldComps(browser, title, { minPrice: 50 });
  console.log('\nResult:', JSON.stringify(comps, null, 2));

  await browser.close();
}
