/**
 * Card Sniper Alpha — Subscription Server
 * ─────────────────────────────────────────
 * Handles the full payment → invite → kick lifecycle.
 *
 * Flow:
 *   1. Visitor hits /subscribe → sees landing page with Stripe payment link
 *   2. They pay → Stripe fires webhook to /webhook/stripe
 *   3. Server generates Telegram invite link → emails/messages it to subscriber
 *   4. Daily job checks for expired subs → revokes invite + kicks from channel
 *
 * Run: node subscription-server.mjs
 * Port: 4567 (proxy via nginx/cloudflare tunnel for HTTPS)
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_...
 *   STRIPE_PRICE_ID_ALPHA   — price_... (€19/mo recurring)
 *   STRIPE_PRICE_ID_PRO     — price_... (€49/mo recurring)
 *   TELEGRAM_BOT_TOKEN      — already set
 *   TELEGRAM_CHANNEL_ID     — numeric ID of PRIVATE channel
 *   PORT                    — optional, default 4567
 */

import express from 'express';
import Stripe from 'stripe';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN || '8675912510:AAFwKtU2WoheIrjtGUHa8gpZRH2AQ2Pkzt8';
const CHANNEL_ID   = process.env.TELEGRAM_CHANNEL_ID || '-1003702806533'; // @CardSniperAlpha
const PORT         = process.env.PORT || 4567;
const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SEC  = process.env.STRIPE_WEBHOOK_SECRET || '';

// Tier definitions
const TIERS = {
  alpha: { name: 'Alpha',  price: 19, currency: 'eur', label: '€19/mo' },
  pro:   { name: 'Pro',    price: 49, currency: 'eur', label: '€49/mo' },
  dealer:{ name: 'Dealer', price: 99, currency: 'eur', label: '€99/mo' },
};

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'subscribers.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     TEXT,
    telegram_name   TEXT,
    email           TEXT,
    tier            TEXT    DEFAULT 'alpha',
    stripe_customer TEXT,
    stripe_sub_id   TEXT    UNIQUE,
    invite_link     TEXT,
    status          TEXT    DEFAULT 'active',   -- active | cancelled | expired
    created_at      TEXT    DEFAULT (datetime('now')),
    expires_at      TEXT,
    last_payment_at TEXT
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    code        TEXT PRIMARY KEY,
    tier        TEXT,
    used        INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name   TEXT,
    steal_score INTEGER,
    tier_target TEXT,
    sent_at     TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Telegram helpers ──────────────────────────────────────────────────────────
