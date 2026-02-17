// ═══ DATABASE — SQLite for Echo Worlds platform ═══
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'echo-worlds.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// ═══ SCHEMA ═══
db.exec(`
  -- Discord servers connected to Echo Worlds
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,              -- Discord guild ID
    name TEXT NOT NULL,
    icon_url TEXT,
    owner_id TEXT NOT NULL,           -- Discord user ID of server owner
    tier TEXT DEFAULT 'free',         -- free, pro, enterprise
    created_at TEXT DEFAULT (datetime('now')),
    config TEXT DEFAULT '{}'          -- JSON: custom settings
  );

  -- Rooms (mapped from Discord channels or custom-created)
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL REFERENCES servers(id),
    channel_id TEXT,                  -- Discord channel ID (null for custom rooms)
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'default',     -- room visual theme
    width INTEGER DEFAULT 800,
    height INTEGER DEFAULT 600,
    objects TEXT DEFAULT '[]',        -- JSON: placed objects/furniture
    config TEXT DEFAULT '{}',         -- JSON: room settings
    created_by TEXT,                  -- user ID
    is_vip INTEGER DEFAULT 0,
    entry_fee INTEGER DEFAULT 0,     -- coin cost to enter
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Users (linked to Discord accounts)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,              -- Discord user ID
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    skin TEXT DEFAULT 'classic',
    coins INTEGER DEFAULT 100,
    research_points INTEGER DEFAULT 0,
    creator_level INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,   -- lifetime coins earned from creator sales
    joined_at TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now'))
  );

  -- User-server memberships (roles, permissions)
  CREATE TABLE IF NOT EXISTS memberships (
    user_id TEXT NOT NULL REFERENCES users(id),
    server_id TEXT NOT NULL REFERENCES servers(id),
    roles TEXT DEFAULT '[]',          -- JSON array of Discord role IDs
    skin_override TEXT,               -- server-specific skin from role mapping
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, server_id)
  );

  -- Creator skins (uploaded by creators, sold in marketplace)
  CREATE TABLE IF NOT EXISTS skins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL REFERENCES users(id),
    server_id TEXT REFERENCES servers(id),  -- null = global
    name TEXT NOT NULL,
    tier TEXT DEFAULT 'common',       -- common, rare, epic, legendary, mythic
    price INTEGER DEFAULT 0,          -- in coins
    sprite_data TEXT NOT NULL,        -- JSON: sprite definition
    preview_url TEXT,
    sales INTEGER DEFAULT 0,
    approved INTEGER DEFAULT 0,       -- requires review
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Skin purchases
  CREATE TABLE IF NOT EXISTS skin_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    skin_id INTEGER NOT NULL REFERENCES skins(id),
    price_paid INTEGER NOT NULL,
    purchased_at TEXT DEFAULT (datetime('now'))
  );

  -- Transactions (coin economy)
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,               -- earn, spend, tip, skin_sale, entry_fee, payout
    amount INTEGER NOT NULL,
    description TEXT,
    ref_id TEXT,                      -- reference (skin_id, room_id, etc.)
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Research contributions
  CREATE TABLE IF NOT EXISTS research_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    game_type TEXT NOT NULL,          -- synapse_spotter, molecule_sculptor, compound_crafter, data_tagger
    task_id TEXT NOT NULL,
    result TEXT NOT NULL,             -- JSON: player's answer/solution
    score REAL,                       -- quality score (0-1)
    rp_earned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Research tasks
  CREATE TABLE IF NOT EXISTS research_tasks (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    data TEXT NOT NULL,               -- JSON: task content (image URL, protein data, etc.)
    consensus_answer TEXT,            -- filled after 3+ agreements
    submissions INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Message bridge log (for Discord ↔ Room sync)
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    room_id INTEGER,
    channel_id TEXT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,             -- 'discord' or 'room'
    discord_msg_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_rooms_server ON rooms(server_id);
  CREATE INDEX IF NOT EXISTS idx_memberships_server ON memberships(server_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_research_user ON research_contributions(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
`);

