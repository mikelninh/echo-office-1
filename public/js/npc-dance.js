// npc-dance.js — NPCs dance on Floor 10 matching the active club's music
// Hooks into npc-simulation.js render + StationLife population.
// Each genre has its own move set. Personality (OCEAN) affects style.
// ════════════════════════════════════════════════════════════════════

(function NPCDance() {
  'use strict';

  // ── Dance styles per genre/signature ────────────────────────────
  // Each style defines:
  //   frames: array of body offsets per frame (x,y shifts for limbs)
  //   speed:  frames per beat (lower = faster)
  //   name:   display label
  //   emoji:  shown above dancing NPCs

  const DANCE_STYLES = {
    // Standard genres
    house:        { name: 'House Step',    emoji: '🕺', speed: 0.5, style: 'sway'      },
    techno:       { name: 'Techno Bop',    emoji: '🤖', speed: 0.4, style: 'robot'     },
    hiphop:       { name: 'Hip-Hop Bounce',emoji: '🎤', speed: 0.6, style: 'bounce'    },
    dnb:          { name: 'DnB Skank',     emoji: '⚡', speed: 0.25,style: 'skank'     },
    ambient:      { name: 'Sway',          emoji: '🌊', speed: 1.0, style: 'sway'      },
    latin:        { name: 'Salsa',         emoji: '💃', speed: 0.55,style: 'salsa'     },
    // Club signatures
    cantina_jazz: { name: 'Cantina Shuffle',emoji:'🎺', speed: 0.7, style: 'shuffle'   },
    epic_house:   { name: 'Power Hands',   emoji: '🦸', speed: 0.5, style: 'hero'      },
    dark_techno:  { name: 'Batcave Stomp', emoji: '🦇', speed: 0.35,style: 'stomp'     },
    battle_dnb:   { name: 'Footwork',      emoji: '🥋', speed: 0.2, style: 'footwork'  },
    grid_electro: { name: 'Grid Lock',     emoji: '🔷', speed: 0.4, style: 'robot'     },
    ocarina_house:{ name: 'Forest Sway',   emoji: '🌿', speed: 0.8, style: 'sway'      },
    afrotech:     { name: 'Afro Bounce',   emoji: '⚡', speed: 0.5, style: 'afro'      },
    zombie_rave:  { name: 'Zombie Shuffle',emoji: '🧟', speed: 0.3, style: 'zombie'    },
  };

  // ── Move renderers per style ─────────────────────────────────────
  // Each receives (ctx, px, py, t, personality) where:
  //   t = 0..1 beat phase
  //   personality = npc.ocean object

  const MOVES = {

    sway(ctx, px, py, t, p) {
      const swing = Math.sin(t * Math.PI * 2) * (3 + (p.openness || 0.5) * 2);
      const bob   = Math.abs(Math.sin(t * Math.PI * 2)) * 2;
      drawBody(ctx, px + swing, py - bob, swing * 0.3);
    },

    robot(ctx, px, py, t, p) {
      // Quantized — snaps every quarter beat
      const step  = Math.floor(t * 4) / 4;
      const snap  = Math.floor(t * 8) % 2;
      const xOff  = (step < 0.5 ? -2 : 2);
      const yOff  = snap * -2;
      drawBody(ctx, px + xOff, py + yOff, 0);
      // Stiff arms out
      ctx.save();
      ctx.fillStyle = '#888';
      ctx.fillRect(px - 7, py - 4 + yOff, 3, 2); // left arm
      ctx.fillRect(px + 4, py - 4 + yOff, 3, 2); // right arm
      ctx.restore();
    },

    bounce(ctx, px, py, t, p) {
      const energy = 0.5 + (p.extraversion || 0.5) * 0.5;
      const bob    = Math.abs(Math.sin(t * Math.PI * 2)) * 5 * energy;
      const lean   = Math.sin(t * Math.PI * 4) * 2;
      drawBody(ctx, px + lean, py - bob, lean * 0.5);
      // Bobbing head nod
      ctx.save();
      ctx.fillStyle = '#f0d0a0';
      ctx.fillRect(px - 3 + lean * 0.5, py - 12 - bob * 0.5, 6, 6);
      ctx.restore();
    },

    skank(ctx, px, py, t, p) {
      // DnB: one-two skank — alternating lean
      const beat   = Math.floor(t * 2); // 0 or 1
      const lean   = beat === 0 ? -5 : 5;
      const bob    = Math.abs(Math.sin(t * Math.PI * 4)) * 4;
      drawBody(ctx, px + lean * 0.5, py - bob, lean * 0.15);
      // Arm up on the beat
      const armUp = -8 - bob;
      ctx.save();
      ctx.fillStyle = '#f0d0a0';
      ctx.fillRect(px + (beat === 0 ? -8 : 4), py + armUp * 0.5, 3, 8); // raised arm
      ctx.restore();
    },

    salsa(ctx, px, py, t, p) {
      // Latin: hip sway 1-2-3, pause, 5-6-7, pause
      const phase  = (t * 8) % 8;
      const hip    = phase < 3 ? Math.sin(phase * Math.PI / 3) * 4 :
                     phase < 4 ? 0 :
                     phase < 7 ? -Math.sin((phase-4) * Math.PI / 3) * 4 : 0;
      const bob    = Math.abs(hip) * 0.4;
      drawBody(ctx, px + hip, py - bob, hip * 0.2);
    },

    shuffle(ctx, px, py, t, p) {
      // Cantina Jazz: shuffle feet, swinging arms
      const step  = Math.floor(t * 4) % 4;
      const xOff  = (step < 2 ? -2 : 2);
      const swing = Math.sin(t * Math.PI * 3) * 3;
      drawBody(ctx, px + xOff, py, swing * 0.15);
      // Swinging arm
      ctx.save();
      ctx.fillStyle = '#f0d0a0';
      const armX = px + (swing > 0 ? 4 : -7);
      const armY = py - 6 + Math.abs(swing) * 0.5;
      ctx.fillRect(armX, armY, 3, 6 - Math.abs(swing) * 0.3);
      ctx.restore();
    },

    hero(ctx, px, py, t, p) {
      // Epic House: hands up, power pose
      const pulse  = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
      const bob    = pulse * 3;
      drawBody(ctx, px, py - bob, 0);
      // Both arms UP
      ctx.save();
      ctx.fillStyle = '#f0d0a0';
      ctx.fillRect(px - 8, py - 8 - pulse * 4, 3, 7 + pulse * 4); // left arm
      ctx.fillRect(px + 5, py - 8 - pulse * 4, 3, 7 + pulse * 4); // right arm
      ctx.restore();
    },

    stomp(ctx, px, py, t, p) {
      // Batcave: heavy industrial stomp
      const beat  = Math.floor(t * 4) % 4;
      const stomp = beat === 0 || beat === 2;
      const shake = stomp ? 1 : 0;
      drawBody(ctx, px + (Math.random() < 0.1 ? shake : 0), py + (stomp ? 1 : 0), 0);
      // Heavy head down on stomp
      if (stomp) {
        ctx.save();
        ctx.fillStyle = '#f0d0a0';
        ctx.fillRect(px - 3, py - 11, 6, 6); // head drops
        ctx.restore();
      }
    },

    footwork(ctx, px, py, t, p) {
      // Battle DnB / footwork: rapid feet, still upper body
      const step  = Math.floor(t * 8) % 4;
      const footX = [[-3,1],[-1,3],[1,-3],[3,-1]][step];
      drawBody(ctx, px, py, 0);
      // Rapid feet
      ctx.save();
      ctx.fillStyle = '#334';
      ctx.fillRect(px + footX[0], py + 4, 3, 3);
      ctx.fillRect(px + footX[1], py + 4, 3, 3);
      ctx.restore();
    },

    afro(ctx, px, py, t, p) {
      // Afro-Tech: chest pop + hip roll
      const chest = Math.sin(t * Math.PI * 2) * 2;
      const hip   = Math.cos(t * Math.PI * 2) * 3;
      drawBody(ctx, px + hip * 0.5, py - Math.abs(chest) * 0.5, hip * 0.1);
      // Shoulder shimmy
      ctx.save();
      ctx.fillStyle = '#f0d0a0';
      ctx.fillRect(px - 3 + chest * 0.3, py - 12, 6, 6);
      ctx.restore();
    },

    zombie(ctx, px, py, t, p) {
      // Zombie Rave: lurch, arms forward, jerk
      const lurch  = Math.sin(t * Math.PI * 1.5) * 4;
      const twitch = Math.random() < 0.05 ? (Math.random() - 0.5) * 3 : 0;
      drawBody(ctx, px + lurch + twitch, py, lurch * 0.2);
      // Arms dragging forward
      ctx.save();
      ctx.fillStyle = '#a0c080';
      ctx.fillRect(px - 10 + lurch, py - 2, 6, 2); // left arm forward
      ctx.fillRect(px + 4 + lurch * 0.5, py - 2, 6, 2); // right arm
      ctx.restore();
    },
  };

  // ── Shared body draw ─────────────────────────────────────────────
  function drawBody(ctx, px, py, tilt) {
    ctx.save();
    if (tilt !== 0) {
      ctx.translate(px, py);
      ctx.rotate(tilt * 0.08);
      ctx.translate(-px, -py);
    }
    // Just the body/torso — head/legs handled by style moves or left to base render
    // This draws an overlay "dancing body" shape
    ctx.restore();
  }

  // ── Per-NPC dance state ──────────────────────────────────────────
  var _danceState = {}; // npcId → { phase, speed, styleName, lastBeat }

  function getDanceState(npc, styleName, speed) {
    if (!_danceState[npc.id]) {
      _danceState[npc.id] = {
        phase:     Math.random(), // start at random phase so NPCs don't sync perfectly
        styleName: styleName,
        lastMs:    performance.now(),
        emoji:     null,
        emojiAlpha:0,
      };
    }
    var ds = _danceState[npc.id];
    // Update if style changed
    if (ds.styleName !== styleName) {
      ds.styleName = styleName;
      ds.phase = Math.random();
    }
    return ds;
  }

  function advanceDanceState(ds, dtSec, speed) {
    ds.phase = (ds.phase + dtSec * speed) % 1;
  }

  // ── Personality → dance energy ───────────────────────────────────
  function danceEnergy(npc) {
    var o = npc.ocean || {};
    // Extraverted + high openness + high neuroticism (anxious energy) = more expressive
    return Math.min(1, 0.4
      + (o.extraversion  || 0.5) * 0.3
      + (o.openness      || 0.5) * 0.2
      + (o.neuroticism   || 0.3) * 0.1
    );
  }

  // ── Should this NPC dance? ───────────────────────────────────────
  function shouldDance(npc) {
    if (npc.floor !== 10) return false;
    if (npc.state === 'sleeping') return false;
    // Dancers always dance, others based on mood + extraversion
    if (npc.job === 'dancer') return true;
    var o = npc.ocean || {};
    var thresh = 0.65 - (o.extraversion || 0.5) * 0.3 - (npc.mood || 0.5) * 0.15;
    return (npc.mood || 0.5) > thresh;
  }

  // ── Get current genre for active zone / floor ────────────────────
  function getCurrentSig() {
    // If visitor is in a specific club zone, use that club's sig
    if (window.UndergroundMusic) {
      var key = window.UndergroundMusic.currentClub();
      if (key && window.CLUB_SIGNATURES_EXPORT && window.CLUB_SIGNATURES_EXPORT[key]) {
        return window.CLUB_SIGNATURES_EXPORT[key].sig;
      }
    }
    // Fallback to DiscoFloor genre
    if (typeof DiscoFloor !== 'undefined') return DiscoFloor.genre || 'house';
    return 'house';
  }

  // ── Main render hook ─────────────────────────────────────────────
  var _lastDanceMs = performance.now();

  function hookNPCRender() {
    // Patch StationLife._render or renderPopulation
    // We inject AFTER the base NPC draw by wrapping renderFloor10

    // We hook via the window.renderFloor10 wrapper — but actually we want
    // to intercept at the NPC render level. Instead we patch via a post-render
    // overlay drawn after the floor renders, iterating _population ourselves.

    var _origRenderFloor10 = window.renderFloor10;
    window.renderFloor10 = function() {
      _origRenderFloor10();
      renderDancingNPCs();
    };
  }

  function renderDancingNPCs() {
    if (typeof S === 'undefined' || S.floor !== 10) return;
    if (typeof ctx === 'undefined') return;
    if (typeof window.StationLife === 'undefined') return;

    var now = performance.now();
    var dtSec = Math.min((now - _lastDanceMs) / 1000, 0.1);
    _lastDanceMs = now;

    var sig = getCurrentSig();
    var style = DANCE_STYLES[sig] || DANCE_STYLES.house;
    var moveFn = MOVES[style.style] || MOVES.sway;

    // Get all population — access via StationLife if exposed, else skip
    var pop = window._stationPop; // we'll expose this below
    if (!pop || !pop.length) return;

    var camera = typeof S.camera !== 'undefined' ? S.camera : { x: 0, y: 0 };

    pop.forEach(function(npc) {
      if (!shouldDance(npc)) return;

      var ds = getDanceState(npc, style.style, style.speed);
      advanceDanceState(ds, dtSec, style.speed * (0.8 + danceEnergy(npc) * 0.4));

      var px = Math.round(npc.x - camera.x);
      var py = Math.round(npc.y - camera.y);

      // Only draw if on screen
      if (px < -20 || px > (window.W||800) + 20 || py < -20 || py > (window.H||600) + 20) return;

      ctx.save();

      // Skin/job color matching base render
      var skinColor = typeof getJobColor === 'function' ? getJobColor(npc.job) : '#7b5ea7';

      // Draw the dancing override body (replaces static legs/body in base render)
      // We draw ON TOP with the dance move
      var energy = danceEnergy(npc);
      ctx.globalAlpha = 0.95;

      // Run the dance move — it draws animated body parts
      drawDancingBody(ctx, px, py, ds.phase, npc.ocean || {}, skinColor, moveFn, energy, style);

      // Dance emoji above (pulsing)
      var emojiAlpha = 0.5 + Math.sin(ds.phase * Math.PI * 4) * 0.3;
      ctx.globalAlpha = emojiAlpha * energy;
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(style.emoji, px, py - 18);

      ctx.restore();
    });
  }

  // ── Draw dancing body ────────────────────────────────────────────
  function drawDancingBody(ctx, px, py, t, ocean, skinColor, moveFn, energy, style) {
    // Get animated offsets from move
    var anim = computeAnim(moveFn, t, ocean, energy);

    var bx = px + anim.bodyX;
    var by = py + anim.bodyY;
    var tilt = anim.tilt;

    ctx.save();
    ctx.translate(bx, by);
    if (tilt) ctx.rotate(tilt);
    ctx.translate(-bx, -by);

    // Body
    ctx.fillStyle = skinColor;
    ctx.fillRect(bx - 4, by - 6, 8, 10);

    // Head (with nod)
    ctx.fillStyle = '#f0d0a0';
    ctx.fillRect(bx - 3 + anim.headX, by - 12 + anim.headY, 6, 6);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 1 + anim.headX, by - 10 + anim.headY, 1, 1);
    ctx.fillRect(bx + 1 + anim.headX, by - 10 + anim.headY, 1, 1);

    // Legs (animated)
    ctx.fillStyle = '#334';
    ctx.fillRect(bx - 3 + anim.legLX, by + 4 + anim.legLY, 3, 3);
    ctx.fillRect(bx + 1 + anim.legRX, by + 4 + anim.legRY, 3, 3);

    // Arms (animated)
    ctx.fillStyle = skinColor;
    ctx.fillRect(bx - 7 + anim.armLX, by - 4 + anim.armLY, 3, anim.armLLen);
    ctx.fillRect(bx + 4 + anim.armRX, by - 4 + anim.armRY, 3, anim.armRLen);

    ctx.restore();
  }

  // ── Compute animation offsets per style ─────────────────────────
  function computeAnim(moveFn, t, ocean, energy) {
    var pi = Math.PI;
    var sin = Math.sin, cos = Math.cos, abs = Math.abs, floor = Math.floor;
    var ext = ocean.extraversion || 0.5;
    var open = ocean.openness || 0.5;

    // Default: neutral
    var a = {
      bodyX: 0, bodyY: 0, tilt: 0,
      headX: 0, headY: 0,
      legLX: 0, legLY: 0,
      legRX: 0, legRY: 0,
      armLX: 0, armLY: 0, armLLen: 6,
      armRX: 0, armRY: 0, armRLen: 6,
    };

    var styleName = moveFn.name || '';

    // Apply style-specific animation
    switch (moveFn) {
      case MOVES.sway: {
        var swing = sin(t * pi * 2) * (3 + open * 2) * energy;
        var bob   = abs(sin(t * pi * 2)) * 2 * energy;
        a.bodyX = swing; a.bodyY = -bob;
        a.tilt  = swing * 0.04;
        a.armLY = -abs(swing) * 0.5;
        a.armRY = -abs(swing) * 0.5;
        break;
      }
      case MOVES.robot: {
        var snap = floor(t * 8) % 2;
        var xq   = t < 0.5 ? -2 : 2;
        a.bodyX = xq; a.bodyY = snap * -2;
        a.armLX = -1; a.armLY = -2 + snap * -1; a.armLLen = 5;
        a.armRX = 1;  a.armRY = -2 + snap * -1; a.armRLen = 5;
        break;
      }
      case MOVES.bounce: {
        var b    = abs(sin(t * pi * 2)) * 5 * energy;
        var lean = sin(t * pi * 4) * 2;
        a.bodyX = lean; a.bodyY = -b;
        a.headY = -b * 0.3;
        a.legLY = b * 0.3; a.legRY = b * 0.3;
        a.armLY = -b * 0.5 + sin(t*pi*2+1) * 3;
        a.armRY = -b * 0.5 + sin(t*pi*2)   * 3;
        break;
      }
      case MOVES.skank: {
        var beat2 = floor(t * 2);
        var leanS = beat2 === 0 ? -4 : 4;
        var bobS  = abs(sin(t * pi * 4)) * 4 * energy;
        a.bodyX   = leanS * 0.5; a.bodyY = -bobS;
        a.tilt    = leanS * 0.02;
        a.armLY   = beat2 === 0 ? -8 - bobS : 0;
        a.armRY   = beat2 === 1 ? -8 - bobS : 0;
        a.legLX   = beat2 === 0 ? -2 : 0; a.legLY = beat2 === 0 ? 2 : 0;
        a.legRX   = beat2 === 1 ? 2  : 0; a.legRY = beat2 === 1 ? 2 : 0;
        break;
      }
      case MOVES.salsa: {
        var phase8 = (t * 8) % 8;
        var hip    = phase8 < 3 ? sin(phase8 * pi / 3) * 4 :
                     phase8 < 4 ? 0 :
                     phase8 < 7 ? -sin((phase8-4) * pi / 3) * 4 : 0;
        a.bodyX = hip; a.bodyY = -abs(hip) * 0.3;
        a.tilt  = hip * 0.03;
        a.armLX = sin(t * pi * 2) * 2;
        a.armRX = -sin(t * pi * 2) * 2;
        break;
      }
      case MOVES.shuffle: {
        var stepS = floor(t * 4) % 4;
        var xS    = stepS < 2 ? -2 : 2;
        var swg   = sin(t * pi * 3) * 3;
        a.bodyX = xS;
        a.armLX = swg > 0 ? swg * 0.5 : 0;
        a.armRX = swg < 0 ? swg * 0.5 : 0;
        a.armLY = -abs(swg);
        break;
      }
      case MOVES.hero: {
        var pulse2 = sin(t * pi * 2) * 0.5 + 0.5;
        a.bodyY   = -pulse2 * 3;
        a.armLY   = -8 - pulse2 * 5; a.armLLen = 9 + pulse2 * 3;
        a.armRY   = -8 - pulse2 * 5; a.armRLen = 9 + pulse2 * 3;
        break;
      }
      case MOVES.stomp: {
        var beat4 = floor(t * 4) % 4;
        var stmp  = beat4 === 0 || beat4 === 2;
        a.bodyY   = stmp ? 1 : 0;
        a.headY   = stmp ? 2 : 0;
        a.legLY   = stmp ? 2 : 0;
        a.legRY   = stmp ? 2 : 0;
        break;
      }
      case MOVES.footwork: {
        var step8 = floor(t * 8) % 4;
        var fpos  = [[-3,1],[-1,3],[1,-3],[3,-1]][step8];
        a.legLX   = fpos[0]; a.legRX = fpos[1];
        a.legLY   = abs(fpos[0]) * 0.3;
        a.legRY   = abs(fpos[1]) * 0.3;
        break;
      }
      case MOVES.afro: {
        var chest2 = sin(t * pi * 2) * 2;
        var hipA   = cos(t * pi * 2) * 3;
        a.bodyX   = hipA * 0.5; a.bodyY = -abs(chest2) * 0.3;
        a.headX   = chest2 * 0.3;
        a.armLX   = -chest2 * 0.3; a.armLY = -chest2;
        a.armRX   =  chest2 * 0.3; a.armRY = -chest2;
        break;
      }
      case MOVES.zombie: {
        var lurch2 = sin(t * pi * 1.5) * 4;
        a.bodyX   = lurch2; a.tilt = lurch2 * 0.04;
        a.armLX   = -4 + lurch2; a.armLLen = 8;  // arm drags forward
        a.armRX   =  2 + lurch2 * 0.5; a.armRLen = 8;
        a.headY   = abs(lurch2) * 0.3;
        break;
      }
    }

    return a;
  }

  // ── Expose population reference ──────────────────────────────────
  function exposePop() {
    // npc-simulation.js stores population in closure as _population
    // We need a reference — patch StationLife.getByFloor to also expose it
    var check = function() {
      if (typeof StationLife === 'undefined' || !StationLife.getByFloor) {
        setTimeout(check, 500);
        return;
      }
      // Build full pop by scanning all floors
      var full = [];
      for (var f = 1; f <= 15; f++) {
        var floor = StationLife.getByFloor(f);
        if (floor) full = full.concat(floor);
      }
      if (full.length > 0) {
        window._stationPop = full;
        // Refresh every 5s (population doesn't change often)
        setInterval(function() {
          var updated = [];
          for (var f = 1; f <= 15; f++) {
            var fl = StationLife.getByFloor(f);
            if (fl) updated = updated.concat(fl);
          }
          window._stationPop = updated;
        }, 5000);
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  }

  // ── Export club signatures for zone detection ────────────────────
  // (UndergroundMusic keeps CLUB_SIGNATURES in its closure — we expose it)
  function exportSignatures() {
    var check = function() {
      if (typeof window.UndergroundMusic === 'undefined') {
        setTimeout(check, 500);
        return;
      }
      window.CLUB_SIGNATURES_EXPORT = window.UndergroundMusic.signatures;
    };
    check();
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    exposePop();
    exportSignatures();

    var waitRender = function() {
      if (typeof window.renderFloor10 === 'undefined') {
        setTimeout(waitRender, 300);
        return;
      }
      hookNPCRender();
      console.log('[NPCDance] Hooked — NPCs will dance on Floor 10 🕺');
    };
    waitRender();
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 1200);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1200));
  }

  // Debug
  window.NPCDance = {
    styles: DANCE_STYLES,
    preview: function(genreKey) {
      if (typeof DiscoFloor !== 'undefined') {
        DiscoFloor._djOverride = true;
        DiscoFloor._djOverrideTimer = 9999;
        DiscoFloor.genre = genreKey;
        console.log('[NPCDance] Previewing style for genre:', genreKey);
      }
    },
  };

})();
