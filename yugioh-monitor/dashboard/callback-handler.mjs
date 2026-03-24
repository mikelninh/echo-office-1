#!/usr/bin/env node
/**
 * Telegram Callback Handler — Advisor Button Actions
 * 
 * Handles inline button callbacks from advisor recommendations:
 *   buy_hold:alertId:encodedCardData  → add card to portfolio as HOLD
 *   buy_flip:alertId:encodedCardData  → add card to portfolio as FLIP
 *   watch:alertId:encodedCardData     → add to watchlist
 *   pass:alertId                      → log and dismiss
 * 
 * Usage (long-polling mode):
 *   node callback-handler.mjs --poll
 * 
 * Or set as webhook (requires public URL):
 *   node callback-handler.mjs --set-webhook https://your-domain.com/webhook/telegram
 */

import { addCard, listCards, getPortfolioSummary } from '../portfolio.mjs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_ID = '938367498';

// ── Telegram API ─────────────────────────────────────────────────────

async function tgCall(method, params = {}) {
  if (!BOT_TOKEN) {
    console.log(`[tg] Would call ${method}:`, JSON.stringify(params).slice(0, 200));
    return { ok: true, result: {} };
  }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

async function sendMessage(chatId, text) {
  return tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function answerCallback(callbackId, text) {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackId, text });
}

// ── Action Handlers ──────────────────────────────────────────────────

export async function handleCallback(callbackData, chatId, callbackId) {
  console.log(`[callback] data="${callbackData}" chat=${chatId}`);

  // Parse format: action:alertId[:base64CardData]
  const parts = callbackData.split(':');
  const action = parts[0];  // e.g. card_buy_hold, card_watch, card_pass
  const alertId = parts[1] || '';
  const encodedData = parts.slice(2).join(':') || '';

  // Decode card info
  let cardInfo = {};
  if (encodedData) {
    try {
      cardInfo = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8'));
    } catch {
      try {
        cardInfo = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8'));
      } catch {
        cardInfo = {};
      }
    }
  }

  // Parse old-style callbacks: card_buy_hold_<alertId>
  let parsedAction = action;
  if (action.startsWith('card_buy_hold')) parsedAction = 'card_buy_hold';
  else if (action.startsWith('card_buy_flip')) parsedAction = 'card_buy_flip';
  else if (action.startsWith('card_watch')) parsedAction = 'card_watch';
  else if (action.startsWith('card_pass')) parsedAction = 'card_pass';

  let responseText = '';

  if (parsedAction === 'card_buy_hold' || parsedAction === 'card_buy_flip') {
    const status = parsedAction === 'card_buy_hold' ? 'HOLD' : 'FLIP';
    const title = cardInfo.title || `Alert Card ${alertId.slice(0, 8)}`;

    try {
      const id = addCard({
        title,
        game: cardInfo.game || 'yugioh',
        buy_price: cardInfo.price ? parseFloat(cardInfo.price) : null,
        buy_currency: 'EUR',
        buy_platform: cardInfo.platform || 'eBay',
        buy_url: cardInfo.url || null,
        image_url: cardInfo.image || null,
        status,
        notes: `Added via Telegram advisor. Alert: ${alertId.slice(0, 20)}`,
      });

      responseText = `✅ *${status}* added!\n\n📍 *${title}*\n💰 Buy: €${cardInfo.price || '?'}\n🆔 \`${id.slice(0, 8)}\`\n\n🌐 Dashboard: http://localhost:3457`;
      console.log(`[callback] ✅ Added ${status}: ${title} (${id})`);
    } catch (err) {
      responseText = `❌ Error adding card: ${err.message}`;
      console.error(`[callback] Error:`, err);
    }

  } else if (parsedAction === 'card_watch') {
    const title = cardInfo.title || `Watched Card ${alertId.slice(0, 8)}`;

    try {
      const id = addCard({
        title,
        game: cardInfo.game || 'yugioh',
        buy_price: cardInfo.price ? parseFloat(cardInfo.price) : null,
        buy_platform: cardInfo.platform || 'eBay',
        buy_url: cardInfo.url || null,
        image_url: cardInfo.image || null,
        status: 'WATCH',
        notes: `On watchlist. Alert: ${alertId.slice(0, 20)}`,
      });

      responseText = `👀 *Watching!*\n\n📍 *${title}*\n💰 Listed: €${cardInfo.price || '?'}\n\nYou'll see it in your dashboard.`;
      console.log(`[callback] 👀 Watching: ${title} (${id})`);
    } catch (err) {
      responseText = `❌ Error adding to watchlist: ${err.message}`;
    }

  } else if (parsedAction === 'card_pass') {
    const title = cardInfo.title || `Alert ${alertId.slice(0, 8)}`;
    responseText = `⏭️ *Passed* — ${title.slice(0, 50)}\n\nGood call. The right card will come.`;
    console.log(`[callback] ⏭️ Passed: ${title}`);

  } else {
    responseText = `🤷 Unknown action: ${action}`;
    console.log(`[callback] Unknown: ${callbackData}`);
  }

  // Answer callback (removes spinner)
  await answerCallback(callbackId, '✅');

  // Send follow-up message
  if (responseText && chatId) {
    await sendMessage(chatId, responseText);
  }
}

