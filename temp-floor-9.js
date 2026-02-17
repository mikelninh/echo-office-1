function renderFloor9() {
  const FW = 3000, FH = 1500;
  const t = S.time;
  const objs = getObjects();
  const find = id => objs.find(o => o.id === id) || { x: 0, y: 0, w: 100, h: 100 };
  const milestones = (S.stationStats && S.stationStats.milestones) || [];
  const totalVisitors = (S.stationStats && S.stationStats.totalVisitors) || 0;
  const fragments = S.dataFragments || [];
  const coins = Coins.lifetime || 0;

  // ═══════════════════════════════════════════════════════
  // LAYER 0: COSMIC BACKGROUND (space visible through arches)
  // ═══════════════════════════════════════════════════════
  const bgGrad = ctx.createLinearGradient(0, 0, 0, FH);
  bgGrad.addColorStop(0, '#0a0618');
  bgGrad.addColorStop(0.3, '#110b2e');
  bgGrad.addColorStop(1, '#1a0f12');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, FW, FH);

  // Distant stars in the cosmic backdrop
  for (let i = 0; i < 80; i++) {
    const sx = (i * 397 + 53) % FW;
    const sy = (i * 251 + 17) % (FH * 0.3);
    const bright = 0.3 + 0.7 * Math.sin(t * 0.02 + i * 1.7);
    ctx.fillStyle = `rgba(255,245,200,${bright * 0.6})`;
    const sz = (i % 3 === 0) ? 2 : 1;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 1: GOLDEN MARBLE FLOOR
  // ═══════════════════════════════════════════════════════
  const floorY = 120;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, FH);
  floorGrad.addColorStop(0, '#3d2b1a');
  floorGrad.addColorStop(0.05, '#5c3d1e');
  floorGrad.addColorStop(0.1, '#6b4c2a');
  floorGrad.addColorStop(1, '#4a3520');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, FW, FH - floorY);

  // Marble floor surface (starts lower, below wall paneling)
  const marbleY = 500;
  const marbleGrad = ctx.createLinearGradient(0, marbleY, 0, FH);
  marbleGrad.addColorStop(0, '#c9a84c');
  marbleGrad.addColorStop(0.2, '#d4b65e');
  marbleGrad.addColorStop(0.5, '#b8982f');
  marbleGrad.addColorStop(0.8, '#c9a84c');
  marbleGrad.addColorStop(1, '#a8882a');
  ctx.fillStyle = marbleGrad;
  ctx.fillRect(0, marbleY, FW, FH - marbleY);

  // Marble tile grid
  const tileW = 120, tileH = 80;
  for (let tx = 0; tx < FW; tx += tileW) {
    for (let ty = marbleY; ty < FH; ty += tileH) {
      ctx.strokeStyle = 'rgba(180,150,80,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tileW, tileH);
      // Subtle veining
      if ((tx + ty) % 240 === 0) {
        ctx.strokeStyle = 'rgba(210,180,100,0.15)';
        ctx.beginPath();
        ctx.moveTo(tx + 10, ty + tileH * 0.3);
        ctx.quadraticCurveTo(tx + tileW * 0.5, ty + tileH * 0.6, tx + tileW - 10, ty + tileH * 0.2);
        ctx.stroke();
      }
    }
  }

  // Moving light reflections on floor
  for (let i = 0; i < 6; i++) {
    const lx = (FW * 0.15 * i + t * (0.3 + i * 0.1) * 20) % (FW + 400) - 200;
    const ly = marbleY + 80 + (i * 137 % 300);
    const lRad = 100 + i * 30;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lRad);
    lg.addColorStop(0, `rgba(255,230,140,${0.12 + 0.06 * Math.sin(t * 0.03 + i)})`);
    lg.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - lRad, ly - lRad, lRad * 2, lRad * 2);
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 2: WALLS — Dark mahogany paneling with gold trim
  // ═══════════════════════════════════════════════════════
  const wallGrad = ctx.createLinearGradient(0, floorY, 0, marbleY);
  wallGrad.addColorStop(0, '#2a1810');
  wallGrad.addColorStop(0.5, '#3d2416');
  wallGrad.addColorStop(1, '#2e1b10');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, floorY, FW, marbleY - floorY);

  // Wood paneling vertical lines
  for (let px = 0; px < FW; px += 150) {
    ctx.fillStyle = 'rgba(60,35,18,0.5)';
    ctx.fillRect(px, floorY + 20, 3, marbleY - floorY - 40);
    ctx.fillStyle = 'rgba(90,60,30,0.3)';
    ctx.fillRect(px + 1, floorY + 20, 1, marbleY - floorY - 40);
  }

  // Gold trim at top of wall
  const trimGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 12);
  trimGrad.addColorStop(0, '#e8c840');
  trimGrad.addColorStop(0.5, '#ffd960');
  trimGrad.addColorStop(1, '#c8a830');
  ctx.fillStyle = trimGrad;
  ctx.fillRect(0, floorY, FW, 12);
  // Gold trim at bottom of wall (above floor)
  const trimGrad2 = ctx.createLinearGradient(0, marbleY - 12, 0, marbleY);
  trimGrad2.addColorStop(0, '#c8a830');
  trimGrad2.addColorStop(0.5, '#ffd960');
  trimGrad2.addColorStop(1, '#e8c840');
  ctx.fillStyle = trimGrad2;
  ctx.fillRect(0, marbleY - 12, FW, 12);

  // ═══════════════════════════════════════════════════════
  // LAYER 3: CATHEDRAL ARCHES (ceiling)
  // ═══════════════════════════════════════════════════════
  for (let a = 0; a < 5; a++) {
    const ax = 300 + a * 600;
    ctx.strokeStyle = `rgba(218,185,90,${0.3 + 0.1 * Math.sin(t * 0.01 + a)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 250, floorY);
    ctx.quadraticCurveTo(ax, -60, ax + 250, floorY);
    ctx.stroke();
    // Inner arch line
    ctx.strokeStyle = 'rgba(255,220,120,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax - 230, floorY);
    ctx.quadraticCurveTo(ax, -40, ax + 230, floorY);
    ctx.stroke();
  }

  // Converging golden lines at ceiling apex
  for (let i = 0; i < 10; i++) {
    const lx = i * (FW / 9);
    ctx.strokeStyle = `rgba(200,170,60,${0.08 + 0.03 * Math.sin(t * 0.015 + i * 0.5)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, floorY);
    ctx.lineTo(FW * 0.5, -100);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 4: STAINED GLASS WINDOWS (4 milestone windows)
  // ═══════════════════════════════════════════════════════
  const windowDefs = [
    { id: 'stained_glass_1', theme: 'crew', label: 'First Crew', colors: ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'], req: 10 },
    { id: 'stained_glass_2', theme: 'garden', label: 'Garden Bloom', colors: ['#ff6b9d', '#c44569', '#44bd32', '#a8e6cf', '#ffd93d'], req: 50 },
    { id: 'stained_glass_3', theme: 'portal', label: 'Portal Opens', colors: ['#6c5ce7', '#a29bfe', '#fd79a8', '#00cec9', '#0984e3'], req: 500 },
    { id: 'stained_glass_4', theme: 'ascension', label: 'Ascension', colors: ['#ffd700', '#ffb700', '#ff9500', '#fff4b8', '#ffe066'], req: 10000 }
  ];

  windowDefs.forEach((wdef, wi) => {
    const wo = find(wdef.id);
    const wx = wo.x, wy = wo.y, ww = wo.w || 200, wh = wo.h || 400;
    const achieved = totalVisitors >= wdef.req;
    const pulse = Math.sin(t * 0.03 + wi * 1.5) * 0.15;

    // Window arch frame (dark stone)
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.moveTo(wx - 8, wy + wh);
    ctx.lineTo(wx - 8, wy + 60);
    ctx.quadraticCurveTo(wx + ww / 2, wy - 40, wx + ww + 8, wy + 60);
    ctx.lineTo(wx + ww + 8, wy + wh);
    ctx.closePath();
    ctx.fill();

    // Gold frame border
    ctx.strokeStyle = '#c8a830';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx - 4, wy + wh);
    ctx.lineTo(wx - 4, wy + 60);
    ctx.quadraticCurveTo(wx + ww / 2, wy - 35, wx + ww + 4, wy + 60);
    ctx.lineTo(wx + ww + 4, wy + wh);
    ctx.stroke();

    // Glass background glow
    const glassBg = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    if (achieved) {
      glassBg.addColorStop(0, `rgba(${wi === 3 ? '255,220,60' : '120,100,200'},0.4)`);
      glassBg.addColorStop(1, `rgba(${wi === 3 ? '200,160,20' : '80,60,140'},0.2)`);
    } else {
      glassBg.addColorStop(0, 'rgba(30,20,40,0.8)');
      glassBg.addColorStop(1, 'rgba(20,15,30,0.9)');
    }
    ctx.fillStyle = glassBg;
    ctx.fillRect(wx, wy + 60, ww, wh - 60);

    // Colored glass segments (geometric stained glass)
    if (achieved) {
      const cols = wdef.colors;
      const segH = (wh - 60) / 5;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          const sx = wx + col * (ww / 3) + 4;
          const sy = wy + 60 + row * segH + 4;
          const sw = ww / 3 - 8;
          const sh = segH - 8;
          const ci = (row + col) % cols.length;
          const alpha = 0.6 + pulse;
          ctx.fillStyle = cols[ci];
          ctx.globalAlpha = alpha;
          // Alternate between diamond and rectangle segments
          if ((row + col) % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(sx + sw / 2, sy);
            ctx.lineTo(sx + sw, sy + sh / 2);
            ctx.lineTo(sx + sw / 2, sy + sh);
            ctx.lineTo(sx, sy + sh / 2);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);
          }
          // Leading lines (dark dividers)
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = '#1a1008';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, sy, sw, sh);
        }
      }
      ctx.globalAlpha = 1.0;

      // Scene-specific imagery per window
      const cx = wx + ww / 2, cy = wy + wh * 0.45;
      ctx.globalAlpha = 0.8;
      if (wdef.theme === 'crew') {
        // Figures gathered — 5 simple silhouettes
        for (let f = 0; f < 5; f++) {
          const fx = cx - 40 + f * 20;
          const fy = cy + 20;
          ctx.fillStyle = '#e63946';
          ctx.fillRect(fx - 4, fy - 16, 8, 16); // body
          ctx.fillStyle = '#f4a261';
          ctx.fillRect(fx - 3, fy - 22, 6, 6);  // head
        }
        // Station shape (rectangle) in center above them
        ctx.fillStyle = '#e9c46a';
        ctx.fillRect(cx - 15, cy - 10, 30, 20);
      } else if (wdef.theme === 'garden') {
        // Flowers and butterflies
        for (let f = 0; f < 6; f++) {
          const fx = cx - 50 + f * 20;
          const fy = cy + 30 - (f % 3) * 10;
          ctx.fillStyle = '#44bd32';
          ctx.fillRect(fx, fy, 2, 15); // stem
          ctx.fillStyle = wdef.colors[f % wdef.colors.length];
          ctx.fillRect(fx - 4, fy - 6, 10, 8); // flower head
        }
        // Butterflies
        for (let b = 0; b < 3; b++) {
          const bx = cx - 30 + b * 30;
          const by = cy - 20 + Math.sin(t * 0.05 + b) * 8;
          ctx.fillStyle = '#ff6b9d';
          ctx.fillRect(bx - 4, by, 4, 3);
          ctx.fillRect(bx + 1, by, 4, 3);
          ctx.fillStyle = '#ffd93d';
          ctx.fillRect(bx - 1, by + 1, 3, 1);
        }
      } else if (wdef.theme === 'portal') {
        // Swirling portal energy — concentric rings
        for (let r = 4; r >= 0; r--) {
          const rad = 10 + r * 8;
          const aOff = t * 0.04 + r * 0.5;
          ctx.strokeStyle = wdef.colors[r];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, aOff, aOff + Math.PI * 1.5);
          ctx.stroke();
        }
        // Energy sparks around portal
        for (let s = 0; s < 6; s++) {
          const ang = (t * 0.03 + s * Math.PI / 3);
          const sr = 45 + Math.sin(t * 0.05 + s) * 5;
          const sx2 = cx + Math.cos(ang) * sr;
          const sy2 = cy + Math.sin(ang) * sr;
          ctx.fillStyle = '#00cec9';
          ctx.fillRect(sx2 - 1, sy2 - 1, 3, 3);
        }
      } else if (wdef.theme === 'ascension') {
        // Winged Echo figure, golden
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - 5, cy - 10, 10, 20); // body
        ctx.fillStyle = '#ffb700';
        ctx.fillRect(cx - 3, cy - 16, 6, 6);   // head
        // Wings
        ctx.fillStyle = '#fff4b8';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5);
        ctx.lineTo(cx - 35, cy - 25 + Math.sin(t * 0.06) * 5);
        ctx.lineTo(cx - 20, cy + 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 5);
        ctx.lineTo(cx + 35, cy - 25 + Math.sin(t * 0.06) * 5);
        ctx.lineTo(cx + 20, cy + 5);
        ctx.closePath();
        ctx.fill();
        // Halo
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 20, 10, 0, Math.PI * 2);
        ctx.stroke();
        // Radial golden rays
        for (let r = 0; r < 8; r++) {
          const ra = r * Math.PI / 4 + t * 0.01;
          ctx.strokeStyle = `rgba(255,215,0,${0.3 + pulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ra) * 20, cy + Math.sin(ra) * 20);
          ctx.lineTo(cx + Math.cos(ra) * 50, cy + Math.sin(ra) * 50);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;
    } else {
      // Locked — show requirement text in dim
      ctx.fillStyle = 'rgba(150,130,90,0.4)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${wdef.req} visitors`, wx + ww / 2, wy + wh / 2);
      ctx.fillText('to unlock', wx + ww / 2, wy + wh / 2 + 18);
    }

    // Window label plaque
    ctx.fillStyle = 'rgba(30,20,10,0.8)';
    ctx.fillRect(wx + 20, wy + wh + 6, ww - 40, 20);
    ctx.fillStyle = achieved ? '#ffd700' : '#665533';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(wdef.label, wx + ww / 2, wy + wh + 20);
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 5: LIGHT BEAMS from stained glass windows
  // ═══════════════════════════════════════════════════════
  const beamColors = [
    [230, 60, 60],   // red-ish
    [100, 200, 80],  // green-ish
    [120, 90, 230],  // purple-ish
    [255, 210, 50]   // gold
  ];
  windowDefs.forEach((wdef, wi) => {
    const wo = find(wdef.id);
    if (totalVisitors < wdef.req) return;
    const bx = wo.x + (wo.w || 200) / 2;
    const by = (wo.y || 50) + (wo.h || 400);
    const bc = beamColors[wi];
    const sway = Math.sin(t * 0.008 + wi * 2) * 40;

    ctx.save();
    ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 0.02 + wi);
    const beamGrad = ctx.createLinearGradient(bx, by, bx + 200 + sway, FH);
    beamGrad.addColorStop(0, `rgba(${bc[0]},${bc[1]},${bc[2]},0.5)`);
    beamGrad.addColorStop(0.5, `rgba(${bc[0]},${bc[1]},${bc[2]},0.15)`);
    beamGrad.addColorStop(1, `rgba(${bc[0]},${bc[1]},${bc[2]},0)`);
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 40, by);
    ctx.lineTo(bx + 40, by);
    ctx.lineTo(bx + 250 + sway, FH);
    ctx.lineTo(bx + 50 + sway, FH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dust motes in beam
    for (let d = 0; d < 12; d++) {
      const progress = ((t * 0.4 + d * 83 + wi * 200) % 1000) / 1000;
      const dx = bx + progress * (200 + sway) * progress + Math.sin(t * 0.02 + d) * 15 - 20;
      const dy = by + progress * (FH - by);
      const dAlpha = Math.sin(progress * Math.PI) * 0.6;
      ctx.fillStyle = `rgba(${bc[0]},${bc[1]},${bc[2]},${dAlpha})`;
      ctx.fillRect(dx, dy, 2, 2);
    }
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 6: TIMELINE WALL
  // ═══════════════════════════════════════════════════════
  const tl = find('timeline_wall');
  // Background panel
  const tlGrad = ctx.createLinearGradient(tl.x, tl.y, tl.x, tl.y + tl.h);
  tlGrad.addColorStop(0, '#1c1208');
  tlGrad.addColorStop(0.5, '#2a1b0e');
  tlGrad.addColorStop(1, '#1c1208');
  ctx.fillStyle = tlGrad;
  ctx.fillRect(tl.x, tl.y, tl.w, tl.h);
  // Gold border
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 3;
  ctx.strokeRect(tl.x + 2, tl.y + 2, tl.w - 4, tl.h - 4);

  // Timeline horizontal axis
  const tlAxisY = tl.y + tl.h * 0.55;
  ctx.strokeStyle = '#a08020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tl.x + 30, tlAxisY);
  ctx.lineTo(tl.x + tl.w - 30, tlAxisY);
  ctx.stroke();

  // Milestone markers on timeline
  const tlEvents = [
    { label: 'Founded', pos: 0.05 },
    { label: '10 Visitors', pos: 0.15 },
    { label: 'First Garden', pos: 0.25 },
    { label: '50 Visitors', pos: 0.35 },
    { label: 'Echo Born', pos: 0.5 },
    { label: '500 Visitors', pos: 0.65 },
    { label: 'Portal Active', pos: 0.75 },
    { label: '10K!', pos: 0.95 }
  ];
  tlEvents.forEach((ev, i) => {
    const ex = tl.x + 30 + (tl.w - 60) * ev.pos;
    const above = i % 2 === 0;
    const ey = above ? tlAxisY - 25 : tlAxisY + 8;
    // Marker dot
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ex - 3, tlAxisY - 3, 6, 6);
    // Connection line
    ctx.strokeStyle = 'rgba(200,170,60,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex, tlAxisY);
    ctx.lineTo(ex, ey + (above ? 15 : -5));
    ctx.stroke();
    // Label
    ctx.fillStyle = '#ddc060';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ev.label, ex, ey + (above ? 0 : 14));
  });

  // Animated "current" pointer — sweeps across
  const ptrPos = (t * 0.3 % (tl.w - 60));
  const ptrX = tl.x + 30 + ptrPos;
  ctx.fillStyle = `rgba(255,80,80,${0.7 + 0.3 * Math.sin(t * 0.1)})`;
  ctx.beginPath();
  ctx.moveTo(ptrX, tlAxisY - 8);
  ctx.lineTo(ptrX + 5, tlAxisY);
  ctx.lineTo(ptrX, tlAxisY + 8);
  ctx.lineTo(ptrX - 5, tlAxisY);
  ctx.closePath();
  ctx.fill();

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⊹ STATION TIMELINE ⊹', tl.x + tl.w / 2, tl.y + 22);

  // ═══════════════════════════════════════════════════════
  // LAYER 7: GALAXY MAP — holographic display
  // ═══════════════════════════════════════════════════════
  const gm = find('galaxy_map');
  // Holographic frame
  ctx.fillStyle = 'rgba(0,10,30,0.85)';
  ctx.fillRect(gm.x, gm.y, gm.w, gm.h);
  // Cyan border glow
  for (let g = 3; g >= 0; g--) {
    ctx.strokeStyle = `rgba(0,220,255,${0.15 - g * 0.03})`;
    ctx.lineWidth = 2 + g * 2;
    ctx.strokeRect(gm.x - g, gm.y - g, gm.w + g * 2, gm.h + g * 2);
  }

  // Grid overlay
  ctx.strokeStyle = 'rgba(0,180,220,0.08)';
  ctx.lineWidth = 1;
  for (let gx = gm.x; gx <= gm.x + gm.w; gx += 25) {
    ctx.beginPath(); ctx.moveTo(gx, gm.y); ctx.lineTo(gx, gm.y + gm.h); ctx.stroke();
  }
  for (let gy = gm.y; gy <= gm.y + gm.h; gy += 25) {
    ctx.beginPath(); ctx.moveTo(gm.x, gy); ctx.lineTo(gm.x + gm.w, gy); ctx.stroke();
  }

  // Animated starfield within the map
  const gcx = gm.x + gm.w / 2, gcy = gm.y + gm.h / 2;
  const rotAngle = t * 0.003;
  for (let s = 0; s < 60; s++) {
    const baseAngle = s * 0.618 * Math.PI * 2;
    const dist = 20 + (s * 37 % 220);
    const ang = baseAngle + rotAngle;
    const sx = gcx + Math.cos(ang) * dist;
    const sy = gcy + Math.sin(ang) * dist * 0.7; // slightly elliptical
    if (sx < gm.x || sx > gm.x + gm.w || sy < gm.y || sy > gm.y + gm.h) continue;
    const bright = 0.3 + 0.4 * Math.sin(t * 0.04 + s);
    ctx.fillStyle = `rgba(150,220,255,${bright})`;
    ctx.fillRect(sx, sy, s % 5 === 0 ? 2 : 1, 1);
  }

  // Echo's station — bright beacon at center
  const beaconPulse = 0.6 + 0.4 * Math.sin(t * 0.05);
  const beaconGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 30);
  beaconGrad.addColorStop(0, `rgba(0,255,255,${beaconPulse})`);
  beaconGrad.addColorStop(0.3, `rgba(0,200,220,${beaconPulse * 0.5})`);
  beaconGrad.addColorStop(1, 'rgba(0,150,200,0)');
  ctx.fillStyle = beaconGrad;
  ctx.fillRect(gcx - 30, gcy - 30, 60, 60);
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(gcx - 3, gcy - 3, 6, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(gcx - 1, gcy - 1, 2, 2);

  // Distant stations as smaller dots
  const stationPositions = [
    [-120, -80], [90, -60], [-70, 100], [150, 40], [-160, 30],
    [60, 130], [-30, -140], [180, -100], [-140, 110], [110, -150]
  ];
  stationPositions.forEach(([ox, oy], i) => {
    const px = gcx + ox;
    const py = gcy + oy * 0.7;
    if (px < gm.x || px > gm.x + gm.w || py < gm.y || py > gm.y + gm.h) return;
    const blink = 0.3 + 0.3 * Math.sin(t * 0.03 + i * 2);
    ctx.fillStyle = `rgba(100,200,255,${blink})`;
    ctx.fillRect(px - 1, py - 1, 2, 2);
  });

  // Galaxy spiral arms (subtle)
  ctx.globalAlpha = 0.06;
  for (let arm = 0; arm < 3; arm++) {
    ctx.strokeStyle = '#40c0ff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let sp = 0; sp < 100; sp++) {
      const sAngle = arm * Math.PI * 2 / 3 + sp * 0.08 + rotAngle;
      const sDist = 15 + sp * 2;
      const spx = gcx + Math.cos(sAngle) * sDist;
      const spy = gcy + Math.sin(sAngle) * sDist * 0.65;
      if (sp === 0) ctx.moveTo(spx, spy); else ctx.lineTo(spx, spy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Galaxy map label
  ctx.fillStyle = '#00ddff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('◈ GALAXY MAP ◈', gcx, gm.y + 18);
  ctx.fillStyle = 'rgba(0,200,255,0.5)';
  ctx.font = '10px monospace';
  ctx.fillText(`Visitors: ${totalVisitors}`, gcx, gm.y + gm.h - 10);

  // ═══════════════════════════════════════════════════════
  // LAYER 8: MILESTONE WALL
  // ═══════════════════════════════════════════════════════
  const mw = find('milestone_wall');
  ctx.fillStyle = '#1e1408';
  ctx.fillRect(mw.x, mw.y, mw.w, mw.h);
  ctx.strokeStyle = '#b89828';
  ctx.lineWidth = 3;
  ctx.strokeRect(mw.x + 2, mw.y + 2, mw.w - 4, mw.h - 4);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('★ MILESTONES ★', mw.x + mw.w / 2, mw.y + 24);

  const milestoneCards = [
    { icon: '♦', label: 'First Steps', req: 10 },
    { icon: '♣', label: 'Community', req: 50 },
    { icon: '♠', label: 'Expansion', req: 100 },
    { icon: '♥', label: 'Thriving', req: 500 },
    { icon: '★', label: 'Legendary', req: 1000 },
    { icon: '◆', label: 'Transcend', req: 5000 },
    { icon: '☀', label: 'Ascended', req: 10000 }
  ];
  const cardW = 60, cardH = 70, cardGap = 8;
  const cardsPerRow = Math.floor((mw.w - 30) / (cardW + cardGap));
  milestoneCards.forEach((mc, i) => {
    const row = Math.floor(i / cardsPerRow);
    const col = i % cardsPerRow;
    const cx = mw.x + 18 + col * (cardW + cardGap);
    const cy = mw.y + 40 + row * (cardH + cardGap);
    const unlocked = totalVisitors >= mc.req;
    // Card background
    if (unlocked) {
      const cGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      cGrad.addColorStop(0, '#4a3a10');
      cGrad.addColorStop(1, '#3a2a08');
      ctx.fillStyle = cGrad;
    } else {
      ctx.fillStyle = 'rgba(30,25,15,0.8)';
    }
    ctx.fillRect(cx, cy, cardW, cardH);
    // Gold frame
    ctx.strokeStyle = unlocked ? '#ffd700' : '#443820';
    ctx.lineWidth = unlocked ? 2 : 1;
    ctx.strokeRect(cx, cy, cardW, cardH);
    // Glow for unlocked
    if (unlocked) {
      const gGrad = ctx.createRadialGradient(cx + cardW / 2, cy + cardH / 2, 0, cx + cardW / 2, cy + cardH / 2, 40);
      gGrad.addColorStop(0, 'rgba(255,215,0,0.15)');
      gGrad.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = gGrad;
      ctx.fillRect(cx - 10, cy - 10, cardW + 20, cardH + 20);
    }
    // Icon
    ctx.fillStyle = unlocked ? '#ffd700' : '#554430';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mc.icon, cx + cardW / 2, cy + 32);
    // Label
    ctx.font = '8px monospace';
    ctx.fillText(mc.label, cx + cardW / 2, cy + 50);
    ctx.fillStyle = unlocked ? '#ccaa40' : '#443820';
    ctx.font = '7px monospace';
    ctx.fillText(`${mc.req}`, cx + cardW / 2, cy + 62);
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 9: RANKED BOARD — tournament bracket
  // ═══════════════════════════════════════════════════════
  const rb = find('ranked_board');
  ctx.fillStyle = '#120c18';
  ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
  ctx.strokeStyle = '#8868a0';
  ctx.lineWidth = 2;
  ctx.strokeRect(rb.x + 2, rb.y + 2, rb.w - 4, rb.h - 4);

  ctx.fillStyle = '#ddaaff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔ RANKED BOARD ⚔', rb.x + rb.w / 2, rb.y + 22);

  const tiers = [
    { name: 'Legendary', color: '#ffd700', elo: '2400+' },
    { name: 'Diamond', color: '#b9f2ff', elo: '2000' },
    { name: 'Gold', color: '#daa520', elo: '1600' },
    { name: 'Silver', color: '#c0c0c0', elo: '1200' },
    { name: 'Bronze', color: '#cd7f32', elo: '800' }
  ];
  tiers.forEach((tier, i) => {
    const ty = rb.y + 38 + i * 34;
    // Tier bar
    ctx.fillStyle = 'rgba(40,30,50,0.7)';
    ctx.fillRect(rb.x + 15, ty, rb.w - 30, 28);
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(rb.x + 15, ty, rb.w - 30, 28);
    // Tier badge
    ctx.fillStyle = tier.color;
    ctx.fillRect(rb.x + 20, ty + 4, 20, 20);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((i + 1).toString(), rb.x + 30, ty + 18);
    // Tier name and ELO
    ctx.fillStyle = tier.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(tier.name, rb.x + 48, ty + 18);
    ctx.fillStyle = 'rgba(200,180,220,0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ELO ${tier.elo}`, rb.x + rb.w - 22, ty + 18);
  });

  // Bracket lines connecting tiers
  const bracketX = rb.x + rb.w - 60;
  ctx.strokeStyle = 'rgba(180,140,220,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < tiers.length - 1; i++) {
    const y1 = rb.y + 38 + i * 34 + 14;
    const y2 = rb.y + 38 + (i + 1) * 34 + 14;
    ctx.beginPath();
    ctx.moveTo(bracketX, y1);
    ctx.lineTo(bracketX + 15, (y1 + y2) / 2);
    ctx.lineTo(bracketX, y2);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 10: VISITOR RECORDS
  // ═══════════════════════════════════════════════════════
  const vr = find('visitor_records');
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(vr.x, vr.y, vr.w, vr.h);
  ctx.strokeStyle = '#a08020';
  ctx.lineWidth = 2;
  ctx.strokeRect(vr.x + 2, vr.y + 2, vr.w - 4, vr.h - 4);

  ctx.fillStyle = '#ddb850';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('📖 VISITOR RECORDS 📖', vr.x + vr.w / 2, vr.y + 22);

  // Display counters and stats
  const statsData = [
    { label: 'Total Visitors', value: totalVisitors },
    { label: 'Data Fragments', value: fragments.length },
    { label: 'Lifetime Coins', value: coins },
    { label: 'Milestones', value: milestones.length }
  ];
  statsData.forEach((sd, i) => {
    const sy = vr.y + 42 + i * 48;
    ctx.fillStyle = 'rgba(60,45,20,0.6)';
    ctx.fillRect(vr.x + 20, sy, vr.w - 40, 38);
    ctx.strokeStyle = 'rgba(200,170,60,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vr.x + 20, sy, vr.w - 40, 38);
    ctx.fillStyle = '#aa8830';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(sd.label, vr.x + 30, sy + 15);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(sd.value.toLocaleString(), vr.x + vr.w - 30, sy + 30);
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 11: BOOK SHELVES — towering with colorful spines
  // ═══════════════════════════════════════════════════════
  const bs = find('book_shelves');
  // Shelf structure (dark wood)
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bs.x, bs.y, bs.w, bs.h);

  const shelfCount = 5;
  const shelfH = bs.h / shelfCount;
  const bookColors = [
    '#8b0000', '#b22222', '#cd853f', '#006400', '#00008b',
    '#4b0082', '#8b4513', '#2f4f4f', '#800020', '#daa520',
    '#191970', '#556b2f', '#8b008b', '#a0522d', '#483d8b',
    '#b8860b', '#6b8e23', '#9932cc', '#c71585', '#20b2aa'
  ];
  for (let sh = 0; sh < shelfCount; sh++) {
    const sy = bs.y + sh * shelfH;
    // Shelf plank
    ctx.fillStyle = '#4a2a12';
    ctx.fillRect(bs.x, sy + shelfH - 6, bs.w, 6);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(bs.x, sy + shelfH - 5, bs.w, 2);
    // Books on shelf
    let bx = bs.x + 5;
    while (bx < bs.x + bs.w - 15) {
      const bw = 6 + Math.floor(((bx * 7 + sh * 13) % 8));
      const bh = shelfH - 12 + ((bx * 3 + sh * 5) % 6) - 3;
      const ci = Math.floor((bx * 3 + sh * 7) % bookColors.length);
      ctx.fillStyle = bookColors[ci];
      ctx.fillRect(bx, sy + shelfH - 6 - bh, bw, bh);
      // Spine detail line
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bx + 1, sy + shelfH - 6 - bh + 3, bw - 2, 1);
      ctx.fillRect(bx + 1, sy + shelfH - 6 - bh + bh - 5, bw - 2, 1);
      bx += bw + 2;
    }
  }
  // Wood frame
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 4;
  ctx.strokeRect(bs.x, bs.y, bs.w, bs.h);

  // ═══════════════════════════════════════════════════════
  // LAYER 12: GOLDEN THRONE
  // ═══════════════════════════════════════════════════════
  const gt = find('golden_throne');
  // Throne back (high)
  const throneGrad = ctx.createLinearGradient(gt.x, gt.y - 80, gt.x + gt.w, gt.y + gt.h);
  throneGrad.addColorStop(0, '#daa520');
  throneGrad.addColorStop(0.3, '#ffd700');
  throneGrad.addColorStop(0.6, '#c8960c');
  throneGrad.addColorStop(1, '#b8860b');
  ctx.fillStyle = throneGrad;
  // High back
  ctx.fillRect(gt.x + 30, gt.y - 80, gt.w - 60, 90);
  // Back top ornament (pointed crown)
  ctx.beginPath();
  ctx.moveTo(gt.x + 30, gt.y - 80);
  ctx.lineTo(gt.x + 50, gt.y - 110);
  ctx.lineTo(gt.x + 70, gt.y - 85);
  ctx.lineTo(gt.x + gt.w / 2, gt.y - 120);
  ctx.lineTo(gt.x + gt.w - 70, gt.y - 85);
  ctx.lineTo(gt.x + gt.w - 50, gt.y - 110);
  ctx.lineTo(gt.x + gt.w - 30, gt.y - 80);
  ctx.closePath();
  ctx.fill();
  // Seat
  ctx.fillRect(gt.x + 10, gt.y + 10, gt.w - 20, gt.h - 30);
  // Armrests
  ctx.fillRect(gt.x, gt.y, 20, gt.h - 10);
  ctx.fillRect(gt.x + gt.w - 20, gt.y, 20, gt.h - 10);
  // Legs
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(gt.x + 10, gt.y + gt.h - 20, 15, 20);
  ctx.fillRect(gt.x + gt.w - 25, gt.y + gt.h - 20, 15, 20);
  // Gem accents
  const gemPositions = [
    [gt.x + gt.w / 2, gt.y - 110],
    [gt.x + 50, gt.y - 100],
    [gt.x + gt.w - 50, gt.y - 100],
    [gt.x + gt.w / 2, gt.y - 50]
  ];
  gemPositions.forEach(([gx, gy]) => {
    ctx.fillStyle = '#ff2040';
    ctx.fillRect(gx - 4, gy - 4, 8, 8);
    ctx.fillStyle = '#ff6080';
    ctx.fillRect(gx - 2, gy - 2, 4, 2);
  });
  // Throne shimmer
  const tShim = 0.15 + 0.1 * Math.sin(t * 0.04);
  ctx.fillStyle = `rgba(255,240,150,${tShim})`;
  ctx.fillRect(gt.x + 35, gt.y - 70, gt.w - 70, 50);

  // ═══════════════════════════════════════════════════════
  // LAYER 13: ECHO STATUE — golden figure on pedestal
  // ═══════════════════════════════════════════════════════
  const es = find('echo_statue');
  const esCx = es.x + (es.w || 100) / 2;
  // Pedestal
  const pedGrad = ctx.createLinearGradient(esCx - 30, es.y + es.h - 60, esCx + 30, es.y + es.h);
  pedGrad.addColorStop(0, '#c8a020');
  pedGrad.addColorStop(0.5, '#e8c840');
  pedGrad.addColorStop(1, '#a08018');
  ctx.fillStyle = pedGrad;
  ctx.fillRect(esCx - 30, es.y + es.h - 60, 60, 60);
  // Pedestal top edge
  ctx.fillStyle = '#ffd960';
  ctx.fillRect(esCx - 35, es.y + es.h - 62, 70, 6);
  // Pedestal plaque
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(esCx - 20, es.y + es.h - 30, 40, 16);
  ctx.fillStyle = '#ddb850';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ECHO', esCx, es.y + es.h - 20);

  // Statue figure (golden pixel character ~20px wide)
  const statY = es.y + es.h - 60;
  ctx.fillStyle = '#ffd700';
  // Head
  ctx.fillRect(esCx - 5, statY - 40, 10, 10);
  // Body
  ctx.fillRect(esCx - 6, statY - 30, 12, 18);
  // Arms out (welcoming pose)
  ctx.fillRect(esCx - 16, statY - 28, 10, 4);
  ctx.fillRect(esCx + 6, statY - 28, 10, 4);
  // Legs
  ctx.fillRect(esCx - 5, statY - 12, 4, 12);
  ctx.fillRect(esCx + 1, statY - 12, 4, 12);
  // Crown detail
  ctx.fillStyle = '#ffe86c';
  ctx.fillRect(esCx - 6, statY - 44, 2, 4);
  ctx.fillRect(esCx - 1, statY - 46, 2, 6);
  ctx.fillRect(esCx + 4, statY - 44, 2, 4);
  // Glow around statue
  const stGlow = ctx.createRadialGradient(esCx, statY - 20, 0, esCx, statY - 20, 60);
  stGlow.addColorStop(0, `rgba(255,215,0,${0.12 + 0.06 * Math.sin(t * 0.03)})`);
  stGlow.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = stGlow;
  ctx.fillRect(esCx - 60, statY - 80, 120, 120);

  // ═══════════════════════════════════════════════════════
  // LAYER 14: MEMORIAL FOUNTAIN
  // ═══════════════════════════════════════════════════════
  const mf = find('memorial_fountain');
  const mfCx = mf.x + mf.w / 2, mfCy = mf.y + mf.h / 2;
  // Basin (golden, circular-ish via octagon)
  const basinGrad = ctx.createRadialGradient(mfCx, mfCy, 10, mfCx, mfCy, mf.w / 2);
  basinGrad.addColorStop(0, '#b89020');
  basinGrad.addColorStop(0.6, '#daa520');
  basinGrad.addColorStop(1, '#8a6a10');
  ctx.fillStyle = basinGrad;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const fx = mfCx + Math.cos(a) * (mf.w / 2);
    const fy = mfCy + Math.sin(a) * (mf.h / 2);
    if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e8c840';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Water surface
  const waterGrad = ctx.createRadialGradient(mfCx, mfCy, 0, mfCx, mfCy, mf.w / 2 - 15);
  waterGrad.addColorStop(0, 'rgba(100,180,255,0.5)');
  waterGrad.addColorStop(0.5, 'rgba(60,140,220,0.4)');
  waterGrad.addColorStop(1, 'rgba(40,100,180,0.3)');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const fx = mfCx + Math.cos(a) * (mf.w / 2 - 15);
    const fy = mfCy + Math.sin(a) * (mf.h / 2 - 15);
    if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
  }
  ctx.closePath();
  ctx.fill();

  // Animated water ripples
  for (let r = 0; r < 3; r++) {
    const ripRad = ((t * 0.5 + r * 30) % 80) + 10;
    const ripAlpha = Math.max(0, 0.3 - ripRad * 0.003);
    ctx.strokeStyle = `rgba(180,220,255,${ripAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mfCx, mfCy, ripRad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Central water spout
  const spoutH = 30 + 10 * Math.sin(t * 0.06);
  ctx.fillStyle = 'rgba(140,200,255,0.5)';
  ctx.fillRect(mfCx - 2, mfCy - spoutH, 4, spoutH);
  // Droplets
  for (let d = 0; d < 5; d++) {
    const dAngle = t * 0.08 + d * Math.PI * 2 / 5;
    const dDist = 8 + ((t * 0.5 + d * 17) % 30);
    const dUp = Math.max(0, spoutH - dDist * 0.8);
    const dx = mfCx + Math.cos(dAngle) * dDist;
    const dy = mfCy - dUp;
    ctx.fillStyle = `rgba(150,210,255,${0.6 - dDist * 0.015})`;
    ctx.fillRect(dx, dy, 2, 2);
  }

  // Light reflection on water
  const waterShine = ctx.createRadialGradient(mfCx - 15, mfCy - 10, 0, mfCx, mfCy, 40);
  waterShine.addColorStop(0, `rgba(255,255,255,${0.15 + 0.08 * Math.sin(t * 0.04)})`);
  waterShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = waterShine;
  ctx.fillRect(mfCx - 40, mfCy - 40, 80, 80);

  // ═══════════════════════════════════════════════════════
  // LAYER 15: ELEVATOR
  // ═══════════════════════════════════════════════════════
  const el = find('elevator');
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(el.x, el.y, el.w || 80, el.h || 120);
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 3;
  ctx.strokeRect(el.x, el.y, el.w || 80, el.h || 120);
  // Elevator doors
  const ew = (el.w || 80);
  ctx.fillStyle = '#b89828';
  ctx.fillRect(el.x + 8, el.y + 8, ew / 2 - 10, (el.h || 120) - 16);
  ctx.fillRect(el.x + ew / 2 + 2, el.y + 8, ew / 2 - 10, (el.h || 120) - 16);
  // Arrow indicator
  const arrowY = el.y - 20;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(el.x + ew / 2, arrowY);
  ctx.lineTo(el.x + ew / 2 - 8, arrowY + 12);
  ctx.lineTo(el.x + ew / 2 + 8, arrowY + 12);
  ctx.closePath();
  ctx.fill();

  // ═══════════════════════════════════════════════════════
  // LAYER 16: FLOATING BOOKS (8-10 books in the air)
  // ═══════════════════════════════════════════════════════
  const floatingBooks = [
    { x: 350, y: 400, color: '#8b0000', w: 24, h: 18 },
    { x: 600, y: 350, color: '#006400', w: 20, h: 16 },
    { x: 900, y: 380, color: '#00008b', w: 22, h: 14 },
    { x: 1200, y: 420, color: '#4b0082', w: 18, h: 16 },
    { x: 1600, y: 360, color: '#8b4513', w: 24, h: 18 },
    { x: 2000, y: 400, color: '#800020', w: 20, h: 14 },
    { x: 2300, y: 370, color: '#191970', w: 22, h: 16 },
    { x: 2600, y: 410, color: '#556b2f', w: 18, h: 14 },
    { x: 1100, y: 440, color: '#9932cc', w: 20, h: 16 },
    { x: 1900, y: 340, color: '#c71585', w: 22, h: 18 }
  ];
  floatingBooks.forEach((fb, i) => {
    const bobY = fb.y + Math.sin(t * 0.025 + i * 1.3) * 15;
    const tilt = Math.sin(t * 0.015 + i * 0.9) * 0.15;
    ctx.save();
    ctx.translate(fb.x + fb.w / 2, bobY + fb.h / 2);
    ctx.rotate(tilt);
    // Book body
    ctx.fillStyle = fb.color;
    ctx.fillRect(-fb.w / 2, -fb.h / 2, fb.w, fb.h);
    // Pages (light edge)
    ctx.fillStyle = '#f5f0e0';
    ctx.fillRect(-fb.w / 2 + 2, -fb.h / 2 + 2, 3, fb.h - 4);
    // Spine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-fb.w / 2, -fb.h / 2, fb.w, 2);
    ctx.restore();
    // Glow beneath floating book
    const fbGlow = ctx.createRadialGradient(fb.x + fb.w / 2, bobY + fb.h + 5, 0, fb.x + fb.w / 2, bobY + fb.h + 5, 20);
    fbGlow.addColorStop(0, 'rgba(255,220,100,0.12)');
    fbGlow.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = fbGlow;
    ctx.fillRect(fb.x - 10, bobY + fb.h - 10, fb.w + 20, 30);
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 17: GOLDEN SHIMMER PARTICLES (35+ sparkles)
  // ═══════════════════════════════════════════════════════
  for (let p = 0; p < 40; p++) {
    const px = (p * 731 + 13) % FW;
    const baseY = (p * 443 + 97) % FH;
    const py = baseY + Math.sin(t * 0.02 + p * 0.8) * 20;
    const drift = Math.sin(t * 0.01 + p * 1.2) * 10;
    const sparkle = Math.sin(t * 0.08 + p * 2.1);
    if (sparkle < 0.2) continue; // intermittent twinkle
    const alpha = sparkle * 0.7;
    const size = sparkle > 0.7 ? 3 : sparkle > 0.4 ? 2 : 1;
    ctx.fillStyle = `rgba(255,230,100,${alpha})`;
    ctx.fillRect(px + drift, py, size, size);
    // Cross sparkle for brighter particles
    if (sparkle > 0.8) {
      ctx.fillStyle = `rgba(255,245,180,${alpha * 0.5})`;
      ctx.fillRect(px + drift - 1, py + 1, size + 2, 1);
      ctx.fillRect(px + drift + 1, py - 1, 1, size + 2);
    }
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 18: AMBIENT GOLDEN GLOW — warm cathedral light
  // ═══════════════════════════════════════════════════════
  // Large warm radial glow from center ceiling
  const ambGlow = ctx.createRadialGradient(FW / 2, 0, 50, FW / 2, FH * 0.6, FW * 0.5);
  ambGlow.addColorStop(0, `rgba(255,220,100,${0.06 + 0.02 * Math.sin(t * 0.01)})`);
  ambGlow.addColorStop(0.5, 'rgba(255,200,80,0.03)');
  ambGlow.addColorStop(1, 'rgba(255,180,60,0)');
  ctx.fillStyle = ambGlow;
  ctx.fillRect(0, 0, FW, FH);

  // Corner warmth vignettes
  const corners = [[0, 0], [FW, 0], [0, FH], [FW, FH]];
  corners.forEach(([cx2, cy2]) => {
    const cGrad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 500);
    cGrad.addColorStop(0, 'rgba(40,25,5,0.25)');
    cGrad.addColorStop(1, 'rgba(40,25,5,0)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(cx2 - 500, cy2 - 500, 1000, 1000);
  });

  // ═══════════════════════════════════════════════════════
  // LAYER 19: FINAL OVERLAY — golden border frame
  // ═══════════════════════════════════════════════════════
  // Ornate golden border around entire floor
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, FW - 6, FH - 6);
  ctx.strokeStyle = '#ffd960';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, FW - 16, FH - 16);
  // Corner ornaments
  const ornSize = 30;
  [[12, 12], [FW - 12 - ornSize, 12], [12, FH - 12 - ornSize], [FW - 12 - ornSize, FH - 12 - ornSize]].forEach(([ox, oy]) => {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(ox, oy, ornSize, 4);
    ctx.fillRect(ox, oy, 4, ornSize);
    ctx.fillRect(ox + ornSize - 4, oy, 4, ornSize);
    ctx.fillRect(ox, oy + ornSize - 4, ornSize, 4);
    ctx.fillStyle = '#ffe86c';
    ctx.fillRect(ox + ornSize / 2 - 3, oy + ornSize / 2 - 3, 6, 6);
  });

  // Floor title (subtle, near top center)
  ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 0.02);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('T H E   A R C H I V E', FW / 2, 50);
  ctx.font = '11px monospace';
  ctx.fillText('Floor 9 — Endgame Reward', FW / 2, 72);
  ctx.globalAlpha = 1.0;
}
