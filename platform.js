#!/usr/bin/env node
// ═══ ECHO WORLDS — Platform Server ═══
// Integrates: Express + Socket.IO + Discord Bot + Economy + Research
// Run alongside server.js (the original game) or as the main server

const express = require('express');
const http = require('http');
const path = require('path');

// ═══ CONFIG ═══
const PORT = process.env.PLATFORM_PORT || 3000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ═══ EXPRESS APP ═══
const app = express();
const server = http.createServer(app);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ═══ DATABASE ═══
require('./src/database'); // initializes schema on import
console.log('📦 Database initialized');

// ═══ WORLD SERVER (Socket.IO) ═══
const WorldServer = require('./src/world-server');
let bot = null;

// ═══ DISCORD BOT ═══
if (DISCORD_TOKEN) {
  const EchoBot = require('./src/discord/bot');
  const worldServer = new WorldServer(server, null);
  bot = new EchoBot(DISCORD_TOKEN, BASE_URL, worldServer.getIO());
  worldServer.bot = bot;

  bot.start().then(() => {
    console.log('🤖 Discord bot started');
  }).catch(e => {
    console.error('❌ Discord bot failed:', e.message);
    console.log('   Running without Discord integration');
  });
  console.log('🌍 World server started (Socket.IO)');
} else {
  const worldServer = new WorldServer(server, null);
  console.log('⚠️  No DISCORD_TOKEN — running without Discord bot');
  console.log('   Set DISCORD_TOKEN env var to enable Discord integration');
  console.log('🌍 World server started (Socket.IO)');
}

// ═══ API ROUTES ═══
const createAPI = require('./src/api');
app.use(createAPI(bot));

// ═══ SERVE ORIGINAL GAME ═══
// The original Echo Office game is still served at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Floor1.js and other game assets
app.get('/floor1.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'floor1.js'));
});

// ═══ HEALTH CHECK ═══
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Echo Worlds',
    version: '1.0.0',
    uptime: process.uptime(),
    discord: bot ? 'connected' : 'disabled',
    timestamp: new Date().toISOString()
  });
});

// ═══ START ═══
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       🌍 ECHO WORLDS PLATFORM        ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Server:    http://localhost:${PORT}     ║`);
  console.log(`║  Game:      http://localhost:${PORT}/     ║`);
  console.log(`║  Editor:    http://localhost:${PORT}/editor║`);
  console.log(`║  Research:  http://localhost:${PORT}/research/synapse-spotter ║`);
  console.log(`║  Dashboard: http://localhost:${PORT}/dashboard/:id ║`);
  console.log(`║  API:       http://localhost:${PORT}/api/... ║`);
  console.log(`║  Health:    http://localhost:${PORT}/health ║`);
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Discord:   ${DISCORD_TOKEN ? '✅ Enabled' : '⚠️  No token'}          ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, server };
