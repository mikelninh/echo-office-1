/**
 * echo-sleep.js — Echo's Idle Sleep & Dream System
 * Echo's Station — v1.0.0
 *
 * After the visitor is idle for ~90s, Echo drifts into a dream state.
 * When you move again, she wakes up with a beautiful burst of energy.
 *
 * Sleep phases:
 *   awake    (0–60s)  : Normal — nothing changes
 *   drowsy   (60–90s) : Aura dims softly, occasional yawn thought
 *   sleeping (90s+)   : Full dream mode:
 *       → Zzz particles drift upward from Echo
 *       → Soft dream bubble bobs above her head (rotating dream icons)
 *       → Moonlit motes drift in slow arcs around her
 *       → If EchoAura is loaded, its glow dims to 20%
 *
 * Wake-up (any visitor movement while sleeping/drowsy):
 *       → Dream bubble "pops" — 24 sparkle fragments scatter
 *       → Warm burst of golden + floor-tinted particles
 *       → Float text: a sleepy-but-warm greeting
 *       → Aura pulses back to full brightness
 *       → 5-second immunity before sleep can start again
 *
 * API:
 *   window.EchoSleep.isSleeping   → bool
 *   window.EchoSleep.phase        → 'awake' | 'drowsy' | 'sleeping'
 *   window.EchoSleep.wake()       → force wake from console
 *   window.EchoSleep.enabled      → set false to disable
 *
 * Technical:
 *   - Same renderFloorX wrap pattern as echo-aura.js
 *   - Draws on main canvas; uses S.particles + S.floatTexts for bursts
 *   - Zero external dependencies — degrades gracefully
 */
