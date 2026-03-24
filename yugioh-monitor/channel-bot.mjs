/**
 * channel-bot.mjs — Card Sniper Alpha Telegram Channel Bot
 *
 * Posts formatted grading arbitrage alerts to the subscribers' channel.
 * Requires TELEGRAM_CHANNEL_ID and optionally TELEGRAM_BOT_TOKEN env vars.
 * Falls back gracefully if bot token is missing (logs a warning).
 */

// ── Config ──────────────────────────────────────────────────────────────────
export const CHANNEL_CONFIG = {
  channelId: process.env.TELEGRAM_CHANNEL_ID || 'PLACEHOLDER_CHANNEL_ID',
  botToken: process.env.TELEGRAM_BOT_TOKEN || null, // optional — falls back to OpenClaw message tool
};

// ── Internal: send via Telegram Bot API ─────────────────────────────────────
async function sendTelegramMessage(chatId, text, parseMode = 'HTML') {
  if (!CHANNEL_CONFIG.botToken) {
    console.warn('[channel-bot] ⚠️  No TELEGRAM_BOT_TOKEN set. Message not sent. Text:\n', text);
    return { ok: false, reason: 'no_token' };
  }
  const url = `https://api.telegram.org/bot${CHANNEL_CONFIG.botToken}/sendMessage`;
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true });
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!data.ok) console.error('[channel-bot] Telegram API error:', data);
    return data;
  } catch (err) {
    console.error('[channel-bot] Network error sending message:', err.message);
    return { ok: false, error: err.message };
  }
}

// ── formatChannelAlert ───────────────────────────────────────────────────────
/**
 * Formats an alert object into a Telegram-ready string.
 * @param {object} alert  — alert object from monitor.mjs output
 * @param {string} type   — 'holyGrail' | 'deal' | 'priceDrop' | 'wantList'
 * @returns {string}
 */
export function formatChannelAlert(alert, type = 'deal') {
  const lines = [];
  const eur = (v) => (v != null ? `€${Number(v).toLocaleString('de-DE')}` : '—');

  if (type === 'wantList') {
    lines.push(`⚡⚡ <b>WANT LIST MATCH</b>`);
    lines.push('');
    lines.push(`<b>[${alert.game || '?'}] ${alert.title}</b>`);
    lines.push(`📍 ${alert.platform || 'eBay'} — <b>${eur(alert.price)}</b>`);
    if (alert.targetMax) lines.push(`✅ Your target: ≤${eur(alert.targetMax)}`);
    lines.push('');
  } else if (type === 'holyGrail') {
    lines.push(`🏆 <b>HOLY GRAIL ALERT</b>`);
    lines.push('');
    lines.push(`<b>[${alert.game || '?'}] ${alert.title}</b>`);
    lines.push(`📍 ${alert.platform || 'eBay'} — <b>${eur(alert.price)}</b>`);
    lines.push('');
  } else if (type === 'priceDrop') {
    lines.push(`📉 <b>PRICE DROP</b>`);
    lines.push('');
    lines.push(`<b>[${alert.game || '?'}] ${alert.title}</b>`);
    lines.push(`📍 ${alert.platform || 'eBay'} — <b>${eur(alert.price)}</b>`);
    if (alert.dropPct) lines.push(`💥 Down ${alert.dropPct}% from recent high`);
    lines.push('');
  } else {
    // generic deal
    lines.push(`🟢 <b>DEAL ALERT</b>`);
    lines.push('');
    lines.push(`<b>[${alert.game || '?'}] ${alert.title}</b>`);
    lines.push(`📍 ${alert.platform || 'eBay'} — <b>${eur(alert.price)}</b>`);
    lines.push('');
  }

  // EV block
  if (alert.soldMedian) lines.push(`📊 Sold comp median: ${eur(alert.soldMedian)}`);
  if (alert.evVerdict) lines.push(`🎯 Verdict: <b>${alert.evVerdict}</b>`);
  if (alert.ev != null) {
    const evStr = alert.ev >= 0 ? `+${eur(alert.ev)}` : eur(alert.ev);
    lines.push(`🎯 Expected value: <b>${evStr}</b>`);
  }
  if (alert.evFormatted) lines.push(alert.evFormatted);

  // PSA pop
  if (alert.psa10Pop != null) lines.push(`🔬 PSA 10 pop: ${alert.psa10Pop.toLocaleString('de-DE')}`);
  if (alert.gradeRate10 != null) lines.push(`📈 PSA 10 grade rate: ${(alert.gradeRate10 * 100).toFixed(0)}%`);
  if (alert.popRisk) lines.push(`⚠️ Grade risk: <b>${alert.popRisk}</b>`);

  // Link
  if (alert.url) lines.push('');
  if (alert.url) lines.push(`🔗 <a href="${alert.url}">View listing →</a>`);

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━');
  lines.push('<i>Card Sniper Alpha · hello@cardsniperalpha.com</i>');

  return lines.join('\n');
}

// ── postAlertToChannel ───────────────────────────────────────────────────────
/**
 * Formats and sends an alert to the Telegram channel.
 * @param {object} alert
 * @param {string} type
 * @param {string|null} overrideChannelId  — optional override
 */
export async function postAlertToChannel(alert, type = 'deal', overrideChannelId = null) {
  const channelId = overrideChannelId || CHANNEL_CONFIG.channelId;
  if (channelId === 'PLACEHOLDER_CHANNEL_ID') {
    console.warn('[channel-bot] ⚠️  TELEGRAM_CHANNEL_ID not configured. Set env var before going live.');
    return { ok: false, reason: 'no_channel_id' };
  }
  const text = formatChannelAlert(alert, type);
  console.log(`[channel-bot] Posting ${type} alert to channel ${channelId}…`);
  return sendTelegramMessage(channelId, text);
}

// ── postWelcomeMessage ───────────────────────────────────────────────────────
/**
 * Sends the pinned welcome message to the given channel.
 * Pin the returned message_id manually or via bot API pinChatMessage.
 * @param {string|null} channelId  — defaults to CHANNEL_CONFIG.channelId
 */
export async function postWelcomeMessage(channelId = null) {
  const target = channelId || CHANNEL_CONFIG.channelId;
  if (target === 'PLACEHOLDER_CHANNEL_ID') {
    console.warn('[channel-bot] ⚠️  TELEGRAM_CHANNEL_ID not configured.');
    return { ok: false, reason: 'no_channel_id' };
  }

  const text = `👋 <b>Welcome to Card Sniper Alpha</b>

This channel posts real-time TCG grading arbitrage alerts.

Every alert includes:
📊 Real sold comp prices (not asking prices)
🔬 Live PSA pop data + actual grade rates
🎯 Full EV across PSA 10/9/8/≤7 outcomes
⚠️ Grade risk score per card

We only alert when EV is positive. Zero noise policy.

━━━━━━━━━━━━━━━
🎯 To add to your Want List, DM @CardSniperBot:
/add [card name] max:[price]
Example: /add Blue-Eyes White Dragon LOB max:600

━━━━━━━━━━━━━━━
Tiers: Alpha (€19) · Pro (€49) · Dealer (€99)
Questions? hello@cardsniperalpha.com`;

  console.log(`[channel-bot] Posting welcome/pinned message to ${target}…`);
  return sendTelegramMessage(target, text);
}
