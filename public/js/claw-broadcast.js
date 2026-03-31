/**
 * claw-broadcast.js — BroadcastChannel bridge for the Claw game
 * Sends real-time game events to the stream overlay (claw-overlay.html).
 * Load via: <script src="claw-broadcast.js"></script> at end of claw.html body.
 */

(function() {
  'use strict';

  var CH;
  try { CH = new BroadcastChannel('echo-claw-stream'); } catch(e) { return; }

  function send(type, data) {
    try { CH.postMessage({ type: type, data: data || {}, ts: Date.now() }); } catch(e) {}
  }

  // ── Win event ──
  window.addEventListener('clawWin', function(e) {
    var d = e.detail || {};
    // Read current stats from global scope
    send('win', {
      rarity: d.rarity || 'common',
      name: d.name || '',
      plays: window.plays || 0,
      wins: window.wins || 0,
      streak: window.streak || 0,
    });
  });

  // ── Near miss ──
  window.addEventListener('clawNearMiss', function() {
    send('nearMiss', {
      plays: window.plays || 0,
      wins: window.wins || 0,
    });
  });

  // ── Mega Claw ──
  window.addEventListener('clawMega', function() {
    send('mega', {
      plays: window.plays || 0,
      wins: window.wins || 0,
    });
  });

  // ── Heartbeat — sync stats every 2s ──
  setInterval(function() {
    send('heartbeat', {
      plays: window.plays || 0,
      wins: window.wins || 0,
      streak: window.streak || 0,
      state: window.state || 'idle',
      isMega: !!window.isMega,
    });
  }, 2000);

  // ── Initial announce ──
  send('init', { version: '1.0' });

  console.log('[claw-broadcast] Stream bridge active');
})();