(function EchoSleepModule() {
  'use strict';

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function getS()   { return window.S; }
  function getCtx() { return window.ctx; }
  function getW()   { return window.W || 800; }
  function getH()   { return window.H || 600; }

  // ─── Config ──────────────────────────────────────────────────────────────

  var DROWSY_THRESHOLD  = 60;   // seconds idle → drowsy
  var SLEEP_THRESHOLD   = 90;   // seconds idle → sleeping
  var WAKE_IMMUNITY     = 5;    // seconds after wake before sleep can start again
  var ZZZ_CHANCE        = 0.012; // probability per frame of emitting a Zzz
  var MOTE_CHANCE       = 0.025; // probability per frame of emitting a dream mote
  var DREAM_BOB_SPEED   = 1.4;  // how fast the dream bubble bobs (rad/s)
  var DREAM_ICON_SPEED  = 0.5;  // how fast icons rotate inside bubble (rad/s)

  // ─── Dream icons (text emoji / symbols) ──────────────────────────────────

  var DREAM_ICONS = ['☆', '🌙', '☕', '🐱', '✨', '💻', '🌸', '💜'];

  // ─── Wake greetings ───────────────────────────────────────────────────────

  var WAKE_GREETINGS = [
    'Wh— oh! You\'re here! 💜',
    '...oh! Hi! 🌟',
    '*yawn* You came back ✨',
    'I was just resting my eyes! 😅',
    'Oh! Good, you\'re here 💫',
    '...the station missed you 🔮',
    'Pixel, it\'s not— oh, YOU! 😄',
  ];

  // ─── Floor colour palette (mirrors echo-aura) ────────────────────────────

  var FLOOR_COLORS = {
    1:  { r: 192, g: 128, b: 255 },
    2:  { r:  68, g: 136, b: 255 },
    3:  { r: 255, g: 110, b: 199 },
    4:  { r:  68, g: 204, b: 136 },
    5:  { r:   0, g: 255, b: 247 },
    6:  { r: 255, g: 204, b:  68 },
    7:  { r: 255, g: 136, b:  68 },
    8:  { r: 136, g: 204, b: 255 },
    9:  { r: 170, g: 170, b: 255 },
   10:  { r: 255, g:  68, b: 170 },
   11:  { r: 255, g: 170, b:  68 },
   12:  { r: 255, g: 100, b:  68 },
  };

  function floorCol(floor) {
    return FLOOR_COLORS[floor] || { r: 192, g: 128, b: 255 };
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a || 1) + ')';
  }

  // ─── State ────────────────────────────────────────────────────────────────

  var _state = {
    idleSeconds:     0,      // total seconds visitor has been idle
    phase:           'awake',
    wakeImmunity:    0,      // countdown seconds before sleep can re-trigger
    lastVisitorX:    -1,
    lastVisitorY:    -1,
    dreamAngle:      0,      // bubble bob angle (radians)
    iconAngle:       0,      // dream icon rotation (radians)
    iconIndex:       0,      // which dream icon is active
    iconTimer:       0,      // seconds since last icon change
    popActive:       false,  // dream bubble popping?
    popParticles:    [],     // small pop fragments
    drowsyYawnTimer: 0,      // countdown to next yawn thought while drowsy
    // Smooth aura dim target (0..1)
    auraDimTarget:   1.0,
    auraDimCurrent:  1.0,
  };

  // ─── Show a thought via the game's built-in system ───────────────────────

  function showThought(text) {
    if (typeof window.showThought === 'function') {
      window.showThought(text, 7);
    }
  }

  // ─── Emit wake burst into game particle / floatText systems ─────────────

  function emitWakeBurst(S) {
    var ex = S.echo.x;
    var ey = S.echo.y - 8;
    var col = floorCol(S.floor);

    // 24 scatter particles
    for (var i = 0; i < 24; i++) {
      var angle  = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.4;
      var speed  = 2.5 + Math.random() * 4;
      var colors = [
        'rgba(' + col.r + ',' + col.g + ',' + col.b + ',1)',
        '#ffd700', '#ffffff', '#fffacd',
      ];
      S.particles.push({
        x: ex + (Math.random() - 0.5) * 12,
        y: ey + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 50 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      });
    }

    // Pop the dream bubble fragments
    _state.popActive   = true;
    _state.popParticles = [];
    for (var j = 0; j < 14; j++) {
      var a2 = (Math.PI * 2 * j) / 14;
      _state.popParticles.push({
        x: ex,
        y: ey - 44,
        vx: Math.cos(a2) * (1.5 + Math.random() * 2.5),
        vy: Math.sin(a2) * (1.5 + Math.random() * 2.5) - 1,
        life: 40 + Math.random() * 25,
        maxLife: 65,
        icon: DREAM_ICONS[Math.floor(Math.random() * DREAM_ICONS.length)],
      });
    }

    // Float text
    var greeting = WAKE_GREETINGS[Math.floor(Math.random() * WAKE_GREETINGS.length)];
    S.floatTexts.push({
      text: greeting,
      x: ex - 60,
      y: ey - 60,
      color: rgba(col, 1),
      life: 130,
    });

    // Dim lift via EchoAura if available
    if (window.EchoAura && window.EchoAura.trigger) {
      window.EchoAura.trigger();
    }

    _state.auraDimTarget  = 1.0;
  }

  // ─── Draw Zzz particle ───────────────────────────────────────────────────

  function emitZzz(S) {
    var ex = S.echo.x;
    var ey = S.echo.y - 18;
    S.particles.push({
      x: ex + 8 + Math.random() * 10,
      y: ey - Math.random() * 4,
      vx: 0.3 + Math.random() * 0.4,
      vy: -0.6 - Math.random() * 0.5,
      life: 80 + Math.random() * 40,
      color: 'rgba(180,180,255,0.85)',
      size: 1 + Math.random(),
      isZzz: true,
      zzzChar: 'z',
      zzzScale: 0.8 + Math.random() * 0.6,
    });
  }

  // ─── Draw dream mote ─────────────────────────────────────────────────────

  function emitDreamMote(S) {
    var col = floorCol(S.floor);
    var ex  = S.echo.x;
    var ey  = S.echo.y;
    var angle = Math.random() * Math.PI * 2;
    S.particles.push({
      x: ex + Math.cos(angle) * (20 + Math.random() * 15),
      y: ey + Math.sin(angle) * (12 + Math.random() * 8) - 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - Math.random() * 0.4,
      life: 90 + Math.random() * 60,
      color: rgba(col, 0.55),
      size: 1.5 + Math.random(),
    });
  }

  // ─── Draw dream bubble on canvas ─────────────────────────────────────────

  function drawDreamBubble(ctx, S, dt) {
    var ex = S.echo.x;
    var ey = S.echo.y - 20;

    // Bob position
    _state.dreamAngle += DREAM_BOB_SPEED * dt;
    var bob  = Math.sin(_state.dreamAngle) * 3.5;

    var bx   = ex + 8;
    var by   = ey - 46 + bob;
    var brad = 22;  // bubble radius

    var col = floorCol(S.floor);

    // Glow halo
    var glow = ctx.createRadialGradient(bx, by, 0, bx, by, brad + 12);
    glow.addColorStop(0,   rgba(col, 0.25));
    glow.addColorStop(0.5, rgba(col, 0.08));
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(bx, by, brad + 14, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Bubble body
    ctx.beginPath();
    ctx.arc(bx, by, brad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,16,36,0.78)';
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(bx - 7, by - 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();

    // Tail (small circles leading to Echo)
    var tailSizes = [4, 2.5, 1.5];
    for (var t = 0; t < tailSizes.length; t++) {
      var ty = ey - 8 + t * 10 + bob * 0.3;
      var tx = ex + 2 + t * 2;
      ctx.beginPath();
      ctx.arc(tx, ty, tailSizes[t], 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, 0.35 - t * 0.08);
      ctx.fill();
    }

    // Dream icon (rotating selection)
    _state.iconTimer += dt;
    if (_state.iconTimer > 2.5) {
      _state.iconTimer  = 0;
      _state.iconIndex  = (_state.iconIndex + 1) % DREAM_ICONS.length;
    }
    _state.iconAngle += DREAM_ICON_SPEED * dt;
    var iconScale = 0.9 + Math.sin(_state.iconAngle * 2) * 0.08;

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(iconScale, iconScale);
    ctx.font = '14px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = 0.92;
    ctx.fillText(DREAM_ICONS[_state.iconIndex], 0, 0);
    ctx.restore();
  }

  // ─── Draw pop fragments (after wake) ─────────────────────────────────────

  function drawPopParticles(ctx, dt) {
    if (!_state.popActive) return;
    var any = false;
    for (var i = 0; i < _state.popParticles.length; i++) {
      var p = _state.popParticles[i];
      if (p.life <= 0) continue;
      any = true;
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.04;  // gentle gravity
      p.life -= 60 * dt;
      var alpha = Math.max(0, p.life / p.maxLife) * 0.9;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '10px serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, p.x, p.y);
      ctx.restore();
    }
    if (!any) {
      _state.popActive    = false;
      _state.popParticles = [];
    }
  }

  // ─── Draw drowsy closed-eye overlay on Echo ───────────────────────────────
  // Draws two soft half-arcs at Echo's approximate eye positions

  function drawDrowsyEyes(ctx, S) {
    var ex = S.echo.x;
    var ey = S.echo.y - 28;  // approx eye level above feet
    var alpha = (_state.idleSeconds - DROWSY_THRESHOLD) / (SLEEP_THRESHOLD - DROWSY_THRESHOLD);
    alpha = Math.min(1, Math.max(0, alpha)) * 0.75;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f0e8d8';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';

    // Left eye (drooping arc)
    ctx.beginPath();
    ctx.arc(ex - 4, ey, 3, 0, Math.PI);
    ctx.stroke();

    // Right eye
    ctx.beginPath();
    ctx.arc(ex + 4, ey, 3, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  // ─── Communicate dim level to EchoAura ────────────────────────────────────

  function applyAuraDim() {
    if (!window.EchoAura) return;
    var aura = window.EchoAura;
    if (typeof aura.setDim === 'function') {
      aura.setDim(_state.auraDimCurrent);
    }
    // EchoAura doesn't have setDim yet — we'll just note it for future hookup
    // The visual dimness is handled here in our own overlay if needed
  }

  // ─── Draw dim overlay (sleep aura softening) ─────────────────────────────

  function drawSleepOverlay(ctx, S) {
    // Subtle dark vignette that deepens as sleep intensifies
    var t = 0;
    if (_state.phase === 'drowsy') {
      t = Math.min(1, (_state.idleSeconds - DROWSY_THRESHOLD) / (SLEEP_THRESHOLD - DROWSY_THRESHOLD)) * 0.12;
    } else if (_state.phase === 'sleeping') {
      t = 0.12 + Math.min(1, (_state.idleSeconds - SLEEP_THRESHOLD) / 30) * 0.1;
    }
    if (t <= 0) return;

    var W = getW(), H = getH();
    ctx.save();
    var grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(5,4,16,0)');
    grad.addColorStop(1, 'rgba(5,4,16,' + t.toFixed(3) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ─── Main per-frame tick ─────────────────────────────────────────────────

  function tick(dt) {
    if (!window.EchoSleep || !window.EchoSleep.enabled) return;
    var S   = getS();
    var ctx = getCtx();
    if (!S || !ctx || !S.echo || !S.visitor) return;

    // ── Movement detection ──
    var vx = S.visitor.x;
    var vy = S.visitor.y;
    var moved = (_state.lastVisitorX !== -1) &&
                (Math.abs(vx - _state.lastVisitorX) > 0.5 ||
                 Math.abs(vy - _state.lastVisitorY) > 0.5);

    if (_state.lastVisitorX === -1) {
      _state.lastVisitorX = vx;
      _state.lastVisitorY = vy;
    }

    // ── Wake-up event ──
    if (moved && (_state.phase === 'sleeping' || _state.phase === 'drowsy')) {
      emitWakeBurst(S);
      _state.phase         = 'awake';
      _state.idleSeconds   = 0;
      _state.wakeImmunity  = WAKE_IMMUNITY;
      _state.popActive     = true;  // already set in emitWakeBurst
    }

    // ── Update idle timer ──
    if (moved) {
      _state.idleSeconds = 0;
    } else {
      _state.idleSeconds += dt;
    }

    _state.lastVisitorX = vx;
    _state.lastVisitorY = vy;

    // ── Wake immunity countdown ──
    if (_state.wakeImmunity > 0) {
      _state.wakeImmunity = Math.max(0, _state.wakeImmunity - dt);
    }

    // ── Phase transition ──
    if (_state.wakeImmunity <= 0) {
      if (_state.idleSeconds >= SLEEP_THRESHOLD) {
        if (_state.phase !== 'sleeping') {
          _state.phase = 'sleeping';
          // First-time sleep thought
          showThought('*drifts off to sleep...* 💤');
        }
      } else if (_state.idleSeconds >= DROWSY_THRESHOLD) {
        if (_state.phase === 'awake') {
          _state.phase = 'drowsy';
          _state.drowsyYawnTimer = 8 + Math.random() * 6;
          showThought('*yawns softly* 😴');
        }
      } else {
        if (_state.phase !== 'awake') _state.phase = 'awake';
      }
    } else {
      _state.phase = 'awake';
    }

    // ── Drowsy yawn thought ──
    if (_state.phase === 'drowsy') {
      _state.drowsyYawnTimer -= dt;
      if (_state.drowsyYawnTimer <= 0) {
        var drowsyThoughts = [
          'Just resting my eyes... 😪',
          '*yawn* ...five more minutes 💤',
          'Getting a little sleepy...',
          'So quiet in here... 🌙',
          'Pixel\'s already asleep 🐱',
        ];
        showThought(drowsyThoughts[Math.floor(Math.random() * drowsyThoughts.length)]);
        _state.drowsyYawnTimer = 12 + Math.random() * 8;
      }
    }

    // ── Smooth aura dim ──
    if (_state.phase === 'sleeping') {
      _state.auraDimTarget  = 0.22;
    } else if (_state.phase === 'drowsy') {
      var t = (_state.idleSeconds - DROWSY_THRESHOLD) / (SLEEP_THRESHOLD - DROWSY_THRESHOLD);
      _state.auraDimTarget  = 1.0 - t * 0.7;
    } else {
      _state.auraDimTarget  = 1.0;
    }
    _state.auraDimCurrent += (_state.auraDimTarget - _state.auraDimCurrent) * Math.min(1, dt * 1.5);
    applyAuraDim();

    // ── Draw ──
    drawSleepOverlay(ctx, S);

    if (_state.phase === 'drowsy' || _state.phase === 'sleeping') {
      drawDrowsyEyes(ctx, S);
    }

    if (_state.phase === 'sleeping') {
      // Zzz particles
      if (Math.random() < ZZZ_CHANCE) emitZzz(S);
      // Dream motes
      if (Math.random() < MOTE_CHANCE) emitDreamMote(S);
      // Dream bubble
      drawDreamBubble(ctx, S, dt);
    }

    // Pop fragments (even after waking, finish the pop animation)
    drawPopParticles(ctx, dt);
  }

  // ─── Floor renderer injection ─────────────────────────────────────────────

  var _lastTickTime = null;

  function wrapFloor(n) {
    var key      = 'renderFloor' + n;
    var original = window[key];
    if (typeof original !== 'function') return;
    window[key] = function () {
      original.apply(this, arguments);

      // Compute dt
      var now = performance.now();
      var dt  = _lastTickTime === null ? 0.016 : Math.min(0.1, (now - _lastTickTime) / 1000);
      _lastTickTime = now;

      try { tick(dt); } catch (e) { /* degrade gracefully */ }
    };
  }

  // ─── Install (wait for game ready) ───────────────────────────────────────

  function install() {
    var ready = !!(window.S && window.ctx && window.renderFloor1);
    if (!ready) {
      setTimeout(install, 300);
      return;
    }
    for (var f = 1; f <= 13; f++) {
      wrapFloor(f);
    }
    console.log('[EchoSleep] 💤 Installed — drowsy@' + DROWSY_THRESHOLD + 's, sleep@' + SLEEP_THRESHOLD + 's');
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window.EchoSleep = {
    enabled: true,
    get isSleeping() { return _state.phase === 'sleeping'; },
    get phase()      { return _state.phase; },
    get idleSeconds(){ return _state.idleSeconds; },
    wake: function () {
      var S = getS();
      if (S && (_state.phase === 'sleeping' || _state.phase === 'drowsy')) {
        emitWakeBurst(S);
        _state.phase        = 'awake';
        _state.idleSeconds  = 0;
        _state.wakeImmunity = WAKE_IMMUNITY;
      }
    },
  };

  // Kick off
  install();

})();
