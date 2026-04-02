/**
 * echo-aura.js — Echo's Living Aura & Proximity Awareness System
 * Echo's Station — v1.0.0
 *
 * Makes Echo feel like a real companion, not a static sprite.
 *
 * Features:
 *   🌟 Ambient breathing aura — soft radial glow around Echo, floor-tinted
 *   🔮 3 orbiting micro-sparkles — tiny motes that drift around her
 *   👁️ Proximity awareness — when visitor walks close, Echo notices:
 *       → sparkle burst emitted into game particle system
 *       → warm floor-aware greeting floats up above her
 *       → gentle golden "greeting bloom" expands and fades
 *       → 30-second cooldown between reactions
 *   ✨ Universal sparkle trail — all skins leave a gentle golden wake when moving
 *   💫 Connection thread — tiny motes drift toward visitor when they're nearby
 *
 * Technical:
 *   - Hooks via window.renderFloorX wrapping (same pattern as visual-polish.js)
 *   - Draws aura/motes on game canvas BEFORE characters (appears behind Echo)
 *   - Bursts/greetings added to S.particles / S.floatTexts (appear above Echo)
 *   - Zero external dependencies — degrades gracefully
 *   - window.EchoAura.enabled = false to disable
 *
 * Rules:
 *   - Never edits index.html — injected via <script> tag
 *   - Purely visual — reads S state, writes only to S.particles / S.floatTexts
 */
