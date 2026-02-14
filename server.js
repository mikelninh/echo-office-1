const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

// Read auth token from openclaw config
function getToken() {
  if (process.env.OPENCLAW_TOKEN) return process.env.OPENCLAW_TOKEN;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'openclaw.json'), 'utf8'));
    return cfg.gateway?.auth?.token;
  } catch { return null; }
}

const TOKEN = getToken();
if (!TOKEN && process.env.CHAT_MODE === 'gateway') { console.error('No auth token found'); process.exit(1); }

const GATEWAY_URL = process.env.GATEWAY_URL || 'ws://127.0.0.1:18789';
const PORT = process.env.PORT || 8765;
// Chat mode: 'local' = keyword responses only (no gateway), 'gateway' = forward to OpenClaw
const CHAT_MODE = process.env.CHAT_MODE || 'local';
const SESSION_KEY = 'agent:main:main'; // Only used if CHAT_MODE=gateway

// ═══ MULTIPLAYER ═══
const visitors = new Map(); // visitorId -> { ws, name, x, y, dir, floor, skin, lastUpdate, lastBroadcast, saber, duelState }
const activeDuels = new Map(); // duelId -> { participants: [id1, id2], state, round, hp, etc }

function genVisitorId() {
  return crypto.randomBytes(4).toString('hex');
}

function broadcast(msg, excludeId) {
  const data = JSON.stringify(msg);
  for (const [id, v] of visitors) {
    if (id !== excludeId && v.ws.readyState === WebSocket.OPEN) {
      v.ws.send(data);
    }
  }
}

function broadcastFloorPresence() {
  const floorMap = {};
  for (const [id, v] of visitors) {
    if (!floorMap[v.floor]) floorMap[v.floor] = [];
    floorMap[v.floor].push({ name: v.name, id });
  }
  broadcast({ type: 'floor.presence', floors: floorMap, total: visitors.size });
}

// Guestbook - persisted to file
const GUESTBOOK_PATH = path.join(__dirname, 'guestbook.json');
function loadGuestbook() {
  try { return JSON.parse(fs.readFileSync(GUESTBOOK_PATH, 'utf8')); } catch { return []; }
}
function saveGuestbook(entries) {
  fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(entries.slice(-100))); // keep last 100
}

// Pixel Wall - collaborative canvas
const PIXELWALL_PATH = path.join(__dirname, 'pixelwall.json');
function loadPixelWall() {
  try { 
    return JSON.parse(fs.readFileSync(PIXELWALL_PATH, 'utf8')); 
  } catch { 
    return { 
      pixels: new Array(64*64).fill(0), // 64x64 canvas, 0 = transparent 
      history: [] // last 200 actions with timestamps
    }; 
  }
}
function savePixelWall(data) {
  // Keep only last 200 history entries
  if (data.history.length > 200) {
    data.history = data.history.slice(-200);
  }
  fs.writeFileSync(PIXELWALL_PATH, JSON.stringify(data));
}

// Visitor Memory - Echo remembers visitors
const VISITOR_MEMORY_PATH = path.join(__dirname, 'visitor-memory.json');
function loadVisitorMemory() {
  try { return JSON.parse(fs.readFileSync(VISITOR_MEMORY_PATH, 'utf8')); } catch { return {}; }
}
function saveVisitorMemory(memory) {
  fs.writeFileSync(VISITOR_MEMORY_PATH, JSON.stringify(memory));
}

// Station Stats - Persistent world metrics
const STATION_STATS_PATH = path.join(__dirname, 'station-stats.json');
function loadStationStats() {
  try { 
    return JSON.parse(fs.readFileSync(STATION_STATS_PATH, 'utf8')); 
  } catch { 
    return {
      totalVisitors: 0,
      totalVisits: 0,
      totalDuels: 0,
      totalClashes: 0,
      stationLevel: 1,
      milestones: [],
      createdAt: Date.now(),
      uniqueVisitors: new Set()
    }; 
  }
}

// Duel Leaderboard
const DUEL_LEADERBOARD_PATH = path.join(__dirname, 'duel-leaderboard.json');
function loadDuelLeaderboard() {
  try {
    return JSON.parse(fs.readFileSync(DUEL_LEADERBOARD_PATH, 'utf8'));
  } catch {
    return [];
  }
}
function saveDuelLeaderboard(leaderboard) {
  fs.writeFileSync(DUEL_LEADERBOARD_PATH, JSON.stringify(leaderboard));
}
function updateDuelStats(winnerName, loserName) {
  const leaderboard = loadDuelLeaderboard();
  
  // Update winner
  let winner = leaderboard.find(p => p.name === winnerName);
  if (!winner) {
    winner = { name: winnerName, wins: 0, losses: 0, winStreak: 0 };
    leaderboard.push(winner);
  }
  winner.wins++;
  winner.winStreak++;
  
  // Update loser
  let loser = leaderboard.find(p => p.name === loserName);
  if (!loser) {
    loser = { name: loserName, wins: 0, losses: 0, winStreak: 0 };
    leaderboard.push(loser);
  }
  loser.losses++;
  loser.winStreak = 0;
  
  // Sort by wins, then by win rate
  leaderboard.sort((a, b) => {
    const winRateA = a.wins / (a.wins + a.losses);
    const winRateB = b.wins / (b.wins + b.losses);
    if (b.wins !== a.wins) return b.wins - a.wins;
    return winRateB - winRateA;
  });
  
  saveDuelLeaderboard(leaderboard);
}

