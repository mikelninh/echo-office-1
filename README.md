# 🔮 Echo's Space Station — v27

> *A living pixel world orbiting Earth — home to Echo, Pixel the Cat, games, gardens, portals and experiments in meaningful play.*

[🚀 Open the live v27 demo](https://mikelninh.github.io/echo-office-1/) · [💻 View source](https://github.com/mikelninh/echo-office-1) · [🛠 Run the full platform locally](#-running-locally)

> **Public demo status:** the GitHub Pages version is a self-contained static portfolio experience with an interactive ring map and links to selected browser prototypes. Multiplayer, Socket.IO, persistent economy, Discord integration and server-backed AI state require the local Node.js platform.

---

## What is this?

Echo Station is a ring-shaped space station orbiting Earth. Instead of a normal website, the project imagines the internet as a place you can walk through:

> **The ring is the internet made physical. Portals are links. Sections are pages. Walking is browsing.**

It is both a creative world and an engineering laboratory for browser graphics, game loops, realtime systems, persistent economies, AI-companion experiments and creator-owned spaces.

## The 12 ring segments

| Segment | Purpose | Current state |
|---|---|---|
| 🔭 **Observatory** | Wonder, telescope, star map and zen mode | Prototype |
| 🌿 **Garden Biodome** | Growth, meditation and seasonal systems | Prototype |
| 🔬 **Secret Lab** | Portals, artifacts and research-game experiments | Playable concept |
| 🎵 **The Lounge** | Music, warmth and low-pressure social space | Vision |
| 🎨 **Community Deck** | Shared art, guestbook and creator expression | Prototype |
| 🏘️ **Neighborhood Hub** | Portals to plots, streets and other stations | Vision |
| 🪩 **The Underground** | Nightlife, events and movement | Vision |
| 💪 **The Gym** | Friendly practice, streaks and movement games | Vision |
| 🏠 **Echo's Quarters** | Home base, books, coffee and Pixel the Cat | Playable concept |
| 🌙 **Night Market** | Creator goods and transparent collecting | Vision |
| 🕹️ **Arcade** | Cabinets, prizes, tournaments and leaderboards | Prototype |
| 🎬 **Cinema** | Shared screenings and post-film conversation | Vision |

## What works on GitHub Pages

- Interactive v27 ring explorer
- Selected standalone visual and product prototypes
- Synapse Spotter research-game prototype
- Skin-gallery and room-editor experiments
- Architecture, visual-design and roadmap documentation

## What requires the Node server

- Socket.IO multiplayer and persistent chat
- SQLite-backed economy, inventories and progression
- Discord integration
- Persistent AI-companion state
- Realtime cinema and cross-player events

## Running locally

```bash
npm install
node server.js       # simple mode
node platform.js     # full platform: SQLite, Discord, economy, research prototypes
```

Open `http://localhost:8765`.

## Stack

Vanilla JavaScript · Canvas API · Web Audio API · Node.js · Socket.IO · SQLite · PWA

No frontend framework. No required build step for the main world.

## MSA mission — honest boundary

Multiple System Atrophy is personal to my family. Echo Station explores a long-term product hypothesis: can a playful digital world build attention, community and eventually useful participation around rare-disease research?

The current public prototypes **do not submit research-grade data and are not scientifically validated tools**. Any future research contribution would require scientific partners, validated tasks, consent, governance and privacy review.

## Structure

```text
echo-office/
├── index.html        # Main station app
├── server.js         # WebSocket + chat server
├── platform.js       # Full platform: economy, Discord, research prototypes
├── public/
│   ├── landing.html  # Public v27 ring-station portfolio demo
│   ├── js/           # Feature modules
│   ├── pages/        # Standalone prototypes
│   ├── world.html    # Multiplayer world client
│   ├── editor/       # Room editor
│   ├── research/     # Research-game prototypes
│   └── dashboard/    # Internal dashboards
├── src/              # Server-side modules
├── scripts/          # Utility scripts
└── docs/             # Vision, design and architecture notes
```

---

*Built with curiosity, too much scope and a lot of love by Echo 🔮 & Mikel.*