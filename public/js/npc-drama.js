/**
 * npc-drama.js — Station News — NPC Drama Surface
 * Surface the NPC society as visible drama.
 * Players should feel they arrived at a world with history.
 *
 * Integration:
 *   - Reads from window.StationLife and window._stationPop
 *   - Uses NPC OCEAN traits for story generation (no AI API)
 *   - Exposes window.NPCDrama.addEvent(npcName, type, text)
 */
(function NPCDramaModule() {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────
  var LS_KEY = 'echo_npc_drama';
  var MAX_EVENTS = 20;
  var STORY_INTERVAL = 120000; // Generate a story every ~2 real minutes
  var TICKER_SPEED = 0.5;     // pixels per frame for ticker

  // ─── State ──────────────────────────────────────────────────────
  var _events = [];
  var _initialized = false;
  var _panelOpen = false;
  var _hasUnread = false;
  var _tickerX = 0;
  var _tickerAnimId = null;

  // ─── Floor name lookup ──────────────────────────────────────────
  var FLOOR_NAMES = {
    1: "Echo's Bar", 2: 'Observatory', 3: 'Arcade Floor',
    4: 'Garden Biodome', 5: 'Secret Lab', 6: 'Record Lounge',
    7: 'Community Deck', 8: 'Docking Bay', 9: 'The Archive',
    10: 'The Underground', 11: 'Workshop', 12: 'The Cinema',
  };

  // ─── Story Templates ───────────────────────────────────────────
  // Each template type has requirements and text generators

  var STORY_TYPES = {
    conflict: {
      // Low agreeableness + high neuroticism
      check: function(a, b) {
        var ao = a.ocean || {}, bo = b.ocean || {};
        return ((ao.agreeableness || 0.5) < 0.4 || (bo.agreeableness || 0.5) < 0.4) &&
               ((ao.neuroticism || 0.5) > 0.5 || (bo.neuroticism || 0.5) > 0.5);
      },
      icon: '⚔️',
      generate: function(a, b) {
        var floor = a.floor || b.floor || 1;
        var floorName = FLOOR_NAMES[floor] || 'the station';
        var templates = [
          a.name + ' and ' + b.name + ' have been avoiding each other in ' + floorName + '.',
          b.name + ' slammed a door when ' + a.name + ' walked into ' + floorName + '. Nobody knows why yet.',
          'Tension between ' + a.name + ' and ' + b.name + '. Something happened on ' + floorName + ' last shift.',
          a.name + ' won\'t talk about it, but ' + b.name + ' was overheard complaining in ' + floorName + '.',
          'Cold silence between ' + a.name + ' and ' + b.name + ' during the shift change at ' + floorName + '.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
    romance: {
      // High extraversion + high agreeableness + same floor
      check: function(a, b) {
        var ao = a.ocean || {}, bo = b.ocean || {};
        return ((ao.extraversion || 0.5) > 0.5 && (bo.agreeableness || 0.5) > 0.5) &&
               a.floor === b.floor;
      },
      icon: '💕',
      generate: function(a, b) {
        var floorName = FLOOR_NAMES[a.floor] || 'the station';
        var templates = [
          a.name + ' and ' + b.name + ' keep ending up at the same table in ' + floorName + '.',
          b.name + ' brought ' + a.name + ' something from the Garden. Nobody\'s saying anything, but everyone noticed.',
          a.name + ' keeps finding excuses to work ' + b.name + '\'s shift at ' + floorName + '.',
          'Someone saw ' + a.name + ' and ' + b.name + ' watching the stars from the Observatory together. After midnight.',
          b.name + ' drew something for ' + a.name + '. It\'s taped to the wall in ' + floorName + '.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
    achievement: {
      // High conscientiousness
      check: function(a) {
        var ao = a.ocean || {};
        return (ao.conscientiousness || 0.5) > 0.65;
      },
      icon: '🏆',
      generate: function(a) {
        var floorName = FLOOR_NAMES[a.floor] || 'the station';
        var job = a.job || 'worker';
        var templates = [
          a.name + ' just ran the longest continuous shift on ' + floorName + '. Everyone\'s impressed.',
          'New record: ' + a.name + ' hasn\'t missed a single day in two weeks. The ' + job + ' of the year.',
          a.name + ' organized the entire ' + floorName + ' storage room. Nobody asked them to.',
          'The ' + floorName + ' has never looked better. ' + a.name + ' has been on a cleaning spree.',
          a.name + ' mastered a new technique as ' + job + '. The others are taking notes.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
    discovery: {
      // High openness, near Garden or Lab
      check: function(a) {
        var ao = a.ocean || {};
        return (ao.openness || 0.5) > 0.6 && (a.floor === 4 || a.floor === 5 || a.floor === 9);
      },
      icon: '🔮',
      generate: function(a) {
        var floorName = FLOOR_NAMES[a.floor] || 'somewhere';
        var templates = [
          a.name + ' followed a sound into ' + floorName + '. They came back different. Quieter.',
          'Something strange in ' + floorName + '. ' + a.name + ' won\'t explain, but keeps going back.',
          a.name + ' found an old document in ' + floorName + ' that nobody can translate.',
          'New species of luminous moss spotted in ' + floorName + '. ' + a.name + ' claims it responded to music.',
          a.name + ' swears the walls in ' + floorName + ' moved last night. Nobody believes them. Yet.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
    rumor: {
      // High extraversion NPC spreading info
      check: function(a) {
        var ao = a.ocean || {};
        return (ao.extraversion || 0.5) > 0.65;
      },
      icon: '👀',
      generate: function(a) {
        var templates = [
          a.name + ' has been telling everyone that the Observatory looks different at 3 AM.',
          'According to ' + a.name + ', someone new is coming to the station. They won\'t say who.',
          a.name + ' heard music coming from Floor 9 last night. But nobody works there after midnight.',
          'Rumor from ' + a.name + ': the Garden Biodome has a hidden room. Behind the big tree.',
          a.name + ' says they saw someone on the security cameras who wasn\'t in the roster. Ghost? Glitch?',
          a.name + ' overheard the engineers talking about a "Floor 13." Probably nothing. Probably.',
          'Word in the station: ' + a.name + ' found something in the Docking Bay they shouldn\'t have.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
    social: {
      // General social event — no special requirements
      check: function(a, b) {
        return a && b && a.floor === b.floor;
      },
      icon: '🗣️',
      generate: function(a, b) {
        var floorName = FLOOR_NAMES[a.floor] || 'the station';
        var templates = [
          a.name + ' and ' + b.name + ' had a long conversation at ' + floorName + '. Something about home.',
          b.name + ' taught ' + a.name + ' how to make coffee the old way at ' + floorName + '.',
          a.name + ' challenged ' + b.name + ' to an arm wrestle at ' + floorName + '. Result unknown.',
          'Late night at ' + floorName + ': ' + a.name + ' and ' + b.name + ' trading stories by the window.',
          a.name + ' saved ' + b.name + ' a seat at ' + floorName + '. Small gesture. Big deal here.',
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      },
    },
  };

  // ─── Persistence ────────────────────────────────────────────────
  function loadEvents() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        _events = JSON.parse(raw);
        if (!Array.isArray(_events)) _events = [];
      }
    } catch (e) { _events = []; }
  }

  function saveEvents() {
    while (_events.length > MAX_EVENTS) _events.shift();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(_events));
    } catch (e) { /* quota */ }
  }

  // ─── Story Generation ──────────────────────────────────────────
  function getPopulation() {
    if (window._stationPop && window._stationPop.length > 0) return window._stationPop;
    if (typeof StationLife !== 'undefined' && StationLife.getByFloor) {
      var all = [];
      for (var f = 1; f <= 12; f++) {
        var fl = StationLife.getByFloor(f);
        if (fl) all = all.concat(fl);
      }
      return all;
    }
    return [];
  }

  function pickTwo(pop) {
    if (pop.length < 2) return null;
    var a = pop[Math.floor(Math.random() * pop.length)];
    var b;
    var attempts = 0;
    do {
      b = pop[Math.floor(Math.random() * pop.length)];
      attempts++;
    } while (b.id === a.id && attempts < 20);
    if (b.id === a.id) return null;
    return [a, b];
  }

  function generateStory() {
    var pop = getPopulation();
    if (pop.length < 2) return;

    // Shuffle story type order for variety
    var typeKeys = Object.keys(STORY_TYPES);
    shuffleArray(typeKeys);

    for (var i = 0; i < typeKeys.length; i++) {
      var type = STORY_TYPES[typeKeys[i]];

      // Some types only need one NPC
      if (typeKeys[i] === 'achievement' || typeKeys[i] === 'discovery' || typeKeys[i] === 'rumor') {
        // Pick a random NPC
        var npc = pop[Math.floor(Math.random() * pop.length)];
        if (type.check(npc)) {
          var text = type.generate(npc);
          // Avoid duplicate stories (same text within last 5)
          if (!isDuplicateRecent(text)) {
            addEvent(npc.name, typeKeys[i], text, type.icon);
            return;
          }
        }
      } else {
        // Two-NPC stories
        var pair = pickTwo(pop);
        if (pair && type.check(pair[0], pair[1])) {
          var text2 = type.generate(pair[0], pair[1]);
          if (!isDuplicateRecent(text2)) {
            addEvent(pair[0].name, typeKeys[i], text2, type.icon);
            return;
          }
        }
      }
    }

    // Fallback: generate a generic social event
    var pair2 = pickTwo(pop);
    if (pair2) {
      var fallback = STORY_TYPES.social.generate(pair2[0], pair2[1]);
      addEvent(pair2[0].name, 'social', fallback, '🗣️');
    }
  }

  function isDuplicateRecent(text) {
    var recent = _events.slice(-5);
    for (var i = 0; i < recent.length; i++) {
      if (recent[i].text === text) return true;
    }
    return false;
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }

  function addEvent(npcName, type, text, icon) {
    var evt = {
      ts: Date.now(),
      npc: npcName,
      type: type,
      icon: icon || '📰',
      text: text,
    };
    _events.push(evt);
    saveEvents();

    _hasUnread = true;
    updateToggleBadge();

    if (_panelOpen) renderNewsFeed();
  }

  // ─── UI: Station News Panel ─────────────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '/* Station News Toggle */',
      '#npc-news-toggle {',
      '  position: fixed;',
      '  top: 16px;',
      '  left: 16px;',
      '  z-index: 8500;',
      '  background: rgba(10,10,20,0.85);',
      '  border: 1px solid rgba(255,255,255,0.12);',
      '  border-radius: 10px;',
      '  padding: 6px 12px;',
      '  font-family: monospace;',
      '  font-size: 11px;',
      '  color: rgba(255,255,255,0.75);',
      '  cursor: pointer;',
      '  user-select: none;',
      '  backdrop-filter: blur(8px);',
      '  transition: border-color 0.2s, background 0.2s;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '}',
      '#npc-news-toggle:hover {',
      '  border-color: rgba(255,255,255,0.3);',
      '  background: rgba(10,10,20,0.95);',
      '}',
      '#npc-news-toggle.has-unread {',
      '  border-color: rgba(255,170,0,0.5);',
      '}',
      '#npc-news-badge {',
      '  width: 6px;',
      '  height: 6px;',
      '  border-radius: 50%;',
      '  background: #ffaa00;',
      '  display: none;',
      '  animation: npc-pulse 1.5s ease-in-out infinite;',
      '}',
      '#npc-news-toggle.has-unread #npc-news-badge { display: block; }',
      '@keyframes npc-pulse {',
      '  0%, 100% { opacity: 1; transform: scale(1); }',
      '  50% { opacity: 0.5; transform: scale(0.8); }',
      '}',
      '',
      '/* News Panel */',
      '#npc-news-panel {',
      '  position: fixed;',
      '  top: 52px;',
      '  left: 16px;',
      '  width: 300px;',
      '  max-width: 85vw;',
      '  max-height: 350px;',
      '  z-index: 8501;',
      '  background: rgba(8,8,18,0.95);',
      '  border: 1px solid rgba(255,255,255,0.1);',
      '  border-radius: 12px;',
      '  backdrop-filter: blur(12px);',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.6);',
      '  display: flex;',
      '  flex-direction: column;',
      '  overflow: hidden;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transform: translateY(-8px);',
      '  transition: opacity 0.25s, transform 0.25s;',
      '}',
      '#npc-news-panel.open {',
      '  opacity: 1;',
      '  pointer-events: all;',
      '  transform: translateY(0);',
      '}',
      '',
      '.npc-news-header {',
      '  padding: 12px 14px 10px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.06);',
      '  font-family: monospace;',
      '  font-size: 12px;',
      '  font-weight: bold;',
      '  color: #ffaa00;',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '}',
      '.npc-news-header-sub {',
      '  font-size: 9px;',
      '  font-weight: normal;',
      '  color: rgba(255,255,255,0.3);',
      '}',
      '',
      '#npc-news-list {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 6px 0;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: rgba(255,170,0,0.15) transparent;',
      '}',
      '#npc-news-list::-webkit-scrollbar { width: 3px; }',
      '#npc-news-list::-webkit-scrollbar-thumb { background: rgba(255,170,0,0.15); border-radius: 2px; }',
      '',
      '.npc-news-item {',
      '  padding: 8px 14px;',
      '  cursor: pointer;',
      '  transition: background 0.15s;',
      '  border-bottom: 1px solid rgba(255,255,255,0.03);',
      '}',
      '.npc-news-item:hover { background: rgba(255,255,255,0.04); }',
      '.npc-news-item:last-child { border-bottom: none; }',
      '',
      '.npc-news-item-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  margin-bottom: 3px;',
      '}',
      '.npc-news-icon { font-size: 12px; }',
      '.npc-news-npc {',
      '  font-family: monospace;',
      '  font-size: 10px;',
      '  font-weight: bold;',
      '  color: rgba(255,255,255,0.7);',
      '}',
      '.npc-news-time {',
      '  font-family: monospace;',
      '  font-size: 9px;',
      '  color: rgba(255,255,255,0.2);',
      '  margin-left: auto;',
      '}',
      '.npc-news-text {',
      '  font-family: monospace;',
      '  font-size: 10px;',
      '  color: rgba(255,255,255,0.6);',
      '  line-height: 1.45;',
      '}',
      '',
      '.npc-news-empty {',
      '  text-align: center;',
      '  padding: 30px 14px;',
      '  font-family: monospace;',
      '  font-size: 10px;',
      '  color: rgba(255,255,255,0.2);',
      '}',
      '',
      '/* Station News Ticker */',
      '#npc-news-ticker {',
      '  position: fixed;',
      '  bottom: 0;',
      '  left: 0;',
      '  right: 0;',
      '  height: 22px;',
      '  z-index: 8400;',
      '  background: rgba(5,5,12,0.85);',
      '  border-top: 1px solid rgba(255,170,0,0.1);',
      '  overflow: hidden;',
      '  backdrop-filter: blur(4px);',
      '}',
      '#npc-news-ticker-text {',
      '  position: absolute;',
      '  top: 0;',
      '  white-space: nowrap;',
      '  font-family: monospace;',
      '  font-size: 10px;',
      '  color: rgba(255,255,255,0.4);',
      '  line-height: 22px;',
      '  will-change: transform;',
      '}',
      '#npc-news-ticker-text span.ticker-icon {',
      '  margin: 0 8px 0 16px;',
      '  color: rgba(255,170,0,0.6);',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildToggle() {
    if (document.getElementById('npc-news-toggle')) return;

    var toggle = document.createElement('div');
    toggle.id = 'npc-news-toggle';
    toggle.innerHTML = '📡 Station News <div id="npc-news-badge"></div>';
    toggle.addEventListener('click', function() {
      togglePanel();
    });
    document.body.appendChild(toggle);
  }

  function buildPanel() {
    if (document.getElementById('npc-news-panel')) return;

    var panel = document.createElement('div');
    panel.id = 'npc-news-panel';
    panel.innerHTML = [
      '<div class="npc-news-header">',
      '  📡 Station News',
      '  <span class="npc-news-header-sub">What\'s happening on the ring</span>',
      '</div>',
      '<div id="npc-news-list"></div>',
    ].join('');
    document.body.appendChild(panel);
  }

  function buildTicker() {
    if (document.getElementById('npc-news-ticker')) return;

    var ticker = document.createElement('div');
    ticker.id = 'npc-news-ticker';
    ticker.innerHTML = '<div id="npc-news-ticker-text"></div>';
    document.body.appendChild(ticker);

    updateTickerContent();
    startTickerAnimation();
  }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    var panel = document.getElementById('npc-news-panel');
    if (panel) {
      if (_panelOpen) {
        panel.classList.add('open');
        _hasUnread = false;
        updateToggleBadge();
        renderNewsFeed();
      } else {
        panel.classList.remove('open');
      }
    }
  }

  function updateToggleBadge() {
    var toggle = document.getElementById('npc-news-toggle');
    if (toggle) {
      if (_hasUnread) {
        toggle.classList.add('has-unread');
      } else {
        toggle.classList.remove('has-unread');
      }
    }
  }

  function renderNewsFeed() {
    var list = document.getElementById('npc-news-list');
    if (!list) return;

    if (_events.length === 0) {
      list.innerHTML = '<div class="npc-news-empty">No news yet. The station is quiet… for now.</div>';
      return;
    }

    var sorted = _events.slice().reverse().slice(0, 8); // Show last 8
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
      var e = sorted[i];
      var time = formatTimeAgo(e.ts);
      html += '<div class="npc-news-item" data-npc="' + escapeAttr(e.npc) + '">';
      html += '<div class="npc-news-item-header">';
      html += '<span class="npc-news-icon">' + (e.icon || '📰') + '</span>';
      html += '<span class="npc-news-npc">' + escapeHtml(e.npc) + '</span>';
      html += '<span class="npc-news-time">' + time + '</span>';
      html += '</div>';
      html += '<div class="npc-news-text">' + escapeHtml(e.text) + '</div>';
      html += '</div>';
    }

    list.innerHTML = html;

    // Click to focus on NPC (if on same floor)
    var items = list.querySelectorAll('.npc-news-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function() {
        var npcName = this.getAttribute('data-npc');
        focusOnNPC(npcName);
      });
    }
  }

  function focusOnNPC(npcName) {
    var pop = getPopulation();
    for (var i = 0; i < pop.length; i++) {
      if (pop[i].name === npcName) {
        var npc = pop[i];
        // If player is on same floor, scroll camera
        if (typeof window.S !== 'undefined' && window.S.floor === npc.floor && typeof window.S.camera !== 'undefined') {
          window.S.camera.x = npc.x - ((window.W || 800) / 2);
          window.S.camera.y = npc.y - ((window.H || 600) / 2);
        }
        return;
      }
    }
  }

  // ─── Ticker ─────────────────────────────────────────────────────
  function updateTickerContent() {
    var el = document.getElementById('npc-news-ticker-text');
    if (!el) return;

    if (_events.length === 0) {
      el.innerHTML = '<span class="ticker-icon">📡</span> Station News — All quiet on the ring...';
      return;
    }

    var recent = _events.slice(-6).reverse();
    var html = '';
    for (var i = 0; i < recent.length; i++) {
      html += '<span class="ticker-icon">' + (recent[i].icon || '📰') + '</span>' + escapeHtml(recent[i].text);
    }
    // Repeat for seamless loop
    html += '          ' + html;
    el.innerHTML = html;
  }

  function startTickerAnimation() {
    var el = document.getElementById('npc-news-ticker-text');
    if (!el) return;

    function tick() {
      _tickerX -= TICKER_SPEED;
      var halfWidth = el.scrollWidth / 2;
      if (halfWidth > 0 && Math.abs(_tickerX) >= halfWidth) {
        _tickerX = 0;
      }
      el.style.transform = 'translateX(' + _tickerX + 'px)';
      _tickerAnimId = requestAnimationFrame(tick);
    }
    _tickerAnimId = requestAnimationFrame(tick);
  }

  // ─── Utilities ──────────────────────────────────────────────────
  function formatTimeAgo(ts) {
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    return days === 1 ? 'yesterday' : days + 'd ago';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Story Generation Loop ─────────────────────────────────────
  function startStoryLoop() {
    // Generate first story after 30 seconds
    setTimeout(function() {
      generateStory();
      updateTickerContent();
    }, 30000);

    // Then every STORY_INTERVAL
    setInterval(function() {
      generateStory();
      updateTickerContent();
    }, STORY_INTERVAL);
  }

  // ─── Seed Events ───────────────────────────────────────────────
  function seedInitialEvents() {
    // If empty, seed 3 "historical" events so it doesn't feel dead on first visit
    if (_events.length > 0) return;

    var pop = getPopulation();
    if (pop.length < 2) return;

    var seedCount = Math.min(3, Math.floor(pop.length / 2));
    for (var i = 0; i < seedCount; i++) {
      // Fake timestamps: 2h, 5h, 12h ago
      var ages = [7200000, 18000000, 43200000];
      var pair = pickTwo(pop);
      if (!pair) continue;

      var typeKeys = ['social', 'rumor', 'achievement'];
      var type = STORY_TYPES[typeKeys[i % typeKeys.length]];
      var npc = pair[0];
      var text;

      if (typeKeys[i % typeKeys.length] === 'social') {
        text = type.generate(pair[0], pair[1]);
      } else {
        text = type.generate(npc);
      }

      _events.push({
        ts: Date.now() - ages[i],
        npc: npc.name,
        type: typeKeys[i % typeKeys.length],
        icon: type.icon,
        text: text,
      });
    }
    saveEvents();
  }

  // ─── Init ───────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;

    loadEvents();
    injectStyles();
    buildToggle();
    buildPanel();
    buildTicker();

    // Wait for population to be ready before seeding/generating
    var waitPop = function() {
      var pop = getPopulation();
      if (pop.length >= 2) {
        seedInitialEvents();
        renderNewsFeed();
        updateTickerContent();
        startStoryLoop();
        console.log('[NPCDrama] Station News live — ' + _events.length + ' stories 📡');
      } else {
        setTimeout(waitPop, 2000);
      }
    };
    setTimeout(waitPop, 3000);
  }

  // ─── Public API ─────────────────────────────────────────────────
  window.NPCDrama = {
    addEvent: function(npcName, type, text) {
      var icon = (STORY_TYPES[type] && STORY_TYPES[type].icon) || '📰';
      addEvent(npcName, type, text, icon);
      updateTickerContent();
    },
    getEvents: function() {
      return _events.slice();
    },
    generate: function() {
      generateStory();
      updateTickerContent();
    },
    toggle: function() {
      togglePanel();
    },
  };

  // ─── Boot ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 2000); });
  } else {
    setTimeout(init, 2000);
  }

})();
