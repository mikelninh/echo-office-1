// ═══════════════════════════════════════════════════════════════
// FLOOR 1: ECHO'S BAR — Complete Visual Overhaul
// Inspired by Prince Bar Berlin, warm & luxurious pixel art
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Override the existing renderFloor1 with this enhanced version
  window._originalRenderFloor1 = window.renderFloor1;

  window.renderFloor1 = function() {
    // Read vars lazily (they're set after first script block completes)
    const ctx=window._ctx, W=window._W, H=window._H, S=window._S, LS=window._LS;
    const getObjects=window._getObjects;
    if(!ctx||!S)return; // not ready yet

    if (typeof FloorDepth !== 'undefined') FloorDepth.renderBackground(ctx, 1);

    const t = S.time;
    const TOD = typeof getTimeOfDay === 'function' ? getTimeOfDay() : 'evening';

    // ────────────────────────────────────────────────
    // FLOOR — Herringbone wood parquet (Prince-style)
    // ────────────────────────────────────────────────
    const woodDark = '#2a2218';
    const woodMid = '#3d3225';
    const woodLight = '#4a3d30';
    const woodHighlight = '#554838';
    const tileW = 12, tileH = 6;
    for (let ty = 50; ty < H; ty += tileH) {
      for (let tx = 0; tx < W; tx += tileW) {
        const row = Math.floor(ty / tileH);
        const col = Math.floor(tx / tileW);
        const isEven = (row + col) % 2 === 0;
        // Herringbone alternation
        if (isEven) {
          ctx.fillStyle = ((col + row) % 4 < 2) ? woodMid : woodDark;
        } else {
          ctx.fillStyle = ((col + row) % 3 === 0) ? woodHighlight : woodLight;
        }
        ctx.fillRect(tx, ty, tileW, tileH);
        // Subtle wood grain line
        if ((col * 7 + row * 3) % 5 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(tx, ty + tileH / 2, tileW, 1);
        }
      }
    }

    // ────────────────────────────────────────────────
    // WALLS — Dark paneled with wainscoting & molding
    // ────────────────────────────────────────────────
    // Back wall (top)
    const wallGrad = ctx.createLinearGradient(0, 0, 0, 55);
    wallGrad.addColorStop(0, '#0e0a08');
    wallGrad.addColorStop(1, '#1a1410');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, 55);

    // Side walls
    ctx.fillStyle = '#130f0c';
    ctx.fillRect(0, 0, 15, H);
    ctx.fillRect(W - 15, 0, 15, H);

    // Wainscoting panels on back wall
    ctx.fillStyle = '#221a14';
    for (let i = 0; i < 10; i++) {
      const px = 20 + i * 78;
      ctx.fillRect(px, 8, 70, 38);
      // Panel inner bevel
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(px + 3, 11, 64, 32);
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(px + 5, 13, 60, 28);
      ctx.fillStyle = '#221a14';
    }

    // Crown molding
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(0, 50, W, 3);
    ctx.fillStyle = '#8a6a30';
    ctx.fillRect(0, 53, W, 2);

    // Baseboard
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(0, H - 10, W, 2);

    // ────────────────────────────────────────────────
    // CEILING BEAMS — Exposed dark wood
    // ────────────────────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const bx = 60 + i * 130;
      ctx.fillStyle = '#1e1812';
      ctx.fillRect(bx, 0, 70, 10);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(bx + 2, 2, 66, 6);
      // Beam bracket
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(bx, 10, 4, 6);
      ctx.fillRect(bx + 66, 10, 4, 6);
    }

    // ────────────────────────────────────────────────
    // COPPER PIPES — Industrial accent on ceiling
    // ────────────────────────────────────────────────
    ctx.strokeStyle = '#a05030';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, 6);
    for (let i = 0; i < W; i += 40) {
      ctx.lineTo(i + 20, 4 + Math.sin(i * 0.02) * 3);
    }
    ctx.stroke();
    // Pipe joints
    for (let i = 0; i < W; i += 130) {
      ctx.fillStyle = '#c06040';
      ctx.fillRect(i + 58, 2, 8, 8);
    }

    // ────────────────────────────────────────────────
    // PENDANT LIGHTS — Warm cream lotus-shaped
    // ────────────────────────────────────────────────
    const lights = [
      {x: 200, y: 120}, {x: 400, y: 100}, {x: 600, y: 120},
      {x: 140, y: 260}, {x: 660, y: 260}
    ];
    lights.forEach((lp, i) => {
      const sway = Math.sin(t * 0.4 + i * 1.7) * 2;
      const flicker = 0.85 + Math.sin(t * 3 + i * 2.3) * 0.1;

      // Cord
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lp.x, 0);
      ctx.lineTo(lp.x + sway, lp.y - 20);
      ctx.stroke();

      // Shade (warm cream parasol)
      const shadeR = 22;
      ctx.fillStyle = `rgba(240,225,195,${0.7 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(lp.x + sway, lp.y - 14, shadeR, shadeR * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shade rim (scalloped)
      ctx.strokeStyle = `rgba(210,195,165,${0.5 * flicker})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(lp.x + sway, lp.y - 14, shadeR, shadeR * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Bulb glow
      const bulbG = ctx.createRadialGradient(lp.x + sway, lp.y - 10, 0, lp.x + sway, lp.y - 10, 8);
      bulbG.addColorStop(0, `rgba(255,230,180,${0.9 * flicker})`);
      bulbG.addColorStop(1, `rgba(255,200,120,0)`);
      ctx.fillStyle = bulbG;
      ctx.beginPath();
      ctx.arc(lp.x + sway, lp.y - 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Light cone on floor
      const coneG = ctx.createRadialGradient(lp.x, lp.y + 80, 0, lp.x, lp.y + 80, 70);
      coneG.addColorStop(0, `rgba(255,220,160,${0.08 * flicker})`);
      coneG.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = coneG;
      ctx.beginPath();
      ctx.ellipse(lp.x, lp.y + 80, 70, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // ────────────────────────────────────────────────
    // THE BAR — Grand oval centerpiece
    // ────────────────────────────────────────────────
    const bar = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'bar_counter');
    if (bar) {
      const bx = bar.x, by = bar.y, bw = bar.w, bh = bar.h;
      const cx_ = bx + bw / 2, cy_ = by + bh / 2;
      const rx = bw / 2, ry = bh / 2;

      // Floor glow under bar
      const barFloor = ctx.createRadialGradient(cx_, cy_, rx * 0.3, cx_, cy_, rx * 2.5);
      barFloor.addColorStop(0, 'rgba(200,160,80,0.06)');
      barFloor.addColorStop(1, 'rgba(200,160,80,0)');
      ctx.fillStyle = barFloor;
      ctx.beginPath();
      ctx.ellipse(cx_, cy_, rx * 2.5, ry * 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bar shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx_ + 4, cy_ + 6, rx + 3, ry + 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bar body — brushed brass with gradient
      const barBody = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      barBody.addColorStop(0, '#6a5020');
      barBody.addColorStop(0.2, '#9a7a38');
      barBody.addColorStop(0.35, '#c8a050');
      barBody.addColorStop(0.5, '#ddb860');
      barBody.addColorStop(0.65, '#c8a050');
      barBody.addColorStop(0.8, '#9a7a38');
      barBody.addColorStop(1, '#6a5020');
      ctx.fillStyle = barBody;
      ctx.beginPath();
      ctx.ellipse(cx_, cy_, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ribbed brass texture
      ctx.save();
      ctx.clip();
      for (let i = -rx; i < rx; i += 4) {
        const edgeFac = Math.sqrt(1 - (i * i) / (rx * rx));
        if (edgeFac <= 0) continue;
        ctx.strokeStyle = `rgba(255,220,150,${edgeFac * 0.12})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx_ + i, cy_ - ry * edgeFac);
        ctx.lineTo(cx_ + i, cy_ + ry * edgeFac);
        ctx.stroke();
      }
      ctx.restore();

      // Bar top rim
      ctx.strokeStyle = 'rgba(255,220,150,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx_, cy_, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Counter top — polished marble
      const marble = ctx.createRadialGradient(cx_ - 20, cy_ - 10, 0, cx_, cy_, rx - 8);
      marble.addColorStop(0, '#f0ebe4');
      marble.addColorStop(0.5, '#e8e2da');
      marble.addColorStop(1, '#d8d0c6');
      ctx.fillStyle = marble;
      ctx.beginPath();
      ctx.ellipse(cx_, cy_ - 4, rx - 8, ry - 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Marble veins
      ctx.strokeStyle = 'rgba(170,160,145,0.25)';
      ctx.lineWidth = 0.7;
      for (let v = 0; v < 8; v++) {
        ctx.beginPath();
        const vx = cx_ - rx / 2 + v * rx / 4;
        const vy = cy_ - ry / 3;
        ctx.moveTo(vx, vy);
        ctx.bezierCurveTo(vx + 15, vy + 20, vx - 10, vy + 35, vx + 5, vy + 50);
        ctx.stroke();
      }

      // Inner bar well (dark — Echo's workspace)
      const innerGrad = ctx.createRadialGradient(cx_, cy_, 10, cx_, cy_, rx - 22);
      innerGrad.addColorStop(0, '#1e1812');
      innerGrad.addColorStop(1, '#150f0a');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.ellipse(cx_, cy_ - 3, rx - 22, ry - 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── BACK BAR SHELVING (inside the oval) ──
      // Three-tier shelf arc
      for (let tier = 0; tier < 3; tier++) {
        const shelfR = rx - 30 - tier * 12;
        const shelfRy = (ry - 30 - tier * 12) * 0.5;
        // Shelf surface
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx_, cy_ - 5 - tier * 8, shelfR, shelfRy, 0, Math.PI * 0.85, Math.PI * 0.15, true);
        ctx.stroke();
      }

      // ── BOTTLES on shelves ──
      drawBottleRow(ctx, cx_, cy_, rx, ry, t);

      // ── GLASSES on counter ──
      drawBarGlasses(ctx, cx_, cy_, rx, ry, t);

      // ── BAR STOOLS ──
      const stoolAngles = [0.15, 0.35, 0.65, 0.85, 1.15, 1.35, 1.65, 1.85];
      stoolAngles.forEach((a, i) => {
        const angle = a * Math.PI;
        const sx = cx_ + Math.cos(angle) * (rx + 18);
        const sy = cy_ + Math.sin(angle) * (ry + 18);
        // Stool shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(sx - 7, sy + 10, 16, 4);
        // Chrome stem
        ctx.fillStyle = '#888';
        ctx.fillRect(sx - 1, sy, 4, 14);
        // Footrest ring
        ctx.fillStyle = '#666';
        ctx.fillRect(sx - 5, sy + 8, 12, 2);
        // Velvet seat (olive green)
        const seated = false; // TODO: check if player sitting
        ctx.fillStyle = seated ? '#4a7a48' : '#3b5a3a';
        ctx.beginPath();
        ctx.ellipse(sx + 1, sy - 2, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Seat highlight
        ctx.fillStyle = 'rgba(100,150,100,0.15)';
        ctx.beginPath();
        ctx.ellipse(sx - 1, sy - 4, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ────────────────────────────────────────────────
    // SPACE WINDOW — Panoramic (top right)
    // ────────────────────────────────────────────────
    const win = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'window');
    if (win) {
      // Window frame (brass)
      ctx.fillStyle = '#6a5020';
      ctx.fillRect(win.x - 5, win.y - 5, win.w + 10, win.h + 10);
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(win.x - 3, win.y - 3, win.w + 6, win.h + 6);

      // Deep space
      ctx.fillStyle = '#020810';
      ctx.fillRect(win.x, win.y, win.w, win.h);

      // Multi-layer star field
      for (let layer = 0; layer < 4; layer++) {
        const count = [80, 40, 20, 8][layer];
        const size = [1, 1, 2, 2][layer];
        const baseAlpha = [0.1, 0.25, 0.5, 0.8][layer];
        for (let i = 0; i < count; i++) {
          const hash = (layer * 1000 + i * 37 + 17);
          const sx = win.x + (hash * 53 % win.w);
          const sy = win.y + (hash * 31 % win.h);
          const twinkle = baseAlpha + Math.sin(t * (0.5 + layer * 0.5) + i * 0.7) * baseAlpha * 0.4;
          ctx.fillStyle = `rgba(255,255,${240 + (i % 3) * 5},${twinkle})`;
          ctx.fillRect(sx, sy, size, size);
        }
      }

      // Earth
      const ex = win.x + win.w * 0.65, ey = win.y + win.h * 0.5;
      // Atmosphere glow
      const atmoG = ctx.createRadialGradient(ex, ey, 28, ex, ey, 42);
      atmoG.addColorStop(0, 'rgba(80,160,255,0)');
      atmoG.addColorStop(0.7, 'rgba(80,160,255,0.08)');
      atmoG.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = atmoG;
      ctx.beginPath(); ctx.arc(ex, ey, 42, 0, Math.PI * 2); ctx.fill();
      // Planet
      ctx.save();
      ctx.beginPath(); ctx.arc(ex, ey, 28, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#1555a0';
      ctx.fillRect(ex - 30, ey - 30, 60, 60);
      // Continents (slowly drifting)
      const drift = Math.sin(t * 0.02) * 5;
      ctx.fillStyle = '#2a8a3a';
      ctx.beginPath(); ctx.arc(ex - 10 + drift, ey - 10, 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 16 + drift, ey + 8, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - 5 + drift, ey + 15, 8, 0, Math.PI * 2); ctx.fill();
      // Ice caps
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath(); ctx.arc(ex + drift, ey - 25, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + drift, ey + 26, 8, 0, Math.PI * 2); ctx.fill();
      // Clouds
      ctx.fillStyle = 'rgba(230,240,255,0.3)';
      for (let c = 0; c < 6; c++) {
        const ca = t * 0.015 + c * 1.1;
        ctx.beginPath();
        ctx.arc(ex + Math.cos(ca) * 18, ey + Math.sin(ca) * 12, 4 + c % 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Terminator shadow
      ctx.fillStyle = 'rgba(0,0,10,0.3)';
      ctx.beginPath(); ctx.arc(ex + 10, ey, 28, 0, Math.PI * 2); ctx.fill();

      // Window cross dividers
      ctx.strokeStyle = '#c8a050';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(win.x + win.w / 3, win.y); ctx.lineTo(win.x + win.w / 3, win.y + win.h);
      ctx.moveTo(win.x + win.w * 2 / 3, win.y); ctx.lineTo(win.x + win.w * 2 / 3, win.y + win.h);
      ctx.stroke();

      // HUD overlay
      ctx.fillStyle = 'rgba(0,255,200,0.6)';
      ctx.font = '7px monospace';
      ctx.fillText(`STATION ONLINE`, win.x + 8, win.y + 14);
      ctx.fillStyle = 'rgba(0,255,200,0.4)';
      ctx.fillText(`F${S.floor}/9 · ${Object.keys(S.otherPlayers || {}).length + 1} aboard`, win.x + 8, win.y + 24);
    }

    // ────────────────────────────────────────────────
    // VINYL CORNER — Left side
    // ────────────────────────────────────────────────
    const vp = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'vinyl_player');
    if (vp) {
      // Turntable cabinet (walnut wood)
      const cabGrad = ctx.createLinearGradient(vp.x, vp.y, vp.x + vp.w, vp.y + vp.h);
      cabGrad.addColorStop(0, '#3a2816');
      cabGrad.addColorStop(0.5, '#4a3822');
      cabGrad.addColorStop(1, '#3a2816');
      ctx.fillStyle = cabGrad;
      ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
      // Legs
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(vp.x + 5, vp.y + vp.h, 4, 8);
      ctx.fillRect(vp.x + vp.w - 9, vp.y + vp.h, 4, 8);

      // Turntable surface
      ctx.fillStyle = '#2a1e14';
      ctx.fillRect(vp.x + 6, vp.y + 6, vp.w - 12, vp.h - 20);

      // Spinning record
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(vp.x + vp.w / 2, vp.y + vp.h / 2 - 5, 22, 0, Math.PI * 2);
      ctx.fill();
      // Grooves (concentric)
      for (let r = 6; r < 21; r += 2) {
        ctx.strokeStyle = `rgba(40,40,40,${0.3 + (r % 4 === 0 ? 0.2 : 0)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(vp.x + vp.w / 2, vp.y + vp.h / 2 - 5, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Label (colorful center)
      ctx.fillStyle = '#cc3333';
      ctx.beginPath();
      ctx.arc(vp.x + vp.w / 2, vp.y + vp.h / 2 - 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(vp.x + vp.w / 2, vp.y + vp.h / 2 - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Tonearm
      const armAngle = 0.25 + Math.sin(t * 0.08) * 0.04;
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(vp.x + vp.w - 10, vp.y + 10);
      ctx.lineTo(vp.x + vp.w / 2 + 8 + Math.cos(armAngle) * 15, vp.y + vp.h / 2 - 5 + Math.sin(armAngle) * 10);
      ctx.stroke();
      // Headshell
      ctx.fillStyle = '#ccc';
      ctx.fillRect(vp.x + vp.w / 2 + 5, vp.y + vp.h / 2 - 8, 6, 3);

      // Now playing
      const albums = {
        morning: '☀️ Tycho — Dive',
        afternoon: '🎷 Miles Davis — Kind of Blue',
        evening: '🎵 Solomun — Nobody Is Not Loved',
        night: '🌙 Nils Frahm — All Melody'
      };
      ctx.fillStyle = '#ffd080';
      ctx.font = '7px monospace';
      ctx.fillText(albums[TOD] || albums.evening, vp.x, vp.y + vp.h + 20);
    }

    // Record wall
    const rec = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'record');
    if (rec) {
      // Shelf
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(rec.x, rec.y, rec.w, rec.h);
      // Record covers with real detail
      const covers = [
        { bg: '#cc3333', detail: '#fff' }, // Red Hot Chili
        { bg: '#2255bb', detail: '#ddd' }, // Blue Note
        { bg: '#222',    detail: '#ffd700' }, // Dark Side
        { bg: '#ff6600', detail: '#fff' }, // Orange
        { bg: '#7722aa', detail: '#ddd' }, // Purple Rain
        { bg: '#228844', detail: '#fff' }, // Green
      ];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const cv = covers[r * 3 + c];
          const cvx = rec.x + 5 + c * 26, cvy = rec.y + 4 + r * 24;
          ctx.fillStyle = cv.bg;
          ctx.fillRect(cvx, cvy, 22, 20);
          // Album art detail
          ctx.fillStyle = cv.detail;
          ctx.fillRect(cvx + 4, cvy + 4, 14, 2);
          ctx.fillRect(cvx + 6, cvy + 10, 10, 6);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cvx, cvy, 22, 20);
        }
      }
      ctx.fillStyle = '#ffd080';
      ctx.font = '6px monospace';
      ctx.fillText("ECHO'S RECORDS", rec.x + 5, rec.y - 4);
    }

    // ────────────────────────────────────────────────
    // LOUNGE SOFAS — Olive green velvet with pillows
    // ────────────────────────────────────────────────
    const sofas = ['sofa', 'sofa_right'].map(id =>
      (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === id)
    ).filter(Boolean);

    sofas.forEach(sf => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(sf.x + sf.w / 2, sf.y + sf.h + 2, sf.w / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sofa body
      const sofaGrad = ctx.createLinearGradient(sf.x, sf.y, sf.x, sf.y + sf.h);
      sofaGrad.addColorStop(0, '#2d4a2c');
      sofaGrad.addColorStop(0.3, '#3b5a3a');
      sofaGrad.addColorStop(1, '#2d4a2c');
      ctx.fillStyle = sofaGrad;
      ctx.fillRect(sf.x, sf.y + 12, sf.w, sf.h - 12);
      // Backrest
      ctx.fillStyle = '#264228';
      ctx.fillRect(sf.x + 2, sf.y, sf.w - 4, 16);
      // Seat cushions (two)
      ctx.fillStyle = '#4a6a48';
      ctx.fillRect(sf.x + 6, sf.y + 18, sf.w / 2 - 10, sf.h - 30);
      ctx.fillRect(sf.x + sf.w / 2 + 4, sf.y + 18, sf.w / 2 - 10, sf.h - 30);
      // Cushion seam
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sf.x + sf.w / 2, sf.y + 18);
      ctx.lineTo(sf.x + sf.w / 2, sf.y + sf.h - 12);
      ctx.stroke();
      // Terracotta throw pillow
      ctx.fillStyle = '#a0342b';
      ctx.fillRect(sf.x + 10, sf.y + 6, 18, 12);
      ctx.fillStyle = '#c04838';
      ctx.fillRect(sf.x + 12, sf.y + 8, 14, 8);
      // Gold accent pillow
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(sf.x + sf.w - 28, sf.y + 6, 16, 10);
      // Arm rests
      ctx.fillStyle = '#3b5a3a';
      ctx.fillRect(sf.x - 2, sf.y + 12, 6, sf.h - 16);
      ctx.fillRect(sf.x + sf.w - 4, sf.y + 12, 6, sf.h - 16);
    });

    // ────────────────────────────────────────────────
    // WINDOW SEATS — Cozy candlelit tables
    // ────────────────────────────────────────────────
    ['window_seat_1', 'window_seat_2'].forEach(id => {
      const ws = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === id);
      if (!ws) return;
      // Table
      ctx.fillStyle = '#d8d0c4';
      ctx.beginPath();
      ctx.ellipse(ws.x + ws.w / 2, ws.y + ws.h / 2, 20, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b0a898';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Candle in glass
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(ws.x + ws.w / 2 - 4, ws.y + ws.h / 2 - 10, 8, 12);
      ctx.fillStyle = '#eee';
      ctx.fillRect(ws.x + ws.w / 2 - 2, ws.y + ws.h / 2 - 8, 4, 8);
      // Flame
      const flick = Math.sin(t * 12 + ws.x) * 1;
      ctx.fillStyle = `rgba(255,${180 + Math.sin(t * 8) * 20},60,0.9)`;
      ctx.beginPath();
      ctx.arc(ws.x + ws.w / 2 + flick, ws.y + ws.h / 2 - 11, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Warm glow
      const candleG = ctx.createRadialGradient(
        ws.x + ws.w / 2, ws.y + ws.h / 2, 0,
        ws.x + ws.w / 2, ws.y + ws.h / 2, 35
      );
      candleG.addColorStop(0, 'rgba(255,200,100,0.1)');
      candleG.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = candleG;
      ctx.beginPath();
      ctx.arc(ws.x + ws.w / 2, ws.y + ws.h / 2, 35, 0, Math.PI * 2);
      ctx.fill();
    });

    // ────────────────────────────────────────────────
    // PLANTS — Lush tropical
    // ────────────────────────────────────────────────
    ['plant_1', 'plant_2', 'plant_3'].forEach(id => {
      const pl = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === id);
      if (!pl) return;
      // Terracotta pot
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(pl.x + 3, pl.y + pl.h - 12, pl.w - 6, 12);
      ctx.fillStyle = '#a06a38';
      ctx.fillRect(pl.x + 1, pl.y + pl.h - 14, pl.w - 2, 4);
      // Soil
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(pl.x + 4, pl.y + pl.h - 14, pl.w - 8, 3);
      // Leaves
      const leafC = ['#2d6a2a', '#3d8a3a', '#4d9a4a', '#2d7a35', '#3d6b45'];
      for (let l = 0; l < 7; l++) {
        const la = (l / 7) * Math.PI * 2 + Math.sin(t * 0.4 + pl.x * 0.1) * 0.1;
        const ll = 12 + l * 2;
        ctx.fillStyle = leafC[l % leafC.length];
        ctx.save();
        ctx.translate(pl.x + pl.w / 2 + Math.cos(la) * ll * 0.4, pl.y + pl.h - 16 - l * 3);
        ctx.rotate(la - Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // ────────────────────────────────────────────────
    // BOOKSHELF / COMICS
    // ────────────────────────────────────────────────
    const bs = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'bookshelf');
    if (bs) {
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(bs.x, bs.y, bs.w, bs.h);
      // Shelf divider
      ctx.fillStyle = '#4a3828';
      ctx.fillRect(bs.x + 3, bs.y + 28, bs.w - 6, 3);
      // Comic spines with varied widths
      const spines = [
        { c: '#cc2222', w: 7 }, { c: '#2255cc', w: 6 }, { c: '#22aa44', w: 8 },
        { c: '#dddd22', w: 5 }, { c: '#cc44cc', w: 7 }, { c: '#ff6622', w: 6 },
        { c: '#4488ff', w: 7 }, { c: '#ff88aa', w: 8 }
      ];
      let sx = bs.x + 4;
      spines.forEach((sp, i) => {
        const shelf = i < 4 ? 0 : 1;
        const sy = bs.y + 4 + shelf * 31;
        if (i === 4) sx = bs.x + 4;
        ctx.fillStyle = sp.c;
        ctx.fillRect(sx, sy, sp.w, 23);
        // Title line
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(sx + sp.w / 2 - 0.5, sy + 3, 1, 17);
        sx += sp.w + 2;
      });
      ctx.fillStyle = '#ffd080';
      ctx.font = '5px monospace';
      ctx.fillText('COMICS & CARDS', bs.x + 5, bs.y - 4);
    }

    // ────────────────────────────────────────────────
    // CRYSTAL BALL — Mystical glow on the bar
    // ────────────────────────────────────────────────
    const cr = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'crystal');
    if (cr) {
      const crx = cr.x + cr.w / 2, cry = cr.y + cr.h / 2;
      // Base
      ctx.fillStyle = '#333';
      ctx.fillRect(crx - 6, cry + 4, 12, 4);
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(crx - 8, cry + 3, 16, 2);
      // Outer glow
      const crOuter = ctx.createRadialGradient(crx, cry, 0, crx, cry, 20);
      crOuter.addColorStop(0, `rgba(160,80,255,${0.3 + Math.sin(t * 2) * 0.1})`);
      crOuter.addColorStop(0.5, 'rgba(120,40,200,0.1)');
      crOuter.addColorStop(1, 'rgba(80,20,160,0)');
      ctx.fillStyle = crOuter;
      ctx.beginPath(); ctx.arc(crx, cry, 20, 0, Math.PI * 2); ctx.fill();
      // Ball
      const ballG = ctx.createRadialGradient(crx - 2, cry - 3, 0, crx, cry, 9);
      ballG.addColorStop(0, `rgba(220,180,255,${0.8 + Math.sin(t * 3) * 0.1})`);
      ballG.addColorStop(0.5, 'rgba(160,100,220,0.7)');
      ballG.addColorStop(1, 'rgba(100,40,180,0.5)');
      ctx.fillStyle = ballG;
      ctx.beginPath(); ctx.arc(crx, cry, 9, 0, Math.PI * 2); ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(crx - 3, cry - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // ────────────────────────────────────────────────
    // TIP JAR
    // ────────────────────────────────────────────────
    const tj = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === 'tip_jar');
    if (tj) {
      // Glass jar
      ctx.fillStyle = 'rgba(200,210,230,0.25)';
      ctx.fillRect(tj.x + 2, tj.y + 2, tj.w - 4, tj.h - 2);
      ctx.strokeStyle = 'rgba(200,210,230,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tj.x + 2, tj.y + 2, tj.w - 4, tj.h - 2);
      // Coins
      for (let c = 0; c < 6; c++) {
        const cy = tj.y + tj.h - 6 - c * 3;
        ctx.fillStyle = c % 2 ? '#ffd700' : '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(tj.x + tj.w / 2 + (c % 3 - 1) * 5, cy, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd700';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TIPS', tj.x + tj.w / 2, tj.y - 2);
      ctx.textAlign = 'left';
    }

    // ────────────────────────────────────────────────
    // DINING TABLES
    // ────────────────────────────────────────────────
    ['table_1', 'table_2'].forEach(id => {
      const tb = (typeof getObjects === 'function' ? getObjects() : []).find(o => o.id === id);
      if (!tb) return;
      // Legs
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(tb.x + 4, tb.y + tb.h, 3, 8);
      ctx.fillRect(tb.x + tb.w - 7, tb.y + tb.h, 3, 8);
      // Top
      ctx.fillStyle = '#e8e2da';
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      ctx.strokeStyle = 'rgba(180,170,155,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);
      // Candle
      ctx.fillStyle = '#eee';
      ctx.fillRect(tb.x + tb.w / 2 - 1, tb.y + 4, 3, 6);
      ctx.fillStyle = `rgba(255,180,50,0.9)`;
      ctx.beginPath();
      ctx.arc(tb.x + tb.w / 2 + Math.sin(t * 10 + tb.x) * 0.5, tb.y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // ────────────────────────────────────────────────
    // FLOATING WARM PARTICLES
    // ────────────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const px = 50 + Math.sin(t * 0.2 + i * 1.8) * 350 + i * 60;
      const py = H - ((t * 8 + i * 80) % (H + 50));
      const alpha = 0.1 + Math.sin(t * 1.5 + i * 0.7) * 0.06;
      ctx.fillStyle = `rgba(255,210,140,${alpha})`;
      ctx.beginPath();
      ctx.arc(px % W, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // TOD tint removed — visual-polish.js handles ambient lighting per floor
  };

  // ═══════════════════════════════════════════════════
  // BOTTLE RENDERING — Detailed, recognizable bottles
  // ═══════════════════════════════════════════════════
  function drawBottleRow(ctx, cx_, cy_, rx, ry, t) {
    const bottles = [
      // { x offset from center, color, cap, label, name, glow }
      { dx: -50, body: '#1a5a1a', cap: '#c8a050', label: '#fff', name: 'Hendricks', h: 18, w: 6 },
      { dx: -38, body: '#8a3a0a', cap: '#333', label: '#ffd700', name: 'Hennessy', h: 16, w: 7 },
      { dx: -26, body: '#1a1a3a', cap: '#c8a050', label: '#fff', name: 'Bombay', h: 17, w: 6, glow: '#2244aa' },
      { dx: -12, body: '#cc3300', cap: '#333', label: '#fff', name: 'Campari', h: 15, w: 6 },
      // ═══ SANE VODKA — THE STAR ═══
      { dx: 0, body: '#e8e4dc', cap: '#aaa', label: '#3355bb', name: 'SANE', h: 22, w: 8, star: true },
      { dx: 14, body: '#ffd700', cap: '#333', label: '#000', name: 'Patron', h: 14, w: 7 },
      { dx: 26, body: '#0a4a4a', cap: '#c8a050', label: '#ffd700', name: 'Jäger', h: 16, w: 6 },
      { dx: 38, body: '#3a1a3a', cap: '#c8a050', label: '#ddd', name: 'Empress', h: 17, w: 6, glow: '#6622aa' },
      { dx: 50, body: '#2a1a0a', cap: '#333', label: '#c8a050', name: 'Jack D', h: 15, w: 7 },
    ];

    bottles.forEach(b => {
      const bx = cx_ + b.dx;
      const by = cy_ - 8 - b.h;

      // Special glow for SANE
      if (b.star) {
        const saneGlow = ctx.createRadialGradient(bx, by + b.h / 2, 0, bx, by + b.h / 2, 25);
        saneGlow.addColorStop(0, `rgba(51,85,187,${0.15 + Math.sin(t * 1.5) * 0.05})`);
        saneGlow.addColorStop(1, 'rgba(51,85,187,0)');
        ctx.fillStyle = saneGlow;
        ctx.beginPath();
        ctx.arc(bx, by + b.h / 2, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bottle glow effect
      if (b.glow) {
        const glowG = ctx.createRadialGradient(bx, by + b.h / 2, 0, bx, by + b.h / 2, 15);
        glowG.addColorStop(0, b.glow.replace(')', ',0.1)').replace('rgb', 'rgba'));
        glowG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(bx, by + b.h / 2, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bottle body
      ctx.fillStyle = b.body;
      ctx.fillRect(bx - b.w / 2, by, b.w, b.h);

      // Bottle neck (narrower top third)
      ctx.fillStyle = b.body;
      ctx.fillRect(bx - b.w / 4, by - 5, b.w / 2, 6);

      // Cap
      ctx.fillStyle = b.cap;
      ctx.fillRect(bx - b.w / 4, by - 7, b.w / 2, 3);

      // Label area
      ctx.fillStyle = b.label === '#fff' ? 'rgba(255,255,255,0.85)' : b.label;
      const labelY = by + b.h * 0.3;
      const labelH = b.h * 0.35;
      ctx.fillRect(bx - b.w / 2 + 1, labelY, b.w - 2, labelH);

      // Label text
      if (b.star) {
        // SANE gets special treatment
        ctx.fillStyle = '#3355bb';
        ctx.font = 'bold 5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SANE', bx, labelY + labelH / 2 + 2);
        ctx.fillStyle = '#aaa';
        ctx.font = '3px monospace';
        ctx.fillText('VODKA', bx, labelY + labelH - 1);
        ctx.textAlign = 'left';
      }

      // Bottle shine (left edge)
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bx - b.w / 2 + 1, by, 1, b.h);

      // Liquid level line (subtle)
      const liq = b.h * (0.3 + Math.sin(t * 0.01 + b.dx) * 0.05);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(bx - b.w / 2 + 1, by + b.h - liq, b.w - 2, 1);
    });
  }

  // ═══════════════════════════════════════════════════
  // BAR GLASSES — Cocktails, whiskey, wine
  // ═══════════════════════════════════════════════════
  function drawBarGlasses(ctx, cx_, cy_, rx, ry, t) {
    const glasses = [
      { dx: -60, dy: 8, type: 'cocktail', color: '#ff6644' },
      { dx: -40, dy: 12, type: 'whiskey', color: '#cc8833' },
      { dx: -20, dy: 10, type: 'wine', color: '#882244' },
      { dx: 20, dy: 10, type: 'cocktail', color: '#44ccaa' },
      { dx: 42, dy: 12, type: 'whiskey', color: '#cc8833' },
      { dx: 60, dy: 8, type: 'wine', color: '#882244' },
    ];

    glasses.forEach(g => {
      const gx = cx_ + g.dx, gy = cy_ + g.dy - 20;

      if (g.type === 'cocktail') {
        // Martini/cocktail glass — V shape
        ctx.strokeStyle = 'rgba(200,220,240,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx - 6, gy); ctx.lineTo(gx, gy + 8); ctx.lineTo(gx + 6, gy);
        ctx.stroke();
        // Stem
        ctx.beginPath(); ctx.moveTo(gx, gy + 8); ctx.lineTo(gx, gy + 14); ctx.stroke();
        // Base
        ctx.beginPath(); ctx.moveTo(gx - 4, gy + 14); ctx.lineTo(gx + 4, gy + 14); ctx.stroke();
        // Liquid
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy + 2); ctx.lineTo(gx, gy + 7); ctx.lineTo(gx + 4, gy + 2);
        ctx.fill();
        // Olive/garnish
        ctx.fillStyle = '#6a8a2a';
        ctx.beginPath(); ctx.arc(gx + 2, gy + 3, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      else if (g.type === 'whiskey') {
        // Rocks glass
        ctx.strokeStyle = 'rgba(200,220,240,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx - 4, gy + 2, 8, 10);
        // Liquid
        ctx.fillStyle = g.color + '88';
        ctx.fillRect(gx - 3, gy + 6, 6, 5);
        // Ice cube
        ctx.fillStyle = 'rgba(200,230,255,0.4)';
        ctx.fillRect(gx - 2, gy + 5, 4, 3);
      }
      else if (g.type === 'wine') {
        // Wine glass
        ctx.strokeStyle = 'rgba(200,220,240,0.5)';
        ctx.lineWidth = 1;
        // Bowl
        ctx.beginPath();
        ctx.arc(gx, gy + 4, 5, 0, Math.PI);
        ctx.stroke();
        // Stem
        ctx.beginPath(); ctx.moveTo(gx, gy + 9); ctx.lineTo(gx, gy + 14); ctx.stroke();
        // Base
        ctx.beginPath(); ctx.moveTo(gx - 3, gy + 14); ctx.lineTo(gx + 3, gy + 14); ctx.stroke();
        // Wine
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(gx, gy + 4, 4, 0.2, Math.PI - 0.2);
        ctx.fill();
      }
    });
  }

  console.log('🍸 Floor 1 visual overhaul loaded — Echo\'s Bar redesigned');
})();
