# PLATFORM-VISION.md — Echo Worlds

> *What if every community had a place — not a chat, a place — where people walk, talk, play, and solve real problems together?*

---

## The Big Idea

Echo Office started as one room in a space station. It's becoming **a platform where any community can have a living, breathing pixel world** — connected to their Discord, powered by real-time voice and text, with game mechanics that are fun AND meaningful.

**Echo Worlds** is:
- A **visual social layer** on top of Discord
- A **creator platform** where streamers and communities build their own worlds
- A **citizen science engine** where playing games contributes to curing diseases
- All wrapped in pixel art that makes people smile

---

## Part 1: Discord-Integrated Social Rooms

### Every Channel = A Room

When a Discord server connects Echo Worlds, each channel becomes a visual room:

| Discord Channel | Echo Room |
|---|---|
| `#general` | Central Plaza — open space, benches, notice board |
| `#gaming` | Arcade Floor — playable cabinets, leaderboards |
| `#music` | Listening Lounge — stage, visualizer, shared queue |
| `#art` | Gallery — user-submitted pixel art walls |
| `#voice-chat` | Campfire / Hangout — proximity voice, cozy vibes |
| `#announcements` | Town Hall — podium, read-only display |

### How It Works

1. **Discord Bot** reads channel list → generates room layout
2. **Players** click a link or use `/enter` command → browser opens their world
3. **Messages sync both ways** — type in Discord or type in the room
4. **Voice channels** map to rooms with spatial/proximity audio (WebRTC)
5. **Roles** map to skins, badges, and room access permissions

### Real-Time Presence

- See other members as pixel avatars walking around
- Click an avatar → see their profile, skin, collection
- Watch someone walk from `#general` to `#music` in real-time
- "Follow" a friend to walk with them
- Emote/react in-world (wave, dance, applaud)

### Voice (The Killer Feature)

- **Proximity voice**: walk near someone → hear them, walk away → fade out
- **Room voice**: enter a room → join its voice channel automatically
- **Stage mode**: one person speaks, others listen (for announcements/performances)
- **Push-to-talk** or always-on toggle
- Built on WebRTC peer-to-peer — minimal server costs

---

## Part 2: Creator & Streamer Economy

### Why Creators Want This

Every streamer has a Discord. None of them have a **world**. We give them one.

> "Come hang out in my room" hits different than "join my server"

### Creator Rooms

- **Custom themed space** — the creator designs their room (or picks a template)
- **Live camera feed** on an in-world TV screen during streams
- **Chat syncs** between Twitch/YouTube chat and the room
- **Viewers walk around** as avatars while watching
- Creator earns from everything happening in their room

### Creator Revenue Streams

| Source | How It Works | Creator Cut |
|---|---|---|
| Custom skins | Creator-designed skins sold in their room | 70% |
| Room entry | VIP/subscriber-only rooms | 80% |
| Tips | Visitors tip the creator (coin drops with animation) | 85% |
| Bazaar stalls | Sell items in their room's marketplace | 75% |
| Event tickets | Special events, watch parties, tournaments | 70% |

### The Flywheel

```
Creator builds room → Shows it on stream → Viewers join
    → Viewers buy skins, explore → Creator earns
        → Creator tells other creators → More worlds
            → More players → Bigger economy → Repeat
```

### Streamer-Specific Features

- **Raid = Physical invasion**: your community walks INTO another creator's room
- **Sub-only zones**: exclusive VIP areas with special decor
- **Drop events**: limited skins for viewers who were present during a stream
- **Collab rooms**: two creators merge their rooms for a special event
- **Leaderboards**: top supporters get statues/plaques in the room

---

## Part 3: Citizen Science — Curing Disease Through Play

### The Mission

