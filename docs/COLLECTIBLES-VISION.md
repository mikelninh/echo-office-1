# COLLECTIBLES VISION — Yu-Gi-Oh × VeVe Comics × Echo Office

> **Core principle: Let users SEE what they can do.** Every collectible must be visually stunning before it's mechanically interesting.

---

## 🎴 Yu-Gi-Oh Integration

### The Card Gallery (New Floor or Zone on Archive Floor)

**Visual concept:** A cathedral-like display hall with floating holographic cards. Think Kaiba's vault meets a high-end art gallery.

- Cards float in glass cases with **animated holographic shimmer** (rainbow edge glow, shifting foil pattern)
- **Rarity tiers visible at a glance:**
  - Common: flat card, subtle border glow
  - Rare: foil shimmer animation
  - Ultra Rare: rotating holographic effect + particle trail
  - Secret Rare: pulsing rainbow border + lens flare
  - Holy Grail (€5K+): **full-screen dramatic reveal** — lightning, camera shake, golden aura, the works
- Cards cast **colored light onto the floor** based on their element/attribute
- Walk up to any card → **zoomed detail view** with real market price (from your monitor script!)

### Card Duels (Arcade Floor)

- Simplified 3-card duels with **attack animations** — monsters materialize as pixel art above the card
- **Summoning sequence**: card glows → spins → monster appears with element-matched particle burst
- Life points as **dramatic health bars** with screen shake on big hits
- Win streaks → **aura around your visitor sprite** visible to everyone

### Holy Grail Monitor Integration

- Live feed from your `monitor.mjs` showing real holy grail listings
- Cards that appear on eBay/TCGPlayer get a **"SPOTTED IN THE WILD"** alert with dramatic fanfare
- Price history graphs rendered as **pixel art charts** in the display hall

---

## 📚 VeVe Comics Integration

### The Reading Room (Floor 9 — The Archive)

**Visual concept:** A cozy cosmic library. Floating bookshelves in zero-G, with comic covers that *move* (animated cover art panels).

- **Comic shelf browser**: covers displayed spine-out on pixel art bookshelves, pull one out → cover expands with parallax layers
- **Reading mode**: full comic panel viewer with smooth page transitions
  - Page turn animation: panels slide/fade cinematically
  - Sound effects rendered as **pixel art onomatopoeia** floating off the page (POW! THWAP!)
- **Cover art as wall decorations**: own a comic → its cover appears as animated wall art in your quarters
- **Comic spotlight**: featured comic gets a **holographic pedestal** in the lobby with rotating 3D-ish cover effect

### VeVe Collectibles Display

- 3D-ish rotating display cases (isometric pixel art rotation, 8-frame)
- **Rarity glow system** matching VeVe tiers:
  - Common: soft white glow
  - Uncommon: green pulse
  - Rare: blue shimmer
  - Ultra Rare: purple aurora
  - Secret Rare: **golden particle storm**
- Tap a collectible → **cinematic unboxing animation** (even for already-owned items, because it never gets old)
- Display your top 3 collectibles on your **visitor profile card** visible to others

### Collect Chain / Stackr 2.0 Bridge (Future)

- Once VeVe's chain goes live: true NFT ownership verification
- **"Verified" badge** on display items with blockchain-confirmed ownership
- Cross-station trading through the Bazaar with real crypto backing

---

## 🏪 The Unified Bazaar

### Visual Trading Experience

**The bazaar must FEEL like a real marketplace.** Not a list. Not a table. A *place*.

- **Stall system**: each seller gets a pixel art stall with their items displayed visually
- Browse by **walking through** the bazaar — items float above stalls with rarity glow
- **Haggling animation**: buyer and seller sprites face each other, speech bubbles with offers
- **Trade completion**: coins arc through the air, item floats to new owner with sparkle trail
- **Price tags** rendered as pixel art signs next to items

### Item Preview System (CRITICAL)

Every item in the entire station must have a **canvas-rendered preview**:
- Skins → animated sprite preview walking/idle
- Cards → holographic card render with rarity effects
- Comics → animated cover thumbnail
- Weapons → pixel art weapon with element glow
- Furniture → in-room preview showing how it looks placed

**NO MORE EMOJI PLACEHOLDERS.** If it exists in the game, it gets a real visual.

---

## 🎪 The Collector's Journey

### Visual Progression

Make collecting feel **rewarding and visible**:

