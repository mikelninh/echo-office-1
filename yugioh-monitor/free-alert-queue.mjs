/**
 * free-alert-queue.mjs — Free Tier Alert Queue
 *
 * The trust bridge between free lurkers and paid subscribers.
 * When a deal fires, it goes into this queue with a releaseAt timestamp.
 * The dispatcher (free-tier-dispatcher.mjs) checks this queue and sends
 * delayed alerts to the free public channel.
 *
 * Free tier gets: same alert, 48h later, with upgrade CTA appended.
 * Paid tier gets: real-time.
 *
 * Usage (from hunt-monitor.mjs or any alert source):
 *   import { enqueueAlert } from './free-alert-queue.mjs';
 *   enqueueAlert(alertText, { cardName, game, tier, stealScore });
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = join(__dirname, 'free-alert-queue.json');

const FREE_ALERT_DELAY_HOURS = 48;

// ── Load / Save ───────────────────────────────────────────────────────────────

function loadQueue() {
  if (!existsSync(QUEUE_FILE)) {
    return { queue: [], lastFlushed: null, totalQueued: 0, totalSent: 0 };
  }
  try {
    return JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return { queue: [], lastFlushed: null, totalQueued: 0, totalSent: 0 };
  }
}

function saveQueue(data) {
  writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

// ── Enqueue ───────────────────────────────────────────────────────────────────

/**
 * Add an alert to the free-tier queue with a 48h delay.
 *
 * @param {string} alertText  — Full alert text (same as paid)
 * @param {object} meta       — { cardName, game, tier, stealScore, listingUrl }
 */
export function enqueueAlert(alertText, meta = {}) {
  const data = loadQueue();

  const now = Date.now();
  const releaseAt = now + FREE_ALERT_DELAY_HOURS * 60 * 60 * 1000;

  const entry = {
    id: `free-${now}-${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: new Date(now).toISOString(),
    releaseAt: new Date(releaseAt).toISOString(),
    releaseAtMs: releaseAt,
    alertText,
    meta: {
      cardName:   meta.cardName   ?? 'Unknown Card',
      game:       meta.game       ?? 'Unknown',
      tier:       meta.tier       ?? 'C',
      stealScore: meta.stealScore ?? 0,
      listingUrl: meta.listingUrl ?? null,
    },
    sent: false,
    sentAt: null,
  };

  data.queue.push(entry);
  data.totalQueued = (data.totalQueued ?? 0) + 1;

  saveQueue(data);

  console.log(`[free-queue] ✅ Queued: ${meta.cardName ?? 'alert'} → release ${new Date(releaseAt).toLocaleString('de-DE')}`);
  return entry;
}

// ── Get Due Alerts ────────────────────────────────────────────────────────────

/**
 * Returns all unsent alerts whose releaseAt is <= now.
 */
export function getDueAlerts() {
  const data = loadQueue();
  const now = Date.now();
  return data.queue.filter(entry => !entry.sent && entry.releaseAtMs <= now);
}

/**
 * Mark an alert as sent.
 */
export function markSent(id) {
  const data = loadQueue();
  const entry = data.queue.find(e => e.id === id);
  if (entry) {
    entry.sent = true;
    entry.sentAt = new Date().toISOString();
  }
  data.lastFlushed = new Date().toISOString();
  data.totalSent = (data.totalSent ?? 0) + 1;
  saveQueue(data);
}

/**
 * Purge sent alerts older than 14 days (keep queue tidy).
 */
export function purgeOldAlerts(daysOld = 14) {
  const data = loadQueue();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const before = data.queue.length;
  data.queue = data.queue.filter(e => !e.sent || new Date(e.sentAt).getTime() > cutoff);
  const purged = before - data.queue.length;
  if (purged > 0) {
    console.log(`[free-queue] 🗑️  Purged ${purged} old sent alerts`);
    saveQueue(data);
  }
  return purged;
}

/**
 * Get queue stats for reporting.
 */
export function getStats() {
  const data = loadQueue();
  const now = Date.now();
  const pending = data.queue.filter(e => !e.sent && e.releaseAtMs > now).length;
  const due     = data.queue.filter(e => !e.sent && e.releaseAtMs <= now).length;
  const sent    = data.queue.filter(e => e.sent).length;
  return {
    pending,
    due,
    sent,
    totalQueued: data.totalQueued ?? 0,
    totalSent:   data.totalSent   ?? 0,
    lastFlushed: data.lastFlushed,
  };
}
