// underground-music.js — Signature songs per club zone in The Underground (Floor 10)
// Each of the 8 brand clubs gets a unique musical identity:
// signature genre, BPM, color palette, DJ name, and procedural audio texture.
// When you walk into a zone, the music shifts to that club's sound.
// Loaded after index.html scripts.
// ════════════════════════════════════════════════════════════════════

(function UndergroundMusic() {
  'use strict';

  // ── Club Signatures ─────────────────────────────────────────────
  // Each entry overrides the shared timetable for that zone.
  // 'sig' = signature genre key (extends DISCO_GENRES or defines custom)
  const CLUB_SIGNATURES = {
    cantina: {
      sig:       'cantina_jazz',
      djName:    'DJ Mos',
      tagline:   'A wretched hive of scum and bangers.',
      bpm:       118,
      color:     '#FFD700',
      glow:      '#b8860b',
      kickPat:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // straight kick
      hatPat:    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // offbeat hat
      bassMood:  'swung',
      padMood:   'brass',
      greeting:  '🎺 Mos Eisley Cantina — alien jazz that hits harder than a blaster.'
    },
    tower: {
      sig:       'epic_house',
      djName:    'DJ Stark',
      tagline:   "Earth's mightiest dance floor.",
      bpm:       128,
      color:     '#4488ff',
      glow:      '#cc0000',
      kickPat:   [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
      hatPat:    [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
      bassMood:  'deep',
      padMood:   'orchestral',
      greeting:  '🦸 Avengers Tower — peak-hour epic house. The crowd goes assemble.'
    },
    batcave: {
      sig:       'dark_techno',
      djName:    'DJ Wayne',
      tagline:   'Dark. Brooding. Excellent bass.',
      bpm:       138,
      color:     '#6666aa',
      glow:      '#FFD700',
      kickPat:   [1,0,0,1, 0,0,1,0, 1,0,0,0, 1,0,1,0],
      hatPat:    [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1], // rolling hi-hat
      bassMood:  'acid',
      padMood:   'dark',
      greeting:  '🦇 The Batcave — industrial techno from the depths. No smiling allowed.'
    },
    dojo: {
      sig:       'battle_dnb',
      djName:    'DJ Ryu',
      tagline:   'Round 1… DANCE!',
      bpm:       172,
      color:     '#ff4444',
      glow:      '#FFD700',
      kickPat:   [1,0,1,0, 0,1,0,0, 1,0,1,0, 0,0,1,0], // breakbeat feel
      hatPat:    [0,1,1,0, 1,0,0,1, 0,1,1,0, 1,0,0,0],
      bassMood:  'reese',
      padMood:   'fight',
      greeting:  '🥋 World Warrior Dojo — DnB that hits like a Hadouken.'
    },
    tron: {
      sig:       'grid_electro',
      djName:    'DJ CLU',
      tagline:   'Welcome to the Grid.',
      bpm:       132,
      color:     '#00ffff',
      glow:      '#0088cc',
      kickPat:   [1,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0],
      hatPat:    [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,1,1],
      bassMood:  'digital',
      padMood:   'grid',
      greeting:  '🔷 The Grid — electro-house as precise as a light cycle.'
    },
    hyrule: {
      sig:       'ocarina_house',
      djName:    'DJ Sheik',
      tagline:   "Epona's favorite chill spot.",
      bpm:       102,
      color:     '#88ff44',
      glow:      '#44aa22',
      kickPat:   [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0], // sparse, breathing
      hatPat:    [0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0],
      bassMood:  'warm',
      padMood:   'ocarina',
      greeting:  '🌿 Lon Lon Lounge — chill house with ocarina vibes. It\'s dangerous to dance alone.'
    },
    wakanda: {
      sig:       'afrotech',
      djName:    'DJ Okoye',
      tagline:   'Most technologically advanced dance floor on the station.',
      bpm:       120,
      color:     '#aa66ff',
      glow:      '#7733cc',
      kickPat:   [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0], // afrobeats pattern
      hatPat:    [1,0,1,0, 1,1,0,1, 0,1,0,1, 1,0,1,0],
      bassMood:  'afro',
      padMood:   'vibranium',
      greeting:  '⚡ Wakanda Forever — afro-tech that vibrates on a molecular level.'
    },
    raccoon: {
      sig:       'zombie_rave',
      djName:    'DJ Nemesis',
      tagline:   'Dance like there\'s no tomorrow. Because there might not be.',
      bpm:       145,
      color:     '#ff2222',
      glow:      '#880000',
      kickPat:   [1,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,1,0],
      hatPat:    [1,0,0,0, 0,0,1,0, 0,1,0,0, 1,0,0,1],
      bassMood:  'horror',
      padMood:   'glitch',
      greeting:  '🧟 Raccoon City Underground — hardcore rave from the apocalypse. S.T.A.R.S. on the decks.'
    }
  };

  // ── Extended genre definitions (injected into DISCO_GENRES) ──────
  const EXTENDED_GENRES = {
    cantina_jazz:  { name: 'Cantina Jazz',   bpm: 118, kick: true,  hat: 'offbeat', bass: 'swung',   pad: 'brass',      color: '#FFD700', accent: '#b8860b' },
    epic_house:    { name: 'Epic House',      bpm: 128, kick: true,  hat: 'offbeat', bass: 'deep',    pad: 'orchestral', color: '#4488ff', accent: '#cc0000' },
    dark_techno:   { name: 'Dark Techno',     bpm: 138, kick: true,  hat: 'rolling', bass: 'acid',    pad: 'dark',       color: '#6666aa', accent: '#FFD700' },
    battle_dnb:    { name: 'Battle DnB',      bpm: 172, kick: true,  hat: 'break',   bass: 'reese',   pad: 'fight',      color: '#ff4444', accent: '#FFD700' },
    grid_electro:  { name: 'Grid Electro',    bpm: 132, kick: true,  hat: 'straight',bass: 'digital', pad: 'grid',       color: '#00ffff', accent: '#0088cc' },
    ocarina_house: { name: 'Ocarina House',   bpm: 102, kick: true,  hat: 'sparse',  bass: 'warm',    pad: 'ocarina',    color: '#88ff44', accent: '#44aa22' },
    afrotech:      { name: 'Afro-Tech',       bpm: 120, kick: true,  hat: 'clave',   bass: 'afro',    pad: 'vibranium',  color: '#aa66ff', accent: '#7733cc' },
    zombie_rave:   { name: 'Zombie Rave',     bpm: 145, kick: true,  hat: 'rolling', bass: 'horror',  pad: 'glitch',     color: '#ff2222', accent: '#880000' },
  };

  // Inject extended genres into the shared system
  function injectGenres() {
    if (typeof DISCO_GENRES === 'undefined') return;
    Object.assign(DISCO_GENRES, EXTENDED_GENRES);
  }

  // ── State ────────────────────────────────────────────────────────
  let currentClubKey = null;
  let transitionProgress = 0; // 0→1 fade between zones
  let transitionTarget = null;
  let bannerEl = null;
  let bannerTimeout = null;

  // ── Zone Detection ───────────────────────────────────────────────
  function detectZone() {
    if (typeof S === 'undefined' || S.floor !== 10 || !S.visitor) return null;
    const px = S.visitor.x, py = S.visitor.y;
    if (typeof BRAND_CLUBS === 'undefined') return null;
    for (const [key, club] of Object.entries(BRAND_CLUBS)) {
      const z = club.zone;
      if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return key;
    }
    return null;
  }

  // ── Apply signature to DiscoFloor ────────────────────────────────
  function applySig(clubKey) {
    const sig = CLUB_SIGNATURES[clubKey];
    if (!sig || typeof DiscoFloor === 'undefined') return;
    DiscoFloor._djOverride = true;
    DiscoFloor._djOverrideTimer = 9999; // stay until we leave
    DiscoFloor._djName = sig.djName;
    DiscoFloor.genre = sig.sig;
    // Ensure the genre exists
    injectGenres();
  }

  function restoreScheduled() {
    if (typeof DiscoFloor === 'undefined' || typeof getScheduledGenre === 'undefined') return;
    DiscoFloor._djOverride = false;
    DiscoFloor._djOverrideTimer = 0;
    DiscoFloor._djName = null;
    const scheduled = getScheduledGenre();
    if (scheduled) DiscoFloor.genre = scheduled.genre;
  }

  // ── Zone Banner ──────────────────────────────────────────────────
  function showZoneBanner(clubKey) {
    const sig = CLUB_SIGNATURES[clubKey];
    if (!sig) return;

    // Remove existing
    if (bannerEl) { bannerEl.remove(); bannerEl = null; }
    if (bannerTimeout) { clearTimeout(bannerTimeout); bannerTimeout = null; }

    const el = document.createElement('div');
    el.id = 'zone-music-banner';
    el.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      border: 2px solid ${sig.color};
      border-radius: 12px;
      padding: 10px 20px;
      color: ${sig.color};
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 9999;
      pointer-events: none;
      text-align: center;
      box-shadow: 0 0 18px ${sig.glow}88;
      animation: zoneBannerIn 0.4s ease;
      min-width: 240px;
    `;

    const genre = EXTENDED_GENRES[sig.sig] || {};
    el.innerHTML = `
      <div style="font-size:10px;opacity:0.7;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Now Playing</div>
      <div style="font-size:14px;font-weight:bold">${sig.djName}</div>
      <div style="font-size:11px;opacity:0.85;margin-top:2px">${genre.name || sig.sig} · ${sig.bpm} BPM</div>
      <div style="font-size:10px;opacity:0.6;margin-top:4px;font-style:italic">${sig.tagline}</div>
    `;

    if (!document.getElementById('zone-banner-style')) {
      const style = document.createElement('style');
      style.id = 'zone-banner-style';
      style.textContent = `
        @keyframes zoneBannerIn {
          from { opacity:0; transform:translateX(-50%) translateY(12px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes zoneBannerOut {
          from { opacity:1; }
          to   { opacity:0; transform:translateX(-50%) translateY(8px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
    bannerEl = el;

    bannerTimeout = setTimeout(() => {
      if (bannerEl) {
        bannerEl.style.animation = 'zoneBannerOut 0.5s ease forwards';
        setTimeout(() => { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }, 500);
      }
    }, 4000);
  }

  // ── Zone ambient floor tint ──────────────────────────────────────
  // Draws a subtle color wash over the canvas matching the active club
  let _lastOverlayKey = null;
  let _overlayAlpha = 0;

  function drawZoneOverlay(key) {
    if (typeof ctx === 'undefined' || !ctx) return;
    const sig = CLUB_SIGNATURES[key];
    if (!sig) return;

    _overlayAlpha = Math.min(_overlayAlpha + 0.008, 0.12); // fade in gently

    // Parse hex color to rgb
    const hex = sig.glow.replace('#','');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);

    ctx.save();
    ctx.globalAlpha = _overlayAlpha;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    // Only tint the bottom portion (dance floor area)
    if (typeof W !== 'undefined' && typeof H !== 'undefined') {
      ctx.fillRect(0, H * 0.5, W, H * 0.5);
    }
    ctx.restore();
  }

  // ── Beat visualizer strip ────────────────────────────────────────
  // Shows a small beat pattern strip at the top of the zone when inside
  let _beatStep = 0;
  let _beatTimer = 0;

  function drawBeatStrip(key, dt) {
    if (typeof ctx === 'undefined' || !ctx) return;
    const sig = CLUB_SIGNATURES[key];
    if (!sig) return;

    const genre = typeof DISCO_GENRES !== 'undefined' ? (DISCO_GENRES[sig.sig] || {}) : {};
    const bpm = sig.bpm;
    const beatDur = 60 / bpm / 4; // 16th note duration in seconds

    _beatTimer += dt;
    if (_beatTimer >= beatDur) {
      _beatTimer -= beatDur;
      _beatStep = (_beatStep + 1) % 16;
    }

    if (typeof W === 'undefined' || typeof H === 'undefined') return;

    const stripW = 160;
    const stripH = 18;
    const sx = (W - stripW) / 2;
    const sy = 14;
    const cellW = stripW / 16;

    ctx.save();
    ctx.globalAlpha = 0.75;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(sx-2, sy-2, stripW+4, stripH+4, 4) : ctx.rect(sx-2, sy-2, stripW+4, stripH+4);
    ctx.fill();

    // Kick pattern
    sig.kickPat.forEach((on, i) => {
      const active = i === _beatStep;
      ctx.fillStyle = on
        ? (active ? sig.color : sig.color + '99')
        : (active ? '#ffffff22' : '#ffffff0a');
      ctx.fillRect(sx + i * cellW + 1, sy + 1, cellW - 2, (stripH / 2) - 2);
    });

    // Hat pattern
    sig.hatPat.forEach((on, i) => {
      const active = i === _beatStep;
      ctx.fillStyle = on
        ? (active ? '#ffffff' : '#ffffff66')
        : (active ? '#ffffff22' : '#ffffff0a');
      ctx.fillRect(sx + i * cellW + 1, sy + stripH / 2 + 1, cellW - 2, (stripH / 2) - 2);
    });

    // DJ name label
    ctx.fillStyle = sig.color;
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(sig.djName + ' · ' + bpm + ' BPM', sx, sy + stripH + 10);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ── Greeting notification ────────────────────────────────────────
  function sendGreeting(clubKey) {
    const sig = CLUB_SIGNATURES[clubKey];
    if (!sig) return;
    if (typeof showNotification === 'function') {
      showNotification(sig.greeting);
    }
  }

  // ── Hook into game update ────────────────────────────────────────
  function hookUpdate() {
    if (typeof update === 'undefined') {
      setTimeout(hookUpdate, 500);
      return;
    }
    const _origUpdate = update;
    window.update = update = function(dt) {
      _origUpdate(dt);

      if (typeof S === 'undefined' || S.floor !== 10) {
        if (currentClubKey !== null) {
          currentClubKey = null;
          _overlayAlpha = 0;
          restoreScheduled();
        }
        return;
      }

      const zoneKey = detectZone();

      if (zoneKey !== currentClubKey) {
        // Zone changed
        if (zoneKey) {
          sendGreeting(zoneKey);
          showZoneBanner(zoneKey);
          applySig(zoneKey);
        } else {
          restoreScheduled();
          _overlayAlpha = 0;
        }
        currentClubKey = zoneKey;
        _beatStep = 0;
        _beatTimer = 0;
      }
    };
  }

  // ── Hook into render ─────────────────────────────────────────────
  function hookRender() {
    if (typeof window.renderFloor10 === 'undefined') {
      setTimeout(hookRender, 300);
      return;
    }
    const _origRender = window.renderFloor10;
    window.renderFloor10 = function() {
      _origRender();
      if (currentClubKey && typeof S !== 'undefined' && S.floor === 10) {
        // Calculate dt from last frame — approximate
        const now = performance.now();
        const dt = Math.min((now - (_lastRenderMs || now)) / 1000, 0.1);
        _lastRenderMs = now;
        drawBeatStrip(currentClubKey, dt);
        // Subtle zone tint drawn AFTER floor render
        _overlayAlpha = Math.max(0, _overlayAlpha - 0.002); // gentle fade out when leaving
        if (_overlayAlpha > 0 || currentClubKey) drawZoneOverlay(currentClubKey);
      }
    };
  }
  let _lastRenderMs = null;

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    injectGenres();
    hookUpdate();
    hookRender();
    console.log('[UndergroundMusic] 8 club signatures loaded:', Object.keys(CLUB_SIGNATURES).join(', '));
  }

  // Wait for game to be ready
  if (document.readyState === 'complete') {
    setTimeout(init, 800);
  } else {
    window.addEventListener('load', () => setTimeout(init, 800));
  }

  // Expose for debugging
  window.UndergroundMusic = {
    signatures: CLUB_SIGNATURES,
    currentClub: () => currentClubKey,
    previewClub: (key) => {
      if (typeof S !== 'undefined') S.floor = 10;
      currentClubKey = key;
      applySig(key);
      showZoneBanner(key);
    }
  };

})();
