# Card Sniper Alpha — V2 Feature Spec
_Written: 2026-02-24_

## Tier Architecture

| Tier      | Price   | Scan Speed | Features                                              |
|-----------|---------|------------|-------------------------------------------------------|
| Free      | €0      | Daily      | 1 grail alert/day, no EV                             |
| Alpha     | €19/mo  | Hourly     | All EV alerts, 3 games of choice                     |
| Pro       | €49/mo  | 30 min     | Want list (5 targets), exit signals, all games        |
| Dealer    | €99/mo  | 15 min     | Want list (unlimited), LIVE push, buyer matching, analytics |

"LIVE" for dealers = 15-min polling (eBay has no public webhooks).
True sub-minute would require eBay Partner API — apply once we have traction.

---

## Feature 1: Hourly Scanning
**Effort:** 10 min | **Impact:** High

- Switch monitor cron: 3h → 1h (Alpha)
- Add dealer cron: every 15 min (Dealer tier simulation)
- No code changes to monitor itself — just cron config

---

## Feature 2: Want List Engine
**Effort:** 3-4h | **Impact:** Highest

### Data model (`want-lists.json`)
```json
[
  {
    "id": "wl-001",
    "subscriberId": "938367498",
    "telegramId": "938367498",
    "tier": "pro",
    "targets": [
      {
        "cardName": "Blue-Eyes White Dragon LOB 1st Edition",
        "game": "yugioh",
        "maxRawPrice": 500,
        "minGrade": null,
        "notes": "NM or better only",
        "active": true,
        "addedAt": "2026-02-24T00:00:00Z"
      }
    ]
  }
]
```

### Matching engine (`want-list-engine.mjs`)
- After every monitor scan, run all new listings through want lists
- Fuzzy title match (Levenshtein or contains key terms)
- Price gate: only alert if listing ≤ maxRawPrice
- Game gate: must match or be 'any'
- On match: instant Telegram push with full EV breakdown
- Dealer tier: push within seconds of listing discovery

### Alert format
```
🎯 WANT LIST MATCH — [subscriber name]

[Yu-Gi-Oh] Blue-Eyes White Dragon LOB 1st Edition
📍 eBay.de — €420 ← YOUR TARGET: ≤€500 ✅

🟢 STRONG BUY  (EV: +€1,240 | ROI: 248%)
...full EV breakdown...

⚡ Act fast — grail listings sell in <1h
🔗 [View listing]
```

---

## Feature 3: Exit Signals
**Effort:** 2-3h | **Impact:** High (retention)

### Data model (extends `sold-history.json`)
Track 30-day rolling sold comp median per card per grade.

### Signal types
1. **SELL NOW** — 14-day trend >+20% AND comp volume high (≥3 sales/week)
   *"Luffy PSA 10 comps up 23% in 14 days — market is hot, consider listing"*

2. **POP WARNING** — PSA 10 pop grew >15% since last check
   *"Luffy PSA 10 pop up 180 in 7 days — premium may compress, watch closely"*

3. **ILLIQUID ALERT** — <2 comp sales in 30 days
   *"Only 1 Blue-Eyes LOB PSA 10 sold in 30 days — illiquid market, hard to exit"*

4. **FLOOR HOLD** — price dropping but pop stable
   *"Comps down 12% but pop unchanged — likely temp dip, hold"*

### Delivery
- Daily digest for Pro (batched)  
- Instant push for Dealer (per signal)
- Only send when subscriber holds that card (portfolio tracking)

---

## Feature 4: Cardmarket Integration
**Effort:** 4-6h | **Impact:** High (EU market)

Cardmarket = biggest EU TCG marketplace. Often lags eBay by days.
Cross-platform arb: buy on Cardmarket, relist on eBay.

### Approach
- Cardmarket blocks Cloudflare → use browser scraper (same as eBay)
- Target: single card search, NM/LP condition filter, seller location EU
- Map Cardmarket prices to our EV model
- Cross-platform signal: if Cardmarket price < eBay sold median × 0.6 → alert

### Alert addition
```
💶 Cross-platform arb opportunity:
   Cardmarket: €280 (NM, Germany)
   eBay sold median: €520
   Flip margin: +€240 (no grading needed)
```

---

## Feature 5: Grade Risk Score
**Effort:** 2h | **Impact:** Medium

Build a knowledge base of known print issues per card/set.
Store in `grade-risks.json`.

```json
{
  "one-piece-op01": {
    "known_issues": ["Centering often off on Secret Rares", "Surface scratches common"],
    "risk_level": "MEDIUM",
    "psa10_tips": "Check centering first — reject anything >55/45"
  }
}
```

Alert addition:
```
⚠️ Grade Risk: MEDIUM
Known OP-01 issue: centering often skewed on Secret Rares.
Verify before buying — reject >55/45 ratio.
```

---

## Build Order Tonight

1. [x] Hourly scan (cron update) — 10 min
2. [ ] Want list engine — build now
3. [ ] Exit signal detector — build tonight
4. [ ] Grade risk KB — quick data file + hook into alerts
5. [ ] Cardmarket scraper — spawn sub-agent (complex)
