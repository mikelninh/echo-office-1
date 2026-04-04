/**
 * echo-memory.js — Echo's Visitor Recognition & Bond System
 * Echo's Station — v1.0.0
 *
 * Echo remembers you. Each time you return, she greets you based on how long
 * you've been away. Visit enough times and your bond grows — from stranger to
 * soulmate. Milestones get celebrated. Long absences get a special emotional moment.
 *
 * What it tracks (localStorage key: 'echo_visitor_memory'):
 *   visits       — total number of visits ever
 *   lastVisit    — timestamp (ms) of the previous session
 *   firstVisit   — timestamp (ms) of your very first visit
 *   streak       — consecutive days visited (resets if > 36h since last visit)
 *   lastStreakDay — ISO date string "YYYY-MM-DD" of last streak-contributing visit
 *   milestones   — array of visit-count milestones already celebrated
 *
 * Bond levels (based on total visits):
 *   0 Stranger      (1)
 *   1 Familiar      (3+)
 *   2 Regular       (8+)
 *   3 Friend        (20+)
 *   4 Close Friend  (50+)
 *   5 Soulmate      (100+)
 *
 * Greetings:
 *   First ever → warm welcome
 *   < 5 min    → "Forget something?"
 *   < 1h       → "Back so soon?"
 *   Same day   → "You came back!"
 *   < 36h      → "I was just thinking about you"
 *   < 7 days   → "I missed having you around"
 *   < 30 days  → "X days since your last visit"
 *   30d+       → emotional reunion
 *
 * Public API:
 *   window.EchoMemory.visits      → total visit count
 *   window.EchoMemory.bond        → current bond level (0–5)
 *   window.EchoMemory.streak      → current daily streak
 *   window.EchoMemory.reset()     → clear all memory (for testing)
 *   window.EchoMemory.forceGreet()→ re-trigger the greeting (for testing)
 *
 * Rules:
 *   - New files in public/js/ only — never edits index.html
 *   - Zero external dependencies — degrades gracefully
 *   - Never breaks if game hasn't loaded yet
 */
