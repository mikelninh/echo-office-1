#!/usr/bin/env node
/**
 * free-tier-dispatcher.mjs — Free Tier Alert Dispatcher
 *
 * The trust bridge between free lurkers and paid subscribers.
 *
 * Run this hourly (via cron or startup).
 * It reads free-alert-queue.json, finds alerts whose 48h delay has expired,
 * and posts them to the free Telegram channel with an upgrade CTA.
 *
 * Paid subscribers already got these alerts in real-time 48h ago.
 * Free users see: same card, same insight, perfect for FOMO → conversion.
 *
 * Usage:
 *   node free-tier-dispatcher.mjs             — flush due alerts
 *   node free-tier-dispatcher.mjs --stats     — print queue stats only
 *   node free-tier-dispatcher.mjs --dry-run   — simulate without sending
 *   node free-tier-dispatcher.mjs --purge     — purge old sent entries
 */

import { getDueAlerts, markSent, purgeOldAlerts, getStats } from './free-alert-queue.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN  || '8675912510:AAFwKtU2WoheIrjtGUHa8gpZRH2AQ2Pkzt8';
const TELEGRAM_CHANNEL_FREE = process.env.TELEGRAM_CHANNEL_FREE || '';

// If no free channel env var, try to read from a local config
// Set TELEGRAM_CHANNEL_FREE to your @CardSniperFree channel ID (e.g. -1001234567890)

const DELAY_BETWEEN_MESSAGES_MS = 1200; // avoid Telegram flood limits

// ── Telegram Send ─────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[dispatcher] ❌ Telegram error:', JSON.stringify(data));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[dispatcher] ❌ Network error:', err.message);
    return false;
  }
}

// ── Format Free Alert ─────────────────────────────────────────────────────────

/**
 * Transform a paid alert into a free-tier teaser.
 *
 * Strategy: show the card name + tier + steal score (enough to prove value),
 * redact the listing URL and exact EV numbers, add strong upgrade CTA.
 *
 * Free users learn: "This deal existed, it was real, you missed it."
 * That FOMO is the conversion engine.
 */
function formatFreeAlert(entry) {
  const { meta, alertText, enqueuedAt } = entry;
  const originalDate = new Date(enqueuedAt);

  // Format original alert date (shows how old the deal was)
  const dateStr = originalDate.toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });

  // Tier emoji
  const tierEmoji = { S: '👑', A: '💎', B: '📈', C: '🎯' }[meta.tier] ?? '🎯';

  // Build the teaser — strip the listing URL line but keep everything else
  const alertLines = alertText.split('\n');
  const teaserLines = alertLines.filter(line => {
    // Remove the direct listing link
    if (line.includes('href=') || line.includes('t.me/') || line.includes('http')) return false;
    return true;
  });

  // Take first ~10 lines of alert (the signal, not the link)
  const signalLines = teaserLines.slice(0, 12).join('\n').trim();

  const lines = [
    `⏰ <b>48H DELAYED ALERT</b> — This deal fired on ${dateStr}`,
    ``,
    signalLines,
    ``,
    `🔗 <i>Listing link available to paid subscribers only</i>`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💡 <b>Want real-time alerts?</b>`,
    ``,
    `Alpha subscribers got this ${tierEmoji} <b>${meta.tier}-tier deal</b> 48 hours ago — in real time.`,
    `Steal score: <b>${meta.stealScore}/100</b>`,
    ``,
    `🚀 Join Card Sniper Alpha from <b>€19/month</b>`,
    `👉 @CardSniperAlphaBot`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>Card Sniper Free · Real alerts, 48h delay · cardsniperalpha.com</i>`,
  ];

  return lines.join('\n');
}

// ── Main Dispatch Loop ────────────────────────────────────────────────────────

async function dispatch({ dryRun = false, statsOnly = false, purge = false } = {}) {
  console.log(`[dispatcher] 🚀 Free Tier Dispatcher starting — ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);

  // Stats first
  const stats = getStats();
  console.log(`[dispatcher] 📊 Queue: ${stats.pending} pending | ${stats.due} due | ${stats.sent} sent | ${stats.totalQueued} total queued`);

  if (statsOnly) {
    console.log('[dispatcher] Stats-only mode. Exiting.');
    return stats;
  }

  // Purge if requested
  if (purge) {
    const purged = purgeOldAlerts(14);
    console.log(`[dispatcher] 🗑️  Purged ${purged} old entries`);
  }

  // Get due alerts
  const due = getDueAlerts();
  if (!due.length) {
    console.log('[dispatcher] ✅ No alerts due for sending. Queue is clean.');
    return { dispatched: 0, stats };
  }

  console.log(`[dispatcher] 📤 ${due.length} alert(s) ready to dispatch`);

  // Check free channel config
  if (!TELEGRAM_CHANNEL_FREE) {
    console.warn('[dispatcher] ⚠️  TELEGRAM_CHANNEL_FREE not set. Set the env var to enable free channel posting.');
    console.log('[dispatcher] 📋 Would have sent:', due.length, 'alerts');
    due.forEach(e => console.log(`  - ${e.meta.cardName} (${e.meta.tier}-tier, score ${e.meta.stealScore}) — queued ${e.enqueuedAt}`));
    return { dispatched: 0, stats, pending: due.length };
  }

  let dispatched = 0;
  let failed = 0;

  for (const entry of due) {
    const text = formatFreeAlert(entry);

    console.log(`[dispatcher] 📨 Sending: ${entry.meta.cardName} (${entry.meta.tier}) — enqueued ${entry.enqueuedAt}`);

    if (dryRun) {
      console.log('[dispatcher] DRY RUN — would send:\n', text.slice(0, 200), '...\n');
      markSent(entry.id); // Mark as sent even in dry run (prevents re-dispatch on next run)
      dispatched++;
    } else {
      const ok = await sendTelegramMessage(TELEGRAM_CHANNEL_FREE, text);
      if (ok) {
        markSent(entry.id);
        dispatched++;
        console.log(`[dispatcher] ✅ Sent: ${entry.meta.cardName}`);
      } else {
        failed++;
        console.error(`[dispatcher] ❌ Failed: ${entry.meta.cardName}`);
      }

      // Rate limit guard
      if (due.indexOf(entry) < due.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_MESSAGES_MS));
      }
    }
  }

  // Periodic purge (keep queue tidy — run automatically every dispatch)
  purgeOldAlerts(14);

  console.log(`[dispatcher] 🏁 Done. Dispatched: ${dispatched} | Failed: ${failed}`);
  return { dispatched, failed, stats };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun    = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');
  const purge     = args.includes('--purge');

  dispatch({ dryRun, statsOnly, purge })
    .then(result => {
      if (result.dispatched > 0) {
        console.log(`\n[dispatcher] 🎉 Dispatched ${result.dispatched} free alert(s) to channel`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('[dispatcher] Fatal error:', err);
      process.exit(1);
    });
}

export { dispatch, formatFreeAlert };
