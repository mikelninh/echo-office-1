# NIGHTBUILD.md — Overnight Build Instructions
## Updated: Feb 27, 2026

## Priority Stack (Revenue-First)

### 🔴 P0 — Ship Tonight
1. **Free Telegram Tier** — Create @CardSniperFree public channel with 24h-delayed alerts
   - Fork hunt-monitor alert sending to also queue delayed alerts
   - Create `free-alert-queue.json` — alerts stored with `releaseAt` timestamp (24h after original)
   - Cron job or startup check that sends queued alerts when `releaseAt` <= now
   - This is the TRUST BRIDGE — people see alerts working → convert to paid

2. **Dashboard Polish** — Wire social proof into main experience
   - Activity feed + reviews widget already built and `<script>` tagged in index.html
   - Verify they render correctly on the live dashboard
   - Add nav links for Showcase + Wins to the main index.html nav bar

### 🟡 P1 — This Week
3. **Outcome Tracker Cron** — Run outcome-tracker.mjs daily at 2 PM
   - Already built at `/Users/mikel/.openclaw/workspace/scripts/yugioh-monitor/outcome-tracker.mjs`
   - Needs a cron job: `0 14 * * * Europe/Berlin`
   - Syncs results to vault-dashboard/outcomes.json

4. **Wins Page: Live Data** — Update wins.html to read from outcomes.json
   - Replace hardcoded case studies with real outcome data when available
   - Keep simulated ones as fallback until we have enough real data

5. **Hunt Monitor Stress Test** — Run `node hunt-monitor.mjs --dry-run` and verify:
   - Browser reconnect works (per-card try/catch added Feb 27)
   - All 40 cards complete without crash
   - Log output is clean

### 🟢 P2 — Next Week
6. **Blog Publishing Pipeline** — Auto-post from editorial calendar
7. **Cardmarket Scraper** — EU seller coverage (NM/LP filter)
8. **Domain + Stripe** — Waiting on Mikel's action items

## Rules
1. Create NEW FILES only — never edit index.html directly (43K+ lines)
2. Features must be PLAYABLE/USABLE when done — not skeletons
3. Syntax check with `vm.createScript()` before commit
4. Git push when done
5. Sync data: copy seen.json + market-stats.json from yugioh-monitor/ to echo-office/
6. Update `/Users/mikel/.openclaw/workspace/memory/` with what you built

## Rate Limit Note
If you hit Anthropic rate limits, stop immediately. Limits reset every 5 hours.
Do not retry in a loop. Report what you completed and what's left.
