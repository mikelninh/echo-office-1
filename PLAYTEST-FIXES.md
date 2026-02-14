# Playtest Fixes — Honoring Our Testers

> "Players don't lie. They might not know what they want, but they always know what's wrong."

---

## Tester Verdicts Recap

| Tester | Type | Would Return? | Blocking Issue |
|--------|------|--------------|----------------|
| Sarah (casual) | ✅ Maybe | No guidance, overwhelmed by systems |
| Marcus (competitive) | ❌ No | No real multiplayer, empty leaderboards |
| Yuna (builder) | ❌ No | Ghost town, restrictive creation tools |
| Tom (mobile dad) | ❌ No | Mobile controls broken |
| Alex (completionist) | ✅ Yes, if... | No quest tracker, no collection page |
| Mika (vibes) | ✅ Yes, if... | No social sharing, combat-only coins |

**Conversion rate: 1/6 definite, 2/6 conditional, 3/6 no.**
**Target: 5/6 would return.**

---

## Fix Plan — Ordered by Impact

### 🔴 TIER 1: "They leave without this" (Currently building via player-experience agent)

#### Fix 1.1: Onboarding Quest ⏳ IN PROGRESS
- 6-step guided first visit via Echo chat
- Pet Pixel → Visit shop → Free first skin → Explore Floor 2
- Skippable, non-intrusive, uses existing chat system
- HUD step indicator: "📋 Step 3/6"
- **Solves:** Sarah's confusion, Tom's "what do I do?", Mika's first minutes

#### Fix 1.2: Ghost Town Seeding ⏳ IN PROGRESS
- 20 fake past visitors with names, stats, favorite floors
- Seeded leaderboards (duel, arena, arcade)
- Seeded bazaar with 10 listings
- 3 pre-built example rooms by "NPC creators"
- Visitor counter starts at 47, not 0
- Milestone progress pre-seeded (12/25)
- **Solves:** Yuna's empty world, Marcus's dead leaderboards, everyone's "am I the only one here?"

#### Fix 1.3: Quest Tracker HUD ⏳ IN PROGRESS
- Collapsible top-right panel
- Shows daily missions with progress bars
- Data fragment count: 💾 3/7
- Onboarding step if active
- Minimized: "📋 3 tasks"
- **Solves:** Alex's "where do I check progress?", Sarah's "what should I do?"

#### Fix 1.4: Peaceful Coin Paths ⏳ IN PROGRESS
- Exploration bonus: 10◈ per new floor (first visit)
- Photography missions: stand still on scenic floors
- Gardening income: harvest grown plants for coins
- Decoration challenge: place items in room
- Social coins: visit someone's room = 3◈/day
- **Solves:** Mika's "I don't want to fight", Sarah's "how do I earn without combat?"

#### Fix 1.5: Collection Page ⏳ IN PROGRESS
- Tab in inventory showing all items (found vs silhouette)
- Grouped: skins, weapons, accessories, materials
- Progress: "Skins: 3/28"
- Hints for unfound items: "Found in: Arena drops"
- **Solves:** Alex's completionist needs

---

### 🟡 TIER 2: "They leave after one session without this"

#### Fix 2.1: Mobile Controls 📋 PLANNED
**For Tom and anyone on a phone:**
- Virtual joystick (bottom-left): semi-transparent touch circle with inner dot
- Action button (bottom-right): large "E" button, always visible when near interactive object
- Tap-to-move as fallback: tap anywhere → character walks there
- Auto-detect touch device → show mobile controls, hide keyboard prompts
- Larger text on mobile (scale fonts by 1.3x)
- Chat input gets full-width on mobile with larger suggestion chips
- Arcade games: add touch controls (swipe for Snake, tap for Breakout paddle)

#### Fix 2.2: System Introduction Pacing 📋 PLANNED
**For Sarah's "15 systems in 20 minutes" problem:**
- Systems unlock GRADUALLY, not all at once:
  - **Visit 1**: Exploration, chat, shop, skins (the basics)
  - **Visit 2** (return): Daily missions appear, garden unlocked message
  - **Visit 3**: Enhancement station "discovered" (Echo: "I've been working on something...")
  - **Visit 5**: Bazaar opens, crafting teased
  - **Visit 10**: Specialist cards, ranked duels
  - **Visit 20**: Room builder, portal
- Objects for locked systems show "🔒 Come back tomorrow to unlock!" instead of full UI
- This makes each return feel like DISCOVERY, not overwhelm
- Debug mode bypasses all locks

#### Fix 2.3: First-Purchase Guidance 📋 PLANNED
- After earning 50◈ starter coins, Echo proactively suggests shopping
- Shop highlights "RECOMMENDED" section: 3 affordable, popular items
- First skin purchase during onboarding is FREE
- "Most popular" and "New!" badges on shop items
- After buying first skin: "Looking good! 😎 Try Floor 3 for some action."

