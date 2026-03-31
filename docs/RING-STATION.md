# 🔮 The Ring Station — Architecture Redesign

> *"Not floors. A ring. In space. Looking at Earth."*

---

## The Concept

Echo Station is a **ring-shaped space station** orbiting Earth. Instead of stacked floors connected by an elevator, sections are arranged around a continuous ring. You walk clockwise or counterclockwise — it's one connected world.

Some sections have **portals** — instant jumps to other worlds: someone's personal plot, a neighborhood street, a movie screening, a preserved dead website, another station entirely.

**The ring is the internet made physical.** Portals are links. Sections are pages. Walking is browsing.

---

## Ring Layout (12 Segments)

The ring has 12 primary segments, arranged like a clock:

```
         [Observatory]
      [Cinema]    [Garden]
    [Arcade]        [Lab]
  [Night Market]      [Lounge]
    [Gym]           [Community]
      [Quarters]  [Neighborhood Hub]
         [The Underground]
```

### Segments (clockwise from 12 o'clock):

| # | Segment | Description | Size |
|---|---------|-------------|------|
| 1 | 🔭 Observatory | Stars, telescope, hot cocoa, zen mode | 2400×1600 |
| 2 | 🌿 Garden Biodome | 8 grow plots, butterflies, biodome glass | 2000×1400 |
| 3 | 🔬 Secret Lab | Data fragments, portal hub, PROTOCOL 7 | 1600×1200 |
| 4 | 🎵 The Lounge | Vinyl records, candles, Sade vibes, bar | 4000×1600 |
| 5 | 🎨 Community Deck | Pixel art wall, guestbook, social hub | 2800×1400 |
| 6 | 🏘️ Neighborhood Hub | Portal to streets, districts, shops | 3000×1500 |
| 7 | 🪩 The Underground | 8 clubs, DJ booths, dance floor | 2400×1800 |
| 8 | 💪 The Gym | 7 zones, minigames, fitness streaks | 5000×2000 |
| 9 | 🏠 Echo's Quarters | Home base, bookshelf, coffee, Pixel | 2400×1200 |
| 10 | 🌙 Night Market | Premium shops, exclusive items, traders | 3000×1500 |
| 11 | 🕹️ Arcade | 3 cabinets, prizes, neon glow | 2400×1400 |
| 12 | 🎬 The Cinema | Huge screen, synced video, live reactions | 3000×1600 |

### Navigation:
- **Walk left/right** → move to adjacent segment (smooth scroll transition)
- **Ring map** → minimap showing all 12 segments as a circle, you as a dot
- **Portals** → instant jump to any world (personal plots, other stations, special dimensions)
- **No elevator** — the ring IS the connection

---

## 🎬 The Cinema — "The Screening Room"

### The Vision
A proper cinema experience in pixel art. Not a gimmick — a place cinéastes would actually want to hang out.

### Physical Space
- Curved screen filling 60% of the back wall (massive, impressive)
- 3 rows of seats (12 seats total): front row, middle (best seats), back row (cozy couples corner)
- Projector beam visible from back wall — dust motes dancing in the light
- Art deco / old cinema aesthetic: red velvet seats, gold trim, subtle wall sconces
- Marquee sign outside: "NOW SHOWING: [title]" with animated lights

### Viewing Experience
- **Synchronized playback** — YouTube/video URL, everyone sees the same frame
- Server broadcasts current timestamp every 5 seconds; clients auto-correct drift
- Play/pause controlled by the "projectionist" (room host or vote)
- Buffering shown as "projector malfunction" with flickering effect

### Reactions
- **Emoji reactions** float up from your seat position (like Twitch, but spatial)
- 👏 Applause — clapping animation, sound
- 😂 Laugh — bouncy emoji
- 😢 Tears — subtle drip
- 🔥 Fire — "this scene is incredible"
- 💀 Skull — "I'm dead"
- Reactions visible to everyone, positioned relative to your seat
- Quick reaction bar at bottom: tap emoji → it floats up

### Atmosphere
- Lights dim 3 seconds before film starts (overhead sconces fade)
- Projector beam cone with visible dust particles
- Seats creak subtly when someone sits down
- Someone arrives late → avatar quietly shuffles to an empty seat
- Intermission: lights come up, chat goes full, "10 min break" on screen
- Post-credits: lights slowly rise, "What did you think?" chat prompt

