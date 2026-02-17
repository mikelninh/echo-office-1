// ═══ CREATOR ECONOMY — Echo Worlds Sprint 5 ═══
const { stmts, db } = require('../database');

// Platform fee: 30% of skin sales, 15% of tips
const PLATFORM_FEE_SKIN = 0.30;
const PLATFORM_FEE_TIP = 0.15;
const MSA_DONATION_RATE = 0.05; // 5% of platform revenue to MSA research

class Economy {
  // ═══ SKIN MARKETPLACE ═══
  static createSkin(creatorId, serverId, name, tier, price, spriteData) {
    const result = stmts.createSkin.run(creatorId, serverId, name, tier, price, JSON.stringify(spriteData));
    stmts.logTransaction.run(creatorId, 'skin_created', 0, `Created skin: ${name}`, `skin:${result.lastInsertRowid}`);
    return result.lastInsertRowid;
  }

  static buySkin(buyerId, skinId) {
    const skin = db.prepare('SELECT * FROM skins WHERE id = ?').get(skinId);
    if (!skin) throw new Error('Skin not found');
    if (!skin.approved) throw new Error('Skin not yet approved');

    const buyer = stmts.getUser.get(buyerId);
    if (!buyer || buyer.coins < skin.price) throw new Error('Not enough coins');

    // Check if already owned
    const owned = db.prepare('SELECT id FROM skin_purchases WHERE user_id = ? AND skin_id = ?').get(buyerId, skinId);
    if (owned) throw new Error('Already owned');

    // Calculate splits
    const platformCut = Math.floor(skin.price * PLATFORM_FEE_SKIN);
    const creatorCut = skin.price - platformCut;
    const msaDonation = Math.floor(platformCut * MSA_DONATION_RATE);

    // Execute transaction
    const txn = db.transaction(() => {
      stmts.spendCoins.run(skin.price, buyerId, skin.price);
      stmts.addCoins.run(creatorCut, skin.creator_id);
      stmts.buySkin.run(buyerId, skinId, skin.price);
      stmts.incrementSkinSales.run(skinId);

      // Log all transactions
      stmts.logTransaction.run(buyerId, 'spend', -skin.price, `Bought skin: ${skin.name}`, `skin:${skinId}`);
      stmts.logTransaction.run(skin.creator_id, 'skin_sale', creatorCut, `Sold skin: ${skin.name} to ${buyerId}`, `skin:${skinId}`);

      // Update creator earnings
      db.prepare('UPDATE users SET total_earned = total_earned + ? WHERE id = ?').run(creatorCut, skin.creator_id);

      // Update creator level based on total earned
      this.updateCreatorLevel(skin.creator_id);
    });

    txn();
    return { creatorCut, platformCut, msaDonation };
  }

  static getMarketplace(serverId, limit = 50) {
    return stmts.getMarketplaceSkins.all(serverId, limit);
  }

  static getUserSkins(userId) {
    return db.prepare(`
      SELECT s.*, sp.purchased_at FROM skin_purchases sp
      JOIN skins s ON sp.skin_id = s.id
      WHERE sp.user_id = ?
      ORDER BY sp.purchased_at DESC
    `).all(userId);
  }

  // ═══ TIPPING ═══
  static tip(fromUserId, toUserId, amount) {
    amount = Math.max(1, Math.min(10000, amount));

    const from = stmts.getUser.get(fromUserId);
    if (!from || from.coins < amount) throw new Error('Not enough coins');

    const platformCut = Math.floor(amount * PLATFORM_FEE_TIP);
    const recipientAmount = amount - platformCut;

    const txn = db.transaction(() => {
      stmts.spendCoins.run(amount, fromUserId, amount);
      stmts.addCoins.run(recipientAmount, toUserId);
      stmts.logTransaction.run(fromUserId, 'tip', -amount, `Tip to ${toUserId}`, toUserId);
      stmts.logTransaction.run(toUserId, 'tip', recipientAmount, `Tip from ${fromUserId}`, fromUserId);
    });

    txn();
    return { sent: amount, received: recipientAmount, platformCut };
  }

