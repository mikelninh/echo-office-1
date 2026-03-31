# PREMIUM SKIN VISION — Make Them Go WOW

> **Rule #1: Nobody should EVER regret buying a skin.**
> Every premium skin must feel like a gift to yourself. Not a purchase — an upgrade to your entire experience.

---

## The Problem Today

Current skins are pixel art color swaps. They look different but they don't *feel* different. A visitor buys a Legendary skin and... their sprite changes color. That's it. That's a refund waiting to happen.

## The Vision: Living Skins

Every paid skin is a **character**, not a costume. It changes how you exist in the station.

### Tier System

#### 🟢 Common (Free / 10-25◈)
- Static HD sprite (what we have now)
- Basic idle animation (breathing)
- This is the baseline. Fine for free.

#### 🔵 Rare (35-60◈)
- **Unique idle animation** (trainer tosses Pokéball, ninja flips kunai)
- **Walk cycle variation** (plumber bounces, ninja glides)
- **Interaction sparkle** — small particle effect on click

#### 🟣 Epic (80-800◈)
- Everything Rare has, plus:
- **Unique emotes** (3-4 per skin) — visible to other visitors
- **Weapon hold animations** — sword rests on shoulder, staff floats, guns holstered properly
- **Drink animations** — holds cup differently, unique sip animation
- **Environmental interaction** — leaves footprints, trail effects (petals for Cherry Blossom, sparks for Speedster)
- **Idle fidgets** — character does unique things when standing still (Hero of Time checks sword, Robot runs diagnostics)

