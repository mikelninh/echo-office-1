#!/usr/bin/env node
/**
 * Want List Engine — matches new listings against subscriber targets
 *
 * Subscribers add cards they're hunting. The moment one appears at their
 * target price, they get an instant Telegram push with full EV breakdown.
 *
 * This is the feature that makes a snipe worth €49/mo.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WANT_LIST_FILE = join(__dirname, 'want-lists.json');
const MATCH_LOG_FILE = join(__dirname, 'want-list-matches.json');

// ── Data helpers ─────────────────────────────────────────────────────

export function loadWantLists() {
  if (!existsSync(WANT_LIST_FILE)) return [];
  try { return JSON.parse(readFileSync(WANT_LIST_FILE, 'utf8')); } catch { return []; }
}

export function saveWantLists(lists) {
  writeFileSync(WANT_LIST_FILE, JSON.stringify(lists, null, 2));
}

function loadMatchLog() {
  if (!existsSync(MATCH_LOG_FILE)) return [];
  try { return JSON.parse(readFileSync(MATCH_LOG_FILE, 'utf8')); } catch { return []; }
}

function logMatch(match) {
  const log = loadMatchLog();
  log.unshift({ ...match, matchedAt: new Date().toISOString() });
  writeFileSync(MATCH_LOG_FILE, JSON.stringify(log.slice(0, 1000), null, 2));
}

// ── Fuzzy matching ────────────────────────────────────────────────────

/**
 * Score how well a listing title matches a want list target.
 * Returns 0–1. We alert if score >= 0.65.
 */
function matchScore(listingTitle, targetCardName) {
  const lt = listingTitle.toLowerCase();
  const tt = targetCardName.toLowerCase();

  // Exact contains
  if (lt.includes(tt)) return 1.0;

  // Split into tokens and check coverage
  const targetTokens = tt.split(/\s+/).filter(t => t.length > 2);
  const matched = targetTokens.filter(t => lt.includes(t));
  const coverage = matched.length / targetTokens.length;

  return coverage;
}

/**
 * Check if a game string matches a want list game filter.
 * 'any' matches everything.
 */
function gameMatches(listingGame, targetGame) {
  if (!targetGame || targetGame === 'any') return true;
  return listingGame?.toLowerCase().includes(targetGame.toLowerCase()) ||
         targetGame.toLowerCase().includes(listingGame?.toLowerCase() ?? '');
}

// ── Core matching ─────────────────────────────────────────────────────

/**
 * Match a single listing against all active want lists.
 * Returns array of matches: { subscriber, target, score }
 */
export function matchListing(listing) {
  const wantLists = loadWantLists();
  const matches = [];

  for (const subscriber of wantLists) {
    if (!subscriber.active) continue;
    for (const target of subscriber.targets) {
      if (!target.active) continue;

      // Game filter
      if (!gameMatches(listing.game, target.game)) continue;

      // Price gate
      if (target.maxRawPrice && listing.priceAmount > target.maxRawPrice) continue;

      // Title match
      const score = matchScore(listing.title, target.cardName);
      if (score < 0.65) continue;

      matches.push({
        subscriber,
        target,
        score: Math.round(score * 100),
        listing,
      });
    }
  }

  return matches;
}

/**
 * Run all new listings through want lists. Called after every monitor scan.
 * Returns array of { subscriber, target, listing, evResult } to notify.
 */
export function processNewListings(newListings) {
  const notifications = [];

  for (const listing of newListings) {
    const matches = matchListing(listing);
    for (const match of matches) {
      logMatch({
        subscriberId: match.subscriber.subscriberId,
        cardName: match.target.cardName,
        listingTitle: match.listing.title,
        price: match.listing.price,
        matchScore: match.score,
        url: match.listing.url,
      });
      notifications.push(match);
    }
  }

  return notifications;
}

// ── Alert formatting ──────────────────────────────────────────────────

/**
 * Format a want list match as a Telegram message.
 */
