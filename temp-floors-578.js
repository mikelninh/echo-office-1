// Floor 5: Secret Lab — 1600×1200
function renderFloor5() {
  const FW = 1600, FH = 1200;
  const t = S.time;
  const objs = getObjects();
  const find = id => objs.find(o => o.id === id);

  // --- Power flicker effect ---
  const flickerOn = (t % 240 < 2);
  const baseDim = flickerOn ? 0.15 : 1.0;

  ctx.save();
  ctx.globalAlpha = baseDim;

  // --- Background: dark lab floor ---
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, FW, FH);

  // --- Circuit board floor pattern ---
  ctx.strokeStyle = 'rgba(0,255,100,0.06)';
  ctx.lineWidth = 1;
  // Horizontal traces
  for (let y = 0; y < FH; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < FW; x += 40) {
      const jog = ((x * 7 + y * 3) % 120 < 40) ? 10 : 0;
      ctx.lineTo(x + 20, y + jog);
      ctx.lineTo(x + 40, y);
    }
    ctx.stroke();
  }
  // Vertical traces
  for (let x = 0; x < FW; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < FH; y += 40) {
      const jog = ((x * 3 + y * 7) % 120 < 40) ? 10 : 0;
      ctx.lineTo(x + jog, y + 20);
      ctx.lineTo(x, y + 40);
    }
    ctx.stroke();
  }
  // Circuit nodes
  ctx.fillStyle = 'rgba(0,255,100,0.1)';
  for (let x = 0; x < FW; x += 80) {
    for (let y = 0; y < FH; y += 80) {
      if ((x + y) % 160 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Green/blue ambient haze ---
  const haze = ctx.createRadialGradient(FW / 2, FH / 2, 100, FW / 2, FH / 2, 800);
  haze.addColorStop(0, 'rgba(0,60,80,0.15)');
  haze.addColorStop(0.5, 'rgba(0,40,30,0.1)');
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, FW, FH);

  // --- Scanner beams sweeping floor ---
  const scanX = (t * 3) % (FW + 200) - 100;
  ctx.save();
  ctx.globalAlpha = 0.08;
  const scanGrad = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0);
  scanGrad.addColorStop(0, 'rgba(0,255,150,0)');
  scanGrad.addColorStop(0.5, 'rgba(0,255,150,1)');
  scanGrad.addColorStop(1, 'rgba(0,255,150,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(scanX - 40, 0, 80, FH);
  ctx.restore();

  // --- Elevator ---
  const elev = find('elevator');
  if (elev) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    ctx.strokeStyle = '#3a7bd5';
    ctx.lineWidth = 2;
    ctx.strokeRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    // Elevator doors
    const dw = (elev.w || 60) / 2;
    const doorGap = Math.sin(t * 0.02) * 3;
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(elev.x + 2, elev.y + 4, dw - 4 - doorGap, (elev.h || 80) - 8);
    ctx.fillRect(elev.x + dw + 2 + doorGap, elev.y + 4, dw - 4 - doorGap, (elev.h || 80) - 8);
    // Arrow indicator
    ctx.fillStyle = '#3a7bd5';
    const ay = elev.y + 10 + (Math.sin(t * 0.05) * 4);
    ctx.beginPath();
    ctx.moveTo(elev.x + (elev.w || 60) / 2, ay);
    ctx.lineTo(elev.x + (elev.w || 60) / 2 - 6, ay + 8);
    ctx.lineTo(elev.x + (elev.w || 60) / 2 + 6, ay + 8);
    ctx.fill();
  }

  // --- PORTAL (THE STAR) ---
  const portal = find('portal');
  if (portal) {
    const px = portal.x + portal.w / 2;
    const py = portal.y + portal.h / 2;
    const baseR = 90;

    // Dimensional tears (background cracks in space)
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const angle = (t * 0.008 + i * 0.785);
      const len = 60 + Math.sin(t * 0.03 + i) * 30;
      ctx.strokeStyle = `rgba(180,100,255,${0.2 + Math.sin(t * 0.05 + i) * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 0.5;
      ctx.beginPath();
      const sx = px + Math.cos(angle) * (baseR + 10);
      const sy = py + Math.sin(angle) * (baseR + 10);
      ctx.moveTo(sx, sy);
      for (let s = 0; s < 4; s++) {
        const seg = len / 4;
        ctx.lineTo(
          sx + Math.cos(angle) * seg * (s + 1) + (Math.sin(t * 0.1 + i + s) * 8),
          sy + Math.sin(angle) * seg * (s + 1) + (Math.cos(t * 0.1 + i + s) * 8)
        );
      }
      ctx.stroke();
    }
    ctx.restore();

    // Outer glow
    const outerGlow = ctx.createRadialGradient(px, py, baseR - 10, px, py, baseR + 80);
    outerGlow.addColorStop(0, 'rgba(120,50,220,0.25)');
    outerGlow.addColorStop(0.5, 'rgba(80,0,180,0.1)');
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(px - baseR - 80, py - baseR - 80, (baseR + 80) * 2, (baseR + 80) * 2);

    // Energy rings (multiple concentric, rotating)
    for (let r = 0; r < 5; r++) {
      const ringR = baseR - r * 14;
      const rot = t * (0.015 + r * 0.005) * (r % 2 === 0 ? 1 : -1);
      const alpha = 0.4 + Math.sin(t * 0.04 + r) * 0.2;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.strokeStyle = `rgba(${140 + r * 20},${50 + r * 10},${220 + r * 8},${alpha})`;
      ctx.lineWidth = 2 - r * 0.2;
      ctx.setLineDash([8 + r * 2, 6 + r]);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * (0.85 + Math.sin(t * 0.02 + r) * 0.1), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Particle vortex
    for (let p = 0; p < 30; p++) {
      const angle = (t * 0.02 + p * 0.21);
      const dist = (baseR + 60) - ((t * 0.5 + p * 17) % (baseR + 60));
      const size = 1 + dist / 40;
      const pAlpha = dist / (baseR + 60);
      ctx.fillStyle = `rgba(${180 + (p * 7) % 60},${100 + (p * 3) % 80},255,${pAlpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(
        px + Math.cos(angle + dist * 0.03) * dist,
        py + Math.sin(angle + dist * 0.03) * dist,
        size, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Orbiting debris
    for (let d = 0; d < 6; d++) {
      const orbitAngle = t * 0.025 + d * (Math.PI * 2 / 6);
      const orbitR = baseR + 25 + Math.sin(t * 0.02 + d) * 10;
      const dx = px + Math.cos(orbitAngle) * orbitR;
      const dy = py + Math.sin(orbitAngle) * orbitR;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(t * 0.05 + d);
      ctx.fillStyle = `rgba(${100 + d * 20},${60 + d * 15},${180 + d * 10},0.8)`;
      const sz = 3 + d % 3;
      ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
      ctx.restore();
    }

    // Energy tendrils reaching outward
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const ta = t * 0.01 + i * 1.047;
      ctx.strokeStyle = `rgba(160,80,255,${0.15 + Math.sin(t * 0.04 + i) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ta) * baseR, py + Math.sin(ta) * baseR);
      const endDist = baseR + 80 + Math.sin(t * 0.03 + i * 2) * 40;
      ctx.quadraticCurveTo(
        px + Math.cos(ta + 0.3) * (baseR + endDist) / 2,
        py + Math.sin(ta + 0.3) * (baseR + endDist) / 2,
        px + Math.cos(ta + 0.1) * endDist,
        py + Math.sin(ta + 0.1) * endDist
      );
      ctx.stroke();
    }
    ctx.restore();

    // Core (bright center)
    const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, 30);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    coreGrad.addColorStop(0.3, 'rgba(200,150,255,0.6)');
    coreGrad.addColorStop(1, 'rgba(120,50,220,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(px, py, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Containment Tanks ---
  for (let i = 1; i <= 3; i++) {
    const tank = find('containment_tank_' + i);
    if (!tank) continue;
    const tx = tank.x, ty = tank.y, tw = tank.w || 80, th = tank.h || 150;

    // Metal base
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(tx - 5, ty + th - 15, tw + 10, 15);
    ctx.fillRect(tx - 5, ty, tw + 10, 15);

    // Green fluid background
    const fluidGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
    fluidGrad.addColorStop(0, 'rgba(0,60,20,0.7)');
    fluidGrad.addColorStop(0.5, 'rgba(0,120,40,0.5)');
    fluidGrad.addColorStop(1, 'rgba(0,80,30,0.7)');
    ctx.fillStyle = fluidGrad;
    ctx.fillRect(tx, ty + 15, tw, th - 30);

    // Glass cylinder highlight
    ctx.strokeStyle = 'rgba(100,255,180,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty + 15, tw, th - 30);
    // Glass shine
    ctx.fillStyle = 'rgba(150,255,200,0.08)';
    ctx.fillRect(tx + 3, ty + 18, 8, th - 36);

    // Bubbles rising
    for (let b = 0; b < 6; b++) {
      const bx = tx + 10 + (b * 11) % (tw - 20);
      const by = ty + th - 20 - ((t * 0.8 + b * 37 + i * 50) % (th - 35));
      const br = 2 + (b % 3);
      ctx.fillStyle = `rgba(100,255,180,${0.3 - by / (ty + th) * 0.1})`;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // Specimen silhouette
    ctx.fillStyle = 'rgba(0,20,10,0.5)';
    const specY = ty + 40 + Math.sin(t * 0.015 + i) * 8;
    ctx.beginPath();
    // Head
    ctx.ellipse(tx + tw / 2, specY, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2, specY + 28, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Tesla Coils ---
  const coil1 = find('tesla_coil_1');
  const coil2 = find('tesla_coil_2');
  const coils = [coil1, coil2].filter(Boolean);
  coils.forEach((coil, ci) => {
    const cx = coil.x + (coil.w || 40) / 2;
    const cy = coil.y;
    const cw = coil.w || 40, ch = coil.h || 120;

    // Base structure
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(cx - cw / 2, cy + ch - 20, cw, 20);
    // Metal column
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(cx - 6, cy + 10, 12, ch - 30);
    // Top sphere
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 14, 0, Math.PI * 2);
    ctx.fill();
    // Shine on sphere
    ctx.fillStyle = 'rgba(150,180,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy + 6, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Electric arcs between coils
  if (coil1 && coil2) {
    const c1x = coil1.x + (coil1.w || 40) / 2;
    const c1y = coil1.y + 10;
    const c2x = coil2.x + (coil2.w || 40) / 2;
    const c2y = coil2.y + 10;
    for (let a = 0; a < 3; a++) {
      if ((t + a * 17) % 12 < 8) {
        ctx.strokeStyle = `rgba(${150 + a * 30},${200 + a * 20},255,${0.6 + Math.sin(t * 0.2 + a) * 0.3})`;
        ctx.lineWidth = 1.5 - a * 0.3;
        ctx.beginPath();
        ctx.moveTo(c1x, c1y);
        const segs = 8;
        for (let s = 1; s <= segs; s++) {
          const frac = s / segs;
          const lx = c1x + (c2x - c1x) * frac;
          const ly = c1y + (c2y - c1y) * frac + (Math.sin(t * 0.3 + s * 2 + a * 5) * 20) * Math.sin(frac * Math.PI);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    }
  }

  // --- Hologram Table ---
  const hTable = find('hologram_table');
  if (hTable) {
    const hx = hTable.x, hy = hTable.y, hw = hTable.w || 200, hh = hTable.h || 120;
    // Table surface
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(hx, hy + hh - 20, hw, 20);
    ctx.strokeStyle = 'rgba(0,200,255,0.3)';
    ctx.strokeRect(hx, hy + hh - 20, hw, 20);

    // Holographic projection beam
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = 'rgba(0,200,255,1)';
    ctx.beginPath();
    ctx.moveTo(hx + hw / 2 - 60, hy + hh - 20);
    ctx.lineTo(hx + hw / 2 - 20, hy);
    ctx.lineTo(hx + hw / 2 + 20, hy);
    ctx.lineTo(hx + hw / 2 + 60, hy + hh - 20);
    ctx.fill();
    ctx.restore();

    // 3D rotating wireframe cube
    const ctrX = hx + hw / 2, ctrY = hy + 30;
    const sz = 25;
    const rot = t * 0.02;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const verts = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const proj = verts.map(([vx, vy, vz]) => {
      const rx = vx * cos - vz * sin;
      const rz = vx * sin + vz * cos;
      const ry2 = vy * Math.cos(rot * 0.7) - rz * Math.sin(rot * 0.7);
      const rz2 = vy * Math.sin(rot * 0.7) + rz * Math.cos(rot * 0.7);
      const scale = 1.5 / (2 + rz2 * 0.3);
      return [ctrX + rx * sz * scale, ctrY + ry2 * sz * scale];
    });
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    ctx.strokeStyle = `rgba(0,220,255,${0.5 + Math.sin(t * 0.05) * 0.2})`;
    ctx.lineWidth = 1.5;
    edges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(proj[a][0], proj[a][1]);
      ctx.lineTo(proj[b][0], proj[b][1]);
      ctx.stroke();
    });
  }

  // --- Lab Monitors (5 holographic screens) ---
  const monitors = find('lab_monitors');
  if (monitors) {
    const mx = monitors.x, my = monitors.y, mw = monitors.w || 250, mh = monitors.h || 80;
    for (let m = 0; m < 5; m++) {
      const sw = mw / 5 - 4;
      const sx = mx + m * (mw / 5) + 2;
      const sy = my - 20 - Math.sin(t * 0.03 + m * 0.8) * 4;
      const flick = (t + m * 33) % 120 < 2 ? 0.2 : 0.55;
      ctx.save();
      ctx.globalAlpha = flick;
      ctx.fillStyle = `rgba(0,${150 + m * 20},${200 + m * 10},0.8)`;
      ctx.fillRect(sx, sy, sw, mh);
      // Screen content: bar graph
      ctx.fillStyle = 'rgba(0,255,200,0.6)';
      for (let b = 0; b < 5; b++) {
        const bh = 10 + Math.sin(t * 0.04 + m + b * 0.5) * 15 + 15;
        ctx.fillRect(sx + 4 + b * (sw / 5), sy + mh - bh - 4, sw / 5 - 4, bh);
      }
      // Scanline
      const scanY = sy + (t * 0.5 + m * 10) % mh;
      ctx.fillStyle = 'rgba(0,255,200,0.1)';
      ctx.fillRect(sx, scanY, sw, 2);
      ctx.restore();
    }
  }

  // --- Terminal ---
  const terminal = find('terminal');
  if (terminal) {
    const tx2 = terminal.x, ty2 = terminal.y, tw2 = terminal.w || 120, th2 = terminal.h || 100;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(tx2, ty2, tw2, th2);
    ctx.strokeStyle = '#0a4a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx2, ty2, tw2, th2);
    // Scrolling text lines
    ctx.fillStyle = '#00ff66';
    ctx.font = '8px monospace';
    const lines = 10;
    for (let l = 0; l < lines; l++) {
      const ly = ty2 + 10 + l * 9 - (t * 0.3) % 9;
      if (ly > ty2 + 2 && ly < ty2 + th2 - 4) {
        const chars = '01>_/\\|{}[]~';
        let txt = '';
        for (let c = 0; c < 14; c++) txt += chars[(c * 7 + l * 3 + Math.floor(t * 0.1)) % chars.length];
        ctx.fillText(txt, tx2 + 6, ly);
      }
    }
    // Cursor blink
    if (t % 40 < 20) {
      ctx.fillRect(tx2 + 6, ty2 + th2 - 14, 6, 8);
    }
  }

  // --- Workbench ---
  const wb = find('workbench');
  if (wb) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(wb.x, wb.y, wb.w || 200, wb.h || 80);
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(wb.x, wb.y, wb.w || 200, wb.h || 80);
    // Tools on bench
    const tools = [[10, 10, 30, 6], [50, 8, 8, 20], [70, 12, 25, 4], [110, 5, 15, 15], [140, 8, 10, 18]];
    tools.forEach(([dx, dy, dw, dh], i) => {
      ctx.fillStyle = ['#7a7a8a', '#5a6a7a', '#8a7a6a', '#6a8a7a', '#7a6a8a'][i];
      ctx.fillRect(wb.x + dx, wb.y + dy, dw, dh);
    });
  }

  // --- Vault ---
  const vault = find('vault');
  if (vault) {
    const vx = vault.x + (vault.w || 120) / 2;
    const vy = vault.y + (vault.h || 120) / 2;
    const vr = (vault.w || 120) / 2;
    // Door circle
    ctx.fillStyle = '#3a3a4a';
    ctx.beginPath();
    ctx.arc(vx, vy, vr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a6a7a';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Lock mechanism — concentric rings
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.translate(vx, vy);
      ctx.rotate(t * (0.01 + r * 0.005) * (r % 2 === 0 ? 1 : -1));
      ctx.strokeStyle = `rgba(150,150,180,${0.5 - r * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, vr - 15 - r * 12, 0, Math.PI * 1.5);
      ctx.stroke();
      // Tick marks
      for (let tk = 0; tk < 8; tk++) {
        const a = tk * Math.PI / 4;
        ctx.fillStyle = '#8a8a9a';
        ctx.fillRect(Math.cos(a) * (vr - 18 - r * 12) - 1, Math.sin(a) * (vr - 18 - r * 12) - 1, 3, 3);
      }
      ctx.restore();
    }
    // Center handle
    ctx.fillStyle = '#5a5a6a';
    ctx.beginPath();
    ctx.arc(vx, vy, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Artifacts / Specimen Shelf ---
  const art = find('artifacts');
  if (art) {
    ctx.fillStyle = '#2a1a1a';
    ctx.fillRect(art.x, art.y, art.w || 150, art.h || 60);
    // Jars
    for (let j = 0; j < 5; j++) {
      const jx = art.x + 10 + j * 28;
      const jy = art.y + 8;
      ctx.fillStyle = `rgba(0,${100 + j * 20},${80 + j * 15},0.5)`;
      ctx.fillRect(jx, jy, 18, 35);
      ctx.strokeStyle = 'rgba(150,200,180,0.3)';
      ctx.strokeRect(jx, jy, 18, 35);
      // Specimen dot
      ctx.fillStyle = `rgba(${50 + j * 30},${30 + j * 20},0,0.6)`;
      ctx.beginPath();
      ctx.arc(jx + 9, jy + 18 + Math.sin(t * 0.02 + j) * 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Journal ---
  const journal = find('journal');
  if (journal) {
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(journal.x, journal.y, journal.w || 60, journal.h || 50);
    ctx.strokeStyle = '#6a5040';
    ctx.lineWidth = 1;
    ctx.strokeRect(journal.x, journal.y, journal.w || 60, journal.h || 50);
    // Pages
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(journal.x + 4, journal.y + 3, (journal.w || 60) - 8, (journal.h || 50) - 6);
    // Text lines
    ctx.fillStyle = '#5a4a3a';
    for (let l = 0; l < 5; l++) {
      ctx.fillRect(journal.x + 8, journal.y + 8 + l * 8, (journal.w || 60) - 16, 1);
    }
  }

  // --- Enhance Station ---
  const enh = find('enhance_station');
  if (enh) {
    const ex = enh.x + (enh.w || 100) / 2, ey = enh.y + (enh.h || 100) / 2;
    // Anvil shape
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(enh.x + 15, ey + 10, (enh.w || 100) - 30, 25);
    ctx.fillRect(enh.x + 25, ey - 10, (enh.w || 100) - 50, 20);
    ctx.fillRect(enh.x + 10, ey + 35, (enh.w || 100) - 20, 10);
    // Glow
    const eGlow = ctx.createRadialGradient(ex, ey, 5, ex, ey, 50);
    eGlow.addColorStop(0, 'rgba(255,200,50,0.3)');
    eGlow.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = eGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, 50, 0, Math.PI * 2);
    ctx.fill();
    // Sparks
    for (let s = 0; s < 4; s++) {
      if ((t + s * 11) % 20 < 10) {
        const sa = (t * 0.1 + s * 1.5);
        ctx.fillStyle = 'rgba(255,220,100,0.8)';
        ctx.beginPath();
        ctx.arc(ex + Math.cos(sa) * 20, ey - 15 + Math.sin(sa) * 10 - (t + s * 5) % 15, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Crafting Station ---
  const craft = find('crafting_station');
  if (craft) {
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(craft.x, craft.y, craft.w || 100, craft.h || 100);
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(craft.x, craft.y, craft.w || 100, craft.h || 100);
    // Grid on surface
    ctx.strokeStyle = 'rgba(100,80,60,0.4)';
    ctx.lineWidth = 1;
    for (let g = 1; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(craft.x + g * 25, craft.y);
      ctx.lineTo(craft.x + g * 25, craft.y + (craft.h || 100));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(craft.x, craft.y + g * 25);
      ctx.lineTo(craft.x + (craft.w || 100), craft.y + g * 25);
      ctx.stroke();
    }
  }

  ctx.restore();
}


// Floor 7: Community Deck / Town Square — 2800×1400
function renderFloor7() {
  const FW = 2800, FH = 1400;
  const t = S.time;
  const objs = getObjects();
  const find = id => objs.find(o => o.id === id);

  // --- Sky (top 200px) ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
  skyGrad.addColorStop(0, '#050515');
  skyGrad.addColorStop(1, '#101830');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, FW, 200);

  // Stars
  for (let s = 0; s < 80; s++) {
    const sx = (s * 37 + s * s * 3) % FW;
    const sy = (s * 23 + s * s * 7) % 180 + 5;
    const bright = 0.3 + Math.sin(t * 0.02 + s * 0.7) * 0.3 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${bright})`;
    ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
  }

  // Station hull silhouette at top
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(0, 200);
  for (let x = 0; x <= FW; x += 100) {
    ctx.lineTo(x, 180 + Math.sin(x * 0.005) * 12 + ((x % 400 < 80) ? -20 : 0));
  }
  ctx.lineTo(FW, 200);
  ctx.fill();
  // Hull details
  ctx.strokeStyle = 'rgba(60,80,120,0.4)';
  ctx.lineWidth = 1;
  for (let x = 50; x < FW; x += 200) {
    ctx.strokeRect(x, 185, 60, 12);
  }

  // --- Ground plane ---
  const groundGrad = ctx.createLinearGradient(0, 200, 0, FH);
  groundGrad.addColorStop(0, '#2a2420');
  groundGrad.addColorStop(0.3, '#332a22');
  groundGrad.addColorStop(1, '#2a2218');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 200, FW, FH - 200);

  // Cobblestone pattern
  ctx.strokeStyle = 'rgba(80,60,40,0.15)';
  ctx.lineWidth = 1;
  for (let y = 200; y < FH; y += 30) {
    const off = (y / 30) % 2 === 0 ? 0 : 20;
    for (let x = off; x < FW; x += 40) {
      ctx.strokeRect(x, y, 40, 30);
    }
  }

  // --- Warm golden ambient lighting ---
  const warmGlow = ctx.createRadialGradient(FW / 2, FH / 2, 100, FW / 2, FH / 2, FW / 2);
  warmGlow.addColorStop(0, 'rgba(255,200,100,0.06)');
  warmGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, 0, FW, FH);

  // --- Bunting / flags strung between structures ---
  const flagColors = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#264653'];
  for (let row = 0; row < 3; row++) {
    const fy = 250 + row * 180;
    const startX = 100 + row * 300;
    const endX = startX + 800;
    ctx.strokeStyle = 'rgba(200,180,150,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, fy);
    ctx.quadraticCurveTo((startX + endX) / 2, fy + 30, endX, fy);
    ctx.stroke();
    for (let f = 0; f < 12; f++) {
      const fx = startX + f * ((endX - startX) / 12);
      const droop = 30 * Math.sin((fx - startX) / (endX - startX) * Math.PI);
      const ffY = fy + droop;
      const wave = Math.sin(t * 0.04 + f * 0.5 + row) * 2;
      ctx.fillStyle = flagColors[(f + row) % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(fx, ffY);
      ctx.lineTo(fx - 6, ffY + 14 + wave);
      ctx.lineTo(fx + 6, ffY + 14 + wave);
      ctx.fill();
    }
  }

  // --- Paper lantern lights ---
  for (let l = 0; l < 20; l++) {
    const lx = 120 + (l * 137) % (FW - 200);
    const ly = 220 + (l * 53) % 100;
    const pulse = 0.5 + Math.sin(t * 0.03 + l * 1.2) * 0.2;
    const lanternColor = ['#ffcc66', '#ff9966', '#ff6666', '#ffaa44'][l % 4];
    // Glow
    const lGlow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 20);
    lGlow.addColorStop(0, lanternColor.replace(')', `,${pulse})`).replace('rgb', 'rgba'));
    lGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, Math.PI * 2);
    ctx.fill();
    // Lantern body
    ctx.fillStyle = lanternColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // String
    ctx.strokeStyle = 'rgba(150,130,100,0.3)';
    ctx.beginPath();
    ctx.moveTo(lx, ly - 8);
    ctx.lineTo(lx, ly - 20);
    ctx.stroke();
  }

  // --- Elevator ---
  const elev = find('elevator');
  if (elev) {
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    ctx.strokeStyle = '#5a6a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    const ew = (elev.w || 60) / 2;
    ctx.fillStyle = '#3a3a5e';
    ctx.fillRect(elev.x + 2, elev.y + 4, ew - 4, (elev.h || 80) - 8);
    ctx.fillRect(elev.x + ew + 2, elev.y + 4, ew - 4, (elev.h || 80) - 8);
  }

  // --- Pixel Canvas (400×400 with 32×32 grid) ---
  const pc = find('pixel_canvas');
  if (pc) {
    const pcx = pc.x, pcy = pc.y, pcw = pc.w || 400, pch = pc.h || 400;
    // Frame
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(pcx - 6, pcy - 6, pcw + 12, pch + 12);
    // White background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(pcx, pcy, pcw, pch);
    // Procedural pixel art pattern (deterministic)
    const cellW = pcw / 32, cellH = pch / 32;
    for (let gy = 0; gy < 32; gy++) {
      for (let gx = 0; gx < 32; gx++) {
        // Deterministic pattern: concentric diamond + wave
        const dx = Math.abs(gx - 16), dy = Math.abs(gy - 16);
        const dist = dx + dy;
        const wave = Math.sin((gx + gy) * 0.3 + t * 0.01) * 4;
        const hue = (dist * 15 + wave * 10 + t * 0.2) % 360;
        const sat = dist < 8 ? 80 : 50;
        const light = dist < 4 ? 65 : dist < 12 ? 50 : 35;
        if (dist < 16) {
          ctx.fillStyle = `hsl(${hue},${sat}%,${light}%)`;
          ctx.fillRect(pcx + gx * cellW, pcy + gy * cellH, cellW, cellH);
        }
      }
    }
    // Grid overlay
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= 32; gx++) {
      ctx.beginPath();
      ctx.moveTo(pcx + gx * cellW, pcy);
      ctx.lineTo(pcx + gx * cellW, pcy + pch);
      ctx.stroke();
    }
    for (let gy = 0; gy <= 32; gy++) {
      ctx.beginPath();
      ctx.moveTo(pcx, pcy + gy * cellH);
      ctx.lineTo(pcx + pcw, pcy + gy * cellH);
      ctx.stroke();
    }
  }

  // --- Color Palette ---
  const cp = find('color_palette');
  if (cp) {
    const cpx = cp.x, cpy = cp.y, cpw = cp.w || 80, cph = cp.h || 400;
    ctx.fillStyle = '#f5f0e0';
    ctx.fillRect(cpx, cpy, cpw, cph);
    ctx.strokeStyle = '#5a5040';
    ctx.strokeRect(cpx, cpy, cpw, cph);
    const palColors = [
      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
      '#00ff88', '#ff0088', '#888888', '#ff4444', '#44ff44',
      '#4444ff', '#ffaa00', '#aa00ff', '#00aaff', '#ff6688'
    ];
    const swatchH = (cph - 20) / palColors.length;
    palColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(cpx + 8, cpy + 10 + i * swatchH, cpw - 16, swatchH - 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.strokeRect(cpx + 8, cpy + 10 + i * swatchH, cpw - 16, swatchH - 2);
    });
  }

  // --- Event Stage ---
  const stage = find('event_stage');
  if (stage) {
    const sx = stage.x, sy = stage.y, sw = stage.w || 400, sh = stage.h || 200;
    // Raised platform
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(sx, sy + sh - 30, sw, 30);
    ctx.fillStyle = '#7a5a40';
    ctx.fillRect(sx + 5, sy + sh - 60, sw - 10, 30);
    // Stage floor
    ctx.fillStyle = '#8a6a50';
    ctx.fillRect(sx + 10, sy + 40, sw - 20, sh - 70);
    // Planks
    ctx.strokeStyle = 'rgba(60,40,20,0.2)';
    for (let p = 0; p < 8; p++) {
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy + 40 + p * ((sh - 70) / 8));
      ctx.lineTo(sx + sw - 10, sy + 40 + p * ((sh - 70) / 8));
      ctx.stroke();
    }
    // Curtains (left and right, red with curves)
    for (let side = 0; side < 2; side++) {
      const cx2 = side === 0 ? sx : sx + sw;
      const dir = side === 0 ? 1 : -1;
      ctx.fillStyle = '#8b1a1a';
      ctx.beginPath();
      ctx.moveTo(cx2, sy);
      for (let cy2 = 0; cy2 < sh; cy2 += 5) {
        const wave = Math.sin(cy2 * 0.04 + t * 0.01) * 12 * dir;
        ctx.lineTo(cx2 + 50 * dir + wave, sy + cy2);
      }
      ctx.lineTo(cx2 + 30 * dir, sy + sh);
      ctx.lineTo(cx2, sy + sh);
      ctx.fill();
      // Curtain folds
      ctx.strokeStyle = 'rgba(60,10,10,0.4)';
      ctx.lineWidth = 1;
      for (let f = 0; f < 3; f++) {
        ctx.beginPath();
        const fOff = 12 + f * 12;
        ctx.moveTo(cx2 + fOff * dir, sy);
        for (let cy2 = 0; cy2 < sh; cy2 += 10) {
          ctx.lineTo(cx2 + (fOff + Math.sin(cy2 * 0.04 + t * 0.01 + f) * 3) * dir, sy + cy2);
        }
        ctx.stroke();
      }
    }
    // Spotlight beams
    for (let sp = 0; sp < 3; sp++) {
      const spx = sx + 80 + sp * ((sw - 160) / 2);
      ctx.save();
      ctx.globalAlpha = 0.06 + Math.sin(t * 0.02 + sp) * 0.02;
      const spotGrad = ctx.createLinearGradient(spx, sy - 60, spx, sy + sh);
      spotGrad.addColorStop(0, 'rgba(255,255,200,1)');
      spotGrad.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(spx - 5, sy - 60);
      ctx.lineTo(spx - 60, sy + sh);
      ctx.lineTo(spx + 60, sy + sh);
      ctx.lineTo(spx + 5, sy - 60);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Fountain Plaza ---
  const fountain = find('fountain_plaza');
  if (fountain) {
    const fx = fountain.x + (fountain.w || 200) / 2;
    const fy = fountain.y + (fountain.h || 200) / 2;
    const fr = (fountain.w || 200) / 2;
    // Base pool
    ctx.fillStyle = '#2a3a5a';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 20, fr, fr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a8a9a';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Water surface
    ctx.fillStyle = 'rgba(50,100,180,0.4)';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 18, fr - 5, fr * 0.5 - 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Center pillar
    ctx.fillStyle = '#7a7a8a';
    ctx.fillRect(fx - 8, fy - 40, 16, 60);
    // Top basin
    ctx.fillStyle = '#8a8a9a';
    ctx.beginPath();
    ctx.ellipse(fx, fy - 40, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Water spout
    const hueShift = (t * 2) % 360;
    ctx.strokeStyle = `hsl(${hueShift},70%,60%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 48);
    ctx.quadraticCurveTo(fx, fy - 65, fx + Math.sin(t * 0.03) * 8, fy - 60);
    ctx.stroke();
    // Cascading water arcs (LED-lit, color cycling)
    for (let w = 0; w < 8; w++) {
      const angle = (w / 8) * Math.PI * 2;
      const wHue = (hueShift + w * 45) % 360;
      ctx.strokeStyle = `hsla(${wHue},80%,65%,0.5)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const wx1 = fx + Math.cos(angle) * 18;
      const wy1 = fy - 38;
      const wx2 = fx + Math.cos(angle) * (fr - 15);
      const wy2 = fy + 10;
      ctx.moveTo(wx1, wy1);
      ctx.quadraticCurveTo(wx1 + (wx2 - wx1) * 0.5, wy1 - 10 + Math.sin(t * 0.05 + w) * 3, wx2, wy2);
      ctx.stroke();
    }
    // Water particles
    for (let p = 0; p < 12; p++) {
      const pa = (t * 0.03 + p * 0.52);
      const pd = 15 + (t * 0.4 + p * 13) % (fr - 20);
      const ppx = fx + Math.cos(pa) * pd;
      const ppy = fy - 30 + pd * 0.4;
      const pHue = (hueShift + pd * 3) % 360;
      ctx.fillStyle = `hsla(${pHue},70%,70%,${0.5 - pd / fr * 0.3})`;
      ctx.beginPath();
      ctx.arc(ppx, ppy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Message Board ---
  const mb = find('message_board');
  if (mb) {
    const mbx = mb.x, mby = mb.y, mbw = mb.w || 250, mbh = mb.h || 400;
    // Cork background
    ctx.fillStyle = '#b08040';
    ctx.fillRect(mbx, mby, mbw, mbh);
    // Cork texture dots
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${140 + (i * 7) % 30},${100 + (i * 3) % 20},${50 + (i * 11) % 20},0.3)`;
      const dotX = mbx + (i * 37) % mbw;
      const dotY = mby + (i * 53) % mbh;
      ctx.fillRect(dotX, dotY, 2, 2);
    }
    // Wood frame
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 4;
    ctx.strokeRect(mbx, mby, mbw, mbh);
    // Pinned notes
    const noteColors = ['#ffff88', '#88ffaa', '#ff88aa', '#88ccff', '#ffcc88', '#cc88ff'];
    const notes = [
      [15, 20, 80, 60], [110, 15, 75, 55], [20, 100, 90, 50],
      [130, 90, 70, 65], [40, 180, 85, 55], [150, 175, 70, 60],
      [15, 260, 80, 50], [120, 255, 75, 55], [50, 330, 90, 50]
    ];
    notes.forEach(([nx, ny, nw, nh], i) => {
      const rot = Math.sin(i * 2.1) * 0.1;
      ctx.save();
      ctx.translate(mbx + nx + nw / 2, mby + ny + nh / 2);
      ctx.rotate(rot);
      ctx.fillStyle = noteColors[i % noteColors.length];
      ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 2;
      ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
      ctx.shadowColor = 'transparent';
      // Text lines
      ctx.fillStyle = '#333';
      for (let l = 0; l < 3; l++) {
        ctx.fillRect(-nw / 2 + 6, -nh / 2 + 12 + l * 12, nw - 18, 1.5);
      }
      // Pin
      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.arc(0, -nh / 2 + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // --- Mailbox ---
  const mail = find('mailbox');
  if (mail) {
    const mlx = mail.x, mly = mail.y, mlw = mail.w || 50, mlh = mail.h || 80;
    // Post
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(mlx + mlw / 2 - 4, mly + mlh / 2, 8, mlh / 2);
    // Box body
    ctx.fillStyle = '#3355aa';
    ctx.fillRect(mlx, mly, mlw, mlh / 2 + 5);
    // Rounded top
    ctx.beginPath();
    ctx.arc(mlx + mlw / 2, mly, mlw / 2, Math.PI, 0);
    ctx.fill();
    // Slot
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(mlx + 8, mly + 10, mlw - 16, 5);
    // Flag
    const flagUp = t % 300 < 150;
    ctx.fillStyle = '#cc3333';
    if (flagUp) {
      ctx.fillRect(mlx + mlw - 4, mly - 5, 4, 20);
      ctx.fillRect(mlx + mlw, mly - 5, 10, 8);
    } else {
      ctx.fillRect(mlx + mlw - 4, mly + 10, 4, 15);
    }
  }

  // --- Market Stalls ---
  for (let s = 1; s <= 3; s++) {
    const stall = find('market_stall_' + s);
    if (!stall) continue;
    const sx2 = stall.x, sy2 = stall.y, sw2 = stall.w || 150, sh2 = stall.h || 100;
    const canopyColors = ['#cc4444', '#44aa44', '#4444cc'];
    // Counter
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(sx2, sy2 + sh2 * 0.5, sw2, sh2 * 0.5);
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(sx2, sy2 + sh2 * 0.5, sw2, 8);
    // Support poles
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(sx2 + 5, sy2 - 10, 6, sh2 * 0.6 + 10);
    ctx.fillRect(sx2 + sw2 - 11, sy2 - 10, 6, sh2 * 0.6 + 10);
    // Canopy with scalloped edge
    ctx.fillStyle = canopyColors[s - 1];
    ctx.fillRect(sx2 - 5, sy2 - 10, sw2 + 10, 25);
    // Scalloped bottom edge
    ctx.beginPath();
    ctx.moveTo(sx2 - 5, sy2 + 15);
    for (let sc = 0; sc < 8; sc++) {
      const scx = sx2 - 5 + (sc + 0.5) * ((sw2 + 10) / 8);
      ctx.quadraticCurveTo(scx, sy2 + 22 + Math.sin(t * 0.03 + sc) * 1.5, sx2 - 5 + (sc + 1) * ((sw2 + 10) / 8), sy2 + 15);
    }
    ctx.fill();
    // Items on counter
    for (let item = 0; item < 4; item++) {
      const ix = sx2 + 15 + item * 32;
      const iy = sy2 + sh2 * 0.5 - 12;
      const itemColors = ['#ff8844', '#44dd66', '#dd44aa', '#44aaff'];
      ctx.fillStyle = itemColors[(item + s) % 4];
      ctx.fillRect(ix, iy, 16, 12);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.strokeRect(ix, iy, 16, 12);
    }
  }

  // --- Community Garden ---
  const garden = find('community_garden');
  if (garden) {
    const gx = garden.x, gy = garden.y, gw = garden.w || 400, gh = garden.h || 300;
    // Soil base
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(gx, gy, gw, gh);
    // Fence
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, gw, gh);
    // Fence posts
    for (let fp = 0; fp <= 8; fp++) {
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(gx + fp * (gw / 8) - 2, gy - 8, 4, 12);
    }
    // Garden plots (4×3 grid)
    for (let py = 0; py < 3; py++) {
      for (let px = 0; px < 4; px++) {
        const plotX = gx + 15 + px * (gw / 4);
        const plotY = gy + 15 + py * (gh / 3);
        const plotW = gw / 4 - 20;
        const plotH = gh / 3 - 20;
        // Soil patch
        ctx.fillStyle = '#5a4a30';
        ctx.fillRect(plotX, plotY, plotW, plotH);
        // Rows
        ctx.strokeStyle = 'rgba(80,60,30,0.3)';
        ctx.lineWidth = 1;
        for (let r = 1; r < 3; r++) {
          ctx.beginPath();
          ctx.moveTo(plotX, plotY + r * (plotH / 3));
          ctx.lineTo(plotX + plotW, plotY + r * (plotH / 3));
          ctx.stroke();
        }
        // Flowers / plants
        const plantIdx = (px + py * 4);
        const flowerHue = (plantIdx * 67) % 360;
        const growPhase = Math.sin(t * 0.008 + plantIdx * 0.8);
        for (let f = 0; f < 3; f++) {
          const fxx = plotX + 10 + f * (plotW / 3);
          const fyy = plotY + plotH / 2;
          const stemH = 12 + growPhase * 4;
          // Stem
          ctx.strokeStyle = '#228822';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(fxx, fyy + 5);
          ctx.lineTo(fxx, fyy + 5 - stemH);
          ctx.stroke();
          // Flower head
          ctx.fillStyle = `hsl(${(flowerHue + f * 40) % 360},70%,60%)`;
          ctx.beginPath();
          ctx.arc(fxx, fyy + 5 - stemH, 4 + growPhase, 0, Math.PI * 2);
          ctx.fill();
          // Center
          ctx.fillStyle = '#ffee44';
          ctx.beginPath();
          ctx.arc(fxx, fyy + 5 - stemH, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- Gallery Frames ---
  const gallery = find('gallery_frame');
  if (gallery) {
    const gfx = gallery.x, gfy = gallery.y, gfw = gallery.w || 400, gfh = gallery.h || 200;
    // Wall
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(gfx, gfy, gfw, gfh);
    // Individual frames (4 artworks)
    for (let f = 0; f < 4; f++) {
      const ffx = gfx + 15 + f * (gfw / 4);
      const ffy = gfy + 20;
      const ffw = gfw / 4 - 25;
      const ffh = gfh - 40;
      // Gold frame
      ctx.strokeStyle = '#c0a040';
      ctx.lineWidth = 3;
      ctx.strokeRect(ffx, ffy, ffw, ffh);
      // Inner mat
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ffx + 4, ffy + 4, ffw - 8, ffh - 8);
      // Procedural pixel art inside
      const artCellSize = 4;
      const artCols = Math.floor((ffw - 12) / artCellSize);
      const artRows = Math.floor((ffh - 12) / artCellSize);
      for (let ay = 0; ay < artRows; ay++) {
        for (let ax = 0; ax < artCols; ax++) {
          // Mirrored pattern for symmetry
          const mx = ax < artCols / 2 ? ax : artCols - 1 - ax;
          const pattern = (mx * 3 + ay * 7 + f * 31) % 16;
          if (pattern < 8) {
            const artHue = (f * 90 + mx * 10 + ay * 5) % 360;
            ctx.fillStyle = `hsl(${artHue},${50 + pattern * 5}%,${30 + pattern * 5}%)`;
            ctx.fillRect(ffx + 6 + ax * artCellSize, ffy + 6 + ay * artCellSize, artCellSize, artCellSize);
          }
        }
      }
    }
  }

  // --- Featured Rooms ---
  const featured = find('featured_rooms');
  if (featured) {
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(featured.x, featured.y, featured.w || 250, featured.h || 200);
    ctx.strokeStyle = '#c0a040';
    ctx.lineWidth = 3;
    ctx.strokeRect(featured.x, featured.y, featured.w || 250, featured.h || 200);
    // "FEATURED" label
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('FEATURED ROOMS', featured.x + 20, featured.y + 16);
    // Mini room previews
    for (let r = 0; r < 3; r++) {
      const rx = featured.x + 15 + r * 75;
      const ry = featured.y + 30;
      const rw2 = 60, rh2 = 50;
      ctx.fillStyle = ['#4a2020', '#204a20', '#20204a'][r];
      ctx.fillRect(rx, ry, rw2, rh2);
      ctx.strokeStyle = '#6a6a7a';
      ctx.strokeRect(rx, ry, rw2, rh2);
      // Mini furniture
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(rx + 5, ry + rh2 - 15, 20, 12);
      ctx.fillRect(rx + 35, ry + 10, 12, 12);
    }
  }

  // --- Community Wall ---
  const cw = find('community_wall');
  if (cw) {
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(cw.x, cw.y, cw.w || 200, cw.h || 200);
    ctx.strokeStyle = '#6a6a7a';
    ctx.lineWidth = 2;
    ctx.strokeRect(cw.x, cw.y, cw.w || 200, cw.h || 200);
    // Graffiti-style scrawls
    const colors = ['#ff4466', '#44ff88', '#4488ff', '#ffaa44', '#ff44ff'];
    for (let g = 0; g < 6; g++) {
      ctx.strokeStyle = colors[g % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      const gx2 = cw.x + 10 + (g * 31) % ((cw.w || 200) - 40);
      const gy2 = cw.y + 15 + (g * 47) % ((cw.h || 200) - 40);
      ctx.moveTo(gx2, gy2);
      ctx.lineTo(gx2 + 20 + (g * 3) % 15, gy2 + Math.sin(g) * 10);
      ctx.lineTo(gx2 + 30, gy2 + 10 + (g % 3) * 5);
      ctx.stroke();
    }
  }

  // --- Benches scattered ---
  const benchPositions = [
    [600, 600], [1000, 600], [1300, 400], [1700, 700],
    [2200, 600], [2500, 500], [400, 1000], [1600, 1100]
  ];
  benchPositions.forEach(([bx, by]) => {
    // Bench seat
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(bx, by, 50, 10);
    // Legs
    ctx.fillRect(bx + 5, by + 10, 5, 12);
    ctx.fillRect(bx + 40, by + 10, 5, 12);
    // Back
    ctx.fillRect(bx, by - 20, 50, 5);
    ctx.fillRect(bx + 3, by - 20, 3, 20);
    ctx.fillRect(bx + 44, by - 20, 3, 20);
  });
}


// Floor 8: Room Exhibition — 1600×1000
function renderFloor8() {
  const FW = 1600, FH = 1000;
  const t = S.time;
  const objs = getObjects();
  const find = id => objs.find(o => o.id === id);

  // --- Clean white/grey gallery background ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, FH);
  bgGrad.addColorStop(0, '#f5f5f8');
  bgGrad.addColorStop(0.5, '#eeeef2');
  bgGrad.addColorStop(1, '#e0e0e5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, FW, FH);

  // --- Subtle floor tile pattern ---
  ctx.strokeStyle = 'rgba(180,180,190,0.3)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < FW; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FH);
    ctx.stroke();
  }
  for (let y = 0; y < FH; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FW, y);
    ctx.stroke();
  }

  // --- Wall line at top ---
  ctx.fillStyle = '#d8d8de';
  ctx.fillRect(0, 0, FW, 100);
  ctx.strokeStyle = '#c0c0c8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.lineTo(FW, 100);
  ctx.stroke();

  // --- Gallery spotlights (on ceiling) ---
  for (let sl = 0; sl < 8; sl++) {
    const slx = 100 + sl * 190;
    // Spotlight fixture
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(slx - 6, 95, 12, 8);
    // Light cone
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.015 + sl * 0.8) * 0.01;
    const coneGrad = ctx.createLinearGradient(slx, 103, slx, 500);
    coneGrad.addColorStop(0, 'rgba(255,255,240,1)');
    coneGrad.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(slx - 4, 103);
    ctx.lineTo(slx - 80, 500);
    ctx.lineTo(slx + 80, 500);
    ctx.lineTo(slx + 4, 103);
    ctx.fill();
    ctx.restore();
  }

  // --- Elevator ---
  const elev = find('elevator');
  if (elev) {
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    ctx.strokeStyle = '#9898a0';
    ctx.lineWidth = 2;
    ctx.strokeRect(elev.x, elev.y, elev.w || 60, elev.h || 80);
    const ew = (elev.w || 60) / 2;
    ctx.strokeStyle = '#b0b0b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(elev.x + ew, elev.y + 4);
    ctx.lineTo(elev.x + ew, elev.y + (elev.h || 80) - 4);
    ctx.stroke();
    // Arrow
    ctx.fillStyle = '#7a7a8a';
    const ay = elev.y + 12 + Math.sin(t * 0.04) * 3;
    ctx.beginPath();
    ctx.moveTo(elev.x + ew, ay);
    ctx.lineTo(elev.x + ew - 5, ay + 6);
    ctx.lineTo(elev.x + ew + 5, ay + 6);
    ctx.fill();
  }

  // --- Showcase cases (4 glass cases with miniature rooms) ---
  const showcaseData = [
    { colors: ['#5a2020', '#8a5040'], furniture: [[15, 30, 35, 12], [60, 15, 15, 20], [40, 50, 25, 8]] },
    { colors: ['#204a30', '#40805a'], furniture: [[10, 25, 30, 14], [55, 40, 18, 15], [20, 55, 40, 10]] },
    { colors: ['#202050', '#405080'], furniture: [[20, 20, 25, 15], [60, 10, 20, 25], [10, 50, 50, 10]] },
    { colors: ['#4a3020', '#806050'], furniture: [[5, 15, 40, 12], [55, 30, 20, 20], [30, 55, 35, 8]] }
  ];
  for (let s = 1; s <= 4; s++) {
    const sc = find('showcase_' + s);
    if (!sc) continue;
    const sx = sc.x, sy = sc.y, sw = sc.w || 250, sh = sc.h || 200;
    const data = showcaseData[s - 1];

    // Pedestal base
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(sx - 5, sy + sh, sw + 10, 12);
    ctx.fillStyle = '#b8b8c0';
    ctx.fillRect(sx, sy + sh + 2, sw, 8);

    // Miniature room inside
    ctx.fillStyle = data.colors[0];
    ctx.fillRect(sx + 10, sy + 20, sw - 20, sh - 30);
    // Floor
    ctx.fillStyle = data.colors[1];
    ctx.fillRect(sx + 10, sy + sh - 30, sw - 20, 20);
    // Tiny furniture
    data.furniture.forEach(([fx, fy, fw, fh], i) => {
      ctx.fillStyle = ['#8a6a4a', '#6a8a6a', '#4a6a8a'][i];
      ctx.fillRect(sx + 10 + fx, sy + 20 + fy, fw, fh);
    });
    // Tiny window
    ctx.fillStyle = '#6080b0';
    ctx.fillRect(sx + sw / 2 - 12, sy + 28, 24, 18);
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + sw / 2 - 12, sy + 28, 24, 18);
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, sy + 28);
    ctx.lineTo(sx + sw / 2, sy + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2 - 12, sy + 37);
    ctx.lineTo(sx + sw / 2 + 12, sy + 37);
    ctx.stroke();

    // Glass walls (transparent with highlight)
    ctx.strokeStyle = 'rgba(150,170,200,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 4, sy + 4, sw - 8, sh - 8);
    // Glass highlight lines
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 8);
    ctx.lineTo(sx + 8, sy + sh - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 14, sy + 8);
    ctx.lineTo(sx + 14, sy + sh * 0.4);
    ctx.stroke();
    // Glass reflection shimmer
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.02 + s) * 0.02;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);
    ctx.restore();

    // Name plate
    ctx.fillStyle = '#e0d8c0';
    ctx.fillRect(sx + sw / 2 - 30, sy + sh + 2, 60, 8);
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '6px monospace';
    ctx.fillText(`Room ${s}`, sx + sw / 2 - 14, sy + sh + 9);
  }

  // --- Blueprint Wall ---
  const bp = find('blueprint_wall');
  if (bp) {
    const bx = bp.x, by = bp.y, bw = bp.w || 300, bh = bp.h || 250;
    // Blue background
    ctx.fillStyle = '#1a3a6a';
    ctx.fillRect(bx, by, bw, bh);
    // Frame
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    // Grid
    ctx.strokeStyle = 'rgba(100,150,220,0.2)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < bw; gx += 15) {
      ctx.beginPath();
      ctx.moveTo(bx + gx, by);
      ctx.lineTo(bx + gx, by + bh);
      ctx.stroke();
    }
    for (let gy = 0; gy < bh; gy += 15) {
      ctx.beginPath();
      ctx.moveTo(bx, by + gy);
      ctx.lineTo(bx + bw, by + gy);
      ctx.stroke();
    }
    // Architectural line drawings (white)
    ctx.strokeStyle = 'rgba(200,220,255,0.7)';
    ctx.lineWidth = 1.5;
    // Room outline
    ctx.strokeRect(bx + 40, by + 40, 120, 80);
    ctx.strokeRect(bx + 160, by + 50, 80, 70);
    // Door arcs
    ctx.beginPath();
    ctx.arc(bx + 160, by + 100, 20, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx + 40, by + 80, 15, 0, Math.PI / 2);
    ctx.stroke();
    // Dimension lines
    ctx.strokeStyle = 'rgba(200,220,255,0.4)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(bx + 40, by + 130);
    ctx.lineTo(bx + 160, by + 130);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 30, by + 40);
    ctx.lineTo(bx + 30, by + 120);
    ctx.stroke();
    ctx.setLineDash([]);
    // Second floor plan
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 40, by + 150, 200, 60);
    ctx.beginPath();
    ctx.moveTo(bx + 120, by + 150);
    ctx.lineTo(bx + 120, by + 210);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 180, by + 150);
    ctx.lineTo(bx + 180, by + 210);
    ctx.stroke();
    // Dimension text
    ctx.fillStyle = 'rgba(200,220,255,0.5)';
    ctx.font = '7px monospace';
    ctx.fillText('12m', bx + 90, by + 142);
    ctx.fillText('8m', bx + 18, by + 82);
  }

  // --- Material Samples ---
  const ms = find('material_samples');
  if (ms) {
    const msx = ms.x, msy = ms.y, msw = ms.w || 200, msh = ms.h || 200;
    ctx.fillStyle = '#e8e8ec';
    ctx.fillRect(msx, msy, msw, msh);
    ctx.strokeStyle = '#b0b0b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(msx, msy, msw, msh);
    // 13 material swatches (in grid)
    const themes = [
      ['#f0d8b0', 'Wood'], ['#8a8a9a', 'Stone'], ['#d04040', 'Ruby'],
      ['#40a040', 'Forest'], ['#4060c0', 'Ocean'], ['#d0a020', 'Gold'],
      ['#404040', 'Dark'], ['#e0e0e0', 'Light'], ['#c060a0', 'Rose'],
      ['#60c0c0', 'Teal'], ['#a06020', 'Earth'], ['#6020a0', 'Mystic'],
      ['#f08030', 'Ember']
    ];
    const cols = 4, swW = (msw - 20) / cols, swH = 32;
    themes.forEach((th, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx2 = msx + 8 + col * swW;
      const ty2 = msy + 10 + row * (swH + 14);
      // Swatch
      ctx.fillStyle = th[0];
      ctx.fillRect(tx2, ty2, swW - 6, swH);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx2, ty2, swW - 6, swH);
      // Label
      ctx.fillStyle = '#4a4a4a';
      ctx.font = '6px monospace';
      ctx.fillText(th[1], tx2 + 2, ty2 + swH + 9);
    });
  }

  // --- Room of the Day ---
  const rod = find('room_of_day');
  if (rod) {
    const rx = rod.x, ry = rod.y, rw = rod.w || 350, rh = rod.h || 300;

    // Spotlight beam from above
    ctx.save();
    ctx.globalAlpha = 0.06 + Math.sin(t * 0.015) * 0.02;
    const spotGrad = ctx.createLinearGradient(rx + rw / 2, 100, rx + rw / 2, ry + rh);
    spotGrad.addColorStop(0, 'rgba(255,255,220,1)');
    spotGrad.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.moveTo(rx + rw / 2 - 10, 100);
    ctx.lineTo(rx - 20, ry + rh);
    ctx.lineTo(rx + rw + 20, ry + rh);
    ctx.lineTo(rx + rw / 2 + 10, 100);
    ctx.fill();
    ctx.restore();

    // Golden frame
    ctx.strokeStyle = '#c0a030';
    ctx.lineWidth = 5;
    ctx.strokeRect(rx - 3, ry - 3, rw + 6, rh + 6);
    // Ornamental corners
    const cornerSize = 15;
    [[rx - 3, ry - 3], [rx + rw - cornerSize + 3, ry - 3],
     [rx - 3, ry + rh - cornerSize + 3], [rx + rw - cornerSize + 3, ry + rh - cornerSize + 3]
    ].forEach(([cx2, cy2]) => {
      ctx.fillStyle = '#d4b440';
      ctx.fillRect(cx2, cy2, cornerSize, cornerSize);
      ctx.fillStyle = '#c0a030';
      ctx.fillRect(cx2 + 3, cy2 + 3, cornerSize - 6, cornerSize - 6);
    });

    // Room preview inside
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(rx + 8, ry + 8, rw - 16, rh - 16);
    // Room floor
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(rx + 8, ry + rh * 0.6, rw - 16, rh * 0.4 - 16);
    // Floor planks
    ctx.strokeStyle = 'rgba(40,30,20,0.2)';
    ctx.lineWidth = 0.5;
    for (let p = 0; p < 10; p++) {
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry + rh * 0.6 + p * ((rh * 0.4 - 16) / 10));
      ctx.lineTo(rx + rw - 8, ry + rh * 0.6 + p * ((rh * 0.4 - 16) / 10));
      ctx.stroke();
    }
    // Furniture
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(rx + 30, ry + rh * 0.6 - 25, 60, 25);
    ctx.fillStyle = '#4a6a8a';
    ctx.fillRect(rx + 120, ry + rh * 0.6 - 30, 40, 30);
    ctx.fillStyle = '#8a4a4a';
    ctx.fillRect(rx + 200, ry + rh * 0.6 - 20, 80, 20);
    // Window
    ctx.fillStyle = '#6080b0';
    ctx.fillRect(rx + rw / 2 - 25, ry + 25, 50, 40);
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + rw / 2 - 25, ry + 25, 50, 40);
    ctx.beginPath();
    ctx.moveTo(rx + rw / 2, ry + 25);
    ctx.lineTo(rx + rw / 2, ry + 65);
    ctx.stroke();
    // Decorative elements
    ctx.fillStyle = '#40aa60';
    ctx.beginPath();
    ctx.arc(rx + 50, ry + rh * 0.6 - 35, 8, 0, Math.PI * 2);
    ctx.fill();
    // Lamp
    ctx.fillStyle = '#d0a040';
    ctx.fillRect(rx + rw - 50, ry + rh * 0.6 - 50, 6, 50);
    ctx.fillStyle = '#ffe080';
    ctx.beginPath();
    ctx.moveTo(rx + rw - 62, ry + rh * 0.6 - 50);
    ctx.lineTo(rx + rw - 47, ry + rh * 0.6 - 65);
    ctx.lineTo(rx + rw - 32, ry + rh * 0.6 - 50);
    ctx.fill();
    // Glow from lamp
    const lampGlow = ctx.createRadialGradient(rx + rw - 47, ry + rh * 0.6 - 55, 2, rx + rw - 47, ry + rh * 0.6 - 55, 40);
    lampGlow.addColorStop(0, 'rgba(255,230,150,0.15)');
    lampGlow.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(rx + rw - 90, ry + rh * 0.6 - 95, 86, 80);

    // "Room of the Day" label
    ctx.fillStyle = '#e0d8c0';
    ctx.fillRect(rx + rw / 2 - 50, ry + rh + 5, 100, 16);
    ctx.fillStyle = '#4a3a20';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROOM OF THE DAY', rx + rw / 2, ry + rh + 15);
    ctx.textAlign = 'left';
    // Star rating
    ctx.fillStyle = '#d4a020';
    for (let star = 0; star < 5; star++) {
      const stx = rx + rw / 2 - 25 + star * 12;
      const sty = ry + rh + 22;
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const a = p * Math.PI * 2 / 5 - Math.PI / 2;
        const r2 = p % 2 === 0 ? 5 : 2;
        const method = p === 0 ? 'moveTo' : 'lineTo';
        ctx[method](stx + Math.cos(a) * r2, sty + Math.sin(a) * r2);
      }
      ctx.fill();
    }
  }

  // --- Editor Portal ---
  const ep = find('editor_portal');
  if (ep) {
    const epx = ep.x + (ep.w || 150) / 2;
    const epy = ep.y + (ep.h || 200) / 2;
    const epw = ep.w || 150, eph = ep.h || 200;

    // Archway structure
    ctx.fillStyle = '#c0c0c8';
    ctx.fillRect(ep.x, epy, 12, eph / 2);
    ctx.fillRect(ep.x + epw - 12, epy, 12, eph / 2);
    // Arch top
    ctx.beginPath();
    ctx.arc(epx, epy, epw / 2, Math.PI, 0);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#c0c0c8';
    ctx.stroke();

    // Portal interior glow
    const portalGrad = ctx.createRadialGradient(epx, epy, 5, epx, epy, epw / 2 - 10);
    portalGrad.addColorStop(0, 'rgba(100,200,255,0.5)');
    portalGrad.addColorStop(0.5, 'rgba(60,140,220,0.3)');
    portalGrad.addColorStop(1, 'rgba(40,80,180,0.1)');
    ctx.fillStyle = portalGrad;
    // Fill arch shape
    ctx.beginPath();
    ctx.arc(epx, epy, epw / 2 - 10, Math.PI, 0);
    ctx.lineTo(ep.x + epw - 10, ep.y + eph);
    ctx.lineTo(ep.x + 10, ep.y + eph);
    ctx.fill();

    // Particles flowing inward
    for (let p = 0; p < 15; p++) {
      const angle = (p / 15) * Math.PI * 2 + t * 0.03;
      const maxDist = epw / 2 + 20;
      const dist = maxDist - ((t * 0.5 + p * 11) % maxDist);
      const ppx = epx + Math.cos(angle) * dist;
      const ppy = epy + Math.sin(angle) * dist * 0.7;
      const pAlpha = dist / maxDist * 0.6;
      ctx.fillStyle = `rgba(100,200,255,${pAlpha})`;
      ctx.beginPath();
      ctx.arc(ppx, ppy, 1.5 + dist / maxDist * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner shimmer
    ctx.save();
    ctx.globalAlpha = 0.1 + Math.sin(t * 0.03) * 0.05;
    ctx.fillStyle = 'rgba(150,220,255,1)';
    ctx.beginPath();
    ctx.arc(epx, epy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // "EDITOR" text
    ctx.fillStyle = 'rgba(100,200,255,0.7)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EDITOR', epx, ep.y + eph + 15);
    ctx.textAlign = 'left';
  }

  // --- Inspiration Board ---
  const ib = find('inspiration_board');
  if (ib) {
    const ibx = ib.x, iby = ib.y, ibw = ib.w || 200, ibh = ib.h || 200;
    // Cork board
    ctx.fillStyle = '#c0a060';
    ctx.fillRect(ibx, iby, ibw, ibh);
    ctx.strokeStyle = '#6a5030';
    ctx.lineWidth = 3;
    ctx.strokeRect(ibx, iby, ibw, ibh);
    // Mood images (small colored rectangles representing photos)
    const moodImages = [
      [10, 10, 55, 45, '#4a7a9a'], [75, 10, 50, 40, '#9a6a4a'],
      [135, 15, 50, 50, '#6a9a5a'], [10, 65, 45, 55, '#9a4a6a'],
      [65, 60, 60, 45, '#8a8a4a'], [135, 75, 50, 40, '#5a5a9a'],
      [15, 130, 70, 50, '#7a6a5a'], [100, 125, 60, 55, '#5a8a7a']
    ];
    moodImages.forEach(([mx, my, mw, mh, mc]) => {
      const rot = Math.sin(mx * 0.1 + my * 0.2) * 0.08;
      ctx.save();
      ctx.translate(ibx + mx + mw / 2, iby + my + mh / 2);
      ctx.rotate(rot);
      // White border (polaroid style)
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(-mw / 2 - 3, -mh / 2 - 3, mw + 6, mh + 10);
      // Image
      ctx.fillStyle = mc;
      ctx.fillRect(-mw / 2, -mh / 2, mw, mh);
      // Abstract content
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-mw / 2 + 5, -mh / 2 + 5, mw / 3, mh / 3);
      ctx.restore();
    });
    // Pins
    moodImages.forEach(([mx, my]) => {
      ctx.fillStyle = '#dd3333';
      ctx.beginPath();
      ctx.arc(ibx + mx + 10, iby + my + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // --- Tools Display ---
  const td = find('tools_display');
  if (td) {
    const tdx = td.x, tdy = td.y, tdw = td.w || 200, tdh = td.h || 100;
    // Display table
    ctx.fillStyle = '#d8d8e0';
    ctx.fillRect(tdx, tdy, tdw, tdh);
    ctx.strokeStyle = '#b0b0b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tdx, tdy, tdw, tdh);
    // Tools
    // Ruler
    ctx.fillStyle = '#d0b060';
    ctx.fillRect(tdx + 15, tdy + 15, 80, 8);
    ctx.strokeStyle = '#a08040';
    ctx.lineWidth = 0.5;
    for (let tick = 0; tick < 16; tick++) {
      ctx.beginPath();
      ctx.moveTo(tdx + 15 + tick * 5, tdy + 15);
      ctx.lineTo(tdx + 15 + tick * 5, tdy + 15 + (tick % 5 === 0 ? 8 : 4));
      ctx.stroke();
    }
    // Pencil
    ctx.fillStyle = '#e0c040';
    ctx.fillRect(tdx + 15, tdy + 35, 50, 5);
    ctx.fillStyle = '#f0d8a0';
    ctx.fillRect(tdx + 65, tdy + 35, 10, 5);
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(tdx + 15, tdy + 37.5);
    ctx.lineTo(tdx + 8, tdy + 37.5);
    ctx.lineTo(tdx + 15, tdy + 35);
    ctx.fill();
    // Color wheel
    const cwx = tdx + 140, cwy = tdy + 50, cwr = 25;
    for (let a = 0; a < 12; a++) {
      const startA = (a / 12) * Math.PI * 2;
      const endA = ((a + 1) / 12) * Math.PI * 2;
      ctx.fillStyle = `hsl(${a * 30},70%,50%)`;
      ctx.beginPath();
      ctx.moveTo(cwx, cwy);
      ctx.arc(cwx, cwy, cwr, startA, endA);
      ctx.fill();
    }
    ctx.fillStyle = '#e8e8ec';
    ctx.beginPath();
    ctx.arc(cwx, cwy, cwr * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Compass tool
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tdx + 110, tdy + 15);
    ctx.lineTo(tdx + 100, tdy + 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tdx + 110, tdy + 15);
    ctx.lineTo(tdx + 120, tdy + 50);
    ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(tdx + 110, tdy + 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
