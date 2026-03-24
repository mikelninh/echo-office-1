# Card Trader — Autonomous TCG Trading Agent

## Vision
An AI agent that builds a trading card collection autonomously — scouting deals, buying, holding, trading, selling, and donating a cut of every profit to a cause. Physical cards with digital twins. A financial system that earns trust through transparency.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    TRADER AGENT                      │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  SCOUT    │ │  ADVISOR  │ │  EXECUTOR        │  │
│  │  (exists) │ │  (Phase 1)│ │  (Phase 2)       │  │
│  │           │ │           │ │                   │  │
│  │ • Monitor │ │ • Score   │ │ • Buy (eBay API) │  │
│  │ • Alerts  │ │ • Recommend│ │ • List (sell)    │  │
│  │ • EV calc │ │ • Portfolio│ │ • Accept offers  │  │
│  │ • Comps   │ │ • Approve  │ │ • Ship triggers  │  │
│  └───────────┘ └───────────┘ └──────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │              COLLECTION ENGINE                 │  │
│  │  • Digital twin of every physical card         │  │
│  │  • Portfolio view (HOLD / FLIP / TRADE)        │  │
│  │  • Real-time valuation                        │  │
│  │  • P&L tracking per card                      │  │
│  │  • Transaction speed rating                   │  │
│  │  • Collection score & progress                │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │              CAUSE ENGINE                      │  │
│  │  • Smart contract: auto-split on every profit  │  │
│  │  • MSA research wallet (default cause)         │  │
│  │  • Transparent on-chain ledger                 │  │
│  │  • Configurable split % (default: 10%)         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Phases

### Phase 1: Advisor Mode ⚡ (BUILD FIRST — days)

**Goal:** Bot finds deals, recommends BUY/PASS, you tap to approve.

#### Features:
1. **Deal Recommendations** via Telegram
   - Score ≥ 70 → sends alert with BUY / PASS / WATCH buttons
   - Shows: card image, price, EV analysis, sold comps, deal score
   - One-tap approval → logged to portfolio

2. **Portfolio Tracker**
   - Every card you own = an entry (manual add + auto from approvals)
   - Fields: card name, game, grade, buy price, current market value, status (HOLD/FLIP/TRADE), date acquired
   - Daily P&L calculation
   - "Collection strength" score

3. **Offer Recommendations**
   - "Card X is now 30% above your buy price → SELL?"
   - "Card Y hasn't moved in 60 days → consider relisting"
   - Price target alerts

4. **Transaction Speed Rating**
   - Track: days from purchase → delivery → grading → listed → sold
   - Rate each trade: ⚡ Fast (< 7 days) | 🐢 Slow (> 30 days) | 💀 Stale (> 90 days)
   - Historical avg transaction speed per game/platform

#### Tech:
- SQLite database for portfolio
- Telegram inline buttons for approvals
- Extends existing monitor.mjs infrastructure
- New files: `advisor.mjs`, `portfolio.mjs`, `portfolio.db`

