/**
 * physics-breach.js — Physics Breach Visual Effects
 * The Ring Station's signature visual identity: reality tears when you go digital.
 *
 * API:
 *   PhysicsBreach.minor(x, y)   — player dash / speed boost
 *   PhysicsBreach.major()        — portal / floor-crossing / transformation
 *   PhysicsBreach.gravity(newG)  — gravity zone change
 *   PhysicsBreach.isActive()     — returns true while any effect is playing
 */
(function PhysicsBreachSystem() {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────────

  var GLITCH_CHARS = '░▒▓█▀▄↑↓←→⌂◘○♦♣♠♥†‡';
  var ASCII_POOL   = '!@#$%^&*<>?/\\|~`\'"{}[]';
  var ALL_GLITCH   = GLITCH_CHARS + ASCII_POOL;

  // ─── State machine ────────────────────────────────────────────────────────────

  var _state = {
    active:       false,
    type:         null,      // 'minor' | 'major' | 'gravity'
    startTime:    0,
    duration:     0,
    x:            0,
    y:            0,
    gravityValue: 1,
    prevGravity:  1,
    frame:        0,         // rAF frame counter since effect start
    phase:        'in',      // 'in' | 'hold' | 'out'
  };

  // Scatter pixels for minor breach
  var _scatterPixels = [];

  // Particles for major breach
  var _particles = [];

  // Gravity arrows
  var _gravArrows = [];

  // Glitch text state
  var _glitchText = null;

  // Screen tear offsets [8 strips]
  var _tearOffsets   = new Array(8).fill(0);
  var _tearFrame     = 0;
  var _tearActive    = false;

  // Overlay canvas (drawn on top via rAF, never touches gameplay)
  var _overlay = null;
  var _octx    = null;
  var _rafId   = null;

  // Color temperature filter alpha (gravity breach)
  var _colorTempAlpha = 0;
  var _colorTempColor = '#ffffff';

  // ─── Utility ──────────────────────────────────────────────────────────────────

  function _now() { return performance.now(); }

  function _rand(a, b) { return a + Math.random() * (b - a); }
  function _randInt(a, b) { return (a + Math.random() * (b - a)) | 0; }
  function _pick(arr) { return arr[_randInt(0, arr.length)]; }

  function _glitchChar() {
    return ALL_GLITCH[_randInt(0, ALL_GLITCH.length)];
  }

  // ─── Overlay canvas setup ────────────────────────────────────────────────────

  function _ensureOverlay() {
    if (_overlay) return;
    _overlay = document.createElement('canvas');
    _overlay.id = 'physics-breach-overlay';
    _overlay.style.cssText = [
      'position:fixed',
      'top:0', 'left:0',
      'width:100%', 'height:100%',
      'pointer-events:none',
      'z-index:9999',
    ].join(';');
    document.body.appendChild(_overlay);

    function _resize() {
      _overlay.width  = window.innerWidth;
      _overlay.height = window.innerHeight;
    }
    _resize();
    window.addEventListener('resize', _resize);
    _octx = _overlay.getContext('2d');
  }

  // ─── Glitch Text Renderer ────────────────────────────────────────────────────

  /**
   * Start rendering glitch text centered on the overlay.
   * @param {string} text    - Source text
   * @param {number} holdMs  - How long to hold before dissolving (ms)
   * @param {string} color   - CSS color
   */
  function _startGlitchText(text, holdMs, color) {
    var chars = text.split('').map(function(c) {
      return { orig: c, display: c, dx: 0, dy: 0, dissolved: false };
    });
    _glitchText = {
      chars:     chars,
      holdMs:    holdMs,
      color:     color || '#00fff7',
      startTime: _now(),
      dissolving: false,
      done:       false,
      glitchTimer: 0,
    };
  }

  function _updateGlitchText(now) {
    if (!_glitchText || _glitchText.done) return;
    var gt     = _glitchText;
    var elapsed = now - gt.startTime;

    // Glitch replacements every 50ms
    gt.glitchTimer += 16; // ~60fps
    if (gt.glitchTimer >= 50) {
      gt.glitchTimer = 0;
      var replaceCount = _randInt(2, 5);
      for (var i = 0; i < replaceCount; i++) {
        var idx = _randInt(0, gt.chars.length);
        if (gt.chars[idx].orig === ' ') continue;
        gt.chars[idx].display = _glitchChar();
      }
      // Also restore a few
      var restoreCount = _randInt(1, 3);
      for (var j = 0; j < restoreCount; j++) {
        var idx2 = _randInt(0, gt.chars.length);
        gt.chars[idx2].display = gt.chars[idx2].orig;
      }
    }

    // Begin dissolve after holdMs
    if (!gt.dissolving && elapsed >= gt.holdMs) {
      gt.dissolving = true;
      // Assign scatter velocity to each character
      gt.chars.forEach(function(c) {
        c.dx = _rand(-4, 4);
        c.dy = _rand(-3, 1);
      });
    }

    // Dissolve: move characters outward
    if (gt.dissolving) {
      var dissolveElapsed = elapsed - gt.holdMs;
      var dissolveDuration = 300; // 0.3s
      if (dissolveElapsed >= dissolveDuration) {
        gt.done = true;
        _glitchText = null;
        return;
      }
      gt.chars.forEach(function(c) {
        c.dx *= 1.08;
        c.dy *= 1.08;
      });
    }
  }

  function _drawGlitchText(ctx, W, H) {
    if (!_glitchText || _glitchText.done) return;
    var gt      = _glitchText;
    var elapsed = _now() - gt.startTime;
    var fontSize = Math.min(W / 20, 24);

    ctx.save();
    ctx.font = 'bold ' + fontSize + 'px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'left';

    // Build display string and measure total width
    var totalText = gt.chars.map(function(c) { return c.display; }).join('');
    var totalW    = ctx.measureText(totalText).width;
    var startX    = W / 2 - totalW / 2;
    var baseY     = H * 0.18;

    var alpha = 1;
    if (gt.dissolving) {
      var dp = Math.min(1, (_now() - gt.startTime - gt.holdMs) / 300);
      alpha  = 1 - dp;
    }

    // Shadow / glow
    ctx.shadowColor = gt.color;
    ctx.shadowBlur  = 12;

    var cx = startX;
    gt.chars.forEach(function(c) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = gt.dissolving ? gt.color : (c.display !== c.orig ? '#ff4444' : gt.color);
      ctx.fillText(c.display, cx + (gt.dissolving ? c.dx : 0), baseY + (gt.dissolving ? c.dy : 0));
      cx += ctx.measureText(c.display).width;
    });

    ctx.restore();
  }

  // ─── Screen Tear Effect ───────────────────────────────────────────────────────

  function _startScreenTear() {
    _tearFrame  = 0;
    _tearActive = true;
    _tearOffsets = _tearOffsets.map(function() { return 0; });
  }

  function _updateScreenTear() {
    if (!_tearActive) return;
    _tearFrame++;

    if (_tearFrame > 4) {
      // Snap back to normal
      _tearOffsets = _tearOffsets.map(function() { return 0; });
      _tearActive  = false;
      return;
    }

    // Randomly offset 3-5 strips each frame, staggered
    var numTorn = _randInt(3, 6);
    // Reset all first, then set the torn ones
    _tearOffsets = _tearOffsets.map(function() { return 0; });
    for (var i = 0; i < numTorn; i++) {
      var strip = _randInt(0, 8);
      // Stagger: amplitude grows then shrinks over frames
      var amp   = (_tearFrame <= 2) ? _tearFrame * 4 : (5 - _tearFrame) * 4;
      _tearOffsets[strip] = _rand(-amp, amp) | 0;
    }
  }

  // ─── Particle Burst (major breach) ───────────────────────────────────────────

  function _spawnParticleBurst(cx, cy) {
    _particles = [];
    for (var i = 0; i < 30; i++) {
      var angle = (i / 30) * Math.PI * 2 + _rand(-0.3, 0.3);
      var speed = _rand(2, 7);
      var isData = Math.random() > 0.5;
      _particles.push({
        x:     cx,
        y:     cy,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        life:  _rand(0.3, 0.5),
        maxLife: 0,
        color: isData
          ? _pick(['#00fff7', '#ff00ff', '#ffd700', '#ff4444'])
          : '#ffffff',
        size:  _rand(2, 5),
        isData: isData,
      });
    }
    _particles.forEach(function(p) { p.maxLife = p.life; });
  }

  function _updateParticles(dt) {
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p  = _particles[i];
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += 0.1; // slight gravity
      p.life -= dt;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  function _drawParticles(ctx) {
    _particles.forEach(function(p) {
      var alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      if (p.isData) {
        // Data fragment: small rectangle
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.5);
      } else {
        // Spark: circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ─── Gravity Arrows ───────────────────────────────────────────────────────────

  function _spawnGravityArrows(W, H, newG) {
    _gravArrows = [];
    var count = 15;
    for (var i = 0; i < count; i++) {
      _gravArrows.push({
        x:     _rand(W * 0.1, W * 0.9),
        y:     _rand(H * 0.1, H * 0.9),
        angle: newG < 0.5 ? _rand(-0.5, 0.5) : _rand(Math.PI * 0.8, Math.PI * 1.2),
        life:  _rand(0.2, 0.4),
        maxLife: 0,
        size:  _rand(12, 20),
      });
    }
    _gravArrows.forEach(function(a) { a.maxLife = a.life; });
  }

  function _updateGravArrows(dt) {
    for (var i = _gravArrows.length - 1; i >= 0; i--) {
      _gravArrows[i].life -= dt;
      _gravArrows[i].angle += 0.05; // slow spin
      if (_gravArrows[i].life <= 0) _gravArrows.splice(i, 1);
    }
  }

  function _drawGravArrows(ctx) {
    _gravArrows.forEach(function(a) {
      var alpha = Math.max(0, a.life / a.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.font         = a.size + 'px monospace';
      ctx.fillStyle    = '#00fff7';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↓', 0, 0);
      ctx.restore();
    });
  }

  // ─── Chromatic Aberration (full-screen, overlay-based) ────────────────────────

  /**
   * Draws a chromatic split of the main game canvas onto the overlay.
   * We snapshot the game canvas and re-draw with R/G/B channel offsets.
   */
  function _drawChromaticAberration(ctx, gameCanvas, W, H, offset, alpha) {
    if (!gameCanvas || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Red channel — offset right
    ctx.globalAlpha = alpha * 0.6;
    ctx.drawImage(gameCanvas, offset, 0);

    // Green channel — center (slight offset up)
    ctx.globalAlpha = alpha * 0.6;
    ctx.drawImage(gameCanvas, 0, -offset * 0.5);

    // Blue channel — offset left/down
    ctx.globalAlpha = alpha * 0.6;
    ctx.drawImage(gameCanvas, -offset, offset * 0.5);

    ctx.restore();
  }

  // ─── HUD helpers ─────────────────────────────────────────────────────────────

  function _drawHudText(ctx, text, W, H, alpha) {
    if (alpha <= 0) return;
    var fontSize = Math.min(W / 28, 18);
    ctx.save();
    ctx.globalAlpha     = alpha;
    ctx.font            = 'bold ' + fontSize + 'px monospace';
    ctx.textAlign       = 'center';
    ctx.textBaseline    = 'middle';
    ctx.shadowColor     = '#ff4400';
    ctx.shadowBlur      = 16;
    ctx.fillStyle       = '#ffcc00';
    ctx.fillText(text, W / 2, H * 0.12);
    ctx.restore();
  }

  // ─── Gravity Counter Animation ────────────────────────────────────────────────

  function _drawGravCounter(ctx, W, H, progress, prevG, newG) {
    var current = prevG + (newG - prevG) * progress;
    var text    = 'G: ' + current.toFixed(2);
    _drawHudText(ctx, text, W, H, Math.min(1, progress * 3));
  }

  // ─── Color Temperature Overlay ────────────────────────────────────────────────

  function _drawColorTemp(ctx, W, H, newG, alpha) {
    if (alpha <= 0) return;
    // Low-G → cool blue; high-G → warm orange
    var color = newG < 0.5 ? 'rgba(60,100,255,' + (alpha * 0.12) + ')' :
                             'rgba(255,120,20,' + (alpha * 0.12) + ')';
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ─── Screen Warp (fisheye-like for gravity breach) ────────────────────────────

  function _drawScreenWarp(ctx, gameCanvas, W, H, intensity) {
    if (!gameCanvas || intensity <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.4;
    var sc = 1 + intensity * 0.05;
    ctx.translate(W / 2, H / 2);
    ctx.scale(sc, 1 / sc);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(gameCanvas, 0, 0);
    ctx.restore();
  }

  // ─── Main Render Loop ─────────────────────────────────────────────────────────

  var _lastTime = 0;

  function _tick(now) {
    _rafId = requestAnimationFrame(_tick);

    var dt  = Math.min((now - _lastTime) / 1000, 0.05);
    _lastTime = now;

    if (!_state.active && _particles.length === 0 && _gravArrows.length === 0 && !_glitchText) {
      // Nothing to render — clear overlay and idle
      if (_octx) {
        _octx.clearRect(0, 0, _overlay.width, _overlay.height);
      }
      return;
    }

    var W = _overlay.width;
    var H = _overlay.height;
    _octx.clearRect(0, 0, W, H);

    // Find the game canvas
    var gameCanvas = document.querySelector('canvas:not(#physics-breach-overlay)');

    var elapsed  = _state.active ? (now - _state.startTime) / 1000 : 0;
    var progress = _state.duration > 0 ? Math.min(1, elapsed / _state.duration) : 1;

    if (_state.active) {
      _state.frame++;

      // ── MINOR BREACH ────────────────────────────────────────────────────────
      if (_state.type === 'minor') {
        // Chromatic aberration: 3 sprite ghost copies drawn via overlay
        // (We use a simple full-canvas split with small offset)
        var caOffset = 2 * (1 - progress);
        _drawChromaticAberration(_octx, gameCanvas, W, H, caOffset, 0.3 * (1 - progress));

        // Scatter pixels
        if (_state.frame <= 3) {
          _octx.save();
          _scatterPixels.forEach(function(px) {
            px.ox = _rand(-6, 6) | 0;
            px.oy = _rand(-6, 6) | 0;
          });
          _scatterPixels.forEach(function(px) {
            _octx.fillStyle = px.color;
            _octx.fillRect(px.sx + px.ox, px.sy + px.oy, 4, 4);
          });
          _octx.restore();
        }

        // Screen flash on frame 1
        if (_state.frame === 1) {
          _octx.save();
          _octx.fillStyle    = 'rgba(255,255,255,0.10)';
          _octx.fillRect(0, 0, W, H);
          _octx.restore();
        }

        if (elapsed >= _state.duration) _stopEffect();
      }

      // ── MAJOR BREACH ────────────────────────────────────────────────────────
      else if (_state.type === 'major') {
        var caOff = _rand(3, 5);

        // Full-screen chromatic aberration
        _drawChromaticAberration(_octx, gameCanvas, W, H, caOff, 0.5);

        // Screen tears
        if (_tearActive || _state.frame < 5) {
          _updateScreenTear();
          if (_tearActive) {
            _octx.save();
            var stripH = H / 8;
            for (var s = 0; s < 8; s++) {
              var off = _tearOffsets[s];
              if (off === 0) continue;
              _octx.drawImage(
                gameCanvas,
                0, s * stripH, W, stripH + 1,
                off, s * stripH, W, stripH + 1
              );
            }
            _octx.restore();
          }
        }

        // Inversion — first 2 frames (~33ms)
        if (_state.frame <= 2) {
          _octx.save();
          _octx.globalCompositeOperation = 'difference';
          _octx.fillStyle = 'rgba(255,255,255,0.9)';
          _octx.fillRect(0, 0, W, H);
          _octx.restore();
        }

        // Fade through black: 0-0.15s = darken, 0.15-0.30s = reveal
        var blackAlpha = 0;
        if (elapsed < 0.15) {
          blackAlpha = elapsed / 0.15;
        } else if (elapsed < 0.30) {
          blackAlpha = 1 - (elapsed - 0.15) / 0.15;
        }
        if (blackAlpha > 0) {
          _octx.save();
          _octx.fillStyle = 'rgba(0,0,0,' + blackAlpha + ')';
          _octx.fillRect(0, 0, W, H);
          _octx.restore();
        }

        // Particle burst
        _updateParticles(dt);
        _drawParticles(_octx);

        // Glitch text
        _updateGlitchText(now);
        _drawGlitchText(_octx, W, H);

        if (elapsed >= _state.duration) {
          _stopEffect();
        }
      }

      // ── GRAVITY BREACH ──────────────────────────────────────────────────────
      else if (_state.type === 'gravity') {
        // Color temperature
        var tempAlpha = Math.sin(progress * Math.PI); // peaks at midpoint
        _drawColorTemp(_octx, W, H, _state.gravityValue, tempAlpha);

        // Screen warp (fisheye)
        var warpIntensity = Math.sin(progress * Math.PI) * 3;
        _drawScreenWarp(_octx, gameCanvas, W, H, warpIntensity);

        // Gravity arrows
        _updateGravArrows(dt);
        _drawGravArrows(_octx);

        // Glitch text + gravity counter
        _updateGlitchText(now);
        _drawGlitchText(_octx, W, H);

        // Gravity counter overlay
        _drawGravCounter(_octx, W, H, progress, _state.prevGravity, _state.gravityValue);

        if (elapsed >= _state.duration) {
          _stopEffect();
        }
      }
    } else {
      // Effect ended but particles/arrows/glitch text may still be alive
      _updateParticles(dt);
      _drawParticles(_octx);
      _updateGravArrows(dt);
      _drawGravArrows(_octx);
      _updateGlitchText(now);
      _drawGlitchText(_octx, W, H);
    }
  }

  function _stopEffect() {
    _state.active = false;
    _state.type   = null;
    _tearActive   = false;
    _tearOffsets  = _tearOffsets.map(function() { return 0; });
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Minor breach — dash / speed boost.
   * @param {number} x - Player X position (canvas coords)
   * @param {number} y - Player Y position (canvas coords)
   */
  function minor(x, y) {
    _ensureOverlay();

    // Scatter pixels around player
    var count = _randInt(5, 9);
    _scatterPixels = [];
    for (var i = 0; i < count; i++) {
      _scatterPixels.push({
        sx:    (x + _rand(-20, 20)) | 0,
        sy:    (y + _rand(-20, 20)) | 0,
        ox:    0,
        oy:    0,
        color: _pick(['#ff4444', '#44ff88', '#4488ff', '#ffffff']),
      });
    }

    _state.active    = true;
    _state.type      = 'minor';
    _state.startTime = _now();
    _state.duration  = 0.2;
    _state.x         = x;
    _state.y         = y;
    _state.frame     = 0;
  }

  /**
   * Major breach — portal, floor teleport, transformation.
   */
  function major() {
    _ensureOverlay();

    var W = _overlay.width;
    var H = _overlay.height;

    _spawnParticleBurst(W / 2, H / 2);
    _startScreenTear();
    _startGlitchText('⚠ PHYSICS ENGINE: OVERRIDE', 300, '#ff4400');

    _state.active    = true;
    _state.type      = 'major';
    _state.startTime = _now();
    _state.duration  = 0.5;
    _state.frame     = 0;
  }

  /**
   * Gravity breach — entering zero-G zone or gravity change.
   * @param {number} newG - New gravity multiplier (0 = zero-G, 1 = Earth, 0.38 = Mars, etc.)
   */
  function gravity(newG) {
    _ensureOverlay();

    var W = _overlay.width;
    var H = _overlay.height;

    _spawnGravityArrows(W, H, newG);
    _startGlitchText('G: ' + newG.toFixed(2), 200, '#00fff7');

    _state.prevGravity  = _state.gravityValue || 1;
    _state.active       = true;
    _state.type         = 'gravity';
    _state.startTime    = _now();
    _state.duration     = 0.4;
    _state.gravityValue = newG;
    _state.frame        = 0;
  }

  /**
   * Returns true while any breach effect is playing.
   */
  function isActive() {
    return _state.active || _particles.length > 0 || _gravArrows.length > 0 || !!_glitchText;
  }

  // ─── Expose API ───────────────────────────────────────────────────────────────

  window.PhysicsBreach = {
    minor:    minor,
    major:    major,
    gravity:  gravity,
    isActive: isActive,
  };

  // ─── Hook: Dash Detection ─────────────────────────────────────────────────────
  // Poll S.visitor._dashing; trigger minor() on rising edge

  var _wasDashing = false;

  function _watchDash() {
    try {
      var S = window.S || window._S;
      if (S && S.visitor) {
        var nowDashing = !!S.visitor._dashing;
        if (nowDashing && !_wasDashing) {
          minor(S.visitor.x, S.visitor.y);
        }
        _wasDashing = nowDashing;
      }
    } catch (e) { /* S not ready yet */ }
    requestAnimationFrame(_watchDash);
  }

  // ─── Hook: changeFloor ────────────────────────────────────────────────────────
  // Wrap window.changeFloor to trigger major() on floor changes

  function _wrapChangeFloor() {
    var _orig = window.changeFloor;
    if (typeof _orig !== 'function') {
      // Retry until changeFloor is available
      setTimeout(_wrapChangeFloor, 500);
      return;
    }

    var _bootTime = Date.now();
    var _lastBreachTime = 0;
    window.changeFloor = function(f) {
      // Skip breach on initial load (first 2 seconds) and debounce (1s between breaches)
      var now = Date.now();
      if (now - _bootTime > 2000 && now - _lastBreachTime > 1000) {
        _lastBreachTime = now;
        try { major(); } catch (e) { /* noop */ }
      }
      return _orig.apply(this, arguments);
    };
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  function _boot() {
    _ensureOverlay();
    _lastTime = performance.now();

    // Start the render loop
    _rafId = requestAnimationFrame(_tick);

    // Start dash watcher
    requestAnimationFrame(_watchDash);

    // Hook changeFloor once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _wrapChangeFloor);
    } else {
      _wrapChangeFloor();
    }

    console.log('[PhysicsBreach] Online. Reality breach systems armed. ⚡');
  }

  // Boot when DOM is available
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _boot);
    } else {
      _boot();
    }
  }

})();
