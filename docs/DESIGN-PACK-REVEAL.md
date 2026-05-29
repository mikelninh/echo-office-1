# DESIGN — Pack-Opening & Collectible Reveal (Ethical, Gambling-Safe)

> Status: Buildable spec for engineering. Vanilla JS, Canvas 2D + Web Audio, no build step, no external assets/fonts. Pixel-art discipline (integer scaling, limited palettes, dithering over gradients).
>
> Canon ground: `docs/VISUAL-DESIGN.md` (MEAN/DO/FEEL, floor palettes), `docs/COLLECTIBLES-VISION.md` (rarity reveal language), `docs/SKIN-PREMIUM-VISION.md` (tiers), and the **binding charter** `docs/ETHICAL-MONETIZATION.md`.

---

## 0. Canon reconciliation (read before building)

`COLLECTIBLES-VISION.md` predates the charter and contains three things this spec **deliberately overrides**, because `ETHICAL-MONETIZATION.md` supersedes them (its own §"On pack-openings and collectibles specifically" + Red Lines):

| In COLLECTIBLES-VISION | Why it conflicts | What this spec does instead |
|---|---|---|
| "Holy Grail (€5K+)", live eBay/TCGplayer market price tickers, "Collection Worth: €XX,XXX" | Ties reveals to real cash value / speculation → gambling + power-by-proxy framing | Holy Grail is a **cosmetic prestige tier**, no cash value, no market ticker. Worth shown only in ◈ "collection score," opt-in, non-monetary. |
| "Envy engine: seeing someone's collection motivates collecting. This is by design." | Manufactured envy = a pressure dark pattern | We keep *visible pride* (display cases, light cast) but **remove the spend-nudge/envy framing**. No "I want this too → buy" CTA pointing at a cash gate. |
| SKIN-PREMIUM "Legendary 2000◈ / **Loot only**", "Mythic / **Ultra-rare loot**" | "Loot only" = no deterministic path | Every tier is **always direct-buyable for a published price**. Packs are a cheaper, optional, *earned-currency* surprise — never the only path. |

The **reveal *presentation* is fully preserved and amplified** (shimmer, build-up, spotlight, fanfare, screen shake, gold aura). The charter is explicit: *"Keep the dopamine in the presentation, drop the gamble."* This spec puts 100% of the dopamine in showmanship and 0% in chance-for-cash.

**The two legal acquisition paths (charter §2), surfaced everywhere a pack appears:**
- **(a) Earned-currency packs** — opened only with **◈ earned in play** or **RP**. Never purchasable with cash. These are a *play reward*, with **published odds** shown before opening.
- **(b) Direct-buy** — "you get exactly what's shown" at a published price (◈ or real money for cosmetics), always available alongside any pack.

A reveal screen is illegal under our charter if it can be reached by spending **cash on a randomized result with no direct-buy alternative**. The UI structurally prevents this (§5).

### MEAN / DO / FEEL (every element must answer ≥2)
- **MEAN:** Collectibles are *memories of play* — you earned the ◈ by exploring, dueling, doing citizen-science. The reveal is a small ceremony honoring that effort.
- **DO:** Grants cosmetics only (display items, room decor, profile cards). Never power, stats, ELO, or buyable achievements (charter Red Lines).
- **FEEL:** The thrill of *unwrapping*, not the anxiety of *gambling*. You always already know the odds, and you could have just bought the thing — so the surprise is pure delight, never regret.

---

## 1. THE PACK SHOP (before opening)

**Concept & emotional target:** "This is a treat I earned. I can see exactly what's inside the odds, and I could just buy the one I want — so opening a pack is *fun*, not a bet." Premium, calm, confident — never preachy, never pushy.

**Lives on:** Arcade floor prize counter (`docs/VISUAL-DESIGN.md` Floor 3 "Prize counter upgrade") for the playful packs; Archive floor gallery (Floor 9) for prestige display. Shop overlay uses the **Arcade palette** by default; the prestige/Archive context uses the Archive palette.

