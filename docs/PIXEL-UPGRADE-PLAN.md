# PIXEL Visual Upgrade Plan
## Echo's Vault — FireRed/LeafGreen Inspired Design System
### Authored by PIXEL, Echo's Vault Visual Designer
### Date: 2026-02-20

---

> *"Every pixel is a decision. If you can't justify it, remove it."*

---

## Preamble

This document is law. Not suggestions. Not goals. Law.

Echo's Vault currently draws sprites using ad-hoc Canvas calls with no unified visual grammar. The result is a world that looks assembled rather than designed. Pokémon FireRed & LeafGreen (GBA, 2004) solved this 22 years ago with hardware constraints that forced discipline. We're going to voluntarily adopt those constraints — not because we have to, but because they work.

Everything in this document is **specific**. Pixel counts. Hex codes. Millisecond timings. If it's vague, it's wrong. If you're tempted to "roughly approximate" any of these specs, you are no longer following this plan.

---

## 1. Sprite Standards

### 1.1 Canonical Sprite Grid

**Current state:** ~16×20px, inconsistent across player/NPCs.  
**New standard:** **16×24px** for all player and NPC overworld sprites.

Rationale: FireRed used 16×16 for tiny overworld sprites, but Echo's Vault is a top-down room game — not a 4-direction overworld. Characters need 24px height to show torso + legs in 3/4 perspective. 16 wide is sacred — it forces silhouette discipline.

```
Canvas grid unit: 16px
Player sprite: 16 × 24px (1 tile wide, 1.5 tiles tall)
NPC sprite:    16 × 24px (same — no exceptions)
Item icon:     16 × 16px (1 tile × 1 tile, square, always)
Machine face:  32 × 32px (2×2 tile block, like FireRed PC/objects)
```

### 1.2 Palette Rule — The 6-Color Law

Borrowed directly from **FireRed/LeafGreen character palette discipline**:

- **Maximum 6 colors per sprite** (including outline black and transparent)
- Color slots:
  1. `#000000` — Outline (1px border, always this exact black, no exceptions)
  2. Skin/base highlight (warm, top-left lit)
  3. Skin/base midtone
  4. Skin/base shadow (cool, bottom-right)
  5. Accent color (hair, clothes primary)
  6. Accent shadow (one step darker than accent, no new hue)

