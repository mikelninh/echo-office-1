/**
 * echo-startrail.js — Visitor & Echo Stardust Trail System
 * Echo's Station — v1.0.0
 *
 * As the visitor and Echo move through the station, they leave glowing
 * stardust trails behind them. Footprints glow and fade. The floor
 * remembers where you've been.
 *
 * Features:
 *   ✦ Visitor movement  → floor-tinted sparkle particles + glowing footprints
 *   ✦ Echo movement     → soft purple sparkle trail + footprints
 *   ✦ Mouse cursor      → star particles track your cursor (desktop)
 *   ✦ Floor arrival     → starburst from visitor's feet when floor changes
 *   ✦ Footprints        → soft radial glows that bloom and fade over ~7s
 *   ✦ Floor-aware       → every floor has its own signature trail color
 *
 * API:
 *   window.EchoStarTrail.enabled         → toggle on/off
 *   window.EchoStarTrail.footprints      → current footprint array (read)
 *   window.EchoStarTrail.mouseEnabled    → toggle cursor trail
 *
 * Technical:
 *   - Same renderFloorX wrap pattern as echo-aura.js / echo-sleep.js
 *   - Footprints drawn directly on canvas (radial glows, self-managed)
 *   - Movement sparkles injected into S.particles
 *   - Zero external dependencies — degrades gracefully
 */
