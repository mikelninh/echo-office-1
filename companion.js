/**
 * Echo's Vault — Companion System
 * A self-contained emotional core. No external dependencies.
 * companion.js v1.0
 */
(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  const LS_KEY = 'echo_companion';
  const DEBUG = location.search.includes('companion_debug=1');
  const HATCH_DELAY = DEBUG ? 10000 : 259200000; // 10s debug / 3 real days
  const XP_PER_LEVEL = 20;
  const MAX_LEVEL = 20;
  const IDLE_BUBBLE_INTERVAL = 300000; // 5 minutes

  const NAMES = [
    'Aura', 'Blaze', 'Cedar', 'Dusk', 'Echo', 'Fable', 'Glow', 'Haze',
    'Ivy', 'Jinx', 'Kael', 'Lune', 'Mira', 'Nova', 'Ori', 'Pix',
    'Quinn', 'Rime', 'Sage', 'Teal', 'Uma', 'Vex', 'Wren', 'Xen',
    'Yuki', 'Zara', 'Ash', 'Bryn', 'Cleo', 'Dew', 'Ember', 'Flux',
    'Gem', 'Halo', 'Iris', 'Jade', 'Kira', 'Lark'
  ];

  const FLOOR_LINES = {
    observatory: ['The stars… gorgeous.', 'I could stay here forever.', 'Look at all those constellations!'],
    garden: ["It smells amazing here.", 'So peaceful…', 'I love the flowers in this place.'],
    vault: ['So many treasures here!', 'The history in these walls…', 'Everything feels valuable here.'],
    arcade: ['Games! I want to play!', 'Let\'s win something!', 'The lights are amazing!'],
    underground: ['Dark… but interesting.', 'There\'s secrets down here.', 'I sense hidden things.'],
    gym: ['You\'re going to crush it!', 'Train hard, collect harder!', 'I\'ll cheer you on!'],
    default: ['Interesting floor…', 'I\'ve never seen this before!', 'What do you think of this place?']
  };

  const IDLE_QUIPS = {
    collector: [
      'Did you check the market today?',
      'I wonder what\'s listed in the Vault right now…',
      'Your collection grows more impressive every day.',
      'Should we look for that grail soon?',
      'I\'ve been cataloguing your cards in my head. You\'re doing great.',
    ],
    explorer: [
      'There\'s always another floor to discover!',
      'Wonder what\'s on the other side of that door…',
      'Adventure waits for no one. Let\'s go!',
      'Every corner has a story. Let\'s find it.',
      'I think I spotted something new on Floor 3…',
    ],
    fighter: [
      'Ready to take on anyone who comes our way.',
      'Your rankings are climbing. Keep pushing!',
      'The best defence is a legendary collection.',
      'I\'ve been training while you were away.',
      'Show them what we\'re made of.',
    ],
    egg: [
      '…', '…zzzz…', 'tap tap', '…', '*rustles*'
    ]
  };

  const MOOD_EMOJI = {
    curious: '🤔', happy: '😊', excited: '🤩', calm: '😌', sleepy: '😴'
  };

  const MOOD_DESC = {
    curious: 'Exploring and wondering about everything.',
    happy: 'Feeling good — recent activity has been great!',
    excited: 'Can\'t contain the excitement right now!',
    calm: 'Peaceful and content.',
    sleepy: 'A little drowsy… needs rest or more activity.'
  };

  // ─── Pixel Art Definitions ─────────────────────────────────────────────────
  // 8×12 grid of colour indices; 0 = transparent
  // colours per path defined separately

  const PALETTES = {
    egg:      { 1: '#f5e6c8', 2: '#d4b896', 3: '#b8956e', 4: '#7a5c3a' },
    collector:{ 1: '#5b8ee6', 2: '#ffd700', 3: '#3a5fa8', 4: '#ffe066', 5: '#fff', 6: '#222' },
    explorer: { 1: '#4caf50', 2: '#ff9800', 3: '#2e7d32', 4: '#fff', 5: '#8d6e63', 6: '#222' },
    fighter:  { 1: '#e53935', 2: '#9c27b0', 3: '#b71c1c', 4: '#fff', 5: '#ffd600', 6: '#222' },
  };

  // Pixel maps: [row][col] = palette index (0 = skip)
  const SPRITES = {
    egg: [
      [0,0,0,2,2,0,0,0],
      [0,0,2,1,1,2,0,0],
      [0,2,1,1,1,1,2,0],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [0,2,1,1,1,1,2,0],
      [0,0,2,1,1,2,0,0],
      [0,0,0,2,2,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    egg_crack: [
      [0,0,0,2,2,0,0,0],
      [0,0,2,1,1,2,0,0],
      [0,2,1,4,1,1,2,0],
      [2,1,4,1,4,1,1,2],
      [2,1,1,4,1,1,1,2],
      [2,1,4,1,1,4,1,2],
      [2,1,1,1,4,1,1,2],
      [2,1,1,1,1,1,1,2],
      [0,2,1,1,1,1,2,0],
      [0,0,2,1,1,2,0,0],
      [0,0,0,2,2,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Collector baby (blue body, tiny book)
    collector_1: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,2,2,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [0,2,2,0,0,2,2,0],
      [0,2,0,0,0,0,2,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Collector teen (book + magnifier)
    collector_2: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,2,4,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,2],
      [1,1,1,1,1,1,2,4],
      [1,2,1,1,1,1,2,0],
      [0,2,2,0,0,2,2,0],
      [0,2,2,0,0,2,2,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Collector adult (robe, staff with book)
    collector_3: [
      [0,0,1,1,1,1,0,0],
      [0,1,4,6,6,4,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,2,2,1,1,0],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,4],
      [2,1,1,1,1,1,4,4],
      [0,2,1,1,1,2,0,0],
      [0,2,2,1,2,2,0,0],
      [0,2,2,1,2,2,0,0],
      [0,0,2,2,2,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Explorer baby (green, compass dot)
    explorer_1: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,2,2,1,0,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [0,5,2,0,0,2,5,0],
      [0,5,0,0,0,0,5,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Explorer teen (compass + scarf)
    explorer_2: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,2,1,2,2,1,2,0],
      [2,1,1,1,1,1,1,0],
      [2,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,2],
      [1,2,1,1,1,1,2,1],
      [0,5,2,0,0,2,5,0],
      [0,5,5,0,0,5,5,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Explorer adult (cape, compass prominent)
    explorer_3: [
      [0,0,1,1,1,1,0,0],
      [0,1,2,6,6,2,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,1,2,2,1,1,0],
      [2,2,1,1,1,1,2,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [2,1,1,1,1,1,1,2],
      [0,2,2,1,1,2,2,0],
      [0,5,2,0,0,2,5,0],
      [0,5,5,0,0,5,5,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Fighter baby (red, tiny fist)
    fighter_1: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,2,2,1,0,0],
      [0,1,1,1,1,1,1,0],
      [5,1,1,1,1,1,1,5],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [0,3,2,0,0,2,3,0],
      [0,3,0,0,0,0,3,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Fighter teen (sword + small shield)
    fighter_2: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,6,6,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,0,1,2,2,1,0,0],
      [5,1,1,1,1,1,1,0],
      [5,1,1,1,1,1,1,4],
      [1,1,1,1,1,1,1,4],
      [1,2,1,1,1,1,2,1],
      [0,3,2,0,0,2,3,0],
      [0,3,3,0,0,3,3,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    // Fighter adult (armour, sword, shield)
    fighter_3: [
      [0,0,1,1,1,1,0,0],
      [0,1,5,6,6,5,1,0],
      [0,1,1,1,1,1,1,0],
      [5,1,1,2,2,1,1,5],
      [5,2,1,1,1,1,2,5],
      [5,1,1,1,1,1,1,4],
      [5,1,1,1,1,1,4,4],
      [1,2,1,1,1,1,2,1],
      [0,3,3,1,1,3,3,0],
      [0,3,3,0,0,3,3,0],
      [0,0,3,0,0,3,0,0],
      [0,0,0,0,0,0,0,0],
    ],
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function daysSince(ts) {
    return (Date.now() - ts) / 86400000;
  }

  function loadCompanion() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveCompanion(data) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) { /* quota */ }
  }

  function createFreshCompanion() {
    return {
      id: uuid(),
      name: null,
      bornAt: Date.now(),
      hatchedAt: null,
      form: 'egg',
      evolutionPath: null,
      xp: 0,
      level: 1,
      traits: { floorsVisited: 0, clawPulls: 0, grailsSpotted: 0, dealsActed: 0 },
      mood: 'curious',
      lastSeen: Date.now(),
    };
  }

  // ─── Sprite Drawing ────────────────────────────────────────────────────────

  function getSpriteKey(state) {
    if (state.form === 'egg' || state.form === 'egg_crack') return state.form;
    const path = state.evolutionPath || 'collector';
    const formNum = state.form === 'sprite1' ? '1' : state.form === 'sprite2' ? '2' : '3';
    return `${path}_${formNum}`;
  }

  function drawSprite(ctx, key, scale, offsetX, offsetY) {
    const grid = SPRITES[key] || SPRITES['egg'];
    const pathKey = key.includes('collector') ? 'collector'
                  : key.includes('explorer') ? 'explorer'
                  : key.includes('fighter') ? 'fighter'
                  : 'egg';
    const palette = PALETTES[pathKey];

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const ci = grid[row][col];
        if (!ci) continue;
        ctx.fillStyle = palette[ci] || '#f00';
        ctx.fillRect(
          offsetX + col * scale,
          offsetY + row * scale,
          scale, scale
        );
      }
    }
  }

  // ─── Companion State Manager ───────────────────────────────────────────────

  const Companion = {
    state: null,
    bobOffset: 0,
    bobDir: 1,
    bubbleTimeout: null,
    idleTimer: null,
    animFrame: null,
    shakePhase: 0,
    shakingEgg: false,
    hatchAnimating: false,

    init() {
      this.state = loadCompanion();
      if (!this.state) {
        this.state = createFreshCompanion();
        saveCompanion(this.state);
      }

      this.state.lastSeen = Date.now();
      saveCompanion(this.state);

      this.buildHUD();
      this.buildModal();
      this.updateMood();
      this.startIdleLoop();
      this.scheduleHatch();
      this.greetOnLoad();

      window.companionEvent = (type, data) => this.handleEvent(type, data);
    },

    scheduleHatch() {
      if (this.state.hatchedAt) return;
      const elapsed = Date.now() - this.state.bornAt;
      const remaining = HATCH_DELAY - elapsed;

      if (remaining <= 0) {
        this.doHatch();
      } else {
        setTimeout(() => {
          if (!this.state.hatchedAt) this.startHatchAnimation();
        }, remaining);
      }
    },

    chooseEvolutionPath() {
      const t = this.state.traits;
      const scores = {
        collector: (t.grailsSpotted || 0) * 2 + (t.dealsActed || 0),
        explorer:  (t.floorsVisited || 0) * 2,
        fighter:   (t.clawPulls || 0) * 2,
      };
      return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    },

    doHatch() {
      const path = this.chooseEvolutionPath();
      this.state.hatchedAt = Date.now();
      this.state.evolutionPath = path;
      this.state.form = 'sprite1';
      this.state.name = pick(NAMES);
      this.state.mood = 'excited';
      saveCompanion(this.state);
      this.renderHUD();
    },

    startHatchAnimation() {
      this.shakingEgg = true;
      this.shakePhase = 0;
      let shakes = 0;
      const interval = setInterval(() => {
        this.shakePhase = (this.shakePhase + 1) % 4;
        shakes++;
        if (shakes === 10) {
          // show crack
          const hudCanvas = document.getElementById('companion-canvas');
          if (hudCanvas) {
            const ctx = hudCanvas.getContext('2d');
            ctx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
            drawSprite(ctx, 'egg_crack', 4, 8, 4);
          }
        }
        if (shakes >= 20) {
          clearInterval(interval);
          this.shakingEgg = false;
          this.doHatch();
          this.showBubble('✨ I\'m here! Finally! What is this place?!');
        }
      }, 150);
    },

    updateMood() {
      const h = new Date().getHours();
      const daysSinceVisit = daysSince(this.state.lastSeen);

      if (!this.state.hatchedAt) {
        this.state.mood = 'calm';
      } else if (daysSinceVisit > 1) {
        this.state.mood = 'sleepy';
      } else if (h >= 23 || h < 6) {
        this.state.mood = 'sleepy';
      } else if (h >= 6 && h < 12) {
        this.state.mood = 'curious';
      } else if (h >= 12 && h < 18) {
        this.state.mood = 'excited';
      } else {
        this.state.mood = 'calm';
      }

      saveCompanion(this.state);
    },

    greetOnLoad() {
      if (!this.state.hatchedAt) return;
      const h = new Date().getHours();
      let msg;
      if (h >= 6 && h < 12) msg = "Morning! Ready to find something beautiful today?";
      else if (h >= 22 || h < 6) msg = "Getting late… I'll keep watch while you rest.";
      else msg = `Welcome back! Day ${Math.ceil(daysSince(this.state.bornAt))} together 💛`;
      setTimeout(() => this.showBubble(msg), 2000);
    },

    // ── XP & Leveling ──────────────────────────────────────────────────────

    addXP(amount) {
      if (!this.state.hatchedAt) return;
      this.state.xp += amount;
      const newLevel = Math.min(MAX_LEVEL, Math.floor(this.state.xp / XP_PER_LEVEL) + 1);
      if (newLevel > this.state.level) {
        this.state.level = newLevel;
        this.onLevelUp();
      }
      saveCompanion(this.state);
      this.renderHUD();
    },

    onLevelUp() {
      const lvl = this.state.level;
      if (lvl >= 15 && this.state.form === 'sprite2') {
        this.state.form = 'sprite3';
        this.showBubble(`🌟 I evolved! I feel so powerful now!`);
      } else if (lvl >= 5 && this.state.form === 'sprite1') {
        this.state.form = 'sprite2';
        this.showBubble(`✨ I\'m growing! Look at me!`);
      } else {
        this.showBubble(`Level ${lvl}! Getting stronger every day.`);
      }
    },

    // ── Event Handling ─────────────────────────────────────────────────────

    handleEvent(type, data) {
      data = data || {};
      switch (type) {
        case 'claw_pull':
          this.state.traits.clawPulls = (this.state.traits.clawPulls || 0) + 1;
          this.addXP(2);
          this.state.mood = data.result === 'win' ? 'excited' : 'curious';
          if (data.result === 'win') {
            this.showBubble("YES!! That's a rare one! I knew it! 🎉");
          } else {
            const pity = data.pity || this.state.traits.clawPulls;
            this.showBubble(`So close… We're at ${pity} now. Keep going!`);
          }
          break;

        case 'grail_found':
          this.state.traits.grailsSpotted = (this.state.traits.grailsSpotted || 0) + 1;
          this.addXP(5);
          this.state.mood = 'excited';
          const card = data.card || 'that card';
          const pct = data.pct ? ` ${data.pct}%` : '';
          this.showBubble(`🏆 Oh! ${card} is${pct} under market! You need this!`);
          break;

        case 'floor_visit':
          this.state.traits.floorsVisited = (this.state.traits.floorsVisited || 0) + 1;
          this.addXP(1);
          this.state.mood = 'happy';
          const floor = (data.floor || '').toLowerCase();
          const lines = FLOOR_LINES[floor] || FLOOR_LINES.default;
          this.showBubble(pick(lines));
          break;

        case 'deal_alert':
          this.addXP(10);
          this.state.traits.dealsActed = (this.state.traits.dealsActed || 0) + 1;
          this.state.mood = 'excited';
          this.showBubble(`💰 Found a deal! Check your alerts!`);
          break;
      }
      saveCompanion(this.state);
      this.renderHUD();
    },

    // ── Idle Loop ──────────────────────────────────────────────────────────

    startIdleLoop() {
      setInterval(() => {
        const path = this.state.evolutionPath || 'egg';
        const quips = IDLE_QUIPS[path] || IDLE_QUIPS.egg;
        this.showBubble(pick(quips));
        this.updateMood();
        this.renderHUD();
      }, IDLE_BUBBLE_INTERVAL);
    },

    // ── Speech Bubble ──────────────────────────────────────────────────────

    showBubble(text) {
      const bubble = document.getElementById('companion-bubble');
      if (!bubble) return;
      if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);

      bubble.textContent = text;
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0)';

      this.bubbleTimeout = setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(-8px)';
      }, 4000);
    },

    // ── HUD Building ───────────────────────────────────────────────────────

    buildHUD() {
      if (document.getElementById('companion-hud')) return;

      const style = document.createElement('style');
      style.textContent = `
        #companion-hud {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 80px;
          z-index: 9000;
          user-select: none;
          cursor: grab;
        }
        #companion-hud:active { cursor: grabbing; }
        #companion-panel {
          width: 80px;
          height: 100px;
          background: rgba(10,10,20,0.85);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 8px;
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: border-color 0.2s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        #companion-panel:hover { border-color: rgba(255,255,255,0.35); }
        #companion-canvas { display: block; margin-bottom: 2px; }
        #companion-label {
          font-size: 9px;
          color: rgba(255,255,255,0.8);
          font-family: monospace;
          text-align: center;
          line-height: 1.3;
        }
        #companion-mood {
          font-size: 11px;
          line-height: 1;
        }
        #companion-bubble {
          position: absolute;
          bottom: 108px;
          right: 0;
          width: 160px;
          background: rgba(15,15,30,0.95);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          padding: 7px 10px;
          font-size: 10px;
          color: #fff;
          font-family: monospace;
          line-height: 1.4;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.4s, transform 0.4s;
          pointer-events: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.6);
        }
        #companion-bubble::after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 28px;
          width: 10px;
          height: 10px;
          background: rgba(15,15,30,0.95);
          border-right: 1px solid rgba(255,255,255,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.2);
          transform: rotate(45deg);
        }

        /* Modal */
        #companion-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        #companion-modal-overlay.open {
          opacity: 1;
          pointer-events: all;
        }
        #companion-modal {
          background: #0d0d1a;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          padding: 24px;
          width: 320px;
          max-height: 90vh;
          overflow-y: auto;
          color: #fff;
          font-family: monospace;
          box-shadow: 0 8px 40px rgba(0,0,0,0.8);
          transform: scale(0.95);
          transition: transform 0.3s;
        }
        #companion-modal-overlay.open #companion-modal { transform: scale(1); }
        .cm-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .cm-title { font-size: 18px; font-weight: bold; }
        .cm-sub { font-size: 11px; color: rgba(255,255,255,0.5); }
        .cm-section { margin-bottom: 14px; }
        .cm-section-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
        }
        .cm-bar-wrap {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          height: 6px;
          overflow: hidden;
        }
        .cm-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s;
        }
        .cm-stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 3px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cm-btn {
          display: block;
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 8px;
          text-align: center;
        }
        .cm-btn:hover { background: rgba(255,255,255,0.12); }
        .cm-close {
          float: right;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .cm-close:hover { color: #fff; }
      `;
      document.head.appendChild(style);

      const hud = document.createElement('div');
      hud.id = 'companion-hud';
      hud.innerHTML = `
        <div id="companion-bubble"></div>
        <div id="companion-panel">
          <canvas id="companion-canvas" width="64" height="60"></canvas>
          <div id="companion-label">
            <span id="companion-mood"></span><br>
            <span id="companion-name-label"></span>
          </div>
        </div>
      `;
      document.body.appendChild(hud);

      // Click to open modal
      document.getElementById('companion-panel').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal();
      });

      // Drag
      this.makeDraggable(hud);

      // Start animation loop
      this.startAnimation();
    },

    makeDraggable(el) {
      let ox, oy, startX, startY, dragging = false;

      el.addEventListener('mousedown', (e) => {
        if (e.target.id === 'companion-panel' || e.target.closest('#companion-panel')) {
          dragging = false; // panel click = modal, not drag start
        }
        ox = el.offsetLeft !== undefined ? el.offsetLeft : 0;
        oy = el.offsetTop !== undefined ? el.offsetTop : 0;
        startX = e.clientX;
        startY = e.clientY;

        const move = (e2) => {
          const dx = e2.clientX - startX;
          const dy = e2.clientY - startY;
          if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true;
          if (!dragging) return;
          const right = window.innerWidth - (e2.clientX + (80 - (e2.clientX - startX + ox)));
          const bottom = window.innerHeight - (e2.clientY + (100 - (e2.clientY - startY + oy)));
          el.style.right = Math.max(0, right) + 'px';
          el.style.bottom = Math.max(0, bottom) + 'px';
          el.style.left = 'auto';
          el.style.top = 'auto';
        };

        const up = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
        };

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    },

    // ── Animation Loop ─────────────────────────────────────────────────────

    startAnimation() {
      let lastBob = 0;
      let bobUp = true;

      const tick = (ts) => {
        if (ts - lastBob > 500) {
          this.bobOffset += bobUp ? 1 : -1;
          if (this.bobOffset >= 2) bobUp = false;
          if (this.bobOffset <= 0) bobUp = true;
          lastBob = ts;
          this.renderHUD();
        }
        this.animFrame = requestAnimationFrame(tick);
      };

      this.animFrame = requestAnimationFrame(tick);
    },

    renderHUD() {
      const canvas = document.getElementById('companion-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const key = getSpriteKey(this.state);
      const scale = 4;

      let offsetX = (canvas.width - 8 * scale) / 2;
      let offsetY = (canvas.height - 12 * scale) / 2 + this.bobOffset;

      // Shake for egg animation
      if (this.shakingEgg) {
        const shake = [-1, 1, -2, 2][this.shakePhase % 4];
        offsetX += shake;
      }

      drawSprite(ctx, key, scale, Math.round(offsetX), Math.round(offsetY));

      // Labels
      const nameEl = document.getElementById('companion-name-label');
      const moodEl = document.getElementById('companion-mood');
      if (nameEl) {
        if (this.state.hatchedAt) {
          nameEl.textContent = `${this.state.name || '?'} Lv${this.state.level}`;
        } else {
          nameEl.textContent = '???';
        }
      }
      if (moodEl) {
        moodEl.textContent = MOOD_EMOJI[this.state.mood] || '🤔';
      }
    },

    // ── Modal ──────────────────────────────────────────────────────────────

    buildModal() {
      if (document.getElementById('companion-modal-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'companion-modal-overlay';
      overlay.innerHTML = `
        <div id="companion-modal">
          <button class="cm-close" id="companion-close">✕</button>
          <div class="cm-header">
            <canvas id="companion-modal-canvas" width="96" height="108"></canvas>
            <div>
              <div class="cm-title" id="cm-name">???</div>
              <div class="cm-sub" id="cm-path"></div>
              <div class="cm-sub" id="cm-day"></div>
              <div class="cm-sub" id="cm-mood-label"></div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">Level & XP</div>
            <div class="cm-stat-row"><span id="cm-level-txt"></span><span id="cm-xp-txt"></span></div>
            <div class="cm-bar-wrap" style="margin-top:4px">
              <div class="cm-bar-fill" id="cm-xp-bar" style="background:#5b8ee6"></div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">Evolution</div>
            <div class="cm-stat-row"><span id="cm-form-txt"></span><span id="cm-form-next"></span></div>
            <div class="cm-bar-wrap" style="margin-top:4px">
              <div class="cm-bar-fill" id="cm-form-bar" style="background:#ffd700"></div>
            </div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">Traits</div>
            <div class="cm-stat-row"><span>🏛 Floors visited</span><span id="cm-floors"></span></div>
            <div class="cm-stat-row"><span>🎰 Claw pulls</span><span id="cm-claws"></span></div>
            <div class="cm-stat-row"><span>🏆 Grails spotted</span><span id="cm-grails"></span></div>
            <div class="cm-stat-row"><span>💰 Deals acted on</span><span id="cm-deals"></span></div>
          </div>

          <div class="cm-section">
            <div class="cm-section-title">Mood</div>
            <div style="font-size:12px" id="cm-mood-desc"></div>
          </div>

          <button class="cm-btn" id="cm-print-btn">🖨 Print your Companion</button>
          <button class="cm-btn" id="cm-close-btn" style="margin-top:4px">Close</button>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
      document.getElementById('companion-close').addEventListener('click', () => this.closeModal());
      document.getElementById('cm-close-btn').addEventListener('click', () => this.closeModal());
      document.getElementById('cm-print-btn').addEventListener('click', () => {
        window.open(`/companion-print.html?id=${this.state.id}`, '_blank');
      });
    },

    openModal() {
      const s = this.state;
      const overlay = document.getElementById('companion-modal-overlay');
      if (!overlay) return;

      // Render large sprite
      const mc = document.getElementById('companion-modal-canvas');
      if (mc) {
        const ctx = mc.getContext('2d');
        ctx.clearRect(0, 0, mc.width, mc.height);
        drawSprite(ctx, getSpriteKey(s), 8, (mc.width - 64) / 2, (mc.height - 96) / 2);
      }

      // Populate fields
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

      setText('cm-name', s.hatchedAt ? (s.name || '???') : 'Waiting to hatch…');
      setText('cm-path', s.evolutionPath ? `Path: ${s.evolutionPath.charAt(0).toUpperCase() + s.evolutionPath.slice(1)}` : 'Path: ???');
      setText('cm-day', s.hatchedAt ? `Day ${Math.ceil(daysSince(s.bornAt))} of your journey` : `Hatches in ${Math.ceil((HATCH_DELAY - (Date.now() - s.bornAt)) / 3600000)}h`);
      setText('cm-mood-label', MOOD_EMOJI[s.mood] + ' ' + s.mood);

      const xpInLevel = s.xp % XP_PER_LEVEL;
      const xpPct = (xpInLevel / XP_PER_LEVEL) * 100;
      setText('cm-level-txt', `Level ${s.level}`);
      setText('cm-xp-txt', `${xpInLevel} / ${XP_PER_LEVEL} XP`);
      const xpBar = document.getElementById('cm-xp-bar');
      if (xpBar) xpBar.style.width = xpPct + '%';

      // Evolution progress
      let formLabel = 'Egg', nextFormAt = 'Hatch first';
      let formPct = 0;
      if (s.hatchedAt) {
        if (s.form === 'sprite1') {
          formLabel = 'Baby form';
          nextFormAt = `Level 5 → Teen (${Math.max(0, 5 - s.level)} levels away)`;
          formPct = (s.level / 5) * 100;
        } else if (s.form === 'sprite2') {
          formLabel = 'Teen form';
          nextFormAt = `Level 15 → Adult (${Math.max(0, 15 - s.level)} levels away)`;
          formPct = ((s.level - 5) / 10) * 100;
        } else if (s.form === 'sprite3') {
          formLabel = 'Adult form (max)';
          nextFormAt = 'Fully evolved!';
          formPct = 100;
        }
      }
      setText('cm-form-txt', formLabel);
      setText('cm-form-next', nextFormAt);
      const fBar = document.getElementById('cm-form-bar');
      if (fBar) fBar.style.width = Math.min(100, formPct) + '%';

      // Traits
      setText('cm-floors', s.traits.floorsVisited || 0);
      setText('cm-claws', s.traits.clawPulls || 0);
      setText('cm-grails', s.traits.grailsSpotted || 0);
      setText('cm-deals', s.traits.dealsActed || 0);

      setText('cm-mood-desc', MOOD_DESC[s.mood] || '');

      overlay.classList.add('open');
    },

    closeModal() {
      const overlay = document.getElementById('companion-modal-overlay');
      if (overlay) overlay.classList.remove('open');
    },
  };

  // ─── Boot ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Companion.init());
  } else {
    Companion.init();
  }

  // Expose for debug
  if (DEBUG) window._companion = Companion;

})();
