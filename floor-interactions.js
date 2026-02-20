/**
 * floor-interactions.js
 * Echo's Vault — Every environment interactive, explorable, and FUN.
 * Patches window.interact to add rich behavior for all floors.
 */
(function () {
  'use strict';

  /* ─── SAFE HELPERS ─────────────────────────────────────────────────── */
  function S()   { return window.S || window._S || {}; }
  function LS()  { return window.LS || window._LS || { get:(k,d)=>d, set:()=>{} }; }
  function lsGet(k, d) { return LS().get(k, d); }
  function lsSet(k, v) { return LS().set(k, v); }

  function thought(t, dur) {
    if (typeof showThought === 'function') showThought(t, dur || 6);
  }
  function notif(t) {
    if (typeof showNotification === 'function') showNotification(t);
  }
  function earn(n, r) {
    if (window.Coins && typeof window.Coins.earn === 'function') window.Coins.earn(n, r || 'interaction');
  }
  function canAfford(n) {
    return window.Coins ? window.Coins.canAfford(n) : false;
  }
  function spend(n, r) {
    return window.Coins ? window.Coins.spend(n, r || 'interaction') : false;
  }
  function companion(type, data) {
    if (typeof window.companionEvent === 'function') window.companionEvent(type, data || {});
  }
  function currentFloor() { return S().floor || 1; }
  function currentHour() { return new Date().getHours(); }

  function popup(html) {
    if (typeof createPopup === 'function') return createPopup(html);
    // Fallback
    const ov = document.createElement('div');
    ov.className = 'popup-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center';
    const p = document.createElement('div');
    p.className = 'popup';
    p.style.cssText = 'background:#1a1a2e;border:2px solid #ffd080;border-radius:12px;padding:20px;max-width:360px;width:90%;color:#fff;max-height:80vh;overflow-y:auto;position:relative';
    p.innerHTML = '<span class="close-btn" style="position:absolute;top:8px;right:12px;cursor:pointer;font-size:18px;color:#888">&times;</span>' + html;
    p.querySelector('.close-btn').onclick = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.appendChild(p);
    document.body.appendChild(ov);
    return { ov, p };
  }

  function sessionStart() {
    if (!window._FI_sessionStart) window._FI_sessionStart = Date.now();
    return window._FI_sessionStart;
  }

  function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  /* ─── ACHIEVEMENT HELPER ───────────────────────────────────────────── */
  function grantAchievement(id, label) {
    const list = lsGet('fi_achievements', []);
    if (!list.includes(id)) {
      list.push(id);
      lsSet('fi_achievements', list);
      notif('🏆 ' + label);
      earn(10, 'achievement_' + id);
      companion('achievement', { label });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 1 — Echo's Quarters
   * ══════════════════════════════════════════════════════════════════════ */

  /* BED — nap mini-game */
  function handleBed() {
    const h = currentHour();
    const timeMsg = h < 6 ? "Late-night nap energy... 🌙"
                  : h < 12 ? "Morning snooze is the best snooze ☀️"
                  : h < 18 ? "Afternoon power nap? Absolutely. ⚡"
                  : "Evening wind-down... you deserve it 🌆";

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9990;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;opacity:0;transition:opacity 1s';
    overlay.innerHTML = `
      <div id="nap-msg" style="font-size:24px;margin-bottom:16px">😴 Drifting off...</div>
      <div id="nap-stars" style="font-size:32px;letter-spacing:8px;opacity:0;transition:opacity 1s">✨ 💫 ⭐ 🌙 ✨</div>
      <div id="nap-prompt" style="margin-top:24px;font-size:13px;color:#ffd080;display:none">SPACE / TAP to wake up</div>`;
    document.body.appendChild(overlay);

    // Prevent movement
    const gs = S();
    if (gs.echo) gs.echo.sitting = true;

    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    let asleep = false;
    let rewarded = false;
    const onSleep = () => {
      if (asleep || rewarded) return;
      asleep = true;
      overlay.querySelector('#nap-stars').style.opacity = '1';
      overlay.querySelector('#nap-prompt').style.display = 'block';
      overlay.querySelector('#nap-msg').textContent = '💤 Zzzz...';
    };
    const onWake = () => {
      if (!asleep || rewarded) return;
      rewarded = true;
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        if (gs.echo) gs.echo.sitting = false;
        earn(5, 'nap_bonus');
        thought('😊 Well rested! ' + timeMsg);
        notif('💤 Well-Rested Bonus! +5◈');
        companion('happy', { reason: 'nap' });
      }, 1000);
    };

    setTimeout(onSleep, 1500);
    setTimeout(() => { if (asleep && !rewarded) onWake(); }, 4500);

    const onKey = e => { if (e.code === 'Space') { onSleep(); setTimeout(onWake, 500); document.removeEventListener('keydown', onKey); } };
    overlay.addEventListener('click', () => { onSleep(); setTimeout(onWake, 500); });
    document.addEventListener('keydown', onKey);
  }

  /* FIREPLACE — cycle states */
  const FIRE_STATES = [
    { label: 'Kindling',     icon: '🪵', thought: 'Just getting it started...', glow: 'rgba(120,60,0,0.15)' },
    { label: 'Small fire',   icon: '🔥', thought: 'A modest flame. Cozy.', glow: 'rgba(200,80,0,0.2)' },
    { label: 'Roaring fire', icon: '🔥🔥', thought: 'Now THAT\'S a fire! So warm!', glow: 'rgba(255,120,0,0.3)' },
    { label: 'Dying embers', icon: '🌫️', thought: 'Winding down... still warm.', glow: 'rgba(80,30,0,0.1)' },
    { label: 'Out',          icon: '💨', thought: 'Cold hearth. Time to rekindle.', glow: null },
  ];
  function handleFireplace() {
    let idx = lsGet('fi_fireplace', 0);
    idx = (idx + 1) % FIRE_STATES.length;
    lsSet('fi_fireplace', idx);
    const st = FIRE_STATES[idx];
    thought(st.icon + ' ' + st.thought);
    notif('🔥 Fireplace: ' + st.label);
    if (st.glow) {
      const glow = document.createElement('div');
      glow.style.cssText = `position:fixed;inset:0;background:${st.glow};pointer-events:none;z-index:100;opacity:1;transition:opacity 3s`;
      document.body.appendChild(glow);
      setTimeout(() => { glow.style.opacity = '0'; setTimeout(() => glow.remove(), 3000); }, 500);
    }
    companion('react', { msg: st.label === 'Roaring fire' ? 'warm! 🔥' : 'fire cycling' });
  }

  /* NEON — cycle messages */
  const NEON_MSGS = [
    'DREAM big ✨',
    'STAY WEIRD 🌀',
    'NO SLEEP TILL LAUNCH 🚀',
    'BE THE PROTAGONIST 🎮',
    'YOU MADE IT 🏆',
  ];
  function handleNeon() {
    let idx = lsGet('fi_neon', 0);
    idx = (idx + 1) % NEON_MSGS.length;
    lsSet('fi_neon', idx);
    thought('🌟 ' + NEON_MSGS[idx]);
    companion('react', { msg: NEON_MSGS[idx] });
  }

  /* SERVER — real stats readout */
  function handleServer() {
    const elapsed = fmtElapsed(Date.now() - sessionStart());
    const jsFiles = document.querySelectorAll('script[src]').length;
    const coins = window.Coins ? window.Coins.count : 0;
    const floor = currentFloor();
    popup(`<h3 style="color:#00ff88;font-family:monospace">🖥️ SERVER READOUT</h3>
<pre style="font-size:11px;color:#00ff88;font-family:monospace;line-height:1.8;white-space:pre-wrap">
STATION CORE v13.0
━━━━━━━━━━━━━━━━━━━━━━
FLOORS ONLINE  : 12
OBJECTS LOADED : ~291
JS MODULES     : ${jsFiles}
SESSION UPTIME : ${elapsed}
CURRENT FLOOR  : F${floor}
VISITOR COINS  : ${coins}◈
VIBES          : 100%
SYSTEM STATUS  : OPTIMAL ✅
━━━━━━━━━━━━━━━━━━━━━━
"All systems nominal.
 Echo's vibes detected.
 Station is ALIVE."</pre>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">Close terminal</button>`);
  }

  /* TV — expand channels */
  function expandTV() {
    if (typeof TV === 'undefined') return;
    const extra = [
      '🎮 Gaming Channel — tournament highlights',
      '🌌 Space Documentary — black holes explained',
      '📈 Card Market Watch — today\'s top grails',
      '🎵 Lo-fi Radio — beats to study/float to',
      '🎬 Echo\'s Cinema Guide — tonight\'s screening',
      '🤖 AI News Now — robots say the darndest things',
      '🌿 Nature Cam — biodome wildlife 24/7',
      '🎉 Station Parties — highlights reel',
    ];
    extra.forEach(ch => {
      if (!TV.channels.includes(ch)) TV.channels.push(ch);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 2 — Observatory
   * ══════════════════════════════════════════════════════════════════════ */

  const STAR_DATA = [
    { id: 'sirius',      name: 'Sirius',        emoji: '⭐', lore: 'Brightest star in our sky — a white dwarf with a secret companion.', fact: 'Sirius is actually a binary system — Sirius A and the tiny Sirius B.' },
    { id: 'betelgeuse',  name: 'Betelgeuse',    emoji: '🔴', lore: 'A red supergiant on the edge of explosion. It might have already gone nova.', fact: 'Betelgeuse is so large that if it replaced our Sun, it would engulf Jupiter.' },
    { id: 'vega',        name: 'Vega',          emoji: '💎', lore: 'Once Earth\'s north star, once again it will be — in 26,000 years.', fact: 'Vega spins so fast that it\'s noticeably flattened at the poles.' },
    { id: 'polaris',     name: 'Polaris',       emoji: '🧭', lore: 'The constant wanderer\'s guide. Sailors have trusted it for millennia.', fact: 'Polaris is a Cepheid variable — it actually pulses in brightness.' },
    { id: 'andromeda',   name: 'Andromeda',     emoji: '🌌', lore: 'Our nearest galactic neighbor, rushing toward us at 110km/s.', fact: 'In 4.5 billion years, Andromeda and the Milky Way will collide and merge.' },
    { id: 'orion',       name: 'Orion\'s Belt', emoji: '⚔️', lore: 'Three stars aligned — Mintaka, Alnilam, Alnitak — pointing to Sirius below.', fact: 'The three stars of Orion\'s Belt are 800–1,300 light-years away, yet look equal.' },
    { id: 'pleiades',    name: 'Pleiades',      emoji: '✨', lore: 'The Seven Sisters — though most see only six. One hides in shame, the myth says.', fact: 'The Pleiades cluster is only 100 million years old — stellar infants.' },
    { id: 'proxima',     name: 'Proxima Centauri', emoji: '🔭', lore: 'Our closest stellar neighbor at 4.24 light-years. It may harbor a rocky world.', fact: 'Even at light speed, reaching Proxima Centauri would take 4.24 years.' },
  ];

  function handleStarmap() {
    const discovered = lsGet('fi_stars_found', []);
    let html = '<h3>🌠 Star Map — Echo\'s Observatory</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">';
    STAR_DATA.forEach(star => {
      const found = discovered.includes(star.id);
      html += `<div class="drink-btn" data-star="${star.id}" style="text-align:left;padding:8px;border-radius:8px;background:${found ? '#1a2a1a' : '#1a1a2e'};border:1px solid ${found ? '#00ff88' : '#444'}">
        <div style="font-size:16px">${star.emoji} ${found ? star.name : '???'}</div>
        <div style="font-size:9px;color:#aaa;margin-top:3px">${found ? star.lore : 'Undiscovered...'}</div>
        ${found ? '' : '<div style="font-size:9px;color:#ffd080;margin-top:3px">Click to discover +1◈</div>'}
      </div>`;
    });
    html += '</div><div id="star-fact-box" style="margin-top:10px;font-size:11px;color:#00fff7;min-height:20px"></div>';
    const { p } = popup(html);
    p.querySelectorAll('[data-star]').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.star;
        const star = STAR_DATA.find(s => s.id === id);
        if (!star) return;
        const factBox = p.querySelector('#star-fact-box');
        factBox.textContent = '💡 ' + star.fact;
        if (!discovered.includes(id)) {
          discovered.push(id);
          lsSet('fi_stars_found', discovered);
          earn(1, 'star_' + id);
          notif('⭐ Discovered: ' + star.name + '! +1◈');
          el.style.border = '1px solid #00ff88';
          el.style.background = '#1a2a1a';
          el.querySelector('div').textContent = star.emoji + ' ' + star.name;
          companion('discover', { name: star.name });
          if (discovered.length >= STAR_DATA.length) grantAchievement('star_gazer', 'Star Gazer — All Stars Discovered!');
        }
      };
    });
  }

  /* TELESCOPE — deep space objects */
  const DEEP_SPACE = [
    { name: 'Pillars of Creation', desc: 'Towering columns of gas and dust — star nurseries in Eagle Nebula.' },
    { name: 'Andromeda Galaxy',    desc: 'Two trillion stars rushing toward us in a slow cosmic embrace.' },
    { name: 'Io (Jupiter Moon)',   desc: 'Most volcanically active body in the solar system — perpetually erupting.' },
    { name: 'Horsehead Nebula',    desc: 'A silhouette of darkness against a glowing hydrogen cloud.' },
    { name: 'Saturn\'s Rings',     desc: 'Billions of ice particles dancing in perfect gravitational choreography.' },
    { name: 'Crab Nebula',         desc: 'The ghost of a star that exploded in 1054 AD — still expanding today.' },
    { name: 'Titan (Saturn Moon)', desc: 'Lakes of liquid methane and an orange nitrogen sky. Alien, utterly alien.' },
    { name: 'Black Hole M87*',     desc: 'First ever photographed — a shadow cast by six billion solar masses.' },
  ];
  function handleTelescope() {
    if (typeof S !== 'undefined' && S().puzzles && !S().puzzles.constellation?.completed) {
      return false; // Let original handle it (constellation puzzle)
    }
    const obj = DEEP_SPACE[Math.floor(Math.random() * DEEP_SPACE.length)];
    popup(`<h3>🔭 Deep Space View</h3>
<div style="background:#000820;border-radius:8px;padding:16px;margin:8px 0;text-align:center">
  <div style="font-size:28px">🌌</div>
  <div style="color:#ffd080;font-size:16px;margin:8px 0">${obj.name}</div>
  <div style="color:#aaa;font-size:12px;font-style:italic">"${obj.desc}"</div>
</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">✨ Remarkable</button>`);
    companion('wonder', { target: obj.name });
    return true;
  }

  /* DOMEWINDOW — weather */
  function handleDomewindow() {
    const gs = S();
    const weather = gs.weather || {};
    const desc = weather.desc || 'mysterious';
    const icon = weather.icon || '🌍';
    const temp = weather.temp || '?';
    const moods = {
      rain: 'Berlin looks washed and reflective tonight 🌧️',
      cloud: 'Berlin hides under a grey blanket ☁️',
      snow: 'Berlin is a white painting ❄️',
      clear: 'Berlin sparkles under clear skies ☀️',
      sun: 'Berlin basks in golden light ☀️',
    };
    const key = Object.keys(moods).find(k => desc.includes(k)) || 'clear';
    thought(`${icon} From up here, ${moods[key]} (${temp})`);
    if (typeof fetchWeather === 'function') fetchWeather();
  }

  /* DEEPSPACE object */
  const CRYPTIC_MSGS = [
    'The void between stars is not empty. It listens.',
    'Signal detected: 1... 1... 0... 1... origin: unknown.',
    'You are further from home than you think.',
    'Something blinked back.',
    'A civilization rose and fell while light crossed that gap.',
    'There are patterns in the noise. You can almost see them.',
    'The signal repeats every 33.2 seconds. No one knows why.',
    'Echo... the name carries further than you intended.',
    'Are you watching the stars, or are they watching you?',
    'Your atoms were forged in a dead star. You are the universe, observing itself.',
  ];
  function handleDeepspace() {
    thought('🌌 Something is out there... listening.');
    setTimeout(() => {
      const msg = CRYPTIC_MSGS[Math.floor(Math.random() * CRYPTIC_MSGS.length)];
      thought('📡 ' + msg, 8);
      // 5% chance mystery item
      if (Math.random() < 0.05) {
        const items = lsGet('fi_mystery_items', []);
        const mysteries = ['Signal Fragment', 'Void Crystal', 'Star Dust', 'Echo Stone', 'Dark Matter Sample'];
        const item = mysteries[Math.floor(Math.random() * mysteries.length)];
        items.push(item);
        lsSet('fi_mystery_items', items);
        notif('🎁 Mystery Item found: ' + item + '!');
        companion('excited', { item });
      }
    }, 3000);
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 3 — Arcade
   * ══════════════════════════════════════════════════════════════════════ */

  const ARCADE_GAMES = ['Snake', 'Breakout', 'Space Invaders', 'Pong Classic', 'Pixel Racer'];
  const NPC_NAMES = ['ZeroX', 'PixelPete', 'NeonKira', 'GlitchQueen', 'VoxMaster'];
  function handleArcadeBench() {
    const game = ARCADE_GAMES[Math.floor(Math.random() * ARCADE_GAMES.length)];
    const npc = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
    const score = (Math.floor(Math.random() * 9) + 1) * 1000 + Math.floor(Math.random() * 999);
    const gs = S();
    const myBest = gs.highScores ? Math.max(...Object.values(gs.highScores)) : 0;
    thought(`👀 Watching the pros... ${npc} leads ${game} with ${score.toLocaleString()} pts!`);
    if (myBest > 0 && myBest > score) {
      setTimeout(() => thought('🏆 Wait — YOUR score beats the board! Get in there!'), 3000);
    }
  }

  const POSTERS = [
    { title: 'COSMIC BREAKER',    sub: 'The universe awaits. Break every limit.', colors: ['#1a0040', '#7700ff', '#ff00cc'] },
    { title: 'NEON RACER 2099',   sub: 'Faster than light, cooler than dark.', colors: ['#001a30', '#00ccff', '#ff6600'] },
    { title: 'ECHO\'S REVENGE',   sub: 'One station. One cat. No mercy.', colors: ['#002200', '#00ff44', '#ffff00'] },
    { title: 'VOID STRIKER',      sub: 'Hit the void before it hits you.', colors: ['#0a0010', '#cc00ff', '#ffffff'] },
    { title: 'PIXEL HERO ZERO',   sub: 'Every legend starts with a single pixel.', colors: ['#200010', '#ff4466', '#ffd700'] },
  ];
  function handlePoster() {
    let idx = lsGet('fi_poster_idx', 0);
    idx = (idx + 1) % POSTERS.length;
    lsSet('fi_poster_idx', idx);
    const p = POSTERS[idx];
    const { ov } = popup(`<h3>🖼️ Game Poster</h3>
<canvas id="poster-canvas" width="200" height="120" style="border-radius:8px;display:block;margin:8px auto"></canvas>
<div style="text-align:center;margin-top:6px">
  <div style="color:#ffd080;font-size:14px;font-weight:bold">${p.title}</div>
  <div style="color:#aaa;font-size:11px;font-style:italic">"${p.sub}"</div>
</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()" style="margin-top:12px">Next time →</button>`);
    // Draw pixel art poster
    requestAnimationFrame(() => {
      const cv = document.getElementById('poster-canvas');
      if (!cv) return;
      const cx = cv.getContext('2d');
      const [bg, c1, c2] = p.colors;
      cx.fillStyle = bg; cx.fillRect(0, 0, 200, 120);
      // Draw some pixel art shapes
      cx.fillStyle = c1;
      for (let i = 0; i < 20; i++) {
        cx.fillRect(Math.random() * 200 | 0, Math.random() * 120 | 0, 4 + Math.random() * 8 | 0, 2);
      }
      cx.fillStyle = c2;
      cx.font = 'bold 16px monospace'; cx.textAlign = 'center';
      cx.fillText(p.title, 100, 65);
      cx.font = '10px monospace';
      cx.fillStyle = '#ffffff88';
      cx.fillText(p.sub.slice(0, 28), 100, 90);
    });
  }

  /* VENDING MACHINE */
  const VENDING_ITEMS = [
    { id: 'energy_drink', name: 'Energy Drink',  icon: '⚡', effect: () => { notif('⚡ Speed boost for 30s!'); lsSet('fi_speedBoost', Date.now() + 30000); thought('ZOOM ZOOM! ⚡'); } },
    { id: 'chips',        name: 'Chips',          icon: '🍟', effect: () => { thought('*crunch crunch* Salty. Good.'); } },
    { id: 'mystery_soda', name: 'Mystery Soda',   icon: '🥤', effect: () => { const n = 1 + Math.floor(Math.random() * 10); earn(n, 'mystery_soda'); thought(`🥤 Strange fizz... but +${n}◈ fell out!`); } },
    { id: 'space_bar',    name: 'Space Bar',      icon: '🍫', effect: () => { thought('🍫 Tastes like... vacuum? Also chocolate.'); earn(2, 'space_bar'); } },
    { id: 'lucky_token',  name: 'Lucky Token',    icon: '🎲', effect: () => { notif('🎲 +1 Arcade Play!'); lsSet('fi_arcadeBonus', (lsGet('fi_arcadeBonus', 0)) + 1); thought('Lucky me! 🎲'); } },
    { id: 'ancient_gum',  name: 'Ancient Gum',    icon: '🌌', effect: () => { thought('"Tastes like stardust..." — actually pretty good?'); earn(3, 'ancient_gum'); } },
  ];
  function handleVending() {
    if (!canAfford(2)) { thought('💸 Need 2◈ for the vending machine!'); return; }
    spend(2, 'vending');
    const item = VENDING_ITEMS[Math.floor(Math.random() * VENDING_ITEMS.length)];
    notif(`${item.icon} ${item.name}!`);
    item.effect();
    companion('react', { msg: 'Vending: ' + item.name });
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 4 — Garden Biodome
   * ══════════════════════════════════════════════════════════════════════ */

  /* FISHING MINI-GAME */
  let fishingActive = false;
  const FISH_NAMES = [
    'Prismatic Darter', 'Void Carp', 'Nebula Fin', 'Echo Bass', 'Star Trout',
    'Crystal Perch', 'Neon Minnow', 'Solar Salmon', 'Dark Tide Eel', 'Pixel Flounder',
  ];
  function handlePond() {
    if (fishingActive) { thought('🎣 Already fishing!'); return; }
    fishingActive = true;
    const waitMs = 3000 + Math.random() * 5000;
    thought('🎣 Casting line... wait for a nibble!');
    companion('wait', { reason: 'fishing' });
    const nibbleTimeout = setTimeout(() => {
      thought('🐟 Nibble! Hit SPACE or tap NOW!');
      notif('🐟 Press SPACE or TAP to catch!');
      let caught = false;
      const catchWindow = 2000;
      const catchIt = () => {
        if (caught) return;
        caught = true;
        cleanup();
        const fish = FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)];
        const coins = 3 + Math.floor(Math.random() * 6);
        earn(coins, 'fishing');
        thought(`🎣 Caught a ${fish}! +${coins}◈`);
        notif(`🐟 ${fish} caught! +${coins}◈`);
        companion('excited', { msg: 'Nice catch!' });
        fishingActive = false;
      };
      const missIt = () => {
        if (caught) return;
        caught = true;
        cleanup();
        thought('🐟 It got away! Try again.');
        fishingActive = false;
      };
      const onKey = e => { if (e.code === 'Space') catchIt(); };
      const canvas = document.getElementById('canvas') || document.querySelector('canvas');
      const onTap = () => catchIt();
      document.addEventListener('keydown', onKey, { once: true });
      if (canvas) canvas.addEventListener('click', onTap, { once: true });
      const missTimer = setTimeout(missIt, catchWindow);
      function cleanup() {
        clearTimeout(missTimer);
        document.removeEventListener('keydown', onKey);
        if (canvas) canvas.removeEventListener('click', onTap);
      }
    }, waitMs);
    // Allow cancellation
    const cancelKey = e => { if (e.key === 'Escape') { clearTimeout(nibbleTimeout); fishingActive = false; thought('🎣 Line reeled in.'); document.removeEventListener('keydown', cancelKey); } };
    document.addEventListener('keydown', cancelKey);
  }

  /* BUTTERFLIES */
  const BUTTERFLY_NAMES = [
    'Luna', 'Ember', 'Zephyr', 'Cobalt', 'Aurora', 'Jade', 'Crimson',
    'Violet', 'Sol', 'Iris', 'Nova', 'Dusk',
  ];
  function handleButterflies() {
    const seen = lsGet('fi_butterflies', []);
    // Pick unseen first
    const unseen = BUTTERFLY_NAMES.filter(b => !seen.includes(b));
    const name = unseen.length > 0
      ? unseen[Math.floor(Math.random() * unseen.length)]
      : BUTTERFLY_NAMES[Math.floor(Math.random() * BUTTERFLY_NAMES.length)];
    if (!seen.includes(name)) {
      seen.push(name);
      lsSet('fi_butterflies', seen);
      notif(`🦋 New butterfly: ${name}! (${seen.length}/${BUTTERFLY_NAMES.length})`);
      if (seen.length >= 10) grantAchievement('butterfly_collector', '🦋 Butterfly Whisperer — 10 butterflies found!');
    }
    thought(`🦋 ${name} lands on your hand... so delicate.`);
    companion('react', { msg: '🦋 ' + name });
    // Float butterfly near cursor
    const btn = document.createElement('div');
    btn.textContent = '🦋';
    btn.style.cssText = 'position:fixed;font-size:24px;pointer-events:none;z-index:8000;transition:all .5s';
    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 100;
    const y = window.innerHeight / 2 + (Math.random() - 0.5) * 100;
    btn.style.left = x + 'px'; btn.style.top = y + 'px';
    document.body.appendChild(btn);
    setTimeout(() => { btn.style.opacity = '0'; setTimeout(() => btn.remove(), 500); }, 2000);
  }

  /* FOUNTAIN — make a wish */
  const WISHES = [
    '✨ That every bug is someone else\'s.',
    '🚀 To reach Floor 12 without the elevator breaking.',
    '💰 For infinite coins and also a sandwich.',
    '🌙 That tomorrow\'s deploys go smoothly.',
    '🎮 For one more life. Always one more life.',
    '🐱 For Pixel to finally be less chaotic.',
    '💫 That the server stays online forever.',
    '🌸 For spring, somewhere, always.',
    '🎵 That the perfect song always plays at the right moment.',
    '⭐ To see every star with someone who matters.',
    '🏆 That hard work is always recognized.',
    '🌌 To understand, just once, the shape of the universe.',
    '🎲 For luck when it counts, and wisdom to know the difference.',
    '💜 That everyone finds their station in life.',
    '🌊 For calmer seas in choppy times.',
    '🍕 Free pizza. Just once. Cosmic pizza.',
    '🤖 That AI stays helpful and never creepy.',
    '🦋 To remember the small beautiful things.',
    '📡 For a signal from beyond the stars — a friendly one.',
    '🏡 That this station always feels like home.',
  ];
  function handleFountain() {
    if (!canAfford(1)) { thought('💧 Drop a coin in the fountain (costs 1◈)'); return; }
    spend(1, 'wish');
    const wishes = lsGet('fi_wishes', []);
    const wish = WISHES[wishes.length % WISHES.length];
    wishes.push(wish);
    lsSet('fi_wishes', wishes);
    thought('🌊 ' + wish, 8);
    notif('💧 Wish made!');
    companion('react', { msg: 'A wish was made...' });
    // Show last 3 wishes as "other visitors'"
    if (wishes.length > 1) {
      setTimeout(() => {
        const prev = wishes[Math.max(0, wishes.length - 2)];
        thought('📜 Last visitor wished: ' + prev, 7);
      }, 4000);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 5 — Secret Lab
   * ══════════════════════════════════════════════════════════════════════ */

  /* LABMONITORS — sci-fi subject analysis */
  function handleLabmonitors() {
    const gs = S();
    const floors = gs.discovery ? gs.discovery.floorsVisited.length : 1;
    const coins = window.Coins ? window.Coins.count : 0;
    const lifetime = window.Coins ? window.Coins.lifetime : 0;
    const elapsed = fmtElapsed(Date.now() - sessionStart());
    const skinType = gs.visitor ? gs.visitor.skin || 'unknown' : 'unknown';
    const floorsArr = gs.discovery ? gs.discovery.floorsVisited : [1];
    // Compute favorite floor (just use current as fallback)
    const favFloor = floorsArr.length > 0 ? floorsArr[floorsArr.length - 1] : 1;
    const scanLines = [
      ['SUBJECT TYPE',      skinType.toUpperCase()],
      ['FLOORS EXPLORED',   floors + ' / 12'],
      ['CURRENT COINS',     coins + '◈'],
      ['LIFETIME EARNED',   lifetime + '◈'],
      ['TIME IN STATION',   elapsed],
      ['LAST FLOOR',        'F' + favFloor],
      ['NEURAL STATUS',     'ACTIVE — CURIOUS'],
      ['VITALS',            'NOMINAL ✅'],
      ['THREAT LEVEL',      'CREATIVE 🎮'],
      ['RECOMMENDATION',    'CONTINUE EXPLORING'],
    ];
    const rows = scanLines.map(([k, v]) => `<tr><td style="color:#00ff88;padding:2px 8px 2px 0;font-size:11px">${k}</td><td style="color:#fff;font-size:11px">${v}</td></tr>`).join('');
    popup(`<h3 style="color:#00ff88;font-family:monospace">🔬 SUBJECT ANALYSIS</h3>
<div style="font-family:monospace;background:#001a00;border-radius:8px;padding:12px;border:1px solid #00ff88">
<table>${rows}</table>
</div>
<div style="color:#00ff8888;font-size:10px;margin-top:8px;font-style:italic">Echo Labs — All readings within expected parameters.</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()" style="margin-top:10px">Acknowledged</button>`);
  }

  /* ARTIFACTS — lore per artifact */
  const ARTIFACT_LORE = [
    { name: 'Resonance Core',    icon: '💎', lore: 'A crystalline sphere that hums at 432Hz — the frequency of the station\'s first heartbeat. No one built it. It was found in the server room on day one. Echo refuses to touch it.' },
    { name: 'Void Compass',      icon: '🧭', lore: 'This compass points not north, but toward the nearest unvisited secret room. It has never pointed the same direction twice. Its maker is unknown.' },
    { name: 'First Pixel',       icon: '🟦', lore: 'The very first pixel placed when this station was built — extracted and preserved in glass. It contains the entire color history of every artwork ever created here.' },
    { name: 'Echo\'s Old Badge', icon: '🏷️', lore: 'A worn visitor badge from this station\'s first day. The name reads "Echo" — but in handwriting that doesn\'t match any current resident. A mystery unresolved.' },
    { name: 'Star Chart Fragment', icon: '🗺️', lore: 'One piece of a larger map, drawn on material that predates the station by centuries. The stars it charts don\'t exist in our sky — yet.' },
    { name: 'Glitch Shard',      icon: '⚡', lore: 'A fragment of code made physical — a moment when the simulation stuttered and crystallized. It feels warm, like it\'s still running. Never look at it too long.' },
  ];
  function handleArtifacts() {
    const fl = currentFloor();
    if (fl === 9) { handleArchiveArtifacts(); return; }
    const read = lsGet('fi_artifacts_read', []);
    const unread = ARTIFACT_LORE.filter(a => !read.includes(a.name));
    const art = unread.length > 0 ? unread[0] : ARTIFACT_LORE[Math.floor(Math.random() * ARTIFACT_LORE.length)];
    if (!read.includes(art.name)) {
      read.push(art.name);
      lsSet('fi_artifacts_read', read);
      earn(2, 'artifact_' + art.name);
    }
    popup(`<h3>${art.icon} ${art.name}</h3>
<div style="background:#1a0020;border-radius:8px;padding:12px;margin:8px 0;font-size:12px;line-height:1.7;color:#ddd;font-style:italic">"${art.lore}"</div>
<div style="color:#ffd080;font-size:11px">Artifacts studied: ${read.length} / ${ARTIFACT_LORE.length}</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">Fascinating</button>`);
    companion('wonder', { artifact: art.name });
    if (read.length >= ARTIFACT_LORE.length) grantAchievement('artifact_scholar', '📚 Artifact Scholar — All artifacts studied!');
  }

  /* WORKBENCH — featured recipes */
  const RECIPES = [
    { name: 'Neon Saber', icon: '⚔️', ingredients: ['Crystal Shard ×2', 'Neon Tube ×1', 'Power Core ×1'], output: 'A blade that glows with the color of your soul.' },
    { name: 'Star Map',   icon: '🗺️', ingredients: ['Void Ink ×3', 'Ancient Paper ×1'], output: 'Reveals hidden passages on the current floor.' },
    { name: 'Echo Coin',  icon: '◈',  ingredients: ['Raw Data ×5', 'Resonance Dust ×1'], output: 'A coin worth 10◈ — and it holds a memory.' },
  ];
  function handleWorkbench() {
    const rows = RECIPES.map(r => `
<div style="background:#1a1a2e;border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid #333">
  <div style="font-size:15px;color:#ffd080">${r.icon} ${r.name}</div>
  <div style="font-size:10px;color:#888;margin:4px 0">Ingredients: ${r.ingredients.join(', ')}</div>
  <div style="font-size:11px;color:#00ff88;font-style:italic">→ ${r.output}</div>
</div>`).join('');
    popup(`<h3>🔧 Workbench — Featured Recipes</h3>${rows}
<div style="color:#888;font-size:10px;margin-top:4px">Visit the Crafting Station to craft these.</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">Got it</button>`);
  }

  /* CIRCUITS — trace the circuit mini-game */
  let circuitsActive = false;
  function handleCircuits() {
    if (circuitsActive) return;
    circuitsActive = true;
    const sequence = [1, 2, 3];
    let step = 0;
    let timer = 15;
    let done = false;

    const { p, ov } = popup(`<h3>⚡ Circuit Trace</h3>
<div style="font-size:11px;color:#aaa;margin-bottom:8px">Click nodes in order: A → B → C within 15 seconds!</div>
<div style="display:flex;gap:12px;justify-content:center;margin:12px 0">
  <div id="node-1" class="drink-btn" style="width:50px;height:50px;font-size:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#333;cursor:pointer">A</div>
  <div style="color:#00ff88;font-size:24px;align-self:center">→</div>
  <div id="node-2" class="drink-btn" style="width:50px;height:50px;font-size:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#333;cursor:pointer;opacity:0.4">B</div>
  <div style="color:#00ff88;font-size:24px;align-self:center">→</div>
  <div id="node-3" class="drink-btn" style="width:50px;height:50px;font-size:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#333;cursor:pointer;opacity:0.4">C</div>
</div>
<div id="circuit-timer" style="text-align:center;color:#ff6666;font-size:18px;font-family:monospace">15s</div>
<div id="circuit-status" style="text-align:center;color:#aaa;font-size:12px;min-height:20px;margin-top:8px"></div>`);

    const nodes = ['A', 'B', 'C'];
    const interval = setInterval(() => {
      timer--;
      const timerEl = p.querySelector('#circuit-timer');
      if (timerEl) timerEl.textContent = timer + 's';
      if (timer <= 0 && !done) {
        done = true; clearInterval(interval);
        const st = p.querySelector('#circuit-status');
        if (st) st.textContent = '⏰ Time\'s up! Circuit shorted.';
        circuitsActive = false;
        setTimeout(() => ov.remove(), 2000);
      }
    }, 1000);

    for (let i = 1; i <= 3; i++) {
      const nodeEl = p.querySelector(`#node-${i}`);
      if (!nodeEl) continue;
      const nodeIdx = i;
      nodeEl.onclick = () => {
        if (done) return;
        if (nodeIdx === step + 1) {
          step++;
          nodeEl.style.background = '#00ff88';
          nodeEl.style.color = '#000';
          nodeEl.style.opacity = '1';
          const st = p.querySelector('#circuit-status');
          if (step < 3) {
            if (st) st.textContent = `✅ Node ${nodes[step - 1]} connected! Next: ${nodes[step]}`;
            // Enable next node
            const nextNode = p.querySelector(`#node-${step + 1}`);
            if (nextNode) nextNode.style.opacity = '1';
          } else {
            done = true; clearInterval(interval);
            if (st) st.textContent = '⚡ Circuit complete! +10◈';
            earn(10, 'circuit_game');
            notif('⚡ Circuit traced! +10◈');
            grantAchievement('electrician', '⚡ Electrician — Circuit traced!');
            companion('excited', { msg: 'Circuit solved!' });
            circuitsActive = false;
            setTimeout(() => ov.remove(), 2500);
          }
        } else {
          const st = p.querySelector('#circuit-status');
          if (st) st.textContent = '❌ Wrong node! Start over.';
          step = 0;
          for (let j = 1; j <= 3; j++) {
            const n = p.querySelector(`#node-${j}`);
            if (n) { n.style.background = '#333'; n.style.color = '#fff'; n.style.opacity = j === 1 ? '1' : '0.4'; }
          }
        }
      };
    }

    ov.addEventListener('remove', () => { clearInterval(interval); circuitsActive = false; });
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 6 — Record Room / Lounge
   * ══════════════════════════════════════════════════════════════════════ */

  const PLAYLIST = [
    { title: 'Neon Corridors',      artist: 'Pixel Drift',   desc: 'Pulsing synthwave through empty station halls.' },
    { title: 'Zero Gravity Blues',  artist: 'The Void Cats',  desc: 'Slow jazz for floating in zero-g.' },
    { title: 'Data Stream',         artist: 'LoFi.exe',       desc: 'Crunchy lo-fi beats from a dial-up era.' },
    { title: 'Echo Chamber',        artist: 'S.echo & Pixel', desc: 'A collab. No one knows when it was recorded.' },
    { title: 'Starfield at 3AM',    artist: 'Astral Keys',    desc: 'Piano and static, for late-night exploration.' },
  ];
  function handleCozyseating() {
    const heard = lsGet('fi_songs_heard', []);
    let html = '<h3>🎵 Echo\'s Listening Room</h3><div style="margin:8px 0">';
    PLAYLIST.forEach((song, i) => {
      const isNew = !heard.includes(song.title);
      html += `<div class="drink-btn" data-song="${i}" style="text-align:left;padding:8px;margin-bottom:6px;border-radius:8px;background:#1a1030;border:1px solid ${isNew ? '#ff6ec7' : '#333'}">
        <div style="color:#ffd080;font-size:13px">🎵 ${song.title}</div>
        <div style="color:#888;font-size:10px">${song.artist}</div>
        <div style="color:#aaa;font-size:10px;font-style:italic">${song.desc}</div>
        ${isNew ? '<div style="color:#ff6ec7;font-size:9px;margin-top:2px">NEW +2◈</div>' : ''}
      </div>`;
    });
    html += '</div>';
    const gs = S();
    if (gs.echo) gs.echo.sitting = true;
    const { p } = popup(html);
    p.querySelectorAll('[data-song]').forEach(el => {
      el.onclick = () => {
        const i = parseInt(el.dataset.song);
        const song = PLAYLIST[i];
        if (!heard.includes(song.title)) {
          heard.push(song.title);
          lsSet('fi_songs_heard', heard);
          earn(2, 'song_' + i);
          notif('🎵 New track discovered! +2◈');
        }
        thought(`♪ Now playing: "${song.title}" — ${song.artist}`);
        companion('react', { msg: '♪ ' + song.title });
        if (heard.length >= PLAYLIST.length) grantAchievement('music_explorer', '🎵 Music Explorer — All tracks discovered!');
      };
    });
  }

  /* SPEAKERS — waveform visualization */
  function handleSpeakers() {
    const gs = S();
    let trackInfo = 'Unknown track';
    if (gs.floor === 6 && typeof BarVibes !== 'undefined' && BarVibes.active && BarVibes.currentRecord) {
      trackInfo = `${BarVibes.currentRecord.title} — ${BarVibes.currentRecord.artist}`;
    }
    const { p } = popup(`<h3>🔊 Speakers</h3>
<div style="color:#ffd080;font-size:13px;text-align:center;margin:8px 0">♪ ${trackInfo}</div>
<canvas id="wave-canvas" width="300" height="60" style="border-radius:8px;display:block;margin:0 auto;background:#0a0a10"></canvas>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()" style="margin-top:10px">🎵 Vibing</button>`);
    // Animate waveform
    let frame;
    const animWave = () => {
      const cv = document.getElementById('wave-canvas');
      if (!cv || !document.body.contains(cv)) { cancelAnimationFrame(frame); return; }
      const cx = cv.getContext('2d');
      cx.clearRect(0, 0, 300, 60);
      const bars = 30;
      const barW = 8;
      const gap = 2;
      const now = Date.now() / 1000;
      for (let i = 0; i < bars; i++) {
        const h = 8 + Math.abs(Math.sin(now * 3 + i * 0.4)) * 40;
        const hue = (i * 8 + now * 30) % 360;
        cx.fillStyle = `hsl(${hue},80%,60%)`;
        cx.fillRect(i * (barW + gap), (60 - h) / 2, barW, h);
      }
      frame = requestAnimationFrame(animWave);
    };
    animWave();
  }

  /* BOOKSHELF (Floor 6) */
  const BOOKS = [
    { title: 'The Station Manual',           excerpt: 'Chapter 1: The station was never meant to have a Floor 12. Yet here we are. The architect left no notes.' },
    { title: 'Void Between the Stars',        excerpt: 'She pressed her palm to the glass and felt the cold of a billion light-years. It felt like home.' },
    { title: 'Debugging at Midnight',         excerpt: 'The bug had been there since day one. It only appeared when you were almost happy. Classic.' },
    { title: 'A Cat\'s Guide to Space',       excerpt: 'Rule one: Knock things into zero-g. Rule two: Everything in zero-g is yours now. Rule three: See rule one.' },
    { title: 'Echo\'s Journal Vol. I',        excerpt: '"I built this station because I needed a place where things made sense. Then visitors arrived and it made sense anyway."' },
    { title: 'The Pixel Protocol',            excerpt: 'A 1-pixel difference is the difference between art and void. Every placement matters.' },
    { title: 'Dreams in Monospace',           excerpt: 'She dreamed in code. Not syntax — meaning. The kind that compiles without error and runs forever.' },
    { title: 'Last Signal from Proxima',      excerpt: '"We are here," it said, three times, then silence. Seventeen linguists spent their careers on those six words.' },
  ];
  function handleBookshelfF6() {
    if (currentFloor() !== 6) return false;
    const read = lsGet('fi_books_f6', []);
    const unread = BOOKS.filter(b => !read.includes(b.title));
    const book = unread.length > 0 ? unread[0] : BOOKS[Math.floor(Math.random() * BOOKS.length)];
    if (!read.includes(book.title)) {
      read.push(book.title);
      lsSet('fi_books_f6', read);
    }
    popup(`<h3>📚 ${book.title}</h3>
<div style="background:#1a1020;border-radius:8px;padding:14px;margin:8px 0;font-size:13px;line-height:1.7;font-style:italic;color:#ddd">"${book.excerpt}"</div>
<div style="color:#ffd080;font-size:11px">Books read: ${read.length} / ${BOOKS.length}</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">📖 Close book</button>`);
    companion('react', { msg: 'Reading: ' + book.title });
    if (read.length >= BOOKS.length) grantAchievement('genre_traveler', '📚 Genre Traveler — All books read!');
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 7 — Community Deck
   * ══════════════════════════════════════════════════════════════════════ */

  const NPC_POSTS = [
    { name: 'ZeroX',      trait: 'Conscientious', msg: 'Reminder: Please label your crafting materials. We have a system. USE IT. 😤' },
    { name: 'PixelPete',  trait: 'Open',          msg: 'Just saw a nebula through the dome window. Words literally fail. 🌌' },
    { name: 'NeonKira',   trait: 'Extroverted',   msg: 'Dance floor at midnight!! Who\'s in?? 🪩🎉' },
    { name: 'GlitchQ',    trait: 'Neurotic',      msg: 'Did anyone else feel that micro-tremor at 3am or was I dreaming again???' },
    { name: 'VoxMaster',  trait: 'Agreeable',     msg: 'Cooked for everyone tonight. Galaxy noodles with void broth. Come before it\'s gone! 🍜' },
    { name: 'Starling',   trait: 'Open',          msg: 'The archive on F9 has a section on pre-station history. Wild stuff. Go read it.' },
    { name: 'Milo.exe',   trait: 'Conscientious', msg: 'Server uptime: 99.97%. Let\'s keep it that way. No more DDOS the vending machine attempts.' },
    { name: 'AuroraDev',  trait: 'Agreeable',     msg: 'Echo\'s been so kind to us. Just wanted to say it. 💜 This place is special.' },
  ];
  function handleCommunitywall() {
    let population = [];
    if (typeof StationLife !== 'undefined' && StationLife.population) {
      population = StationLife.population.slice(0, 5);
    }
    const posts = population.length > 0
      ? population.map(npc => ({ name: npc.name || 'NPC', msg: npc.currentThought || 'Just vibing here...' }))
      : NPC_POSTS;
    let html = '<h3>📋 Community Wall</h3><div style="max-height:280px;overflow-y:auto">';
    posts.forEach(post => {
      html += `<div style="background:#1a1a2e;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #ff6ec7">
        <div style="color:#ffd080;font-size:12px;font-weight:bold">${post.name}</div>
        <div style="color:#ddd;font-size:12px;margin-top:3px">${post.msg}</div>
      </div>`;
    });
    html += '</div><button class="drink-btn" onclick="this.closest(\'.popup-overlay\').remove()" style="margin-top:10px">Close wall</button>';
    popup(html);
  }

  /* ARTSTOOL — pixel art stamp */
  function handleArtstool() {
    const GRID = 6;
    let cells = Array(GRID * GRID).fill(false);
    let html = `<h3>🖌️ Create a Stamp</h3>
<div id="art-grid" style="display:grid;grid-template-columns:repeat(${GRID},30px);gap:2px;margin:8px auto;width:fit-content"></div>
<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
  <button class="drink-btn" id="art-clear">Clear</button>
  <button class="drink-btn" id="art-submit">Submit Stamp</button>
</div>`;
    const { p, ov } = popup(html);
    const grid = p.querySelector('#art-grid');
    cells.forEach((_, i) => {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:30px;height:30px;background:#222;border:1px solid #333;cursor:pointer;transition:background .1s;border-radius:3px';
      cell.dataset.idx = i;
      cell.onclick = () => {
        cells[i] = !cells[i];
        cell.style.background = cells[i] ? '#ffd080' : '#222';
      };
      cell.addEventListener('touchstart', e => { e.preventDefault(); cells[i] = !cells[i]; cell.style.background = cells[i] ? '#ffd080' : '#222'; }, { passive: false });
      grid.appendChild(cell);
    });
    p.querySelector('#art-clear').onclick = () => {
      cells = Array(GRID * GRID).fill(false);
      grid.querySelectorAll('div').forEach(c => { c.style.background = '#222'; });
    };
    p.querySelector('#art-submit').onclick = () => {
      const name = lsGet('visitorName', 'Anonymous');
      const stamps = lsGet('fi_gallery_stamps', []);
      stamps.push({ creator: name, cells: [...cells], ts: Date.now() });
      if (stamps.length > 20) stamps.shift();
      lsSet('fi_gallery_stamps', stamps);
      ov.remove();
      earn(3, 'art_stamp');
      notif('🖼️ Stamp added to gallery! +3◈');
      thought('🎨 My art — immortalized!');
      companion('excited', { msg: 'New artwork!' });
    };
  }

  /* GALLERYFRAME — community artworks */
  const GALLERY_ARTWORKS = [
    { title: 'Starfield No.7',    creator: 'PixelPete',  palette: ['#000020', '#001040', '#ffd700', '#ffffff'] },
    { title: 'Echo at Rest',      creator: 'NeonKira',   palette: ['#1a0030', '#ff6ec7', '#00ffcc', '#ffd080'] },
    { title: 'The Garden Pond',   creator: 'Starling',   palette: ['#002200', '#004400', '#00ff88', '#aaffdd'] },
    { title: 'Void Portrait',     creator: 'GlitchQ',    palette: ['#000000', '#110011', '#cc00ff', '#ff00cc'] },
    { title: 'Station at Dawn',   creator: 'AuroraDev',  palette: ['#0a0020', '#ff6633', '#ffaa44', '#ffffcc'] },
  ];
  function handleGalleryframe() {
    let idx = lsGet('fi_gallery_view', 0);
    idx = (idx + 1) % GALLERY_ARTWORKS.length;
    lsSet('fi_gallery_view', idx);
    const seen = lsGet('fi_gallery_seen', []);
    if (!seen.includes(idx)) { seen.push(idx); lsSet('fi_gallery_seen', seen); }
    const art = GALLERY_ARTWORKS[idx];
    const { p } = popup(`<h3>🖼️ Community Gallery</h3>
<canvas id="gallery-canvas" width="220" height="160" style="border-radius:8px;display:block;margin:8px auto;border:2px solid #333"></canvas>
<div style="text-align:center;margin-top:6px">
  <div style="color:#ffd080;font-size:13px">"${art.title}"</div>
  <div style="color:#888;font-size:11px">by ${art.creator}</div>
</div>
<div style="color:#ffd080;font-size:10px;text-align:center;margin-top:4px">Seen: ${seen.length} / ${GALLERY_ARTWORKS.length}</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()" style="margin-top:8px">→ Next artwork</button>`);
    requestAnimationFrame(() => {
      const cv = document.getElementById('gallery-canvas');
      if (!cv) return;
      const cx = cv.getContext('2d');
      cx.fillStyle = art.palette[0]; cx.fillRect(0, 0, 220, 160);
      // Draw random pixel art using palette
      for (let i = 0; i < 200; i++) {
        cx.fillStyle = art.palette[1 + Math.floor(Math.random() * (art.palette.length - 1))];
        const x = Math.random() * 220 | 0;
        const y = Math.random() * 160 | 0;
        const s = 4 + Math.random() * 8 | 0;
        cx.fillRect(x, y, s, s);
      }
      // Add title text
      cx.fillStyle = art.palette[art.palette.length - 1];
      cx.font = 'bold 12px monospace'; cx.textAlign = 'center';
      cx.fillText(art.title, 110, 150);
    });
    if (seen.length >= GALLERY_ARTWORKS.length) grantAchievement('curator', '🖼️ Curator — All gallery artworks seen!');
    // Check user stamps
    const stamps = lsGet('fi_gallery_stamps', []);
    if (stamps.length > 0) {
      const stamp = stamps[stamps.length - 1];
      thought(`🖼️ "${art.title}" by ${art.creator}... (${stamp.creator}'s stamp is also in here!)`);
    } else {
      thought(`🖼️ "${art.title}" by ${art.creator}. Beautiful.`);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 9 — The Archive
   * ══════════════════════════════════════════════════════════════════════ */

  const ARCHIVE_ENTRIES = [
    { id: 'station_origin', title: 'Station Origin', icon: '📜', text: 'The station was initialized on a Tuesday — though no one can agree which year. The founding log simply reads: "Day 1. Echo online. Station is alive." Three hours later, Pixel appeared in the server room. There was no record of how.' },
    { id: 'the_great_lag',  title: 'The Great Lag',  icon: '💾', text: 'Year unknown: a 72-hour server lag froze the station mid-moment. When it recovered, every clock read a different time. Some NPCs gained memories from the frozen interval. They don\'t discuss it.' },
    { id: 'floor_13',       title: 'Floor 13',        icon: '🚪', text: 'Station blueprints show 13 floors. Only 12 are accessible. The 13th button in the elevator panel is smooth, unpressed, and faintly warm to the touch. Maintenance logs say it\'s been disconnected. The logs are unsigned.' },
  ];
  function handleArchiveArtifacts() {
    const read = lsGet('fi_archive_read', []);
    const unread = ARCHIVE_ENTRIES.filter(e => !read.includes(e.id));
    const entry = unread.length > 0 ? unread[0] : ARCHIVE_ENTRIES[Math.floor(Math.random() * ARCHIVE_ENTRIES.length)];
    if (!read.includes(entry.id)) {
      read.push(entry.id);
      lsSet('fi_archive_read', read);
    }
    popup(`<h3>${entry.icon} ${entry.title}</h3>
<div style="background:#100a20;border-radius:8px;padding:14px;font-size:12px;line-height:1.7;font-style:italic;color:#ccc;margin:8px 0">"${entry.text}"</div>
<div style="color:#ffd080;font-size:11px">Archive entries read: ${read.length} / ${ARCHIVE_ENTRIES.length}</div>
<button class="drink-btn" onclick="this.closest('.popup-overlay').remove()">Close entry</button>`);
    companion('wonder', { entry: entry.title });
    if (read.length >= ARCHIVE_ENTRIES.length) grantAchievement('historian', '📚 Historian — All archive entries read!');
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 10 — The Underground
   * ══════════════════════════════════════════════════════════════════════ */

  function handleDancefloor() {
    const gs = S();
    if (gs._dancing) {
      gs._dancing = false;
      thought('💃 Taking a breather...');
      companion('react', { msg: 'dance done' });
      return;
    }
    const { ov } = popup(`<h3>🪩 Join the Dance?</h3>
<div style="text-align:center;font-size:32px;margin:12px 0">🎶💃🕺🎶</div>
<div style="text-align:center;color:#aaa;font-size:12px">The beat drops. The floor glows. Will you dance?</div>
<div style="display:flex;gap:12px;justify-content:center;margin-top:12px">
  <button class="drink-btn" id="dance-yes" style="font-size:16px">💃 YES!</button>
  <button class="drink-btn" id="dance-no">🚶 Nah</button>
</div>`);
    ov.querySelector('#dance-yes').onclick = () => {
      ov.remove();
      gs._dancing = true;
      thought('🪩 LETS GOOO! You hit the floor!');
      notif('🎶 You\'re dancing!');
      companion('dance', { xp: 1 });
      earn(2, 'dancefloor');
      // Bob animation
      let frame = 0;
      const bob = () => {
        if (!gs._dancing) return;
        const el = document.querySelector('.visitor-sprite, #visitor-el');
        if (el) el.style.transform = `translateY(${Math.sin(frame * 0.3) * 6}px)`;
        frame++;
        requestAnimationFrame(bob);
      };
      bob();
    };
    ov.querySelector('#dance-no').onclick = () => { ov.remove(); thought('🎶 Just vibing from the sidelines.'); };
  }

  function handleCrowdNPC(obj) {
    const moods = ['absolutely feeling this track', 'lost in the rhythm', 'wishing the night never ends', 'this bass hits different', 'just closed their eyes and vibed'];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    const name = obj.label || 'Someone';
    thought(`👤 ${name}: "${mood}"...`);
  }

  /* ══════════════════════════════════════════════════════════════════════
   * FLOOR 12 — The Movement (Gym)
   * ══════════════════════════════════════════════════════════════════════ */

  /* CLIMBING WALL */
  let climbActive = false;
  function handleClimbingWall() {
    if (climbActive) return;
    climbActive = true;
    let hits = 0;
    let waitingForSpace = false;
    let done = false;
    thought('🧗 Climbing wall! Hit SPACE at the right moment — 3 times!');
    notif('🧗 Watch for the GRIP WINDOW!');
    companion('cheer', { msg: 'You got this!' });

    const doRound = (round) => {
      if (done) return;
      const delay = 1500 + Math.random() * 2000;
      setTimeout(() => {
        if (done) return;
        thought(`🧗 [${round}/3] GRIP NOW! Hit SPACE!`);
        waitingForSpace = true;
        const win = 1200;
        const onKey = (e) => {
          if (e.code !== 'Space' && e.type !== 'touchstart') return;
          if (!waitingForSpace) return;
          waitingForSpace = false;
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('touchstart', onKey);
          clearTimeout(missT);
          hits++;
          earn(3, 'climbing_' + round);
          thought(`✅ Grip! +3◈ (${hits}/3)`);
          if (hits >= 3) {
            done = true; climbActive = false;
            notif('🏆 Reached the top! +9◈ total');
            grantAchievement('climber', '🧗 Summit! Reached the climbing wall top!');
            companion('cheer', { msg: 'They made it!' });
          } else {
            doRound(round + 1);
          }
        };
        const missT = setTimeout(() => {
          if (!waitingForSpace) return;
          waitingForSpace = false;
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('touchstart', onKey);
          thought('😬 Grip failed! Try again.');
          climbActive = false;
          done = true;
        }, win);
        document.addEventListener('keydown', onKey);
        document.addEventListener('touchstart', onKey, { once: true });
      }, delay);
    };
    doRound(1);
  }

  /* HEAVY BAG */
  const punchData = { count: 0, startTime: 0, timer: null };
  function handleHeavyBag(obj) {
    const now = Date.now();
    if (!punchData.startTime || now - punchData.startTime > 10000) {
      punchData.count = 0; punchData.startTime = now;
    }
    punchData.count++;
    // Punch sound via AudioContext
    const gs = S();
    if (gs.audioCtx) {
      try {
        const ac = gs.audioCtx;
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);
        gain.gain.setValueAtTime(0.4 * (gs.volume || 0.3), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(gs.masterGain || ac.destination);
        osc.start(t); osc.stop(t + 0.2);
      } catch (e) {}
    }
    // Shake the object visually via particles
    if (gs.particles) {
      const ox = obj ? (obj.x + (obj.w || 20) / 2) : gs.echo.x;
      const oy = obj ? obj.y : gs.echo.y;
      for (let i = 0; i < 5; i++) {
        gs.particles.push({ x: ox + (Math.random() - 0.5) * 20, y: oy - 10, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, life: 15, color: '#ff6644', size: 3 });
      }
    }
    if (gs.floatTexts) {
      const punches = ['POW!', 'BAM!', 'WHAM!', 'HIT!', 'SMASH!'];
      gs.floatTexts.push({ text: punches[punchData.count % punches.length], x: gs.echo.x - 15, y: gs.echo.y - 40, color: '#ff6644', life: 30 });
    }
    thought(`🥊 ${['POW!', 'BANG!', 'WHAM!', 'SMASH!'][punchData.count % 4]} (${punchData.count} hits)`);
    if (punchData.count >= 10 && now - punchData.startTime <= 10000) {
      grantAchievement('combo_master', '🥊 Combo! 10 punches in 10 seconds!');
      earn(5, 'combo');
      notif('🔥 COMBO MASTER! +5◈');
      punchData.count = 0;
    }
  }

  /* YOGA MAT / MEDITATION */
  let breathingActive = false;
  function handleYogaMat() {
    if (breathingActive) return;
    breathingActive = true;
    const gs = S();
    if (gs.echo) gs.echo.sitting = true;
    companion('quiet', { reason: 'meditation' });

    let cycle = 0;
    const MAX_CYCLES = 3;
    thought('🧘 Breathe in...', 4);
    notif('🧘 Breathing exercise — 3 cycles');

    const doCycle = () => {
      if (cycle >= MAX_CYCLES) {
        breathingActive = false;
        if (gs.echo) gs.echo.sitting = false;
        lsSet('fi_centered_until', Date.now() + 60000);
        thought('✨ Centered. You feel focused and calm.');
        notif('✨ Centered buff active — 60 seconds!');
        grantAchievement('centered', '🧘 Centered — Completed breathing exercise!');
        companion('calm', { msg: 'So peaceful...' });
        return;
      }
      thought('🌬️ Breathe in...', 3);
      setTimeout(() => {
        thought('💨 Breathe out...', 3);
        setTimeout(() => { cycle++; doCycle(); }, 3500);
      }, 3500);
    };
    doCycle();
  }

  /* ══════════════════════════════════════════════════════════════════════
   * PATCH window.interact
   * ══════════════════════════════════════════════════════════════════════ */

  function waitForInteract(attempts) {
    attempts = attempts || 0;
    if (attempts > 50) return; // Give up after 5s
    if (typeof interact !== 'function') {
      setTimeout(() => waitForInteract(attempts + 1), 100);
      return;
    }
    doPatching();
  }

  function doPatching() {
    expandTV(); // Expand TV channels immediately

    const _orig = interact;
    interact = function () {
      const gs = S();
      const obj = gs.nearObject || (typeof getNearObject === 'function' ? getNearObject() : null);
      const id = obj ? (obj.id || '') : '';

      // — Floor 1 —
      if (id === 'bed') { handleBed(); return; }
      if (id === 'fireplace') { handleFireplace(); return; }
      if (id === 'neon') { handleNeon(); return; }
      if (id === 'server') { handleServer(); return; }

      // — Floor 2 —
      if (id === 'starmap') { handleStarmap(); return; }
      if (id === 'domewindow') { handleDomewindow(); return; }
      if (id === 'deepspace' || id === 'stars') { handleDeepspace(); return; }
      if (id === 'telescope') {
        // Only override if constellation already completed
        if (gs.puzzles && gs.puzzles.constellation && gs.puzzles.constellation.completed) {
          if (handleTelescope()) return;
        }
        // else fall through to original
      }

      // — Floor 3 —
      if (id === 'bench' || id === 'bench_2') { handleArcadeBench(); return; }
      if (id === 'poster') { handlePoster(); return; }
      if (id === 'vending' || id === 'vending_machine') { handleVending(); return; }

      // — Floor 4 —
      if (id === 'pond') { handlePond(); return; }
      if (id === 'butterflies') { handleButterflies(); return; }
      if (id === 'fountain' || id === 'fountain_court') { handleFountain(); return; }

      // — Floor 5 —
      if (id === 'labmonitors') { handleLabmonitors(); return; }
      if (id === 'artifacts') { handleArtifacts(); return; }
      if (id === 'workbench') { handleWorkbench(); return; }
      if (id === 'circuits') { handleCircuits(); return; }

      // — Floor 6 —
      if (id === 'cozyseating') { handleCozyseating(); return; }
      if (id === 'speakers') { handleSpeakers(); return; }
      if (id === 'bookshelf' && currentFloor() === 6) { if (handleBookshelfF6()) return; }

      // — Floor 7 —
      if (id === 'communitywall') { handleCommunitywall(); return; }
      if (id === 'artstool') { handleArtstool(); return; }
      if (id === 'galleryframe') { handleGalleryframe(); return; }

      // — Floor 10 —
      if (id === 'dancefloor') { handleDancefloor(); return; }
      if (id && id.startsWith('crowd')) { handleCrowdNPC(obj); return; }

      // — Floor 12 —
      if (id === 'climbing_wall') { handleClimbingWall(); return; }
      if (id === 'heavy_bag' || id === 'heavy_bag_1' || id === 'heavy_bag_2' || id === 'heavy_bag_3') { handleHeavyBag(obj); return; }
      if (id === 'yoga_mat' || id === 'yoga_mat_1' || id === 'yoga_mat_2' || id === 'yoga_mat_3' ||
          id === 'yoga_mat_4' || id === 'yoga_mat_5' || id === 'yoga_mat_6' ||
          id === 'meditation' || id === 'meditation_corner' || id === 'meditation_alcove') {
        handleYogaMat(); return;
      }

      // Fall through to original
      _orig.apply(this, arguments);
    };

    // Also expose for direct calling
    window._floorInteractions = {
      bed: handleBed, fireplace: handleFireplace, neon: handleNeon, server: handleServer,
      starmap: handleStarmap, telescope: handleTelescope, domewindow: handleDomewindow, deepspace: handleDeepspace,
      bench: handleArcadeBench, poster: handlePoster, vending: handleVending,
      pond: handlePond, butterflies: handleButterflies, fountain: handleFountain,
      labmonitors: handleLabmonitors, artifacts: handleArtifacts, workbench: handleWorkbench, circuits: handleCircuits,
      cozyseating: handleCozyseating, speakers: handleSpeakers, bookshelf6: handleBookshelfF6,
      communitywall: handleCommunitywall, artstool: handleArtstool, galleryframe: handleGalleryframe,
      dancefloor: handleDancefloor, climbingWall: handleClimbingWall, heavyBag: handleHeavyBag, yogaMat: handleYogaMat,
    };

    console.log('[floor-interactions] ✅ Patched! All floors interactive.');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { sessionStart(); waitForInteract(); });
  } else {
    sessionStart();
    // Wait a tick so index.html's inline scripts have run
    setTimeout(() => waitForInteract(), 200);
  }

})();
