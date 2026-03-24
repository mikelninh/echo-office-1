/**
 * Card Sniper — Japan Arbitrage Monitor
 * Monitors Mercari JP + Yahoo Auctions JP via Buyee's public search
 * Compares ¥ prices to EU market (Cardmarket/eBay.de comps)
 * Alerts when JP price is ≥40% below EU market (after all costs)
 *
 * Exchange rate: ~156 JPY/USD, ~148 JPY/EUR (Feb 2026)
 * Buyee fees: ¥300 purchase + ¥300–1500 domestic ship + intl ship €8–18 (cards)
 * eBay.de sell fees: ~12.35% final value + €0.35 insertion
 * Target: net margin ≥40% after ALL costs
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const JPY_EUR = 0.00617;   // 1 JPY = €0.00617 (156 JPY/USD, EUR ~148/JPY)
const JPY_USD = 0.00641;   // 1 JPY = $0.00641

const BUYEE_PURCHASE_FEE_JPY = 300;        // flat per order
const BUYEE_DOMESTIC_SHIP_JPY = 800;       // avg for cards (150–1500, cards = low end)
const INTL_SHIP_EUR = 12;                  // EMS small packet JP→DE, 1–5 cards
const EBAY_FEE_PCT = 0.1235;              // eBay.de final value fee
const EBAY_INSERTION = 0.35;              // per listing
const MIN_GEO_DISCOUNT = 0.40;            // alert threshold: 40%+ below EU price
const MIN_NET_PROFIT_EUR = 30;            // minimum €30 net after all costs

const CACHE_FILE = path.join(__dirname, 'japan-arb-cache.json');
const LOG_FILE   = path.join(__dirname, 'japan-arb-log.json');
const SEEN_FILE  = path.join(__dirname, 'japan-arb-seen.json');

// ── Japan Target List ─────────────────────────────────────────────────────────
// JP search term → EU market reference price (€)
// These are cards where JP print commands similar or higher EU price
const JAPAN_TARGETS = [

  // ══ POKÉMON ══════════════════════════════════════════════════════════════
  {
    id: 'jp-poke-001',
    name: 'Charizard Japanese Base Set Holo',
    game: 'Pokémon',
    tier: 'S',
    buyeeQuery: 'リザードン 旧裏 ホロ',           // "Charizard old-back holo"
    yahooQuery: 'リザードン 旧裏面 ホロ',
    euPriceEur: 750,                             // NM raw on eBay.de/Cardmarket
    psaUpside: true,                             // grade potential on top
    notes: 'JP Base Set Charizard ~¥16k–22k on Mercari. EU sells €650–900 NM. Pure geo-arb + PSA upside.',
  },
  {
    id: 'jp-poke-002',
    name: 'Lugia Neo Genesis Japanese Holo',
    game: 'Pokémon',
    tier: 'A',
    buyeeQuery: 'ルギア ネオジェネシス ホロ',
    yahooQuery: 'ルギア neo genesis holo',
    euPriceEur: 380,
    psaUpside: true,
    notes: 'JP Neo Lugia. EU asks €300–450. JP Mercari often ¥25k–35k = €155–215. Strong spread.',
  },
  {
    id: 'jp-poke-003',
    name: 'Umbreon Neo Discovery Japanese Holo',
    game: 'Pokémon',
    tier: 'A',
    buyeeQuery: 'ブラッキー neo discovery holo',
    yahooQuery: 'ブラッキー ネオディスカバリー',
    euPriceEur: 280,
    psaUpside: true,
    notes: 'Cult collector card. JP ~¥15k–20k. EU €220–350. Shrine collectors pay premium.',
  },
  {
    id: 'jp-poke-004',
    name: 'Espeon Neo Discovery Japanese Holo',
    game: 'Pokémon',
    tier: 'A',
    buyeeQuery: 'エーフィ neo discovery holo',
    yahooQuery: 'エーフィ ネオディスカバリー holo',
    euPriceEur: 220,
    psaUpside: true,
    notes: 'Paired with Umbreon. JP cheaper. EU collectors pay well.',
  },
  {
    id: 'jp-poke-005',
    name: 'Blastoise Japanese Base Set Holo',
    game: 'Pokémon',
    tier: 'A',
    buyeeQuery: 'カメックス 旧裏 ホロ',
    yahooQuery: 'カメックス 旧裏面 ホロ',
    euPriceEur: 320,
    psaUpside: true,
    notes: 'JP Base Blastoise. EU €280–380. Often overlooked on Mercari.',
  },
  {
    id: 'jp-poke-006',
    name: 'Mewtwo Japanese Base Set Holo',
    game: 'Pokémon',
    tier: 'B',
    buyeeQuery: 'ミュウツー 旧裏 ホロ',
    yahooQuery: 'ミュウツー 旧裏面 ホロ',
    euPriceEur: 140,
    psaUpside: true,
    notes: 'High volume but reliable spread. JP ¥8k–12k. EU €120–160.',
  },
  {
    id: 'jp-poke-007',
    name: 'Venusaur Japanese Base Set Holo',
    game: 'Pokémon',
    tier: 'B',
    buyeeQuery: 'フシギバナ 旧裏 ホロ',
    yahooQuery: 'フシギバナ 旧裏面 ホロ',
    euPriceEur: 200,
    psaUpside: true,
    notes: 'Least hyped starter. JP ¥10k–14k. EU €170–240.',
  },
  {
    id: 'jp-poke-008',
    name: 'Pikachu Illustrator Japanese',
    game: 'Pokémon',
    tier: 'S',
    buyeeQuery: 'ピカチュウイラストレーター',
    yahooQuery: 'ピカチュウ イラストレーター',
    euPriceEur: 350000,
    psaUpside: true,
    notes: 'GRAIL. Extremely rare. If it appears unrecognized — historic find.',
  },

  // ══ YU-GI-OH OCG ══════════════════════════════════════════════════════════
  {
    id: 'jp-yugi-001',
    name: 'Blue-Eyes White Dragon Vol.1 Japanese OCG',
    game: 'Yu-Gi-Oh OCG',
    tier: 'S',
    buyeeQuery: '青眼の白龍 Vol.1',
    yahooQuery: '青眼の白龍 初期',
    euPriceEur: 800,
    psaUpside: true,
    notes: 'OCG Vol.1 BEWD. EN LOB gets all the hype but JP original often cheaper. EU asks €600–1000.',
  },
  {
    id: 'jp-yugi-002',
    name: 'Dark Magician Girl Japanese',
    game: 'Yu-Gi-Oh OCG',
    tier: 'S',
    buyeeQuery: 'ブラック・マジシャン・ガール',
    yahooQuery: 'ブラックマジシャンガール レア',
    euPriceEur: 600,
    psaUpside: true,
    notes: 'JP collectors sell DMG cheaper than EN. EU pays premium for character.',
  },
  {
    id: 'jp-yugi-003',
    name: 'Exodia the Forbidden One Japanese',
    game: 'Yu-Gi-Oh OCG',
    tier: 'A',
    buyeeQuery: 'エクゾディア 封印されし者',
    yahooQuery: 'エクゾディア 初期',
    euPriceEur: 400,
    psaUpside: true,
    notes: 'Original JP Exodia. EU collectors hunt the complete set.',
  },

  // ══ ONE PIECE ══════════════════════════════════════════════════════════════
  {
    id: 'jp-op-001',
    name: 'Monkey D. Luffy OP01 Secret Rare Japanese',
    game: 'One Piece',
    tier: 'A',
    buyeeQuery: 'モンキー・D・ルフィ OP-01 シークレット',
    yahooQuery: 'ルフィ OP01 SEC',
    euPriceEur: 180,
    psaUpside: true,
    notes: 'OP01 SEC. JP releases 2–3 months before EU. JP Mercari often 30% cheaper.',
  },
  {
    id: 'jp-op-002',
    name: 'Roronoa Zoro OP01 Secret Rare Japanese',
    game: 'One Piece',
    tier: 'A',
    buyeeQuery: 'ロロノア・ゾロ OP-01 シークレット',
    yahooQuery: 'ゾロ OP01 SEC',
    euPriceEur: 160,
    psaUpside: true,
    notes: 'Second most-wanted OP01 SEC. Same dynamic as Luffy.',
  },

  // ══ WEIBS SCHWARZ ══════════════════════════════════════════════════════════
  {
    id: 'jp-ws-001',
    name: 'Dandadan SP Signed Japanese',
    game: 'Weiß Schwarz',
    tier: 'A',
    buyeeQuery: 'ダンダダン SP サイン',
    yahooQuery: 'ダンダダン WS サイン レア',
    euPriceEur: 200,
    psaUpside: true,
    notes: 'Mikel target. VA autos while pop low. JP Mercari often 40–60% under EU.',
  },
];

// ── Cost Calculator ───────────────────────────────────────────────────────────
function calcTotalCost(jpyPrice) {
  const itemEur = jpyPrice * JPY_EUR;
  const buyeeFeeEur = (BUYEE_PURCHASE_FEE_JPY + BUYEE_DOMESTIC_SHIP_JPY) * JPY_EUR;
  const totalCost = itemEur + buyeeFeeEur + INTL_SHIP_EUR;
  return { itemEur, buyeeFeeEur, totalCost };
}

function calcSellNet(euListPrice) {
  const fees = (euListPrice * EBAY_FEE_PCT) + EBAY_INSERTION;
  return euListPrice - fees;
}

function calcArb(jpyPrice, euRefPrice) {
  const { itemEur, buyeeFeeEur, totalCost } = calcTotalCost(jpyPrice);
  const sellNet = calcSellNet(euRefPrice);
  const netProfit = sellNet - totalCost;
  const discount = 1 - (totalCost / sellNet);
  const roi = (netProfit / totalCost) * 100;
  return { totalCost, sellNet, netProfit, discount, roi, itemEur, buyeeFeeEur };
}

// ── Buyee Search (public, no auth needed) ────────────────────────────────────
async function searchBuyeeMercari(query, browser) {
  const url = `https://buyee.jp/mercari/search?keyword=${encodeURIComponent(query)}&status=on_sale&sort=price&order=asc`;
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.g-item-list', { timeout: 10000 }).catch(() => {});

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.g-item-list .itemCard, .g-item-list li');
      return Array.from(cards).slice(0, 8).map(card => {
        const priceEl = card.querySelector('.g-price, .itemCard__price, [class*="price"]');
        const titleEl = card.querySelector('.itemCard__name, [class*="name"], [class*="title"]');
        const linkEl = card.querySelector('a[href]');
        const imgEl = card.querySelector('img');
        const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '';
        return {
          title: titleEl?.textContent?.trim() || '',
          priceJpy: parseInt(priceText) || 0,
          url: linkEl?.href || '',
          img: imgEl?.src || '',
          source: 'Mercari JP via Buyee',
        };
      }).filter(i => i.priceJpy > 0);
    });
    return items;
  } catch (e) {
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

async function searchBuyeeYahoo(query, browser) {
  const url = `https://buyee.jp/yahoo/auction/search?query=${encodeURIComponent(query)}&sort=price&order=asc&status=new`;
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.g-item-list', { timeout: 10000 }).catch(() => {});

    const items = await page.evaluate(() => {
      const cards = document.querySelectorAll('.g-item-list .itemCard, .g-item-list li');
      return Array.from(cards).slice(0, 8).map(card => {
        const priceEl = card.querySelector('.g-price, .itemCard__price, [class*="price"]');
        const titleEl = card.querySelector('.itemCard__name, [class*="name"], [class*="title"]');
        const linkEl = card.querySelector('a[href]');
        const imgEl = card.querySelector('img');
        const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '';
        return {
          title: titleEl?.textContent?.trim() || '',
          priceJpy: parseInt(priceText) || 0,
          url: linkEl?.href || '',
          img: imgEl?.src || '',
          source: 'Yahoo Auctions JP via Buyee',
        };
      }).filter(i => i.priceJpy > 0);
    });
    return items;
  } catch (e) {
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ── Main Monitor ──────────────────────────────────────────────────────────────
async function runJapanArbMonitor() {
  console.log(`\n🇯🇵 Japan Arb Monitor — ${new Date().toISOString()}`);
  console.log(`Exchange: ¥1 = €${JPY_EUR} (156 JPY/EUR)`);
  console.log('─'.repeat(60));

  const seen = fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : {};
  const alerts = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const target of JAPAN_TARGETS) {
      console.log(`\nScanning: ${target.name}`);

      const [mercariItems, yahooItems] = await Promise.all([
        searchBuyeeMercari(target.buyeeQuery, browser),
        searchBuyeeYahoo(target.yahooQuery, browser),
      ]);

      const allItems = [...mercariItems, ...yahooItems];
      console.log(`  Found: ${mercariItems.length} Mercari + ${yahooItems.length} Yahoo = ${allItems.length} total`);

      for (const item of allItems) {
        if (!item.priceJpy || item.priceJpy < 500) continue;
        if (seen[item.url]) continue;

        const arb = calcArb(item.priceJpy, target.euPriceEur);

        console.log(`  ¥${item.priceJpy.toLocaleString()} → cost €${arb.totalCost.toFixed(0)} → sell €${arb.sellNet.toFixed(0)} → profit €${arb.netProfit.toFixed(0)} (${(arb.discount*100).toFixed(0)}% under EU)`);

        if (arb.discount >= MIN_GEO_DISCOUNT && arb.netProfit >= MIN_NET_PROFIT_EUR) {
          const alert = {
            ts: new Date().toISOString(),
            target: target.name,
            game: target.game,
            tier: target.tier,
            psaUpside: target.psaUpside,
            listing: {
              title: item.title,
              priceJpy: item.priceJpy,
              priceEur: Math.round(item.priceJpy * JPY_EUR),
              url: item.url,
              source: item.source,
            },
            economics: {
              itemCostEur: Math.round(arb.itemEur),
              buyeeFeesEur: Math.round(arb.buyeeFeeEur),
              shippingEur: INTL_SHIP_EUR,
              totalCostEur: Math.round(arb.totalCost),
              euRefPriceEur: target.euPriceEur,
              sellNetEur: Math.round(arb.sellNet),
              netProfitEur: Math.round(arb.netProfit),
              discountVsEU: `${(arb.discount * 100).toFixed(0)}%`,
              roi: `${arb.roi.toFixed(0)}%`,
            },
            psaNote: target.psaUpside
              ? `Grade potential on top: PSA 10 could 5–20× the value`
              : null,
          };
          alerts.push(alert);
          seen[item.url] = true;
          console.log(`  🚨 ALERT: ${target.name} — €${Math.round(arb.netProfit)} profit (${(arb.discount*100).toFixed(0)}% under EU)`);
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 2000));
    }
  } finally {
    await browser.close();
  }

  // Save
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));

  const existing = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
  const updated = [...existing, ...alerts].slice(-500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(updated, null, 2));

  console.log(`\n✅ Done. ${alerts.length} geo-arb alerts found.`);
  return alerts;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--calc')) {
  // Show calculation table for all targets at typical JP prices
  console.log('\n🧮 Japan Geo-Arb Calculator — All Targets\n');
  console.log('Exchange rate: ¥156 = $1 | ¥148 = €1 (Feb 26, 2026)\n');
  console.log('Costs per order: ¥300 Buyee fee + ¥800 domestic ship + €12 intl ship\n');
  console.log('eBay sell fees: 12.35% + €0.35\n');
  console.log('─'.repeat(100));
  console.log(`${'Card'.padEnd(38)} ${'Buy JP(¥)'.padStart(9)} ${'Cost(€)'.padStart(8)} ${'EU Ref(€)'.padStart(10)} ${'Net(€)'.padStart(8)} ${'Discount'.padStart(9)} ${'ROI'.padStart(7)}`);
  console.log('─'.repeat(100));

  const TYPICAL_JP_PRICES = {
    'jp-poke-001': 18000,
    'jp-poke-002': 28000,
    'jp-poke-003': 17000,
    'jp-poke-004': 13000,
    'jp-poke-005': 15000,
    'jp-poke-006': 9000,
    'jp-poke-007': 11000,
    'jp-poke-008': 99999999,
    'jp-yugi-001': 40000,
    'jp-yugi-002': 22000,
    'jp-yugi-003': 18000,
    'jp-op-001': 8000,
    'jp-op-002': 7000,
    'jp-ws-001': 6000,
  };

  for (const t of JAPAN_TARGETS) {
    const jpyPrice = TYPICAL_JP_PRICES[t.id] || 10000;
    if (jpyPrice > 9000000) { console.log(`${t.name.padEnd(38)} ${'GRAIL'.padStart(9)}`); continue; }
    const arb = calcArb(jpyPrice, t.euPriceEur);
    const flag = arb.netProfit >= MIN_NET_PROFIT_EUR && arb.discount >= MIN_GEO_DISCOUNT ? ' ✅' : '';
    console.log(
      `${t.name.slice(0, 37).padEnd(38)} ` +
      `${('¥' + jpyPrice.toLocaleString()).padStart(9)} ` +
      `${'€' + Math.round(arb.totalCost)}`.padStart(8) + ' ' +
      `${'€' + t.euPriceEur}`.padStart(10) + ' ' +
      `${'€' + Math.round(arb.netProfit)}`.padStart(8) + ' ' +
      `${(arb.discount * 100).toFixed(0) + '%'}`.padStart(9) + ' ' +
      `${arb.roi.toFixed(0) + '%'}`.padStart(7) +
      flag
    );
  }
  console.log('─'.repeat(100));
  console.log('\n✅ = meets 40% discount + €30 min profit threshold\n');
  process.exit(0);
}

if (args.includes('--run')) {
  const alerts = await runJapanArbMonitor();
  if (alerts.length) {
    console.log('\n── Alert Details ──');
    for (const a of alerts) {
      console.log(`\n${a.target} (${a.game})`);
      console.log(`  JP: ¥${a.listing.priceJpy.toLocaleString()} (€${a.listing.priceEur})`);
      console.log(`  All-in cost: €${a.economics.totalCostEur}`);
      console.log(`  EU sell (net fees): €${a.economics.sellNetEur}`);
      console.log(`  Net profit: €${a.economics.netProfitEur} | ROI: ${a.economics.roi} | Under EU: ${a.economics.discountVsEU}`);
      console.log(`  Link: ${a.listing.url}`);
    }
  }
}

export { runJapanArbMonitor, calcArb, calcTotalCost, JAPAN_TARGETS, JPY_EUR };
