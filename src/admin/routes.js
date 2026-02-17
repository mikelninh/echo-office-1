// ═══ ADMIN & MODERATION API ROUTES ═══
const express = require('express');
const Moderation = require('./moderation');
const { requireAuth } = require('../security');

function createAdminAPI() {
  const router = express.Router();

  // All admin routes require auth
  router.use(requireAuth);

  // ═══ BANS ═══
  router.post('/ban', express.json(), (req, res) => {
    try {
      const { userId, serverId, reason, duration } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const result = Moderation.ban(userId, serverId, reason || 'No reason given', req.body.moderatorId || 'admin', duration);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/unban', express.json(), (req, res) => {
    try {
      const { userId, serverId } = req.body;
      const result = Moderation.unban(userId, serverId, req.body.moderatorId || 'admin');
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/banned/:serverId/:userId', (req, res) => {
    res.json({ banned: Moderation.isBanned(req.params.userId, req.params.serverId) });
  });

  // ═══ MUTES ═══
  router.post('/mute', express.json(), (req, res) => {
    try {
      const { userId, serverId, roomId, reason, duration } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const result = Moderation.mute(userId, serverId, roomId, reason || 'No reason', req.body.moderatorId || 'admin', duration);
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/unmute', express.json(), (req, res) => {
    try {
      const { userId, serverId } = req.body;
      const result = Moderation.unmute(userId, serverId, req.body.moderatorId || 'admin');
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ═══ WARNINGS ═══
  router.post('/warn', express.json(), (req, res) => {
    try {
      const { userId, serverId, reason } = req.body;
      if (!userId || !reason) return res.status(400).json({ error: 'userId and reason required' });
      const result = Moderation.warn(userId, serverId, reason, req.body.moderatorId || 'admin');
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/warnings/:serverId/:userId', (req, res) => {
    const warnings = Moderation.getWarnings(req.params.userId, req.params.serverId);
    res.json(warnings);
  });

  // ═══ REPORTS ═══
  router.get('/reports/:serverId', (req, res) => {
    const status = req.query.status || 'pending';
    const reports = Moderation.getReports(req.params.serverId, status, parseInt(req.query.limit) || 50);
    res.json(reports);
  });

  router.post('/reports/:id/resolve', express.json(), (req, res) => {
    try {
      const { status } = req.body; // 'resolved', 'dismissed', 'escalated'
      if (!['resolved', 'dismissed', 'escalated'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const result = Moderation.resolveReport(req.params.id, status, req.body.reviewerId || 'admin');
      res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ═══ MOD LOG ═══
  router.get('/log/:serverId', (req, res) => {
    const log = Moderation.getLog(req.params.serverId, parseInt(req.query.limit) || 100);
    res.json(log);
  });

  // ═══ ADMIN DASHBOARD ═══
  router.get('/dashboard', (req, res) => {
    const { db: database } = require('../database');
    const stats = {
      totalUsers: database.prepare('SELECT COUNT(*) as n FROM users').get().n,
      totalServers: database.prepare('SELECT COUNT(*) as n FROM servers').get().n,
      totalRooms: database.prepare('SELECT COUNT(*) as n FROM rooms').get().n,
      activeBans: database.prepare('SELECT COUNT(*) as n FROM bans WHERE active = 1').get().n,
      activeMutes: database.prepare('SELECT COUNT(*) as n FROM mutes WHERE active = 1').get().n,
      pendingReports: database.prepare("SELECT COUNT(*) as n FROM reports WHERE status = 'pending'").get().n,
      totalWarnings: database.prepare('SELECT COUNT(*) as n FROM warnings').get().n,
      recentActions: database.prepare('SELECT * FROM mod_log ORDER BY created_at DESC LIMIT 20').all(),
    };
    res.json(stats);
  });

  return router;
}

module.exports = createAdminAPI;
