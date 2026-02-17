// ═══════════════════════════════════════════════════════════════════════════
// RESEARCH ENGINE — Echo Worlds Citizen Science Platform
// ═══════════════════════════════════════════════════════════════════════════
// Manages research tasks, validates submissions, calculates RP.
// Every contribution here targets real science: understanding alpha-synuclein
// misfolding and neurodegenerative diseases like MSA.
// ═══════════════════════════════════════════════════════════════════════════

const { db, stmts } = require('../database');
const crypto = require('crypto');

// ─── Constants ───────────────────────────────────────────────────────────

const GAME_TYPES = {
  SYNAPSE_SPOTTER: 'synapse_spotter',
  MOLECULE_SCULPTOR: 'molecule_sculptor',
};

const CONSENSUS_THRESHOLD = 3;   // Matching answers needed to resolve a task
const MAX_SUBMISSIONS = 10;      // Max submissions per task before retiring

const RP_CONFIG = {
  synapse_spotter: {
    base: [1, 2, 3],              // RP by difficulty (1=easy, 2=medium, 3=hard)
    streakBonus: [1, 1.2, 1.5, 2.0, 2.5, 3.0],  // multiplier at streak 0,1,2,3,4,5+
    timeBonus: { threshold: 5000, multiplier: 1.25 }, // bonus if answered under 5s
    maxPerTask: 3,
  },
  molecule_sculptor: {
    base: 5,                      // base RP
    optimalityMultiplier: 4,      // up to 4x for perfect solutions
    maxPerTask: 20,
  },
};

// ─── Additional prepared statements ──────────────────────────────────────

const extraStmts = {
  // Task queries
  getTask: db.prepare('SELECT * FROM research_tasks WHERE id = ?'),
  getActiveTasks: db.prepare(
    'SELECT * FROM research_tasks WHERE game_type = ? AND active = 1 AND submissions < ? ORDER BY submissions ASC, created_at ASC'
  ),
  getTasksForUser: db.prepare(
    `SELECT rt.* FROM research_tasks rt 
     WHERE rt.game_type = ? AND rt.active = 1 AND rt.submissions < ?
     AND rt.id NOT IN (SELECT task_id FROM research_contributions WHERE user_id = ? AND game_type = ?)
     ORDER BY rt.submissions ASC, rt.created_at ASC LIMIT 1`
  ),
  resolveTask: db.prepare(
    'UPDATE research_tasks SET consensus_answer = ?, active = 0 WHERE id = ?'
  ),
  deactivateTask: db.prepare(
    'UPDATE research_tasks SET active = 0 WHERE id = ?'
  ),
  createTask: db.prepare(
    'INSERT INTO research_tasks (id, game_type, difficulty, data) VALUES (?, ?, ?, ?)'
  ),

  // Contribution queries
  getTaskContributions: db.prepare(
    'SELECT * FROM research_contributions WHERE task_id = ? ORDER BY created_at ASC'
  ),
  getUserContribution: db.prepare(
    'SELECT * FROM research_contributions WHERE user_id = ? AND task_id = ?'
  ),
  getUserStreak: db.prepare(
    `SELECT rc.*, rt.consensus_answer FROM research_contributions rc
     JOIN research_tasks rt ON rc.task_id = rt.id
     WHERE rc.user_id = ? AND rc.game_type = ?
     ORDER BY rc.created_at DESC LIMIT 20`
  ),
  countUserContributions: db.prepare(
    'SELECT COUNT(*) as count FROM research_contributions WHERE user_id = ? AND game_type = ?'
  ),

  // Leaderboard
  getLeaderboard: db.prepare(
    `SELECT rc.user_id, u.username, u.display_name, u.avatar_url,
            COUNT(*) as contributions, SUM(rc.rp_earned) as total_rp,
            ROUND(AVG(rc.score) * 100, 1) as accuracy
     FROM research_contributions rc
     JOIN users u ON rc.user_id = u.id
     WHERE rc.game_type = ?
     GROUP BY rc.user_id
     ORDER BY total_rp DESC
     LIMIT ?`
  ),
  getGlobalLeaderboard: db.prepare(
    `SELECT rc.user_id, u.username, u.display_name, u.avatar_url,
            COUNT(*) as contributions, SUM(rc.rp_earned) as total_rp,
            ROUND(AVG(rc.score) * 100, 1) as accuracy
     FROM research_contributions rc
     JOIN users u ON rc.user_id = u.id
     GROUP BY rc.user_id
     ORDER BY total_rp DESC
     LIMIT ?`
  ),

  // User stats
  getFullUserStats: db.prepare(
    `SELECT 
       COUNT(*) as total_contributions,
       SUM(rp_earned) as total_rp,
       ROUND(AVG(score) * 100, 1) as accuracy,
       MAX(created_at) as last_contribution
     FROM research_contributions WHERE user_id = ?`
  ),
  getUserGameStats: db.prepare(
    `SELECT game_type,
       COUNT(*) as contributions,
       SUM(rp_earned) as rp_earned,
       ROUND(AVG(score) * 100, 1) as accuracy
     FROM research_contributions WHERE user_id = ?
     GROUP BY game_type`
  ),

  // Rank
  getUserRank: db.prepare(
    `SELECT COUNT(DISTINCT user_id) + 1 as rank FROM (
       SELECT user_id, SUM(rp_earned) as total_rp
       FROM research_contributions
       GROUP BY user_id
       HAVING total_rp > (SELECT COALESCE(SUM(rp_earned), 0) FROM research_contributions WHERE user_id = ?)
     )`
  ),

  // Task count
  countActiveTasks: db.prepare(
    'SELECT COUNT(*) as count FROM research_tasks WHERE game_type = ? AND active = 1'
  ),
  countResolvedTasks: db.prepare(
    'SELECT COUNT(*) as count FROM research_tasks WHERE game_type = ? AND consensus_answer IS NOT NULL'
  ),
};

