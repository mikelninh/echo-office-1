#!/usr/bin/env node
/**
 * Advisor Wire — Connects monitor output → advisor analysis → Telegram recommendations
 * 
 * Run after monitor.mjs completes. Reads the latest alerts, scores them,
 * and sends BUY/WATCH/PASS recommendations to Mikel via Telegram.
 * 
 * Usage:
 *   node advisor-wire.mjs              # Process latest monitor output
 *   node advisor-wire.mjs --daily      # Send daily portfolio brief
 *   node advisor-wire.mjs --signals    # Check & send sell signals
 *   node advisor-wire.mjs --add "title" game price platform  # Add card manually
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  analyzeForAdvisor, formatRecommendation, getButtons,
  generateDailyBrief, checkSellSignals,
} from './advisor.mjs';
import { addCard, getPortfolioSummary, takeSnapshot } from './portfolio.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALERTS_LOG = join(__dirname, 'alerts-log.json');
const PROCESSED_FILE = join(__dirname, 'advisor-processed.json');
const OWNER_ID = '938367498';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// ── Telegram ─────────────────────────────────────────────────────────

async function sendTelegram(chatId, text, replyMarkup = null) {
  if (!BOT_TOKEN) {
    console.log('[advisor-wire] No BOT_TOKEN — would send:');
    console.log(text);
    if (replyMarkup) console.log('Buttons:', JSON.stringify(replyMarkup));
    return { ok: false, reason: 'no_token' };
  }

  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: false,
  };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  if (!BOT_TOKEN || !photoUrl) return sendTelegram(chatId, caption, replyMarkup);

  const body = {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  // Fallback to text if photo fails
  if (!data.ok) return sendTelegram(chatId, caption, replyMarkup);
  return data;
}

// ── Process Alerts ───────────────────────────────────────────────────

function loadProcessed() {
  if (existsSync(PROCESSED_FILE)) {
    try { return JSON.parse(readFileSync(PROCESSED_FILE, 'utf8')); } catch { return {}; }
  }
  return {};
}

function saveProcessed(processed) {
  writeFileSync(PROCESSED_FILE, JSON.stringify(processed, null, 2));
}

async function processNewAlerts() {
  if (!existsSync(ALERTS_LOG)) {
    console.log('No alerts-log.json yet.');
    return;
  }

  const raw = readFileSync(ALERTS_LOG, 'utf8').trim();
  if (!raw) return;

  const lines = raw.split('\n').filter(Boolean);
  const processed = loadProcessed();
  let newCount = 0;

  // Process last 20 alerts (recent enough to matter)
  const recent = lines.slice(-20);
  for (const line of recent) {
    let alert;
    try { alert = JSON.parse(line); } catch { continue; }

    // Create a unique key for this alert
    const key = `${alert.title?.slice(0, 50)}_${alert.price}_${alert.platform}`;
    if (processed[key]) continue;

    // Run advisor analysis
    const rec = analyzeForAdvisor(alert);

    // Only send BUY and WATCH recommendations (skip PASS to reduce noise)
    if (rec.action === 'PASS' && rec.confidence < 30) {
      processed[key] = { action: 'PASS', ts: Date.now() };
      continue;
    }

    const text = formatRecommendation(alert, rec);
    const alertId = Buffer.from(key).toString('base64').slice(0, 20);
    const buttons = getButtons(alertId, rec);

    // Send with image if available
    const imageUrl = alert.image || null;
    if (imageUrl) {
      await sendPhoto(OWNER_ID, imageUrl, text, { inline_keyboard: buttons });
    } else {
      await sendTelegram(OWNER_ID, text, { inline_keyboard: buttons });
    }

    processed[key] = { action: rec.action, confidence: rec.confidence, ts: Date.now() };
    newCount++;

    // Rate limit — don't spam
    await new Promise(r => setTimeout(r, 1000));
  }

  saveProcessed(processed);

  // Prune processed entries older than 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [k, v] of Object.entries(processed)) {
    if (v.ts < cutoff) delete processed[k];
  }
  saveProcessed(processed);

  console.log(`✅ Processed ${newCount} new recommendations`);
}

async function sendDailyBrief() {
  // Take snapshot first
  takeSnapshot();

  const brief = generateDailyBrief();
  await sendTelegram(OWNER_ID, brief);
  console.log('✅ Daily brief sent');
}

async function sendSellSignals() {
  const signals = checkSellSignals();
  if (signals.length === 0) {
    console.log('No sell signals.');
    return;
  }

  let msg = `🔔 **Sell Signals**\n${'─'.repeat(25)}\n\n`;
  for (const sig of signals) {
    msg += `${sig.message}\n\n`;
  }

  await sendTelegram(OWNER_ID, msg);
  console.log(`✅ ${signals.length} sell signals sent`);
}

async function addCardManual(title, game, price, platform) {
  const id = addCard({
    title,
    game,
    buy_price: parseFloat(price),
    buy_platform: platform || 'manual',
    status: 'HOLD',
  });
  console.log(`✅ Added: ${title} (${game}) — €${price} → ${id}`);
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--daily')) {
  await sendDailyBrief();
} else if (args.includes('--signals')) {
  await sendSellSignals();
} else if (args.includes('--add')) {
  const idx = args.indexOf('--add');
  const [title, game, price, platform] = args.slice(idx + 1);
  if (!title || !game || !price) {
    console.log('Usage: --add "Card Title" game price [platform]');
    process.exit(1);
  }
  await addCardManual(title, game, price, platform);
} else {
  await processNewAlerts();
}
