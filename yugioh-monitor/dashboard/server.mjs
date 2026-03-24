#!/usr/bin/env node
/**
 * Card Trader Dashboard API Server
 * Port: 3457
 * 
 * Routes:
 *   GET  /api/portfolio      — portfolio summary
 *   GET  /api/cards          — list cards (filter by game, status)
 *   POST /api/cards          — add a card
 *   PUT  /api/cards/:id      — update card
 *   POST /api/cards/:id/sell — sell card (triggers cause split)
 *   GET  /api/transactions   — recent transactions
 *   GET  /api/cause          — cause impact report
 *   GET  /api/history        — portfolio snapshots for chart
 *   GET  /                   — serve dashboard UI
 */

import express from 'express';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  addCard,
  getCard,
  listCards,
  updateCard,
  sellCard,
  getPortfolioSummary,
  takeSnapshot,
  getTransactions,
  getTotalDonated,
  getHistory,
} from '../portfolio.mjs';
import { generateImpactReport, splitProfit } from '../cause-engine.mjs';
import { resolveCardImage, matchIconicImage, resolveAllMissing } from '../card-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.DASHBOARD_PORT || 3458;

app.use(express.json());

// Serve static dashboard
app.use(express.static(__dirname));

// ── CORS ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────

// GET /api/portfolio
app.get('/api/portfolio', (req, res) => {
  try {
    const summary = getPortfolioSummary();
    res.json({ ok: true, data: summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/cards?game=yugioh&status=HOLD
app.get('/api/cards', (req, res) => {
  try {
    const { game, status, limit = 100, offset = 0 } = req.query;
    const cards = listCards({ game, status, limit: parseInt(limit), offset: parseInt(offset) });
    
    // Enrich with P&L
    const enriched = cards.map(card => {
      const pl = card.buy_price && card.current_value
        ? ((card.current_value - card.buy_price) / card.buy_price * 100)
        : null;
      return { ...card, plPercent: pl ? Math.round(pl * 10) / 10 : null };
    });

    res.json({ ok: true, data: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/cards/:id
app.get('/api/cards/:id', (req, res) => {
  try {
    const card = getCard(req.params.id);
    if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });
    const transactions = getTransactions({ card_id: req.params.id });
    res.json({ ok: true, data: { ...card, transactions } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/cards
app.post('/api/cards', async (req, res) => {
  try {
    const {
      title, game, set_name, card_number, grade, grading_company, condition,
      buy_price, buy_currency, buy_platform, buy_url, buy_date,
      current_value, status, image_url, notes,
    } = req.body;

    if (!title || !game) {
      return res.status(400).json({ ok: false, error: 'title and game are required' });
    }

    // Auto-resolve image if not provided
    let finalImageUrl = image_url || null;
    if (!finalImageUrl) {
      // Try iconic match first (instant, no API call)
      finalImageUrl = matchIconicImage(title);
      // If no iconic match, try API (async but we await)
      if (!finalImageUrl) {
        try {
          finalImageUrl = await resolveCardImage(title, game);
        } catch (e) {
          console.log(`[images] Auto-resolve failed for "${title}": ${e.message}`);
        }
      }
    }

    const id = addCard({
      title, game, set_name, card_number, grade, grading_company, condition,
      buy_price: buy_price ? parseFloat(buy_price) : null,
      buy_currency, buy_platform, buy_url, buy_date,
      current_value: current_value ? parseFloat(current_value) : null,
      status, image_url: finalImageUrl, notes,
    });

    const card = getCard(id);
    res.status(201).json({ ok: true, data: card });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/cards/:id
app.put('/api/cards/:id', (req, res) => {
  try {
    const card = getCard(req.params.id);
    if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });

    updateCard(req.params.id, req.body);
    const updated = getCard(req.params.id);
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/cards/:id/sell
app.post('/api/cards/:id/sell', (req, res) => {
  try {
    const card = getCard(req.params.id);
    if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });

    const { sell_price, sell_platform, sell_url } = req.body;
    if (!sell_price) {
      return res.status(400).json({ ok: false, error: 'sell_price is required' });
    }

    const result = sellCard(req.params.id, {
      sell_price: parseFloat(sell_price),
      sell_platform,
      sell_url,
    });

    // Run cause split if profitable
    let causeSplit = null;
    if (result.profit > 0) {
      causeSplit = splitProfit(result.profit, card.buy_currency || 'EUR', {
        title: card.title,
        id: card.id,
        txId: result.txId,
      });
    }

    res.json({
      ok: true,
      data: {
        profit: result.profit,
        txId: result.txId,
        causeSplit,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/transactions?card_id=xxx&type=BUY&limit=50
app.get('/api/transactions', (req, res) => {
  try {
    const { card_id, type, limit = 50 } = req.query;
    const txs = getTransactions({ card_id, type, limit: parseInt(limit) });
    res.json({ ok: true, data: txs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/cause
app.get('/api/cause', (req, res) => {
  try {
    const report = generateImpactReport();
    res.json({ ok: true, data: report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/history?days=30
app.get('/api/history', (req, res) => {
  try {
    const days = parseInt(req.query.days || 30);
    const history = getHistory(days);
    res.json({ ok: true, data: history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/resolve-images — auto-resolve missing images for all cards
app.post('/api/resolve-images', async (req, res) => {
  try {
    const cards = listCards({ limit: 500 });
    const missing = cards.filter(c => !c.image_url);
    
    if (missing.length === 0) {
      return res.json({ ok: true, data: { resolved: 0, message: 'All cards have images' } });
    }

    let resolved = 0;
    for (const card of missing) {
      // Try iconic match first
      let imageUrl = matchIconicImage(card.title);
      if (!imageUrl) {
        try {
          imageUrl = await resolveCardImage(card.title, card.game);
        } catch {}
      }
      if (imageUrl) {
        updateCard(card.id, { image_url: imageUrl });
        resolved++;
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }

    res.json({ ok: true, data: { resolved, total: missing.length } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /health — health check for Railway/monitoring
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// POST /api/snapshot — take a portfolio snapshot
app.post('/api/snapshot', (req, res) => {
  try {
    const summary = takeSnapshot();
    res.json({ ok: true, data: summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Telegram Callback Webhook ─────────────────────────────────────────
// POST /webhook/telegram — handle callback_query from inline buttons
app.post('/webhook/telegram', express.json(), async (req, res) => {
  try {
    const update = req.body;
    
    // Handle callback_query (button taps)
    if (update.callback_query) {
      const { id: callbackId, data, message, from } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;
      
      console.log(`[webhook] Callback: ${data} from ${chatId}`);
      
      await handleCallbackAction(data, chatId, callbackId);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[webhook] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function handleCallbackAction(data, chatId, callbackId) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  
  // Parse callback data: action:alertId:encodedData
  const parts = data.split(':');
  const action = parts[0];
  const alertId = parts[1];
  const extra = parts.slice(2).join(':');

  let responseText = '';
  
  if (action === 'buy_hold' || action === 'buy_flip') {
    // Decode card info from extra (base64 encoded JSON)
    let cardInfo = {};
    try {
      cardInfo = JSON.parse(Buffer.from(extra, 'base64').toString('utf8'));
    } catch { cardInfo = { title: `Card ${alertId}`, game: 'yugioh' }; }

    const status = action === 'buy_hold' ? 'HOLD' : 'FLIP';
    const id = addCard({
      title: cardInfo.title || `Alert Card ${alertId}`,
      game: cardInfo.game || 'yugioh',
      buy_price: cardInfo.price || null,
      buy_platform: cardInfo.platform || 'eBay',
      buy_url: cardInfo.url || null,
      image_url: cardInfo.image || null,
      status,
      notes: `Added via Telegram advisor — alert ID: ${alertId}`,
    });

    responseText = `✅ Added to portfolio as *${status}*\nCard: ${cardInfo.title}\nID: \`${id}\``;
    console.log(`[callback] Added card ${id} as ${status}`);

  } else if (action === 'watch') {
    // Save to watchlist (notes field of a WATCH entry)
    let cardInfo = {};
    try {
      cardInfo = JSON.parse(Buffer.from(extra, 'base64').toString('utf8'));
    } catch { cardInfo = { title: `Card ${alertId}`, game: 'yugioh' }; }

    const id = addCard({
      title: cardInfo.title || `Watched Card ${alertId}`,
      game: cardInfo.game || 'yugioh',
      buy_price: cardInfo.price || null,
      buy_platform: cardInfo.platform || 'eBay',
      buy_url: cardInfo.url || null,
      image_url: cardInfo.image || null,
      status: 'WATCH',
      notes: `On watchlist — alert ID: ${alertId}`,
    });

    responseText = `👀 Added to watchlist!\nCard: ${cardInfo.title}\nID: \`${id}\``;
    console.log(`[callback] Watched card ${id}`);

  } else if (action === 'pass') {
    responseText = `⏭️ Passed on this one.`;
    console.log(`[callback] Passed alert ${alertId}`);
  } else {
    responseText = `Unknown action: ${action}`;
  }

  // Answer the callback query (removes loading spinner)
  if (BOT_TOKEN && callbackId) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId, text: '✅ Done!' }),
    });

    // Send follow-up message
    if (responseText && chatId) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'Markdown',
        }),
      });
    }
  }
}

// ── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'card-trader-dashboard', ts: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────
app.listen(process.env.PORT || PORT, () => {
  console.log(`\n🚀 Card Trader Dashboard`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/portfolio`);
  console.log(`\n📡 Telegram webhook: POST http://localhost:${PORT}/webhook/telegram`);
  console.log(`   Set with: curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=<YOUR_URL>/webhook/telegram"`);
  console.log(`\n✅ Ready!\n`);
});

export default app;