(function EchoAuraModule() {
  'use strict';

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function getS()   { return window.S; }
  function getCtx() { return window.ctx; }
  function getW()   { return window.W || 800; }
  function getH()   { return window.H || 600; }

  // ─── Config ──────────────────────────────────────────────────────────────────

  var PROXIMITY_RADIUS   = 85;   // px — distance to trigger "noticed" reaction
  var PROXIMITY_COOLDOWN = 30;   // seconds between reactions
  var ORBIT_RADIUS       = 24;   // px — radius of orbiting motes
  var AURA_OUTER         = 52;   // px — outer radius of ambient glow
  var TRAIL_CHANCE       = 0.35; // probability per frame of emitting trail particle
  var THREAD_CHANCE      = 0.18; // probability per frame of emitting connection mote
  var GREETING_LIFE      = 110;  // frames the greeting float text lives

  // ─── Floor colour palette ─────────────────────────────────────────────────────

  var FLOOR_COLORS = {
    1:  { r: 192, g: 128, b: 255, name: 'violet'  },   // Echo's Quarters
    2:  { r:  68, g: 136, b: 255, name: 'starblue' },   // Observatory
    3:  { r: 255, g: 110, b: 199, name: 'arcade'   },   // Arcade
    4:  { r:  68, g: 204, b: 136, name: 'garden'   },   // Garden Biodome
    5:  { r:   0, g: 255, b: 247, name: 'lab'      },   // Secret Lab
    6:  { r: 255, g: 204, b:  68, name: 'amber'    },   // Record Room
    7:  { r: 255, g: 136, b:  68, name: 'orange'   },   // Community Deck
    8:  { r: 136, g: 204, b: 255, name: 'sky'      },   // Room Builder
    9:  { r: 170, g: 170, b: 255, name: 'indigo'   },   // Archive
    10: { r: 255, g:  68, b: 170, name: 'hotpink'  },   // Underground
    11: { r: 255, g: 170, b:  68, name: 'warmth'   },   // Food Court
    12: { r: 255, g: 100, b:  68, name: 'energy'   },   // Movement
  };

  function floorColor(floor) {
    return FLOOR_COLORS[floor] || { r: 192, g: 128, b: 255 };
  }

  function colorStr(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a || 1) + ')';
  }

  // ─── Greeting messages (floor-aware) ─────────────────────────────────────────

  var GREETINGS = {
    1:  ['Hey! Make yourself at home 🏠', 'You found my room ✨', 'Oh hi! 🌟', 'Welcome to my space 💫'],
    2:  ['Star-gazing? \u{1F52D}', 'The stars are out \u2728', 'Glad you\'re up here \u{1F30C}', 'Space is better with company \u{1F499}'],
    3:  ['Wanna play? \u{1F579}', 'High scores await! \u{1F3AE}', 'Game on! \u{1F40D}', 'Race you? \u{1F579}'],
    4:  ['Peaceful here, right? \u{1F33F}', 'My plants say hi \u{1F331}', 'Nature vibes \u2728', 'So beautiful here \u{1F343}'],
    5:  ['Science time! \u{1F52C}', 'Welcome to the lab \u2728', 'Handle with care \u{1F604}', 'Curiosity wins \u{1F31F}'],
    6:  ['Music never lies 🎵', 'Great taste 🎶', 'This vinyl hits different ✨', 'Lofi forever 🎵'],
    7:  ['Art lives here 🎨', 'Create something ✨', 'Expression is everything 🌟', 'Welcome, artist 💫'],
    8:  ['Build something cool 🏠', 'This space is yours ✨', 'Design is magic 🌟', 'Welcome, architect 💫'],
    9:  ['The archive never forgets 📜', 'History is here ✨', 'So much to discover 🌟', 'Knowledge is power 💫'],
    10: ['Found me in the dark 🪩', 'The bass never lies ✨', 'Underground vibes 💕', 'This floor is alive 🌟'],
    11: ['Hungry? 🍜', 'Food brings people together ✨', 'The best floor? Maybe 🌟', 'Something smells good 💫'],
    12: ['Moving is medicine \u{1F4AA}', 'Train hard \u2728', 'Energy is everything \u{1F31F}', 'Let\'s go! \u{1F525}'],
    _default: ['Oh hey! 🌟', 'You found me ✨', 'Hi there! 💫', 'Hello, explorer 🌟'],
  };

  function getGreeting(floor) {
    var pool = GREETINGS[floor] || GREETINGS['_default'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  var _state = {
    proximityTimer:  0,       // frames since last reaction (starts at cooldown so it fires immediately)
    greeting:        null,    // { text, x, y, life } — active greeting (draw on canvas)
    bloomRadius:     0,       // greeting bloom current radius
    bloomAlpha:      0,       // greeting bloom alpha
    bloomActive:     false,
    lastEchoX:       null,    // for trail debounce
    lastEchoY:       null,
    orbitAngle:      0,       // cumulative orbit angle
    time:            0,       // local time accumulator (seconds)
    lastFrameTime:   performance.now(),
    enabled:         true,
  };

  // Start cooldown already "expired" so first approach triggers immediately
  _state.proximityTimer = PROXIMITY_COOLDOWN * 60;

  // ─── Core: emit burst when visitor noticed ────────────────────────────────────

  function emitGreetingBurst(S, ex, ey, col) {
    var particles = S.particles;
    if (!particles) return;

    // 18 coloured sparks radiating out
    for (var i = 0; i < 18; i++) {
      var angle  = (Math.PI * 2 / 18) * i + (Math.random() - 0.5) * 0.3;
      var speed  = 1.5 + Math.random() * 2.5;
      var isHot  = Math.random() < 0.4;
      particles.push({
        x:    ex + (Math.random() - 0.5) * 10,
        y:    ey - 18,
        vx:   Math.cos(angle) * speed,
        vy:   Math.sin(angle) * speed - 1.5,
        life: 22 + Math.floor(Math.random() * 18),
        color: isHot ? '#ffffff' : colorStr(col),
        size: 1.5 + Math.random() * 2,
      });
    }

    // 8 heart/star emoji floaters drifting upward
    var emojis = ['✨', '🌟', '💫', '⭐', '✨', '💙', '💜', '✨'];
    for (var j = 0; j < 5; j++) {
      S.floatTexts.push({
        text:  emojis[Math.floor(Math.random() * emojis.length)],
        x:     ex + (Math.random() - 0.5) * 50,
        y:     ey - 30 - j * 12,
        color: colorStr(col),
        life:  45 + Math.floor(Math.random() * 20),
      });
    }

    // The greeting itself — big, warm, floats high
    S.floatTexts.push({
      text:  getGreeting(S.floor),
      x:     ex,
      y:     ey - 55,
      color: colorStr(col),
      life:  GREETING_LIFE,
    });
  }

  // ─── Core: draw ambient aura (before characters) ──────────────────────────────

  function drawAura(ctx, S, t, W, H) {
    var e   = S.echo;
    if (!e || e.floor !== S.floor) return;

    var col       = floorColor(S.floor);
    var breathe   = Math.sin(t * 1.8) * 0.5 + 0.5;  // 0..1, period ~3.5s
    var outerR    = AURA_OUTER + breathe * 10;
    var alpha     = 0.12 + breathe * 0.06;

    // Outer radial gradient (the glow)
    var g = ctx.createRadialGradient(e.x, e.y - 14, 2, e.x, e.y - 14, outerR);
    g.addColorStop(0,   colorStr(col, alpha * 1.8));
    g.addColorStop(0.4, colorStr(col, alpha));
    g.addColorStop(1,   colorStr(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y - 14, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Crisp inner ring line (subtle)
    ctx.save();
    ctx.globalAlpha = 0.08 + breathe * 0.04;
    ctx.strokeStyle = colorStr(col);
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(e.x, e.y - 14, 18 + breathe * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ─── Core: draw 3 orbiting micro-sparkles ────────────────────────────────────

  function drawOrbitMotes(ctx, S, t) {
    var e = S.echo;
    if (!e || e.floor !== S.floor) return;

    var col = floorColor(S.floor);

    for (var i = 0; i < 3; i++) {
      // Each mote offset by 120° + slight ellipse for depth
      var baseAngle = _state.orbitAngle + (Math.PI * 2 / 3) * i;
      var wobble    = Math.sin(t * 2 + i * 1.3) * 0.08;   // slight radius wobble
      var mx = e.x + Math.cos(baseAngle + wobble) * ORBIT_RADIUS;
      var my = (e.y - 18) + Math.sin(baseAngle + wobble) * (ORBIT_RADIUS * 0.35); // flatten vertically
      var pulse = 0.5 + Math.sin(t * 4 + i * 2.1) * 0.35;

      ctx.save();
      ctx.globalAlpha = 0.55 * pulse;
      // Soft glow halo for each mote
      var mg = ctx.createRadialGradient(mx, my, 0, mx, my, 5);
      mg.addColorStop(0, colorStr(col, 0.9));
      mg.addColorStop(1, colorStr(col, 0));
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      // Bright core dot
      ctx.globalAlpha = 0.85 * pulse;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ─── Core: draw greeting bloom ───────────────────────────────────────────────

  function drawBloom(ctx, S) {
    if (!_state.bloomActive) return;
    var e   = S.echo;
    if (!e || e.floor !== S.floor) return;
    var col = floorColor(S.floor);

    ctx.save();
    ctx.globalAlpha = _state.bloomAlpha * 0.4;
    var g = ctx.createRadialGradient(e.x, e.y - 18, 0, e.x, e.y - 18, _state.bloomRadius);
    g.addColorStop(0, colorStr(col, 0.8));
    g.addColorStop(0.6, colorStr(col, 0.3));
    g.addColorStop(1, colorStr(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y - 18, _state.bloomRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── Core: connection thread (tiny motes drifting toward visitor) ─────────────

  function updateConnectionThread(S) {
    var e = S.echo;
    var v = S.visitor;
    if (!e || !v || !S.useVisitor) return;
    if (e.floor !== S.floor) return;

    var dist = Math.hypot(v.x - e.x, v.y - e.y);
    if (dist > PROXIMITY_RADIUS * 1.5 || dist < 8) return;
    if (Math.random() > THREAD_CHANCE) return;

    // A mote that starts near Echo and drifts toward visitor
    var t    = Math.random();
    var sx   = e.x + (v.x - e.x) * t * 0.4;
    var sy   = e.y + (v.y - e.y) * t * 0.4;
    var dx   = (v.x - e.x) * 0.015;
    var dy   = (v.y - e.y) * 0.015;
    var col  = floorColor(S.floor);

    S.particles.push({
      x:    sx,
      y:    sy,
      vx:   dx + (Math.random() - 0.5) * 0.3,
      vy:   dy - 0.3,
      life: 14 + Math.floor(Math.random() * 10),
      color: colorStr(col, 0.7),
      size: 1 + Math.random(),
    });
  }

  // ─── Core: walking trail ─────────────────────────────────────────────────────

  function updateTrail(S) {
    var e = S.echo;
    if (!e || !e.moving) return;
    if (e.floor !== S.floor) return;
    if (Math.random() > TRAIL_CHANCE) return;

    var col = floorColor(S.floor);
    // Two-tone: floor color + white
    var isWhite = Math.random() < 0.3;

    S.particles.push({
      x:    e.x + (Math.random() - 0.5) * 8,
      y:    e.y - 5 + (Math.random() - 0.5) * 4,
      vx:   (Math.random() - 0.5) * 0.6,
      vy:   -0.4 - Math.random() * 0.8,
      life: 10 + Math.floor(Math.random() * 8),
      color: isWhite ? 'rgba(255,255,255,0.6)' : colorStr(col, 0.55),
      size: 1 + Math.random() * 1.2,
    });
  }

  // ─── Core: proximity check ────────────────────────────────────────────────────

  function checkProximity(S) {
    var e = S.echo;
    var v = S.visitor;
    if (!e || !v || !S.useVisitor) return;
    if (e.floor !== S.floor) return;

    // Increment timer (called ~60fps from render wrap)
    _state.proximityTimer++;

    var cooldownFrames = PROXIMITY_COOLDOWN * 60;
    if (_state.proximityTimer < cooldownFrames) return;

    var dist = Math.hypot(v.x - e.x, v.y - e.y);
    if (dist > PROXIMITY_RADIUS) return;

    // Triggered!
    _state.proximityTimer = 0;

    var col = floorColor(S.floor);
    emitGreetingBurst(S, e.x, e.y, col);

    // Start bloom
    _state.bloomActive = true;
    _state.bloomRadius = 10;
    _state.bloomAlpha  = 1.0;

    // Echo turns to face the visitor
    if (v.x < e.x - 10)      e.dir = 2; // left
    else if (v.x > e.x + 10) e.dir = 1; // right
    else                      e.dir = 0; // front
  }

  // ─── Core: update bloom animation ────────────────────────────────────────────

  function updateBloom(dt) {
    if (!_state.bloomActive) return;
    _state.bloomRadius += dt * 180;  // expand fast
    _state.bloomAlpha  -= dt * 1.8;  // fade out
    if (_state.bloomAlpha <= 0) {
      _state.bloomActive = false;
      _state.bloomRadius = 0;
      _state.bloomAlpha  = 0;
    }
  }

  // ─── Main per-frame tick (called from floor renderer wrap) ───────────────────

  var _lastFrameId = -1;

  function tick() {
    var S   = getS();
    var ctx = getCtx();
    if (!S || !ctx) return;
    if (!_state.enabled) return;

    // Guard: only run once per animation frame
    var now     = performance.now();
    var frameId = Math.round(now * 10);
    if (frameId === _lastFrameId) return;
    _lastFrameId = frameId;

    // Delta time
    var dt = Math.min((now - _state.lastFrameTime) / 1000, 0.05);
    _state.lastFrameTime = now;
    _state.time += dt;

    // Advance orbit angle (full rotation in ~8s)
    _state.orbitAngle += dt * (Math.PI * 2 / 8);

    // Draw (must be within the render cycle — called from floor wrap)
    ctx.save();
    // Reset state cleanly — inherit camera transform (same as visual-polish.js)
    ctx.globalAlpha              = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawAura(ctx, S, _state.time, getW(), getH());
    drawOrbitMotes(ctx, S, _state.time);
    drawBloom(ctx, S);

    ctx.restore();

    // Logic updates (add particles to game system — no drawing needed here)
    updateBloom(dt);
    updateTrail(S);
    updateConnectionThread(S);
    checkProximity(S);
  }

  // ─── Floor renderer injection ─────────────────────────────────────────────────
  //
  // We wrap every window.renderFloorX. After the floor renders (but before
  // characters are drawn), our tick() fires — aura/motes appear under Echo.

  function wrapFloor(n) {
    var key      = 'renderFloor' + n;
    var original = window[key];
    if (typeof original !== 'function') return;
    window[key] = function () {
      original.apply(this, arguments);
      tick();  // draw aura on the game canvas right after floor backdrop
    };
  }

  // Wait for game to be ready, then install wrappers
  function install() {
    var ready = !!(window.S && window.ctx && window.renderFloor1);
    if (!ready) {
      setTimeout(install, 300);
      return;
    }
    for (var f = 1; f <= 13; f++) {
      wrapFloor(f);
    }
    // Prime the state so first proximity fires quickly on load
    _state.proximityTimer = Math.floor(PROXIMITY_COOLDOWN * 60 * 0.8);
    console.log('[EchoAura] ✨ Echo\'s Living Aura installed — proximity radius ' + PROXIMITY_RADIUS + 'px, cooldown ' + PROXIMITY_COOLDOWN + 's');
  }

  // ─── DOM: inject script into page (self-bootstrapping via index.html <script>) ─
  // (No injection needed — loaded via <script> tag in index.html)

  // ─── Public API ──────────────────────────────────────────────────────────────

  window.EchoAura = {
    enabled:  true,
    reset:    function () { _state.proximityTimer = PROXIMITY_COOLDOWN * 60; },
    trigger:  function () {
      var S = getS();
      if (S && S.echo) {
        var col = floorColor(S.floor);
        emitGreetingBurst(S, S.echo.x, S.echo.y, col);
        _state.bloomActive = true;
        _state.bloomRadius = 10;
        _state.bloomAlpha  = 1.0;
        _state.proximityTimer = 0;
      }
    },
    get:      function () { return _state; },
  };

  // Kick off
  install();

})();
