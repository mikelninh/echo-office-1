# 🎮 Echo Games — pluggable mini-game modules

Self-contained games that run **standalone** (their own page) *and* **embedded**
in the station (Floor 3 arcade) from the **same module** — no code duplication,
no build step, vanilla JS.

## The module contract

A game is an object with metadata + a `mount()` factory:

```js
const MyGame = {
  id: 'my-game',
  name: 'My Game',
  category: 'platformer', // 'platformer' | 'arcade' | 'turn' | 'party' | 'coop'
  minPlayers: 1,
  maxPlayers: 4,

  // Mounts the game into `container` and returns an instance.
  mount(container, opts) {
    // opts.transport : 'local' (solo/offline) | 'socket' (live multiplayer)
    // opts.context   : 'standalone' | 'station'
    // opts.difficulty: optional preset ('chill'|'normal'|'hard'|'kaizo'|...)
    // opts.onCoins   : (n) => {}   station hook to award ◈ coins (optional)
    // opts.onExit    : () => {}    called when the player leaves (station)
    return {
      destroy() { /* cancel RAF, remove listeners/DOM, free everything */ },
    };
  },
};

window.MyGame = MyGame;
// auto-register into the Party Arcade framework when it's present:
if (window.PartyGames && window.PartyGames.register) window.PartyGames.register(MyGame);
else (window.PartyGamesPending = window.PartyGamesPending || []).push(MyGame);
```

### Rules of thumb
- **Own your loop & teardown.** Cancel your `requestAnimationFrame` and remove
  every listener in `destroy()` — the station reuses one canvas/overlay.
- **`transport: 'local'` must fully work offline.** That's what makes a game
  shippable on the static deploy and validates it before adding netplay.
- **Respect `context`.** In `'station'`, wire coins/skins via the `opts` hooks;
  in `'standalone'`, run pure and self-sufficient.
- **Follow the design bible** (`docs/VISUAL-DESIGN.md`) — arcade palette is
  neon black `#0a0a1a` with hot-pink `#ff6ec7` / cyan `#00fff7`.

## Games

| Game | File | Category | Status |
|------|------|----------|--------|
| **Echo Run** | `platformer.js` / `platformer.html` | platformer | ✅ standalone, single-player (Chill→Normal→Hard→Kaizo) |

### Echo Run — play / deep-link
- Standalone: `/public/games/platformer.html`
- Deep-link a difficulty: `platformer.html?d=kaizo`
- Controls: ← → / A D move · ↑ / W / Space jump · **R** restart · **C** clean
  (OBS) mode · **M** mute · **Esc** menu. Touch controls appear on mobile.

### Roadmap
- Floor-3 embed via the Party Arcade framework (`src/party-arcade.js` +
  `public/js/party-arcade.js`) — room codes, spectators, live netplay.
- Multiplayer Echo Run: race-to-the-flag / co-op clear, with a spectate link
  and the death-counter overlay for streaming.
