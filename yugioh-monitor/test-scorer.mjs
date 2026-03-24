#!/usr/bin/env node
/**
 * test-scorer.mjs
 * Runs listing-quality-scorer against the real seen.json and outputs a quality report.
 *
 * Usage: node test-scorer.mjs [--json] [--verbose]
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scoreListingQuality } from './listing-quality-scorer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEN_FILE = join(__dirname, 'seen.json');

const args = process.argv.slice(2);
const JSON_OUTPUT = args.includes('--json');
const VERBOSE     = args.includes('--verbose');

// ─── Load data ────────────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(SEEN_FILE, 'utf8'));
const entries = Object.entries(raw).map(([id, data]) => ({ id, ...data }));

console.error(`Loaded ${entries.length} listings from seen.json\n`);

// ─── Score everything ─────────────────────────────────────────────────────────
const results = entries.map(listing => {
  const { score, reasons, isJunk } = scoreListingQuality(listing);
  return { listing, score, reasons, isJunk };
});

results.sort((a, b) => a.score - b.score);

// ─── Aggregate stats ──────────────────────────────────────────────────────────
const total     = results.length;
const junkCount = results.filter(r => r.isJunk).length;
const goodCount = total - junkCount;
const junkPct   = ((junkCount / total) * 100).toFixed(1);

// Score distribution buckets
const buckets = {
  '0-10':  0, '11-20': 0, '21-30': 0, '31-40': 0,
  '41-50': 0, '51-60': 0, '61-70': 0, '71-80': 0,
  '81-90': 0, '91-100':0,
};
for (const r of results) {
  const bucket = Math.floor(r.score / 10) * 10;
  const key = bucket >= 100 ? '91-100' : `${bucket + 1}-${bucket + 10}`;
  // Fix edge: score 0 → bucket '0-10'
  if (r.score <= 10) buckets['0-10']++;
  else if (r.score <= 20) buckets['11-20']++;
  else if (r.score <= 30) buckets['21-30']++;
  else if (r.score <= 40) buckets['31-40']++;
  else if (r.score <= 50) buckets['41-50']++;
  else if (r.score <= 60) buckets['51-60']++;
  else if (r.score <= 70) buckets['61-70']++;
  else if (r.score <= 80) buckets['71-80']++;
  else if (r.score <= 90) buckets['81-90']++;
  else buckets['91-100']++;
}

// Average score
const avgScore = (results.reduce((s, r) => s + r.score, 0) / total).toFixed(1);
const medianScore = results[Math.floor(total / 2)].score;

// By game
const byGame = {};
for (const r of results) {
  const g = r.listing.game || 'unknown';
  if (!byGame[g]) byGame[g] = { total: 0, junk: 0, scores: [] };
  byGame[g].total++;
  if (r.isJunk) byGame[g].junk++;
  byGame[g].scores.push(r.score);
}

// ─── Pick showcase listings ───────────────────────────────────────────────────
const worst10 = results.slice(0, 10);
const borderline = results.filter(r => r.score >= 40 && r.score <= 60).slice(0, 10);
const best10 = results.slice(-10).reverse();

// ─── Output ───────────────────────────────────────────────────────────────────
if (JSON_OUTPUT) {
  console.log(JSON.stringify({ total, junkCount, goodCount, junkPct, avgScore, medianScore, buckets, byGame, worst10, borderline, best10 }, null, 2));
  process.exit(0);
}

function bar(n, max, width = 30) {
  const filled = Math.round((n / Math.max(max, 1)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function printListing(r, idx) {
  const tag = r.isJunk ? '🗑 JUNK' : r.score >= 70 ? '✅ GOOD' : '⚠️  BORDERLINE';
  console.log(`  ${String(idx + 1).padStart(2)}. [${String(r.score).padStart(3)}] ${tag}`);
  console.log(`      ${r.listing.title}`);
  if (r.listing.price) console.log(`      Price: ${r.listing.price}  Game: ${r.listing.game || 'unknown'}`);
  if (VERBOSE) {
    r.reasons.forEach(reason => console.log(`      • ${reason}`));
  }
  console.log();
}

console.log('═'.repeat(70));
console.log('  LISTING QUALITY SCORER — QUALITY REPORT');
console.log('═'.repeat(70));
console.log();

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('📊  SUMMARY');
console.log('─'.repeat(50));
console.log(`  Total listings analysed : ${total}`);
console.log(`  Junk (isJunk=true)      : ${junkCount}  (${junkPct}%)`);
console.log(`  Quality listings        : ${goodCount}  (${(100 - parseFloat(junkPct)).toFixed(1)}%)`);
console.log(`  Average score           : ${avgScore} / 100`);
console.log(`  Median score            : ${medianScore} / 100`);
console.log();

// ── Score Distribution ────────────────────────────────────────────────────────
console.log('📈  SCORE DISTRIBUTION');
console.log('─'.repeat(50));
const maxBucket = Math.max(...Object.values(buckets));
for (const [range, count] of Object.entries(buckets)) {
  const pct = ((count / total) * 100).toFixed(1).padStart(5);
  const label = range.padEnd(7);
  console.log(`  ${label} ${bar(count, maxBucket)} ${String(count).padStart(4)}  (${pct}%)`);
}
console.log();

// ── By Game ───────────────────────────────────────────────────────────────────
console.log('🎮  BY GAME');
console.log('─'.repeat(50));
for (const [game, stats] of Object.entries(byGame).sort((a, b) => b[1].total - a[1].total)) {
  const jPct = ((stats.junk / stats.total) * 100).toFixed(0).padStart(3);
  const avgG = (stats.scores.reduce((s, x) => s + x, 0) / stats.scores.length).toFixed(0);
  console.log(`  ${game.padEnd(12)} ${String(stats.total).padStart(4)} listings  junk: ${stats.junk.toString().padStart(3)} (${jPct}%)  avg score: ${avgG}`);
}
console.log();

// ── 10 Worst Listings ─────────────────────────────────────────────────────────
console.log('💀  10 WORST LISTINGS CAUGHT (lowest scores)');
console.log('─'.repeat(50));
worst10.forEach((r, i) => printListing(r, i));

// ── 10 Borderline Listings ────────────────────────────────────────────────────
console.log(`⚠️   BORDERLINE LISTINGS (score 40-60) — first ${borderline.length}`);
console.log('─'.repeat(50));
if (borderline.length === 0) {
  console.log('  (none found)\n');
} else {
  borderline.forEach((r, i) => printListing(r, i));
}

// ── 10 Best Listings ──────────────────────────────────────────────────────────
console.log('🏆  TOP 10 LISTINGS (highest scores)');
console.log('─'.repeat(50));
best10.forEach((r, i) => printListing(r, i));

console.log('═'.repeat(70));
console.log(`  Run with --verbose for per-listing score reasons`);
console.log(`  Run with --json for machine-readable output`);
console.log('═'.repeat(70));
