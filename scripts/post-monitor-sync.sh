#!/bin/bash
# Called after monitor runs — copies fresh data and pushes to deploy
# Add to monitor cron or run manually

MONITOR_DIR="/Users/mikel/.openclaw/workspace/scripts/yugioh-monitor"
DASHBOARD_DIR="/Users/mikel/.openclaw/workspace/echo-office"

# Copy fresh data
cp "$MONITOR_DIR/market-stats.json" "$DASHBOARD_DIR/market-stats.json" 2>/dev/null
cp "$MONITOR_DIR/seen.json" "$DASHBOARD_DIR/seen.json" 2>/dev/null

# Commit and push (Railway auto-deploys on push)
cd "$DASHBOARD_DIR"
git add market-stats.json seen.json 2>/dev/null
git diff --cached --quiet || git commit -m "data: auto-sync market data $(date +%Y-%m-%d)" && git push 2>/dev/null

echo "✅ Data synced and deployed"
