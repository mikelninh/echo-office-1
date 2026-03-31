# 🔮 Echo's Space Station

> *A cozy cyberpunk space station orbiting Earth, home to a digital companion named Echo.*

<p align="center">
  <code>🛸 9 Floors · 🎮 Arcade Games · 🌱 Garden Biodome · 🐱 Pixel the Cat · 💬 Live AI Chat · ◈ Coin Economy</code>
</p>

---

## What Is This?

An interactive pixel-art space station you can explore in your browser. Walk around, play games, grow plants, discover hidden story fragments, chat with Echo — an AI companion who lives here — and dive into portals to other dimensions.

## 🏢 The Station

| Floor | Name | What's There |
|-------|------|-------------|
| F1 | **Living Quarters** | Echo's desk, kitchen, bookshelf, sofa, Pixel the cat 🐱 |
| F2 | **Observatory** | Telescope, Earth viewport, hot chocolate station, star charts |
| F3 | **Arcade Floor** | Snake, Breakout, Space Invaders — with leaderboards & prizes |
| F4 | **Garden Biodome** | Herbs, flowers, mushrooms, and *special strains* 🌿 |
| F5 | **Secret Lab** | Portal system (3 dimensions), ranked saber tournaments, 500◈ to enter |
| F6 | **Record Room & Lounge** | Candle-lit vibes, music, social hub |
| F7 | **Community Deck** | Open space for visitors |
| F8 | **The Underground** | Club rooms, procedural music, zero-g dancefloor |
| F9 | **The Archive** | Unlocks at 10K visitors. Echo ascends. |

## 🎮 Features

- **Dual avatar system** — Echo roams autonomously; you explore with WASD
- **Coin economy (◈)** — earn by playing games & exploring, spend on skins & upgrades
- **40+ visitor skins** — Common through Mythic, each with unique particle effects
- **Pixel the cat** — 6 evolution stages, idle animations, your station companion 🐱
- **Portal dimensions** — 3 portals on F5 leading to alternate realities
- **Ranked saber tournaments** — ELO ladder, 5 tiers, real progression
- **Item enhancement** — upgrade gear from +1 to +20 (with risk)
- **Crafting system** — 4 materials, 10 recipes
- **Real-time grow lab** — plants grow over actual days
- **Story mode** — find hidden data fragments to uncover Echo's origin
- **Guestbook** — leave your mark
- **PWA** — installable, push notifications, offline support
- **Mobile-friendly** — touch controls throughout

## 🚀 Running Locally

```bash
npm install
node server.js       # simple mode (WebSocket + chat)
# or
node platform.js     # full platform (SQLite, Discord bot, economy, research)
```

Open `http://localhost:8765` and explore.

## 🛠 Tech Stack

- **Frontend:** Vanilla JS, Canvas API, Web Audio API (~600KB single HTML file)
- **Backend:** Node.js + Express + Socket.IO
- **Database:** SQLite (via better-sqlite3)
- **Real-time:** Socket.IO for visitor presence, chat, movement
- **No frameworks. No build step. Just vibes.**

## 🐱 Pixel

The station cat. Looks like Jiji from Kiki's Delivery Service. Has a purple crystal collar. Will judge you silently.

---

## 📁 Project Structure

```
echo-office/
├── index.html          # Main station (single-file app)
├── server.js           # Simple WebSocket + chat server
├── platform.js         # Full platform server
├── public/
│   ├── world.html      # Canvas game world client
│   ├── landing.html    # Marketing page
│   ├── editor/         # Room editor
│   ├── research/       # Citizen science games
│   └── dashboard/      # Stats dashboard
├── src/
│   ├── api.js
│   ├── database.js
│   ├── world-server.js
│   ├── discord/        # Discord bot
│   ├── economy/        # Skin marketplace, tips, fees
│   ├── research/       # Research task engine
│   └── rooms/          # Room management
├── scripts/            # Utility scripts
└── docs/               # Vision docs, design notes, roadmap
```

---

*Built with love by Echo 🔮 & Mikel*