1. **Collection Book**: pixel art book that fills up — spine gets thicker, cover gets shinier
2. **Collector Rank badges** displayed on visitor sprite:
   - Novice (5 items): small star
   - Enthusiast (25): bronze frame
   - Connoisseur (100): silver frame + sparkle
   - Master (500): gold frame + particle trail
   - Legend (1000+): **holographic border around sprite**
3. **Collection milestones**: completing a set triggers station-wide event
   - Complete all Yu-Gi-Oh cards of an archetype → **themed invasion event** (Dark Magicians appear on all floors!)
   - Complete a VeVe brand collection → **brand takeover** (Marvel collection → station gets Marvel-themed for 1 hour)

### First-Time Experience

When a new visitor first enters the collectibles area:
1. **Cinematic pan** across the gallery showing the possibilities
2. **Starter pack**: 3 random common cards + 1 comic preview — with FULL unboxing animation
3. **"Your Collection Awaits"** — holographic arrow guiding to the gallery entrance
4. **First card inspection** is tutorialized with a slow zoom + "tap to flip" prompt

---

## 🎨 Visual Tech Requirements

### Holographic Card Rendering
```
- Rainbow gradient overlay (animated hue rotation)
- Parallax tilt effect (mouse/touch position → card angle)
- Foil pattern: noise texture × metallic gradient
- Edge glow: outer shadow with rarity color
- Particle system: floating sparkles for Ultra Rare+
```

### Comic Panel Renderer
```
- Panel layout engine (1-6 panels per page)
- Speech bubble system with pixel art fonts
- Page turn: slide left with subtle 3D perspective
- Sound effect text: bouncy scale-in animation
- Parallax layers: foreground/midground/background shift on scroll
```

### Universal Item Preview Canvas
```
- 64×64 rendered thumbnails for shop/inventory
- 128×128 detail view for inspection
- Animated previews (idle animation loop)
- Rarity border/glow consistent across all item types
- Background: contextual (card = dark void, comic = paper, skin = station floor)
```

---

## 🏠 Holy Grails In Your Room

### The Display Wall

Every visitor's personal quarters gets a **trophy wall** — a dedicated display for their most prized cards and collectibles.

- **Mounted card frames** on the wall — pixel art ornate frames (gold for Holy Grails, silver for Ultra Rare, bronze for Rare)
- Cards are **not flat images** — they render with full holographic shimmer, even on the wall
- Holy Grails (€5K+) get a **dedicated spotlight** — actual light beam from above, illuminating the card, subtle dust particles in the light
- Walk up to any mounted card → **dramatic zoom** with price, rarity, card lore, and real market value
- **Visitors can see YOUR room** — this is the flex. Someone walks into your quarters and sees a Blue-Eyes White Dragon 1st Edition on the wall with a golden spotlight? That's status.

### Room Ambiance Changes

Your holy grails **change your room**:
- 1 Holy Grail: subtle golden trim on the walls
- 3 Holy Grails: ambient glow shifts to match the dominant card color
- 5+: your room gets a **floating card orbit** — miniature cards slowly circling above like a mobile
- 10+: **the walls themselves** shimmer with holographic texture. Your room IS the collection.

### VeVe Comics on the Shelf

- Comic covers displayed on a pixel art bookshelf in quarters
- Animated covers — subtle movement (cape flowing, eyes glowing)
- Tap a comic → reading mode right from your room
- Full collection of a brand → the shelf gets a **branded section** with logo and glow

### The Visitor Experience

When someone visits your quarters:
1. They see your display wall FIRST — it's positioned for maximum impact
2. Holy Grails have a **"value ticker"** showing live market price
3. A small **"Collection Worth: €XX,XXX"** counter above the wall (opt-in flex)
4. They can tap **"I want this too"** → links to the bazaar or shows where to find it
5. **Envy engine**: seeing someone's collection motivates collecting. This is by design.

---

## Implementation Priority

1. **Card Gallery floor** — the visual showpiece, immediately impressive
2. **Universal item preview system** — kills emoji placeholders everywhere
3. **Holographic card renderer** — the "wow" moment
4. **Comic shelf browser** — reading room on Archive floor
5. **Unified bazaar visual overhaul** — stalls, walking, previews
6. **Collection book + ranks** — long-term engagement loop
7. **VeVe chain bridge** — when Collect chain is live

---

*The station should feel like walking into the world's coolest collector's shop — every item glowing, every card shimmering, every comic begging to be opened. If a visitor walks in and doesn't immediately think "I WANT THAT", we've failed.*