export function formatWantListAlert(match) {
  const { subscriber, target, listing, score } = match;
  const ev = listing.evResult;
  const tier = subscriber.tier || 'pro';
  const tierEmoji = tier === 'dealer' ? '⚡⚡' : '⚡';

  const lines = [
    `${tierEmoji} WANT LIST MATCH`,
    ``,
    `[${listing.game}] ${listing.title}`,
    `📍 ${listing.platform} — ${listing.price}`,
    `✅ Your target: ≤€${target.maxRawPrice?.toLocaleString('de-DE') ?? 'any'}  (match: ${score}%)`,
  ];

  if (target.notes) lines.push(`📝 Your note: "${target.notes}"`);
  lines.push(``);

  if (ev) {
    lines.push(ev.verdict);
    lines.push(``);
    lines.push(`💸 Buy it for    ${listing.price}`);
    if (ev.grades) {
      const g = ev.grades;
      const c = '€';
      const fmt = n => Number(n).toLocaleString('de-DE');
      lines.push(`📊 What could come back:`);
      lines.push(`   PSA 10 — ${g.psa10.rate}% chance → sells ${c}${fmt(g.psa10.price)}  (+${c}${fmt(g.psa10.ev)} EV)`);
      lines.push(`   PSA  9 — ${g.psa9.rate}% chance → sells ${c}${fmt(g.psa9.price)}  (+${c}${fmt(g.psa9.ev)} EV)`);
      lines.push(`   PSA  8 — ${g.psa8.rate}% chance → sells ${c}${fmt(g.psa8.price)}`);
      lines.push(`   ≤ PSA 7 — ${g.low.rate}% chance → recover ~${c}${fmt(g.low.price)}`);
      lines.push(``);
      lines.push(`🎯 Expected value: ${ev.ev >= 0 ? '+' : ''}€${ev.ev?.toLocaleString('de-DE')}  (${ev.roi}% ROI)`);
    }
  }

  lines.push(``);
  lines.push(`🔥 Act fast — grail listings sell in <1h`);
  lines.push(`🔗 ${listing.url}`);

  return lines.join('\n');
}

// ── Subscriber management ─────────────────────────────────────────────

export function addWantList(subscriberData) {
  const lists = loadWantLists();
  const existing = lists.find(s => s.subscriberId === subscriberData.subscriberId);
  if (existing) {
    existing.targets.push(...(subscriberData.targets || []));
    existing.updatedAt = new Date().toISOString();
  } else {
    lists.push({
      ...subscriberData,
      active: true,
      createdAt: new Date().toISOString(),
    });
  }
  saveWantLists(lists);
  return lists;
}

export function addTarget(subscriberId, target) {
  const lists = loadWantLists();
  const sub = lists.find(s => s.subscriberId === subscriberId);
  if (!sub) throw new Error(`Subscriber ${subscriberId} not found`);
  sub.targets.push({ ...target, active: true, addedAt: new Date().toISOString() });
  saveWantLists(lists);
  return sub;
}

export function removeTarget(subscriberId, cardName) {
  const lists = loadWantLists();
  const sub = lists.find(s => s.subscriberId === subscriberId);
  if (!sub) return;
  sub.targets = sub.targets.filter(t =>
    !t.cardName.toLowerCase().includes(cardName.toLowerCase())
  );
  saveWantLists(lists);
  return sub;
}

// ── Seed Mikel's own want list for testing ───────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];

  if (action === 'seed') {
    // Seed with Mikel's real targets for testing
    addWantList({
      subscriberId: '938367498',
      telegramId: '938367498',
      name: 'Mikel',
      tier: 'dealer',
      active: true,
      targets: [
        {
          cardName: 'Blue-Eyes White Dragon LOB 1st Edition',
          game: 'yugioh',
          maxRawPrice: 600,
          notes: 'NM or better, check centering',
          active: true,
        },
        {
          cardName: 'Luffy Manga Alternate Art OP-01',
          game: 'onepiece',
          maxRawPrice: 800,
          notes: 'Any condition — high grade rate',
          active: true,
        },
        {
          cardName: 'Charizard 1st Edition Base Set',
          game: 'pokemon',
          maxRawPrice: 4000,
          notes: 'PSA 9+ target',
          active: true,
        },
      ],
    });
    console.log('Seeded want list for Mikel');
    console.log(JSON.stringify(loadWantLists(), null, 2));

  } else if (action === 'test') {
    // Test matching against a fake listing
    const testListing = {
      title: 'Blue-Eyes White Dragon LOB-001 1st Edition Legend of Blue Eyes',
      game: 'yugioh',
      priceAmount: 450,
      price: '€450',
      platform: 'eBay.de',
      url: 'https://ebay.de/itm/test123',
    };
    const matches = matchListing(testListing);
    console.log('Matches for test listing:', JSON.stringify(matches.map(m => ({
      subscriber: m.subscriber.name,
      target: m.target.cardName,
      score: m.score,
      priceOk: testListing.priceAmount <= m.target.maxRawPrice,
    })), null, 2));

  } else {
    console.log('Usage: node want-list-engine.mjs [seed|test]');
    console.log('Current want lists:');
    console.log(JSON.stringify(loadWantLists(), null, 2));
  }
}
