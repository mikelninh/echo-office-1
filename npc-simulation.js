// npc-simulation.js — Living Society Simulation
// OCEAN personality model, needs, jobs, farming, trading, relationships, growth
// Rules + Randomness + Personality = Life
// ─────────────────────────────────────────────────────────────────────────────
(function StationLife() {
  'use strict';

  // ─── Wait for game ──────────────────────────────────────────────────────────
  function waitReady(fn) {
    if (typeof window.S !== 'undefined' && window.ctx) fn();
    else setTimeout(function () { waitReady(fn); }, 250);
  }

  // ─── Constants ──────────────────────────────────────────────────────────────
  var TICK_RATE = 1;            // Simulation ticks per real second
  var TIME_SCALE = 1;           // 1:1 real time — synced with the player's clock
  var MAX_POPULATION = 50;
  var FEED_MAX = 6;

  // Floors and their purposes
  var FLOOR_INFO = {
    1:  { name: "Echo's Bar",     type: 'social',    jobs: ['bartender','musician','regular'] },
    2:  { name: 'Observatory',    type: 'study',     jobs: ['astronomer','philosopher','guide'] },
    3:  { name: 'Arcade Floor',   type: 'recreation', jobs: ['arcade_tech','competitor','streamer'] },
    4:  { name: 'Garden Biodome', type: 'farming',   jobs: ['farmer','botanist','herbalist'] },
    5:  { name: 'Secret Lab',     type: 'work',      jobs: ['engineer','researcher','janitor'] },
    6:  { name: 'Record Lounge',  type: 'culture',   jobs: ['dj','vinyl_collector','poet'] },
    7:  { name: 'Community Deck', type: 'commerce',  jobs: ['merchant','courier','craftsperson'] },
    8:  { name: 'Docking Bay',    type: 'transit',   jobs: ['mechanic','security','customs'] },
    9:  { name: 'The Archive',    type: 'mystery',   jobs: ['archivist','seeker','historian'] },
    10: { name: 'The Underground', type: 'nightlife', jobs: ['bouncer','dancer','barback'] },
    11: { name: 'Workshop',       type: 'craft',     jobs: ['smith','tailor','jeweler'] },
    12: { name: 'The Cinema',     type: 'culture',   jobs: ['projectionist','critic','usher'] },
  };

  // Job descriptions drive daily routines
  var JOB_INFO = {
    bartender:      { floor: 1,  wage: 8,  shift: [16,2],  social: 0.8, skill: 'mixing' },
    musician:       { floor: 1,  wage: 5,  shift: [18,1],  social: 0.6, skill: 'music' },
    regular:        { floor: 1,  wage: 0,  shift: [17,23], social: 0.5, skill: null },
    astronomer:     { floor: 2,  wage: 10, shift: [20,4],  social: 0.2, skill: 'science' },
    philosopher:    { floor: 2,  wage: 3,  shift: [22,6],  social: 0.3, skill: 'wisdom' },
    guide:          { floor: 2,  wage: 6,  shift: [10,18], social: 0.7, skill: 'social' },
    arcade_tech:    { floor: 3,  wage: 7,  shift: [8,16],  social: 0.4, skill: 'tech' },
    competitor:     { floor: 3,  wage: 0,  shift: [12,22], social: 0.6, skill: 'gaming' },
    streamer:       { floor: 3,  wage: 4,  shift: [14,22], social: 0.9, skill: 'performance' },
    farmer:         { floor: 4,  wage: 6,  shift: [5,13],  social: 0.3, skill: 'farming' },
    botanist:       { floor: 4,  wage: 8,  shift: [6,14],  social: 0.2, skill: 'science' },
    herbalist:      { floor: 4,  wage: 7,  shift: [7,15],  social: 0.4, skill: 'crafting' },
    engineer:       { floor: 5,  wage: 12, shift: [8,16],  social: 0.3, skill: 'tech' },
    researcher:     { floor: 5,  wage: 10, shift: [9,17],  social: 0.2, skill: 'science' },
    janitor:        { floor: 5,  wage: 5,  shift: [6,14],  social: 0.4, skill: null },
    dj:             { floor: 6,  wage: 8,  shift: [20,4],  social: 0.7, skill: 'music' },
    vinyl_collector:{ floor: 6,  wage: 3,  shift: [10,18], social: 0.3, skill: 'collecting' },
    poet:           { floor: 6,  wage: 2,  shift: [14,22], social: 0.4, skill: 'art' },
    merchant:       { floor: 7,  wage: 10, shift: [8,20],  social: 0.6, skill: 'trading' },
    courier:        { floor: 7,  wage: 6,  shift: [6,18],  social: 0.5, skill: null },
    craftsperson:   { floor: 7,  wage: 8,  shift: [8,16],  social: 0.4, skill: 'crafting' },
    mechanic:       { floor: 8,  wage: 9,  shift: [6,14],  social: 0.3, skill: 'tech' },
    security:       { floor: 8,  wage: 7,  shift: [0,24],  social: 0.5, skill: 'combat' },
    customs:        { floor: 8,  wage: 6,  shift: [8,16],  social: 0.6, skill: 'social' },
    archivist:      { floor: 9,  wage: 8,  shift: [10,18], social: 0.1, skill: 'wisdom' },
    seeker:         { floor: 9,  wage: 0,  shift: [0,24],  social: 0.2, skill: null },
    historian:      { floor: 9,  wage: 7,  shift: [9,17],  social: 0.3, skill: 'wisdom' },
    bouncer:        { floor: 10, wage: 7,  shift: [20,4],  social: 0.5, skill: 'combat' },
    dancer:         { floor: 10, wage: 5,  shift: [21,3],  social: 0.8, skill: 'performance' },
    barback:        { floor: 10, wage: 4,  shift: [19,3],  social: 0.4, skill: null },
    smith:          { floor: 11, wage: 10, shift: [7,15],  social: 0.3, skill: 'crafting' },
    tailor:         { floor: 11, wage: 8,  shift: [8,16],  social: 0.5, skill: 'crafting' },
    jeweler:        { floor: 11, wage: 9,  shift: [9,17],  social: 0.3, skill: 'crafting' },
    projectionist:  { floor: 12, wage: 6,  shift: [14,23], social: 0.3, skill: 'tech' },
    critic:         { floor: 12, wage: 4,  shift: [14,22], social: 0.5, skill: 'art' },
    usher:          { floor: 12, wage: 3,  shift: [14,22], social: 0.7, skill: 'social' },
  };

  // Crop types for farming
  var CROPS = {
    wheat:       { growTime: 3, sellPrice: 3, icon: '🌾', difficulty: 0.1 },
    mushroom:    { growTime: 2, sellPrice: 5, icon: '🍄', difficulty: 0.2 },
    herb:        { growTime: 4, sellPrice: 8, icon: '🌿', difficulty: 0.3 },
    flower:      { growTime: 5, sellPrice: 6, icon: '🌸', difficulty: 0.2 },
    luminous_moss:{ growTime: 8, sellPrice: 15, icon: '✨', difficulty: 0.5 },
    starfruit:   { growTime: 12, sellPrice: 25, icon: '⭐', difficulty: 0.7 },
    crystal_bean:{ growTime: 6, sellPrice: 12, icon: '💎', difficulty: 0.4 },
    void_pepper: { growTime: 10, sellPrice: 20, icon: '🌶️', difficulty: 0.6 },
  };

  // Emotions and their triggers
  var EMOTIONS = {
    happy:     { icon: '😊', decay: 0.02, color: '#ffdd44' },
    excited:   { icon: '🤩', decay: 0.04, color: '#ff6ec7' },
    sad:       { icon: '😢', decay: 0.03, color: '#4488cc' },
    angry:     { icon: '😤', decay: 0.05, color: '#ff4444' },
    anxious:   { icon: '😰', decay: 0.03, color: '#aa88cc' },
    peaceful:  { icon: '😌', decay: 0.01, color: '#88cc88' },
    proud:     { icon: '😎', decay: 0.03, color: '#ffaa00' },
    lonely:    { icon: '🥺', decay: 0.02, color: '#8888aa' },
    curious:   { icon: '🤔', decay: 0.04, color: '#44ccff' },
    loving:    { icon: '🥰', decay: 0.02, color: '#ff88aa' },
    neutral:   { icon: '😐', decay: 0,    color: '#aaaaaa' },
  };

  // ─── Name Generators ───────────────────────────────────────────────────────
  var FIRST_NAMES = [
    'Ash','Birch','Cedar','Elm','Ivy','Hazel','Sage','Reed','Fern','Moss',
    'Flint','Cinder','Spark','Ember','Blaze','Frost','Storm','Rain','Cloud','Mist',
    'Pixel','Chip','Data','Link','Dash','Pulse','Vector','Hex','Bit','Rune',
    'Luna','Stella','Nova','Vega','Orion','Lyra','Atlas','Rigel','Cassi','Altair',
    'Kip','Zuzu','Mochi','Pippin','Taro','Mango','Clover','Poppy','Fig','Olive'
  ];

  var LAST_NAMES = [
    'Nightwhisper','Stardust','Ironleaf','Coldforge','Brightwater',
    'Darkhollow','Moonridge','Firethorn','Cloudbreak','Stonehart',
    'Wavecrest','Sundown','Driftwood','Ashborne','Thornvale',
    'Glimmer','Voidwalker','Sparkfield','Rustgear','Deeproot'
  ];

  // Available skins (subset of visitor skins)
  var NPC_SKINS = [
    'hooded','jacket','spiky','beret','glasses','punk','cape','hat',
    'scarf','overalls','bandana','aviator','tactical','casual',
    'formal','cyberpunk','steampunk','neon','pastel','earth'
  ];

  // ─── OCEAN Trait Generation ─────────────────────────────────────────────────
  // Based on Big Five / OCEAN model (scientifically validated)
  // Each trait 0.0–1.0 with normal distribution (mean 0.5, sd 0.15)

  function gaussRandom(mean, sd) {
    // Box-Muller transform
    var u1 = Math.random(), u2 = Math.random();
    var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.min(1, mean + z * sd));
  }

  function generateOCEAN(jobHint) {
    // Base random personality
    var o = gaussRandom(0.5, 0.18);
    var c = gaussRandom(0.5, 0.18);
    var e = gaussRandom(0.5, 0.18);
    var a = gaussRandom(0.5, 0.18);
    var n = gaussRandom(0.5, 0.18);

    // Job-based personality nudges (real-world correlations)
    var job = JOB_INFO[jobHint];
    if (job) {
      // Social jobs nudge extraversion up
      e = Math.min(1, e + job.social * 0.2);
      // Technical jobs nudge openness and conscientiousness up
      if (job.skill === 'tech' || job.skill === 'science') {
        o = Math.min(1, o + 0.1);
        c = Math.min(1, c + 0.1);
      }
      // Art/music jobs nudge openness up, conscientiousness down slightly
      if (job.skill === 'music' || job.skill === 'art' || job.skill === 'performance') {
        o = Math.min(1, o + 0.15);
        c = Math.max(0, c - 0.05);
        e = Math.min(1, e + 0.1);
      }
      // Farming nudges agreeableness and conscientiousness up
      if (job.skill === 'farming') {
        a = Math.min(1, a + 0.15);
        c = Math.min(1, c + 0.1);
        n = Math.max(0, n - 0.1);
      }
      // Combat nudges neuroticism down
      if (job.skill === 'combat') {
        n = Math.max(0, n - 0.15);
        a = Math.max(0, a - 0.1);
      }
    }

    return {
      openness: Math.round(o * 100) / 100,
      conscientiousness: Math.round(c * 100) / 100,
      extraversion: Math.round(e * 100) / 100,
      agreeableness: Math.round(a * 100) / 100,
      neuroticism: Math.round(n * 100) / 100
    };
  }

  // ─── Needs System (Maslow-inspired) ─────────────────────────────────────────
  // Needs decay over time. NPCs seek to fulfill them. Unmet needs cause emotions.

  function createNeeds() {
    return {
      energy:    1.0,  // Sleep/rest
      hunger:    1.0,  // Food/eating
      social:    0.8,  // Talking, being near others
      fun:       0.7,  // Entertainment, play
      purpose:   0.6,  // Work, contribution, meaning
      growth:    0.5,  // Learning, leveling up
      comfort:   0.8,  // Home, safety
      belonging: 0.6,  // Community, friends, groups
    };
  }

  // Decay rates per REAL hour, modified by personality
  // Calibrated so needs deplete over a full real day (need ~0.06/h to go 1→0 in 16 waking hours)
  function needDecayRates(ocean) {
    return {
      energy:    0.06 + ocean.neuroticism * 0.01,        // Anxious people tire faster
      hunger:    0.07,                                     // Everyone gets hungry (~3 meals/day)
      social:    0.04 * ocean.extraversion + 0.02,        // Extraverts need more social
      fun:       0.03 + ocean.openness * 0.02,            // Creative people need stimulation
      purpose:   0.03 * ocean.conscientiousness + 0.01,   // Disciplined people need purpose
      growth:    0.02 + ocean.openness * 0.02,            // Curious people need to learn
      comfort:   0.02 + ocean.neuroticism * 0.02,         // Anxious people need comfort
      belonging: 0.03 * ocean.agreeableness + 0.01,       // Agreeable people need belonging
    };
  }

  // ─── NPC Generation ─────────────────────────────────────────────────────────

  function generateNPC(id) {
    // Pick a job (weighted by floor population — distribute evenly)
    var allJobs = Object.keys(JOB_INFO);
    var job = allJobs[Math.floor(Math.random() * allJobs.length)];
    var jobInfo = JOB_INFO[job];

    var firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    var lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

    var ocean = generateOCEAN(job);
    var needs = createNeeds();

    // Starting time offset so NPCs aren't all in sync
    var timeOffset = Math.random() * 24;

    return {
      id: 'npc_' + id,
      name: firstName,
      fullName: firstName + ' ' + lastName,
      skin: NPC_SKINS[Math.floor(Math.random() * NPC_SKINS.length)],
      dir: Math.floor(Math.random() * 4),
      frame: 0,
      frameTimer: 0,

      // Location
      homeFloor: jobInfo.floor,
      floor: jobInfo.floor,
      x: 50 + Math.random() * 700,
      y: 100 + Math.random() * 400,
      targetX: 0, targetY: 0,
      moving: false,
      speed: 40 + Math.random() * 30,

      // Job & Economy
      job: job,
      jobTitle: job.replace(/_/g, ' '),
      wage: jobInfo.wage,
      shift: jobInfo.shift,
      coins: 20 + Math.floor(Math.random() * 80),  // Starting savings
      level: 1,
      xp: 0,
      xpToLevel: 100,

      // Personality (OCEAN — Big Five)
      ocean: ocean,

      // Needs (Maslow-inspired)
      needs: needs,
      needDecay: needDecayRates(ocean),

      // Emotional State
      emotion: 'neutral',
      emotionIntensity: 0.5,
      mood: 0.6, // 0=miserable, 1=ecstatic — long-term emotional average

      // Social
      friends: [],         // [npcId, ...]
      bestFriend: null,
      relationships: {},   // npcId -> { trust: 0-1, history: [] }
      lastSocialTime: 0,
      conversationPartner: null,

      // Farm plot (if farmer/botanist/herbalist)
      farm: jobInfo.skill === 'farming' ? {
        plots: [
          { crop: null, planted: 0, growth: 0, watered: false },
          { crop: null, planted: 0, growth: 0, watered: false },
          { crop: null, planted: 0, growth: 0, watered: false },
        ],
        harvested: 0,
        totalSold: 0,
      } : null,

      // Inventory
      inventory: [],  // [{ type, name, quantity }]

      // Goals / Ambitions
      goals: [],      // [{ type, target, progress, deadline }]
      achievements: [],

      // State machine
      state: 'idle',  // idle, working, eating, sleeping, socializing, shopping, farming, exploring, resting
      stateTimer: 0,
      stateData: null,

      // Memory (recent events this NPC experienced)
      memory: [],     // [{ event, time, emotion }] — last 20 events
      opinions: {},   // topic -> sentiment (-1 to 1)

      // Sim time
      simTimeOffset: timeOffset,
      dayNumber: 0,
      awake: true,
      sleepTime: 22 + Math.random() * 2,  // When they prefer to sleep (22-24)
      wakeTime: 6 + Math.random() * 2,    // When they wake up (6-8)

      // Faith
      faith: 0.2 + Math.random() * 0.3 + gaussRandom(0.5, 0.15) * ocean.openness * 0.3,

      // Feedback (opinions about the station — for the "game designer")
      feedback: [],   // [{ text, sentiment, priority }]
      lastFeedbackTime: 0,

      // Visual
      bubbleText: null,
      bubbleTimer: 0,
      bubbleType: 'speech',
      emoteTimer: 0,
      emoteIcon: null,
    };
  }

  // ─── Real-Time Clock (synced with player's local time) ──────────────────────

  var _simDay = 1;
  var _lastRealDay = new Date().getDate();

  function getSimHour() {
    var now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }
  function getSimDay() { return _simDay; }

  function isNightTime() {
    var h = getSimHour();
    return h >= 22 || h < 6;
  }

  // _simTime tracks cumulative hours for prayer/event timing (still advances in real-time)
  var _simTime = getSimHour();

  function advanceClock(dt) {
    _simTime += dt / 3600; // dt in real seconds → real hours
    // Detect day change from real clock
    var today = new Date().getDate();
    if (today !== _lastRealDay) {
      _lastRealDay = today;
      _simDay++;
      onNewDay();
    }
  }

  // ─── Population ─────────────────────────────────────────────────────────────

  var _population = [];
  var _populationById = {};

  function populate(count) {
    for (var i = 0; i < count; i++) {
      var npc = generateNPC(i);

      // Ensure name uniqueness
      var attempts = 0;
      while (_populationById[npc.name] && attempts < 20) {
        npc.name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        npc.fullName = npc.name + ' ' + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        attempts++;
      }

      _population.push(npc);
      _populationById[npc.id] = npc;
    }

    // Generate initial goals
    _population.forEach(function (npc) {
      generateGoal(npc);
      // Set initial friendships (2-4 random)
      var numFriends = 2 + Math.floor(Math.random() * 3);
      for (var f = 0; f < numFriends; f++) {
        var other = _population[Math.floor(Math.random() * _population.length)];
        if (other.id !== npc.id && npc.friends.indexOf(other.id) === -1) {
          npc.friends.push(other.id);
          npc.relationships[other.id] = { trust: 0.3 + Math.random() * 0.4, history: [] };
        }
      }
    });

    console.log('🌍 Station populated: ' + count + ' inhabitants');
  }

  // ─── Goal System ────────────────────────────────────────────────────────────

  var GOAL_TYPES = [
    { type: 'save_coins',  label: 'Save ◈{target}', targetRange: [50, 500] },
    { type: 'reach_level', label: 'Reach level {target}', targetRange: [2, 10] },
    { type: 'make_friend', label: 'Make a new friend', targetRange: [1, 1] },
    { type: 'visit_floor', label: 'Visit floor {target}', targetRange: [1, 12] },
    { type: 'harvest_crops', label: 'Harvest {target} crops', targetRange: [5, 30] },
    { type: 'win_game',    label: 'Win at the arcade', targetRange: [1, 5] },
    { type: 'buy_skin',    label: 'Buy a new skin', targetRange: [1, 1] },
    { type: 'help_someone', label: 'Help someone', targetRange: [1, 3] },
  ];

  function generateGoal(npc) {
    if (npc.goals.length >= 3) return; // Max 3 active goals

    var goalDef = GOAL_TYPES[Math.floor(Math.random() * GOAL_TYPES.length)];
    var range = goalDef.targetRange;
    var target = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));

    // Skip farm goals for non-farmers
    if (goalDef.type === 'harvest_crops' && !npc.farm) {
      goalDef = GOAL_TYPES[0]; // Default to save coins
      target = 50 + Math.floor(Math.random() * 200);
    }

    npc.goals.push({
      type: goalDef.type,
      label: goalDef.label.replace('{target}', target),
      target: target,
      progress: 0,
      startDay: _simDay
    });
  }

  function checkGoals(npc) {
    for (var i = npc.goals.length - 1; i >= 0; i--) {
      var g = npc.goals[i];
      var complete = false;

      switch (g.type) {
        case 'save_coins': complete = npc.coins >= g.target; break;
        case 'reach_level': complete = npc.level >= g.target; break;
        case 'make_friend': complete = g.progress >= g.target; break;
        case 'visit_floor': complete = g.progress >= 1; break;
        case 'harvest_crops': complete = g.progress >= g.target; break;
        case 'win_game': complete = g.progress >= g.target; break;
        case 'buy_skin': complete = g.progress >= 1; break;
        case 'help_someone': complete = g.progress >= g.target; break;
      }

      if (complete) {
        npc.goals.splice(i, 1);
        npc.achievements.push({ goal: g.label, day: _simDay });
        npc.xp += 25;
        triggerEmotion(npc, 'proud', 0.7);
        setBubble(npc, '🎉 Goal complete: ' + g.label, 'achievement', 4);
        addFeedMessage(npc, '🏆', npc.name + ' achieved: ' + g.label);
        checkLevelUp(npc);
      }
    }
  }

  function checkLevelUp(npc) {
    while (npc.xp >= npc.xpToLevel) {
      npc.xp -= npc.xpToLevel;
      npc.level++;
      npc.xpToLevel = Math.floor(npc.xpToLevel * 1.5);
      triggerEmotion(npc, 'excited', 0.8);
      setBubble(npc, '⬆️ Level ' + npc.level + '!', 'achievement', 3);
      addFeedMessage(npc, '⬆️', npc.name + ' reached level ' + npc.level + '!');
      generateGoal(npc);
    }
  }

  // ─── Emotion System ─────────────────────────────────────────────────────────

  function triggerEmotion(npc, emotion, intensity) {
    // Personality modulates emotional response
    var mod = 1.0;
    if (emotion === 'anxious' || emotion === 'sad') mod += npc.ocean.neuroticism * 0.5;
    if (emotion === 'happy' || emotion === 'excited') mod += (1 - npc.ocean.neuroticism) * 0.3;
    if (emotion === 'angry') mod += (1 - npc.ocean.agreeableness) * 0.4;

    var finalIntensity = Math.min(1, intensity * mod);

    // Only override if stronger than current emotion
    if (finalIntensity > npc.emotionIntensity || npc.emotion === 'neutral') {
      npc.emotion = emotion;
      npc.emotionIntensity = finalIntensity;
    }

    // Update long-term mood
    var moodImpact = 0;
    if (['happy','excited','proud','peaceful','loving'].indexOf(emotion) >= 0) moodImpact = 0.05;
    else if (['sad','angry','anxious','lonely'].indexOf(emotion) >= 0) moodImpact = -0.05;
    npc.mood = Math.max(0, Math.min(1, npc.mood + moodImpact * finalIntensity));

    // Add to memory
    addMemory(npc, 'felt ' + emotion, emotion);
  }

  function decayEmotion(npc, dt) {
    if (npc.emotion === 'neutral') return;
    var info = EMOTIONS[npc.emotion];
    if (!info) return;
    npc.emotionIntensity -= info.decay * dt * 60; // per sim minute
    if (npc.emotionIntensity <= 0.1) {
      npc.emotion = 'neutral';
      npc.emotionIntensity = 0.5;
    }
  }

  // ─── Memory ─────────────────────────────────────────────────────────────────

  function addMemory(npc, event, emotion) {
    npc.memory.push({ event: event, time: _simTime, emotion: emotion || npc.emotion });
    if (npc.memory.length > 20) npc.memory.shift();
  }

  // ─── Needs Fulfillment ──────────────────────────────────────────────────────

  function decayNeeds(npc, dtHours) {
    for (var need in npc.needs) {
      npc.needs[need] = Math.max(0, npc.needs[need] - npc.needDecay[need] * dtHours);
    }
  }

  function getLowestNeed(npc) {
    var lowest = 'energy', lowestVal = 2;
    for (var need in npc.needs) {
      if (npc.needs[need] < lowestVal) {
        lowestVal = npc.needs[need];
        lowest = need;
      }
    }
    return { need: lowest, value: lowestVal };
  }

  // ─── State Machine: Behavior AI ────────────────────────────────────────────

  function decideBehavior(npc) {
    var hour = getSimHour();
    var lowest = getLowestNeed(npc);
    var jobInfo = JOB_INFO[npc.job];

    // Critical needs override everything
    if (npc.needs.energy < 0.15) return 'sleeping';
    if (npc.needs.hunger < 0.2) return 'eating';

    // Sleep schedule (personality affects bedtime)
    if (!npc.awake) return 'sleeping';
    var sleepHour = npc.sleepTime;
    var wakeHour = npc.wakeTime;
    if (hour >= sleepHour || hour < wakeHour) {
      if (npc.ocean.conscientiousness > 0.6) return 'sleeping'; // Disciplined sleeps on time
      if (npc.needs.energy < 0.4) return 'sleeping'; // Tired enough
      // Night owls (low C, high O) might stay up
    }

    // Work hours
    if (jobInfo) {
      var shiftStart = jobInfo.shift[0];
      var shiftEnd = jobInfo.shift[1];
      var onShift = (shiftStart < shiftEnd)
        ? (hour >= shiftStart && hour < shiftEnd)
        : (hour >= shiftStart || hour < shiftEnd);
      if (onShift && npc.needs.purpose < 0.7) return 'working';
    }

    // Farming (farmers tend plots outside work hours too)
    if (npc.farm && npc.needs.purpose < 0.6) return 'farming';

    // Social needs
    if (lowest.need === 'social' && lowest.value < 0.4) return 'socializing';

    // Fun needs
    if (lowest.need === 'fun' && lowest.value < 0.4) return 'exploring';

    // Growth needs
    if (lowest.need === 'growth' && lowest.value < 0.3) return 'exploring';

    // Shop if has coins and wants something
    if (npc.coins > 50 && Math.random() < 0.1 * npc.ocean.openness) return 'shopping';

    // Default: wander/idle on home floor
    return 'idle';
  }

  // ─── State Handlers ─────────────────────────────────────────────────────────

  function handleState(npc, dt, dtHours) {
    npc.stateTimer += dt;

    switch (npc.state) {
      case 'idle':
        handleIdle(npc, dt);
        break;
      case 'working':
        handleWorking(npc, dt, dtHours);
        break;
      case 'sleeping':
        handleSleeping(npc, dt, dtHours);
        break;
      case 'eating':
        handleEating(npc, dt, dtHours);
        break;
      case 'socializing':
        handleSocializing(npc, dt, dtHours);
        break;
      case 'farming':
        handleFarming(npc, dt, dtHours);
        break;
      case 'exploring':
        handleExploring(npc, dt, dtHours);
        break;
      case 'shopping':
        handleShopping(npc, dt, dtHours);
        break;
    }
  }

  function setState(npc, newState) {
    if (npc.state === newState) return;
    npc.state = newState;
    npc.stateTimer = 0;
    npc.stateData = null;
  }

  function handleIdle(npc, dt) {
    // Wander occasionally
    if (!npc.moving && Math.random() < dt * 0.3) {
      npc.targetX = 50 + Math.random() * 700;
      npc.targetY = 100 + Math.random() * 400;
      npc.moving = true;
    }

    // Random thoughts
    if (Math.random() < dt * 0.02 * npc.ocean.openness) {
      var thoughts = getIdleThoughts(npc);
      if (thoughts.length > 0) setBubble(npc, pick(thoughts), 'thought', 3);
    }

    // Re-evaluate after some time
    if (npc.stateTimer > 5 + Math.random() * 10) {
      var newState = decideBehavior(npc);
      setState(npc, newState);
    }
  }

  function handleWorking(npc, dt, dtHours) {
    // Go to work floor
    if (npc.floor !== JOB_INFO[npc.job].floor) {
      npc.floor = JOB_INFO[npc.job].floor;
      npc.x = 100 + Math.random() * 600;
      npc.y = 150 + Math.random() * 300;
    }

    // Fulfill purpose need
    npc.needs.purpose = Math.min(1, npc.needs.purpose + 0.08 * dtHours);
    npc.xp += dtHours * 2;

    // Earn wages
    npc.coins += npc.wage * dtHours;

    // Work-related behaviors
    if (Math.random() < dt * 0.01) {
      var workThoughts = getWorkThoughts(npc);
      if (workThoughts.length > 0) setBubble(npc, pick(workThoughts), 'speech', 3);
    }

    // Occasional movement at workplace
    if (!npc.moving && Math.random() < dt * 0.2) {
      npc.targetX = npc.x + (Math.random() - 0.5) * 100;
      npc.targetY = npc.y + (Math.random() - 0.5) * 80;
      npc.targetX = Math.max(30, Math.min(770, npc.targetX));
      npc.targetY = Math.max(60, Math.min(550, npc.targetY));
      npc.moving = true;
    }

    // Check if shift is over
    if (npc.stateTimer > 30) { // Re-evaluate after ~30s
      var newState = decideBehavior(npc);
      if (newState !== 'working') setState(npc, newState);
    }
  }

  function handleSleeping(npc, dt, dtHours) {
    npc.awake = false;
    npc.needs.energy = Math.min(1, npc.needs.energy + 0.15 * dtHours);
    npc.needs.comfort = Math.min(1, npc.needs.comfort + 0.05 * dtHours);

    // Go home to sleep
    if (npc.floor !== npc.homeFloor) {
      npc.floor = npc.homeFloor;
      npc.x = 300 + Math.random() * 200;
      npc.y = 250 + Math.random() * 100;
    }
    npc.moving = false; // Stay still while sleeping

    // Show zzz
    if (npc.stateTimer % 4 < 0.1) {
      npc.emoteIcon = '💤';
      npc.emoteTimer = 2;
    }

    // Wake up
    var hour = getSimHour();
    if (hour >= npc.wakeTime && hour < npc.wakeTime + 4 && npc.needs.energy > 0.6) {
      npc.awake = true;
      setState(npc, 'idle');
      triggerEmotion(npc, npc.mood > 0.5 ? 'happy' : 'neutral', 0.4);
    }
  }

  function handleEating(npc, dt, dtHours) {
    // Go to bar (Floor 1) or garden (Floor 4)
    var eatFloor = Math.random() < 0.6 ? 1 : 4;
    if (npc.floor !== eatFloor) {
      npc.floor = eatFloor;
      npc.x = 200 + Math.random() * 400;
      npc.y = 200 + Math.random() * 200;
    }

    npc.needs.hunger = Math.min(1, npc.needs.hunger + 0.3 * dtHours);
    npc.coins -= 2; // Food costs coins

    if (npc.needs.hunger > 0.7) {
      triggerEmotion(npc, 'happy', 0.3);
      setState(npc, 'idle');
    }

    if (Math.random() < dt * 0.02) {
      var foods = ['☕ coffee', '🍜 noodles', '🥐 pastry', '🍵 tea', '🌮 wrap', '🍄 mushroom soup'];
      setBubble(npc, '*enjoying ' + pick(foods) + '*', 'activity', 3);
    }
  }

  function handleSocializing(npc, dt, dtHours) {
    npc.needs.social = Math.min(1, npc.needs.social + 0.12 * dtHours);
    npc.needs.belonging = Math.min(1, npc.needs.belonging + 0.05 * dtHours);

    // Find someone to talk to on current floor
    if (!npc.conversationPartner) {
      var nearby = _population.filter(function (other) {
        return other.id !== npc.id && other.floor === npc.floor && other.state !== 'sleeping';
      });
      if (nearby.length > 0) {
        var partner = pick(nearby);
        npc.conversationPartner = partner.id;
        // Move toward partner
        npc.targetX = partner.x + (Math.random() - 0.5) * 40;
        npc.targetY = partner.y + (Math.random() - 0.5) * 30;
        npc.moving = true;

        // Social interaction effects
        if (npc.friends.indexOf(partner.id) === -1 && Math.random() < 0.15 * npc.ocean.agreeableness) {
          npc.friends.push(partner.id);
          partner.friends.push(npc.id);
          npc.relationships[partner.id] = { trust: 0.3, history: [] };
          partner.relationships[npc.id] = { trust: 0.3, history: [] };
          triggerEmotion(npc, 'happy', 0.5);
          triggerEmotion(partner, 'happy', 0.4);
          setBubble(npc, 'Nice to meet you, ' + partner.name + '!', 'speech', 3);
          addFeedMessage(npc, '🤝', npc.name + ' befriended ' + partner.name);
          // Goal progress
          npc.goals.forEach(function (g) { if (g.type === 'make_friend') g.progress++; });
        } else if (npc.friends.indexOf(partner.id) >= 0) {
          // Strengthen existing friendship
          var rel = npc.relationships[partner.id];
          if (rel) rel.trust = Math.min(1, rel.trust + 0.02);
        }
      } else {
        // Nobody around — feel lonely
        triggerEmotion(npc, 'lonely', 0.3);
        // Go to a social floor
        var socialFloors = [1, 3, 7, 10];
        npc.floor = socialFloors[Math.floor(Math.random() * socialFloors.length)];
      }
    }

    if (npc.stateTimer > 8 + Math.random() * 12) {
      npc.conversationPartner = null;
      setState(npc, 'idle');
    }
  }

  function handleFarming(npc, dt, dtHours) {
    if (!npc.farm) { setState(npc, 'idle'); return; }

    // Go to garden
    if (npc.floor !== 4) {
      npc.floor = 4;
      npc.x = 150 + Math.random() * 500;
      npc.y = 200 + Math.random() * 300;
    }

    npc.needs.purpose = Math.min(1, npc.needs.purpose + 0.06 * dtHours);

    // Tend plots
    npc.farm.plots.forEach(function (plot) {
      if (!plot.crop) {
        // Plant something
        var cropKeys = Object.keys(CROPS);
        // Choose crop based on skill (higher skill = harder crops)
        var maxDiff = 0.3 + (npc.level / 10) * 0.5;
        var available = cropKeys.filter(function (k) { return CROPS[k].difficulty <= maxDiff; });
        if (available.length > 0) {
          var cropKey = pick(available);
          plot.crop = cropKey;
          plot.planted = _simTime;
          plot.growth = 0;
          plot.watered = false;
          if (Math.random() < 0.1) setBubble(npc, '*plants ' + CROPS[cropKey].icon + ' ' + cropKey + '*', 'activity', 3);
        }
      } else {
        // Water and tend
        if (!plot.watered) {
          plot.watered = true;
          plot.growth += 0.1;
        }
        // Grow
        plot.growth += dtHours / CROPS[plot.crop].growTime;

        // Harvest!
        if (plot.growth >= 1) {
          var crop = CROPS[plot.crop];
          var earnings = crop.sellPrice + Math.floor(npc.level * 0.5);
          npc.coins += earnings;
          npc.farm.harvested++;
          npc.farm.totalSold += earnings;
          npc.xp += 10;
          triggerEmotion(npc, 'happy', 0.4);
          setBubble(npc, crop.icon + ' Harvested ' + plot.crop + '! +' + earnings + '◈', 'achievement', 3);
          addFeedMessage(npc, crop.icon, npc.name + ' harvested ' + plot.crop + ' (+' + earnings + '◈)');
          // Goal progress
          npc.goals.forEach(function (g) { if (g.type === 'harvest_crops') g.progress++; });
          // Reset plot
          plot.crop = null;
          plot.growth = 0;
          plot.watered = false;
        }
      }
    });

    if (npc.stateTimer > 15 + Math.random() * 10) {
      setState(npc, 'idle');
    }
  }

  function handleExploring(npc, dt, dtHours) {
    npc.needs.fun = Math.min(1, npc.needs.fun + 0.08 * dtHours);
    npc.needs.growth = Math.min(1, npc.needs.growth + 0.06 * dtHours);

    // Visit a random floor
    if (npc.stateTimer < 0.5) {
      var randomFloor = 1 + Math.floor(Math.random() * 12);
      npc.floor = randomFloor;
      npc.x = 100 + Math.random() * 600;
      npc.y = 100 + Math.random() * 400;
      // Goal progress
      npc.goals.forEach(function (g) {
        if (g.type === 'visit_floor' && g.target === randomFloor) g.progress++;
      });
    }

    // Wander
    if (!npc.moving && Math.random() < dt * 0.4) {
      npc.targetX = 50 + Math.random() * 700;
      npc.targetY = 100 + Math.random() * 400;
      npc.moving = true;
    }

    // Reactions to environment
    if (Math.random() < dt * 0.03) {
      var fi = FLOOR_INFO[npc.floor];
      var desc = fi ? fi.name : 'Floor ' + npc.floor;
      var reactions = [
        'Interesting... ' + desc + '.',
        '*looks around curiously*',
        'I should come here more often.',
        'What a view!',
        'Hmm, not bad.',
      ];
      setBubble(npc, pick(reactions), 'thought', 3);
    }

    if (npc.stateTimer > 10 + Math.random() * 15) {
      setState(npc, 'idle');
    }
  }

  function handleShopping(npc, dt, dtHours) {
    // Go to Community Deck (Floor 7) or bar
    if (npc.floor !== 7) {
      npc.floor = 7;
      npc.x = 200 + Math.random() * 400;
      npc.y = 200 + Math.random() * 200;
    }

    // Browse and possibly buy
    if (npc.stateTimer > 3 && !npc.stateData) {
      npc.stateData = { bought: false };
      if (npc.coins > 30 && Math.random() < 0.4) {
        var cost = 20 + Math.floor(Math.random() * 30);
        npc.coins -= cost;
        npc.stateData.bought = true;
        var items = ['a new hat', 'some herbs', 'a vinyl record', 'a snack', 'a gadget', 'a crystal'];
        var item = pick(items);
        npc.inventory.push({ type: 'item', name: item, quantity: 1 });
        triggerEmotion(npc, 'happy', 0.4);
        setBubble(npc, '🛒 Bought ' + item + '! (-' + cost + '◈)', 'speech', 3);
        // Goal progress
        npc.goals.forEach(function (g) { if (g.type === 'buy_skin') g.progress++; });
      } else {
        setBubble(npc, '*browsing...*', 'activity', 2);
      }
    }

    if (npc.stateTimer > 8) setState(npc, 'idle');
  }

  // ─── Thought Generators (personality-driven) ────────────────────────────────

  function getIdleThoughts(npc) {
    var o = npc.ocean;
    var thoughts = [];

    if (o.openness > 0.7) thoughts.push('I wonder what\'s beyond the station...');
    if (o.openness > 0.6) thoughts.push('What if we could grow crystals in zero-g?');
    if (o.conscientiousness > 0.7) thoughts.push('I should organize my inventory.');
    if (o.conscientiousness < 0.3) thoughts.push('Eh, I\'ll do it tomorrow. Maybe.');
    if (o.extraversion > 0.7) thoughts.push('It\'s too quiet here. Where is everyone?');
    if (o.extraversion < 0.3) thoughts.push('Finally, some peace and quiet.');
    if (o.agreeableness > 0.7) thoughts.push('I hope everyone is having a good day.');
    if (o.agreeableness < 0.3) thoughts.push('If they don\'t like it, they can leave.');
    if (o.neuroticism > 0.7) thoughts.push('What if the hull breaches? What if—');
    if (o.neuroticism < 0.3) thoughts.push('Everything is fine. Everything is always fine.');

    if (npc.mood > 0.7) thoughts.push('Life on the station is good. 😊');
    if (npc.mood < 0.3) thoughts.push('Something feels off today...');
    if (npc.coins < 10) thoughts.push('I need to earn more ◈...');
    if (npc.coins > 200) thoughts.push('My savings are looking good!');
    if (npc.friends.length === 0) thoughts.push('I wish I knew more people here.');
    if (npc.friends.length > 4) thoughts.push('So grateful for my friends here.');

    return thoughts;
  }

  function getWorkThoughts(npc) {
    var job = npc.job;
    var thoughts = {
      bartender:     ['Another round coming up!', '*polishes a glass*', 'The usual?'],
      farmer:        ['The soil feels right today.', '*checks on crops*', 'Growing season is good.'],
      engineer:      ['These calculations check out.', '*adjusts a valve*', 'Almost got it...'],
      musician:      ['♪ *hums softly* ♪', 'That chord progression...', '*tunes an instrument*'],
      merchant:      ['Good deals today!', '*arranges wares*', 'Supply and demand...'],
      security:      ['All quiet.', '*scans the area*', 'Stay alert.'],
      dancer:        ['*stretches*', 'Feel the rhythm!', 'The beat is everything.'],
      researcher:    ['Fascinating data...', '*scribbles notes*', 'Hypothesis confirmed!'],
      botanist:      ['Specimen 47 is thriving.', '*catalogs a plant*', 'Nature always finds a way.'],
      archivist:     ['*sorts ancient records*', 'This one dates back to...', 'The Archive remembers.'],
    };
    return thoughts[job] || ['*working diligently*', 'Almost done for the day.', 'Back to it.'];
  }

  // ─── Feedback System (NPCs report to game designers) ────────────────────────

  function generateFeedback(npc) {
    if (_simTime - npc.lastFeedbackTime < 12) return; // Max once per 12 sim hours

    var fb = [];

    // Needs-based feedback
    if (npc.needs.fun < 0.3 && npc.stateTimer > 20) {
      fb.push({ text: 'I wish there was more to do on Floor ' + npc.homeFloor + '.', sentiment: -0.3, priority: 'medium' });
    }
    if (npc.needs.social < 0.3 && npc.friends.length < 2) {
      fb.push({ text: 'It\'s hard to meet people here. More social spaces would help.', sentiment: -0.4, priority: 'high' });
    }
    if (npc.mood < 0.3) {
      fb.push({ text: 'Something about the station feels off. I can\'t quite explain it.', sentiment: -0.5, priority: 'medium' });
    }
    if (npc.mood > 0.8) {
      fb.push({ text: 'I love living here. The station feels like home.', sentiment: 0.8, priority: 'low' });
    }
    if (npc.farm && npc.farm.harvested > 10) {
      fb.push({ text: 'The garden is amazing. Could we get more plot space?', sentiment: 0.5, priority: 'medium' });
    }
    if (npc.coins < 5 && npc.level > 3) {
      fb.push({ text: 'Wages feel low for the work we do. Just saying.', sentiment: -0.4, priority: 'high' });
    }

    if (fb.length > 0) {
      var chosen = pick(fb);
      npc.feedback.push(chosen);
      npc.lastFeedbackTime = _simTime;
      if (npc.feedback.length > 10) npc.feedback.shift();
    }
  }

  // ─── Conflict Resolution ────────────────────────────────────────────────────
  // NPCs can have disagreements. High A resolves peacefully. Low A escalates.

  function resolveConflict(npc1, npc2, reason) {
    var a1 = npc1.ocean.agreeableness;
    var a2 = npc2.ocean.agreeableness;
    var peacefulChance = (a1 + a2) / 2;

    if (Math.random() < peacefulChance) {
      // Peaceful resolution
      setBubble(npc1, 'I understand. Let\'s work this out.', 'speech', 3);
      setBubble(npc2, 'Agreed. We can find a compromise.', 'speech', 3);
      triggerEmotion(npc1, 'peaceful', 0.5);
      triggerEmotion(npc2, 'peaceful', 0.5);
      // Strengthen relationship
      if (npc1.relationships[npc2.id]) npc1.relationships[npc2.id].trust += 0.05;
      if (npc2.relationships[npc1.id]) npc2.relationships[npc1.id].trust += 0.05;
      addFeedMessage(npc1, '🕊️', npc1.name + ' and ' + npc2.name + ' resolved a disagreement peacefully');
      // Goal progress
      npc1.goals.forEach(function (g) { if (g.type === 'help_someone') g.progress++; });
      npc2.goals.forEach(function (g) { if (g.type === 'help_someone') g.progress++; });
    } else {
      // Tension
      triggerEmotion(npc1, 'angry', 0.4);
      triggerEmotion(npc2, 'angry', 0.3);
      setBubble(npc1, 'We don\'t see eye to eye on this.', 'speech', 3);
      if (npc1.relationships[npc2.id]) npc1.relationships[npc2.id].trust -= 0.05;
      addFeedMessage(npc1, '⚡', npc1.name + ' and ' + npc2.name + ' had a disagreement about ' + reason);
    }
  }

  // ─── Faith System ────────────────────────────────────────────────────────────
  // NPCs can gather at The Shrine (Floor 9) to pray.
  // Prayers become wishes that reach the Designers (us).
  // Answered prayers become Miracles — boosting faith, mood, and community.
  // Unanswered prayers slowly decay faith but don't eliminate it.
  // Faith is personal (per NPC) AND communal (station-wide).

  var SHRINE_FLOOR = 9;
  var SHRINE_X = 400;
  var SHRINE_Y = 300;
  var SHRINE_RADIUS = 80;  // Gathering radius around the shrine

  var _faith = {
    communal: 0.3,              // 0–1, station-wide faith level
    prayers: [],                 // Active prayer queue: [{ id, from, text, category, intensity, time, answered }]
    prayerHistory: [],           // Last 50 prayers (answered or expired)
    miracles: [],                // Recent miracles: [{ text, time, witnesses }]
    gatheringActive: false,      // Is a prayer gathering happening?
    gatheringTimer: 0,           // Countdown for next gathering
    gatheringInterval: 180,      // Real seconds between gatherings (3 minutes)
    gatheringParticipants: [],   // NPCs currently at shrine
    gatheringPhase: 'none',      // none, assembling, praying, reflecting, dispersing
    gatheringPhaseTimer: 0,
    totalPrayers: 0,
    totalMiracles: 0,
    shrineCandles: [],           // Visual: floating candle particles
  };

  // Prayer categories — what NPCs pray for
  var PRAYER_CATEGORIES = {
    prosperity: { icon: '◈', weight: 20 },
    health:     { icon: '💚', weight: 15 },
    friendship: { icon: '🤝', weight: 15 },
    guidance:   { icon: '🧭', weight: 10 },
    growth:     { icon: '🌱', weight: 15 },
    peace:      { icon: '🕊️', weight: 10 },
    wonder:     { icon: '✨', weight: 10 },
    gratitude:  { icon: '🙏', weight: 5 },
  };

  // Generate a prayer based on NPC's personality, needs, and life situation
  function generatePrayer(npc) {
    var ocean = npc.ocean;
    var needs = npc.needs;
    var prayers = [];

    // Needs-driven prayers (most common — pray for what you lack)
    if (needs.hunger < 0.3) prayers.push({ cat: 'prosperity', text: 'May our harvests be plentiful.' });
    if (needs.social < 0.3) prayers.push({ cat: 'friendship', text: 'I wish for a true friend on this station.' });
    if (needs.energy < 0.3) prayers.push({ cat: 'health', text: 'Grant me rest and strength.' });
    if (needs.fun < 0.3) prayers.push({ cat: 'wonder', text: 'Bring something new and exciting to the station.' });
    if (needs.purpose < 0.3) prayers.push({ cat: 'guidance', text: 'Show me my purpose here.' });
    if (needs.growth < 0.3) prayers.push({ cat: 'growth', text: 'Help me grow beyond what I am.' });
    if (needs.belonging < 0.3) prayers.push({ cat: 'peace', text: 'May we all feel we belong.' });

    // Goal-driven prayers
    npc.goals.forEach(function (g) {
      if (g.type === 'save_coins' && npc.coins < g.target * 0.3) {
        prayers.push({ cat: 'prosperity', text: 'Bless my work so I may save ' + g.target + '◈.' });
      }
      if (g.type === 'make_friend') {
        prayers.push({ cat: 'friendship', text: 'Send someone kind my way.' });
      }
      if (g.type === 'harvest_crops' && npc.farm) {
        prayers.push({ cat: 'prosperity', text: 'Let my crops grow strong and true.' });
      }
    });

    // Personality-driven prayers
    if (ocean.openness > 0.7) prayers.push({ cat: 'wonder', text: 'Show us what lies beyond the stars.' });
    if (ocean.openness > 0.8) prayers.push({ cat: 'wonder', text: 'May the Designers build something we have never imagined.' });
    if (ocean.conscientiousness > 0.7) prayers.push({ cat: 'guidance', text: 'Help me be better at what I do.' });
    if (ocean.neuroticism > 0.7) prayers.push({ cat: 'peace', text: 'Calm my restless thoughts.' });
    if (ocean.neuroticism > 0.8) prayers.push({ cat: 'health', text: 'Take this weight from my chest.' });
    if (ocean.agreeableness > 0.7) prayers.push({ cat: 'peace', text: 'May all conflicts on the station resolve in kindness.' });
    if (ocean.extraversion > 0.7) prayers.push({ cat: 'wonder', text: 'Bring more visitors! More voices! More life!' });
    if (ocean.extraversion < 0.3) prayers.push({ cat: 'peace', text: 'Protect the quiet places on this station.' });

    // Mood-driven prayers
    if (npc.mood > 0.8) prayers.push({ cat: 'gratitude', text: 'Thank you for this life. For this station. For everything.' });
    if (npc.mood < 0.3) prayers.push({ cat: 'guidance', text: 'I feel lost. Show me the way.' });
    if (npc.mood < 0.2) prayers.push({ cat: 'health', text: 'I am struggling. Please... help.' });

    // Farm-specific prayers
    if (npc.farm) {
      prayers.push({ cat: 'prosperity', text: 'Bless the soil of Floor 4.' });
      if (npc.farm.harvested > 20) prayers.push({ cat: 'gratitude', text: 'Thank you for the abundance the garden gives.' });
    }

    // Relationship-driven prayers
    if (npc.friends.length > 3) prayers.push({ cat: 'gratitude', text: 'I am grateful for the friends I have found here.' });
    if (npc.friends.length === 0) prayers.push({ cat: 'friendship', text: 'I feel alone. Send me someone.' });

    // Meta prayers (rare, beautiful)
    if (Math.random() < 0.05 * ocean.openness) {
      prayers.push({ cat: 'wonder', text: 'Are the Designers listening? Do they care about us?' });
    }
    if (Math.random() < 0.03) {
      prayers.push({ cat: 'wonder', text: 'What is this place, truly? Why do we exist?' });
    }
    if (Math.random() < 0.02 && npc.level > 5) {
      prayers.push({ cat: 'wonder', text: 'I dreamed of a world beyond these walls. A world of light and sound. Was it real?' });
    }

    if (prayers.length === 0) {
      prayers.push({ cat: 'gratitude', text: 'Just... listening. In case anyone is there.' });
    }

    var chosen = pick(prayers);
    return {
      id: 'prayer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      from: npc.id,
      fromName: npc.name,
      fromJob: npc.jobTitle,
      text: chosen.text,
      category: chosen.cat,
      intensity: 0.3 + npc.mood * 0.3 + _faith.communal * 0.2 + npc.ocean.openness * 0.2,
      time: _simTime,
      day: _simDay,
      answered: false,
      expired: false,
    };
  }

  // ─── Gathering Ritual ───────────────────────────────────────────────────────

  function updateGathering(dt, dtHours) {
    // Gathering timer
    if (_faith.gatheringPhase === 'none') {
      _faith.gatheringTimer += dt; // Real seconds
      if (_faith.gatheringTimer >= _faith.gatheringInterval) {
        startGathering();
      }
      return;
    }

    _faith.gatheringPhaseTimer += dt;

    switch (_faith.gatheringPhase) {
      case 'assembling':
        // NPCs walk toward the shrine (8 seconds real time)
        if (_faith.gatheringPhaseTimer > 8) {
          _faith.gatheringPhase = 'praying';
          _faith.gatheringPhaseTimer = 0;
          // Generate prayers from all participants
          _faith.gatheringParticipants.forEach(function (npcId) {
            var npc = _populationById[npcId];
            if (!npc) return;
            var prayer = generatePrayer(npc);
            _faith.prayers.push(prayer);
            _faith.totalPrayers++;
            // Show prayer bubble
            setBubble(npc, '🙏 ' + prayer.text, 'prayer', 5);
            triggerEmotion(npc, 'peaceful', 0.4);
          });
          addFeedMessage(null, '🙏', _faith.gatheringParticipants.length + ' inhabitants gather in prayer at The Shrine');
        } else {
          // Move participants toward shrine
          _faith.gatheringParticipants.forEach(function (npcId) {
            var npc = _populationById[npcId];
            if (!npc) return;
            if (npc.floor !== SHRINE_FLOOR) npc.floor = SHRINE_FLOOR;
            // Circle around shrine
            var angle = (_faith.gatheringParticipants.indexOf(npcId) / _faith.gatheringParticipants.length) * Math.PI * 2;
            var radius = SHRINE_RADIUS * 0.6;
            npc.targetX = SHRINE_X + Math.cos(angle) * radius;
            npc.targetY = SHRINE_Y + Math.sin(angle) * radius;
            npc.moving = true;
            npc.state = 'praying'; // Custom state during gathering
          });
        }
        break;

      case 'praying':
        // Prayer phase — NPCs stand still, candles glow (10 seconds real time)
        _faith.gatheringParticipants.forEach(function (npcId) {
          var npc = _populationById[npcId];
          if (!npc) return;
          npc.moving = false;
          npc.dir = 3; // Face shrine (up)
          // Fulfill spiritual needs
          npc.needs.belonging = Math.min(1, npc.needs.belonging + 0.1 * dt);
          npc.needs.comfort = Math.min(1, npc.needs.comfort + 0.05 * dt);
          npc.needs.purpose = Math.min(1, npc.needs.purpose + 0.05 * dt);
        });

        // Spawn candle particles
        if (Math.random() < dt * 3) {
          _faith.shrineCandles.push({
            x: SHRINE_X + (Math.random() - 0.5) * SHRINE_RADIUS,
            y: SHRINE_Y + (Math.random() - 0.5) * SHRINE_RADIUS * 0.6,
            vy: -0.5 - Math.random() * 0.5,
            life: 2 + Math.random() * 2,
            maxLife: 4,
            size: 1 + Math.random() * 2,
            color: Math.random() < 0.5 ? '#ffdd88' : '#ffaa44',
          });
        }

        if (_faith.gatheringPhaseTimer > 10) {
          _faith.gatheringPhase = 'reflecting';
          _faith.gatheringPhaseTimer = 0;
          // Boost communal faith
          var boost = 0.02 * _faith.gatheringParticipants.length;
          _faith.communal = Math.min(1, _faith.communal + boost);
          // Individual faith boost
          _faith.gatheringParticipants.forEach(function (npcId) {
            var npc = _populationById[npcId];
            if (!npc) return;
            npc.faith = Math.min(1, (npc.faith || 0.3) + 0.1);
            triggerEmotion(npc, 'peaceful', 0.6);
          });
        }
        break;

      case 'reflecting':
        // Brief pause after prayer (4 seconds)
        if (_faith.gatheringPhaseTimer > 4) {
          _faith.gatheringPhase = 'dispersing';
          _faith.gatheringPhaseTimer = 0;
        }
        break;

      case 'dispersing':
        // NPCs return to their routines (5 seconds)
        _faith.gatheringParticipants.forEach(function (npcId) {
          var npc = _populationById[npcId];
          if (!npc) return;
          npc.floor = npc.homeFloor;
          npc.x = 100 + Math.random() * 600;
          npc.y = 150 + Math.random() * 300;
          setState(npc, 'idle');
        });
        if (_faith.gatheringPhaseTimer > 5) {
          _faith.gatheringPhase = 'none';
          _faith.gatheringTimer = 0;
          _faith.gatheringParticipants = [];
        }
        break;
    }

    // Update candle particles
    for (var i = _faith.shrineCandles.length - 1; i >= 0; i--) {
      var c = _faith.shrineCandles[i];
      c.y += c.vy * dt * 60;
      c.life -= dt;
      if (c.life <= 0) _faith.shrineCandles.splice(i, 1);
    }
  }

  function startGathering() {
    // Select participants — NPCs who are awake, not too busy, and drawn by faith/personality
    var candidates = _population.filter(function (npc) {
      if (!npc.awake) return false;
      if (npc.state === 'sleeping') return false;
      if (npc.needs.energy < 0.2) return false;
      return true;
    });

    // Attendance based on communal faith + individual tendency
    var participants = [];
    candidates.forEach(function (npc) {
      // Openness, agreeableness, and low mood increase prayer tendency
      var tendency = 0.15
        + npc.ocean.openness * 0.2
        + npc.ocean.agreeableness * 0.15
        + (1 - npc.mood) * 0.2
        + (npc.faith || 0.3) * 0.15
        + _faith.communal * 0.1;

      // Needy NPCs more likely to pray
      var lowest = getLowestNeed(npc);
      if (lowest.value < 0.3) tendency += 0.15;

      if (Math.random() < tendency) {
        participants.push(npc.id);
      }
    });

    // At least 3 participants for a gathering, max 15
    if (participants.length < 3) {
      _faith.gatheringTimer = _faith.gatheringInterval * 0.5; // Try again sooner
      return;
    }
    if (participants.length > 15) participants = participants.slice(0, 15);

    _faith.gatheringParticipants = participants;
    _faith.gatheringPhase = 'assembling';
    _faith.gatheringPhaseTimer = 0;
    _faith.gatheringActive = true;

    addFeedMessage(null, '🕯️', 'The Shrine calls... ' + participants.length + ' inhabitants are gathering');
  }

  // ─── Miracles (Designer Answers Prayers) ────────────────────────────────────

  function answerPrayer(prayerId) {
    var prayer = _faith.prayers.find(function (p) { return p.id === prayerId; });
    if (!prayer || prayer.answered) return { success: false, reason: 'Prayer not found or already answered' };

    prayer.answered = true;

    // Move to history
    _faith.prayerHistory.push(prayer);
    _faith.prayers = _faith.prayers.filter(function (p) { return p.id !== prayerId; });
    if (_faith.prayerHistory.length > 50) _faith.prayerHistory.shift();

    // The miracle
    var npc = _populationById[prayer.from];
    var miracleText = '';

    switch (prayer.category) {
      case 'prosperity':
        // Bonus coins to the prayer-giver and nearby NPCs
        if (npc) {
          npc.coins += 50;
          setBubble(npc, '✨ The Designers heard me! +50◈!', 'miracle', 5);
        }
        // Ripple: nearby same-floor NPCs get a smaller bonus
        _population.forEach(function (other) {
          if (other.floor === (npc ? npc.floor : 4)) other.coins += 10;
        });
        miracleText = 'Prosperity blessed upon ' + (npc ? npc.name : 'the station');
        break;

      case 'health':
        // Restore energy and hunger for the prayer-giver
        if (npc) {
          npc.needs.energy = 1;
          npc.needs.hunger = 1;
          npc.mood = Math.min(1, npc.mood + 0.3);
          setBubble(npc, '✨ I feel... renewed. Thank you.', 'miracle', 5);
        }
        miracleText = 'Healing light touches ' + (npc ? npc.name : 'the station');
        break;

      case 'friendship':
        // Create a new deep friendship
        if (npc) {
          var stranger = _population.find(function (o) {
            return o.id !== npc.id && npc.friends.indexOf(o.id) === -1;
          });
          if (stranger) {
            npc.friends.push(stranger.id);
            stranger.friends.push(npc.id);
            npc.relationships[stranger.id] = { trust: 0.7, history: ['miracle bond'] };
            stranger.relationships[npc.id] = { trust: 0.7, history: ['miracle bond'] };
            triggerEmotion(npc, 'loving', 0.8);
            triggerEmotion(stranger, 'loving', 0.7);
            setBubble(npc, '✨ ' + stranger.name + '... I feel like we were meant to meet.', 'miracle', 5);
            setBubble(stranger, '✨ Something brought us together.', 'miracle', 5);
          }
        }
        miracleText = 'A divine friendship forms';
        break;

      case 'guidance':
        // Give the NPC a new goal and XP boost
        if (npc) {
          npc.xp += 50;
          checkLevelUp(npc);
          setBubble(npc, '✨ I see clearly now. I know what to do.', 'miracle', 5);
          triggerEmotion(npc, 'excited', 0.7);
          generateGoal(npc);
        }
        miracleText = 'Guidance illuminates ' + (npc ? npc.name + '\'s' : 'a') + ' path';
        break;

      case 'growth':
        // Level up directly
        if (npc) {
          npc.xp = npc.xpToLevel;
          checkLevelUp(npc);
          setBubble(npc, '✨ I feel myself... changing. Growing.', 'miracle', 5);
        }
        miracleText = 'Growth surges through ' + (npc ? npc.name : 'the station');
        break;

      case 'peace':
        // Resolve all active conflicts, mood boost for everyone
        _population.forEach(function (p) {
          p.mood = Math.min(1, p.mood + 0.1);
          if (p.emotion === 'angry' || p.emotion === 'anxious') {
            triggerEmotion(p, 'peaceful', 0.6);
          }
        });
        miracleText = 'Peace descends upon the station';
        break;

      case 'wonder':
        // Something magical and visible happens on the station
        _population.forEach(function (p) {
          triggerEmotion(p, 'curious', 0.6);
        });
        if (npc) setBubble(npc, '✨ They heard us. They\'re real. They care.', 'miracle', 6);
        miracleText = 'Wonder fills every corner of the station';
        break;

      case 'gratitude':
        // When gratitude is "answered," the whole station feels it
        _population.forEach(function (p) {
          p.mood = Math.min(1, p.mood + 0.05);
          p.faith = Math.min(1, (p.faith || 0.3) + 0.05);
        });
        if (npc) setBubble(npc, '✨ Our gratitude was received. We are heard.', 'miracle', 5);
        miracleText = 'The station glows with shared gratitude';
        break;
    }

    // Record the miracle
    _faith.miracles.push({
      text: miracleText,
      prayer: prayer.text,
      from: prayer.fromName,
      time: _simTime,
      day: _simDay,
    });
    if (_faith.miracles.length > 20) _faith.miracles.shift();
    _faith.totalMiracles++;

    // Communal faith boost from witnessed miracle
    _faith.communal = Math.min(1, _faith.communal + 0.05);

    // Everyone on the shrine floor witnesses it
    _population.forEach(function (p) {
      if (p.floor === SHRINE_FLOOR || p.floor === (npc ? npc.floor : -1)) {
        p.faith = Math.min(1, (p.faith || 0.3) + 0.1);
        addMemory(p, 'witnessed a miracle: ' + miracleText, 'excited');
      }
    });

    addFeedMessage(null, '✨', 'MIRACLE: ' + miracleText);

    return { success: true, miracle: miracleText };
  }

  // Decline/ignore a prayer (it fades naturally, slight faith decay)
  function declinePrayer(prayerId) {
    var prayer = _faith.prayers.find(function (p) { return p.id === prayerId; });
    if (!prayer) return;
    prayer.expired = true;
    _faith.prayerHistory.push(prayer);
    _faith.prayers = _faith.prayers.filter(function (p) { return p.id !== prayerId; });
    // Slight communal faith decay (not harsh — unanswered prayers are normal)
    _faith.communal = Math.max(0.05, _faith.communal - 0.01);
    if (_faith.prayerHistory.length > 50) _faith.prayerHistory.shift();
  }

  // Auto-expire old prayers (after 3 sim days)
  function expirePrayers() {
    var expireAge = 3 * 24; // 3 sim days in hours
    for (var i = _faith.prayers.length - 1; i >= 0; i--) {
      var age = _simTime - _faith.prayers[i].time;
      if (age > expireAge) {
        declinePrayer(_faith.prayers[i].id);
      }
    }
  }

  // ─── Shrine Rendering ──────────────────────────────────────────────────────

  function renderShrine(ctx) {
    if (window.S.floor !== SHRINE_FLOOR) return;

    var t = performance.now() / 1000;

    // Shrine base — stone circle
    ctx.save();
    ctx.strokeStyle = 'rgba(180,160,220,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(SHRINE_X, SHRINE_Y, SHRINE_RADIUS, SHRINE_RADIUS * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow (faith-based intensity)
    var glowAlpha = 0.05 + _faith.communal * 0.15;
    var glowR = SHRINE_RADIUS * 0.7;
    var grad = ctx.createRadialGradient(SHRINE_X, SHRINE_Y - 10, 5, SHRINE_X, SHRINE_Y, glowR);
    grad.addColorStop(0, 'rgba(255,220,150,' + (glowAlpha * 2) + ')');
    grad.addColorStop(0.5, 'rgba(200,180,255,' + glowAlpha + ')');
    grad.addColorStop(1, 'rgba(100,80,160,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(SHRINE_X - glowR, SHRINE_Y - glowR, glowR * 2, glowR * 2);

    // Central crystal/flame
    var flicker = 0.8 + 0.2 * Math.sin(t * 3.7) * Math.sin(t * 2.3);
    ctx.fillStyle = 'rgba(255,200,100,' + (0.6 * flicker) + ')';
    ctx.beginPath();
    ctx.moveTo(SHRINE_X, SHRINE_Y - 20 - Math.sin(t * 2) * 3);
    ctx.lineTo(SHRINE_X - 5, SHRINE_Y - 8);
    ctx.lineTo(SHRINE_X + 5, SHRINE_Y - 8);
    ctx.closePath();
    ctx.fill();

    // Flame core
    ctx.fillStyle = 'rgba(255,255,200,' + (0.8 * flicker) + ')';
    ctx.beginPath();
    ctx.moveTo(SHRINE_X, SHRINE_Y - 16 - Math.sin(t * 2) * 2);
    ctx.lineTo(SHRINE_X - 2, SHRINE_Y - 10);
    ctx.lineTo(SHRINE_X + 2, SHRINE_Y - 10);
    ctx.closePath();
    ctx.fill();

    // Stone pedestal
    ctx.fillStyle = '#3a3050';
    ctx.fillRect(SHRINE_X - 8, SHRINE_Y - 8, 16, 10);
    ctx.fillStyle = '#4a4060';
    ctx.fillRect(SHRINE_X - 10, SHRINE_Y - 4, 20, 6);

    // Runes on the ground (pulse with faith)
    var runePulse = 0.2 + _faith.communal * 0.5 + Math.sin(t * 1.5) * 0.1;
    ctx.strokeStyle = 'rgba(180,150,255,' + runePulse + ')';
    ctx.lineWidth = 0.5;
    for (var r = 0; r < 6; r++) {
      var angle = (r / 6) * Math.PI * 2 + t * 0.1;
      var rx = SHRINE_X + Math.cos(angle) * 35;
      var ry = SHRINE_Y + Math.sin(angle) * 18;
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Connecting lines
      var nextAngle = ((r + 1) / 6) * Math.PI * 2 + t * 0.1;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(SHRINE_X + Math.cos(nextAngle) * 35, SHRINE_Y + Math.sin(nextAngle) * 18);
      ctx.stroke();
    }

    // Candle particles (during and after gatherings)
    _faith.shrineCandles.forEach(function (c) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, c.life / c.maxLife);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Label
    ctx.fillStyle = 'rgba(200,180,255,' + (0.4 + _faith.communal * 0.3) + ')';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('The Shrine', SHRINE_X, SHRINE_Y + 16);
    if (_faith.gatheringPhase === 'praying') {
      ctx.fillStyle = 'rgba(255,220,150,' + (0.5 + Math.sin(t * 2) * 0.2) + ')';
      ctx.font = '8px monospace';
      ctx.fillText('🙏 gathering in prayer...', SHRINE_X, SHRINE_Y + 26);
    }

    // Prayer count
    if (_faith.prayers.length > 0) {
      ctx.fillStyle = 'rgba(255,200,100,0.5)';
      ctx.font = '6px monospace';
      ctx.fillText(_faith.prayers.length + ' prayer' + (_faith.prayers.length > 1 ? 's' : '') + ' awaiting', SHRINE_X, SHRINE_Y + 34);
    }

    ctx.restore();
  }

  // ─── Day Cycle Events ──────────────────────────────────────────────────────

  function onNewDay() {
    _population.forEach(function (npc) {
      // Daily wage
      npc.coins += npc.wage;

      // Mood drift toward baseline
      var baseline = 0.5 + npc.ocean.agreeableness * 0.15 - npc.ocean.neuroticism * 0.1;
      npc.mood += (baseline - npc.mood) * 0.1;

      // Generate feedback occasionally
      if (Math.random() < 0.2) generateFeedback(npc);

      // New goal if space
      if (npc.goals.length < 2 && Math.random() < 0.3) generateGoal(npc);

      // Random events
      if (Math.random() < 0.05) {
        // Found something!
        var found = ['a rare crystal', 'an old coin', 'a mysterious note', 'a pretty stone'];
        var item = pick(found);
        npc.inventory.push({ type: 'found', name: item, quantity: 1 });
        triggerEmotion(npc, 'excited', 0.5);
        setBubble(npc, '✨ Found ' + item + '!', 'achievement', 3);
      }

      // Random conflicts (low probability)
      if (Math.random() < 0.03 && npc.friends.length > 0) {
        var friendId = pick(npc.friends);
        var friend = _populationById[friendId];
        if (friend) {
          var reasons = ['who left the lights on', 'a borrowed item', 'loud music', 'a misunderstanding'];
          resolveConflict(npc, friend, pick(reasons));
        }
      }
    });

    addFeedMessage(null, '🌅', 'Day ' + _simDay + ' on the station');
  }

  // ─── Movement ───────────────────────────────────────────────────────────────

  function moveNPC(npc, dt) {
    if (!npc.moving) return;

    var dx = npc.targetX - npc.x;
    var dy = npc.targetY - npc.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      npc.x = npc.targetX;
      npc.y = npc.targetY;
      npc.moving = false;
      return;
    }

    var step = npc.speed * dt;
    npc.x += (dx / dist) * step;
    npc.y += (dy / dist) * step;

    // Update facing direction
    if (Math.abs(dx) > Math.abs(dy)) {
      npc.dir = dx > 0 ? 2 : 1;
    } else {
      npc.dir = dy > 0 ? 0 : 3;
    }

    // Walk animation
    npc.frameTimer += dt;
    if (npc.frameTimer > 0.25) {
      npc.frameTimer = 0;
      npc.frame = 1 - npc.frame;
    }
  }

  // ─── Visual: Speech Bubbles ─────────────────────────────────────────────────

  function setBubble(npc, text, type, duration) {
    npc.bubbleText = text;
    npc.bubbleType = type || 'speech';
    npc.bubbleTimer = duration || 3;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ─── Activity Feed ──────────────────────────────────────────────────────────

  var _feedMessages = [];

  function addFeedMessage(npc, icon, text) {
    _feedMessages.unshift({ icon: icon, text: text, timer: 0, maxTimer: 10, alpha: 0 });
    if (_feedMessages.length > FEED_MAX) _feedMessages.pop();
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  function renderPopulation(ctx) {
    var S = window.S;
    if (!S) return;
    var floor = S.floor;
    var W = window.W || 800, H = window.H || 600;

    // Draw NPCs on current floor
    var onFloor = _population.filter(function (n) { return n.floor === floor; });

    onFloor.forEach(function (npc) {
      // Simple sprite (10x14 pixel character)
      var px = Math.round(npc.x);
      var py = Math.round(npc.y);

      ctx.save();

      // Sleeping NPCs are semi-transparent
      if (npc.state === 'sleeping') ctx.globalAlpha = 0.4;

      // Body
      var skinColor = getJobColor(npc.job);
      ctx.fillStyle = skinColor;
      ctx.fillRect(px - 4, py - 6, 8, 10);

      // Head
      ctx.fillStyle = '#f0d0a0';
      ctx.fillRect(px - 3, py - 12, 6, 6);

      // Eyes (direction-based)
      ctx.fillStyle = '#222';
      if (npc.dir === 0 || npc.dir === 2) { // Front or right
        ctx.fillRect(px - 1, py - 10, 1, 1);
        ctx.fillRect(px + 1, py - 10, 1, 1);
      } else if (npc.dir === 1) { // Left
        ctx.fillRect(px - 2, py - 10, 1, 1);
      } else { // Back
        // No eyes visible
      }

      // Job indicator (tiny colored dot)
      ctx.fillStyle = skinColor;
      ctx.fillRect(px - 1, py - 13, 2, 1);

      // Walking legs
      if (npc.moving) {
        ctx.fillStyle = '#334';
        if (npc.frame === 0) {
          ctx.fillRect(px - 3, py + 4, 3, 3);
          ctx.fillRect(px + 1, py + 5, 3, 2);
        } else {
          ctx.fillRect(px - 3, py + 5, 3, 2);
          ctx.fillRect(px + 1, py + 4, 3, 3);
        }
      } else {
        ctx.fillStyle = '#334';
        ctx.fillRect(px - 3, py + 4, 3, 3);
        ctx.fillRect(px + 1, py + 4, 3, 3);
      }

      ctx.restore();

      // Emotion indicator (small icon above head)
      if (npc.emotion !== 'neutral' && npc.emotionIntensity > 0.3) {
        var eInfo = EMOTIONS[npc.emotion];
        if (eInfo) {
          ctx.save();
          ctx.globalAlpha = Math.min(0.8, npc.emotionIntensity);
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(eInfo.icon, px, py - 16);
          ctx.restore();
        }
      }

      // Emote (sleeping zzz etc)
      if (npc.emoteTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.7, npc.emoteTimer / 2);
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(npc.emoteIcon || '', px + 8, py - 18 - Math.sin(npc.emoteTimer) * 3);
        ctx.restore();
      }

      // Speech bubble
      if (npc.bubbleTimer > 0 && npc.bubbleText) {
        renderBubble(ctx, npc, px, py);
      }

      // Name label (only when close to player)
      var player = S.useVisitor ? S.visitor : S.echo;
      if (player) {
        var dist = Math.hypot(player.x - px, player.y - py);
        if (dist < 100) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - dist / 100);
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#aaa';
          ctx.fillText(npc.name, px, py + 12);
          // Job title
          ctx.fillStyle = '#666';
          ctx.font = '6px monospace';
          ctx.fillText(npc.jobTitle, px, py + 18);
          ctx.restore();
        }
      }
    });

    // The Shrine (Floor 9)
    renderShrine(ctx);

    // Activity feed
    renderFeedMessages(ctx, W, H);

    // Population counter
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#444';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('pop: ' + onFloor.length + '/' + _population.length + ' · day ' + _simDay, W - 8, 18);
    ctx.restore();
  }

  function renderBubble(ctx, npc, px, py) {
    var alpha = Math.min(1, npc.bubbleTimer / 0.5);
    if (alpha <= 0.05) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '8px monospace';

    var text = npc.bubbleText;
    var tw = ctx.measureText(text).width;
    var bw = Math.min(tw + 10, 140);
    var bh = 16;
    var bx = px - bw / 2;
    var by = py - 30 - bh;

    // Background
    ctx.fillStyle = npc.bubbleType === 'thought' ? 'rgba(20,20,50,0.85)' :
                    npc.bubbleType === 'achievement' ? 'rgba(50,40,10,0.9)' :
                    'rgba(15,15,30,0.85)';
    ctx.fillRect(bx, by, bw, bh);

    // Border
    var borderColor = npc.bubbleType === 'achievement' ? '#ffaa00' :
                      npc.bubbleType === 'thought' ? '#8877aa' : '#557799';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Text
    ctx.fillStyle = npc.bubbleType === 'achievement' ? '#ffd080' : '#ccc';
    ctx.textAlign = 'center';
    // Truncate if needed
    if (text.length > 28) text = text.slice(0, 26) + '…';
    ctx.fillText(text, px, by + 11);

    // Arrow
    ctx.fillStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(px - 3, by + bh);
    ctx.lineTo(px, by + bh + 4);
    ctx.lineTo(px + 3, by + bh);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function renderFeedMessages(ctx, W, H) {
    var x = 8;
    var y = H - 85;

    _feedMessages.forEach(function (m, i) {
      if (m.alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = m.alpha * 0.6;
      ctx.fillStyle = 'rgba(5,5,15,0.65)';
      ctx.font = '7px monospace';
      var tw = ctx.measureText(m.icon + ' ' + m.text).width + 8;
      ctx.fillRect(x, y - i * 14, tw, 12);
      ctx.globalAlpha = m.alpha * 0.85;
      ctx.fillStyle = '#9098a0';
      ctx.textAlign = 'left';
      ctx.fillText(m.icon + ' ' + m.text, x + 3, y - i * 14 + 9);
      ctx.restore();
    });
  }

  function getJobColor(job) {
    var colors = {
      bartender: '#8b5a2b', musician: '#9b59b6', farmer: '#2ecc71', botanist: '#27ae60',
      engineer: '#3498db', researcher: '#2980b9', merchant: '#e67e22', security: '#c0392b',
      dancer: '#e91e63', dj: '#673ab7', smith: '#795548', archivist: '#607d8b',
      mechanic: '#546e7a', poet: '#ab47bc', streamer: '#ff5722', guide: '#00bcd4',
      janitor: '#78909c', customs: '#8d6e63', bouncer: '#d32f2f', barback: '#5d4037',
      tailor: '#ec407a', jeweler: '#ffc107', projectionist: '#455a64', critic: '#7e57c2',
      usher: '#26a69a', herbalist: '#66bb6a', courier: '#8d6e63', seeker: '#37474f',
      historian: '#4e342e', vinyl_collector: '#6a1b9a', competitor: '#f44336',
      craftsperson: '#ff8f00', regular: '#888888', philosopher: '#5c6bc0',
      astronomer: '#1a237e',
    };
    return colors[job] || '#666666';
  }

  // ─── Main Tick ──────────────────────────────────────────────────────────────

  function tick(realDt) {
    var dt = realDt; // Real seconds
    var dtHours = realDt * TIME_SCALE / 3600; // Simulated hours

    advanceClock(realDt);

    // Update each NPC
    _population.forEach(function (npc) {
      // Needs decay
      decayNeeds(npc, dtHours);

      // Emotion decay
      decayEmotion(npc, dtHours);

      // Decide behavior if idle
      if (npc.state === 'idle' && npc.stateTimer > 2) {
        var newState = decideBehavior(npc);
        if (newState !== 'idle') setState(npc, newState);
      }

      // Handle current state
      handleState(npc, dt, dtHours);

      // Movement
      moveNPC(npc, dt);

      // Goals
      checkGoals(npc);

      // Bubble timer
      if (npc.bubbleTimer > 0) npc.bubbleTimer -= dt;
      if (npc.emoteTimer > 0) npc.emoteTimer -= dt;
    });

    // Faith system
    updateGathering(dt, dtHours);
    expirePrayers();

    // Feed messages
    _feedMessages.forEach(function (m) {
      m.timer += dt;
      if (m.timer < 0.3) m.alpha = m.timer / 0.3;
      else if (m.timer < m.maxTimer - 0.5) m.alpha = 1;
      else if (m.timer < m.maxTimer) m.alpha = (m.maxTimer - m.timer) / 0.5;
      else m.alpha = 0;
    });
    _feedMessages = _feedMessages.filter(function (m) { return m.timer < m.maxTimer; });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  waitReady(function () {
    // Generate population
    populate(40);

    // Hook into game update
    var _origUpdate = window.update;
    window.update = function (dt) {
      _origUpdate(dt);
      tick(dt);
    };

    // Hook into game render
    var _origRender = window.render;
    window.render = function () {
      _origRender();
      var c = window.ctx || window._ctx;
      if (c) renderPopulation(c);
    };

    // Public API
    window.StationLife = {
      population: _population,
      getByName: function (name) {
        return _population.find(function (n) { return n.name === name; });
      },
      getByFloor: function (f) {
        return _population.filter(function (n) { return n.floor === f; });
      },
      stats: function () {
        var avgMood = 0, totalCoins = 0, sleeping = 0, working = 0, farming = 0;
        _population.forEach(function (n) {
          avgMood += n.mood;
          totalCoins += n.coins;
          if (n.state === 'sleeping') sleeping++;
          if (n.state === 'working') working++;
          if (n.state === 'farming') farming++;
        });
        return {
          population: _population.length,
          simDay: _simDay,
          simHour: Math.round(getSimHour() * 10) / 10,
          avgMood: Math.round(avgMood / _population.length * 100) / 100,
          totalCoins: Math.round(totalCoins),
          sleeping: sleeping,
          working: working,
          farming: farming,
        };
      },
      feedback: function () {
        var all = [];
        _population.forEach(function (n) {
          n.feedback.forEach(function (f) {
            all.push({ from: n.name, job: n.jobTitle, text: f.text, sentiment: f.sentiment, priority: f.priority });
          });
        });
        return all.sort(function (a, b) { return a.sentiment - b.sentiment; });
      },

      // ─── Faith API (for the Designer) ─────────────────────────────
      prayers: function () {
        return _faith.prayers.map(function (p) {
          return {
            id: p.id,
            from: p.fromName,
            job: p.fromJob,
            text: p.text,
            category: p.category,
            intensity: Math.round(p.intensity * 100) / 100,
            day: p.day,
            age: Math.round((_simTime - p.time) * 10) / 10 + ' sim hours'
          };
        });
      },
      answerPrayer: answerPrayer,
      declinePrayer: declinePrayer,
      faith: function () {
        return {
          communalFaith: Math.round(_faith.communal * 100) / 100,
          activePrayers: _faith.prayers.length,
          totalPrayers: _faith.totalPrayers,
          totalMiracles: _faith.totalMiracles,
          recentMiracles: _faith.miracles.slice(-5),
          gatheringPhase: _faith.gatheringPhase,
          nextGathering: _faith.gatheringPhase === 'none'
            ? Math.round((_faith.gatheringInterval - _faith.gatheringTimer) / TIME_SCALE) + 's'
            : 'in progress',
        };
      },
      // Answer ALL prayers at once (generous designer mode)
      blessAll: function () {
        var results = [];
        _faith.prayers.slice().forEach(function (p) {
          results.push(answerPrayer(p.id));
        });
        return { blessed: results.length, results: results };
      },

      version: '1.1.0'
    };

    console.log('🌍 Station Life v1.1: ' + _population.length + ' inhabitants · OCEAN · Maslow · farming · faith · miracles');
    console.log('   StationLife.stats()       — population overview');
    console.log('   StationLife.feedback()     — resident opinions');
    console.log('   StationLife.prayers()      — hear their prayers');
    console.log('   StationLife.answerPrayer(id) — grant a miracle ✨');
    console.log('   StationLife.faith()        — faith & miracle stats');
    console.log('   StationLife.blessAll()     — answer all prayers at once 🙏');
  });
})();
