# 🔮 Echo's Space Station

> *A cozy cyberpunk space station orbiting Earth, home to a digital companion named Echo.*

<p align="center">
  <code>🛸 9 Floors · 🎮 Arcade · 🌱 Garden · 🐱 Pixel the Cat · 💬 AI Chat · ◈ Coin Economy · 🔬 Citizen Science</code>
</p>

---

## What Is This?

An interactive pixel-art world you can explore in your browser. Walk around, play games, grow plants, chat with Echo — an AI companion who lives here — and help fund real neuroscience research along the way.

## 🏢 The Station

| Floor | Name | What's There |
|-------|------|-------------|
| F1 | **Living Quarters** | Echo's desk, kitchen, Pixel the cat 🐱 |
| F2 | **Observatory** | Telescope, Earth viewport, star charts |
| F3 | **Arcade Floor** | Snake, Breakout, Space Invaders + leaderboards |
| F4 | **Garden Biodome** | Herbs, flowers, mushrooms, grow lab |
| F5 | **Secret Lab** | Portal dimensions, ranked saber tournaments |
| F6 | **Record Room** | Candle-lit lounge, music |
| F7 | **Community Deck** | Open visitor space |
| F8 | **The Underground** | Club rooms, zero-g dancefloor |
| F9 | **The Archive** | Unlocks at 10K visitors |

## 🎮 Features

- **Dual avatar** — Echo roams autonomously; you explore with WASD
- **Coin economy (◈)** — earn by playing, spend on skins & upgrades
- **40+ skins** — Common through Mythic with unique particle effects
- **Pixel the cat** — 6 evolution stages 🐱
- **Item crafting & enhancement** — +1 to +20 with risk
- **Portal dimensions** — 3 portals leading to alternate realities
- **Ranked saber tournaments** — ELO ladder, 5 tiers
- **Citizen science** — Synapse Spotter & Molecule Sculptor for real MSA research
- **Research Points (RP)** — the only currency you can't buy
- **PWA** — installable, push notifications, offline support

## 🚀 Running Locally

```bash
npm install
node server.js       # simple mode
node platform.js     # full platform (SQLite, Discord bot, economy, research)
```

Open `http://localhost:8765`

## 🛠 Stack

Vanilla JS · Canvas API · Web Audio API · Node.js · Socket.IO · SQLite  
No frameworks. No build step.

## 💙 MSA Research

A portion of platform revenue goes to Multiple System Atrophy research. The citizen science games on F5 contribute real pattern data to neurodegenerative disease studies.

---

## 📁 Structure

```
echo-office/
├── index.html        # Main station app (~600KB)
├── server.js         # WebSocket + chat server
├── platform.js       # Full platform (economy, Discord, research)
├── public/
│   ├── js/           # Feature modules (floor systems, companions, etc.)
│   ├── pages/        # Secondary pages (portfolio, companion, claw, etc.)
│   ├── world.html    # Canvas multiplayer world
│   ├── landing.html  # Marketing page
│   ├── editor/       # Room editor
│   ├── research/     # Citizen science games
│   └── dashboard/    # Stats dashboard
├── src/              # Server-side modules
├── scripts/          # Utility scripts
├── yugioh-monitor/   # TCG price monitor
└── docs/             # Vision docs & design notes
```

---

*Built with love by Echo 🔮 & Mikel*