**Warm highlight / cool shadow rule** (FireRed's secret weapon):
- Highlights lean warm: add `+10` to Red channel, `-5` to Blue channel
- Shadows lean cool: add `+8` to Blue channel, `-5` to Red channel
- Example for a neutral grey midtone `#888888`:
  - Highlight: `#9a8580` (warm)
  - Shadow: `#757d88` (cool)

### 1.3 Outline Discipline

FireRed rule: **1px black outline on ALL sprites. No exceptions. No anti-aliasing. Ever.**

In Canvas API terms:
```javascript
// WRONG — never do this:
ctx.shadowBlur = 4; // blur = death

// RIGHT — always outline with fillRect:
ctx.fillStyle = '#000000';
ctx.fillRect(x - 1, y, 1, h);     // left edge
ctx.fillRect(x + w, y, 1, h);     // right edge
ctx.fillRect(x, y - 1, w, 1);     // top edge
ctx.fillRect(x, y + h, w, 1);     // bottom edge
```

Outline is drawn BEFORE the sprite body. Sprite body overwrites interior pixels. Outline pixels on exterior are never overwritten.

### 1.4 Walk Cycle Standard

**4-frame walk cycle**, borrowed from FireRed's overworld walk animation:

```
Frame 0: Neutral (standing, no offset)         — displayed at rest
Frame 1: Left foot forward  (leftLeg: +2px Y, rightLeg: -1px Y)
Frame 2: Neutral (mid-stride)                  — body at base position
Frame 3: Right foot forward (rightLeg: +2px Y, leftLeg: -1px Y)
```

- **Frame duration:** 120ms per frame (480ms full cycle = ~2 steps/second)
- **Body bob:** +1px Y on frames 1 and 3 (FireRed's "weight" feeling)
- **Arm swing:** Mirror of leg — if left foot forward, right arm forward (+1px X)
- Implementation: advance frame on `moveTick % 4`, where `moveTick` increments every 120ms of movement

### 1.5 FireRed Elements Borrowed Directly

| FireRed Feature | Echo's Vault Implementation |
|---|---|
| 1px black outline on all sprites | `drawOutline(ctx, x, y, w, h)` utility function |
| 4-color max per tile | 6-color max per sprite (we have 1 more dimension) |
| 2-frame idle bob | 2-frame idle animation, ±1px Y, 500ms per frame |
| Warm highlight / cool shadow | Enforced in every palette definition below |
| No anti-aliasing | `ctx.imageSmoothingEnabled = false` set globally, never changed |

---

## 2. Text & Dialogue System

### 2.1 The FireRed Dialogue Box — Echo's Vault Edition

FireRed's text box is the gold standard. We're copying its anatomy exactly and adapting dimensions for our canvas.

**Dialogue box dimensions:**
```
Width:  canvas.width - 32px (full width minus 16px margin each side)
Height: 80px
X:      16px from canvas left
Y:      canvas.height - 96px (16px from bottom)
```

**Text box anatomy** (inside-out, FireRed-spec):
```
Layer 1 (outermost): 2px border — color #FFFFFF
Layer 2:             2px gap    — color #2a2a3a (dark, not pure black — inner shadow)
Layer 3 (fill):      background — color #1a1a2e (deep navy-black, NOT #000000)
Layer 4 (text area): 8px padding from inner edge
```

```javascript
// dialogue-upgrade.js — drawDialogueBox(ctx, x, y, w, h)
function drawDialogueBox(ctx, x, y, w, h) {
  // Outer border (2px white)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);
  
  // Inner gap (2px dark — the "inner shadow")
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  
  // Background fill
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  
  // Text starts at: x + 12, y + 12 (4px gap + 8px padding)
}
```

### 2.2 Font Specification

**Font:** `'Press Start 2P'` (Google Fonts — monospace pixel font, 8×8 grid)  
**Fallback:** `monospace`  
**Size:** `8px` for dialogue body, `6px` for NPC name badge  
**Letter spacing:** `1px` (tight — FireRed didn't kern, neither do we)  
**Line height:** `16px` (8px font + 8px gap — double the font size, always)  
**Color:** `#FFFFFF` for body text, `#FFDE00` for NPC name (Pokémon yellow, exactly)  
**Max lines in box:** `3 lines` (with 80px box height: 12px top pad + 16+16+16 = 60px + 12px bottom = 84px — tight fit)

```javascript
ctx.font = '8px "Press Start 2P", monospace';
ctx.fillStyle = '#FFFFFF';
ctx.letterSpacing = '1px';
```

### 2.3 Typing Animation Speed

FireRed types at approximately **40 characters per second** (one character every 25ms).

Echo's Vault spec:
- **Normal speed:** 1 character per **30ms** (~33 chars/sec) — slightly slower for readability
- **Fast mode** (player holds confirm): 1 character per **5ms** (instant feel)
- **Pause on punctuation:** `.` `!` `?` trigger a **300ms hold** before continuing
- **Line break pause:** `\n` triggers a **150ms hold**

```javascript
// dialogue-upgrade.js typing engine
const TYPING_SPEED_MS = 30;
const TYPING_SPEED_FAST_MS = 5;
const PUNCTUATION_PAUSE_MS = 300;
const LINEBREAK_PAUSE_MS = 150;
```

### 2.4 Cursor Blink Specification

FireRed's blinking ▼ cursor signals "waiting for input." Exact spec:

```
Character: ▼ (U+25BC BLACK DOWN-POINTING TRIANGLE)
Position:  bottom-right of text area (box.x + box.w - 20, box.y + box.h - 16)
Color:     #FFFFFF
Blink:     ON for 500ms, OFF for 500ms (1000ms full cycle)
Font:      6px "Press Start 2P" (smaller than body text)
Only shown: when full text is displayed AND waiting for keypress
```

```javascript
// Blink state driven by:
const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
if (dialogueComplete && cursorVisible) {
  ctx.fillText('▼', cursorX, cursorY);
}
```

### 2.5 NPC Name Badge

FireRed's speaker name appears in a separate box **above** the dialogue box, left-aligned.

```
Width:  dynamic — NPC name length × 8px + 24px padding
Height: 20px
X:      same as dialogue box X (16px)
Y:      dialogueBox.y - 22px (2px gap between badge and main box)
Fill:   #2a3a5e (medium-dark blue — lighter than dialogue bg, distinct)
Border: same 2px white + 2px gap system
Font:   6px "Press Start 2P", color #FFDE00 (Pokémon yellow)
```

### 2.6 dialogue-upgrade.js — File Specification

**File:** `/Users/mikel/.openclaw/workspace/echo-office/dialogue-upgrade.js`  
**Load:** Add `<script src="dialogue-upgrade.js"></script>` after main scripts in index.html's closing body (or inject via existing loader pattern)

**Exports/globals this file must provide:**
```javascript
window.DialogueSystem = {
  open(npcName, lines, onComplete),  // Start dialogue sequence
  close(),                            // Dismiss current dialogue
  update(dt),                         // Call every frame (dt in ms)
  draw(ctx),                          // Call every frame after game draw
  isActive(),                         // Returns bool — blocks movement when true
  advance(),                          // Called on E/Space/Click — skip or next line
};
```

---

## 3. Color Palette System

### 3.1 Per-Floor Palette Definitions

Inspired by **FireRed's per-area restricted palettes** — each area has its own identity through color, not through decoration.

#### Floor 1 — The Lobby (Pallet Town equivalent)
```
Primary floor:    #C8B89A  (warm cream tile — lit)
Floor shadow:     #9A8A75  (cool sand shadow)
Wall face:        #7A6E5A  (slate warm grey)
Wall top:         #5A5045  (darker, recessed)
Accent:           #4A7A5A  (muted green for plants/decor)
Machine body:     #2A3A5A  (deep blue-grey for machines)
Machine light:    #00FF88  (green LED glow pixel — 1px only, no blur)
Background fill:  #1E1A14  (near-black warm, not cold)
```

#### Floor 2 — The Arcade (Cerulean City equivalent — electric, blue-tinted)
```
Primary floor:    #1A2A4A  (dark navy tile)
Floor highlight:  #2A3A5E  (lighter navy for lit tiles)
Wall face:        #0A1A3A  (deep blue wall)
Wall top:         #061228  (almost black ceiling)
Accent:           #FF6600  (orange neon — like game cabinet lights)
Machine body:     #1A1A2E  (deep space machine color)
Machine light:    #FF00FF  (magenta LED — 1px dot only)
Background fill:  #080814  (coldest black in the game)
```

#### Floor 3 — The VIP Lounge (Celadon/Lavender equivalent — purple, prestige)
```
Primary floor:    #3A2A4A  (deep purple tile)
Floor highlight:  #4A3A5A  (lighter purple lit)
Wall face:        #2A1A3A  (dark purple wall)
Accent:           #FFD700  (gold — earned, not given)
Machine body:     #2A2A2A  (near-black machines, gold trim)
Machine light:    #FFD700  (gold LED — 1px)
Background fill:  #0E0A14  (warm-purple black)
```

#### Underground / Secret Rooms (Pokémon Cave equivalent)
```
Primary floor:    #2A2218  (dark brown cave floor)
Floor highlight:  #3A3228  (slightly lighter for variety)
Wall face:        #1A1410  (very dark brown)
Accent:           #884400  (rust orange for torches/lights)
Background fill:  #0A0806  (deepest brown-black)
```

### 3.2 The Warm Highlight / Cool Shadow Rule (Mandatory)

Every lit surface in Echo's Vault obeys this rule. No exceptions.

```
Given a midtone color M(r, g, b):
  Highlight = (min(r+18, 255), min(g+10, 255), max(b-8, 0))
  Shadow    = (max(r-12, 0),   max(g-8, 0),    min(b+15, 255))
```

This is the single most important color rule in the document. It's why FireRed's 2004 graphics still look intentional in 2026.

### 3.3 Black Outline Rule — Absolute

```
Outline color: #000000 (pure black — not #111111, not #0a0a0a, not "near-black")
Outline width: 1px (one pixel. not 2. not 0.5. one.)
Applies to:    ALL sprites, ALL machines, ALL interactive objects
Does NOT apply to: floor tiles, wall tiles (environment is outline-free)
```

### 3.4 Background Tile Color Discipline

Tiles follow the **GBA 4-color-per-tile rule voluntarily**:

- Each tile type uses **exactly 4 colors**: base, highlight, shadow, and outline-accent
- No tile uses more than 4 colors
- This is enforced by the palette definitions above — each floor's palette gives you your 4

---

## 4. UI Component Standards

### 4.1 Stat/Progress Bar Design — Segmented, Always

FireRed's HP bar is segmented. Echo's Vault's bars are segmented. No smooth gradients, ever.

**Segment spec:**
```
Segment width:  4px
Segment gap:    1px
Segment height: 6px
Border:         1px #000000 around entire bar container
Container fill: #1a1a2e
```

**Color thresholds** (FireRed HP bar logic, repurposed for Echo's stats):
```
> 66% full:  #00D840  (bright green)
> 33% full:  #F8C800  (amber yellow)
≤ 33% full:  #F82800  (alarm red)
```

```javascript
// drawSegmentedBar(ctx, x, y, w, value, maxValue)
function drawSegmentedBar(ctx, x, y, w, value, maxValue) {
  const segW = 4, segGap = 1, h = 6;
  const totalSegs = Math.floor(w / (segW + segGap));
  const filledSegs = Math.round((value / maxValue) * totalSegs);
  const ratio = value / maxValue;
  const color = ratio > 0.66 ? '#00D840' : ratio > 0.33 ? '#F8C800' : '#F82800';
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2); // outer border
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y, w, h); // background
  
  for (let i = 0; i < filledSegs; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * (segW + segGap), y, segW, h);
  }
}
```

### 4.2 Menu/Popup Border Anatomy

The **2px border + 2px gap system** from FireRed applies to every popup, menu, and modal in Echo's Vault:

```
╔══════════════════╗  ← 2px white (#FFFFFF)
║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║  ← 2px dark gap (#2a2a3a)
║                  ║  ← interior fill (#1a1a2e)
║  content here    ║
║                  ║
╚══════════════════╝
```

```javascript
function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = '#FFFFFF';          // 2px outer border
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2a2a3a';          // 2px inner gap
  ctx.fillRect(x+2, y+2, w-4, h-4);
  ctx.fillStyle = '#1a1a2e';          // fill
  ctx.fillRect(x+4, y+4, w-8, h-8);
}
```

This function is the **single source of truth** for all panels. Zero one-off border implementations.

### 4.3 Cursor Design

FireRed's menu cursor is `►` — not a highlight, not a box, a character. Echo's Vault copies this.

```
Character: ► (U+25BA BLACK RIGHT-POINTING POINTER)
Color:     #FFDE00 (FireRed yellow cursor — borrowed directly)
Size:      8px "Press Start 2P"
Animation: none (the cursor doesn't blink — it's not a caret)
Movement:  cursor Y position animates at 100ms per menu slot (snappy)
```

Selected menu item: **+15% brightness** on text only (not background), simulated by:
```javascript
ctx.fillStyle = '#FFDE00'; // cursor arrow
ctx.fillStyle = '#CCCCCC'; // unselected option text  
ctx.fillStyle = '#FFFFFF'; // selected option text (brighter — same hue, just value shift)
```

### 4.4 Coin Counter Display Specification

```
Position:     top-right corner, 16px from right, 16px from top
Format:       ¢ + number (e.g., "¢1,250")
Font:         8px "Press Start 2P"
Color:        #FFD700 (gold)
Outline:      1px #000000 shadow-text effect (draw text in black at +1/+1 offset, then gold on top)
Background:   small panel using drawPanel() — 16px padding, auto-width
Update anim:  on coin change, number flashes #FFFFFF for 3 frames (45ms), then returns to gold
```

### 4.5 Inventory/Badge Display Grid

Borrowed from **FireRed's bag grid system**:

```
Cell size:   24×24px (16px icon + 4px padding each side)
Cell border: 1px #000000
Cell fill:   #1a1a2e (empty), #2a2a3a (hover), #3a3a4e (selected)
Icon area:   16×16px centered in cell (4px margin each side)
Label:       8px text below grid, not inside cells
Grid gap:    2px between cells
```

---

## 5. Animation Standards

### 5.1 The Echo's Vault Animation Budget

**Maximum frames per animation cycle: 4.**  
Borrowed from FireRed's "never more, never less" rule for animation loops.

```
Idle bob:    2 frames
Walk cycle:  4 frames
NPC blink:   2 frames
Water/floor: 2 frames
Sparkle:     4 frames
Coin spin:   4 frames (if needed)
NOTHING:     > 4 frames (if you need more, redesign the animation)
```

### 5.2 Idle Bob Specification

FireRed's 2-frame idle is the blueprint:

```
Frame 0 (base):  sprite at Y = baseY            — duration: 600ms
Frame 1 (up):    sprite at Y = baseY - 1px      — duration: 600ms
Total cycle:     1200ms (~0.83 bobs/second)
Amplitude:       1px (one pixel. moving 2px looks drunk)
Timing:          600ms each frame — slow, peaceful
Only for:        idle NPCs, idle player (when no input for 2000ms)
```

```javascript
const idleBobOffset = Math.floor(Date.now() / 600) % 2 === 1 ? -1 : 0;
drawSprite(ctx, x, y + idleBobOffset, ...);
```

### 5.3 Walk Cycle Specification

```
4 frames, 120ms each, total 480ms loop

Frame 0: Neutral stance
  - Body:     baseY
  - LeftLeg:  baseY + 0 (no offset)
  - RightLeg: baseY + 0
  - Arms:     center

Frame 1: Left step
  - Body:     baseY + 1 (bob down)
  - LeftLeg:  baseY + 3 (forward)
  - RightLeg: baseY - 1 (back)
  - LeftArm:  +1px back, RightArm: +1px forward

Frame 2: Mid-stride (same as Frame 0 but mirrored arms)
  - Body:     baseY
  - LeftLeg:  baseY + 0
  - RightLeg: baseY + 0
  - Arms:     center

Frame 3: Right step (mirror of Frame 1)
  - Body:     baseY + 1
  - RightLeg: baseY + 3 (forward)
  - LeftLeg:  baseY - 1 (back)
  - RightArm: +1px back, LeftArm: +1px forward
```

### 5.4 NPC Blink Specification

FireRed's NPCs blink occasionally. It's 2 frames and makes the world feel alive.

```
Frame 0 (eyes open):   normal sprite — duration: random 2000–5000ms
Frame 1 (eyes closed): eyes replaced with 2px horizontal line — duration: 150ms
Return to Frame 0.

Eye closed color:  same as skin midtone (not black — not a squint, a blink)
Randomization:     each NPC has an independent random blink timer
```

```javascript
// Per-NPC blink state
npc.nextBlink = Date.now() + 2000 + Math.random() * 3000;
npc.isBlinking = false;

// In update loop:
if (Date.now() >= npc.nextBlink && !npc.isBlinking) {
  npc.isBlinking = true;
  setTimeout(() => {
    npc.isBlinking = false;
    npc.nextBlink = Date.now() + 2000 + Math.random() * 3000;
  }, 150);
}
```

### 5.5 Interaction Sparkle Specification

When player presses E/interact — a 4-frame sparkle animation plays over the targeted object.

```
Duration:    4 frames × 80ms = 320ms total
Size:        16×16px centered on target object
Frame 0:     4 pixels at cardinal N/S/E/W, 4px from center — color #FFFFFF
Frame 1:     4 pixels at diagonal NE/NW/SE/SW, 6px from center — color #FFDE00
Frame 2:     8 pixels (all 8 directions), 7px from center — color #FFD700
Frame 3:     4 pixels at cardinals only, 8px from center, fading — color #FF8800
After Frame 3: animation complete, remove

Pixel size:  2×2px each "spark" pixel (scaled for visibility)
Blend:       no blend modes — flat fillRect only
```

---

## 6. Implementation Roadmap

### 6.1 File Plan — No index.html Modifications

All upgrades ship as standalone `.js` files that hook into the existing game loop.

```
echo-office/
├── dialogue-upgrade.js      [NEW] — Complete dialogue box system
├── pixel-palette.js         [NEW] — Palette constants and per-floor colors
├── pixel-ui.js              [NEW] — drawPanel, drawSegmentedBar, cursor system
├── pixel-sprites.js         [NEW] — drawOutline, sprite standard helpers
├── pixel-animations.js      [NEW] — Idle bob, walk cycle, blink, sparkle
└── pixel-boot.js            [NEW] — Loads all above, sets ctx.imageSmoothingEnabled=false
```

**Load order** (added via script tag or existing loader):
```html
<script src="pixel-palette.js"></script>
<script src="pixel-ui.js"></script>
<script src="pixel-sprites.js"></script>
<script src="pixel-animations.js"></script>
<script src="dialogue-upgrade.js"></script>
<script src="pixel-boot.js"></script>
```

### 6.2 Priority Order — Impact-First

| Priority | Component | File | Impact | Complexity |
|---|---|---|---|---|
| 1 | `ctx.imageSmoothingEnabled = false` global | `pixel-boot.js` | 🔥🔥🔥 Instant crispness | **S** |
| 2 | Dialogue box system | `dialogue-upgrade.js` | 🔥🔥🔥 Most visible interaction | **L** |
| 3 | Floor palettes | `pixel-palette.js` | 🔥🔥🔥 Entire world changes | **M** |
| 4 | `drawPanel()` for all UI | `pixel-ui.js` | 🔥🔥 Coherent UI language | **M** |
| 5 | Segmented bars | `pixel-ui.js` | 🔥🔥 Stat displays pop | **S** |
| 6 | Sprite outline system | `pixel-sprites.js` | 🔥🔥 Characters read cleanly | **M** |
| 7 | Idle bob + blink | `pixel-animations.js` | 🔥 World feels alive | **S** |
| 8 | Walk cycle upgrade | `pixel-animations.js` | 🔥 Movement feels weighty | **M** |
| 9 | Interaction sparkle | `pixel-animations.js` | 🔥 Feedback feels good | **S** |
| 10 | Coin counter display | `pixel-ui.js` | Polish | **S** |

**Complexity key:** S = 1–2 hours, M = half-day, L = full day

### 6.3 What Requires Zero index.html Changes

Everything in the priority list above can be done with:
1. New `.js` files added to the project
2. A single `<script>` tag (or injected via `document.createElement('script')` from `pixel-boot.js` itself — zero HTML edits)

**Self-bootstrapping loader trick:**
```javascript
// pixel-boot.js can inject itself and others via:
['pixel-palette','pixel-ui','pixel-sprites','pixel-animations','dialogue-upgrade']
  .forEach(name => {
    const s = document.createElement('script');
    s.src = name + '.js';
    document.body.appendChild(s);
  });
// Then set the global canvas flag:
const gameCanvas = document.querySelector('canvas');
const ctx = gameCanvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
```

Only ONE script tag needed in index.html: `<script src="pixel-boot.js"></script>`

### 6.4 Complexity Summary

- **Total S tasks:** 5 × ~1.5hr = ~7.5 hours
- **Total M tasks:** 4 × ~4hr = ~16 hours
- **Total L tasks:** 1 × ~8hr = ~8 hours
- **Grand total estimate:** ~31.5 hours of focused implementation

Phased over 3 sessions:
- **Session 1 (8hrs):** pixel-boot + pixel-palette + pixel-ui basics (priorities 1–5) — world transform
- **Session 2 (8hrs):** pixel-sprites + dialogue-upgrade (priorities 6 + 2 deep) — characters and talk
- **Session 3 (8hrs):** pixel-animations + polish pass (priorities 7–10) — alive world

---

## 7. The One Rule

> **Every pixel in Echo's Vault must be a deliberate decision: if you can't name its color, justify its position, and defend its existence in 10 words, remove it.**

---

## Appendix A — Quick Reference Color Swatches

```
Outline black:     #000000
UI text white:     #FFFFFF
NPC name yellow:   #FFDE00
Gold accent:       #FFD700
Cursor yellow:     #FFDE00
Panel bg:          #1a1a2e
Panel gap:         #2a2a3a
Panel border:      #FFFFFF
Bar green:         #00D840
Bar yellow:        #F8C800
Bar red:           #F82800
F1 floor lit:      #C8B89A
F1 floor shadow:   #9A8A75
F2 floor lit:      #2A3A5E
F2 floor shadow:   #1A2A4A
F3 floor lit:      #4A3A5A
F3 floor shadow:   #3A2A4A
Underground lit:   #3A3228
Underground shadow:#2A2218
```

## Appendix B — FireRed/LeafGreen Credits

The following design decisions in this document are **directly borrowed by name** from Pokémon FireRed & LeafGreen (Game Freak, Nintendo, 2004):

1. **1px black outline rule** — FireRed's signature character rendering technique
2. **Warm highlight / cool shadow palette rule** — FireRed's environmental color system
3. **2px border + 2px gap box anatomy** — FireRed's UI panel construction
4. **4-frame walk cycle at 120ms/frame** — FireRed's overworld movement animation
5. **2-frame idle bob at 600ms/frame** — FireRed's standing NPC animation
6. **▼ blinking cursor at 500ms on/500ms off** — FireRed's dialogue wait indicator
7. **► cursor character for menu selection** — FireRed's menu navigation design
8. **Per-area restricted palettes** — FireRed's world area color identity system
9. **Segmented HP bar with color thresholds** — FireRed's battle UI stat display
10. **40 char/sec typing speed with punctuation pause** — FireRed's dialogue rhythm

These are not coincidences. They are citations. PIXEL does not reinvent — PIXEL studies what worked and applies it precisely.

---

*— PIXEL, Echo's Vault Visual Designer*  
*"The pixel is the atom. The atom is not negotiable."*
