# NIGHTBUILD.md — Overnight Build Instructions

**Date:** 2026-02-18 night
**Model:** Use efficient thinking. Code doesn't need xhigh.
**Budget:** Be resource-conscious. ONE focused build. Commit when done. Stop if hitting limits.

## Tonight's Build: Claw v5.0 — The Loop

**File:** `claw.html` (currently 31KB, ~1255 lines)
**Goal:** Connect the claw to the ecosystem. After this, Dashboard→Claw→Companion are linked.

### MUST DO (in order):

1. **Token System**
   - 3 free plays per day, resets at midnight
   - Token counter in HUD: "🪙 3/3"
   - When 0 tokens: show friendly message with links out (not a paywall)
   - Store in localStorage key `echovault_claw_tokens`

2. **Real Card Prizes**
   - Load `seen.json` for card data (names, images, games)
   - Prize pool = actual cards with real eBay images
   - Display card name when claw grabs: "Blue-Eyes White Dragon!"
   - Upgrade image URLs from s-l500 to s-l1600 for prize display

3. **Collection Persistence**
   - Won cards saved to localStorage key `echovault_collection`
   - Collection shelf visible on claw page (bottom bar or sidebar)
   - Shows last 10 wins as thumbnails
   - Duplicate tracking: "⭐×2"

4. **Cross-Navigation**
   - Header: "← Dashboard" link
   - After play (win or loss): "📊 Dashboard" | "🥚 Companion" buttons
   - On token depletion: "Come back tomorrow" + links to Dashboard + Companion

5. **Companion Integration (light)**
   - Read `echovault_companion` from localStorage
   - If companion exists: show companion name + "🐾 [Name] is watching!" in corner
   - No complex sprite rendering — just text/emoji presence

### VALIDATION:
- `node -e "new (require('vm').Script)(scriptContent)"` before every commit
- Check for console errors
- Screenshot if browser available

### DO NOT:
- Edit `index.html` (the 43K station file)
- Edit `dashboard.html` or `companion.html` (separate builds)
- Add more than what's listed above
- Spend tokens on elaborate designs or multiple iterations

### COMMIT FORMAT:
```
🎰 Claw v5.0 — token system + real cards + collection + cross-nav
```

Push to `master` when done. Send summary to Telegram chat 938367498.