**Multiple System Atrophy (MSA)** and related neurodegenerative diseases (Parkinson's, Lewy Body Dementia) are caused by **alpha-synuclein protein misfolding**. The protein clumps into toxic aggregates that destroy neurons.

Finding drugs that prevent this misfolding — or reverse it — requires massive computational and pattern-recognition work. Humans are better than computers at certain spatial reasoning tasks. **Games can harness that.**

### Precedents (This Is Proven)

| Game | What Players Did | Impact |
|---|---|---|
| **Foldit** | Solved protein structures as puzzles | Solved HIV enzyme structure in 10 days (scientists failed for 15 years) |
| **EVE Online Project Discovery** | Classified real biomedical data | 300K players, multiple published papers |
| **Sea Hero Quest** | Navigated a boat game | 4.3M players generated dementia data = 12,000 years of lab research |
| **Eterna** | Designed RNA molecules | Player designs synthesized in real labs |
| **Stall Catchers** | Identified blocked blood vessels | Accelerated Alzheimer's research by 10x |

### How It Works in Echo Worlds

#### The Research Lab (Dedicated Floor/Dimension)

A special floor in every Echo World: **The Lab**. Styled as a gleaming research facility with holographic displays, specimen jars, and a big "CONTRIBUTIONS" counter showing global impact.

#### Game Mechanics That Generate Real Data

**1. Molecule Sculptor (Protein Folding Puzzle)**
- Players manipulate 3D protein structures to find stable configurations
- Styled as a crafting minigame — "sculpt" the molecule into shape
- Each solution = a potential drug binding configuration
- Data feeds to computational biology pipelines
- Partnership: university research labs working on alpha-synuclein

**2. Synapse Spotter (Pattern Recognition)**
- Players examine stylized brain scan images
- Identify healthy vs damaged neural pathways
- Gamified: spot-the-difference with beautiful medical imagery
- Trains ML models for automated diagnosis
- Partnership: hospital imaging departments (Charité Berlin)

**3. Compound Crafter (Drug Design)**
- Players combine molecular building blocks
- The game evaluates binding affinity, toxicity, stability
- Best designs get computationally tested against real targets
- Top contributors see their compounds enter real screening pipelines
- Partnership: pharma companies, biotech startups

**4. Data Tagger (Classification)**
- Tag/classify research data as a micro-task between other activities
- "While you wait for the elevator, help classify 3 cell images"
- Quick, satisfying, high volume
- Partnership: any research institution with classification backlogs

#### Motivation & Rewards

Players earn **Research Points (RP)** — a separate currency that can't be bought.

| Contribution | Reward |
|---|---|
| Complete a puzzle | RP + "Researcher" title progression |
| Top weekly contributor | Exclusive "Lab Coat" skin (animated, white coat with glowing vials) |
| 100 puzzles solved | "Neural Pioneer" badge on profile |
| 1000 puzzles | "Healer" aura effect on avatar |
| Top all-time | Name on the "Wall of Heroes" (permanent, in every world) |
| Breakthrough contribution | Real acknowledgment in published research paper |

**Key principle: Research Points cannot be bought.** They represent genuine contribution. This makes them the most prestigious currency in the game.

#### Impact Dashboard

Every world has a live dashboard:
- **Global counter**: "Together we've analyzed 2.4M protein configurations"
- **Breakthrough alerts**: "A player-designed compound entered lab testing!"
- **Your contribution**: personal stats, rank, impact visualization
- **Research updates**: what scientists are doing with the data (monthly blog/video)

### Research Partnerships

**Phase 1 — Local (Berlin)**
- Charité Berlin — largest university hospital in Europe, active MSA/Parkinson's research
- Max Planck Institute for Molecular Genetics
- Helmholtz Centre for neurodegenerative disease research (DZNE)
- Free University Berlin computational biology department

**Phase 2 — Global**
- The MSA Coalition (US-based, leading MSA research funding)
- Michael J. Fox Foundation (Parkinson's, alpha-synuclein focus)
- Citizen Science Alliance (infrastructure for distributing research tasks)
- OpenFold / AlphaFold teams (protein structure prediction)

**Phase 3 — Platform**
- Open API for any research institution to submit tasks
- Peer review system for task quality
- Standardized data formats for research output
- Annual "Echo Research Summit" — virtual conference in-world

---

## Part 4: Technical Architecture

### Stack

```
┌─────────────────────────────────────────┐
│              Echo Worlds Client          │
│     (Browser, HTML5 Canvas, WebRTC)      │
├─────────────────────────────────────────┤
│            Socket.IO Server              │
│   (Presence, Chat, Room State, Sync)     │
├──────────┬──────────┬───────────────────┤
│ Discord  │ WebRTC   │  Research API     │
│  Bot     │ Signaling│  (Task Queue)     │
├──────────┴──────────┴───────────────────┤
│         PostgreSQL / Redis               │
│  (Users, Rooms, Economy, Research Data)  │
├─────────────────────────────────────────┤
│              Railway / Fly.io            │
│          (Scalable Deployment)           │
└─────────────────────────────────────────┘
```

### Key Components

1. **World Server** — Express + Socket.IO, handles presence, movement sync, chat relay
2. **Discord Bot** — Reads channels, syncs messages, handles OAuth, maps roles
3. **Voice Server** — WebRTC signaling server, STUN/TURN relay for NAT traversal
4. **Economy Service** — Coin transactions, marketplace, creator payouts
5. **Research Service** — Task distribution, result validation, data pipeline to researchers
6. **Room Editor** — Web-based tool for creators to design their rooms (tile placement, objects, themes)

### Scaling Strategy

- **Phase 1**: Single server, 100 concurrent users (Echo Office as demo)
- **Phase 2**: Sharded by Discord server, 1K concurrent per shard
- **Phase 3**: Distributed, 10K+ concurrent, CDN for static assets
- **Phase 4**: Edge compute for voice, global presence

---

## Part 5: Implementation Plan

### Sprint 0: Foundation (Week 1-2)
**Goal: Multiplayer presence in Echo Office**

- [ ] WebSocket server (Socket.IO) integrated into server.js
- [ ] Player state sync: position, floor, skin, direction
- [ ] Render other players' avatars in real-time
- [ ] Basic name labels above avatars
- [ ] "X players online" becomes real (not simulated)
- [ ] Simple chat overlay (global, visible on all floors)

**Deliverable**: Open Echo Office in two browsers → see each other walk around

### Sprint 1: Live Chat (Week 3-4)
**Goal: Text communication between players**

- [ ] Floor-specific chat channels
- [ ] Chat UI: compact, game-style (bottom of screen)
- [ ] Chat bubbles above avatars when speaking
- [ ] Emote system (/wave, /dance, /think) with avatar animations
- [ ] Basic moderation (mute, report)
- [ ] Message rate limiting

**Deliverable**: Two players can chat on the same floor, see speech bubbles

### Sprint 2: Voice (Week 5-7)
**Goal: Talk to people in the world**

- [ ] WebRTC peer-to-peer voice setup
- [ ] Signaling server for connection negotiation
- [ ] Push-to-talk (default) and always-on toggle
- [ ] Proximity-based volume (closer = louder)
- [ ] Visual indicator: avatar "speaking" animation
- [ ] TURN server for NAT traversal (fallback)
- [ ] Mute/deafen controls

**Deliverable**: Walk up to someone → hear them talk → walk away → fade out

### Sprint 3: Discord Integration (Week 8-10)
**Goal: Connect Discord servers to Echo Worlds**

- [ ] Discord bot: OAuth2, channel reading, role mapping
- [ ] Auto-generate rooms from channel list
- [ ] Two-way message bridge (Discord ↔ Room)
- [ ] Discord role → skin/badge mapping
- [ ] `/enter` command in Discord → opens world in browser
- [ ] Server dashboard for Discord admins

**Deliverable**: A Discord server owner connects their server → rooms appear → members can enter

### Sprint 4: Room Editor (Week 11-13)
**Goal: Let creators customize their spaces**

- [ ] Web-based room editor (drag-drop tiles, objects, decorations)
- [ ] Theme system (space station, forest, cyberpunk, cozy, etc.)
- [ ] Custom object placement (furniture, screens, stages)
- [ ] Save/load room configs
- [ ] Preview mode before publishing
- [ ] Template gallery (pre-made room layouts)

**Deliverable**: Creator designs a room in the editor → publishes it → visitors can enter

### Sprint 5: Creator Economy (Week 14-16)
**Goal: Creators earn from their worlds**

- [ ] Creator accounts with payout tracking
- [ ] Custom skin upload pipeline (guidelines + review)
- [ ] Tip jar system (coin animation, sound effects)
- [ ] Room entry fees for VIP zones
- [ ] Creator dashboard (earnings, visitors, analytics)
- [ ] Stripe/crypto payout integration

**Deliverable**: Creator uploads a skin → visitor buys it → creator gets paid

### Sprint 6: Research Lab — Alpha (Week 17-20)
**Goal: First citizen science minigame**

- [ ] "The Lab" floor with research facility theme
- [ ] Synapse Spotter v1: classify pre-labeled sample images
- [ ] Research Points (RP) system, separate from coins
- [ ] Personal contribution tracker
- [ ] Global impact dashboard
- [ ] Research partner onboarding (initial contact with Charité/DZNE)
- [ ] Data pipeline: player classifications → research database
- [ ] Validation system: consensus (3+ players agree = confirmed classification)

**Deliverable**: Player enters The Lab → plays Synapse Spotter → sees their contribution count rise → data flows to researchers

### Sprint 7: Research Lab — Beta (Week 21-24)
**Goal: Protein folding puzzle + partnerships**

- [ ] Molecule Sculptor v1: simplified protein manipulation game
- [ ] Tutorial system (teach the science without overwhelming)
- [ ] Leaderboards for research contribution
- [ ] "Wall of Heroes" in every world
- [ ] Exclusive research-tier skins and badges
- [ ] Formal partnership agreements with 1-2 research institutions
- [ ] Monthly research update blog/video system

**Deliverable**: Multiple research games live, real data flowing to real researchers, first partnership signed

### Sprint 8: Scale & Polish (Week 25-30)
**Goal: Production-ready platform**

- [ ] Performance optimization (100+ players per room)
- [ ] Mobile web support (responsive, touch controls)
- [ ] Moderation tools (admin panel, auto-mod, reports)
- [ ] Onboarding flow for new players
- [ ] Onboarding flow for new Discord servers
- [ ] Landing page & marketing site
- [ ] Public API for research institutions
- [ ] Security audit

**Deliverable**: Platform ready for public launch

---

## Part 6: Revenue Model

### How Echo Worlds Makes Money

| Revenue Stream | Description | When |
|---|---|---|
| **Skin sales** | Platform takes 30% of creator skin sales | Sprint 5+ |
| **Premium rooms** | Advanced room features (bigger, more objects, custom music) | Sprint 4+ |
| **Server plans** | Discord servers get free basic world; premium for more rooms/features | Sprint 3+ |
| **Cosmetic shop** | Platform-exclusive skins, effects, emotes | Sprint 1+ |
| **Research grants** | Funding from research institutions for citizen science infrastructure | Sprint 6+ |
| **Sponsorships** | Pharma/biotech sponsors research floors for visibility | Sprint 7+ |
| **Events** | Ticketed events, conferences, concerts in-world | Sprint 8+ |

### Pricing Tiers (Discord Servers)

- **Free**: 1 world, 5 rooms, basic themes, 50 concurrent visitors
- **Pro** ($9/mo): Unlimited rooms, custom themes, 200 concurrent, creator tools
- **Enterprise** ($29/mo): Custom branding, API access, 1000 concurrent, priority support

### Skin Economy

- **Common** (free): basic skins, no effects
- **Rare** ($2-5): subtle idle animations, color variants
- **Epic** ($5-15): full animation sets, particle effects
- **Legendary** ($15-30): unique interactions, sound effects, trails
- **Mythic** ($30-50): transformative, changes room ambiance, one-of-a-kind

Creator-designed skins follow the same tiers. Platform reviews for quality.

---

## Part 7: Why This Wins

### vs Gather.town
- **Pixel art + personality** vs corporate meeting rooms
- **Discord-native** vs standalone platform nobody's in
- **Game mechanics** (economy, skins, quests) vs empty rooms
- **Citizen science** vs nothing meaningful
- **Free tier** vs $7/user/month

### vs Discord alone
- **Visual presence** vs text + circles
- **Spatial interaction** vs flat channels
- **Walk up to someone** vs scroll through messages
- **Watch together** vs separate screens

### vs Metaverse platforms
- **Browser-based** vs download-required
- **2D pixel art** vs uncanny valley 3D
- **Runs on anything** vs needs a GPU
- **Fun first** vs tech demo first

### The Moat

1. **Creator investment**: creators who build rooms don't leave (their revenue is there)
2. **Research contribution**: players who've contributed to curing disease don't leave (meaning)
3. **Social graph**: your friends are here, your community is here
4. **Cultural identity**: your avatar, your skins, your room — it's *yours*

---

## Part 8: The MSA Commitment

This isn't a marketing angle. This is personal.

Mikel's mother has MSA. There is no cure. Current treatments manage symptoms at best. The disease is rare (5 per 100,000) which means pharmaceutical companies have little financial incentive to pursue treatments.

**Echo Worlds commits to:**

1. **Dedicating platform resources** to MSA and synucleinopathy research
2. **Never charging for research participation** — The Lab is always free
3. **Open-sourcing the research data pipeline** so other games can contribute
4. **Donating 5% of platform revenue** to MSA research organizations
5. **Publishing annual transparency reports** on research contributions and impact

The goal isn't just to slow the disease. **The goal is to end it.**

Every player who enters The Lab is joining that mission. Every protein they fold, every scan they classify, every compound they design — it adds up. Millions of players doing small tasks create datasets that would take researchers decades to build alone.

If we build this right, the game that people play for fun on a Tuesday night might contain the data point that leads to a breakthrough.

That's worth building.

---

## Timeline Summary

| Phase | Timeline | Milestone |
|---|---|---|
| Foundation | Week 1-2 | See other players in Echo Office |
| Live Chat | Week 3-4 | Talk to each other (text) |
| Voice | Week 5-7 | Talk to each other (speech) |
| Discord | Week 8-10 | Any Discord server can create a world |
| Room Editor | Week 11-13 | Creators build custom rooms |
| Creator Economy | Week 14-16 | Creators earn money |
| Research Alpha | Week 17-20 | First citizen science game live |
| Research Beta | Week 21-24 | Multiple games, real partnerships |
| Launch | Week 25-30 | Public platform, ready to scale |

**Total: ~7 months from today to public launch with citizen science.**

---

*Echo Office was the prototype. Echo Worlds is the product. The Lab is the mission.*

*Let's build it.* 🔮
