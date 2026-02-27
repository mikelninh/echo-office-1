# Card Sniper Alpha — Launch Plan 🚀
_Started: 2026-02-24_

## Goal
Public Telegram channel, €19/mo subscribers, first paying customers within 2 weeks.

## The Product
Real-time grading arbitrage alerts for TCG collectors.
Every alert: what you pay, what PSA 10/9/8 sell for, full EV, grade rates from real pop data.
Only pings when the math works. No noise.

---

## Week 1 — Make the Data Trustworthy

### Day 1 (today) — Fix the foundations
- [x] Multi-grade EV model (10/9/8/≤7)
- [ ] Fix PSA pop — browser scrape, verify real numbers
- [ ] Fix search quality — validate results match grade searched
- [ ] Wire EV into full monitor loop (not just grail alerts)
- [ ] Alert logger — save every alert to alerts-log.json for proof

### Day 2-3 — Dial in accuracy
- [ ] Test 5 known grail cards manually — compare EV output to community consensus
- [ ] Tune grade rate estimates per game/set
- [ ] Handle eBay rate limiting gracefully (rotate delays, don't crash)

### Day 4-7 — Silent running
- [ ] Monitor runs hourly (switch from 3h)
- [ ] Every alert saved to log — NOT sent to subscribers yet
- [ ] Review alerts daily, flag any bad ones
- [ ] Target: 10+ alerts collected, 80%+ are genuine opportunities

---

## Week 2 — Launch Infrastructure

### Day 8-9 — Channel + Payment
- [ ] Create Telegram channel: @CardSniperAlpha (or similar)
- [ ] Gumroad product: €19/mo subscription
- [ ] Welcome message + pinned post explaining the signal
- [ ] Bot: auto-post alerts to channel when subscriber count > 0

### Day 10-11 — Landing Page
- [ ] One-pager: what it is, example alerts, price, subscribe button
- [ ] 3 best alerts from silent week as social proof
- [ ] Host on GitHub Pages or Vercel (free)

### Day 12-14 — First Subscribers
- [ ] DM nxtlvl-shop owner — first partner, free 30-day trial
- [ ] Post in r/yugioh, r/PokemonTCG, One Piece card subs
- [ ] Twitter/X thread: "I built an algorithm that finds PSA grading plays"
- [ ] Target: 10 paying subscribers by end of week 2

---

## Revenue Math
- 10 subs × €19 = €190/mo (proves concept)
- 50 subs × €19 = €950/mo (ramen profitable)
- 200 subs × €19 = €3,800/mo (real income)
- 500 subs × €19 = €9,500/mo (quit your job money)

Break-even: ~5 subscribers (covers API costs, hosting = €0)

---

## Tech Stack
- Monitor: Node.js, Puppeteer, eBay scrapers ✅
- EV Engine: ev-calculator.mjs ✅  
- PSA Pop: psa-pop.mjs (needs fix)
- Alerts: Telegram bot via OpenClaw message tool ✅
- Payments: Gumroad (simplest, no code needed)
- Landing: single HTML file

---

## Files
- `monitor.mjs` — main loop
- `sold-scraper.mjs` — eBay sold comps
- `psa-pop.mjs` — PSA population data
- `ev-calculator.mjs` — EV math
- `alerts-log.json` — silent running log (NEW)
- `alert-sender.mjs` — Telegram posting bot (NEW)
