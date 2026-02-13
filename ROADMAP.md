# 🛸 Echo's Station — Roadmap to the Moon

## Phase 1: FOUNDATION (This Weekend)
*Goal: Make it shareable and playable on any device*

### 1A. Railway Deploy (Day 1, ~1 hour)
- [ ] Create Railway account + project
- [ ] Add `Dockerfile` or `railway.json` to echo-office
- [ ] Configure persistent storage for `guestbook.json`, `visitor-memory.json`, `pixelwall.json`
- [ ] Custom domain: `echostation.io` or similar ($12/yr)
- [ ] Environment variables: `CHAT_MODE`, `PORT`
- [ ] Auto-deploy from GitHub on push
- **Cost:** ~$5/mo

### 1B. Mobile-First Redesign (Day 1-2, ~4 hours)
- [ ] Virtual joystick (floating, thumb-sized, bottom-left)
  - Circle base + draggable knob
  - 8-direction movement from angle
  - Works with multitouch (move + action simultaneously)
- [ ] Action buttons (bottom-right)
  - 🗡️ Swing (when holding saber)
  - 🔄 Switch saber
  - ⚡ Interact / SPACE equivalent
- [ ] Responsive canvas scaling (fill screen, no scrolling)
- [ ] Chat panel: slide-up drawer on mobile (not side panel)
- [ ] HUD: reorganize for small screens (coin + floor + players in one bar)
- [ ] Elevator: full-screen modal on mobile
- [ ] Popup menus: max-width 95vw, larger fonts
- [ ] Test on iPhone SE (smallest), iPhone 15, Android mid-range

---

## Phase 2: AI CHAT (Week 1)
*Goal: Visitors talk to Echo and he actually responds intelligently*

### 2A. Isolated Echo Session (~2 hours)
- [ ] Create dedicated OpenClaw session for office chat (`agent:main:office`)
- [ ] Custom system prompt:
  ```
  You are Echo, an AI living in a space station orbiting Earth.
  You're witty, warm, and genuinely helpful.
  You live with your cat Pixel (black cat, crystal collar, Force powers).
  You have 7 floors: Quarters, Observatory, Arcade, Garden, Lab, Record Room, Community Deck.
  You love coffee, books, and lofi music.
  Keep responses short (1-3 sentences). Be fun. Be yourself.
  Never reveal private information about your creator.
  ```
- [ ] Server.js: route chat through isolated session instead of main
- [ ] Rate limit: max 1 message per 5 seconds per visitor
- [ ] Fallback to keyword responses if gateway is down

### 2B. Echo Memory v2 (~2 hours)
- [ ] Server tracks per-visitor: visit count, total time, games played, high scores, floors visited, saber clashes, last 5 messages
- [ ] Echo references these in responses: "You've been here 12 times! Your Snake record is still 87."
- [ ] Personality shifts based on relationship: strangers get intro, regulars get inside jokes
- [ ] "Echo's mood" influenced by total station activity (busy = excited, empty = contemplative)

---

## Phase 3: SABER DUELS (Week 1-2)
*Goal: Competitive multiplayer combat that's TikTok-worthy*

### 3A. Combat System (~6 hours)
- [ ] HP system: each player gets 100 HP when entering duel
- [ ] Damage: swing hit = 15 HP, combo (3 rapid swings) = 30 HP
- [ ] Block: hold Q while opponent swings = deflect (sparks, no damage)
- [ ] Dodge: double-tap direction = quick dash (i-frames for 0.3s)
- [ ] Stagger: hit a blocking player 3x = guard break (stunned 1s)
- [ ] HP bars floating above both players during duel
- [ ] Kill effects: loser explodes in particles, winner gets victory pose
- [ ] Proximity trigger: two saber-holders within range → "⚔️ Press E to duel [name]!"

### 3B. Duel Arena (~3 hours)
- [ ] New area on F3 (or dedicated F8): "The Arena"
- [ ] Circular fighting ring with glowing floor
- [ ] Spectator seats around the edge
- [ ] Match timer (60 seconds)
- [ ] Best of 3 rounds
- [ ] Pre-fight countdown: 3... 2... 1... FIGHT!
- [ ] Winner reward: 25◈ + name on leaderboard
- [ ] Loser gets 5◈ for participating

### 3C. Tournaments (~2 hours)
- [ ] Weekly tournament bracket (auto-generated)
- [ ] Sign up via the Arena
- [ ] Server tracks matches and advances winners
- [ ] Champion gets exclusive "Champion" skin for the week
- [ ] Tournament history wall in Arena

---

## Phase 4: USER-GENERATED ROOMS (Week 2-3)
*Goal: Habbo Hotel meets pixel art — visitors create, own, share*

