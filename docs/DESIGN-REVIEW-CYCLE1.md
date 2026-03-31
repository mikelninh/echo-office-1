# 🎨 Design Review — Sprite Enhancement System (Cycle 1)

**Reviewer:** Senior Visual Game Designer  
**Date:** 2026-02-18  
**Scope:** SpriteEnhancements IIFE (lines ~14357–14670)  
**Context:** Echo Worlds — multiplayer pixel-art office with collectible skins  
**Commits reviewed:** `1a63739` through `015b913` (5 commits, one per enhancement)

---

## Executive Summary

The intent is right — rim lighting, specular sweeps, blinking, directional shadows, and AA are exactly the systems you'd see on a "premium sprite" checklist. But the **execution is rough**. Most of these enhancements are drawn as disconnected post-process overlays on top of an already-rendered sprite, which creates visual artifacts rather than cohesive polish. The code reads like someone who understands the *concepts* but hasn't tuned the *values* by staring at pixels for hours.

**Overall Quality: 4/10** — Not brand-worthy yet. Needs a focused tuning pass and some architectural rethinking. The good news: the bones are there, and most fixes are value changes, not rewrites.

---

## Enhancement-by-Enhancement Ratings

### 1. Rim Lighting — 3/10

**Lines:** 14358–14399  
**What it does:** Iterates every pixel, checks if left/top neighbor is empty, draws a semi-transparent accent-colored rect offset by -1px.

**Problems:**

- **Fixed light direction** (`top-left` only, hardcoded). Real rim lighting should complement the existing scene lighting, not fight it. The office has no global light source defined, so this rim light exists in a vacuum.
- **Alpha is way too high.** `'80'` hex = 50% opacity. Rim lighting at 50% alpha doesn't read as subtle rim light — it reads as a misaligned border. Should be **15-25%** (`'26'` to `'40'` hex).
- **Offset by -1px is too aggressive at scale=3.** You're putting a full-alpha-ish colored pixel *outside* the sprite bounds. At 3x scale, that's a 3px colored bar sticking out. This creates a "glowing outline" effect rather than edge-catching light.
- **No consideration for sprite color.** The accent color is used uniformly regardless of the underlying pixel color. Rim light should *interact* with the surface — lighter on light pixels, more saturated on dark ones.
- **Applied to ALL premium skins equally.** Hulk gets the same rim light treatment as Ice Queen. These should feel different.
- **The `+ '80'` string concat for alpha is fragile.** If `accentColor` already has alpha or is in `rgb()` format, this produces invalid CSS. Use `rgba()` properly.

**What good rim lighting looks like:** In Celeste, Madeline's hair rim-catches light only on the *silhouette edge facing the light*, and it's 1 sub-pixel wide with ~20% opacity, color-shifted toward the environment's ambient. In Dead Cells, rim light is literally 1px bright and only appears on the 2-3 pixels that form the character's outline against darker backgrounds.

### 2. Dynamic Specular Highlight — 5/10

**Lines:** 14401–14436  
**What it does:** A white highlight sweeps left-to-right across metallic skins on a 4-second cycle.

**This is the best of the five.** The concept is correct and the sweep math works. But:

- **Sweep is perfectly linear**, which reads as mechanical/robotic. Real specular sweeps need easing — fast through the center, slow at edges. Use `Math.sin()` or a cubic ease instead of linear interpolation.
- **White-only highlight ignores material color.** Metallic blue (Blue Bomber) should have a cyan-white highlight. Metallic red (Iron Suit) should have a warm white. Pure `rgba(255,255,255,...)` flattens the material.
- **0.7 max intensity is too hot.** 70% white overlay obliterates the underlying pixel art detail. Drop to **0.3-0.4 max** with a sharper falloff curve.
- **The sweep width of 2 pixels is good** for the sprite scale, but the falloff radius of ±1 pixel (line 14425) creates hard edges. Need at least ±2 with exponential falloff.
- **`metallicSkins` is a hardcoded Set.** Should derive from skin properties (add `metallic: true` to skin data). Currently misses skins that should qualify (knight-v has metal armor) and some listed skins don't exist in VISITOR_SKINS (`silver_surfer`, `cyborg`, `steel_knight`).
- **4-second cycle with no randomization** means all metallic skins on screen sweep in perfect sync. Add a per-skin phase offset.

