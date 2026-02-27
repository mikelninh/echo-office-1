# Yu-Gi-Oh High-Value Card Sales Monitor

Monitors 4 platforms for Yu-Gi-Oh card sales of **€5,000+ / $5,000+** and alerts on new finds.

## Usage

```bash
node monitor.mjs
```

No output = nothing new. New sales print:
```
🐉 HOLY GRAIL ALERT
Card: Blue-Eyes White Dragon PSA 10
Price: $15,000.00
Platform: eBay.com
Link: https://www.ebay.com/itm/123456789
```

## Platforms

| Platform | Method | Status |
|----------|--------|--------|
| **eBay.com** | HTML scraping (sold listings search) | ✅ Works |
| **eBay.de** | HTML scraping (sold listings search) | ✅ Works |
| **TCGPlayer** | Internal search API (JSON) | ✅ Works (rarely has $5k+ YuGiOh cards) |
| **Cardmarket** | HTML scraping attempt | ⚠️ Blocked by Cloudflare |

### Cardmarket Workaround

Cardmarket uses aggressive Cloudflare protection. Options:
1. **Browser automation** — Use Puppeteer/Playwright to bypass (heavyweight)
2. **Cardmarket API** — Apply for API access at https://www.cardmarket.com/en/YuGiOh/Data/API
3. **Manual RSS/alerts** — Set up Cardmarket price alerts manually

## How It Works

1. Fetches sold/completed listings from each platform
2. Parses card names, prices, and listing IDs from HTML/JSON
3. Filters for sales ≥ $5,000 / €5,000
4. Compares against `seen.json` state file to skip duplicates
5. Outputs only NEW sales
6. Auto-prunes seen entries older than 90 days

## Files

- `monitor.mjs` — Main script (Node.js ESM, no dependencies)
- `seen.json` — State file (auto-created, tracks seen listing IDs)
- `README.md` — This file

## Requirements

- Node.js 18+
- `curl` (comes with macOS/Linux)
- No npm dependencies

## Scheduling

Run via cron or OpenClaw cron job, e.g. every 30 minutes:
```
*/30 * * * * cd /path/to/yugioh-monitor && node monitor.mjs
```
