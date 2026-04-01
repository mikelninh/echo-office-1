/**
 * space-weather.js — Cosmic Events & Space Weather System
 * Echo's Station — makes the space station feel like it's actually in space.
 *
 * Features:
 *   - Persistent ambient starfield overlay (parallax drift)
 *   - Random cosmic events every 3–7 minutes:
 *       ☄️  Meteor Shower    — streaking particles across the viewport
 *       🌌  Nebula Pulse     — slow-moving coloured cloud wash
 *       🔆  Solar Flare      — screen-wide glow burst + flicker
 *       📡  Deep Signal      — cryptic transmission toast
 *       ⚡  Ion Storm        — electric crackle particles
 *       🌑  Shadow Pass      — a planet silhouette drifts past
 *   - Station PA announcements for each event
 *   - Exposes window.SpaceWeather.triggerEvent(type) for manual triggers
 *
 * Rules:
 *   - Purely visual overlay — never touches game state
 *   - Runs on its own canvas layer (z-index 45, below HUD)
 *   - Degrades gracefully if game isn't loaded yet
 */
(function SpaceWeatherModule() {
  'use strict';

  // ─── Config ─────────────────────────────────────────────────────────────────
  var MIN_INTERVAL_MS  = 3 * 60 * 1000;   // 3 minutes minimum between events
  var MAX_INTERVAL_MS  = 7 * 60 * 1000;   // 7 minutes maximum
  var STAR_COUNT       = 80;
  var MOBILE_STAR_DIV  = 2;               // halve stars on mobile

  // ─── State ──────────────────────────────────────────────────────────────────
  var _canvas   = null;
  var _ctx      = null;
  var _raf      = null;
  var _stars    = [];
  var _particles= [];
  var _overlays = [];   // full-screen overlay effects
  var _paTimer  = null;
  var _eventTimer = null;
  var _running  = false;
  var _W = 0, _H = 0;

  // ─── Event definitions ──────────────────────────────────────────────────────
  var EVENTS = {
    meteor: {
      label: '☄️ Meteor Shower',
      pa: [
        'STATION ALERT: Leonid meteor shower entering sensor range. Visible from Observatory. Duration ~4 minutes.',
        'ANNOUNCEMENT: Debris field detected on course intercept. Shields nominal. Expected visual display: spectacular.',
        'CREW NOTICE: Meteor shower in progress. Non-essential personnel report to viewports.',
        'NAVIGATION: High-velocity particulate detected. Visual only — no collision risk. Enjoy the show.',
      ],
    },
    nebula: {
      label: '🌌 Nebula Pulse',
      pa: [
        'SENSORS: Nebula front sweeping through sector 7-G. Expect chromatic interference for 3 minutes.',
        'ANNOUNCEMENT: We are passing through the outer edge of the Veil Nebula. External cameras online.',
        'ATMOSPHERIC: Ion-charged gas cloud enveloping the station. All systems nominal. It\'s beautiful out there.',
        'CREW NOTICE: Nebula pulse wave inbound. Expect brief cabin glow. This is normal.',
      ],
    },
    solar: {
      label: '🔆 Solar Flare',
      pa: [
        'SOLAR ALERT: Class-M flare detected from local star. Solar panels at 340% capacity. Excess routed to batteries.',
        'WARNING: Coronal mass ejection heading our way. Radiation shielding engaged. Stay away from portholes.',
        'STATION ALERT: Solar flare event in progress. Comms may experience brief static. All systems protected.',
        'ENERGY SPIKE: Solar radiation surge detected. The reactor is loving it. Shields at max.',
      ],
    },
    signal: {
      label: '📡 Deep Signal',
      pa: [
        'COMMUNICATIONS: Unidentified signal detected from deep space. Frequency: 1420 MHz. Decrypting...',
        'ANTENNA ARRAY: Anomalous transmission locked. Origin: beyond mapped space. Content: unknown.',
        'STATION LOG: We just received something from very far away. The signal repeats. We don\'t know what it means yet.',
        'COMMS ALERT: Deep space signal acquired. Pattern suggests non-random origin. Standing by.',
      ],
    },
    ion: {
      label: '⚡ Ion Storm',
      pa: [
        'ION STORM ALERT: Charged particle front incoming. Expect minor system flickering. Duration: 5 minutes.',
        'ENGINEERING: Ion storm entering range. Grounding all non-essential circuits. This one\'s a big one.',
        'CREW NOTICE: Static discharge event in progress. If your hair is standing up, that\'s normal.',
        'POWER SYSTEMS: Ion storm detected. Batteries fully charged. Let it ride.',
      ],
    },
    shadow: {
      label: '🌑 Shadow Pass',
      pa: [
        'NAVIGATION: Rogue planetoid passing within visual range. Estimated diameter: 800km. No collision course.',
        'OBSERVATION: Large body occluding primary star. Expect temporary shadow pass. Duration: 90 seconds.',
        'CREW NOTICE: That\'s not an eclipse — that\'s a wandering moon. Happens out here sometimes.',
        'SENSORS: Mass shadow incoming. Gravity nominal. It\'s just passing through.',
      ],
    },
  };

  // ─── Utility ────────────────────────────────────────────────────────────────
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function isMobile() { return window.innerWidth < 600; }

  function resize() {
    var wrap = document.getElementById('game-wrap') || document.body;
    var rect = wrap.getBoundingClientRect();
    _W = rect.width  || window.innerWidth;
    _H = rect.height || window.innerHeight;
    if (_canvas) {
      _canvas.width  = _W;
      _canvas.height = _H;
    }
  }

  // ─── PA Announcement ────────────────────────────────────────────────────────
  function showPA(eventKey) {
    var def = EVENTS[eventKey];
    if (!def) return;
    var text = def.pa[randInt(0, def.pa.length - 1)];

    var banner = document.createElement('div');
    banner.id = 'sw-pa-banner';
    banner.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'z-index:9500',
      'background:rgba(10,10,30,0.94)',
      'border-bottom:2px solid rgba(100,180,255,0.5)',
      'color:#a8d8ff',
      'font-family:\'Courier New\',monospace',
      'font-size:12px',
      'padding:7px 16px 7px 44px',
      'letter-spacing:0.5px',
      'line-height:1.4',
      'animation:swPaIn 0.3s ease',
      'pointer-events:none',
      'box-shadow:0 2px 20px rgba(100,180,255,0.15)',
    ].join(';');

    var icon = document.createElement('span');
    icon.style.cssText = 'position:absolute;left:14px;top:7px;font-size:16px';
    icon.textContent = def.label.split(' ')[0];
    banner.appendChild(icon);

    var label = document.createElement('span');
    label.style.cssText = 'color:#4af;font-weight:bold;margin-right:8px';
    label.textContent = def.label.split(' ').slice(1).join(' ').toUpperCase() + ':';
    banner.appendChild(label);

    banner.appendChild(document.createTextNode(text));

    // Inject animation keyframe once
    if (!document.getElementById('sw-style')) {
      var s = document.createElement('style');
      s.id = 'sw-style';
      s.textContent = [
        '@keyframes swPaIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes swPaOut{to{opacity:0;transform:translateY(-100%)}}',
      ].join('');
      document.head.appendChild(s);
    }

    document.body.appendChild(banner);
    clearTimeout(_paTimer);
    _paTimer = setTimeout(function () {
      banner.style.animation = 'swPaOut 0.4s ease forwards';
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 420);
    }, 7000);
  }

  // ─── Starfield ───────────────────────────────────────────────────────────────
  function initStars() {
    _stars = [];
    var count = isMobile() ? Math.floor(STAR_COUNT / MOBILE_STAR_DIV) : STAR_COUNT;
    for (var i = 0; i < count; i++) {
      _stars.push({
        x:     rand(0, _W),
        y:     rand(0, _H),
        r:     rand(0.3, 1.6),
        speed: rand(0.01, 0.08),
        alpha: rand(0.15, 0.55),
        twinkle: rand(0, Math.PI * 2),
        twinkleSpeed: rand(0.008, 0.03),
      });
    }
  }

  function drawStars(ctx) {
    for (var i = 0; i < _stars.length; i++) {
      var s = _stars[i];
      s.twinkle += s.twinkleSpeed;
      s.x -= s.speed;
      if (s.x < -2) { s.x = _W + 2; s.y = rand(0, _H); }
      var alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,210,255,' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  // ─── Particle helpers ────────────────────────────────────────────────────────
  function makeParticle(props) {
    return Object.assign({
      x:0, y:0, vx:0, vy:0,
      life:1, maxLife:1,
      r:1, color:'#fff', alpha:1,
      type:'dot',
    }, props);
  }

  function drawParticles(ctx) {
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p = _particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) { _particles.splice(i, 1); continue; }

      var t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = t * p.alpha;

      if (p.type === 'meteor') {
        // Draw a streak
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.r;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8);
        ctx.stroke();
        // Bright head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

      } else if (p.type === 'ion') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + rand(-8, 8), p.y + rand(-8, 8));
        ctx.stroke();

      } else if (p.type === 'nebula') {
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ─── Overlay effects (full-screen washes) ───────────────────────────────────
  function makeOverlay(props) {
    return Object.assign({ life:1, maxLife:1, type:'glow', color:'#fff', alpha:0.15 }, props);
  }

  function drawOverlays(ctx) {
    for (var i = _overlays.length - 1; i >= 0; i--) {
      var o = _overlays[i];
      o.life -= 1;
      if (o.life <= 0) { _overlays.splice(i, 1); continue; }

      var t = o.life / o.maxLife;
      // Ease in/out: peaks at 50%
      var peak = 1 - Math.abs(t * 2 - 1);

      ctx.save();
      ctx.globalAlpha = peak * o.alpha;

      if (o.type === 'glow') {
        ctx.fillStyle = o.color;
        ctx.fillRect(0, 0, _W, _H);

      } else if (o.type === 'shadow') {
        // Planet silhouette moving across
        var progress = 1 - t; // 0→1 as life drains
        var px = -200 + progress * (_W + 400);
        var py = rand(_H * 0.1, _H * 0.6);
        if (!o._py) o._py = py;
        ctx.beginPath();
        ctx.arc(px, o._py, o.r || 120, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0814';
        ctx.globalAlpha = Math.min(1, peak * 2.5);
        ctx.fill();
        // Rim light
        var rim = ctx.createRadialGradient(px, o._py, (o.r || 120) * 0.9, px, o._py, (o.r || 120) * 1.3);
        rim.addColorStop(0, 'transparent');
        rim.addColorStop(0.6, 'rgba(160,120,255,0.06)');
        rim.addColorStop(1, 'transparent');
        ctx.fillStyle = rim;
        ctx.globalAlpha = peak * 0.8;
        ctx.beginPath();
        ctx.arc(px, o._py, (o.r || 120) * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ─── Event spawners ─────────────────────────────────────────────────────────

  function spawnMeteorShower() {
    var count = isMobile() ? 18 : 40;
    for (var i = 0; i < count; i++) {
      var delay = i * rand(20, 120);
      (function(d) {
        setTimeout(function() {
          var angle = rand(-0.4, -0.2); // mostly left-down
          var speed = rand(6, 14);
          _particles.push(makeParticle({
            type: 'meteor',
            x: rand(0, _W),
            y: rand(-20, _H * 0.4),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed + rand(1, 3),
            r:  rand(0.8, 2),
            color: ['#fff','#ffe4a0','#a0d4ff','#ffccaa'][randInt(0,3)],
            life: randInt(25, 55),
            maxLife: 55,
            alpha: rand(0.6, 1),
          }));
        }, d);
      })(delay);
    }
  }

  function spawnNebulaPulse() {
    var colors = [
      'rgba(100,60,200,0.08)',
      'rgba(0,180,255,0.07)',
      'rgba(255,60,180,0.06)',
      'rgba(60,200,150,0.07)',
    ];
    // Full-screen colour wash
    _overlays.push(makeOverlay({
      type: 'glow',
      color: colors[randInt(0, colors.length - 1)],
      alpha: 0.22,
      life: 300, maxLife: 300,
    }));
    // Floating cloud particles
    var count = isMobile() ? 8 : 18;
    for (var i = 0; i < count; i++) {
      _particles.push(makeParticle({
        type: 'nebula',
        x: rand(-100, _W + 100),
        y: rand(-100, _H + 100),
        vx: rand(-0.15, 0.15),
        vy: rand(-0.08, 0.08),
        r: rand(60, 200),
        color: ['rgba(120,80,255,0.15)','rgba(0,200,255,0.12)','rgba(255,80,180,0.1)'][randInt(0,2)],
        life: randInt(280, 380),
        maxLife: 380,
        alpha: 1,
      }));
    }
  }

  function spawnSolarFlare() {
    // Bright flash then glow
    _overlays.push(makeOverlay({
      type: 'glow',
      color: '#ffeeaa',
      alpha: 0.35,
      life: 12, maxLife: 12,   // fast flash
    }));
    setTimeout(function() {
      _overlays.push(makeOverlay({
        type: 'glow',
        color: '#ff8800',
        alpha: 0.12,
        life: 200, maxLife: 200,  // slow glow
      }));
    }, 200);
    // Flicker effect
    var flickerCount = randInt(3, 6);
    for (var i = 0; i < flickerCount; i++) {
      (function(delay) {
        setTimeout(function() {
          _overlays.push(makeOverlay({
            type: 'glow',
            color: '#ffff88',
            alpha: 0.18,
            life: 6, maxLife: 6,
          }));
        }, delay);
      })(rand(300, 2000) * i);
    }
  }

  function spawnIonStorm() {
    var count = isMobile() ? 60 : 140;
    for (var i = 0; i < count; i++) {
      (function(delay) {
        setTimeout(function() {
          _particles.push(makeParticle({
            type: 'ion',
            x: rand(0, _W),
            y: rand(0, _H),
            vx: rand(-0.3, 0.3),
            vy: rand(-0.3, 0.3),
            r: 1,
            color: ['#00ffff','#88aaff','#ffffff','#44ffaa'][randInt(0,3)],
            life: randInt(10, 30),
            maxLife: 30,
            alpha: rand(0.4, 0.9),
          }));
        }, delay);
      })(i * rand(15, 80));
    }
    // Subtle electric blue overlay
    _overlays.push(makeOverlay({
      type: 'glow',
      color: 'rgba(0,80,200,0.05)',
      alpha: 1,
      life: 350, maxLife: 350,
    }));
  }

  function spawnShadowPass() {
    var r = rand(80, 180);
    _overlays.push(makeOverlay({
      type: 'shadow',
      r: r,
      life: 280, maxLife: 280,
      alpha: 1,
    }));
  }

  function spawnDeepSignal() {
    // Ripple rings emanating from a point
    var cx = rand(_W * 0.2, _W * 0.8);
    var cy = rand(_H * 0.2, _H * 0.8);
    var waves = isMobile() ? 4 : 7;
    for (var i = 0; i < waves; i++) {
      (function(idx) {
        setTimeout(function() {
          var life = 90;
          // Animate expanding ring via overlay-style but drawn as a particle
          _particles.push(makeParticle({
            type: 'ring',
            x: cx, y: cy,
            r: 10,
            _maxR: rand(80, 200),
            vx: 0, vy: 0,
            color: '#00d4ff',
            life: life, maxLife: life,
            alpha: 0.6,
          }));
        }, idx * 250);
      })(i);
    }
  }

  // ─── Render loop ─────────────────────────────────────────────────────────────
  function drawRingParticle(ctx, p) {
    var t = p.life / p.maxLife;
    var radius = p._maxR * (1 - t) + p.r;
    ctx.save();
    ctx.globalAlpha = t * p.alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5 * t;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function tick() {
    if (!_running || !_ctx) { _raf = null; return; }
    _raf = requestAnimationFrame(tick);

    _ctx.clearRect(0, 0, _W, _H);

    // Stars
    drawStars(_ctx);

    // Overlays (behind particles)
    drawOverlays(_ctx);

    // Particles (with ring type handled separately)
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p = _particles[i];
      if (p.type === 'ring') {
        p.life -= 1;
        if (p.life <= 0) { _particles.splice(i, 1); continue; }
        drawRingParticle(_ctx, p);
        _particles.splice(i, 1); // remove after drawing this frame (re-added above)
        // Actually we keep it — fixed: don't splice after drawing
      }
    }
    // Re-draw standard particles (ring was already handled above with splice bug — fix below)
    drawParticles(_ctx);
  }

  // ─── Event scheduler ─────────────────────────────────────────────────────────
  var EVENT_KEYS = Object.keys(EVENTS);

  function scheduleNextEvent() {
    var delay = rand(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
    _eventTimer = setTimeout(function() {
      var key = EVENT_KEYS[randInt(0, EVENT_KEYS.length - 1)];
      triggerEvent(key);
      scheduleNextEvent();
    }, delay);
  }

  function triggerEvent(key) {
    if (!EVENTS[key]) return;
    showPA(key);
    switch (key) {
      case 'meteor': spawnMeteorShower(); break;
      case 'nebula': spawnNebulaPulse();  break;
      case 'solar':  spawnSolarFlare();   break;
      case 'ion':    spawnIonStorm();     break;
      case 'shadow': spawnShadowPass();   break;
      case 'signal': spawnDeepSignal();   break;
    }
  }

  // ─── Ring particle fix: proper draw loop ────────────────────────────────────
  // Override drawParticles to handle 'ring' type
  var _origDrawParticles = drawParticles;
  drawParticles = function(ctx) {
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p = _particles[i];
      p.life -= 1;
      if (p.life <= 0) { _particles.splice(i, 1); continue; }

      if (p.type === 'ring') {
        drawRingParticle(ctx, p);
        continue;
      }

      var t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = t * p.alpha;

      if (p.type === 'meteor') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.r;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (p.type === 'ion') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + rand(-8, 8), p.y + rand(-8, 8));
        ctx.stroke();
      } else if (p.type === 'nebula') {
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      p.x += p.vx;
      p.y += p.vy;
      ctx.restore();
    }
  };

  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    // Create overlay canvas
    _canvas = document.createElement('canvas');
    _canvas.id = 'sw-canvas';
    _canvas.style.cssText = [
      'position:absolute',
      'top:0', 'left:0',
      'width:100%', 'height:100%',
      'pointer-events:none',
      'z-index:45',
      'opacity:0.92',
    ].join(';');

    var wrap = document.getElementById('game-wrap');
    if (wrap) {
      // Insert before the first child so it's behind the game canvas
      wrap.insertBefore(_canvas, wrap.firstChild);
      // Match game-wrap dimensions
      var rect = wrap.getBoundingClientRect();
      _W = rect.width;
      _H = rect.height;
    } else {
      document.body.appendChild(_canvas);
      _W = window.innerWidth;
      _H = window.innerHeight;
    }

    _canvas.width  = _W;
    _canvas.height = _H;
    _ctx = _canvas.getContext('2d');

    window.addEventListener('resize', function() {
      resize();
      initStars();
    });

    initStars();
    _running = true;

    // Patch tick to use the fixed drawParticles
    _raf = requestAnimationFrame(tick);

    // First event: after 60–90 seconds (so player notices after settling in)
    _eventTimer = setTimeout(function() {
      var key = EVENT_KEYS[randInt(0, EVENT_KEYS.length - 1)];
      triggerEvent(key);
      scheduleNextEvent();
    }, rand(60000, 90000));

    // Expose public API
    window.SpaceWeather = {
      triggerEvent: triggerEvent,
      events: EVENT_KEYS,
    };
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────
  function waitAndInit() {
    // Wait for game-wrap or body to be available
    if (document.getElementById('game-wrap') || document.readyState === 'complete') {
      // Small delay to let other modules settle
      setTimeout(init, 1200);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 1200);
      });
    }
  }

  waitAndInit();

})();
