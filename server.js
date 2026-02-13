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
if (!TOKEN) { console.error('No auth token found'); process.exit(1); }

const GATEWAY_URL = 'ws://127.0.0.1:18789';
const PORT = 8765;
// Chat mode: 'local' = keyword responses only (no gateway), 'gateway' = forward to OpenClaw
const CHAT_MODE = process.env.CHAT_MODE || 'local';
const SESSION_KEY = 'agent:main:main'; // Only used if CHAT_MODE=gateway

// ═══ MULTIPLAYER ═══
const visitors = new Map(); // visitorId -> { ws, name, x, y, dir, floor, skin, lastUpdate, lastBroadcast }

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
    { id: 'pixel_kittens', threshold: 1000, name: 'Pixel Kittens' }
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

  // Static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
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
        v.x = msg.x; v.y = msg.y; v.dir = msg.dir; v.floor = msg.floor;
        v.skin = msg.skin || v.skin; v.name = msg.name || v.name;
        v.lastUpdate = Date.now();
        // Throttle broadcasts to 10/s per player
        const now = Date.now();
        if (now - v.lastBroadcast >= 100) {
          v.lastBroadcast = now;
          broadcast({ type: 'player.move', id: visitorId, x: v.x, y: v.y, dir: v.dir, floor: v.floor, name: v.name, skin: v.skin }, visitorId);
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
