/* ═══════════════════════════════════════════════════════════════════════
   PARTY ARCADE — live multiplayer mini-game sessions.

   Layers a room-code lobby + session relay on top of the existing raw
   WebSocket server in server.js (the `/ws` transport). No new deps, no
   Socket.IO. Friends create a room, share a 4-char code/link, join from
   their own devices (players or spectators), and play together.

   Netcode model (friendly, not anti-cheat): for movement-heavy games like
   the platformer, each client is authoritative over its OWN avatar and
   reports lightweight state (x, y, deaths, progress, finished) a few times
   a second; the server relays those to everyone else as "ghosts" and tracks
   finish order. The server owns: codes, membership, start sync (shared seed
   + countdown), reaction fan-out, and results. This keeps it tractable and
   fully testable without running physics on the server.

   Wire-up in server.js:
     const createPartyArcade = require('./src/party-arcade');
     const partyArcade = createPartyArcade({ visitors, broadcast, WebSocket });
     // in visitorWs.on('message'): else if (msg.type?.startsWith('party.')) partyArcade.handle(visitorId, msg);
     // in visitorWs.on('close'):   partyArcade.onDisconnect(visitorId);
   ═══════════════════════════════════════════════════════════════════════ */
'use strict';

// known game metadata for validation (client owns the actual gameplay module)
const GAMES = {
  platformer: { id: 'platformer', name: 'Echo Run', minPlayers: 1, maxPlayers: 4, modes: ['race', 'coop'] },
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
const DIFFICULTIES = ['chill', 'normal', 'hard', 'kaizo'];

function createPartyArcade(deps) {
  const visitors = deps.visitors;                 // Map visitorId -> { ws, name, skin, ... }
  const broadcast = deps.broadcast;               // (msg, excludeId) => void  (unused here, kept for parity)
  const OPEN = (deps.WebSocket && deps.WebSocket.OPEN != null) ? deps.WebSocket.OPEN : 1;

  const rooms = new Map();        // code -> room
  const playerRoom = new Map();   // visitorId -> code

  function send(id, msg) {
    const v = visitors.get(id);
    if (v && v.ws && v.ws.readyState === OPEN) {
      try { v.ws.send(JSON.stringify(msg)); } catch (e) { /* socket gone */ }
    }
  }
  function sendRoom(room, msg, exceptId) {
    for (const id of room.members.keys()) if (id !== exceptId) send(id, msg);
  }

  function genCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    } while (rooms.has(code));
    return code;
  }

  function memberMeta(id, role, ready) {
    const v = visitors.get(id) || {};
    return { id, name: v.name || 'Visitor', skin: v.skin || 'classic', role: role || 'player', ready: !!ready };
  }

  function lobbyPayload(room) {
    return {
      type: 'party.lobby',
      code: room.code,
      gameId: room.gameId,
      mode: room.mode,
      difficulty: room.difficulty,
      hostId: room.hostId,
      phase: room.phase,
      members: [...room.members.values()].map(m => ({ id: m.id, name: m.name, skin: m.skin, role: m.role, ready: m.ready })),
    };
  }
  function broadcastLobby(room) { sendRoom(room, lobbyPayload(room)); }

  function leaveCurrentRoom(id, opts) {
    const code = playerRoom.get(id);
    if (!code) return;
    const room = rooms.get(code);
    playerRoom.delete(id);
    if (!room) return;
    room.members.delete(id);
    if (room.members.size === 0) { stopTick(room); rooms.delete(code); return; }
    // reassign host if needed
    if (room.hostId === id) {
      room.hostId = [...room.members.keys()][0];
    }
    if (!opts || !opts.silent) sendRoom(room, { type: 'party.playerLeft', id });
    // if a race was in progress and only spectators / <1 player remain, fall back to lobby
    if (room.phase === 'playing' && [...room.members.values()].filter(m => m.role === 'player').length < 1) {
      endToLobby(room);
    } else {
      broadcastLobby(room);
    }
  }

  // ── lobby / session lifecycle ────────────────────────────────────────────
  function create(id, msg) {
    leaveCurrentRoom(id, { silent: true });
    const gameId = (GAMES[msg.gameId] ? msg.gameId : 'platformer');
    const game = GAMES[gameId];
    const code = genCode();
    const room = {
      code, hostId: id, gameId,
      mode: game.modes.includes(msg.mode) ? msg.mode : game.modes[0],
      difficulty: DIFFICULTIES.includes(msg.difficulty) ? msg.difficulty : 'normal',
      phase: 'lobby',
      members: new Map(),
      seed: Math.floor(Math.random() * 1e9),
      seq: 0,
      finishers: [],
      tickTimer: null,
      createdAt: Date.now(),
    };
    room.members.set(id, memberMeta(id, 'player', false));
    rooms.set(code, room);
    playerRoom.set(id, code);
    send(id, { type: 'party.created', code, you: id, isHost: true, gameId, mode: room.mode, difficulty: room.difficulty });
    broadcastLobby(room);
  }

  function join(id, msg, asSpectator) {
    const code = String(msg.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return send(id, { type: 'party.error', reason: 'no-such-room' });
    const game = GAMES[room.gameId];
    const players = [...room.members.values()].filter(m => m.role === 'player').length;
    const wantSpectate = asSpectator || room.phase !== 'lobby';
    if (!wantSpectate && players >= game.maxPlayers) {
      return send(id, { type: 'party.error', reason: 'room-full' });
    }
    leaveCurrentRoom(id, { silent: true });
    room.members.set(id, memberMeta(id, wantSpectate ? 'spectator' : 'player', false));
    playerRoom.set(id, code);
    send(id, {
      type: 'party.joined', code, you: id, isHost: room.hostId === id,
      gameId: room.gameId, mode: room.mode, difficulty: room.difficulty,
      role: wantSpectate ? 'spectator' : 'player', phase: room.phase,
    });
    broadcastLobby(room);
    // if joining mid-game as spectator, hand them the current state snapshot
    if (room.phase === 'playing') {
      send(id, { type: 'party.started', gameId: room.gameId, mode: room.mode, difficulty: room.difficulty, seed: room.seed, players: playerIds(room) });
    }
  }

  function playerIds(room) {
    return [...room.members.values()].filter(m => m.role === 'player').map(m => ({ id: m.id, name: m.name, skin: m.skin }));
  }

  function setReady(id, msg) {
    const room = roomOf(id); if (!room) return;
    const m = room.members.get(id); if (!m) return;
    m.ready = !!msg.ready;
    broadcastLobby(room);
  }

  function setRole(id, msg) {
    const room = roomOf(id); if (!room || room.phase !== 'lobby') return;
    const m = room.members.get(id); if (!m) return;
    const want = msg.role === 'spectator' ? 'spectator' : 'player';
    if (want === 'player') {
      const players = [...room.members.values()].filter(x => x.role === 'player').length;
      if (players >= GAMES[room.gameId].maxPlayers) return send(id, { type: 'party.error', reason: 'room-full' });
    }
    m.role = want; m.ready = false;
    broadcastLobby(room);
  }

  function setMode(id, msg) {
    const room = roomOf(id); if (!room || room.hostId !== id || room.phase !== 'lobby') return;
    const game = GAMES[room.gameId];
    if (msg.mode && game.modes.includes(msg.mode)) room.mode = msg.mode;
    if (msg.difficulty && DIFFICULTIES.includes(msg.difficulty)) room.difficulty = msg.difficulty;
    broadcastLobby(room);
  }

  function start(id) {
    const room = roomOf(id); if (!room || room.hostId !== id || room.phase !== 'lobby') return;
    const players = [...room.members.values()].filter(m => m.role === 'player');
    if (players.length < 1) return send(id, { type: 'party.error', reason: 'need-players' });
    room.phase = 'countdown';
    room.finishers = [];
    room.seed = Math.floor(Math.random() * 1e9);
    room.liveState = {};
    let n = 3;
    sendRoom(room, { type: 'party.countdown', n });
    room.tickTimer = setInterval(() => {
      n--;
      if (n > 0) { sendRoom(room, { type: 'party.countdown', n }); return; }
      clearInterval(room.tickTimer); room.tickTimer = null;
      room.phase = 'playing';
      sendRoom(room, {
        type: 'party.started', gameId: room.gameId, mode: room.mode,
        difficulty: room.difficulty, seed: room.seed, players: playerIds(room),
      });
    }, 1000);
  }

  // relayed per-player live state (x, y, deaths, progress, finished). Authoritative over self.
  function input(id, msg) {
    const room = roomOf(id); if (!room || room.phase !== 'playing') return;
    const m = room.members.get(id); if (!m || m.role !== 'player') return;
    const s = msg.state || {};
    room.liveState = room.liveState || {};
    room.liveState[id] = { x: s.x, y: s.y, vx: s.vx, deaths: s.deaths, progress: s.progress, name: m.name, skin: m.skin };
    // relay to everyone else (players + spectators)
    sendRoom(room, { type: 'party.state', id, state: room.liveState[id], seq: ++room.seq }, id);
    // finish detection
    if (s.finished && !room.finishers.find(f => f.id === id)) {
      room.finishers.push({ id, name: m.name, time: s.time, deaths: s.deaths, coins: s.coins });
      sendRoom(room, { type: 'party.finished', id, place: room.finishers.length, time: s.time, deaths: s.deaths });
      maybeResults(room);
    }
  }

  function maybeResults(room) {
    const players = [...room.members.values()].filter(m => m.role === 'player');
    const allDone = players.every(p => room.finishers.find(f => f.id === p.id));
    // race ends when the first finishes (others still get to finish for placing) — but
    // emit final results when everyone has finished, OR keep a short grace then end.
    if (allDone) emitResults(room);
  }

  function emitResults(room) {
    if (room.phase === 'results') return;
    room.phase = 'results';
    const order = room.finishers.slice().map((f, i) => ({ place: i + 1, ...f }));
    sendRoom(room, { type: 'party.results', mode: room.mode, difficulty: room.difficulty, order });
  }

  function rematch(id) {
    const room = roomOf(id); if (!room || room.hostId !== id) return;
    endToLobby(room);
  }

  function endToLobby(room) {
    stopTick(room);
    room.phase = 'lobby';
    room.finishers = [];
    room.liveState = {};
    for (const m of room.members.values()) m.ready = false;
    broadcastLobby(room);
  }

  function react(id, msg) {
    const room = roomOf(id); if (!room) return;
    const m = room.members.get(id); if (!m) return;
    // light validation: a short emote string
    const emote = String(msg.emote || '').slice(0, 16);
    if (!emote) return;
    sendRoom(room, { type: 'party.react', from: id, name: m.name, emote, target: msg.target || null });
  }

  function stopTick(room) { if (room.tickTimer) { clearInterval(room.tickTimer); room.tickTimer = null; } }
  function roomOf(id) { const c = playerRoom.get(id); return c ? rooms.get(c) : null; }

  // ── public API ─────────────────────────────────────────────────────────
  function handle(id, msg) {
    switch (msg.type) {
      case 'party.create':   return create(id, msg);
      case 'party.join':     return join(id, msg, false);
      case 'party.spectate': return join(id, msg, true);
      case 'party.setReady': return setReady(id, msg);
      case 'party.setRole':  return setRole(id, msg);
      case 'party.setMode':  return setMode(id, msg);
      case 'party.start':    return start(id);
      case 'party.input':    return input(id, msg);
      case 'party.react':    return react(id, msg);
      case 'party.rematch':  return rematch(id);
      case 'party.leave':    return leaveCurrentRoom(id);
      default: return;
    }
  }
  function onDisconnect(id) { leaveCurrentRoom(id); }

  return {
    handle, onDisconnect,
    // exposed for tests / introspection
    _rooms: rooms, _playerRoom: playerRoom, GAMES,
  };
}

module.exports = createPartyArcade;
module.exports.GAMES = GAMES;
