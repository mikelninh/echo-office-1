/* ═══════════════════════════════════════════════════════════════════════
   ECHO RUN — a neon space-station platformer for Echo's Space Station.

   Designed as a PLUGGABLE game module (dual deployment):
     • Standalone  — public/games/platformer.html mounts it on its own canvas.
     • Embedded    — the station (Floor 3 arcade) mounts the SAME module.

   Usage:
     const game = EchoRun.mount(container, {
       transport: 'local',          // 'local' (solo) — 'socket' reserved for netplay
       context:   'standalone',     // 'standalone' | 'station'
       difficulty: null,            // null = show menu; or 'chill'|'normal'|'hard'|'kaizo'
       onCoins:   (n) => {},        // station hook: award ◈ coins (optional)
       onExit:    () => {},         // called when player exits to station
     });
     // later: game.destroy();

   No build step. Vanilla. Canvas + Web Audio. Attaches to window.EchoRun and
   registers into window.PartyGames if that registry exists.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const TILE = 24;            // logical pixels per tile
  const VIEW_TILES_Y = 15;    // virtual viewport height in tiles
  const GRAVITY = 2000;       // px/s²
  const MAX_FALL = 1400;
  const RUN_ACCEL = 2600;
  const RUN_FRICTION = 2400;
  const AIR_ACCEL = 1900;

  // ── Difficulty tuning. Kaizo is meant to be *almost impossible*. ──────────
  const DIFFICULTIES = {
    chill:  { label: 'CHILL',  color: '#7CFFCB', sub: 'a gentle stroll',
              maxRun: 200, jumpVel: 720, coyote: 0.18, buffer: 0.18,
              checkpoints: true, hazards: 'soft', fakes: false, crumbleTime: 0.55 },
    normal: { label: 'NORMAL', color: '#00fff7', sub: 'the classic feel',
              maxRun: 230, jumpVel: 740, coyote: 0.10, buffer: 0.10,
              checkpoints: true, hazards: 'hard', fakes: false, crumbleTime: 0.40 },
    hard:   { label: 'HARD',   color: '#ffb347', sub: 'tight jumps, few mercies',
              maxRun: 260, jumpVel: 760, coyote: 0.06, buffer: 0.07,
              checkpoints: true, hazards: 'hard', fakes: true,  crumbleTime: 0.28 },
    kaizo:  { label: 'KAIZO',  color: '#ff6ec7', sub: 'almost impossible. good luck.',
              maxRun: 285, jumpVel: 775, coyote: 0.03, buffer: 0.04,
              checkpoints: false, hazards: 'hard', fakes: true, crumbleTime: 0.18 },
  };

  // Death taunts escalate the longer you suffer — built for reactions/streaming.
  const TAUNTS = [
    'Oof.', 'So close.', 'Try again.', 'The floor is lava.', 'It happens.',
    'Skill issue?', 'Almost!', 'Believe in yourself.', 'The void hungers.',
    'That spike had it coming for you.', 'Have you considered NOT dying?',
    'Echo is watching. Echo is concerned.', 'Legends are forged here.',
    'This is fine.', 'Pixel believes in you. 🐱', 'Rage = +1 viewer.',
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // LEVELS. Legend:
  //   '#' solid   '=' platform-block   '^' spike (up)   'v' spike (ceiling)
  //   'o' coin ◈  'C' checkpoint       'F' finish flag  '@' spawn
  //   'x' crumbling block (breaks shortly after you stand on it)
  //   '!' FAKE block (looks solid on hard/kaizo, but you fall through — troll)
  //   'm' moving platform
  // Each level is bottom-aligned; all rows share a width.
  // ─────────────────────────────────────────────────────────────────────────
  const LEVELS = {
    chill: [
      '                                                                    ',
      '                                                                    ',
      '                                          o o o                     ',
      '                          o            ========                  F  ',
      '                  o      ===                            o o     ### ',
      '        o o      ===                 C        o o      ===    ##### ',
      '       =====              o o               =====            ###### ',
      '  @            o o      =======      o o                  ########## ',
      '====        =======              ========       ==================== ',
      '####        #######              ########       #################### ',
      '####        #######              ########       #################### ',
      '####        #######              ########       #################### ',
      '####        #######              ########       #################### ',
      '####################~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~################### ',
      '#####################################################################',
    ],
    normal: [
      '                                                                          ',
      '                                                                          ',
      '                            o                      o o                    ',
      '                  o o     =====        C          =====                F  ',
      '           o     ====              o            x x x            o    #### ',
      '   @      ===            ^^      =====                      o o    ###### ',
      '====            o o            ========       o o        =====   ######## ',
      '####           xxxx                        =======              ######### ',
      '####     ^^             ^^^^         ^^^            ^^^^      ############# ',
      '####    ====        ========       =====        ========    ############# ',
      '####    ####        ########       #####        ########    ############# ',
      '####    ####        ########       #####        ########    ############# ',
      '####~~~~####~~~~~~~~~########~~~~~~~#####~~~~~~~~########~~~~~############# ',
      '####    ####        ########       #####        ########    ############# ',
      '##########################################################################',
    ],
    hard: [
      '                                                                                ',
      '                  o          !!!                  o o                            ',
      '          o     =====                  C        =======              o        F  ',
      '   @     ===           ^^^      xxx                       x x      =====    ##### ',
      '====           o     =====           ^^^^      =====                     ######## ',
      '####          ===              !!!          xxxx          ^^^^         ########## ',
      '####    ^^           ^^^^^             ^^^^         ^^^^^         ^^   ########### ',
      '####   ====        =======           ======       =======       ==   ########### ',
      '####   ####        #######           ######       #######       ##   ########### ',
      '####~~~####~~~~~~~~~#######~~~~~~~~~~~######~~~~~~~#######~~~~~~~~##~~~~########### ',
      '####   ####        #######           ######       #######       ##   ########### ',
      '####   ####        #######           ######       #######       ##   ########### ',
      '####   ####        #######           ######       #######       ##   ########### ',
      '####   ####        #######           ######       #######       ##   ########### ',
      '################################################################################',
    ],
    // KAIZO: no checkpoints, fake blocks, crumble chains, spike gauntlets,
    // pixel-perfect spacing. This level wants to break you. Lovingly.
    kaizo: [
      '                                                                                          ',
      '            !!!          x x x          !!!!          x x          !!!                   F ',
      '     o     =====   ^^                          ^^^                       ^^      o     ### ',
      '  @       ===          x x x      !!!      x x x        !!!!      x x x      =====   ##### ',
      '===           ^^^                      ^^^^                   ^^^^                  ###### ',
      '###      xx          !!!!         xxxx          !!!         xxxx          ^^^^    ######## ',
      '###    ^^^^^      ^^^^^^^      ^^^^^^^      ^^^^^^^      ^^^^^^^      ^^^^^^^^    ######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '###~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~######### ',
      '##########################################################################################',
    ],
  };

  // ─── tiny Web Audio helper (lazy, optional) ───────────────────────────────
  function makeAudio() {
    let ctx = null, gain = null, on = true;
    function ensure() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gain = ctx.createGain(); gain.gain.value = 0.18; gain.connect(ctx.destination);
      } catch (e) { on = false; }
    }
    function blip(freq, dur, type, vol) {
      if (!on) return; ensure(); if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.value = vol == null ? 1 : vol;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(gain); o.start(); o.stop(ctx.currentTime + dur);
    }
    return {
      ensure,
      jump: () => blip(520, 0.12, 'square', 0.6),
      coin: () => { blip(880, 0.07, 'triangle', 0.7); setTimeout(() => blip(1320, 0.08, 'triangle', 0.6), 60); },
      death: () => { blip(200, 0.18, 'sawtooth', 0.8); setTimeout(() => blip(120, 0.25, 'sawtooth', 0.7), 80); },
      check: () => { blip(660, 0.08, 'triangle'); setTimeout(() => blip(990, 0.1, 'triangle'), 70); },
      win: () => [0, 120, 240, 380].forEach((t, i) => setTimeout(() => blip([660, 880, 990, 1320][i], 0.18, 'triangle', 0.7), t)),
      toggle: () => (on = !on),
      get enabled() { return on; },
    };
  }

  // ─── parse a level into a tile grid + entity lists ────────────────────────
  function parseLevel(rows) {
    const W = Math.max(...rows.map(r => r.length));
    const grid = [];
    const coins = [], checkpoints = [], movers = [];
    let spawn = { x: 2 * TILE, y: 2 * TILE }, finish = null;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y].padEnd(W, ' ');
      const line = [];
      for (let x = 0; x < W; x++) {
        const c = row[x];
        let t = ' ';
        if (c === '#' || c === '=') t = '#';
        else if (c === '^') t = '^';
        else if (c === 'v') t = 'v';
        else if (c === '~') t = '~';
        else if (c === 'x') t = 'x';
        else if (c === '!') t = '!';
        else if (c === 'o') coins.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, got: false, ph: Math.random() * 6 });
        else if (c === 'C') checkpoints.push({ x: x * TILE, y: y * TILE, on: false });
        else if (c === 'F') finish = { x: x * TILE, y: y * TILE };
        else if (c === '@') spawn = { x: x * TILE + 2, y: y * TILE };
        else if (c === 'm') movers.push({ x0: x * TILE, y: y * TILE, range: 3 * TILE, t: 0 });
        line.push(t);
      }
      grid.push(line);
    }
    return { grid, W, H: rows.length, coins, checkpoints, movers, spawn, finish };
  }

  const EchoRun = {
    id: 'platformer',
    name: 'Echo Run',
    category: 'platformer',
    minPlayers: 1,
    maxPlayers: 4,

    mount(container, opts) {
      opts = opts || {};
      const ctx2dParent = container;
      ctx2dParent.innerHTML = '';
      ctx2dParent.style.position = ctx2dParent.style.position || 'relative';
      ctx2dParent.style.background = '#06060f';

      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.touchAction = 'none';
      canvas.style.imageRendering = 'pixelated';
      ctx2dParent.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const audio = makeAudio();

      // persistent stats
      const SKEY = 'echorun.stats.v1';
      let stats = {};
      try { stats = JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) { stats = {}; }
      function saveStats() { try { localStorage.setItem(SKEY, JSON.stringify(stats)); } catch (e) {} }
      function stat(d) { return (stats[d] = stats[d] || { deaths: 0, best: null, coins: 0, clears: 0 }); }

      // starfield (parallax space backdrop — matches the station theme)
      const stars = [];
      for (let i = 0; i < 140; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.7 + 0.1, s: Math.random() * 1.6 + 0.4 });

      const G = {
        scene: opts.difficulty ? 'play' : 'menu',  // menu | play | win
        diff: opts.difficulty || 'normal',
        menuIdx: 0,
        level: null,
        scale: 1, vw: 0, vh: 0,
        cam: 0,
        player: null,
        particles: [],
        shake: 0,
        time: 0,
        coinsThisRun: 0,
        deathsThisRun: 0,
        attempt: 1,
        taunt: '',
        deathFlash: 0,
        winT: 0,
        cleanMode: false,        // OBS-friendly minimal HUD
        last: performance.now(),
        raf: 0,
        alive: true,
      };

      // ── input ──────────────────────────────────────────────────────────
      const keys = {};
      function key(e, down) {
        const k = e.key.toLowerCase();
        const map = {
          arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
          arrowup: 'jump', w: 'jump', ' ': 'jump', z: 'jump',
        };
        if (G.scene === 'menu') {
          if (!down) return;
          if (k === 'arrowleft' || k === 'a') { G.menuIdx = (G.menuIdx + 3) % 4; audio.blip && audio.blip(); }
          if (k === 'arrowright' || k === 'd') { G.menuIdx = (G.menuIdx + 1) % 4; }
          if (k === 'enter' || k === ' ') { startLevel(['chill', 'normal', 'hard', 'kaizo'][G.menuIdx]); }
          e.preventDefault(); return;
        }
        if (k === 'r' && down) { restart(); e.preventDefault(); return; }
        if (k === 'c' && down) { G.cleanMode = !G.cleanMode; return; }
        if (k === 'escape' && down) { toMenu(); return; }
        if (k === 'm' && down) { audio.toggle(); return; }
        if (k === 'enter' && down && G.scene === 'win') { nextOrRetry(); return; }
        if (map[k] !== undefined) {
          if (map[k] === 'jump' && down) G.player && (G.player.jumpBuffer = DIFFICULTIES[G.diff].buffer);
          if (map[k] === 'jump' && !down) G.player && (G.player.jumpHeld = false);
          if (map[k] === 'jump' && down) G.player && (G.player.jumpHeld = true);
          keys[map[k]] = down;
          e.preventDefault();
        }
      }
      const kd = e => key(e, true), ku = e => key(e, false);
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);

      // ── touch controls (mobile / standalone) ─────────────────────────────
      const touchBtns = [];
      function setupTouch() {
        const mk = (label, action, side) => {
          const b = document.createElement('div');
          b.textContent = label;
          b.style.cssText = `position:absolute;bottom:18px;${side};width:64px;height:64px;` +
            `display:flex;align-items:center;justify-content:center;font:700 26px system-ui;` +
            `color:#bff;background:rgba(0,255,247,.10);border:2px solid rgba(0,255,247,.5);` +
            `border-radius:14px;user-select:none;touch-action:none;z-index:30;`;
          const set = v => { if (action === 'jump' && v) G.player && (G.player.jumpBuffer = DIFFICULTIES[G.diff].buffer, G.player.jumpHeld = true); if (action === 'jump' && !v) G.player && (G.player.jumpHeld = false); keys[action] = v; };
          b.addEventListener('touchstart', e => { e.preventDefault(); audio.ensure(); if (G.scene === 'menu') return; set(true); }, { passive: false });
          b.addEventListener('touchend', e => { e.preventDefault(); set(false); }, { passive: false });
          ctx2dParent.appendChild(b); touchBtns.push(b); return b;
        };
        if ('ontouchstart' in window) {
          mk('◀', 'left', 'left:18px');
          mk('▶', 'right', 'left:92px');
          mk('▲', 'jump', 'right:18px');
        }
      }
      setupTouch();

      // ── pointer for menu / win clicks ─────────────────────────────────────
      canvas.addEventListener('pointerdown', e => {
        audio.ensure();
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) / r.width;   // 0..1
        if (G.scene === 'menu') {
          // four difficulty cards across the middle
          const idx = Math.min(3, Math.max(0, Math.floor(mx * 4)));
          if (e.clientY - r.top > r.height * 0.30 && e.clientY - r.top < r.height * 0.72) {
            G.menuIdx = idx; startLevel(['chill', 'normal', 'hard', 'kaizo'][idx]);
          }
        } else if (G.scene === 'win') {
          nextOrRetry();
        }
      });

      // ── game flow ────────────────────────────────────────────────────────
      function startLevel(diff) {
        audio.ensure();
        G.diff = diff;
        G.level = parseLevel(LEVELS[diff]);
        // deep-clone dynamic state so retries reset crumbles/coins
        G.level.crumbles = {};
        G.scene = 'play';
        G.attempt = 1;
        G.deathsThisRun = 0;
        spawnPlayer(true);
      }
      function spawnPlayer(fullReset) {
        const L = G.level;
        const cp = L.checkpoints.find(c => c.on);
        const sx = cp ? cp.x : L.spawn.x;
        const sy = cp ? cp.y : L.spawn.y;
        G.player = {
          x: sx, y: sy, w: TILE * 0.7, h: TILE * 0.92,
          vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuffer: 0,
          jumpHeld: false, face: 1, anim: 0, alive: true, win: false,
        };
        if (fullReset) {
          L.coins.forEach(c => c.got = false);
          L.checkpoints.forEach(c => c.on = false);
          L.crumbles = {};
          G.coinsThisRun = 0;
          G.time = 0;
        } else {
          // respawn from checkpoint: reset crumbles only
          L.crumbles = {};
        }
        G.cam = Math.max(0, sx - G.vw * 0.4);
      }
      function restart() { // full restart of the level
        G.attempt++;
        spawnPlayer(true);
        G.scene = 'play';
      }
      function die() {
        if (!G.player.alive) return;
        G.player.alive = false;
        G.deathsThisRun++;
        const s = stat(G.diff); s.deaths++; saveStats();
        G.shake = 16; G.deathFlash = 0.5;
        G.taunt = TAUNTS[Math.min(TAUNTS.length - 1, Math.floor(G.deathsThisRun / 2)) % TAUNTS.length];
        audio.death();
        burst(G.player.x + G.player.w / 2, G.player.y + G.player.h / 2, '#ff6ec7', 26);
        setTimeout(() => {
          if (!G.alive) return;
          if (DIFFICULTIES[G.diff].checkpoints) { G.attempt++; spawnPlayer(false); }
          else { G.attempt++; spawnPlayer(true); } // kaizo: back to start
        }, 360);
      }
      function win() {
        if (G.player.win) return;
        G.player.win = true;
        G.scene = 'win';
        G.winT = 0;
        audio.win();
        const s = stat(G.diff);
        s.clears++;
        if (s.best == null || G.time < s.best) s.best = G.time;
        s.coins += G.coinsThisRun;
        saveStats();
        for (let i = 0; i < 60; i++) burst(G.player.x + Math.random() * 40 - 20, G.player.y + Math.random() * 40 - 20, ['#00fff7', '#ff6ec7', '#ffd700'][i % 3], 1);
      }
      function nextOrRetry() {
        const order = ['chill', 'normal', 'hard', 'kaizo'];
        const i = order.indexOf(G.diff);
        if (i < order.length - 1) startLevel(order[i + 1]);
        else toMenu();
      }
      function toMenu() { G.scene = 'menu'; }

      function burst(x, y, color, n) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, sp = Math.random() * 240 + 40;
          G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: Math.random() * 0.5 + 0.3, color, r: Math.random() * 2 + 1 });
        }
      }

      // ── collision helpers ─────────────────────────────────────────────────
      function solidAt(tx, ty) {
        const L = G.level;
        if (ty < 0) return false;
        if (tx < 0 || tx >= L.W || ty >= L.H) return tx < 0; // walls on left, open elsewhere
        const t = L.grid[ty][tx];
        if (t === '#') return true;
        if (t === 'x') return !L.crumbles[tx + ',' + ty] || L.crumbles[tx + ',' + ty] < 1; // solid until fully crumbled
        if (t === '!') return !DIFFICULTIES[G.diff].fakes; // fake: solid on chill/normal, passable on hard/kaizo
        return false;
      }
      function hazardAt(px, py) {
        const L = G.level, tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        if (tx < 0 || tx >= L.W || ty < 0 || ty >= L.H) return false;
        const t = L.grid[ty][tx];
        if (t === '~') return true;
        if (t === '^' || t === 'v') {
          // smaller hitbox than the tile so it feels fair
          const lx = px - tx * TILE, ly = py - ty * TILE;
          if (t === '^') return ly > TILE * 0.45;
          return ly < TILE * 0.55;
        }
        return false;
      }

      // ── update ─────────────────────────────────────────────────────────────
      function update(dt) {
        if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 60);
        if (G.deathFlash > 0) G.deathFlash = Math.max(0, G.deathFlash - dt * 1.6);
        for (let i = G.particles.length - 1; i >= 0; i--) {
          const p = G.particles[i]; p.life -= dt; if (p.life <= 0) { G.particles.splice(i, 1); continue; }
          p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
        if (G.scene === 'win') { G.winT += dt; return; }
        if (G.scene !== 'play') return;
        const L = G.level, p = G.player, D = DIFFICULTIES[G.diff];
        if (!p.alive || p.win) return;
        G.time += dt; p.anim += dt;

        // moving platforms
        L.movers.forEach(m => { m.t += dt; m.dx = Math.sin(m.t * 1.4) * m.range; });

        // horizontal
        const want = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const accel = p.onGround ? RUN_ACCEL : AIR_ACCEL;
        if (want !== 0) { p.vx += want * accel * dt; p.face = want; }
        else if (p.onGround) {
          const s = Math.sign(p.vx); p.vx -= s * RUN_FRICTION * dt;
          if (Math.sign(p.vx) !== s) p.vx = 0;
        }
        p.vx = Math.max(-D.maxRun, Math.min(D.maxRun, p.vx));

        // jump (coyote + buffer + variable height)
        if (p.coyote > 0) p.coyote -= dt;
        if (p.jumpBuffer > 0) p.jumpBuffer -= dt;
        if (p.jumpBuffer > 0 && p.coyote > 0) {
          p.vy = -D.jumpVel; p.coyote = 0; p.jumpBuffer = 0; p.onGround = false;
          audio.jump(); burst(p.x + p.w / 2, p.y + p.h, '#00fff7', 6);
        }
        if (!p.jumpHeld && p.vy < -220) p.vy = -220; // short hop

        // gravity
        p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);

        // ── move X with tile collision ──
        p.x += p.vx * dt;
        collideAxis(p, 'x');
        // ── move Y with tile collision ──
        const wasGround = p.onGround;
        p.onGround = false;
        p.y += p.vy * dt;
        collideAxis(p, 'y');

        // moving platform ride (treat as solid-from-top)
        L.movers.forEach(m => {
          const mx = m.x0 + (m.dx || 0), my = m.y, mw = 2 * TILE, mh = TILE * 0.5;
          if (p.x + p.w > mx && p.x < mx + mw && p.y + p.h > my && p.y + p.h < my + mh + 14 && p.vy >= 0) {
            p.y = my - p.h; p.vy = 0; p.onGround = true; p.x += (m.dx - (m.pdx || 0));
          }
        });
        L.movers.forEach(m => m.pdx = m.dx || 0);

        if (p.onGround && !wasGround && p.vy >= 0) { /* landed */ }
        if (p.onGround) p.coyote = D.coyote;

        // crumbling blocks under feet
        if (p.onGround) {
          const ftx = Math.floor((p.x + p.w / 2) / TILE), fty = Math.floor((p.y + p.h + 1) / TILE);
          if (L.grid[fty] && L.grid[fty][ftx] === 'x') {
            const key = ftx + ',' + fty;
            L.crumbles[key] = (L.crumbles[key] || 0) + dt / D.crumbleTime;
            if (L.crumbles[key] >= 1) burst(ftx * TILE + TILE / 2, fty * TILE + TILE / 2, '#ffb347', 8);
          }
        }

        // hazards (sample a few body points)
        const pts = [[p.x + 3, p.y + 3], [p.x + p.w - 3, p.y + 3], [p.x + 3, p.y + p.h - 2], [p.x + p.w - 3, p.y + p.h - 2], [p.x + p.w / 2, p.y + p.h - 2]];
        if (pts.some(pt => hazardAt(pt[0], pt[1]))) die();
        // fell off the world
        if (p.y > L.H * TILE + 80) die();

        // coins
        L.coins.forEach(c => {
          if (!c.got && Math.abs((p.x + p.w / 2) - c.x) < 16 && Math.abs((p.y + p.h / 2) - c.y) < 16) {
            c.got = true; G.coinsThisRun++; audio.coin(); burst(c.x, c.y, '#ffd700', 8);
            if (opts.onCoins) try { opts.onCoins(1); } catch (e) {}
          }
        });
        // checkpoints
        if (D.checkpoints) L.checkpoints.forEach(c => {
          if (!c.on && Math.abs((p.x + p.w / 2) - (c.x + TILE / 2)) < TILE && Math.abs((p.y + p.h / 2) - (c.y + TILE / 2)) < TILE * 1.2) {
            L.checkpoints.forEach(o => o.on = false); c.on = true; audio.check();
            burst(c.x + TILE / 2, c.y, '#7CFFCB', 12);
          }
        });
        // finish
        if (L.finish && Math.abs((p.x + p.w / 2) - (L.finish.x + TILE / 2)) < TILE && Math.abs((p.y + p.h / 2) - (L.finish.y + TILE / 2)) < TILE * 1.4) win();

        // camera (lookahead toward facing)
        const target = p.x - G.vw * 0.42 + p.face * 60;
        G.cam += (target - G.cam) * Math.min(1, dt * 6);
        G.cam = Math.max(0, Math.min(G.cam, L.W * TILE - G.vw));
      }

      function collideAxis(p, axis) {
        const L = G.level;
        const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w) / TILE);
        const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h) / TILE);
        for (let ty = y0; ty <= y1; ty++) {
          for (let tx = x0; tx <= x1; tx++) {
            if (!solidAt(tx, ty)) continue;
            const bx = tx * TILE, by = ty * TILE;
            if (!(p.x < bx + TILE && p.x + p.w > bx && p.y < by + TILE && p.y + p.h > by)) continue;
            if (axis === 'x') {
              if (p.vx > 0) p.x = bx - p.w; else if (p.vx < 0) p.x = bx + TILE;
              p.vx = 0;
            } else {
              if (p.vy > 0) { p.y = by - p.h; p.onGround = true; } else if (p.vy < 0) p.y = by + TILE;
              p.vy = 0;
            }
          }
        }
      }

      // ── render ───────────────────────────────────────────────────────────
      function resize() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = ctx2dParent.clientWidth || 800, h = ctx2dParent.clientHeight || 480;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        G.scale = h / (VIEW_TILES_Y * TILE);
        G.vw = w / G.scale; G.vh = h / G.scale;
      }
      const ro = new ResizeObserver(resize); ro.observe(ctx2dParent); resize();

      function drawBackground(w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a0a1a'); g.addColorStop(1, '#06060f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // parallax stars (drift with camera)
        for (const s of stars) {
          const sx = ((s.x * w - G.cam * G.scale * s.z) % w + w) % w;
          const sy = s.y * h;
          ctx.globalAlpha = 0.3 + s.z * 0.7;
          ctx.fillStyle = s.z > 0.6 ? '#bff' : '#5a6';
          ctx.fillRect(sx, sy, s.s, s.s);
        }
        ctx.globalAlpha = 1;
      }

      function drawWorld() {
        const L = G.level, D = DIFFICULTIES[G.diff];
        ctx.save();
        ctx.scale(G.scale, G.scale);
        let shx = 0, shy = 0;
        if (G.shake > 0) { shx = (Math.random() - 0.5) * G.shake; shy = (Math.random() - 0.5) * G.shake; }
        ctx.translate(-G.cam + shx, shy);

        const x0 = Math.max(0, Math.floor(G.cam / TILE) - 1);
        const x1 = Math.min(L.W - 1, Math.ceil((G.cam + G.vw) / TILE) + 1);
        for (let ty = 0; ty < L.H; ty++) {
          for (let tx = x0; tx <= x1; tx++) {
            const t = L.grid[ty][tx]; if (t === ' ') continue;
            const bx = tx * TILE, by = ty * TILE;
            if (t === '#') {
              ctx.fillStyle = '#15163a'; ctx.fillRect(bx, by, TILE, TILE);
              ctx.fillStyle = '#2a2c66'; ctx.fillRect(bx, by, TILE, 3);
              ctx.strokeStyle = 'rgba(0,255,247,.12)'; ctx.strokeRect(bx + .5, by + .5, TILE - 1, TILE - 1);
            } else if (t === '~') {
              ctx.fillStyle = 'rgba(255,60,120,.18)'; ctx.fillRect(bx, by, TILE, TILE);
              ctx.fillStyle = '#ff2d6f'; ctx.fillRect(bx, by + TILE - 4 + Math.sin((G.time * 4) + tx) * 2, TILE, 4);
            } else if (t === '^' || t === 'v') {
              ctx.fillStyle = '#ff3b6b';
              ctx.beginPath();
              if (t === '^') { ctx.moveTo(bx, by + TILE); ctx.lineTo(bx + TILE / 2, by + TILE * 0.35); ctx.lineTo(bx + TILE, by + TILE); }
              else { ctx.moveTo(bx, by); ctx.lineTo(bx + TILE / 2, by + TILE * 0.65); ctx.lineTo(bx + TILE, by); }
              ctx.closePath(); ctx.fill();
            } else if (t === 'x') {
              const cr = L.crumbles[tx + ',' + ty] || 0;
              ctx.globalAlpha = 1 - cr * 0.7;
              ctx.fillStyle = '#3a2a18'; ctx.fillRect(bx, by, TILE, TILE);
              ctx.fillStyle = '#ffb347'; ctx.fillRect(bx + 2, by + 2, TILE - 4, 2);
              if (cr > 0) { ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(bx + 4, by); ctx.lineTo(bx + 10, by + TILE); ctx.stroke(); }
              ctx.globalAlpha = 1;
            } else if (t === '!') {
              // fake block: render like solid (the player must learn the hard way)
              ctx.fillStyle = '#15163a'; ctx.fillRect(bx, by, TILE, TILE);
              ctx.fillStyle = '#2a2c66'; ctx.fillRect(bx, by, TILE, 3);
              if (D.fakes) { ctx.fillStyle = 'rgba(255,110,199,.08)'; ctx.fillRect(bx, by, TILE, TILE); }
            }
          }
        }
        // coins
        L.coins.forEach(c => {
          if (c.got) return; c.ph += 0.08;
          const yo = Math.sin(c.ph) * 3;
          ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(c.x, c.y + yo, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3a2a00'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('◈', c.x, c.y + yo + 3);
        });
        // checkpoints
        L.checkpoints.forEach(c => {
          ctx.fillStyle = c.on ? '#7CFFCB' : '#445';
          ctx.fillRect(c.x + TILE / 2 - 2, c.y - TILE, 4, TILE * 2);
          ctx.fillRect(c.x + TILE / 2 + 2, c.y - TILE, c.on ? 14 : 8, 9);
        });
        // moving platforms
        L.movers.forEach(m => { const mx = m.x0 + (m.dx || 0); ctx.fillStyle = '#00fff7'; ctx.fillRect(mx, m.y, 2 * TILE, TILE * 0.5); });
        // finish flag
        if (L.finish) {
          const f = L.finish; const pulse = 0.6 + Math.sin(G.time * 4) * 0.4;
          ctx.fillStyle = '#445'; ctx.fillRect(f.x + TILE / 2 - 2, f.y - TILE * 2, 4, TILE * 3);
          ctx.fillStyle = `rgba(0,255,247,${pulse})`; ctx.beginPath();
          ctx.moveTo(f.x + TILE / 2 + 2, f.y - TILE * 2); ctx.lineTo(f.x + TILE * 1.6, f.y - TILE * 1.5); ctx.lineTo(f.x + TILE / 2 + 2, f.y - TILE); ctx.fill();
        }
        // particles
        G.particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); });
        ctx.globalAlpha = 1;
        // player
        const p = G.player;
        if (p && (p.alive || p.win)) {
          const px = p.x, py = p.y;
          // trail
          ctx.fillStyle = 'rgba(0,255,247,.18)';
          ctx.fillRect(px - p.vx * 0.012, py + 2, p.w, p.h - 2);
          // body (neon astronaut orb)
          ctx.fillStyle = '#00fff7';
          ctx.fillRect(px, py, p.w, p.h);
          ctx.fillStyle = '#0a2a2c'; // visor
          ctx.fillRect(px + (p.face > 0 ? p.w * 0.35 : p.w * 0.1), py + p.h * 0.2, p.w * 0.5, p.h * 0.3);
          ctx.fillStyle = '#ff6ec7'; // core glow
          ctx.fillRect(px + p.w * 0.35, py + p.h * 0.55, p.w * 0.3, p.h * 0.25);
        }
        ctx.restore();
      }

      function text(str, x, y, size, color, align) {
        ctx.font = `700 ${size}px system-ui, sans-serif`;
        ctx.textAlign = align || 'left'; ctx.fillStyle = color; ctx.fillText(str, x, y);
      }

      function drawHUD(w, h) {
        const s = stat(G.diff), D = DIFFICULTIES[G.diff];
        // deaths counter — big, for the rage friend / stream
        text('DEATHS', 16, 26, 11, 'rgba(255,255,255,.5)');
        text(String(G.deathsThisRun), 16, 58, 30, '#ff6ec7');
        if (!G.cleanMode) {
          text(`◈ ${G.coinsThisRun}`, 16, 84, 16, '#ffd700');
          text(`ATTEMPT ${G.attempt}`, 16, 104, 12, 'rgba(255,255,255,.45)');
          text(D.label, w - 16, 26, 14, D.color, 'right');
          text(G.time.toFixed(1) + 's', w - 16, 48, 16, '#bff', 'right');
          if (s.best != null) text('best ' + s.best.toFixed(1) + 's', w - 16, 66, 11, 'rgba(255,255,255,.4)', 'right');
          text('R restart · C clean · M sound · Esc menu', w / 2, h - 12, 10, 'rgba(255,255,255,.35)', 'center');
        }
        if (G.deathFlash > 0) {
          ctx.fillStyle = `rgba(255,0,80,${G.deathFlash * 0.4})`; ctx.fillRect(0, 0, w, h);
          if (G.taunt) text(G.taunt, w / 2, h / 2, 24, '#fff', 'center');
        }
      }

      function drawMenu(w, h) {
        text('ECHO RUN', w / 2, h * 0.18, Math.min(54, w / 11), '#00fff7', 'center');
        text('a neon platformer · pick your pain', w / 2, h * 0.18 + 26, 13, 'rgba(255,255,255,.5)', 'center');
        const order = ['chill', 'normal', 'hard', 'kaizo'];
        const cw = w / 4;
        order.forEach((d, i) => {
          const D = DIFFICULTIES[d], s = stat(d);
          const cx = i * cw, sel = i === G.menuIdx;
          ctx.fillStyle = sel ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)';
          ctx.fillRect(cx + 8, h * 0.30, cw - 16, h * 0.42);
          ctx.strokeStyle = sel ? D.color : 'rgba(255,255,255,.12)'; ctx.lineWidth = sel ? 3 : 1;
          ctx.strokeRect(cx + 8, h * 0.30, cw - 16, h * 0.42);
          text(D.label, cx + cw / 2, h * 0.30 + 38, Math.min(22, cw / 6), D.color, 'center');
          text(D.sub, cx + cw / 2, h * 0.30 + 62, 11, 'rgba(255,255,255,.55)', 'center');
          text(`☠ ${s.deaths}`, cx + cw / 2, h * 0.30 + 100, 14, 'rgba(255,255,255,.7)', 'center');
          if (s.best != null) text('best ' + s.best.toFixed(1) + 's', cx + cw / 2, h * 0.30 + 122, 11, '#bff', 'center');
          if (s.clears) text('cleared ✓', cx + cw / 2, h * 0.30 + 142, 11, '#7CFFCB', 'center');
        });
        text('← → to choose · Enter / tap to play', w / 2, h * 0.80, 13, 'rgba(255,255,255,.5)', 'center');
        if (opts.context === 'station' && opts.onExit) text('Esc to leave the arcade', w / 2, h * 0.80 + 20, 11, 'rgba(255,255,255,.35)', 'center');
      }

      function drawWin(w, h) {
        ctx.fillStyle = 'rgba(6,6,15,.6)'; ctx.fillRect(0, 0, w, h);
        const D = DIFFICULTIES[G.diff];
        text('LEVEL CLEAR!', w / 2, h * 0.32, Math.min(48, w / 12), D.color, 'center');
        text(`${D.label}  ·  ${G.time.toFixed(1)}s  ·  ☠ ${G.deathsThisRun}  ·  ◈ ${G.coinsThisRun}`, w / 2, h * 0.32 + 34, 16, '#fff', 'center');
        const order = ['chill', 'normal', 'hard', 'kaizo'];
        const last = order.indexOf(G.diff) === order.length - 1;
        text(last ? 'You beat KAIZO. You absolute legend.' : 'Enter / tap → next difficulty', w / 2, h * 0.55, 16, last ? '#ff6ec7' : '#bff', 'center');
        text('R to replay · Esc for menu', w / 2, h * 0.55 + 24, 12, 'rgba(255,255,255,.5)', 'center');
      }

      // ── main loop ──────────────────────────────────────────────────────────
      function frame(now) {
        if (!G.alive) return;
        let dt = (now - G.last) / 1000; G.last = now;
        if (dt > 0.05) dt = 0.05; // clamp (tab switches)
        update(dt);
        const w = ctx2dParent.clientWidth, h = ctx2dParent.clientHeight;
        drawBackground(w, h);
        if (G.scene === 'menu') drawMenu(w, h);
        else { drawWorld(); drawHUD(w, h); if (G.scene === 'win') drawWin(w, h); }
        G.raf = requestAnimationFrame(frame);
      }
      G.raf = requestAnimationFrame(frame);

      if (opts.difficulty) startLevel(opts.difficulty);

      // ── public instance API ────────────────────────────────────────────────
      return {
        destroy() {
          G.alive = false;
          cancelAnimationFrame(G.raf);
          window.removeEventListener('keydown', kd);
          window.removeEventListener('keyup', ku);
          ro.disconnect();
          touchBtns.forEach(b => b.remove());
          ctx2dParent.innerHTML = '';
        },
        get state() { return G; },
      };
    },
  };

  window.EchoRun = EchoRun;
  // register into the Party Arcade framework when present (embedded mode)
  if (window.PartyGames && typeof window.PartyGames.register === 'function') {
    window.PartyGames.register(EchoRun);
  } else {
    (window.PartyGamesPending = window.PartyGamesPending || []).push(EchoRun);
  }
})();
