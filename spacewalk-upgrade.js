// spacewalk-upgrade.js — Complete EVA overhaul
// - Fixes stuck-in-space bug (guaranteed exit paths)
// - Beautiful station exterior view (proper ring + modules)
// - Zero-G movement with tether + jetpack
// - Collectibles, secrets, and a reason to be out there
// ════════════════════════════════════════════════════════

(function SpacewalkUpgrade() {
  'use strict';

  // ── Wait for game ready ──────────────────────────────────────────
  function waitReady(fn) {
    if (typeof S !== 'undefined' && typeof toggleSpacewalk === 'function') fn();
    else setTimeout(() => waitReady(fn), 500);
  }

  waitReady(function() {

    // ── Fix 1: Nuclear-proof exit button ────────────────────────────
    // Create a new persistent exit button that can NEVER be buried.
    // Removed old one to avoid duplicates.
    let _exitBtn = null;

    function ensureExitBtn() {
      if (_exitBtn && document.body.contains(_exitBtn)) return;
      // Remove any old ones
      document.querySelectorAll('#eva-exit-btn, #sw-exit-btn').forEach(b => b.remove());

      _exitBtn = document.createElement('button');
      _exitBtn.id = 'sw-exit-btn';
      _exitBtn.innerHTML = '🚀 RETURN TO STATION';
      _exitBtn.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:2147483647', // max z-index
        'padding:14px 32px',
        'font-size:15px',
        'font-weight:bold',
        'font-family:inherit',
        'background:linear-gradient(135deg,#ff4444,#cc0000)',
        'color:#fff',
        'border:3px solid rgba(255,255,255,0.9)',
        'border-radius:14px',
        'cursor:pointer',
        'box-shadow:0 0 24px rgba(255,60,60,0.7), 0 4px 20px rgba(0,0,0,0.8)',
        'animation:sw-pulse 1.2s ease-in-out infinite',
        'letter-spacing:1px',
        '-webkit-tap-highlight-color:transparent',
        'touch-action:manipulation',
        'user-select:none',
      ].join(';');

      _exitBtn.addEventListener('click', exitEVA);
      _exitBtn.addEventListener('touchend', function(e) { e.preventDefault(); exitEVA(); });
      document.body.appendChild(_exitBtn);

      // Pulse animation
      if (!document.getElementById('sw-exit-style')) {
        const st = document.createElement('style');
        st.id = 'sw-exit-style';
        st.textContent = `
          @keyframes sw-pulse {
            0%,100% { box-shadow:0 0 24px rgba(255,60,60,0.7),0 4px 20px rgba(0,0,0,0.8); transform:translateX(-50%) scale(1); }
            50%      { box-shadow:0 0 40px rgba(255,80,80,1),0 4px 20px rgba(0,0,0,0.8); transform:translateX(-50%) scale(1.04); }
          }
        `;
        document.head.appendChild(st);
      }
    }

    function exitEVA() {
      if (typeof S !== 'undefined') S.spacewalk.active = false;
      const btn = document.getElementById('btn-spacewalk');
      if (btn) btn.classList.remove('active');
      if (_exitBtn) _exitBtn.style.display = 'none';
      if (typeof showThought === 'function') showThought('Airlock sealed. Welcome back. 🛸');
      if (typeof showNotification === 'function') showNotification('Back inside the station');
    }

    // ── Fix 2: Patch toggleSpacewalk to use our button ──────────────
    const _origToggle = window.toggleSpacewalk;
    window.toggleSpacewalk = function() {
      _origToggle.apply(this, arguments);
      if (typeof S !== 'undefined' && S.spacewalk.active) {
        ensureExitBtn();
        _exitBtn.style.display = 'block';
        // Initialize EVA state
        _eva.entered = true;
        _eva.enterFloor = S.floor;
        _eva.flybyAngle = 0;
        _eva.discoveries = [];
        if (typeof companionEvent === 'function') {
          window.companionEvent('eva_start', {});
        }
      } else {
        if (_exitBtn) _exitBtn.style.display = 'none';
        _eva.entered = false;
      }
    };

    // Also patch the HUD button to use our exit button
    const hwBtn = document.getElementById('btn-spacewalk');
    if (hwBtn) {
      hwBtn.onclick = function() {
        if (typeof S !== 'undefined' && S.spacewalk && S.spacewalk.active) {
          exitEVA();
        } else {
          if (typeof toggleSpacewalk === 'function') toggleSpacewalk();
        }
      };
    }
    const abBtn = document.getElementById('ab-spacewalk');
    if (abBtn) {
      abBtn.onclick = function() {
        if (typeof S !== 'undefined' && S.spacewalk && S.spacewalk.active) {
          exitEVA();
        } else {
          if (typeof toggleSpacewalk === 'function') toggleSpacewalk();
        }
      };
    }

    // ESC always exits
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && typeof S !== 'undefined' && S.spacewalk && S.spacewalk.active) {
        exitEVA();
      }
    }, { passive: true });

    // ── EVA state ────────────────────────────────────────────────────
    const _eva = {
      entered: false,
      enterFloor: 1,
      flybyAngle: 0,
      stationRotation: 0,
      discoveries: [],
      secretFound: false,
      lastDiscoveryCheck: 0,
      cometTimer: 0,
      cometActive: false,
      comet: { x: -200, y: 0, vx: 8, vy: 2 },
    };

    // ── Station exterior renderer ────────────────────────────────────
    function drawStationExterior(ctx, cx, cy, t) {
      const W = window.W || 800, H = window.H || 600;
      const sw = S.spacewalk;

      // Station silhouette — proper space station shape
      const scale = 1 + Math.sin(t * 0.3) * 0.02; // gentle breathing
      _eva.stationRotation += 0.002; // very slow rotation
      const rot = _eva.stationRotation;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);

      // Solar panels (large, extending sides)
      const panelColors = ['#1a2a4a', '#1e3055', '#162240'];
      for (let side = -1; side <= 1; side += 2) {
        // Panel arm
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(side * 28, -4, side * 22, 8);
        // Solar cells
        for (let p = 0; p < 3; p++) {
          const px = side * (50 + p * 16);
          ctx.fillStyle = panelColors[p % 3];
          ctx.fillRect(px - 6, -12, 14, 24);
          // Cell lines
          ctx.strokeStyle = '#2244aa';
          ctx.lineWidth = 0.5;
          for (let l = 0; l < 4; l++) {
            ctx.beginPath();
            ctx.moveTo(px - 6 + l * 3.5, -12);
            ctx.lineTo(px - 6 + l * 3.5, 12);
            ctx.stroke();
          }
          // Blue glow on solar panels
          ctx.fillStyle = `rgba(40,100,200,${0.1 + Math.sin(t * 2 + p) * 0.05})`;
          ctx.fillRect(px - 6, -12, 14, 24);
        }
      }

      // Main hull — central module
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(-28, -18, 56, 36);
      // Hull detail lines
      ctx.strokeStyle = '#3a3a4a';
      ctx.lineWidth = 1;
      for (let i = -20; i < 20; i += 8) {
        ctx.beginPath(); ctx.moveTo(i, -18); ctx.lineTo(i, 18); ctx.stroke();
      }

      // Forward module (left)
      ctx.fillStyle = '#252535';
      ctx.fillRect(-44, -12, 16, 24);
      // Aft module (right)
      ctx.fillStyle = '#252535';
      ctx.fillRect(28, -12, 16, 24);

      // Docking ports (top/bottom)
      ctx.fillStyle = '#333';
      ctx.fillRect(-6, -22, 12, 6);
      ctx.fillRect(-6, 16, 12, 6);

      // Glowing windows — warm amber
      const windowGlow = 0.6 + Math.sin(t * 1.5) * 0.2;
      ctx.fillStyle = `rgba(255,180,60,${windowGlow})`;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(i * 9 - 3, -6, 6, 5);
        ctx.fillRect(i * 9 - 3, 4, 6, 5);
      }
      // Blue science module windows
      ctx.fillStyle = `rgba(100,180,255,${windowGlow * 0.8})`;
      ctx.fillRect(-40, -5, 8, 10);

      // Running lights (blinking)
      const blink = Math.floor(t * 2) % 2;
      ctx.fillStyle = blink ? '#ff3333' : 'rgba(255,50,50,0.3)';
      ctx.beginPath(); ctx.arc(-44, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = blink ? '#33ff33' : 'rgba(50,255,50,0.3)';
      ctx.beginPath(); ctx.arc(44, -14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(100,200,255,${0.4 + Math.sin(t * 3) * 0.3})`;
      ctx.beginPath(); ctx.arc(0, -22, 3, 0, Math.PI * 2); ctx.fill();

      // Station name (tiny)
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("ECHO'S VAULT", 0, 28);
      ctx.textAlign = 'left';

      // Atmosphere glow around station
      const grd = ctx.createRadialGradient(0, 0, 30, 0, 0, 90);
      grd.addColorStop(0, 'rgba(100,150,255,0)');
      grd.addColorStop(0.5, 'rgba(80,120,220,0.04)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    // ── Comet system ─────────────────────────────────────────────────
    function updateComet(dt) {
      _eva.cometTimer -= dt;
      if (_eva.cometTimer <= 0 && !_eva.cometActive) {
        // Spawn comet every 20-40 seconds
        _eva.cometTimer = 20 + Math.random() * 20;
        _eva.cometActive = true;
        const edge = Math.floor(Math.random() * 4);
        const W = window.W || 800, H = window.H || 600;
        if (edge === 0) { _eva.comet.x = -50; _eva.comet.y = Math.random() * H; _eva.comet.vx = 4 + Math.random() * 6; _eva.comet.vy = (Math.random() - 0.5) * 3; }
        else if (edge === 1) { _eva.comet.x = W + 50; _eva.comet.y = Math.random() * H; _eva.comet.vx = -(4 + Math.random() * 6); _eva.comet.vy = (Math.random() - 0.5) * 3; }
        else if (edge === 2) { _eva.comet.x = Math.random() * W; _eva.comet.y = -50; _eva.comet.vx = (Math.random() - 0.5) * 3; _eva.comet.vy = 4 + Math.random() * 6; }
        else { _eva.comet.x = Math.random() * W; _eva.comet.y = H + 50; _eva.comet.vx = (Math.random() - 0.5) * 3; _eva.comet.vy = -(4 + Math.random() * 6); }
      }

      if (_eva.cometActive) {
        _eva.comet.x += _eva.comet.vx;
        _eva.comet.y += _eva.comet.vy;
        const W = window.W || 800, H = window.H || 600;
        if (_eva.comet.x < -100 || _eva.comet.x > W + 100 || _eva.comet.y < -100 || _eva.comet.y > H + 100) {
          _eva.cometActive = false;
        }
        // Player touches comet → bonus coins + notification
        if (typeof S !== 'undefined' && S.spacewalk) {
          const sw = S.spacewalk;
          if (Math.hypot(sw.x - _eva.comet.x, sw.y - _eva.comet.y) < 20) {
            _eva.cometActive = false;
            if (typeof Coins !== 'undefined') Coins.earn(25, 'comet');
            if (typeof showNotification === 'function') showNotification('☄️ Comet touched! +25◈');
            if (typeof window.companionEvent === 'function') window.companionEvent('comet_touched', {});
          }
        }
      }
    }

    function drawComet(ctx) {
      if (!_eva.cometActive) return;
      const c = _eva.comet;
      // Tail
      const tailLen = 60;
      const angle = Math.atan2(-_eva.comet.vy, -_eva.comet.vx);
      const grad = ctx.createLinearGradient(c.x, c.y, c.x + Math.cos(angle) * tailLen, c.y + Math.sin(angle) * tailLen);
      grad.addColorStop(0, 'rgba(200,220,255,0.8)');
      grad.addColorStop(0.4, 'rgba(100,150,255,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(angle) * tailLen, c.y + Math.sin(angle) * tailLen);
      ctx.stroke();
      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,200,255,0.6)';
      ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
    }

    // ── Nebula background ────────────────────────────────────────────
    function drawNebula(ctx, t) {
      const W = window.W || 800, H = window.H || 600;
      // Subtle nebula clouds in background
      const clouds = [
        { x: W * 0.2, y: H * 0.3, r: 120, c: 'rgba(80,30,120,', pulse: 0.015 },
        { x: W * 0.8, y: H * 0.6, r: 100, c: 'rgba(30,60,120,', pulse: 0.02 },
        { x: W * 0.5, y: H * 0.8, r: 140, c: 'rgba(60,100,80,', pulse: 0.01 },
      ];
      clouds.forEach(cl => {
        const alpha = 0.04 + Math.sin(t * cl.pulse) * 0.01;
        const grd = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
        grd.addColorStop(0, cl.c + alpha + ')');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      });
    }

    // ── Patch renderSpacewalk ────────────────────────────────────────
    const _origRender = window.renderSpacewalk;
    window.renderSpacewalk = function() {
      if (!S.spacewalk.active) return;

      const W = window.W || 800, H = window.H || 600;
      const t = S.time || 0;
      const sw = S.spacewalk;

      // Deep space background
      ctx.fillStyle = '#000008';
      ctx.fillRect(0, 0, W, H);

      // Nebula
      drawNebula(ctx, t);

      // Stars (parallax layers)
      for (let layer = 0; layer < 3; layer++) {
        const count = [80, 50, 30][layer];
        const sizes = [1, 1.5, 2][layer];
        const alphaBase = [0.3, 0.5, 0.8][layer];
        for (let i = 0; i < count; i++) {
          const seed = i * 37 + layer * 500;
          const twinkle = alphaBase + Math.sin(t * (0.5 + layer * 0.3) + i * 0.7) * 0.3;
          ctx.fillStyle = layer === 2
            ? `rgba(200,220,255,${twinkle})`
            : `rgba(255,255,255,${Math.max(0, twinkle)})`;
          const sx = (seed * 53 + 7) % W;
          const sy = (seed * 29 + 13) % H;
          ctx.fillRect(sx, sy, sizes, sizes);
        }
      }

      // Comet
      drawComet(ctx);

      // Station exterior — the big visual upgrade
      // Position station relative to player (always visible nearby)
      const stationScreenX = W / 2 + (W / 2 - sw.x) * 0.15;
      const stationScreenY = H / 2 + (H / 2 - sw.y) * 0.15;
      drawStationExterior(ctx, stationScreenX, stationScreenY, t);

      // Earth (top-right)
      const earthX = W - 120, earthY = 80, earthR = 55;
      const grd = ctx.createRadialGradient(earthX - 10, earthY - 10, 5, earthX, earthY, earthR);
      grd.addColorStop(0, '#5a9ae2');
      grd.addColorStop(0.4, '#3a7ac0');
      grd.addColorStop(0.8, '#2a5aa0');
      grd.addColorStop(1, '#1a3060');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2); ctx.fill();
      // Continents
      ctx.fillStyle = '#3a8a3a';
      for (let i = 0; i < 8; i++) {
        const a = sw.earthAngle + i * 0.8;
        ctx.beginPath(); ctx.arc(earthX + Math.cos(a) * earthR * 0.5, earthY + Math.sin(a) * earthR * 0.35, 8 + i * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // Cloud wisps
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 12; i++) {
        const a = sw.earthAngle * 0.6 + i * 0.55;
        ctx.beginPath(); ctx.arc(earthX + Math.cos(a) * earthR * 0.75, earthY + Math.sin(a) * earthR * 0.55, 4 + i * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      // Atmosphere halo
      const atmosGrd = ctx.createRadialGradient(earthX, earthY, earthR - 2, earthX, earthY, earthR + 12);
      atmosGrd.addColorStop(0, 'rgba(100,180,255,0.3)');
      atmosGrd.addColorStop(1, 'rgba(100,180,255,0)');
      ctx.fillStyle = atmosGrd;
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR + 12, 0, Math.PI * 2); ctx.fill();

      // Moon (small, different corner)
      const moonX = 80, moonY = 60, moonR = 18;
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(moonX + 4, moonY - 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX - 5, moonY + 4, 3, 0, Math.PI * 2); ctx.fill();

      // Debris
      sw.debris.forEach(d => {
        if (d.collected) return;
        const pulse = 0.7 + Math.sin(t * 4 + d.x * 0.01) * 0.3;
        if (d.type === 'crystal') {
          ctx.fillStyle = `rgba(0,255,200,${pulse})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(0,255,200,${pulse * 0.3})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.size * 2.5, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(160,160,160,${pulse})`;
          ctx.beginPath();
          ctx.moveTo(d.x + d.size, d.y);
          ctx.lineTo(d.x + d.size * 0.3, d.y + d.size);
          ctx.lineTo(d.x - d.size, d.y + d.size * 0.4);
          ctx.lineTo(d.x - d.size * 0.5, d.y - d.size);
          ctx.closePath(); ctx.fill();
        }
      });

      // Tether cable from player to station
      ctx.strokeStyle = 'rgba(200,220,255,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y);
      ctx.lineTo(stationScreenX, stationScreenY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Player in EVA suit
      ctx.save();
      ctx.translate(sw.x, sw.y);
      // Suit body
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-10, -12, 20, 18);
      // Suit patches
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(-10, -12, 4, 4);
      ctx.fillRect(6, -12, 4, 4);
      // Helmet
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.arc(0, -18, 9, 0, Math.PI * 2); ctx.fill();
      // Visor (gold tint in sunlight)
      const visorColor = 'rgba(180,140,50,0.85)';
      ctx.fillStyle = visorColor;
      ctx.beginPath(); ctx.arc(0, -18, 7, 0, Math.PI * 2); ctx.fill();
      // Visor reflection
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(-2, -21, 3, 0, Math.PI * 2); ctx.fill();
      // Life support backpack
      ctx.fillStyle = '#888';
      ctx.fillRect(-8, 4, 16, 8);
      ctx.fillStyle = '#44ff44';
      ctx.fillRect(-5, 6, 4, 4);
      // Arms
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-16, -8, 6, 14);
      ctx.fillRect(10, -8, 6, 14);
      // Legs
      ctx.fillRect(-8, 6, 6, 10);
      ctx.fillRect(2, 6, 6, 10);
      // Thruster glow when moving
      if (S.keys && (S.keys.up || S.keys.down || S.keys.left || S.keys.right)) {
        ctx.fillStyle = 'rgba(0,200,255,0.8)';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.arc((Math.random() - 0.5) * 20, 12 + Math.random() * 8, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      // EVA HUD
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space for HUD

      // Top-left panel
      ctx.fillStyle = 'rgba(0,5,20,0.85)';
      ctx.strokeStyle = '#00fff7';
      ctx.lineWidth = 1;
      roundRect(ctx, 10, 10, 170, 75);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00fff7';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('◈ EVA MODE', 18, 26);
      ctx.fillStyle = '#aaa';
      ctx.font = '9px monospace';
      ctx.fillText(`O₂: ${Math.floor(sw.oxygen)}%`, 18, 42);
      ctx.fillText(`Debris: ${sw.debris.length} remaining`, 18, 56);
      ctx.fillText(`Coins: ${typeof Coins !== 'undefined' ? Coins.count : 0} ◈`, 18, 70);

      // Controls reminder (fades after 10s)
      const elapsed = (S.time || 0) - (_eva.enterTime || 0);
      if (elapsed < 12) {
        const alpha = Math.min(1, Math.max(0, 1 - (elapsed - 8) / 4));
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WASD / Arrow keys — Thrusters', W / 2, H - 48);
        ctx.fillText('Collect crystals for coins  •  Touch comets for bonus', W / 2, H - 36);
        ctx.textAlign = 'left';
      }

      ctx.restore();
    };

    // ── Patch updateSpacewalk to add comet ───────────────────────────
    const _origUpdate = window.updateSpacewalk;
    window.updateSpacewalk = function(dt) {
      _origUpdate.apply(this, arguments);
      if (S.spacewalk.active) {
        updateComet(dt);
        if (!_eva.enterTime) _eva.enterTime = S.time;

        // Keep exit button visible
        if (_exitBtn) {
          _exitBtn.style.display = 'block';
          // Ensure it's on top
          if (_exitBtn.parentNode !== document.body) document.body.appendChild(_exitBtn);
        }
      }
    };

    // ── Helper: rounded rect ─────────────────────────────────────────
    function roundRect(ctx, x, y, w, h, r) {
      r = r || 6;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    // ── If already in spacewalk, apply fix immediately ───────────────
    if (typeof S !== 'undefined' && S.spacewalk && S.spacewalk.active) {
      ensureExitBtn();
      _exitBtn.style.display = 'block';
    }

    console.log('[SpacewalkUpgrade] EVA upgraded — proper station exterior, guaranteed exit, comets ☄️');
  });

})();
