# 🌙 Nightly Build System v2 — Revenue-First

## The New Deal
Every night at 1:00 AM CET, Echo gets 45 minutes with Opus. The mission has changed:
**Build things that make money or bring users.** Beauty serves business now.

## Priority Stack (In Order)

### 🔴 P0: Revenue & User Acquisition (Do These First)
1. **Claw Machine MVP** — `claw.html` — 2D physics, pixel art, playable, one machine, sound effects
2. **Email capture** — add "Get weekly holy grail reports" signup box to dashboard
3. **SEO landing page** — `index.html` rewrite as a landing page for Echo's Vault (the collectibles platform, NOT the station)
4. **Newsletter auto-generator** — cron script that generates weekly market report as HTML email
5. **Share buttons** — add social sharing to the gallery (share a card image + link to Twitter/Reddit)

### 🟡 P1: Engagement & Retention
6. **Companion egg** — `companion.html` — the egg incubation experience, choose location, 3-day countdown
7. **Daily streak counter** — track visits, reward returning users
8. **Portfolio tracker** — "My Collection" page where you manually add cards you own
9. **Price history charts** — 30-day line charts per TCG (not just 4-day sparklines)
10. **Watchlist** — save specific cards, get pinged when price changes

### 🟢 P2: Polish & Wow
11. **Ghibli magic on garden floor** — kodama, fireflies, sunbeams
12. **Time-of-day lighting** — station reflects real time
13. **Claw machine sound design** — mechanical whirr, chain clink, grip, thud
14. **Card hover previews** — hover a card in gallery = large preview popup
15. **Parallax starfield** — observatory depth

## Build Rules

### Revenue Rule
Every nightly build must answer: **"Does this bring users or make money?"**
- Affiliate links in everything
- Email capture in everything
- Share buttons in everything
- Every page has a path to premium signup

### Technical Rules
- ❌ Never break existing functionality
- ❌ Never edit index.html (the 43K-line station file)
- ❌ Never anti-alias pixel art
- ✅ Always create NEW files (claw.html, companion.html, etc.)
- ✅ Always `vm.createScript()` syntax check before commit
- ✅ Always git push when done
- ✅ Always update memory with what was built
- ✅ Always test in browser if available

### Scope Rules
- ONE feature per night, FULLY polished
- Each feature should be PLAYABLE/USABLE, not a skeleton
- If it's a game mechanic (claw), it must be fun even without art
- If it's a page, it must look professional on mobile too

### After Building — Auto-Sync Data
After every build, run:
```bash
/Users/mikel/.openclaw/workspace/echo-office/scripts/post-monitor-sync.sh
```

## Tonight's Priority

**CLAW MACHINE MVP.** File: `claw.html`

Requirements:
- Full HTML page, self-contained, dark theme matching dashboard
- Canvas-based 2D physics (gravity, rigid bodies, grip force)
- Pixel-art claw machine (glass case, visible prizes inside)
- Arrow keys / touch to move claw, spacebar / tap to drop
- 3-5 prize cards visible (use placeholder colored rectangles with labels)
- Claw strength varies (random per drop, visible glow intensity)
- Near-miss physics (card can slip during lift)
- Drop chute animation when you win
- Pity counter visible (play count / 50 for Mega Claw)
- Mobile responsive (touch controls)
- Sound effects using Web Audio API (no external files needed)
- Link back to dashboard
- "Get Premium" button visible

## Anti-Patterns
- ❌ Don't build infrastructure nobody sees
- ❌ Don't write docs when you could write code
- ❌ Don't beautify before it works
- ❌ Don't over-scope
- ✅ Ship > Perfect
- ✅ Playable > Beautiful
- ✅ Revenue > Polish
