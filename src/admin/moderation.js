// ═══ MODERATION SYSTEM — Echo Worlds Sprint 8 ═══
const { db } = require('../database');

// Ensure moderation tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT,
    reason TEXT,
    banned_by TEXT NOT NULL,
    banned_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT,
    room_id INTEGER,
    reason TEXT,
    muted_by TEXT NOT NULL,
    muted_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT NOT NULL,
    reported_id TEXT NOT NULL,
    server_id TEXT,
    room_id INTEGER,
    reason TEXT NOT NULL,
    evidence TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mod_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_id TEXT,
    moderator_id TEXT NOT NULL,
    server_id TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT,
    reason TEXT NOT NULL,
    warned_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const stmts = {
  ban: db.prepare('INSERT INTO bans (user_id, server_id, reason, banned_by, expires_at) VALUES (?, ?, ?, ?, ?)'),
  unban: db.prepare('UPDATE bans SET active = 0 WHERE user_id = ? AND server_id = ? AND active = 1'),
  isBanned: db.prepare('SELECT * FROM bans WHERE user_id = ? AND (server_id = ? OR server_id IS NULL) AND active = 1 AND (expires_at IS NULL OR expires_at > datetime(\'now\'))'),
  mute: db.prepare('INSERT INTO mutes (user_id, server_id, room_id, reason, muted_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
  unmute: db.prepare('UPDATE mutes SET active = 0 WHERE user_id = ? AND server_id = ? AND active = 1'),
  isMuted: db.prepare('SELECT * FROM mutes WHERE user_id = ? AND (server_id = ? OR server_id IS NULL) AND active = 1 AND (expires_at IS NULL OR expires_at > datetime(\'now\'))'),
  report: db.prepare('INSERT INTO reports (reporter_id, reported_id, server_id, room_id, reason, evidence) VALUES (?, ?, ?, ?, ?, ?)'),
  getReports: db.prepare('SELECT * FROM reports WHERE server_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?'),
  resolveReport: db.prepare('UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?'),
  logAction: db.prepare('INSERT INTO mod_log (action, target_id, moderator_id, server_id, details) VALUES (?, ?, ?, ?, ?)'),
  getLog: db.prepare('SELECT * FROM mod_log WHERE server_id = ? ORDER BY created_at DESC LIMIT ?'),
  warn: db.prepare('INSERT INTO warnings (user_id, server_id, reason, warned_by) VALUES (?, ?, ?, ?)'),
  getWarnings: db.prepare('SELECT * FROM warnings WHERE user_id = ? AND server_id = ? ORDER BY created_at DESC'),
  getWarningCount: db.prepare('SELECT COUNT(*) as count FROM warnings WHERE user_id = ? AND server_id = ?'),
};

class Moderation {
  // ═══ BANS ═══
  static ban(userId, serverId, reason, moderatorId, durationMinutes = null) {
    const expires = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000).toISOString()
      : null;
    stmts.ban.run(userId, serverId, reason, moderatorId, expires);
    stmts.logAction.run('ban', userId, moderatorId, serverId, JSON.stringify({ reason, durationMinutes }));
    return { banned: true, expires };
  }

  static unban(userId, serverId, moderatorId) {
    const result = stmts.unban.run(userId, serverId);
    if (result.changes > 0) {
      stmts.logAction.run('unban', userId, moderatorId, serverId, null);
    }
    return { unbanned: result.changes > 0 };
  }

  static isBanned(userId, serverId) {
    return !!stmts.isBanned.get(userId, serverId);
  }

  // ═══ MUTES ═══
  static mute(userId, serverId, roomId, reason, moderatorId, durationMinutes = null) {
    const expires = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000).toISOString()
      : null;
    stmts.mute.run(userId, serverId, roomId, reason, moderatorId, expires);
    stmts.logAction.run('mute', userId, moderatorId, serverId, JSON.stringify({ reason, roomId, durationMinutes }));
    return { muted: true, expires };
  }

  static unmute(userId, serverId, moderatorId) {
    const result = stmts.unmute.run(userId, serverId);
    if (result.changes > 0) {
      stmts.logAction.run('unmute', userId, moderatorId, serverId, null);
    }
    return { unmuted: result.changes > 0 };
  }

  static isMuted(userId, serverId) {
    return !!stmts.isMuted.get(userId, serverId);
  }

  // ═══ REPORTS ═══
  static report(reporterId, reportedId, serverId, roomId, reason, evidence = null) {
    stmts.report.run(reporterId, reportedId, serverId, roomId, reason, evidence);
    return { reported: true };
  }

  static getReports(serverId, status = 'pending', limit = 50) {
    return stmts.getReports.all(serverId, status, limit);
  }

  static resolveReport(reportId, status, reviewerId) {
    stmts.resolveReport.run(status, reviewerId, reportId);
    stmts.logAction.run('resolve_report', null, reviewerId, null, JSON.stringify({ reportId, status }));
    return { resolved: true };
  }

  // ═══ WARNINGS ═══
  static warn(userId, serverId, reason, moderatorId) {
    stmts.warn.run(userId, serverId, reason, moderatorId);
    stmts.logAction.run('warn', userId, moderatorId, serverId, reason);
    const count = stmts.getWarningCount.get(userId, serverId);
    // Auto-escalate: 3 warnings = 1hr mute, 5 = 24hr mute, 7 = ban
    if (count.count >= 7) {
      this.ban(userId, serverId, 'Auto-ban: 7 warnings', 'system');
      return { warned: true, escalated: 'ban', warningCount: count.count };
    } else if (count.count >= 5) {
      this.mute(userId, serverId, null, 'Auto-mute: 5 warnings', 'system', 1440);
      return { warned: true, escalated: 'mute_24h', warningCount: count.count };
    } else if (count.count >= 3) {
      this.mute(userId, serverId, null, 'Auto-mute: 3 warnings', 'system', 60);
      return { warned: true, escalated: 'mute_1h', warningCount: count.count };
    }
    return { warned: true, warningCount: count.count };
  }

  static getWarnings(userId, serverId) {
    return stmts.getWarnings.all(userId, serverId);
  }

  // ═══ MOD LOG ═══
  static getLog(serverId, limit = 100) {
    return stmts.getLog.all(serverId, limit);
  }

  // ═══ CONTENT FILTER ═══
  static filterMessage(content) {
    if (!content || typeof content !== 'string') return { clean: true, content };
    // Basic profanity/spam detection (extend with real word lists in production)
    const trimmed = content.trim();
    if (trimmed.length > 1000) return { clean: false, reason: 'Message too long', content: trimmed.slice(0, 1000) };
    if (/(.)\1{10,}/.test(trimmed)) return { clean: false, reason: 'Spam detected', content: null };
    // URL spam (more than 3 URLs)
    const urlCount = (trimmed.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) return { clean: false, reason: 'Too many links', content: null };
    return { clean: true, content: trimmed };
  }
}

module.exports = Moderation;