### IP-safe product names (no real-IP collabs)
- **Stardust Pack** (entry, playful) — Arcade-themed cosmetic trinkets.
- **Echo Crate** (standard) — mixed-floor cosmetics.
- **Orbital Cache** (premium prestige) — Archive-grade display pieces.
- **Founder's Reliquary** (event/seasonal) — ties to Orbital Pass.

(All original. No League/TFT/Fortnite/Pokémon/Yu-Gi-Oh names or assets — the Yu-Gi-Oh/VeVe framing in COLLECTIBLES-VISION is inspiration only; renders are original "Echo Cards" / "Station Relics.")

### Layout (overlay, 16:9 reference 960×540, integer-scaled)
```
+---------------------------------------------------------------+
|  ECHO CRATE                              [X close]   z=100    |
|  "A handful of station souvenirs."                            |
|---------------------------------------------------------------|
|   [ Pack art: holo crate,  ]   ODDS (always visible)   z=60   |
|   [ slow idle shimmer, 96px ]   Common      .......  62%      |
|   [ cast light on counter   ]   Rare        .......  26%      |
|                                 Ultra       .......   9%      |
|   COST TO OPEN:                 Secret      .......  2.5%     |
|   ◈ 120  (earned)               Holy Grail  .......  0.5%     |
|   — or —  RP 3                  [guaranteed Rare+ floor: yes] |
|                                                               |
|   [  OPEN WITH ◈ 120  ]   <- primary, earned-currency only    |
|                                                               |
|   ── Prefer to pick exactly? ───────────────────────  z=60    |
|   [ BUY EXACTLY WHAT YOU WANT ]  -> opens Direct-Buy catalog  |
|   Every item here is buyable directly. No pack required.      |
|                                                               |
|   [How this stays fair v]  (expandable ethics callout, §6)    |
+---------------------------------------------------------------+
```

**Hierarchy / safe-zones:** Pack name + odds are the two largest non-art elements — odds are never collapsed, never behind a tooltip, never on a second screen (charter §2b: "published odds and an always-available buy-exactly path"). The **OPEN** button and the **BUY EXACTLY** button are equal visual weight (same size, same prominence) — we never make the direct path smaller or greyer (charter §3: "reduce friction to NOT spend as carefully as friction to spend"). Top 64px and bottom 48px kept clear for a **clean/OBS mode** (toggle hides cost/currency for streamers; reveal visuals stay).

### Palette (canon — Arcade)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0a0a1a` | overlay backdrop (neon black) |
| `--accent-pink` | `#ff6ec7` | primary CTA, pack name |
| `--accent-cyan` | `#00fff7` | odds bars, secondary highlights |
| `--ink` | `#e8e8f0` | body text |
| `--muted` | `#8a8aa0` | helper text |
Prestige/Archive context swaps to: `--bg #0a0820`-on-`#1a1a22`, gold `#ffd700`, white `#fff`, cosmic blue `#4488ff`.

### Odds table (cosmetic only; example tuning, see `docs/ECONOMICS.md` rarity weights)
| Tier | Published odds | Direct-buy price (always offered) |
|---|---|---|
| Common | 62% | ◈ 20 |
| Rare | 26% | ◈ 50 |
| Ultra | 9% | ◈ 150 |
| Secret | 2.5% | ◈ 500 |
| Holy Grail | 0.5% | ◈ 2000 *(or its event direct-buy listing)* |

**Anti-dark-pattern rules baked into the shop (charter §3, Red Lines):**
- No countdown timers, no "X left!", no "discount expires" — none, anywhere on this overlay.
- No "you're so close" / pity-teasing copy. (A *guaranteed Rare+ floor*, if used, is stated plainly as a fact, not dangled.)
- Cash never appears on the **OPEN** button — only ◈/RP. If a player has insufficient ◈, the button shows "Earn ◈ by playing" and links to activities, **never** "Buy ◈" with cash for this purpose.
- Minor-aware: monthly spend summary + self-set spend limit reachable from the [How this stays fair] panel.

