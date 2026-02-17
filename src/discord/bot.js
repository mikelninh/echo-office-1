// ═══ DISCORD BOT — Echo Worlds ═══
// Connects Discord servers to Echo Worlds rooms
const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { stmts } = require('../database');

// Channel type → room theme mapping
const CHANNEL_THEME_MAP = {
  'general': { theme: 'plaza', w: 1200, h: 800 },
  'gaming': { theme: 'arcade', w: 1000, h: 800 },
  'music': { theme: 'lounge', w: 1400, h: 800 },
  'art': { theme: 'gallery', w: 1200, h: 800 },
  'memes': { theme: 'arcade', w: 1000, h: 800 },
  'voice': { theme: 'campfire', w: 800, h: 600 },
  'announcements': { theme: 'townhall', w: 1000, h: 600 },
  'welcome': { theme: 'plaza', w: 1000, h: 800 },
  'off-topic': { theme: 'park', w: 1200, h: 800 },
  'dev': { theme: 'lab', w: 1000, h: 800 },
  'help': { theme: 'library', w: 1000, h: 800 },
  'trading': { theme: 'bazaar', w: 1400, h: 800 },
  'nsfw': { theme: 'underground', w: 800, h: 600 },
};

// Default theme for unrecognized channels
function guessTheme(channelName) {
  const lower = channelName.toLowerCase();
  for (const [key, val] of Object.entries(CHANNEL_THEME_MAP)) {
    if (lower.includes(key)) return val;
  }
  return { theme: 'default', w: 800, h: 600 };
}

