#!/usr/bin/env node
/**
 * PSA Population Report Fetcher — v2 (browser-first, no API guessing)
 *
 * Verified flow:
 * 1. Open psacard.com/pop/search in headless Chrome
 * 2. Type card name → Enter (triggers server-side search)
 * 3. Click "Show Pop" on first result → inline table expands
 * 4. Parse table: col0=grade label, col1=pop count
 *
 * Real data confirmed: Luffy Manga OP-05 → PSA10:2792 PSA9:978 PSA8:68 Total:3869
 *
 * Cache: 7 days (pop changes slowly)
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PSA_POP_FILE = join(__dirname, 'psa-pop.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function loadCache() {
  if (!existsSync(PSA_POP_FILE)) return {};
  try { return JSON.parse(readFileSync(PSA_POP_FILE, 'utf8')); } catch { return {}; }
}
function saveCache(data) { writeFileSync(PSA_POP_FILE, JSON.stringify(data, null, 2)); }
function normalizeKey(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60); }

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
  ];
  for (const p of paths) { try { execSync(`test -f "${p}"`); return p; } catch {} }
  return null;
}

function calcPopRisk(psa10Pop, rawListings) {
  const ratio = psa10Pop > 0 ? rawListings / psa10Pop : 999;
  if (ratio > 50) return { popRisk: 'HIGH',     evDiscount:  0.40 };
  if (ratio > 20) return { popRisk: 'MEDIUM',   evDiscount:  0.20 };
  if (ratio <  5) return { popRisk: 'VERY LOW', evDiscount: -0.10 };
  return              { popRisk: 'LOW',      evDiscount:  0.00 };
}

/**
 * Scrape PSA pop for a card. Always uses a fresh browser instance to avoid
 * detached-frame bugs when called repeatedly from the monitor loop.
 */
async function scrapePsaPop(title) {
  const chromePath = findChrome();
  if (!chromePath) throw new Error('Chrome not found');

  // Fresh browser per call — avoids page/frame reuse issues
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setDefaultTimeout(20000);

    // Step 1: load search page
    await page.goto('https://www.psacard.com/pop/search', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Step 2: type and submit
    const input = await page.$('input[type=text]');
    if (!input) throw new Error('Search input not found');
    await input.type(title, { delay: 40 });
    await page.keyboard.press('Enter');

    // Wait for navigation (server-side search reloads the page)
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: click first "Show Pop" link
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const showPop = links.find(a => a.textContent.trim() === 'Show Pop');
      if (showPop) { showPop.click(); return true; }
      return false;
    });

    if (!clicked) {
      console.log(`  [psa-pop] No "Show Pop" found for "${title}" — card not in PSA database`);
      return null;
    }

    // Wait for inline table to expand
    await new Promise(r => setTimeout(r, 2500));

    // Step 4: parse second table (index 1) — col0=grade, col1=pop
    const grades = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      if (tables.length < 2) return null;
      const popTable = tables[1];
      const rows = Array.from(popTable.querySelectorAll('tr'));
      const result = {};
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('th, td'));
        if (cells.length < 2) continue;
        const label = cells[0].textContent.trim();
        const popStr = cells[1].textContent.trim().replace(/[^0-9]/g, '');
        const pop = parseInt(popStr, 10);
        if (label && !isNaN(pop) && label !== 'PSA' && label !== 'Grade') {
          result[label] = pop;
        }
      }
      return result;
    });

    if (!grades || Object.keys(grades).length === 0) {
      throw new Error('Could not parse pop table');
    }

    // Also grab the card description from the first result row
    const description = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const text = cells[1]?.textContent?.trim();
          if (text && text.length > 10) return text;
        }
      }
      return null;
    });

    return { grades, description };

  } finally {
    await browser.close();
  }
}

/**
 * Parse the raw grade map into structured pop data.
 * PSA grade labels: "GEM-MT 10", "MINT 9", "NM-MT 8", "NM 7", "Total"
 */
function parseGrades(grades) {
  const psa10 = grades['GEM-MT 10'] ?? grades['10'] ?? 0;
  const psa9  = grades['MINT 9']    ?? grades['9']  ?? 0;
  const psa8  = grades['NM-MT 8']   ?? grades['8']  ?? 0;
  const psa7  = grades['NM 7']      ?? grades['7']  ?? 0;
  const total = grades['Total']     ??
    Object.entries(grades)
      .filter(([k]) => k !== 'Total' && k !== '+' && k !== 'Q')
      .reduce((s, [, v]) => s + v, 0);

  const gradeRate10 = total > 0 ? psa10 / total : 0;
  const gradeRate9  = total > 0 ? psa9  / total : 0;
  const gradeRate8  = total > 0 ? psa8  / total : 0;

  return { psa10, psa9, psa8, psa7, total, gradeRate10, gradeRate9, gradeRate8 };
}

/**
 * Main export. Pass a shared `browser` instance for efficiency in the monitor loop,
 * or leave null to spin up a dedicated one per call.
 *
 * @param {string} title
 * @param {object} opts — { rawListings, forceRefresh }
 */
export async function getPsaPop(title, opts = {}) {
  const { rawListings = 0, forceRefresh = false } = opts;
  const key = normalizeKey(title);
  const cache = loadCache();

  // Cache hit
  if (!forceRefresh && cache[key] && Date.now() - cache[key].fetchedAt < CACHE_TTL_MS) {
    const c = cache[key];
    const risk = calcPopRisk(c.psa10Pop, rawListings);
    console.log(`  [psa-pop] "${title}" (cached) → PSA10:${c.psa10Pop} PSA9:${c.psa9Pop} PSA8:${c.psa8Pop} Total:${c.totalPop}`);
    return { ...c, ...risk, fromCache: true };
  }

  console.log(`  [psa-pop] Fetching "${title}"...`);

  let raw;
  try {
    raw = await scrapePsaPop(title);
  } catch (e) {
    console.error(`  [psa-pop] Scrape error: ${e.message}`);
    return null;
  }

  if (!raw) return null;

  const g = parseGrades(raw.grades);
  console.log(`  [psa-pop] "${title}" → PSA10:${g.psa10} PSA9:${g.psa9} PSA8:${g.psa8} Total:${g.total} | Grade rates: 10=${(g.gradeRate10*100).toFixed(1)}% 9=${(g.gradeRate9*100).toFixed(1)}% 8=${(g.gradeRate8*100).toFixed(1)}%`);

  const entry = {
    title,
    specDescription: raw.description,
    psa10Pop:    g.psa10,
    psa9Pop:     g.psa9,
    psa8Pop:     g.psa8,
    psa7Pop:     g.psa7,
    totalPop:    g.total,
    gradeRate10: Math.round(g.gradeRate10 * 1000) / 1000,
    gradeRate9:  Math.round(g.gradeRate9  * 1000) / 1000,
    gradeRate8:  Math.round(g.gradeRate8  * 1000) / 1000,
    fetchedAt:   Date.now(),
  };

  cache[key] = entry;
  saveCache(cache);

  const risk = calcPopRisk(g.psa10, rawListings);
  return { ...entry, ...risk, fromCache: false };
}

// ── Standalone test ──────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const title = process.argv[2] || 'Luffy Manga One Piece OP-01';
  const rawListings = parseInt(process.argv[3] || '48', 10);
  console.log(`\nTesting PSA pop for: "${title}" (rawListings=${rawListings})\n`);
  const result = await getPsaPop(title, { rawListings, forceRefresh: true });
  console.log('\nResult:', JSON.stringify(result, null, 2));
}