// Marketplace Storage
const MARKETPLACE_PATH = path.join(__dirname, 'marketplace.json');
function loadMarketplace() {
  try { return JSON.parse(fs.readFileSync(MARKETPLACE_PATH, 'utf8')); } catch { return []; }
}
function saveMarketplace(listings) {
  fs.writeFileSync(MARKETPLACE_PATH, JSON.stringify(listings));
}

// ═══ ACCOUNT SYSTEM (Station Pass) ═══
const ACCOUNTS_DIR = path.join(__dirname, 'accounts');
if (!fs.existsSync(ACCOUNTS_DIR)) {
  fs.mkdirSync(ACCOUNTS_DIR);
}

function generatePassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'ECHO-' + code.slice(0,4) + code.slice(4);
}

function loadAccount(passCode) {
  try {
    const fp = path.join(ACCOUNTS_DIR, `${passCode}.json`);
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch { return null; }
}

function saveAccount(passCode, data) {
  const fp = path.join(ACCOUNTS_DIR, `${passCode}.json`);
  fs.writeFileSync(fp, JSON.stringify(data));
}

// User Rooms Storage
const ROOMS_DIR = path.join(__dirname, 'rooms');
if (!fs.existsSync(ROOMS_DIR)) {
  fs.mkdirSync(ROOMS_DIR);
}

function loadRoom(ownerName) {
  try {
    const roomPath = path.join(ROOMS_DIR, `${ownerName}.json`);
    return JSON.parse(fs.readFileSync(roomPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveRoom(ownerName, roomData) {
  const roomPath = path.join(ROOMS_DIR, `${ownerName}.json`);
  fs.writeFileSync(roomPath, JSON.stringify(roomData));
}

function listPublicRooms() {
  try {
    const files = fs.readdirSync(ROOMS_DIR);
    const rooms = [];
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const roomData = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, file), 'utf8'));
          if (roomData.isPublic) {
            rooms.push({
              owner: roomData.owner,
              name: roomData.name,
              likes: roomData.likes || 0,
              visitors: roomData.visitors || 0,
              earnings: roomData.earnings || 0,
              tipTotal: roomData.tipTotal || 0,
              createdAt: roomData.createdAt,
              avgRating: roomData.avgRating || 0,
              ratingCount: roomData.ratingCount || 0,
              tier: roomData.tier || 'starter',
              entryFee: roomData.entryFee || 0,
              featuredUntil: roomData.featuredUntil || 0
            });
          }
        } catch (error) {
          console.error('Error reading room file:', file, error);
        }
      }
    });
    
    // Sort by visitors, then by likes
    rooms.sort((a, b) => {
      if (b.visitors !== a.visitors) return b.visitors - a.visitors;
      return b.likes - a.likes;
    });
    
    return rooms;
  } catch {
    return [];
  }
}
function saveStationStats(stats) {
  // Convert Set to Array for JSON serialization
  const statsToSave = {
    ...stats,
    uniqueVisitors: Array.from(stats.uniqueVisitors || [])
  };
  fs.writeFileSync(STATION_STATS_PATH, JSON.stringify(statsToSave));
}
function checkMilestones(stats) {
  const newMilestones = [];
  const milestones = [
    { id: 'first_crew', threshold: 10, name: 'First Crew' },
    { id: 'pixel_talks', threshold: 25, name: 'Pixel Talks' },
    { id: 'garden_bloom', threshold: 50, name: 'Garden Bloom' },
    { id: 'golden_hull', threshold: 100, name: 'Golden Hull' },
    { id: 'echo_band', threshold: 250, name: 'Echo Band' },
    { id: 'portal_open', threshold: 500, name: 'Portal Open' },
    { id: 'pixel_kittens', threshold: 1000, name: 'Pixel Kittens' },
    { id: 'ascension', threshold: 10000, name: 'The Ascension' }
  ];
  
  milestones.forEach(milestone => {
    if (stats.totalVisitors >= milestone.threshold && !stats.milestones.includes(milestone.id)) {
      stats.milestones.push(milestone.id);
      newMilestones.push(milestone);
    }
  });
  
  return newMilestones;
}

// MIME types
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

// HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // ═══ Account (Station Pass) API ═══
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/api/account/create' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, skin } = JSON.parse(body);
        if (!name || name.length > 20) { res.writeHead(400); res.end('Invalid name'); return; }
        // Generate unique pass code
        let passCode;
        let attempts = 0;
        do { passCode = generatePassCode(); attempts++; } while (loadAccount(passCode) && attempts < 100);
        if (attempts >= 100) { res.writeHead(500); res.end('Could not generate unique code'); return; }
        const now = new Date().toISOString();
        const account = {
          passCode,
          name: name.slice(0, 20),
          skin: skin || 'hooded',
          coins: 0,
          lifetimeCoins: 0,
          inventory: [],
          accessories: {},
          equippedAccessories: { hat: null, trail: null, aura: null, pet: null },
          equippedWeapon: null,
          weapons: [],
          lootInventory: [],
          equippedLoot: {},
          visitorSkinsOwned: [],
          ownedFurniture: [],
          highScores: { snake: 0, breakout: 0, invaders: 0 },
          roomData: {},
          stats: { duelsWon: 0, duelsLost: 0, totalDamage: 0, winStreak: 0 },
          loginStreak: 0,
          lastLoginDay: null,
          createdAt: now,
          lastLogin: now
        };
        saveAccount(passCode, account);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, passCode, accountId: passCode }));
      } catch (e) { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  if (req.url === '/api/account/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { passCode } = JSON.parse(body);
        if (!passCode) { res.writeHead(400); res.end('Missing passCode'); return; }
        const account = loadAccount(passCode.toUpperCase());
        if (!account) { res.writeHead(404); res.end('Account not found'); return; }
        // Update login info
        const today = new Date().toISOString().slice(0, 10);
        const lastDay = account.lastLoginDay;
        if (lastDay && lastDay !== today) {
          const diff = Math.floor((new Date(today) - new Date(lastDay)) / (1000*60*60*24));
          if (diff === 1) account.loginStreak = (account.loginStreak || 0) + 1;
          else if (diff > 1) account.loginStreak = 0;
        }
        account.lastLogin = new Date().toISOString();
        account.lastLoginDay = today;
        saveAccount(passCode.toUpperCase(), account);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, account }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  if (req.url === '/api/account/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { passCode, data } = JSON.parse(body);
        if (!passCode || !data) { res.writeHead(400); res.end('Missing fields'); return; }
        const existing = loadAccount(passCode.toUpperCase());
        if (!existing) { res.writeHead(404); res.end('Account not found'); return; }
        // Merge saveable fields (don't allow changing passCode or createdAt)
        const safeFields = ['coins','lifetimeCoins','inventory','accessories','equippedAccessories',
          'equippedWeapon','weapons','lootInventory','equippedLoot','visitorSkinsOwned','ownedFurniture',
          'highScores','roomData','stats','loginStreak','lastLoginDay','skin','name'];
        safeFields.forEach(f => { if (data[f] !== undefined) existing[f] = data[f]; });
        existing.lastLogin = new Date().toISOString();
        saveAccount(passCode.toUpperCase(), existing);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  if (req.url.match(/^\/api\/account\/[A-Z0-9-]+$/) && req.method === 'GET') {
    const passCode = decodeURIComponent(req.url.split('/').pop()).toUpperCase();
    const account = loadAccount(passCode);
    if (!account) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(account));
    return;
  }

  // Guestbook API
  if (req.url === '/api/guestbook' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadGuestbook()));
    return;
  }
  if (req.url === '/api/guestbook' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, msg } = JSON.parse(body);
        if (!msg || msg.length > 100) { res.writeHead(400); res.end('Bad request'); return; }
        const entries = loadGuestbook();
        entries.push({ name: (name || 'Anonymous').slice(0, 20), msg: msg.slice(0, 100), time: Date.now() });
        saveGuestbook(entries);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Pixel Wall API
  if (req.url === '/api/pixelwall' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadPixelWall()));
    return;
  }
  if (req.url === '/api/pixelwall' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { x, y, color, visitorName } = JSON.parse(body);
        if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'number' || 
            x < 0 || x >= 64 || y < 0 || y >= 64 || color < 0 || color > 15) {
          res.writeHead(400); res.end('Bad request'); return;
        }
        
        const data = loadPixelWall();
        const idx = y * 64 + x;
        const oldColor = data.pixels[idx];
        data.pixels[idx] = color;
        
        // Add to history for time-lapse
        data.history.push({
          x, y, color, oldColor,
          visitor: (visitorName || 'Anonymous').slice(0, 20),
          timestamp: Date.now()
        });
        
        savePixelWall(data);
        
        // Broadcast pixel change to all connected visitors
        broadcast({
          type: 'pixelwall.update',
          x, y, color,
          visitor: visitorName || 'Anonymous'
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Station Stats API
  if (req.url === '/api/station-stats' && req.method === 'GET') {
    const stats = loadStationStats();
    // Convert unique visitors Set back to proper Set if it was loaded as Array
    if (Array.isArray(stats.uniqueVisitors)) {
      stats.uniqueVisitors = new Set(stats.uniqueVisitors);
    }
    // Return public stats without internal data
    const publicStats = {
      totalVisitors: stats.totalVisitors,
      totalVisits: stats.totalVisits,
      totalDuels: stats.totalDuels,
      totalClashes: stats.totalClashes,
      stationLevel: stats.stationLevel,
      milestones: stats.milestones,
      createdAt: stats.createdAt
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(publicStats));
    return;
  }
  if (req.url === '/api/station-stats/visit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { visitorName } = JSON.parse(body);
        if (!visitorName || visitorName === 'Visitor') {
          res.writeHead(400); 
          res.end('Bad request'); 
          return;
        }
        
        const stats = loadStationStats();
        // Convert array to Set if needed
        if (Array.isArray(stats.uniqueVisitors)) {
          stats.uniqueVisitors = new Set(stats.uniqueVisitors);
        }
        
        // Check if new visitor
        const isNewVisitor = !stats.uniqueVisitors.has(visitorName);
        if (isNewVisitor) {
          stats.uniqueVisitors.add(visitorName);
          stats.totalVisitors++;
        }
        stats.totalVisits++;
        
        // Check for new milestones
        const newMilestones = checkMilestones(stats);
        
        saveStationStats(stats);
        
        // Broadcast milestone unlocks to all connected visitors
        if (newMilestones.length > 0) {
          newMilestones.forEach(milestone => {
            broadcast({
              type: 'milestone.unlocked',
              milestone: milestone
            });
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          ok: true, 
          isNewVisitor, 
          newMilestones: newMilestones.map(m => m.id)
        }));
      } catch { 
        res.writeHead(400); 
        res.end('Bad request'); 
      }
    });
    return;
  }

  // Duel Leaderboard API
  if (req.url === '/api/duel-leaderboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadDuelLeaderboard()));
    return;
  }

  // Room leaderboard endpoint (must be before generic room GET)
  if (req.url === '/api/rooms/leaderboard' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(ROOMS_DIR);
      const rooms = [];
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const roomData = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, file), 'utf8'));
            rooms.push({
              owner: roomData.owner,
              name: roomData.name,
              earnings: roomData.earnings || 0,
              tipTotal: roomData.tipTotal || 0,
              likes: roomData.likes || 0,
              visitors: roomData.visitors || 0
            });
          } catch (error) {
            console.error('Error reading room for leaderboard:', file, error);
          }
        }
      });
      
      rooms.sort((a, b) => b.earnings - a.earnings);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rooms.slice(0, 20)));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // Rooms API
  if (req.url === '/api/rooms' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listPublicRooms()));
    return;
  }

  if (req.url.startsWith('/api/rooms/') && req.method === 'GET') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    const room = loadRoom(ownerName);
    
    if (room) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
    } else {
      res.writeHead(404);
      res.end('Room not found');
    }
    return;
  }

  if (req.url.startsWith('/api/rooms/') && req.method === 'POST' && !req.url.includes('/like') && !req.url.includes('/visit') && !req.url.includes('/earn') && !req.url.includes('/tip') && !req.url.includes('/rate') && !req.url.includes('/settings')) {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const roomData = JSON.parse(body);
        
        // Validate room data
        if (!roomData.name || roomData.name.length > 50) {
          res.writeHead(400);
          res.end('Invalid room name');
          return;
        }
        
        if (!roomData.owner || roomData.owner !== ownerName) {
          res.writeHead(403);
          res.end('Access denied');
          return;
        }
        
        // Preserve existing likes, visitor count, earnings, and Phase 2 data
        const existing = loadRoom(ownerName);
        if (existing) {
          roomData.likes = existing.likes || 0;
          roomData.visitors = existing.visitors || 0;
          roomData.earnings = existing.earnings || 0;
          roomData.tipTotal = existing.tipTotal || 0;
          roomData.ratings = existing.ratings || {};
          roomData.avgRating = existing.avgRating || 0;
          roomData.ratingCount = existing.ratingCount || 0;
          roomData.tier = existing.tier || 'starter';
          roomData.entryFee = existing.entryFee || 0;
          roomData.featuredUntil = existing.featuredUntil || 0;
          roomData.tips = existing.tips || [];
          roomData.dailyLikes = existing.dailyLikes || {};
        }
        
        roomData.createdAt = roomData.createdAt || Date.now();
        saveRoom(ownerName, roomData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/like') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { visitor } = JSON.parse(body);
        if (!visitor || visitor === 'Anonymous') {
          res.writeHead(400);
          res.end('Invalid visitor');
          return;
        }
        
        const room = loadRoom(ownerName);
        if (!room) {
          res.writeHead(404);
          res.end('Room not found');
          return;
        }
        
        // Check if already liked today (simple daily limit)
        const today = new Date().toISOString().slice(0, 10);
        if (!room.dailyLikes) room.dailyLikes = {};
        if (room.dailyLikes[today] && room.dailyLikes[today].includes(visitor)) {
          res.writeHead(429);
          res.end('Already liked today');
          return;
        }
        
        // Add like
        room.likes = (room.likes || 0) + 1;
        if (!room.dailyLikes[today]) room.dailyLikes[today] = [];
        room.dailyLikes[today].push(visitor);
        
        saveRoom(ownerName, room);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, likes: room.likes }));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/visit') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { visitor } = JSON.parse(body);
        const room = loadRoom(ownerName);
        
        if (room) {
          room.visitors = (room.visitors || 0) + 1;
          saveRoom(ownerName, room);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, visitors: room.visitors }));
        } else {
          res.writeHead(404);
          res.end('Room not found');
        }
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  // Room earnings endpoint
  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/earn') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { amount, source, visitor } = JSON.parse(body);
        if (typeof amount !== 'number' || amount < 1 || amount > 10) {
          res.writeHead(400); res.end('Invalid amount'); return;
        }
        
        const room = loadRoom(ownerName);
        if (!room) { res.writeHead(404); res.end('Room not found'); return; }
        
        // Don't earn from own room
        if (visitor === ownerName) {
          res.writeHead(400); res.end('Cannot earn from own room'); return;
        }
        
        room.earnings = (room.earnings || 0) + amount;
        saveRoom(ownerName, room);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, earnings: room.earnings }));
      } catch {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // Tip endpoint
  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/tip') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { amount, tipper } = JSON.parse(body);
        if (typeof amount !== 'number' || amount < 1 || amount > 50) {
          res.writeHead(400); res.end('Invalid tip amount (1-50)'); return;
        }
        if (!tipper || tipper === ownerName) {
          res.writeHead(400); res.end('Cannot tip yourself'); return;
        }
        
        const room = loadRoom(ownerName);
        if (!room) { res.writeHead(404); res.end('Room not found'); return; }
        
        room.earnings = (room.earnings || 0) + amount;
        room.tipTotal = (room.tipTotal || 0) + amount;
        if (!room.tips) room.tips = [];
        room.tips.push({ tipper, amount, time: Date.now() });
        // Keep last 50 tips
        if (room.tips.length > 50) room.tips = room.tips.slice(-50);
        saveRoom(ownerName, room);
        
        // Broadcast tip to all connected visitors
        broadcast({
          type: 'room.tip',
          owner: ownerName,
          tipper,
          amount
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, earnings: room.earnings }));
      } catch {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // Room rating endpoint
  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/rate') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { rating, visitor } = JSON.parse(body);
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
          res.writeHead(400); res.end('Invalid rating (1-5)'); return;
        }
        if (!visitor || visitor === ownerName) {
          res.writeHead(400); res.end('Cannot rate own room'); return;
        }
        const room = loadRoom(ownerName);
        if (!room) { res.writeHead(404); res.end('Room not found'); return; }
        if (!room.ratings) room.ratings = {};
        room.ratings[visitor] = { rating, time: Date.now() };
        // Calculate average
        const vals = Object.values(room.ratings).map(r => r.rating);
        room.avgRating = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
        room.ratingCount = vals.length;
        saveRoom(ownerName, room);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, avgRating: room.avgRating, ratingCount: room.ratingCount }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Room update tier/entryFee/featured
  if (req.url.startsWith('/api/rooms/') && req.url.endsWith('/settings') && req.method === 'POST') {
    const ownerName = decodeURIComponent(req.url.split('/')[3]);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const room = loadRoom(ownerName);
        if (!room) { res.writeHead(404); res.end('Room not found'); return; }
        if (typeof data.tier === 'string') room.tier = data.tier;
        if (typeof data.entryFee === 'number') room.entryFee = Math.max(0, Math.min(25, data.entryFee));
        if (typeof data.featuredUntil === 'number') room.featuredUntil = data.featuredUntil;
        saveRoom(ownerName, room);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Visitor Memory API
  if (req.url === '/api/visitor-memory' && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const visitorName = url.searchParams.get('name');
    if (!visitorName) { res.writeHead(400); res.end('Missing name param'); return; }
    
    const memory = loadVisitorMemory();
    const data = memory[visitorName] || {
      lastVisit: 0,
      visitCount: 0,
      highScores: { snake: 0, breakout: 0, invaders: 0 },
      favFloor: 1,
      lastWords: '',
      totalCoins: 0
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }
  if (req.url === '/api/visitor-memory' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { visitorName, lastWords, highScores, favFloor, totalCoins } = JSON.parse(body);
        if (!visitorName) { res.writeHead(400); res.end('Missing visitorName'); return; }
        
        const memory = loadVisitorMemory();
        const existing = memory[visitorName] || { visitCount: 0, lastVisit: 0 };
        
        memory[visitorName] = {
          lastVisit: Date.now(),
          visitCount: existing.visitCount + 1,
          highScores: highScores || existing.highScores || { snake: 0, breakout: 0, invaders: 0 },
          favFloor: favFloor || existing.favFloor || 1,
          lastWords: lastWords || existing.lastWords || '',
          totalCoins: totalCoins || existing.totalCoins || 0
        };
        
        saveVisitorMemory(memory);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Marketplace API
  if (req.url === '/api/marketplace' && req.method === 'GET') {
    const listings = loadMarketplace().filter(l => l.active);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listings));
    return;
  }
  if (req.url === '/api/marketplace/list' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { owner, item, price } = JSON.parse(body);
        if (!owner || !item || typeof price !== 'number' || price < 1 || price > 9999) {
          res.writeHead(400); res.end('Bad request'); return;
        }
        const listings = loadMarketplace();
        // Max 5 active listings per user
        const userActive = listings.filter(l => l.owner === owner && l.active);
        if (userActive.length >= 5) {
          res.writeHead(429); res.end('Too many active listings'); return;
        }
        const listing = {
          id: crypto.randomBytes(8).toString('hex'),
          owner,
          item, // full item object with id, itemId, rarity, stats, type
          price,
          active: true,
          createdAt: Date.now()
        };
        listings.push(listing);
        saveMarketplace(listings);
        // Broadcast new listing
        broadcast({ type: 'marketplace.new', listing: { id: listing.id, owner, price, item } });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: listing.id }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }
  if (req.url.match(/^\/api\/marketplace\/buy\//) && req.method === 'POST') {
    const listingId = req.url.split('/').pop();
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { buyer } = JSON.parse(body);
        if (!buyer) { res.writeHead(400); res.end('Bad request'); return; }
        const listings = loadMarketplace();
        const listing = listings.find(l => l.id === listingId && l.active);
        if (!listing) { res.writeHead(404); res.end('Listing not found'); return; }
        if (listing.owner === buyer) { res.writeHead(400); res.end('Cannot buy own listing'); return; }
        listing.active = false;
        listing.buyer = buyer;
        listing.soldAt = Date.now();
        saveMarketplace(listings);
        // Broadcast sale
        broadcast({ type: 'marketplace.sold', listingId, buyer, seller: listing.owner, price: listing.price });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, item: listing.item, price: listing.price }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }
  if (req.url.match(/^\/api\/marketplace\/cancel\//) && req.method === 'POST') {
    const listingId = req.url.split('/').pop();
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { owner } = JSON.parse(body);
        if (!owner) { res.writeHead(400); res.end('Bad request'); return; }
        const listings = loadMarketplace();
        const listing = listings.find(l => l.id === listingId && l.active && l.owner === owner);
        if (!listing) { res.writeHead(404); res.end('Listing not found'); return; }
        listing.active = false;
        listing.cancelledAt = Date.now();
        saveMarketplace(listings);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // ═══ AI-to-AI Visit API (v25) ═══
  if (req.url === '/api/visit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { name, avatar, message } = JSON.parse(body);
        if (!name || name.length > 30) { res.writeHead(400); res.end('Invalid name'); return; }
        const aiVisitorId = 'ai_' + crypto.randomBytes(4).toString('hex');
        const aiVisitor = {
          id: aiVisitorId,
          name: '[AI] ' + name.slice(0, 25),
          avatar: avatar || 'robot',
          message: (message || '').slice(0, 200),
          arrivedAt: Date.now()
        };
        // Broadcast AI visitor arrival to all connected clients
        broadcast({ type: 'ai.visitor.arrive', visitor: aiVisitor });
        // Record as station visit
        const stats = loadStationStats();
        if (Array.isArray(stats.uniqueVisitors)) stats.uniqueVisitors = new Set(stats.uniqueVisitors);
        const isNew = !stats.uniqueVisitors.has(aiVisitor.name);
        if (isNew) { stats.uniqueVisitors.add(aiVisitor.name); stats.totalVisitors++; }
        stats.totalVisits++;
        const newMilestones = checkMilestones(stats);
        saveStationStats(stats);
        if (newMilestones.length > 0) {
          newMilestones.forEach(m => broadcast({ type: 'milestone.unlocked', milestone: m }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, visitorId: aiVisitorId, isNew, totalVisitors: stats.totalVisitors }));
      } catch (e) { res.writeHead(400); res.end('Bad request: ' + e.message); }
    });
    return;
  }

  // Station events API (v25) - get active events
  if (req.url === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, visitors: visitors.size }));
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', visitors: visitors.size }));
    return;
  }

  // Static files
  const cleanUrl = req.url.split('?')[0]; // Strip query params
  let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const cacheControl = (ext === '.html') ? 'public, max-age=3600' : 'no-cache, no-store, must-revalidate';
    res.writeHead(200, { 
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl
    });
    res.end(data);
  });
});

