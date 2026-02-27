# Sprint: Card Sniper Alpha — EV Engine 🎯
_Started: 2026-02-24_

## Goal
Transform the monitor from "price watcher" into a **grading arbitrage intelligence engine**.
Every alert includes an Expected Value verdict: buy/pass/strong buy.

## The EV Formula
```
EV = (PSA10_comp_price × grade_rate) - raw_price - grading_cost - pop_risk_discount
```

Where:
- `PSA10_comp_price`     = median of last 5 PSA 10 sold comps (eBay sold)
- `grade_rate`           = historical % of submissions that grade PSA 10 for this card
- `raw_price`            = current listing price (sold comps preferred)
- `grading_cost`         = €25 PSA Economy / €80 Regular / €150 Express
- `pop_risk_discount`    = adjustment for raw supply risk (see below)

## Raw Supply Risk (Mikel's insight)
A low PSA 10 pop doesn't mean scarcity if 500 raw copies are floating on eBay.
We estimate **dilution risk** by:
1. Count active raw listings (our existing scraper)
2. Compare to current PSA 10 pop
3. Raw/Pop ratio > 20x → apply 20% EV discount (pop will grow)
4. Raw/Pop ratio > 50x → apply 40% discount (PSA 10 premium will compress)
5. Raw/Pop ratio < 5x → +10% EV bonus (scarcity is real)

## Sprint Steps

### ✅ Step 0 — Foundation (done)
- [x] Monitor scraping eBay.com, eBay.de, TCGPlayer
- [x] Deal scoring system (0-100, only ≥70 alerts)
- [x] Price history rolling average

### 🔨 Step 1 — Sold Price Scraper (TODAY)
- eBay sold listings: `LH_Sold=1&LH_Complete=1` on search URL
- Separate from active listings — never mix sold vs asking in same average
- Store sold comps in `sold-history.json` (last 10 sold per card)
- Use sold median as FMV baseline (much more accurate than asking avg)
- **Output**: `soldPrice` field on every alert

### 🔨 Step 2 — PSA Pop Integration (THIS WEEK)
- PSA public API: `https://www.psacard.com/pop/` (scrapeable)
- For each grail card → fetch PSA 10 pop, total pop, grade rate estimate
- Cache in `psa-pop.json` (refresh weekly, pop doesn't change fast)
- Grade rate: PSA 10 pop / total submissions (public data)
- **Output**: `psaPop10`, `totalPop`, `gradeRate` fields

### 🔨 Step 3 — EV Calculator
- Combine: sold comps + PSA 10 comp sold prices + pop + raw supply
- Output a clear verdict per card:
  - 🟢 STRONG BUY — EV > €500
  - 🟡 BUY — EV €200-500
  - ⚪ MARGINAL — EV €50-200
  - 🔴 PASS — EV < €50 or negative
- Only alert Mikel on 🟢 and 🟡

### 🔨 Step 4 — Telegram Alpha Channel Format
```
🟢 STRONG BUY — Blue-Eyes White Dragon (1st Ed, Raw)
📍 eBay.de — €340 (sold avg: €410)

📊 EV Breakdown:
• PSA 10 comp: €2,800 (5 recent sales)
• PSA 10 pop: 12 | Raw float: ~47 listings
• Grade rate: 18% | Pop risk: LOW 🟢
• Grading cost: €80 (Regular)
• Expected Value: +€1,892 ✅

🎯 Verdict: Buy if raw condition NM or better.
🔗 [View listing]
```

### 🔨 Step 5 — Hourly Scan (later)
- Switch cron from 3h → 1h intervals
- Only when EV engine is confident (Steps 1-3 done)

## Files
- `monitor.mjs` — main scraper (extend, don't rewrite)
- `sold-scraper.mjs` — NEW: sold price module
- `psa-pop.mjs` — NEW: PSA pop fetcher
- `ev-calculator.mjs` — NEW: EV logic
- `sold-history.json` — sold comps storage
- `psa-pop.json` — PSA pop cache

## Metrics for Success
- Zero "bad" alerts (every alert is a genuine opportunity)
- EV accuracy: within 20% of actual resale outcome
- Alert volume: 2-5 per day max (quality > quantity)
