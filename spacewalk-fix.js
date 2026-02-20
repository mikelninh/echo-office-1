/**
 * spacewalk-fix.js — Emergency patch for renderSpacewalk dx/dy ReferenceError
 *
 * Root cause: renderSpacewalk() references `dx` and `dy` in its draw section
 * (line ~16255 in index.html), but those variables are only declared in the
 * physics-update section of the same function. JavaScript scoping means the
 * draw section can't see them — ReferenceError on every spacewalk frame.
 *
 * spacewalk-upgrade.js already fully replaces renderSpacewalk via waitReady(),
 * but there's a race: the game loop may call the broken original before
 * waitReady() fires. This file patches synchronously at parse time.
 *
 * Strategy: wrap the existing renderSpacewalk in a try/catch ASAP.
 * When the dx ReferenceError fires, we draw thrusters from sw.vx/sw.vy instead.
 * Once spacewalk-upgrade.js fires, its replacement takes over cleanly.
 */
(function patchSpacewalkDx() {
  'use strict';

  function applyPatch() {
    if (typeof window.renderSpacewalk !== 'function') return; // not defined yet

    const _orig = window.renderSpacewalk;

    window.renderSpacewalk = function renderSpacewalkPatched() {
      try {
        _orig.apply(this, arguments);
      } catch (e) {
        if (e instanceof ReferenceError && /\bdx\b/.test(e.message)) {
          // Original crashed in the thruster draw. Draw fallback thrusters from velocity.
          try {
            const sw = window.S && window.S.spacewalk;
            const ctx = window.ctx;
            if (sw && ctx) {
              const speed = Math.sqrt((sw.vx || 0) ** 2 + (sw.vy || 0) ** 2);
              if (speed > 5) {
                const ndx = sw.vx / speed;
                const ndy = sw.vy / speed;
                ctx.save();
                ctx.translate(sw.x, sw.y);
                ctx.fillStyle = '#00fff7';
                for (let i = 0; i < 3; i++) {
                  ctx.beginPath();
                  ctx.arc(
                    -ndx * 20 + Math.random() * 6 - 3,
                    -ndy * 20 + Math.random() * 6 - 3,
                    2, 0, Math.PI * 2
                  );
                  ctx.fill();
                }
                ctx.restore();
              }
            }
          } catch (_) { /* ignore */ }
        } else {
          throw e; // re-throw non-dx errors
        }
      }
    };

    console.log('[spacewalk-fix] ✅ renderSpacewalk wrapped — dx ReferenceError patched');
  }

  // Apply immediately (renderSpacewalk is a hoisted function declaration, exists now)
  applyPatch();

  // Also apply on DOMContentLoaded in case timing differs
  document.addEventListener('DOMContentLoaded', applyPatch, { once: true });
})();
