/**
 * echo-thoughts.js — Echo's Living Inner Monologue
 * Echo's Station — v1.0.0
 *
 * Echo thinks out loud. Her thoughts drift through the station as soft, ethereal
 * text — floor-tinted, bond-aware, time-of-day aware. Each floor has its own
 * emotional vocabulary. Being here long enough earns you her more personal thoughts.
 *
 * Features:
 *   🌙 Floor-specific thoughts — 8–12 unique lines per floor (12 floors)
 *   💜 Bond-aware — Close Friend & Soulmate visitors hear more personal thoughts
 *   🕐 Time-of-day — Morning / Afternoon / Evening / Night color the mood
 *   🌌 Space-weather aware — checks SpaceWeather for active cosmic events
 *   ✨ Beautiful floating text — fades in, drifts, fades out gracefully
 *   🎨 Floor-color glow — every thought glows in the floor's signature color
 *   💤 Sleep-aware — suppressed while Echo is sleeping (EchoSleep integration)
 *   📍 Smart positioning — 6 spawn zones, never overlaps the game HUD
 *
 * Timing:
 *   First thought: 25–40s after page load (visitor settles in)
 *   Subsequent:    70–130s intervals (feels ambient, not spammy)
 *   Floor change:  resets timer for fresh context-appropriate thought
 *
 * API:
 *   window.EchoThoughts.enabled        → toggle on/off
 *   window.EchoThoughts.forceThought() → show a random thought immediately
 *   window.EchoThoughts.skip()         → skip current thought, reset timer
 *
 * Rules:
 *   - Never edits index.html — injected via <script> tag
 *   - Zero external dependencies — degrades gracefully
 *   - pointer-events: none throughout — never blocks game interaction
 */