---

## 2. THE OPENING SEQUENCE (state machine)

**Concept & emotional target:** anticipation that *builds and pays off* — a tiny ceremony. The drama scales with the rolled rarity, mirroring COLLECTIBLES-VISION's escalation. Total length is short (common ~1.3s, Holy Grail ~5.5s) so it never feels like a slot-machine stall.

**Z-order (back→front):** `z0` floor/counter & cast light · `z10` backdrop dim · `z20` pack object · `z30` particles (back) · `z40` revealed item card · `z50` particles (front)/light rays · `z60` UI chrome · `z90` flash/vignette · `z100` skip button.

The rarity is **rolled server-side before the animation** (deterministic outcome; the animation only *presents* it — no "the longer the spin the better" manipulation). A persistent **[Skip ▸]** (z100, top-right) is available from the first frame; skipping jumps straight to SETTLE with the full item shown (never penalized, never hidden).

### States (timings are the *Rare* baseline; per-tier multipliers in §3)

| # | State | Dur (ms) | Easing | What happens (layers) |
|---|---|---|---|---|
| S0 | ARM | 150 | `easeOutQuad` | Backdrop dims to `--bg` at 82% alpha (z10). Pack art slides to center, scales 96→128px. Audio: soft sub "thunk" (sine 80Hz, 120ms, gain 0.15). |
| S1 | ANTICIPATION | 350 | `easeInOutSine` | **Squash/stretch**: pack does a 0.92→1.06→1.0 breathing pulse. Cyan rim-light pulse around pack (z30, additive). Faint particle motes rise (z30, 6/s). Audio: rising tone, triangle 220→440Hz over 350ms, gain 0.08 (the "charge"). |
| S2 | BUILD | 250 | `easeInQuad` | Pack rattles (±2px x-jitter, integer), light intensifies. Particles accelerate (z30→z50). For Ultra+ the screen edges begin a soft vignette glow (z90). Audio: shimmer — detuned saw pair 660Hz + 663Hz, gain ramps 0.05→0.12. |
| S3 | CRACK | 120 | `easeOutBack` | **Anticipation snap**: pack scales to 1.12 then the lid "pops" (top half sprite flips off, z20). **Hit-stop**: freeze all motion 60ms. White flash (z90) alpha by tier. Audio: percussive "crack" (noise burst 40ms through highpass + sine 120Hz click). |
| S4 | REVEAL | tier | `easeOutCubic` | Item card rises from pack (z40), scales 0→1, foil/shimmer begins. Light rays / aura by tier (z50). See §3 per-tier. Audio: tier stinger (§3). |
| S5 | SETTLE | 400 | `easeOutQuad` | Card eases to rest position, gentle idle shimmer loop begins. Name + rarity label fade in (z60) with a **colorblind-safe rarity glyph** (§5). Buttons fade in: `[Add to Collection]` `[Open Another]` `[View in Display Case]`. Particles decay to ambient. Audio: warm resolve chord (two sines, root + fifth, 600ms soft attack/release). |

**Multi-pack / "open all":** packs reveal sequentially with a 250ms gap; a **[Reveal All]** fast-path plays only S4/S5 condensed (700ms each) so bulk opens never become a long stall. Highest-rarity result in the batch gets its full per-tier drama; lowers are condensed. No "drip-feed to chase" pacing — order is shuffle-stable, not best-last.

### Reduced-motion sequence (prefers-reduced-motion)
S0–S3 collapse into a single 250ms cross-fade: pack fades out, card fades in. No shake, no jitter, no flash >150ms, no strobe. Stinger replaced by a single soft 200ms tone. Outcome identical.

---

## 3. THE REVEAL MOMENT — rarity escalation table

Mirrors `COLLECTIBLES-VISION.md` rarity language (Common → Rare → Ultra → Secret → Holy Grail), drama strictly increasing. **Rarity is never communicated by color alone** (§5).