// ── Long-Polling Mode ─────────────────────────────────────────────────

let lastUpdateId = 0;

async function pollOnce() {
  const result = await tgCall('getUpdates', {
    offset: lastUpdateId + 1,
    timeout: 30,
    allowed_updates: ['callback_query', 'message'],
  });

  if (!result.ok || !result.result) return;

  for (const update of result.result) {
    lastUpdateId = Math.max(lastUpdateId, update.update_id);

    if (update.callback_query) {
      const { id: callbackId, data, message, from } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;
      await handleCallback(data, chatId, callbackId);
    }

    if (update.message?.text === '/portfolio' || update.message?.text === '/p') {
      try {
        const s = getPortfolioSummary();
        const msg = `📊 *Portfolio*\n\n` +
          `Cards: ${s.totalCards}\n` +
          `Value: €${s.totalValue.toFixed(2)}\n` +
          `P&L: ${s.unrealizedPL >= 0 ? '+' : ''}€${s.unrealizedPL.toFixed(2)}\n` +
          `Donated: €${s.totalDonated.toFixed(2)}\n\n` +
          `🌐 http://localhost:3457`;
        await sendMessage(update.message.chat.id, msg);
      } catch (e) {}
    }
  }
}

async function startPolling() {
  console.log(`\n📡 Telegram callback handler started (long-polling)`);
  console.log(`   Chat ID: ${OWNER_ID}`);
  console.log(`   Bot token: ${BOT_TOKEN ? '✅ Set' : '❌ Not set (BOT_TOKEN env var missing)'}\n`);

  if (!BOT_TOKEN) {
    console.log('⚠️  No BOT_TOKEN — running in dry-run mode. Set TELEGRAM_BOT_TOKEN env var.\n');
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      console.error('[poll] Error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--poll')) {
  await startPolling();
} else if (args.includes('--set-webhook')) {
  const url = args[args.indexOf('--set-webhook') + 1];
  if (!url) { console.log('Usage: --set-webhook <url>'); process.exit(1); }
  const res = await tgCall('setWebhook', { url: `${url}/webhook/telegram`, allowed_updates: ['callback_query', 'message'] });
  console.log('Webhook set:', JSON.stringify(res));
} else if (args.includes('--test')) {
  // Simulate a buy_hold action
  await handleCallback('card_buy_hold:test123:', OWNER_ID, 'fake-callback-id');
} else {
  console.log(`
Callback Handler — Advisor Button Actions

Commands:
  --poll              Start long-polling for Telegram updates
  --set-webhook <url> Set Telegram webhook URL
  --test              Test with a simulated callback

Environment:
  TELEGRAM_BOT_TOKEN  Your bot token

Supported callback patterns:
  card_buy_hold[:alertId[:base64CardData]]  → Add as HOLD
  card_buy_flip[:alertId[:base64CardData]]  → Add as FLIP
  card_watch[:alertId[:base64CardData]]     → Add to watchlist
  card_pass[:alertId]                       → Log & dismiss
  `);
}