(function EchoStarTrailModule() {
  'use strict';

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function getS()   { return window.S; }
  function getCtx() { return window.ctx; }

  // ─── Floor colour palette ─────────────────────────────────────────────────

  var FLOOR_COLORS = {
    1:  { r: 220, g: 150, b:  80 },  // Bar — warm amber
    2:  { r:  68, g: 136, b: 255 },  // Observatory — cool blue
    3:  { r: 255, g: 100, b: 200 },  // Club — hot pink
    4:  { r:  60, g: 200, b: 120 },  // Lounge — mint green
    5:  { r:   0, g: 220, b: 210 },  // Gym — cyan
    6:  { r: 255, g: 210, b:  55 },  // Gallery — gold
    7:  { r: 255, g: 130, b:  60 },  // Library — orange
    8:  { r: 255, g: 175, b:  85 },  // Kitchen — peach
    9:  { r: 170, g: 100, b: 255 },  // Spa — lavender
   10:  { r:  40, g: 210, b: 190 },  // Underground — teal
   11:  { r: 255, g: 185, b:  90 },  // Food — warm yellow
   12:  { r: 220, g:  55, b: 210 },  // Rooftop — magenta
   13:  { r: 200, g: 175, b: 255 },  // Podcast — soft violet
  };

  var ECHO_COLOR = { r: 192, g: 100, b: 255 }; // Echo always purple

  function floorCol(floor) {
    return FLOOR_COLORS[floor] || { r: 155, g: 89, b: 182 };
  }

  function rgba(col, a) {
    return 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + a.toFixed(3) + ')';
  }

  // ─── State ────────────────────────────────────────────────────────────────

  var _state = {
    // Visitor tracking
    lastVx: null, lastVy: null,
    vDistSincePrint: 0,

    // Echo tracking
    lastEx: null, lastEy: null,
    eDistSincePrint: 0,

    // Footprints (drawn on canvas each frame, self-fade)
    footprints: [],

    // Floor change detection
    lastFloor: null,

    // Mouse cursor trail
    mouseX: -9999, mouseY: -9999,
    lastMouseX: -9999, lastMouseY: -9999,
    mouseListening: false,

    // dt
    lastTickTime: null,
  };

  // ─── Config ───────────────────────────────────────────────────────────────

  var CFG = {
    // How far visitor must travel before a new footprint is placed
    V_FOOTPRINT_INTERVAL: 18,   // px
    // How far Echo must travel before a new footprint is placed
    E_FOOTPRINT_INTERVAL: 24,   // px
    // Footprint lifetime in seconds
    FOOTPRINT_LIFE: 7.0,
    // Max footprints stored (old ones trimmed)
    MAX_FOOTPRINTS: 70,
    // Probability per frame to emit a movement sparkle while moving
    SPARK_CHANCE: 0.45,
    // Echo sparkle chance (subtler)
    ECHO_SPARK_CHANCE: 0.25,
    // Visitor sparkle particle lifetime frames
    SPARK_LIFE: 16,
    // Cursor sparkle particle lifetime frames
    CURSOR_SPARK_LIFE: 12,
  };

  // ─── Emit sparkle into S.particles ───────────────────────────────────────

  function emitSparkle(S, x, y, col, scale) {
    if (!S.particles) return;
    scale = scale || 1;
    S.particles.push({
      x:    x + (Math.random() - 0.5) * 8,
      y:    y + 1 + Math.random() * 5,
      vx:   (Math.random() - 0.5) * 0.7 * scale,
      vy:   (-0.3 - Math.random() * 0.7) * scale,
      life: Math.floor(CFG.SPARK_LIFE * (0.7 + Math.random() * 0.6)),
      color: rgba(col, 0.55 + Math.random() * 0.25),
    });
  }

  // ─── Floor-arrival burst ──────────────────────────────────────────────────

  function emitArrivalBurst(S, x, y, col) {
    if (!S.particles) return;
    var count = 18;
    for (var i = 0; i < count; i++) {
      var angle  = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      var speed  = 0.8 + Math.random() * 1.4;
      S.particles.push({
        x:    x + (Math.random() - 0.5) * 6,
        y:    y + 4,
        vx:   Math.cos(angle) * speed,
        vy:   Math.sin(angle) * speed * 0.6 - 0.4,
        life: 20 + Math.floor(Math.random() * 16),
        color: rgba(col, 0.65 + Math.random() * 0.25),
      });
    }
    // Center flash
    S.particles.push({
      x: x, y: y + 4,
      vx: 0, vy: -0.5,
      life: 14,
      color: 'rgba(255,255,255,0.8)',
    });
  }

  // ─── Add footprint ────────────────────────────────────────────────────────

  function addFootprint(x, y, col, isEcho) {
    _state.footprints.push({
      x: x,
      y: y + 4,           // slightly below center (at floor level)
      life: CFG.FOOTPRINT_LIFE,
      maxLife: CFG.FOOTPRINT_LIFE,
      r: col.r, g: col.g, b: col.b,
      isEcho: isEcho,
    });
    // Trim oldest
    if (_state.footprints.length > CFG.MAX_FOOTPRINTS) {
      _state.footprints.shift();
    }
  }

  // ─── Draw all footprints ──────────────────────────────────────────────────

  function drawFootprints(ctx, dt) {
    for (var i = _state.footprints.length - 1; i >= 0; i--) {
      var fp = _state.footprints[i];
      fp.life -= dt;
      if (fp.life <= 0) {
        _state.footprints.splice(i, 1);
        continue;
      }

      var t     = fp.life / fp.maxLife;         // 1→0 as it fades
      var bloom = 1 - t;                         // 0→1 (footprint expands slightly as it fades)
      var alpha = t * (fp.isEcho ? 0.18 : 0.30); // visitors slightly brighter
      var radius = (fp.isEcho ? 5 : 6) + bloom * 4;

      // Soft radial glow
      try {
        var grad = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, radius);
        grad.addColorStop(0, 'rgba(' + fp.r + ',' + fp.g + ',' + fp.b + ',' + (alpha * 2.0).toFixed(3) + ')');
        grad.addColorStop(0.5, 'rgba(' + fp.r + ',' + fp.g + ',' + fp.b + ',' + alpha.toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + fp.r + ',' + fp.g + ',' + fp.b + ',0)');
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } catch (e) { /* ignore */ }
    }
  }

  // ─── Mouse listener setup ─────────────────────────────────────────────────

  function ensureMouseListener() {
    if (_state.mouseListening) return;
    var canvas = document.querySelector('canvas');
    if (!canvas) return;
    canvas.addEventListener('mousemove', function (e) {
      if (!window.EchoStarTrail || !window.EchoStarTrail.mouseEnabled) return;
      var rect   = canvas.getBoundingClientRect();
      var scaleX = (canvas.width  || 800) / rect.width;
      var scaleY = (canvas.height || 600) / rect.height;
      _state.mouseX = (e.clientX - rect.left) * scaleX;
      _state.mouseY = (e.clientY - rect.top)  * scaleY;
    }, { passive: true });
    _state.mouseListening = true;
  }

  // ─── Main tick ────────────────────────────────────────────────────────────

  function tick(dt) {
    if (!window.EchoStarTrail || !window.EchoStarTrail.enabled) return;

    var S   = getS();
    var ctx = getCtx();
    if (!S || !ctx) return;

    var col = floorCol(S.floor);

    // ── Floor change burst ──────────────────────────────────────────────────
    if (_state.lastFloor !== null && _state.lastFloor !== S.floor) {
      if (S.visitor) {
        emitArrivalBurst(S, S.visitor.x, S.visitor.y, col);
      }
      // Reset footprint distances on floor change
      _state.vDistSincePrint = 0;
      _state.eDistSincePrint = 0;
    }
    _state.lastFloor = S.floor;

    // ── Visitor trail ───────────────────────────────────────────────────────
    if (S.visitor && S.useVisitor) {
      var vx = S.visitor.x;
      var vy = S.visitor.y;

      if (_state.lastVx !== null) {
        var vdx  = vx - _state.lastVx;
        var vdy  = vy - _state.lastVy;
        var vdist = Math.sqrt(vdx * vdx + vdy * vdy);

        if (vdist > 0.3) {
          // Sparkle particles while moving
          if (Math.random() < CFG.SPARK_CHANCE) {
            emitSparkle(S, vx, vy, col, 1.0);
          }

          // Occasional tiny white sparkle for contrast
          if (Math.random() < 0.12) {
            S.particles && S.particles.push({
              x: vx + (Math.random() - 0.5) * 10,
              y: vy + Math.random() * 5,
              vx: (Math.random() - 0.5) * 0.5,
              vy: -0.5 - Math.random() * 0.5,
              life: 10 + Math.floor(Math.random() * 8),
              color: 'rgba(255,255,255,' + (0.4 + Math.random() * 0.3).toFixed(2) + ')',
            });
          }

          _state.vDistSincePrint += vdist;
          if (_state.vDistSincePrint >= CFG.V_FOOTPRINT_INTERVAL) {
            _state.vDistSincePrint = 0;
            addFootprint(vx, vy, col, false);
          }
        }
      }
      _state.lastVx = vx;
      _state.lastVy = vy;
    }

    // ── Echo trail ──────────────────────────────────────────────────────────
    if (S.echo && S.echo.floor === S.floor) {
      var ex = S.echo.x;
      var ey = S.echo.y;

      if (_state.lastEx !== null) {
        var edx   = ex - _state.lastEx;
        var edy   = ey - _state.lastEy;
        var edist = Math.sqrt(edx * edx + edy * edy);

        if (edist > 0.3) {
          if (Math.random() < CFG.ECHO_SPARK_CHANCE) {
            emitSparkle(S, ex, ey, ECHO_COLOR, 0.75);
          }

          _state.eDistSincePrint += edist;
          if (_state.eDistSincePrint >= CFG.E_FOOTPRINT_INTERVAL) {
            _state.eDistSincePrint = 0;
            addFootprint(ex, ey, ECHO_COLOR, true);
          }
        }
      }
      _state.lastEx = ex;
      _state.lastEy = ey;
    }

    // ── Draw footprints (always, even when not moving) ──────────────────────
    drawFootprints(ctx, dt);

    // ── Cursor sparkle trail (desktop only) ────────────────────────────────
    ensureMouseListener();
    if (window.EchoStarTrail.mouseEnabled && _state.mouseX > 0) {
      var mdx    = _state.mouseX - _state.lastMouseX;
      var mdy    = _state.mouseY - _state.lastMouseY;
      var mspeed = Math.sqrt(mdx * mdx + mdy * mdy);

      if (mspeed > 3 && S.particles) {
        var sparks = Math.min(4, 1 + Math.floor(mspeed / 12));
        for (var j = 0; j < sparks; j++) {
          var tt = j / sparks;
          S.particles.push({
            x:    _state.lastMouseX + mdx * tt + (Math.random() - 0.5) * 4,
            y:    _state.lastMouseY + mdy * tt + (Math.random() - 0.5) * 4,
            vx:   (Math.random() - 0.5) * 0.6,
            vy:   -0.3 - Math.random() * 0.5,
            life: Math.floor(CFG.CURSOR_SPARK_LIFE * (0.6 + Math.random() * 0.8)),
            color: rgba(col, 0.45 + Math.random() * 0.3),
          });
        }
      }
      _state.lastMouseX = _state.mouseX;
      _state.lastMouseY = _state.mouseY;
    }
  }

  // ─── Floor renderer injection ─────────────────────────────────────────────

  function wrapFloor(n) {
    var key      = 'renderFloor' + n;
    var original = window[key];
    if (typeof original !== 'function') return;
    window[key] = function () {
      original.apply(this, arguments);

      var now = performance.now();
      var dt  = _state.lastTickTime === null
        ? 0.016
        : Math.min(0.1, (now - _state.lastTickTime) / 1000);
      _state.lastTickTime = now;

      try { tick(dt); } catch (e) { /* degrade gracefully */ }
    };
  }

  // ─── Install (wait for game ready) ───────────────────────────────────────

  function install() {
    var ready = !!(window.S && window.ctx && window.renderFloor1);
    if (!ready) {
      setTimeout(install, 350);
      return;
    }
    for (var f = 1; f <= 13; f++) {
      wrapFloor(f);
    }
    ensureMouseListener();
    console.log('[EchoStarTrail] ✦ Stardust trail system active — leave your mark 🌟');
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  window.EchoStarTrail = {
    enabled:      true,
    mouseEnabled: true,
    get footprints() { return _state.footprints; },
    get footprintCount() { return _state.footprints.length; },
    clear: function () { _state.footprints = []; },
  };

  // Kick off
  install();

})();