| Tier | Color (canon) | S4 dur | Card entrance | Light/FX (z40–z90) | Camera shake | Particles | Audio stinger (Web Audio) |
|---|---|---|---|---|---|---|---|
| **Common** | cool grey `#8a8aa0` + white outline | 350ms | scale 0→1 `easeOutCubic`, no spin | subtle 1px border glow, no rays | none | 4 motes, fade in 300ms | single sine 523Hz (C5), 180ms, gain 0.1 |
| **Rare** | cosmic blue `#4488ff` | 500ms | scale + 1 gentle Y-spin (180°) | foil shimmer sweep (diagonal highlight, 1.2s loop), faint blue rim | tiny 1px, 80ms | 12 sparkles, drift up | two-note rise sine 523→659Hz, 260ms, gain 0.12 + soft "ting" (sine 1568Hz, 60ms) |
| **Ultra** | nebula purple `#6a32aa` | 800ms | scale + 2 spins, slight overshoot `easeOutBack` | rotating holographic hue-cycle on card face, purple aurora ribbon behind (z40, 2 layers, additive), light vignette | 2px, 140ms, decays | 28 sparkles + 1 ring-burst on land | arpeggio 3 sines 523/659/784Hz staggered 60ms, gain 0.14, + airy noise swell |
| **Secret** | hot pink `#ff6ec7` + cyan `#00fff7` dual-tone | 1200ms | scale, 3 spins, dramatic overshoot, brief float | pulsing rainbow border (hue loop 0.8s), **lens flare** sweep across card (z50, 600ms), radial light rays (8 spokes, z50, slow rotate) | 4px, 220ms, two-stage (hit then settle) | 60 sparkles, ring-burst + lingering glitter fall | 4-note fanfare (square+sine layered, 523/659/784/1047Hz), gain 0.16, + reverse-cymbal swell (filtered noise rising 500ms) |
| **Holy Grail** | gold `#ffd700` + white `#fff`, cosmic blue `#4488ff` accents | 2200ms | the **full-screen ceremony** (below) | see ceremony | 8px peak, 500ms, multi-stage with hit-stops | 120+ gold particles, light-ray god-beams, dust motes in beam | full stinger (below) |

### Holy Grail full-screen ceremony (the "Holy Grail" of COLLECTIBLES-VISION, charter-safe)
Switches to **Archive palette** regardless of where opened (it is a Legacy-tier moment).
1. **Pre-flash blackout** (120ms): screen cuts to near-black `#0a0820`, all SFX duck. Hit-stop. (Anticipation by absence.)
2. **Lightning crack** (180ms): 2–3 jagged white-gold bolts (z90) drawn as 1px polylines with additive glow, screen flash to `#fff` 60ms then `#ffd700` 80ms. **Camera shake 8px** decaying. Audio: layered noise-crack + sine 90Hz thump (gain 0.22) + descending "boom."
3. **Beam descent** (500ms): a vertical god-beam (z50, gold gradient *rendered as dithered bands*, not a smooth gradient) descends from top; dust motes rise inside it. Card materializes at beam base, scaling 0→1 `easeOutCubic` with white core glow.
4. **Aura bloom** (700ms): golden aura expands radially (3 dithered rings, z50), light rays rotate slowly behind card (12 spokes). Lens flare crosses once. Card begins luxe holo idle.
5. **Title card** (700ms): "HOLY GRAIL" wordmark + item name fade in (z60) in gold/white with cosmic-blue underglow, rarity glyph (filled diamond ◆, §5). Audio: triumphant chord progression (3 layered sine/triangle voices, ~1.5s, soft attack), single bell tone (sine 2093Hz, 400ms, long release).
6. **Settle** to display-case preview, offer `[View in Display Case]`.

**Important ethical note on the ceremony:** the same drama plays for a **direct-bought** Holy Grail (you paid the listed price and *chose* it) — the spectacle is decoupled from chance. This proves the dopamine is in presentation, not gambling.

