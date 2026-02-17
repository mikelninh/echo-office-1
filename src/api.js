// ═══ REST API — Echo Worlds Platform ═══
const express = require('express');
const path = require('path');
const { stmts, db } = require('./database');
const Economy = require('./economy/economy');

function createAPI(bot) {
  const router = express.Router();

  // ═══ WORLD ENTRY ═══
  // GET /world/:serverId — Serve the world client for a server
  router.get('/world/:serverId', (req, res) => {
    const server = stmts.getServer.get(req.params.serverId);
    if (!server) return res.status(404).send('World not found');
    // Serve the world client with server context
    res.sendFile(path.join(__dirname, '..', 'public', 'world.html'));
  });

  // ═══ SERVER API ═══
  router.get('/api/servers/:id', (req, res) => {
    const server = stmts.getServer.get(req.params.id);
    if (!server) return res.status(404).json({ error: 'Not found' });
    const rooms = stmts.getRoomsByServer.all(req.params.id);
    res.json({ server, rooms });
  });

  // ═══ ROOMS API ═══
  router.get('/api/rooms/:serverId', (req, res) => {
    const rooms = stmts.getRoomsByServer.all(req.params.serverId);
    res.json(rooms);
  });

  router.get('/api/room/:id', (req, res) => {
    const room = stmts.getRoom.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Not found' });
    room.objects = JSON.parse(room.objects || '[]');
    room.config = JSON.parse(room.config || '{}');
    res.json(room);
  });

  router.post('/api/rooms/:id', express.json(), (req, res) => {
    const room = stmts.getRoom.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Not found' });
    const { name, theme, width, height, objects, config } = req.body;
    stmts.updateRoom.run(
      name || room.name, theme || room.theme,
      width || room.width, height || room.height,
      JSON.stringify(objects || []), JSON.stringify(config || {}),
      req.params.id
    );
    res.json({ ok: true });
  });

  // ═══ USER API ═══
  router.get('/api/user/:id', (req, res) => {
    const user = stmts.getUser.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    // Don't expose sensitive data
    res.json({
      id: user.id, username: user.username, displayName: user.display_name,
      skin: user.skin, coins: user.coins, researchPoints: user.research_points,
      creatorLevel: user.creator_level, joinedAt: user.joined_at
    });
  });

  // ═══ MARKETPLACE API ═══
  router.get('/api/marketplace/:serverId', (req, res) => {
    const skins = Economy.getMarketplace(req.params.serverId, parseInt(req.query.limit) || 50);
    res.json(skins);
  });

  router.post('/api/marketplace/buy', express.json(), (req, res) => {
    try {
      const result = Economy.buySkin(req.body.userId, req.body.skinId);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/api/marketplace/create', express.json(), (req, res) => {
    try {
      const { creatorId, serverId, name, tier, price, spriteData } = req.body;
      const skinId = Economy.createSkin(creatorId, serverId, name, tier, price, spriteData);
      res.json({ ok: true, skinId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/api/user/:id/skins', (req, res) => {
    const skins = Economy.getUserSkins(req.params.id);
    res.json(skins);
  });

  // ═══ CREATOR DASHBOARD ═══
  router.get('/api/creator/:id/stats', (req, res) => {
    const stats = Economy.getCreatorStats(req.params.id);
    if (!stats) return res.status(404).json({ error: 'Not found' });
    res.json(stats);
  });

  router.get('/dashboard/:serverId', (req, res) => {
    const server = stmts.getServer.get(req.params.serverId);
    if (!server) return res.status(404).send('Server not found');
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard', 'index.html'));
  });

  // ═══ TIPS API ═══
  router.post('/api/tip', express.json(), (req, res) => {
    try {
      const result = Economy.tip(req.body.fromUserId, req.body.toUserId, req.body.amount);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ═══ RESEARCH API ═══
  router.get('/api/research/task/:gameType', (req, res) => {
    const task = stmts.getNextTask.get(req.params.gameType);
    if (!task) return res.json({ noTasks: true });
    task.data = JSON.parse(task.data);
    res.json(task);
  });

  router.post('/api/research/submit', express.json(), (req, res) => {
    try {
      const { userId, gameType, taskId, result } = req.body;
      if (!userId || !gameType || !taskId || result === undefined) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Calculate score (simplified — real version would compare to consensus)
      const score = Math.random() * 0.3 + 0.7; // 0.7-1.0 for now
      const baseRP = { synapse_spotter: 2, molecule_sculptor: 10, compound_crafter: 15, data_tagger: 1 }[gameType] || 1;
      const rpEarned = Math.floor(baseRP * score);

      stmts.submitContribution.run(userId, gameType, taskId, JSON.stringify(result), score, rpEarned);
      stmts.incrementTaskSubmissions.run(taskId);
      stmts.addRP.run(rpEarned, userId);

      res.json({ ok: true, score, rpEarned });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/api/research/stats/:userId', (req, res) => {
    const stats = stmts.getUserResearchStats.all(req.params.userId);
    const user = stmts.getUser.get(req.params.userId);
    res.json({
      totalRP: user?.research_points || 0,
      contributions: stats
    });
  });

  router.get('/api/research/leaderboard', (req, res) => {
    const top = db.prepare('SELECT username, research_points, id FROM users WHERE research_points > 0 ORDER BY research_points DESC LIMIT 20').all();
    res.json(top);
  });

  // ═══ PLATFORM STATS ═══
  router.get('/api/platform/stats', (req, res) => {
    res.json(Economy.getPlatformStats());
  });

  // ═══ ROOM EDITOR ═══
  router.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'editor', 'index.html'));
  });

  // ═══ RESEARCH GAMES ═══
  router.get('/research/synapse-spotter', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'research', 'synapse-spotter.html'));
  });
  router.get('/research/molecule-sculptor', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'research', 'molecule-sculptor.html'));
  });

  // ═══ LANDING PAGE ═══
  router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
  });

  return router;
}

module.exports = createAPI;