### 3. Eye Blink Animation — 4/10

**Lines:** 14439–14523  
**What it does:** Every 3-5 seconds, detects "eye pixels" (dark pixels in upper 40% of sprite) and replaces them with a skin tone color.

**Critical issues:**

- **Eye detection by color is incredibly fragile.** It only catches `#000`, `#222`, `#000000`, `#222222`. Looking at the Saiyan sprite (line 4545), eyes use `E='#222'` and `Ed='#111'`. So `#111` eyes are **missed entirely**. Many skins will have inconsistent blink behavior.
- **Hardcoded skin tone `#f5d6b8`** is a single light skin tone used for ALL characters. Hulk is green. Robot is silver. Saiyan's face uses `#ffaa77`. This will create jarring wrong-colored patches on most skins.
- **The "4-frame" blink is really 2 states**: open (frames 0,1) and closed (frames 2,3). Frames 0 and 1 both show open eyes, and frames 2 and 3 both draw the skin-tone patch. A real 4-frame blink should be: open → half-closed → closed → half-closed → open. That requires drawing half-height eye pixels, not just swapping colors.
- **State is stored on `S.visitor._blinkState`** — a single global. If there are NPCs or other players with skins, they all share one blink timer. Each entity needs its own blink state.
- **Frame timing uses hardcoded `0.016`** (line 14488) assuming 60fps. This breaks on 120Hz displays (blinks take 2x as long) or when framerate drops. Use `performance.now()` delta properly.
- **The comment says "2-frame blink"** (line 14440) but the commit message says "4-frame" — inconsistency suggests this wasn't tested carefully.
- **Blink only on "closed" frames (2 and 3)** but never renders a half-closed state, so visually it's: eyes open → eyes gone → eyes open. Feels more like a rendering glitch than a blink.

### 4. Enhanced Directional Shadow — 6/10

**Lines:** 14525–14586  
**What it does:** Draws an elliptical shadow below the sprite that shifts and skews based on movement direction.

**The best-architected of the five.** Clean separation, proper save/restore, sensible math. Issues:

- **Shadow at `rgba(0,0,0,0.25)`** is too opaque for pixel art. Most pixel art games use 10-15% for ground shadows. At 25%, it creates a dark blob that competes with the sprite for attention.
- **`baseWidth = spriteWidth / 2.5`** makes the shadow too narrow relative to the sprite. Should be `spriteWidth / 2` or `/1.8`. Current value makes characters look like they're standing on a pencil.
- **`baseHeight = 4`** is hardcoded pixels, not relative to scale. At scale=3 with a 16×20 sprite, that's 4px vs 60px sprite height — reasonable, but would break at other scales.
- **Displacement of 2px** (line 14542) is good.
- **Shadow skew of 0.1** (lines 14545-14549) is subtle — could go to 0.15-0.2 for more character.
- **No shadow color variation.** The shadow should pick up a tiny bit of the floor color (tinted shadow). Pure black shadows are the hallmark of amateur rendering.
- **Shadow renders BEFORE the sprite** (line 14756 vs sprite at 14774) — this is correct! One of the few things in the right order.
- **Missing: shadow softness.** A single solid ellipse reads as a sticker. Use a radial gradient (dark center, transparent edge) for a contact shadow effect. This is table-stakes for modern pixel art.

### 5. Sub-Pixel Anti-Aliasing — 2/10

**Lines:** 14588–14660  
**What it does:** For every edge pixel, draws a 40%-scale semi-transparent rectangle at the midpoint between the pixel and empty space, in all 8 directions.

**This is the most problematic enhancement:**