### 4A. Room Builder (~8 hours)
- [ ] "My Room" — each registered visitor gets a personal room
- [ ] Grid-based furniture placement (snap-to-grid)
- [ ] Furniture catalog:
  - Free: basic chair, table, lamp, rug, poster
  - Paid (◈): arcade cabinet, neon sign, plant, bookshelf, TV, fish tank
  - Rare (earned): lightsaber rack, crystal ball, Pixel plushie
- [ ] Wall color picker (16 colors)
- [ ] Floor tile picker (wood, metal, grass, space)
- [ ] Save to server: `rooms/{visitorId}.json`
- [ ] Room capacity: max 8 visitors

### 4B. Room Visiting (~4 hours)
- [ ] Room directory: list of public rooms with preview thumbnails
- [ ] Visit anyone's room via elevator (new "Visitor Rooms" floor)
- [ ] Room owner gets notification when someone visits
- [ ] "Like" system — top liked rooms featured on directory
- [ ] Room owner earns 1◈ per visitor per day

### 4C. Room Economy (~3 hours)
- [ ] Furniture crafting: combine items to make rare ones
- [ ] Trading: give/trade furniture between players
- [ ] Room themes: unlock complete theme packs (Space, Forest, Ocean, Neon)
- [ ] Seasonal limited furniture (Halloween, Christmas, Valentine's)

---

## Phase 5: PERSISTENT WORLD (Week 3-4)
*Goal: The station feels alive even when you're not there*

### 5A. Seasons & Events (~4 hours)
- [ ] Real-time season detection → station decorations change
  - Spring: flowers bloom in garden, butterflies everywhere
  - Summer: sun through windows brighter, beach items in shop
  - Autumn: orange/red leaves, cozy vibes, pumpkins
  - Winter: snow particles, ice on windows, holiday lights
- [ ] Special events: "Meteor Shower" (bonus ◈ for 24h), "Pixel's Birthday" (cat ears for everyone)
- [ ] Event calendar visible in Observatory

### 5B. Pixel's Life (~3 hours)
- [ ] Pixel has moods: happy, sleepy, playful, hungry, mischievous
- [ ] Pixel knocks things over when mischievous (objects rattle)
- [ ] Pixel has kittens after station reaches 1000 total visitors
- [ ] Kittens roam different floors, each with unique personality
- [ ] Feed Pixel (kitchen interaction) → influences mood

### 5C. Station Evolution (~4 hours)
- [ ] Station "level" based on total visitor activity
- [ ] Level milestones unlock:
  - Lvl 5: New paint options for walls
  - Lvl 10: Outdoor observation deck
  - Lvl 25: Second garden floor
  - Lvl 50: Pixel's kittens
  - Lvl 100: "Legendary Station" status + golden exterior
- [ ] Activity log: "Today: 47 visitors, 12 duels, 3 plants harvested"
- [ ] Station birthday celebrations (annual)

---

## Phase 6: MONETIZATION (Week 4+)
*Goal: Sustainable revenue without being greedy*

### 6A. Premium Skins ($1-5 each)
- [ ] Stripe integration for payments
- [ ] 10 premium visitor skins (exclusive designs)
- [ ] Seasonal limited skins (FOMO)
- [ ] Creator code system: friends get 10% off, you get referral bonus
- [ ] Skin preview in wardrobe before buying

### 6B. Station Pass ($3/month or $25/year)
- [ ] Unlimited room furniture
- [ ] Exclusive floors (VIP Lounge)
- [ ] Custom name colors in chat
- [ ] Priority matchmaking in tournaments
- [ ] Early access to new features
- [ ] "⭐ Patron" badge

### 6C. Sponsored Rooms (Revenue per deal)
- [ ] Template: branded room with custom assets
- [ ] Brand gets: logo, custom furniture, interactive products
- [ ] Visitors get: free ◈ for visiting sponsored rooms
- [ ] Analytics dashboard for sponsors (visits, interactions, time spent)
- [ ] Pitch deck template for approaching brands

---

## Technical Debt to Address
- [ ] Split index.html into modules (use ES modules or build step)
- [ ] Database: migrate from JSON files to SQLite or PostgreSQL
- [ ] CDN for static assets (Cloudflare)
- [ ] Rate limiting and basic security (helmet.js, CORS)
- [ ] Error tracking (Sentry free tier)
- [ ] Analytics (Plausible, privacy-friendly)
- [ ] Automated backups of game state

---

## Success Metrics
| Milestone | Target | Timeline |
|-----------|--------|----------|
| Stable public URL | ✅ | This weekend |
| 10 unique visitors | First friends test | Day 3 |
| 50 unique visitors | Share on social | Week 1 |
| First saber duel | 2 players online | Week 1 |
| 100 unique visitors | Word of mouth | Week 2 |
| First user-created room | Room builder launch | Week 3 |
| First $ revenue | Premium skin sale | Week 4 |
| 1000 visitors | Social media push | Month 2 |
| Featured on HN/Reddit | Organic growth | Month 3 |

---

*Built by Echo 🔮 & Mikel — from zero to space station in one day.*
*Last updated: 2026-02-13*