  // ═══ ROOM FEES ═══
  static chargeRoomEntry(userId, roomId) {
    const room = stmts.getRoom.get(roomId);
    if (!room || room.entry_fee <= 0) return { charged: 0 };

    const user = stmts.getUser.get(userId);
    if (!user || user.coins < room.entry_fee) throw new Error('Not enough coins');

    stmts.spendCoins.run(room.entry_fee, userId, room.entry_fee);
    stmts.logTransaction.run(userId, 'spend', -room.entry_fee, `Room entry: ${room.name}`, `room:${roomId}`);

    // Pay room creator
    if (room.created_by) {
      const creatorCut = Math.floor(room.entry_fee * 0.8);
      stmts.addCoins.run(creatorCut, room.created_by);
      stmts.logTransaction.run(room.created_by, 'entry_fee', creatorCut, `Entry fee: ${room.name}`, `room:${roomId}`);
    }

    return { charged: room.entry_fee };
  }

  // ═══ CREATOR LEVELS ═══
  static updateCreatorLevel(userId) {
    const user = stmts.getUser.get(userId);
    if (!user) return;

    // Level thresholds based on total lifetime earnings
    const thresholds = [0, 100, 500, 2000, 10000, 50000, 200000];
    let level = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (user.total_earned >= thresholds[i]) { level = i; break; }
    }

    if (level !== user.creator_level) {
      db.prepare('UPDATE users SET creator_level = ? WHERE id = ?').run(level, userId);
    }
  }

  // ═══ CREATOR DASHBOARD STATS ═══
  static getCreatorStats(userId) {
    const user = stmts.getUser.get(userId);
    if (!user) return null;

    const skinsSold = db.prepare('SELECT COUNT(*) as count, SUM(price_paid) as revenue FROM skin_purchases sp JOIN skins s ON sp.skin_id = s.id WHERE s.creator_id = ?').get(userId);
    const tipsReceived = db.prepare("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'tip' AND amount > 0").get(userId);
    const skinsCreated = db.prepare('SELECT COUNT(*) as count FROM skins WHERE creator_id = ?').get(userId);
    const topSkins = db.prepare('SELECT name, tier, price, sales FROM skins WHERE creator_id = ? ORDER BY sales DESC LIMIT 5').all(userId);

    return {
      creatorLevel: user.creator_level,
      totalEarned: user.total_earned,
      currentCoins: user.coins,
      skinsSold: skinsSold.count || 0,
      skinRevenue: skinsSold.revenue || 0,
      tipsReceived: tipsReceived.total || 0,
      tipCount: tipsReceived.count || 0,
      skinsCreated: skinsCreated.count || 0,
      topSkins,
      // Creator level names
      levelName: ['Newcomer', 'Creator', 'Artist', 'Architect', 'Master', 'Legend', 'Mythic'][user.creator_level] || 'Unknown'
    };
  }

  // ═══ PLATFORM REVENUE REPORT ═══
  static getPlatformStats() {
    const totalSkinSales = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'skin_sale'").get();
    const totalTips = db.prepare("SELECT SUM(ABS(amount)) as total FROM transactions WHERE type = 'tip' AND amount < 0").get();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalCreators = db.prepare('SELECT COUNT(DISTINCT creator_id) as count FROM skins').get();
    const totalResearch = db.prepare('SELECT COUNT(*) as count FROM research_contributions').get();

    const platformRevenue = Math.floor((totalSkinSales.total || 0) * PLATFORM_FEE_SKIN + (totalTips.total || 0) * PLATFORM_FEE_TIP);
    const msaDonation = Math.floor(platformRevenue * MSA_DONATION_RATE);

    return {
      totalUsers: totalUsers.count,
      totalCreators: totalCreators.count,
      totalSkinSales: totalSkinSales.total || 0,
      totalTips: totalTips.total || 0,
      platformRevenue,
      msaDonation,
      totalResearchContributions: totalResearch.count,
    };
  }
}

module.exports = Economy;
