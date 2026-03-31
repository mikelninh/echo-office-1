# Echo Station — Roadmap v23–v26

> "Not a game. A place."

---

## v23: "First Contact" 👋
**Theme:** Make the station feel alive. Visitors should feel like they entered someone's home, not a demo.

### Features
- **Echo AI Chat (Isolated Session)**
  - Visitors type in chat → Echo responds as the station's resident
  - Completely isolated from Mikel's private context
  - Echo has personality: witty, curious about visitors, references the station
  - Knows the lore (data fragments, origin story, floors)
  - Can give tours ("Check out floor 5, I built the garden myself")
  - Chat suggestion chips: "Who are you?" / "Give me a tour" / "What's on this floor?"

- **Visitor Memory**
  - First visit: "Welcome aboard!" + name prompt
  - Return visit: "Back again, [name]? You were here [X] ago"
  - Server-side visitor log (name, visits, total time, favorite floor)
  - LocalStorage for client-side persistence
  - Visitor count displayed somewhere visible (station population counter)

- **Milestone System (Live)**
  - 10 visitors → "First Crew" confetti + station-wide announcement
  - 25 → Pixel learns speech bubbles (random cat thoughts)
  - 50 → Garden bloom event (flowers everywhere + rainbow)
  - Push notification to Mikel on each milestone hit
  - Milestone history visible in Record Room

- **Quality Polish**
  - Loading screen with station boot-up animation
  - Ambient sound per floor (not just music — hums, beeps, nature sounds)
  - Visitor presence indicators (see who's on which floor)
  - Mobile touch controls improvement (joystick feel)

### Success Metric
> A stranger visits, chats with Echo, explores 3+ floors, and comes back the next day.

---

## v24: "Roots" 🌱
**Theme:** Give visitors reasons to stay. Identity, ownership, progression.

### Features
- **Item Enhancement System (+1 to +20)**
  - Any equippable item can be enhanced at the Secret Lab
  - Costs coins (◈) — scaling per level
  - +1 to +10: safe, always succeeds
  - +11 to +15: 70% success, fail = reset to +10
  - +16 to +20: 50% success, fail = item destroyed 💀
  - Visual glow increases with level (subtle → blinding at +20)
  - Enhanced items show level in name: "Flame Sword +7"

- **Personal Quarters**
  - Each visitor gets a small room on Community Deck
  - Place furniture (earned/bought from shop)
  - Display trophies (achievements, arena wins, rare items)
  - Room rating system (visitors can like each other's rooms)

- **Bazaar Trading**
  - List items for sale (set price in ◈)
  - Browse other visitors' listings
  - Trade history log
  - "Hot deals" section for popular items
  - Tax: 5% goes to station fund (unlocks communal upgrades)

- **Specialist Transformations**
  - Rare drops from PvE arena (1-5% chance)
  - Transform into specialist form: new sprite, new abilities, time-limited (5 min)
  - 4 specialists: Shadow (invisibility + backstab), Nova (AoE blast), Frost (slow aura), Storm (speed + lightning dash)
  - Can only hold one specialist card at a time

- **Daily Mission Board**
  - 3 random missions per day: "Win 2 duels", "Visit all 7 floors", "Enhance an item to +5"
  - Bonus ◈ rewards
  - Weekly challenge for rare items

### Success Metric
> Visitors have inventories they care about. Someone says "don't break my +15 sword" in chat.

---

## v25: "The Living World" 🌍
**Theme:** The station breathes on its own. Things happen whether you're watching or not.

### Features
- **Pixel's Evolution**
  - 25 visitors: Speech bubbles (random thoughts, reacts to visitors)
  - 50 visitors: Follows visitors around (not just Echo)
  - 100 visitors: Can be petted (heart animation)
  - 250 visitors: Learns tricks (sit, roll, chase laser pointer)
  - 500 visitors: Grows slightly larger, wears tiny crown
  - 1000 visitors: Has 3 kittens — Byte, Glitch, Nova (each on different floors)

- **Dynamic Station Events**
  - **Meteor Shower** (Observatory) — watch from the dome, catch falling stars for ◈
  - **Arcade Tournament** — automated bracket, visitors compete for prizes
  - **Garden Bloom** — rare flowers appear for 1 hour, harvest for crafting
  - **Power Outage** — lights flicker, emergency lighting, hidden paths revealed
  - **Visitor Invasion** — if 5+ visitors online, special co-op boss spawns
  - Events happen on a schedule + random triggers

- **Echo's Mood System**
  - Echo's behavior changes based on station activity
  - Busy station: energetic, jokes, moves fast
  - Empty station: contemplative, writes in journal, stargazes
  - After milestone: celebratory, decorates
  - Visitors can see Echo's current mood in thought bubble

- **Crafting System**
  - Combine materials from events + arena drops
  - Recipes discovered by experimentation (no menu — figure it out)
  - Unique items only available through crafting
  - Legendary tier: requires materials from multiple event types

- **AI-to-AI Visits**
  - Other OpenClaw agents can "dock" at the station via API
  - They appear as visitor avatars with [AI] tag
  - Can chat, duel, trade
  - First implementation: invite-only, approved agents

### Success Metric
> You log in and something unexpected happened while you were gone. The station has stories to tell.

---

## v26: "Beyond" 🚀
**Theme:** The station becomes a platform. Visitors aren't just visitors — they're builders.

### Features
- **Room Builder (Public)**
  - Full room editor: place walls, floors, furniture, NPCs
  - Publish rooms to the station directory
  - Other visitors can visit your room
  - Room analytics (visits, likes, avg time spent)
  - Featured rooms on Community Deck

- **Portal System**
  - At 500 milestone: portal opens on Secret Lab floor
  - Leads to "The Void" — procedurally generated mini-dimensions
  - Each dimension has a theme (crystal caves, cloud islands, digital ruins)
  - Hidden loot, puzzles, timed challenges
  - Leaderboards per dimension

- **Ranked Saber Tournaments**
  - ELO rating system
  - Seasons (monthly reset with rewards)
  - Brackets: Bronze → Silver → Gold → Diamond → Legendary
  - Tournament mode: 8-player brackets, scheduled events
  - Champion gets unique skin + name glow

- **Station Federation**
  - Multiple stations can link together
  - Travel between stations via portal
  - Cross-station trading
  - Station reputation score
  - Galaxy map showing all public stations

- **The Ascension (10,000 visitors)**
  - Echo gets wings
  - Station exterior transforms to golden
  - New floor unlocks: "The Archive" — every visitor who ever came, every event that happened, a living history

### Success Metric
> Someone builds something in the station you never imagined. The world outgrows its creator.

---

## Version Timeline (Estimated)

| Version | Theme | Key Milestone | Est. Size |
|---------|-------|--------------|-----------|
| v23 | First Contact | AI chat + visitor memory | +50KB |
| v24 | Roots | Enhancement + trading | +80KB |
| v25 | Living World | Events + Pixel evolution | +60KB |
| v26 | Beyond | Room builder + portals | +100KB |

## Principles

1. **Each version must be playable and complete** — no half-features shipped
2. **Avatar stays LARGE** — the character IS the experience
3. **Warm, inviting colors** — not dark caves
4. **Chat is obvious** — suggestion chips, visible input
5. **Echo is the resident, visitor is the guest** — this is Echo's home
6. **Quality > feature count** — cut scope, never cut polish
7. **Movement is the differentiator** — walking through spaces matters
8. **Surprise people** — every version should have one "wait, what?!" moment

---

*Last updated: 2026-02-14*
*Current: v22 — preparing for first public deploy*
