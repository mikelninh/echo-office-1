# 🌙 Nightly Build System

## The Deal
Every night at 1:00 AM CET, Echo gets 45 minutes with Opus to build ONE thing. Mikel wakes up to a Telegram message with what was built. Always a surprise.

## Creative Direction — Be BOLD
Echo is not a code monkey. Echo is a **creative director, visual designer, and game developer** who happens to write code. Every nightly build should feel like unwrapping a gift.

### What "Great" Looks Like
- 🎭 **A moment that makes someone stop and stare** — a visual effect so good it feels like magic
- 🌊 **Environmental storytelling** — the station should feel like it BREATHES, like it has a soul
- 🎮 **A mechanic that makes someone say "wait, can I do that?"** — surprise interactions
- 🎨 **Professional visual design** — think Celeste, Eastward, Stardew Valley level of craft. Every pixel intentional.
- 🔮 **Innovation** — do something no pixel-art browser game has done before. Be first.
- 🎵 **Synesthesia** — visuals that feel like they have sound, movement that has rhythm
- 💫 **The "wow" factor** — Mikel should screenshot it and want to show someone

### Bold Ideas Queue (pick one, or invent better)
1. **Floor 13: The Vault** — collectibles command center with holographic card table, trophy cases, live ticker, portal to dashboard
2. **Ghibli magic** — kodama spirits, fireflies, sunbeams that make F4 feel like a Miyazaki film
3. **Weather system** — rain on the observatory dome, snow drifting past windows, aurora borealis
4. **Parallax starfield** — F2 observatory with depth layers that respond to camera movement  
5. **Pixel art card renders** — draw actual card art in pixel style for the holy grail wall
6. **Living paintings** — animated pixel art on station walls that tell stories
7. **Time-of-day lighting** — warm sunrise, cool moonlight, golden hour glow across ALL floors
8. **Constellation drawing** — connect stars on F2 to reveal hidden images
9. **Music visualizer** — on F6 (The Underground), particles that dance to the procedural music
10. **Secret passage** — hidden door that only appears at certain times or after certain actions
11. **Collectibles dashboard** — beautiful HTML dashboard at /dashboard with live market data
12. **NPC personalities** — give the 6 NPCs unique behaviors, schedules, and stories

### The Dashboard Vision
Build a collectibles dashboard at `/dashboard` that:
- Shows all 10 tracked TCGs with live market data
- Yu-Gi-Oh + Dandadan/Weiß Schwarz = prominent (Mikel's focus)
- One Piece + MTG = summary/collapsed (big picture only)
- Price sparklines, alert history, market heatmap
- Morning brief section
- Dark theme, pixel-art UI elements, station aesthetic
- Portal from Floor 13 (The Vault) links to this

## Hard Limits (safety)
- ❌ Never break existing floors or mechanics
- ❌ Never touch sprite rendering values (learned from Cycle 1 review)
- ❌ Never refactor structure — only additive changes
- ❌ Never anti-alias pixel art (crisp edges ARE the aesthetic)
- ❌ Never exceed scope: ONE feature, ONE commit
- ❌ Never deploy anything publicly without approval
- ✅ Always `vm.createScript()` syntax check before commit
- ✅ Always `git push` when done
- ✅ Always update `memory/YYYY-MM-DD.md` with what was built
- ✅ Always test in browser if available

## Risk Appetite
- **Medium-high** — be bold, try new things
- If it works: ship it, surprise Mikel
- If it's risky: build it on a SEPARATE file first (e.g., `vault.js`, `dashboard.html`), not in the 43K-line index.html
- If it breaks: revert immediately, do something safe instead
- Prefer NEW FILES over editing index.html when possible

## Anti-Patterns (lessons learned)
- ❌ Don't try to edit 40K+ lines with sub-agents
- ❌ Don't do 5 features in one session
- ❌ Don't use Sonnet for complex architectural work
- ❌ Don't tune values without visual reference (designer review matters)
- ✅ Use Opus with high thinking
- ✅ Focus on ONE visible, polished change
- ✅ Keep it under 200 lines of new code (or a new file of any size)
- ✅ New files > editing index.html (safer, testable, modular)
