// ═══ WORLD SERVER — Socket.IO real-time engine for Echo Worlds ═══
const { Server } = require('socket.io');
const { stmts, db } = require('./database');

class WorldServer {
  constructor(httpServer, bot) {
    this.bot = bot; // Discord bot reference for message bridge
    this.io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      path: '/worlds'
    });
    this.players = new Map(); // socketId -> player state
    this.roomPopulations = new Map(); // roomId -> Set of socketIds

    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', socket => {
      console.log(`🌍 World client connected: ${socket.id}`);

      // ═══ AUTH & JOIN ═══
      socket.on('auth', (data, cb) => {
        const { userId, username, serverId, roomId } = data;
        if (!userId || !serverId) return cb?.({ error: 'Missing userId or serverId' });

        // Upsert user
        stmts.upsertUser.run(userId, username || 'Visitor', username, null);

        // Get or verify membership
        const server = stmts.getServer.get(serverId);
        if (!server) return cb?.({ error: 'Server not found' });

        // Get rooms for this server
        const rooms = stmts.getRoomsByServer.all(serverId);
        const startRoom = roomId ? rooms.find(r => r.id === roomId) : rooms[0];
        if (!startRoom) return cb?.({ error: 'No rooms available' });

        // Set up player state
        const player = {
          id: socket.id,
          userId,
          username: username || 'Visitor',
          serverId,
          roomId: startRoom.id,
          x: 400, y: 300,
          dir: 'down',
          skin: 'classic',
          speaking: false,
        };
        this.players.set(socket.id, player);

        // Join Socket.IO room
        socket.join(`server:${serverId}`);
        socket.join(`room:${startRoom.id}`);
        this.trackRoomPopulation(startRoom.id, socket.id, true);

        // Send world state
        cb?.({
          ok: true,
          player,
          server: { id: server.id, name: server.name, tier: server.tier },
          rooms: rooms.map(r => ({
            id: r.id, name: r.name, theme: r.theme,
            width: r.width, height: r.height,
            channelId: r.channel_id,
            isVip: !!r.is_vip, entryFee: r.entry_fee,
            objects: JSON.parse(r.objects || '[]'),
          })),
          currentRoom: startRoom.id,
          playersInRoom: this.getPlayersInRoom(startRoom.id, socket.id),
        });

        // Notify others
        socket.to(`room:${startRoom.id}`).emit('player:join', {
          id: socket.id, userId, username: player.username,
          x: player.x, y: player.y, dir: player.dir, skin: player.skin
        });

        this.broadcastRoomPopulations(serverId);
      });

      // ═══ MOVEMENT ═══
      socket.on('move', data => {
        const player = this.players.get(socket.id);
        if (!player) return;
        player.x = data.x;
        player.y = data.y;
        player.dir = data.dir || player.dir;
        socket.to(`room:${player.roomId}`).emit('player:move', {
          id: socket.id, x: data.x, y: data.y, dir: data.dir
        });
      });

      // ═══ ROOM CHANGE ═══
      socket.on('room:enter', (data, cb) => {
        const player = this.players.get(socket.id);
        if (!player) return;

        const room = stmts.getRoom.get(data.roomId);
        if (!room || room.server_id !== player.serverId) return cb?.({ error: 'Room not found' });

        // Check VIP / entry fee
        if (room.entry_fee > 0) {
          const user = stmts.getUser.get(player.userId);
          if (!user || user.coins < room.entry_fee) return cb?.({ error: 'Not enough coins' });
          stmts.spendCoins.run(room.entry_fee, player.userId, room.entry_fee);
          stmts.logTransaction.run(player.userId, 'spend', room.entry_fee, `Room entry: ${room.name}`, `room:${room.id}`);
        }

        // Leave old room
        const oldRoomId = player.roomId;
        socket.leave(`room:${oldRoomId}`);
        socket.to(`room:${oldRoomId}`).emit('player:leave', { id: socket.id });
        this.trackRoomPopulation(oldRoomId, socket.id, false);

        // Enter new room
        player.roomId = room.id;
        player.x = 400;
        player.y = 300;
        socket.join(`room:${room.id}`);
        this.trackRoomPopulation(room.id, socket.id, true);

        cb?.({
          ok: true,
          room: {
            id: room.id, name: room.name, theme: room.theme,
            width: room.width, height: room.height,
            objects: JSON.parse(room.objects || '[]'),
          },
          playersInRoom: this.getPlayersInRoom(room.id, socket.id),
        });

        // Notify new room
        socket.to(`room:${room.id}`).emit('player:join', {
          id: socket.id, userId: player.userId, username: player.username,
          x: player.x, y: player.y, dir: player.dir, skin: player.skin
        });

        this.broadcastRoomPopulations(player.serverId);
      });

      // ═══ CHAT (Room → Discord bridge) ═══
      socket.on('chat', data => {
        const player = this.players.get(socket.id);
        if (!player || !data.content) return;
        const content = data.content.slice(0, 500); // limit length

        // Broadcast to room
        this.io.to(`room:${player.roomId}`).emit('chat', {
          userId: player.userId,
          username: player.username,
          content,
          source: 'room',
          roomId: player.roomId,
          timestamp: Date.now()
        });

        // Bridge to Discord
        if (this.bot) {
          this.bot.sendToDiscord(player.serverId, player.roomId, player.username, content);
        }

        // Log
        stmts.logMessage.run(player.serverId, player.roomId, null, player.userId, player.username, content, 'room', null);
      });

      // ═══ EMOTES ═══
      socket.on('emote', data => {
        const player = this.players.get(socket.id);
        if (!player) return;
        socket.to(`room:${player.roomId}`).emit('player:emote', {
          id: socket.id, emote: data.emote
        });
      });

      // ═══ SKIN CHANGE ═══
      socket.on('skin', data => {
        const player = this.players.get(socket.id);
        if (!player) return;
        player.skin = data.skin;
        socket.to(`room:${player.roomId}`).emit('player:skin', {
          id: socket.id, skin: data.skin
        });
      });

      // ═══ VOICE STATE ═══
      socket.on('voice:speaking', data => {
        const player = this.players.get(socket.id);
        if (!player) return;
        player.speaking = data.speaking;
        socket.to(`room:${player.roomId}`).emit('player:speaking', {
          id: socket.id, speaking: data.speaking
        });
      });

      // ═══ TIPS ═══
      socket.on('tip', (data, cb) => {
        const player = this.players.get(socket.id);
        if (!player) return;
        const amount = Math.max(1, Math.min(1000, data.amount || 1));
        const targetPlayer = [...this.players.values()].find(p => p.userId === data.targetUserId);
        if (!targetPlayer) return cb?.({ error: 'Player not found' });

        const user = stmts.getUser.get(player.userId);
        if (!user || user.coins < amount) return cb?.({ error: 'Not enough coins' });

        // Transfer
        stmts.spendCoins.run(amount, player.userId, amount);
        stmts.addCoins.run(amount, targetPlayer.userId);
        stmts.logTransaction.run(player.userId, 'tip', -amount, `Tipped ${targetPlayer.username}`, targetPlayer.userId);
        stmts.logTransaction.run(targetPlayer.userId, 'tip', amount, `Tip from ${player.username}`, player.userId);

        // Notify
        this.io.to(`room:${player.roomId}`).emit('tip', {
          from: player.username, to: targetPlayer.username, amount
        });
        cb?.({ ok: true });
      });

      // ═══ DISCONNECT ═══
      socket.on('disconnect', () => {
        const player = this.players.get(socket.id);
        if (player) {
          socket.to(`room:${player.roomId}`).emit('player:leave', { id: socket.id });
          this.trackRoomPopulation(player.roomId, socket.id, false);
          this.broadcastRoomPopulations(player.serverId);
          this.players.delete(socket.id);
        }
      });
    });
  }

  // ═══ HELPERS ═══
  getPlayersInRoom(roomId, excludeSocketId) {
    const result = [];
    for (const [id, p] of this.players) {
      if (p.roomId === roomId && id !== excludeSocketId) {
        result.push({ id, userId: p.userId, username: p.username, x: p.x, y: p.y, dir: p.dir, skin: p.skin });
      }
    }
    return result;
  }

  trackRoomPopulation(roomId, socketId, joining) {
    if (!this.roomPopulations.has(roomId)) this.roomPopulations.set(roomId, new Set());
    const pop = this.roomPopulations.get(roomId);
    if (joining) pop.add(socketId); else pop.delete(socketId);
  }

  broadcastRoomPopulations(serverId) {
    const rooms = stmts.getRoomsByServer.all(serverId);
    const pops = {};
    for (const room of rooms) {
      pops[room.id] = this.roomPopulations.get(room.id)?.size || 0;
    }
    this.io.to(`server:${serverId}`).emit('room:populations', pops);
  }

  getIO() { return this.io; }
}

module.exports = WorldServer;