### Juice checklist (per tier, cumulative)
- **Screen shake:** none → 1px → 2px → 4px → 8px (integer offsets, decaying, capped; disabled in reduced-motion).
- **Particles:** motes → sparkles → ring-burst → glitter-fall → god-beam dust (object-pooled).
- **Squash/stretch:** pack pulse in S1; card overshoot scales from Rare up.
- **Hit-stop:** 60ms at S3 CRACK for all; extra hit-stops in Holy Grail steps 1 & 2.
- **Anticipation/follow-through:** S1 charge + S3 overshoot; card bobs once on land (follow-through).
- **Light rays / lens flare:** Secret (rays + flare), Holy Grail (god-beam + rotating rays + flare).
- **Sound stingers:** as table; all via oscillators + filtered noise (Web Audio), no audio files. All gains ≤0.22; respect a master mute and the reduced-motion soft-tone substitution.

---

## 4. THE COLLECTION / DISPLAY CASE (where items live after)

**Concept & emotional target:** quiet pride. "These are mine, earned, and they look gorgeous on the shelf." Ties to **Archive floor** aesthetic (`docs/VISUAL-DESIGN.md` Floor 9 — cathedral, gold particles, hologram light) and COLLECTIBLES-VISION's holographic cases + light-cast-on-floor.

### Layout — the Display Hall (Archive sub-zone) + personal Quarters wall
- **Holographic cases:** each owned item floats in a glass case (pixel-art frame: bronze=Rare, silver=Ultra, gold=Secret/Holy Grail) with animated shimmer. Integer-scaled, readable silhouette at 64×64 (shop), 128×128 (detail).
- **Light cast on floor:** each case projects a colored light pool onto the floor below in its rarity color (dithered, soft). Holy Grails get a **dedicated overhead spotlight beam** with dust motes (per COLLECTIBLES-VISION "Holy Grails In Your Room"), but **no market-value ticker** — replaced by an optional ◈ "Collection Score" (non-cash, charter §0).
- **Empty slots** show a faint dithered outline + the item silhouette greyed (so players see what *exists* to collect — preview-before-buy spirit), with the **direct-buy price** on hover. No "you're missing N!" guilt copy.
- **Re-open joy:** tapping any owned case replays its reveal ceremony ("because it never gets old," COLLECTIBLES-VISION) — free, no currency, no chance.

### Palette (canon — Archive)
| Token | Hex | Use |
|---|---|---|
| `--arch-bg` | `#0a0820`/`#1a1a22` | hall backdrop |
| `--gold` | `#ffd700` | Holy Grail frames, spotlights, ascending particles |
| `--white` | `#ffffff` | core glints, legacy text |
| `--cosmic` | `#4488ff` | hologram light, case rim glow |

### Motion spec
- Cases idle: holo shimmer sweep 1.5s loop; ambient gold particles drift **upward** (Archive "ascension" motif), 1/s.
- Hover/focus case: case scales 1.0→1.06 (120ms `easeOutQuad`), light pool brightens, name+glyph label fades in (z60).
- Open detail view: case expands to 128px detail with parallax tilt on pointer/gyro (clamped ±6°); reduced-motion → static.

### Social / profile (envy-engine removed)
- Display top 3 on your profile card (kept from COLLECTIBLES-VISION) — **as pride, not pressure.** No "I want this too → cash" CTA; a visitor can tap an item to see its **direct-buy price and how to earn ◈ for it**, framed neutrally. No real-money worth counter.

### Accessibility
- Every case carries its rarity **glyph + label text**, not color alone (§5).
- Spotlight/shimmer obey reduced-motion (become static glow).
- Light pools never reduce text contrast below WCAG AA for labels.

---

## 5. ACCESSIBILITY & RARITY CUES (cross-cutting)

**Colorblind-safe rarity cues — never color alone** (each tier has a unique GLYPH + LABEL + MOTION signature):
| Tier | Glyph | Label | Border pattern | Motion signature |
|---|---|---|---|---|
| Common | `·` small dot | "COMMON" | thin solid 1px | static |
| Rare | `◇` open diamond | "RARE" | solid 2px | single shimmer sweep |
| Ultra | `◈` faceted diamond | "ULTRA" | double-line | hue-cycle |
| Secret | `✦` four-point star | "SECRET" | dashed animated | rainbow pulse |
| Holy Grail | `◆` filled diamond + rays | "HOLY GRAIL" | ornate corners | god-beam |

