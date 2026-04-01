/**
 * observatory-deepspace.js — The Living Observatory
 * Echo's Vault · Nightly Build 2026-04-01
 *
 * Transforms Floor 2 from a static star loop into a breathing,
 * parallax deep-space window. Features:
 *   • 3-layer parallax starfield (near / mid / far) with per-star twinkle
 *   • Real star colors (O/B/A/F/G/K/M spectral classes)
 *   • Automatic shooting stars with glowing trails
 *   • Click-the-dome → visitor-triggered shooting star + "Make a wish" prompt
 *   • Persistent personal star — stored in localStorage, visible every visit
 *   • Mouse parallax — stars shift subtly as you move, feels 3D
 *   • Deep-space nebula breath (slow radial pulse)
 *   • Constellation hints glow when near telescope
 *
 * Hooks into the existing render loop by wrapping window.renderFloor2.
 * All state is local — no external dependencies, no server calls.
 */
(function DeepSpace() {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────────────────
  const DOME = { x: 40, y: 0, w: 720, h: 280 };  // observatory window in canvas coords
  const LS_WISHES = 'echo_star_wishes_v1';
  const MAX_WISHES = 20;
  const SHOOTING_INTERVAL_MIN = 8000;   // ms
  const SHOOTING_INTERVAL_MAX = 22000;  // ms

  // Spectral color palette (hot blue → cool red)
  const STAR_COLORS = [
    '#b0ccff', // O - blue-white
    '#c8d8ff', // B - blue-white
    '#dde8ff', // A - white
    '#fff8f0', // F - yellow-white
    '#fffbe0', // G - yellow (sun-like)
    '#ffd07a', // K - orange
    '#ff9966', // M - red-orange
  ];

  // Named constellations that can be "glimpsed" through the dome
  const CONSTELLATION_GLIMPSES = [
    { name: 'Orion', myth: 'The Hunter', emoji: '⚔️' },
    { name: 'Lyra',  myth: 'Orpheus\'s Lyre', emoji: '🎵' },
    { name: 'Cassiopeia', myth: 'The Queen', emoji: '👑' },
    { name: 'Scorpius', myth: 'The Scorpion', emoji: '🦂' },
    { name: 'Cygnus', myth: 'The Swan', emoji: '🦢' },
  ];

  // ─── State ─────────────────────────────────────────────────────────────────
  const state = {
    stars: {
      far:  [],   // 80 tiny dim stars, slowest drift
      mid:  [],   // 50 medium stars
      near: [],   // 20 larger bright stars, fastest drift
    },
    shooters: [],           // active shooting stars
    nextShooter: 0,         // Date.now() when next auto-shooter fires
    wishes: [],             // persistent personal stars { x, y, text, color, id }
    mouse: { x: -1, y: -1 },// raw canvas mouse pos
    parallax: { ox: 0, oy: 0 },// interpolated parallax offset
    wishPromptOpen: false,
    glimmerTimer: 0,        // counts up; at threshold shows constellation name
    glimmerName: null,
    canvas: null,
    _clickHandler: null,
    _moveHandler: null,
    initialized: false,
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function getS() { return window.S; }
  function getCtx() { return window.ctx; }

  function domeRandX() { return DOME.x + rand(0, DOME.w); }
  function domeRandY() { return DOME.y + rand(0, DOME.h); }
  function inDome(x, y) {
    return x >= DOME.x && x <= DOME.x + DOME.w &&
           y >= DOME.y && y <= DOME.y + DOME.h;
  }

  // ─── Seed stars ────────────────────────────────────────────────────────────
  function buildStars() {
    // Far layer: 80 1px dim specks
    for (let i = 0; i < 80; i++) {
      state.stars.far.push({
        bx: rand(0, DOME.w),    // base X within dome-relative coords
        by: rand(0, DOME.h),
        size: rand(0.5, 1),
        color: STAR_COLORS[randInt(0, STAR_COLORS.length - 1)],
        twinklePhase: rand(0, Math.PI * 2),
        twinkleSpeed: rand(0.3, 0.9),
        baseBrightness: rand(0.10, 0.30),
        layer: 'far',
        driftX: rand(-0.008, 0.008), // px per frame
      });
    }
    // Mid layer: 50 medium stars
    for (let i = 0; i < 50; i++) {
      state.stars.mid.push({
        bx: rand(0, DOME.w),
        by: rand(0, DOME.h),
        size: rand(1, 2),
        color: STAR_COLORS[randInt(0, STAR_COLORS.length - 1)],
        twinklePhase: rand(0, Math.PI * 2),
        twinkleSpeed: rand(0.5, 1.4),
        baseBrightness: rand(0.20, 0.50),
        layer: 'mid',
        driftX: rand(-0.004, 0.004),
      });
    }
    // Near layer: 20 larger bright stars (some get a soft glow)
    for (let i = 0; i < 20; i++) {
      state.stars.near.push({
        bx: rand(0, DOME.w),
        by: rand(0, DOME.h),
        size: rand(1.5, 3),
        color: STAR_COLORS[randInt(0, 4)], // hotter stars more common in near
        twinklePhase: rand(0, Math.PI * 2),
        twinkleSpeed: rand(0.8, 2.0),
        baseBrightness: rand(0.45, 0.90),
        glow: Math.random() < 0.4,
        layer: 'near',
        driftX: rand(-0.002, 0.002),
      });
    }
  }

  // ─── Load / save wishes ────────────────────────────────────────────────────
  function loadWishes() {
    try {
      const raw = localStorage.getItem(LS_WISHES);
      state.wishes = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.wishes)) state.wishes = [];
    } catch (_) { state.wishes = []; }
  }

  function saveWishes() {
    try { localStorage.setItem(LS_WISHES, JSON.stringify(state.wishes)); }
    catch (_) {}
  }

  // ─── Shooting star factory ──────────────────────────────────────────────────
  function spawnShooter(fromX, fromY, triggered) {
    const angle = rand(Math.PI * 0.55, Math.PI * 0.95); // ~bottom-right direction
    const speed = rand(triggered ? 6 : 4, triggered ? 10 : 7);
    const length = rand(60, 140);
    state.shooters.push({
      x: fromX,
      y: fromY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length,
      life: 1.0,
      decay: rand(0.015, 0.030),
      color: '#e8f0ff',
      glow: triggered,
    });
  }

  function scheduleNextShooter() {
    state.nextShooter = Date.now() + rand(SHOOTING_INTERVAL_MIN, SHOOTING_INTERVAL_MAX);
  }

  // ─── Open wish prompt ──────────────────────────────────────────────────────
  function openWishPrompt(canvasX, canvasY) {
    if (state.wishPromptOpen) return;
    state.wishPromptOpen = true;

    // Normalize to dome-relative
    const dx = clamp((canvasX - DOME.x) / DOME.w, 0.05, 0.95);
    const dy = clamp((canvasY - DOME.y) / DOME.h, 0.05, 0.95);

    // Build overlay
    const ov = document.createElement('div');
    ov.id = 'ds-wish-overlay';
    ov.style.cssText = [
      'position:fixed;inset:0;background:rgba(2,4,18,0.82)',
      'z-index:8888;display:flex;align-items:center;justify-content:center',
      'backdrop-filter:blur(4px);transition:opacity 0.3s',
    ].join(';');

    ov.innerHTML = `
      <div id="ds-wish-box" style="
        background:linear-gradient(135deg,#0d0d2b,#1a0d3a);
        border:1.5px solid #4a3a8a;
        border-radius:16px;
        padding:28px 32px;
        max-width:340px;
        width:92%;
        text-align:center;
        box-shadow:0 0 40px rgba(120,80,200,0.25),0 2px 8px rgba(0,0,0,0.5);
        color:#ddd;
        font-family:'Space Grotesk',system-ui,sans-serif;
        position:relative;
      ">
        <div style="font-size:28px;margin-bottom:8px;">✨</div>
        <h3 style="margin:0 0 6px;color:#c8aaff;font-size:17px;font-weight:700;">Make a Wish</h3>
        <p style="margin:0 0 18px;font-size:12px;color:#8880a8;line-height:1.5;">
          Your star will be placed right there — glowing in the dome every time you visit.
        </p>
        <input id="ds-wish-input" type="text"
          placeholder="Wish upon a star…"
          maxlength="60"
          style="
            width:100%;box-sizing:border-box;
            background:#09091e;border:1px solid #3a3a6a;border-radius:8px;
            color:#e8e0ff;font-size:13px;padding:10px 12px;
            outline:none;font-family:inherit;margin-bottom:4px;
          "
        />
        <div style="font-size:10px;color:#4a4a6a;margin-bottom:16px;text-align:right" id="ds-wish-chars">60 chars left</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button id="ds-wish-cancel" style="
            background:transparent;border:1px solid #333;border-radius:8px;
            color:#666;padding:8px 20px;cursor:pointer;font-size:13px;font-family:inherit;
          ">Cancel</button>
          <button id="ds-wish-submit" style="
            background:linear-gradient(135deg,#5a2ea0,#8844cc);
            border:none;border-radius:8px;
            color:#fff;padding:8px 20px;cursor:pointer;font-size:13px;
            font-family:inherit;font-weight:600;
            box-shadow:0 0 12px rgba(150,80,220,0.4);
          ">Place My Star ⭐</button>
        </div>
      </div>
    `;

    document.body.appendChild(ov);

    const input = ov.querySelector('#ds-wish-input');
    const chars = ov.querySelector('#ds-wish-chars');
    input.focus();
    input.addEventListener('input', () => {
      chars.textContent = `${60 - input.value.length} chars left`;
    });

    const close = () => {
      ov.style.opacity = '0';
      setTimeout(() => { ov.remove(); state.wishPromptOpen = false; }, 300);
    };

    ov.querySelector('#ds-wish-cancel').addEventListener('click', close);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });

    ov.querySelector('#ds-wish-submit').addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      const color = STAR_COLORS[randInt(0, STAR_COLORS.length - 1)];
      const wish = {
        id: Date.now(),
        text,
        dx, dy,
        color,
        size: rand(2.5, 4),
        twinklePhase: rand(0, Math.PI * 2),
        sparkTimer: 1.0,  // starts bright, normalizes
      };
      state.wishes.push(wish);
      if (state.wishes.length > MAX_WISHES) state.wishes.shift();
      saveWishes();
      close();

      // Show a warm confirmation thought
      if (typeof showThought === 'function') {
        showThought(`✨ "${text.slice(0,30)}${text.length>30?'…':''}"`, 5);
      }
    });

    // ESC to close
    const esc = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    };
    document.addEventListener('keydown', esc);
  }

  // ─── Canvas interaction setup ──────────────────────────────────────────────
  function setupInteractions(canvas) {
    state.canvas = canvas;

    state._moveHandler = (e) => {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / r.width;
      const scaleY = canvas.height / r.height;
      const cx = (e.clientX - r.left) * scaleX;
      const cy = (e.clientY - r.top)  * scaleY;
      state.mouse.x = cx;
      state.mouse.y = cy;
    };

    state._clickHandler = (e) => {
      const s = getS();
      if (!s || s.floor !== 2) return;
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / r.width;
      const scaleY = canvas.height / r.height;
      const cx = (e.clientX - r.left) * scaleX;
      const cy = (e.clientY - r.top)  * scaleY;
      if (!inDome(cx, cy)) return;

      // Trigger a shooting star from click point
      spawnShooter(cx, cy, true);

      // If near the top of the dome, offer wish prompt
      if (cy < DOME.y + DOME.h * 0.75 && !state.wishPromptOpen) {
        openWishPrompt(cx, cy);
      }
    };

    canvas.addEventListener('mousemove', state._moveHandler, { passive: true });
    canvas.addEventListener('click', state._clickHandler);
  }

  // ─── Main draw hook — called from within renderFloor2 override ─────────────
  function draw(ctx, S, W, H) {
    const now = Date.now();
    const t = S.time || 0;

    // --- Parallax offset from mouse ---
    const centerX = DOME.x + DOME.w / 2;
    const centerY = DOME.y + DOME.h / 2;
    const mxNorm = (state.mouse.x >= 0) ? (state.mouse.x - centerX) / (DOME.w / 2) : 0;
    const myNorm = (state.mouse.y >= 0) ? (state.mouse.y - centerY) / (DOME.h / 2) : 0;
    state.parallax.ox = lerp(state.parallax.ox, mxNorm * -8, 0.04);
    state.parallax.oy = lerp(state.parallax.oy, myNorm * -4, 0.04);

    // Clip to dome window
    ctx.save();
    ctx.beginPath();
    ctx.rect(DOME.x, DOME.y, DOME.w, DOME.h);
    ctx.clip();

    // --- Draw star layers ---
    const layers = [
      { stars: state.stars.far,  parallaxMult: 0.3 },
      { stars: state.stars.mid,  parallaxMult: 0.6 },
      { stars: state.stars.near, parallaxMult: 1.0 },
    ];

    layers.forEach(({ stars, parallaxMult }) => {
      stars.forEach(star => {
        // Drift over time (very slow)
        star.bx = (star.bx + star.driftX + DOME.w) % DOME.w;

        const px = DOME.x + star.bx + state.parallax.ox * parallaxMult;
        const py = DOME.y + star.by + state.parallax.oy * parallaxMult * 0.5;

        const tw = Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        const alpha = clamp(star.baseBrightness + tw * (star.baseBrightness * 0.6), 0.05, 1.0);

        if (star.glow) {
          // Soft glow halo
          const grad = ctx.createRadialGradient(px, py, 0, px, py, star.size * 4);
          grad.addColorStop(0, `${star.color}${Math.round(alpha * 80).toString(16).padStart(2,'0')}`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(px - star.size * 4, py - star.size * 4, star.size * 8, star.size * 8);
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.globalAlpha = 1;

    // --- Auto shooting stars ---
    if (now >= state.nextShooter) {
      // Spawn from a random top-left edge of dome
      spawnShooter(
        rand(DOME.x, DOME.x + DOME.w * 0.6),
        rand(DOME.y, DOME.y + DOME.h * 0.3),
        false
      );
      scheduleNextShooter();
    }

    // --- Draw + update shooting stars ---
    state.shooters = state.shooters.filter(s => s.life > 0);
    state.shooters.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;

      const tailX = s.x - s.vx * (s.length / Math.hypot(s.vx, s.vy));
      const tailY = s.y - s.vy * (s.length / Math.hypot(s.vx, s.vy));

      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      const headAlpha = Math.min(s.life, 0.95).toFixed(2);
      grad.addColorStop(0, `rgba(230,240,255,${headAlpha})`);
      if (s.glow) grad.addColorStop(0.1, `rgba(180,160,255,${(s.life * 0.8).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(150,160,255,0)');

      ctx.lineWidth = s.glow ? 2 : 1.5;
      ctx.strokeStyle = grad;
      ctx.shadowColor = s.glow ? '#a080ff' : '#c0d0ff';
      ctx.shadowBlur = s.glow ? 10 : 4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Head sparkle
      if (s.life > 0.3) {
        ctx.globalAlpha = s.life * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // --- Draw personal wish stars ---
    state.wishes.forEach(w => {
      const wx = DOME.x + w.dx * DOME.w + state.parallax.ox * 0.8;
      const wy = DOME.y + w.dy * DOME.h + state.parallax.oy * 0.4;

      // Twinkle
      const tw = Math.sin(t * 1.5 + w.twinklePhase);
      const alpha = clamp(0.65 + tw * 0.3, 0.4, 1.0);

      // Decay sparkle on fresh placement
      if (w.sparkTimer > 0) {
        w.sparkTimer -= 0.008;
        const sp = Math.max(0, w.sparkTimer);
        const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, w.size * (3 + sp * 8));
        grad.addColorStop(0, `rgba(255,230,180,${(sp * 0.6).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(wx - w.size * 12, wy - w.size * 12, w.size * 24, w.size * 24);
      }

      // Glow halo
      const halo = ctx.createRadialGradient(wx, wy, 0, wx, wy, w.size * 5);
      halo.addColorStop(0, `rgba(255,230,180,${(alpha * 0.3).toFixed(2)})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(wx - w.size * 5, wy - w.size * 5, w.size * 10, w.size * 10);

      // Star body (4-point sparkle shape)
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(t * 0.3 + w.twinklePhase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = w.color;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-w.size * 0.3, w.size * 0.8);
        ctx.lineTo(0, w.size * 1.5);
        ctx.lineTo(w.size * 0.3, w.size * 0.8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Hover tooltip — show wish text
      const mdx = state.mouse.x - wx;
      const mdy = state.mouse.y - wy;
      if (mdx * mdx + mdy * mdy < 64) {
        ctx.save();
        const label = `"${w.text}"`;
        ctx.font = 'bold 9px "Space Grotesk",monospace';
        const tw2 = ctx.measureText(label).width;
        const bx = clamp(wx - tw2 / 2 - 6, DOME.x + 2, DOME.x + DOME.w - tw2 - 14);
        const by = clamp(wy - 22, DOME.y + 2, DOME.y + DOME.h - 16);
        ctx.fillStyle = 'rgba(8,6,24,0.85)';
        ctx.beginPath();
        ctx.roundRect(bx, by, tw2 + 12, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#e0d0ff';
        ctx.fillText(label, bx + 6, by + 11);
        ctx.restore();
      }
    });

    // --- Constellation hint (near telescope) ---
    const tl = (window.getObjects ? window.getObjects() : []).find(o => o.id === 'telescope_main');
    if (tl) {
      const v = (S.visitor || {});
      const dist = Math.hypot((v.x||0) - (tl.x + tl.w/2), (v.y||0) - (tl.y + tl.h/2));
      if (dist < 120) {
        state.glimmerTimer += 0.02;
        if (state.glimmerTimer > 3) {
          state.glimmerTimer = 0;
          const pick = CONSTELLATION_GLIMPSES[randInt(0, CONSTELLATION_GLIMPSES.length - 1)];
          state.glimmerName = pick;
        }
      } else {
        state.glimmerTimer = Math.max(0, state.glimmerTimer - 0.01);
      }
    }

    if (state.glimmerName) {
      const g = state.glimmerName;
      const alpha = clamp(Math.sin(t * 0.5) * 0.5 + 0.5, 0.2, 0.85);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 10px "Space Grotesk",monospace';
      const label = `${g.emoji} ${g.name} · ${g.myth}`;
      const lw = ctx.measureText(label).width;
      const lx = DOME.x + DOME.w / 2 - lw / 2;
      const ly = DOME.y + DOME.h - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(lx - 6, ly - 11, lw + 12, 14);
      ctx.fillStyle = '#ccc0ff';
      ctx.fillText(label, lx, ly);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.restore(); // remove clip
  }

  // ─── Install: wrap renderFloor2 ────────────────────────────────────────────
  function install() {
    if (state.initialized) return;
    state.initialized = true;

    buildStars();
    loadWishes();
    scheduleNextShooter();

    // Setup mouse/click on the game canvas
    const canvas = document.querySelector('canvas#gameCanvas') ||
                   document.querySelector('canvas') ||
                   document.getElementById('c');
    if (canvas) setupInteractions(canvas);

    // Wrap renderFloor2
    const _origRF2 = window.renderFloor2;
    window.renderFloor2 = function renderFloor2Enhanced() {
      _origRF2();
      const ctx = window.ctx;
      const S = window.S;
      const W = window.W || 800;
      const H = window.H || 600;
      if (ctx && S && S.floor === 2) {
        draw(ctx, S, W, H);
      }
    };

    // Add a hint to Echo's thought pool so she mentions the stars sometimes
    if (window.BASE_THOUGHTS && Array.isArray(window.BASE_THOUGHTS)) {
      window.BASE_THOUGHTS.push(
        '✨ Did you know you can click the dome window to make a wish?',
        'The stars look alive tonight... try clicking one.',
        'Someone left their wish in the dome. Can you find it?'
      );
    }

    if (window.FLOOR_THOUGHTS && Array.isArray(window.FLOOR_THOUGHTS)) {
      const ft = window.FLOOR_THOUGHTS;
      const existing = ft[2] || [];
      ft[2] = [
        ...existing,
        'Click the dome to shoot a star ✨',
        'Wish on a star — it stays here for you.',
      ];
    }
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  // Wait until main game is ready (renderFloor2 exists)
  function boot() {
    if (typeof window.renderFloor2 === 'function') {
      install();
    } else {
      setTimeout(boot, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500));
  } else {
    setTimeout(boot, 500);
  }

})();
