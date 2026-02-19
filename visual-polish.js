/**
 * visual-polish.js — Ghibli-Inspired Visual Enhancements
 * Echo Office · Studio Ghibli: magical but grounded.
 * Every particle should feel like the world is breathing.
 *
 * Loaded after main script blocks. Hooks into the existing render loop
 * via window.renderFloorX overrides. Layers ON TOP — never replaces core.
 */
(function VisualPolish() {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getS()   { return window.S; }
  function getCtx() { return window.ctx; }
  function getW()   { return (window.W || 800); }
  function getH()   { return (window.H || 600); }
  function isMobile() { const s = getS(); return s && s._isMobile; }

  /** Max particles per floor, halved on mobile */
  function maxParticles() { return isMobile() ? 25 : 50; }

  /** Current hour (0-23) for time-of-day tinting */
  function currentHour() { return new Date().getHours(); }

  /** Time-of-day category */
  function getTOD() {
    const h = currentHour();
    if (h >= 5  && h < 8)  return 'dawn';
    if (h >= 8  && h < 18) return 'day';
    if (h >= 18 && h < 21) return 'evening';
    return 'night';
  }

  // ─── Per-floor ambient particle pools ────────────────────────────────────────

  const pools = {}; // { [floor]: Particle[] }

  function getPool(floor) {
    if (!pools[floor]) pools[floor] = [];
    return pools[floor];
  }

  /** Base particle shape */
  function makeParticle(overrides) {
    return Object.assign({
      x: 0, y: 0,
      vx: 0, vy: 0,
      life: 100, maxLife: 100,
      size: 2,
      color: '#ffffff',
      alpha: 0.5,
      type: 'dot',   // 'dot' | 'note' | 'leaf' | 'spark' | 'data' | 'star' | 'firefly'
      pulse: 0,      // for fireflies
      angle: 0,
      spin: 0,
    }, overrides);
  }

  // ─── Floor-specific particle spawners ────────────────────────────────────────

  const spawners = {
    /** F1 – Quarters: golden dust motes in lamplight */
    1(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      // Drift toward lamp zones (center-ish, warm)
      const lampX = W * (0.35 + Math.random() * 0.3);
      pool.push(makeParticle({
        x: lampX + (Math.random() - 0.5) * 160,
        y: 80 + Math.random() * (H - 160),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.08 - Math.random() * 0.12,
        life: 220 + Math.random() * 180,
        maxLife: 400,
        size: 1 + Math.random() * 1.5,
        color: Math.random() < 0.6 ? '#ffd080' : '#ffb850',
        alpha: 0.22 + Math.random() * 0.15,
        type: 'dot',
      }));
    },

    /** F2 – Observatory: slow stars + nebula wisps */
    2(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      const isStar = Math.random() < 0.7;
      pool.push(makeParticle({
        x: Math.random() * W,
        y: Math.random() * H * 0.75,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -0.04 - Math.random() * 0.06,
        life: 300 + Math.random() * 300,
        maxLife: 600,
        size: isStar ? 1 + Math.random() : 3 + Math.random() * 4,
        color: isStar ? '#e8f0ff' : (Math.random() < 0.5 ? '#9b80cc' : '#6080cc'),
        alpha: isStar ? 0.5 + Math.random() * 0.4 : 0.08 + Math.random() * 0.08,
        type: isStar ? 'star' : 'dot',
        pulse: Math.random() * Math.PI * 2,
      }));
    },

    /** F3 – Arcade: neon sparks + pixel confetti */
    3(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      const neonColors = ['#ff00aa', '#00fff7', '#ffff00', '#ff6600', '#cc00ff'];
      const isSpark = Math.random() < 0.65;
      pool.push(makeParticle({
        x: 60 + Math.random() * (W - 120),
        y: H * 0.3 + Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * (isSpark ? 1.2 : 0.5),
        vy: isSpark ? -0.8 - Math.random() * 1.2 : -0.3 - Math.random() * 0.3,
        life: isSpark ? 30 + Math.random() * 40 : 120 + Math.random() * 120,
        maxLife: isSpark ? 70 : 240,
        size: isSpark ? 1.5 : 2.5,
        color: neonColors[Math.floor(Math.random() * neonColors.length)],
        alpha: 0.6 + Math.random() * 0.3,
        type: isSpark ? 'spark' : 'dot',
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.15,
      }));
    },

    /** F4 – Garden: pollen, fireflies, leaves */
    4(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      const roll = Math.random();
      if (roll < 0.45) {
        // pollen
        pool.push(makeParticle({
          x: Math.random() * W,
          y: 60 + Math.random() * (H - 100),
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.05 - Math.random() * 0.1,
          life: 300 + Math.random() * 200,
          maxLife: 500,
          size: 1.5 + Math.random(),
          color: Math.random() < 0.6 ? '#ffe080' : '#d0ff90',
          alpha: 0.25 + Math.random() * 0.2,
          type: 'dot',
        }));
      } else if (roll < 0.75) {
        // firefly
        pool.push(makeParticle({
          x: 40 + Math.random() * (W - 80),
          y: H * 0.35 + Math.random() * H * 0.5,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.2,
          life: 400 + Math.random() * 300,
          maxLife: 700,
          size: 2.5 + Math.random(),
          color: '#aaffaa',
          alpha: 0.0,
          type: 'firefly',
          pulse: Math.random() * Math.PI * 2,
        }));
      } else {
        // drifting leaf
        pool.push(makeParticle({
          x: Math.random() * W,
          y: -10,
          vx: 0.3 + Math.random() * 0.4,
          vy: 0.4 + Math.random() * 0.4,
          life: 350 + Math.random() * 250,
          maxLife: 600,
          size: 3 + Math.random() * 2,
          color: Math.random() < 0.5 ? '#66cc44' : '#aadd55',
          alpha: 0.55 + Math.random() * 0.25,
          type: 'leaf',
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.04,
        }));
      }
    },

    /** F5 – Secret Lab: matrix-ish data rain (subtle) */
    5(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      pool.push(makeParticle({
        x: Math.random() * W,
        y: -10,
        vx: 0,
        vy: 0.8 + Math.random() * 1.2,
        life: Math.floor(H / (0.8 + Math.random() * 1.2)) + 20,
        maxLife: 500,
        size: 2,
        color: Math.random() < 0.8 ? '#00cc44' : '#44ffaa',
        alpha: 0.15 + Math.random() * 0.2,
        type: 'data',
      }));
    },

    /** F6 – Record Room: musical notes + amber glow */
    6(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      const isNote = Math.random() < 0.5;
      pool.push(makeParticle({
        x: 60 + Math.random() * (W - 120),
        y: H * 0.55 + Math.random() * H * 0.35,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.5,
        life: 160 + Math.random() * 160,
        maxLife: 320,
        size: isNote ? 7 : 2 + Math.random() * 2,
        color: isNote ? '#ffcc66' : (Math.random() < 0.6 ? '#ffaa44' : '#ff8844'),
        alpha: isNote ? 0.35 : 0.2 + Math.random() * 0.15,
        type: isNote ? 'note' : 'dot',
        pulse: Math.random() * Math.PI * 2,
      }));
    },

    /** F7 – Community Deck: paint splatter near pixel wall */
    7(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      const paintColors = ['#ff3366', '#33aaff', '#ffee22', '#44dd88', '#ff8833', '#cc44ff'];
      pool.push(makeParticle({
        // Cluster near the pixel wall (left half)
        x: 40 + Math.random() * W * 0.55,
        y: H * 0.15 + Math.random() * H * 0.7,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.4,
        life: 80 + Math.random() * 120,
        maxLife: 200,
        size: 1.5 + Math.random() * 2.5,
        color: paintColors[Math.floor(Math.random() * paintColors.length)],
        alpha: 0.18 + Math.random() * 0.18,
        type: 'dot',
      }));
    },

    /** F8+ – Gentle atmospheric dust */
    _default(pool, W, H) {
      if (pool.length >= maxParticles()) return;
      pool.push(makeParticle({
        x: Math.random() * W,
        y: 40 + Math.random() * (H - 80),
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.06 - Math.random() * 0.09,
        life: 250 + Math.random() * 200,
        maxLife: 450,
        size: 1 + Math.random(),
        color: '#ddd8cc',
        alpha: 0.1 + Math.random() * 0.1,
        type: 'dot',
      }));
    },
  };

  function spawnForFloor(floor, pool, W, H) {
    const fn = spawners[floor] || spawners._default;
    fn(pool, W, H);
  }

  // ─── Particle renderer ──────────────────────────────────────────────────────

  function drawParticle(ctx, p, t) {
    const lifeRatio = p.life / p.maxLife;
    // Fade in first 10%, fade out last 20%
    let alpha = p.alpha;
    if (lifeRatio > 0.9) alpha *= (1 - lifeRatio) / 0.1;
    else if (lifeRatio < 0.2) alpha *= lifeRatio / 0.2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    switch (p.type) {

      case 'star': {
        // Twinkle
        const twinkle = 0.6 + 0.4 * Math.sin(t * 2.5 + p.pulse);
        ctx.globalAlpha *= twinkle;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * twinkle, 0, Math.PI * 2);
        ctx.fill();
        // Small glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        g.addColorStop(0, p.color + '55');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'firefly': {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + p.pulse);
        ctx.globalAlpha = alpha * pulse * 0.85;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        g.addColorStop(0, '#ccffcc');
        g.addColorStop(0.4, p.color + 'bb');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Core dot
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'leaf': {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        // Simple ellipse leaf
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vein
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.6, 0);
        ctx.lineTo(p.size * 1.6, 0);
        ctx.stroke();
        break;
      }

      case 'note': {
        ctx.fillStyle = p.color;
        ctx.font = `${Math.round(p.size)}px monospace`;
        ctx.textAlign = 'center';
        // Alternate ♪ ♫
        const noteGlyph = ((Math.floor(p.pulse) % 2) === 0) ? '♪' : '♫';
        ctx.fillText(noteGlyph, p.x, p.y);
        break;
      }

      case 'data': {
        // Single falling character
        ctx.fillStyle = p.color;
        ctx.font = `${Math.round(p.size * 4)}px monospace`;
        ctx.textAlign = 'center';
        const chars = '01アイウエオカキ#@';
        const ch = chars[Math.floor(p.life * 7) % chars.length];
        ctx.fillText(ch, p.x, p.y);
        break;
      }

      case 'spark': {
        // Quick bright line streak
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
        ctx.stroke();
        break;
      }

      default: {
        // Generic dot
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  // ─── Particle step (physics) ─────────────────────────────────────────────────

  function stepParticle(p, dt, W, H) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt * 60;

    if (p.type === 'leaf') {
      p.angle += p.spin * dt * 60;
      // Gentle sway
      p.vx += Math.sin(p.life * 0.05) * 0.002;
    }
    if (p.type === 'firefly') {
      p.vx += (Math.random() - 0.5) * 0.008;
      p.vy += (Math.random() - 0.5) * 0.006;
      // Clamp drift
      p.vx = Math.max(-0.6, Math.min(0.6, p.vx));
      p.vy = Math.max(-0.4, Math.min(0.4, p.vy));
    }
    if (p.type === 'dot' || p.type === 'star') {
      // Very gentle drift sway
      p.vx += (Math.random() - 0.5) * 0.003;
    }

    // Kill OOB
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 80) {
      p.life = 0;
    }
  }

  // ─── Lighting overlays (per floor) ────────────────────────────────────────────

  function renderLighting(ctx, floor, W, H, t) {
    ctx.save();

    // Lighting draws full-screen tints — must use screen space, not world/camera space.
    // Reset to identity so fillRect(0,0,W,H) covers the viewport correctly
    // regardless of camera pan during fast movement or dash.
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Skip lighting for floors that handle their own atmosphere
    // (Cinema, planet rooms, placeholder segments)
    if (floor === 12 || floor >= 20) { ctx.restore(); return; }

    const tod = getTOD();

    switch (floor) {

      case 1: {
        // Warm amber lamp glow — center/upper-center
        const lampY = H * 0.38;
        const g = ctx.createRadialGradient(W / 2, lampY, 30, W / 2, lampY, W * 0.65);
        g.addColorStop(0, 'rgba(255,200,80,0.02)');
        g.addColorStop(0.5, 'rgba(200,120,30,0.01)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        break;
      }

      case 2: {
        // Cool starlight — blue-purple at edges (very subtle)
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.6, 'rgba(60,40,100,0.01)');
        g.addColorStop(1, 'rgba(20,10,60,0.02)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        break;
      }

      case 4: {
        // Green-tinted natural light + subtle sun rays (day only)
        const g = ctx.createRadialGradient(W * 0.5, -30, 10, W * 0.5, -30, H * 1.2);
        g.addColorStop(0, 'rgba(220,255,180,0.07)');
        g.addColorStop(0.5, 'rgba(120,200,80,0.03)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        if (tod !== 'night') {
          // Two subtle sun ray fans
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = '#ffffcc';
          for (let i = 0; i < 4; i++) {
            const rayAngle = -0.4 + i * 0.25;
            ctx.save();
            ctx.translate(W * 0.5, 0);
            ctx.rotate(rayAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-80, H);
            ctx.lineTo(80, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
        break;
      }

      case 6: {
        // Candlelight — warm flickering amber
        const flicker = 0.96 + 0.04 * Math.sin(t * 8.3 + 1.1) * Math.sin(t * 5.7);
        const g = ctx.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H * 0.55, W * 0.6);
        g.addColorStop(0, `rgba(255,180,60,${0.05 * flicker})`);
        g.addColorStop(0.5, `rgba(200,100,20,${0.03 * flicker})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        break;
      }
    }

    // Time-of-day tinting disabled — was causing accumulated brown overlay
    // TODO: re-enable once we confirm single-frame rendering
    // if (tod === 'night') { ... }
    // if (tod === 'dawn') { ... }
    // day / evening: no extra tint needed (covered by existing render)

    ctx.restore();
  }

  // ─── Weather effects (F2 Observatory) ────────────────────────────────────────

  const weatherPool = [];

  function spawnWeather(desc, W, H) {
    if (weatherPool.length >= maxParticles()) return;
    const d = (desc || '').toLowerCase();

    if (d.includes('rain')) {
      weatherPool.push({
        x: Math.random() * W,
        y: -10,
        vx: 0.5 + Math.random() * 0.5,
        vy: 3 + Math.random() * 2,
        life: 80,
        maxLife: 80,
        type: 'rain',
        alpha: 0.18 + Math.random() * 0.1,
        len: 6 + Math.random() * 8,
      });
    } else if (d.includes('snow')) {
      weatherPool.push({
        x: Math.random() * W,
        y: -10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.5 + Math.random() * 0.6,
        life: 300 + Math.random() * 200,
        maxLife: 500,
        type: 'snow',
        size: 1.5 + Math.random() * 2,
        alpha: 0.35 + Math.random() * 0.3,
        wobble: Math.random() * Math.PI * 2,
      });
    } else if (d.includes('cloud')) {
      weatherPool.push({
        x: -60,
        y: 20 + Math.random() * H * 0.35,
        vx: 0.2 + Math.random() * 0.2,
        vy: 0,
        life: 600,
        maxLife: 600,
        type: 'cloud',
        w: 60 + Math.random() * 80,
        h: 20 + Math.random() * 20,
        alpha: 0.07 + Math.random() * 0.06,
      });
    }
  }

  function renderWeather(ctx, W, H, t) {
    const s = getS();
    if (!s || !s.weather) return;
    const desc = (s.weather.desc || '').toLowerCase();

    // Spawn
    if (Math.random() < (desc.includes('rain') ? 0.5 : 0.08)) {
      spawnWeather(desc, W, H);
    }

    // Step + draw
    for (let i = weatherPool.length - 1; i >= 0; i--) {
      const p = weatherPool[i];
      p.life--;

      if (p.type === 'rain') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.life <= 0 || p.y > H + 10) { weatherPool.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = '#aaccee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.len * 0.4, p.y - p.vy * p.len * 0.4);
        ctx.stroke();
        ctx.restore();

      } else if (p.type === 'snow') {
        p.wobble += 0.03;
        p.x += p.vx + Math.sin(p.wobble) * 0.3;
        p.y += p.vy;
        if (p.life <= 0 || p.y > H + 10) { weatherPool.splice(i, 1); continue; }
        const lr = p.life / p.maxLife;
        const a = p.alpha * (lr < 0.1 ? lr / 0.1 : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (p.type === 'cloud') {
        p.x += p.vx;
        if (p.life <= 0 || p.x > W + 100) { weatherPool.splice(i, 1); continue; }
        const lr = p.life / p.maxLife;
        const a = p.alpha * (lr < 0.1 ? lr / 0.1 : lr > 0.9 ? (1 - lr) / 0.1 : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#c8d8f0';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ─── Floor transition fade ────────────────────────────────────────────────────

  const fade = { alpha: 0, dir: 0, cb: null, startTime: 0 };

  function startFloorFade(onMidpoint) {
    fade.alpha = 0;
    fade.dir = 1;       // fading to black
    fade.cb = onMidpoint;
    fade.startTime = performance.now();
  }

  function stepFade(dt) {
    if (fade.dir === 0) return;

    // Safety: force-clear fade if stuck for more than 2 seconds
    if (performance.now() - fade.startTime > 2000) {
      fade.alpha = 0;
      fade.dir = 0;
      fade.cb = null;
      return;
    }

    const speed = dt * (1 / 0.15); // 0.15s half
    if (fade.dir === 1) {
      fade.alpha = Math.min(1, fade.alpha + speed);
      if (fade.alpha >= 1) {
        fade.dir = -1;
        if (typeof fade.cb === 'function') { fade.cb(); fade.cb = null; }
      }
    } else if (fade.dir === -1) {
      fade.alpha = Math.max(0, fade.alpha - speed);
      if (fade.alpha <= 0) fade.dir = 0;
    }
  }

  function renderFade(ctx, W, H) {
    if (fade.alpha <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space — covers viewport during camera movement
    ctx.globalAlpha = fade.alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ─── Hook: intercept floor changes ───────────────────────────────────────────

  let lastFloor = null;
  function checkFloorChange(s) {
    if (!s) return;
    if (lastFloor !== null && lastFloor !== s.floor) {
      // Clear old floor's weather pool on floor change
      weatherPool.length = 0;
      startFloorFade(null);
    }
    lastFloor = s.floor;
  }

  // ─── Main render loop injection ───────────────────────────────────────────────
  //
  // We wrap each window.renderFloorX so after the base floor renders,
  // we layer our effects on top.

  let _lastTime = performance.now();
  let _t = 0; // cumulative time for animations

  /** Called once per frame after each floor render */
  let _lastPolishFrame = -1;
  function onAfterFloorRender(floor) {
    const ctx = getCtx();
    const s   = getS();
    if (!ctx || !s) return;

    // Guard: only run ONCE per animation frame (prevent double-wrap stacking)
    // Use a frame counter tied to rAF, not performance.now() (ms precision too coarse)
    const frameId = Math.round(performance.now() * 10); // 0.1ms precision
    if (frameId === _lastPolishFrame) return;
    _lastPolishFrame = frameId;

    // Save the ENTIRE canvas state before we touch anything —
    // other systems (dash renderer, HUD) may have leaked globalAlpha/fillStyle/etc.
    ctx.save();

    // CRITICAL: reset alpha + composite, but DO NOT reset the transform.
    // The camera system sets a world-space transform (pan/zoom) that must stay active
    // so our overlays draw in world-space with everything else.
    // Resetting via setTransform() was causing overlays to draw at screen origin
    // during fast camera movement / dashing, producing the color-drag artifact.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // (transform intentionally left as-is — inherits camera matrix)

    const now = performance.now();
    const dt  = Math.min((now - _lastTime) / 1000, 0.05);
    _lastTime = now;
    _t += dt;

    const W = getW();
    const H = getH();

    checkFloorChange(s);

    // Lighting overlay
    renderLighting(ctx, floor, W, H, _t);

    // Weather (F2 only)
    if (floor === 2) {
      renderWeather(ctx, W, H, _t);
    }

    // Ambient particles
    const pool = getPool(floor);

    // Spawn ~ every 6 frames on average
    if (Math.random() < 0.18) {
      spawnForFloor(floor, pool, W, H);
    }

    // Step + draw
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      stepParticle(p, dt, W, H);
      if (p.life <= 0) { pool.splice(i, 1); continue; }
      drawParticle(ctx, p, _t);
    }

    // Fade overlay (floor transitions)
    stepFade(dt);
    renderFade(ctx, W, H);

    // Restore canvas state — clean slate for the next system
    ctx.restore();
  }

  /** Wrap a floor renderer to inject our effects after */
  function wrapFloorRenderer(floorNum, fnName) {
    const original = window[fnName];
    if (typeof original !== 'function') return;
    window[fnName] = function () {
      original.apply(this, arguments);
      onAfterFloorRender(floorNum);
    };
  }

  // Wrap floors 1–12
  for (let f = 1; f <= 12; f++) {
    wrapFloorRenderer(f, 'renderFloor' + f);
  }

  // ─── Expose public API for debugging ─────────────────────────────────────────
  window.VisualPolish = {
    pools,
    fade,
    triggerFade: startFloorFade,
    version: '1.0.0',
  };

  console.log('[VisualPolish] ✨ Ghibli-inspired visual polish loaded — v1.0.0');
})();