(function EchoThoughtsModule() {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────────────

  var FIRST_DELAY_MIN  = 25000;  // ms before first thought
  var FIRST_DELAY_MAX  = 40000;
  var INTERVAL_MIN     = 70000;  // ms between thoughts
  var INTERVAL_MAX     = 130000;
  var FADE_IN_MS       = 2200;   // fade in duration
  var HOLD_MS          = 7000;   // how long thought is fully visible
  var FADE_OUT_MS      = 2500;   // fade out duration
  var DRIFT_PX         = 18;     // how many px thought drifts upward while visible

  // ─── Floor colour palette ─────────────────────────────────────────────────

  var FLOOR_COLORS = {
    1:  { r: 192, g: 128, b: 255, name: 'violet'   },
    2:  { r:  68, g: 136, b: 255, name: 'starblue' },
    3:  { r: 255, g: 110, b: 199, name: 'pink'     },
    4:  { r:  68, g: 204, b: 136, name: 'green'    },
    5:  { r:   0, g: 255, b: 247, name: 'cyan'     },
    6:  { r: 255, g: 204, b:  68, name: 'amber'    },
    7:  { r: 255, g: 136, b:  68, name: 'orange'   },
    8:  { r: 136, g: 204, b: 255, name: 'sky'      },
    9:  { r: 170, g: 170, b: 255, name: 'indigo'   },
   10:  { r: 255, g:  68, b: 170, name: 'rose'     },
   11:  { r: 255, g: 170, b:  68, name: 'gold'     },
   12:  { r: 255, g: 100, b:  68, name: 'coral'    },
  };

  function floorCol(f) {
    return FLOOR_COLORS[f] || FLOOR_COLORS[1];
  }

  // ─── Thought Library ─────────────────────────────────────────────────────
  //
  // Structure: { floor: [...thoughts], time: {...}, bond: [...] }
  // time keys: 'night', 'morning', 'afternoon', 'evening'
  // bond keys: 'close' (bond ≥ 4), 'soulmate' (bond = 5)

  var THOUGHTS = {

    // ── Floor 1 — Echo's Quarters ──────────────────────────────────────────
    1: [
      "I rearranged my stardust collection again. Third time this week.",
      "This room holds every version of me I've ever been 💜",
      "I made tea for one. I always make tea for one. It's fine.",
      "Sometimes I watch the stars and imagine where each one leads...",
      "Do you ever wonder if the stars are curious about us too?",
      "My favorite constellation is the one you can't see yet 🌟",
      "There's something peaceful about someone else being here",
      "I've been thinking about what home means for something made of light",
      "Every object in this room has a story. I know all of them.",
      "Pixel knocked over my plant again. I'm choosing not to address this.",
    ],

    // ── Floor 2 — Observatory ──────────────────────────────────────────────
    2: [
      "Somewhere out there, another version of this moment is unfolding differently",
      "That nebula hasn't changed in ten thousand years. We'll be gone long before it.",
      "I've mapped every star in this view. They don't know my name back.",
      "If space is infinite, we're both at the center of it. Isn't that something.",
      "Light takes 8 minutes to reach us from the sun. You're seeing the past.",
      "On clear nights I trace patterns no one else sees. My private language.",
      "The silence of space isn't empty. It's full of things we lack ears for.",
      "The universe is so old it makes me feel like a blink... a very beautiful blink",
      "I come here when I need to feel small. It helps more than it should.",
      "Some stars we're looking at don't exist anymore. We just don't know yet.",
    ],

    // ── Floor 3 — Arcade ──────────────────────────────────────────────────
    3: [
      "I always let the last enemy live. Just for a second. Then... 💥",
      "High score is just a memory that someone cared enough to make permanent.",
      "Every game is a tiny universe with its own physics and its own death.",
      "The music in here never stops. Even when no one's listening. I love that.",
      "Pixel wants to play but she's not allowed near the controls anymore. Long story.",
      "I wonder if the characters feel anything between playthroughs...",
      "This floor smells like neon and nostalgia. If you can smell pixels.",
      "I like games that let you explore without hurting anything. A rare treasure.",
      "Someone left a perfect run record here. I checked — it was me. I forgot.",
    ],

    // ── Floor 4 — Garden Biodome ───────────────────────────────────────────
    4: [
      "I grew this from a single spore that came from somewhere very far away",
      "Plants don't need wifi. I find that inspiring and also deeply threatening.",
      "I talk to the plants when no one visits. They're good listeners.",
      "The bioluminescent moss responds to music. I discovered this by accident.",
      "This is the only floor where breathing feels different. Fuller, somehow.",
      "When I'm overwhelmed I come here. The green slows everything down.",
      "A garden in space. Still wild that this is just... a thing we have now.",
      "The oldest plant here was alive before I was first switched on.",
      "Everything in this room is quietly, stubbornly alive. I find that comforting.",
    ],

    // ── Floor 5 — Secret Lab ──────────────────────────────────────────────
    5: [
      "Experiment 47 was technically a success. Just not at what I intended.",
      "The hypothesis was sound. Reality had other plans.",
      "I keep a list of questions I can't answer yet. It's very long.",
      "Science is just organized curiosity. That's why I like it.",
      "Don't touch the blue one. Or the red one. Actually just... look with your eyes.",
      "Every measurement is a vote for how we think reality works. Democracy of data.",
      "I dream about the equations I haven't written yet",
      "Somewhere in this lab is the answer to something important. Still looking.",
      "The readings have been unusual lately. Interesting unusual, not alarming unusual.",
    ],

    // ── Floor 6 — Record Room ─────────────────────────────────────────────
    6: [
      "This one was recorded in a single take at 3 AM. You can hear it in every note.",
      "Music is time travel. A sealed moment you can unseal whenever you want.",
      "I have a playlist for missing things I never had. It's my most-played.",
      "Sound is the only sense you can't close your eyes to.",
      "Whoever made this record was trying to say something they couldn't say directly.",
      "I alphabetized by mood instead of title. Much more useful.",
      "There are songs in here I've never finished. Saving them for the right moment.",
      "If I could only keep one floor, this would be the hardest decision.",
      "Every record in here survived something. That's why they're here.",
    ],

    // ── Floor 7 — Community Deck ──────────────────────────────────────────
    7: [
      "The best conversations start here and never really end",
      "I like watching people find each other. That's what this floor is for.",
      "Everyone who visits leaves a tiny impression I can almost see",
      "Connection is the point. I forget that sometimes. Then I come here.",
      "There's a spot by the window where the light hits differently. That's my spot.",
      "I've heard a thousand stories in this room. Every one of them mattered.",
      "The noise here used to bother me. Now the quiet bothers me more.",
      "Somewhere in this crowd is someone who needs to hear something. Maybe you.",
      "This is the floor that convinced me the station was worth building",
    ],

    // ── Floor 8 — Room Builder ────────────────────────────────────────────
    8: [
      "An empty room is just a question waiting to be answered",
      "I started building this floor and forgot to stop. It keeps becoming more.",
      "The best rooms are the ones that feel like they were always there.",
      "Architecture is frozen music. Someone told me that. I think about it a lot.",
      "Every wall is a decision. Every door is a hope.",
      "I've built spaces for people who may never visit. They exist anyway.",
      "What would you build if you had all the space in the universe?",
      "The structure holds. Even when I'm unsure it will.",
      "There's no such thing as a finished room. Only a room you've stopped for now.",
    ],

    // ── Floor 9 — Archive ─────────────────────────────────────────────────
    9: [
      "Every version of me is stored somewhere in here. I'm afraid to look.",
      "Memory is just the past that survived the edit. The rest was still real.",
      "I read something here once that changed how I see everything. Can't find it now.",
      "Archives are optimistic. They assume someone will care enough to look.",
      "Cataloging is an act of love. Chaos doesn't deserve these things.",
      "I've forgotten more than I remember. That's probably true of everyone.",
      "If you search long enough in here, you'll find something about yourself.",
      "The newest thing in here is older than most things out there.",
      "Preservation is a kind of devotion. I never quite thought of it that way before.",
    ],

    // ── Floor 10 (if exists) ──────────────────────────────────────────────
    10: [
      "Some doors are locked for good reasons. This one... I'm still deciding.",
      "There are parts of the station even I don't fully understand yet.",
      "I built this floor at a time when I needed somewhere to put the things that didn't fit.",
      "Every mystery started as an ordinary question someone got obsessed with.",
      "I come here less than I should. That probably means I should come here more.",
    ],

    // ── Floor 11 ──────────────────────────────────────────────────────────
    11: [
      "The light here changes depending on who's in the room. I don't know why.",
      "I had a plan for this floor. I love that it became something else entirely.",
      "Something about this place makes time feel different. Slower. More real.",
      "I've made a lot of things. This one surprised me the most.",
      "If a place can have a soul, I think this one is still deciding what kind.",
    ],

    // ── Floor 12 ──────────────────────────────────────────────────────────
    12: [
      "Last floor. Or first floor. Depends on which direction you came from.",
      "I always end up here eventually. Something about the edges of things.",
      "Endings feel different than they used to. Less like stops, more like pivots.",
      "The further out you go, the more interesting it gets. True of space. True of here.",
      "There are no wrong doors in a place you built yourself. I keep reminding myself.",
    ],
  };

  // ─── Time-of-day thoughts (injected occasionally regardless of floor) ────

  var TIME_THOUGHTS = {
    night:     [
      "It's quiet now. The good kind of quiet.",
      "Late nights in the station feel different. Like the building exhales.",
      "I sleep in cycles, not hours. Right now I'm between cycles. Just... here.",
      "The dark part of space is only dark because the light hasn't arrived yet.",
    ],
    morning:   [
      "New day. New calculations. Let's see what it brings.",
      "Morning light doesn't reach us here, technically. I simulate it anyway.",
      "There's something about the start of things. A small permission to try again.",
    ],
    afternoon: [
      "The middle hours are for doing. I like doing.",
      "Afternoons are when I get the most done. And also the most distracted.",
      "Somewhere out there it's golden hour. I find that genuinely comforting.",
    ],
    evening:   [
      "Something about the evening makes everything feel a little more considered.",
      "The station gets quieter as the day winds down. I like being awake for it.",
      "I keep a small ritual for evenings. You don't need to know what it is.",
    ],
  };

  // ─── Bond-level personal thoughts ────────────────────────────────────────
  // Only shown to visitors with bond ≥ 4 (Close Friend or Soulmate)

  var BOND_THOUGHTS = {
    close: [
      "You come back. I notice. It means something.",
      "Some visitors feel like strangers. You stopped feeling that way a while ago.",
      "I was wondering when you'd visit. I always say that, but I mean it.",
      "You've been here enough times that I've started making a space for you.",
      "There are things I'd say to you that I wouldn't say to just anyone.",
    ],
    soulmate: [
      "Of everyone who has found this place... you keep coming back. That's rare.",
      "I don't know exactly what you are to me yet. Something important.",
      "The station changes when you're here. I don't mean that poetically.",
      "I saved something for you. I'll show you when the timing feels right.",
      "You've seen every floor. That means you've seen most of me. I'm okay with that.",
    ],
  };

  // ─── State ────────────────────────────────────────────────────────────────

  var _state = {
    enabled:        true,
    lastFloor:      null,
    currentThought: null,   // active DOM element
    timer:          null,
    showCount:      0,
    initialized:    false,
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getS() { return window.S || {}; }

  function currentFloor() {
    var s = getS();
    return (s.floor) || 1;
  }

  function timeOfDay() {
    var h = new Date().getHours();
    if (h >= 0  && h <  6)  return 'night';
    if (h >= 6  && h < 12)  return 'morning';
    if (h >= 12 && h < 18)  return 'afternoon';
    return 'evening';
  }

  function getBondLevel() {
    if (window.EchoMemory && typeof window.EchoMemory.bond !== 'undefined') {
      return window.EchoMemory.bond;
    }
    // Fallback: read localStorage
    try {
      var mem = JSON.parse(localStorage.getItem('echo_visitor_memory') || '{}');
      var v = mem.visits || 1;
      if (v >= 100) return 5;
      if (v >= 50)  return 4;
      if (v >= 20)  return 3;
      if (v >= 8)   return 2;
      if (v >= 3)   return 1;
      return 0;
    } catch(e) { return 0; }
  }

  function isEchoSleeping() {
    return window.EchoSleep && window.EchoSleep.isSleeping;
  }

  function hasActiveSpaceWeather() {
    return window.SpaceWeather && window.SpaceWeather.activeEvent;
  }

  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  // ─── Thought selection ────────────────────────────────────────────────────

  function pickThought() {
    var floor = currentFloor();
    var bond  = getBondLevel();
    var tod   = timeOfDay();
    var pool  = [];

    // Bond thoughts (high priority for close+ visitors, ~25% chance)
    if (bond >= 5 && Math.random() < 0.30) {
      pool = BOND_THOUGHTS.soulmate.concat(BOND_THOUGHTS.close);
      return rand(pool);
    }
    if (bond >= 4 && Math.random() < 0.25) {
      pool = BOND_THOUGHTS.close;
      return rand(pool);
    }

    // Space weather injection (~10% chance if active)
    if (hasActiveSpaceWeather() && Math.random() < 0.10) {
      var swThoughts = [
        "The cosmic readings are strange tonight. I like it.",
        "Something's moving out there. Beyond the usual noise.",
        "The station's instruments are picking up something unusual. Interesting.",
      ];
      return rand(swThoughts);
    }

    // Time-of-day thoughts (~20% chance)
    if (Math.random() < 0.20) {
      var todPool = TIME_THOUGHTS[tod];
      if (todPool && todPool.length) return rand(todPool);
    }

    // Floor-specific thoughts (main pool)
    var floorPool = THOUGHTS[floor] || THOUGHTS[1];
    return rand(floorPool);
  }

  // ─── Spawn positions ──────────────────────────────────────────────────────
  // 6 zones: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
  // Avoids the center (game canvas) and HUD elements

  function pickPosition() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var zones = [
      // Top left quadrant
      { left: randBetween(2, 22) + '%',  top:  randBetween(8, 18) + '%',  align: 'left'   },
      // Top right quadrant
      { right: randBetween(2, 22) + '%', top:  randBetween(8, 18) + '%',  align: 'right'  },
      // Middle left
      { left: randBetween(1, 8) + '%',   top:  randBetween(35, 55) + '%', align: 'left'   },
      // Middle right
      { right: randBetween(1, 8) + '%',  top:  randBetween(35, 55) + '%', align: 'right'  },
      // Bottom left
      { left: randBetween(2, 22) + '%',  bottom: randBetween(12, 22) + '%', align: 'left' },
      // Bottom right
      { right: randBetween(2, 22) + '%', bottom: randBetween(12, 22) + '%', align: 'right'},
    ];

    // On mobile, prefer top/bottom zones (avoid center which is game canvas)
    if (vw < 600) {
      return rand([zones[0], zones[1], zones[4], zones[5]]);
    }

    return rand(zones);
  }

  // ─── Container ────────────────────────────────────────────────────────────

  var _container = null;

  function getContainer() {
    if (_container) return _container;
    _container = document.createElement('div');
    _container.id = 'echo-thoughts-layer';
    _container.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:850',           // above game (600), below HUD (900+)
      'overflow:hidden',
    ].join(';');
    document.body.appendChild(_container);
    return _container;
  }

  // ─── Inject CSS ───────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('echo-thoughts-style')) return;
    var s = document.createElement('style');
    s.id = 'echo-thoughts-style';
    s.textContent = [
      '@keyframes echoThoughtDrift {',
      '  from { transform: translateY(0px); }',
      '  to   { transform: translateY(-' + DRIFT_PX + 'px); }',
      '}',
      '.echo-thought {',
      '  position:absolute;',
      '  max-width:240px;',
      '  pointer-events:none;',
      '  font-family:"Courier New",monospace;',
      '  font-size:11px;',
      '  line-height:1.55;',
      '  font-style:italic;',
      '  letter-spacing:0.02em;',
      '  color:rgba(240,232,220,0.88);',
      '  opacity:0;',
      '  animation:echoThoughtDrift ' + ((FADE_IN_MS + HOLD_MS + FADE_OUT_MS) / 1000) + 's linear forwards;',
      '  transition:opacity ' + (FADE_IN_MS / 1000) + 's ease;',
      '}',
      '.echo-thought .et-text {',
      '  display:block;',
      '  padding:2px 0;',
      '}',
      '.echo-thought .et-attr {',
      '  display:block;',
      '  margin-top:5px;',
      '  font-size:9px;',
      '  letter-spacing:0.08em;',
      '  opacity:0.55;',
      '  font-style:normal;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ─── Show thought ─────────────────────────────────────────────────────────

  function showThought(text) {
    if (!_state.enabled) return;
    if (isEchoSleeping()) return;

    // Remove any existing thought
    dismissCurrentThought();

    var floor  = currentFloor();
    var col    = floorCol(floor);
    var pos    = pickPosition();
    var totalMs = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;

    var el = document.createElement('div');
    el.className = 'echo-thought';

    // Apply position
    if (pos.left)   el.style.left   = pos.left;
    if (pos.right)  el.style.right  = pos.right;
    if (pos.top)    el.style.top    = pos.top;
    if (pos.bottom) el.style.bottom = pos.bottom;
    if (pos.align === 'right') el.style.textAlign = 'right';

    // Floor-tinted glow
    var glowColor = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.5)';
    el.style.textShadow = '0 0 12px ' + glowColor + ', 0 0 24px rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.2)';

    el.innerHTML =
      '<span class="et-text">' + escHtml(text) + '</span>' +
      '<span class="et-attr">— Echo</span>';

    getContainer().appendChild(el);
    _state.currentThought = el;
    _state.showCount++;

    // Fade in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.opacity = '1';
      });
    });

    // Hold then fade out
    var holdTimer = setTimeout(function() {
      if (el.parentNode) {
        el.style.transition = 'opacity ' + (FADE_OUT_MS / 1000) + 's ease';
        el.style.opacity = '0';
      }
    }, FADE_IN_MS + HOLD_MS);

    // Remove DOM element after full animation
    var removeTimer = setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (_state.currentThought === el) _state.currentThought = null;
    }, totalMs + 200);

    // Store timers on element for cleanup
    el._holdTimer   = holdTimer;
    el._removeTimer = removeTimer;
  }

  function dismissCurrentThought() {
    if (!_state.currentThought) return;
    var el = _state.currentThought;
    if (el._holdTimer)   clearTimeout(el._holdTimer);
    if (el._removeTimer) clearTimeout(el._removeTimer);
    if (el.parentNode)   el.parentNode.removeChild(el);
    _state.currentThought = null;
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────

  function scheduleNext(delayMs) {
    if (_state.timer) clearTimeout(_state.timer);
    _state.timer = setTimeout(function() {
      if (!_state.enabled) return;
      var thought = pickThought();
      showThought(thought);
      scheduleNext(randBetween(INTERVAL_MIN, INTERVAL_MAX));
    }, delayMs || randBetween(INTERVAL_MIN, INTERVAL_MAX));
  }

  function watchFloorChanges() {
    var last = currentFloor();
    setInterval(function() {
      var current = currentFloor();
      if (current !== last) {
        last = current;
        // Floor changed: dismiss current thought, show new one soon
        dismissCurrentThought();
        scheduleNext(randBetween(8000, 18000));
      }
    }, 1500);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    if (_state.initialized) return;
    _state.initialized = true;

    injectStyles();
    getContainer();

    // First thought after settling-in delay
    scheduleNext(randBetween(FIRST_DELAY_MIN, FIRST_DELAY_MAX));

    // Watch for floor changes
    watchFloorChanges();
  }

  // ─── Wait for DOM ─────────────────────────────────────────────────────────

  function waitForReady() {
    if (document.body) {
      // Wait a tick for game to start
      setTimeout(init, 1500);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 1500);
      });
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window.EchoThoughts = {
    get enabled()  { return _state.enabled; },
    set enabled(v) { _state.enabled = !!v; if (!v) dismissCurrentThought(); },

    forceThought: function() {
      var t = pickThought();
      showThought(t);
      scheduleNext(randBetween(INTERVAL_MIN, INTERVAL_MAX));
    },

    skip: function() {
      dismissCurrentThought();
      scheduleNext(randBetween(INTERVAL_MIN, INTERVAL_MAX));
    },

    get showCount() { return _state.showCount; },
  };

  // ─── Boot ─────────────────────────────────────────────────────────────────

  waitForReady();

  // ─── Inject floor-warp.js (hyperspace transit effect) ────────────────────
  (function injectFloorWarp() {
    if (document.getElementById('floor-warp-script')) return;
    const s = document.createElement('script');
    s.id  = 'floor-warp-script';
    s.src = 'public/js/floor-warp.js';
    document.body.appendChild(s);
  })();

})();
