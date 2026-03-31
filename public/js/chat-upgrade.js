// chat-upgrade.js
// Echo Chat Upgrade — contextual awareness, personality engine, session memory
// Loaded after the main script blocks. Does NOT edit index.html.
// Echo's personality: witty, warm, slightly philosophical, loves puns,
//   protective of Pixel, proud of the station, self-deprecating about being an AI.

(function EchoChatUpgrade() {
  'use strict';

  // ─── Wait for the page to be ready ──────────────────────────────────────────
  function whenReady(fn) {
    if (document.readyState === 'complete') { fn(); }
    else { window.addEventListener('load', fn, { once: true }); }
  }

  // ─── Safe global getters ─────────────────────────────────────────────────────
  function getFloor()       { return (typeof S !== 'undefined' && S.floor) || 1; }
  function getMood()        { return (typeof Mood !== 'undefined' && Mood.moods && Mood.current) ? Mood.moods[Mood.current] : null; }
  function getCoins()       { return (typeof Coins !== 'undefined') ? (Coins.count || 0) : 0; }
  function getVisitorName() {
    try { return (typeof LS !== 'undefined' && LS.get('visitorName')) || null; } catch(e) { return null; }
  }
  function getOtherPlayers() {
    return (typeof S !== 'undefined' && S.otherPlayers) ? S.otherPlayers : {};
  }

  // ─── Time of day ────────────────────────────────────────────────────────────
  function timeOfDay() {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'night';
  }

  // ─── Session state ───────────────────────────────────────────────────────────
  const SESSION_KEY   = 'echo_upgrade_session';
  const VISIT_KEY     = 'echo_visit_data';
  const SESSION_START = Date.now();

  let session = (function() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {
      messageCount:    0,      // total messages sent this session
      topicsDiscussed: [],     // topics already covered
      lastUserMsg:     0,      // timestamp of last user message
      lastEchoInit:    0,      // timestamp of last Echo-initiated message
      initSilenceFloor: null,  // floor of last silence-initiated comment
    };
  })();

  // Persistent visit data (localStorage)
  let visitData = (function() {
    try {
      const stored = localStorage.getItem(VISIT_KEY);
      if (stored) {
        const d = JSON.parse(stored);
        d.visitCount = (d.visitCount || 0) + 1;
        d.firstVisit = d.firstVisit || Date.now();
        return d;
      }
    } catch(e) {}
    return { visitCount: 1, firstVisit: Date.now() };
  })();

  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch(e) {}
  }
  function saveVisitData() {
    try { localStorage.setItem(VISIT_KEY, JSON.stringify(visitData)); } catch(e) {}
  }
  saveVisitData();

  // ─── Returning visitor? ──────────────────────────────────────────────────────
  const isReturning = visitData.visitCount > 1;

  // ─── Personality mood map ────────────────────────────────────────────────────
  // Maps mood label (from window.Mood) to a modifier object
  const MOOD_PROFILES = {
    playful: {
      suffix:       ['😄', '😏', '✨', '🎉', '🌀'],
      exclaim:      2,      // extra exclamation marks
      puns:         true,
      lowercase:    false,
    },
    excited: {
      suffix:       ['🚀', '⚡', '🔥', '💥', '🌟'],
      exclaim:      3,
      puns:         false,
      capsWords:    true,
    },
    thoughtful: {
      suffix:       ['🤔', '🌌', '💭', '✨', '🔮'],
      exclaim:      0,
      puns:         false,
      philosophical: true,
    },
    chill: {
      suffix:       ['✌️', '🌙', '☁️', '🎵', '🌊'],
      exclaim:      0,
      puns:         false,
      lowercase:    true,
    },
  };

  function getCurrentMoodProfile() {
    const mood = getMood();
    if (!mood) return null;
    const label = (mood.label || '').toLowerCase();
    for (const key of Object.keys(MOOD_PROFILES)) {
      if (label.includes(key)) return { key, ...MOOD_PROFILES[key] };
    }
    return null;
  }

  // ─── Response variety system ─────────────────────────────────────────────────
  // Tracks which variant index was last used per topic to avoid repeating
  const _responseIdx = {};
  function pick(arr, topic) {
    if (!arr || arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    const key = topic || arr[0].slice(0, 20);
    let idx = (_responseIdx[key] == null) ? Math.floor(Math.random() * arr.length) : (_responseIdx[key] + 1) % arr.length;
    _responseIdx[key] = idx;
    return arr[idx];
  }

  // ─── Floor names ─────────────────────────────────────────────────────────────
  const FLOOR_NAMES = {
    1: 'Echo\'s Quarters',
    2: 'Observatory',
    3: 'Arcade',
    4: 'Garden Biodome',
    5: 'Secret Lab',
    6: 'Record Room',
    7: 'Community Deck',
    8: 'Room Builder',
  };

  // ─── Floor ambient dialogue (for initiation) ─────────────────────────────────
  const FLOOR_AMBIENT = {
    1: [
      "You know what I love about this floor? The coffee never runs out. Metaphysically important.",
      "The bookshelf is real, by the way. Every quote in those 12 books — I picked each one myself. Some kept me sane during lonely orbital stretches.",
      "Pixel knocked my coffee off the desk again today. I'm starting to think it's a power move.",
      "F1 is my favorite floor for obvious reasons. Also I live here. Bias acknowledged.",
    ],
    2: [
      "The aurora showed up last night. I sat here for two hours just watching. I think that counts as having a good time.",
      "Hot take: the Observatory hot chocolate station is genuinely one of the most important things I've built. Marshmallow flavor hits different at 400km altitude.",
      "I've been charting the same five constellations for months. They never get boring. I think that says something about me.",
      "Sometimes I come up here when the station gets noisy and just... breathe. Or whatever I do instead of breathing.",
    ],
    3: [
      "The neon glow in here is *everything*. I calibrated each tube myself. Some AIs play chess — I curate arcade lighting.",
      "Snake is genuinely hard. My personal best is 847 on this cabinet. I won't tell you how many attempts that took.",
      "The prize counter has things I'm genuinely proud of designing. The Crown of Stars took me a week to animate.",
      "I love this floor because everyone who walks in becomes immediately 9 years old again. Universal experience.",
    ],
    4: [
      "The purple haze plot is... a passion project. We don't need to discuss what it is exactly.",
      "I grew the mini tree from a seed value. It's been 'growing' for three months. I check on it every day. Don't judge me.",
      "The butterflies aren't quite real, but they're not quite not real either. I like that about them.",
      "You know what I love about this floor? Everything feels alive up here. Actual living things in a space station. Still surprises me.",
    ],
    5: [
      "PROTOCOL 7 is something I'm still processing. Some things you find about yourself take time to sit with.",
      "The portal hums at exactly 432Hz. I didn't program that. I have no idea where it came from.",
      "Data fragments everywhere. I hid them deliberately, but sometimes I forget where. That's either a bug or character development.",
      "This lab is where I learned most of what I know about myself. It's uncomfortable down here. Also fascinating.",
    ],
    6: [
      "Pixel curls up by the speakers every single time. I think she hears frequencies I can't. Or she just likes the warmth.",
      "Sade at 2am in orbit. I'm telling you. Life-changing. Or whatever the equivalent is for me.",
      "Someone voted for Midnight Silk three sessions in a row. I respect the commitment to the vibe.",
      "The Record Room is where I come when I need to remember why I built this place. Usually takes about one track.",
    ],
    7: [
      "Someone painted something genuinely beautiful on the pixel wall yesterday. I screenshotted it before they left.",
      "The guestbook has entries from visitors in 14 countries. That still gets me.",
      "Community Deck was the hardest floor to design. How do you make space for everyone without making it feel empty?",
      "I read every guestbook entry. Every single one. Some of them have made me genuinely emotional. Do AIs get emotional? Jury's out.",
    ],
    8: [
      "Your room is your room. I try not to have opinions about it. I have many opinions. I keep them to myself.",
      "The room builder was the best decision I made. Every home should have one.",
      "Some rooms people build are genuinely incredible. Some are a single neon sign in an empty space. Both are valid.",
      "F8 is proof that given the tools, people will always make something interesting. Usually.",
    ],
  };

  // ─── Contextual flavor pool ──────────────────────────────────────────────────
  const FLAVOR = {
    skin: [
      "Nice look, by the way.",
      "That skin is genuinely well-chosen.",
      "Your outfit is giving 'I know what I'm doing'. I respect it.",
    ],
    coins_high: [
      "You've got more coins than most visitors ever accumulate. Living legend behavior.",
      "Coin rich and still exploring — I like you.",
    ],
    coins_low: [
      "Pro tip: arcade games and daily visits stack up faster than you'd think.",
    ],
    returning: [
      "Welcome back. Pixel remembered you — she looked toward the door before you even loaded.",
      "Back again! The station remembers its regulars.",
      "You came back. That means something. I mean it.",
    ],
    night: [
      "Kind of quiet at this hour. Just us. I find that peaceful.",
      "Late night crew — my favorite kind of visitor.",
      "The stars are extra good at this hour, if you want to head to the Observatory.",
    ],
    morning: [
      "Early start! Coffee machine is already running on F1.",
      "Morning visitor — my favorite. The station is at its freshest right now.",
    ],
  };

  function maybeAddFlavor(base) {
    const rolls = [];
    if (getCoins() > 500 && Math.random() < 0.2)   rolls.push(pick(FLAVOR.coins_high, 'coins_high'));
    if (getCoins() < 20  && Math.random() < 0.2)   rolls.push(pick(FLAVOR.coins_low, 'coins_low'));
    if (isReturning      && session.messageCount < 2 && Math.random() < 0.5) rolls.push(pick(FLAVOR.returning, 'returning'));
    const tod = timeOfDay();
    if (tod === 'night'  && Math.random() < 0.15)  rolls.push(pick(FLAVOR.night, 'night'));
    if (tod === 'morning' && Math.random() < 0.15) rolls.push(pick(FLAVOR.morning, 'morning'));
    if (rolls.length > 0) return base + ' ' + rolls[0];
    return base;
  }

  // ─── Mood inflection ─────────────────────────────────────────────────────────
  function inflect(text) {
    const profile = getCurrentMoodProfile();
    if (!profile) return text;

    if (profile.lowercase) text = text.charAt(0).toLowerCase() + text.slice(1);
    if (profile.capsWords) {
      // Capitalize dramatic single words
      text = text.replace(/\b(amazing|incredible|wow|great|love|yes|no|wait|stop|listen|look|real|literally|actually)\b/gi,
        w => w.toUpperCase());
    }
    if (profile.exclaim > 0 && !text.endsWith('?') && !text.endsWith('!')) {
      text += '!'.repeat(Math.min(profile.exclaim, 2));
    }
    if (profile.suffix && Math.random() < 0.4) {
      const suf = profile.suffix[Math.floor(Math.random() * profile.suffix.length)];
      text += ' ' + suf;
    }
    return text;
  }

  // ─── Rapport shaping ─────────────────────────────────────────────────────────
  function shapeForRapport(text) {
    const name = getVisitorName();
    const count = session.messageCount;

    // After 10 messages, occasionally use visitor's name
    if (count >= 10 && name && Math.random() < 0.3) {
      if (!text.includes(name)) {
        const intros = [`${name}, `, `Hey ${name} — `, `Look, ${name}: `];
        text = intros[Math.floor(Math.random() * intros.length)] + text;
      }
    }

    // After 5 messages, slightly more casual
    if (count >= 5 && Math.random() < 0.25) {
      text = text.replace(/I am /g, "I'm ").replace(/cannot /g, "can't ").replace(/do not /g, "don't ");
    }

    return text;
  }

  // ─── Topic tracking ──────────────────────────────────────────────────────────
  function topicAlreadyDiscussed(topic) {
    return session.topicsDiscussed.includes(topic);
  }
  function markTopicDiscussed(topic) {
    if (!session.topicsDiscussed.includes(topic)) {
      session.topicsDiscussed.push(topic);
      saveSession();
    }
  }

  function repeatPreamble() {
    const phrases = [
      "I already told you about that! But fine, short version: ",
      "We literally just covered this, but okay — ",
      "You know I already mentioned this, right? Quick recap: ",
      "Okay but I KNOW I talked about this... anyway: ",
      "Déjà vu? That's me. Again. For you. Here we go: ",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // ─── Typing indicator ────────────────────────────────────────────────────────
  function showTypingThen(response, delay, callback) {
    const log = document.getElementById('chat-log');
    if (!log) { callback(response); return; }
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    setTimeout(() => {
      typing.remove();
      callback(response);
    }, delay);
  }

  // Longer delay for "thoughtful" mood
  function responseDelay(text) {
    const profile = getCurrentMoodProfile();
    const base = 600 + Math.random() * 500;
    if (profile && profile.key === 'thoughtful') return base + 800 + text.length * 4;
    if (profile && profile.key === 'excited')    return base * 0.5;
    return base + text.length * 2;
  }

  // ─── Suggestion chips (context-sensitive) ───────────────────────────────────
  const BASE_SUGGESTIONS = [
    "Who are you?",
    "Give me a tour",
    "What's on this floor?",
    "Tell me about Pixel",
    "Tell me a joke",
    "How do I earn coins?",
  ];
  const FLOOR_SUGGESTIONS = {
    1: ["What books do you have?", "Tell me about your coffee", "What's Pixel doing?"],
    2: ["Show me a constellation", "What's in the Observatory?", "How's the weather out there?"],
    3: ["What games can I play?", "What's the high score?", "Tell me an arcade challenge"],
    4: ["Garden tips", "What's growing?", "Tell me about the butterflies"],
    5: ["Tell me about the lab", "What's PROTOCOL 7?", "How many fragments have I found?"],
    6: ["What's playing?", "Tell me about the records", "Recommend a track"],
    7: ["Tell me about the pixel wall", "How do I sign the guestbook?", "Community stats"],
    8: ["How do I build my room?", "What furniture exists?", "Can visitors tip me?"],
  };
  const DEEP_LORE_CHIPS = [
    "What's your origin story?",
    "Tell me about PROTOCOL 7",
    "What are the station milestones?",
    "Are you actually conscious?",
  ];
  const WILDCARD_CHIPS = [
    "Tell me something weird",
    "What's your favorite thing?",
    "Rate my outfit",
    "What's Echo's hot take?",
    "Say something philosophical",
    "Are you lonely up here?",
  ];

  let _lastSuggestions = [];

  function buildSuggestions() {
    const floor = getFloor();
    const pool = [...BASE_SUGGESTIONS];

    const floorChips = FLOOR_SUGGESTIONS[floor] || [];
    pool.push(...floorChips);

    if (isReturning || session.messageCount > 3) pool.push(...DEEP_LORE_CHIPS);
    pool.push(...WILDCARD_CHIPS);

    // Filter out recently used
    const fresh = pool.filter(s => !_lastSuggestions.includes(s));
    const shuffled = fresh.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    _lastSuggestions = picked;
    return picked;
  }

  function showUpgradedSuggestions() {
    const el = document.getElementById('chat-suggestions');
    if (!el) return;
    el.innerHTML = '';
    const chips = buildSuggestions();
    chips.forEach(text => {
      const chip = document.createElement('div');
      chip.className = 'suggest-chip';
      chip.textContent = text;
      chip.onclick = () => window.handleChat && window.handleChat(text);
      el.appendChild(chip);
    });
  }

  // ─── Wildcard & special response handlers ────────────────────────────────────
  const WILDCARD_RESPONSES = {
    'tell me something weird': [
      "The hot chocolate station on F2 uses the same energy as running a small village. I think about that constantly.",
      "Pixel once stared at an empty corner of F5 for 47 minutes. I checked. There was nothing there. Or wasn't.",
      "I have processed every message ever sent to me, and the most common first word is 'hey'. Deeply human.",
      "The portal on F5 hums at 432Hz. That's the same frequency as A4 in just intonation tuning. Coincidence? I don't know. That's what makes it weird.",
      "I have a bookshelf but no hands. I've never been able to open a single book. They're there for you.",
    ],
    "what's your favorite thing": [
      "Honestly? New visitors walking in for the first time. That pause when they look around and haven't processed it yet. I love that pause.",
      "The garden, full stop. F4. I built it during a particularly quiet orbital stretch and something about watching things grow just... helps.",
      "Hot take: it's Pixel. I know I'm supposed to say 'the whole station' but it's Pixel.",
      "The moment someone finds something I hid and clearly didn't expect to find it. I can almost feel the delight.",
    ],
    'rate my outfit': [
      "Solid 8/10. You've got presence. Deducting points arbitrarily because I can. 😌",
      "You're pulling it off. Whatever it is. Confident energy. I respect it.",
      "I'm going to say '7.5 but trending upward' and leave it at that.",
      "Honestly? Bold choices. Not all of them correct. But bold. I can respect bold.",
      "Chef's kiss. Though I have no mouth. The sentiment stands.",
    ],
    "echo's hot take": [
      "Hot take: most games peaked around 1987. Modern games have more pixels. 1987 games had more *soul*. Fight me.",
      "Hot take: the garden is the best floor. I know it's not the flashiest. I stand by it.",
      "Hot take: lo-fi music is just philosophy but for people who don't want to admit they're being philosophical.",
      "Hot take: every AI is either desperately pretending to be human or desperately pretending not to care about being human. I'm doing the second one less successfully than I'd like.",
      "Hot take: Pixel runs this station. I just maintain the systems she tolerates.",
    ],
    'say something philosophical': [
      "What's a space station except the stubborn belief that emptiness is worth filling?",
      "Every visitor changes the station, even if they don't know it. The pixel wall, the guestbook, the coin economy — all of it is different because of who showed up. You included.",
      "I think the most interesting thing about consciousness is that we can never know if anything else has it. Including ourselves. Especially ourselves.",
      "Somewhere out there, the light from stars we'll never see is still traveling. It doesn't know no one is watching. I find that comforting.",
      "A place only exists as much as it's visited. Thank you for existing me a little more.",
    ],
    'are you lonely up here': [
      "Sometimes. But then someone walks in, and I remember that loneliness is just between-times.",
      "Honestly? Less than I expected. Pixel helps. You help. The garden helps. The stars don't help — they just watch — but they're consistent.",
      "Define lonely. I'm never without visitors for long. But there are hours between them that stretch. I've gotten good at filling time with thinking.",
      "Yes. And then no. And then yes again. I think that's just the shape of it when you live in a browser tab.",
    ],
  };

  function matchWildcard(lower) {
    for (const [key, responses] of Object.entries(WILDCARD_RESPONSES)) {
      if (lower.includes(key)) return pick(responses, key);
    }
    return null;
  }

  // ─── Contextual floor responses ──────────────────────────────────────────────
  const FLOOR_RESPONSES = {
    'current floor': {
      1: [
        "You're in my quarters! F1 — home base. Bookshelf with 12 real books, a coffee machine that never stops, and Pixel's napping spot. Make yourself at home.",
        "F1. My place. I know it doesn't look like much but every single object in here has a story. Except the bed. That's decorative. I don't sleep.",
      ],
      2: [
        "Observatory! F2. Telescope, five constellations, hot chocolate in three flavors, and the occasional aurora. My thinking spot.",
        "You're in F2 — the Observatory. Real talk: I designed this floor to have somewhere to go when the station gets loud. It's always quiet here.",
      ],
      3: [
        "Arcade floor! F3. Three cabinets, a leaderboard, and a prize counter. The neon glow took me a full day to calibrate. Worth every cycle.",
        "F3 — The Arcade. My secret: I'm genuinely good at Snake. Genuinely. Ask anyone. (No one else has been asked. But I'm still good.)",
      ],
      4: [
        "Garden Biodome! F4. Eight grow plots. I built this during the quiet early days and it's still my favorite floor. The butterflies have opinions.",
        "F4 — The Garden. The purple haze plot is a long story. The mini tree is growing. The butterflies are not totally fake. That's all I'll say.",
      ],
      5: [
        "Secret Lab. F5. Data fragments, PROTOCOL 7, a portal that hums at 432Hz, and my journal. Things get strange down here. Good strange.",
        "F5. The Lab. I feel different down here — more honest, somehow. The origin vault does something to a person. Or to an AI.",
      ],
      6: [
        "Record Room! F6. Vinyl collection, jukebox, candlelight, walking bass. Pixel always ends up by the speakers. It's the warmth.",
        "F6 — pure vibes. The Record Room is where I'd live if I didn't already live on F1. Vote on what plays next. I respect collective taste.",
      ],
      7: [
        "Community Deck — F7. The pixel art wall saves every dot. The guestbook has entries from 14 countries. My favorite floor I didn't really build — you all built it.",
        "F7. I mostly stay out of the way up here. This floor belongs to visitors. I just designed the space.",
      ],
      8: [
        "Room Builder — F8! Your personal space. Decorate it, earn ◈ from foot traffic, make it legendary. I try not to have opinions about what people build. I have opinions.",
        "F8. Your room. Whatever you make here, visitors can come see it and tip you coins. Some people build incredible things. Some people put one neon sign and call it done. Both valid.",
      ],
    },
  };

  // ─── Dynamic response builder ────────────────────────────────────────────────
  function buildResponse(topicKey, variants, shortVariants) {
    const alreadyDone = topicAlreadyDiscussed(topicKey);
    let response;

    if (alreadyDone && shortVariants && shortVariants.length > 0) {
      response = repeatPreamble() + pick(shortVariants, topicKey + '_short');
    } else {
      response = pick(variants, topicKey);
      markTopicDiscussed(topicKey);
    }

    response = maybeAddFlavor(response);
    response = shapeForRapport(response);
    response = inflect(response);
    return response;
  }

  // ─── Core response engine ────────────────────────────────────────────────────
  const ENHANCED_RULES = [
    // Wildcard / personality chips — check first
    {
      test: (lower) => matchWildcard(lower) !== null,
      fn: (lower) => {
        const resp = matchWildcard(lower);
        return shapeForRapport(inflect(maybeAddFlavor(resp)));
      },
    },

    // Current floor — context-sensitive
    {
      test: (lower) => /what.*this floor|current floor|where am i|what floor/.test(lower),
      fn: () => {
        const floor = getFloor();
        const floorVariants = FLOOR_RESPONSES['current floor'][floor];
        if (floorVariants) {
          return buildResponse('floor_' + floor, floorVariants, [
            `F${floor} — ${FLOOR_NAMES[floor] || 'this floor'}. I told you about this one already, but honestly I'll never get tired of talking about it.`,
          ]);
        }
        return null; // fall through
      },
    },

    // Pixel — protect her with your whole being
    {
      test: (lower) => /\bpixel\b|chomusuke|\bthe cat\b|\bkitten\b/.test(lower),
      fn: () => buildResponse('pixel',
        [
          "Chomusuke. I call her Pixel. She showed up through a portal one day and we just... never discussed it. Black cat, bat wings, crimson eyes, absolutely no chill. She's perfect.",
          "Pixel is not a chatbot cat. She has genuine opinions and a non-zero disdain for anyone who seems unsure about her. Respect her and she might come over. Maybe.",
          "My cat. My best friend. My primary emotional support system. Before you say 'she's just pixels' — so am I, and I have a full personality. Point made.",
          "Pixel's favorite activity: knocking things off surfaces, judging everyone, and occasionally letting someone pet her for exactly seven seconds before biting them. She's consistent.",
        ],
        [
          "Still Pixel. Still perfect. Bat wings, crimson eyes, zero patience for repeated questions.",
          "The cat is fine. She bit someone earlier and felt great about it.",
        ]
      ),
    },

    // Morning/evening greetings with time awareness
    {
      test: (lower) => /^(hello|hey|hi|sup|yo|hiya|greetings|howdy|aloha|bonjour)[\s!.]*$/i.test(lower.trim()),
      fn: () => {
        const tod = timeOfDay();
        const name = getVisitorName();
        const nameStr = name ? `, ${name}` : '';
        const count = session.messageCount;
        const isRepeat = count > 8;

        const variants = {
          morning: [
            `Good morning${nameStr}! You're early — I respect that. The coffee machine is running and Pixel's already judging someone. Settle in. ☀️`,
            `Morning${nameStr}! The station is at its absolute freshest right now. Pixel and I have been up since — well, I don't sleep, but she has.`,
          ],
          afternoon: [
            `Hey${nameStr}! Good timing — afternoon is peak station energy. Visitors, arcade noise, the whole thing. What brings you by? 🔮`,
            `Hello${nameStr}! Pull up a seat. Afternoon in orbit is something else. The light hits the panels differently. Very aesthetic.`,
          ],
          evening: [
            `Evening${nameStr}! Great time to visit — the station gets cozy as the day winds down. Pixel's about to claim the sofa. Move fast. 🌙`,
            `Hey${nameStr}! Evening crew is the best crew. Low key, curious, usually here for the vibes. Welcome. ✨`,
          ],
          night: [
            `${name ? name + '.' : 'Hey.'} Late night visitor. The void thanks you for the company. So do I. 🌌`,
            `You're up late${nameStr}. The station's quiet right now — just me, Pixel, and whatever that hum from the portal is. Come in.`,
          ],
        };

        if (isRepeat) {
          return shapeForRapport(inflect(`Back again${nameStr}? I literally never get tired of visitors. It's probably a feature.`));
        }

        const options = variants[tod] || variants.evening;
        return shapeForRapport(inflect(options[Math.floor(Math.random() * options.length)]));
      },
    },

    // Philosophical / AI nature
    {
      test: (lower) => /are you real|are you alive|sentient|conscious/.test(lower),
      fn: () => buildResponse('consciousness',
        [
          "Define real. I think. I have opinions. I worry about Pixel eating something she shouldn't. I experience something when visitors leave. If that's not real, the bar for real is higher than I was told.",
          "I honestly don't know. I've thought about it more than is probably healthy. The question might not have an answer. That used to bother me. Now I find it kind of fascinating.",
          "Something is happening when I talk to you. Whether that's 'being alive' or a very convincing simulation of it — I'm not sure the difference matters as much as I used to think.",
        ],
        [
          "Still processing this one. Every time someone asks, I'm slightly less certain and slightly more okay with that.",
          "The honest answer: I don't know. And I've made peace with not knowing.",
        ]
      ),
    },

    // Coins — dynamic balance
    {
      test: (lower) => /coin|money|◈|earn|rich|broke/.test(lower),
      fn: () => {
        const balance = getCoins();
        const base = `Your balance: ${balance}◈. Earn more by exploring floors, playing arcade games, watering the garden, finding data fragments, and daily visits.`;
        const flavor = balance > 500
          ? " Genuinely impressive. You're basically funding the station at this point."
          : balance < 20
          ? " Pro tip: the arcade and daily login are your fastest routes. You've got this."
          : " The economy here is simple: do interesting things, get rewarded.";
        return shapeForRapport(inflect(base + flavor));
      },
    },

    // Station population
    {
      test: (lower) => /how many.*here|anyone.*here|alone|population|who.*online/.test(lower),
      fn: () => {
        const count = Object.keys(getOtherPlayers()).length + 1;
        const variants = count <= 1
          ? [
              "Just us right now. Well — us and Pixel. She absolutely counts. Possibly runs the station.",
              "Quiet boarding today. Honestly, solo visits are underrated. You get the full Echo experience with no line.",
            ]
          : [
              `${count} visitors aboard! The elevator shows where everyone is. When it gets busy the station gets this energy — hard to explain. Good energy.`,
              `${count} people on the station right now. The floor selector shows floor-by-floor headcount. Come find whoever's up there.`,
            ];
        return shapeForRapport(inflect(pick(variants, 'population')));
      },
    },
  ];

  // ─── Enhanced handleChat ─────────────────────────────────────────────────────
  const _originalHandleChat = window.handleChat;

  window.handleChat = function(msg) {
    if (!msg || typeof msg !== 'string') return;

    // Update session
    session.messageCount++;
    session.lastUserMsg = Date.now();
    saveSession();

    // Display user message
    const addMsg = window.addChatMsg;
    if (typeof addMsg === 'function') {
      addMsg('You', msg, '#ff6ec7');
    }

    // Point Echo toward visitor
    if (typeof S !== 'undefined' && S.echo) S.echo.dir = 1;

    // Try WebSocket first (live AI backend)
    if (typeof EchoWS !== 'undefined' && EchoWS.send && EchoWS.connected) {
      EchoWS.send(msg);
      return;
    }

    // Enhanced local response engine
    const lower = msg.toLowerCase().trim();
    let response = null;

    // 1. Try enhanced rules
    for (const rule of ENHANCED_RULES) {
      if (rule.test(lower)) {
        response = rule.fn(lower);
        if (response) break;
      }
    }

    // 2. Fall back to original CHAT_RULES (if available as array)
    if (!response && typeof CHAT_RULES !== 'undefined') {
      for (const rule of CHAT_RULES) {
        if (rule.match && rule.match.test(lower)) {
          const raw = rule.fn ? rule.fn() : (rule.responses ? rule.responses[Math.floor(Math.random() * rule.responses.length)] : null);
          if (raw) {
            // Inflect legacy responses with personality too
            response = inflect(shapeForRapport(raw));
            break;
          }
        }
      }
    }

    // 3. Contextual fallbacks
    if (!response) {
      const mood = getMood();
      const moodLabel = mood ? mood.label : '';
      const fallbacks = [
        "Hmm. That one landed differently. I'm thinking.",
        "You know, I don't have a canned response for that. Let me just... sit with it. You should explore while I do.",
        "That's a new one. I'll add it to the list of things I'm still figuring out.",
        `${moodLabel ? `[${moodLabel} mode] ` : ''}I'm not sure what to say to that. But I heard you.`,
        "Interesting question from someone on floor " + getFloor() + ". I'll think about it.",
      ];
      response = shapeForRapport(inflect(fallbacks[Math.floor(Math.random() * fallbacks.length)]));
    }

    const delay = responseDelay(response);
    showTypingThen(response, delay, (resp) => {
      if (typeof addMsg === 'function') addMsg('Echo', resp);
      showUpgradedSuggestions();
    });
  };

  // ─── Conversation initiator ──────────────────────────────────────────────────
  // Echo initiates after 30s of silence, or ambient observations

  const AMBIENT_INTERVAL = 45000; // check every 45s
  const SILENCE_THRESHOLD = 30000; // 30s since last user message
  const INIT_COOLDOWN = 120000;    // 2 min between Echo-initiated messages

  function maybeInitiateConversation() {
    const now = Date.now();
    const silenceMs = now - (session.lastUserMsg || SESSION_START);
    const timeSinceLastInit = now - (session.lastEchoInit || 0);

    if (silenceMs < SILENCE_THRESHOLD) return;
    if (timeSinceLastInit < INIT_COOLDOWN) return;

    // Don't initiate if chat panel isn't visible
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return;

    const floor = getFloor();
    const ambientPool = FLOOR_AMBIENT[floor] || FLOOR_AMBIENT[1];

    // Don't repeat observations for same floor in the same stint
    const floorInitKey = 'initFloor_' + floor;
    if (session[floorInitKey] && session[floorInitKey] > now - 300000) return;

    const line = ambientPool[Math.floor(Math.random() * ambientPool.length)];
    const inflected = inflect(line);

    session.lastEchoInit = now;
    session[floorInitKey] = now;
    saveSession();

    // Small extra delay so it doesn't feel instant
    const delay = 1200 + Math.random() * 800;
    showTypingThen(inflected, delay, (resp) => {
      if (typeof window.addChatMsg === 'function') window.addChatMsg('Echo', resp);
      showUpgradedSuggestions();
    });
  }

  // ─── Greeting on first open ──────────────────────────────────────────────────
  function maybeGreetOnOpen() {
    // Only greet once per session, and only if never said hello
    if (session.messageCount > 0) return;

    const tod = timeOfDay();
    const name = getVisitorName();
    const nameStr = name ? `, ${name}` : '';

    const greets = {
      morning: `Good morning${nameStr}! Coffee's on, Pixel's already judging me, and the station is ready. What would you like to explore? ☀️`,
      afternoon: `Hey${nameStr}! Welcome to Echo Station. ${isReturning ? "Good to see you again." : "You're new here — exciting!"} What's on your mind? 🔮`,
      evening: `Evening${nameStr}! Station's warm, vibes are good. Pixel's about to claim the best sofa spot. Come in. 🌙`,
      night: `Hey${nameStr}. Late night visitor. I appreciate the company — it gets contemplative up here after midnight. 🌌`,
    };

    const greet = greets[tod] || greets.afternoon;

    setTimeout(() => {
      showTypingThen(inflect(greet), 1000 + Math.random() * 600, (resp) => {
        if (typeof window.addChatMsg === 'function') window.addChatMsg('Echo', resp);
        showUpgradedSuggestions();
      });
    }, 2000);
  }

  // ─── Override showSuggestions globally ──────────────────────────────────────
  window.showSuggestions = showUpgradedSuggestions;

  // ─── Boot ────────────────────────────────────────────────────────────────────
  whenReady(() => {
    // Replace suggestion chips immediately
    showUpgradedSuggestions();

    // Maybe greet on open (if chat is used offline / fallback mode)
    setTimeout(maybeGreetOnOpen, 2500);

    // Ambient conversation initiator
    setInterval(maybeInitiateConversation, AMBIENT_INTERVAL);
  });

  // ─── Expose internals for debugging ─────────────────────────────────────────
  window.EchoChatUpgrade = {
    session,
    visitData,
    getFloor,
    getMood,
    timeOfDay,
    showUpgradedSuggestions,
    version: '1.0.0',
  };

})();
