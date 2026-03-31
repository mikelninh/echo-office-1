# 🌙 Overnight Build Plan — Visual Polish Sprint
**Date**: 2026-02-17 → 02-18
**Goal**: Take the game from "average" to "brand-worthy excellence"
**Constraint**: One focused task per cycle, always syntax-check, always commit

---

## The Problem
The game has 57 skins but the visual quality is inconsistent. Some sprites look generic. The rendering pipeline has good bones (PremiumRender, SkinParticles, etc.) but needs more love. For brands to want to collaborate, every pixel needs to feel intentional.

## Priority Order

### Cycle 1 (NOW → ~2:30 AM): Skin Visual Upgrade Pass
**Scope**: Improve the sprite rendering pipeline — not rewriting 4800 lines of pixel data, but making what we have LOOK better through rendering enhancements.

What makes sprites look premium:
- **Sub-pixel rendering**: Anti-alias edges with half-alpha pixels
- **Dynamic lighting on sprites**: Characters should react to floor lighting
- **Specular highlights**: Metallic skins (robot, ironsuit) get a moving light reflection
- **Rim lighting**: Subtle bright outline on the light-facing side
- **Cast shadow detail**: Not just an ellipse — proper directional shadow
- **Breathing animation**: Already exists but could be richer (chest expand, subtle sway)
- **Skin-specific idle animations**: Each skin has a unique idle (ninja: arms crossed flicker, saiyan: power stance micro-squats, ghost: float bob, etc.)
- **Eye blink**: 2-frame blink every 3-5 seconds on skins with visible eyes
- **Hair/cloth physics**: Sub-pixel movement on hair, capes, scarves based on movement direction

### Cycle 2 (~4:00 AM): Ghibli-Inspired Visual Magic + Floor Polish
**Scope**: Make floors feel ALIVE with Studio Ghibli-inspired warmth and magic.

**Garden Floor (F4) — "The Spirit Forest":**
- Kodama tree spirits: tiny white bobble-head sprites near plants, vanish when approached
- Firefly swarms: 15-20 golden particles in lazy figure-8 paths, faint trails
- Sunbeam shafts: diagonal light beams with visible dust motes inside

**Observatory (F2) — Laputa Layer:**
- Floating island in the dome: overgrown silhouette with vines, slowly bobbing
- Rain on dome: water droplets sliding down the glass (10% chance or weather-triggered)

**Penthouse (F1) — Calcifer's Kitchen:**
- Fireplace face: 2 pixel eyes that blink (Calcifer vibes)
- Cooking implements on mantle
- Enhanced window dust motes

**Future ideas (not this cycle):**
- Floor 13: "The Bathhouse" (Spirited Away)
- Ghibli skins: forest_spirit, witch_apprentice, sky_pirate, wolf_rider, soot_sprite
- Procedural ambient music (pentatonic + major 7th, Web Audio API)
- Weather system: rain, wind (sways grass/hair), cloud shadows
- Ghibli cooking station with animated food

### Cycle 3 (~8:00 AM): UI & Polish Pass
**Scope**: Every UI element should feel designed, not coded.

- Shop UI: Canvas-rendered item previews with animated backgrounds per rarity
- Elevator transitions: Smoother, themed per floor
- Chat bubbles: Prettier, with typing indicator
- Minimap: Higher detail, real-time position smoothing
- Coin counter: Animated increment, sparkle on earn
- Health/energy bars: Smooth interpolation, glow effects

---

## Safety Rules
1. ONE system per commit
2. Always `vm.createScript()` syntax check before commit
3. Never refactor structure — only additive changes
4. If unsure, write a design doc instead of code
5. Commit messages describe exactly what changed
6. Write progress to `memory/2026-02-18.md` after each cycle

## Current File Stats
- `index.html`: 43,172 lines, 2.0MB
- Sprite function: ~4800 lines (lines 4532-9356)
- Render pipeline: ~1000 lines (lines 14340-15360)