// ═══ PREPARED STATEMENTS ═══
const stmts = {
  // Servers
  upsertServer: db.prepare(`INSERT INTO servers (id, name, icon_url, owner_id) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon_url=excluded.icon_url`),
  getServer: db.prepare('SELECT * FROM servers WHERE id = ?'),
  updateServerConfig: db.prepare('UPDATE servers SET config = ? WHERE id = ?'),

  // Rooms
  createRoom: db.prepare('INSERT INTO rooms (server_id, channel_id, name, theme, width, height, objects, config, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  getRoomsByServer: db.prepare('SELECT * FROM rooms WHERE server_id = ?'),
  getRoomByChannel: db.prepare('SELECT * FROM rooms WHERE server_id = ? AND channel_id = ?'),
  getRoom: db.prepare('SELECT * FROM rooms WHERE id = ?'),
  updateRoom: db.prepare('UPDATE rooms SET name=?, theme=?, width=?, height=?, objects=?, config=? WHERE id=?'),
  deleteRoom: db.prepare('DELETE FROM rooms WHERE id = ?'),

  // Users
  upsertUser: db.prepare(`INSERT INTO users (id, username, display_name, avatar_url) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET username=excluded.username, display_name=excluded.display_name, avatar_url=excluded.avatar_url, last_seen=datetime('now')`),
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  addCoins: db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?'),
  spendCoins: db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?'),
  addRP: db.prepare('UPDATE users SET research_points = research_points + ? WHERE id = ?'),

  // Memberships
  upsertMembership: db.prepare(`INSERT INTO memberships (user_id, server_id, roles) VALUES (?, ?, ?)
    ON CONFLICT(user_id, server_id) DO UPDATE SET roles=excluded.roles, joined_at=datetime('now')`),
  getMembership: db.prepare('SELECT * FROM memberships WHERE user_id = ? AND server_id = ?'),

  // Skins
  createSkin: db.prepare('INSERT INTO skins (creator_id, server_id, name, tier, price, sprite_data) VALUES (?, ?, ?, ?, ?, ?)'),
  getMarketplaceSkins: db.prepare('SELECT s.*, u.username as creator_name FROM skins s JOIN users u ON s.creator_id = u.id WHERE s.approved = 1 AND (s.server_id IS NULL OR s.server_id = ?) ORDER BY s.sales DESC LIMIT ?'),
  buySkin: db.prepare('INSERT INTO skin_purchases (user_id, skin_id, price_paid) VALUES (?, ?, ?)'),
  incrementSkinSales: db.prepare('UPDATE skins SET sales = sales + 1 WHERE id = ?'),

  // Transactions
  logTransaction: db.prepare('INSERT INTO transactions (user_id, type, amount, description, ref_id) VALUES (?, ?, ?, ?, ?)'),

  // Research
  getNextTask: db.prepare('SELECT * FROM research_tasks WHERE game_type = ? AND active = 1 AND submissions < 10 ORDER BY submissions ASC LIMIT 1'),
  submitContribution: db.prepare('INSERT INTO research_contributions (user_id, game_type, task_id, result, score, rp_earned) VALUES (?, ?, ?, ?, ?, ?)'),
  incrementTaskSubmissions: db.prepare('UPDATE research_tasks SET submissions = submissions + 1 WHERE id = ?'),
  getUserResearchStats: db.prepare('SELECT game_type, COUNT(*) as count, SUM(rp_earned) as total_rp FROM research_contributions WHERE user_id = ? GROUP BY game_type'),

  // Messages
  logMessage: db.prepare('INSERT INTO messages (server_id, room_id, channel_id, user_id, username, content, source, discord_msg_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  getRecentMessages: db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?'),
};

module.exports = { db, stmts };
