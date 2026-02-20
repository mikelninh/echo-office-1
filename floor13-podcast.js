(function PodcastStudio() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // CONSTANTS / PALETTE
  // Floor 13 — Podcast Studio (FireRed/LeafGreen design system)
  // ═══════════════════════════════════════════════════════════════════
  var P = {
    deepDark:   '#0d0d1a',  // walls, ceiling
    floorDark:  '#1a1228',  // floor
    midPurple:  '#2d1f3d',  // foam panels, desks
    red:        '#c0392b',  // ON AIR, recording
    amber:      '#f39c12',  // studio lamps
    teal:       '#4ecdc4',  // equipment lights, screens
    black:      '#000000',  // outline (ALWAYS this exact black)
    white:      '#ffffff',
    grey:       '#888888',
    darkGrey:   '#333333',
    silver:     '#c0c0c0',
    neonRed:    '#ff6b6b',  // ECHO FM neon highlight
  };

  var FW = 2000, FH = 1200;

  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  var voltDialogueIdx = 0;
  var voltDialogueLines = [
    'Keep your levels below the red. Always.',
    'Every great episode starts with silence.',
    "I've been here since before the station had floors."
  ];

  // Dust mote particles (amber, slow rise)
  var dustMotes = [
    { x: 420, y: 180, vy: -0.18, vx: 0.04, alpha: 0.7 },
    { x: 460, y: 220, vy: -0.13, vx: -0.05, alpha: 0.5 },
    { x: 510, y: 150, vy: -0.20, vx: 0.03, alpha: 0.6 },
    { x: 380, y: 200, vy: -0.15, vx: 0.06, alpha: 0.4 },
  ];
  // Lamp positions for dust origin
  var LAMP_X = [400, 480];

  // Coffee steam particles
  var steamParticles = [];
  var lastSteamTime = 0;

  // Waveform animation
  var waveOffset = 0;
  var lastWaveUpdate = 0;

  // ECHO FM neon pulse
  var neonAlpha = 0.85;
  var neonDir = 1;

  // ON AIR blink
  var onAirBlink = true; // true = visible half of blink

  // Track names for vinyl
  var TRACKS = [
    'Synthwave Station 4',
    'Lo-Fi Orbit',
    'Deep Space Groove',
    'Midnight Signal',
    'Analogue Drift',
    'Satellite Soul',
    'Echo Chamber Sessions',
    'Subfrequency Blues'
  ];

  // Vinyl sleeve seeded colors (stable, not random each frame)
  var VINYL_COLORS = ['#7b2d8b', '#2d6a8b', '#8b5c2d'];

  // ═══════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════

  function ctx() { return window.ctx; }

  function drawOutlineRect(x, y, w, h) {
    var c = ctx();
    c.fillStyle = P.black;
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
  }

  function drawPanel(x, y, w, h) {
    var c = ctx();
    c.fillStyle = '#FFFFFF';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#2a2a3a';
    c.fillRect(x + 2, y + 2, w - 4, h - 4);
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 4, y + 4, w - 8, h - 8);
  }

  function drawAcousticFoamTile(x, y) {
    var c = ctx();
    // 1px black outline first
    c.fillStyle = P.black;
    c.fillRect(x - 1, y - 1, 18, 18);
    // Base
    c.fillStyle = P.midPurple;
    c.fillRect(x, y, 16, 16);
    // Diagonal chevron highlight (lighter mid-purple)
    c.fillStyle = '#3d2f4d';
    // Draw 45° diagonal lines (2px wide)
    for (var d = -16; d <= 16; d += 6) {
      c.beginPath();
      // line from (x + max(0, d), y + max(0, -d)) to (x + min(16, 16+d), y + min(16, 16-d))
      var x1 = x + Math.max(0, d);
      var y1 = y + Math.max(0, -d);
      var x2 = x + Math.min(16, 16 + d);
      var y2 = y + Math.min(16, 16 - d);
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = '#3d2f4d';
      c.lineWidth = 1;
      c.stroke();
    }
    // Cool shadow bottom-right pixel (FireRed warm/cool rule)
    c.fillStyle = '#1e1028';
    c.fillRect(x + 12, y + 12, 4, 4);
    // Warm highlight top-left pixel
    c.fillStyle = '#3d2f4d';
    c.fillRect(x, y, 4, 4);
  }

  function drawFoamGrid(startX, startY, cols, rows) {
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        drawAcousticFoamTile(startX + col * 18, startY + row * 18);
      }
    }
  }

  function showDialogue(name, lines) {
    // Use FireRed anatomy dialogue if DialogueSystem available, otherwise showThought
    if (typeof window.DialogueSystem !== 'undefined' && window.DialogueSystem.open) {
      window.DialogueSystem.open(name, lines);
    } else if (typeof showThought === 'function') {
      showThought(lines[0] || '');
    } else {
      console.log('[Floor13] dialogue:', name, lines);
    }
  }

  function thought(text) {
    if (typeof showThought === 'function') showThought(text);
    else console.log('[Floor13]', text);
  }

  function earn(n, reason) {
    if (window.Coins && typeof window.Coins.earn === 'function') window.Coins.earn(n, reason || 'podcast');
    else console.log('[Floor13] +' + n + '◈ (' + reason + ')');
  }

  function notif(text) {
    if (typeof showNotification === 'function') showNotification(text);
    else console.log('[Floor13] notif:', text);
  }

  function getS() { return window.S || {}; }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Recording Booth (glass partition)
  // ═══════════════════════════════════════════════════════════════════
  function drawRecordingBooth(c) {
    var bx = 120, by = 250, bw = 600, bh = 400;

    // Back of booth: foam panels (3×3 grid)
    drawFoamGrid(bx + 20, by + 20, 3, 3);

    // Glass partition — semi-transparent teal fill
    c.fillStyle = 'rgba(78,205,196,0.15)';
    c.fillRect(bx, by, bw, bh);

    // Glass border: 2px teal
    c.strokeStyle = P.teal;
    c.lineWidth = 2;
    c.strokeRect(bx, by, bw, bh);

    // Corner highlights (warm top-left)
    c.fillStyle = 'rgba(78,205,196,0.3)';
    c.fillRect(bx, by, 4, bh);     // left edge
    c.fillRect(bx, by, bw, 4);     // top edge
    // Cool shadows (bottom-right)
    c.fillStyle = 'rgba(14,26,42,0.4)';
    c.fillRect(bx + bw - 4, by, 4, bh);  // right edge
    c.fillRect(bx, by + bh - 4, bw, 4);  // bottom edge

    // Label: "RECORDING BOOTH"
    c.font = '8px "Press Start 2P", monospace';
    c.fillStyle = P.teal;
    c.fillText('RECORDING BOOTH', bx + 8, by + bh - 12);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Microphone (32×48, hero object)
  // ═══════════════════════════════════════════════════════════════════
  function drawMicrophone(x, y) {
    var c = ctx();
    // Outline first (FireRed rule)
    drawOutlineRect(x, y, 32, 48);

    // Stand base (dark grey, 2px wide)
    c.fillStyle = P.darkGrey;
    c.fillRect(x + 14, y + 40, 4, 8);
    c.fillRect(x + 8, y + 44, 16, 4);

    // Shock mount arms
    c.fillStyle = P.silver;
    c.fillRect(x + 4, y + 20, 6, 2);   // left arm
    c.fillRect(x + 22, y + 20, 6, 2);  // right arm
    c.fillRect(x + 2, y + 16, 2, 8);   // left strut
    c.fillRect(x + 28, y + 16, 2, 8);  // right strut

    // Mic body (black)
    c.fillStyle = '#111111';
    c.fillRect(x + 8, y + 4, 16, 36);

    // Grille (silver with stipple bright pixels)
    c.fillStyle = P.silver;
    c.fillRect(x + 9, y + 5, 14, 20);

    // Stipple bright pixels on grille (condenser mic texture)
    c.fillStyle = '#eeeeee';
    var stipple = [[10,7],[14,9],[18,7],[12,12],[16,14],[11,17],[15,11],[19,13]];
    for (var i = 0; i < stipple.length; i++) {
      c.fillRect(x + stipple[i][0] - 9 + 9, y + stipple[i][1], 2, 2);
    }

    // Warm highlight top-left of grille
    c.fillStyle = '#e8e8e8';
    c.fillRect(x + 9, y + 5, 3, 6);
    // Cool shadow bottom-right
    c.fillStyle = '#9a9a9a';
    c.fillRect(x + 20, y + 22, 3, 3);

    // Red recording indicator on body (small LED dot)
    var S = getS();
    c.fillStyle = S.podcastRecording ? P.red : '#555555';
    c.fillRect(x + 14, y + 28, 4, 4);
    drawOutlineRect(x + 14, y + 28, 4, 4);

    // "INTERACT" label below
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = '#888888';
    c.fillText('[E]', x + 8, y + 56);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: ON AIR sign (48×16)
  // ═══════════════════════════════════════════════════════════════════
  function drawOnAirSign(x, y) {
    var c = ctx();
    var S = getS();
    var recording = S.podcastRecording || false;
    var visible = recording ? onAirBlink : true;

    // Outline
    drawOutlineRect(x, y, 48, 16);

    if (recording && visible) {
      // ON state: red bg, white text
      c.fillStyle = P.red;
      c.fillRect(x, y, 48, 16);
      c.font = '6px "Press Start 2P", monospace';
      c.fillStyle = P.white;
      c.fillText('ON AIR', x + 5, y + 11);
    } else {
      // OFF state: dark bg, grey text
      c.fillStyle = '#2a2a2a';
      c.fillRect(x, y, 48, 16);
      c.font = '6px "Press Start 2P", monospace';
      c.fillStyle = '#666666';
      c.fillText('ON AIR', x + 5, y + 11);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Headphones rack (16×32)
  // ═══════════════════════════════════════════════════════════════════
  function drawHeadphonesRack(x, y) {
    var c = ctx();
    // Wall hook
    drawOutlineRect(x, y, 16, 32);
    c.fillStyle = P.midPurple;
    c.fillRect(x, y, 16, 32);

    // Hook peg
    c.fillStyle = P.silver;
    c.fillRect(x + 6, y + 4, 4, 12);
    // Hook tip
    c.fillRect(x + 6, y + 14, 8, 2);

    // Headphone arc (silver frame)
    c.strokeStyle = P.silver;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + 8, y + 18, 6, Math.PI, 0, false);
    c.stroke();

    // Left ear pad (dark grey circle)
    c.fillStyle = '#444444';
    c.fillRect(x + 1, y + 18, 5, 7);
    drawOutlineRect(x + 1, y + 18, 5, 7);

    // Right ear pad
    c.fillStyle = '#444444';
    c.fillRect(x + 10, y + 18, 5, 7);
    drawOutlineRect(x + 10, y + 18, 5, 7);

    // Warm highlight on arc
    c.strokeStyle = '#d8d8d8';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 8, y + 18, 5, Math.PI, Math.PI * 1.5, false);
    c.stroke();

    // Label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = '#888888';
    c.fillText('[E]', x - 1, y + 38);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Control Desk (96×32, 3 tiles wide)
  // ═══════════════════════════════════════════════════════════════════
  function drawControlDesk(x, y) {
    var c = ctx();
    // Outline
    drawOutlineRect(x, y, 96, 32);

    // Desk surface (dark mid-purple)
    c.fillStyle = P.midPurple;
    c.fillRect(x, y, 96, 32);

    // Warm highlight (top edge)
    c.fillStyle = '#3d2f4d';
    c.fillRect(x, y, 96, 3);
    // Cool shadow (bottom edge)
    c.fillStyle = '#1e1028';
    c.fillRect(x, y + 29, 96, 3);

    // Knobs (small 4px circles — rows of them)
    var knobColors = [P.teal, '#8877cc', P.amber, P.teal, '#8877cc', P.amber];
    for (var k = 0; k < 6; k++) {
      var kx = x + 4 + k * 14;
      var ky = y + 8;
      // Black outline
      c.fillStyle = P.black;
      c.fillRect(kx - 1, ky - 1, 6, 6);
      c.fillStyle = knobColors[k];
      c.fillRect(kx, ky, 4, 4);
      // Highlight pixel
      c.fillStyle = '#ffffff';
      c.fillRect(kx, ky, 1, 1);
    }

    // Faders (vertical lines with handle pixel)
    var faderXs = [x + 6, x + 20, x + 34];
    for (var f = 0; f < faderXs.length; f++) {
      var fx = faderXs[f];
      // Track
      c.fillStyle = '#1a1a2e';
      c.fillRect(fx, y + 16, 2, 14);
      // Handle (highlight)
      c.fillStyle = P.silver;
      c.fillRect(fx - 1, y + 20 + f * 2, 4, 3);
    }

    // Teal accent light strip at bottom of desk
    c.fillStyle = P.teal;
    c.fillRect(x + 4, y + 28, 88, 2);
    // Subtle glow: lighter teal pixels
    c.fillStyle = '#7eeee8';
    c.fillRect(x + 20, y + 28, 20, 1);

    // Monitor speakers (two, 12×14 each, on top of desk surface)
    drawMonitorSpeaker(x + 4, y - 16);
    drawMonitorSpeaker(x + 80, y - 16);
  }

  function drawMonitorSpeaker(x, y) {
    var c = ctx();
    drawOutlineRect(x, y, 12, 14);
    c.fillStyle = '#1a1a2e';
    c.fillRect(x, y, 12, 14);
    // Speaker cone
    c.fillStyle = '#333344';
    c.fillRect(x + 2, y + 3, 8, 8);
    // Dust cap (centre pixel)
    c.fillStyle = P.teal;
    c.fillRect(x + 5, y + 6, 2, 2);
    // Warm highlight
    c.fillStyle = '#2a2a3e';
    c.fillRect(x, y, 3, 3);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Waveform display (80×48)
  // ═══════════════════════════════════════════════════════════════════
  function drawWaveformDisplay(x, y) {
    var c = ctx();
    // Screen outline
    drawOutlineRect(x, y, 80, 48);
    c.fillStyle = '#0a0a18';
    c.fillRect(x, y, 80, 48);

    // Teal border (monitor bezel)
    c.strokeStyle = P.teal;
    c.lineWidth = 1;
    c.strokeRect(x + 2, y + 2, 76, 44);

    // Screen area inner
    c.fillStyle = '#04080f';
    c.fillRect(x + 3, y + 3, 74, 42);

    // Animated waveform (sine wave, 3-frame loop via waveOffset)
    c.strokeStyle = P.teal;
    c.lineWidth = 1;
    c.beginPath();
    var first = true;
    for (var px = 0; px < 74; px++) {
      var py2 = y + 24 + Math.round(Math.sin((px + waveOffset) * 0.18) * 12);
      if (first) { c.moveTo(x + 3 + px, py2); first = false; }
      else c.lineTo(x + 3 + px, py2);
    }
    c.stroke();

    // Second fainter wave
    c.strokeStyle = 'rgba(78,205,196,0.35)';
    c.beginPath();
    first = true;
    for (var px2 = 0; px2 < 74; px2++) {
      var py3 = y + 24 + Math.round(Math.sin((px2 + waveOffset * 1.5 + 8) * 0.12) * 7);
      if (first) { c.moveTo(x + 3 + px2, py3); first = false; }
      else c.lineTo(x + 3 + px2, py3);
    }
    c.stroke();

    // Label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = P.teal;
    c.fillText('LIVE', x + 3, y + 44);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Coffee Machine (16×24)
  // ═══════════════════════════════════════════════════════════════════
  function drawCoffeeMachine(x, y) {
    var c = ctx();
    drawOutlineRect(x, y, 16, 24);

    // Body (dark)
    c.fillStyle = '#1a1228';
    c.fillRect(x, y, 16, 24);

    // Front plate (slightly lighter)
    c.fillStyle = '#2a2038';
    c.fillRect(x + 1, y + 2, 14, 20);

    // Red button
    c.fillStyle = P.red;
    c.fillRect(x + 6, y + 14, 4, 4);
    drawOutlineRect(x + 6, y + 14, 4, 4);

    // Portafilter group
    c.fillStyle = P.darkGrey;
    c.fillRect(x + 4, y + 18, 8, 4);

    // Nozzle
    c.fillStyle = P.silver;
    c.fillRect(x + 7, y + 20, 2, 4);

    // Warm highlight
    c.fillStyle = '#3a3050';
    c.fillRect(x + 1, y + 2, 3, 6);

    // Steam particles (from state)
    var now = Date.now();
    if (now - lastSteamTime > 2000) {
      steamParticles.push({ x: x + 8, y: y, life: 1.0, vx: (Math.random() - 0.5) * 0.4 });
      steamParticles = steamParticles.filter(function(p) { return p.life > 0; });
      lastSteamTime = now;
    }
    for (var s = 0; s < steamParticles.length; s++) {
      var sp = steamParticles[s];
      c.fillStyle = 'rgba(200,200,220,' + (sp.life * 0.5) + ')';
      c.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
    }

    // Label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = '#888';
    c.fillText('[E]', x - 1, y + 32);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Vinyl Shelf (48×32, 3 record slots)
  // ═══════════════════════════════════════════════════════════════════
  function drawVinylShelf(x, y) {
    var c = ctx();
    drawOutlineRect(x, y, 48, 32);

    // Shelf body
    c.fillStyle = P.midPurple;
    c.fillRect(x, y, 48, 32);

    // Shelf plank at bottom
    c.fillStyle = '#1e1028';
    c.fillRect(x, y + 28, 48, 4);

    // Three vinyl sleeves (14×14 each with seeded colors)
    for (var v = 0; v < 3; v++) {
      var vx = x + 2 + v * 16;
      var vy = y + 6;
      drawOutlineRect(vx, vy, 14, 14);
      c.fillStyle = VINYL_COLORS[v];
      c.fillRect(vx, vy, 14, 14);
      // Warm highlight top-left
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(vx, vy, 5, 3);
      // Cool shadow bottom-right
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(vx + 9, vy + 11, 5, 3);
      // Label strip (white)
      c.fillStyle = '#e8e8e8';
      c.fillRect(vx + 3, vy + 3, 8, 8);
      // Record hole
      c.fillStyle = '#0a0a0a';
      c.fillRect(vx + 6, vy + 6, 2, 2);
    }

    // Label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = P.teal;
    c.fillText('[E]', x + 14, y + 40);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Guest Chair (16×24)
  // ═══════════════════════════════════════════════════════════════════
  function drawGuestChair(x, y) {
    var c = ctx();
    drawOutlineRect(x, y, 16, 24);

    // Seat (slightly lighter than control area)
    c.fillStyle = '#3a2a50';
    c.fillRect(x, y + 8, 16, 8);
    // Back
    c.fillStyle = '#2d1f3d';
    c.fillRect(x + 2, y, 12, 10);
    // Legs
    c.fillStyle = P.darkGrey;
    c.fillRect(x + 1, y + 16, 3, 8);
    c.fillRect(x + 12, y + 16, 3, 8);

    // Warm highlight on seat
    c.fillStyle = '#4a3a60';
    c.fillRect(x, y + 8, 4, 2);
    // Cool shadow
    c.fillStyle = '#1e1028';
    c.fillRect(x + 12, y + 14, 4, 2);

    // Label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = '#888';
    c.fillText('[E]', x - 1, y + 32);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: ECHO FM Neon Sign
  // ═══════════════════════════════════════════════════════════════════
  function drawEchoFMSign(x, y) {
    var c = ctx();
    c.save();
    c.globalAlpha = neonAlpha;

    // Shadow text (+1 x, -1 y) in neon red highlight
    c.font = '12px "Press Start 2P", monospace';
    c.fillStyle = P.neonRed;
    c.fillText('ECHO FM', x + 1, y - 1);

    // Main text in warning red
    c.fillStyle = P.red;
    c.fillText('ECHO FM', x, y);

    c.restore();
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: VOLT NPC (16×24, podcast engineer)
  // ═══════════════════════════════════════════════════════════════════
  function drawVolt(x, y) {
    var c = ctx();
    var bobOffset = Math.floor(Date.now() / 600) % 2 === 1 ? -1 : 0;
    var yy = y + bobOffset;

    // 1px black outline (entire sprite bounding box)
    c.fillStyle = P.black;
    c.fillRect(x - 1, yy - 1, 18, 26);

    // ── Head (8×8) ──
    var hx = x + 4, hy = yy;
    c.fillStyle = '#c8a07a'; // skin mid
    c.fillRect(hx, hy, 8, 8);
    // Warm highlight (top-left)
    c.fillStyle = '#d8b08a';
    c.fillRect(hx, hy, 3, 3);
    // Cool shadow (bottom-right)
    c.fillStyle = '#a07050';
    c.fillRect(hx + 5, hy + 5, 3, 3);

    // Eyes
    c.fillStyle = '#1a1a2e';
    c.fillRect(hx + 1, hy + 3, 2, 2);
    c.fillRect(hx + 5, hy + 3, 2, 2);
    // Teal screen glow on face
    c.fillStyle = 'rgba(78,205,196,0.25)';
    c.fillRect(hx, hy + 2, 8, 6);

    // ── Headphones on head ──
    // Arc (grey, over the head)
    c.strokeStyle = '#aaaaaa';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + 8, hy + 2, 6, Math.PI, 0, false);
    c.stroke();
    // Left ear pad
    c.fillStyle = '#666666';
    c.fillRect(x + 1, hy + 1, 4, 5);
    // Right ear pad
    c.fillRect(x + 11, hy + 1, 4, 5);

    // ── Body / Hoodie (16×12) ──
    var bx = x, by = yy + 8;
    // Body dark hoodie
    c.fillStyle = '#1a1a2e';
    c.fillRect(bx, by, 16, 12);
    // Arms (slightly darker, #333)
    c.fillStyle = P.darkGrey;
    c.fillRect(bx, by, 3, 10);      // left arm
    c.fillRect(bx + 13, by, 3, 10); // right arm
    // Hoodie pocket
    c.fillStyle = '#111122';
    c.fillRect(bx + 5, by + 6, 6, 5);
    // Warm highlight on shoulders
    c.fillStyle = '#2a2a3e';
    c.fillRect(bx, by, 16, 2);

    // ── Legs (16×4) ──
    var lx = x, ly = yy + 20;
    c.fillStyle = '#222233';
    c.fillRect(lx + 2, ly, 5, 4);
    c.fillRect(lx + 9, ly, 5, 4);

    // Name label
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = '#FFDE00';
    c.fillText('VOLT', x - 1, yy - 5);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAW: Studio Lamp (amber warm light)
  // ═══════════════════════════════════════════════════════════════════
  function drawStudioLamp(x, y) {
    var c = ctx();
    // Stand
    c.fillStyle = P.darkGrey;
    c.fillRect(x + 6, y + 16, 4, 20);
    c.fillRect(x, y + 32, 16, 4);

    // Lamp shade (triangle-ish)
    drawOutlineRect(x, y, 16, 16);
    c.fillStyle = P.amber;
    c.fillRect(x, y, 16, 16);
    // Warm top
    c.fillStyle = '#f7c060';
    c.fillRect(x, y, 8, 6);
    // Cool shadow bottom
    c.fillStyle = '#c07808';
    c.fillRect(x + 8, y + 10, 8, 6);

    // Amber light pool on floor (no shadowBlur — just a tinted rect)
    c.fillStyle = 'rgba(243,156,18,0.06)';
    c.fillRect(x - 20, y + 36, 56, 40);
  }

  // ═══════════════════════════════════════════════════════════════════
  // AMBIENT: Dust motes update + draw
  // ═══════════════════════════════════════════════════════════════════
  function updateAndDrawDustMotes() {
    var c = ctx();
    for (var i = 0; i < dustMotes.length; i++) {
      var m = dustMotes[i];
      m.y += m.vy;
      m.x += m.vx;
      // Reset if floated off top
      if (m.y < 80) {
        m.y = 220 + Math.random() * 60;
        m.x = LAMP_X[i % LAMP_X.length] + (Math.random() - 0.5) * 40;
      }
      c.fillStyle = 'rgba(243,156,18,' + m.alpha + ')';
      c.fillRect(Math.round(m.x), Math.round(m.y), 2, 2);
    }

    // Update steam particles
    for (var j = steamParticles.length - 1; j >= 0; j--) {
      var sp = steamParticles[j];
      sp.y -= 0.3;
      sp.x += sp.vx;
      sp.life -= 0.008;
      if (sp.life <= 0) steamParticles.splice(j, 1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ANIMATION TICK (called each frame via RAF/game loop hook)
  // ═══════════════════════════════════════════════════════════════════
  function tickAnimations() {
    var now = Date.now();

    // Waveform: update offset every 100ms
    if (now - lastWaveUpdate > 100) {
      waveOffset = (waveOffset + 3) % 360;
      lastWaveUpdate = now;
    }

    // ECHO FM neon pulse (0.7→1.0→0.7, 2s cycle)
    var t = (now % 2000) / 2000;
    neonAlpha = 0.7 + 0.3 * Math.abs(Math.sin(t * Math.PI));

    // ON AIR blink: 500ms on, 500ms off
    onAirBlink = Math.floor(now / 500) % 2 === 0;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN RENDER FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  function renderFloor13() {
    var c = ctx();
    if (!c) return;
    c.imageSmoothingEnabled = false;

    tickAnimations();

    // ── Floor tiles ──
    // Base: deep dark
    c.fillStyle = P.deepDark;
    c.fillRect(0, 0, FW, FH);

    // Floor area (slightly lighter dark)
    c.fillStyle = P.floorDark;
    c.fillRect(0, 100, FW, FH - 150);

    // Subtle tile grid on floor (16px grid, very faint)
    c.strokeStyle = 'rgba(45,31,61,0.3)';
    c.lineWidth = 1;
    for (var tx = 0; tx < FW; tx += 16) {
      c.beginPath();
      c.moveTo(tx, 100);
      c.lineTo(tx, FH - 50);
      c.stroke();
    }
    for (var ty = 100; ty < FH - 50; ty += 16) {
      c.beginPath();
      c.moveTo(0, ty);
      c.lineTo(FW, ty);
      c.stroke();
    }

    // ── Walls ──
    // Ceiling strip
    c.fillStyle = P.deepDark;
    c.fillRect(0, 0, FW, 100);
    // Floor base strip
    c.fillRect(0, FH - 50, FW, 50);
    // Left wall
    c.fillRect(0, 0, 30, FH);
    // Right wall
    c.fillRect(FW - 30, 0, 30, FH);

    // Wall divider lines
    c.fillStyle = '#1a1228';
    c.fillRect(0, 96, FW, 4);
    c.fillRect(0, FH - 54, FW, 4);

    // ── Acoustic foam panels — left wall (3×3) ──
    drawFoamGrid(40, 120, 3, 3);
    // ── Acoustic foam panels — right wall (3×3) ──
    drawFoamGrid(FW - 100, 120, 3, 3);
    // ── Acoustic foam panels — back wall center (3×3) ──
    drawFoamGrid(FW / 2 - 30, 105, 3, 3);

    // ── Studio lamps ──
    drawStudioLamp(380, 105);
    drawStudioLamp(480, 105);

    // ── Recording booth (glass, includes inner foam) ──
    drawRecordingBooth(c);

    // ── ON AIR sign (above booth) ──
    drawOnAirSign(320, 235);

    // ── Microphone (inside booth, hero object) ──
    drawMicrophone(270, 320);

    // ── Guest chair (inside booth) ──
    drawGuestChair(440, 400);

    // ── Headphones rack (left wall) ──
    drawHeadphonesRack(50, 300);

    // ── Control desk (right area) ──
    drawControlDesk(900, 380);

    // ── Waveform display (on control desk) ──
    drawWaveformDisplay(910, 310);

    // ── ECHO FM neon sign (above control desk) ──
    drawEchoFMSign(920, 295);

    // ── Vinyl shelf (back wall) ──
    drawVinylShelf(800, 130);

    // ── Coffee machine (corner) ──
    drawCoffeeMachine(52, 480);

    // ── VOLT NPC (at control desk) ──
    drawVolt(870, 330);

    // ── Ambient: dust motes, steam ──
    updateAndDrawDustMotes();

    // ── Floor label ──
    c.font = '6px "Press Start 2P", monospace';
    c.fillStyle = 'rgba(78,205,196,0.3)';
    c.fillText('F13 · PODCAST STUDIO', FW / 2 - 100, FH - 20);
  }

  // Register on window
  window.renderFloor13 = renderFloor13;

  // ═══════════════════════════════════════════════════════════════════
  // INTERACTION HANDLER
  // ═══════════════════════════════════════════════════════════════════
  function handlePodcastInteraction(id) {
    var S = getS();

    switch (id) {
      case 'podcast_mic': {
        if (S.podcastRecording) {
          thought('Already recording... patience!');
          return true;
        }
        S.podcastRecording = true;
        thought('🎙️ Recording started! ON AIR...');
        notif('🎙️ ECHO FM — ON AIR');
        setTimeout(function() {
          S.podcastRecording = false;
          earn(10, 'podcast_record');
          thought('🎙️ Recording complete! +10◈');
          notif('✅ Podcast recorded! +10◈');
          if (typeof window.companionEvent === 'function') {
            window.companionEvent('podcast_record', {});
          }
        }, 5000);
        return true;
      }

      case 'podcast_headphones': {
        thought('You slip on the headphones. The studio goes quiet. Just you and the signal.');
        if (typeof window.companionEvent === 'function') {
          window.companionEvent('headphones_on', { mood: 'focused' });
        }
        return true;
      }

      case 'podcast_vinyl': {
        var track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
        S.currentBgTrack = track;
        thought('Now playing: ' + track + ' 🎵');
        notif('🎵 ' + track);
        return true;
      }

      case 'podcast_coffee': {
        thought('Double espresso, zero-g style. ☕');
        earn(2, 'espresso');
        S.speedBuff = { mult: 1.3, until: Date.now() + 30000 };
        notif('☕ +2◈ | Speed boost: 30s');
        return true;
      }

      case 'podcast_chair': {
        if (S.echo) S.echo.sitting = true;
        thought('The studio smells like old coffee and new ideas.');
        setTimeout(function() {
          if (S.echo) S.echo.sitting = false;
        }, 2000);
        return true;
      }

      case 'podcast_waveform':
      case 'podcast_monitor': {
        thought('ECHO FM — On air 247 days. 1,847 listeners. Signal: strong.');
        return true;
      }

      case 'podcast_volt':
      case 'volt': {
        thought('VOLT: "' + voltDialogueLines[voltDialogueIdx] + '"');
        voltDialogueIdx = (voltDialogueIdx + 1) % voltDialogueLines.length;
        return true;
      }

      default:
        return false;
    }
  }

  // Patch window.interact (safe chain pattern)
  function patchInteract() {
    if (typeof window.interact !== 'function') {
      // Not available yet — retry
      setTimeout(patchInteract, 500);
      return;
    }
    // Avoid double-patching
    if (window._podcastInteractPatched) return;
    window._podcastInteractPatched = true;

    var _orig = window.interact;
    window.interact = function(id) {
      if (handlePodcastInteraction(id)) return;
      return _orig.apply(this, arguments);
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FLOOR REGISTRATION
  // ═══════════════════════════════════════════════════════════════════
  function registerFloor() {
    // Register floor size
    if (typeof window.FLOOR_SIZES !== 'undefined') {
      window.FLOOR_SIZES[13] = { w: FW, h: FH };
    } else {
      // Retry if FLOOR_SIZES not yet defined
      setTimeout(registerFloor, 200);
      return;
    }

    // Register floor name
    if (typeof window.FLOOR_NAMES !== 'undefined' && window.FLOOR_NAMES) {
      window.FLOOR_NAMES[13] = 'Podcast Studio 🎙️';
    }

    // Patch the render dispatch if needed (add floor 13 to the if-else chain)
    // The game uses: else if(S.floor===12)(window.renderFloor12||renderFloor12)();
    // We hook via window.renderFloor13 which is already set above.
    // The game loop checks window.renderFloor13 if S.floor===13 is reached,
    // but since it's an if-else chain we need to patch it.
    // Safe approach: patch the requestAnimationFrame / game draw via a secondary hook.
    patchRenderDispatch();
  }

  // Patch the main render dispatch to call renderFloor13 when on floor 13.
  //
  // The game's render() function has an if/else-if chain for floors 1-12.
  // Floor 13 is simply not in that chain. The cleanest fix:
  // wrap window.renderFloor12 — the last branch in the chain.
  // When the game calls renderFloor12 but we're actually on floor 13,
  // skip F12 rendering and call renderFloor13 instead.
  //
  // This runs in the same RAF frame as the game, avoiding flicker.
  function patchRenderDispatch() {
    if (window._floor13RenderPatched) return;

    function doWrap() {
      var _origF12 = window.renderFloor12;
      if (typeof _origF12 !== 'function') {
        // Game not ready yet — retry
        setTimeout(doWrap, 300);
        return;
      }
      if (window._floor13RenderPatched) return;
      window._floor13RenderPatched = true;

      window.renderFloor12 = function() {
        var S = getS();
        if (S && S.floor === 13) {
          // We're on floor 13 — render the podcast studio instead
          if (window.renderFloor13) window.renderFloor13();
        } else {
          _origF12.apply(this, arguments);
        }
      };
    }

    doWrap();
  }

  // ═══════════════════════════════════════════════════════════════════
  // INTERACTIVE OBJECTS REGISTRATION
  // Register hotspot objects so the game's proximity system can detect them
  // ═══════════════════════════════════════════════════════════════════
  function registerInteractiveObjects() {
    // The game uses window.OBJECTS or a floor-specific object list.
    // Check how the game registers objects for interaction detection.
    // From index.html: objects have {id, x, y, w, h, label, interact, collide}
    // The game checks S.nearObject on each frame.
    // We need to inject our objects when on floor 13.
    // The safest approach: patch the nearObject detection or add to a floor objects list.

    var podcastObjects = [
      { id: 'podcast_mic',        x: 270, y: 320, w: 32, h: 48, label: '🎙️ Microphone',      interact: true, collide: false, floor: 13 },
      { id: 'podcast_headphones', x: 50,  y: 300, w: 16, h: 32, label: '🎧 Headphones',       interact: true, collide: false, floor: 13 },
      { id: 'podcast_waveform',   x: 910, y: 310, w: 80, h: 48, label: '📊 Waveform Display', interact: true, collide: false, floor: 13 },
      { id: 'podcast_vinyl',      x: 800, y: 130, w: 48, h: 32, label: '🎵 Vinyl Shelf',       interact: true, collide: false, floor: 13 },
      { id: 'podcast_coffee',     x: 52,  y: 480, w: 16, h: 24, label: '☕ Coffee Machine',    interact: true, collide: false, floor: 13 },
      { id: 'podcast_chair',      x: 440, y: 400, w: 16, h: 24, label: '💺 Guest Chair',       interact: true, collide: false, floor: 13 },
      { id: 'podcast_volt',       x: 870, y: 330, w: 16, h: 24, label: '🎚️ VOLT',              interact: true, collide: false, floor: 13 },
    ];

    // Try to register with the game's object system
    // Method 1: window.FLOOR_OBJECTS (if exists)
    if (typeof window.FLOOR_OBJECTS !== 'undefined') {
      window.FLOOR_OBJECTS[13] = podcastObjects;
    }

    // Method 2: Patch the nearObject detection loop
    // The game scans some objects array to find S.nearObject.
    // We inject by monkey-patching the proximity check.
    patchNearObjectDetection(podcastObjects);
  }

  function patchNearObjectDetection(podcastObjects) {
    if (window._floor13NearObjPatched) return;

    // Hook into the game loop via RAF to set S.nearObject when on floor 13
    (function nearObjLoop() {
      var S = getS();
      if (S && S.floor === 13 && S.echo) {
        var ex = S.echo.x || 0;
        var ey = S.echo.y || 0;
        var nearest = null;
        var nearDist = 80; // interaction radius

        for (var i = 0; i < podcastObjects.length; i++) {
          var obj = podcastObjects[i];
          var cx2 = obj.x + obj.w / 2;
          var cy2 = obj.y + obj.h / 2;
          var dist = Math.hypot(ex - cx2, ey - cy2);
          if (dist < nearDist) {
            nearDist = dist;
            nearest = obj;
          }
        }

        if (nearest) {
          S.nearObject = nearest;
        } else if (S.nearObject && S.nearObject.floor === 13) {
          // Clear floor 13 object if we moved away
          S.nearObject = null;
        }
      }
      requestAnimationFrame(nearObjLoop);
    })();

    window._floor13NearObjPatched = true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ELEVATOR BUTTON: Add Floor 13 to elevator menu
  // ═══════════════════════════════════════════════════════════════════
  function patchElevatorMenu() {
    var _origOpenElevator = window.openElevator;
    if (typeof _origOpenElevator !== 'function' || window._floor13ElevatorPatched) return;
    window._floor13ElevatorPatched = true;

    window.openElevator = function() {
      _origOpenElevator.apply(this, arguments);

      // Inject F13 button after elevator HTML is built
      setTimeout(function() {
        var ov = document.getElementById('elevator-overlay');
        if (!ov || !ov.classList.contains('show')) return;
        if (ov.querySelector('[data-floor="13"]')) return; // already injected

        // Build button matching existing floor-btn style
        var f13btn = document.createElement('button');
        f13btn.className = 'floor-btn' + (window.S && window.S.floor === 13 ? ' current' : '');
        f13btn.setAttribute('data-floor', '13');
        f13btn.style.cssText = 'border-color:#4ecdc4;background:rgba(78,205,196,0.06)';
        f13btn.textContent = (window.S && window.S.floor === 13 ? '► ' : '') + '🎙️ F13 — Podcast Studio';

        // Wire click: use same pattern as existing buttons (data-floor triggers changeFloor)
        f13btn.onclick = function() {
          ov.className = '';  // close elevator (removes 'show')
          if (typeof removeElevatorKeyNav === 'function') removeElevatorKeyNav();
          // changeFloor is the internal function used by data-floor buttons
          if (typeof changeFloor === 'function') {
            changeFloor(13);
          } else {
            // Fallback: set S.floor directly and trigger a floor change
            if (window.S) { window.S.floor = 13; window.S.visitor.x = 200; window.S.visitor.y = 400; }
          }
        };

        // Insert before the "Visit Rooms" button (data-action="visit")
        var visitBtn = ov.querySelector('[data-action="visit"]');
        if (visitBtn && visitBtn.parentNode) {
          visitBtn.parentNode.insertBefore(f13btn, visitBtn);
        } else {
          // Fallback: find the popup div and append
          var popup = ov.querySelector('.popup');
          if (popup) popup.insertBefore(f13btn, popup.querySelector('[data-action]') || null);
          else ov.appendChild(f13btn);
        }
      }, 50);
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  function init() {
    registerFloor();
    patchInteract();
    registerInteractiveObjects();
    patchRenderDispatch();           // hook renderFloor12 to dispatch to F13
    setTimeout(patchElevatorMenu, 1500); // elevator patch after game init
    console.log('[Floor13] 🎙️ Podcast Studio loaded');
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to let the game initialize first
    setTimeout(init, 100);
  }

})();
