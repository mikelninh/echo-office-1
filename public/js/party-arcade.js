/* ═══════════════════════════════════════════════════════════════════════
   PARTY ARCADE (client) — live multiplayer for Echo Run, over the station's
   existing /ws socket (window.EchoWS). Implements the room-code lobby, the
   race HUD (interpolated rival "ghosts" + deaths board + place), the spectate
   view (rage meter + audience emote reactions), and tiered results.

   Talks to src/party-arcade.js on the server via `party.*` messages. The
   station routes inbound `party.*` to window.PartyArcade.onMessage(msg), and
   a Floor-3 entry calls window.openPartyArcade().

   Mounts the SAME Echo Run module (public/games/platformer.js) with a socket
   transport + a net adapter — no duplicate game code.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const DIFFS = ['chill', 'normal', 'hard', 'kaizo'];
  const DIFF_COLOR = { chill: '#7CFFCB', normal: '#00fff7', hard: '#ffb347', kaizo: '#ff6ec7' };
  const DIFF_SUB = { chill: 'a gentle stroll', normal: 'the classic feel', hard: 'tight jumps', kaizo: 'almost impossible' };
  // assigned by join order — hue + SHAPE so it reads without color (colorblind-safe)
  const SLOTS = [
    { c: '#00fff7', s: '●' }, { c: '#ff6ec7', s: '▲' },
    { c: '#ffd700', s: '■' }, { c: '#7CFFCB', s: '◆' },
  ];
  const RAGE_BANDS = [
    [0.30, 'CHILL', '#7CFFCB'], [0.55, 'LOCKED IN', '#00fff7'],
    [0.80, 'HEATED', '#ffb347'], [0.95, 'TILTED', '#ff6ec7'], [2, 'MALDING (affectionate)', '#ff6ec7'],
  ];

  // ── one-time CSS (prefixed er-, mirrors claw-spectator vocabulary) ─────────
  function injectCSS() {
    if (document.getElementById('er-net-css')) return;
    const st = document.createElement('style');
    st.id = 'er-net-css';
    st.textContent = `
    .er-net,.er-net *{box-sizing:border-box;font-family:system-ui,sans-serif}
    .er-net{position:absolute;inset:0;z-index:40;color:#fff}
    .er-fill{position:fixed;inset:0;background:#06060f;z-index:9000}
    .er-panel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:18px;padding:24px;text-align:center}
    .er-title{font-weight:800;color:#00fff7;letter-spacing:2px;text-shadow:0 0 14px rgba(0,255,247,.55)}
    .er-live{color:#ff6ec7}
    .er-code{display:flex;gap:10px;justify-content:center}
    .er-code span{width:clamp(40px,11vw,84px);height:clamp(52px,13vw,104px);display:flex;align-items:center;
      justify-content:center;font-size:clamp(34px,9vw,72px);font-weight:800;color:#00fff7;
      background:rgba(0,255,247,.06);border:2px solid #00fff7;border-radius:10px;
      text-shadow:0 0 12px rgba(0,255,247,.6);animation:erIn .26s cubic-bezier(.2,.9,.3,1.3) both}
    .er-btn{cursor:pointer;user-select:none;padding:12px 22px;border-radius:12px;font-weight:700;
      border:2px solid #00fff7;color:#bff;background:rgba(0,255,247,.08);transition:.15s}
    .er-btn:hover{background:rgba(0,255,247,.18)}
    .er-btn.primary{border:0;color:#06060f;background:linear-gradient(90deg,#00fff7,#7CFFCB)}
    .er-btn.ghost{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.7);background:transparent}
    .er-btn[disabled]{opacity:.4;pointer-events:none}
    .er-row{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
    .er-input{padding:12px;font-size:22px;font-weight:800;letter-spacing:4px;text-transform:uppercase;
      width:160px;text-align:center;background:#0a0a1a;border:2px solid #00fff7;border-radius:10px;color:#00fff7}
    .er-members{display:flex;flex-direction:column;gap:6px;min-width:280px;max-width:460px;width:100%}
    .er-member{display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:10px;
      background:rgba(255,255,255,.03);border-left:3px solid rgba(255,255,255,.15);animation:erUp .25s ease both}
    .er-member .nm{flex:1;text-align:left}
    .er-pill{padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:13px}
    .er-pill.on{background:rgba(255,255,255,.08)}
    .er-hud{position:absolute;inset:0;pointer-events:none}
    .er-bar{position:absolute;top:8px;left:12px;right:12px;height:10px;border-radius:6px;
      background:rgba(255,255,255,.08);overflow:visible}
    .er-mk{position:absolute;top:-3px;transform:translateX(-50%);font-size:13px;transition:left .12s linear}
    .er-place{position:absolute;top:24px;left:14px;font-size:30px;font-weight:800}
    .er-deaths{position:absolute;left:14px;bottom:12px;font-weight:800}
    .er-deaths .big{font-size:30px;color:#ff6ec7}
    .er-deaths .lbl{font-size:11px;color:rgba(255,255,255,.45)}
    .er-rivals{position:absolute;right:14px;bottom:12px;text-align:right;font-size:14px;font-weight:700;line-height:1.5}
    .er-count{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-size:clamp(48px,18vw,120px);
      font-weight:800;color:#00fff7;text-shadow:0 0 20px rgba(0,255,247,.6);animation:erCount .35s cubic-bezier(.2,.8,.2,1) both}
    .er-banner{position:absolute;left:50%;top:18%;transform:translateX(-50%);font-weight:800;font-size:22px;
      animation:erUp .3s ease both,erFade .4s 1.2s ease forwards}
    .er-watch{position:absolute;top:8px;left:0;right:0;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;pointer-events:auto}
    .er-chip{padding:5px 12px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);
      cursor:pointer;font-size:13px;font-weight:700}
    .er-rage{position:absolute;top:46px;right:14px;width:220px;max-width:46vw}
    .er-rage .track{height:14px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden}
    .er-rage .fill{height:100%;width:0;transition:width .3s ease,background .3s}
    .er-rage .lab{font-size:11px;font-weight:700;text-align:right;margin-top:2px}
    .er-bigd{position:absolute;top:46px;right:248px;text-align:right}
    .er-bigd .big{font-size:40px;font-weight:800;color:#ff6ec7;text-shadow:0 0 14px rgba(255,110,199,.5)}
    .er-bigd .lbl{font-size:12px;color:rgba(255,255,255,.45)}
    .er-att{position:absolute;top:46px;left:14px;font-size:18px;font-weight:800;color:#00fff7}
    .er-dock{position:absolute;left:0;right:0;bottom:14px;display:flex;gap:8px;justify-content:center;pointer-events:auto}
    .er-emo{font-size:26px;width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      background:rgba(255,255,255,.06);border:1px solid rgba(0,255,247,.18);cursor:pointer}
    .er-emo:active{transform:scale(.9)}
    .er-float{position:absolute;font-size:30px;pointer-events:none;animation:erFloat 2s ease-out forwards}
    .er-feed{position:absolute;left:12px;bottom:78px;max-width:50%;font-size:13px;line-height:1.5;
      text-shadow:0 1px 2px #000;pointer-events:none}
    .er-x{position:absolute;top:10px;right:14px;font-size:22px;cursor:pointer;color:rgba(255,255,255,.6);pointer-events:auto;z-index:70}
    .er-clean .er-dock,.er-clean .er-feed,.er-clean .er-watch{display:none}
    .er-results{position:absolute;inset:0;background:rgba(6,6,15,.72);display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;padding:22px;pointer-events:auto}
    .er-rrow{display:flex;gap:14px;align-items:center;padding:8px 16px;border-radius:10px;min-width:320px;
      background:rgba(255,255,255,.03);animation:erUp .25s ease both}
    .er-rrow.win{background:rgba(255,215,0,.08);border-left:3px solid #ffd700}
    @keyframes erIn{from{opacity:0;transform:scale(.6)}60%{transform:scale(1.15)}to{opacity:1;transform:scale(1)}}
    @keyframes erUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @keyframes erFade{to{opacity:0}}
    @keyframes erCount{from{opacity:0;transform:translate(-50%,-50%) scale(1.6)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    @keyframes erFloat{0%{opacity:0;transform:translateY(0) scale(1)}15%{opacity:1}100%{opacity:0;transform:translateY(-120px) scale(1.4)}}
    @media(prefers-reduced-motion:reduce){.er-net *{animation-duration:.01ms!important}}
    `;
    document.head.appendChild(st);
  }

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  const PA = {
    container: null, root: null, opts: null,
    me: null, code: null, isHost: false, role: 'player',
    gameId: 'platformer', mode: 'race', difficulty: 'normal',
    members: [], peers: {}, game: null, phase: 'idle',
    watchId: null, feed: [], rageHits: [], lastSent: 0, raf: 0, results: null,
  };

  function getSocket() {
    if (window.EchoWS && window.EchoWS.ws && window.EchoWS.ws.readyState === 1) return window.EchoWS.ws;
    if (window.S && window.S._ws && window.S._ws.readyState === 1) return window.S._ws;
    return null;
  }
  function send(type, payload) {
    const ws = getSocket();
    if (!ws) { console.warn('[party] socket not ready for', type); return; }
    ws.send(JSON.stringify(Object.assign({ type }, payload || {})));
  }
  function myColor() { const i = PA.members.findIndex(m => m.id === PA.me); return (SLOTS[i] || SLOTS[0]).c; }
  function slotFor(id) { const i = PA.members.filter(m => m.role === 'player').findIndex(m => m.id === id); return SLOTS[(i + 4) % 4] || SLOTS[0]; }

  // ─────────────────────────────────────────── public entry ────────────────
  function open(opts) {
    injectCSS();
    PA.opts = opts || {};
    if (PA.root) close();
    PA.container = PA.opts.container || (function () { const f = el('div', 'er-fill'); document.body.appendChild(f); PA._fill = f; return f; })();
    PA.container.style.position = PA.container.style.position || 'relative';
    PA.root = el('div', 'er-net');
    PA.container.appendChild(PA.root);
    const x = el('div', 'er-x', '✕'); x.onclick = close; PA.root.appendChild(x);
    renderLauncher();
  }
  function close() {
    stopLoop();
    if (PA.game) { try { PA.game.destroy(); } catch (e) {} PA.game = null; }
    if (PA.code) send('party.leave', {});
    if (PA.root) PA.root.remove(); PA.root = null;
    if (PA._fill) { PA._fill.remove(); PA._fill = null; }
    PA.code = null; PA.phase = 'idle'; PA.peers = {}; PA.members = [];
    if (PA.opts && PA.opts.onExit) try { PA.opts.onExit(); } catch (e) {}
  }

  function clearUI() {
    stopLoop();
    if (PA.game) { try { PA.game.destroy(); } catch (e) {} PA.game = null; }
    if (!PA.root) return;
    [...PA.root.children].forEach(c => { if (!c.classList.contains('er-x')) c.remove(); });
  }

  // ─────────────────────────────────────────── screens ─────────────────────
  function renderLauncher() {
    PA.phase = 'idle'; clearUI();
    const p = el('div', 'er-panel');
    const h = el('div', 'er-title'); h.style.fontSize = '40px';
    h.append('ECHO RUN '); const live = el('span', 'er-live', 'LIVE'); h.appendChild(live);
    p.appendChild(h);
    p.appendChild(el('div', null, 'Play live with friends — race or co-op, across your own devices.'));
    const create = el('div', 'er-btn primary', '＋ Create a room');
    create.onclick = () => send('party.create', { gameId: 'platformer', mode: 'race', difficulty: 'normal' });
    const row = el('div', 'er-row');
    const inp = el('input', 'er-input'); inp.placeholder = 'CODE'; inp.maxLength = 4;
    const join = el('div', 'er-btn', 'Join');
    join.onclick = () => { const c = inp.value.trim().toUpperCase(); if (c) send('party.join', { code: c }); };
    inp.onkeydown = e => { if (e.key === 'Enter') join.click(); };
    row.append(inp, join);
    p.append(create, el('div', null, 'or join with a code:'), row);
    PA.root.appendChild(p);
  }

  function renderLobby() {
    PA.phase = 'lobby'; clearUI();
    const p = el('div', 'er-panel');
    const h = el('div', 'er-title'); h.style.fontSize = '30px';
    h.append('ECHO RUN '); h.appendChild(el('span', 'er-live', 'LIVE'));
    p.appendChild(h);
    // CODE hero
    p.appendChild(el('div', null, 'ROOM CODE'));
    const code = el('div', 'er-code'); [...PA.code].forEach(ch => code.appendChild(el('span', null, ch)));
    p.appendChild(code);
    const copy = el('div', 'er-btn ghost', '⧉ copy invite link');
    copy.onclick = () => {
      const url = `${location.origin}${location.pathname}?party=${PA.code}`;
      const done = () => { copy.textContent = 'copied ✓'; copy.style.color = '#7CFFCB'; setTimeout(() => { copy.textContent = '⧉ copy invite link'; copy.style.color = ''; }, 1400); };
      if (navigator.share) navigator.share({ title: 'Echo Run', text: 'Join my race!', url }).then(done).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done); else done();
    };
    p.appendChild(copy);
    // mode + difficulty (host editable)
    const modeRow = el('div', 'er-row');
    ['race', 'coop'].forEach(m => {
      const pill = el('div', 'er-pill' + (PA.mode === m ? ' on' : ''), m === 'race' ? '🏁 Race' : '🤝 Co-op');
      if (PA.isHost) pill.onclick = () => send('party.setMode', { mode: m }); else pill.style.cursor = 'default';
      modeRow.appendChild(pill);
    });
    p.appendChild(modeRow);
    const diffRow = el('div', 'er-row');
    DIFFS.forEach(d => {
      const pill = el('div', 'er-pill' + (PA.difficulty === d ? ' on' : ''), d.toUpperCase());
      pill.style.borderColor = PA.difficulty === d ? DIFF_COLOR[d] : '';
      pill.style.color = DIFF_COLOR[d];
      if (PA.isHost) pill.onclick = () => send('party.setMode', { difficulty: d }); else pill.style.cursor = 'default';
      diffRow.appendChild(pill);
    });
    p.appendChild(diffRow);
    // members
    const list = el('div', 'er-members');
    PA.members.forEach((m, i) => {
      const slot = m.role === 'spectator' ? { c: 'rgba(255,255,255,.5)', s: '👁' } : (SLOTS[PA.members.filter(x => x.role === 'player').indexOf(m)] || SLOTS[0]);
      const row = el('div', 'er-member'); row.style.borderLeftColor = slot.c;
      row.appendChild(el('span', null, slot.s));
      const nm = el('span', 'nm'); nm.textContent = m.name + (m.id === PA.me ? ' (you)' : '') + (m.id === PA.hostId ? ' · host' : '');
      row.appendChild(nm);
      row.appendChild(el('span', null, m.role === 'spectator' ? 'spectating' : (m.ready ? '✓ ready' : '…')));
      list.appendChild(row);
    });
    p.appendChild(el('div', null, `CREW (${PA.members.filter(m => m.role === 'player').length}/4)`));
    p.appendChild(list);
    // controls
    const ctrl = el('div', 'er-row');
    const meMember = PA.members.find(m => m.id === PA.me) || {};
    if (meMember.role !== 'spectator') {
      const ready = el('div', 'er-btn', meMember.ready ? "I'm not ready" : "I'm ready");
      ready.onclick = () => send('party.setReady', { ready: !meMember.ready });
      ctrl.appendChild(ready);
    }
    const spec = el('div', 'er-btn ghost', meMember.role === 'spectator' ? 'Join as player' : '👁 Spectate instead');
    spec.onclick = () => send('party.setRole', { role: meMember.role === 'spectator' ? 'player' : 'spectator' });
    ctrl.appendChild(spec);
    p.appendChild(ctrl);
    if (PA.isHost) {
      const start = el('div', 'er-btn primary', '▶ START');
      start.style.fontSize = '20px'; start.style.padding = '14px 40px';
      start.onclick = () => send('party.start', {});
      p.appendChild(start);
    } else {
      p.appendChild(el('div', null, 'waiting for the host to start…'));
    }
    PA.root.appendChild(p);
  }

  function showCountdown(n) {
    PA.phase = 'countdown';
    let c = PA.root.querySelector('.er-count');
    if (!c) { c = el('div', 'er-count'); PA.root.appendChild(c); }
    c.textContent = n > 0 ? String(n) : 'GO!';
    c.style.color = n > 0 ? '#00fff7' : '#7CFFCB';
    c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  }

  // ─── mount the actual game (race or spectate) with a net adapter ─────────
  function startGame() {
    clearUI();
    const c = PA.root.querySelector('.er-count'); if (c) c.remove();
    const spectate = PA.role === 'spectator';
    PA.phase = spectate ? 'spectate' : 'playing';
    PA.results = null; PA.rageHits = [];
    const host = el('div'); host.style.cssText = 'position:absolute;inset:0';
    PA.root.appendChild(host);
    if (!PA.watchId) { const pl = PA.members.filter(m => m.role === 'player'); PA.watchId = pl.length ? pl[0].id : null; }

    const adapter = {
      spectate,
      frozen: false,
      onLocalState(s) {
        const now = performance.now();
        if (now - PA.lastSent < 60) return; PA.lastSent = now;
        send('party.input', { state: s });
      },
      onFinish(r) { send('party.input', { state: Object.assign({ finished: true, x: 1e7, progress: 1 }, r) }); },
      ghosts() {
        const out = [];
        for (const id in PA.peers) {
          if (id === PA.me) continue;
          if (spectate && id === PA.watchId) continue;
          const pe = PA.peers[id];
          pe.x += ((pe.tx ?? pe.x) - pe.x) * 0.3; pe.y += ((pe.ty ?? pe.y) - pe.y) * 0.3;
          out.push({ x: pe.x, y: pe.y, color: pe.color, shape: pe.shape, name: pe.name, dead: pe.alive === false });
        }
        return out;
      },
      watchPos() {
        const pe = PA.peers[PA.watchId]; if (!pe) return null;
        pe.x += ((pe.tx ?? pe.x) - pe.x) * 0.35; pe.y += ((pe.ty ?? pe.y) - pe.y) * 0.35;
        return { x: pe.x, y: pe.y, vx: pe.vx, face: pe.face, alive: pe.alive };
      },
    };
    PA.adapter = adapter;
    PA.game = window.EchoRun.mount(host, {
      transport: 'socket', context: PA.opts.context || 'station',
      difficulty: PA.difficulty, net: adapter, multiplayer: true,
      spectate, playerColor: myColor(),
      onCoins: PA.opts.onCoins,
    });
    buildHUD(spectate);
    startLoop();
  }

  function buildHUD(spectate) {
    const hud = el('div', 'er-hud'); PA.hud = hud; PA.root.appendChild(hud);
    if (!spectate) {
      const bar = el('div', 'er-bar'); hud.appendChild(bar); PA.bar = bar;
      const place = el('div', 'er-place'); place.style.color = myColor(); hud.appendChild(place); PA.placeEl = place;
      const d = el('div', 'er-deaths'); d.innerHTML = '<div class="lbl">DEATHS</div><div class="big">0</div>'; hud.appendChild(d); PA.deathEl = d.querySelector('.big');
      const riv = el('div', 'er-rivals'); hud.appendChild(riv); PA.rivEl = riv;
    } else {
      const watch = el('div', 'er-watch'); hud.appendChild(watch); PA.watchEl = watch;
      const att = el('div', 'er-att', 'ATTEMPT 1'); hud.appendChild(att); PA.attEl = att;
      const big = el('div', 'er-bigd'); big.innerHTML = '<div class="lbl">DEATHS</div><div class="big">0</div>'; hud.appendChild(big); PA.bigDeathEl = big.querySelector('.big');
      const rage = el('div', 'er-rage'); rage.innerHTML = '<div class="track"><div class="fill"></div></div><div class="lab"></div>'; hud.appendChild(rage);
      PA.rageFill = rage.querySelector('.fill'); PA.rageLab = rage.querySelector('.lab');
      const dock = el('div', 'er-dock');
      ['💀', '🔥', '😂', '😭', '👏'].forEach(e => { const b = el('div', 'er-emo', e); b.onclick = () => send('party.react', { emote: e }); dock.appendChild(b); });
      hud.appendChild(dock);
      const feed = el('div', 'er-feed'); hud.appendChild(feed); PA.feedEl = feed;
      renderWatchChips();
    }
  }

  function renderWatchChips() {
    if (!PA.watchEl) return; PA.watchEl.innerHTML = '';
    PA.members.filter(m => m.role === 'player').forEach(m => {
      const slot = slotFor(m.id);
      const chip = el('div', 'er-chip', (PA.watchId === m.id ? '▸ ' : '') + slot.s + ' ' + m.name);
      chip.style.borderColor = PA.watchId === m.id ? slot.c : '';
      chip.onclick = () => { PA.watchId = m.id; PA.rageHits = []; renderWatchChips(); };
      PA.watchEl.appendChild(chip);
    });
  }

  // HUD update loop (DOM only; the game runs its own canvas RAF)
  function startLoop() {
    stopLoop();
    const tick = () => {
      updateHUD();
      PA.raf = requestAnimationFrame(tick);
    };
    PA.raf = requestAnimationFrame(tick);
  }
  function stopLoop() { if (PA.raf) cancelAnimationFrame(PA.raf); PA.raf = 0; }

  function updateHUD() {
    if (PA.phase === 'playing' && PA.game) {
      const G = PA.game.state;
      if (PA.deathEl) PA.deathEl.textContent = G.deathsThisRun;
      // progress markers
      const me = { id: PA.me, progress: (G.level && G.level.finish) ? Math.min(1, G.player.x / (G.level.finish.x || 1)) : 0, color: myColor(), shape: (SLOTS[PA.members.filter(m=>m.role==='player').findIndex(m=>m.id===PA.me)]||SLOTS[0]).s };
      const all = [me];
      for (const id in PA.peers) { const pe = PA.peers[id]; all.push({ id, progress: pe.progress || 0, color: pe.color, shape: pe.shape }); }
      if (PA.bar) {
        PA.bar.innerHTML = '';
        all.forEach(a => { const mk = el('div', 'er-mk', a.shape); mk.style.left = (a.progress * 100) + '%'; mk.style.color = a.color; PA.bar.appendChild(mk); });
        const flag = el('div', 'er-mk', '🏁'); flag.style.left = '100%'; PA.bar.appendChild(flag);
      }
      // place
      const sorted = all.slice().sort((a, b) => b.progress - a.progress);
      const place = sorted.findIndex(a => a.id === PA.me) + 1;
      if (PA.placeEl) PA.placeEl.textContent = ['', '1st', '2nd', '3rd', '4th'][place] || (place + 'th');
      // rivals deaths
      if (PA.rivEl) PA.rivEl.innerHTML = Object.keys(PA.peers).map(id => { const pe = PA.peers[id]; return `<span style="color:${pe.color}">${pe.shape} ☠${pe.deaths || 0}</span>`; }).join(' ');
    } else if (PA.phase === 'spectate') {
      const pe = PA.peers[PA.watchId];
      const deaths = pe ? (pe.deaths || 0) : 0;
      if (PA.bigDeathEl) PA.bigDeathEl.textContent = deaths;
      if (PA.attEl) PA.attEl.textContent = 'ATTEMPT ' + (deaths + 1);
      // rage meter from recent deaths of the watched runner
      const now = performance.now();
      PA.rageHits = PA.rageHits.filter(t => now - t < 12000);
      const rage = Math.min(1, PA.rageHits.length / 8);
      if (PA.rageFill) {
        PA.rageFill.style.width = (rage * 100) + '%';
        const band = RAGE_BANDS.find(b => rage <= b[0]) || RAGE_BANDS[RAGE_BANDS.length - 1];
        PA.rageFill.style.background = band[2];
        PA.rageLab.textContent = band[1]; PA.rageLab.style.color = band[2];
      }
    }
  }

  function floatEmote(emote, name) {
    if (!PA.hud) return;
    const f = el('div', 'er-float', emote);
    f.style.left = (8 + Math.random() * 84) + '%'; f.style.bottom = '20%';
    PA.hud.appendChild(f); setTimeout(() => f.remove(), 2000);
    if (PA.feedEl) {
      PA.feed.push(`${name || ''}: ${emote}`); PA.feed = PA.feed.slice(-5);
      PA.feedEl.innerHTML = PA.feed.map(x => `<div>${x}</div>`).join('');
    }
  }

  function showResults(data) {
    PA.phase = 'results'; stopLoop();
    if (PA.game) { try { PA.game.destroy(); } catch (e) {} PA.game = null; }
    if (PA.hud) { PA.hud.remove(); PA.hud = null; }
    const order = data.order || [];
    const margin = order.length > 1 ? Math.abs((order[1].time || 0) - (order[0].time || 0)) : 99;
    const tier = margin < 0.4 ? ['PHOTO FINISH', '#ffd700'] : margin < 1.5 ? ['CLUTCH', '#ffb347'] : margin < 4 ? ['SOLID', '#00fff7'] : ['CHILL', '#7CFFCB'];
    const wrap = el('div', 'er-results');
    wrap.appendChild(el('div', 'er-title', data.mode === 'coop' ? 'LEVEL CLEARED' : 'RACE COMPLETE'));
    order.forEach((o, i) => {
      const slot = slotFor(o.id);
      const row = el('div', 'er-rrow' + (i === 0 ? ' win' : ''));
      const medal = ['🥇', '🥈', '🥉', '4'][i] || (i + 1);
      row.innerHTML = `<span style="font-size:20px">${medal}</span>` +
        `<span style="color:${slot.c};flex:1;text-align:left;font-weight:700">${slot.s} ${o.name || 'Runner'}</span>` +
        `<span>${o.time != null ? o.time.toFixed(1) + 's' : 'DNF'}</span>` +
        `<span style="color:#ff6ec7">☠${o.deaths || 0}</span>` +
        `<span style="color:#ffd700">◈${o.coins || 0}</span>`;
      wrap.appendChild(row);
    });
    wrap.appendChild(el('div', 'er-title', tier[0] + (margin < 4 ? ` — ${margin.toFixed(1)}s` : ''))).style.color = tier[1];
    const row = el('div', 'er-row');
    if (PA.isHost) { const rm = el('div', 'er-btn primary', '🔁 Rematch'); rm.onclick = () => send('party.rematch', {}); row.appendChild(rm); }
    const lob = el('div', 'er-btn ghost', 'Back to lobby'); lob.onclick = () => send('party.rematch', {}); row.appendChild(lob);
    wrap.appendChild(row);
    PA.root.appendChild(wrap);
  }

  // ─────────────────────────────────────────── inbound messages ────────────
  function onMessage(msg) {
    switch (msg.type) {
      case 'party.created':
        PA.code = msg.code; PA.me = msg.you; PA.isHost = true; PA.role = 'player';
        PA.mode = msg.mode; PA.difficulty = msg.difficulty;
        if (!PA.root) open({});
        break;
      case 'party.joined':
        PA.code = msg.code; PA.me = msg.you; PA.isHost = !!msg.isHost; PA.role = msg.role || 'player';
        PA.mode = msg.mode; PA.difficulty = msg.difficulty;
        if (!PA.root) open({});
        if (msg.phase === 'playing') { /* will get party.started snapshot next */ }
        break;
      case 'party.lobby':
        PA.code = msg.code; PA.hostId = msg.hostId; PA.isHost = msg.hostId === PA.me;
        PA.mode = msg.mode; PA.difficulty = msg.difficulty; PA.members = msg.members || [];
        const meM = PA.members.find(m => m.id === PA.me); if (meM) PA.role = meM.role;
        if (PA.phase === 'idle' || PA.phase === 'lobby' || PA.phase === 'results') renderLobby();
        break;
      case 'party.error':
        alert('Party: ' + (msg.reason || 'error').replace(/-/g, ' '));
        break;
      case 'party.countdown':
        if (!PA.root) open({});
        showCountdown(msg.n);
        break;
      case 'party.started':
        PA.mode = msg.mode; PA.difficulty = msg.difficulty;
        // build peer slots from player list
        PA.peers = {};
        (msg.players || []).forEach(pl => {
          const slot = slotFor(pl.id);
          if (pl.id !== PA.me) PA.peers[pl.id] = { x: 60, y: 60, tx: 60, ty: 60, vx: 0, face: 1, alive: true, deaths: 0, progress: 0, color: slot.c, shape: slot.s, name: pl.name };
        });
        showCountdown(0); // GO flash
        setTimeout(() => { if (PA.phase !== 'playing' && PA.phase !== 'spectate') startGame(); }, 350);
        break;
      case 'party.state': {
        const pe = PA.peers[msg.id]; const s = msg.state || {};
        if (pe) { pe.tx = s.x; pe.ty = s.y; pe.vx = s.vx; pe.face = s.face; pe.alive = s.alive !== false; pe.progress = s.progress || 0;
          if ((s.deaths || 0) > (pe.deaths || 0) && msg.id === PA.watchId) PA.rageHits.push(performance.now());
          pe.deaths = s.deaths || 0; }
        break;
      }
      case 'party.react':
        floatEmote(msg.emote, msg.name);
        break;
      case 'party.finished': {
        const b = el('div', 'er-banner'); b.textContent = `${(PA.peers[msg.id] && PA.peers[msg.id].name) || 'A runner'} finished — ${['', '1st', '2nd', '3rd', '4th'][msg.place] || ''}!`;
        b.style.color = slotFor(msg.id).c; if (PA.hud) { PA.hud.appendChild(b); setTimeout(() => b.remove(), 1800); }
        break;
      }
      case 'party.results':
        showResults(msg);
        break;
      case 'party.playerLeft':
        delete PA.peers[msg.id];
        if (PA.phase === 'spectate' && msg.id === PA.watchId) { const pl = PA.members.filter(m => m.role === 'player' && m.id !== msg.id); PA.watchId = pl[0] && pl[0].id; renderWatchChips(); }
        break;
    }
  }

  window.PartyArcade = { open, close, onMessage, joinByCode: c => { open({}); setTimeout(() => send('party.join', { code: c }), 200); } };
  window.openPartyArcade = open;

  // ─── Floor-3 launcher: a neon button that appears on the Arcade floor ─────
  function injectLauncher() {
    injectCSS();
    const btn = el('div', null, '🏁 LIVE GAMES');
    btn.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:8000;padding:10px 16px;border-radius:24px;' +
      'font:700 14px system-ui;color:#06060f;background:linear-gradient(90deg,#00fff7,#ff6ec7);cursor:pointer;' +
      'box-shadow:0 4px 18px rgba(0,255,247,.35);display:none;user-select:none';
    btn.title = 'Play live mini-games with friends';
    btn.onclick = () => { if (!PA.root) open({ context: 'station', onCoins: (n) => { try { window.Coins && window.Coins.earn(n, 'arcade'); } catch (e) {} } }); };
    document.body.appendChild(btn);
    setInterval(() => {
      const onArcade = window.S && window.S.floor === 3;
      btn.style.display = (onArcade && !PA.root) ? 'block' : 'none';
    }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectLauncher);
  else injectLauncher();
})();
