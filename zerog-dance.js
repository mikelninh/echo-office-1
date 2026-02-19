// zerog-dance.js — Zero-G Dancefloor for The Underground (Floor 10)
// Loaded after main scripts. Hooks into window.renderFloor10.
// ═══════════════════════════════════════════════════════════════════

(function ZeroGDance() {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────
  const MAX_PARTICLES = 60;
  const FRICTION = 0.98;
  const THRUST = 0.18;
  const WALL_BOUNCE_LOSS = 0.8; // keep 80% velocity on bounce
  const FLOOR_W = 2400;
  const FLOOR_H = 1800;
  const TRAIL_FRAMES = 3;

  // ─── Music Phases ───────────────────────────────────────────────
  const MUSIC_PHASES = [
    { name: 'buildup',   duration: 8000,  gravity: 0,    energy: 0.3, emoji: '🎵', label: 'BUILDUP...' },
    { name: 'drop',      duration: 4000,  gravity: 1.5,  energy: 1.0, emoji: '💥', label: 'DROP!'      },
    { name: 'groove',    duration: 12000, gravity: 0.3,  energy: 0.7, emoji: '🌊', label: 'GROOVE'     },
    { name: 'breakdown', duration: 6000,  gravity: -0.2, energy: 0.2, emoji: '✨', label: 'BREAKDOWN'  },
    { name: 'buildup2',  duration: 10000, gravity: 0,    energy: 0.5, emoji: '🎵', label: 'BUILDUP...' },
    { name: 'megadrop',  duration: 6000,  gravity: 2.0,  energy: 1.0, emoji: '🔥', label: 'MEGA DROP!' },
    { name: 'ambient',   duration: 8000,  gravity: 0,    energy: 0.1, emoji: '🌌', label: 'AMBIENT'    },
  ];

  // ─── Phase Colors ────────────────────────────────────────────────
  const PHASE_COLORS = {
    buildup:   { primary: '#7b2fff', edge: '#9b4fff', floor: '#3a0066' },
    drop:      { primary: '#ff3300', edge: '#ff6600', floor: '#660000' },
    groove:    { primary: '#ff6ec7', edge: '#ff44aa', floor: '#440033' },
    breakdown: { primary: '#00eeff', edge: '#88ffff', floor: '#003344' },
    buildup2:  { primary: '#9b4fff', edge: '#bb66ff', floor: '#330066' },
    megadrop:  { primary: '#ff0044', edge: '#ff4488', floor: '#440011' },
    ambient:   { primary: '#4444ff', edge: '#6666ff', floor: '#000033' },
  };

  // ─── ZeroG State ─────────────────────────────────────────────────
  const ZG = {
    active: false,
    // Physics
    vx: 0,
    vy: 0,
    spinAngle: 0,
    spinVel: 0,
    // Gravity (set by music phase, interpolated)
    currentGravity: 0,
    targetGravity: 0,
    // Music phase
    phaseIndex: 0,
    phaseStartTime: 0,
    phaseElapsed: 0,
    beatPhase: 0,
    // Screen effects
    screenShakeZG: 0,
    glitchTimer: 0,
    glitchActive: false,
    flashAlpha: 0,
    flashColor: '#ffffff',
    edgePulse: 0,
    // Particles
    particles: [],
    stars: [],
    // Trail (afterimage)
    trail: [],
    trailTimer: 0,
    // Floor crack effect
    cracks: [],
    // Ground hit
    lastGroundHit: false,
    // Toggle button element
    btnEl: null,
  };

  // ─── Helpers ─────────────────────────────────────────────────────
  function safeS() {
    return (typeof S !== 'undefined') ? S : null;
  }
  function safeCtx() {
    return (typeof ctx !== 'undefined') ? ctx : null;
  }
  function safeW() { return (typeof W !== 'undefined') ? W : 800; }
  function safeH() { return (typeof H !== 'undefined') ? H : 600; }
  function nowMs() { return performance.now(); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function randRange(a, b) { return a + Math.random() * (b - a); }

  function glitchChar() {
    const chars = '!@#$%^&*<>?/\\|█▓▒░╬╪═║╗╝╚╔';
    return chars[Math.random() * chars.length | 0];
  }

  // ─── Init Stars ──────────────────────────────────────────────────
  function initStars() {
    ZG.stars = [];
    for (let i = 0; i < 120; i++) {
      ZG.stars.push({
        x: Math.random() * FLOOR_W,
        y: Math.random() * FLOOR_H,
        r: randRange(0.5, 2.5),
        twinkle: Math.random() * Math.PI * 2,
        speed: randRange(0.5, 2.0),
      });
    }
  }

  // ─── Particles ───────────────────────────────────────────────────
  function addParticle(x, y, vx, vy, color, size, life, glow) {
    if (ZG.particles.length >= MAX_PARTICLES) return;
    ZG.particles.push({ x, y, vx, vy, color, size, life, maxLife: life, glow: !!glow });
  }

  function spawnImpactBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = randRange(1.5, 5);
      addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color,
        randRange(2, 5), randRange(15, 30), true);
    }
  }

  function spawnEnergyOrbs(phase, count) {
    const col = (PHASE_COLORS[phase] || PHASE_COLORS.ambient).primary;
    for (let i = 0; i < count; i++) {
      addParticle(
        randRange(20, FLOOR_W - 20),
        randRange(20, FLOOR_H - 20),
        randRange(-1.5, 1.5),
        randRange(-1.5, 1.5),
        col,
        randRange(3, 7),
        randRange(40, 120),
        true,
      );
    }
  }

  function spawnSpiralParticles(cx, cy, phase) {
    const col = (PHASE_COLORS[phase] || PHASE_COLORS.buildup).edge;
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = randRange(80, 250);
      const speed = randRange(1, 3);
      // Spiral inward: velocity toward center
      const dx = cx - (cx + Math.cos(angle) * r);
      const dy = cy - (cy + Math.sin(angle) * r);
      const dist = Math.hypot(dx, dy);
      addParticle(
        cx + Math.cos(angle) * r,
        cy + Math.sin(angle) * r,
        (dx / dist) * speed + Math.sin(angle) * 0.5,
        (dy / dist) * speed + Math.cos(angle) * 0.5,
        col, randRange(2, 4), randRange(30, 60), true,
      );
    }
  }

  function spawnUpwardSparkles(count) {
    for (let i = 0; i < count; i++) {
      addParticle(
        randRange(20, FLOOR_W - 20),
        randRange(FLOOR_H / 2, FLOOR_H - 20),
        randRange(-0.8, 0.8),
        randRange(-3, -0.5),
        '#88ffff', randRange(2, 5), randRange(40, 80), true,
      );
    }
  }

  // ─── Cracks ──────────────────────────────────────────────────────
  function addCrack(x, y) {
    if (ZG.cracks.length > 12) return;
    const segments = [];
    let cx = x, cy = y;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = randRange(10, 35);
      const nx = cx + Math.cos(angle) * len;
      const ny = cy + Math.sin(angle) * len;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx; cy = ny;
    }
    ZG.cracks.push({ segments, life: 120 });
  }

  // ─── Physics Breach / Glitch Effect ─────────────────────────────
  function triggerPhysicsBreach() {
    ZG.glitchActive = true;
    ZG.glitchTimer = 300; // ms
    ZG.screenShakeZG = 8;
    // Pixel scatter — stored as random rect shifts
    ZG._scatterFrames = 4;
  }

  // ─── Music Phase Manager ─────────────────────────────────────────
  const MusicPhase = {
    init() {
      ZG.phaseIndex = 0;
      ZG.phaseStartTime = nowMs();
    },

    update() {
      if (!ZG.active) return;
      const now = nowMs();
      const phase = MUSIC_PHASES[ZG.phaseIndex];
      ZG.phaseElapsed = now - ZG.phaseStartTime;

      // Beat phase (128 BPM = ~469ms per beat)
      ZG.beatPhase = (now % 469) / 469;

      // Phase transition?
      if (ZG.phaseElapsed >= phase.duration) {
        ZG.phaseIndex = (ZG.phaseIndex + 1) % MUSIC_PHASES.length;
        ZG.phaseStartTime = now;
        ZG.phaseElapsed = 0;
        this.onPhaseStart(MUSIC_PHASES[ZG.phaseIndex]);
      }

      // Smoothly interpolate gravity toward target
      ZG.currentGravity += (ZG.targetGravity - ZG.currentGravity) * 0.04;

      // Update target gravity from current phase (blended)
      ZG.targetGravity = phase.gravity;
    },

    onPhaseStart(phase) {
      ZG.targetGravity = phase.gravity;
      const colors = PHASE_COLORS[phase.name] || PHASE_COLORS.ambient;

      if (phase.name === 'drop' || phase.name === 'megadrop') {
        // SLAM! gravity burst
        ZG.currentGravity = phase.gravity; // instant slam
        ZG.screenShakeZG = phase.name === 'megadrop' ? 14 : 10;
        ZG.flashAlpha = 0.9;
        ZG.flashColor = '#ffffff';
        // Impact particles
        for (let i = 0; i < 15; i++) {
          addParticle(
            randRange(0, FLOOR_W), FLOOR_H - 20,
            randRange(-3, 3), randRange(-8, -2),
            colors.primary, randRange(3, 8), randRange(20, 45), true,
          );
        }
        // Cracks
        for (let c = 0; c < 3; c++) {
          addCrack(randRange(200, FLOOR_W - 200), FLOOR_H - 15);
        }
      } else if (phase.name === 'breakdown') {
        ZG.flashAlpha = 0.4;
        ZG.flashColor = '#00eeff';
        spawnUpwardSparkles(20);
      } else if (phase.name === 'buildup' || phase.name === 'buildup2') {
        spawnEnergyOrbs(phase.name, 8);
      } else if (phase.name === 'ambient') {
        spawnEnergyOrbs('ambient', 5);
      } else if (phase.name === 'groove') {
        ZG.flashAlpha = 0.3;
        ZG.flashColor = colors.primary;
      }
    },

    currentPhase() {
      return MUSIC_PHASES[ZG.phaseIndex];
    },

    nextPhase() {
      return MUSIC_PHASES[(ZG.phaseIndex + 1) % MUSIC_PHASES.length];
    },

    timeUntilNext() {
      const phase = MUSIC_PHASES[ZG.phaseIndex];
      return Math.max(0, phase.duration - ZG.phaseElapsed);
    },
  };

  // ─── Physics System ───────────────────────────────────────────────
  const Physics = {
    update(dt) {
      if (!ZG.active) return;
      const s = safeS();
      if (!s || !s.visitor) return;
      const v = s.visitor;

      // Apply gravity (pixels/s²)
      const grav = ZG.currentGravity * 180; // scale factor
      ZG.vy += grav * dt;

      // Apply friction
      ZG.vx *= Math.pow(FRICTION, dt * 60);
      ZG.vy *= Math.pow(FRICTION, dt * 60);

      // Spin — grows with speed
      const speed = Math.hypot(ZG.vx, ZG.vy);
      ZG.spinVel += (speed * 0.001 - ZG.spinVel) * 0.05;
      ZG.spinVel *= 0.97;
      ZG.spinAngle += ZG.spinVel;

      // Apply thrust from keys
      if (s.keys) {
        if (s.keys.up)    ZG.vy -= THRUST;
        if (s.keys.down)  ZG.vy += THRUST;
        if (s.keys.left)  ZG.vx -= THRUST;
        if (s.keys.right) ZG.vx += THRUST;
      }

      // Clamp max velocity
      const maxV = 6;
      const vMag = Math.hypot(ZG.vx, ZG.vy);
      if (vMag > maxV) {
        ZG.vx = (ZG.vx / vMag) * maxV;
        ZG.vy = (ZG.vy / vMag) * maxV;
      }

      // Move visitor
      v.x += ZG.vx;
      v.y += ZG.vy;

      // Spark trail if fast
      if (speed > 2.5 && Math.random() < 0.5) {
        const phase = MusicPhase.currentPhase();
        const col = (PHASE_COLORS[phase.name] || PHASE_COLORS.ambient).primary;
        addParticle(
          v.x + randRange(-5, 5), v.y + randRange(-5, 5),
          -ZG.vx * 0.3 + randRange(-0.5, 0.5),
          -ZG.vy * 0.3 + randRange(-0.5, 0.5),
          col, randRange(2, 4), randRange(8, 16), true,
        );
      }

      // Wall bounce — elastic with 20% velocity loss
      const hitRadius = 14;
      const hitColor = '#ff6ec7';
      let hitWall = false;

      if (v.x < hitRadius) {
        v.x = hitRadius;
        ZG.vx = Math.abs(ZG.vx) * WALL_BOUNCE_LOSS;
        spawnImpactBurst(v.x, v.y, hitColor, 4);
        hitWall = true;
      } else if (v.x > FLOOR_W - hitRadius) {
        v.x = FLOOR_W - hitRadius;
        ZG.vx = -Math.abs(ZG.vx) * WALL_BOUNCE_LOSS;
        spawnImpactBurst(v.x, v.y, hitColor, 4);
        hitWall = true;
      }

      if (v.y < hitRadius) {
        v.y = hitRadius;
        ZG.vy = Math.abs(ZG.vy) * WALL_BOUNCE_LOSS;
        spawnImpactBurst(v.x, v.y, hitColor, 4);
        hitWall = true;
      } else if (v.y > FLOOR_H - hitRadius) {
        v.y = FLOOR_H - hitRadius;
        ZG.vy = -Math.abs(ZG.vy) * WALL_BOUNCE_LOSS;
        if (!ZG.lastGroundHit && Math.abs(ZG.vy) < 0.5) {
          // Ground landing burst
          spawnImpactBurst(v.x, v.y, '#ff6600', 8);
        }
        hitWall = true;
      }
      ZG.lastGroundHit = (v.y >= FLOOR_H - hitRadius * 2);

      if (hitWall) {
        ZG.screenShakeZG = Math.max(ZG.screenShakeZG, Math.min(4, speed * 0.6));
      }

      // Trail snapshots (every 2 frames ~)
      ZG.trailTimer++;
      if (ZG.trailTimer % 2 === 0) {
        ZG.trail.push({ x: v.x, y: v.y, angle: ZG.spinAngle, alpha: 0.5 });
        if (ZG.trail.length > TRAIL_FRAMES) ZG.trail.shift();
      }
    },
  };

  // ─── Particle Update ─────────────────────────────────────────────
  function updateParticles(dt) {
    const grav = ZG.currentGravity * 80; // gentler on particles
    for (let i = ZG.particles.length - 1; i >= 0; i--) {
      const p = ZG.particles[i];
      p.vy += grav * dt;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      // Bounce particles off floor/ceiling
      if (p.y > FLOOR_H - 5) { p.y = FLOOR_H - 5; p.vy *= -0.6; }
      if (p.y < 5) { p.y = 5; p.vy *= -0.5; }
      if (p.life <= 0) ZG.particles.splice(i, 1);
    }
  }

  function updateCracks(dt) {
    for (let i = ZG.cracks.length - 1; i >= 0; i--) {
      ZG.cracks[i].life -= dt * 60;
      if (ZG.cracks[i].life <= 0) ZG.cracks.splice(i, 1);
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────

  function renderStarfield(context, phase) {
    const t = typeof S !== 'undefined' ? S.time : 0;
    const phaseName = phase ? phase.name : 'ambient';
    const isAmbient = phaseName === 'ambient' || phaseName === 'breakdown';
    const starAlpha = isAmbient ? 0.6 : 0.2;

    context.save();
    for (const star of ZG.stars) {
      const twinkle = 0.4 + Math.sin(star.twinkle + t * star.speed) * 0.3;
      context.globalAlpha = starAlpha * twinkle;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.restore();
  }

  function renderNeonGrid(context, phase, t) {
    if (!phase) return;
    const colors = PHASE_COLORS[phase.name] || PHASE_COLORS.ambient;
    const beat = Math.sin(ZG.beatPhase * Math.PI * 2);
    const energy = phase.energy;

    // Glass floor (semi-transparent neon grid)
    const gridSize = 60;
    const gridAlpha = 0.12 + energy * 0.15 + beat * 0.06;

    context.save();
    context.strokeStyle = colors.primary;
    context.lineWidth = 1;
    context.shadowColor = colors.primary;
    context.shadowBlur = 4 + energy * 8;
    context.globalAlpha = gridAlpha;

    // Horizontal lines
    for (let y = 0; y <= FLOOR_H; y += gridSize) {
      const pulse = 0.5 + Math.sin(t * 2 + y * 0.01) * 0.3;
      context.globalAlpha = gridAlpha * pulse;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FLOOR_W, y);
      context.stroke();
    }
    // Vertical lines
    for (let x = 0; x <= FLOOR_W; x += gridSize) {
      const pulse = 0.5 + Math.sin(t * 2 + x * 0.01) * 0.3;
      context.globalAlpha = gridAlpha * pulse;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FLOOR_H);
      context.stroke();
    }

    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.restore();
  }

  function renderParticles(context) {
    context.save();
    for (const p of ZG.particles) {
      const ratio = p.life / p.maxLife;
      context.globalAlpha = ratio * 0.85;
      if (p.glow) {
        context.shadowColor = p.color;
        context.shadowBlur = 6 + p.size;
      }
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
      context.fill();
      if (p.glow) context.shadowBlur = 0;
    }
    context.globalAlpha = 1;
    context.restore();
  }

  function renderCracks(context) {
    if (ZG.cracks.length === 0) return;
    context.save();
    for (const crack of ZG.cracks) {
      const alpha = Math.min(1, crack.life / 30);
      context.globalAlpha = alpha * 0.7;
      context.strokeStyle = '#ff6600';
      context.shadowColor = '#ff6600';
      context.shadowBlur = 4;
      context.lineWidth = 1.5;
      for (const seg of crack.segments) {
        context.beginPath();
        context.moveTo(seg.x1, seg.y1);
        context.lineTo(seg.x2, seg.y2);
        context.stroke();
      }
    }
    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.restore();
  }

  function renderTrail(context, phase) {
    if (ZG.trail.length === 0) return;
    const colors = PHASE_COLORS[(phase && phase.name) || 'ambient'];
    const col = colors.primary;
    context.save();
    for (let i = 0; i < ZG.trail.length; i++) {
      const t = ZG.trail[i];
      const ratio = (i + 1) / ZG.trail.length;
      context.globalAlpha = ratio * 0.35;
      context.fillStyle = col;
      context.shadowColor = col;
      context.shadowBlur = 5;
      // Draw a small ghost body
      context.save();
      context.translate(t.x, t.y);
      context.rotate(t.angle);
      context.fillRect(-6, -10, 12, 16);
      context.restore();
    }
    context.shadowBlur = 0;
    context.globalAlpha = 1;
    context.restore();
  }

  function renderDJBooth(context, phase, cameraX) {
    if (!phase) return;
    const djX = FLOOR_W / 2 - 80;
    const djY = 60;
    const colors = PHASE_COLORS[phase.name] || PHASE_COLORS.ambient;
    const beat = Math.sin(ZG.beatPhase * Math.PI * 2);
    const timeUntil = Math.ceil(MusicPhase.timeUntilNext() / 1000);

    context.save();

    // Booth body
    context.fillStyle = '#0d0d1a';
    context.strokeStyle = colors.primary;
    context.lineWidth = 2;
    context.shadowColor = colors.primary;
    context.shadowBlur = 8 + beat * 4;
    context.fillRect(djX, djY, 160, 55);
    context.strokeRect(djX, djY, 160, 55);
    context.shadowBlur = 0;

    // Phase display
    context.fillStyle = colors.primary;
    context.font = 'bold 11px monospace';
    context.textAlign = 'center';
    context.fillText(`${phase.emoji} ${phase.label}`, djX + 80, djY + 18);

    // BPM
    context.fillStyle = '#aaaaaa';
    context.font = '9px monospace';
    context.fillText('BPM: 128', djX + 40, djY + 34);

    // Countdown
    context.fillStyle = '#ffcc00';
    context.fillText(`NEXT: ${timeUntil}s`, djX + 120, djY + 34);

    // Waveform (decorative)
    context.strokeStyle = colors.primary;
    context.globalAlpha = 0.5 + beat * 0.3;
    context.lineWidth = 1.5;
    context.beginPath();
    for (let i = 0; i <= 160; i += 4) {
      const y = djY + 47 + Math.sin((i / 8) + ZG.beatPhase * Math.PI * 8) * 4;
      i === 0 ? context.moveTo(djX + i, y) : context.lineTo(djX + i, y);
    }
    context.stroke();

    context.globalAlpha = 1;
    context.textAlign = 'left';
    context.restore();
  }

  function renderScreenEdgeEffects(context, phase) {
    if (!phase) return;
    const W = safeW(), H = safeH();
    const colors = PHASE_COLORS[phase.name] || PHASE_COLORS.ambient;
    const beat = Math.sin(ZG.beatPhase * Math.PI * 2);

    context.save();

    if (phase.name === 'buildup' || phase.name === 'buildup2') {
      // Pulsing energy edges
      const prog = ZG.phaseElapsed / (MUSIC_PHASES[ZG.phaseIndex].duration || 1);
      const intensity = 0.15 + prog * 0.4 + beat * 0.1;
      const grad = context.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, colors.edge.replace('#', 'rgba(').replace(/rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/, (m, r, g, b) =>
        `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)}`
      ) + `,${intensity})`);
      context.fillStyle = grad;
      context.fillRect(0, 0, W, H);

    } else if (phase.name === 'drop' || phase.name === 'megadrop') {
      // Flash white then red edge
      if (ZG.flashAlpha > 0) {
        context.fillStyle = ZG.flashColor;
        context.globalAlpha = ZG.flashAlpha;
        context.fillRect(0, 0, W, H);
        ZG.flashAlpha = Math.max(0, ZG.flashAlpha - 0.04);
      }
      // Red vignette
      const vgGrad = context.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H);
      vgGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgGrad.addColorStop(1, `rgba(200,20,0,${0.25 + beat * 0.1})`);
      context.globalAlpha = 1;
      context.fillStyle = vgGrad;
      context.fillRect(0, 0, W, H);

    } else if (phase.name === 'breakdown') {
      // Aurora shimmer on edges
      const auroraColors = ['#00eeff', '#ff00ff', '#00ff88', '#8844ff'];
      const t = typeof S !== 'undefined' ? S.time : 0;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + t * 0.3;
        const col = auroraColors[i];
        context.globalAlpha = 0.08 + Math.sin(t * 1.5 + i) * 0.04;
        context.fillStyle = col;
        // Draw colored arcs along edges
        context.fillRect(0, 0, 8, H);
        context.fillRect(W - 8, 0, 8, H);
        context.fillRect(0, 0, W, 6);
        context.fillRect(0, H - 6, W, 6);
      }
      // Dreamy flash
      if (ZG.flashAlpha > 0) {
        context.globalAlpha = ZG.flashAlpha;
        context.fillStyle = ZG.flashColor;
        context.fillRect(0, 0, W, H);
        ZG.flashAlpha = Math.max(0, ZG.flashAlpha - 0.02);
      }

    } else if (phase.name === 'groove') {
      // Rhythmic pulse flash
      if (ZG.flashAlpha > 0) {
        context.globalAlpha = ZG.flashAlpha * 0.4;
        context.fillStyle = ZG.flashColor;
        context.fillRect(0, 0, W, H);
        ZG.flashAlpha = Math.max(0, ZG.flashAlpha - 0.03);
      }
    } else if (phase.name === 'ambient') {
      // Stars through the floor - barely visible edge glow
      context.globalAlpha = 0.08;
      context.fillStyle = '#4444ff';
      context.fillRect(0, 0, W, H);
    }

    context.globalAlpha = 1;
    context.restore();
  }

  function renderGlitchEffect(context) {
    if (!ZG.glitchActive) return;
    const W = safeW(), H = safeH();
    context.save();

    // Chromatic aberration: draw R/B channels offset
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = 0.3;
    context.fillStyle = 'rgba(255,0,0,0.15)';
    context.fillRect(2, 0, W, H);
    context.fillStyle = 'rgba(0,0,255,0.15)';
    context.fillRect(-2, 0, W, H);

    // Pixel scatter: random rect shifts
    if (ZG._scatterFrames > 0) {
      ZG._scatterFrames--;
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 0.15;
      for (let i = 0; i < 6; i++) {
        const sx = Math.random() * W;
        const sy = Math.random() * H;
        const sw = randRange(20, 100);
        const sh = randRange(5, 30);
        const ox = randRange(-15, 15);
        const oy = randRange(-5, 5);
        context.drawImage(context.canvas, sx, sy, sw, sh, sx + ox, sy + oy, sw, sh);
      }
    }

    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;

    // Glitch text overlay
    const rawText = 'PHYSICS ENGINE: OVERRIDE';
    let glitchedText = '';
    for (let i = 0; i < rawText.length; i++) {
      glitchedText += Math.random() < 0.15 ? glitchChar() : rawText[i];
    }
    context.font = 'bold 16px monospace';
    context.textAlign = 'center';
    context.fillStyle = '#ff3300';
    context.shadowColor = '#ff0000';
    context.shadowBlur = 10;
    context.fillText('⚠️ ' + glitchedText, W / 2, H / 2 - 10);
    context.fillStyle = '#ff9900';
    context.shadowColor = '#ff9900';
    context.font = '11px monospace';
    context.fillText('>>> ZERO-G MODE ENGAGED <<<', W / 2, H / 2 + 10);

    context.shadowBlur = 0;
    context.textAlign = 'left';
    context.restore();
  }

  function renderScreenShake(context) {
    // Applied as a translation in main render hook
    if (ZG.screenShakeZG > 0) {
      ZG.screenShakeZG *= 0.88;
      if (ZG.screenShakeZG < 0.3) ZG.screenShakeZG = 0;
    }
  }

  // ─── Main Render Hook (Floor 10 overlay) ─────────────────────────
  function renderZeroGOverlay() {
    if (!ZG.active) return;
    const context = safeCtx();
    if (!context) return;
    const t = typeof S !== 'undefined' ? S.time : 0;
    const phase = MusicPhase.currentPhase();

    context.save();

    // Screen shake offset
    if (ZG.screenShakeZG > 0) {
      const sx = (Math.random() - 0.5) * ZG.screenShakeZG * 2;
      const sy = (Math.random() - 0.5) * ZG.screenShakeZG * 2;
      context.translate(sx, sy);
    }

    // 1. Starfield behind everything (glass floor effect)
    renderStarfield(context, phase);

    // 2. Neon grid
    renderNeonGrid(context, phase, t);

    // 3. Floor cracks
    renderCracks(context);

    // 4. Energy particles
    renderParticles(context);

    // 5. DJ Booth (in world-space, hooked before camera-restore)
    renderDJBooth(context, phase, 0);

    context.restore();
  }

  function renderZeroGHUD() {
    if (!ZG.active) return;
    const context = safeCtx();
    if (!context) return;
    const W = safeW(), H = safeH();
    const phase = MusicPhase.currentPhase();
    const colors = PHASE_COLORS[(phase && phase.name) || 'ambient'];
    const beat = Math.sin(ZG.beatPhase * Math.PI * 2);

    // Screen edge effects (in screen-space, after camera)
    renderScreenEdgeEffects(context, phase);

    // Glitch overlay
    if (ZG.glitchActive) {
      renderGlitchEffect(context);
      ZG.glitchTimer -= 16;
      if (ZG.glitchTimer <= 0) {
        ZG.glitchActive = false;
        ZG.glitchTimer = 0;
      }
    }

    // Phase HUD label (top-left during active)
    context.save();
    context.font = 'bold 10px monospace';
    context.fillStyle = colors.primary;
    context.shadowColor = colors.primary;
    context.shadowBlur = 6;
    context.fillText(`🪩 ZERO-G ON  |  ${phase ? phase.emoji + ' ' + phase.label : ''}`, 16, H - 30);
    context.fillText('GRAVITY: ' + ZG.currentGravity.toFixed(2) + 'g', 16, H - 18);
    context.shadowBlur = 0;
    context.restore();
  }

  // ─── Visitor Render Override ─────────────────────────────────────
  // We wrap window.renderVisitor to draw with spin + motion blur in zero-G
  function wrapVisitorRender() {
    const _origRenderVisitor = window.renderVisitor;
    if (!_origRenderVisitor) return;

    window.renderVisitor = function (context) {
      if (!ZG.active) {
        _origRenderVisitor(context);
        return;
      }
      const s = safeS();
      if (!s || !s.visitor) {
        _origRenderVisitor(context);
        return;
      }
      const v = s.visitor;
      const phase = MusicPhase.currentPhase();

      // Draw afterimage trail first
      renderTrail(context, phase);

      // Draw the actual visitor with rotation
      context.save();
      context.translate(v.x, v.y);
      context.rotate(ZG.spinAngle);
      context.translate(-v.x, -v.y);

      // Motion blur during drops: stretch in velocity direction
      const isDrop = phase && (phase.name === 'drop' || phase.name === 'megadrop');
      const speed = Math.hypot(ZG.vx, ZG.vy);
      if (isDrop && speed > 1.5) {
        const angle = Math.atan2(ZG.vy, ZG.vx);
        const stretchFactor = 1 + speed * 0.08;
        context.translate(v.x, v.y);
        context.rotate(angle);
        context.scale(stretchFactor, 1 / stretchFactor);
        context.rotate(-angle);
        context.translate(-v.x, -v.y);
      }

      // Glow aura
      const col = (PHASE_COLORS[(phase && phase.name) || 'ambient']).primary;
      context.shadowColor = col;
      context.shadowBlur = 12 + Math.sin(ZG.beatPhase * Math.PI * 2) * 4;

      _origRenderVisitor(context);

      context.shadowBlur = 0;
      context.restore();
    };
  }

  // ─── Movement Override ────────────────────────────────────────────
  // Disable normal position updates when zero-G is active
  // Achieved by intercepting updateVisitor via a flag
  function hookUpdateVisitor() {
    const _origUpdateVisitor = window.updateVisitor || (typeof updateVisitor === 'function' ? updateVisitor : null);
    if (!_origUpdateVisitor) return;

    window.updateVisitor = function (dt) {
      if (ZG.active && typeof S !== 'undefined' && S.floor === 10) {
        // In zero-G: only decay timers, skip normal position update
        // (Physics.update handles the position)
        const s = S;
        if (s._dashCooldown > 0) s._dashCooldown -= dt;
        if (s.visitor) s.visitor.moving = Math.hypot(ZG.vx, ZG.vy) > 0.3;
        return;
      }
      _origUpdateVisitor(dt);
    };
  }

  // ─── Render Floor 10 Hook ─────────────────────────────────────────
  function hookRenderFloor10() {
    const _origRF10 = window.renderFloor10;

    window.renderFloor10 = function () {
      // Call original renderer first
      if (_origRF10) _origRF10();

      // Overlay zero-G layer (in world-space)
      renderZeroGOverlay();
    };
  }

  // ─── Game Loop Hook ───────────────────────────────────────────────
  // Tap into the update cycle
  let _lastUpdateTime = nowMs();

  function hookUpdate() {
    const _origUpdate = window.update || (typeof update === 'function' ? update : null);
    if (!_origUpdate) {
      // Fallback: use rAF
      function zgLoop() {
        const now = nowMs();
        const dt = Math.min((now - _lastUpdateTime) / 1000, 0.05);
        _lastUpdateTime = now;
        ZGUpdate(dt);
        requestAnimationFrame(zgLoop);
      }
      requestAnimationFrame(zgLoop);
      return;
    }

    window.update = function (dt) {
      _origUpdate(dt);
      if (typeof S !== 'undefined' && S.floor === 10) {
        ZGUpdate(dt);
      }
    };
  }

  function ZGUpdate(dt) {
    if (!ZG.active) return;
    MusicPhase.update();
    Physics.update(dt);
    updateParticles(dt);
    updateCracks(dt);
    renderScreenShake();

    // Periodic particle spawning based on phase
    const phase = MusicPhase.currentPhase();
    if (phase && Math.random() < 0.03 * phase.energy) {
      if (phase.name === 'breakdown') {
        spawnUpwardSparkles(2);
      } else if (phase.name === 'buildup' || phase.name === 'buildup2') {
        const s = safeS();
        if (s && s.visitor) {
          spawnSpiralParticles(s.visitor.x, s.visitor.y, phase.name);
        }
      } else {
        const col = (PHASE_COLORS[phase.name] || PHASE_COLORS.ambient).primary;
        addParticle(
          randRange(20, FLOOR_W - 20),
          randRange(20, FLOOR_H - 20),
          randRange(-1, 1), randRange(-1, 1),
          col, randRange(2, 5), randRange(20, 60), true,
        );
      }
    }

    // Beat drop particle burst
    if (ZG.beatPhase < 0.02 && phase && (phase.name === 'groove' || phase.name === 'megadrop')) {
      const s = safeS();
      if (s && s.visitor) {
        addParticle(
          s.visitor.x, s.visitor.y,
          randRange(-2, 2), randRange(-3, -1),
          (PHASE_COLORS[phase.name] || PHASE_COLORS.ambient).primary,
          randRange(3, 6), randRange(20, 40), true,
        );
      }
    }
  }

  // ─── Post-render HUD hook ─────────────────────────────────────────
  // Tap into the render function to draw HUD on top (screen-space)
  function hookRender() {
    const _origRender = window.render || (typeof render === 'function' ? render : null);
    if (!_origRender) return;

    window.render = function () {
      _origRender();
      if (typeof S !== 'undefined' && S.floor === 10) {
        renderZeroGHUD();
      }
    };
  }

  // ─── Toggle Button UI ─────────────────────────────────────────────
  function createToggleButton() {
    if (ZG.btnEl) return;

    const btn = document.createElement('div');
    btn.id = 'zerog-toggle-btn';
    btn.textContent = '🪩 ZERO-G MODE';
    btn.title = 'Toggle Zero-G Dancefloor';
    btn.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:70px',
      'z-index:200',
      'display:none',
      'background:rgba(20,0,40,0.88)',
      'color:#ff6ec7',
      'border:2px solid #9b4fff',
      'border-radius:10px',
      'padding:6px 14px',
      'font:bold 12px monospace',
      'cursor:pointer',
      'letter-spacing:1px',
      'text-shadow:0 0 8px #9b4fff',
      'box-shadow:0 0 12px #9b4fff55',
      'transition:all 0.2s',
      'user-select:none',
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(40,0,80,0.95)';
      btn.style.boxShadow = '0 0 20px #9b4fff88';
    });
    btn.addEventListener('mouseleave', () => {
      if (!ZG.active) {
        btn.style.background = 'rgba(20,0,40,0.88)';
        btn.style.boxShadow = '0 0 12px #9b4fff55';
      }
    });

    btn.addEventListener('click', toggleZeroG);
    document.body.appendChild(btn);
    ZG.btnEl = btn;

    // Show/hide based on floor
    setInterval(() => {
      if (!btn) return;
      const onF10 = typeof S !== 'undefined' && S.floor === 10;
      btn.style.display = onF10 ? 'block' : 'none';
    }, 300);
  }

  function toggleZeroG() {
    ZG.active = !ZG.active;

    if (ZG.active) {
      // Entering zero-G
      ZG.vx = 0;
      ZG.vy = 0;
      ZG.spinAngle = 0;
      ZG.spinVel = 0;
      ZG.currentGravity = 0;
      ZG.targetGravity = 0;
      ZG.particles = [];
      ZG.trail = [];
      ZG.cracks = [];
      ZG.flashAlpha = 0;
      ZG.screenShakeZG = 0;
      MusicPhase.init();
      initStars();
      triggerPhysicsBreach();
      spawnEnergyOrbs('buildup', 15);

      if (ZG.btnEl) {
        ZG.btnEl.textContent = '🪩 EXIT ZERO-G';
        ZG.btnEl.style.background = 'rgba(60,0,120,0.95)';
        ZG.btnEl.style.borderColor = '#ff6ec7';
        ZG.btnEl.style.color = '#ffffff';
        ZG.btnEl.style.boxShadow = '0 0 20px #ff6ec7aa';
      }

      if (typeof showNotification === 'function') {
        showNotification('🪩 ZERO-G MODE ENGAGED — Float free!');
      }
    } else {
      // Exiting zero-G
      ZG.vx = 0;
      ZG.vy = 0;
      ZG.spinAngle = 0;
      ZG.particles = [];
      ZG.trail = [];
      ZG.cracks = [];
      ZG.glitchActive = false;
      triggerPhysicsBreach();

      if (ZG.btnEl) {
        ZG.btnEl.textContent = '🪩 ZERO-G MODE';
        ZG.btnEl.style.background = 'rgba(20,0,40,0.88)';
        ZG.btnEl.style.borderColor = '#9b4fff';
        ZG.btnEl.style.color = '#ff6ec7';
        ZG.btnEl.style.boxShadow = '0 0 12px #9b4fff55';
      }

      if (typeof showNotification === 'function') {
        showNotification('🪩 Zero-G OFF — Gravity restored.');
      }
    }
  }

  // ─── Q/E Rotation Keys ────────────────────────────────────────────
  function hookRotationKeys() {
    document.addEventListener('keydown', function (e) {
      if (!ZG.active) return;
      if (typeof S === 'undefined' || S.floor !== 10) return;
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      )) return;

      if (e.key === 'q' || e.key === 'Q') {
        ZG.spinVel -= 0.04;
        e.stopPropagation();
      }
      if (e.key === 'e' || e.key === 'E') {
        ZG.spinVel += 0.04;
        e.stopPropagation();
      }
    }, true); // capture phase to intercept before other handlers
  }

  // ─── Mobile awareness ─────────────────────────────────────────────
  function isMobile() {
    return typeof S !== 'undefined' && S._isMobile;
  }

  // Reduce particle cap on mobile
  function getParticleCap() {
    return isMobile() ? 25 : MAX_PARTICLES;
  }

  // Patch addParticle to respect mobile cap
  const _origAddParticle = addParticle;

  // ─── Init ─────────────────────────────────────────────────────────
  function init() {
    // Wait for the game to be ready
    const checkReady = setInterval(() => {
      if (typeof S === 'undefined' || typeof ctx === 'undefined') return;
      clearInterval(checkReady);

      hookRenderFloor10();
      hookUpdateVisitor();
      hookUpdate();
      hookRender();
      wrapVisitorRender();
      createToggleButton();
      hookRotationKeys();
      initStars();

      console.log('🪩 ZeroGDance: System online. Hit F10 and activate ZERO-G MODE!');
    }, 200);
  }

  // ─── Expose public API ────────────────────────────────────────────
  window.ZeroGDance = {
    toggle: toggleZeroG,
    active: () => ZG.active,
    phase: () => MusicPhase.currentPhase(),
    state: ZG,
  };

  init();

})();