(function EchoMemoryModule() {
  'use strict';

  // ─── Storage ─────────────────────────────────────────────────────────────

  var STORAGE_KEY = 'echo_visitor_memory';

  function loadMemory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveMemory(m) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch (e) {}
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ─── Init: load + update memory ──────────────────────────────────────────

  var _mem    = loadMemory();
  var _isNew  = !_mem;
  var _now    = Date.now();

  if (_isNew) {
    _mem = {
      visits:       1,
      firstVisit:   _now,
      lastVisit:    _now,
      streak:       1,
      lastStreakDay: todayStr(),
      milestones:   []
    };
    saveMemory(_mem);
  } else {
    var today     = todayStr();
    var lastDay   = _mem.lastStreakDay || '';
    var prev      = new Date(lastDay);
    var nowDate   = new Date(today);
    var diffDays  = Math.round((nowDate - prev) / 86400000);

    _mem.visits += 1;
    _mem.lastVisit = _now;

    // Streak: same day = no change; yesterday = +1; older = reset to 1
    if (lastDay === today) {
      // already counted today — streak unchanged
    } else if (diffDays === 1) {
      _mem.streak = (_mem.streak || 1) + 1;
      _mem.lastStreakDay = today;
    } else {
      _mem.streak = 1;
      _mem.lastStreakDay = today;
    }

    saveMemory(_mem);
  }

  var _visits     = _mem.visits;
  var _streak     = _mem.streak;
  var _prevVisit  = _isNew ? null : (_mem.lastVisit || _now);  // last session start
  // Note: lastVisit was updated above to _now, so use prev raw
  var _prevVisitTs = _isNew ? null : (() => {
    // Re-load to get the value before we bumped it
    try {
      var raw2 = localStorage.getItem(STORAGE_KEY);
      var parsed = JSON.parse(raw2);
      // We already saved with new value — reconstruct old lastVisit from gap
      return parsed.lastVisit - 0; // already the new one
    } catch(e) { return null; }
  })();

  // Get the actual previous visit timestamp (before this session)
  // We need to save it before incrementing — let's recalculate using firstVisit
  // Actually we need to track this correctly — store prevVisit separately
  // Re-load with fix: save previous visit BEFORE updating
  var _gapMs = 0;
  (function computeGap() {
    try {
      var raw3 = localStorage.getItem(STORAGE_KEY);
      var cur  = JSON.parse(raw3);
      // prevVisit is now stored as lastVisit — but we already set it to _now
      // We need to store prevVisit explicitly
      if (!_isNew && cur.prevVisit) {
        _gapMs = _now - cur.prevVisit;
      } else if (!_isNew) {
        // estimate: treat lastVisit as prev since we didn't have prevVisit field
        _gapMs = 0; // can't know gap for old data without prevVisit field
      }
      // Save prevVisit for next session
      cur.prevVisit = _now;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    } catch(e) {}
  })();

  // ─── Bond level ──────────────────────────────────────────────────────────

  var BOND_THRESHOLDS = [1, 3, 8, 20, 50, 100];
  var BOND_NAMES      = ['Stranger', 'Familiar', 'Regular', 'Friend', 'Close Friend', 'Soulmate'];
  var BOND_ICONS      = ['🌱', '✨', '⭐', '💙', '💜', '💎'];
  var BOND_COLORS     = ['#aaaaaa', '#c8e0ff', '#ffd080', '#88aaff', '#c080ff', '#80ffcc'];

  function getBondLevel(visits) {
    var lvl = 0;
    for (var i = BOND_THRESHOLDS.length - 1; i >= 0; i--) {
      if (visits >= BOND_THRESHOLDS[i]) { lvl = i; break; }
    }
    return lvl;
  }

  var _bond = getBondLevel(_visits);

  // ─── Greeting logic ──────────────────────────────────────────────────────

  var MILESTONES = [2, 5, 10, 25, 50, 100, 200];

  function isMilestone(v) {
    return MILESTONES.indexOf(v) !== -1 && _mem.milestones.indexOf(v) === -1;
  }

  function markMilestone(v) {
    if (_mem.milestones.indexOf(v) === -1) {
      _mem.milestones.push(v);
      saveMemory(_mem);
    }
  }

  function getGreetingType() {
    if (_isNew || _visits === 1) return 'first';
    var gapS = _gapMs / 1000;
    var gapH = gapS / 3600;
    if (gapMs === 0 || _gapMs === 0) {
      // No prevVisit stored yet — treat as returning after a while
      return 'returning';
    }
    if (gapH < 0.083)  return 'quickreturn';   // < 5 min
    if (gapH < 1)      return 'soon';           // < 1h
    if (gapH < 8)      return 'sameday';        // same day
    if (gapH < 36)     return 'nextday';        // yesterday-ish
    if (gapH < 168)    return 'fewdays';        // < 7 days
    if (gapH < 720)    return 'longabsence';    // < 30 days
    return 'verylong';                           // 30d+
  }

  var _greetDays = Math.floor(_gapMs / 86400000);
  var _greetHours = Math.floor(_gapMs / 3600000);

  var GREETINGS = {
    first:       ["Welcome home 🏠 I'm Echo — I've been waiting for someone to visit!", "Oh! A visitor! I'm Echo — make yourself at home 💜", "Hello! First time here? I'm Echo — the space is yours ✨"],
    quickreturn: ["You're back! Forget something? 😄", "Twice in five minutes — I like your energy 😄", "Can't stay away, can you? 💜"],
    soon:        ["Back so soon? Not that I'm complaining 💜", "You came back! I was hoping you would 🌟", "Couldn't resist, huh? I get it 😊"],
    sameday:     ["You came back today! 🌟 That made me happy", "You're back! I was just thinking about you 💜", "Two visits in one day — you're spoiling me ✨"],
    nextday:     ["Oh! You're here 💜 I was just thinking about you", "I wondered if you'd come back today 🌙 I'm glad you did", "You came back 🌟 I missed you"],
    fewdays:     ["Been a few days... I missed having you around 🌙", "There you are 💙 I was starting to wonder", "A few days felt like forever 🌸 Welcome back"],
    longabsence: ["{days} days since your last visit... I'm so glad you're here 💙", "You were gone {days} days 🌙 I kept the lights on", "It's been {days} days — welcome back, I missed you 💜"],
    verylong:    ["It's been so long 🥺 I was starting to wonder about you...", "You're here 💜 After all this time. I'm so glad.", "I never forgot about you 🌸 Welcome back, really"],
    returning:   ["Good to see you again 💜", "Welcome back! 🌟", "You're here! 💙"],
    milestone:   {
      2:   "Your second visit! 🌱 You're not just passing through, are you?",
      5:   "Five visits! ⭐ You're becoming a regular around here",
      10:  "Ten visits 💙 This place is starting to feel like yours",
      25:  "Twenty-five visits 💜 You're basically family at this point",
      50:  "Fifty visits! 💎 I don't know what I'd do without you showing up",
      100: "One hundred visits 💎✨ You've been here a hundred times. That means everything.",
      200: "Two hundred visits. 💜 Whatever you're looking for here... I hope you've found it."
    }
  };

  function getGreeting(type) {
    var pool = GREETINGS[type];
    if (!pool) pool = GREETINGS.returning;
    var msg = pool[Math.floor(Math.random() * pool.length)];
    if (msg) {
      msg = msg.replace('{days}', _greetDays);
      msg = msg.replace('{hours}', _greetHours);
    }
    return msg || "Welcome back 💜";
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  var gapMs = _gapMs; // alias for clarity in getGreetingType

  function getS()  { return window.S;   }
  function getCtx(){ return window.ctx; }
  function getW()  { return window.W || 800; }
  function getH()  { return window.H || 600; }

  function floorColor(f) {
    var colors = [0,'#9b59b6','#3498db','#e91e8c','#27ae60','#00bcd4','#f39c12','#e67e22','#87ceeb','#6c5ce7','#fd79a8','#fdcb6e','#81ecec'];
    return colors[f] || '#9b59b6';
  }
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return {r:r,g:g,b:b};
  }
  function colorStr(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba('+c.r+','+c.g+','+c.b+','+(a||1)+')';
  }

  // ─── Bond indicator (DOM overlay) ────────────────────────────────────────

  var _bondEl  = null;

  function createBondIndicator() {
    if (_bondEl) return;
    var el = document.createElement('div');
    el.id = 'echo-bond-indicator';
    var col = BOND_COLORS[_bond];
    el.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:14px',
      'z-index:9001',
      'pointer-events:none',
      'display:flex',
      'align-items:center',
      'gap:5px',
      'background:rgba(10,10,20,0.72)',
      'border:1px solid ' + col,
      'border-radius:20px',
      'padding:4px 10px 4px 8px',
      'font-family:Courier New,monospace',
      'font-size:12px',
      'color:' + col,
      'opacity:0',
      'transition:opacity 0.6s ease, border-color 0.6s ease, color 0.6s ease',
      'box-shadow:0 0 8px ' + colorStr(col, 0.3),
      'white-space:nowrap'
    ].join(';');

    var hearts = buildHearts(_bond);
    var streakBadge = _streak >= 3 ? ' <span style="color:#ff9500;font-size:11px">🔥' + _streak + '</span>' : '';
    el.innerHTML = '<span style="font-size:13px">' + BOND_ICONS[_bond] + '</span>' +
                   '<span style="letter-spacing:1px">' + hearts + '</span>' +
                   '<span style="opacity:0.65;font-size:10px">' + BOND_NAMES[_bond] + '</span>' +
                   streakBadge;

    document.body.appendChild(el);
    _bondEl = el;

    // Fade in after a short delay
    setTimeout(function() { el.style.opacity = '1'; }, 1500);

    // Pulse gently forever
    var t0 = performance.now();
    (function pulse() {
      if (!_bondEl) return;
      var t = (performance.now() - t0) / 1000;
      var alpha = 0.18 + Math.sin(t * 0.8) * 0.08;
      _bondEl.style.boxShadow = '0 0 ' + (6 + Math.sin(t)*3) + 'px ' + colorStr(col, alpha + 0.2);
      requestAnimationFrame(pulse);
    })();
  }

  function buildHearts(level) {
    var full  = level;
    var empty = 5 - level;
    return '♥'.repeat(full) + '<span style="opacity:0.25">♡</span>'.repeat(empty);
  }

  // ─── Greeting burst (on canvas via S.particles / S.floatTexts) ───────────

  var _greeted = false;

  function triggerGreeting() {
    if (_greeted) return;
    var S = getS();
    if (!S || !S.echo || !S.floatTexts || !S.particles) return;

    _greeted = true;

    var e   = S.echo;
    var col = floorColor(S.floor || 1);
    var ex  = e.x, ey = e.y - 10;

    // Determine greeting
    var type = getGreetingType();
    var isMile = isMilestone(_visits);
    var text;

    if (isMile) {
      text = GREETINGS.milestone[_visits] || getGreeting(type);
      markMilestone(_visits);
    } else {
      text = getGreeting(type);
    }

    // Float text — the main greeting
    S.floatTexts.push({
      text:  text,
      x:     ex,
      y:     ey - 40,
      color: col,
      life:  160,
    });

    // Burst particles — intensity varies by greeting type
    var burstCount = 10;
    var isEmotional = (type === 'longabsence' || type === 'verylong' || isMile);
    if (isEmotional) burstCount = 28;
    else if (type === 'first' || type === 'fewdays') burstCount = 18;

    var c = hexToRgb(col);
    for (var i = 0; i < burstCount; i++) {
      var angle  = (Math.PI * 2 * i) / burstCount + Math.random() * 0.3;
      var speed  = 1.5 + Math.random() * (isEmotional ? 3.5 : 2.0);
      var useCol = Math.random() < 0.6 ? col : (Math.random() < 0.5 ? '#ffffff' : '#ffd080');
      S.particles.push({
        x: ex + (Math.random() - 0.5) * 10,
        y: ey,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isEmotional ? 2 : 1),
        color: useCol,
        alpha: 0.9,
        size:  isEmotional ? 2.5 + Math.random() * 2.5 : 1.5 + Math.random() * 2,
        life:  isEmotional ? 55 + Math.floor(Math.random() * 30) : 40 + Math.floor(Math.random() * 20),
        gravity: 0.06
      });
    }

    // Extra emoji hearts for emotional greetings
    if (isEmotional) {
      var emojis = ['💜', '💙', '🌟', '✨', '💫', '🌸', '💎'];
      for (var j = 0; j < 5; j++) {
        S.floatTexts.push({
          text:  emojis[Math.floor(Math.random() * emojis.length)],
          x:     ex + (Math.random() - 0.5) * 60,
          y:     ey - 20 - j * 15,
          color: col,
          life:  70 + Math.floor(Math.random() * 30),
        });
      }
    }

    // For very long absence: flash a full-screen overlay (DOM)
    if (type === 'verylong' || (isMile && _visits >= 50)) {
      showEmotionalOverlay(text, col);
    }

    // Trigger EchoAura bloom if available
    if (window.EchoAura && window.EchoAura.trigger) {
      setTimeout(function() { window.EchoAura.trigger(); }, 400);
    }

    // Update bond indicator with a brief glow
    if (_bondEl) {
      _bondEl.style.transition = 'opacity 0.3s, box-shadow 0.3s, border-color 0.3s, color 0.3s';
      var bcol = BOND_COLORS[_bond];
      _bondEl.style.boxShadow = '0 0 20px ' + colorStr(bcol, 0.7);
      setTimeout(function() {
        if (_bondEl) _bondEl.style.transition = 'opacity 0.6s ease, border-color 0.6s, color 0.6s, box-shadow 1.5s';
      }, 800);
    }
  }

  // ─── Full-screen emotional overlay (for reunions & big milestones) ────────

  function showEmotionalOverlay(text, col) {
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9010',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'pointer-events:none',
      'background:rgba(10,10,20,0)',
      'transition:background 1.2s ease',
      'font-family:Courier New,monospace'
    ].join(';');

    var msg = document.createElement('div');
    msg.style.cssText = [
      'color:' + col,
      'font-size:18px',
      'text-align:center',
      'max-width:340px',
      'line-height:1.6',
      'letter-spacing:0.5px',
      'opacity:0',
      'transform:translateY(16px)',
      'transition:opacity 1.0s ease 0.4s, transform 1.0s ease 0.4s',
      'text-shadow:0 0 18px ' + colorStr(col, 0.6)
    ].join(';');
    msg.textContent = text;

    var sub = document.createElement('div');
    sub.style.cssText = [
      'margin-top:10px',
      'color:rgba(240,232,216,0.5)',
      'font-size:11px',
      'opacity:0',
      'transition:opacity 1.0s ease 0.8s',
      'letter-spacing:1px'
    ].join(';');
    sub.textContent = 'visit #' + _visits + ' · ' + BOND_NAMES[_bond];

    overlay.appendChild(msg);
    overlay.appendChild(sub);
    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
      overlay.style.background = 'rgba(10,10,20,0.55)';
      msg.style.opacity  = '1';
      msg.style.transform= 'translateY(0)';
      sub.style.opacity  = '1';
    });

    setTimeout(function() {
      overlay.style.transition = 'opacity 1.5s ease';
      overlay.style.opacity = '0';
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 1600);
    }, 4000);
  }

  // ─── Install: wait for game, then greet ──────────────────────────────────

  function install() {
    var S = getS();
    if (!S || !S.echo || !S.floatTexts || !window.renderFloor1) {
      setTimeout(install, 350);
      return;
    }

    createBondIndicator();

    // Give the visitor a moment to settle in before the greeting fires
    var delay = 1800;
    if (getGreetingType() === 'verylong') delay = 2500;

    setTimeout(function() {
      triggerGreeting();
    }, delay);

    console.log(
      '[EchoMemory] 💜 Bond system active — visit #' + _visits +
      ', bond: ' + BOND_NAMES[_bond] + ' (lvl ' + _bond + ')' +
      (_streak >= 3 ? ', streak: 🔥' + _streak : '')
    );
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window.EchoMemory = {
    visits:      _visits,
    bond:        _bond,
    bondName:    BOND_NAMES[_bond],
    streak:      _streak,
    isNewVisitor: _isNew,
    reset: function() {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[EchoMemory] 🗑️ Memory cleared — refresh to start fresh');
    },
    forceGreet: function() {
      _greeted = false;
      triggerGreeting();
    }
  };

  // ─── Boot ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

})();