async function tg(method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function createInviteLink(tier = 'alpha') {
  // Single-use invite link, expires in 24h
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const res = await tg('createChatInviteLink', {
    chat_id: CHANNEL_ID,
    expire_date: expires,
    member_limit: 1,
    name: `${tier}-${Date.now()}`,
  });
  return res.result?.invite_link || null;
}

async function kickMember(telegramId) {
  await tg('banChatMember', { chat_id: CHANNEL_ID, user_id: telegramId });
  // Immediately unban so they can rejoin if they resubscribe
  await tg('unbanChatMember', { chat_id: CHANNEL_ID, user_id: telegramId });
}

async function sendDM(telegramId, text) {
  return tg('sendMessage', {
    chat_id: telegramId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// Raw body for Stripe webhook signature verification
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Landing page ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Card Sniper Alpha — Join</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0f; color:#e8e4d8; font-family:Georgia,serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:480px; width:100%; }
  .badge { font-family:monospace; font-size:11px; letter-spacing:3px; color:#c9a84c; border:1px solid rgba(201,168,76,0.3); padding:4px 14px; border-radius:2px; display:inline-block; margin-bottom:24px; }
  h1 { font-size:32px; font-weight:normal; margin-bottom:12px; line-height:1.2; }
  h1 em { color:#c9a84c; font-style:italic; }
  .sub { color:#8a8678; font-size:15px; margin-bottom:32px; line-height:1.6; }
  .tiers { display:flex; flex-direction:column; gap:12px; margin-bottom:32px; }
  .tier { background:#1a1a2e; border:1px solid rgba(201,168,76,0.15); border-radius:4px; padding:20px; cursor:pointer; transition:border-color 0.2s; }
  .tier:hover, .tier.selected { border-color:rgba(201,168,76,0.5); }
  .tier-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .tier-name { font-size:16px; }
  .tier-price { font-family:monospace; color:#c9a84c; font-size:16px; }
  .tier-features { font-size:13px; color:#8a8678; line-height:1.7; }
  .btn { display:block; width:100%; background:#c9a84c; color:#0a0a0f; border:none; padding:16px; font-family:monospace; font-size:13px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; border-radius:2px; cursor:pointer; text-decoration:none; text-align:center; transition:background 0.2s; }
  .btn:hover { background:#e8c97a; }
  .note { font-size:12px; color:#5a5650; text-align:center; margin-top:16px; line-height:1.5; }
  .free-note { background:rgba(201,168,76,0.06); border:1px solid rgba(201,168,76,0.15); border-radius:4px; padding:14px; margin-bottom:24px; font-size:13px; color:#8a8678; }
  .free-note a { color:#c9a84c; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">CARD SNIPER · ALPHA ACCESS</div>
  <h1>Grading arbitrage alerts.<br><em>Only the real ones.</em></h1>
  <p class="sub">We monitor 105 holy grail cards across 7 TCGs. When someone lists one at 55% of graded value — you get the call first.</p>

  <div class="free-note">
    💡 Start free on <a href="https://t.me/CardSniperAlpha" target="_blank">@CardSniperAlpha</a> — sample alerts, educational posts, delayed deals.
  </div>

  <div class="tiers">
    <div class="tier">
      <div class="tier-head">
        <span class="tier-name">🔥 Alpha</span>
        <span class="tier-price">€19 / mo</span>
      </div>
      <div class="tier-features">
        All real-time Steal Score ≥80 alerts<br>
        Japan geo-arb (Mercari JP vs EU price gap)<br>
        Multi-grade EV + break-even grade<br>
        Long-term hold projections
      </div>
      <br>
      <a href="/subscribe?tier=alpha" class="btn">Join Alpha →</a>
    </div>

    <div class="tier">
      <div class="tier-head">
        <span class="tier-name">💎 Pro</span>
        <span class="tier-price">€49 / mo</span>
      </div>
      <div class="tier-features">
        Everything in Alpha<br>
        Personal want list matching<br>
        Exit signals (when to sell)<br>
        Grade risk knowledge base
      </div>
      <br>
      <a href="/subscribe?tier=pro" class="btn" style="background:#9b6bff;color:#fff;">Join Pro →</a>
    </div>
  </div>

  <p class="note">Cancel anytime. Payments via Stripe — card, Apple Pay, Google Pay accepted.<br>Questions? <a href="https://t.me/CardSniperSupport" style="color:#c9a84c;">@CardSniperSupport</a></p>
</div>
</body>
</html>`);
});

// ── Stripe checkout session ───────────────────────────────────────────────────
app.get('/subscribe', async (req, res) => {
  const tier = req.query.tier || 'alpha';
  const tg_id = req.query.tg || '';       // optional: pass Telegram ID in URL

  if (!STRIPE_KEY) {
    return res.send(`
      <html><body style="background:#0a0a0f;color:#c9a84c;font-family:monospace;padding:40px;text-align:center">
        <h2>Stripe not configured yet</h2>
        <p style="color:#8a8678;margin-top:16px">Add STRIPE_SECRET_KEY to .env to enable payments</p>
      </body></html>
    `);
  }

  const stripe = new Stripe(STRIPE_KEY);
  const priceId = process.env[`STRIPE_PRICE_ID_${tier.toUpperCase()}`];

  if (!priceId) {
    return res.status(400).send('Invalid tier or price not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&tg=${tg_id}`,
    cancel_url: `${req.protocol}://${req.get('host')}/`,
    metadata: { tier, telegram_id: tg_id },
    subscription_data: { metadata: { tier, telegram_id: tg_id } },
    allow_promotion_codes: true,
  });

  res.redirect(303, session.url);
});

// ── Success page ──────────────────────────────────────────────────────────────
app.get('/success', async (req, res) => {
  const { session_id, tier, tg } = req.query;
  let inviteLink = null;

  if (session_id && STRIPE_KEY) {
    const stripe = new Stripe(STRIPE_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      inviteLink = await createInviteLink(tier);

      // Save subscriber
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      db.prepare(`
        INSERT OR IGNORE INTO subscribers (email, tier, stripe_customer, stripe_sub_id, invite_link, expires_at, telegram_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.customer_details?.email || '',
        tier,
        session.customer,
        session.subscription,
        inviteLink,
        expires.toISOString(),
        tg || null,
      );

      // DM them if we have Telegram ID
      if (tg) {
        await sendDM(tg, `🎴 <b>Welcome to Card Sniper ${tier.toUpperCase()}!</b>\n\nYour private channel invite:\n${inviteLink}\n\n<i>Link expires in 24h — join now. One-use only.</i>`);
      }
    }
  }

  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Welcome — Card Sniper</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:#e8e4d8;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}.card{max-width:440px}.icon{font-size:48px;margin-bottom:24px}h1{font-size:28px;font-weight:normal;margin-bottom:12px;color:#c9a84c}p{color:#8a8678;line-height:1.6;margin-bottom:20px}.link-box{background:#1a1a2e;border:1px solid rgba(201,168,76,0.3);border-radius:4px;padding:16px;font-family:monospace;font-size:13px;word-break:break-all;color:#c9a84c;margin-bottom:20px}.note{font-size:12px;color:#5a5650}</style>
</head><body>
<div class="card">
  <div class="icon">🎴</div>
  <h1>You're in.</h1>
  <p>Welcome to Card Sniper ${tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Alpha'}. Your private channel invite link:</p>
  ${inviteLink
    ? `<div class="link-box"><a href="${inviteLink}" style="color:#c9a84c">${inviteLink}</a></div><p>Tap the link to join. One-use only, expires in 24h.</p>`
    : `<p style="color:#c9a84c">Check your Telegram DM for your invite link, or contact @CardSniperSupport.</p>`
  }
  <p class="note">Alerts fire when real mispricings are detected. Most days are silent — when it fires, act fast.</p>
</div>
</body></html>`);
});

// ── Stripe webhook ────────────────────────────────────────────────────────────
app.post('/webhook/stripe', async (req, res) => {
  if (!STRIPE_KEY) return res.json({ received: true });

  const stripe = new Stripe(STRIPE_KEY);
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SEC);
  } catch (e) {
    console.error('Webhook signature failed:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  const obj = event.data.object;

  if (event.type === 'invoice.paid') {
    // Recurring renewal — extend subscription
    const subId = obj.subscription;
    const existing = db.prepare('SELECT * FROM subscribers WHERE stripe_sub_id = ?').get(subId);
    if (existing) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      db.prepare('UPDATE subscribers SET expires_at = ?, status = ?, last_payment_at = datetime("now") WHERE stripe_sub_id = ?')
        .run(expires.toISOString(), 'active', subId);
      console.log(`Renewed: ${existing.email} until ${expires.toISOString()}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Subscription cancelled — kick from channel
    const subId = obj.id;
    const sub = db.prepare('SELECT * FROM subscribers WHERE stripe_sub_id = ?').get(subId);
    if (sub) {
      db.prepare('UPDATE subscribers SET status = "cancelled" WHERE stripe_sub_id = ?').run(subId);
      if (sub.telegram_id) {
        await kickMember(sub.telegram_id);
        await sendDM(sub.telegram_id, '👋 Your Card Sniper Alpha subscription has ended. Rejoin anytime at t.me/CardSniperAlphaBot');
        console.log(`Kicked: ${sub.telegram_id}`);
      }
    }
  }

  res.json({ received: true });
});

// ── Admin: subscriber list ────────────────────────────────────────────────────
app.get('/admin/subscribers', (req, res) => {
  const key = req.query.key;
  if (key !== (process.env.ADMIN_KEY || 'cardsniper2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const subs = db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
  const stats = {
    total: subs.length,
    active: subs.filter(s => s.status === 'active').length,
    alpha: subs.filter(s => s.tier === 'alpha' && s.status === 'active').length,
    pro: subs.filter(s => s.tier === 'pro' && s.status === 'active').length,
    mrr: subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (TIERS[s.tier]?.price || 0), 0),
  };
  res.json({ stats, subscribers: subs });
});

// ── Daily expiry check ────────────────────────────────────────────────────────
async function runExpiryCheck() {
  console.log('Running expiry check...');
  const expired = db.prepare(`
    SELECT * FROM subscribers
    WHERE status = 'active' AND expires_at < datetime('now')
  `).all();

  for (const sub of expired) {
    console.log(`Expiring: ${sub.email} (${sub.tier})`);
    db.prepare("UPDATE subscribers SET status = 'expired' WHERE id = ?").run(sub.id);
    if (sub.telegram_id) {
      await kickMember(sub.telegram_id);
      await sendDM(sub.telegram_id,
        '⏰ Your Card Sniper Alpha subscription has expired.\n\nRejoin: https://cardsnipers.com/subscribe\n\n<i>All your history and want lists are saved — just resubscribe to pick up where you left off.</i>'
      );
    }
  }
  console.log(`Expiry check done. Processed ${expired.length} expired subs.`);
}

// Run expiry check every 6 hours
setInterval(runExpiryCheck, 6 * 60 * 60 * 1000);

// ── Bot webhook: handle /start for invite link delivery ───────────────────────
app.post('/webhook/telegram', async (req, res) => {
  const body = req.body;
  const msg = body?.message;
  if (!msg) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text || '';
  const userId = msg.from?.id;
  const firstName = msg.from?.first_name || 'there';

  if (text === '/start') {
    await sendDM(chatId, `👋 Hey ${firstName}!\n\nI'm <b>Card Sniper Bot</b> — I send grading arbitrage alerts when holy grail TCG cards are mispriced.\n\n<b>Plans:</b>\n🔥 Alpha — €19/mo (all real-time alerts)\n💎 Pro — €49/mo (alerts + want list + exit signals)\n\n<b>Start a subscription:</b>\nhttps://cardsnipers.com/subscribe?tg=${userId}\n\n<b>Free preview:</b>\nt.me/CardSniperAlpha\n\n<i>Questions? @CardSniperSupport</i>`);
  }

  if (text === '/status') {
    const sub = db.prepare('SELECT * FROM subscribers WHERE telegram_id = ?').get(String(userId));
    if (sub && sub.status === 'active') {
      await sendDM(chatId, `✅ Active subscriber — <b>${sub.tier.toUpperCase()}</b>\nExpires: ${sub.expires_at?.split('T')[0]}\n\nYou're in the private channel. Alerts fire automatically.`);
    } else {
      await sendDM(chatId, `You don't have an active subscription.\n\nJoin at: https://cardsnipers.com/subscribe?tg=${userId}`);
    }
  }

  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎴 Card Sniper Subscription Server`);
  console.log(`   Running on port ${PORT}`);
  console.log(`   Landing page: http://localhost:${PORT}`);
  console.log(`   Admin panel:  http://localhost:${PORT}/admin/subscribers?key=cardsniper2026`);
  console.log(`   Stripe mode:  ${STRIPE_KEY ? (STRIPE_KEY.startsWith('sk_live') ? '🟢 LIVE' : '🟡 TEST') : '⚠️  NOT SET'}`);
  console.log(`   Channel:      ${CHANNEL_ID}`);
});

export { db, createInviteLink, kickMember, runExpiryCheck };