### Programming
- **Scheduled screenings** — "Tonight at 9 PM: Spirited Away 🎥"
- **Vote next film** — 3 options, visitors vote, winner plays
- **Film club** — weekly picks, discussion after
- **Director's corner** — curated playlists by genre (Ghibli night, noir week, etc.)
- **Request queue** — visitors can suggest, host approves

### Chat Modes
- **During film**: whisper mode (small gray text, 60% opacity, auto-fades)
- **Intermission**: full chat, normal colors
- **Post-film**: discussion mode, highlighted takes, "hot take" reactions

### Technical
- Video: embedded YouTube iframe (or custom player for direct URLs)
- Sync: WebSocket broadcasts `{videoId, timestamp, state}` every 5s
- Reactions: WebSocket broadcasts `{userId, emoji, seatPos}`, rendered as floating particles
- Seats: click empty seat to sit, click again to stand
- Canvas renders the cinema room; video overlay positioned where the "screen" is in the canvas

---

## Portal System

### How Portals Work
Portals are glowing doorways in certain ring segments. Walk into one → transition animation → arrive at destination.

### Portal Types:
1. **Neighborhood Portal** (Segment 6) → Neighborhood streets, districts, shops
2. **Dimension Portals** (Segment 3 - Lab) → Special worlds (Crystal Caves, Cloud Islands, Digital Ruins)
3. **Personal Portals** → Jump to anyone's personal plot via `vault.gg/username`
4. **Cinema Portal** → Direct link to current screening
5. **Time Portals** → Archived worlds, dead websites preserved, past events frozen in time
6. **Station-to-Station** → Visit other players' ring stations (federation)

### Portal Visuals:
- Swirling energy vortex (animated particles in a circle)
- Color indicates destination type (blue = neighborhood, purple = dimension, gold = cinema, green = personal)
- Label floating above: destination name
- Step in → 0.5s transition → arrive

---

## Ring Navigation System

### The Ring Map (replaces floor selector)
- Circular minimap in top-right corner
- 12 segments shown as colored arcs
- Your position = glowing dot on the ring
- Click any segment = walk camera there (or hold to portal-jump)
- Visitor dots visible on the ring (see where people are)

### Movement Between Segments
- Walking left/right near segment boundaries → smooth scroll to next segment
- Camera pans, background shifts, ambient sound crossfades
- No loading screen — continuous world
- Speed: ~3 seconds to walk between adjacent segments
- Dash: ~1 second between segments

### Segment Transitions
- Each segment has its own:
  - Background art / skybox
  - Ambient sound
  - Lighting color temperature
  - Particle effects (from visual-polish.js)
  - Music (from existing sound system)
- Transitions crossfade between adjacent segment atmospheres

---

## Refactor Plan

### Phase 1: Ring Layout Engine (NEW: ring-engine.js)
- Replace floor-based navigation with ring-segment system
- `changeFloor(n)` → `changeSegment(n)` (backwards-compatible wrapper)
- Ring map replaces floor selector
- Continuous walking between segments
- Camera system supports wide horizontal scrolling

### Phase 2: Cinema Module (NEW: cinema.js)
- Segment 12 renderer
- Video embed + sync system
- Seat management
- Reaction system
- Chat modes (whisper/full/discussion)

### Phase 3: Portal System (NEW: portals.js)
- Portal objects in segments
- Transition animations
- Destination loading (neighborhoods, plots, dimensions)
- `vault.gg/destination` deep linking

### Phase 4: Neighborhoods IN the Ring
- Segment 6 = Neighborhood Hub (portal to streets)
- Streets rendered with same sprite system as station
- Plots are sub-rooms of the neighborhood
- Same dash, same economy, same everything

### Safety:
- Each phase is a NEW JS file (never edit index.html's 43K lines)
- ring-engine.js wraps/overrides existing floor functions
- Backwards compatible: old floor numbers map to segment numbers
- Each commit syntax-checked with vm.Script
- Each feature testable independently

---

## The Aesthetic

**Outside the ring:** Deep space. Earth visible through observation windows. Stars. Occasional meteor.

**Inside the ring:** Warm, lived-in. Each segment has its own personality but they share a visual language — the same pixel art scale, the same sprite size, the same lighting system.

**The curved ceiling:** The ring's curvature is subtly visible in the background — a gentle arc suggesting you're inside a massive ring structure.

**Gravity:** Centrifugal. Characters walk on the inner surface of the ring. "Down" is always away from the center.

---

*"The ring is the internet made physical. Portals are links. Sections are pages. Walking is browsing. The station doesn't have floors — it has a horizon."*

🔮