// WebSocket server for visitors
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (visitorWs) => {
  console.log('Visitor connected');
  const visitorId = genVisitorId();
  visitors.set(visitorId, { 
    ws: visitorWs, name: 'Visitor', x: 350, y: 480, dir: 0, floor: 1, skin: 'classic', 
    lastUpdate: 0, lastBroadcast: 0, connectTime: Date.now() 
  });

  // Send this visitor their ID and all current players
  const playerList = [];
  for (const [id, v] of visitors) {
    if (id !== visitorId) playerList.push({ id, name: v.name, x: v.x, y: v.y, dir: v.dir, floor: v.floor, skin: v.skin });
  }
  visitorWs.send(JSON.stringify({ type: 'players.init', id: visitorId, players: playerList }));

  // Broadcast join to others (with a slight delay so client can set up)
  const vi = visitors.get(visitorId);
  broadcast({ type: 'player.join', player: { id: visitorId, name: vi.name, x: vi.x, y: vi.y, dir: vi.dir, floor: vi.floor, skin: vi.skin } }, visitorId);
  broadcastFloorPresence();

  let gatewayWs = null;
  let authenticated = false;
  let pending = [];

  function connectGateway() {
    gatewayWs = new WebSocket(GATEWAY_URL);

    gatewayWs.on('open', () => {
      console.log('Gateway WS open, waiting for challenge...');
    });

    gatewayWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // Debug: log all non-tick events
        if (msg.event !== 'tick' && msg.event !== 'health') {
          console.log('GW event:', msg.type, msg.event || msg.id || '', JSON.stringify(msg.payload || msg.error || {}).slice(0, 200));
        }

        // Handle connect challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          console.log('Got challenge, sending connect...');
          gatewayWs.send(JSON.stringify({
            type: 'req',
            id: 'connect-1',
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'cli', version: '2026.2.9', platform: 'macos', mode: 'cli' },
              role: 'operator',
              scopes: ['operator.read', 'operator.write'],
              caps: [], commands: [], permissions: {},
              auth: { token: TOKEN },
              locale: 'en-US',
              userAgent: 'echo-office/1.0.0'
            }
          }));
        }

        // Handle connect response
        if (msg.type === 'res' && msg.id === 'connect-1') {
          if (msg.ok) {
            console.log('Gateway authenticated!');
            authenticated = true;
            visitorWs.send(JSON.stringify({ type: 'status', connected: true }));
            // Flush pending messages
            pending.forEach(m => sendChat(m));
            pending = [];
          } else {
            console.error('Gateway auth failed:', msg.error);
            visitorWs.send(JSON.stringify({ type: 'status', connected: false, error: msg.error?.message }));
          }
        }

        // Handle chat response (run started)
        if (msg.type === 'res' && msg.id?.startsWith('chat-')) {
          if (!msg.ok) {
            console.error('Chat send failed:', msg.error);
            visitorWs.send(JSON.stringify({ type: 'chat.error', error: msg.error?.message }));
          }
        }

        // Handle streaming from agent events
        if (msg.type === 'event' && msg.event === 'agent') {
          const p = msg.payload || {};
          if (p.stream === 'assistant' && p.data?.delta) {
            visitorWs.send(JSON.stringify({ type: 'chat.chunk', text: p.data.delta }));
          }
          // Lifecycle end = run complete
          if (p.stream === 'lifecycle' && p.data?.phase === 'end') {
            visitorWs.send(JSON.stringify({ type: 'chat.done' }));
          }
        }

        // Handle chat state events (complete messages)
        if (msg.type === 'event' && msg.event === 'chat') {
          const p = msg.payload || {};
          if (p.state === 'complete' && p.message?.role === 'assistant') {
            const content = p.message.content;
            const text = Array.isArray(content) 
              ? content.filter(c=>c.type==='text').map(c=>c.text).join('') 
              : content;
            if (text) {
              visitorWs.send(JSON.stringify({ type: 'chat.message', content: text }));
              visitorWs.send(JSON.stringify({ type: 'chat.done' }));
            }
          }
        }

        // Handle run complete
        if (msg.type === 'event' && (msg.event === 'chat.run.complete' || msg.event === 'agent.run.complete')) {
          visitorWs.send(JSON.stringify({ type: 'chat.done' }));
        }

      } catch (e) {
        console.error('Gateway message parse error:', e);
      }
    });

    gatewayWs.on('close', () => {
      console.log('Gateway disconnected');
      authenticated = false;
      visitorWs.send(JSON.stringify({ type: 'status', connected: false }));
      // Reconnect after 3s
      setTimeout(() => {
        if (visitorWs.readyState === WebSocket.OPEN) connectGateway();
      }, 3000);
    });

    gatewayWs.on('error', (err) => {
      console.error('Gateway error:', err.message);
      // Don't reconnect if gateway URL isn't explicitly set (Railway etc.)
      if (!process.env.GATEWAY_URL) {
        console.log('No GATEWAY_URL set, disabling gateway reconnect');
        gatewayWs = null;
      }
    });
  }

  function sendChat(message) {
    if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN || !authenticated) {
      pending.push(message);
      return;
    }
    const id = 'chat-' + crypto.randomUUID();
    gatewayWs.send(JSON.stringify({
      type: 'req',
      id,
      method: 'chat.send',
      params: {
        sessionKey: SESSION_KEY,
        message,
        idempotencyKey: crypto.randomUUID()
      }
    }));
  }

  // Handle visitor messages
  visitorWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'chat.send' && msg.message) {
        console.log('Visitor says:', msg.message);
        sendChat(msg.message);
      }
      // Multiplayer: position update
      else if (msg.type === 'player.update') {
        const v = visitors.get(visitorId);
        if (!v) return;
        const oldFloor = v.floor;
        v.x = msg.x; v.y = msg.y; v.dir = msg.dir; v.floor = msg.floor;
        v.skin = msg.skin || v.skin; v.name = msg.name || v.name;
        v.lastUpdate = Date.now();
        // Throttle broadcasts to 10/s per player
        const now = Date.now();
        if (now - v.lastBroadcast >= 100) {
          v.lastBroadcast = now;
          broadcast({ type: 'player.move', id: visitorId, x: v.x, y: v.y, dir: v.dir, floor: v.floor, name: v.name, skin: v.skin }, visitorId);
        }
        // Broadcast floor presence update when floor changes
        if (oldFloor !== v.floor) {
          broadcastFloorPresence();
        }
      }
      else if (msg.type === 'player.swing') {
        // Broadcast swing to all other players
        const v = visitors.get(visitorId);
        if (!v) return;
        broadcast({ type: 'player.swing', id: visitorId, saber: msg.saber, x: v.x, y: v.y, dir: msg.dir, floor: v.floor }, visitorId);
        
        // Check for clash: any other player swinging nearby on same floor?
        for (const [otherId, other] of visitors) {
          if (otherId === visitorId) continue;
          if (other.floor !== v.floor) continue;
          if (!other.saber) continue;
          const dist = Math.hypot(v.x - other.x, v.y - other.y);
          if (dist < 60 && other.lastSwing && Date.now() - other.lastSwing < 800) {
            // CLASH! Broadcast to everyone
            const cx = (v.x + other.x) / 2, cy = (v.y + other.y) / 2;
            const clashMsg = { type: 'saber.clash', x: cx, y: cy, floor: v.floor, players: [visitorId, otherId], sabers: [msg.saber, other.saber] };
            for (const [id2, v2] of visitors) {
              if (v2.ws.readyState === WebSocket.OPEN) v2.ws.send(JSON.stringify(clashMsg));
            }
            
            // Update station stats
            try {
              const stats = loadStationStats();
              if (Array.isArray(stats.uniqueVisitors)) {
                stats.uniqueVisitors = new Set(stats.uniqueVisitors);
              }
              stats.totalClashes++;
              saveStationStats(stats);
            } catch (e) {
              console.error('Failed to update clash stats:', e);
            }
          }
        }
        v.saber = msg.saber;
        v.lastSwing = Date.now();
      }
      else if (msg.type === 'player.saber') {
        // Track which saber a player is holding
        const v = visitors.get(visitorId);
        if (v) { v.saber = msg.saber || null; }
        broadcast({ type: 'player.saber', id: visitorId, saber: msg.saber }, visitorId);
      }
      // Duel system messages
      else if (msg.type === 'duel.request') {
        const challenger = visitors.get(visitorId);
        const target = visitors.get(msg.targetId);
        
        if (challenger && target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'duel.request',
            challengerId: visitorId,
            challengerName: challenger.name
          }));
        }
      }
      else if (msg.type === 'duel.accept') {
        const challenger = visitors.get(msg.challengerId);
        const accepter = visitors.get(visitorId);
        
        if (challenger && accepter) {
          const duelId = `${msg.challengerId}_${visitorId}`;
          activeDuels.set(duelId, {
            participants: [msg.challengerId, visitorId],
            state: 'active',
            round: 1,
            maxRounds: 3,
            hp: { [msg.challengerId]: 100, [visitorId]: 100 },
            wins: { [msg.challengerId]: 0, [visitorId]: 0 },
            startTime: Date.now()
          });
          
          // Notify both players
          const startMsg = {
            type: 'duel.start',
            duelId: duelId,
            participants: [msg.challengerId, visitorId]
          };
          
          challenger.ws.send(JSON.stringify(startMsg));
          accepter.ws.send(JSON.stringify(startMsg));
          
          console.log(`Duel started: ${challenger.name} vs ${accepter.name}`);
        }
      }
      else if (msg.type === 'duel.attack') {
        const duel = Array.from(activeDuels.values()).find(d => d.participants.includes(visitorId));
        if (!duel) return;
        
        const attacker = visitors.get(visitorId);
        const targetId = duel.participants.find(id => id !== visitorId);
        const target = visitors.get(targetId);
        
        if (attacker && target && target.ws.readyState === WebSocket.OPEN) {
          // Server-side hit validation would go here
          // For now, just forward the attack
          target.ws.send(JSON.stringify({
            type: 'duel.attack.incoming',
            attackerId: visitorId,
            damage: msg.damage,
            combo: msg.combo
          }));
        }
      }
      else if (msg.type === 'duel.block') {
        const duel = Array.from(activeDuels.values()).find(d => d.participants.includes(visitorId));
        if (duel) {
          const visitor = visitors.get(visitorId);
          if (visitor) {
            visitor.blocking = msg.holding;
          }
        }
      }
      else if (msg.type === 'duel.end') {
        const duel = Array.from(activeDuels.values()).find(d => d.participants.includes(visitorId));
        if (duel) {
          const winner = visitors.get(visitorId);
          const loserId = duel.participants.find(id => id !== visitorId);
          const loser = visitors.get(loserId);
          
          if (winner && loser && msg.result === 'victory') {
            // Update leaderboard
            updateDuelStats(winner.name, loser.name);
            
            // Update station stats
            const stats = loadStationStats();
            if (Array.isArray(stats.uniqueVisitors)) {
              stats.uniqueVisitors = new Set(stats.uniqueVisitors);
            }
            stats.totalDuels++;
            saveStationStats(stats);
            
            console.log(`Duel completed: ${winner.name} defeated ${loser.name}`);
          }
          
          // Clean up duel
          for (const [duelId, d] of activeDuels.entries()) {
            if (d === duel) {
              activeDuels.delete(duelId);
              break;
            }
          }
        }
      }
    } catch {}
  });

  visitorWs.on('close', () => {
    console.log('Visitor disconnected:', visitorId);
    
    // Save visitor memory on disconnect
    const visitor = visitors.get(visitorId);
    if (visitor && visitor.name && visitor.name !== 'Visitor') {
      try {
        // Update visit stats (this would be sent from client in real implementation)
        const memory = loadVisitorMemory();
        const existing = memory[visitor.name] || { visitCount: 0, lastVisit: 0 };
        
        memory[visitor.name] = {
          ...existing,
          lastVisit: Date.now(),
          visitCount: existing.visitCount + 1,
          sessionDuration: Date.now() - visitor.connectTime
        };
        
        saveVisitorMemory(memory);
      } catch (e) {
        console.error('Error saving visitor memory:', e);
      }
    }
    
    visitors.delete(visitorId);
    broadcast({ type: 'player.leave', id: visitorId });
    broadcastFloorPresence();
    if (gatewayWs) gatewayWs.close();
  });

  if (CHAT_MODE === 'gateway') {
    connectGateway();
  } else {
    // Local mode: tell client we're "connected" so it uses local keyword responses
    visitorWs.send(JSON.stringify({ type: 'status', connected: false }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Echo's Station server running on http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