- **Glyph + word always render** alongside any color treatment, in shop, reveal, and cases.
- **Reduced-motion:** §2 fallback (cross-fade), no shake, no strobe, no flash >150ms, no hue-strobe; stingers → single soft tone. Honors `prefers-reduced-motion`.
- **Audio:** all SFX optional + muteable; nothing is communicated by sound alone.
- **Readability at small/mobile sizes:** silhouettes legible at 64px; odds table uses bars **plus numeric %** (never bars alone); minimum tap target 44×44px.
- **Photosensitivity:** lightning/flash capped at 2 flashes within the Holy Grail ceremony, each <120ms, never full-strobe; reduced-motion removes them entirely.

---

## 6. "HOW THIS STAYS FAIR" — the in-UI ethics callout

A small **[How this stays fair ▾]** disclosure lives on every pack shop overlay (collapsed by default, one tap to expand). Tone: confident and warm, **not preachy** — short factual lines the player can verify in the UI itself.

> **How this stays fair**
> - **Odds are shown up front.** What you see above is the real chance for each tier.
> - **You can always just buy the exact item** at the listed price — no pack required.
> - **Packs only open with ◈ you earned by playing, or with RP.** Never with cash.
> - **Cosmetics only.** Nothing here affects power, stats, or rankings.
> - **No timers, no pressure.** Take all the time you want.
> - [Set a spend limit] · [See my monthly summary] · [Read our promise →] (links `docs/ETHICAL-MONETIZATION.md`)

**Why this earns its place (MEAN/DO/FEEL):** MEAN — it's the station keeping its promise visibly; DO — it gives real controls (limit, summary, direct-buy); FEEL — trust, which is what makes the *surprise* feel like a gift instead of a gamble.

---

## 7. Engineering hand-off notes

- **Files this spec touches (where the engineer wires it in):**
  - Pack shop overlay + reveal: new module, mount on Arcade prize counter (`docs/VISUAL-DESIGN.md` Floor 3) and Archive gallery (Floor 9).
  - Odds/currency rules: align with `docs/ECONOMICS.md` (◈ faucets/sinks; RP earn-only per charter Red Line "Make RP buyable ❌").
  - Display Hall: Archive floor sub-zone per `docs/VISUAL-DESIGN.md` Floor 9 + COLLECTIBLES-VISION "Holy Grails In Your Room."
- **Determinism:** roll outcome server-side first; animation is pure presentation (no outcome-by-duration). Persist published odds with the build so the shown table provably matches the roll table.
- **Rendering:** Canvas 2D, integer scaling, dithered bands instead of smooth gradients for beams/auras; object-pool particles. No external fonts — use the station's existing pixel bitmap font.
- **Audio:** Web Audio oscillators + filtered noise only (no asset files); shared master gain + mute; reduced-motion path swaps stingers for one soft tone.
- **Structural ethics guard:** the reveal component must be unreachable from any **cash → randomized result** path. Cash buttons may only appear on **direct-buy** (deterministic) flows; the **OPEN** path accepts ◈/RP only. Add an assertion/lint at the call site.

---

### Pseudo-snippet — state pacing (illustrative only, not production)
```
const TIER = { common:1, rare:1.4, ultra:2.0, secret:2.8, grail:4.0 };
function revealDuration(tier){ return 350 * TIER[tier]; }   // S4 length
// drama(tier) -> { shakePx, particles, rays, flare, lightning } from §3 table
// prefersReducedMotion -> collapse S0..S3 into one 250ms crossfade, no shake/flash
```

*Every pixel must earn its place — and every reveal must earn the player's trust. The thrill is in the unwrapping; the fairness is in plain sight.*

*Spec authored 2026-05-29.*
