#!/bin/bash
# Sync monitor data to dashboard directory for deployment
# Run this before git push to ensure latest data is deployed

MONITOR_DIR="/Users/mikel/.openclaw/workspace/scripts/yugioh-monitor"
DASHBOARD_DIR="/Users/mikel/.openclaw/workspace/echo-office"

echo "Syncing market data..."

# Copy (not symlink) for production deployment
if [ -f "$MONITOR_DIR/market-stats.json" ]; then
  cp "$MONITOR_DIR/market-stats.json" "$DASHBOARD_DIR/market-stats.json"
  echo "✅ market-stats.json synced"
fi

if [ -f "$MONITOR_DIR/seen.json" ]; then
  cp "$MONITOR_DIR/seen.json" "$DASHBOARD_DIR/seen.json"
  echo "✅ seen.json synced"
fi

echo "Done! Data ready for deploy."
