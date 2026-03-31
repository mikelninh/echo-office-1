/**
 * arcade-endgame.js — Echo's Vault Arcade Floor Endgame
 * Racing / Rhythm / Fighter + Tournaments + Challenges + Hall of Fame
 * v1.0 — Ship the vision.
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  function ls(key, def) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }
  function safeCompanion(type, data) {
    try { if (typeof window.companionEvent === 'function') window.companionEvent(type, data); } catch {}
  }
  function safeNotify(msg) {
    try { if (typeof window.showNotification === 'function') window.showNotification(msg); } catch {}
  }
  function safeCoinsEarn(n, src) {
    try { if (typeof window.Coins !== 'undefined') window.Coins.earn(n, src || 'arcade_endgame'); } catch {}
  }
  function safeCoinsAfford(n) {
    try { return typeof window.Coins !== 'undefined' ? window.Coins.canAfford(n) : true; } catch { return false; }
  }
  function safeCoinsSpend(n, src) {
    try { if (typeof window.Coins !== 'undefined') window.Coins.spend(n, src || 'arcade_endgame'); } catch {}
  }
  function getHiScore(game) {
    try { return (window.S && window.S.highScores && window.S.highScores[game]) || 0; } catch { return 0; }
  }
  function setHiScore(game, score) {
    try {
      if (window.S && window.S.highScores) {
        window.S.highScores[game] = score;
        if (typeof window.LS !== 'undefined') window.LS.set('highScores', window.S.highScores);
      }
    } catch {}
  }
  function createPopupHTML(html) {
    try { if (typeof window.createPopup === 'function') { window.createPopup(html); return true; } } catch {}
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────────────────────────────────
  const AW = 420, AH = 380;
  const ENDGAME_GAMES = ['racing', 'rhythm', 'fighter'];
  const GAME_COLORS = { racing: '#ff4444', rhythm: '#00fff7', fighter: '#ff8800' };
  const GAME_LABELS = { racing: '🏎️ RACING', rhythm: '🎵 RHYTHM', fighter: '🥊 FIGHTER' };

  // ─────────────────────────────────────────────────────────────────────────
  // TOURNAMENT SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  const ArcadeTournament = (function () {
    const KEY = 'arcadeTournament';
    const LB_KEY = 'arcadeEndgameLB';

    function load() { return ls(KEY, { active: false, game: null, entryFee: 10, prizePool: 0, entries: [], startDate: null, endDate: null, winnersRewarded: false }); }
    function save(t) { lsSet(KEY, t); }

    function loadLB() { return ls(LB_KEY, { snake: [], breakout: [], invaders: [], racing: [], rhythm: [], fighter: [] }); }
    function saveLB(lb) { lsSet(LB_KEY, lb); }

    function addToLeaderboard(game, name, score, withTrophy) {
      const lb = loadLB();
      if (!lb[game]) lb[game] = [];
      lb[game].push({ name: name || 'ACE', score, date: Date.now(), trophy: !!withTrophy });
      lb[game].sort((a, b) => b.score - a.score);
      if (lb[game].length > 10) lb[game].length = 10;
      saveLB(lb);
    }

    return {
      get active() { return load().active; },

      startTournament(game, entryFee) {
        const t = load();
        if (t.active) { safeNotify('Tournament already running!'); return; }
        const now = Date.now();
        t.active = true;
        t.game = game;
        t.entryFee = entryFee || 10;
        t.prizePool = 0;
        t.entries = [];
        t.startDate = now;
        t.endDate = now + 24 * 60 * 60 * 1000;
        t.winnersRewarded = false;
        save(t);
        safeNotify(`🏆 Tournament started! Game: ${GAME_LABELS[game] || game.toUpperCase()} | Entry: ${t.entryFee}◈`);
      },

      enter(playerName) {
        const t = load();
        if (!t.active) { safeNotify('No active tournament!'); return false; }
        if (!safeCoinsAfford(t.entryFee)) { safeNotify(`Need ${t.entryFee}◈ to enter!`); return false; }
        const name = playerName || 'YOU';
        if (t.entries.find(e => e.name === name && e.score > 0)) { safeNotify('Already entered this tournament!'); return false; }
        safeCoinsSpend(t.entryFee, 'tournament_entry');
        t.prizePool += t.entryFee;
        t.entries.push({ name, score: 0, entered: Date.now() });
        save(t);
        safeNotify(`🎟️ Entered ${t.game.toUpperCase()} tournament! Prize pool: ${t.prizePool}◈`);
        return true;
      },

      submitScore(score, playerName) {
        const t = load();
        if (!t.active) return;
        const name = playerName || 'YOU';
        const entry = t.entries.find(e => e.name === name);
        if (!entry) return;
        if (score > entry.score) {
          entry.score = score;
          save(t);
        }
        this.checkEnd();
      },

      checkEnd() {
        const t = load();
        if (!t.active) return;
        if (Date.now() >= t.endDate && !t.winnersRewarded) {
          this.endTournament();
        }
      },

      endTournament() {
        const t = load();
        if (!t.active || t.winnersRewarded) return;
        const sorted = [...t.entries].sort((a, b) => b.score - a.score);
        const payouts = [0.6, 0.3, 0.1];
        sorted.slice(0, 3).forEach((e, i) => {
          const prize = Math.floor(t.prizePool * payouts[i]);
          if (e.name === 'YOU' && prize > 0) {
            safeCoinsEarn(prize, 'tournament_win');
            safeNotify(`🏆 Tournament over! You placed #${i + 1} — +${prize}◈!`);
            if (i === 0) safeCompanion('arcade_challenge', { name: 'Tournament Champion!' });
          }
          if (prize > 0) {
            addToLeaderboard(t.game, e.name, e.score, i === 0);
          }
        });
        t.active = false;
        t.winnersRewarded = true;
        save(t);
      },

      getLeaderboard(game) {
        return loadLB()[game] || [];
      },

      getAllLeaderboards() {
        return loadLB();
      },

      getTournamentState() {
        return load();
      },

      // Auto-daily tournament: starts at midnight
      scheduleDailyTournament() {
        const t = load();
        const now = Date.now();
        if (t.active && now < t.endDate) return; // already running
        if (t.active && now >= t.endDate) this.endTournament();

        // Check if we need to start a new one
        const lastStart = t.startDate || 0;
        const lastDate = new Date(lastStart).toISOString().slice(0, 10);
        if (lastDate !== todayStr()) {
          const games = ['snake', 'breakout', 'invaders', 'racing', 'rhythm', 'fighter'];
          const dayHash = Math.floor(now / 86400000);
          const game = games[dayHash % games.length];
          this.startTournament(game, 10);
        }
      },

      addToLeaderboard,
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // STREAK & CHALLENGE SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  const ArcadeStreak = (function () {
    const KEY = 'arcadeStreak';

    function load() {
      return ls(KEY, { daily: null, streak: 0, lastPlayDate: null, challengesCompleted: {} });
    }
    function save(s) { lsSet(KEY, s); }

    const ALL_CHALLENGES = [
      { id: 'snake_500', name: 'Snake Master', desc: 'Score 500 in Snake', reward: 20, check: (game, score) => game === 'snake' && score >= 500 },
      { id: 'racing_60', name: 'Road Warrior', desc: 'Survive 60 seconds in Racing', reward: 15, check: (game, score) => game === 'racing' && score >= 60 },
      { id: 'rhythm_50', name: 'Note Perfect', desc: 'Hit 50 notes in Rhythm', reward: 25, check: (game, score) => game === 'rhythm' && score >= 50 },
      { id: 'fighter_2', name: 'Round Victor', desc: 'Win 2 rounds in Fighter', reward: 30, check: (game, score) => game === 'fighter' && score >= 2 },
      { id: 'breakout_200', name: 'Brick Breaker', desc: 'Score 200 in Breakout', reward: 20, check: (game, score) => game === 'breakout' && score >= 200 },
      { id: 'invaders_500', name: 'Alien Slayer', desc: 'Score 500 in Invaders', reward: 20, check: (game, score) => game === 'invaders' && score >= 500 },
    ];

    function getDailyChallenges() {
      const dayHash = Math.floor(Date.now() / 86400000);
      // Rotate 3 challenges per day
      const indices = [dayHash % ALL_CHALLENGES.length, (dayHash + 2) % ALL_CHALLENGES.length, (dayHash + 4) % ALL_CHALLENGES.length];
      return indices.map(i => ALL_CHALLENGES[i]);
    }

    return {
      recordPlay(game) {
        const s = load();
        const today = todayStr();
        if (s.lastPlayDate === today) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (s.lastPlayDate === yesterday) { s.streak = (s.streak || 0) + 1; }
        else { s.streak = 1; }
        s.lastPlayDate = today;
        save(s);
        if (s.streak > 1) safeNotify(`🔥 ${s.streak}-day arcade streak!`);
      },

      checkChallenges(game, score) {
        const s = load();
        const today = todayStr();
        if (!s.challengesCompleted) s.challengesCompleted = {};
        if (!s.challengesCompleted[today]) s.challengesCompleted[today] = [];

        const daily = getDailyChallenges();
        daily.forEach(ch => {
          if (s.challengesCompleted[today].includes(ch.id)) return;
          if (ch.check(game, score)) {
            s.challengesCompleted[today].push(ch.id);
            safeCoinsEarn(ch.reward, 'challenge');
            safeNotify(`✅ Challenge: ${ch.name}! +${ch.reward}◈`);
            safeCompanion('arcade_challenge', { name: ch.name });
          }
        });
        save(s);
      },

      getDailyChallenges,
      getState: load,
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // EXTEND EXISTING ARCADE SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  // Patch the existing triggerGameOver to also call our systems
  const _origTriggerGameOver = window.triggerGameOver;
  window.triggerGameOver = function (game, score) {
    _origTriggerGameOver && _origTriggerGameOver(game, score);
    // Our extended handling
    ArcadeStreak.recordPlay(game);
    ArcadeStreak.checkChallenges(game, score);
    const hi = getHiScore(game);
    // hi score already updated by original, so just fire companion event
    if (score > 0) {
      const lb = ArcadeTournament.getLeaderboard(game);
      const topScore = lb[0] ? lb[0].score : 0;
      if (score > topScore) {
        safeCompanion('arcade_highscore', { game, score });
      }
    }
    ArcadeTournament.submitScore(score, 'YOU');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NEW ENDGAME ARCADE STATE MACHINE
  // (Plugs into the existing CRT overlay)
  // ─────────────────────────────────────────────────────────────────────────
  let egGame = null;       // current endgame game object
  let egLoop = null;       // rAF handle
  let egState = 'playing'; // 'playing' | 'gameover'
  let egScore = 0;
  let egKeyHandler = null;
  let egGameType = null;

  function openEndgameArcade(type) {
    egGameType = type;
    egState = 'playing';
    egScore = 0;

    // Use the existing overlay
    const overlay = document.getElementById('arcade-overlay');
    if (overlay) overlay.className = 'show';

    const cv = document.getElementById('arcade-canvas');
    if (!cv) return;
    cv.width = AW;
    cv.height = AH;

    const glow = document.getElementById('arcade-glow');
    if (glow) glow.style.boxShadow = `0 0 80px ${GAME_COLORS[type]}55`;

    // Kill existing arcade loop if running
    if (window.arcadeLoop) { cancelAnimationFrame(window.arcadeLoop); window.arcadeLoop = null; }
    if (egLoop) { cancelAnimationFrame(egLoop); egLoop = null; }

    // Remove any existing key handlers
    if (window.arcadeKeyHandler) { document.removeEventListener('keydown', window.arcadeKeyHandler); window.arcadeKeyHandler = null; }
    if (egKeyHandler) { document.removeEventListener('keydown', egKeyHandler); egKeyHandler = null; }
    document.onkeydown = null; document.onkeyup = null;

    const cx = cv.getContext('2d');

    if (type === 'racing') {
      egGame = initRacing();
    } else if (type === 'rhythm') {
      egGame = initRhythm();
    } else if (type === 'fighter') {
      egGame = initFighter();
    }

    egKeyHandler = (e) => handleEgKeys(e, egGame, type);
    document.addEventListener('keydown', egKeyHandler);

    // Close button
    const closeBtn = document.getElementById('arcade-close');
    if (closeBtn) {
      closeBtn.onclick = closeEndgameArcade;
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      cx.fillStyle = '#0a0a12';
      cx.fillRect(0, 0, AW, AH);
      if (egState === 'playing' && egGame && egGame.running) {
        if (type === 'racing') updateRacing(cx, dt, egGame);
        else if (type === 'rhythm') updateRhythm(cx, dt, egGame);
        else if (type === 'fighter') updateFighter(cx, dt, egGame);
      } else if (egState === 'gameover') {
        renderEndgameGameOver(cx, type, egScore);
      }
      egLoop = requestAnimationFrame(frame);
    }
    egLoop = requestAnimationFrame(frame);

    ArcadeStreak.recordPlay(type);
    ArcadeTournament.enter('YOU');
  }

  function closeEndgameArcade() {
    if (egLoop) { cancelAnimationFrame(egLoop); egLoop = null; }
    if (egKeyHandler) { document.removeEventListener('keydown', egKeyHandler); egKeyHandler = null; }
    document.onkeydown = null; document.onkeyup = null;
    egGame = null;
    const overlay = document.getElementById('arcade-overlay');
    if (overlay) overlay.className = '';
  }

  function endgameGameOver(type, score) {
    egState = 'gameover';
    egScore = score;
    const hi = getHiScore(type);
    if (score > hi) {
      setHiScore(type, score);
      safeCoinsEarn(25, 'endgame_highscore');
      safeNotify(`★ New High Score! ${type.toUpperCase()} ${score}! +25◈`);
      safeCompanion('arcade_highscore', { game: type, score });
    } else {
      const coinBonus = Math.floor(score / 10);
      if (coinBonus > 0) safeCoinsEarn(coinBonus, 'endgame_score');
    }
    ArcadeStreak.checkChallenges(type, score);
    ArcadeTournament.submitScore(score, 'YOU');
    // Add to leaderboard
    ArcadeTournament.addToLeaderboard(type, 'YOU', score, false);
  }

  function renderEndgameGameOver(cx, type, score) {
    const t = performance.now() / 1000;
    cx.textAlign = 'center';
    cx.fillStyle = '#ff4444';
    cx.font = 'bold 32px monospace';
    cx.fillText('GAME OVER', AW / 2, 60);
    cx.fillStyle = '#fff';
    cx.font = '18px monospace';
    const label = type === 'fighting' ? 'ROUNDS WON' : type === 'racing' ? 'SECONDS' : 'SCORE';
    cx.fillText(`${label}: ${score}`, AW / 2, 100);
    const hi = getHiScore(type);
    cx.fillStyle = '#ffd700';
    cx.font = '14px monospace';
    cx.fillText('HIGH: ' + hi, AW / 2, 130);
    if (score >= hi && score > 0) {
      cx.fillStyle = Math.sin(t * 8) > 0 ? '#ffd700' : '#ff6ec7';
      cx.font = 'bold 20px monospace';
      cx.fillText('★ NEW HIGH SCORE! ★', AW / 2, 160);
    }
    cx.fillStyle = '#00ff88';
    cx.font = '12px monospace';
    cx.fillText('ESC to exit  |  ENTER to retry', AW / 2, 300);
    cx.textAlign = 'left';
  }

  function handleEgKeys(e, game, type) {
    if (egState === 'gameover') {
      if (e.key === 'Escape') { closeEndgameArcade(); e.preventDefault(); return; }
      if (e.key === 'Enter') { openEndgameArcade(type); e.preventDefault(); return; }
    }
    if (egState === 'playing' && game) {
      if (e.key === 'Escape') { closeEndgameArcade(); e.preventDefault(); return; }
      if (type === 'racing') handleRacingKey(e, game);
      else if (type === 'rhythm') handleRhythmKey(e, game);
      else if (type === 'fighter') handleFighterKey(e, game);
    }
    e.preventDefault();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GAME 1: RACING
  // ─────────────────────────────────────────────────────────────────────────
  function initRacing() {
    const g = {
      running: true,
      score: 0,          // seconds survived
      time: 0,
      speed: 120,        // pixels/sec
      speedTimer: 0,
      laneW: 60,
      numLanes: 5,
      roadX: 60,
      roadW: 300,
      player: { lane: 2, x: 0, y: AH - 60, w: 28, h: 40, color: '#00ff88', iframes: 0 },
      obstacles: [],
      coinPickups: [],
      rival: { lane: 1, x: 0, y: 80, w: 26, h: 38, color: '#ff4444', dir: 1, timer: 0 },
      roadOffset: 0,
      scrollLines: [],
      particles: [],
      coins: 0,
      lives: 3,
      _left: false, _right: false,
    };
    g.player.x = g.roadX + g.player.lane * g.laneW + (g.laneW - g.player.w) / 2;
    g.rival.x = g.roadX + g.rival.lane * g.laneW + (g.laneW - g.rival.w) / 2;
    // Spawn some road stripes
    for (let i = 0; i < 20; i++) {
      g.scrollLines.push({ y: i * 30 - 200, lane: Math.floor(Math.random() * 4) });
    }
    document.onkeydown = e => {
      if (!g.running) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') g._left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') g._right = true;
    };
    document.onkeyup = e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') g._left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') g._right = false;
    };
    return g;
  }

  function handleRacingKey(e, g) {
    // Arrow keys handled in onkeydown directly
  }

  let racingLaneChangeTimer = 0;
  let racingObstacleTimer = 0;
  let racingCoinTimer = 0;

  function updateRacing(cx, dt, g) {
    if (!g.running) return;
    g.time += dt;
    g.score = Math.floor(g.time);
    g.speedTimer += dt;
    if (g.speedTimer >= 10) { g.speed = Math.min(g.speed + 20, 280); g.speedTimer = 0; }

    // Lane input
    racingLaneChangeTimer = (racingLaneChangeTimer || 0);
    racingLaneChangeTimer -= dt;
    if (racingLaneChangeTimer <= 0) {
      if (g._left && g.player.lane > 0) { g.player.lane--; racingLaneChangeTimer = 0.2; }
      if (g._right && g.player.lane < g.numLanes - 1) { g.player.lane++; racingLaneChangeTimer = 0.2; }
    }
    g.player.x = g.roadX + g.player.lane * g.laneW + (g.laneW - g.player.w) / 2;

    // Rival AI
    g.rival.timer -= dt;
    if (g.rival.timer <= 0) {
      g.rival.dir = (Math.random() < 0.5 ? -1 : 1);
      const nl = Math.max(0, Math.min(g.numLanes - 1, g.rival.lane + g.rival.dir));
      g.rival.lane = nl;
      g.rival.x = g.roadX + nl * g.laneW + (g.laneW - g.rival.w) / 2;
      g.rival.timer = 0.8 + Math.random() * 1.2;
    }

    // Road scroll
    g.roadOffset = (g.roadOffset + g.speed * dt) % 30;
    g.scrollLines.forEach(l => { l.y += g.speed * dt; if (l.y > AH + 20) l.y = -20; });

    // Obstacle spawning
    racingObstacleTimer = (racingObstacleTimer || 0) - dt;
    if (racingObstacleTimer <= 0) {
      const lane = Math.floor(Math.random() * g.numLanes);
      const type = Math.random() < 0.5 ? 'cone' : Math.random() < 0.7 ? 'oil' : 'car';
      g.obstacles.push({ lane, x: g.roadX + lane * g.laneW + (g.laneW - 20) / 2, y: -30, w: 20, h: 28, type, color: type === 'cone' ? '#ff8800' : type === 'oil' ? '#333' : '#cc2244' });
      racingObstacleTimer = 0.8 + Math.random() * 1.0;
    }

    // Coin spawning
    racingCoinTimer = (racingCoinTimer || 0) - dt;
    if (racingCoinTimer <= 0) {
      const lane = Math.floor(Math.random() * g.numLanes);
      g.coinPickups.push({ lane, x: g.roadX + lane * g.laneW + g.laneW / 2 - 8, y: -20, w: 16, h: 16 });
      racingCoinTimer = 2.0 + Math.random() * 2.0;
    }

    // Move obstacles
    g.obstacles.forEach(o => { o.y += g.speed * dt * 0.9; });
    g.coinPickups.forEach(c => { c.y += g.speed * dt * 0.9; });
    g.obstacles = g.obstacles.filter(o => o.y < AH + 50);
    g.coinPickups = g.coinPickups.filter(c => c.y < AH + 50);

    // Collision
    g.player.iframes = Math.max(0, (g.player.iframes || 0) - dt);
    g.obstacles.forEach(o => {
      if (g.player.iframes > 0) return;
      const px = g.player.x, py = g.player.y, pw = g.player.w, ph = g.player.h;
      if (o.x < px + pw - 4 && o.x + o.w - 4 > px && o.y < py + ph - 4 && o.y + o.h - 4 > py) {
        g.lives--;
        g.player.iframes = 1.5;
        // push particle burst
        for (let i = 0; i < 10; i++) g.particles.push({ x: px + pw / 2, y: py + ph / 2, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.6, color: '#ff4444' });
        if (g.lives <= 0) { g.running = false; endgameGameOver('racing', g.score); }
      }
    });

    // Coin collection
    g.coinPickups = g.coinPickups.filter(c => {
      const px = g.player.x, py = g.player.y, pw = g.player.w, ph = g.player.h;
      if (c.x < px + pw && c.x + c.w > px && c.y < py + ph && c.y + c.h > py) {
        g.coins++;
        safeCoinsEarn(1, 'racing_coin');
        return false;
      }
      return true;
    });

    // Update particles
    g.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    g.particles = g.particles.filter(p => p.life > 0);

    // ── Render ──
    const t = performance.now() / 1000;

    // Sky gradient
    cx.fillStyle = '#0a0020';
    cx.fillRect(0, 0, AW, AH);

    // Stars
    cx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137.5 + 20) % AW;
      const sy = (i * 97.3 + 10) % (AH * 0.4);
      cx.fillRect(sx, sy, 1, 1);
    }

    // Road base
    cx.fillStyle = '#1a1a1a';
    cx.fillRect(g.roadX, 0, g.roadW, AH);

    // Road edges
    cx.fillStyle = '#ff8800';
    cx.fillRect(g.roadX, 0, 4, AH);
    cx.fillRect(g.roadX + g.roadW - 4, 0, 4, AH);

    // Lane dividers (scrolling dashes)
    cx.strokeStyle = '#ffff00';
    cx.lineWidth = 2;
    cx.setLineDash([15, 15]);
    cx.lineDashOffset = -g.roadOffset;
    for (let l = 1; l < g.numLanes; l++) {
      const lx = g.roadX + l * g.laneW;
      cx.beginPath(); cx.moveTo(lx, 0); cx.lineTo(lx, AH); cx.stroke();
    }
    cx.setLineDash([]);
    cx.lineWidth = 1;

    // Coins
    g.coinPickups.forEach(c => {
      cx.fillStyle = '#ffd700';
      cx.shadowColor = '#ffd700'; cx.shadowBlur = 6;
      cx.beginPath(); cx.arc(c.x + 8, c.y + 8, 7, 0, Math.PI * 2); cx.fill();
      cx.shadowBlur = 0;
      cx.fillStyle = '#ffaa00';
      cx.font = 'bold 9px monospace'; cx.textAlign = 'center';
      cx.fillText('◈', c.x + 8, c.y + 12);
      cx.textAlign = 'left';
    });

    // Obstacles
    g.obstacles.forEach(o => {
      if (o.type === 'cone') {
        cx.fillStyle = '#ff8800';
        cx.fillRect(o.x + 5, o.y + 10, 10, 18);
        cx.fillStyle = '#fff';
        cx.fillRect(o.x + 5, o.y + 13, 10, 3);
        cx.fillRect(o.x + 5, o.y + 19, 10, 3);
      } else if (o.type === 'oil') {
        cx.fillStyle = '#111122';
        cx.beginPath(); cx.ellipse(o.x + 10, o.y + 14, 12, 8, 0, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = 'rgba(0,100,200,0.3)';
        cx.beginPath(); cx.ellipse(o.x + 10, o.y + 14, 10, 6, 0, 0, Math.PI * 2); cx.fill();
      } else {
        // rival-looking obstacle car
        cx.fillStyle = o.color;
        cx.fillRect(o.x, o.y + 6, o.w, o.h - 12);
        cx.fillStyle = '#222';
        cx.fillRect(o.x + 3, o.y, o.w - 6, 12);
        cx.fillRect(o.x + 3, o.y + o.h - 10, o.w - 6, 10);
      }
    });

    // Rival car
    {
      const r = g.rival;
      cx.fillStyle = r.color;
      cx.fillRect(r.x, r.y + 6, r.w, r.h - 12);
      cx.fillStyle = '#ff8800';
      cx.fillRect(r.x + 2, r.y, r.w - 4, 10);
      cx.fillRect(r.x + 2, r.y + r.h - 8, r.w - 4, 8);
      cx.fillStyle = '#88aaff';
      cx.fillRect(r.x + 4, r.y + 2, r.w - 8, 5);
    }

    // Player car
    const flash = g.player.iframes > 0 && Math.sin(t * 20) > 0;
    if (!flash) {
      cx.fillStyle = g.player.color;
      cx.fillRect(g.player.x, g.player.y + 6, g.player.w, g.player.h - 12);
      cx.fillStyle = '#004420';
      cx.fillRect(g.player.x + 2, g.player.y, g.player.w - 4, 12);
      cx.fillRect(g.player.x + 2, g.player.y + g.player.h - 10, g.player.w - 4, 10);
      cx.fillStyle = '#88aaff';
      cx.fillRect(g.player.x + 4, g.player.y + g.player.h - 8, g.player.w - 8, 5);
    }

    // Particles
    g.particles.forEach(p => {
      cx.globalAlpha = p.life;
      cx.fillStyle = p.color;
      cx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    cx.globalAlpha = 1;

    // HUD
    cx.fillStyle = 'rgba(0,0,0,0.6)';
    cx.fillRect(0, 0, AW, 26);
    cx.fillStyle = '#00ff88';
    cx.font = 'bold 12px monospace';
    cx.textAlign = 'left';
    cx.fillText(`⏱ ${g.score}s`, 8, 17);
    cx.fillStyle = '#ffd700';
    cx.fillText(`◈ ${g.coins}`, 80, 17);
    cx.fillStyle = '#fff';
    cx.fillText(`SPEED: ${Math.round(g.speed)}`, 140, 17);
    cx.fillStyle = '#ff4444';
    let hearts = '';
    for (let i = 0; i < g.lives; i++) hearts += '♥';
    cx.textAlign = 'right';
    cx.fillText(hearts, AW - 8, 17);
    cx.textAlign = 'left';
    cx.fillStyle = '#555';
    cx.font = '10px monospace';
    cx.fillText('← → DODGE | ESC EXIT', 8, AH - 6);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GAME 2: RHYTHM
  // ─────────────────────────────────────────────────────────────────────────
  function initRhythm() {
    const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'];
    const g = {
      running: true,
      phase: 'select', // 'select' | 'playing'
      difficulty: 1,   // 0=easy 1=normal 2=hard
      score: 0,
      notesHit: 0,
      notesMissed: 0,
      multiplier: 1,
      streak: 0,
      missStreak: 0,
      lanes: 4,
      laneKeys: ['a', 's', 'd', 'f'],
      laneArrows: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'],
      notes: [],
      hitFeedback: [], // {lane, time, hit}
      noteSpeed: 200,  // px/sec
      spawnTimer: 0,
      seed: Math.floor(Date.now() / 1000),
      beatTimer: 0,
      beatInterval: 0.5,
      totalNotes: 0,
      maxNotes: 80,    // end after this many spawned
      lanePress: [false, false, false, false],
      laneFlash: [0, 0, 0, 0],
      hitZoneY: AH - 50,
      hitWindow: 40,   // pixels tolerance
      DIFFICULTIES,
    };
    setupRhythmKeys(g);
    return g;
  }

  function setupRhythmKeys(g) {
    document.onkeydown = e => {
      if (!g.running) return;
      if (g.phase === 'select') {
        if (e.key === 'ArrowLeft' || e.key === 'a') g.difficulty = Math.max(0, g.difficulty - 1);
        if (e.key === 'ArrowRight' || e.key === 'd') g.difficulty = Math.min(2, g.difficulty + 1);
        if (e.key === 'Enter' || e.key === ' ') {
          g.phase = 'playing';
          g.noteSpeed = [150, 220, 320][g.difficulty];
          g.beatInterval = [0.6, 0.45, 0.30][g.difficulty];
        }
        return;
      }
      // Lane hit
      g.laneKeys.forEach((k, i) => {
        if (e.key === k || e.key === g.laneArrows[i]) {
          g.lanePress[i] = true;
          g.laneFlash[i] = 0.15;
          checkRhythmHit(g, i);
        }
      });
    };
    document.onkeyup = e => {
      g.laneKeys.forEach((k, i) => {
        if (e.key === k || e.key === g.laneArrows[i]) g.lanePress[i] = false;
      });
    };
  }

  function handleRhythmKey(e, g) {} // handled by onkeydown

  function checkRhythmHit(g, lane) {
    const hz = g.hitZoneY;
    const hw = g.hitWindow;
    // Find the closest note in this lane near hit zone
    let best = null, bestDist = hw;
    g.notes.forEach(n => {
      if (n.lane !== lane || n.hit || n.missed) return;
      const dist = Math.abs(n.y - hz);
      if (dist < bestDist) { bestDist = dist; best = n; }
    });
    if (best) {
      best.hit = true;
      g.notesHit++;
      g.streak++;
      g.missStreak = 0;
      g.multiplier = Math.min(8, 1 + Math.floor(g.streak / 8));
      g.score += 10 * g.multiplier;
      g.hitFeedback.push({ lane, time: 0.4, hit: true, label: bestDist < 15 ? 'PERFECT' : 'GOOD' });
    } else {
      // Miss on press (no note nearby)
      // don't penalize empty press
    }
  }

  function pseudoRand(seed, i) {
    const x = Math.sin(seed + i * 127.3) * 43758.5453;
    return x - Math.floor(x);
  }

  function updateRhythm(cx, dt, g) {
    if (!g.running) return;
    const t = performance.now() / 1000;
    const LANE_W = 80;
    const LANE_GAP = 8;
    const LANE_START_X = (AW - (4 * LANE_W + 3 * LANE_GAP)) / 2;

    if (g.phase === 'select') {
      // Difficulty select screen
      cx.fillStyle = '#00fff7';
      cx.font = 'bold 24px monospace';
      cx.textAlign = 'center';
      cx.fillText('RHYTHM GAME', AW / 2, 60);
      cx.font = '14px monospace';
      cx.fillStyle = '#aaa';
      cx.fillText('A S D F  or  ← ↓ ↑ →', AW / 2, 90);
      cx.fillText('Select difficulty:', AW / 2, 130);
      g.DIFFICULTIES.forEach((d, i) => {
        const sel = i === g.difficulty;
        cx.fillStyle = sel ? '#00fff7' : '#444';
        cx.fillRect(LANE_START_X + i * (LANE_W + LANE_GAP), 150, LANE_W, 40);
        cx.fillStyle = sel ? '#000' : '#aaa';
        cx.font = (sel ? 'bold ' : '') + '13px monospace';
        cx.fillText(d, LANE_START_X + i * (LANE_W + LANE_GAP) + LANE_W / 2, 175);
      });
      cx.fillStyle = '#555';
      cx.font = '11px monospace';
      cx.fillText('← → choose  |  ENTER start', AW / 2, 240);
      cx.textAlign = 'left';
      return;
    }

    // Note spawning
    g.beatTimer += dt;
    if (g.beatTimer >= g.beatInterval && g.totalNotes < g.maxNotes) {
      g.beatTimer = 0;
      const lane = Math.floor(pseudoRand(g.seed, g.totalNotes) * 4);
      g.notes.push({ lane, x: LANE_START_X + lane * (LANE_W + LANE_GAP) + LANE_W / 2 - 20, y: -20, w: 40, h: 20, hit: false, missed: false });
      g.totalNotes++;
    }

    // Move notes down
    g.notes.forEach(n => {
      if (!n.hit) n.y += g.noteSpeed * dt;
    });

    // Check misses
    g.notes.forEach(n => {
      if (n.hit || n.missed) return;
      if (n.y > g.hitZoneY + g.hitWindow + 20) {
        n.missed = true;
        g.notesMissed++;
        g.missStreak++;
        g.streak = 0;
        if (g.missStreak >= 5) g.multiplier = Math.max(1, g.multiplier - 1);
        g.hitFeedback.push({ lane: n.lane, time: 0.3, hit: false, label: 'MISS' });
      }
    });

    // Update feedback
    g.hitFeedback.forEach(f => { f.time -= dt; });
    g.hitFeedback = g.hitFeedback.filter(f => f.time > 0);

    // Update lane flash
    g.laneFlash = g.laneFlash.map(f => Math.max(0, f - dt));

    // End condition
    if (g.totalNotes >= g.maxNotes && g.notes.every(n => n.hit || n.missed)) {
      g.running = false;
      endgameGameOver('rhythm', g.notesHit);
    }

    // ── Render ──
    // Background
    cx.fillStyle = '#04000a';
    cx.fillRect(0, 0, AW, AH);

    // Scanlines
    for (let sy = 0; sy < AH; sy += 4) {
      cx.fillStyle = 'rgba(0,0,0,0.15)';
      cx.fillRect(0, sy, AW, 2);
    }

    // Lanes
    for (let l = 0; l < 4; l++) {
      const lx = LANE_START_X + l * (LANE_W + LANE_GAP);
      const laneCol = ['#ff4444', '#44ff44', '#4444ff', '#ffff00'][l];

      // Lane track
      cx.fillStyle = 'rgba(255,255,255,0.04)';
      cx.fillRect(lx, 0, LANE_W, AH);

      // Flash when pressed
      if (g.laneFlash[l] > 0) {
        cx.fillStyle = `rgba(255,255,255,${g.laneFlash[l] * 4})`;
        cx.fillRect(lx, 0, LANE_W, AH);
      }

      // Hit zone receptor
      cx.fillStyle = g.lanePress[l] ? laneCol : '#333';
      cx.fillRect(lx + 4, g.hitZoneY - 2, LANE_W - 8, 18);
      cx.strokeStyle = laneCol;
      cx.lineWidth = 2;
      cx.strokeRect(lx + 4, g.hitZoneY - 2, LANE_W - 8, 18);

      // Key label
      cx.fillStyle = '#555';
      cx.font = '10px monospace';
      cx.textAlign = 'center';
      cx.fillText(g.laneKeys[l].toUpperCase(), lx + LANE_W / 2, AH - 8);
    }
    cx.textAlign = 'left';

    // Notes
    g.notes.forEach(n => {
      if (n.hit) return;
      if (n.missed && n.y > AH) return;
      const laneCol = ['#ff4444', '#44ff44', '#4488ff', '#ffff00'][n.lane];
      const alpha = n.missed ? 0.3 : 1;
      cx.globalAlpha = alpha;
      // Note body
      cx.fillStyle = laneCol;
      cx.fillRect(n.x, n.y, n.w, n.h);
      cx.fillStyle = 'rgba(255,255,255,0.4)';
      cx.fillRect(n.x + 2, n.y + 2, n.w - 4, 4);
      cx.globalAlpha = 1;
    });

    // Hit feedback
    g.hitFeedback.forEach(f => {
      const lx = LANE_START_X + f.lane * (LANE_W + LANE_GAP) + LANE_W / 2;
      cx.globalAlpha = Math.min(1, f.time * 4);
      cx.fillStyle = f.hit ? (f.label === 'PERFECT' ? '#ffd700' : '#00ff88') : '#ff4444';
      cx.font = 'bold 13px monospace';
      cx.textAlign = 'center';
      cx.fillText(f.label, lx, g.hitZoneY - 20 - (0.4 - f.time) * 30);
    });
    cx.globalAlpha = 1;
    cx.textAlign = 'left';

    // HUD top
    cx.fillStyle = 'rgba(0,0,0,0.7)';
    cx.fillRect(0, 0, AW, 28);
    cx.fillStyle = '#00fff7';
    cx.font = 'bold 12px monospace';
    cx.fillText(`SCORE: ${g.score}`, 8, 18);
    cx.fillStyle = '#ffd700';
    cx.fillText(`x${g.multiplier}`, 120, 18);
    cx.fillStyle = '#fff';
    cx.fillText(`STREAK: ${g.streak}`, 160, 18);
    cx.fillStyle = '#aaa';
    cx.textAlign = 'right';
    cx.fillText(`${g.totalNotes}/${g.maxNotes}`, AW - 8, 18);
    cx.textAlign = 'left';

    // Progress bar
    const prog = g.totalNotes / g.maxNotes;
    cx.fillStyle = '#222';
    cx.fillRect(0, AH - 4, AW, 4);
    cx.fillStyle = '#00fff7';
    cx.fillRect(0, AH - 4, AW * prog, 4);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GAME 3: FIGHTER
  // ─────────────────────────────────────────────────────────────────────────
  function initFighter() {
    const g = {
      running: true,
      round: 1, maxRounds: 3,
      playerWins: 0, aiWins: 0,
      phase: 'fight', // 'fight' | 'roundover' | 'matchover'
      phaseTimer: 0,
      score: 0, // rounds won
      timer: 60, // seconds
      player: {
        x: 80, y: AH - 120, w: 40, h: 70,
        hp: 100, maxHp: 100,
        power: 0, maxPower: 100,
        state: 'idle', stateTimer: 0,
        facing: 1, // 1=right -1=left
        color: '#00ff88',
        vx: 0, vy: 0,
        blocking: false,
        hitFlash: 0,
        punchTimer: 0,
        kickTimer: 0,
      },
      ai: {
        x: AW - 120, y: AH - 120, w: 40, h: 70,
        hp: 100, maxHp: 100,
        power: 0, maxPower: 100,
        state: 'idle', stateTimer: 0,
        facing: -1,
        color: '#ff4444',
        vx: 0, vy: 0,
        blocking: false,
        hitFlash: 0,
        aiTimer: 0,
        difficulty: 1, // 0=random 1=pattern 2=adaptive
        punchTimer: 0,
        kickTimer: 0,
      },
      effects: [],
      keys: {},
      specialPressed: false,
    };
    document.onkeydown = e => {
      g.keys[e.key] = true;
      if (e.key === 'z' && g.keys['x'] && g.player.power >= g.player.maxPower) {
        doSpecial(g);
      } else if (e.key === 'z') doPunch(g.player, g.ai, g);
      else if (e.key === 'x') doKick(g.player, g.ai, g);
      else if (e.key === 'c') g.player.blocking = true;
      else if (e.key === 'ArrowLeft') g.player.vx = -2;
      else if (e.key === 'ArrowRight') g.player.vx = 2;
    };
    document.onkeyup = e => {
      delete g.keys[e.key];
      if (e.key === 'c') g.player.blocking = false;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') g.player.vx = 0;
    };
    return g;
  }

  function handleFighterKey(e, g) {} // handled by onkeydown

  function doPunch(attacker, defender, g) {
    if (attacker.punchTimer > 0) return;
    attacker.punchTimer = 0.3;
    attacker.state = 'punch'; attacker.stateTimer = 0.2;
    const dist = Math.abs((attacker.x + attacker.w / 2) - (defender.x + defender.w / 2));
    if (dist < 70) {
      const dmg = defender.blocking ? 3 : 10;
      defender.hp = Math.max(0, defender.hp - dmg);
      defender.hitFlash = 0.2;
      attacker.power = Math.min(attacker.maxPower, attacker.power + 8);
      g.effects.push({ x: defender.x + defender.w / 2, y: defender.y + 20, text: defender.blocking ? 'BLOCK' : `${dmg}`, time: 0.5, color: defender.blocking ? '#aaa' : '#ff4444' });
    }
  }

  function doKick(attacker, defender, g) {
    if (attacker.kickTimer > 0) return;
    attacker.kickTimer = 0.45;
    attacker.state = 'kick'; attacker.stateTimer = 0.3;
    const dist = Math.abs((attacker.x + attacker.w / 2) - (defender.x + defender.w / 2));
    if (dist < 85) {
      const dmg = defender.blocking ? 5 : 18;
      defender.hp = Math.max(0, defender.hp - dmg);
      defender.hitFlash = 0.3;
      attacker.power = Math.min(attacker.maxPower, attacker.power + 12);
      g.effects.push({ x: defender.x + defender.w / 2, y: defender.y + 30, text: defender.blocking ? 'GUARD' : `${dmg}!!`, time: 0.5, color: defender.blocking ? '#aaa' : '#ff8800' });
    }
  }

  function doSpecial(g) {
    if (g.player.power < g.player.maxPower) return;
    g.player.power = 0;
    g.ai.hp = Math.max(0, g.ai.hp - 40);
    g.ai.hitFlash = 0.5;
    g.effects.push({ x: AW / 2, y: AH / 2 - 30, text: '★ SPECIAL! ★', time: 1.0, color: '#ffd700' });
    // Flash whole screen
    for (let i = 0; i < 20; i++) {
      g.effects.push({ x: Math.random() * AW, y: Math.random() * AH, text: '★', time: 0.3 + Math.random() * 0.5, color: '#ffd700' });
    }
  }

  const aiBehavior = [
    // Easy: random
    function (ai, player, g, dt) {
      ai.aiTimer -= dt;
      if (ai.aiTimer > 0) return;
      ai.aiTimer = 0.5 + Math.random() * 0.8;
      const r = Math.random();
      const dist = Math.abs((ai.x + ai.w / 2) - (player.x + player.w / 2));
      if (dist > 70) ai.vx = (player.x > ai.x ? 1.2 : -1.2);
      else { ai.vx = 0; if (r < 0.4) doPunch(ai, player, g); else if (r < 0.6) doKick(ai, player, g); }
    },
    // Normal: pattern-based
    function (ai, player, g, dt) {
      ai.aiTimer -= dt;
      if (ai.aiTimer > 0) return;
      ai.aiTimer = 0.3 + Math.random() * 0.5;
      const dist = Math.abs((ai.x + ai.w / 2) - (player.x + player.w / 2));
      if (dist > 60) {
        ai.vx = (player.x > ai.x ? 1.5 : -1.5);
      } else {
        ai.vx = 0;
        const r = Math.random();
        if (r < 0.3) doPunch(ai, player, g);
        else if (r < 0.5) doKick(ai, player, g);
        else if (r < 0.65) ai.blocking = true;
        else ai.blocking = false;
      }
    },
    // Hard: adaptive
    function (ai, player, g, dt) {
      ai.aiTimer -= dt;
      if (ai.aiTimer > 0) return;
      ai.aiTimer = 0.2 + Math.random() * 0.3;
      const dist = Math.abs((ai.x + ai.w / 2) - (player.x + player.w / 2));
      // Adaptive: react to player health ratio
      const urgency = 1 - ai.hp / ai.maxHp;
      if (dist > 50) {
        ai.vx = (player.x > ai.x ? 2 : -2);
        ai.blocking = false;
      } else {
        ai.vx = 0;
        if (player.keys && (player.keys['z'] || player.keys['x'])) {
          ai.blocking = true;
        } else {
          ai.blocking = false;
          const r = Math.random();
          if (r < 0.4 + urgency * 0.2) doPunch(ai, player, g);
          else if (r < 0.7 + urgency * 0.1) doKick(ai, player, g);
          if (ai.power >= ai.maxPower && r < 0.2) {
            // AI special
            ai.power = 0;
            g.player.hp = Math.max(0, g.player.hp - 30);
            g.player.hitFlash = 0.4;
            g.effects.push({ x: AW / 2, y: 80, text: 'AI SPECIAL!', time: 0.8, color: '#ff4444' });
          }
        }
      }
    }
  ];

  function updateFighter(cx, dt, g) {
    if (!g.running) return;
    const t = performance.now() / 1000;

    if (g.phase === 'roundover' || g.phase === 'matchover') {
      g.phaseTimer -= dt;
      renderFighterScene(cx, g, t);
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect(0, 0, AW, AH);
      cx.textAlign = 'center';
      cx.font = 'bold 28px monospace';
      if (g.phase === 'matchover') {
        cx.fillStyle = g.playerWins >= 2 ? '#00ff88' : '#ff4444';
        cx.fillText(g.playerWins >= 2 ? 'VICTORY!' : 'DEFEATED!', AW / 2, AH / 2);
        cx.fillStyle = '#ffd700';
        cx.font = '16px monospace';
        cx.fillText(`Rounds: ${g.playerWins} / ${g.aiWins}`, AW / 2, AH / 2 + 35);
      } else {
        cx.fillStyle = '#ffd700';
        cx.fillText(`ROUND ${g.round - 1} ${g.playerWins > g.aiWins ? 'WIN' : 'LOSS'}!`, AW / 2, AH / 2);
      }
      cx.textAlign = 'left';
      if (g.phaseTimer <= 0) {
        if (g.phase === 'matchover') {
          g.running = false;
          endgameGameOver('fighter', g.playerWins);
          return;
        }
        startFighterRound(g);
      }
      return;
    }

    g.timer -= dt;
    if (g.timer <= 0) {
      // Time up - whoever has more HP wins round
      g.timer = 0;
      resolveRound(g);
      return;
    }

    // Move player
    g.player.x = Math.max(10, Math.min(AW - g.player.w - 10, g.player.x + g.player.vx));
    g.player.facing = g.ai.x > g.player.x ? 1 : -1;

    // AI update
    const aiFn = aiBehavior[Math.min(2, g.ai.difficulty)];
    if (aiFn) aiFn(g.ai, g.player, g, dt);
    g.ai.x = Math.max(10, Math.min(AW - g.ai.w - 10, g.ai.x + g.ai.vx));
    g.ai.facing = g.player.x > g.ai.x ? 1 : -1;

    // Cool down timers
    g.player.punchTimer = Math.max(0, g.player.punchTimer - dt);
    g.player.kickTimer = Math.max(0, g.player.kickTimer - dt);
    g.ai.punchTimer = Math.max(0, g.ai.punchTimer - dt);
    g.ai.kickTimer = Math.max(0, g.ai.kickTimer - dt);
    g.player.hitFlash = Math.max(0, g.player.hitFlash - dt);
    g.ai.hitFlash = Math.max(0, g.ai.hitFlash - dt);
    if (g.player.stateTimer > 0) { g.player.stateTimer -= dt; if (g.player.stateTimer <= 0) g.player.state = 'idle'; }
    if (g.ai.stateTimer > 0) { g.ai.stateTimer -= dt; if (g.ai.stateTimer <= 0) g.ai.state = 'idle'; }

    // Check KO
    if (g.player.hp <= 0 || g.ai.hp <= 0) {
      resolveRound(g);
      return;
    }

    // Passive power regen
    g.player.power = Math.min(g.player.maxPower, g.player.power + dt * 3);
    g.ai.power = Math.min(g.ai.maxPower, g.ai.power + dt * 3);

    g.effects.forEach(ef => { ef.time -= dt; });
    g.effects = g.effects.filter(ef => ef.time > 0);

    renderFighterScene(cx, g, t);
  }

  function resolveRound(g) {
    if (g.player.hp > g.ai.hp) { g.playerWins++; }
    else { g.aiWins++; }
    g.round++;
    if (g.playerWins >= 2 || g.aiWins >= 2 || g.round > g.maxRounds) {
      g.phase = 'matchover';
      g.phaseTimer = 2.5;
    } else {
      g.phase = 'roundover';
      g.phaseTimer = 2.0;
    }
  }

  function startFighterRound(g) {
    g.phase = 'fight';
    g.timer = 60;
    g.player.hp = g.player.maxHp;
    g.ai.hp = g.ai.maxHp;
    g.player.x = 80;
    g.ai.x = AW - 120;
    g.ai.difficulty = Math.min(2, g.round - 1);
    g.effects = [];
  }

  function renderFighterScene(cx, g, t) {
    // Background — arena
    const bg = cx.createLinearGradient(0, 0, 0, AH);
    bg.addColorStop(0, '#1a0008');
    bg.addColorStop(1, '#0a0015');
    cx.fillStyle = bg;
    cx.fillRect(0, 0, AW, AH);

    // Arena floor
    cx.fillStyle = '#1a0818';
    cx.fillRect(0, AH - 80, AW, 80);
    cx.fillStyle = '#2a0828';
    cx.fillRect(0, AH - 82, AW, 4);

    // Ring ropes
    cx.strokeStyle = '#ff4488';
    cx.lineWidth = 3;
    cx.shadowColor = '#ff4488'; cx.shadowBlur = 10;
    cx.beginPath(); cx.moveTo(20, AH - 60); cx.lineTo(AW - 20, AH - 60); cx.stroke();
    cx.beginPath(); cx.moveTo(20, AH - 75); cx.lineTo(AW - 20, AH - 75); cx.stroke();
    cx.shadowBlur = 0;

    // Draw fighters
    [g.player, g.ai].forEach(f => {
      const flash = f.hitFlash > 0 && Math.sin(t * 30) > 0;
      cx.fillStyle = flash ? '#ffffff' : f.color;
      // Body
      cx.fillRect(f.x, f.y + 20, f.w, f.h - 20);
      // Head
      cx.fillStyle = flash ? '#ffffff' : (f === g.player ? '#00cc66' : '#cc2222');
      cx.fillRect(f.x + 5, f.y, f.w - 10, 20);
      // Eyes
      const eyeX = f.facing === 1 ? f.x + f.w - 12 : f.x + 4;
      cx.fillStyle = '#ffffff';
      cx.fillRect(eyeX, f.y + 5, 8, 6);
      cx.fillStyle = '#000';
      cx.fillRect(eyeX + (f.facing === 1 ? 3 : 1), f.y + 7, 4, 4);
      // Arms
      if (f.state === 'punch') {
        const armX = f.facing === 1 ? f.x + f.w : f.x - 18;
        cx.fillStyle = f.color;
        cx.fillRect(armX, f.y + 25, 18, 10);
      } else if (f.state === 'kick') {
        const legX = f.facing === 1 ? f.x + f.w - 5 : f.x - 22;
        cx.fillStyle = f.color;
        cx.fillRect(legX, f.y + 50, 22, 10);
      }
      // Block shield
      if (f.blocking) {
        cx.fillStyle = 'rgba(100,200,255,0.4)';
        cx.fillRect(f.x - 4, f.y, f.w + 8, f.h);
        cx.strokeStyle = '#88ddff';
        cx.lineWidth = 2;
        cx.strokeRect(f.x - 4, f.y, f.w + 8, f.h);
      }
    });

    // Hit effects
    g.effects.forEach(ef => {
      cx.globalAlpha = Math.min(1, ef.time * 3);
      cx.fillStyle = ef.color || '#fff';
      cx.font = 'bold 14px monospace';
      cx.textAlign = 'center';
      cx.fillText(ef.text, ef.x, ef.y);
    });
    cx.globalAlpha = 1;
    cx.textAlign = 'left';

    // HUD
    // Health bars
    const hbW = 150, hbH = 12;
    // Player HP
    cx.fillStyle = '#333';
    cx.fillRect(10, 10, hbW, hbH);
    cx.fillStyle = g.player.hp > 30 ? '#00ff88' : '#ff4444';
    cx.fillRect(10, 10, hbW * (g.player.hp / g.player.maxHp), hbH);
    cx.strokeStyle = '#555'; cx.lineWidth = 1;
    cx.strokeRect(10, 10, hbW, hbH);
    cx.fillStyle = '#fff'; cx.font = '9px monospace';
    cx.fillText('YOU', 12, 9);

    // AI HP
    cx.fillStyle = '#333';
    cx.fillRect(AW - 10 - hbW, 10, hbW, hbH);
    cx.fillStyle = g.ai.hp > 30 ? '#ff4444' : '#ff8800';
    cx.fillRect(AW - 10 - hbW * (g.ai.hp / g.ai.maxHp), 10, hbW * (g.ai.hp / g.ai.maxHp), hbH);
    cx.strokeStyle = '#555';
    cx.strokeRect(AW - 10 - hbW, 10, hbW, hbH);
    cx.textAlign = 'right';
    cx.fillStyle = '#fff'; cx.font = '9px monospace';
    cx.fillText('AI', AW - 12, 9);
    cx.textAlign = 'left';

    // Power bars
    const pwW = 80, pwH = 5;
    cx.fillStyle = '#222'; cx.fillRect(10, 26, pwW, pwH);
    cx.fillStyle = g.player.power >= g.player.maxPower ? '#ffd700' : '#4488ff';
    cx.fillRect(10, 26, pwW * (g.player.power / g.player.maxPower), pwH);

    // Round / timer
    cx.fillStyle = '#ffd700';
    cx.font = 'bold 14px monospace';
    cx.textAlign = 'center';
    cx.fillText(`R${g.round}  ${Math.ceil(g.timer)}s`, AW / 2, 20);
    cx.fillStyle = '#888';
    cx.font = '9px monospace';
    cx.fillText(`${g.playerWins}-${g.aiWins}`, AW / 2, 32);
    cx.textAlign = 'left';

    // Controls
    cx.fillStyle = '#333';
    cx.font = '9px monospace';
    cx.fillText('Z=Punch X=Kick C=Block ←→=Move Z+X=Special', 8, AH - 6);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOOK INTO EXISTING INTERACT HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const _origInteract = window.interact;
  window.interact = function () {
    try {
      if (window.S && window.S.nearObject) {
        const id = window.S.nearObject.id;
        if (id === 'arcade_racing') { openEndgameArcade('racing'); return; }
        if (id === 'arcade_rhythm') { openEndgameArcade('rhythm'); return; }
        if (id === 'arcade_fighting') { openEndgameArcade('fighter'); return; }
        if (id === 'leaderboard') { showHallOfFame(); return; }
      }
    } catch (err) { console.warn('[arcade-endgame] interact hook error:', err); }
    if (_origInteract) _origInteract.apply(this, arguments);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HALL OF FAME
  // ─────────────────────────────────────────────────────────────────────────
  function showHallOfFame() {
    const allLB = ArcadeTournament.getAllLeaderboards();
    const tournament = ArcadeTournament.getTournamentState();
    const allGames = ['snake', 'breakout', 'invaders', 'racing', 'rhythm', 'fighter'];
    const gameIcons = { snake: '🐍', breakout: '🧱', invaders: '👾', racing: '🏎️', rhythm: '🎵', fighter: '🥊' };

    let html = '<h3 style="color:#ffd700;text-align:center">🏛️ Arcade Hall of Fame</h3>';

    // Tournament status
    if (tournament.active) {
      const timeLeft = Math.max(0, Math.floor((tournament.endDate - Date.now()) / 3600000));
      html += `<div style="background:#1a1a2a;border:1px solid #ffd700;border-radius:6px;padding:8px;margin:8px 0;text-align:center">`;
      html += `<div style="color:#ffd700;font-weight:bold">🏆 LIVE TOURNAMENT</div>`;
      html += `<div style="color:#00fff7">${gameIcons[tournament.game]} ${tournament.game.toUpperCase()}</div>`;
      html += `<div style="color:#ff6ec7">Prize Pool: ${tournament.prizePool}◈ | ${timeLeft}h left</div>`;
      html += `<div style="color:#888;font-size:10px">Top 3 split 60/30/10%</div>`;
      html += `</div>`;
    }

    // Per-game leaderboards
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
    allGames.forEach(game => {
      const entries = allLB[game] || [];
      html += `<div style="background:#111;border-radius:4px;padding:6px">`;
      html += `<div style="color:#00fff7;font-weight:bold;font-size:11px">${gameIcons[game]} ${game.toUpperCase()}</div>`;
      if (entries.length === 0) {
        html += `<div style="color:#444;font-size:10px">No records yet</div>`;
      } else {
        entries.slice(0, 3).forEach((e, i) => {
          const crown = i === 0 ? '👑 ' : i === 1 ? '🥈 ' : '🥉 ';
          const trophy = e.trophy ? ' 🏆' : '';
          const gold = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
          html += `<div style="color:${gold};font-size:10px">${crown}${e.name}${trophy} <span style="color:#888">${e.score}</span></div>`;
        });
      }
      html += `</div>`;
    });
    html += '</div>';

    // Daily challenges
    const dailyChallenges = ArcadeStreak.getDailyChallenges();
    const streakState = ArcadeStreak.getState();
    const completedToday = (streakState.challengesCompleted && streakState.challengesCompleted[todayStr()]) || [];

    html += '<div style="margin-top:10px;background:#0a0a18;border:1px solid #333;border-radius:6px;padding:8px">';
    html += '<div style="color:#ff6ec7;font-weight:bold;margin-bottom:6px">📋 Daily Challenges</div>';
    dailyChallenges.forEach(ch => {
      const done = completedToday.includes(ch.id);
      html += `<div style="font-size:10px;color:${done ? '#888' : '#ccc'};margin:3px 0">`;
      html += `${done ? '✅' : '⬜'} <b>${ch.name}</b> — ${ch.desc} <span style="color:#ffd700">+${ch.reward}◈</span>`;
      html += `</div>`;
    });
    const streak = streakState.streak || 0;
    if (streak > 0) html += `<div style="color:#ff8800;font-size:11px;margin-top:4px">🔥 ${streak}-day streak!</div>`;
    html += '</div>';

    if (!createPopupHTML(html)) {
      // Fallback alert
      alert('Hall of Fame loaded — open DevTools to see data or check the popup system.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CABINET VISUAL UPGRADE (hook into renderFloor3)
  // ─────────────────────────────────────────────────────────────────────────
  function patchRenderFloor3() {
    const _origRF3 = window.renderFloor3;
    if (!_origRF3) {
      // Not yet defined — try later
      setTimeout(patchRenderFloor3, 500);
      return;
    }
    window.renderFloor3 = function renderFloor3() {
      _origRF3.apply(this, arguments);
      drawNewCabinets();
    };
  }

  function drawNewCabinets() {
    // We need the global ctx and S and getObjects
    const ctx = window.ctx;
    const S = window.S;
    if (!ctx || !S) return;
    if (S.floor !== 3) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

    const cabinetDefs = [
      { id: 'arcade_racing', color: '#ff2222', glowColor: '#ff4444', label: 'RACING', icon: '🏎️', anim: drawRacingMiniPreview },
      { id: 'arcade_rhythm', color: '#00ccee', glowColor: '#00fff7', label: 'RHYTHM', icon: '🎵', anim: drawRhythmMiniPreview },
      { id: 'arcade_fighting', color: '#ff8800', glowColor: '#ffaa00', label: 'FIGHTER', icon: '🥊', anim: drawFighterMiniPreview },
    ];

    cabinetDefs.forEach(def => {
      let o = null;
      try {
        if (typeof window.getObjects === 'function') {
          o = window.getObjects().find(ob => ob.id === def.id);
        }
        if (!o && window.FLOOR_OBJECTS && window.FLOOR_OBJECTS[3]) {
          o = window.FLOOR_OBJECTS[3].find(ob => ob.id === def.id);
        }
      } catch {}
      if (!o) return;

      const glow = 0.5 + Math.sin(t * 2 + o.x * 0.01) * 0.3;

      // Ambient glow
      ctx.save();
      ctx.shadowColor = def.glowColor;
      ctx.shadowBlur = 20 * glow;

      // Cabinet body (dark housing)
      ctx.fillStyle = '#121218';
      ctx.fillRect(o.x, o.y, o.w, o.h);

      // Cabinet sides (bevel)
      ctx.fillStyle = '#1e1e28';
      ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);

      // Marquee at top
      const marqueeH = 22;
      ctx.fillStyle = def.color;
      ctx.globalAlpha = glow;
      ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, marqueeH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.fillText(def.label, o.x + o.w / 2, o.y + 14);
      ctx.shadowBlur = 0;

      // Screen area
      const screenX = o.x + 8, screenY = o.y + marqueeH + 4, screenW = o.w - 16, screenH = 50;
      ctx.fillStyle = '#000';
      ctx.fillRect(screenX, screenY, screenW, screenH);

      // Screen glow border
      ctx.strokeStyle = def.glowColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = glow;
      ctx.strokeRect(screenX - 1, screenY - 1, screenW + 2, screenH + 2);
      ctx.globalAlpha = 1;

      // Mini preview animation
      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX, screenY, screenW, screenH);
      ctx.clip();
      try {
        def.anim(ctx, screenX, screenY, screenW, screenH, t);
      } catch {}
      ctx.restore();

      // Control panel strip
      const cpY = o.y + marqueeH + 4 + screenH + 4;
      const cpH = o.h - marqueeH - 4 - screenH - 8;
      ctx.fillStyle = '#222230';
      ctx.fillRect(o.x + 2, cpY, o.w - 4, cpH);

      // Joystick ball
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2 - 16, cpY + cpH / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2 - 16, cpY + cpH / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Buttons
      const btnColors = [def.color, '#2255cc', '#22aa44'];
      btnColors.forEach((bc, bi) => {
        const bx = o.x + o.w / 2 + 6 + bi * 11;
        const by = cpY + cpH / 2;
        const pulse = bi === 0 && Math.sin(t * 3 + bi) > 0.7;
        ctx.fillStyle = pulse ? '#fff' : bc;
        ctx.globalAlpha = pulse ? 1 : 0.85;
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Game icon label below
      ctx.font = '10px monospace';
      ctx.fillStyle = def.glowColor;
      ctx.globalAlpha = glow;
      ctx.fillText(def.icon, o.x + o.w / 2, o.y + o.h - 4);
      ctx.globalAlpha = 1;

      ctx.textAlign = 'left';
      ctx.restore();
    });
  }

  // Mini preview animations for cabinet screens
  function drawRacingMiniPreview(ctx, sx, sy, sw, sh, t) {
    // Scrolling road
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx, sy, sw, sh);
    const roadX = sx + sw * 0.2, roadW = sw * 0.6;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(roadX, sy, roadW, sh);
    // Stripes
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 5; i++) {
      const yy = sy + ((t * 40 + i * 14) % (sh + 14)) - 7;
      ctx.fillRect(sx + sw / 2 - 1, yy, 2, 8);
    }
    // Car
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(sx + sw / 2 - 4, sy + sh - 14, 8, 12);
  }

  function drawRhythmMiniPreview(ctx, sx, sy, sw, sh, t) {
    ctx.fillStyle = '#020010';
    ctx.fillRect(sx, sy, sw, sh);
    const cols = ['#ff4444', '#44ff44', '#4444ff', '#ffff00'];
    const lw = sw / 4;
    for (let l = 0; l < 4; l++) {
      ctx.fillStyle = cols[l];
      ctx.globalAlpha = 0.15;
      ctx.fillRect(sx + l * lw, sy, lw - 1, sh);
      ctx.globalAlpha = 1;
      // Falling notes
      const noteY = sy + ((t * 35 + l * 12 + l * 7) % (sh + 10)) - 5;
      ctx.fillStyle = cols[l];
      ctx.fillRect(sx + l * lw + 2, noteY, lw - 5, 6);
    }
    // Hit zone
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(sx, sy + sh - 10, sw, 2);
  }

  function drawFighterMiniPreview(ctx, sx, sy, sw, sh, t) {
    ctx.fillStyle = '#100008';
    ctx.fillRect(sx, sy, sw, sh);
    // Floor
    ctx.fillStyle = '#2a0818';
    ctx.fillRect(sx, sy + sh - 10, sw, 10);
    // Fighter 1
    const p1x = sx + sw * 0.2 + Math.sin(t * 2) * 4;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p1x, sy + sh - 24, 10, 14);
    ctx.fillRect(p1x + 2, sy + sh - 30, 6, 8);
    // Fighter 2
    const p2x = sx + sw * 0.7 + Math.sin(t * 2 + 1) * 4;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(p2x, sy + sh - 24, 10, 14);
    ctx.fillRect(p2x + 2, sy + sh - 30, 6, 8);
    // vs text
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VS', sx + sw / 2, sy + sh - 14);
    ctx.textAlign = 'left';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────
  function init() {
    // Schedule daily tournament
    try { ArcadeTournament.scheduleDailyTournament(); } catch (e) { console.warn('[arcade-endgame] tournament init error:', e); }

    // Patch renderFloor3
    patchRenderFloor3();

    // Expose globals
    window.ArcadeTournament = ArcadeTournament;
    window.ArcadeStreak = ArcadeStreak;
    window.openEndgameArcade = openEndgameArcade;
    window.showHallOfFame = showHallOfFame;

    console.log('[arcade-endgame] ✅ Arcade Endgame loaded — Racing / Rhythm / Fighter + Tournament + Challenges + Hall of Fame');
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay so index.html scripts finish setting up globals
    setTimeout(init, 200);
  }

})();
