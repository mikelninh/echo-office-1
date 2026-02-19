// ring-engine.js — Ring Navigation System for Echo Station
// Loaded after main scripts. Pure override layer — does NOT modify index.html.
// ─────────────────────────────────────────────────────────────────────────────
(function RingEngine() {
  'use strict';

  // ─── Wait for game to be ready ─────────────────────────────────────────────
  function waitReady(fn, attempts) {
    attempts = attempts || 0;
    if (attempts > 200) { console.warn('[RingEngine] gave up waiting'); return; }
    if (typeof window.changeFloor === 'function' && window._S && window._S.floor) {
      fn();
    } else {
      setTimeout(function() { waitReady(fn, attempts + 1); }, 100);
    }
  }

  // ─── Segment Definitions ───────────────────────────────────────────────────
  // clockAngle: where on the clock face (0 = 12 o'clock, increasing clockwise)
  // floor: null for new segments (no existing renderFloor)
  var SEGMENTS = [
    { id:1,  floor:2,  name:'Observatory',     icon:'🔭', color:'#4488ff', glow:'#88aaff', clockAngle:0   },
    { id:2,  floor:4,  name:'Garden Biodome',  icon:'🌿', color:'#44cc66', glow:'#88ffaa', clockAngle:30  },
    { id:3,  floor:5,  name:'Secret Lab',      icon:'🔬', color:'#00fff7', glow:'#66ffee', clockAngle:60  },
    { id:4,  floor:6,  name:'The Lounge',      icon:'🎵', color:'#ff88cc', glow:'#ffaadd', clockAngle:90  },
    { id:5,  floor:7,  name:'Community Deck',  icon:'🎨', color:'#ffaa44', glow:'#ffcc88', clockAngle:120 },
    { id:6,  floor:null,name:'Neighborhood Hub',icon:'🏘️', color:'#88ff66', glow:'#aaffaa', clockAngle:150 },
    { id:7,  floor:10, name:'The Underground', icon:'🪩', color:'#aa44ff', glow:'#cc88ff', clockAngle:180 },
    { id:8,  floor:12, name:'The Gym',         icon:'💪', color:'#ff6644', glow:'#ff9977', clockAngle:210 },
    { id:9,  floor:1,  name:"Echo's Quarters", icon:'🏠', color:'#ffd700', glow:'#ffee88', clockAngle:240 },
    { id:10, floor:null,name:'Night Market',   icon:'🌙', color:'#6644aa', glow:'#9977dd', clockAngle:270 },
    { id:11, floor:3,  name:'The Arcade',      icon:'🕹️', color:'#ff4488', glow:'#ff88bb', clockAngle:300 },
    { id:12, floor:null,name:'The Cinema',     icon:'🎬', color:'#cc8844', glow:'#ffbb88', clockAngle:330 },
  ];

  // Floor → segment lookup
  var FLOOR_TO_SEGMENT = {};
  var SEGMENT_TO_FLOOR = {};
  SEGMENTS.forEach(function(s) {
    if (s.floor !== null) {
      FLOOR_TO_SEGMENT[s.floor] = s.id;
      SEGMENT_TO_FLOOR[s.id] = s.floor;
    }
  });

  // New segment placeholder floors (mapped to high floor numbers to avoid collisions)
  var NEW_SEGMENT_FLOORS = { 6: 20, 10: 21, 12: 22 };
  // Reverse: floor number → segment for new segments
  var NEW_FLOOR_TO_SEGMENT = {};
  Object.keys(NEW_SEGMENT_FLOORS).forEach(function(segId) {
    NEW_FLOOR_TO_SEGMENT[NEW_SEGMENT_FLOORS[segId]] = parseInt(segId);
  });

  var currentSegment = 1; // 1-12
  var _ringMapDirty = true;
  var _lastRingRedraw = 0;
  var _edgeTransitioning = false;
  var _earthAngle = 0;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function segById(id) {
    return SEGMENTS[(id - 1 + 12) % 12];
  }

  function prevSeg(id) { return ((id - 2 + 12) % 12) + 1; }
  function nextSeg(id) { return (id % 12) + 1; }

  function segForFloor(f) {
    if (FLOOR_TO_SEGMENT[f]) return FLOOR_TO_SEGMENT[f];
    if (NEW_FLOOR_TO_SEGMENT[f]) return parseInt(Object.keys(NEW_SEGMENT_FLOORS).find(function(k){ return NEW_SEGMENT_FLOORS[k]===f; }));
    return currentSegment;
  }

  function floorForSeg(segId) {
    var seg = segById(segId);
    if (seg.floor !== null) return seg.floor;
    return NEW_SEGMENT_FLOORS[segId] || 1;
  }

  // ─── Ring Map Canvas ───────────────────────────────────────────────────────
  var ringCanvas, ringCtx;
  var RING_SIZE = 160;
  var RING_MARGIN = 10;

  function createRingMap() {
    ringCanvas = document.createElement('canvas');
    ringCanvas.width = RING_SIZE;
    ringCanvas.height = RING_SIZE;
    ringCanvas.id = 'ring-map-canvas';
    ringCanvas.style.cssText = [
      'position:fixed',
      'top:' + RING_MARGIN + 'px',
      'right:' + RING_MARGIN + 'px',
      'width:' + RING_SIZE + 'px',
      'height:' + RING_SIZE + 'px',
      'max-width:' + RING_SIZE + 'px',
      'max-height:' + RING_SIZE + 'px',
      'z-index:200',
      'border-radius:50%',
      'cursor:pointer',
      'image-rendering:crisp-edges',
      'box-shadow:0 0 24px rgba(100,80,255,0.4),0 0 2px rgba(0,0,0,0.8)',
      'background:transparent',
    ].join(';');
    ringCtx = ringCanvas.getContext('2d');
    document.body.appendChild(ringCanvas);

    ringCanvas.addEventListener('click', function(e) {
      var rect = ringCanvas.getBoundingClientRect();
      var cx = rect.left + RING_SIZE / 2;
      var cy = rect.top + RING_SIZE / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var r = Math.sqrt(dx*dx + dy*dy);
      if (r < 20 || r > RING_SIZE / 2 - 2) return;
      var angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
      var segIdx = Math.floor(angle / 30);
      var seg = SEGMENTS[segIdx];
      if (seg) goToSegment(seg.id);
    });

    // Hide the elevator overlay (ring replaces it)
    var elev = document.getElementById('elevator-overlay');
    if (elev) { elev.style.display = 'none !important'; elev.innerHTML = ''; }

    // Override the elevator button to open a custom segment list instead
    overrideElevatorButton();

    drawRingMap();
  }

  function drawRingMap() {
    _lastRingRedraw = Date.now();
    _ringMapDirty = false;
    var ctx = ringCtx;
    var cx = RING_SIZE / 2;
    var cy = RING_SIZE / 2;
    var outerR = cx - 4;
    var innerR = outerR - 24;
    var labelR = outerR - 12;

    ctx.clearRect(0, 0, RING_SIZE, RING_SIZE);

    // ── Space background ──
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    bg.addColorStop(0, 'rgba(6,4,18,0.97)');
    bg.addColorStop(0.6, 'rgba(10,8,28,0.97)');
    bg.addColorStop(1, 'rgba(20,10,40,0.97)');
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    // Stars
    var starSeed = 42;
    function rng() { starSeed = (starSeed * 1664525 + 1013904223) & 0xffffffff; return (starSeed >>> 0) / 0xffffffff; }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (var i = 0; i < 28; i++) {
      var sx = rng() * RING_SIZE;
      var sy = rng() * RING_SIZE;
      var sr = rng() * 1.2 + 0.2;
      var dist = Math.sqrt((sx-cx)*(sx-cx)+(sy-cy)*(sy-cy));
      if (dist < innerR - 2 || dist > outerR - 1) continue;
      ctx.globalAlpha = 0.4 + rng() * 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Clip to ring band for segment arcs ──
    var S_ref = window._S || {};
    var otherPlayers = S_ref.otherPlayers || {};

    // Draw 12 segment arcs
    SEGMENTS.forEach(function(seg, idx) {
      var startAngle = (seg.clockAngle - 90 - 13) * Math.PI / 180;
      var endAngle   = (seg.clockAngle - 90 + 13) * Math.PI / 180;
      var isCurrent  = (seg.id === currentSegment);

      // Glow for current segment
      if (isCurrent) {
        ctx.save();
        ctx.shadowColor = seg.glow;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, (outerR + innerR) / 2, startAngle, endAngle);
        ctx.lineWidth = outerR - innerR + 6;
        ctx.strokeStyle = seg.glow;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.restore();
      }

      // Arc fill
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = isCurrent ? seg.glow : seg.color;
      ctx.globalAlpha = isCurrent ? 0.95 : 0.45;
      ctx.fill();

      // Arc border
      ctx.globalAlpha = isCurrent ? 1.0 : 0.25;
      ctx.strokeStyle = isCurrent ? '#ffffff' : seg.color;
      ctx.lineWidth = isCurrent ? 1.5 : 0.5;
      ctx.stroke();
      ctx.restore();

      // Emoji icon — placed in the arc midpoint
      var midAngle = (seg.clockAngle - 90) * Math.PI / 180;
      var iconR = (outerR + innerR) / 2;
      var ix = cx + Math.cos(midAngle) * iconR;
      var iy = cy + Math.sin(midAngle) * iconR;
      ctx.save();
      ctx.font = isCurrent ? '9px serif' : '7px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = isCurrent ? 1.0 : 0.7;
      ctx.fillText(seg.icon, ix, iy);
      ctx.restore();
    });

    // ── Gap lines between segments ──
    for (var g = 0; g < 12; g++) {
      var gAngle = (g * 30 - 90 + 15) * Math.PI / 180; // between segments
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(gAngle) * (innerR - 1), cy + Math.sin(gAngle) * (innerR - 1));
      ctx.lineTo(cx + Math.cos(gAngle) * (outerR + 1), cy + Math.sin(gAngle) * (outerR + 1));
      ctx.strokeStyle = 'rgba(6,4,18,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Center hole ──
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4,3,14,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,80,200,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Center text: current segment name (short)
    var curSeg = segById(currentSegment);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = curSeg.glow;
    ctx.globalAlpha = 0.9;
    // icon
    ctx.font = '16px serif';
    ctx.fillText(curSeg.icon, cx, cy - 6);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#aaaacc';
    ctx.globalAlpha = 0.8;
    // Truncate long names
    var shortName = curSeg.name.length > 12 ? curSeg.name.substring(0,11)+'…' : curSeg.name;
    ctx.fillText(shortName, cx, cy + 9);
    ctx.restore();

    // ── Player dot ──
    var curAngle = (curSeg.clockAngle - 90) * Math.PI / 180;
    var dotR = (outerR + innerR) / 2;
    var px = cx + Math.cos(curAngle) * dotR;
    var py = cy + Math.sin(curAngle) * dotR;

    // Pulse ring
    var pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 5 * pulse + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Core dot
    ctx.save();
    var dotGrad = ctx.createRadialGradient(px, py, 0, px, py, 5);
    dotGrad.addColorStop(0, '#ffffff');
    dotGrad.addColorStop(0.4, curSeg.glow);
    dotGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = dotGrad;
    ctx.shadowColor = curSeg.glow;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // ── Other player dots ──
    var playerSegCounts = {};
    Object.values(otherPlayers).forEach(function(p) {
      var pFloor = p.floor || 1;
      var pSeg = segForFloor(pFloor);
      playerSegCounts[pSeg] = (playerSegCounts[pSeg] || 0) + 1;
    });

    Object.keys(playerSegCounts).forEach(function(segId) {
      segId = parseInt(segId);
      if (segId === currentSegment) return; // don't overdraw player dot
      var pSeg = segById(segId);
      var pAngle = (pSeg.clockAngle - 90) * Math.PI / 180;
      var ppx = cx + Math.cos(pAngle) * dotR;
      var ppy = cy + Math.sin(pAngle) * dotR;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00fff7';
      ctx.shadowColor = '#00fff7';
      ctx.shadowBlur = 4;
      ctx.fill();
      if (playerSegCounts[segId] > 1) {
        ctx.font = '6px monospace';
        ctx.fillStyle = '#00fff7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(playerSegCounts[segId]), ppx, ppy - 3);
      }
      ctx.restore();
    });

    // Outer ring border
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,80,200,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ─── Ring-Aware HUD ────────────────────────────────────────────────────────
  function updateHUD() {
    var seg = segById(currentSegment);

    // Update floor-hud
    var floorHud = document.getElementById('floor-hud');
    if (floorHud) {
      floorHud.innerHTML = seg.icon + ' ' + seg.name;
    }

    // Update floor-display (top-left HUD)
    var floorDisplay = document.getElementById('floor-display');
    if (floorDisplay) {
      floorDisplay.textContent = seg.icon + ' ' + seg.name;
    }

    // Edge labels
    updateEdgeLabels();
  }

  var _edgeLeft, _edgeRight;
  function createEdgeLabels() {
    _edgeLeft = document.createElement('div');
    _edgeLeft.id = 'ring-edge-left';
    _edgeLeft.style.cssText = [
      'position:fixed','left:8px','top:50%',
      'transform:translateY(-50%)',
      'z-index:180','pointer-events:none',
      'font-size:11px','color:rgba(200,200,255,0.7)',
      'font-family:monospace',
      'text-shadow:0 0 6px rgba(0,0,0,0.8)',
      'opacity:0','transition:opacity 0.3s',
    ].join(';');
    document.body.appendChild(_edgeLeft);

    _edgeRight = document.createElement('div');
    _edgeRight.id = 'ring-edge-right';
    _edgeRight.style.cssText = [
      'position:fixed','right:8px','top:50%',
      'transform:translateY(-50%)',
      'z-index:180','pointer-events:none',
      'font-size:11px','color:rgba(200,200,255,0.7)',
      'font-family:monospace',
      'text-align:right',
      'text-shadow:0 0 6px rgba(0,0,0,0.8)',
      'opacity:0','transition:opacity 0.3s',
    ].join(';');
    document.body.appendChild(_edgeRight);
  }

  function updateEdgeLabels(nearEdge) {
    if (!_edgeLeft || !_edgeRight) return;
    var prev = segById(prevSeg(currentSegment));
    var next = segById(nextSeg(currentSegment));
    _edgeLeft.innerHTML  = '← ' + prev.icon + ' ' + prev.name;
    _edgeRight.innerHTML = next.icon + ' ' + next.name + ' →';
    var show = nearEdge ? '1' : '0';
    _edgeLeft.style.opacity = show;
    _edgeRight.style.opacity = show;
  }

  // ─── Segment Navigation ────────────────────────────────────────────────────
  function goToSegment(segId) {
    segId = ((segId - 1 + 12) % 12) + 1;
    var seg = segById(segId);
    var floor = floorForSeg(segId);
    currentSegment = segId;
    _ringMapDirty = true;

    // Call original changeFloor with the mapped floor number
    if (typeof _origChangeFloor === 'function') {
      _origChangeFloor(floor);
    }
    updateHUD();
  }

  // ─── Override changeFloor ─────────────────────────────────────────────────
  var _origChangeFloor = window.changeFloor;

  window.changeFloor = function(f) {
    // Map floor number to segment
    var segId = FLOOR_TO_SEGMENT[f] || NEW_FLOOR_TO_SEGMENT[f];
    if (segId) {
      currentSegment = segId;
      _ringMapDirty = true;
    }
    // Call original
    if (typeof _origChangeFloor === 'function') {
      _origChangeFloor(f);
    }
    updateHUD();
  };

  // Also expose segment-based navigation globally
  window.changeSegment = function(segId) {
    goToSegment(segId);
  };

  // ─── Placeholder Renderers for New Segments ────────────────────────────────
  var _particleSystems = {};

  function renderPlaceholder(segId) {
    var ctx = window.ctx || window._ctx;
    if (!ctx) return;
    var W = window.W || window._W || 800;
    var H = window.H || window._H || 600;
    var S_ref = window._S || {};
    var t = S_ref.tick || Date.now() / 16;
    var seg = segById(segId);

    // ── Background ──
    var themes = {
      6:  { bg1:'#0a1a0a', bg2:'#1a3a1a', accent:'#66ff88', particle:'#88ffaa' }, // Neighborhood Hub - green
      10: { bg1:'#08060e', bg2:'#140c24', accent:'#aa66ff', particle:'#cc99ff' }, // Night Market - purple
      12: { bg1:'#100a06', bg2:'#1e1206', accent:'#ff9944', particle:'#ffcc88' }, // Cinema - amber
    };
    var theme = themes[segId] || { bg1:'#0a0a14', bg2:'#1a1a2a', accent:'#00fff7', particle:'#88ffff' };

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, theme.bg1);
    grad.addColorStop(1, theme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Floor
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, H - 80, W, 80);
    ctx.fillStyle = theme.accent + '22';
    ctx.fillRect(0, H - 82, W, 4);

    // ── Ambient particles ──
    var ps = _particleSystems[segId];
    if (!ps) {
      ps = [];
      for (var i = 0; i < 30; i++) {
        ps.push({ x: Math.random()*W, y: Math.random()*H, vy: -(0.2+Math.random()*0.5), vx: (Math.random()-0.5)*0.3, life: Math.random(), size: Math.random()*3+1 });
      }
      _particleSystems[segId] = ps;
    }
    ps.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.life -= 0.003;
      if (p.life <= 0 || p.y < 0) { p.y = H + 5; p.x = Math.random()*W; p.life = 0.4 + Math.random()*0.6; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = theme.particle;
      ctx.globalAlpha = p.life * 0.5;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ── Segment name ──
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 0.03);
    ctx.fillText(seg.name.toUpperCase(), W/2, H/2 - 10);
    ctx.globalAlpha = 1;

    ctx.font = '56px serif';
    ctx.fillText(seg.icon, W/2, H/2 - 60);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillText(seg.name, W/2, H/2 + 10);

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(200,200,255,0.5)';
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.04);
    ctx.fillText('— COMING SOON —', W/2, H/2 + 38);
    ctx.restore();

    // ── Navigation arrows ──
    var prev = segById(prevSeg(segId));
    var next = segById(nextSeg(segId));
    ctx.save();
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(200,200,255,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('← ' + prev.icon + ' ' + prev.name, 30, H/2);
    ctx.textAlign = 'right';
    ctx.fillText(next.icon + ' ' + next.name + ' →', W - 30, H/2);
    ctx.restore();
  }

  // ─── Earth View for Observatory (Segment 1 / Floor 2) ─────────────────────
  function renderEarth(ctx, W, H) {
    _earthAngle += 0.0005;
    var ex = W * 0.82;
    var ey = H * 0.22;
    var er = 55;

    ctx.save();
    // Glow
    var earthGlow = ctx.createRadialGradient(ex, ey, er*0.5, ex, ey, er*1.8);
    earthGlow.addColorStop(0, 'rgba(40,120,255,0.12)');
    earthGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = earthGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, er*1.8, 0, Math.PI*2);
    ctx.fill();

    // Ocean
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI*2);
    var oceanGrad = ctx.createRadialGradient(ex - er*0.2, ey - er*0.2, er*0.1, ex, ey, er);
    oceanGrad.addColorStop(0, '#5599ee');
    oceanGrad.addColorStop(0.6, '#2244aa');
    oceanGrad.addColorStop(1, '#112266');
    ctx.fillStyle = oceanGrad;
    ctx.fill();

    // Continent blobs (simplified, rotate with _earthAngle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.clip();
    ctx.translate(ex, ey);
    ctx.rotate(_earthAngle);
    var continents = [
      { x:-15, y:-18, rx:18, ry:14 },
      { x:18,  y:-10, rx:12, ry:20 },
      { x:-22, y:12,  rx:10, ry:8  },
      { x:10,  y:20,  rx:14, ry:10 },
    ];
    continents.forEach(function(c) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, c.x*0.05, 0, Math.PI*2);
      ctx.fillStyle = '#55aa55';
      ctx.globalAlpha = 0.85;
      ctx.fill();
    });
    // Polar ice
    ctx.beginPath();
    ctx.ellipse(0, -er+8, er*0.45, er*0.18, 0, 0, Math.PI*2);
    ctx.fillStyle = '#ddeeff';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, er-5, er*0.35, er*0.12, 0, 0, Math.PI*2);
    ctx.fillStyle = '#ddeeff';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore(); // unclip

    // Cloud wisps
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.clip();
    ctx.translate(ex, ey);
    ctx.rotate(-_earthAngle * 1.3);
    [[- 5,-30,28,6],[18, -5,22,5],[-28,10,18,5],[5,28,24,5]].forEach(function(c) {
      ctx.beginPath();
      ctx.ellipse(c[0], c[1], c[2], c[3], c[0]*0.02, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    });
    ctx.restore();

    // Atmosphere rim
    var atmosGrad = ctx.createRadialGradient(ex, ey, er*0.9, ex, ey, er*1.12);
    atmosGrad.addColorStop(0, 'rgba(80,140,255,0)');
    atmosGrad.addColorStop(0.5, 'rgba(80,140,255,0.15)');
    atmosGrad.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.beginPath();
    ctx.arc(ex, ey, er*1.12, 0, Math.PI*2);
    ctx.fillStyle = atmosGrad;
    ctx.fill();

    // Limb darkening
    var limbGrad = ctx.createRadialGradient(ex+er*0.3, ey-er*0.3, er*0.2, ex, ey, er);
    limbGrad.addColorStop(0, 'rgba(0,0,0,0)');
    limbGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    limbGrad.addColorStop(1, 'rgba(0,0,10,0.55)');
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.fillStyle = limbGrad;
    ctx.fill();

    ctx.restore();
  }

  // ─── Patch renderFloor2 to add Earth ──────────────────────────────────────
  function patchObservatory() {
    var _orig = window.renderFloor2;
    if (typeof _orig !== 'function') return false;
    window.renderFloor2 = function() {
      _orig();
      var ctx2 = window.ctx || window._ctx;
      var W2 = window.W || window._W || 800;
      var H2 = window.H || window._H || 600;
      if (ctx2) renderEarth(ctx2, W2, H2);
    };
    return true;
  }

  // ─── Patch main render loop to call placeholder renderers ─────────────────
  function patchRenderLoop() {
    // We need to add cases for floors 20, 21, 22 (new segments)
    // The main loop checks S.floor and calls renderFloor1..12
    // We wrap the game loop's render dispatcher by adding window.renderFloor20/21/22
    window.renderFloor20 = function() { renderPlaceholder(6);  };  // Neighborhood Hub
    window.renderFloor21 = function() { renderPlaceholder(10); };  // Night Market
    window.renderFloor22 = function() { renderPlaceholder(12); };  // Cinema

    // Patch the render dispatcher: it uses `else if(S.floor===N)(window.renderFloorN||renderFloorN)()`
    // Since 20/21/22 don't have `else if` branches, we intercept via requestAnimationFrame wrapping
    // or by patching the draw call. Easiest: wrap the draw function if exposed, else use a hook.
    // We'll hook via the existing tick/gameLoop pattern: patch S._tick or use RAF overlay.
    installRenderOverlay();
  }

  var _renderOverlayInstalled = false;
  function installRenderOverlay() {
    if (_renderOverlayInstalled) return;
    _renderOverlayInstalled = true;
    var S_ref = window._S;
    // Check every frame whether current floor needs our placeholder
    var _origRAF = window.requestAnimationFrame;
    var _pendingFrame = false;
    // We add our own independent overlay draw that runs alongside
    var lastFloor = -1;
    function onFrame() {
      S_ref = window._S;
      if (S_ref) {
        var f = S_ref.floor;
        // Placeholder floors
        if (f === 20 || f === 21 || f === 22) {
          var ctx2 = window.ctx || window._ctx;
          if (ctx2) {
            // These floors have no renderer in the main loop - we draw immediately
            var segId = f === 20 ? 6 : (f === 21 ? 10 : 12);
            renderPlaceholder(segId);
          }
        }
        // Ring map periodic refresh
        var now = Date.now();
        if (_ringMapDirty || (now - _lastRingRedraw > 2000)) {
          drawRingMap();
        }
        // Edge detection
        if (!_edgeTransitioning) {
          checkEdges(S_ref);
        }
        // Earth angle update (for ring map pulsing)
        _earthAngle += 0.0002;
      }
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);
  }

  // ─── Edge Detection — Continuous Walking ──────────────────────────────────
  var EDGE_THRESHOLD = 30; // px from edge to trigger
  var NEAR_EDGE_THRESHOLD = 150;

  function checkEdges(S_ref) {
    if (!S_ref) return;
    var target = S_ref.useVisitor ? S_ref.visitor : S_ref.echo;
    if (!target) return;

    var floorW = (window.FLOOR_SIZES && window.FLOOR_SIZES[S_ref.floor]) ? window.FLOOR_SIZES[S_ref.floor].w : 800;
    var isNearEdge = (target.x < NEAR_EDGE_THRESHOLD || target.x > floorW - NEAR_EDGE_THRESHOLD);
    updateEdgeLabels(isNearEdge);

    if (target.x <= EDGE_THRESHOLD) {
      // Walk to left edge → go to previous segment
      triggerEdgeTransition('left');
    } else if (target.x >= floorW - EDGE_THRESHOLD) {
      // Walk to right edge → go to next segment
      triggerEdgeTransition('right');
    }
  }

  function triggerEdgeTransition(direction) {
    if (_edgeTransitioning) return;
    _edgeTransitioning = true;

    var newSegId = direction === 'left' ? prevSeg(currentSegment) : nextSeg(currentSegment);
    var newFloor = floorForSeg(newSegId);
    var newFloorW = (window.FLOOR_SIZES && window.FLOOR_SIZES[newFloor]) ? window.FLOOR_SIZES[newFloor].w : 800;

    // Crossfade transition
    crossfade(function() {
      goToSegment(newSegId);

      // Reposition player at opposite edge
      var S_ref = window._S;
      if (S_ref) {
        var target = S_ref.useVisitor ? S_ref.visitor : S_ref.echo;
        var echo = S_ref.echo;
        var pixel = S_ref.pixel;
        var spawnX = direction === 'left' ? newFloorW - EDGE_THRESHOLD - 10 : EDGE_THRESHOLD + 10;
        if (target) { target.x = spawnX; }
        if (echo)   { echo.x = spawnX; echo.floor = newFloor; }
        if (pixel)  { pixel.x = spawnX + 20; pixel.floor = newFloor; }
      }

      setTimeout(function() { _edgeTransitioning = false; }, 800);
    });
  }

  // ─── Crossfade System ──────────────────────────────────────────────────────
  var _fadeEl;
  function ensureFadeEl() {
    if (_fadeEl) return;
    _fadeEl = document.createElement('div');
    _fadeEl.style.cssText = [
      'position:fixed','inset:0','z-index:9990',
      'background:rgba(0,0,0,0)',
      'pointer-events:none',
      'transition:background 0.3s',
    ].join(';');
    document.body.appendChild(_fadeEl);
  }

  function crossfade(fn) {
    ensureFadeEl();
    _fadeEl.style.background = 'rgba(0,0,0,0.9)';
    setTimeout(function() {
      try { fn(); } catch(e) { console.error('[RingEngine] crossfade fn error:', e); }
      setTimeout(function() {
        _fadeEl.style.background = 'rgba(0,0,0,0)';
      }, 100);
    }, 300);
    // Safety: force-clear fade after 2 seconds no matter what
    setTimeout(function() {
      if (_fadeEl) _fadeEl.style.background = 'rgba(0,0,0,0)';
    }, 2000);
  }

  // ─── Override Elevator Button ──────────────────────────────────────────────
  function overrideElevatorButton() {
    // Find any button that opens the elevator overlay and redirect it
    // The elevator-overlay is used by showElevator() / the elevator button in-game
    // We override window.showElevator if it exists, and also watch for clicks on elevator triggers
    var origShowElevator = window.showElevator;
    window.showElevator = function() {
      showRingSelector();
    };

    // Hide elevator overlay permanently
    var elev = document.getElementById('elevator-overlay');
    if (elev) {
      elev.style.setProperty('display', 'none', 'important');
      // Intercept any attempt to show it
      var origDisplay = Object.getOwnPropertyDescriptor(elev.style, 'display');
      // Use MutationObserver to keep it hidden
      var obs = new MutationObserver(function() {
        if (elev.classList.contains('show')) {
          elev.classList.remove('show');
          showRingSelector();
        }
      });
      obs.observe(elev, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ─── Ring Segment Selector (replaces elevator panel) ──────────────────────
  var _selectorEl;
  function showRingSelector() {
    if (_selectorEl && _selectorEl.parentNode) {
      _selectorEl.remove();
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:7500',
      'background:rgba(0,0,0,0.88)',
      'display:flex','align-items:center','justify-content:center',
      'backdrop-filter:blur(4px)',
    ].join(';');
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    var panel = document.createElement('div');
    panel.style.cssText = [
      'background:rgba(10,8,28,0.97)',
      'border:2px solid rgba(100,80,200,0.6)',
      'border-radius:16px',
      'padding:20px',
      'max-width:480px','width:90%',
      'max-height:80vh','overflow-y:auto',
    ].join(';');

    var title = document.createElement('div');
    title.style.cssText = 'font-size:16px;color:#c080ff;font-weight:bold;margin-bottom:14px;text-align:center;font-family:monospace;letter-spacing:2px';
    title.textContent = '🔮 RING STATION — SELECT SEGMENT';
    panel.appendChild(title);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';

    SEGMENTS.forEach(function(seg) {
      var btn = document.createElement('button');
      var isCurrent = seg.id === currentSegment;
      btn.style.cssText = [
        'display:flex','align-items:center','gap:10px',
        'padding:10px 14px',
        'background:' + (isCurrent ? 'rgba(155,89,182,0.2)' : 'rgba(20,18,40,0.8)'),
        'border:2px solid ' + (isCurrent ? seg.glow : 'rgba(80,70,120,0.4)'),
        'border-radius:10px',
        'color:' + (isCurrent ? seg.glow : '#ccccdd'),
        'cursor:pointer',
        'font-family:monospace','font-size:12px',
        'text-align:left',
        'transition:all 0.2s',
        isCurrent ? 'box-shadow:0 0 12px ' + seg.glow + '44' : '',
      ].join(';');
      btn.innerHTML = '<span style="font-size:18px">' + seg.icon + '</span><div><div style="font-weight:bold">' + seg.name + '</div><div style="font-size:10px;opacity:0.6">Segment ' + seg.id + (seg.floor ? ' · F'+seg.floor : ' · New') + '</div></div>';
      btn.addEventListener('click', function() {
        overlay.remove();
        goToSegment(seg.id);
      });
      btn.addEventListener('mouseenter', function() {
        btn.style.borderColor = seg.glow;
        btn.style.background = 'rgba(40,30,80,0.8)';
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.borderColor = isCurrent ? seg.glow : 'rgba(80,70,120,0.4)';
        btn.style.background = isCurrent ? 'rgba(155,89,182,0.2)' : 'rgba(20,18,40,0.8)';
      });
      grid.appendChild(btn);
    });

    panel.appendChild(grid);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    _selectorEl = overlay;
  }

  // ─── Hook: double-click ring map → open selector ──────────────────────────
  function addRingMapDoubleClick() {
    if (!ringCanvas) return;
    ringCanvas.addEventListener('dblclick', function() {
      showRingSelector();
    });
    // Tooltip
    ringCanvas.title = 'Click segment to travel · Double-click for list';
  }

  // ─── FLOOR_SIZES: add new segment floors ──────────────────────────────────
  function patchFloorSizes() {
    var fs = window.FLOOR_SIZES;
    if (!fs) return;
    fs[20] = { w: 3000, h: 1500 }; // Neighborhood Hub
    fs[21] = { w: 3000, h: 1500 }; // Night Market
    fs[22] = { w: 3000, h: 1600 }; // Cinema
  }

  // ─── FLOOR_NAMES: add new segment floors ──────────────────────────────────
  function patchFloorNames() {
    var fn = window.FLOOR_NAMES;
    if (typeof fn === 'undefined') { window.FLOOR_NAMES = {}; fn = window.FLOOR_NAMES; }
    fn[20] = 'Neighborhood Hub 🏘️';
    fn[21] = 'Night Market 🌙';
    fn[22] = 'The Cinema 🎬';
  }

  // ─── Sync current segment from S.floor on init ───────────────────────────
  function syncFromCurrentFloor() {
    var S_ref = window._S;
    if (!S_ref) return;
    var f = S_ref.floor || 1;
    var seg = FLOOR_TO_SEGMENT[f] || NEW_FLOOR_TO_SEGMENT[f];
    if (seg) currentSegment = seg;
    else currentSegment = 1;
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  waitReady(function() {
    console.log('[RingEngine] 🔮 Initialising ring navigation system...');

    patchFloorSizes();
    patchFloorNames();
    syncFromCurrentFloor();
    createRingMap();
    createEdgeLabels();
    updateHUD();
    patchRenderLoop();

    // Observatory Earth — try now, retry if renderFloor2 not yet defined
    var attempts = 0;
    function tryPatchObs() {
      if (!patchObservatory()) {
        if (attempts++ < 30) setTimeout(tryPatchObs, 500);
      }
    }
    tryPatchObs();

    addRingMapDoubleClick();

    console.log('[RingEngine] ✅ Ring engine ready. Segments mapped:', SEGMENTS.length);
    console.log('[RingEngine] Current segment:', currentSegment, segById(currentSegment).name);
  });

})();