// ─── Research Engine ─────────────────────────────────────────────────────

const ResearchEngine = {

  // ── Get the next task for a user ─────────────────────────────────────
  getNextTask(gameType, userId = null) {
    // If userId provided, skip tasks they've already done
    if (userId) {
      const task = extraStmts.getTasksForUser.get(gameType, MAX_SUBMISSIONS, userId, gameType);
      if (task) {
        return {
          id: task.id,
          gameType: task.game_type,
          difficulty: task.difficulty,
          data: JSON.parse(task.data),
          submissions: task.submissions,
        };
      }
    }

    // Fallback: get any active task with fewest submissions
    const task = stmts.getNextTask.get(gameType);
    if (!task) {
      // Auto-generate tasks if pool is empty
      this._ensureTaskPool(gameType);
      const newTask = stmts.getNextTask.get(gameType);
      if (!newTask) return null;
      return {
        id: newTask.id,
        gameType: newTask.game_type,
        difficulty: newTask.difficulty,
        data: JSON.parse(newTask.data),
        submissions: newTask.submissions,
      };
    }

    return {
      id: task.id,
      gameType: task.game_type,
      difficulty: task.difficulty,
      data: JSON.parse(task.data),
      submissions: task.submissions,
    };
  },

  // ── Submit a research result ─────────────────────────────────────────
  submitResult(userId, gameType, taskId, result) {
    // Validate inputs
    if (!userId || !gameType || !taskId || result === undefined) {
      return { success: false, error: 'Missing required fields' };
    }

    // Check task exists and is active
    const task = extraStmts.getTask.get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    if (!task.active) {
      return { success: false, error: 'Task is no longer active' };
    }

    // Check if user already contributed to this task
    const existing = extraStmts.getUserContribution.get(userId, taskId);
    if (existing) {
      return { success: false, error: 'Already submitted for this task' };
    }

    // Calculate score and RP
    const { score, rp } = this._calculateReward(userId, gameType, task, result);

    // Use a transaction for atomicity
    const doSubmit = db.transaction(() => {
      // Record the contribution
      stmts.submitContribution.run(
        userId, gameType, taskId,
        JSON.stringify(result),
        score, rp
      );

      // Increment submission count
      stmts.incrementTaskSubmissions.run(taskId);

      // Award RP to user
      if (rp > 0) {
        stmts.addRP.run(rp, userId);
        stmts.logTransaction.run(userId, 'earn', rp, `Research: ${gameType}`, taskId);
      }

      // Check for consensus
      const consensus = this._checkConsensus(taskId, gameType);

      return { consensus };
    });

    const { consensus } = doSubmit();

    // Get updated streak
    const streak = this._getCurrentStreak(userId, gameType);

    return {
      success: true,
      score: Math.round(score * 100),
      rpEarned: rp,
      streak,
      consensus: consensus ? consensus.answer : null,
      taskResolved: !!consensus,
    };
  },

  // ── Get leaderboard ──────────────────────────────────────────────────
  getLeaderboard(gameType = null, limit = 20) {
    if (gameType) {
      return extraStmts.getLeaderboard.all(gameType, limit).map(row => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name || row.username,
        avatarUrl: row.avatar_url,
        contributions: row.contributions,
        totalRP: row.total_rp || 0,
        accuracy: row.accuracy || 0,
      }));
    }

    return extraStmts.getGlobalLeaderboard.all(limit).map(row => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarUrl: row.avatar_url,
      contributions: row.contributions,
      totalRP: row.total_rp || 0,
      accuracy: row.accuracy || 0,
    }));
  },

  // ── Get user stats ───────────────────────────────────────────────────
  getUserStats(userId) {
    const overall = extraStmts.getFullUserStats.get(userId);
    const byGame = extraStmts.getUserGameStats.all(userId);
    const rank = extraStmts.getUserRank.get(userId);

    // Get current streaks for each game
    const streaks = {};
    for (const type of Object.values(GAME_TYPES)) {
      streaks[type] = this._getCurrentStreak(userId, type);
    }

    return {
      userId,
      totalContributions: overall?.total_contributions || 0,
      totalRP: overall?.total_rp || 0,
      accuracy: overall?.accuracy || 0,
      rank: rank?.rank || 0,
      lastContribution: overall?.last_contribution || null,
      streaks,
      byGame: byGame.map(g => ({
        gameType: g.game_type,
        contributions: g.contributions,
        rpEarned: g.rp_earned || 0,
        accuracy: g.accuracy || 0,
      })),
    };
  },

  // ── Seed task pool ───────────────────────────────────────────────────
  seedTasks(gameType, count = 50) {
    const tasks = [];
    for (let i = 0; i < count; i++) {
      const task = this._generateTask(gameType, i);
      tasks.push(task);
    }

    const insertMany = db.transaction((taskList) => {
      for (const t of taskList) {
        extraStmts.createTask.run(t.id, t.gameType, t.difficulty, JSON.stringify(t.data));
      }
    });

    insertMany(tasks);
    return { created: tasks.length, gameType };
  },

  // ── Get platform-wide research stats ─────────────────────────────────
  getResearchStats() {
    const stats = {};
    for (const type of Object.values(GAME_TYPES)) {
      const active = extraStmts.countActiveTasks.get(type);
      const resolved = extraStmts.countResolvedTasks.get(type);
      stats[type] = {
        activeTasks: active?.count || 0,
        resolvedTasks: resolved?.count || 0,
      };
    }
    return stats;
  },

  // ═══ PRIVATE METHODS ═══════════════════════════════════════════════════

  // ── Calculate reward for a submission ────────────────────────────────
  _calculateReward(userId, gameType, task, result) {
    if (gameType === GAME_TYPES.SYNAPSE_SPOTTER) {
      return this._calcSynapseSpotterReward(userId, task, result);
    }
    if (gameType === GAME_TYPES.MOLECULE_SCULPTOR) {
      return this._calcMoleculeSculptorReward(task, result);
    }
    return { score: 0, rp: 0 };
  },

  _calcSynapseSpotterReward(userId, task, result) {
    const { answer, timeMs } = result;
    const taskData = JSON.parse(task.data);
    const difficulty = task.difficulty || 1;
    const config = RP_CONFIG.synapse_spotter;

    // Get existing contributions to see current consensus
    const contributions = extraStmts.getTaskContributions.all(task.id);
    
    let score = 0;
    
    if (contributions.length === 0) {
      // First contribution — can't judge accuracy yet, give base score
      score = 0.7;
    } else {
      // Calculate agreement with existing answers
      const answers = contributions.map(c => JSON.parse(c.result).answer);
      const matching = answers.filter(a => a === answer).length;
      score = matching / answers.length;
    }

    // If task has consensus and user matches it, perfect score
    if (task.consensus_answer && answer === task.consensus_answer) {
      score = 1.0;
    }

    // Base RP by difficulty
    let rp = config.base[Math.min(difficulty - 1, config.base.length - 1)];

    // Streak bonus
    const streak = this._getCurrentStreak(userId, GAME_TYPES.SYNAPSE_SPOTTER);
    const streakIdx = Math.min(streak, config.streakBonus.length - 1);
    const streakMultiplier = config.streakBonus[streakIdx];
    rp = Math.round(rp * streakMultiplier);

    // Time bonus
    if (timeMs && timeMs < config.timeBonus.threshold) {
      rp = Math.round(rp * config.timeBonus.multiplier);
    }

    // Scale by score (but minimum 1 RP for participating)
    rp = Math.max(1, Math.round(rp * score));
    rp = Math.min(rp, config.maxPerTask);

    return { score, rp };
  },

  _calcMoleculeSculptorReward(task, result) {
    const config = RP_CONFIG.molecule_sculptor;
    const { stabilityScore, optimalScore } = result;

    // optimalScore is 0-1, how close to the best known solution
    const optimality = typeof optimalScore === 'number' ? optimalScore : (stabilityScore || 0);
    const score = Math.max(0, Math.min(1, optimality));

    // RP scales with optimality: base + up to optimalityMultiplier * base
    let rp = Math.round(config.base + (score * config.base * config.optimalityMultiplier));
    rp = Math.min(rp, config.maxPerTask);
    rp = Math.max(1, rp);

    return { score, rp };
  },

  // ── Check if a task has reached consensus ────────────────────────────
  _checkConsensus(taskId, gameType) {
    const contributions = extraStmts.getTaskContributions.all(taskId);
    if (contributions.length < CONSENSUS_THRESHOLD) return null;

    if (gameType === GAME_TYPES.SYNAPSE_SPOTTER) {
      // Count votes for each answer
      const votes = {};
      for (const c of contributions) {
        const answer = JSON.parse(c.result).answer;
        votes[answer] = (votes[answer] || 0) + 1;
      }

      // Check if any answer has >= threshold votes
      for (const [answer, count] of Object.entries(votes)) {
        if (count >= CONSENSUS_THRESHOLD) {
          extraStmts.resolveTask.run(answer, taskId);
          return { answer, votes: count };
        }
      }
    }

    if (gameType === GAME_TYPES.MOLECULE_SCULPTOR) {
      // For molecule sculptor, consensus = best solution after enough submissions
      if (contributions.length >= CONSENSUS_THRESHOLD) {
        const best = contributions.reduce((a, b) => (a.score > b.score ? a : b));
        extraStmts.resolveTask.run(best.result, taskId);
        return { answer: best.result, score: best.score };
      }
    }

    // Deactivate if max submissions reached with no consensus
    if (contributions.length >= MAX_SUBMISSIONS) {
      extraStmts.deactivateTask.run(taskId);
    }

    return null;
  },

  // ── Calculate current streak for a user ──────────────────────────────
  _getCurrentStreak(userId, gameType) {
    const recent = extraStmts.getUserStreak.all(userId, gameType);
    let streak = 0;

    for (const contribution of recent) {
      // A contribution is "correct" if score >= 0.6
      if (contribution.score >= 0.6) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  },

  // ── Ensure minimum task pool ─────────────────────────────────────────
  _ensureTaskPool(gameType, minTasks = 20) {
    const active = extraStmts.countActiveTasks.get(gameType);
    if ((active?.count || 0) < minTasks) {
      this.seedTasks(gameType, 50);
    }
  },

  // ── Generate a procedural task ───────────────────────────────────────
  _generateTask(gameType, index) {
    const id = crypto.randomUUID();

    if (gameType === GAME_TYPES.SYNAPSE_SPOTTER) {
      // Difficulty cycles: easy → medium → hard
      const difficulty = (index % 3) + 1;
      
      // Generate seed data for procedural brain scan
      // The actual rendering happens client-side; we store generation parameters
      const isHealthy = Math.random() > 0.5;
      const data = {
        seed: crypto.randomBytes(8).toString('hex'),
        scanType: isHealthy ? 'healthy' : 'damaged',
        difficulty,
        // Parameters that affect visual generation
        noiseScale: 0.3 + Math.random() * 0.7,
        connectionDensity: isHealthy
          ? 0.6 + Math.random() * 0.4    // Healthy: dense, ordered connections
          : 0.1 + Math.random() * 0.4,   // Damaged: sparse, broken connections
        brightSpots: isHealthy
          ? Math.floor(3 + Math.random() * 5)   // Healthy: moderate, even distribution
          : Math.floor(1 + Math.random() * 8),  // Damaged: irregular, clumpy or absent
        symmetry: isHealthy
          ? 0.7 + Math.random() * 0.3     // Healthy: high bilateral symmetry
          : 0.1 + Math.random() * 0.5,   // Damaged: asymmetric
        aggregateClumps: isHealthy
          ? 0                              // Healthy: no protein aggregation
          : Math.floor(1 + Math.random() * 5),  // Damaged: alpha-syn inclusions
        pathwayIntegrity: isHealthy
          ? 0.8 + Math.random() * 0.2     // Healthy: intact neural pathways
          : 0.1 + Math.random() * 0.5,   // Damaged: broken pathways
      };

      return { id, gameType, difficulty, data };
    }

    if (gameType === GAME_TYPES.MOLECULE_SCULPTOR) {
      // Generate a protein chain puzzle
      // Difficulty maps to chain length
      const lengths = [5, 8, 10, 12, 15, 18, 20];
      const lengthIdx = index % lengths.length;
      const chainLength = lengths[lengthIdx];
      const difficulty = Math.ceil((lengthIdx + 1) / 2);

      // H = hydrophobic, P = hydrophilic (polar), S = special (can be either)
      const types = ['H', 'P'];
      const chain = [];
      for (let i = 0; i < chainLength; i++) {
        // Realistic ratio: ~40% hydrophobic in typical proteins
        const type = Math.random() < 0.4 ? 'H' : (Math.random() < 0.1 ? 'S' : 'P');
        chain.push(type);
      }

      // Calculate the theoretical optimal score (max H-H contacts possible)
      // This is a simplified estimate
      const hCount = chain.filter(t => t === 'H' || t === 'S').length;
      const optimalContacts = Math.max(0, Math.floor(hCount * 1.5));

      const data = {
        seed: crypto.randomBytes(8).toString('hex'),
        chain,
        chainLength,
        optimalContacts,
      };

      return { id, gameType, difficulty, data };
    }

    return { id, gameType, difficulty: 1, data: {} };
  },
};

module.exports = ResearchEngine;
module.exports.GAME_TYPES = GAME_TYPES;
module.exports.RP_CONFIG = RP_CONFIG;