#### Data Model:
```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,           -- uuid
  title TEXT NOT NULL,
  game TEXT NOT NULL,             -- yugioh, pokemon, etc.
  set_name TEXT,
  card_number TEXT,
  grade TEXT,                     -- raw, PSA 10, BGS 9.5, etc.
  grading_company TEXT,
  condition TEXT,                 -- NM, LP, MP, HP

  buy_price REAL,
  buy_currency TEXT DEFAULT 'EUR',
  buy_platform TEXT,              -- eBay.com, eBay.de, TCGPlayer, etc.
  buy_url TEXT,
  buy_date TEXT,                  -- ISO date

  current_value REAL,
  last_valued TEXT,               -- ISO timestamp

  status TEXT DEFAULT 'HOLD',     -- HOLD, FLIP, TRADE, SOLD, GRADING
  sell_price REAL,
  sell_platform TEXT,
  sell_date TEXT,
  sell_url TEXT,

  image_url TEXT,
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  card_id TEXT REFERENCES cards(id),
  type TEXT NOT NULL,              -- BUY, SELL, TRADE_IN, TRADE_OUT, GRADE_SEND, GRADE_RETURN
  amount REAL,
  currency TEXT DEFAULT 'EUR',
  platform TEXT,
  counterparty TEXT,               -- who we bought from / sold to
  tracking_number TEXT,
  status TEXT DEFAULT 'PENDING',   -- PENDING, SHIPPED, DELIVERED, COMPLETED
  speed_days INTEGER,              -- days from initiation to completion
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE portfolio_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_cards INTEGER,
  total_value REAL,
  total_invested REAL,
  total_profit REAL,
  total_donated REAL,
  unrealized_pl REAL,
  best_performer TEXT,             -- card_id
  worst_performer TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  cause TEXT DEFAULT 'MSA Research',
  wallet_address TEXT,
  tx_hash TEXT,                    -- on-chain proof
  status TEXT DEFAULT 'PENDING',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  collection_public BOOLEAN DEFAULT 0,
  trade_speed TEXT DEFAULT 'medium',  -- slow, medium, fast
  total_trades INTEGER DEFAULT 0,
  reputation_score REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

### Phase 2: Micro-Autonomy 🤖 (weeks)

**Goal:** Bot gets a budget and can auto-buy within rules.

#### Features:
1. **Trading Wallet**
   - Starting budget: €200
   - Replenished from profits only (self-sustaining)
   - Never exceeds max position size (configurable, e.g. 50% of wallet per card)

2. **Auto-Buy Rules**
   - Deal score ≥ 85 AND price ≤ €50 → auto-buy
   - Deal score ≥ 95 AND price ≤ €100 → auto-buy
   - Everything else → advisor mode (ask Mikel)
   - Daily spend cap: €100
   - Cooldown between purchases: 1 hour minimum

3. **Auto-Sell Rules**
   - FLIP cards: list when 30%+ above buy price
   - HOLD cards: never auto-sell (manual only)
   - TRADE cards: accept offers within 10% of market value
   - Re-list stale cards with 5% discount after 30 days

4. **Smart Contract Splits**
   - On every SELL profit:
     - 60% → reinvest wallet
     - 20% → owner (Mikel)
     - 10% → cause wallet (MSA research)
     - 10% → reserve fund
   - Deployed on Base L2 (cheap gas)
   - Immutable split logic — can't be changed

5. **Digital Twins**
   - Every physical card gets a digital record
   - Photo upload → condition assessment
   - QR code linking physical ↔ digital
   - Provenance chain: every owner, every transaction

#### Tech:
- eBay Browse + Buy API (buying)
- eBay Trading API (listing/selling)
- TCGPlayer API (price data)
- Solidity smart contract for splits
- Base L2 deployment
- `executor.mjs`, `wallet.mjs`, `smart-contract/`

---

### Phase 3: Social Trading 🌐 (months)

**Goal:** Other people can see your collection, make offers, trade.

#### Features:
1. **Public Profiles**
   - Your collection (what you choose to show)
   - Trade history & reputation score
   - Transaction speed badge: ⚡🐢💀
   - Collection score & completion %

2. **Trading**
   - Send/receive trade offers
   - Multi-card trades
   - Escrow system (both ship, both confirm, both receive)
   - Dispute resolution

3. **Offers**
   - Make offers on others' cards
   - Accept/counter/decline
   - Auto-accept rules ("I'll take any PSA 10 Charizard under €X")

4. **The Cause Dashboard**
   - Total donated across all traders
   - Live on-chain verification
   - Leaderboard: top donors
   - Impact reports from partner orgs

---

### Phase 4: The Protocol 🏗️ (later)

**Goal:** Open-source the framework. Anyone can run a trading agent for any collectible + any cause.

- Fork template: pick your niche (sneakers, vinyl, watches) + your cause
- Standardized smart contracts
- Interoperable profiles
- Cross-platform arbitrage engine
- The protocol IS the product

---

## Build Order (Phase 1)

### Hour 0-4: Foundation
- [ ] `portfolio.mjs` — SQLite database, CRUD operations for cards & transactions
- [ ] `advisor.mjs` — Deal recommendation engine with Telegram inline buttons
- [ ] Wire into existing monitor.mjs — new deals trigger advisor

### Hour 4-8: Portfolio UI
- [ ] Portfolio dashboard page (vault-dashboard integration or standalone)
- [ ] Card detail view: image, price history, P&L, status
- [ ] Add card manually (form or Telegram command)
- [ ] Daily portfolio snapshot cron

### Hour 8-12: Smart Recommendations
- [ ] Sell signals: "Card X is 30% up, sell?"
- [ ] Stale alerts: "Card Y hasn't moved in 60 days"
- [ ] Market movers: "PSA 10 Charizard spiked 15% this week"
- [ ] Transaction speed tracking

### Hour 12-16: Polish & Deploy
- [ ] Test full flow: alert → approve → track → sell signal
- [ ] Daily P&L summary to Telegram (morning brief)
- [ ] Portfolio export (CSV)
- [ ] Documentation

**Total: ~16 hours to Advisor Mode MVP**

---

## Cause Engine — Cardano Smart Contract

**Blockchain:** Cardano (Mikel's choice)
**Language:** Aiken (modern Cardano smart contract language)
**Cause:** Michael J. Fox Foundation for Parkinson's Research
**Why MJFF:** Mikel's mother has MSA — shares alpha-synuclein pathology with Parkinson's. MJFF is the largest nonprofit PD research funder globally.

**Split (immutable on-chain):**
- 60% → reinvest wallet (back to trading)
- 20% → owner (Mikel)
- 10% → MJFF cause wallet
- 10% → reserve fund

**Requirements:**
- Blockfrost API (free tier: 50K requests/day)
- cardano-cli or Lucid (JS tx builder)
- Aiken for smart contract compilation

```aiken
// cause_splitter.ak — Cardano smart contract for automated profit splits
use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction.{ScriptContext, Transaction}

