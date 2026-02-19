// planets.js — Planetary Time Rooms for Echo Station
// Floors 30–35: Earth, Venus, Mars, Jupiter, Mercury, Pluto
// Loaded after main scripts. Does NOT modify index.html.
// ─────────────────────────────────────────────────────────────────────────────
(function PlanetaryRooms() {
  'use strict';

  // ─── Wait for game to be ready ────────────────────────────────────────────
  function waitReady(fn, attempts) {
    attempts = attempts || 0;
    if (attempts > 300) { console.warn('[PlanetaryRooms] gave up waiting'); return; }
    if (typeof window.changeFloor === 'function' && window.S && window.S.floor !== undefined &&
        typeof window.ctx !== 'undefined' && typeof window.W !== 'undefined') {
      fn();
    } else {
      setTimeout(function () { waitReady(fn, attempts + 1); }, 100);
    }
  }

  // ─── Planet Definitions ───────────────────────────────────────────────────
  var PLANETS = {
    30: {
      id: 30,
      name: 'Earth',
      icon: '🌍',
      subtitle: 'Home',
      dayRatio: 1,            // 1 Earth day = 1 Earth day
      gravityMult: 1.0,
      description: 'A day here = 24 hours (exactly like you)',
      tagline: 'This is your rhythm. Remember it.',
      bgTop: '#87ceeb',
      bgBottom: '#228b22',
    },
    31: {
      id: 31,
      name: 'Venus',
      icon: '🌋',
      subtitle: 'The Eternal Sunrise',
      dayRatio: 243,          // 1 Venus day = 243 Earth days
      gravityMult: 0.9,
      description: 'A day here = 243 Earth days',
      tagline: 'Beautiful. Crushing. Eternal.',
      bgTop: '#c8752a',
      bgBottom: '#8b3a00',
    },
    32: {
      id: 32,
      name: 'Mars',
      icon: '🔴',
      subtitle: 'Almost Home',
      dayRatio: 1.0274,       // 1 Mars sol = 24h 37min
      gravityMult: 0.38,
      description: 'A day here = 24 hours 37 minutes',
      tagline: 'Everything looks right. But something\'s wrong.',
      bgTop: '#c1440e',
      bgBottom: '#8b3a1a',
    },
    33: {
      id: 33,
      name: 'Jupiter',
      icon: '⚡',
      subtitle: 'The Fast World',
      dayRatio: 0.4125,       // 9.9 hours
      gravityMult: 2.5,
      description: 'A day here = 9.9 Earth hours',
      tagline: 'Time races. You can barely keep up.',
      bgTop: '#c8a050',
      bgBottom: '#8b5a20',
    },
    34: {
      id: 34,
      name: 'Mercury',
      icon: '🌑',
      subtitle: 'The Split World',
      dayRatio: 59,           // 1 Mercury day = 59 Earth days
      gravityMult: 0.38,
      description: 'A day here = 59 Earth days',
      tagline: 'Scorching and frozen. No in-between.',
      bgTop: '#888888',
      bgBottom: '#444444',
    },
    35: {
      id: 35,
      name: 'Pluto',
      icon: '💙',
      subtitle: 'The Long Wait',
      dayRatio: 6.387,        // 1 Pluto day = 6.387 Earth days
      gravityMult: 0.063,
      description: 'A day here = 6.4 Earth days. A year = 248 Earth years.',
      tagline: 'You won\'t live to see a Pluto year.',
      bgTop: '#050518',
      bgBottom: '#0a0a28',
    },
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  var _portalUIVisible = false;
  var _floorEnterTime = {}; // floor → timestamp when player entered
  var _lastGravityFloor = null;
  var _origMoveDistance = null;
  var _particles = []; // planet room particles (max 40)
  var _shimmerOffset = 0;
  var _jupiterCycleT = 0;
  var _lightningTimer = 0;
  var _dustDevils = [];
  var _starField = null; // cached starfield for Pluto

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function S() { return window.S; }
  function canvas() { return window.ctx; }
  function W() { return window.W || 800; }
  function H() { return window.H || 600; }
  function T() { return S().time || 0; }
  function now() { return Date.now(); }

  function planetFloor(f) {
    return f >= 30 && f <= 35;
  }

  function currentPlanet() {
    return PLANETS[S().floor] || null;
  }

  function formatDuration(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    s = s % 60;
    m = m % 60;
    if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function formatPlanetDuration(ms, planet) {
    // ms in Earth time → scaled planet time
    var planetMs = ms * planet.dayRatio;
    var s = Math.floor(planetMs / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    var d = Math.floor(h / 24);
    s = s % 60; m = m % 60; h = h % 24;
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
    if (m > 0) return m + 'm ' + s + 's';
    if (s > 0) return s + 's';
    var frac = (planetMs / 1000).toFixed(4);
    return frac + 's';
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function rgba(r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // ─── Particle System ──────────────────────────────────────────────────────
  function spawnParticle(p) {
    if (_particles.length >= 40) _particles.shift();
    _particles.push(p);
  }

  function updateParticles() {
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p = _particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.gravity) p.vy += p.gravity;
      if (p.fade !== false) p.alpha = (p.alpha || 1) * 0.97;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  function drawParticles() {
    var cx = canvas();
    _particles.forEach(function (p) {
      cx.save();
      cx.globalAlpha = clamp(p.alpha !== undefined ? p.alpha : p.life / (p.maxLife || 60), 0, 1);
      cx.fillStyle = p.color || '#ffffff';
      var sz = p.size || 2;
      if (p.shape === 'star') {
        cx.beginPath();
        cx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        cx.fill();
      } else if (p.shape === 'flake') {
        cx.strokeStyle = p.color || '#ffffff';
        cx.lineWidth = 1;
        for (var a = 0; a < 3; a++) {
          cx.save();
          cx.translate(p.x, p.y);
          cx.rotate(a * Math.PI / 3);
          cx.beginPath();
          cx.moveTo(0, -sz);
          cx.lineTo(0, sz);
          cx.stroke();
          cx.restore();
        }
      } else {
        cx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      cx.restore();
    });
  }

  // ─── Clock System ─────────────────────────────────────────────────────────
  function formatClockTime(d) {
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  }

  function getPlanetLocalTime(planet) {
    // Planet time scaled from a fixed epoch (midnight of today in Earth time)
    var earthNow = Date.now();
    var dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    var msIntoDay = earthNow - dayStart.getTime();
    // Scale: planet rotates dayRatio times faster than Earth's counter (or slower)
    var planetMsIntoDay = msIntoDay * planet.dayRatio;
    // Wrap to 24h for display if ratio >= 1
    var msPerDay = 24 * 60 * 60 * 1000;
    planetMsIntoDay = planetMsIntoDay % msPerDay;
    var d = new Date(dayStart.getTime() + planetMsIntoDay);
    return d;
  }

  function getPlanetDaysElapsed(planet) {
    // Days of local time elapsed since midnight Earth time
    var dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    var msElapsed = Date.now() - dayStart.getTime();
    return (msElapsed * planet.dayRatio) / (24 * 60 * 60 * 1000);
  }

  function drawDualClocks(planet, labelRight) {
    var cx = canvas();
    var w = W(), h = H();
    var earthNow = new Date();

    // ── Earth clock (top-left) ───────────────────────────────────────────
    cx.save();
    cx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(cx, 10, 10, 180, 58, 8);
    cx.fill();
    cx.strokeStyle = '#44aaff';
    cx.lineWidth = 1.5;
    roundRect(cx, 10, 10, 180, 58, 8);
    cx.stroke();

    cx.fillStyle = '#88ccff';
    cx.font = 'bold 11px monospace';
    cx.fillText('🌍 EARTH TIME', 18, 26);
    cx.fillStyle = '#ffffff';
    cx.font = 'bold 20px monospace';
    cx.fillText(formatClockTime(earthNow), 18, 50);
    cx.restore();

    // ── Planet clock (top-right) ─────────────────────────────────────────
    var localTime = getPlanetLocalTime(planet);
    var daysElapsed = getPlanetDaysElapsed(planet);

    cx.save();
    cx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(cx, w - 220, 10, 210, 90, 8);
    cx.fill();
    cx.strokeStyle = planet.clockColor || '#ffaa44';
    cx.lineWidth = 1.5;
    roundRect(cx, w - 220, 10, 210, 90, 8);
    cx.stroke();

    var displayLabel = labelRight || (planet.icon + ' ' + planet.name.toUpperCase() + ' TIME');
    cx.fillStyle = planet.clockColor || '#ffaa44';
    cx.font = 'bold 11px monospace';
    cx.fillText(displayLabel, w - 212, 26);

    // Special display for very slow planets
    var localStr;
    if (planet.dayRatio >= 6) {
      var fracDay = daysElapsed;
      var dDay = Math.floor(fracDay);
      var fracH = (fracDay - dDay) * 24;
      var dHour = Math.floor(fracH);
      var fracM = (fracH - dHour) * 60;
      var dMin = fracM.toFixed(3);
      localStr = 'Day ' + dDay + '  ' + String(dHour).padStart(2,'0') + 'h ' + dMin + 'm';
    } else if (planet.id === 33) {
      // Jupiter: racing clock
      var jupT = Date.now();
      var jupSec = Math.floor((jupT / 1000) * planet.dayRatio) % (24 * 3600);
      var jH = Math.floor(jupSec / 3600);
      var jM = Math.floor((jupSec % 3600) / 60);
      var jS = jupSec % 60;
      localStr = String(jH).padStart(2,'0') + ':' + String(jM).padStart(2,'0') + ':' + String(jS).padStart(2,'0');
    } else {
      localStr = formatClockTime(localTime);
    }

    cx.fillStyle = '#ffffff';
    cx.font = 'bold 18px monospace';
    cx.fillText(localStr, w - 212, 50);

    cx.fillStyle = '#aaaaaa';
    cx.font = '10px monospace';
    var ratio = planet.dayRatio >= 1
      ? '1 Earth min = ' + planet.dayRatio.toFixed(2) + ' ' + planet.name + ' min'
      : '1 Earth min = ' + (1 / planet.dayRatio).toFixed(1) + '× faster here';
    cx.fillText(ratio, w - 212, 66);

    // Time-spent counter
    var entered = _floorEnterTime[planet.id] || Date.now();
    var spentMs = Date.now() - entered;
    var spentEarth = formatDuration(spentMs);
    var spentPlanet = formatPlanetDuration(spentMs, planet);
    cx.fillStyle = '#dddddd';
    cx.font = '10px monospace';
    cx.fillText('Here ' + spentEarth + ' = ' + spentPlanet + ' local', w - 212, 82);

    cx.restore();
  }

  function roundRect(cx, x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.lineTo(x + w - r, y);
    cx.arcTo(x + w, y, x + w, y + r, r);
    cx.lineTo(x + w, y + h - r);
    cx.arcTo(x + w, y + h, x + w - r, y + h, r);
    cx.lineTo(x + r, y + h);
    cx.arcTo(x, y + h, x, y + h - r, r);
    cx.lineTo(x, y + r);
    cx.arcTo(x, y, x + r, y, r);
    cx.closePath();
  }

  // ─── Info Panel ───────────────────────────────────────────────────────────
  var INFO_DATA = {
    30: {
      diameter: '12,742 km',
      distance: '149.6M km from Sun',
      composition: 'Nitrogen, oxygen, water',
      funFacts: ['You weigh exactly what you weigh.', 'You could throw a ball ~40m.', 'Your birthday is right on schedule.'],
    },
    31: {
      diameter: '12,104 km',
      distance: '108.2M km from Sun',
      composition: 'CO₂, sulfuric acid clouds',
      funFacts: ['You\'d weigh 90% of your Earth weight.', 'Surface: 465°C. Lead melts here.', 'The sun rises in the WEST. It rotates backwards.', 'You could throw a ball ~36m.'],
    },
    32: {
      diameter: '6,779 km',
      distance: '227.9M km from Sun',
      composition: 'CO₂, iron oxide dust',
      funFacts: ['You\'d weigh just 38% of your Earth weight.', 'You could throw a ball ~100m.', 'The sunset is blue, not red.', 'Your birthday happens every 687 Earth days.'],
    },
    33: {
      diameter: '142,984 km',
      distance: '778.5M km from Sun',
      composition: 'Hydrogen, helium, ammonia',
      funFacts: ['You\'d weigh 2.5× your Earth weight.', 'You could barely lift your own arm.', 'You\'d have ~2.4 birthdays per Earth year.', 'The Great Red Spot storm is older than the USA.'],
    },
    34: {
      diameter: '4,879 km',
      distance: '57.9M km from Sun',
      composition: 'Oxygen, sodium, hydrogen',
      funFacts: ['You\'d weigh 38% of your Earth weight.', 'The day side: 430°C. Night side: −180°C.', 'You could throw a ball ~100m.', 'No atmosphere to speak of. Raw vacuum.'],
    },
    35: {
      diameter: '2,377 km',
      distance: '5.9B km from Sun',
      composition: 'Nitrogen ice, methane',
      funFacts: ['You\'d weigh 6% of your Earth weight.', 'You could jump ~15m into the air.', 'The sun is just a bright star here.', 'You wouldn\'t live to see one Pluto year. Nobody does.'],
    },
  };

  function drawInfoPanel(planet) {
    var cx = canvas();
    var w = W(), h = H();
    var info = INFO_DATA[planet.id];
    if (!info) return;

    var panelW = 180, panelH = 160;
    var px = 10, py = h - panelH - 10;

    cx.save();
    cx.fillStyle = 'rgba(0,0,0,0.7)';
    roundRect(cx, px, py, panelW, panelH, 8);
    cx.fill();
    cx.strokeStyle = planet.clockColor || '#aaaaaa';
    cx.lineWidth = 1;
    roundRect(cx, px, py, panelW, panelH, 8);
    cx.stroke();

    cx.fillStyle = planet.clockColor || '#ffffff';
    cx.font = 'bold 11px monospace';
    cx.fillText(planet.icon + ' ' + planet.name.toUpperCase(), px + 8, py + 16);

    cx.fillStyle = '#aaaacc';
    cx.font = '9px monospace';
    cx.fillText('⬤ ' + info.diameter, px + 8, py + 30);
    cx.fillText('☀ ' + info.distance, px + 8, py + 42);
    cx.fillText('✦ ' + info.composition, px + 8, py + 54);

    cx.fillStyle = '#ffee88';
    cx.font = 'bold 9px monospace';
    cx.fillText('IF YOU LIVED HERE...', px + 8, py + 70);

    cx.fillStyle = '#dddddd';
    cx.font = '9px monospace';
    var yOff = py + 82;
    info.funFacts.slice(0, 4).forEach(function (f) {
      // Word wrap crude
      if (f.length > 26) {
        cx.fillText('• ' + f.slice(0, 24) + '…', px + 8, yOff);
      } else {
        cx.fillText('• ' + f, px + 8, yOff);
      }
      yOff += 12;
    });
    cx.restore();
  }

  // ─── Tagline Banner ───────────────────────────────────────────────────────
  function drawTagline(planet) {
    var cx = canvas();
    var w = W(), h = H();
    var text = planet.tagline;
    cx.save();
    cx.font = 'italic 13px serif';
    cx.fillStyle = 'rgba(255,255,255,0.6)';
    cx.textAlign = 'center';
    cx.fillText(text, w / 2, h - 16);
    cx.textAlign = 'left';
    cx.restore();
  }

  // ─── Floor 30: EARTH ──────────────────────────────────────────────────────
  function renderFloor30() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    // Sky gradient
    var skyGrad = cx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, '#4a90d9');
    skyGrad.addColorStop(1, '#87ceeb');
    cx.fillStyle = skyGrad;
    cx.fillRect(0, 0, w, h * 0.6);

    // Clouds
    cx.fillStyle = 'rgba(255,255,255,0.85)';
    [{ x: 0.15, y: 0.12, s: 1.2 }, { x: 0.45, y: 0.08, s: 0.9 }, { x: 0.72, y: 0.15, s: 1.4 }].forEach(function (c) {
      var cx2 = w * c.x + Math.sin(t * 0.1 + c.x * 10) * 30;
      drawCloud(cx, cx2, h * c.y, 50 * c.s);
    });

    // Hills
    cx.fillStyle = '#4a7a3a';
    cx.beginPath();
    cx.moveTo(0, h * 0.6);
    for (var i = 0; i <= w; i += 4) {
      cx.lineTo(i, h * 0.6 - 60 * Math.sin(i / 200 + 0.5) - 30 * Math.sin(i / 80 + 1));
    }
    cx.lineTo(w, h * 0.6);
    cx.closePath();
    cx.fill();

    // Ground
    var groundGrad = cx.createLinearGradient(0, h * 0.6, 0, h);
    groundGrad.addColorStop(0, '#5a8a4a');
    groundGrad.addColorStop(1, '#3a5a2a');
    cx.fillStyle = groundGrad;
    cx.fillRect(0, h * 0.6, w, h * 0.4);

    // Floor tiles
    cx.fillStyle = 'rgba(0,0,0,0.15)';
    for (var fx = 0; fx < w; fx += 40) {
      cx.fillRect(fx, h * 0.6, 1, h * 0.4);
    }

    // Window frame
    drawWindow(cx, w / 2, h * 0.3, w * 0.65, h * 0.45);

    // Birds
    for (var b = 0; b < 5; b++) {
      var bx = (w * 0.2 + b * w * 0.15 + t * 20 * (b % 2 === 0 ? 1 : 0.7)) % w;
      var by = h * 0.12 + Math.sin(t * 0.5 + b) * 20;
      drawBird(cx, bx, by, 0.7);
    }

    // Ambient leaf particles
    if (Math.random() < 0.05) {
      spawnParticle({ x: Math.random() * w, y: -5, vx: (Math.random() - 0.5) * 1, vy: 0.5 + Math.random(), life: 120, maxLife: 120, color: '#' + ['5a8a3a', '3a6a2a', '7aaa4a'][Math.floor(Math.random() * 3)], size: 3, shape: 'square', alpha: 0.8, fade: true });
    }
    updateParticles();
    drawParticles();

    drawDualClocks(PLANETS[30], '🌍 LOCAL (HOME) TIME');
    drawInfoPanel(PLANETS[30]);
    drawTagline(PLANETS[30]);
    drawReturnPortal();
  }

  function drawCloud(cx, x, y, r) {
    cx.beginPath();
    cx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    cx.arc(x + r * 0.4, y - r * 0.15, r * 0.4, 0, Math.PI * 2);
    cx.arc(x - r * 0.4, y, r * 0.35, 0, Math.PI * 2);
    cx.arc(x + r * 0.15, y + r * 0.1, r * 0.45, 0, Math.PI * 2);
    cx.fill();
  }

  function drawBird(cx, x, y, s) {
    cx.save();
    cx.strokeStyle = '#333333';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(x - 6 * s, y);
    cx.quadraticCurveTo(x - 3 * s, y - 4 * s, x, y);
    cx.quadraticCurveTo(x + 3 * s, y - 4 * s, x + 6 * s, y);
    cx.stroke();
    cx.restore();
  }

  function drawWindow(cx, cx2, cy, ww, wh) {
    var x = cx2 - ww / 2, y = cy - wh / 2;
    cx.save();
    // Frame
    cx.fillStyle = '#8b6914';
    cx.fillRect(x - 10, y - 10, ww + 20, wh + 20);
    // Window sill clip area (already drawn in scene behind)
    cx.fillStyle = '#b08830';
    cx.fillRect(x - 10, y + wh + 2, ww + 20, 8);
    // Inner border
    cx.strokeStyle = '#c8a040';
    cx.lineWidth = 3;
    cx.strokeRect(x, y, ww, wh);
    // Window cross bars
    cx.strokeStyle = '#c8a040';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(cx2, y);
    cx.lineTo(cx2, y + wh);
    cx.moveTo(x, cy);
    cx.lineTo(x + ww, cy);
    cx.stroke();
    cx.restore();
  }

  // ─── Floor 31: VENUS ──────────────────────────────────────────────────────
  function renderFloor31() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    // Oppressive amber atmosphere
    var skyGrad = cx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4a1a00');
    skyGrad.addColorStop(0.3, '#8b3a00');
    skyGrad.addColorStop(0.6, '#c8600a');
    skyGrad.addColorStop(1, '#3a1500');
    cx.fillStyle = skyGrad;
    cx.fillRect(0, 0, w, h);

    // Volcanic surface
    cx.fillStyle = '#2a0d00';
    cx.beginPath();
    cx.moveTo(0, h * 0.7);
    for (var i = 0; i <= w; i += 3) {
      var y2 = h * 0.7 - 40 * Math.sin(i / 120 + 2) - 20 * Math.cos(i / 60 + 1) - 10 * Math.sin(i / 25);
      cx.lineTo(i, y2);
    }
    cx.lineTo(w, h * 0.7);
    cx.lineTo(w, h);
    cx.lineTo(0, h);
    cx.closePath();
    cx.fill();

    // Lava flows
    cx.fillStyle = 'rgba(255,80,0,0.3)';
    for (var lv = 0; lv < 3; lv++) {
      var lx = w * (0.2 + lv * 0.25);
      cx.beginPath();
      cx.ellipse(lx, h * 0.72, 30, 8, 0, 0, Math.PI * 2);
      cx.fill();
    }

    // The barely-moving sun (creeps left since Venus rotates backwards)
    var sunX = w * 0.5 + Math.sin(t * 0.0001) * w * 0.4;  // imperceptibly slow
    var sunY = h * 0.18;
    var sunGrad = cx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sunGrad.addColorStop(0, 'rgba(255,220,100,0.7)');
    sunGrad.addColorStop(0.4, 'rgba(255,120,0,0.3)');
    sunGrad.addColorStop(1, 'rgba(200,60,0,0)');
    cx.fillStyle = sunGrad;
    cx.beginPath();
    cx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    cx.fill();

    // Dense fog layers
    for (var fl = 0; fl < 4; fl++) {
      var fogY = h * (0.2 + fl * 0.12) + Math.sin(t * 0.2 + fl) * 10;
      var fogGrad = cx.createLinearGradient(0, fogY, 0, fogY + 40);
      fogGrad.addColorStop(0, 'rgba(180,80,0,0)');
      fogGrad.addColorStop(0.5, 'rgba(180,80,0,0.18)');
      fogGrad.addColorStop(1, 'rgba(180,80,0,0)');
      cx.fillStyle = fogGrad;
      cx.fillRect(0, fogY, w, 40);
    }

    // Heat shimmer (sinusoidal visual distortion hint via overlay lines)
    cx.save();
    cx.globalAlpha = 0.04;
    for (var si = 0; si < 8; si++) {
      var shimY = h * 0.65 + si * 8;
      cx.fillStyle = '#ff8800';
      cx.fillRect(0, shimY, w, 2);
    }
    cx.restore();

    // Ash particles
    if (Math.random() < 0.4 && _particles.length < 35) {
      spawnParticle({
        x: Math.random() * w,
        y: -5,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.8 + Math.random() * 1.2,
        life: 200,
        maxLife: 200,
        color: ['#4a2a10', '#663322', '#332211'][Math.floor(Math.random() * 3)],
        size: 2 + Math.random() * 2,
        alpha: 0.7,
        fade: true,
      });
    }
    updateParticles();
    drawParticles();

    // Floor
    cx.fillStyle = '#1a0800';
    cx.fillRect(0, h * 0.88, w, h * 0.12);

    drawDualClocks(PLANETS[31], '🌋 VENUS LOCAL TIME');
    PLANETS[31].clockColor = '#ff8833';
    drawInfoPanel(PLANETS[31]);
    drawTagline(PLANETS[31]);
    drawReturnPortal();
  }

  // ─── Floor 32: MARS ───────────────────────────────────────────────────────
  function renderFloor32() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    // Rust sky
    var skyGrad = cx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#c1440e');
    skyGrad.addColorStop(0.6, '#e8703a');
    skyGrad.addColorStop(1, '#f0a060');
    cx.fillStyle = skyGrad;
    cx.fillRect(0, 0, w, h * 0.65);

    // Blue-tinged horizon glow
    var horizonGrad = cx.createLinearGradient(0, h * 0.5, 0, h * 0.65);
    horizonGrad.addColorStop(0, 'rgba(80,120,200,0)');
    horizonGrad.addColorStop(1, 'rgba(80,120,200,0.25)');
    cx.fillStyle = horizonGrad;
    cx.fillRect(0, h * 0.5, w, h * 0.15);

    // Desert terrain
    cx.fillStyle = '#8b3a1a';
    cx.beginPath();
    cx.moveTo(0, h * 0.65);
    for (var i = 0; i <= w; i += 3) {
      cx.lineTo(i, h * 0.65 - 25 * Math.sin(i / 180 + 0.3) - 15 * Math.cos(i / 70));
    }
    cx.lineTo(w, h * 0.65);
    cx.lineTo(w, h);
    cx.lineTo(0, h);
    cx.closePath();
    cx.fill();

    // Rocks
    cx.fillStyle = '#6a2a10';
    [[w * 0.1, h * 0.67], [w * 0.35, h * 0.66], [w * 0.6, h * 0.68], [w * 0.82, h * 0.67]].forEach(function (r) {
      cx.beginPath();
      cx.ellipse(r[0], r[1], 18, 12, 0, 0, Math.PI * 2);
      cx.fill();
    });

    // Smaller Mars sun (60% size)
    var marsT = t * 0.0003;  // very slowly moves across sky
    var sunX = (w * 0.1 + marsT * w * 0.8) % w;
    cx.fillStyle = 'rgba(255,200,100,0.9)';
    cx.beginPath();
    cx.arc(sunX, h * 0.12, 14, 0, Math.PI * 2);
    cx.fill();
    var marsHalo = cx.createRadialGradient(sunX, h * 0.12, 0, sunX, h * 0.12, 40);
    marsHalo.addColorStop(0, 'rgba(255,200,100,0.3)');
    marsHalo.addColorStop(1, 'rgba(255,200,100,0)');
    cx.fillStyle = marsHalo;
    cx.beginPath();
    cx.arc(sunX, h * 0.12, 40, 0, Math.PI * 2);
    cx.fill();

    // Dust devil spawner
    if (Math.random() < 0.002 && _dustDevils.length < 3) {
      _dustDevils.push({ x: -50, y: h * 0.55, size: 20 + Math.random() * 30, speed: 0.8 + Math.random() * 1.2 });
    }
    _dustDevils = _dustDevils.filter(function (d) { return d.x < w + 100; });
    _dustDevils.forEach(function (d) {
      d.x += d.speed;
      // Draw dust devil cone
      cx.save();
      cx.globalAlpha = 0.35;
      cx.fillStyle = '#c8704a';
      cx.beginPath();
      cx.moveTo(d.x, d.y);
      cx.lineTo(d.x - d.size / 2, d.y + d.size * 2);
      cx.lineTo(d.x + d.size / 2, d.y + d.size * 2);
      cx.closePath();
      cx.fill();
      cx.restore();
      // Spawn dust particles
      if (Math.random() < 0.3 && _particles.length < 35) {
        spawnParticle({ x: d.x + (Math.random() - 0.5) * d.size, y: d.y + Math.random() * d.size * 2, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), life: 60, maxLife: 60, color: '#c8704a', size: 2, alpha: 0.5, fade: true });
      }
    });

    // Sand particles
    if (Math.random() < 0.2 && _particles.length < 35) {
      spawnParticle({ x: Math.random() * w, y: h * 0.5 + Math.random() * 100, vx: 1.5 + Math.random(), vy: 0, life: 100, maxLife: 100, color: '#c87040', size: 1.5, alpha: 0.6, fade: true });
    }
    updateParticles();
    drawParticles();

    // Floor
    cx.fillStyle = '#6a2a10';
    cx.fillRect(0, h * 0.88, w, h * 0.12);
    // Floor texture
    cx.fillStyle = 'rgba(0,0,0,0.15)';
    for (var fx = 0; fx < w; fx += 32) {
      cx.fillRect(fx, h * 0.88, 1, h * 0.12);
    }

    PLANETS[32].clockColor = '#ff6633';
    drawDualClocks(PLANETS[32], '🔴 MARS SOL TIME');
    drawInfoPanel(PLANETS[32]);
    drawTagline(PLANETS[32]);
    drawReturnPortal();
  }

  // ─── Floor 33: JUPITER ────────────────────────────────────────────────────
  function renderFloor33() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    _jupiterCycleT += 0.008;  // racing day cycle

    // Day cycle: cycle through golden → amber → dark → golden (every ~80 ticks)
    var dayPhase = (_jupiterCycleT % (Math.PI * 2));
    var dayBrightness = (Math.sin(dayPhase) + 1) / 2; // 0..1

    var skyR = Math.floor(lerp(20, 200, dayBrightness));
    var skyG = Math.floor(lerp(10, 140, dayBrightness));
    var skyB = Math.floor(lerp(5, 20, dayBrightness));

    var skyGrad = cx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, 'rgb(' + skyR + ',' + skyG + ',' + skyB + ')');
    skyGrad.addColorStop(1, 'rgb(' + Math.floor(skyR * 0.7) + ',' + Math.floor(skyG * 0.7) + ',' + Math.floor(skyB * 0.7) + ')');
    cx.fillStyle = skyGrad;
    cx.fillRect(0, 0, w, h * 0.7);

    // Storm bands
    var bandColors = [
      'rgba(200,140,60,0.4)',
      'rgba(160,80,30,0.35)',
      'rgba(220,160,80,0.3)',
      'rgba(140,60,20,0.4)',
    ];
    for (var bi = 0; bi < 4; bi++) {
      var bandY = h * (0.08 + bi * 0.12) + Math.sin(t * 0.3 + bi) * 5;
      cx.fillStyle = bandColors[bi];
      cx.fillRect(0, bandY, w, h * 0.08);
    }

    // Great Red Spot
    cx.save();
    cx.translate(w * 0.65 + Math.sin(t * 0.05) * 20, h * 0.25);
    var grsGrad = cx.createRadialGradient(0, 0, 0, 0, 0, 60);
    grsGrad.addColorStop(0, 'rgba(200,60,20,0.8)');
    grsGrad.addColorStop(0.5, 'rgba(160,40,10,0.5)');
    grsGrad.addColorStop(1, 'rgba(120,30,5,0)');
    cx.fillStyle = grsGrad;
    cx.beginPath();
    cx.ellipse(0, 0, 80, 50, 0, 0, Math.PI * 2);
    cx.fill();
    cx.restore();

    // Lightning
    _lightningTimer--;
    if (_lightningTimer <= 0) {
      _lightningTimer = 8 + Math.floor(Math.random() * 25);
      drawLightning(cx, w, h);
    }

    // Jupiter has no ground floor — you're floating in the cloud layer
    var cloudGrad = cx.createLinearGradient(0, h * 0.7, 0, h);
    cloudGrad.addColorStop(0, 'rgba(180,120,50,0.9)');
    cloudGrad.addColorStop(1, 'rgba(100,60,20,1)');
    cx.fillStyle = cloudGrad;
    cx.fillRect(0, h * 0.7, w, h * 0.3);

    // Cloud wisps
    cx.fillStyle = 'rgba(220,180,80,0.25)';
    for (var ci = 0; ci < 5; ci++) {
      var cx2 = (w * (ci * 0.2) + t * 30 * (ci % 2 === 0 ? 1 : -0.5)) % w;
      cx.beginPath();
      cx.ellipse(cx2, h * 0.68 + ci * 8, 80 + ci * 15, 12, 0, 0, Math.PI * 2);
      cx.fill();
    }

    // Particles: electrical sparks
    if (Math.random() < 0.3 && _particles.length < 35) {
      spawnParticle({ x: Math.random() * w, y: h * (0.1 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 15, maxLife: 15, color: ['#ffffff', '#aaddff', '#ffff88'][Math.floor(Math.random() * 3)], size: 1.5, alpha: 1, fade: true });
    }
    updateParticles();
    drawParticles();

    PLANETS[33].clockColor = '#ffcc44';
    drawDualClocks(PLANETS[33], '⚡ JUPITER TIME');
    drawInfoPanel(PLANETS[33]);
    drawTagline(PLANETS[33]);
    drawReturnPortal();
  }

  function drawLightning(cx, w, h) {
    cx.save();
    cx.strokeStyle = 'rgba(200,220,255,0.85)';
    cx.lineWidth = 1.5;
    cx.shadowColor = '#aaddff';
    cx.shadowBlur = 8;
    var lx = Math.random() * w;
    var ly = h * 0.05;
    cx.beginPath();
    cx.moveTo(lx, ly);
    for (var ls = 0; ls < 6; ls++) {
      lx += (Math.random() - 0.5) * 40;
      ly += 30 + Math.random() * 20;
      cx.lineTo(lx, ly);
    }
    cx.stroke();
    // Flash overlay
    cx.globalAlpha = 0.06;
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, w, h);
    cx.restore();
  }

  // ─── Floor 34: MERCURY ────────────────────────────────────────────────────
  function renderFloor34() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    // Left half: SCORCHING
    var hotGrad = cx.createLinearGradient(0, 0, w / 2, 0);
    hotGrad.addColorStop(0, '#ffffff');
    hotGrad.addColorStop(0.3, '#ffaa00');
    hotGrad.addColorStop(0.7, '#cc4400');
    hotGrad.addColorStop(1, '#440000');
    cx.fillStyle = hotGrad;
    cx.fillRect(0, 0, w / 2, h);

    // Right half: FROZEN
    var coldGrad = cx.createLinearGradient(w / 2, 0, w, 0);
    coldGrad.addColorStop(0, '#000011');
    coldGrad.addColorStop(0.3, '#001133');
    coldGrad.addColorStop(0.7, '#0044aa');
    coldGrad.addColorStop(1, '#88ccff');
    cx.fillStyle = coldGrad;
    cx.fillRect(w / 2, 0, w / 2, h);

    // Terminator line shimmer
    var shimX = w / 2;
    var shimGrad = cx.createLinearGradient(shimX - 20, 0, shimX + 20, 0);
    shimGrad.addColorStop(0, 'rgba(255,100,0,0)');
    shimGrad.addColorStop(0.3, 'rgba(200,100,255,0.5)');
    shimGrad.addColorStop(0.5, 'rgba(255,255,200,' + (0.3 + 0.2 * Math.sin(t * 3)) + ')');
    shimGrad.addColorStop(0.7, 'rgba(100,200,255,0.5)');
    shimGrad.addColorStop(1, 'rgba(100,200,255,0)');
    cx.fillStyle = shimGrad;
    cx.fillRect(shimX - 20, 0, 40, h);

    // Aurora at terminator
    for (var au = 0; au < 5; au++) {
      var auY = h * (au * 0.2) + Math.sin(t * 0.8 + au) * 20;
      var auGrad = cx.createLinearGradient(shimX - 15, auY, shimX + 15, auY + 60);
      auGrad.addColorStop(0, 'rgba(0,255,100,0)');
      auGrad.addColorStop(0.5, 'rgba(0,255,100,0.2)');
      auGrad.addColorStop(1, 'rgba(0,255,100,0)');
      cx.fillStyle = auGrad;
      cx.fillRect(shimX - 15, auY, 30, 60);
    }

    // Hot side surface
    cx.fillStyle = '#440800';
    cx.beginPath();
    cx.moveTo(0, h * 0.75);
    for (var i = 0; i < w / 2; i += 3) {
      cx.lineTo(i, h * 0.75 + Math.sin(i / 50 + t * 0.5) * 10);
    }
    cx.lineTo(w / 2, h * 0.75);
    cx.lineTo(w / 2, h);
    cx.lineTo(0, h);
    cx.closePath();
    cx.fill();

    // Cold side surface
    cx.fillStyle = '#000833';
    cx.beginPath();
    cx.moveTo(w / 2, h * 0.75);
    for (var i2 = w / 2; i2 <= w; i2 += 3) {
      cx.lineTo(i2, h * 0.75 + Math.sin(i2 / 60 + 2) * 8);
    }
    cx.lineTo(w, h * 0.75);
    cx.lineTo(w, h);
    cx.lineTo(w / 2, h);
    cx.closePath();
    cx.fill();

    // Hot side: rising heat particles (go UP)
    if (Math.random() < 0.4 && _particles.length < 30) {
      spawnParticle({ x: Math.random() * (w / 2 - 20), y: h * 0.75, vx: (Math.random() - 0.5) * 1, vy: -1 - Math.random() * 2, life: 80, maxLife: 80, color: ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'][Math.floor(Math.random() * 4)], size: 2, alpha: 0.7, fade: true });
    }

    // Cold side: frost/ice crystals
    if (Math.random() < 0.3 && _particles.length < 35) {
      spawnParticle({ x: w / 2 + Math.random() * (w / 2 - 20), y: Math.random() * h * 0.75, vx: (Math.random() - 0.5) * 0.3, vy: 0.2, life: 200, maxLife: 200, color: ['#aaddff', '#88ccff', '#ffffff'][Math.floor(Math.random() * 3)], size: 2, alpha: 0.6, shape: 'flake', fade: true });
    }

    updateParticles();
    drawParticles();

    // Frost edges on right side
    cx.save();
    cx.globalAlpha = 0.3;
    cx.fillStyle = '#aaddff';
    for (var fe = 0; fe < 8; fe++) {
      var fx2 = w - 5 - fe * 3;
      cx.fillRect(fx2, 0, 3, h);
    }
    cx.restore();

    PLANETS[34].clockColor = '#8899ff';
    drawDualClocks(PLANETS[34], '🌑 MERCURY LOCAL TIME');
    drawInfoPanel(PLANETS[34]);
    drawTagline(PLANETS[34]);
    drawReturnPortal();
  }

  // ─── Floor 35: PLUTO ─────────────────────────────────────────────────────
  function renderFloor35() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    // Deep space background
    cx.fillStyle = '#020208';
    cx.fillRect(0, 0, w, h);

    // Brilliant starfield (cached)
    if (!_starField) {
      _starField = [];
      for (var s = 0; s < 300; s++) {
        _starField.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.75,
          r: 0.3 + Math.random() * 1.5,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.04,
          color: ['#ffffff', '#ffffc8', '#c8c8ff', '#ffc8ff'][Math.floor(Math.random() * 4)],
        });
      }
    }
    _starField.forEach(function (star) {
      star.twinkle += star.twinkleSpeed;
      var alpha = 0.5 + 0.5 * Math.sin(star.twinkle);
      cx.save();
      cx.globalAlpha = alpha;
      cx.fillStyle = star.color;
      cx.beginPath();
      cx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      cx.fill();
      if (star.r > 1.2) {
        // Star glint
        cx.strokeStyle = star.color;
        cx.lineWidth = 0.5;
        cx.globalAlpha = alpha * 0.4;
        cx.beginPath();
        cx.moveTo(star.x - star.r * 3, star.y);
        cx.lineTo(star.x + star.r * 3, star.y);
        cx.moveTo(star.x, star.y - star.r * 3);
        cx.lineTo(star.x, star.y + star.r * 3);
        cx.stroke();
      }
      cx.restore();
    });

    // The sun: just a bright star
    cx.save();
    cx.fillStyle = '#ffffff';
    cx.beginPath();
    cx.arc(w * 0.15, h * 0.08, 4, 0, Math.PI * 2);
    cx.fill();
    var sunGlow = cx.createRadialGradient(w * 0.15, h * 0.08, 0, w * 0.15, h * 0.08, 20);
    sunGlow.addColorStop(0, 'rgba(255,255,220,0.6)');
    sunGlow.addColorStop(1, 'rgba(255,255,220,0)');
    cx.fillStyle = sunGlow;
    cx.beginPath();
    cx.arc(w * 0.15, h * 0.08, 20, 0, Math.PI * 2);
    cx.fill();
    cx.restore();

    // Icy surface: nitrogen plains
    cx.fillStyle = '#0a0a1e';
    cx.beginPath();
    cx.moveTo(0, h * 0.72);
    for (var i = 0; i <= w; i += 4) {
      cx.lineTo(i, h * 0.72 - 15 * Math.sin(i / 250) - 8 * Math.cos(i / 100));
    }
    cx.lineTo(w, h * 0.72);
    cx.lineTo(w, h);
    cx.lineTo(0, h);
    cx.closePath();
    cx.fill();

    // Tombaugh Regio (heart shape, very faint)
    cx.save();
    cx.globalAlpha = 0.12;
    cx.fillStyle = '#aabbcc';
    cx.beginPath();
    // Simplified heart
    var hx = w * 0.5, hy = h * 0.77;
    cx.moveTo(hx, hy + 25);
    cx.bezierCurveTo(hx - 60, hy, hx - 60, hy - 30, hx, hy - 15);
    cx.bezierCurveTo(hx + 60, hy - 30, hx + 60, hy, hx, hy + 25);
    cx.fill();
    cx.restore();

    // Ice crystal particles (slow drift, catches light)
    if (Math.random() < 0.15 && _particles.length < 30) {
      spawnParticle({
        x: Math.random() * w,
        y: h * 0.4 + Math.random() * h * 0.3,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        life: 400,
        maxLife: 400,
        color: ['#aaddff', '#88aadd', '#ffffff', '#cceeff'][Math.floor(Math.random() * 4)],
        size: 1.5,
        alpha: 0.4 + Math.random() * 0.4,
        shape: 'flake',
        fade: true,
      });
    }
    updateParticles();
    drawParticles();

    // Next Pluto sunrise countdown
    var plutoDayMs = 6.387 * 24 * 60 * 60 * 1000;
    var msIntoPlutoDay = Date.now() % plutoDayMs;
    var msUntilSunrise = plutoDayMs - msIntoPlutoDay;
    var daysUntil = msUntilSunrise / (24 * 60 * 60 * 1000);

    cx.save();
    cx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(cx, w / 2 - 160, h - 80, 320, 50, 8);
    cx.fill();
    cx.fillStyle = '#5588cc';
    cx.font = 'bold 10px monospace';
    cx.textAlign = 'center';
    cx.fillText('NEXT PLUTO SUNRISE IN', w / 2, h - 60);
    cx.fillStyle = '#88ccff';
    cx.font = 'bold 14px monospace';
    cx.fillText(daysUntil.toFixed(2) + ' Earth days', w / 2, h - 42);
    cx.textAlign = 'left';
    cx.restore();

    PLANETS[35].clockColor = '#5588cc';
    drawDualClocks(PLANETS[35], '💙 PLUTO LOCAL TIME');
    drawInfoPanel(PLANETS[35]);
    drawTagline(PLANETS[35]);
    drawReturnPortal();
  }

  // ─── Return Portal ─────────────────────────────────────────────────────────
  function drawReturnPortal() {
    var cx = canvas();
    var w = W(), h = H();
    var t = T();

    var px = w - 100, py = h - 80;
    var pulse = 1 + 0.1 * Math.sin(t * 4);

    cx.save();
    cx.strokeStyle = '#00fff7';
    cx.lineWidth = 2;
    cx.shadowColor = '#00fff7';
    cx.shadowBlur = 12;
    cx.beginPath();
    cx.arc(px, py, 22 * pulse, 0, Math.PI * 2);
    cx.stroke();

    var pGrad = cx.createRadialGradient(px, py, 0, px, py, 22 * pulse);
    pGrad.addColorStop(0, 'rgba(0,255,247,0.25)');
    pGrad.addColorStop(1, 'rgba(0,255,247,0)');
    cx.fillStyle = pGrad;
    cx.beginPath();
    cx.arc(px, py, 22 * pulse, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = '#00fff7';
    cx.font = 'bold 11px monospace';
    cx.textAlign = 'center';
    cx.fillText('EXIT', px, py + 4);
    cx.fillText('PORTAL', px, py + 14);
    cx.textAlign = 'left';
    cx.restore();
  }

  // ─── Portal Selector UI ───────────────────────────────────────────────────
  var _portalOverlay = null;

  function showPortalSelector() {
    if (_portalOverlay) return;
    _portalUIVisible = true;

    var overlay = document.createElement('div');
    overlay.id = 'planet-portal-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'top:0', 'left:0', 'right:0', 'bottom:0',
      'background:rgba(0,0,8,0.88)',
      'z-index:9000',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'font-family:monospace',
    ].join(';');

    var title = document.createElement('div');
    title.style.cssText = 'color:#00fff7;font-size:22px;font-weight:bold;margin-bottom:8px;text-shadow:0 0 20px #00fff7';
    title.textContent = '⚡ PLANETARY PORTAL';

    var sub = document.createElement('div');
    sub.style.cssText = 'color:#888;font-size:12px;margin-bottom:28px;';
    sub.textContent = 'Step through and feel how differently time flows';

    var grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:700px;';

    Object.keys(PLANETS).forEach(function (floorNum) {
      var p = PLANETS[floorNum];
      var card = document.createElement('div');
      card.style.cssText = [
        'background:rgba(10,10,30,0.9)',
        'border:2px solid #333',
        'border-radius:12px',
        'padding:16px 20px',
        'width:180px',
        'cursor:pointer',
        'transition:all 0.2s',
        'text-align:center',
      ].join(';');

      card.innerHTML = [
        '<div style="font-size:36px;margin-bottom:8px">' + p.icon + '</div>',
        '<div style="color:#fff;font-weight:bold;font-size:14px">' + p.name + '</div>',
        '<div style="color:#888;font-size:11px;margin:4px 0">' + p.subtitle + '</div>',
        '<div style="color:#ffaa44;font-size:10px;margin-top:8px">' + p.description + '</div>',
        '<div style="color:#00fff7;font-size:9px;margin-top:6px;opacity:0.7">' + (p.gravityMult === 1 ? 'Gravity: Normal' : 'Gravity: ' + p.gravityMult + 'G') + '</div>',
      ].join('');

      card.addEventListener('mouseenter', function () {
        card.style.borderColor = '#00fff7';
        card.style.background = 'rgba(0,40,60,0.95)';
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = '0 0 20px rgba(0,255,247,0.3)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.borderColor = '#333';
        card.style.background = 'rgba(10,10,30,0.9)';
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
      });
      card.addEventListener('click', function () {
        hidePortalSelector();
        teleportToPlanet(parseInt(floorNum));
      });

      grid.appendChild(card);
    });

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = [
      'margin-top:24px',
      'background:transparent',
      'border:1px solid #555',
      'color:#888',
      'padding:8px 24px',
      'border-radius:6px',
      'cursor:pointer',
      'font-family:monospace',
      'font-size:12px',
    ].join(';');
    closeBtn.textContent = 'Stay Here';
    closeBtn.addEventListener('click', hidePortalSelector);

    overlay.appendChild(title);
    overlay.appendChild(sub);
    overlay.appendChild(grid);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    _portalOverlay = overlay;
  }

  function hidePortalSelector() {
    if (_portalOverlay) {
      _portalOverlay.remove();
      _portalOverlay = null;
    }
    _portalUIVisible = false;
  }

  // ─── Teleport with Glitch Effect ─────────────────────────────────────────
  function teleportToPlanet(floorNum) {
    var glitch = document.createElement('div');
    glitch.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
      'background:#00fff7',
      'z-index:9999',
      'opacity:0',
      'transition:opacity 0.08s',
    ].join(';');
    document.body.appendChild(glitch);

    // Flash sequence
    var flashes = [0.8, 0.3, 0.9, 0.1, 0.6, 0];
    var fi = 0;
    function flash() {
      if (fi >= flashes.length) {
        glitch.remove();
        doTeleport(floorNum);
        return;
      }
      glitch.style.opacity = flashes[fi];
      fi++;
      setTimeout(flash, 60);
    }
    setTimeout(flash, 20);
  }

  function doTeleport(floorNum) {
    _particles = [];
    _dustDevils = [];
    _starField = null;
    _lightningTimer = 0;

    _floorEnterTime[floorNum] = Date.now();

    if (typeof window.changeFloor === 'function') {
      window.changeFloor(floorNum);
    } else {
      window.S.floor = floorNum;
    }

    // Update floor HUD
    var fhud = document.getElementById('floor-hud');
    if (fhud) {
      var p = PLANETS[floorNum];
      fhud.textContent = p ? (p.icon + ' ' + p.name + ' — ' + p.subtitle) : 'F' + floorNum;
    }

    // Apply gravity
    applyGravity(floorNum);
  }

  // ─── Gravity Modifier ─────────────────────────────────────────────────────
  var _gravityApplied = false;

  function applyGravity(floorNum) {
    var p = PLANETS[floorNum];
    if (!p) { restoreGravity(); return; }

    _lastGravityFloor = floorNum;
    _gravityApplied = true;

    // We patch the key press handler's moveDistance via a global override
    window._PLANET_GRAVITY = p.gravityMult;

    // Visual: squash/stretch effect for Jupiter
    var canvas2 = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (canvas2) {
      if (p.gravityMult >= 2) {
        canvas2.style.transition = 'transform 0.5s';
        canvas2.style.transformOrigin = 'center bottom';
        canvas2.style.transform = 'scaleY(0.95)';  // subtle squash
      } else if (p.gravityMult <= 0.1) {
        canvas2.style.transition = 'transform 0.5s';
        canvas2.style.transformOrigin = 'center bottom';
        canvas2.style.transform = 'scaleY(1.02)';  // slight stretch
      } else {
        canvas2.style.transform = 'scaleY(1)';
      }
    }
  }

  function restoreGravity() {
    window._PLANET_GRAVITY = null;
    _gravityApplied = false;
    _lastGravityFloor = null;
    var canvas2 = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (canvas2) {
      canvas2.style.transform = 'scaleY(1)';
    }
  }

  // ─── Patch the render loop to call planet renderers ──────────────────────
  function patchRenderLoop() {
    // Find the existing render function and wrap it
    var origDraw = window.draw;
    if (typeof origDraw !== 'function') {
      // Try to find it on the game loop
      console.warn('[PlanetaryRooms] draw() not found, trying render loop patch...');
    }

    // Patch changeFloor to restore gravity when leaving planet floors
    var origChangeFloor = window.changeFloor;
    if (typeof origChangeFloor === 'function') {
      window.changeFloor = function (f) {
        if (planetFloor(window.S.floor) && !planetFloor(f)) {
          restoreGravity();
        }
        origChangeFloor.call(this, f);
        if (planetFloor(f)) {
          _floorEnterTime[f] = _floorEnterTime[f] || Date.now();
          // update HUD
          var fhud = document.getElementById('floor-hud');
          var p = PLANETS[f];
          if (fhud && p) {
            fhud.textContent = p.icon + ' ' + p.name + ' — ' + p.subtitle;
          }
          applyGravity(f);
        }
      };
    }

    // Register window.renderFloorXX for floors 30-35
    window.renderFloor30 = renderFloor30;
    window.renderFloor31 = renderFloor31;
    window.renderFloor32 = renderFloor32;
    window.renderFloor33 = renderFloor33;
    window.renderFloor34 = renderFloor34;
    window.renderFloor35 = renderFloor35;

    // Patch the draw/render dispatch — the game checks window.renderFloorN
    // but only up to 12 in the inline if-else. We need to intercept.
    // We do this by patching the SECOND render loop (ring-engine also wraps draw).
    // Strategy: wrap requestAnimationFrame to inject our floor renders.
    var _origRAF = window.requestAnimationFrame;
    var _injectInstalled = false;

    function installDrawPatch() {
      // Find the game's main loop via checking if draw is defined now
      if (typeof window.draw === 'function' && !_injectInstalled) {
        _injectInstalled = true;
        var _gameDraw = window.draw;
        window.draw = function () {
          _gameDraw.apply(this, arguments);
          // After the main draw, if on a planet floor, the floor was already
          // rendered by window.renderFloorXX being registered. But the game
          // only dispatches 1-12 in its hardcoded chain.
          // We need a different approach for floors >= 30.
        };
      }
    }

    // Better approach: hook into the animation loop via setInterval fallback
    // and render planet floor when S.floor is 30-35
    patchDrawDispatch();
  }

  function patchDrawDispatch() {
    // The game's render chain has hardcoded floor numbers 1-12.
    // For floors 30-35, nothing renders. We patch via wrapping the ctx's
    // fillRect to detect when the game starts drawing, and override.
    // Actually the simplest approach: override the game's render by wrapping
    // the outer draw function.

    // Wait for 'draw' to be defined
    var attempts = 0;
    function tryPatch() {
      attempts++;
      if (attempts > 200) return;

      if (typeof window.draw !== 'function') {
        setTimeout(tryPatch, 100);
        return;
      }

      // Find the last override of draw (ring-engine may have patched it too)
      var _origDraw = window.draw;
      window.draw = function () {
        var floor = window.S && window.S.floor;
        if (floor && floor >= 30 && floor <= 35) {
          // Clear canvas and render planet room directly
          var cx = window.ctx;
          var w = window.W, h = window.H;
          if (cx && w && h) {
            cx.save();
            cx.clearRect(0, 0, w, h);
            (window['renderFloor' + floor] || function () {})();
            // Draw characters on top
            renderPlanetCharacters();
            cx.restore();
          }
        } else {
          _origDraw.apply(this, arguments);
        }
      };
    }

    setTimeout(tryPatch, 500);
  }

  function renderPlanetCharacters() {
    // Draw visitor sprite on planet floor
    var cx = window.ctx;
    var S2 = window.S;
    if (!cx || !S2) return;

    // Draw Echo (simplified placeholder so something moves)
    var e = S2.echo;
    if (e && typeof drawSprite === 'function') {
      try { drawSprite(e); } catch (err) { /* sprite fn may not exist */ }
    }

    // Draw visitor
    var v = S2.visitor;
    if (!v) return;

    // Gravity squash for Jupiter
    var planet = currentPlanet();
    var gravMult = planet ? planet.gravityMult : 1;

    cx.save();
    cx.translate(v.x, v.y);

    // Squash/stretch based on gravity
    var scaleY = gravMult >= 2 ? 0.8 : (gravMult <= 0.1 ? 1.3 : 1.0);
    var scaleX = gravMult >= 2 ? 1.2 : 1.0;
    cx.scale(scaleX, scaleY);

    // Simple character box
    var skinColor = '#ffd700';
    var bodyColor = '#4488ff';
    if (S2.visitor && S2.visitor.skin) {
      // Try to get skin color if available
      if (window.VISITOR_SKINS) {
        var sk = window.VISITOR_SKINS.find(function (s) { return s.id === S2.visitor.skin; });
        if (sk) { bodyColor = sk.color || bodyColor; }
      }
    }

    // Body
    cx.fillStyle = bodyColor;
    cx.fillRect(-8, -30, 16, 20);
    // Head
    cx.fillStyle = skinColor;
    cx.fillRect(-7, -44, 14, 14);
    // Eyes
    cx.fillStyle = '#000';
    cx.fillRect(-4, -40, 3, 3);
    cx.fillRect(1, -40, 3, 3);

    cx.restore();
  }

  // ─── Portal Zone Detection on Floor 5 ─────────────────────────────────────
  function checkPortalProximity() {
    var floor = window.S && window.S.floor;
    if (floor !== 5) return;

    var v = window.S.visitor;
    if (!v) return;

    // Portal is roughly at x:600, y:200 based on Floor 5 definition
    var portalX = 600, portalY = 250;
    var dist = Math.hypot(v.x - portalX, v.y - portalY);

    if (dist < 80 && !_portalUIVisible) {
      // Show prompt
      if (!document.getElementById('portal-prompt')) {
        var prompt = document.createElement('div');
        prompt.id = 'portal-prompt';
        prompt.style.cssText = [
          'position:fixed',
          'bottom:120px',
          'left:50%',
          'transform:translateX(-50%)',
          'background:rgba(0,0,20,0.85)',
          'border:2px solid #00fff7',
          'border-radius:10px',
          'padding:12px 24px',
          'color:#00fff7',
          'font-family:monospace',
          'font-size:13px',
          'z-index:500',
          'cursor:pointer',
          'text-align:center',
        ].join(';');
        prompt.innerHTML = '⚡ <strong>PLANETARY PORTAL</strong><br><span style="font-size:11px;color:#aaa">Press E or click to enter</span>';
        prompt.addEventListener('click', function () {
          document.getElementById('portal-prompt') && document.getElementById('portal-prompt').remove();
          showPortalSelector();
        });
        document.body.appendChild(prompt);
      }
    } else {
      var existingPrompt = document.getElementById('portal-prompt');
      if (existingPrompt && dist >= 80) existingPrompt.remove();
    }
  }

  // Handle keyboard E near portal
  function handlePortalKey(e) {
    if (e.key === 'e' || e.key === 'E') {
      var floor = window.S && window.S.floor;
      // Allow 'E' to open portal from Floor 5 if near portal
      if (floor === 5) {
        var v = window.S && window.S.visitor;
        if (v && Math.hypot(v.x - 600, v.y - 250) < 80) {
          showPortalSelector();
          return;
        }
      }
      // Allow 'E' to exit from planet rooms
      if (planetFloor(floor)) {
        var cx2 = window.ctx;
        var w = window.W;
        var h = window.H;
        var v2 = window.S && window.S.visitor;
        if (v2 && Math.hypot(v2.x - (w - 100), v2.y - (h - 80)) < 60) {
          restoreGravity();
          if (typeof window.changeFloor === 'function') {
            window.changeFloor(5);
          }
        } else {
          // Show portal selector to switch planets
          showPortalSelector();
        }
      }
    }
    if (e.key === 'Escape' && _portalUIVisible) {
      hidePortalSelector();
    }
  }

  // ─── Gravity movement modifier ────────────────────────────────────────────
  // Patch key-press movement to scale by gravity
  function patchMovement() {
    // We can't easily patch the inline key handler, but we can intercept
    // keydown events at the document level and adjust position after.
    // The game uses 'up/down/left/right' mapped to arrow keys / WASD.
    // moveDistance = 80. We post-process visitor position.

    var lastPos = { x: 0, y: 0 };
    document.addEventListener('keydown', function (e) {
      var grav = window._PLANET_GRAVITY;
      if (!grav || grav === 1) return;
      var sv = window.S && window.S.visitor;
      if (!sv) return;
      // Capture position before game processes the key
      lastPos.x = sv.x;
      lastPos.y = sv.y;
    }, true); // capture phase, before game handler

    document.addEventListener('keyup', function (e) {
      var grav = window._PLANET_GRAVITY;
      if (!grav || grav === 1) return;
      var sv = window.S && window.S.visitor;
      if (!sv) return;
      var dx = sv.x - lastPos.x;
      var dy = sv.y - lastPos.y;
      if (dx === 0 && dy === 0) return;
      // Scale the movement by gravity (low gravity = bigger step, high = smaller)
      // But moveDistance is already applied by game. We adjust the delta.
      var gravFactor = 1 / Math.sqrt(grav); // inverse sqrt for feel
      sv.x = lastPos.x + dx * gravFactor;
      sv.y = lastPos.y + dy * gravFactor;
    });
  }

  // ─── Interval loop for planet-specific effects ────────────────────────────
  function startPlanetLoop() {
    setInterval(function () {
      var floor = window.S && window.S.floor;
      if (!floor) return;

      // Portal proximity check on floor 5
      checkPortalProximity();

      // Gravity application if we just arrived on a planet floor
      if (planetFloor(floor) && _lastGravityFloor !== floor) {
        applyGravity(floor);
      }

    }, 200);
  }

  // ─── Add "Planet Rooms" entry to floor selector UI ────────────────────────
  function injectFloorButtons() {
    // Look for the floor selector/elevator menu and add a portal button
    var attempts = 0;
    function tryInject() {
      attempts++;
      if (attempts > 50) return;
      var elevatorMenu = document.getElementById('elevator-menu') ||
                         document.getElementById('floor-menu') ||
                         document.querySelector('.floor-menu');
      if (!elevatorMenu) {
        // Try to find the floor buttons list
        var floorBtns = document.querySelectorAll('.floor-btn');
        if (floorBtns.length > 0 && !document.getElementById('planet-portal-btn')) {
          var lastBtn = floorBtns[floorBtns.length - 1];
          var portalBtn = document.createElement('button');
          portalBtn.id = 'planet-portal-btn';
          portalBtn.className = 'floor-btn';
          portalBtn.style.cssText = 'border-color:#00fff7;color:#00fff7;';
          portalBtn.innerHTML = '⚡ Planetary Portal <span style="font-size:10px;color:#aaa;display:block">Visit other worlds</span>';
          portalBtn.addEventListener('click', function () {
            // Close elevator menu first
            var menu = lastBtn.closest('.overlay') || lastBtn.closest('[id*="menu"]') || lastBtn.closest('[class*="overlay"]');
            if (menu) menu.style.display = 'none';
            setTimeout(showPortalSelector, 200);
          });
          lastBtn.parentNode.insertBefore(portalBtn, lastBtn.nextSibling);
          return;
        }
        setTimeout(tryInject, 500);
        return;
      }
    }
    setTimeout(tryInject, 2000);
  }

  // ─── FLOOR_NAMES patch for planet floors ────────────────────────────────
  function patchFloorNames() {
    function tryPatch() {
      if (window.FLOOR_NAMES) {
        window.FLOOR_NAMES[30] = '🌍 Earth — Home';
        window.FLOOR_NAMES[31] = '🌋 Venus — The Eternal Sunrise';
        window.FLOOR_NAMES[32] = '🔴 Mars — Almost Home';
        window.FLOOR_NAMES[33] = '⚡ Jupiter — The Fast World';
        window.FLOOR_NAMES[34] = '🌑 Mercury — The Split World';
        window.FLOOR_NAMES[35] = '💙 Pluto — The Long Wait';
      } else {
        setTimeout(tryPatch, 500);
      }
    }
    tryPatch();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  waitReady(function () {
    console.log('[PlanetaryRooms] Initializing...');

    patchFloorNames();
    patchRenderLoop();
    patchMovement();
    startPlanetLoop();
    injectFloorButtons();

    document.addEventListener('keydown', handlePortalKey);

    // Add canvas click handler for return portal
    var gameCanvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (gameCanvas) {
      gameCanvas.addEventListener('click', function (e) {
        var floor = window.S && window.S.floor;
        if (!planetFloor(floor)) return;
        var rect = gameCanvas.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (gameCanvas.width / rect.width);
        var my = (e.clientY - rect.top) * (gameCanvas.height / rect.height);
        var w = window.W || 800, h = window.H || 600;
        // Return portal at (w-100, h-80)
        if (Math.hypot(mx - (w - 100), my - (h - 80)) < 35) {
          restoreGravity();
          if (typeof window.changeFloor === 'function') {
            window.changeFloor(5);
          }
        }
      });
    }

    console.log('[PlanetaryRooms] ✓ 6 planet rooms registered (floors 30-35)');
    console.log('[PlanetaryRooms] ✓ Portal selector ready (Floor 5 portal zone)');
    console.log('[PlanetaryRooms] ✓ Gravity simulation active');
    console.log('[PlanetaryRooms] ✓ Dual clock system running');
  });

  // ─── Public API ───────────────────────────────────────────────────────────
  window.PlanetaryRooms = {
    showPortalSelector: showPortalSelector,
    teleportToPlanet: teleportToPlanet,
    PLANETS: PLANETS,
    renderFloor30: renderFloor30,
    renderFloor31: renderFloor31,
    renderFloor32: renderFloor32,
    renderFloor33: renderFloor33,
    renderFloor34: renderFloor34,
    renderFloor35: renderFloor35,
  };

})();