#### 🟡 Legendary (2000◈ / Loot only)
- Everything Epic has, plus:
- **Entrance animation** — cinematic arrival when entering a floor (Super Saiyan powers up, Ice Queen freezes doorway)
- **Transformation sequence** — buyable "equip" animation that plays once (dramatic, skippable, but SO cool the first time)
- **Ambient aura** — persistent visual effect (golden glow, floating ice crystals, shadow wisps)
- **Unique interaction with Pixel** — Pixel reacts differently (hides from Demon, purrs for Angel, rides on Hulk's shoulder)
- **Weapon fusion** — legendary skin + matching weapon = unique combined animation (Saiyan + Ki Gauntlets = Kamehameha pose)
- **Sit/rest poses** — unique way of sitting in lounge, leaning on walls

#### 🔴 Mythic (5000◈ / Ultra-rare loot)
- Everything Legendary has, plus:
- **Full animation set** — 8+ unique animations for every station activity
- **Music change** — subtle BGM variation on the floor you're on (Zero gets a rock riff, Kirby gets bouncy notes)
- **Other visitors see YOUR effects** — your aura, your trail, your entrance. You're the main character.
- **Echo comments on you** — unique Echo dialogue when wearing the skin ("Is that... a Z-Saber? I'm not cleaning up plasma burns.")
- **Station influence** — small visual changes to the floor you're on (Spirit Granny makes lights flicker, Psychic Girl makes objects float slightly)
- **Seasonal evolution** — the skin subtly changes with real-world seasons (cherry blossoms fall in spring, snow in winter)

---

## What "Interactive" Actually Means

### Weapon Holding
Not just "character has sword." The sword is PART of the character:
- **Idle**: sword rests naturally (on back, at side, floating)
- **Walking**: sword sways with movement
- **Emote**: character performs weapon-specific move
- **Near other visitors**: battle-ready stance shifts subtly

### Drink Interactions
When buying a drink at the bar (Floor 6):
- Character **actually holds the drink** — visible cup/glass
- **Sip animation** on tap/click
- Drink matches the skin theme (Demon gets flaming cocktail, Ice Queen gets frozen drink)
- Empty cup → toss animation → cup disappears with sparkle

### Sitting & Resting
On couches, chairs, beds:
- Each skin tier has unique sit pose
- Legendary+ get **lounging animations** (lean back, cross legs, pet Pixel)
- Mythic skins **change the furniture glow** to match their aura

### Elevator Rides
- Common: stands normally
- Rare: unique stance
- Epic: taps foot / checks watch / does something in-character
- Legendary: dramatic pose (cape billows, hair flows)
- Mythic: elevator lights change to skin's color scheme

---

## The "Try Before You Buy" Problem

Mikel's right — disappointment kills. Solutions:

### 1. Skin Preview Theater
- Dedicated preview room where you can see ANY skin in action
- **Full animation showcase**: idle → walk → emote → weapon hold → entrance
- Side-by-side comparison with your current skin
- "Preview on your character" — see the skin on YOUR visitor with YOUR items
- **Time-limited trial**: wear any skin for 5 minutes before buying

### 2. Skin Spotlight Videos
- Each skin gets an auto-playing **pixel art showcase** in the shop
- Shows ALL the unique features: emotes, trails, interactions
- Slow-motion for the cool parts
- "This skin includes:" checklist with animated icons

### 3. Community Validation
- See how many others own each skin
- "Satisfaction rating" from owners (1-5 stars)
- "Most worn" badge for popular skins
- Refund window: 24h after purchase if worn < 10 minutes

---

## Animation System (Technical)

### Frame-Based Sprite Sheets
Each skin needs multiple animation states:
```
States per skin:
- idle (4-8 frames, looping)
- walk_right (6-8 frames)
- walk_left (mirrored or unique)
- emote_1, emote_2, emote_3 (8-12 frames each)
- hold_sword, hold_staff, hold_gun, hold_drink (4 frames each)
- sit (2-4 frames)
- entrance (12-20 frames, plays once)
- transform (16-24 frames, plays once)
```

### Particle System Per Skin
```javascript
skinParticles: {
  'super_saiyan': { type: 'energy', color: '#ffdd00', rate: 3, gravity: -0.5, life: 40 },
  'ice_queen': { type: 'crystal', color: '#88ccff', rate: 2, gravity: -0.2, life: 60, rotate: true },
  'demon': { type: 'ember', color: '#ff4422', rate: 4, gravity: -0.8, life: 30 },
  'spirit_granny': { type: 'wisp', color: '#44ff66', rate: 1, gravity: 0, life: 80, wander: true },
  'cherry_blossom': { type: 'petal', color: '#ff88aa', rate: 2, gravity: 0.3, life: 90, drift: true },
}
```

### Interaction Triggers
```javascript
skinInteractions: {
  onFloorEnter: 'entrance',      // Legendary+ entrance animation
  onItemEquip: 'transform',       // weapon/item equip flourish
  onDrinkBuy: 'holdDrink',       // bar purchase
  onSit: 'sitPose',              // furniture interaction
  onNearVisitor: 'socialIdle',   // stance change near others
  onPixelNear: 'pixelReact',     // Pixel-specific reaction
  onIdle30s: 'fidget',           // boredom animation
  onElevator: 'elevatorPose',    // riding between floors
}
```

---

## Revenue Model

| Tier | Price (◈) | Real $ (if 100◈ = $1) | What they get |
|------|-----------|------------------------|---------------|
| Common | 0-25 | Free | Static sprite, basic idle |
| Rare | 35-60 | $0.35-0.60 | Unique idle + walk |
| Epic | 80-800 | $0.80-8.00 | Emotes, trails, interactions |
| Legendary | 2000 | $20 | Full character experience |
| Mythic | 5000 | $50 | Station-altering presence |

Legendary and Mythic skins should feel like buying a champion skin in LoL — you KNOW you got your money's worth because every single interaction is elevated.

---

## Implementation Phases

### Phase 1: Animation Foundation
- Multi-frame sprite system (replace single-frame renders)
- Idle animations for ALL existing skins (even commons get breathing)
- Walk cycle variations for Rare+
- Particle system per skin

### Phase 2: Interaction Layer
- Weapon hold states
- Drink hold + sip
- Sit poses
- Elevator behavior
- Pixel reactions per skin

### Phase 3: Premium Features
- Entrance animations (Legendary+)
- Emote system with emote wheel UI
- Trail/footprint system
- Ambient aura rendering

### Phase 4: Mythic Tier
- BGM variations
- Station influence effects
- Seasonal evolution
- Echo unique dialogue per skin

### Phase 5: Try Before You Buy
- Preview theater
- Skin spotlight auto-play in shop
- Trial system
- Satisfaction ratings

---

*A €50 skin that makes someone smile every time they enter a room is worth more than a €5 skin that gets forgotten in a week. We're not selling pixels — we're selling identity.*
