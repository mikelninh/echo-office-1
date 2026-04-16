/**
 * floor-warp.js — Hyperspace Transit System
 *
 * Patches window.changeFloor to play a warp-tunnel canvas animation
 * every time you travel between floors. You're on a space station —
 * inter-floor travel should feel like jumping to warp speed.
 *
 * Visual sequence (650ms total):
 *  0 –  80ms  → stars appear near center, tiny
 *  80 – 320ms → stars rush outward, stretching into warp lines
 * 300 – 450ms → destination floor color floods the screen (flash)
 * 450 – 650ms → flash dissolves, overlay fades to black, then gone
 *
 * Integration:
 *  - Patches window.changeFloor (safe — checks for loop / same floor)
 *  - Skips animation if already warping
 *  - Works on desktop + mobile
 */
(function () {
  'use strict';

  // ── Per-floor accent colors ──────────────────────────────────────────────
  const FLOOR_COLORS = {
    1:  '#9b59b6',   // Echo's Quarters   — amethyst
    2:  '#00d4ff',   // Observatory       — cyan
    3:  '#ff6b1a',   // Arcade            — orange
    4:  '#44cc55',   // Garden            — green
    5:  '#2288dd',   // Lab               — steel blue
    6:  '#dd44bb',   // Record Room       — magenta
    7:  '#ffbb00',   // Community Deck    — amber
    8:  '#7755ee',   // Room Builder      — indigo
    9:  '#ff3355',   // Underground       — crimson
    10: '#00aa77',   // Sub-level         — teal
    11: '#ff8800',   // Reactor           — fire
    12: '#5566aa',   // Maintenance       — slate
    13: '#00ccbb',   // Podcast Studio    — seafoam
  };

  // ── Warp canvas (lives above everything, pointer-events off) ─────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'floor-warp-canvas';
  canvas.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100vw',
    'height:100vh',
    'z-index:9600',
    'pointer-events:none',
    'opacity:0',
  ].join(';');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let raf = null;
  let active = false;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ── Hex → [r, g, b] ─────────────────────────────────────────────────────
  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  // ── Ease functions ───────────────────────────────────────────────────────
  function easeIn(t)  { return t * t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ── Core warp animation ──────────────────────────────────────────────────
  function playWarp(destFloor, onMidpoint) {
    if (active) { onMidpoint(); return; }
    active = true;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;

    const color = FLOOR_COLORS[destFloor] || '#9b59b6';
    const [cr, cg, cb] = hexRgb(color);

    // Generate star field — random angles, initial dist near center
    const STAR_COUNT = 160;
    const stars = Array.from({ length: STAR_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const baseDist = 6 + Math.random() * 30;
      const speed    = 0.6 + Math.random() * 3.2;
      const girth    = 0.4 + Math.random() * 1.4;
      const bright   = 0.5 + Math.random() * 0.5;
      // slight color tint toward destination color
      const tint = Math.random() * 0.4;
      return { angle, baseDist, speed, girth, bright, tint };
    });

    const DURATION  = 650;   // ms
    const MIDPOINT  = 300;   // ms — floor actually changes here
    const FLASH_IN  = 260;   // ms — color flash begins
    const FLASH_OUT = 480;   // ms — color flash ends

    let t0 = null;
    let midFired = false;

    canvas.style.opacity = '1';

    function frame(ts) {
      if (!t0) t0 = ts;
      const elapsed = ts - t0;
      const progress = Math.min(elapsed / DURATION, 1);

      // Fire the real floor change at the midpoint
      if (elapsed >= MIDPOINT && !midFired) {
        midFired = true;
        onMidpoint();
      }

      // ── Background darkness ─────────────────────────────────────────────
      // Build up to full black, then fade back after flash
      let bgAlpha;
      if (progress < 0.55) {
        bgAlpha = easeIn(progress / 0.55) * 0.92;
      } else {
        bgAlpha = 0.92 * easeOut(1 - (progress - 0.55) / 0.45);
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,8,${bgAlpha})`;
      ctx.fillRect(0, 0, W, H);

      // ── Warp stars (only during first half) ────────────────────────────
      const warpT = Math.min(elapsed / MIDPOINT, 1);
      if (warpT < 1.05) {
        const warpEased = easeIn(warpT);

        for (const s of stars) {
          const dist = s.baseDist + warpEased * warpEased * maxR * 1.3 * s.speed;
          if (dist > maxR) continue;

          // Stretch length: short near center, long near edge
          const stretch = 2 + warpEased * 80 * s.speed;
          const tailDist = Math.max(s.baseDist, dist - stretch);

          const x1 = cx + Math.cos(s.angle) * dist;
          const y1 = cy + Math.sin(s.angle) * dist;
          const x2 = cx + Math.cos(s.angle) * tailDist;
          const y2 = cy + Math.sin(s.angle) * tailDist;

          // Color: white with slight destination tint
          const ri = Math.round(200 + s.tint * (cr - 200));
          const gi = Math.round(210 + s.tint * (cg - 210));
          const bi = Math.round(255 + s.tint * (cb - 255));
          const alpha = s.bright * bgAlpha;

          ctx.strokeStyle = `rgba(${ri},${gi},${bi},${alpha})`;
          ctx.lineWidth   = s.girth * (1 + warpEased * 0.8);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Central glow — the tunnel mouth
        const glowR = 20 + warpEased * 120;
        const glow  = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glow.addColorStop(0,   `rgba(${cr},${cg},${cb},${0.35 * warpEased})`);
        glow.addColorStop(0.4, `rgba(${cr},${cg},${cb},${0.12 * warpEased})`);
        glow.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Destination color flash ─────────────────────────────────────────
      if (elapsed >= FLASH_IN && elapsed <= FLASH_OUT) {
        const ft = (elapsed - FLASH_IN) / (FLASH_OUT - FLASH_IN);
        // Bell curve: peaks at midpoint of flash window
        const flashAlpha = ft < 0.45
          ? easeIn(ft / 0.45) * 0.52
          : easeOut(1 - (ft - 0.45) / 0.55) * 0.52;

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Radial bloom at center
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
        bloom.addColorStop(0,   `rgba(${cr},${cg},${cb},${flashAlpha * 0.7})`);
        bloom.addColorStop(0.5, `rgba(${cr},${cg},${cb},${flashAlpha * 0.2})`);
        bloom.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, W, H);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        // Ensure midpoint fires even if duration was cut short
        if (!midFired) { midFired = true; onMidpoint(); }
        canvas.style.opacity = '0';
        setTimeout(() => { active = false; }, 100);
      }
    }

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  // ── Patch window.changeFloor ─────────────────────────────────────────────
  // We wait 900ms after DOMContentLoaded to let all other scripts (echo systems,
  // nav-inject, etc.) finish stacking their own patches. Then we wrap the final
  // version so our animation is the outermost layer.
  function install() {
    const orig = window.changeFloor;
    if (typeof orig !== 'function') {
      setTimeout(install, 250);
      return;
    }

    window.changeFloor = function warpedChangeFloor(f) {
      const cur = (window.S && window.S.floor) ? window.S.floor : 0;

      // No animation if same floor or already mid-warp
      if (f === cur || active) {
        orig.call(this, f);
        return;
      }

      playWarp(f, function () { orig.call(window, f); });
    };

    // Preserve label for devtools clarity
    Object.defineProperty(window.changeFloor, 'name', { value: 'warpedChangeFloor' });

    console.log('[FloorWarp] ✨ Hyperspace transit online — warp to any floor');
  }

  // Allow time for all other script patches (echo-memory, echo-startrail, etc.)
  const PATCH_DELAY = 950;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, PATCH_DELAY));
  } else {
    setTimeout(install, PATCH_DELAY);
  }

  // Expose for debugging
  window.FloorWarp = { playWarp, active: () => active };
})();