#### Fix 2.4: Leaderboard Seeding + Beatable NPCs 📋 PLANNED
**For Marcus's "empty leaderboards feel fake" problem:**
- Seed 20 NPC entries on leaderboards with realistic ELO spread (800-1600)
- NPCs have personality names: "SaberWolf", "PixelSlayer", "NovaBlade"
- Player can actually BEAT seeded NPCs and climb the leaderboard
- As player climbs, harder NPC names appear above ("GrandMaster_X", "LegendaryEcho")
- When real players join, they mix into the same leaderboard
- Tournament brackets filled with NPCs that play at varying skill levels

#### Fix 2.5: Starter Room Templates 📋 PLANNED
**For Yuna's "empty grid is intimidating" problem:**
- On first room creation, offer 3 templates:
  - 🛏️ "Cozy Bedroom" — bed, lamp, bookshelf, rug, warm colors
  - 🔬 "Workshop" — workbench, tools, monitors, industrial vibe
  - 🌿 "Garden Room" — plants, fountain, natural colors, peaceful
- Player picks one, then customizes from there
- Templates use only Novice-level furniture (no locked items)
- "Start from scratch" option for experienced builders

---

### 🟢 TIER 3: "This makes them tell their friends"

#### Fix 3.1: Photo Mode + Sharing 📋 PLANNED
**For Mika's "I want to share this":**
- 📸 button in HUD → enters Photo Mode
- Photo Mode: all UI hides, character poses, camera can pan slightly
- Frame overlays: "Echo Station" watermark, floor name, visitor name
- "Save Screenshot" → downloads PNG
- "Copy Link" → generates shareable URL (future: with room/floor state)
- Works on mobile too

#### Fix 3.2: Visitor History Wall 📋 PLANNED
- Physical wall on Floor 1 or Floor 7
- Shows recent visitors: "🧑‍🚀 Luna visited 2 hours ago — loved the Garden"
- "You're visitor #48!"
- Creates social proof even for solo visitors
- Each visitor gets a tiny pixel avatar on the wall

#### Fix 3.3: Creator Tools Upgrade 📋 PLANNED
**For Yuna's "I can't express myself":**
- Wall color picker available at ALL levels (was locked to Architect)
- Floor color picker at ALL levels
- Furniture ROTATION (90° snap) at ALL levels
- Lock ADVANCED features to higher levels (NPCs, portals, custom music)
- Keep progression meaningful but don't block basic expression

#### Fix 3.4: Social Features for Solo Players 📋 PLANNED
- "Follow" a room → get notified when creator adds new items
- "Visitor book" in each room — leave a message
- "Room of the Day" — auto-featured on Community Deck
- Weekly "Creator Spotlight" — Echo interviews a room creator (simulated)
- "Similar rooms" suggestions when visiting

#### Fix 3.5: Combat Feedback Upgrade 📋 PLANNED
**For Marcus's "hits feel light":**
- Hit flash: enemy sprite flashes white for 2 frames on hit
- Hit pause: 50ms game freeze on every hit (the "Hades" feel)
- Knockback: enemy slides back 5-10px on hit
- Damage numbers: larger, colored by effectiveness, float upward
- Kill effect: enemy explodes into colored particles matching their element
- Combo counter: visible "3x COMBO!" text that grows with each hit

#### Fix 3.6: Minimap 📋 PLANNED
**For Alex's "constantly lost":**
- Small minimap in corner (togglable)
- Shows current floor layout with dots for objects
- Player position as blinking dot
- Other visitors as different colored dots
- Interactive objects highlighted
- Click minimap location → character walks there

---

## Implementation Order

### Sprint 1 (NOW — player-experience agent building)
- [x] Onboarding quest
- [x] Ghost town seeding
- [x] Quest tracker HUD
- [x] Peaceful coin paths
- [x] Collection page

### Sprint 2 (NEXT)
- [ ] Mobile controls (virtual joystick + action button)
- [ ] System introduction pacing (gradual unlock)
- [ ] First-purchase guidance
- [ ] Leaderboard seeding with beatable NPCs
- [ ] Starter room templates

### Sprint 3 (AFTER)
- [ ] Photo mode + sharing
- [ ] Visitor history wall
- [ ] Creator tools upgrade (unlock basic expression)
- [ ] Combat feedback (hit flash, pause, knockback)
- [ ] Social features for solo players

### Sprint 4 (POLISH)
- [ ] Minimap
- [ ] Full mobile arcade controls
- [ ] Creator spotlight system
- [ ] Room recommendation engine

---

## Success Metrics (Re-test targets)

| Tester | Current | Target | Key Fix |
|--------|---------|--------|---------|
| Sarah | Maybe | ✅ Yes | Onboarding + pacing |
| Marcus | No | ✅ Yes, if... | Beatable NPCs + combat juice |
| Yuna | No | ✅ Yes | Templates + unlocked basics + seeded rooms |
| Tom | No | ✅ Yes | Mobile controls |
| Alex | Yes, if | ✅ Yes | Quest tracker + collection |
| Mika | Yes, if | ✅ Yes | Peaceful coins + photo mode |

**Target: 5/6 would return → 6/6 after Sprint 3**

---

*Every tester who leaves is a story we failed to tell. Fix the story.*

*Last updated: 2026-02-14*
