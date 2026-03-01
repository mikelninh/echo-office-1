/**
 * onboarding.js — Echo's Vault: New User First Experience
 * Runs once. Stored in localStorage: echo_onboarding_complete
 * Exposes: window.Onboarding.reset() for testing
 */
(function () {
  'use strict';

  // ─── Expose reset util ───────────────────────────────────────────────────
  window.Onboarding = {
    reset: function () {
      localStorage.removeItem('echo_onboarding_complete');
      location.reload();
    }
  };

  // ─── Detection: skip if already seen or returning user ──────────────────
  if (localStorage.getItem('echo_onboarding_complete')) return;
  if (localStorage.getItem('echo_companion')) return;

  // ─── Inject styles ───────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    /* Base overlay */
    '#ob-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background .6s ease;pointer-events:none;}',
    '#ob-overlay.ob-visible{background:rgba(0,0,5,.88);pointer-events:all;}',
    /* Card */
    '#ob-card{position:relative;background:linear-gradient(160deg,#0d0d1a 0%,#111128 100%);border:1.5px solid rgba(0,255,247,.22);border-radius:16px;box-shadow:0 0 60px rgba(0,200,255,.12),0 8px 40px rgba(0,0,0,.7);padding:40px 36px 32px;max-width:420px;width:90%;text-align:center;opacity:0;transform:translateY(20px) scale(.97);transition:opacity .5s ease,transform .5s ease;}',
    '#ob-card.ob-card-in{opacity:1;transform:translateY(0) scale(1);}',
    /* Typography */
    '#ob-title{font-family:inherit;font-size:15px;color:rgba(200,220,255,.55);letter-spacing:.12em;text-transform:uppercase;margin:0 0 18px;}',
    '#ob-body{font-family:inherit;font-size:17px;line-height:1.65;color:#ddeeff;margin:0 0 28px;min-height:52px;}',
    '#ob-body em{color:#00fff7;font-style:normal;}',
    /* Egg */
    '#ob-egg{font-size:64px;display:block;margin:0 auto 20px;animation:ob-pulse 2.4s ease-in-out infinite;line-height:1;}',
    '@keyframes ob-pulse{0%,100%{transform:scale(1) translateY(0);filter:drop-shadow(0 0 6px rgba(200,255,200,.35));}50%{transform:scale(1.07) translateY(-4px);filter:drop-shadow(0 0 18px rgba(120,255,180,.55));}}',
    /* Buttons */
    '#ob-btn{display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#00c8ff,#9040ff);border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 20px rgba(0,200,255,.3);}',
    '#ob-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,200,255,.45);}',
    '#ob-btn.ob-btn-claw{background:linear-gradient(135deg,#ff6600,#ff00aa);box-shadow:0 4px 24px rgba(255,100,0,.4);font-size:17px;padding:15px 36px;animation:ob-glow-claw 1.6s ease-in-out infinite alternate;}',
    '#ob-btn.ob-btn-claw:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 10px 36px rgba(255,80,0,.55);}',
    '@keyframes ob-glow-claw{from{box-shadow:0 4px 24px rgba(255,100,0,.4);}to{box-shadow:0 4px 40px rgba(255,0,170,.65),0 0 0 4px rgba(255,100,0,.15);}}',
    /* Skip */
    '#ob-skip{position:fixed;top:16px;right:20px;z-index:100001;background:none;border:none;color:rgba(200,220,255,.35);font-family:inherit;font-size:12px;cursor:pointer;letter-spacing:.06em;transition:color .2s;}',
    '#ob-skip:hover{color:rgba(200,220,255,.75);}',
    /* Speech bubble */
    '#ob-bubble{background:rgba(20,22,40,.9);border:1px solid rgba(0,255,247,.2);border-radius:12px;padding:14px 18px;margin:0 0 24px;font-size:15px;color:#c8dfff;line-height:1.6;position:relative;}',
    '#ob-bubble::before{content:"";position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:rgba(0,255,247,.2);}',
    '#ob-bubble::after{content:"";position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:rgba(20,22,40,.9);}',
    /* Spotlight */
    '#ob-spotlight{position:fixed;inset:0;z-index:99998;pointer-events:none;background:rgba(0,0,5,.0);transition:background .4s;}',
    '#ob-spotlight.ob-spot-active{pointer-events:all;background:rgba(0,0,5,.78);}',
    '#ob-tooltip{position:fixed;z-index:100000;background:linear-gradient(135deg,#0d1a2a,#0a1220);border:1.5px solid rgba(0,255,247,.3);border-radius:10px;padding:12px 16px;max-width:260px;font-family:inherit;font-size:13px;color:#c8dfff;line-height:1.5;box-shadow:0 4px 24px rgba(0,0,0,.6);opacity:0;transform:scale(.9);transition:opacity .3s,transform .3s;}',
    '#ob-tooltip.ob-tip-in{opacity:1;transform:scale(1);}',
    '#ob-tooltip-text{margin:0 0 10px;}',
    '#ob-tip-btn{display:inline-block;padding:7px 18px;background:linear-gradient(135deg,#00c8ff,#9040ff);border:none;border-radius:7px;color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}',
    '#ob-tip-btn:hover{transform:translateY(-1px);}',
    '#ob-glow-ring{position:fixed;z-index:99999;border-radius:10px;box-shadow:0 0 0 3px rgba(0,255,247,.8),0 0 0 6px rgba(0,255,247,.3),0 0 30px 6px rgba(0,255,247,.2);pointer-events:none;transition:all .35s ease;opacity:0;}',
    '#ob-glow-ring.ob-ring-in{opacity:1;}',
    /* Toast */
    '#ob-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);z-index:100002;background:linear-gradient(135deg,#0d1a2a,#0a1220);border:1.5px solid rgba(120,255,200,.3);border-radius:10px;padding:12px 22px;font-family:inherit;font-size:14px;color:#c8dfff;box-shadow:0 4px 24px rgba(0,0,0,.6);opacity:0;transition:opacity .4s ease,transform .4s ease;white-space:nowrap;}',
    '#ob-toast.ob-toast-in{opacity:1;transform:translateX(-50%) translateY(0);}',
    /* Fullscreen step 1 title */
    '#ob-big-text{font-family:inherit;font-size:22px;color:#ddeeff;line-height:1.6;margin:16px 0 32px;min-height:34px;}',
    /* Mobile */
    '@media(max-width:480px){#ob-card{padding:28px 20px 24px;width:94%;}#ob-body{font-size:15px;}#ob-btn{padding:12px 24px;font-size:14px;}#ob-btn.ob-btn-claw{font-size:15px;}#ob-big-text{font-size:18px;}}'
  ].join('\n');
  document.head.appendChild(styleEl);

  // ─── State ────────────────────────────────────────────────────────────────
  var state = {
    step: 0,
    spotlightIndex: 0,
    typewriterTimer: null,
    destroyed: false
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function typewriter(el, text, speed, onDone) {
    el.textContent = '';
    var i = 0;
    clearTimeout(state.typewriterTimer);
    function tick() {
      if (state.destroyed) return;
      if (i < text.length) {
        el.textContent += text[i++];
        state.typewriterTimer = setTimeout(tick, speed || 38);
      } else if (onDone) {
        onDone();
      }
    }
    tick();
  }

  function $(id) { return document.getElementById(id); }

  function showBtn(id) {
    var b = $(id);
    if (b) { b.style.display = 'inline-block'; b.style.opacity = '1'; }
  }

  function hideBtn(id) {
    var b = $(id);
    if (b) b.style.display = 'none';
  }

  function goFloor3() {
    try {
      if (typeof window.changeFloor === 'function') {
        window.changeFloor(3);
      } else if (window.S) {
        window.S.floor = 3;
      }
    } catch (e) {}
  }

  function complete() {
    state.destroyed = true;
    localStorage.setItem('echo_onboarding_complete', '1');
    try {
      if (typeof window.companionEvent === 'function') {
        window.companionEvent('onboarding_complete', {});
      }
    } catch (e) {}
    teardown();
    showToast('🥚 Your companion is watching. Three days to hatch.');
  }

  function teardown() {
    var ids = ['ob-overlay', 'ob-spotlight', 'ob-tooltip', 'ob-glow-ring', 'ob-skip'];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.remove();
    });
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.id = 'ob-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('ob-toast-in'); }, 60);
    setTimeout(function () {
      t.classList.remove('ob-toast-in');
      setTimeout(function () { t.remove(); }, 500);
    }, 4500);
  }

  function skip() {
    state.destroyed = true;
    complete();
  }

  // ─── Build DOM ───────────────────────────────────────────────────────────
  function buildOverlay() {
    // Main overlay
    var overlay = document.createElement('div');
    overlay.id = 'ob-overlay';

    var card = document.createElement('div');
    card.id = 'ob-card';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Skip button
    var skipBtn = document.createElement('button');
    skipBtn.id = 'ob-skip';
    skipBtn.textContent = 'Skip intro →';
    skipBtn.addEventListener('click', skip);
    document.body.appendChild(skipBtn);

    // Spotlight layer
    var spotlight = document.createElement('div');
    spotlight.id = 'ob-spotlight';
    document.body.appendChild(spotlight);

    // Glow ring
    var ring = document.createElement('div');
    ring.id = 'ob-glow-ring';
    document.body.appendChild(ring);

    // Tooltip
    var tip = document.createElement('div');
    tip.id = 'ob-tooltip';
    tip.innerHTML = '<p id="ob-tooltip-text"></p><button id="ob-tip-btn">Got it →</button>';
    document.body.appendChild(tip);

    return { overlay: overlay, card: card };
  }

  // ─── Step 1: The Arrival ─────────────────────────────────────────────────
  function step1(card, overlay) {
    card.innerHTML = [
      '<span id="ob-egg">🥚</span>',
      '<div id="ob-big-text"></div>',
      '<button id="ob-btn" style="display:none;opacity:0">Continue →</button>'
    ].join('');

    setTimeout(function () {
      overlay.classList.add('ob-visible');
      setTimeout(function () {
        card.classList.add('ob-card-in');
        setTimeout(function () {
          typewriter($('ob-big-text'), '...someone\'s been waiting for you.', 45, function () {
            var btn = $('ob-btn');
            if (!btn) return;
            btn.style.display = 'inline-block';
            btn.style.opacity = '0';
            setTimeout(function () { btn.style.transition = 'opacity .4s'; btn.style.opacity = '1'; }, 60);
            btn.addEventListener('click', function () { step2(card); });
          });
        }, 300);
      }, 400);
    }, 1000);
  }

  // ─── Step 2: The Egg speaks ──────────────────────────────────────────────
  function step2(card) {
    card.classList.remove('ob-card-in');
    setTimeout(function () {
      card.innerHTML = [
        '<span id="ob-egg">🥚</span>',
        '<div id="ob-bubble" style="opacity:0;transition:opacity .4s">',
        '  <span id="ob-body">I\'ve been here a while. Three more days and I\'ll hatch.<br>But there\'s a lot we can do while we wait.</span>',
        '</div>',
        '<button id="ob-btn" style="display:none">Let\'s go →</button>'
      ].join('');
      card.classList.add('ob-card-in');
      setTimeout(function () {
        var bubble = card.querySelector('#ob-bubble');
        if (bubble) bubble.style.opacity = '1';
        var btn = $('ob-btn');
        if (!btn) return;
        setTimeout(function () {
          btn.style.display = 'inline-block';
          btn.addEventListener('click', function () { step3(card); });
        }, 1600);
      }, 200);
    }, 350);
  }

  // ─── Step 3: Spotlight Tour ───────────────────────────────────────────────
  var spotlights = [
    {
      selector: '#companion-panel',
      fallback: null,
      text: "I'll live here. Keep an eye on me.",
      tipPos: 'left'
    },
    {
      selector: '.floor-btn',
      fallback: '#top-left-hud',
      text: "The station has 12 floors. Each one is different.",
      tipPos: 'right'
    },
    {
      selector: '#hud',
      fallback: null,
      text: "Walk around. Interact with things. You can dash with double-tap.",
      tipPos: 'bottom'
    }
  ];

  function step3(card) {
    // Hide the main card
    card.classList.remove('ob-card-in');
    setTimeout(function () {
      card.style.display = 'none';
      doSpotlight(0);
    }, 350);
  }

  function doSpotlight(idx) {
    if (state.destroyed) return;
    if (idx >= spotlights.length) {
      // Done — move to step 4
      clearSpotlight();
      var card = $('ob-card');
      if (card) card.style.display = '';
      step4(card);
      return;
    }

    var s = spotlights[idx];
    var el = document.querySelector(s.selector) || (s.fallback ? document.querySelector(s.fallback) : null);

    var spotlight = $('ob-spotlight');
    var ring = $('ob-glow-ring');
    var tip = $('ob-tooltip');

    if (!spotlight || !ring || !tip) return;

    spotlight.classList.add('ob-spot-active');

    if (el) {
      var rect = el.getBoundingClientRect();
      var pad = 8;
      ring.style.left = (rect.left - pad) + 'px';
      ring.style.top = (rect.top - pad) + 'px';
      ring.style.width = (rect.width + pad * 2) + 'px';
      ring.style.height = (rect.height + pad * 2) + 'px';
      setTimeout(function () { ring.classList.add('ob-ring-in'); }, 60);

      // Position tooltip
      var tipW = 270;
      var tipH = 90;
      var tLeft, tTop;
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      if (rect.left > vw / 2) {
        // element on right → show tip to the left
        tLeft = Math.max(10, rect.left - tipW - 20);
      } else {
        // element on left → show tip to the right
        tLeft = Math.min(vw - tipW - 10, rect.right + 20);
      }
      tTop = Math.min(vh - tipH - 20, Math.max(20, rect.top + rect.height / 2 - tipH / 2));

      tip.style.left = tLeft + 'px';
      tip.style.top = tTop + 'px';
      tip.style.width = tipW + 'px';
    } else {
      // No element found → center tooltip
      ring.classList.remove('ob-ring-in');
      tip.style.left = '50%';
      tip.style.top = '50%';
      tip.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    $('ob-tooltip-text').textContent = s.text;
    tip.classList.remove('ob-tip-in');
    void tip.offsetWidth; // force reflow
    tip.classList.add('ob-tip-in');

    $('ob-tip-btn').onclick = function () {
      tip.classList.remove('ob-tip-in');
      ring.classList.remove('ob-ring-in');
      setTimeout(function () { doSpotlight(idx + 1); }, 320);
    };
  }

  function clearSpotlight() {
    var spotlight = $('ob-spotlight');
    var ring = $('ob-glow-ring');
    var tip = $('ob-tooltip');
    if (spotlight) spotlight.classList.remove('ob-spot-active');
    if (ring) ring.classList.remove('ob-ring-in');
    if (tip) tip.classList.remove('ob-tip-in');
  }

  // ─── Step 4: The Claw ────────────────────────────────────────────────────
  function step4(card) {
    if (!card) card = $('ob-card');
    if (!card) return;

    card.classList.remove('ob-card-in');
    setTimeout(function () {
      card.innerHTML = [
        '<span id="ob-egg" style="font-size:52px;margin-bottom:14px">🎰</span>',
        '<div id="ob-body">',
        '  One more thing. There\'s a claw machine on Floor 3.<br>',
        '  <em>Three free plays. Every day.</em><br>',
        '  You should probably try it right now.',
        '</div>',
        '<button id="ob-btn" class="ob-btn-claw">🎰 Go to the Arcade →</button>'
      ].join('');
      card.classList.add('ob-card-in');

      $('ob-btn').addEventListener('click', function () {
        goFloor3();
        complete();
      });
    }, 350);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    var els = buildOverlay();
    step1(els.card, els.overlay);
  }

  // Start after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
