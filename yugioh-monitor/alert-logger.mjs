/**
 * Alert Logger — silent run capture
 * Every alert gets logged to alerts-log.json before being sent to Telegram.
 * Used for the 7-day proof run before public launch.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, 'alerts-log.json');

export function loadLog() {
  if (!existsSync(LOG_FILE)) return [];
  try { return JSON.parse(readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}

export function logAlert(alert) {
  const log = loadLog();
  const entry = {
    ...alert,
    loggedAt: new Date().toISOString(),
    id: `alert-${Date.now()}`,
  };
  log.unshift(entry); // newest first
  // Keep last 500
  writeFileSync(LOG_FILE, JSON.stringify(log.slice(0, 500), null, 2));
  return entry;
}

export function getStats() {
  const log = loadLog();
  const byVerdict = {};
  const byGame = {};
  for (const a of log) {
    byVerdict[a.evVerdict || a.verdict || 'unknown'] = (byVerdict[a.evVerdict || a.verdict || 'unknown'] || 0) + 1;
    byGame[a.game || 'unknown'] = (byGame[a.game || 'unknown'] || 0) + 1;
  }
  return {
    total: log.length,
    byVerdict,
    byGame,
    last: log[0]?.loggedAt || null,
  };
}
