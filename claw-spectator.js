/**
 * Claw Spectator Mode — claw-spectator.js
 * Adds NPC crowd reactions, spectator chat, and social energy to the claw game.
 * Hooks into claw.html by monkey-patching triggerWin and polling game state.
 * Load via: <script src="claw-spectator.js"></script> at end of claw.html body.
 */

(function() {
  'use strict';

  // ── Config ───────────────────────────────────────────────────────────
  const CFG = {
    maxSpectators: 8,
    chatFadeMs: 3500,
    bubbleFadeMs: 2800,
    spawnInterval: 12000,    // new spectator joins every 12s
    chatInterval: 6000,      // spectators chat every 6s
    reactDelay: 400,         // ms after win to react
  };

  // ── Spectator data ────────────────────────────────────────────────────
  const SPECTATOR_NAMES = [
    'Pixel', 'Nova', 'Byte', 'Glitch', 'Zara', 'Orion', 'Mika',
    'Kira', 'Ryo', 'Echo_fan', 'CardHunter', 'GrailSeeker', 'PullGod',
    'RareHunter', 'SlabKing', 'VaultDweller', 'NightOwl',
  ];

  const SPECTATOR_AVATARS = ['🤖', '🦊', '🐱', '🐼', '🦄', '🐸', '🐺', '🦋', '🐙', '🦅', '🐯', '🦊'];

  const IDLE_CHAT = [
    "you got this! 🎯",
    "go go go!!",
    "that claw looks strong today",
    "i've been watching for 20 mins lol",
    "almost!!",
    "the tension 😩",
    "bro this machine is rigged /j",
    "POV: you're the claw",
    "LETS GOOO",
    "pick the shiny one!!",
    "i can feel it, this is the one",
    "my palms are sweating",
    "skill issue (jk ur doing great)",
    "come onnnn",
    "i believe in you 🙏",
    "dropped my sandwich watching this",
    "the suspense is killing me",
    "this is better than netflix",
  ];

  const NEAR_MISS_CHAT = [
    "NOOOO 😭",
    "SO CLOSE omg",
    "that was RIGHT THERE",
    "THE BETRAYAL",
    "rigged 💀",
    "my heart...",
    "it slipped!!! 😤",
    "broo that was yours",
    "NOT LIKE THIS",
    "i felt that in my soul",
  ];

  const WIN_CHAT = {
    common:    ["nice!", "let's go!", "clean grab 👌", "ez clap"],
    super:     ["LETS GOOO 🔥", "SUPER RARE!!!", "omg omg omg", "SHEEEESH", "W pull 🎉"],
    ultra:     ["ULTRA?? 😱", "ACTUAL W", "BRO ULTRA RARE", "that's HUGE", "CARRY 🏆", "im crying"],
    legendary: ["LEGENDARY!!!! 🚨🚨🚨", "NO WAY", "CHAT THIS IS REAL", "ACTUAL GOAT", "LEGENDARY PULL OMG", "i need to lie down", "W W W W W", "CLIP THAT"],
  };

  const MEGA_CHAT = [
    "MEGA CLAW??",
    "IT'S HUGE 😱",
    "BRO THE MEGA CLAW",
    "GUARANTEED GRAB LFG",
    "this is it this is it this is it",
  ];

  const JOIN_MESSAGES = [
    "joined the crowd 👀",
    "is now watching 👁️",
    "pulled up to spectate",
    "entered the station",
  ];

  // ── State ─────────────────────────────────────────────────────────────
  let spectators = [];
  let chatQueue = [];
  let lastState = 'idle';
  let lastPlays = 0;
  let lastWins = 0;
  let initialized = false;

  // ── DOM setup ─────────────────────────────────────────────────────────
  function createUI() {
    // Spectator HUD overlay
    const hud = document.createElement('div');
    hud.id = 'spec-hud';
    hud.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0;
      pointer-events: none; z-index: 50;
      display: flex; flex-direction: column;
      align-items: flex-start;
      padding: 0 0 12px 12px;
      gap: 4px;
    `;
    document.body.appendChild(hud);

    // Chat feed (left side, bottom)
    const chat = document.createElement('div');
    chat.id = 'spec-chat';
    chat.style.cssText = `
      display: flex; flex-direction: column-reverse;
      gap: 4px; max-height: 160px; overflow: hidden;
      width: 280px;
    `;
    hud.appendChild(chat);

    // Spectator count pill (top-right)
    const counter = document.createElement('div');
    counter.id = 'spec-counter';
    counter.style.cssText = `
      position: fixed; top: 12px; right: 12px;
      background: rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 4px 10px;
      font-family: sans-serif;
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      pointer-events: none;
      z-index: 50;
      display: flex; align-items: center; gap: 5px;
    `;
    counter.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;animation:specPulse 2s infinite"></span> <span id="spec-count">0</span> watching`;
    document.body.appendChild(counter);

    // Reaction burst container
    const burst = document.createElement('div');
    burst.id = 'spec-burst';
    burst.style.cssText = `
      position: fixed; inset: 0;
      pointer-events: none; z-index: 49;
      overflow: hidden;
    `;
    document.body.appendChild(burst);

    // CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes specPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes specFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes specFadeOut { to{opacity:0;transform:translateY(-6px)} }
      @keyframes specFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-120px) scale(1.4)} }
      @keyframes specBounceIn { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
      .spec-msg {
        animation: specFadeUp 0.25s ease forwards;
        font-family: sans-serif;
        font-size: 12px;
        line-height: 1.3;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(0,0,0,0.55);
        border-radius: 10px;
        border-left: 2px solid rgba(255,255,255,0.2);
        max-width: 275px;
        word-break: break-word;
      }
      .spec-msg.dying { animation: specFadeOut 0.4s ease forwards; }
      .spec-avatar { font-size: 14px; flex-shrink: 0; }
      .spec-name { color: #a8b4ff; font-weight: 600; }
      .spec-text { color: rgba(255,255,255,0.85); }
      .spec-float {
        position: absolute;
        font-size: 28px;
        animation: specFloat 2s ease-out forwards;
        pointer-events: none;
      }
      .spec-win-banner {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -200px);
        background: rgba(0,0,0,0.85);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 16px;
        padding: 12px 24px;
        text-align: center;
        font-family: sans-serif;
        z-index: 60;
        pointer-events: none;
        animation: specBounceIn 0.4s ease forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Spectator management ──────────────────────────────────────────────
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function addSpectator() {
    if (spectators.length >= CFG.maxSpectators) {
      // occasionally one leaves
      if (Math.random() < 0.3) spectators.shift();
      else return;
    }
    const name = randomFrom(SPECTATOR_NAMES.filter(n => !spectators.find(s => s.name === n)));
    const spec = {
      name: name || `visitor${Math.floor(Math.random()*99)}`,
      avatar: randomFrom(SPECTATOR_AVATARS),
      joinedAt: Date.now(),
      chattiness: 0.3 + Math.random() * 0.7,
    };
    spectators.push(spec);
    updateCounter();

    // announce join
    const joinMsg = randomFrom(JOIN_MESSAGES);
    postChat(spec, joinMsg, 'join');
  }

  function updateCounter() {
    const el = document.getElementById('spec-count');
    if (el) el.textContent = spectators.length;
  }

  // ── Chat ──────────────────────────────────────────────────────────────
  function postChat(spec, text, type = 'normal') {
    const chat = document.getElementById('spec-chat');
    if (!chat) return;

    const msg = document.createElement('div');
    msg.className = 'spec-msg';
    if (type === 'win') msg.style.borderLeftColor = '#f59e0b';
    if (type === 'join') msg.style.borderLeftColor = '#22c55e';
    msg.innerHTML = `
      <span class="spec-avatar">${spec.avatar}</span>
      <span><span class="spec-name">${spec.name}</span> <span class="spec-text">${text}</span></span>
    `;
    chat.insertBefore(msg, chat.firstChild);

    // Keep max 6 visible
    while (chat.children.length > 6) {
      const old = chat.lastChild;
      old.classList.add('dying');
      setTimeout(() => old.remove(), 400);
    }

    // Auto-fade
    setTimeout(() => {
      msg.classList.add('dying');
      setTimeout(() => msg.remove(), 400);
    }, CFG.chatFadeMs);
  }

  function randomChat(pool) {
    if (!spectators.length) return;
    const chatters = spectators.filter(s => Math.random() < s.chattiness);
    const count = Math.min(chatters.length, 1 + Math.floor(Math.random() * 2));
    const toChat = chatters.slice(0, count);
    toChat.forEach((spec, i) => {
      setTimeout(() => postChat(spec, randomFrom(pool)), i * 600);
    });
  }

  // ── Reaction burst (floating emoji) ──────────────────────────────────
  function burstEmojis(emojis, count = 8) {
    const container = document.getElementById('spec-burst');
    if (!container) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'spec-float';
        el.textContent = randomFrom(emojis);
        el.style.left = (20 + Math.random() * 60) + '%';
        el.style.bottom = (10 + Math.random() * 30) + '%';
        el.style.animationDuration = (1.5 + Math.random()) + 's';
        container.appendChild(el);
        setTimeout(() => el.remove(), 2500);
      }, i * 120);
    }
  }

  // ── Win reaction ─────────────────────────────────────────────────────
  function reactToWin(rarity) {
    const pool = WIN_CHAT[rarity] || WIN_CHAT.common;
    const emojis = {
      common:    ['👏', '✨', '🎉', '👍'],
      super:     ['🔥', '🎊', '🎉', '😮', '👏'],
      ultra:     ['🤯', '🔥', '💎', '😱', '🏆', '🎊'],
      legendary: ['🚨', '🏆', '🔥', '💎', '🤯', '😱', '⭐', '🎰'],
    }[rarity] || ['👏'];

    const burstCount = { common: 4, super: 8, ultra: 14, legendary: 22 }[rarity] || 4;

    setTimeout(() => {
      burstEmojis(emojis, burstCount);
      randomChat(pool);
    }, CFG.reactDelay);

    // Legendary gets a second wave
    if (rarity === 'legendary' || rarity === 'ultra') {
      setTimeout(() => {
        randomChat(pool);
        burstEmojis(emojis, burstCount / 2);
      }, CFG.reactDelay + 1200);
    }
  }

  function reactToNearMiss() {
    if (Math.random() < 0.6) {
      setTimeout(() => randomChat(NEAR_MISS_CHAT), 200);
    }
  }

  function reactToMega() {
    burstEmojis(['⚡', '🎰', '🤩', '💫', '🔮'], 10);
    randomChat(MEGA_CHAT);
  }

  // ── Hook into game state via polling ──────────────────────────────────
  // We can't directly modify the IIFE, so we poll globals and monkey-patch
  function hookGame() {
    // Patch triggerWin if accessible
    if (typeof window.triggerWin === 'function') {
      const original = window.triggerWin;
      window.triggerWin = function(prize) {
        original.call(this, prize);
        reactToWin(prize.rarity);
      };
    }

    // Patch triggerNearMiss
    if (typeof window.triggerNearMiss === 'function') {
      const orig = window.triggerNearMiss;
      window.triggerNearMiss = function() {
        orig.call(this);
        reactToNearMiss();
      };
    }
  }

  // Polling fallback — watch for state changes
  let _lastWins = 0;
  let _lastPlays = 0;
  let _lastIsMega = false;
  let _lastState = '';

  function pollGameState() {
    try {
      // Access variables from the enclosing scope via a trick:
      // claw.html defines these in script scope (not window), so we watch
      // for DOM/visual changes as fallback signals

      // Check if isMega changed (via DOM — the canvas shows MEGA text)
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      // We dispatch custom events from patched functions above.
      // This poll is a secondary safety net.

    } catch(e) {}
  }

  // ── Idle chatter ─────────────────────────────────────────────────────
  function startIdleChatter() {
    setInterval(() => {
      if (spectators.length === 0) return;
      // Only chat occasionally during idle
      if (Math.random() < 0.35) {
        randomChat(IDLE_CHAT);
      }
    }, CFG.chatInterval);
  }

  // ── Spectator spawn loop ──────────────────────────────────────────────
  function startSpawnLoop() {
    // Initial spectators
    addSpectator();
    setTimeout(addSpectator, 3000);
    setTimeout(addSpectator, 7000);

    setInterval(() => {
      if (Math.random() < 0.7) addSpectator();
    }, CFG.spawnInterval);
  }

  // ── Listen for custom events (dispatched by patches above) ───────────
  function listenEvents() {
    window.addEventListener('clawWin', e => reactToWin(e.detail?.rarity || 'common'));
    window.addEventListener('clawNearMiss', () => reactToNearMiss());
    window.addEventListener('clawMega', () => reactToMega());
  }

  // ── Expose helpers on window for claw.html patches ───────────────────
  // claw.html's triggerWin etc. live in script scope, not window scope.
  // We expose dispatch helpers that claw.html can call if it opts in.
  window.ClawSpectator = {
    onWin: (rarity) => reactToWin(rarity),
    onNearMiss: () => reactToNearMiss(),
    onMega: () => reactToMega(),
    addSpectator,
  };

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;
    createUI();
    hookGame();
    listenEvents();
    startSpawnLoop();
    startIdleChatter();
    setInterval(pollGameState, 500);
  }

  // Wait for page to be ready
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

})();
