/**
 * Card Sniper Alpha — Telegram Alert Bot
 * Posts grading arbitrage alerts to the channel
 * Usage: node telegram-bot.mjs --test   (sends test alert to you)
 *        node telegram-bot.mjs --post   (posts real alert from hunt-log)
 *        node telegram-bot.mjs --welcome (posts welcome/pinned message)
 *        node telegram-bot.mjs --gamestop (posts GameStop exit guide)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || ''; // e.g. @CardSniperAlpha or numeric ID
const OWNER_ID = '938367498'; // Mikel — for test alerts

const HUNT_LOG = path.join(__dirname, 'hunt-log.json');
const ALERTS_LOG = path.join(__dirname, 'alerts-log.json');

// ── Telegram API ─────────────────────────────────────────────────────────────
async function tgApi(method, body) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram API error: ${JSON.stringify(json)}`);
  return json.result;
}

async function sendMessage(chatId, text, options = {}) {
  return tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options,
  });
}

async function pinMessage(chatId, messageId) {
  return tgApi('pinChatMessage', { chat_id: chatId, message_id: messageId });
}

// ── Message Templates ────────────────────────────────────────────────────────

function welcomeMessage() {
  return `🎴 <b>Welcome to Card Sniper Alpha</b>

The only grading arbitrage alert service built for serious TCG collectors.

<b>What you get:</b>
• Raw card deals at ≤55% of graded FMV
• Full multi-grade EV: PSA 10 / 9 / 8 scenarios
• Steal Score™ — our composite 0–100 misfire detector
• Break-even grade (so you know your risk floor)
• Long-term projection by card tier
• GameStop exit floor for eligible cards

<b>We only fire on real mispricings.</b>
Most days = silence. When you see an alert, someone listed a grail without knowing what they had. That's your window.

<b>Steal Score guide:</b>
🚨 95+ → HOLY GRAIL — buy without thinking
💀 88+ → OBVIOUS STEAL — very strong play
🔥 80+ → NO-BRAINER — solid opportunity

<b>How to use this:</b>
1. Get the alert
2. Check the listing (link included)
3. Buy raw, submit to PSA, flip or hold
4. Exit via eBay, Cardmarket, or GameStop (for PSA 8–10)

<b>Cards we track:</b> 105 grading targets across Pokémon, Yu-Gi-Oh!, MTG, One Piece, Dragon Ball, Lorcana, Weiß Schwarz.

Questions? DM @CardSniperSupport

<i>Not financial advice. TCG markets are volatile. Do your own due diligence.</i>`;
}

function gamestopExitGuide() {
  return `💰 <b>The GameStop Exit Strategy</b>

One thing most graders don't know: <b>GameStop buys PSA 8/9/10 cards for cash.</b>

<b>The deal:</b>
• Up to $500 cash per card (most US locations)
• PSA Lighthouse label only (no CGC/BGS)
• Grade 8, 9, or 10 only
• No appointment needed — walk in, get offer

<b>What this means for you:</b>
If you grade a card and it comes back PSA 8, GameStop is a guaranteed floor exit. No eBay fees, no waiting, no negotiating.

<b>Example:</b>
Buy raw: €80
Grade: €28 (Value tier via GameStop's PSA drop-off)
Return: PSA 8 → GameStop pays $200 cash same day
Net: +€90 guaranteed

<b>Best use case:</b> B-tier cards (our Tier B hunt list) where the raw → PSA 8 math works even without hitting PSA 10. Low variance, quick turnaround.

<b>Not for holy grails</b> (€5K+ cards) — sell those on eBay or Cardmarket for full FMV.

📍 Check your nearest GameStop: gamestop.com/graded-trading-cards/estimate

<i>GameStop pricing and availability varies by location. US only for now.</i>`;
}

function formatAlert(alert) {
  const {
    cardName, game, tier,
    listedPrice, rawEstimate, psa10Estimate,
    stealScore, stealLabel,
    evBreakdown, breakEvenGrade,
    netProfit, roi,
    confidence, listingUrl,
    action, longTermProjection,
    gradingCost,
  } = alert;

  const tierEmoji = { S: '💎', A: '⭐', B: '🔹', C: '🔸' }[tier] || '🔹';
  const gameEmoji = {
    'Pokémon': '⚡', 'Yu-Gi-Oh': '🎴', 'MTG': '🧙',
    'One Piece': '⚓', 'Dragon Ball': '🐉', 'Lorcana': '🕯️', 'Weiß Schwarz': '🌸'
  }[game] || '🃏';

  const actionLabel = action === 'FLIP_FAST' ? '⚡ FLIP FAST (liquid market)'
    : action === 'HOLD' ? '📦 HOLD (2–5yr thesis)'
    : '🏆 HOLD LONG (5–10yr thesis)';

  const fmvPct = Math.round((listedPrice / psa10Estimate) * 100);

  // EV breakdown lines
  const evLines = evBreakdown ? [
    evBreakdown.psa10 ? `  PSA 10 → sell €${evBreakdown.psa10.sellPrice.toLocaleString()} | EV €${Math.round(evBreakdown.psa10.ev).toLocaleString()}` : null,
    evBreakdown.psa9  ? `  PSA 9  → sell €${evBreakdown.psa9.sellPrice.toLocaleString()} | EV €${Math.round(evBreakdown.psa9.ev).toLocaleString()}` : null,
    evBreakdown.psa8  ? `  PSA 8  → sell €${evBreakdown.psa8.sellPrice.toLocaleString()} | EV €${Math.round(evBreakdown.psa8.ev).toLocaleString()}` : null,
  ].filter(Boolean).join('\n') : '';

  const gamestopNote = (tier === 'B' || tier === 'C')
    ? '\n🏪 <i>GameStop exit: PSA 8–10 accepted, up to $500 cash same-day.</i>'
    : '';

  return `${stealLabel}

${gameEmoji} <b>${cardName}</b> ${tierEmoji} Tier ${tier}
<i>${game} · ${confidence} confidence comps</i>

<b>Someone listed this for €${listedPrice.toLocaleString()}.</b>
PSA 10 sells for €${psa10Estimate.toLocaleString()}.
You're buying at <b>${fmvPct}% of graded FMV.</b>

━━━━━━━━━━━━━━━━━━━
📊 <b>STEAL SCORE: ${stealScore}/100</b>
💸 Net profit: €${netProfit.toLocaleString()} | ROI: ${roi}%
🎯 ${actionLabel}
━━━━━━━━━━━━━━━━━━━

<b>Multi-Grade EV (after €${gradingCost} grading cost):</b>
${evLines}

<b>Break-even grade:</b> ${breakEvenGrade}
${longTermProjection ? `<b>Long-term:</b> ${longTermProjection}` : ''}
${gamestopNote}

🔗 <a href="${listingUrl}">View Listing on eBay →</a>

<i>Raw only. No PSA/BGS/CGC in listing. Act fast — these disappear.</i>`;
}

// Sample manual alert (for seeding channel before monitor produces real ones)
function sampleAlert() {
  return formatAlert({
    cardName: 'Blue-Eyes White Dragon LOB-001 1st Edition',
    game: 'Yu-Gi-Oh',
    tier: 'S',
    listedPrice: 1200,
    rawEstimate: 2500,
    psa10Estimate: 20000,
    stealScore: 87,
    stealLabel: '💀 <b>OBVIOUS STEAL — Steal Score 87/100</b>',
    evBreakdown: {
      psa10: { sellPrice: 20000, ev: 17900 },
      psa9:  { sellPrice: 8000,  ev: 5900 },
      psa8:  { sellPrice: 3500,  ev: 1400 },
    },
    breakEvenGrade: '✅ PSA 8 still profitable (+€1,400)',
    netProfit: 17900,
    roi: 1492,
    confidence: 'HIGH',
    listingUrl: 'https://www.ebay.com/sch/i.html?_nkw=blue+eyes+white+dragon+LOB+1st+edition+-PSA+-BGS+-CGC',
    action: 'HOLD_LONG',
    longTermProjection: '💎 Tier S — est. 4× in 10yr (~€80,000 PSA 10)',
    gradingCost: 100,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const target = args.includes('--test') ? OWNER_ID : CHANNEL_ID;

if (!BOT_TOKEN) {
  console.log('⚠️  Set TELEGRAM_BOT_TOKEN env var to use this bot.');
  console.log('');
  console.log('Preview of welcome message:');
  console.log('─'.repeat(60));
  console.log(welcomeMessage());
  console.log('─'.repeat(60));
  console.log('\nPreview of sample alert:');
  console.log('─'.repeat(60));
  console.log(sampleAlert());
  process.exit(0);
}

if (args.includes('--welcome')) {
  const msg = await sendMessage(target, welcomeMessage());
  if (target === CHANNEL_ID) await pinMessage(CHANNEL_ID, msg.message_id);
  console.log('✅ Welcome message sent and pinned');
}

if (args.includes('--gamestop')) {
  await sendMessage(target, gamestopExitGuide());
  console.log('✅ GameStop guide sent');
}

if (args.includes('--test')) {
  await sendMessage(OWNER_ID, sampleAlert());
  console.log('✅ Test alert sent to your DM');
}

if (args.includes('--post')) {
  // Post latest alert from hunt-log
  if (!fs.existsSync(HUNT_LOG)) {
    console.log('No hunt-log.json yet — monitor hasn\'t run');
    process.exit(0);
  }
  const log = JSON.parse(fs.readFileSync(HUNT_LOG, 'utf8'));
  const alerts = (log.alerts || []).filter(a => a.stealScore >= 80);
  if (!alerts.length) {
    console.log('No alerts with Steal Score ≥80 in hunt-log yet');
    process.exit(0);
  }
  const latest = alerts[alerts.length - 1];
  await sendMessage(CHANNEL_ID, formatAlert(latest));
  console.log(`✅ Posted alert: ${latest.cardName} (${latest.stealScore}/100)`);
}

if (args.includes('--preview')) {
  console.log('\n── WELCOME MESSAGE ──────────────────────────────────────');
  console.log(welcomeMessage());
  console.log('\n── GAMESTOP GUIDE ───────────────────────────────────────');
  console.log(gamestopExitGuide());
  console.log('\n── SAMPLE ALERT ─────────────────────────────────────────');
  console.log(sampleAlert());
}
