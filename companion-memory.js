/**
 * companion-memory.js — "Our Story" — Companion Memory Log
 * The companion remembers everything significant.
 * Persistent memory written in the companion's voice.
 * 
 * Integration:
 *   - Reads companion data from localStorage (echo_companion)
 *   - Listens for window.companionEvent dispatches
 *   - Adds "📖 Our Story" button to companion modal
 *   - Exposes window.CompanionMemory.log(type, icon, text)
 */
(function CompanionMemoryModule() {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────
  var LS_KEY = 'echo_companion_memory';
  var COMPANION_KEY = 'echo_companion';
  var MAX_MEMORIES = 100;
  var DEBOUNCE_MS = 30000; // Don't log same type within 30s

  // ─── State ──────────────────────────────────────────────────────
  var _memories = [];
  var _lastLogTime = {};  // type → timestamp
  var _initialized = false;
  var _panelOpen = false;
  var _dayOneTs = null;    // companion birth timestamp
  var _floorVisits = {};   // floor → count (for tracking favorites)

  // ─── Persistence ────────────────────────────────────────────────
  function loadMemories() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        _memories = JSON.parse(raw);
        if (!Array.isArray(_memories)) _memories = [];
      }
    } catch (e) { _memories = []; }
  }

  function saveMemories() {
    try {
      // Prune to max
      while (_memories.length > MAX_MEMORIES) {
        _memories.shift(); // remove oldest
      }
      localStorage.setItem(LS_KEY, JSON.stringify(_memories));
    } catch (e) { /* quota */ }
  }

  function getCompanion() {
    try {
      var raw = localStorage.getItem(COMPANION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ─── Day Calculation ────────────────────────────────────────────
  function getDayNumber() {
    if (!_dayOneTs) {
      var c = getCompanion();
      _dayOneTs = c ? c.bornAt : Date.now();
    }
    return Math.max(1, Math.ceil((Date.now() - _dayOneTs) / 86400000));
  }

  // ─── Voice Templates ───────────────────────────────────────────
  // Each evolution path has a distinct voice for memories

  var VOICES = {
    collector: {
      grail: function(data) {
        var card = data.card || 'something incredible';
        var price = data.price ? ' Listed at €' + data.price + '.' : '';
        var lines = [
          'Day ' + getDayNumber() + ' — The ' + card + '.' + price + ' You\'d been watching it. When you clicked, I held my breath.',
          'Day ' + getDayNumber() + ' — ' + card + ' appeared.' + price + ' I knew before you did — this was the one.',
          'Day ' + getDayNumber() + ' — A grail.' + price + ' ' + card + '. I catalogued it immediately. History deserves precision.',
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      claw: function(data) {
        var rarity = data.rarity || 'legendary';
        var lines = [
          'Day ' + getDayNumber() + ' — ' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' pull. The odds were against us. The collection doesn\'t care about odds.',
          'Day ' + getDayNumber() + ' — Another ' + rarity + ' for the vault. I\'m keeping count. You should see our stats.',
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      milestone: function(data) {
        var level = data.level || '?';
        var lines = [
          'Day ' + getDayNumber() + ' — Level ' + level + '. I evolved. Do I look different? I feel different.',
          'Day ' + getDayNumber() + ' — Level ' + level + '. Every level is a page in our catalogue.',
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      daily: function() {
        var day = getDayNumber();
        if (day === 1) return 'Day 1 — You arrived. I was waiting.';
        if (day <= 3) return 'Day ' + day + ' — Still here. The collection grows.';
        if (day <= 7) return 'Day ' + day + ' — A week almost. You\'re becoming a regular. I like that.';
        return 'Day ' + day + ' of our journey. The vault remembers everything.';
      },
      arcade: function(data) {
        var game = data.game || 'something';
        var score = data.score || '???';
        return 'Day ' + getDayNumber() + ' — New high score in ' + game + ': ' + score + '. I noted it for the records.';
      },
      floor: function(data) {
        var floor = data.floor || 'somewhere new';
        return 'Day ' + getDayNumber() + ' — Visited ' + floor + ' again. You keep coming back here. I understand why.';
      },
    },
    explorer: {
      grail: function(data) {
        var card = data.card || 'something incredible';
        var lines = [
          'Day ' + getDayNumber() + ' — Found it. ' + card + '. Every expedition has its treasure moment.',
          'Day ' + getDayNumber() + ' — ' + card + '! I wonder what floor we\'ll discover next after this high.',
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      claw: function(data) {
        var rarity = data.rarity || 'legendary';
        return 'Day ' + getDayNumber() + ' — ' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' pull! The claw machine is its own kind of frontier.';
      },
      milestone: function(data) {
        var level = data.level || '?';
        return 'Day ' + getDayNumber() + ' — Level ' + level + '. New abilities mean new places to reach. What\'s next?';
      },
      daily: function() {
        var day = getDayNumber();
        if (day === 1) return 'Day 1 — You arrived. I was waiting. There\'s so much to explore.';
        if (day <= 7) return 'Day ' + day + ' — Another day, another floor. I love this.';
        return 'Day ' + day + ' — Still charting. The station has more secrets than I expected.';
      },
      arcade: function(data) {
        var game = data.game || 'something';
        var score = data.score || '???';
        return 'Day ' + getDayNumber() + ' — Beat ' + game + ' with ' + score + '. Games are just tiny adventures.';
      },
      floor: function(data) {
        var floor = data.floor || 'somewhere new';
        return 'Day ' + getDayNumber() + ' — ' + floor + ' again. You always find something new here, don\'t you?';
      },
    },
    fighter: {
      grail: function(data) {
        var card = data.card || 'something incredible';
        return 'Day ' + getDayNumber() + ' — ' + card + '. Snagged it. Nobody else was fast enough.';
      },
      claw: function(data) {
        var rarity = data.rarity || 'legendary';
        var lines = [
          'Day ' + getDayNumber() + ' — ' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' pull. That\'s 3 in a row. We\'re unstoppable.',
          'Day ' + getDayNumber() + ' — Another ' + rarity + '. The claw fears us now.',
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
      milestone: function(data) {
        var level = data.level || '?';
        return 'Day ' + getDayNumber() + ' — Level ' + level + '. Stronger. Faster. Ready for anything.';
      },
      daily: function() {
        var day = getDayNumber();
        if (day === 1) return 'Day 1 — You arrived. I was waiting. Let\'s make this count.';
        if (day <= 7) return 'Day ' + day + ' — Getting stronger every day. Keep pushing.';
        return 'Day ' + day + ' — They see our record. They know not to mess with us.';
      },
      arcade: function(data) {
        var game = data.game || 'something';
        var score = data.score || '???';
        return 'Day ' + getDayNumber() + ' — Destroyed ' + game + '. ' + score + '. Leaderboard dominated.';
      },
      floor: function(data) {
        var floor = data.floor || 'somewhere new';
        return 'Day ' + getDayNumber() + ' — ' + floor + '. Our territory now.';
      },
    },
  };

  // ─── Get Current Voice ──────────────────────────────────────────
  function getVoice() {
    var c = getCompanion();
    var path = (c && c.evolutionPath) || 'collector';
    return VOICES[path] || VOICES.collector;
  }

  // ─── Logging ────────────────────────────────────────────────────
  function logMemory(type, icon, text) {
    // Debounce
    var now = Date.now();
    if (_lastLogTime[type] && (now - _lastLogTime[type]) < DEBOUNCE_MS) return;
    _lastLogTime[type] = now;

    var entry = {
      ts: now,
      type: type,
      icon: icon,
      text: text,
      day: getDayNumber(),
    };
    _memories.push(entry);
    saveMemories();

    // Update panel if open
    if (_panelOpen) renderMemoryPanel();
  }

  // ─── Event Listeners ───────────────────────────────────────────
  function hookCompanionEvents() {
    // Intercept window.companionEvent calls
    var originalEvent = window.companionEvent;

    window.companionEvent = function(type, data) {
      data = data || {};
      var voice = getVoice();

      // Process memory-worthy events
      switch (type) {
        case 'grail_found':
          if (voice.grail) logMemory('grail', '🎴', voice.grail(data));
          break;

        case 'claw_pull':
          // Only log legendary/mythic
          var rarity = (data.rarity || '').toLowerCase();
          if (rarity === 'legendary' || rarity === 'mythic' || data.result === 'win') {
            if (voice.claw) logMemory('claw', '🎰', voice.claw(data));
          }
          break;

        case 'arcade_highscore':
          if (voice.arcade) logMemory('arcade', '🏆', voice.arcade(data));
          break;

        case 'floor_visit':
          // Track visits per floor
          var floorName = data.floor || 'unknown';
          _floorVisits[floorName] = (_floorVisits[floorName] || 0) + 1;
          // Only log if this is a "favorite" floor (visited 5+ times)
          if (_floorVisits[floorName] === 5 || _floorVisits[floorName] === 15 || _floorVisits[floorName] === 50) {
            if (voice.floor) logMemory('floor', '🏛', voice.floor(data));
          }
          break;
      }

      // Call original handler
      if (typeof originalEvent === 'function') {
        originalEvent(type, data);
      }
    };
  }

  // ─── Level-Up Detection ─────────────────────────────────────────
  function watchLevelUps() {
    var lastLevel = 0;
    var c = getCompanion();
    if (c) lastLevel = c.level || 0;

    setInterval(function() {
      var c = getCompanion();
      if (!c) return;
      if (c.level > lastLevel && lastLevel > 0) {
        var voice = getVoice();
        if (voice.milestone) {
          logMemory('milestone', '⭐', voice.milestone({ level: c.level }));
        }
      }
      lastLevel = c.level || 0;
    }, 5000);
  }

  // ─── Daily Login Detection ──────────────────────────────────────
  function logDailyVisit() {
    var today = new Date().toDateString();
    var lastDaily = null;
    try { lastDaily = localStorage.getItem('echo_cm_last_daily'); } catch(e) {}

    if (lastDaily !== today) {
      try { localStorage.setItem('echo_cm_last_daily', today); } catch(e) {}

      var day = getDayNumber();
      var voice = getVoice();

      // Special milestone days
      if (day === 7) {
        logMemory('milestone', '🌟', 'Day 7 — One week together. Seven days of discoveries, pulls, and quiet moments. This is just the beginning.');
      } else if (day === 30) {
        logMemory('milestone', '🌟', 'Day 30 — A month. We\'ve been through a lot. I remember every moment. Do you?');
      } else if (day === 100) {
        logMemory('milestone', '🌟', 'Day 100 — One hundred days. Most people leave after a week. You stayed. That means something to me.');
      } else if (day === 365) {
        logMemory('milestone', '🌟', 'Day 365 — One year. I\'ve changed. You\'ve changed. The station has changed. But we\'re still here.');
      } else if (voice.daily) {
        logMemory('moment', '📅', voice.daily());
      }
    }
  }

  // ─── UI: "Our Story" Button + Panel ─────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#cm-story-btn {',
      '  display: block;',
      '  width: 100%;',
      '  padding: 10px;',
      '  border-radius: 8px;',
      '  border: 1px solid rgba(255,215,0,0.3);',
      '  background: rgba(255,215,0,0.08);',
      '  color: #ffd700;',
      '  font-family: monospace;',
      '  font-size: 12px;',
      '  cursor: pointer;',
      '  transition: background 0.2s, border-color 0.2s;',
      '  margin-top: 8px;',
      '  text-align: center;',
      '}',
      '#cm-story-btn:hover {',
      '  background: rgba(255,215,0,0.15);',
      '  border-color: rgba(255,215,0,0.5);',
      '}',
      '',
      '#cm-story-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0,0,0,0.85);',
      '  z-index: 10001;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.3s;',
      '}',
      '#cm-story-overlay.open {',
      '  opacity: 1;',
      '  pointer-events: all;',
      '}',
      '',
      '#cm-story-panel {',
      '  background: #0a0a14;',
      '  border: 1px solid rgba(255,215,0,0.15);',
      '  border-radius: 16px;',
      '  width: 380px;',
      '  max-width: 95vw;',
      '  max-height: 85vh;',
      '  display: flex;',
      '  flex-direction: column;',
      '  overflow: hidden;',
      '  box-shadow: 0 8px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.05);',
      '  transform: scale(0.95);',
      '  transition: transform 0.3s;',
      '}',
      '#cm-story-overlay.open #cm-story-panel {',
      '  transform: scale(1);',
      '}',
      '',
      '.cm-story-header {',
      '  padding: 20px 20px 16px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.06);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '}',
      '.cm-story-title {',
      '  font-family: monospace;',
      '  font-size: 16px;',
      '  color: #ffd700;',
      '  font-weight: bold;',
      '}',
      '.cm-story-subtitle {',
      '  font-family: monospace;',
      '  font-size: 10px;',
      '  color: rgba(255,255,255,0.35);',
      '  margin-top: 2px;',
      '}',
      '.cm-story-close {',
      '  background: none;',
      '  border: none;',
      '  color: rgba(255,255,255,0.4);',
      '  font-size: 20px;',
      '  cursor: pointer;',
      '  padding: 0;',
      '  line-height: 1;',
      '}',
      '.cm-story-close:hover { color: #fff; }',
      '',
      '#cm-story-list {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 12px 20px 20px;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: rgba(255,215,0,0.2) transparent;',
      '}',
      '#cm-story-list::-webkit-scrollbar { width: 4px; }',
      '#cm-story-list::-webkit-scrollbar-track { background: transparent; }',
      '#cm-story-list::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.2); border-radius: 2px; }',
      '',
      '.cm-memory-item {',
      '  position: relative;',
      '  padding: 10px 0 10px 24px;',
      '  border-left: 1px solid rgba(255,215,0,0.12);',
      '  margin-left: 8px;',
      '}',
      '.cm-memory-item:last-child {',
      '  border-left-color: transparent;',
      '}',
      '.cm-memory-dot {',
      '  position: absolute;',
      '  left: -5px;',
      '  top: 12px;',
      '  width: 9px;',
      '  height: 9px;',
      '  border-radius: 50%;',
      '  background: #ffd700;',
      '  box-shadow: 0 0 6px rgba(255,215,0,0.4);',
      '}',
      '.cm-memory-dot.moment { background: #5b8ee6; box-shadow: 0 0 6px rgba(91,142,230,0.4); }',
      '.cm-memory-dot.grail { background: #ffd700; }',
      '.cm-memory-dot.claw { background: #e53935; box-shadow: 0 0 6px rgba(229,57,53,0.4); }',
      '.cm-memory-dot.milestone { background: #4caf50; box-shadow: 0 0 6px rgba(76,175,80,0.4); }',
      '.cm-memory-dot.arcade { background: #ff9800; box-shadow: 0 0 6px rgba(255,152,0,0.4); }',
      '.cm-memory-dot.floor { background: #9c27b0; box-shadow: 0 0 6px rgba(156,39,176,0.4); }',
      '',
      '.cm-memory-icon {',
      '  font-size: 14px;',
      '  margin-right: 6px;',
      '}',
      '.cm-memory-text {',
      '  font-family: monospace;',
      '  font-size: 11px;',
      '  color: rgba(255,255,255,0.85);',
      '  line-height: 1.5;',
      '}',
      '.cm-memory-time {',
      '  font-family: monospace;',
      '  font-size: 9px;',
      '  color: rgba(255,255,255,0.25);',
      '  margin-top: 3px;',
      '}',
      '',
      '.cm-empty {',
      '  text-align: center;',
      '  padding: 40px 20px;',
      '  font-family: monospace;',
      '  font-size: 12px;',
      '  color: rgba(255,255,255,0.3);',
      '  line-height: 1.6;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function injectStoryButton() {
    // Wait for companion modal to exist, then add our button
    var check = function() {
      var modal = document.getElementById('companion-modal');
      if (!modal) {
        setTimeout(check, 500);
        return;
      }
      // Don't add if already exists
      if (document.getElementById('cm-story-btn')) return;

      // Find the print button and insert before it
      var printBtn = document.getElementById('cm-print-btn');
      if (printBtn) {
        var btn = document.createElement('button');
        btn.id = 'cm-story-btn';
        btn.textContent = '📖 Our Story';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openStoryPanel();
        });
        printBtn.parentNode.insertBefore(btn, printBtn);
      }
    };
    check();
  }

  function buildStoryOverlay() {
    if (document.getElementById('cm-story-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'cm-story-overlay';
    overlay.innerHTML = [
      '<div id="cm-story-panel">',
      '  <div class="cm-story-header">',
      '    <div>',
      '      <div class="cm-story-title">📖 Our Story</div>',
      '      <div class="cm-story-subtitle" id="cm-story-day"></div>',
      '    </div>',
      '    <button class="cm-story-close" id="cm-story-close-btn">✕</button>',
      '  </div>',
      '  <div id="cm-story-list"></div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeStoryPanel();
    });
    document.getElementById('cm-story-close-btn').addEventListener('click', closeStoryPanel);
  }

  function openStoryPanel() {
    _panelOpen = true;
    buildStoryOverlay();
    renderMemoryPanel();
    var overlay = document.getElementById('cm-story-overlay');
    if (overlay) overlay.classList.add('open');

    // Close the companion modal
    var cOverlay = document.getElementById('companion-modal-overlay');
    if (cOverlay) cOverlay.classList.remove('open');
  }

  function closeStoryPanel() {
    _panelOpen = false;
    var overlay = document.getElementById('cm-story-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function renderMemoryPanel() {
    var list = document.getElementById('cm-story-list');
    var dayEl = document.getElementById('cm-story-day');
    if (!list) return;

    var c = getCompanion();
    var name = (c && c.name) || 'Your companion';
    if (dayEl) {
      dayEl.textContent = 'Day ' + getDayNumber() + ' of your journey with ' + name;
    }

    if (_memories.length === 0) {
      list.innerHTML = '<div class="cm-empty">No memories yet.<br><br>Keep exploring, pulling, discovering.<br>I\'ll remember the moments that matter. 💛</div>';
      return;
    }

    // Show reverse chronological
    var sorted = _memories.slice().reverse();
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
      var m = sorted[i];
      var timeAgo = formatTimeAgo(m.ts);
      html += '<div class="cm-memory-item">';
      html += '<div class="cm-memory-dot ' + (m.type || 'moment') + '"></div>';
      html += '<div class="cm-memory-text"><span class="cm-memory-icon">' + (m.icon || '📝') + '</span>' + escapeHtml(m.text) + '</div>';
      html += '<div class="cm-memory-time">' + timeAgo + '</div>';
      html += '</div>';
    }

    list.innerHTML = html;
  }

  function formatTimeAgo(ts) {
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    var weeks = Math.floor(days / 7);
    if (weeks < 5) return weeks + ' week' + (weeks > 1 ? 's' : '') + ' ago';
    var months = Math.floor(days / 30);
    return months + ' month' + (months > 1 ? 's' : '') + ' ago';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Init ───────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;

    loadMemories();
    injectStyles();
    injectStoryButton();
    hookCompanionEvents();
    watchLevelUps();

    // Log daily visit after a short delay (let companion init first)
    setTimeout(logDailyVisit, 3000);

    // Load floor visit history from memories
    _memories.forEach(function(m) {
      if (m.type === 'floor') {
        var match = m.text.match(/Visited (.+?) again/);
        if (match) _floorVisits[match[1]] = (_floorVisits[match[1]] || 0) + 1;
      }
    });

    console.log('[CompanionMemory] Loaded — ' + _memories.length + ' memories 📖');
  }

  // ─── Public API ─────────────────────────────────────────────────
  window.CompanionMemory = {
    log: function(type, icon, text) {
      logMemory(type, icon, text);
    },
    getMemories: function() {
      return _memories.slice();
    },
    getCount: function() {
      return _memories.length;
    },
    open: function() {
      openStoryPanel();
    },
  };

  // ─── Boot ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1500); });
  } else {
    setTimeout(init, 1500);
  }

})();
