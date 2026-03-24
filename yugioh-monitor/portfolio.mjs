#!/usr/bin/env node
/**
 * Portfolio Engine — Card collection management with SQLite
 * 
 * Tracks: cards owned, buy/sell transactions, P&L, donations, profiles
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'portfolio.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      game TEXT NOT NULL,
      set_name TEXT,
      card_number TEXT,
      grade TEXT,
      grading_company TEXT,
      condition TEXT,

      buy_price REAL,
      buy_currency TEXT DEFAULT 'EUR',
      buy_platform TEXT,
      buy_url TEXT,
      buy_date TEXT,

      current_value REAL,
      last_valued TEXT,

      status TEXT DEFAULT 'HOLD',
      sell_price REAL,
      sell_platform TEXT,
      sell_date TEXT,
      sell_url TEXT,

      image_url TEXT,
      notes TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      card_id TEXT REFERENCES cards(id),
      type TEXT NOT NULL,
      amount REAL,
      currency TEXT DEFAULT 'EUR',
      platform TEXT,
      counterparty TEXT,
      tracking_number TEXT,
      status TEXT DEFAULT 'PENDING',
      speed_days INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_cards INTEGER,
      total_value REAL,
      total_invested REAL,
      total_profit REAL,
      total_donated REAL,
      unrealized_pl REAL,
      best_performer TEXT,
      worst_performer TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      transaction_id TEXT REFERENCES transactions(id),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      cause TEXT DEFAULT 'MSA Research',
      wallet_address TEXT,
      tx_hash TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      collection_public INTEGER DEFAULT 0,
      trade_speed TEXT DEFAULT 'medium',
      total_trades INTEGER DEFAULT 0,
      reputation_score REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game);
    CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(card_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  `);
}

// ── Card Operations ──────────────────────────────────────────────────

export function addCard({
  title, game, set_name, card_number, grade, grading_company, condition,
  buy_price, buy_currency, buy_platform, buy_url, buy_date,
  current_value, status, image_url, notes,
}) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cards (id, title, game, set_name, card_number, grade, grading_company, condition,
      buy_price, buy_currency, buy_platform, buy_url, buy_date,
      current_value, last_valued, status, image_url, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, game, set_name || null, card_number || null, grade || null,
    grading_company || null, condition || null,
    buy_price || null, buy_currency || 'EUR', buy_platform || null,
    buy_url || null, buy_date || now.slice(0, 10),
    current_value || buy_price || null, now,
    status || 'HOLD', image_url || null, notes || null,
    now, now
  );

  // Create BUY transaction
  if (buy_price) {
    addTransaction({
      card_id: id,
      type: 'BUY',
      amount: buy_price,
      currency: buy_currency || 'EUR',
      platform: buy_platform,
    });
  }

  return id;
}

export function getCard(id) {
  return getDb().prepare('SELECT * FROM cards WHERE id = ?').get(id);
}

export function listCards({ game, status, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM cards WHERE 1=1';
  const params = [];
  if (game) { sql += ' AND game = ?'; params.push(game); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
}

export function updateCard(id, updates) {
  const db = getDb();
  const allowed = ['title', 'game', 'set_name', 'card_number', 'grade', 'grading_company',
    'condition', 'current_value', 'status', 'sell_price', 'sell_platform', 'sell_date',
    'sell_url', 'image_url', 'notes'];
  
  const sets = [];
  const params = [];
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }
  if (sets.length === 0) return false;
  
  sets.push("updated_at = datetime('now')");
  if (updates.current_value !== undefined) {
    sets.push("last_valued = datetime('now')");
  }
  
  params.push(id);
  db.prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return true;
}

export function sellCard(id, { sell_price, sell_platform, sell_url }) {
  const db = getDb();
  const card = getCard(id);
  if (!card) throw new Error(`Card ${id} not found`);

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cards SET status = 'SOLD', sell_price = ?, sell_platform = ?, sell_date = ?,
      sell_url = ?, updated_at = ? WHERE id = ?
  `).run(sell_price, sell_platform || null, now.slice(0, 10), sell_url || null, now, id);

  // Create SELL transaction
  const txId = addTransaction({
    card_id: id,
    type: 'SELL',
    amount: sell_price,
    currency: card.buy_currency || 'EUR',
    platform: sell_platform,
  });

  // Calculate profit and create donation
  const profit = sell_price - (card.buy_price || 0);
  if (profit > 0) {
    const donationAmount = Math.round(profit * 0.10 * 100) / 100; // 10% to cause
    createDonation({
      transaction_id: txId,
      amount: donationAmount,
      currency: card.buy_currency || 'EUR',
    });
  }

  return { profit, txId };
}

// ── Transaction Operations ───────────────────────────────────────────

export function addTransaction({ card_id, type, amount, currency, platform, counterparty, tracking_number }) {
  const db = getDb();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, card_id, type, amount, currency, platform, counterparty, tracking_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, card_id, type, amount, currency || 'EUR', platform || null, counterparty || null, tracking_number || null);
  return id;
}

export function completeTransaction(id) {
  const db = getDb();
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!tx) return null;

  const created = new Date(tx.created_at);
  const now = new Date();
  const speedDays = Math.ceil((now - created) / (1000 * 60 * 60 * 24));

  db.prepare(`
    UPDATE transactions SET status = 'COMPLETED', completed_at = datetime('now'), speed_days = ?
    WHERE id = ?
  `).run(speedDays, id);

  return speedDays;
}

export function getTransactions({ card_id, type, limit = 50 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (card_id) { sql += ' AND card_id = ?'; params.push(card_id); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params);
}

// ── Donation Operations ──────────────────────────────────────────────

export function createDonation({ transaction_id, amount, currency, cause, wallet_address }) {
  const db = getDb();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO donations (id, transaction_id, amount, currency, cause, wallet_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, transaction_id || null, amount, currency || 'EUR', cause || 'MSA Research', wallet_address || null);
  return id;
}

export function getTotalDonated(cause) {
  const db = getDb();
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM donations' +
    (cause ? ' WHERE cause = ?' : '')
  ).get(...(cause ? [cause] : []));
  return row.total;
}

// ── Portfolio Analytics ──────────────────────────────────────────────

export function getPortfolioSummary() {
  const db = getDb();

  const cards = db.prepare("SELECT * FROM cards WHERE status != 'SOLD'").all();
  const soldCards = db.prepare("SELECT * FROM cards WHERE status = 'SOLD'").all();

  const totalCards = cards.length;
  const totalValue = cards.reduce((sum, c) => sum + (c.current_value || 0), 0);
  const totalInvested = cards.reduce((sum, c) => sum + (c.buy_price || 0), 0);
  const unrealizedPL = totalValue - totalInvested;

  const realizedProfit = soldCards.reduce((sum, c) => {
    return sum + ((c.sell_price || 0) - (c.buy_price || 0));
  }, 0);

  const totalDonated = getTotalDonated();

  // Transaction speed
  const completedTxs = db.prepare("SELECT speed_days FROM transactions WHERE status = 'COMPLETED' AND speed_days IS NOT NULL").all();
  const avgSpeed = completedTxs.length > 0
    ? Math.round(completedTxs.reduce((s, t) => s + t.speed_days, 0) / completedTxs.length)
    : null;

  let speedRating = '❓ No data';
  if (avgSpeed !== null) {
    if (avgSpeed <= 7) speedRating = '⚡ Fast';
    else if (avgSpeed <= 30) speedRating = '🚶 Medium';
    else speedRating = '🐢 Slow';
  }

  // Best / worst performer
  let best = null, worst = null;
  for (const card of cards) {
    if (!card.buy_price || !card.current_value) continue;
    const pl = ((card.current_value - card.buy_price) / card.buy_price) * 100;
    if (!best || pl > best.pl) best = { card, pl };
    if (!worst || pl < worst.pl) worst = { card, pl };
  }

  // Games breakdown
  const byGame = {};
  for (const card of cards) {
    if (!byGame[card.game]) byGame[card.game] = { count: 0, value: 0 };
    byGame[card.game].count++;
    byGame[card.game].value += card.current_value || 0;
  }

  return {
    totalCards,
    totalValue: Math.round(totalValue * 100) / 100,
    totalInvested: Math.round(totalInvested * 100) / 100,
    unrealizedPL: Math.round(unrealizedPL * 100) / 100,
    realizedProfit: Math.round(realizedProfit * 100) / 100,
    totalDonated: Math.round(totalDonated * 100) / 100,
    totalSold: soldCards.length,
    avgTransactionSpeed: avgSpeed,
    speedRating,
    bestPerformer: best ? { title: best.card.title, pl: Math.round(best.pl) + '%' } : null,
    worstPerformer: worst ? { title: worst.card.title, pl: Math.round(worst.pl) + '%' } : null,
    byGame,
  };
}

export function takeSnapshot() {
  const db = getDb();
  const summary = getPortfolioSummary();
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT OR REPLACE INTO portfolio_snapshots
    (date, total_cards, total_value, total_invested, total_profit, total_donated, unrealized_pl, best_performer, worst_performer)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    today,
    summary.totalCards,
    summary.totalValue,
    summary.totalInvested,
    summary.realizedProfit,
    summary.totalDonated,
    summary.unrealizedPL,
    summary.bestPerformer?.title || null,
    summary.worstPerformer?.title || null,
  );

  return summary;
}

export function getHistory(days = 30) {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return db.prepare('SELECT * FROM portfolio_snapshots WHERE date >= ? ORDER BY date ASC').all(cutoff);
}

// ── CLI ──────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('portfolio.mjs')) {
  const cmd = process.argv[2];

  if (cmd === 'summary') {
    const summary = getPortfolioSummary();
    console.log('\n📊 PORTFOLIO SUMMARY');
    console.log('='.repeat(40));
    console.log(`Cards: ${summary.totalCards}`);
    console.log(`Value: €${summary.totalValue.toFixed(2)}`);
    console.log(`Invested: €${summary.totalInvested.toFixed(2)}`);
    console.log(`Unrealized P&L: €${summary.unrealizedPL.toFixed(2)}`);
    console.log(`Realized Profit: €${summary.realizedProfit.toFixed(2)}`);
    console.log(`Donated: €${summary.totalDonated.toFixed(2)}`);
    console.log(`Speed: ${summary.speedRating}`);
    if (summary.bestPerformer) console.log(`Best: ${summary.bestPerformer.title} (${summary.bestPerformer.pl})`);
    if (summary.worstPerformer) console.log(`Worst: ${summary.worstPerformer.title} (${summary.worstPerformer.pl})`);
    console.log('\nBy Game:');
    for (const [game, data] of Object.entries(summary.byGame)) {
      console.log(`  ${game}: ${data.count} cards, €${data.value.toFixed(2)}`);
    }
  } else if (cmd === 'snapshot') {
    const summary = takeSnapshot();
    console.log(`✅ Snapshot saved: ${summary.totalCards} cards, €${summary.totalValue.toFixed(2)} value`);
  } else if (cmd === 'list') {
    const game = process.argv[3];
    const cards = listCards({ game });
    for (const c of cards) {
      const pl = c.current_value && c.buy_price
        ? ` (${((c.current_value - c.buy_price) / c.buy_price * 100).toFixed(0)}%)`
        : '';
      console.log(`[${c.status}] ${c.title} — €${(c.buy_price || 0).toFixed(2)} → €${(c.current_value || 0).toFixed(2)}${pl}`);
    }
    console.log(`\n${cards.length} cards`);
  } else {
    console.log('Usage: portfolio.mjs [summary|snapshot|list [game]]');
  }
}
