/**
 * mobile-fixes.js — Echo's Vault Space Station
 * Comprehensive mobile UX enhancement layer.
 * Loaded after all game scripts. Does NOT edit index.html.
 * 
 * Features:
 *  1. Touch controls: idle fade, popup-hide logic
 *  2. Viewport & canvas scale for sub-480px screens
 *  3. HUD scaling & floor-nav tap target improvements
 *  4. Popup/modal scroll & close-btn tap target fixes
 *  5. EVA exit btn mobile hardening
 *  6. Performance: particle cap + shadow blur suppression
 */

(function () {
  'use strict';

  // ─── Detection ──────────────────────────────────────────────────────────────
  const isMobile = window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) return; // desktop — nothing to do

  // ─── 1. VIEWPORT FIXES ───────────────────────────────────────────────────────

  // Ensure viewport meta is correct (may already exist — update if not right)
  (function ensureViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    // Force no zoom / fit device width
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  })();

  // Prevent iOS bounce scroll
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';

  // Prevent double-tap zoom on canvas
  const gameCanvas = document.getElementById('game');
  if (gameCanvas) {
    gameCanvas.style.touchAction = 'manipulation';
  }

  // ─── 2. CANVAS SCALING FOR VERY SMALL SCREENS (< 480px) ─────────────────────

  function applyCanvasScale() {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const vw = window.innerWidth;
    if (vw < 480) {
      const scale = vw / 800; // game canvas is 800px wide
      canvas.style.transformOrigin = 'top left';
      canvas.style.transform = `scale(${scale})`;
      canvas.style.width = '800px';
      canvas.style.height = '600px';
      // Wrap container adjusts to scaled size
      const wrap = canvas.closest('#game-wrap') || canvas.parentElement;
      if (wrap) {
        wrap.style.overflow = 'hidden';
      }
    } else {
      // Reset if window grew (e.g. orientation change)
      canvas.style.transform = '';
      canvas.style.width = '';
      canvas.style.height = '';
    }
  }

  // Don't apply canvas scale hack — the existing CSS already handles
  // `canvas { width:100%!important; height:calc(100dvh - 52px)!important; }`.
  // Only apply if we detect we need it (checked after load).
  window.addEventListener('resize', applyCanvasScale);

  // ─── 3. TOUCH CONTROLS IDLE FADE ─────────────────────────────────────────────
  // The joystick and action buttons already exist in HTML/CSS.
  // Add idle fade: active = 0.65 opacity, idle after 2s = 0.4.

  const OPACITY_ACTIVE = 0.65;
  const OPACITY_IDLE   = 0.4;
  const IDLE_DELAY_MS  = 2000;

  const joystickEl    = document.getElementById('virtual-joystick');
  const actionBtnsEl  = document.getElementById('action-buttons');

  let idleTimer = null;

  function setControlsOpacity(opacity) {
    [joystickEl, actionBtnsEl].forEach(el => {
      if (el) el.style.opacity = opacity;
    });
  }

  function resetIdleTimer() {
    setControlsOpacity(OPACITY_ACTIVE);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => setControlsOpacity(OPACITY_IDLE), IDLE_DELAY_MS);
  }

  // Start idle timer once controls are visible
  function initIdleFade() {
    if (!joystickEl && !actionBtnsEl) return;
    setControlsOpacity(OPACITY_ACTIVE);
    resetIdleTimer();

    // Reset on any touch anywhere
    document.addEventListener('touchstart', resetIdleTimer, { passive: true });
    document.addEventListener('touchmove',  resetIdleTimer, { passive: true });
  }

  // Hide/show touch controls when a popup is open
  function syncControlsVisibility() {
    const popupOpen = !!(
      document.querySelector('.popup-overlay') ||
      document.querySelector('#welcome-overlay') ||
      document.querySelector('#onboarding-overlay')
    );
    [joystickEl, actionBtnsEl].forEach(el => {
      if (el) el.style.visibility = popupOpen ? 'hidden' : 'visible';
    });
  }

  // Observe DOM for popup open/close
  const mutationObs = new MutationObserver(syncControlsVisibility);
  mutationObs.observe(document.body, { childList: true, subtree: false });

  // ─── 4. HUD SCALING ON MOBILE ─────────────────────────────────────────────────

  function injectMobileHudStyles() {
    if (document.getElementById('mf-hud-styles')) return;
    const style = document.createElement('style');
    style.id = 'mf-hud-styles';
    style.textContent = `
      /* mobile-fixes.js: HUD scaling */
      @media (max-width: 767px) {
        /* Reduce HUD button size 20%, add larger tap padding */
        .hud-btn {
          width: 32px !important;
          height: 32px !important;
          font-size: 15px !important;
          padding: 6px !important;
          /* Expand tap target via pseudo-element trick via position */
          min-width: 44px !important;
          min-height: 44px !important;
        }
        #hud {
          gap: 4px !important;
          padding: 4px 8px !important;
        }
        /* Floor navigator buttons — larger tap targets */
        .floor-btn {
          padding: 14px 16px !important;
          font-size: 14px !important;
          min-height: 52px !important;
        }
        /* Popup close button */
        .popup .close-btn {
          min-width: 44px !important;
          min-height: 44px !important;
          font-size: 22px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 8px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── 5. POPUP / MODAL SCROLL FIXES ────────────────────────────────────────────

  function applyPopupScrollFixes(popup) {
    if (!popup) return;
    // Max height + scrollable
    popup.style.maxHeight = popup.style.maxHeight || '85vh';
    popup.style.overflowY = popup.style.overflowY || 'auto';
    popup.style.webkitOverflowScrolling = 'touch';

    // Ensure close button is large enough
    const closeBtn = popup.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.style.minWidth  = '44px';
      closeBtn.style.minHeight = '44px';
    }
  }

  // Patch createPopup to always apply mobile fixes
  function patchCreatePopup() {
    // createPopup lives in global scope (index.html)
    if (typeof window.createPopup !== 'function') return;
    const _orig = window.createPopup;
    window.createPopup = function (...args) {
      const result = _orig.apply(this, args);
      // After popup is created, fix it
      const overlay = document.querySelector('.popup-overlay:last-of-type');
      if (overlay) {
        // Prevent background page scroll
        document.body.style.overflow = 'hidden';
        const popupEl = overlay.querySelector('.popup');
        applyPopupScrollFixes(popupEl);

        // Restore scroll when this overlay is removed
        const ro = new MutationObserver(() => {
          if (!document.contains(overlay)) {
            document.body.style.overflow = '';
            ro.disconnect();
          }
        });
        ro.observe(document.body, { childList: true, subtree: false });
      }
      return result;
    };
  }

  // Also fix any popups that appear after us via MutationObserver
  const popupObs = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList && (node.classList.contains('popup-overlay') || node.id === 'modal-overlay')) {
          const popupEl = node.querySelector('.popup') || node;
          applyPopupScrollFixes(popupEl);
          document.body.style.overflow = 'hidden';

          // Restore on removal
          const restoreObs = new MutationObserver(() => {
            if (!document.contains(node)) {
              document.body.style.overflow = '';
              restoreObs.disconnect();
            }
          });
          restoreObs.observe(document.body, { childList: true });
        }
      });
    });
  });
  popupObs.observe(document.body, { childList: true });

  // ─── 6. EVA EXIT BUTTON MOBILE HARDENING ──────────────────────────────────────

  function hardenEvaExitBtn() {
    const b = document.getElementById('eva-exit-btn');
    if (!b) return;
    // Ensure always visible, min 60px height, full-width on mobile
    if (!b.dataset.mfPatched) {
      b.dataset.mfPatched = '1';
      b.style.minHeight   = '60px';
      b.style.width       = 'calc(100% - 40px)';
      b.style.maxWidth    = '320px';
      b.style.fontSize    = '16px';
      b.style.zIndex      = '99999';
      b.style.touchAction = 'manipulation';
    }
  }

  // Watch for EVA exit button being added (dynamically created in _ensureEvaExitBtn)
  const evaObs = new MutationObserver(() => hardenEvaExitBtn());
  evaObs.observe(document.body, { childList: true });

  // Also inject a style rule for it
  function injectEvaStyle() {
    if (document.getElementById('mf-eva-style')) return;
    const s = document.createElement('style');
    s.id = 'mf-eva-style';
    s.textContent = `
      @media (max-width: 767px) {
        #eva-exit-btn {
          min-height: 60px !important;
          width: calc(100% - 40px) !important;
          max-width: 320px !important;
          font-size: 16px !important;
          padding: 16px 24px !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  // ─── 7. PERFORMANCE: PARTICLE CAP + SHADOW BLUR ───────────────────────────────
  // The game already caps at 40 on mobile. Tighten to 30 per spec.
  // Also patch ctx.shadowBlur setter to no-op on mobile.

  function patchPerformance() {
    // Patch S.particles cap (S may not exist yet, defer)
    function capParticles() {
      if (typeof S !== 'undefined' && Array.isArray(S.particles) && S.particles.length > 30) {
        S.particles.splice(0, S.particles.length - 30);
      }
    }

    // Patch canvas context shadowBlur
    const canvas = document.getElementById('game');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const proto = Object.getPrototypeOf(ctx);
        if (!proto.__mfShadowPatched) {
          proto.__mfShadowPatched = true;
          const descriptor = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
          if (descriptor && descriptor.set) {
            const origSet = descriptor.set;
            Object.defineProperty(proto, 'shadowBlur', {
              get: descriptor.get,
              set(value) {
                // On mobile, only allow setting to 0 (suppress all blur)
                origSet.call(this, 0);
              },
              configurable: true,
            });
          }
        }
      }
    }

    // Run particle cap periodically
    setInterval(capParticles, 500);
  }

  // ─── 8. SPACEWALK COMET TOUCH ─────────────────────────────────────────────────
  // The canvas touchend already dispatches click events, so comet touch
  // works if the click handler already handles it. We patch to ensure
  // spacewalk debris/comet touch fires the same as mouse click collision.
  // (The existing touchend→click dispatch in initInput() covers this.)

  // ─── INIT ─────────────────────────────────────────────────────────────────────

  function init() {
    injectMobileHudStyles();
    injectEvaStyle();
    initIdleFade();
    patchCreatePopup();
    patchPerformance();
    hardenEvaExitBtn();
    syncControlsVisibility();

    // Apply canvas scale for very small screens (only if CSS isn't handling it)
    if (window.innerWidth < 480) {
      // The existing CSS `canvas { width:100%!important }` is sufficient on
      // most devices; only apply transform scale if canvas is wider than viewport
      const canvas = document.getElementById('game');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          applyCanvasScale();
        }
      }
    }
  }

  // Run after all game scripts have initialised
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

  // Also re-run key bits after a short delay to catch lazy-init elements
  setTimeout(() => {
    initIdleFade();
    hardenEvaExitBtn();
    syncControlsVisibility();
  }, 2000);

})();
