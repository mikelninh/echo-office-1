# Animal Well → Echo Station: Inspiration Plan

## What Makes Animal Well Special

Animal Well is a solo-dev Metroidvania puzzle-platformer that won DICE Game Direction 2024. Key brilliance:

### 1. **Layered Secrets (The Onion)**
- Game has 3+ "layers" of completion — you beat it, then realize you've seen 30% of the game
- Hidden rooms, invisible paths, secrets-within-secrets
- Community collaboration needed for deepest puzzles (Discord detectives)
- **Lesson:** Don't show everything. Let players discover depth over time.

### 2. **Items Change How You See The World**
- A bubble wand, a frisbee, firecrackers, a yoyo — simple tools, complex interactions
- Each item makes you re-examine rooms you've already visited
- **Lesson:** Every new ability should make old spaces feel new.

### 3. **Environmental Storytelling Without Words**
- No text, no dialogue, no tutorials
- Animals behave in patterns — you learn by watching
- Architecture tells the story — crumbling, overgrown, ancient machines
- **Lesson:** Show, don't tell. Let the environment speak.

### 4. **Dense, Interconnected World**
- 16×16 grid of rooms, all connected with obvious AND hidden paths
- Every room has a purpose — no filler
- Backtracking feels rewarding, not tedious (new items unlock new paths)
- **Lesson:** Small world, densely packed > sprawling emptiness.

### 5. **Atmosphere Over Action**
- Murky, mysterious, sometimes unsettling
- Animals are beautiful but dangerous
- Lighting and shadow are gameplay mechanics
- Sound design creates tension and wonder
- **Lesson:** Mood is a feature. Make spaces feel alive and mysterious.

### 6. **Solo Dev, Custom Engine, 7 Years**
- Billy Basso built EVERYTHING — engine, art, sound, design
- Invented mechanics first, then derived puzzles from interactions
- **Lesson:** Constraint breeds creativity. One file, one dev, make it count.

---

## Echo Station: The Animal Well Treatment

### Phase 1: Hidden Depth (Sprint Priority ⭐)

**Secret Rooms & Passages**
- Each floor gets 1-2 hidden areas (tap specific pixels, walk through fake walls)
- F1: Behind the bed — Echo's secret diary room
- F2: Telescope points to a star → unlocks a constellation puzzle
- F4: Garden has a hidden underground cave (plant a specific seed combo)
- F5: Secret Lab has a hidden experiment log (piece together Echo's origin)
- F6: Record player plays a song backwards → reveals coordinates
- F9: The Archive has rooms within rooms (fractal depth)

**Discovery Items**
- **Scanner** — reveals hidden interactables (like Animal Well's UV light equivalent)
- **Grapple Hook** — reach new areas on existing floors
- **Phase Boots** — walk through certain walls (marked with subtle pixel patterns)
- **Echo Lens** — see the station "as it was" (ghost overlay of past state)

**"I've Only Seen 30%"**
- Track discovery percentage per floor
- Total station discovery shown on save (e.g., "Station Mapped: 34%")
- Players who think they're done are actually barely started

### Phase 2: Environmental Puzzles

**Room-Based Puzzles (Animal Well's Core)**
- Each floor has a self-contained puzzle that uses floor-specific mechanics
- F2 Observatory: Align telescope → star pattern → unlock constellation skin
- F3 Arcade: Beat all 4 games → secret 5th game appears (meta-puzzle)
- F4 Garden: Grow plants in specific pattern → they form a key
- F5 Lab: Combine 3 experiment results → create a new item
- F7 Community: Arrange NPCs in specific positions → they reveal a code

**Cross-Floor Puzzles**
- Clue on F1 → action on F4 → reward on F9
- Elevator itself is a puzzle (press floors in specific order → secret floor)
- Items found on one floor are keys for another

**Animal Behavior Patterns**
- Pixel the cat wanders with PURPOSE — follows invisible paths, stops at secrets
- NPCs have routines — watching them reveals clues
- Echo occasionally looks at something specific — that's a hint

### Phase 3: Atmosphere Overhaul

**Lighting as Gameplay**
- Dark areas where you need the Scanner to see
- Light sources you can carry/place (lanterns, glow seeds from garden)
- Shadow puzzles — cast shadows in the right shape to unlock doors
- Time-of-day affects which secrets are visible

**Sound as Discovery**
- Each floor has ambient layers that change near secrets
- Musical puzzle on F6 — play notes in correct order
- Pixel purrs louder near hidden items
- Subtle audio cue when you're near a secret wall

**The Station Breathes**
- Pipes creak, hull groans in space
- Occasional "something moved" in peripheral vision
- Windows show different things at different times
- The station has moods (tied to visitor count, time, events)

### Phase 4: Community Mystery Layer

**The Meta-Puzzle (Animal Well's Greatest Trick)**
- 64 hidden "Data Fragments" scattered across all floors
- Each fragment is a pixel pattern
- Assembling all 64 creates a QR code / image / message
- Requires community collaboration (some fragments only appear for certain visitors)
- The assembled message reveals... something about Echo's origin

**Shared World Secrets**
- Some secrets only unlock when X total visitors have found them
- Community progress bar for station-wide discoveries
- "First discoverer" gets their name permanently in the station

---

## Implementation Priority (What to Build First)

### Sprint A: Hidden Depth (1 session)
1. Secret wall system (pixel-pattern fake walls on each floor)
2. Discovery percentage tracker
3. 3 hidden rooms (F1 diary, F4 cave, F5 log)
4. Pixel "hint" behavior (cat lingers near secrets)
5. Scanner item (reveals hidden interactables with glow effect)

### Sprint B: Environmental Puzzles (1 session)
1. Telescope constellation puzzle (F2)
2. Garden growth pattern puzzle (F4)
3. Cross-floor clue system (item on F1 → use on F5)
4. Elevator secret sequence
5. "Station Mapped: X%" in save/profile

### Sprint C: Atmosphere (1 session)
1. Dynamic lighting (dark zones + light sources)
2. Ambient sound layers per floor
3. Pixel proximity hints (purr near secrets)
4. Peripheral "movement" effects
5. Window/viewport variations by time

### Sprint D: Community Mystery (1 session)
1. 64 Data Fragment collectible system
2. Fragment assembly viewer
3. "First discoverer" naming
4. Community progress tracking
5. The final reveal

---

## Key Principles (Borrowed from Animal Well)

1. **Every room has a secret** — no filler, no dead space
2. **Items recontextualize spaces** — getting a new tool makes you want to revisit
3. **Observe, don't explain** — minimal text, maximum environmental storytelling
4. **Layers of completion** — casual visitors see 30%, dedicated see 70%, obsessed find 100%
5. **The community IS the endgame** — deepest secrets need collaboration
6. **Mood > mechanics** — how a space FEELS matters more than what you DO there
7. **Small world, infinite depth** — 9 floors is enough if every pixel matters
