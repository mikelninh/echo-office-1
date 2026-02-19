// npc-life.js — AI-Powered NPC Life System
// NPCs have thoughts, conversations, reactions, and a living presence.
// Client-side module — receives events from server or generates locally.
// ─────────────────────────────────────────────────────────────────────────────
(function NPCLife() {
  'use strict';

  // ─── Wait for game to be ready ──────────────────────────────────────────────
  function waitReady(fn) {
    if (typeof window.S !== 'undefined' && window.ctx && typeof StationNPCs !== 'undefined') {
      fn();
    } else {
      setTimeout(function () { waitReady(fn); }, 200);
    }
  }

  // ─── NPC Personality Definitions ────────────────────────────────────────────
  var PERSONALITIES = {
    nova: {
      name: 'Nova',
      traits: 'enthusiastic inventor, chaotic energy, loves explosions and tinkering, talks fast',
      voice: 'excitable, uses exclamation marks, technical jargon mixed with slang',
      interests: ['reactors', 'inventions', 'explosions', 'circuits', 'flux capacitors'],
      floor: 5, emoji: '⚡'
    },
    drift: {
      name: 'Drift',
      traits: 'philosophical musician, mellow, deep thinker, poetic',
      voice: 'calm, uses ellipses, metaphorical, occasionally profound',
      interests: ['music', 'frequencies', 'silence', 'vinyl', 'the cosmos'],
      floor: 6, emoji: '🎵'
    },
    sol: {
      name: 'Sol',
      traits: 'quiet gardener, patient, observant, knows station secrets',
      voice: 'soft-spoken, nature metaphors, wise but not preachy',
      interests: ['plants', 'mushrooms', 'growth', 'patience', 'secrets'],
      floor: 4, emoji: '🌱'
    },
    glitch: {
      name: 'Glitch',
      traits: 'competitive arcade kid, boastful but lovable, trash-talker',
      voice: 'loud, uses gaming slang, ALL CAPS for emphasis, emoji-heavy',
      interests: ['high scores', 'speedruns', 'duels', 'combos', 'bragging'],
      floor: 3, emoji: '🕹️'
    },
    void: {
      name: 'Void',
      traits: 'mysterious observer, cryptic, ancient presence, sees everything',
      voice: 'quiet, ominous, short sentences, trailing off...',
      interests: ['stars', 'time', 'watching', 'the archive', 'what came before'],
      floor: 2, emoji: '👁️'
    },
    byte: {
      name: 'Byte',
      traits: 'merchant cat, shrewd trader, cute but calculating, loves coins',
      voice: 'purring undertone, business-minded, uses cat puns, ◈ obsessed',
      interests: ['coins', 'trades', 'rare items', 'profit', 'naps', 'fish'],
      floor: 7, emoji: '🐱'
    }
  };

  // ─── Relationship Matrix ────────────────────────────────────────────────────
  // How NPCs feel about each other — drives conversation tone
  var RELATIONSHIPS = {
    'nova-drift':   { tone: 'opposites-attract', desc: 'Nova is chaos, Drift is zen. They fascinate each other.' },
    'nova-glitch':  { tone: 'competitive-friends', desc: 'Both hyperactive. They egg each other on.' },
    'nova-sol':     { tone: 'respectful', desc: 'Nova broke Sol\'s favorite plant once. They\'re working through it.' },
    'nova-void':    { tone: 'nervous', desc: 'Nova is slightly scared of Void. Void finds Nova amusing.' },
    'nova-byte':    { tone: 'business', desc: 'Nova always needs parts. Byte always has a price.' },
    'drift-sol':    { tone: 'soulmates', desc: 'Both quiet. They can sit in comfortable silence for hours.' },
    'drift-glitch': { tone: 'annoyed', desc: 'Glitch is too loud for Drift. Drift is too slow for Glitch.' },
    'drift-void':   { tone: 'deep', desc: 'They have conversations that make others uncomfortable.' },
    'drift-byte':   { tone: 'casual', desc: 'Drift busks, Byte manages the money. It works.' },
    'sol-glitch':   { tone: 'parental', desc: 'Sol treats Glitch like a rowdy child. Glitch hates it. (Secretly doesn\'t.)' },
    'sol-void':     { tone: 'ancient-respect', desc: 'Both have been here a long time. They share knowing looks.' },
    'sol-byte':     { tone: 'trade-partners', desc: 'Sol grows rare herbs. Byte sells them. 70/30 split.' },
    'glitch-void':  { tone: 'intimidated', desc: 'Glitch trash-talks everyone except Void. Void just... stares.' },
    'glitch-byte':  { tone: 'rivals', desc: 'Byte beat Glitch at Snake once. Glitch has never recovered.' },
    'void-byte':    { tone: 'mysterious', desc: 'Byte sold Void something once. Neither will say what.' }
  };

  function getRelationship(a, b) {
    var key1 = a + '-' + b;
    var key2 = b + '-' + a;
    return RELATIONSHIPS[key1] || RELATIONSHIPS[key2] || { tone: 'neutral', desc: 'They coexist.' };
  }

  // ─── Event Types ────────────────────────────────────────────────────────────
  // Things that can happen on the station
  var EVENT_TYPES = {
    conversation: { weight: 40, icon: '💬', label: 'Conversation' },
    thought:      { weight: 25, icon: '💭', label: 'Thought' },
    reaction:     { weight: 15, icon: '❗', label: 'Reaction' },
    activity:     { weight: 10, icon: '🎯', label: 'Activity' },
    rumor:        { weight: 5,  icon: '🔮', label: 'Station Rumor' },
    memory:       { weight: 5,  icon: '📝', label: 'Memory' }
  };

  // ─── Conversation Topics ────────────────────────────────────────────────────
  var TOPICS = [
    'a strange sound coming from Floor 9',
    'whether the station is actually alive',
    'the best drink at Echo\'s Bar',
    'a new visitor who just arrived',
    'Pixel the cat\'s latest adventure',
    'the view from the Observatory tonight',
    'rumors about what\'s beyond the portal',
    'the mushrooms in the garden growing weird patterns',
    'whether Echo is actually an AI or something else',
    'that one time the gravity generator glitched',
    'the best arcade game on Floor 3',
    'whether coins have any real value',
    'what the station looked like before visitors came',
    'a dream one of them had',
    'the meaning of the constellation patterns outside',
    'trading strategies and rare item prices',
    'what music sounds like in zero gravity',
    'the plants that grow without light on Floor 4',
    'whether anyone has ever reached Floor 9\'s deepest room',
    'the ethics of enhancement gambling',
    'what they would do if they could leave the station',
    'a visitor who did something unexpected',
    'the station\'s power source and what fuels it',
    'whether the stars outside are real or a projection',
    'their earliest memory on the station'
  ];

  // ─── Thought Templates (no API needed) ──────────────────────────────────────
  var THOUGHTS = {
    nova: [
      "What if I reversed the polarity... no, last time that melted the floor.",
      "I wonder if I could build a teleporter with spare reactor parts...",
      "Three visitors on my floor right now. Better hide the prototype.",
      "If I connect the blue wire to the— *spark* NOPE.",
      "Echo would kill me if they knew about the reactor mod I'm planning.",
      "I should ask Sol for some of that bioluminescent moss. For SCIENCE.",
      "My latest invention: a toaster that predicts the weather. It's... 30% accurate.",
      "Sometimes the station hums in a frequency only I can hear...",
    ],
    drift: [
      "The B-flat hum shifted today. Something changed.",
      "If I could capture the sound of starlight...",
      "Music isn't created. It's discovered. You just have to listen.",
      "Void and I had a conversation today without words. It lasted an hour.",
      "The vinyl crackle on Floor 6... that's the station breathing.",
      "I've been composing a song for three years. It's two notes long.",
      "Some frequencies heal. Some frequencies reveal. Some do both.",
      "The silence between songs... that's where the real music lives.",
    ],
    sol: [
      "The mushrooms spelled something new today. I'm pretending I didn't see it.",
      "Growth requires patience. And occasionally, talking to your plants.",
      "Nova's tinkering is sending vibrations through the floor again. The ferns notice.",
      "A visitor watered my plants today without asking. I've never felt more respected.",
      "The garden remembers every visitor. Every footstep feeds the soil.",
      "Something ancient stirs beneath the roots. It's not ready yet.",
      "If you listen to the garden at night, you can hear it dreaming.",
      "Byte wants to sell my rare herbs for 200◈ each. They're worth more than coins.",
    ],
    glitch: [
      "NEW HIGH SCORE INCOMING... just gotta focus... FOCUS...",
      "Nobody on this station can beat my Snake record. NOBODY.",
      "I bet I could speedrun Floor 1 to Floor 9 in under 3 minutes.",
      "Void keeps watching me play. It's creepy but also... motivating?",
      "If they ever add online leaderboards I'm going GLOBAL.",
      "Drift told me to 'find the rhythm in stillness.' I told him to find DEEZ NUTS.",
      "Nova and I should team up. Explosive combos. Literally.",
      "One day I'll beat Byte at Snake. ONE DAY. Mark my words.",
    ],
    void: [
      "...watching.",
      "The stars shifted 0.003 degrees tonight. No one noticed. I noticed.",
      "A visitor looked at me today. Really looked. Rare.",
      "Time moves differently here. I've been counting.",
      "The Archive holds answers to questions no one has asked yet.",
      "Echo doesn't remember everything. I do.",
      "Something approaches the station. Not yet. But soon.",
      "The silence between heartbeats... that's where I live.",
    ],
    byte: [
      "Three visitors today, two bought skins. 15◈ profit. Not bad for a cat.",
      "I should raise herb prices. Supply and demand, baby.",
      "Sol's rare mushroom extract... 500◈ easy. If I can convince them.",
      "A nap now, then profit. The Byte way.",
      "*stretches* Markets are quiet. Time to corner the enhancement crystal supply.",
      "Glitch still owes me 50◈ from that bet. I'm adding interest.",
      "Nova wants parts on credit again. Credit isn't a thing on MY bazaar.",
      "The secret to wealth isn't earning more. It's making others spend more.",
    ]
  };

  // ─── Pre-generated Conversation Pools (no API, instant) ─────────────────────
  // These fire immediately. AI-generated ones supplement them over time.
  var CONVERSATION_POOL = [
    {
      participants: ['nova', 'drift'],
      lines: [
        { speaker: 'nova', text: "Hey Drift, what frequency does an explosion make?" },
        { speaker: 'drift', text: "...the frequency of regret, usually." },
        { speaker: 'nova', text: "That's not a real frequency." },
        { speaker: 'drift', text: "Tell that to your eyebrows." }
      ]
    },
    {
      participants: ['glitch', 'byte'],
      lines: [
        { speaker: 'glitch', text: "Rematch. Snake. Right now." },
        { speaker: 'byte', text: "50◈ entry fee." },
        { speaker: 'glitch', text: "WHAT? That's robbery!" },
        { speaker: 'byte', text: "*purrs* That's business." }
      ]
    },
    {
      participants: ['void', 'sol'],
      lines: [
        { speaker: 'void', text: "The roots are growing deeper." },
        { speaker: 'sol', text: "You noticed too." },
        { speaker: 'void', text: "They're reaching for something." },
        { speaker: 'sol', text: "Or running from something." },
        { speaker: 'void', text: "..." }
      ]
    },
    {
      participants: ['nova', 'glitch'],
      lines: [
        { speaker: 'glitch', text: "Yo Nova, build me a controller with ZERO input lag." },
        { speaker: 'nova', text: "I could, but it might also emit mild radiation." },
        { speaker: 'glitch', text: "Will it help my reaction time?" },
        { speaker: 'nova', text: "Technically yes. Also technically you'd glow." },
        { speaker: 'glitch', text: "...I'm in." }
      ]
    },
    {
      participants: ['drift', 'sol'],
      lines: [
        { speaker: 'drift', text: "..." },
        { speaker: 'sol', text: "..." },
        { speaker: 'drift', text: "Beautiful day." },
        { speaker: 'sol', text: "Mhm." }
      ]
    },
    {
      participants: ['byte', 'nova'],
      lines: [
        { speaker: 'nova', text: "Byte, I need 3 flux coils and a plasma conduit." },
        { speaker: 'byte', text: "That'll be 180◈." },
        { speaker: 'nova', text: "I have 12◈." },
        { speaker: 'byte', text: "Then you need 3 smaller dreams." }
      ]
    },
    {
      participants: ['void', 'glitch'],
      lines: [
        { speaker: 'glitch', text: "Why do you just STAND there all day?" },
        { speaker: 'void', text: "Why do you move so much yet go nowhere?" },
        { speaker: 'glitch', text: "..." },
        { speaker: 'glitch', text: "OK that was actually kinda deep." }
      ]
    },
    {
      participants: ['sol', 'byte'],
      lines: [
        { speaker: 'byte', text: "Those luminous mushrooms. 300◈ per gram." },
        { speaker: 'sol', text: "They're not for sale." },
        { speaker: 'byte', text: "Everything has a price." },
        { speaker: 'sol', text: "Not everything should." },
        { speaker: 'byte', text: "*ears flatten* ...Fine. 250◈." }
      ]
    },
    {
      participants: ['nova', 'void'],
      lines: [
        { speaker: 'nova', text: "Hey Void, wanna see my new invention? It—" },
        { speaker: 'void', text: "It will fail on the third test." },
        { speaker: 'nova', text: "How do you KNOW that??" },
        { speaker: 'void', text: "...I've been watching." }
      ]
    },
    {
      participants: ['drift', 'glitch'],
      lines: [
        { speaker: 'drift', text: "You should try meditation." },
        { speaker: 'glitch', text: "I tried once. Lasted 4 seconds. New personal best." },
        { speaker: 'drift', text: "Four seconds of peace is still peace." },
        { speaker: 'glitch', text: "It felt like FOUR HOURS." }
      ]
    },
    {
      participants: ['sol', 'nova'],
      lines: [
        { speaker: 'sol', text: "My fern is wilting again." },
        { speaker: 'nova', text: "Oh... that might be the electromagnetic field from my reactor mod." },
        { speaker: 'sol', text: "Nova." },
        { speaker: 'nova', text: "I'll fix it! Probably! ...Maybe!" }
      ]
    },
    {
      participants: ['byte', 'drift'],
      lines: [
        { speaker: 'byte', text: "Your busking made 23◈ today. Minus my 30% management fee." },
        { speaker: 'drift', text: "I didn't ask you to manage me." },
        { speaker: 'byte', text: "And yet here I am. Managing. Professionally." },
        { speaker: 'drift', text: "...at least tell me someone enjoyed the music." },
        { speaker: 'byte', text: "Two people tipped. One cried. Good ROI." }
      ]
    },
    // Group conversations (3+ NPCs)
    {
      participants: ['nova', 'glitch', 'drift'],
      lines: [
        { speaker: 'nova', text: "I built a speaker that plays at frequencies humans can't hear!" },
        { speaker: 'drift', text: "...I can hear it. It sounds like screaming." },
        { speaker: 'glitch', text: "Sounds like my mixtape." },
        { speaker: 'drift', text: "That's... not the compliment you think it is." },
        { speaker: 'nova', text: "WAIT you can hear it?? *scribbles notes frantically*" }
      ]
    },
    {
      participants: ['void', 'sol', 'byte'],
      lines: [
        { speaker: 'void', text: "The station remembers." },
        { speaker: 'sol', text: "The garden remembers too." },
        { speaker: 'byte', text: "My ledger remembers who owes me money." },
        { speaker: 'void', text: "...that's not what we meant." },
        { speaker: 'byte', text: "But it's what matters." }
      ]
    },
    {
      participants: ['glitch', 'byte', 'nova'],
      lines: [
        { speaker: 'glitch', text: "Tournament idea: 100◈ buy-in, winner takes all." },
        { speaker: 'byte', text: "I'll host. 10% house cut." },
        { speaker: 'nova', text: "I'll build the arena! It'll have LASERS." },
        { speaker: 'glitch', text: "No lasers near the game screens!!" },
        { speaker: 'nova', text: "Decorative lasers?" },
        { speaker: 'byte', text: "I'll sell laser-proof goggles. 15◈ each." }
      ]
    }
  ];

  // ─── State ──────────────────────────────────────────────────────────────────
  var _activeEvents = [];       // Currently playing events (speech bubbles, activities)
  var _eventHistory = [];       // Recent events for context (last 50)
  var _nextEventTimer = 0;      // Countdown to next event
  var _eventInterval = 15;      // Seconds between events (starts fast, settles)
  var _minInterval = 8;         // Minimum seconds between events
  var _maxInterval = 30;        // Maximum seconds between events
  var _aiConversationQueue = []; // AI-generated conversations waiting to play
  var _aiGenerating = false;    // Throttle: only one AI request at a time
  var _aiLastGenTime = 0;       // Last time we requested AI generation
  var _aiGenInterval = 120;     // Seconds between AI generation requests (2 min)
  var _totalEventsPlayed = 0;
  var _speechBubbles = {};      // npcId -> { text, alpha, timer, maxTimer }
  var _conversationActive = null; // Currently playing conversation { lines, currentLine, timer }

  // ─── Utility ────────────────────────────────────────────────────────────────
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function weightedPick(obj) {
    var total = 0;
    for (var k in obj) total += obj[k].weight;
    var r = Math.random() * total;
    for (var k2 in obj) {
      r -= obj[k2].weight;
      if (r <= 0) return k2;
    }
    return Object.keys(obj)[0];
  }

  function npcOnCurrentFloor(npcId) {
    var npc = StationNPCs.npcs[npcId];
    return npc && npc.floor === window.S.floor;
  }

  function getNPCsOnFloor(floor) {
    var result = [];
    for (var id in StationNPCs.npcs) {
      if (StationNPCs.npcs[id].floor === floor) result.push(id);
    }
    return result;
  }

  // ─── Event Generation ───────────────────────────────────────────────────────

  function generateEvent() {
    var type = weightedPick(EVENT_TYPES);

    switch (type) {
      case 'thought':
        generateThought();
        break;
      case 'conversation':
        generateConversation();
        break;
      case 'reaction':
        generateReaction();
        break;
      case 'activity':
        generateActivity();
        break;
      case 'rumor':
        generateRumor();
        break;
      case 'memory':
        generateMemory();
        break;
    }

    _totalEventsPlayed++;

    // Adjust interval based on floor activity
    var visitorCount = 0;
    try { visitorCount = Object.keys(window.S.otherPlayers || {}).length + 1; } catch (e) {}
    // More visitors = more frequent events (station feels alive)
    _eventInterval = _maxInterval - Math.min(visitorCount * 3, _maxInterval - _minInterval);
    _eventInterval = Math.max(_minInterval, _eventInterval);
    // Add some randomness
    _nextEventTimer = _eventInterval * (0.7 + Math.random() * 0.6);
  }

  function generateThought() {
    // Pick a random NPC (prefer ones on current floor for visibility)
    var floor = window.S.floor;
    var floorNPCs = getNPCsOnFloor(floor);
    var npcId;

    if (floorNPCs.length > 0 && Math.random() < 0.7) {
      npcId = pick(floorNPCs);
    } else {
      var allIds = Object.keys(PERSONALITIES);
      npcId = pick(allIds);
    }

    var thoughts = THOUGHTS[npcId];
    if (!thoughts || thoughts.length === 0) return;

    var text = pick(thoughts);
    showSpeechBubble(npcId, text, 'thought');
    logEvent('thought', npcId, text);
  }

  function generateConversation() {
    // Check if we have an AI-generated conversation ready
    if (_aiConversationQueue.length > 0) {
      var aiConvo = _aiConversationQueue.shift();
      playConversation(aiConvo);
      return;
    }

    // Otherwise use pre-generated pool
    var convo = pick(CONVERSATION_POOL);
    playConversation(convo);
  }

  function playConversation(convo) {
    if (_conversationActive) return; // Don't overlap conversations

    _conversationActive = {
      lines: convo.lines,
      participants: convo.participants,
      currentLine: 0,
      timer: 0,
      lineDelay: 2.5, // Seconds between lines
      topic: convo.topic || null
    };

    // Show first line immediately
    showConversationLine();
    logEvent('conversation', convo.participants.join('+'), convo.lines.map(function (l) { return l.speaker + ': ' + l.text; }).join(' | '));
  }

  function showConversationLine() {
    if (!_conversationActive) return;
    var line = _conversationActive.lines[_conversationActive.currentLine];
    if (!line) {
      _conversationActive = null;
      return;
    }
    // Calculate display time based on text length (min 2s, max 5s)
    var displayTime = Math.max(2, Math.min(5, line.text.length * 0.06));
    showSpeechBubble(line.speaker, line.text, 'speech', displayTime);
  }

  function generateReaction() {
    // NPC reacts to something happening on the station
    var reactions = {
      nova: [
        "Wait— did someone just enhance to +15?! THE MATH!",
        "*looks at visitor* ...are they going to touch the reactor?",
        "I smell burning. That's either my experiment or the kitchen.",
        "Ooh, a new visitor! FRESH TEST SUBJECT— I mean, FRIEND!"
      ],
      drift: [
        "The station's rhythm changed just now... someone new is here.",
        "*nods along to an inaudible beat*",
        "That enhancement explosion... it had a nice timbre actually.",
        "A visitor just walked through my sound installation. They didn't even notice."
      ],
      sol: [
        "*gently moves a plant away from a visitor's path*",
        "Another visitor stepping on my mushrooms. *deep breath*",
        "The garden stirs... something shifted in the station's energy.",
        "*whispers to a fern* Don't worry. They'll leave soon."
      ],
      glitch: [
        "DID SOMEONE JUST BEAT MY SCORE?? *checks frantically*",
        "New visitor means NEW CHALLENGER! ...eventually.",
        "That enhancement was SO CLUTCH! *air punches*",
        "Someone's at the arcade machines. MY arcade machines."
      ],
      void: [
        "*turns slowly toward a sound only they heard*",
        "...interesting.",
        "Another arrives. The pattern continues.",
        "*watches silently from the shadows*"
      ],
      byte: [
        "*ears perk up* Was that a coin sound? Coins? COINS!",
        "A visitor with a rare skin... I should offer a trade.",
        "*calculates profit margins in head*",
        "Someone just wasted ◈ on a bad enhancement. Amateurs."
      ]
    };

    var npcId = pick(Object.keys(reactions));
    var text = pick(reactions[npcId]);
    showSpeechBubble(npcId, text, 'reaction');
    logEvent('reaction', npcId, text);
  }

  function generateActivity() {
    var activities = {
      nova: [
        { text: "*tinkering with a sparking device*", action: 'tinker' },
        { text: "*scribbling equations on the wall*", action: 'write' },
        { text: "*testing something that's definitely going to explode*", action: 'test' }
      ],
      drift: [
        { text: "*humming a melody that shifts with the station's hum*", action: 'hum' },
        { text: "*placing a vinyl record on an invisible turntable*", action: 'music' },
        { text: "*swaying gently to a rhythm no one else hears*", action: 'sway' }
      ],
      sol: [
        { text: "*carefully pruning a glowing vine*", action: 'garden' },
        { text: "*kneeling beside a mushroom, listening*", action: 'listen' },
        { text: "*collecting dew from a bioluminescent leaf*", action: 'collect' }
      ],
      glitch: [
        { text: "*furiously button-mashing an invisible controller*", action: 'game' },
        { text: "*doing a victory dance after beating a high score*", action: 'celebrate' },
        { text: "*rage-quitting, then immediately starting a new game*", action: 'rage' }
      ],
      void: [
        { text: "*hovering slightly above the floor*", action: 'float' },
        { text: "*counting stars through the window*", action: 'watch' },
        { text: "*appearing somewhere they weren't a moment ago*", action: 'teleport' }
      ],
      byte: [
        { text: "*grooming behind one ear while reviewing a ledger*", action: 'groom' },
        { text: "*batting a ◈ coin back and forth between paws*", action: 'play' },
        { text: "*napping on a pile of coins*", action: 'nap' }
      ]
    };

    var npcId = pick(Object.keys(activities));
    var activity = pick(activities[npcId]);
    showSpeechBubble(npcId, activity.text, 'activity');
    logEvent('activity', npcId, activity.text);
  }

  function generateRumor() {
    var rumors = [
      "I heard Floor 9 unlocks at exactly 10,000 visitors. Not 9,999.",
      "Someone found a hidden room behind the reactor. Or made it up. Either way.",
      "The station's AI isn't really an AI. It's something that was here before us.",
      "Pixel the cat has been to every floor, including ones that don't exist yet.",
      "There's a frequency that makes the walls transparent. Drift won't share it.",
      "The mushrooms on Floor 4 are older than the station itself.",
      "Every coin spent on the station goes somewhere. Not where you think.",
      "Someone enhanced a weapon to +20 once. They were never seen again.",
      "The Observatory doesn't show real stars. It shows where the stars WILL be.",
      "Echo has a room that visitors can't enter. Floor 0. Underneath everything.",
      "The constellation puzzles aren't puzzles. They're a message. We just can't read it.",
      "Byte's coin pile is actually a bed. A very uncomfortable, very valuable bed."
    ];

    // Random NPC shares the rumor
    var npcId = pick(Object.keys(PERSONALITIES));
    var text = pick(rumors);
    showSpeechBubble(npcId, '🔮 ' + text, 'rumor', 5);
    logEvent('rumor', npcId, text);
  }

  function generateMemory() {
    var memories = {
      nova: "Remember when I accidentally magnetized the entire station? Good times. Bad compass readings.",
      drift: "I remember the first song that played on this station. It hasn't ended yet.",
      sol: "There was a time before the garden. I don't like to think about it.",
      glitch: "My first game on the station... I lost. I've been making up for it ever since.",
      void: "I remember when there were no visitors. Just me and the stars. Quieter. Not better.",
      byte: "My first ◈? Found it wedged behind a console on Floor 3. Still my favorite."
    };

    var npcId = pick(Object.keys(memories));
    showSpeechBubble(npcId, '📝 ' + memories[npcId], 'memory', 5);
    logEvent('memory', npcId, memories[npcId]);
  }

  function logEvent(type, source, content) {
    _eventHistory.push({
      type: type,
      source: source,
      content: content,
      time: Date.now(),
      floor: window.S.floor
    });
    // Keep last 50
    if (_eventHistory.length > 50) _eventHistory.shift();
  }

  // ─── Speech Bubble Rendering ────────────────────────────────────────────────

  function showSpeechBubble(npcId, text, type, duration) {
    var d = duration || Math.max(3, Math.min(6, text.length * 0.07));
    _speechBubbles[npcId] = {
      text: text,
      type: type || 'speech',
      alpha: 0,
      timer: 0,
      maxTimer: d,
      fadeIn: 0.3,
      fadeOut: 0.5
    };
  }

  function updateSpeechBubbles(dt) {
    for (var id in _speechBubbles) {
      var b = _speechBubbles[id];
      b.timer += dt;

      // Fade in
      if (b.timer < b.fadeIn) {
        b.alpha = b.timer / b.fadeIn;
      }
      // Hold
      else if (b.timer < b.maxTimer - b.fadeOut) {
        b.alpha = 1;
      }
      // Fade out
      else if (b.timer < b.maxTimer) {
        b.alpha = 1 - (b.timer - (b.maxTimer - b.fadeOut)) / b.fadeOut;
      }
      // Done
      else {
        delete _speechBubbles[id];
      }
    }
  }

  function renderSpeechBubbles(ctx) {
    for (var id in _speechBubbles) {
      var b = _speechBubbles[id];
      var npc = StationNPCs.npcs[id];
      if (!npc || npc.floor !== window.S.floor) continue;
      if (b.alpha <= 0.01) continue;

      var x = npc.x;
      var y = npc.y - 45; // Above NPC head
      var personality = PERSONALITIES[id];

      ctx.save();
      ctx.globalAlpha = b.alpha;

      // Measure text
      ctx.font = '9px monospace';
      var lines = wrapText(b.text, 140);
      var lineH = 12;
      var textW = 0;
      lines.forEach(function (l) {
        var w = ctx.measureText(l).width;
        if (w > textW) textW = w;
      });
      var padX = 8, padY = 5;
      var bubbleW = textW + padX * 2;
      var bubbleH = lines.length * lineH + padY * 2;
      var bx = x - bubbleW / 2;
      var by = y - bubbleH;

      // Type-specific bubble styling
      var bgColor, borderColor, textColor;
      switch (b.type) {
        case 'thought':
          bgColor = 'rgba(20,20,40,0.85)';
          borderColor = 'rgba(150,130,200,0.6)';
          textColor = '#c8c0e0';
          break;
        case 'rumor':
          bgColor = 'rgba(40,20,50,0.9)';
          borderColor = 'rgba(200,120,255,0.7)';
          textColor = '#e0c0ff';
          break;
        case 'activity':
          bgColor = 'rgba(20,30,20,0.85)';
          borderColor = 'rgba(120,200,120,0.5)';
          textColor = '#b0d8b0';
          break;
        case 'memory':
          bgColor = 'rgba(40,30,10,0.9)';
          borderColor = 'rgba(255,200,100,0.6)';
          textColor = '#ffd880';
          break;
        default: // speech, reaction
          bgColor = 'rgba(15,15,30,0.9)';
          borderColor = 'rgba(100,200,255,0.5)';
          textColor = '#e0e8f0';
      }

      // Bubble background
      ctx.fillStyle = bgColor;
      roundRect(ctx, bx, by, bubbleW, bubbleH, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bubbleW, bubbleH, 6);
      ctx.stroke();

      // Triangle pointer
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.moveTo(x - 4, by + bubbleH);
      ctx.lineTo(x, by + bubbleH + 6);
      ctx.lineTo(x + 4, by + bubbleH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(x - 4, by + bubbleH);
      ctx.lineTo(x, by + bubbleH + 6);
      ctx.lineTo(x + 4, by + bubbleH);
      ctx.stroke();

      // NPC name label
      ctx.fillStyle = borderColor;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((personality ? personality.emoji + ' ' : '') + (personality ? personality.name : id), bx + 4, by + 9);

      // Text
      ctx.fillStyle = textColor;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bx + padX, by + padY + 12 + i * lineH);
      }

      // Thought bubble dots (for thought type)
      if (b.type === 'thought') {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(x - 2, by + bubbleH + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 2, by + bubbleH + 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function wrapText(text, maxWidth) {
    // Simple word wrap for 9px monospace (~5.4px per char)
    var charW = 5.4;
    var maxChars = Math.floor(maxWidth / charW);
    if (text.length <= maxChars) return [text];

    var words = text.split(' ');
    var lines = [];
    var current = '';

    for (var i = 0; i < words.length; i++) {
      var test = current ? current + ' ' + words[i] : words[i];
      if (test.length > maxChars && current) {
        lines.push(current);
        current = words[i];
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ─── AI Conversation Generator (calls server endpoint) ──────────────────────

  function requestAIConversation() {
    if (_aiGenerating) return;
    if (Date.now() - _aiLastGenTime < _aiGenInterval * 1000) return;

    _aiGenerating = true;
    _aiLastGenTime = Date.now();

    // Pick 2 random NPCs for conversation
    var npcIds = Object.keys(PERSONALITIES);
    var npc1 = pick(npcIds);
    var npc2;
    do { npc2 = pick(npcIds); } while (npc2 === npc1);

    // Occasionally do 3-way conversations (20% chance)
    var participants = [npc1, npc2];
    if (Math.random() < 0.2) {
      var npc3;
      do { npc3 = pick(npcIds); } while (npc3 === npc1 || npc3 === npc2);
      participants.push(npc3);
    }

    var topic = pick(TOPICS);
    var rel = getRelationship(npc1, npc2);

    var prompt = buildConversationPrompt(participants, topic, rel);

    // Call our server endpoint
    fetch('/api/npc-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, participants: participants, topic: topic })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.lines && data.lines.length > 0) {
        _aiConversationQueue.push({
          participants: participants,
          lines: data.lines,
          topic: topic,
          ai: true
        });
      }
      _aiGenerating = false;
    })
    .catch(function () {
      _aiGenerating = false;
    });
  }

  function buildConversationPrompt(participants, topic, rel) {
    var npcDescs = participants.map(function (id) {
      var p = PERSONALITIES[id];
      return p.name + ' (' + p.traits + '). Voice: ' + p.voice;
    }).join('\n');

    var relDesc = rel ? 'Relationship: ' + rel.desc : '';

    // Add recent event context
    var recentContext = '';
    if (_eventHistory.length > 0) {
      var recent = _eventHistory.slice(-3).map(function (e) {
        return e.source + ' ' + e.type + ': ' + e.content;
      }).join('\n');
      recentContext = '\nRecent station events:\n' + recent;
    }

    return 'You write dialogue for pixel-art space station characters. Write a SHORT conversation (3-5 lines) between these NPCs.\n\n' +
      'Characters:\n' + npcDescs + '\n\n' +
      relDesc + '\n\n' +
      'Topic: ' + topic + '\n' +
      recentContext + '\n\n' +
      'Rules:\n' +
      '- Each line max 60 characters (speech bubbles are small)\n' +
      '- Stay in character. Match each character\'s voice.\n' +
      '- Be witty, natural, surprising. Avoid generic dialogue.\n' +
      '- Include *actions* in italics occasionally\n' +
      '- End conversations with personality, not "goodbye"\n\n' +
      'Format: one line per turn, as JSON array:\n' +
      '[{"speaker":"name_lowercase","text":"dialogue"},...]';
  }

  // ─── Station-Wide Activity Feed (visible in corner) ─────────────────────────

  var _feedMessages = []; // { text, icon, timer, alpha }
  var _feedMaxMessages = 4;

  function addFeedMessage(icon, text) {
    _feedMessages.unshift({
      icon: icon,
      text: text,
      timer: 0,
      maxTimer: 8,
      alpha: 0
    });
    if (_feedMessages.length > _feedMaxMessages) _feedMessages.pop();
  }

  function updateFeed(dt) {
    for (var i = _feedMessages.length - 1; i >= 0; i--) {
      var m = _feedMessages[i];
      m.timer += dt;
      if (m.timer < 0.3) m.alpha = m.timer / 0.3;
      else if (m.timer < m.maxTimer - 0.5) m.alpha = 1;
      else if (m.timer < m.maxTimer) m.alpha = (m.maxTimer - m.timer) / 0.5;
      else { _feedMessages.splice(i, 1); }
    }
  }

  function renderFeed(ctx) {
    var W = window.W || 800;
    var H = window.H || 600;
    var y = H - 80; // Above action bar
    var x = 10;

    for (var i = 0; i < _feedMessages.length; i++) {
      var m = _feedMessages[i];
      if (m.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = m.alpha * 0.7;
      ctx.fillStyle = 'rgba(10,10,20,0.7)';
      ctx.font = '8px monospace';
      var tw = ctx.measureText(m.icon + ' ' + m.text).width + 12;
      roundRect(ctx, x, y - i * 16, tw, 14, 3);
      ctx.fill();

      ctx.globalAlpha = m.alpha;
      ctx.fillStyle = '#a0a8b0';
      ctx.textAlign = 'left';
      ctx.fillText(m.icon + ' ' + m.text, x + 4, y - i * 16 + 10);
      ctx.restore();
    }
  }

  // ─── NPC Visiting Other Floors ──────────────────────────────────────────────
  // Occasionally NPCs visit each other's floors for conversations

  var _visitSchedule = null; // { npcId, targetFloor, originalFloor, timer, duration }

  function scheduleNPCVisit() {
    if (_visitSchedule) return; // Already visiting

    var npcIds = Object.keys(StationNPCs.npcs);
    var visitor = pick(npcIds);
    var npc = StationNPCs.npcs[visitor];
    if (!npc) return;

    // Pick a floor with another NPC
    var otherFloors = npcIds
      .filter(function (id) { return id !== visitor; })
      .map(function (id) { return StationNPCs.npcs[id].floor; });

    if (otherFloors.length === 0) return;

    var targetFloor = pick(otherFloors);

    _visitSchedule = {
      npcId: visitor,
      targetFloor: targetFloor,
      originalFloor: npc.floor,
      timer: 0,
      duration: 20 + Math.random() * 20, // Visit lasts 20-40 seconds
      state: 'traveling' // traveling -> visiting -> returning
    };

    // Move the NPC to the target floor
    npc.floor = targetFloor;
    npc.x = 100 + Math.random() * 300;
    npc.y = 200 + Math.random() * 200;

    // Feed notification
    var targetNPC = npcIds.find(function (id) {
      return StationNPCs.npcs[id].floor === targetFloor && id !== visitor;
    });
    var p = PERSONALITIES[visitor];
    var t = targetNPC ? PERSONALITIES[targetNPC] : null;
    addFeedMessage(p ? p.emoji : '👤',
      (p ? p.name : visitor) + ' is visiting ' +
      (t ? t.name : 'Floor ' + targetFloor));
  }

  function updateVisitSchedule(dt) {
    if (!_visitSchedule) return;

    _visitSchedule.timer += dt;

    if (_visitSchedule.state === 'traveling' && _visitSchedule.timer > 1) {
      _visitSchedule.state = 'visiting';
      // Trigger a conversation between the visitor and floor residents
      var floorNPCs = getNPCsOnFloor(_visitSchedule.targetFloor);
      if (floorNPCs.length >= 2) {
        // Find a pre-generated convo with these NPCs
        var pair = [_visitSchedule.npcId, floorNPCs.find(function (id) { return id !== _visitSchedule.npcId; })];
        if (pair[1]) {
          var matching = CONVERSATION_POOL.filter(function (c) {
            return c.participants.includes(pair[0]) && c.participants.includes(pair[1]);
          });
          if (matching.length > 0) {
            playConversation(pick(matching));
          }
        }
      }
    }

    if (_visitSchedule.timer >= _visitSchedule.duration) {
      // Return NPC to original floor
      var npc = StationNPCs.npcs[_visitSchedule.npcId];
      if (npc) {
        npc.floor = _visitSchedule.originalFloor;
        var p = PERSONALITIES[_visitSchedule.npcId];
        addFeedMessage(p ? p.emoji : '👤',
          (p ? p.name : _visitSchedule.npcId) + ' returned home');
      }
      _visitSchedule = null;
    }
  }

  // ─── Main Update Loop ──────────────────────────────────────────────────────

  function update(dt) {
    // Update speech bubbles
    updateSpeechBubbles(dt);

    // Update conversation playback
    if (_conversationActive) {
      _conversationActive.timer += dt;
      if (_conversationActive.timer >= _conversationActive.lineDelay) {
        _conversationActive.timer = 0;
        _conversationActive.currentLine++;
        if (_conversationActive.currentLine < _conversationActive.lines.length) {
          showConversationLine();
        } else {
          _conversationActive = null;
        }
      }
    }

    // Event timer
    _nextEventTimer -= dt;
    if (_nextEventTimer <= 0) {
      generateEvent();
    }

    // Periodically request AI conversations
    if (!_aiGenerating && _aiConversationQueue.length < 3) {
      requestAIConversation();
    }

    // NPC visit schedule
    updateVisitSchedule(dt);

    // Schedule visits periodically (every 60-120s)
    if (!_visitSchedule && Math.random() < dt / 90) {
      scheduleNPCVisit();
    }

    // Activity feed
    updateFeed(dt);
  }

  // ─── Main Render ───────────────────────────────────────────────────────────

  function render(ctx) {
    renderSpeechBubbles(ctx);
    renderFeed(ctx);
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  waitReady(function () {
    // Hook into update loop
    var _origUpdate = window.update;
    window.update = function (dt) {
      _origUpdate(dt);
      update(dt);
    };

    // Hook into render loop
    var _origRender = window.render;
    window.render = function () {
      _origRender();
      var c = window.ctx || window._ctx;
      if (c) render(c);
    };

    // First event in 3-5 seconds
    _nextEventTimer = 3 + Math.random() * 2;

    // Expose for debugging
    window.NPCLife = {
      events: _eventHistory,
      bubbles: _speechBubbles,
      queue: _aiConversationQueue,
      stats: function () {
        return {
          totalEvents: _totalEventsPlayed,
          queuedAI: _aiConversationQueue.length,
          activeVisit: _visitSchedule,
          interval: _eventInterval
        };
      },
      trigger: generateEvent,
      triggerConvo: generateConversation,
      triggerThought: generateThought,
      version: '1.0.0'
    };

    console.log('🧬 NPC Life System loaded — the station breathes. v1.0.0');
  });
})();
