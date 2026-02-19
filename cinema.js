/**
 * cinema.js — The Cinema · Segment 12 · Echo Station
 * "Where culture lives on the station."
 *
 * Loaded after main scripts and ring-engine.js (if present).
 * Overrides window.renderFloor12 to render the Cinema experience.
 *
 * Uses: window.ctx, window.S, window.W, window.H, window.addChatMsg
 */
(function EchoCinema() {
  'use strict';

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function ctx()  { return window.ctx; }
  function S()    { return window.S;   }
  function W()    { return window.W || 800; }
  function H()    { return window.H || 600; }
  function t()    { return (S() && S().time) || (performance.now() / 1000); }
  function chat(msg, color) {
    if (typeof window.addChatMsg === 'function') {
      window.addChatMsg('Cinema 🎬', msg, color || '#ffcc88');
    }
  }

  // ─── Film Database ────────────────────────────────────────────────────────────

  const FILMS = [
    { id: 'spirited', title: 'Spirited Away',          year: 2001, director: 'Miyazaki',              genre: 'Animation', poster: '🎬', duration: '125 min', durationSec: 7500 },
    { id: 'blade',    title: 'Blade Runner',            year: 1982, director: 'Ridley Scott',          genre: 'Sci-Fi',    poster: '🌃', duration: '117 min', durationSec: 7020 },
    { id: 'amelie',   title: 'Amélie',                  year: 2001, director: 'Jean-Pierre Jeunet',    genre: 'Romance',   poster: '🎨', duration: '122 min', durationSec: 7320 },
    { id: 'akira',    title: 'Akira',                   year: 1988, director: 'Katsuhiro Otomo',       genre: 'Animation', poster: '💥', duration: '124 min', durationSec: 7440 },
    { id: 'stalker',  title: 'Stalker',                 year: 1979, director: 'Andrei Tarkovsky',      genre: 'Sci-Fi',    poster: '🌿', duration: '163 min', durationSec: 9780 },
    { id: 'perfect',  title: 'Perfect Blue',            year: 1997, director: 'Satoshi Kon',           genre: 'Thriller',  poster: '🔵', duration: '81 min',  durationSec: 4860 },
    { id: 'mood',     title: 'In the Mood for Love',    year: 2000, director: 'Wong Kar-wai',          genre: 'Drama',     poster: '🌧️', duration: '98 min',  durationSec: 5880 },
    { id: 'princess', title: 'Princess Mononoke',       year: 1997, director: 'Miyazaki',              genre: 'Animation', poster: '🐺', duration: '134 min', durationSec: 8040 },
    { id: '2001',     title: '2001: A Space Odyssey',   year: 1968, director: 'Stanley Kubrick',       genre: 'Sci-Fi',    poster: '🛸', duration: '149 min', durationSec: 8940 },
    { id: 'ghost',    title: 'Ghost in the Shell',      year: 1995, director: 'Mamoru Oshii',          genre: 'Animation', poster: '🤖', duration: '83 min',  durationSec: 4980 },
    { id: 'grand',    title: 'The Grand Budapest Hotel',year: 2014, director: 'Wes Anderson',          genre: 'Comedy',    poster: '🏨', duration: '99 min',  durationSec: 5940 },
    { id: 'cowboy',   title: 'Cowboy Bebop: The Movie', year: 2001, director: 'Shinichiro Watanabe',   genre: 'Animation', poster: '🚀', duration: '115 min', durationSec: 6900 },
  ];

  // ─── Seat Layout ─────────────────────────────────────────────────────────────
  // 3 rows × 4 cols = 12 seats, in canvas-space (800×600)
  // The cinema room is rendered at W×H scale, so seats are percentage-based.

  function makeSeats(cW, cH) {
    const seats = [];
    const rows   = 3;
    const cols   = 4;
    const startX = cW * 0.18;
    const endX   = cW * 0.82;
    const startY = cH * 0.52;
    const rowGap = cH * 0.10;
    const colGap = (endX - startX) / (cols - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seats.push({
          id: r * cols + c,
          row: r, col: c,
          x: startX + c * colGap,
          y: startY + r * rowGap,
          occupied: false,
          visitor: null,   // { name, color }
          isPlayer: false,
        });
      }
    }
    return seats;
  }

  // ─── Cinema State ─────────────────────────────────────────────────────────────

  const CinemaState = {
    // Rendering
    seats: [],
    seatsDirty: true,     // recalculate on resize
    lastW: 0, lastH: 0,

    // Screening state machine: 'idle' → 'voting' → 'screening' → 'discussion'
    mode: 'idle',         // 'idle' | 'voting' | 'screening' | 'discussion'

    // Voting
    voteFilms: [],        // 3 random films for this vote
    votes: {},            // { filmId: count }
    voteTimer: 0,
    VOTE_DURATION: 30,    // seconds

    // Screening
    currentFilm: null,    // film object
    screeningStart: 0,    // performance.now() ms when screening began
    titleCardEnd: 0,      // show title card until this time
    lightsLevel: 1.0,     // 0.0 (dark) → 1.0 (bright)
    lightsTarget: 1.0,
    lightsFadeRate: 0.3,  // per second
    projectorOn: false,

    // Rating / discussion
    ratings: [],          // 1–5 star votes
    playerRated: false,

    // Player seat
    playerSeatId: null,   // null = standing

    // Reactions (particles)
    reactions: [],        // { emoji, x, y, vx, vy, life, maxLife, alpha }
    reactionCounts: { '👏': 0, '😂': 0, '😢': 0, '🔥': 0, '💀': 0, '❤️': 0 },

    // Dust motes
    dustMotes: [],

    // Marquee animation
    marqueeTick: 0,
    marqueeFrame: 0,

    // Whisper messages (overlaid on cinema room)
    whispers: [],         // { text, life, maxLife, y }
  };

  // ─── Seat helpers ─────────────────────────────────────────────────────────────

  function ensureSeats() {
    const cW = W(), cH = H();
    if (CinemaState.seatsDirty || CinemaState.lastW !== cW || CinemaState.lastH !== cH) {
      CinemaState.seats = makeSeats(cW, cH);
      CinemaState.lastW = cW;
      CinemaState.lastH = cH;
      CinemaState.seatsDirty = false;
      // If player was seated, re-bind to new seat coords
    }
    return CinemaState.seats;
  }

  function playerSeat() {
    if (CinemaState.playerSeatId === null) return null;
    return CinemaState.seats.find(s => s.id === CinemaState.playerSeatId) || null;
  }

  function emptySeat() {
    return CinemaState.seats.find(s => !s.occupied) || null;
  }

  function sitPlayer(seatId) {
    const seats = CinemaState.seats;
    const seat  = seats.find(s => s.id === seatId);
    if (!seat || seat.occupied) return;

    // Stand from current seat first
    standPlayer();

    seat.occupied  = true;
    seat.isPlayer  = true;
    seat.visitor   = { name: 'You', color: '#00fff7' };
    CinemaState.playerSeatId = seatId;

    chat('*creak* — you settle into seat ' + (seatId + 1) + '.');
  }

  function standPlayer() {
    if (CinemaState.playerSeatId === null) return;
    const seat = playerSeat();
    if (seat) {
      seat.occupied = false;
      seat.isPlayer = false;
      seat.visitor  = null;
    }
    CinemaState.playerSeatId = null;
  }

  // ─── Voting helpers ───────────────────────────────────────────────────────────

  function startVoting() {
    CinemaState.mode = 'voting';
    // Pick 3 random films
    const pool = FILMS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    CinemaState.voteFilms = pool;
    CinemaState.votes = {};
    pool.forEach(f => { CinemaState.votes[f.id] = 0; });
    CinemaState.voteTimer = CinemaState.VOTE_DURATION;
    chat('🗳️ Vote for tonight\'s film! 30 seconds. Click a poster to vote.');
  }

  function castVote(filmId) {
    if (CinemaState.mode !== 'voting') return;
    if (!CinemaState.votes.hasOwnProperty(filmId)) return;
    CinemaState.votes[filmId]++;
    chat('👍 Your vote for ' + FILMS.find(f => f.id === filmId).title + ' is counted!');
  }

  function resolveVote() {
    const votes = CinemaState.votes;
    let winner = null, best = -1;
    Object.keys(votes).forEach(id => {
      if (votes[id] > best) { best = votes[id]; winner = id; }
    });
    const film = FILMS.find(f => f.id === winner) || CinemaState.voteFilms[0];
    startScreening(film);
  }

  function startScreening(film) {
    CinemaState.currentFilm   = film;
    CinemaState.mode          = 'screening';
    CinemaState.screeningStart = performance.now();
    CinemaState.titleCardEnd   = CinemaState.screeningStart + 5000; // 5 sec title card
    CinemaState.lightsTarget   = 0.1;
    CinemaState.projectorOn    = true;
    CinemaState.playerRated    = false;
    CinemaState.ratings        = [];
    chat('🎬 NOW SHOWING: ' + film.poster + ' ' + film.title + ' (' + film.year + ')', '#ffd700');
    chat('💬 Whisper mode active during screening. Keep it quiet!', '#aaaaaa');
  }

  function endScreening() {
    CinemaState.mode         = 'discussion';
    CinemaState.lightsTarget = 1.0;
    CinemaState.projectorOn  = false;
    chat('✨ THE END — What did you think? Rate the film below!', '#ffcc88');
    chat('💬 Discussion mode: say whatever you feel. Hot takes welcome.', '#aaaaaa');
  }

  // ─── Dust motes ──────────────────────────────────────────────────────────────

  function spawnDustMote(cW, cH) {
    // In the projector beam: triangle from back-wall projector hole → screen
    // projector source: back wall, center-top area
    const srcX = cW * 0.5 + (Math.random() - 0.5) * cW * 0.04;
    const srcY = cH * 0.08;
    // random point along beam path
    const frac = Math.random();
    const screenCX = cW * 0.5;
    const screenBY = cH * 0.38;
    return {
      x: srcX + (screenCX - srcX) * frac + (Math.random() - 0.5) * cW * 0.12 * frac,
      y: srcY + (screenBY - srcY) * frac + (Math.random() - 0.5) * cH * 0.06 * frac,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.04 - Math.random() * 0.06,
      life: 180 + Math.random() * 120,
      maxLife: 300,
      size: 0.8 + Math.random() * 1.2,
    };
  }

  // ─── Reaction particle factory ────────────────────────────────────────────────

  function spawnReaction(emoji) {
    const seat = playerSeat();
    let sx = W() * 0.5, sy = H() * 0.65;
    if (seat) { sx = seat.x; sy = seat.y - 10; }
    CinemaState.reactions.push({
      emoji,
      x: sx,
      y: sy,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -1.5 - Math.random() * 1.0,
      life: 120,
      maxLife: 120,
      alpha: 1,
    });
    CinemaState.reactionCounts[emoji] = (CinemaState.reactionCounts[emoji] || 0) + 1;
  }

  // ─── Whisper chat ─────────────────────────────────────────────────────────────

  function addWhisper(text) {
    CinemaState.whispers.push({
      text: '💬 ' + text,
      life: 300,   // ~5 seconds at 60fps
      maxLife: 300,
      y: H() * 0.88 - CinemaState.whispers.length * 14,
    });
    // Keep max 5 whispers visible
    if (CinemaState.whispers.length > 5) CinemaState.whispers.shift();
  }

  // ─── Main Renderer ────────────────────────────────────────────────────────────

  function renderCinema() {
    const c  = ctx();
    if (!c) return;

    const cW = W(), cH = H();
    const now = performance.now();
    const tm  = t();

    ensureSeats();

    // ── Update lights ──
    const lights = CinemaState;
    if (lights.lightsLevel < lights.lightsTarget) {
      lights.lightsLevel = Math.min(lights.lightsTarget, lights.lightsLevel + lights.lightsFadeRate / 60);
    } else if (lights.lightsLevel > lights.lightsTarget) {
      lights.lightsLevel = Math.max(lights.lightsTarget, lights.lightsLevel - lights.lightsFadeRate / 60);
    }
    const lv = lights.lightsLevel;

    // ── Update vote timer ──
    if (lights.mode === 'voting') {
      lights.voteTimer -= 1 / 60;
      if (lights.voteTimer <= 0) resolveVote();
    }

    // ── Update screening timer ──
    if (lights.mode === 'screening' && lights.currentFilm) {
      const elapsed = (now - lights.screeningStart) / 1000;
      if (elapsed >= lights.currentFilm.durationSec) endScreening();
    }

    // ── Background: art deco dark red/gold wallpaper ──
    const wallColor = lerpColor('#1a0808', '#2a100a', lv);
    c.fillStyle = wallColor;
    c.fillRect(0, 0, cW, cH);

    // Wallpaper chevron pattern (art deco)
    drawWallpaperPattern(c, cW, cH, lv);

    // ── Carpet ──
    drawCarpet(c, cW, cH, lv);

    // ── Wall sconces ──
    drawSconces(c, cW, cH, lv, tm);

    // ── Projector beam ──
    if (lights.projectorOn) {
      drawProjectorBeam(c, cW, cH, tm);
      // Spawn dust motes
      if (Math.random() < 0.15 && lights.dustMotes.length < 40) {
        lights.dustMotes.push(spawnDustMote(cW, cH));
      }
    } else {
      lights.dustMotes = [];
    }

    // ── Update & draw dust motes ──
    for (let i = lights.dustMotes.length - 1; i >= 0; i--) {
      const m = lights.dustMotes[i];
      m.x    += m.vx;
      m.y    += m.vy;
      m.life -= 1;
      if (m.life <= 0) { lights.dustMotes.splice(i, 1); continue; }
      const mAlpha = Math.min(1, m.life / 30) * 0.5;
      c.fillStyle = `rgba(255,240,200,${mAlpha})`;
      c.beginPath();
      c.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      c.fill();
    }

    // ── Cinema screen ──
    drawScreen(c, cW, cH, now, tm, lv);

    // ── Marquee ──
    drawMarquee(c, cW, cH, tm);

    // ── Seats ──
    drawSeats(c, cW, cH, tm, lv);

    // ── Reaction particles ──
    updateReactions(c, cH);

    // ── Whisper messages ──
    if (lights.mode === 'screening') {
      drawWhispers(c, cW, cH);
    }

    // ── Rating UI ──
    if (lights.mode === 'discussion') {
      drawRatingUI(c, cW, cH);
    }

    // ── Reaction bar ──
    drawReactionBar(c, cW, cH);

    // ── Vote UI ──
    if (lights.mode === 'voting') {
      drawVoteUI(c, cW, cH, tm);
    }

    // ── Idle prompt ──
    if (lights.mode === 'idle') {
      drawIdlePrompt(c, cW, cH, tm);
    }

    // ── Screening timer HUD ──
    if (lights.mode === 'screening') {
      drawScreeningTimer(c, cW, cH, now);
    }

    // ── Marquee tick ──
    lights.marqueeTick += 1 / 60;
  }

  // ─── Sub-renderers ────────────────────────────────────────────────────────────

  function drawWallpaperPattern(c, cW, cH, lv) {
    const alpha = 0.04 + lv * 0.04;
    c.strokeStyle = `rgba(220,180,80,${alpha})`;
    c.lineWidth = 1;
    // Art deco diamond grid
    const step = 32;
    c.beginPath();
    for (let x = 0; x < cW; x += step) {
      for (let y = 0; y < cH * 0.85; y += step) {
        // Diamond shape
        c.moveTo(x + step / 2, y);
        c.lineTo(x + step, y + step / 2);
        c.lineTo(x + step / 2, y + step);
        c.lineTo(x, y + step / 2);
        c.closePath();
      }
    }
    c.stroke();

    // Gold vertical trim bands at edges
    const bandA = 0.06 + lv * 0.04;
    const grad = c.createLinearGradient(0, 0, cW * 0.06, 0);
    grad.addColorStop(0, `rgba(180,140,50,${bandA})`);
    grad.addColorStop(1, 'rgba(180,140,50,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, cW * 0.06, cH);

    const gradR = c.createLinearGradient(cW * 0.94, 0, cW, 0);
    gradR.addColorStop(0, 'rgba(180,140,50,0)');
    gradR.addColorStop(1, `rgba(180,140,50,${bandA})`);
    c.fillStyle = gradR;
    c.fillRect(cW * 0.94, 0, cW * 0.06, cH);
  }

  function drawCarpet(c, cW, cH) {
    // Dark burgundy carpet covers bottom portion
    const carpetY = cH * 0.88;
    c.fillStyle = '#1c0505';
    c.fillRect(0, carpetY, cW, cH - carpetY);

    // Carpet pattern: small gold diamonds
    c.fillStyle = 'rgba(160,120,40,0.08)';
    const ps = 10;
    for (let x = 0; x < cW; x += ps) {
      for (let y = carpetY; y < cH; y += ps) {
        if (((x / ps | 0) + (y / ps | 0)) % 2 === 0) {
          c.fillRect(x, y, ps - 1, ps - 1);
        }
      }
    }

    // Carpet border stripe (gold)
    c.fillStyle = 'rgba(180,140,50,0.25)';
    c.fillRect(0, carpetY, cW, 2);
  }

  function drawSconces(c, cW, cH, lv, tm) {
    const sconces = [
      { x: cW * 0.08, y: cH * 0.35 },
      { x: cW * 0.92, y: cH * 0.35 },
      { x: cW * 0.08, y: cH * 0.60 },
      { x: cW * 0.92, y: cH * 0.60 },
    ];

    sconces.forEach(({ x, y }) => {
      // Sconce body
      c.fillStyle = '#8a6a20';
      c.fillRect(x - 5, y - 12, 10, 18);
      c.fillStyle = '#b08820';
      c.fillRect(x - 4, y - 11, 8, 6);

      // Warm glow orb — scaled by lights level
      const glow = lv * (0.8 + Math.sin(tm * 0.7 + x) * 0.1);
      const rad  = c.createRadialGradient(x, y - 6, 0, x, y - 6, 55 * lv + 5);
      rad.addColorStop(0, `rgba(255,200,100,${0.45 * glow})`);
      rad.addColorStop(0.4, `rgba(255,160,60,${0.15 * glow})`);
      rad.addColorStop(1, 'rgba(255,120,30,0)');
      c.fillStyle = rad;
      c.beginPath();
      c.arc(x, y - 6, 55 * lv + 5, 0, Math.PI * 2);
      c.fill();

      // Glowing bulb
      c.fillStyle = `rgba(255,240,180,${0.9 * lv})`;
      c.beginPath();
      c.arc(x, y - 6, 4, 0, Math.PI * 2);
      c.fill();
    });
  }

  function drawProjectorBeam(c, cW, cH) {
    // Projector: small box at top-center back wall
    const projX = cW * 0.5;
    const projY = cH * 0.04;

    // Screen target: center of screen area
    const screenL = cW * 0.20;
    const screenR = cW * 0.80;
    const screenT = cH * 0.08;
    const screenB = cH * 0.40;
    const screenCX = cW * 0.5;
    const screenBY = screenB;

    // Cone of light: projector hole → screen edges
    c.save();
    c.globalAlpha = 0.07;
    const beamGrad = c.createLinearGradient(projX, projY, screenCX, screenBY);
    beamGrad.addColorStop(0, 'rgba(255,255,240,0.9)');
    beamGrad.addColorStop(1, 'rgba(255,255,200,0.05)');
    c.fillStyle = beamGrad;
    c.beginPath();
    c.moveTo(projX - 4, projY);
    c.lineTo(screenL, screenBY);
    c.lineTo(screenR, screenBY);
    c.lineTo(projX + 4, projY);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.restore();

    // Projector box
    c.fillStyle = '#222';
    c.fillRect(projX - 12, projY - 6, 24, 14);
    c.fillStyle = '#444';
    c.fillRect(projX - 10, projY - 4, 20, 10);
    // Lens glow
    c.fillStyle = 'rgba(255,250,200,0.6)';
    c.beginPath();
    c.arc(projX, projY + 3, 3, 0, Math.PI * 2);
    c.fill();
  }

  function drawScreen(c, cW, cH, now, tm, lv) {
    const sl = cW * 0.20;
    const sr = cW * 0.80;
    const st = cH * 0.08;
    const sb = cH * 0.40;
    const sw = sr - sl;
    const sh = sb - st;

    // Slight concave illusion: draw darker edges
    // Outer frame (dark metal/gold)
    c.fillStyle = '#1a1408';
    c.fillRect(sl - 8, st - 8, sw + 16, sh + 16);

    // Gold frame border
    c.strokeStyle = '#8a6820';
    c.lineWidth = 3;
    c.strokeRect(sl - 5, st - 5, sw + 10, sh + 10);

    // Screen surface
    const mode = CinemaState.mode;
    const film = CinemaState.currentFilm;

    if (mode === 'screening' && film) {
      const elapsed = now - CinemaState.screeningStart;
      if (elapsed < 5000) {
        // Title card: deep black with title text
        drawTitleCard(c, sl, st, sw, sh, film, elapsed / 5000);
      } else {
        // Active screening: poster + info
        drawFilmPoster(c, sl, st, sw, sh, film, tm);
      }
    } else if (mode === 'discussion' && film) {
      drawDiscussionScreen(c, sl, st, sw, sh, film, tm);
    } else if (mode === 'voting') {
      // Vote screen: just "VOTE!" label; actual vote UI drawn separately
      drawVoteScreen(c, sl, st, sw, sh, tm);
    } else {
      // Idle: "NEXT SCREENING" + dim screen
      drawIdleScreen(c, sl, st, sw, sh, tm);
    }

    // Concave edge darken (vignette on screen edges)
    const vign = c.createRadialGradient(cW * 0.5, (st + sb) / 2, sh * 0.25, cW * 0.5, (st + sb) / 2, sh * 0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = vign;
    c.fillRect(sl, st, sw, sh);
  }

  function drawIdleScreen(c, sl, st, sw, sh, tm) {
    c.fillStyle = '#050208';
    c.fillRect(sl, st, sw, sh);

    // Subtle scan lines
    for (let ly = st; ly < st + sh; ly += 4) {
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(sl, ly, sw, 2);
    }

    c.fillStyle = 'rgba(180,140,60,0.5)';
    c.font = `bold ${Math.round(sw * 0.045)}px monospace`;
    c.textAlign = 'center';
    c.fillText('NEXT SCREENING', sl + sw / 2, st + sh * 0.38);

    c.fillStyle = 'rgba(120,100,40,0.35)';
    c.font = `${Math.round(sw * 0.028)}px monospace`;
    c.fillText('COMING SOON', sl + sw / 2, st + sh * 0.55);

    const pulse = 0.5 + Math.sin(tm * 1.4) * 0.35;
    c.fillStyle = `rgba(255,200,80,${pulse * 0.6})`;
    c.font = `${Math.round(sw * 0.022)}px monospace`;
    c.fillText('click VOTE below to begin', sl + sw / 2, st + sh * 0.72);
    c.textAlign = 'left';
  }

  function drawVoteScreen(c, sl, st, sw, sh, tm) {
    c.fillStyle = '#07040e';
    c.fillRect(sl, st, sw, sh);

    const pulse = 0.7 + Math.sin(tm * 2) * 0.25;
    c.fillStyle = `rgba(180,100,255,${pulse})`;
    c.font = `bold ${Math.round(sw * 0.05)}px monospace`;
    c.textAlign = 'center';
    c.fillText('VOTE NOW', sl + sw / 2, st + sh * 0.4);

    c.fillStyle = `rgba(140,80,200,${0.5 + Math.sin(tm * 1.5) * 0.3})`;
    c.font = `${Math.round(sw * 0.028)}px monospace`;
    const timer = Math.max(0, Math.ceil(CinemaState.voteTimer));
    c.fillText(`${timer}s remaining`, sl + sw / 2, st + sh * 0.6);
    c.textAlign = 'left';
  }

  function drawTitleCard(c, sl, st, sw, sh, film, progress) {
    c.fillStyle = '#000000';
    c.fillRect(sl, st, sw, sh);

    // Fade in
    const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.85 ? (1 - progress) / 0.15 : 1);

    c.save();
    c.globalAlpha = alpha;

    // Film poster emoji, huge
    c.font = `${Math.round(sh * 0.35)}px serif`;
    c.textAlign = 'center';
    c.fillText(film.poster, sl + sw / 2, st + sh * 0.48);

    c.fillStyle = '#fffde8';
    c.font = `bold ${Math.round(sw * 0.048)}px 'Times New Roman', serif`;
    c.fillText(film.title, sl + sw / 2, st + sh * 0.72);

    c.fillStyle = '#aaa090';
    c.font = `${Math.round(sw * 0.025)}px monospace`;
    c.fillText(film.director + '  ·  ' + film.year, sl + sw / 2, st + sh * 0.84);
    c.textAlign = 'left';
    c.restore();
  }

  function drawFilmPoster(c, sl, st, sw, sh, film, tm) {
    // Deep space during film
    c.fillStyle = '#03020a';
    c.fillRect(sl, st, sw, sh);

    // Scan lines effect
    for (let ly = st; ly < st + sh; ly += 3) {
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(sl, ly, sw, 1);
    }

    // Film poster large
    c.font = `${Math.round(sh * 0.38)}px serif`;
    c.textAlign = 'center';
    c.fillText(film.poster, sl + sw / 2, st + sh * 0.5);

    // Film title at bottom of screen
    c.fillStyle = 'rgba(255,253,220,0.7)';
    c.font = `${Math.round(sw * 0.032)}px 'Times New Roman', serif`;
    c.fillText(film.title, sl + sw / 2, st + sh * 0.85);

    // Subtle flicker
    if (Math.random() < 0.004) {
      c.fillStyle = 'rgba(255,255,255,0.04)';
      c.fillRect(sl, st, sw, sh);
    }
    c.textAlign = 'left';
  }

  function drawDiscussionScreen(c, sl, st, sw, sh, film, tm) {
    c.fillStyle = '#0a0608';
    c.fillRect(sl, st, sw, sh);

    // "THE END" in classic style
    c.fillStyle = 'rgba(220,200,140,0.9)';
    c.font = `bold ${Math.round(sw * 0.07)}px 'Times New Roman', serif`;
    c.textAlign = 'center';
    c.fillText('THE END', sl + sw / 2, st + sh * 0.38);

    c.fillStyle = 'rgba(180,160,100,0.6)';
    c.font = `${Math.round(sw * 0.025)}px monospace`;
    c.fillText(film.title.toUpperCase() + '  ·  ' + film.year, sl + sw / 2, st + sh * 0.53);

    // Avg rating if any
    if (CinemaState.ratings.length > 0) {
      const avg = CinemaState.ratings.reduce((a, b) => a + b, 0) / CinemaState.ratings.length;
      const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
      c.fillStyle = '#ffd700';
      c.font = `${Math.round(sw * 0.04)}px monospace`;
      c.fillText(stars + '  ' + avg.toFixed(1), sl + sw / 2, st + sh * 0.70);
    } else {
      const pulse = 0.5 + Math.sin(tm * 2) * 0.35;
      c.fillStyle = `rgba(255,220,80,${pulse})`;
      c.font = `${Math.round(sw * 0.03)}px monospace`;
      c.fillText('Rate the film below!', sl + sw / 2, st + sh * 0.70);
    }

    c.textAlign = 'left';
  }

  function drawMarquee(c, cW, cH, tm) {
    const film = CinemaState.currentFilm;
    const label = film
      ? 'NOW SHOWING: ' + film.poster + ' ' + film.title.toUpperCase()
      : 'THE CINEMA  ·  RING STATION  ·  SEGMENT 12';

    const mY  = cH * 0.044;
    const mX1 = cW * 0.20;
    const mX2 = cW * 0.80;
    const mW  = mX2 - mX1;

    // Marquee background
    c.fillStyle = '#1c0e00';
    c.fillRect(mX1 - 6, mY - 12, mW + 12, 24);

    // Gold border
    c.strokeStyle = '#8a6020';
    c.lineWidth = 1.5;
    c.strokeRect(mX1 - 6, mY - 12, mW + 12, 24);

    // Chasing light dots
    const dotCount = 24;
    const dotSpacing = mW / dotCount;
    const tick = Math.floor(tm * 8) % dotCount;

    for (let i = 0; i < dotCount; i++) {
      const lit = (i % 3 === tick % 3);
      c.fillStyle = lit ? 'rgba(255,220,80,0.9)' : 'rgba(100,70,20,0.5)';
      const dx = mX1 + i * dotSpacing + dotSpacing / 2;
      c.beginPath();
      c.arc(dx, mY - 8, 2.5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(dx, mY + 8, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // Label text
    c.fillStyle = '#ffe08a';
    c.font = `bold ${Math.round(mW * 0.038)}px monospace`;
    c.textAlign = 'center';

    // Clip to marquee area so text doesn't overflow
    c.save();
    c.beginPath();
    c.rect(mX1, mY - 9, mW, 18);
    c.clip();
    c.fillText(label, mX1 + mW / 2, mY + 4);
    c.restore();
    c.textAlign = 'left';
  }

  function drawSeats(c, cW, cH, tm, lv) {
    const seats = CinemaState.seats;
    const seatW = 28;
    const seatH = 22;

    seats.forEach(seat => {
      const { x, y, occupied, isPlayer } = seat;
      const cx = x, cy = y;

      // Seat shadow
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(cx - seatW / 2 + 3, cy + 4, seatW, 4);

      // Seat base (gold armrests)
      c.fillStyle = '#7a5010';
      c.fillRect(cx - seatW / 2 - 3, cy - 2, 5, seatH);
      c.fillRect(cx + seatW / 2 - 2, cy - 2, 5, seatH);
      c.fillStyle = '#b07828';
      c.fillRect(cx - seatW / 2 - 3, cy - 2, 5, 5);
      c.fillRect(cx + seatW / 2 - 2, cy - 2, 5, 5);

      // Seat back (red velvet)
      const seatColor = isPlayer ? '#ff4466' : (occupied ? '#882030' : '#6a1828');
      c.fillStyle = seatColor;
      c.fillRect(cx - seatW / 2, cy - seatH * 0.7, seatW, seatH * 0.7);

      // Seat cushion
      c.fillStyle = occupied ? (isPlayer ? '#dd2244' : '#7a1822') : '#4a0e14';
      c.fillRect(cx - seatW / 2, cy, seatW, seatH * 0.45);

      // Velvet sheen
      c.fillStyle = 'rgba(255,180,180,0.06)';
      c.fillRect(cx - seatW / 2 + 3, cy - seatH * 0.65, seatW - 6, 4);

      // Visitor sprite (simple pixel person)
      if (occupied) {
        const headY = cy - seatH * 0.7 - 10;
        // Head
        c.fillStyle = isPlayer ? '#00fff7' : '#ffcc88';
        c.fillRect(cx - 5, headY - 8, 10, 9);
        // Eyes
        c.fillStyle = isPlayer ? '#003344' : '#331100';
        c.fillRect(cx - 3, headY - 6, 2, 2);
        c.fillRect(cx + 1, headY - 6, 2, 2);
        // Body (in seat)
        c.fillStyle = isPlayer ? '#006688' : '#445566';
        c.fillRect(cx - 6, headY, 12, 10);
      }

      // Hover highlight if empty (for click affordance)
      if (!occupied) {
        const pulse = 0.3 + Math.sin(tm * 1.5 + seat.id) * 0.15;
        c.strokeStyle = `rgba(255,200,100,${pulse * lv * 0.6})`;
        c.lineWidth = 1;
        c.strokeRect(cx - seatW / 2, cy - seatH * 0.7, seatW, seatH * 1.15);
      }
    });
  }

  function updateReactions(c, cH) {
    for (let i = CinemaState.reactions.length - 1; i >= 0; i--) {
      const r = CinemaState.reactions[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy -= 0.02; // slight acceleration upward
      r.life -= 1;
      if (r.life <= 0) { CinemaState.reactions.splice(i, 1); continue; }
      const alpha = Math.min(1, r.life / 20);
      const scale = 1 + (1 - r.life / r.maxLife) * 0.5;
      c.save();
      c.globalAlpha = alpha;
      c.font = `${Math.round(22 * scale)}px serif`;
      c.textAlign = 'center';
      c.fillText(r.emoji, r.x, r.y);
      c.restore();
    }
    c.textAlign = 'left';
  }

  function drawWhispers(c, cW, cH) {
    const whispers = CinemaState.whispers;
    for (let i = whispers.length - 1; i >= 0; i--) {
      const w = whispers[i];
      w.life -= 1;
      if (w.life <= 0) { whispers.splice(i, 1); continue; }
      const alpha = Math.min(0.6, w.life / 30) * 0.6;
      c.fillStyle = `rgba(180,180,180,${alpha})`;
      c.font = '10px monospace';
      c.textAlign = 'left';
      c.fillText(w.text, cW * 0.04, w.y);
    }
  }

  function drawReactionBar(c, cW, cH) {
    const emojis = ['👏', '😂', '😢', '🔥', '💀', '❤️'];
    const barW   = emojis.length * 48 + 16;
    const barX   = (cW - barW) / 2;
    const barY   = cH * 0.915;
    const barH   = 34;

    // Background pill
    c.fillStyle = 'rgba(10,5,20,0.75)';
    roundRect(c, barX, barY, barW, barH, 8);
    c.fill();
    c.strokeStyle = 'rgba(100,70,180,0.4)';
    c.lineWidth = 1;
    roundRect(c, barX, barY, barW, barH, 8);
    c.stroke();

    emojis.forEach((emoji, i) => {
      const ex = barX + 8 + i * 48;
      const ey = barY + 4;

      // Emoji
      c.font = '18px serif';
      c.textAlign = 'left';
      c.fillText(emoji, ex, ey + 18);

      // Count tally
      const count = CinemaState.reactionCounts[emoji] || 0;
      if (count > 0) {
        c.fillStyle = 'rgba(180,160,255,0.75)';
        c.font = '8px monospace';
        c.fillText(count > 99 ? '99+' : String(count), ex + 22, ey + 12);
      }
    });
    c.textAlign = 'left';
  }

  function drawVoteUI(c, cW, cH, tm) {
    const films  = CinemaState.voteFilms;
    if (!films.length) return;

    const panelW  = Math.min(cW * 0.88, 480);
    const panelH  = 110;
    const panelX  = (cW - panelW) / 2;
    const panelY  = cH * 0.42;

    films.forEach((film, i) => {
      const fy = panelY + i * (panelH + 8);
      const fx = panelX;
      const votes = CinemaState.votes[film.id] || 0;
      const pulse = i === 0 ? Math.sin(tm * 2.5) * 0.05 : 0;

      // Panel bg
      c.fillStyle = 'rgba(8,4,18,0.88)';
      roundRect(c, fx, fy, panelW, panelH, 6);
      c.fill();

      // Border
      c.strokeStyle = votes > 0 ? 'rgba(160,100,255,0.7)' : 'rgba(60,40,100,0.5)';
      c.lineWidth   = votes > 0 ? 2 : 1;
      roundRect(c, fx, fy, panelW, panelH, 6);
      c.stroke();

      // Poster emoji
      c.font = `${Math.round(panelH * 0.55)}px serif`;
      c.textAlign = 'left';
      c.fillText(film.poster, fx + 12, fy + panelH * 0.7);

      // Film info
      c.fillStyle = '#ffe8c0';
      c.font = `bold ${Math.round(panelW * 0.04)}px monospace`;
      c.fillText(film.title, fx + 68, fy + 30);

      c.fillStyle = '#998070';
      c.font = `${Math.round(panelW * 0.028)}px monospace`;
      c.fillText(film.director + '  ·  ' + film.year + '  ·  ' + film.duration, fx + 68, fy + 50);

      c.fillStyle = '#bbaadd';
      c.font = `${Math.round(panelW * 0.028)}px monospace`;
      c.fillText(film.genre, fx + 68, fy + 68);

      // Vote count badge
      c.fillStyle = votes > 0 ? '#c090ff' : '#605060';
      c.font = `bold ${Math.round(panelW * 0.038)}px monospace`;
      c.textAlign = 'right';
      c.fillText(votes + (votes === 1 ? ' vote' : ' votes'), fx + panelW - 12, fy + panelH * 0.55);
      c.textAlign = 'left';
    });
  }

  function drawIdlePrompt(c, cW, cH, tm) {
    // Small "VOTE" button below the screen
    const btnW = 100, btnH = 28;
    const btnX = (cW - btnW) / 2;
    const btnY = cH * 0.425;
    const pulse = 0.7 + Math.sin(tm * 1.8) * 0.25;

    c.fillStyle = `rgba(60,20,120,${pulse * 0.8})`;
    roundRect(c, btnX, btnY, btnW, btnH, 5);
    c.fill();
    c.strokeStyle = `rgba(140,80,255,${pulse})`;
    c.lineWidth = 1.5;
    roundRect(c, btnX, btnY, btnW, btnH, 5);
    c.stroke();

    c.fillStyle = `rgba(220,180,255,${pulse})`;
    c.font = `bold 13px monospace`;
    c.textAlign = 'center';
    c.fillText('▶  START VOTE', btnX + btnW / 2, btnY + 18);
    c.textAlign = 'left';
  }

  function drawRatingUI(c, cW, cH) {
    if (CinemaState.playerRated) return;

    const barW = 200;
    const barX = (cW - barW) / 2;
    const barY = cH * 0.42;
    const barH = 30;

    c.fillStyle = 'rgba(8,4,18,0.85)';
    roundRect(c, barX - 8, barY - 8, barW + 16, barH + 16, 6);
    c.fill();
    c.strokeStyle = 'rgba(255,200,60,0.4)';
    c.lineWidth = 1;
    roundRect(c, barX - 8, barY - 8, barW + 16, barH + 16, 6);
    c.stroke();

    c.fillStyle = '#ddcc80';
    c.font = '11px monospace';
    c.textAlign = 'center';
    c.fillText('Rate the film:', cW / 2, barY + 4);

    // 5 stars
    for (let s = 1; s <= 5; s++) {
      c.font = '20px serif';
      c.fillStyle = '#ffd700';
      c.fillText('★', barX + (s - 1) * 38 + 8, barY + 26);
    }
    c.textAlign = 'left';
  }

  function drawScreeningTimer(c, cW, cH, now) {
    const film    = CinemaState.currentFilm;
    if (!film) return;
    const elapsed = (now - CinemaState.screeningStart) / 1000;
    const remain  = Math.max(0, film.durationSec - elapsed);
    const mm      = String(Math.floor(remain / 60)).padStart(2, '0');
    const ss      = String(Math.floor(remain % 60)).padStart(2, '0');

    c.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(c, cW - 86, 6, 80, 20, 4);
    c.fill();
    c.fillStyle = 'rgba(140,210,140,0.8)';
    c.font = '10px monospace';
    c.textAlign = 'right';
    c.fillText('⏱ ' + mm + ':' + ss, cW - 10, 20);
    c.textAlign = 'left';
  }

  // ─── Utility: lerp hex colors ─────────────────────────────────────────────────

  function lerpColor(hex1, hex2, t) {
    const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    const r  = Math.round(c1.r + (c2.r - c1.r) * t);
    const g  = Math.round(c1.g + (c2.g - c1.g) * t);
    const b  = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  function hexToRgb(hex) {
    const v = parseInt(hex.replace('#', ''), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  // ─── Click handling ───────────────────────────────────────────────────────────

  function onCanvasClick(e) {
    const canvas = e.target;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx     = (e.clientX - rect.left) * scaleX;
    const my     = (e.clientY - rect.top)  * scaleY;

    const cW = W(), cH = H();

    // Only handle if on floor 12
    const s = S();
    if (!s || s.floor !== 12) return;

    // ── Seat clicks ──
    ensureSeats();
    const seatW = 28, seatH = 22;
    for (const seat of CinemaState.seats) {
      const sx = seat.x - seatW / 2, sy = seat.y - seatH * 0.7;
      if (mx >= sx && mx <= sx + seatW && my >= sy && my <= sy + seatH * 1.15) {
        if (seat.isPlayer) {
          standPlayer();
          return;
        } else if (!seat.occupied) {
          sitPlayer(seat.id);
          return;
        }
      }
    }

    // ── Reaction bar clicks ──
    const emojis = ['👏', '😂', '😢', '🔥', '💀', '❤️'];
    const barW   = emojis.length * 48 + 16;
    const barX   = (cW - barW) / 2;
    const barY   = cH * 0.915;
    const barH   = 34;
    if (mx >= barX && mx <= barX + barW && my >= barY && my <= barY + barH) {
      const idx = Math.floor((mx - barX - 8) / 48);
      if (idx >= 0 && idx < emojis.length) {
        spawnReaction(emojis[idx]);
        return;
      }
    }

    // ── Vote panel clicks ──
    if (CinemaState.mode === 'voting') {
      const films = CinemaState.voteFilms;
      const panelW = Math.min(cW * 0.88, 480);
      const panelH = 110;
      const panelX = (cW - panelW) / 2;
      const panelY = cH * 0.42;
      for (let i = 0; i < films.length; i++) {
        const fy = panelY + i * (panelH + 8);
        if (mx >= panelX && mx <= panelX + panelW && my >= fy && my <= fy + panelH) {
          castVote(films[i].id);
          return;
        }
      }
    }

    // ── Idle "START VOTE" button ──
    if (CinemaState.mode === 'idle') {
      const btnW = 100, btnH = 28;
      const btnX = (cW - btnW) / 2;
      const btnY = cH * 0.425;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        startVoting();
        return;
      }
    }

    // ── Rating stars (discussion mode) ──
    if (CinemaState.mode === 'discussion' && !CinemaState.playerRated) {
      const barW2 = 200;
      const barX2 = (cW - barW2) / 2;
      const barY2 = cH * 0.42;
      const barH2 = 30;
      if (mx >= barX2 - 8 && mx <= barX2 + barW2 + 8 && my >= barY2 - 8 && my <= barY2 + barH2 + 8) {
        const starIdx = Math.floor((mx - barX2) / 38) + 1;
        if (starIdx >= 1 && starIdx <= 5) {
          CinemaState.ratings.push(starIdx);
          CinemaState.playerRated = true;
          const stars = '★'.repeat(starIdx) + '☆'.repeat(5 - starIdx);
          chat('⭐ You rated: ' + stars + ' (' + starIdx + '/5)');
          return;
        }
      }
    }
  }

  // ─── Register floor renderer ──────────────────────────────────────────────────

  /**
   * We override window.renderFloor12.
   * visual-polish.js wraps renderFloor12 to layer its effects on top.
   * Since visual-polish.js loads before us and wraps the original, we need to:
   *   1. Save the current window.renderFloor12 (the wrapped gym renderer)
   *   2. Install our own function that renders the Cinema
   * This means visual-polish effects will layer on top of our cinema — ideal.
   */
  function installRenderer() {
    // Replace the floor 12 renderer entirely with Cinema
    window.renderFloor12 = function renderFloor12() {
      const c = ctx();
      if (!c) return;
      c.save();
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0);
      renderCinema();
      c.restore();
    };

    console.log('[Cinema] 🎬 renderFloor12 installed — The Cinema is open.');
  }

  // ─── Install click handler ────────────────────────────────────────────────────

  function installClickHandler() {
    // Try to find the canvas and attach a click listener
    function tryAttach() {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('click', onCanvasClick, false);
        console.log('[Cinema] 🎬 Click handler attached to canvas.');
        return true;
      }
      return false;
    }

    if (!tryAttach()) {
      // DOM not ready yet — wait
      const obs = new MutationObserver(function() {
        if (tryAttach()) obs.disconnect();
      });
      obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  window.EchoCinema = {
    state:         CinemaState,
    films:         FILMS,
    startVoting:   startVoting,
    startScreening:startScreening,
    endScreening:  endScreening,
    castVote:      castVote,
    sitPlayer:     sitPlayer,
    standPlayer:   standPlayer,
    spawnReaction: spawnReaction,
    addWhisper:    addWhisper,
    // Simulate some visitors in seats for atmosphere
    populateDemoSeats() {
      ensureSeats();
      const visitors = [
        { name: 'Ana',    color: '#ff88cc' },
        { name: 'Ko',     color: '#88ffcc' },
        { name: 'Ren',    color: '#ffaa55' },
        { name: 'Sable',  color: '#aa88ff' },
      ];
      const available = CinemaState.seats.filter(s => !s.occupied && !s.isPlayer);
      visitors.forEach((v, i) => {
        if (available[i]) {
          available[i].occupied = true;
          available[i].visitor  = v;
        }
      });
    },
    version: '1.0.0',
  };

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  installRenderer();
  installClickHandler();

  // Greet when entering floor 12
  (function watchFloor() {
    let lastFloor = null;
    const orig = window.requestAnimationFrame;
    // Lightweight floor watcher: check every 2 seconds
    setInterval(function() {
      const s = S();
      if (!s) return;
      if (s.floor === 12 && lastFloor !== 12) {
        // Just arrived at the Cinema
        const film = CinemaState.currentFilm;
        if (CinemaState.mode === 'screening' && film) {
          chat('🤫 A film is in progress: ' + film.poster + ' ' + film.title + '. Find a seat quietly.');
        } else if (CinemaState.mode === 'voting') {
          chat('🗳️ Voting is live! Pick your film.');
        } else {
          chat('🎬 Welcome to The Cinema. Pixel art silver screen since \'23. Click a seat or start a vote!');
        }
      }
      lastFloor = s && s.floor;
    }, 2000);
  })();

  console.log('[Cinema] 🎬 The Cinema — v1.0.0 — "Where culture lives on the station."');

})();
