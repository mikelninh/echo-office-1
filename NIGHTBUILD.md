# NIGHTBUILD.md — Overnight Build Instructions
## Night of Feb 19→20, 2026
## ARCADE Design Review Priority Build

**Priority tonight: Phase 0 — Build The Door**
**Context:** ARCADE rated us 5.5/10. Top priorities: onboarding, companion memory, NPC drama surface.
**Onboarding is being built by a separate sub-agent tonight.**
**This build: Companion Memory Log + NPC Drama Surface**

---

## Build 1: Companion Memory Log (`companion-memory.js`)

The companion remembers everything significant. This is the legendary feature ARCADE identified.

### What to build:
A new file `companion-memory.js` that extends the companion system with a persistent memory log.

**Memory structure** (stored in localStorage `echo_companion_memory`):
```js
[
  { ts: timestamp, type: 'moment', icon: '🏆', text: "Day 1 — You arrived. I was waiting." },
  { ts: timestamp, type: 'grail', icon: '🎴', text: "Day 14 — The PSA 10 Dandadan. You'd been watching it for 3 days. When you clicked, I held my breath." },
  { ts: timestamp, type: 'claw', icon: '🎰', text: "Day 7 — Legendary pull. I went absolutely feral." },
  { ts: timestamp, type: 'milestone', icon: '⭐', text: "Day 21 — Level 10. I evolved. Do I look different? I feel different." },
]
```

**Memory triggers** (listen for these events):
- `companionEvent('grail_found', {card, price})` → log it in companion's voice
- `companionEvent('claw_pull', {result, rarity})` → log legendary/mythic pulls only
- `companionEvent('arcade_highscore', {game, score})` → log new personal bests
- `companionEvent('floor_visit', {floor})` — track floor visit patterns, note favorites
- Companion level-up → log evolution milestone
- First login of each day → log "Day X of our journey"
- Day 7 / 30 / 100 milestones → special memories

**Memory voice:** Each memory is written in the companion's voice. Vary by evolution path:
- **Collector:** thoughtful, detail-oriented, notices market value ("That Dandadan was listed at €8,400. You paid €7,200. Smart.")
- **Explorer:** adventurous, curious ("I wonder what floor you'll discover next")
- **Fighter:** bold, competitive ("That's 3 legendary pulls in a row. We're unstoppable.")

**Memory viewer:**
- Add a "📖 Our Story" button to the companion modal (already exists in companion.js)
- Opens a scrollable panel showing memories in reverse chronological order
- Each memory has: icon, day number, text
- Beautiful minimal styling — dark background, subtle timeline line, companion's color accent
- Shows "Day X of our journey" header
- Max 100 memories stored, oldest pruned

**Integration:**
- Works standalone — reads companion data from localStorage, listens for window events
- Add `<script src="companion-memory.js"></script>` to index.html via sed before </body>
- Expose `window.CompanionMemory.log(type, icon, text)` for other scripts to add memories

**Syntax check with vm.createScript() before commit.**

---

## Build 2: NPC Drama Surface (`npc-drama.js`)

Surface the NPC society as visible drama. Players should feel they arrived at a world with history.

### What to build:
A new file `npc-drama.js` that generates and displays NPC story events.

**Drama system:**
```js
NPCDrama = {
  stories: [],  // active story threads
  events: [],   // recent events
  feed: [],     // chronological event log
}
```

**Story generation** (runs every ~2 real minutes):
Pick 2 NPCs with opposing personality traits (high vs low agreeableness, high vs low neuroticism etc) and generate a story thread:
- **Conflict** (low agreeableness + high neuroticism): "Zara and Kael have been avoiding each other in The Archive."
- **Romance** (high extraversion + high agreeableness + proximity): "Ash and Maya keep ending up at the same table in the Food Court."
- **Achievement** (high conscientiousness + job match): "DJ Mos just ran the longest continuous set on Floor 10."
- **Discovery** (high openness, near Farm or Lab): "Pixel followed someone into the Garden. They came back with seeds nobody's seen before."
- **Rumor** (high extraversion NPC spreading info): "[Name] has been telling everyone that the Observatory looks different at 3 AM."

**Display:**
- Small "Station News" panel — toggle button in top-left area of HUD
- Shows last 5 events as scrollable feed with timestamps ("2h ago", "yesterday")
- Each event has an NPC name, icon, and one-sentence description
- Clicking an event → zooms camera to that NPC on the floor (if same floor)
- New event → small notification pulse on the toggle button
- Store in localStorage `echo_npc_drama` (last 20 events)

**Station News ticker** (optional, if time allows):
- Thin ticker strip at very bottom of screen (above HUD)
- Scrolls slowly: "⭐ DJ Mos completed a 3-hour set on F10 · 🌱 Zara harvested the first batch of moonflower · ⚔️ Kael and Ash argued about something in The Archive..."

**Integration:**
- Reads from `window.StationLife` and `window._stationPop` (already exposed by npc-dance.js)
- Uses NPC `ocean` traits for story generation (no AI API needed — pure logic)
- Add `<script src="npc-drama.js"></script>` to index.html via sed before </body>
- Expose `window.NPCDrama.addEvent(npcName, type, text)` for external triggers

**Syntax check with vm.createScript() before commit.**

---

## ✅ BOTH BUILDS COMPLETE — Feb 20, 2026 (3 AM retry window)
- companion-memory.js: 22,470 bytes, syntax checked ✅
- npc-drama.js: 24,693 bytes, syntax checked ✅
- Commit: 881def9, pushed to master
- Data synced: seen.json + market-stats.json

## After Both Builds:
1. Git add, commit with message: `feat: companion memory log + NPC drama surface — The World Gets Deep`
2. Git push
3. Update this NIGHTBUILD.md — mark builds complete
4. Send summary to Mikel via Telegram (channel: telegram, to: 938367498):
   - What was built
   - How to see it (where to look in the station)
   - One thing you noticed while building that's interesting

## Rate Limit Note:
If you hit Anthropic rate limits, wait and retry. Limits reset every 5 hours.
Do not start a build you can't finish. Better to ship one thing completely than two things halfway.