- **Fundamentally wrong approach for pixel art.** Sub-pixel AA *destroys* the crisp pixel aesthetic that makes pixel art beautiful. Celeste, Dead Cells, Hyper Light Drifter — none of them anti-alias their character sprites. The whole point of pixel art at integer scale is sharp edges. AA is for high-res rendering.
- **The smoothing rectangles are drawn at sub-pixel positions** (e.g., `edgeX - smoothSize * 0.5`), which means the browser's own AA kicks in, creating blurry quarter-pixels around every single edge. This turns a crisp sprite into a fuzzy mess.
- **Checking all 8 neighbors for every filled pixel** = O(pixels × 8) additional draw calls per frame. For a 16×20 sprite, that's up to ~2,560 extra `fillRect` calls. With multiple sprites on screen, this is a serious performance concern.
- **The `lightenColor` helper** (line 14663) only handles hex colors. The sprite data also uses `0` (falsy/transparent) and potentially other formats. The `+ '80'` alpha append has the same fragility issue as rim lighting.
- **40% of pixel size as smooth size** at scale=3 = 1.2px rectangles. These render as blurry 1-2px smears. Not sub-pixel smoothing — just noise.
- **Applied uniformly to all skins.** If you *were* going to AA (you shouldn't), it should only be on specific skins that have curved/organic shapes, not angular robot sprites.

**My strong recommendation: Remove this entirely.** It fights against the pixel art aesthetic. If you want smoother sprites, increase the sprite resolution (go from 16×20 to 32×40) rather than post-process blurring.

---

## Overall Visual Quality Score: 4/10

**Not brand-worthy.** A brand partner looking at this would see:
- Fuzzy sprite edges (AA)
- Colored halos around characters (rim light too strong)
- Occasional wrong-colored eye patches (blink system)
- Generic shadows with no floor interaction

The existing `PremiumRender` system (walk profiles, breathing, head bob, squash-and-stretch) is actually **better** than these new enhancements. It has personality, per-skin tuning, and clean execution. The new enhancements feel bolted on rather than integrated.

---

## 🔴 Top 3 Issues Hurting Visual Quality

1. **Sub-pixel AA is actively destructive** (lines 14588-14660). It makes every sprite look blurry/dirty. This single enhancement drops the overall quality by 2 points. Remove it immediately.

2. **Rim lighting is too opaque and poorly positioned** (lines 14358-14399). At 50% alpha with -1px offset, it creates colored outlines that look like rendering errors, not lighting. Every sprite on screen looks "off" because of this.

3. **Eye blink uses hardcoded wrong-color skin tone** (line 14514, `#f5d6b8`). Green characters get flesh patches, robots get flesh patches. This is the kind of thing that makes players think the game is buggy.

---

## 🟢 Top 3 Quick Wins (Biggest Impact for Least Effort)

1. **Delete `addSubPixelSmoothing` entirely.** Zero code to write. Instant quality improvement. (Impact: +1.5 points)

2. **Fix shadow to use radial gradient + reduce alpha.** Change `renderDirectionalShadow` to use `createRadialGradient` instead of solid `fillStyle`, drop to `0.12` alpha, widen to `spriteWidth / 2`. ~10 lines of changes, makes every character look grounded. (Impact: +1 point)

3. **Reduce rim light alpha from `'80'` to `'28'` and remove the -1px offset.** Just change two values. Makes rim light subtle enough to add depth without creating halos. (Impact: +0.5 points)

---

## 💻 Specific Code Suggestions

### Rim Lighting (line 14379)
```javascript
// BEFORE:
ctx.fillStyle = accentColor + '80'; // 50% alpha — WAY too much

// AFTER:
ctx.fillStyle = accentColor + '26'; // ~15% alpha — subtle edge catch
```

### Rim Lighting offset (line 14387-14388)
```javascript
// BEFORE:
const rimX = x + col * scale + (hasEmptyLeft ? -1 : 0);
const rimY = y + row * scale + (hasEmptyTop ? -1 : 0);
ctx.fillRect(rimX, rimY, scale + (hasEmptyLeft ? 1 : 0), scale + (hasEmptyTop ? 1 : 0));

// AFTER: Draw ON the edge pixel, not outside it. No size increase.
const rimX = x + col * scale;
const rimY = y + row * scale;
ctx.fillRect(rimX, rimY, scale, scale);
```

### Specular Highlight intensity (line 14428)
```javascript
// BEFORE:
intensity = Math.max(0, intensity) * 0.7; // 70% white is blinding

// AFTER:
intensity = Math.max(0, Math.pow(intensity, 2.5)) * 0.35; // Sharper falloff, softer peak
```

### Specular sweep easing (line 14418)
```javascript
// BEFORE (linear):
const sweepPos = sweepPhase < 2 ? sweepPhase / 2 : 2 - sweepPhase / 2;

// AFTER (sine easing — fast center, slow edges):
const raw = sweepPhase < 2 ? sweepPhase / 2 : 2 - sweepPhase / 2;
const sweepPos = 0.5 - 0.5 * Math.cos(raw * Math.PI); // Sine ease in-out
```

### Eye Blink skin color (line 14514)
```javascript
// BEFORE:
const skinColor = '#f5d6b8'; // hardcoded single skin tone

// AFTER — derive from the sprite data around the eye:
let skinColor = '#f5d6b8'; // fallback
// Look at pixels adjacent to the eye for the actual face color
const neighbors = [
  grid[row]?.[col-1], grid[row]?.[col+1],
  grid[row-1]?.[col], grid[row+1]?.[col]
].filter(c => c && c !== '.' && c !== '#000' && c !== '#222' && c !== '#111' && c !== '#000000' && c !== '#222222');
if (neighbors.length > 0) skinColor = neighbors[0]; // Use nearest non-eye face pixel
```

### Shadow softness (replace lines 14572-14574)
```javascript
// BEFORE:
ctx.fillStyle = 'rgba(0,0,0,0.25)';
ctx.beginPath();
ctx.ellipse(0, 0, baseWidth * widthMod, baseHeight * heightMod, 0, 0, Math.PI * 2);
ctx.fill();

// AFTER — gradient contact shadow:
const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, baseWidth * widthMod);
grd.addColorStop(0, 'rgba(0,0,0,0.15)');
grd.addColorStop(0.5, 'rgba(0,0,0,0.08)');
grd.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = grd;
ctx.beginPath();
ctx.ellipse(0, 0, baseWidth * widthMod * 1.3, baseHeight * heightMod * 1.5, 0, 0, Math.PI * 2);
ctx.fill();
```

### Performance: Cache edge detection
```javascript
// The rim light and AA both scan every pixel every frame looking for edges.
// Pre-compute an edge map once per skin and cache it:
_edgeCache: {},
getEdgeMap(grid, skinId) {
  if (this._edgeCache[skinId]) return this._edgeCache[skinId];
  const edges = [];
  for (let row = 0; row < grid.length; row++) {
    edges[row] = [];
    for (let col = 0; col < grid[row].length; col++) {
      const c = grid[row][col];
      if (!c || c === '.') { edges[row][col] = 0; continue; }
      const hasEmptyLeft = col === 0 || !grid[row][col-1] || grid[row][col-1] === '.';
      const hasEmptyTop = row === 0 || !grid[row-1]?.[col] || grid[row-1][col] === '.';
      const hasEmptyRight = col >= grid[row].length-1 || !grid[row][col+1] || grid[row][col+1] === '.';
      const hasEmptyBottom = row >= grid.length-1 || !grid[row+1]?.[col] || grid[row+1][col] === '.';
      edges[row][col] = (hasEmptyLeft?1:0)|(hasEmptyTop?2:0)|(hasEmptyRight?4:0)|(hasEmptyBottom?8:0);
    }
  }
  this._edgeCache[skinId] = edges;
  return edges;
}
```

---

## 🕳️ What's Missing (AAA Pixel Art Standard)

### Must-Have (Expected at "brand collab" quality):

1. **Ambient occlusion / contact darkening.** Where the sprite meets the ground, where arms meet the body — subtle darkening at intersection points. Dead Cells does this beautifully. Currently sprites float.

2. **Color-coherent palette lighting.** The entire scene should have a unified color temperature. Currently each enhancement uses independent color logic. Need a global `lightColor` / `shadowColor` / `ambientColor` that all systems reference.

3. **Sprite outline system.** Not rim lighting — a clean 1px dark outline around the entire sprite that provides readability against any background. This is what makes pixel art characters "pop." Celeste uses dark outlines, Eastward uses colored outlines, HLD uses context-sensitive outlines.

4. **Per-skin eye positions stored in data**, not detected at runtime. Eyes should be defined as `{left: {row, col}, right: {row, col}}` in the skin data. Runtime color-matching is unreliable and expensive.

5. **Emission / glow pixels.** Certain pixels should glow (eyes on certain skins, energy effects, weapons). This needs a separate "emissive" layer in the sprite data, rendered additively.

### Nice-to-Have (Differentiators):

6. **Normal-mapped pixel lighting.** Store a simplified per-pixel normal direction (4 or 8 directions) and light pixels based on their facing. This is what gives Dead Cells its incredible depth.

7. **Palette swapping for time-of-day.** Shift the entire skin palette warmer at sunset, cooler at night. One `hue-rotate` + `saturate` filter on the canvas isn't enough — you need per-pixel palette remapping.

8. **Motion blur on fast movement.** During dashes, render 2-3 ghost frames behind the sprite with decreasing alpha. The dash system already exists (line 14733) but there's no motion trail.

9. **Particle integration with sprite bounds.** Current particles (SkinParticles, footsteps) spawn from the sprite's bounding box center. They should spawn from specific attachment points — feet for dust, hands for energy, head for auras.

10. **Dynamic sprite resolution.** The player's own sprite could render at 2x resolution (32×40) while distant/other players stay at 16×20. This creates a natural depth-of-field hierarchy.

---

## Architecture Concerns

1. **Enhancements are applied AFTER PremiumRender**, which means they draw on top of already-modified pixel positions (walk stride offsets, breathing shifts). The rim light and specular don't account for these position shifts — they use the original grid coordinates. This means **highlights and rim light are misaligned** with the actual rendered pixels during movement.

2. **Enhancement calls are duplicated** in both `renderWalk` (line 14266-14270) and `renderIdle` (line 14347-14351). This should be a single call after the premium render, or better yet, integrated INTO the render loop.

3. **No `ctx.save()`/`ctx.restore()` wrapping the enhancement block** as a whole. Each enhancement does its own save/restore, but if one throws, the canvas state leaks.

4. **The enhancements don't respect the existing transform stack** (squash/stretch, dance rotation, dash deformation set at line ~14770). Enhancements draw in world space while the sprite is in transformed space.

---

## Priority Action Plan

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| P0 | Delete sub-pixel AA | +1.5 | 5 min |
| P0 | Fix rim light alpha (50% → 15%) | +0.5 | 2 min |
| P1 | Gradient shadow + wider base | +1.0 | 20 min |
| P1 | Fix eye blink: derive skin color from neighbors | +0.5 | 15 min |
| P1 | Add per-skin eye positions to skin data | +0.5 | 30 min |
| P2 | Specular: add easing + tint by skin color | +0.5 | 15 min |
| P2 | Add sprite outline system (1px dark edge) | +1.0 | 45 min |
| P2 | Move enhancement calls inside transform stack | +0.5 | 30 min |
| P3 | Add emissive pixel layer | +1.0 | 2 hr |
| P3 | Global scene lighting color | +0.5 | 1 hr |

**If you do just P0 + P1, you go from 4/10 → ~6.5/10.**  
**Add P2, you're at ~8/10 — brand-worthy territory.**

---

## Final Verdict

The vision is right. The execution needs a tuning pass by someone who's willing to sit with the game open, tweaking one value at a time, for a few hours. The biggest sin is the sub-pixel AA — it actively hurts the aesthetic. The biggest missed opportunity is the shadow system, which is *almost* good and just needs a gradient and wider radius.

Kill the AA, tune the numbers, add outlines, and you'll have something that looks intentional rather than generated. That's the difference between "indie game with effects" and "polished pixel art that brands want their characters in."

— *Review complete. Ready for Cycle 2.*