class EchoBot {
  constructor(token, baseUrl, io) {
    this.token = token;
    this.baseUrl = baseUrl; // e.g. 'https://echoworlds.app' or 'http://localhost:8765'
    this.io = io; // Socket.IO server for real-time bridge
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
      ]
    });
    this.setupEvents();
  }

  setupEvents() {
    this.client.on(Events.ClientReady, () => {
      console.log(`🤖 Echo Worlds Bot ready: ${this.client.user.tag}`);
      console.log(`   Serving ${this.client.guilds.cache.size} servers`);
      this.registerCommands();
    });

    // New server added
    this.client.on(Events.GuildCreate, guild => {
      console.log(`🌍 Joined server: ${guild.name} (${guild.id})`);
      this.syncServer(guild);
    });

    // Message bridge: Discord → Room
    this.client.on(Events.MessageCreate, msg => {
      if (msg.author.bot) return;
      if (!msg.guild) return;
      this.bridgeMessageToRoom(msg);
    });

    // Role updates → skin mapping
    this.client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
      this.syncMemberRoles(newMember);
    });
  }

  async start() {
    await this.client.login(this.token);
  }

  // ═══ SLASH COMMANDS ═══
  async registerCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('enter')
        .setDescription('Enter your server\'s Echo World')
        .addStringOption(opt => opt.setName('room').setDescription('Room name').setRequired(false)),

      new SlashCommandBuilder()
        .setName('world')
        .setDescription('View your Echo World info'),

      new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up Echo Worlds for this server (admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

      new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync channels to rooms (admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

      new SlashCommandBuilder()
        .setName('research')
        .setDescription('View your research contributions'),

      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the research leaderboard'),
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.token);
    try {
      await rest.put(Routes.applicationCommands(this.client.user.id), { body: commands });
      console.log('   ✅ Slash commands registered');
    } catch (e) {
      console.error('   ❌ Failed to register commands:', e.message);
    }

    this.client.on(Events.InteractionCreate, interaction => {
      if (!interaction.isChatInputCommand()) return;
      this.handleCommand(interaction);
    });
  }

  async handleCommand(interaction) {
    const { commandName, guild, user } = interaction;

    switch (commandName) {
      case 'enter': {
        const roomName = interaction.options.getString('room');
        const server = stmts.getServer.get(guild.id);
        if (!server) {
          return interaction.reply({ content: '❌ This server hasn\'t set up Echo Worlds yet. An admin needs to run `/setup` first.', ephemeral: true });
        }
        let url = `${this.baseUrl}/world/${guild.id}`;
        if (roomName) url += `?room=${encodeURIComponent(roomName)}`;
        const embed = new EmbedBuilder()
          .setColor(0x00fff7)
          .setTitle('🌍 Enter Echo World')
          .setDescription(`**${guild.name}** is waiting for you!`)
          .setURL(url);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Enter World').setStyle(ButtonStyle.Link).setURL(url).setEmoji('🚀')
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      case 'world': {
        const server = stmts.getServer.get(guild.id);
        if (!server) {
          return interaction.reply({ content: '❌ No Echo World configured. An admin needs to run `/setup`.', ephemeral: true });
        }
        const rooms = stmts.getRoomsByServer.all(guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00fff7)
          .setTitle(`🌍 ${guild.name}'s Echo World`)
          .setDescription(`**${rooms.length} rooms** · Tier: ${server.tier}`)
          .addFields(
            rooms.slice(0, 10).map(r => ({
              name: `${r.name}`,
              value: `Theme: ${r.theme} · ${r.width}×${r.height}${r.is_vip ? ' 🌟 VIP' : ''}`,
              inline: true
            }))
          )
          .setFooter({ text: `${this.baseUrl}/world/${guild.id}` });
        return interaction.reply({ embeds: [embed] });
      }

      case 'setup': {
        await this.syncServer(guild);
        const rooms = stmts.getRoomsByServer.all(guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x22cc66)
          .setTitle('✅ Echo World Created!')
          .setDescription(`**${guild.name}** now has an Echo World with **${rooms.length} rooms**!`)
          .addFields(
            { name: '🔗 World URL', value: `${this.baseUrl}/world/${guild.id}` },
            { name: '📋 Dashboard', value: `${this.baseUrl}/dashboard/${guild.id}` },
            { name: 'Next Steps', value: '• Share the URL with your community\n• Customize rooms in the dashboard\n• Set role → skin mappings' }
          );
        return interaction.reply({ embeds: [embed] });
      }

      case 'sync': {
        await this.syncServer(guild);
        const rooms = stmts.getRoomsByServer.all(guild.id);
        return interaction.reply({ content: `🔄 Synced! **${rooms.length} rooms** mapped from your channels.`, ephemeral: true });
      }

      case 'research': {
        const userData = stmts.getUser.get(user.id);
        if (!userData) {
          return interaction.reply({ content: 'You haven\'t entered Echo Worlds yet! Use `/enter` to start.', ephemeral: true });
        }
        const stats = stmts.getUserResearchStats.all(user.id);
        const totalRP = stats.reduce((sum, s) => sum + (s.total_rp || 0), 0);
        const totalContribs = stats.reduce((sum, s) => sum + s.count, 0);
        const embed = new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle('🔬 Your Research Contributions')
          .setDescription(`**${totalContribs}** contributions · **${totalRP} RP** earned`)
          .addFields(
            stats.map(s => ({
              name: s.game_type.replace('_', ' '),
              value: `${s.count} tasks · ${s.total_rp} RP`,
              inline: true
            }))
          )
          .setFooter({ text: 'Research Points cannot be bought — only earned through contribution.' });
        return interaction.reply({ embeds: [embed] });
      }

      case 'leaderboard': {
        const top = require('../database').db.prepare(
          'SELECT u.username, u.research_points FROM users u WHERE u.research_points > 0 ORDER BY u.research_points DESC LIMIT 10'
        ).all();
        const embed = new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle('🏆 Research Leaderboard')
          .setDescription(top.length === 0 ? 'No contributions yet!' :
            top.map((u, i) => `${i === 0 ? '👑' : `${i + 1}.`} **${u.username}** — ${u.research_points} RP`).join('\n')
          )
          .setFooter({ text: 'Contribute in The Lab to climb the ranks!' });
        return interaction.reply({ embeds: [embed] });
      }
    }
  }

  // ═══ SERVER SYNC ═══
  async syncServer(guild) {
    // Upsert server
    stmts.upsertServer.run(guild.id, guild.name, guild.iconURL(), guild.ownerId);

    // Get text channels
    const channels = guild.channels.cache.filter(c => c.type === 0); // Text channels
    const existingRooms = stmts.getRoomsByServer.all(guild.id);
    const existingChannelIds = new Set(existingRooms.map(r => r.channel_id));

    // Create rooms for new channels
    for (const [, channel] of channels) {
      if (existingChannelIds.has(channel.id)) continue;
      const { theme, w, h } = guessTheme(channel.name);
      stmts.createRoom.run(
        guild.id, channel.id, channel.name, theme, w, h,
        '[]', '{}', guild.ownerId
      );
    }

    // Sync members
    try {
      const members = await guild.members.fetch({ limit: 200 });
      for (const [, member] of members) {
        if (member.user.bot) continue;
        stmts.upsertUser.run(
          member.user.id, member.user.username,
          member.displayName, member.user.displayAvatarURL()
        );
        const roles = member.roles.cache.map(r => r.id);
        stmts.upsertMembership.run(member.user.id, guild.id, JSON.stringify(roles));
      }
    } catch (e) {
      console.warn(`Could not fetch members for ${guild.name}:`, e.message);
    }

    console.log(`🔄 Synced server: ${guild.name} (${channels.size} channels)`);
  }

  syncMemberRoles(member) {
    const roles = member.roles.cache.map(r => r.id);
    stmts.upsertMembership.run(member.user.id, member.guild.id, JSON.stringify(roles));
  }

  // ═══ MESSAGE BRIDGE ═══
  bridgeMessageToRoom(msg) {
    const room = stmts.getRoomByChannel.get(msg.guild.id, msg.channel.id);
    if (!room) return;

    // Log the message
    stmts.logMessage.run(
      msg.guild.id, room.id, msg.channel.id,
      msg.author.id, msg.author.username,
      msg.content, 'discord', msg.id
    );

    // Broadcast to Socket.IO room
    if (this.io) {
      this.io.to(`room:${room.id}`).emit('chat', {
        userId: msg.author.id,
        username: msg.author.username,
        displayName: msg.member?.displayName || msg.author.username,
        content: msg.content,
        source: 'discord',
        avatarUrl: msg.author.displayAvatarURL({ size: 32 }),
        roomId: room.id,
        timestamp: Date.now()
      });
    }
  }

  // Bridge from room → Discord
  async sendToDiscord(serverId, roomId, username, content) {
    const room = stmts.getRoom.get(roomId);
    if (!room || !room.channel_id) return;

    const guild = this.client.guilds.cache.get(serverId);
    if (!guild) return;

    const channel = guild.channels.cache.get(room.channel_id);
    if (!channel) return;

    try {
      const webhook = await this.getOrCreateWebhook(channel);
      await webhook.send({
        content: content,
        username: `${username} (Echo World)`,
        avatarURL: `${this.baseUrl}/api/avatar/${username}`,
      });

      // Log
      stmts.logMessage.run(serverId, roomId, room.channel_id, 'room_user', username, content, 'room', null);
    } catch (e) {
      console.warn(`Bridge to Discord failed:`, e.message);
    }
  }

  async getOrCreateWebhook(channel) {
    const webhooks = await channel.fetchWebhooks();
    let wh = webhooks.find(w => w.name === 'Echo Worlds');
    if (!wh) {
      wh = await channel.createWebhook({ name: 'Echo Worlds', reason: 'Echo Worlds message bridge' });
    }
    return wh;
  }
}

module.exports = EchoBot;
