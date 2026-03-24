# 🃏 Card Trader MVP — Setup Guide

> **For Mikel.** Everything is built. This guide tells you what to fill in.
> Echo handles the rest.

---

## What's Already Working (Right Now)

- ✅ Dashboard at `http://localhost:3458`
- ✅ Portfolio tracking (add cards, track P&L)
- ✅ Daily briefs (advisor generates them)
- ✅ Cause engine (10% of every profit → MJFF / MSA Research)
- ✅ Sell signals (tells you when to sell)
- ✅ Monitor (watches eBay + TCGPlayer for holy grail listings)

The only things missing are your **personal credentials** below.

---

## What You Need to Do

### Step 1 — Create Your Telegram Bot (2 minutes)

1. Open Telegram, search **@BotFather**
2. Send: `/newbot`
3. Name it: `Card Trader` (or anything)
4. Username: something like `MyCardTraderBot`
5. BotFather will give you a token like: `7123456789:AAF...`
6. Come back and tell Echo: *"My Telegram bot token is 7123456789:AAF..."*

Echo will set it up automatically.

---

### Step 2 — Blockfrost API Key (2 minutes)

This lets the cause engine verify donations on the Cardano blockchain.

1. Go to: **https://blockfrost.io**
2. Sign up (free tier is enough to start)
3. Create a project → choose **Cardano Mainnet**
4. Copy the **Project ID** (looks like: `mainnetXXXXXXXXXXXXXXXX`)
5. Tell Echo: *"My Blockfrost ID is mainnetXXX..."*

---

### Step 3 — Cardano Wallets (5 minutes)

You need 4 wallet addresses for the profit split system.

**Option A (Easy) — Use Eternl browser wallet:**
1. Install Eternl from Chrome Web Store
2. Create a wallet (or use existing)
3. Create 4 receive addresses (one per role below)
4. Copy each `addr1...` address and tell Echo

**Option B (Echo generates them):**
Just say: *"Echo, generate my Cardano wallets"* — I'll do it with cardano-cli if it's installed.

**The 4 wallets you need:**
| Wallet | Purpose | Split |
|--------|---------|-------|
| Trading | Reinvested profits go here | 60% |
| Owner | Your earnings | 20% |
| Cause | MJFF/MSA donations (on-chain) | 10% |
| Reserve | Emergency fund | 10% |

---

### Step 4 — eBay Partner Network (Optional, 5 minutes)

Every card link in the monitor alerts becomes a commission source.

1. Go to: **https://partnernetwork.ebay.de**
2. Sign up with your eBay account
3. Create a campaign
4. Get your Campaign ID
5. Tell Echo your campaign IDs (DE and/or COM)

Once set, every eBay link the monitor finds earns affiliate commission.

---

### Step 5 — Add Your Real Cards

**Via Dashboard:**
1. Open: `http://localhost:3458`
2. Click "Add Card"
3. Fill in title, game, what you paid, where you bought it

**Via Echo (easiest):**
Just tell me in chat:
> *"I own a PSA 9 Charizard Base Set Shadowless, bought for €800 on eBay"*

I'll add it to the database for you.

**Via command line:**
```bash
node advisor-wire.mjs --add "Charizard Base Set PSA 9" pokemon 800 ebay
```

---

### Step 6 — Railway Deploy (When You're Ready)

When you want the dashboard accessible from anywhere (not just localhost):

1. Create a Railway account: **https://railway.app**
2. Tell Echo: *"Deploy the dashboard to Railway"*

I'll handle the rest. The dashboard folder is already configured with `railway.json`.

---

## Environment Variables

Create a file called `.env` in the `yugioh-monitor/` folder:

```env
# Required for Telegram alerts
TELEGRAM_BOT_TOKEN=7123456789:AAF_your_token_here

# Required for Cardano on-chain verification
BLOCKFROST_PROJECT_ID=mainnetYourProjectIdHere

# Cardano wallet addresses (addr1... format)
CARDANO_TRADING_WALLET=addr1...
CARDANO_CAUSE_WALLET=addr1...
CARDANO_RESERVE_WALLET=addr1...
CARDANO_OWNER_WALLET=addr1...

# Optional: eBay affiliate commissions
EBAY_CAMPAIGN_ID_COM=your_com_campaign_id
EBAY_CAMPAIGN_ID_DE=your_de_campaign_id

# Dashboard port (default: 3458)
# DASHBOARD_PORT=3458
```

---

## How to Start the System

```bash
cd /Users/mikel/.openclaw/workspace/scripts/yugioh-monitor

# Start the dashboard (keep this running)
node dashboard/server.mjs

# Or run the monitor (scans eBay + TCGPlayer)
node monitor.mjs

# Or check your portfolio
node portfolio.mjs summary

# Or get a daily brief
node advisor.mjs brief

# Or check sell signals
node advisor.mjs signals
```

---

## What Happens on Each Trade

When you **sell** a card at profit:

```
€300 profit from Charizard flip
  → €180 back to trading wallet (60%)
  → €60 to you (20%)
  → €30 to MJFF / MSA Research (10%)  ❤️
  → €30 to reserve fund (10%)
```

The €30 to MJFF accumulates and gets sent on-chain to Cardano when you're ready.

**Why MJFF?** Your mother has MSA (Multiple System Atrophy). MSA and Parkinson's share the same protein misfolding mechanism (alpha-synuclein). MJFF is the largest nonprofit funder of this research globally. Every card flip helps fund the cure.

---

## Quick Health Check

After setup, run this to verify everything works:

```bash
# Portfolio loads
node portfolio.mjs summary

# Cause engine shows state
node cause-engine.mjs status

# Dashboard is running
curl http://localhost:3458/health
```

All three should return data without errors.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `TELEGRAM_BOT_TOKEN not set` | Add it to `.env`, restart |
| `Cannot find module 'better-sqlite3'` | Run `npm install` in the folder |
| Port 3458 already in use | Kill the old process: `lsof -ti:3458 | xargs kill` |
| Monitor finds no listings | Normal — eBay €2500+ grail listings are rare |
| Cause engine shows no Cardano | Add `BLOCKFROST_PROJECT_ID` env var |

---

*Built with ❤️ by Echo — for Mikel, and for his mother.*