const reinvest_bps = 6000  // 60%
const owner_bps = 2000     // 20%  
const cause_bps = 1000     // 10%
const reserve_bps = 1000   // 10%

type Datum {
  owner: Hash<Blake2b_224, VerificationKey>,
  cause_wallet: Hash<Blake2b_224, VerificationKey>,
  reserve_wallet: Hash<Blake2b_224, VerificationKey>,
  trade_id: ByteArray,
}

type Redeemer {
  SplitProfit
  WithdrawReserve
}

validator cause_splitter {
  spend(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) {
    when redeemer is {
      SplitProfit -> {
        let total_input = get_total_ada_input(ctx.transaction)
        let expected_cause = total_input * cause_bps / 10000
        expect verify_output_to(ctx.transaction.outputs, datum.cause_wallet, expected_cause)
        expect verify_output_to(ctx.transaction.outputs, datum.owner, total_input * owner_bps / 10000)
        True
      }
      WithdrawReserve -> {
        list.has(ctx.transaction.extra_signatories, datum.owner)
      }
    }
  }
}
```

**Phase 1 (now):** Off-chain tracking in SQLite + cause-engine.mjs
**Phase 2:** Deploy Aiken contract on Cardano preprod testnet
**Phase 3:** Mainnet deployment with real ADA splits

---

## Key Principles

1. **Start with YOUR money, YOUR bot, YOUR cause** — prove it works for one before opening to many
2. **Transparent by default** — every trade, every donation, on-chain and verifiable
3. **Immutable splits** — the smart contract can't be changed. Trust the code, not the person.
4. **Physical-first** — real cards, real shipping, real grading. Digital twin is the record, not the product.
5. **Slow trust** — bot earns autonomy through track record. €50 auto-buy today, €500 in 6 months.
6. **Inclusive** — low barrier to start (free advisor mode), scales with commitment
7. **Every profit gives back** — not "we'll donate later." On every. Single. Profit.

---

## Name Ideas
- **CardTrader** (simple)
- **Grail Hunter** (the mission)
- **Echo's Collection** (personal)
- **The Vault Trader** (ties to vault-dashboard)
- **TradeCause** (the bigger vision)
