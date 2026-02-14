# 🚀 Deploy Plan — Echo's Station v22

**Target:** Railway.app ($5/mo) — persistent URL, WebSocket support, no more dying tunnels
**Goal:** Friends can visit, explore, fight, and come back without losing progress

---

## Phase 1: Must-Fix Before Deploy 🔴

### 1. Cloud Save (Critical)
Right now everything is in localStorage = one browser, one device, clear cache = gone forever.
- [ ] Server-side account storage already exists (`accounts/` dir) — but most game state (skins, coins, weapons, loot) is ONLY in localStorage
- [ ] On login (Station Pass), sync localStorage → server
- [ ] On page load with saved pass, pull server → localStorage
- [ ] Auto-sync every 60s (already partially there, needs full inventory)
- [ ] **What to sync:** coins, ownedSkins, ownedWeapons, equippedWeapon, lootInventory, equippedAccessories, duelStats, aiWins, achievements, dailyReward state, floorsVisited

### 2. Mobile Playability (Critical)
Most friends will open this on their phone first.
- [ ] Test virtual joystick — does it actually work well?
- [ ] Add mobile attack button (E key equivalent)
- [ ] Add mobile interact button (SPACE equivalent)  
- [ ] Make sure popups/shop/chat are usable on small screens
- [ ] Test on iPhone Safari + Android Chrome
- [ ] Dash on mobile? Double-tap joystick direction?

### 3. Railway Deploy Setup
- [ ] Create `Dockerfile` or `package.json` start script
- [ ] Environment variables: `PORT` (Railway assigns), `NODE_ENV=production`
- [ ] WebSocket must work through Railway's proxy (wss://)
- [ ] Static file serving with proper caching (assets) + no-cache (index.html)
- [ ] Health check endpoint (`/health`)
- [ ] Custom domain later, Railway subdomain fine for now

### 4. First Impression Polish
You get ONE first impression. These make or break it:
- [ ] Welcome flow — name entry works smoothly, not confusing
- [ ] First 30 seconds are magical — Echo greets you, Pixel walks by, music plays
- [ ] Chat suggestions actually guide new players ("What is this place?", "How do I move?")
- [ ] Loading screen is quick (280KB is fine, but lazy-load what we can)
- [ ] No console errors in production

---

## Phase 2: Should-Fix Before Deploy 🟡

### 5. Multiplayer Basics
Not full multiplayer, but visitors should feel the station is alive:
- [ ] Show total visitor count (all-time + online now) on the station
- [ ] Guestbook works and persists server-side
- [ ] When someone visits, Echo mentions it in chat ("A new visitor just arrived!")

### 6. Share-ability
- [ ] Nice `<meta>` tags (og:title, og:description, og:image) for link previews
- [ ] Screenshot-worthy moments (the station should look good in a thumbnail)
- [ ] Simple URL — `echos-station.up.railway.app` or similar

### 7. Bug Sweep
- [ ] Test all 7 floors — every interaction works
- [ ] Test PvE arena — all 6 fighters
- [ ] Test shop — buying, equipping, collection counter
- [ ] Test dash — reliable on all browsers
- [ ] Test spacewalk + exit (the old persistent bug)
- [ ] Test elevator navigation
- [ ] Test achievements
- [ ] Remove or hide any debug features (`?admin=echohost` — keep but don't expose)

---

## Phase 3: Nice-to-Have for Launch Week 🟢

### 8. Invite System
- [ ] Share link with referral code → both get 25◈ bonus
- [ ] "Invited by" shown on profile

### 9. Visitor Counter Milestones
- [ ] Real-time milestone triggers (10, 25, 50, 100 visitors)
- [ ] Confetti/celebration when milestone hits

### 10. Quick Content Adds
- [ ] 1-2 more easy AI fighters (variety for new players)
- [ ] A "Welcome" quest chain (visit all floors = bonus reward)
- [ ] Daily rotating featured item in shop (already coded, verify it works)

---

## Deploy Day Checklist ✅

1. Push final code to GitHub
2. Create Railway project, connect repo
3. Set environment variables
4. Deploy, verify URL works
5. Test on phone (own device)
6. Test account creation + save/load
7. Send link to 2-3 close friends first (soft launch)
8. Watch for issues in real-time
9. Fix anything critical same-day
10. Share more broadly after 24h if stable

---

## Timeline

**Tomorrow morning:** Phase 1 (cloud save, mobile, Railway setup)  
**Tomorrow afternoon:** Phase 2 (polish, bugs, meta tags)  
**Tomorrow evening:** Deploy + soft launch to 2-3 friends  
**Day 2-3:** Fix feedback, Phase 3 nice-to-haves  
**Week 1:** Share with wider friend group

---

*"Ship it scared. Fix it fast."* 🔮
