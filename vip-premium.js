// ╔══════════════════════════════════════════════════════════════════╗
// ║        👑 VIP PREMIUM — ECHO'S VAULT PATRON EXPERIENCE        ║
// ║   Business class. First-class lounge. Apple Store VIP.        ║
// ║   Loaded after main scripts. Does NOT modify index.html.      ║
// ╚══════════════════════════════════════════════════════════════════╝
(function VIPPremium() {
  'use strict';

  // ─── CONSTANTS ────────────────────────────────────────────────────
  const VIP_TIERS = [
    { id: 'visitor',  name: 'Visitor',    minCoins: 0,     discount: 0,  color: '#888888', badge: '',   special: false },
    { id: 'citizen',  name: 'Citizen',    minCoins: 100,   discount: 5,  color: '#44cc44', badge: '⭐', special: false },
    { id: 'resident', name: 'Resident',   minCoins: 1000,  discount: 10, color: '#4488ff', badge: '💎', special: false },
    { id: 'creator',  name: 'Creator',    minCoins: 5000,  discount: 15, color: '#ff6ec7', badge: '🎨', special: false },
    { id: 'patron',   name: 'Patron',     minCoins: 10000, discount: 20, color: '#ffd700', badge: '👑', special: false },
    { id: 'founder',  name: 'Founder',    minCoins: 50000, discount: 25, color: '#ff4500', badge: '🔮', special: true  },
  ];

  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ─── 1. TIER CALCULATION ──────────────────────────────────────────
  function calcTier() {
    // Prefer explicit override (admin grant / subscription webhook)
    const override = LS.get('echovault_vip_tier', null);
    if (override) {
      const t = VIP_TIERS.find(t => t.id === override);
      if (t) return t;
    }
    // Calculate from lifetime coins
    const lifetime = LS.get('lifetimeCoins', 0);
    let tier = VIP_TIERS[0];
    for (const t of VIP_TIERS) {
      if (lifetime >= t.minCoins) tier = t;
    }
    return tier;
  }

  function nextTier(current) {
    const idx = VIP_TIERS.findIndex(t => t.id === current.id);
    return VIP_TIERS[idx + 1] || null;
  }

  function coinsToNext(current) {
    const next = nextTier(current);
    if (!next) return 0;
    const lifetime = LS.get('lifetimeCoins', 0);
    return Math.max(0, next.minCoins - lifetime);
  }

  function tierProgressPct(current) {
    const next = nextTier(current);
    if (!next) return 100;
    const lifetime = LS.get('lifetimeCoins', 0);
    const range = next.minCoins - current.minCoins;
    const progress = lifetime - current.minCoins;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }

  // Expose so other scripts can read it
  window.VIPPremium = {
    getTier: calcTier,
    getTiers: () => VIP_TIERS,
    isPatronPlus: () => {
      const t = calcTier();
      return ['patron', 'founder'].includes(t.id);
    },
    isFounder: () => calcTier().id === 'founder',
    openModal: openSubscriptionModal,
  };

  // ─── 2. AVATAR EFFECTS ────────────────────────────────────────────
  const _avatarParticles = [];
  let _avatarEffectTick = 0;
  let _citizenSparkleTimer = 0;
  let _founderAuraPulse = 0;
  let _residentOrbitAngle = 0;
  let _lastVisitorX = null;
  let _lastVisitorY = null;
  const _paintSplatters = []; // creator trail

  function pushParticle(p) {
    if (_avatarParticles.length >= 20) return; // global cap
    _avatarParticles.push(p);
  }

  function spawnAvatarEffects(tier, x, y, moving) {
    const now = _avatarEffectTick;

    if (tier.id === 'citizen') {
      _citizenSparkleTimer++;
      if (_citizenSparkleTimer > 180) { // every 3s at 60fps
        _citizenSparkleTimer = 0;
        for (let i = 0; i < 3; i++) {
          pushParticle({
            x: x + (Math.random() - 0.5) * 28,
            y: y - 10 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -0.8 - Math.random() * 0.8,
            life: 40, maxLife: 40,
            color: '#88ff88', size: 2.5,
            tier: 'citizen',
          });
        }
      }
    }

    if (tier.id === 'resident' || tier.id === 'creator' || tier.id === 'patron' || tier.id === 'founder') {
      // Resident: orbiting blue diamonds (3 particles tracked via angle)
      if (tier.id === 'resident') {
        _residentOrbitAngle += 0.04;
        // particles spawn continuously — just draw them procedurally
      }
    }

    // Creator: paint trail when moving
    if (tier.id === 'creator' && moving) {
      if (now % 4 === 0) {
        const colors = ['#ff6ec7', '#ff44aa', '#dd44ff', '#ff88dd'];
        for (let i = 0; i < 2; i++) {
          pushParticle({
            x: x + (Math.random() - 0.5) * 12,
            y: y + 4 + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 0.3 + Math.random() * 0.8,
            life: 30, maxLife: 30,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 2 + Math.random() * 2,
            tier: 'creator',
          });
        }
      }
    }

    // Founder: star particles
    if (tier.id === 'founder') {
      if (now % 8 === 0) {
        for (let i = 0; i < 2; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 24 + Math.random() * 10;
          pushParticle({
            x: x + Math.cos(ang) * r,
            y: y - 12 + Math.sin(ang) * r,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.5 - Math.random() * 0.5,
            life: 50, maxLife: 50,
            color: Math.random() > 0.5 ? '#ff8844' : '#cc44ff',
            size: 2,
            tier: 'founder',
            star: true,
          });
        }
      }
    }

    // Patron: gold sparkle motes near crown
    if (tier.id === 'patron') {
      if (now % 15 === 0) {
        pushParticle({
          x: x + (Math.random() - 0.5) * 16,
          y: y - 30 + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.6 - Math.random() * 0.5,
          life: 35, maxLife: 35,
          color: '#ffd700',
          size: 2,
          tier: 'patron',
        });
      }
    }
  }

  function tickParticles() {
    for (let i = _avatarParticles.length - 1; i >= 0; i--) {
      const p = _avatarParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.life--;
      if (p.life <= 0) { _avatarParticles.splice(i, 1); }
    }
  }

  function drawParticle(ctx, p) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.star) {
      // 4-pointed star
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? s * 1.5 : s * 0.6;
        const px = p.x + Math.cos(ang) * r;
        const py = p.y + Math.sin(ang) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAvatarEffects(ctx, tier, x, y) {
    const t = performance.now() / 1000;

    if (tier.id === 'resident') {
      // 3 orbiting blue diamond particles
      for (let i = 0; i < 3; i++) {
        const ang = _residentOrbitAngle + (i / 3) * Math.PI * 2;
        const rx = 22, ry = 10;
        const px = x + Math.cos(ang) * rx;
        const py = y - 10 + Math.sin(ang) * ry;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#4488ff';
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px + 3, py);
        ctx.lineTo(px, py + 4);
        ctx.lineTo(px - 3, py);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    if (tier.id === 'patron') {
      // Gold glow halo
      const gAlpha = 0.12 + 0.06 * Math.sin(t * 2);
      const grd = ctx.createRadialGradient(x, y - 10, 5, x, y - 10, 30);
      grd.addColorStop(0, `rgba(255,215,0,${gAlpha})`);
      grd.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.save();
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(x, y - 10, 30, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Crown sprite above avatar (pixel art, 3 prongs)
      ctx.save();
      ctx.fillStyle = '#ffd700';
      const cx = x - 8, cy = y - 36;
      // Base
      ctx.fillRect(cx, cy + 6, 16, 5);
      // Left prong
      ctx.fillRect(cx, cy, 3, 7);
      // Middle prong (taller)
      ctx.fillRect(cx + 6, cy - 3, 3, 10);
      // Right prong
      ctx.fillRect(cx + 13, cy, 3, 7);
      // Gems
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(cx + 1, cy + 1, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 7, cy - 2, 2, 2);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(cx + 14, cy + 1, 2, 2);
      ctx.restore();
    }

    if (tier.id === 'founder') {
      _founderAuraPulse += 0.05;
      const pulseR = 28 + Math.sin(_founderAuraPulse) * 5;
      const alpha = 0.25 + 0.1 * Math.sin(_founderAuraPulse * 1.3);

      // Outer energy ring — orange/purple gradient
      ctx.save();
      ctx.globalAlpha = alpha;
      const ringGrd = ctx.createRadialGradient(x, y - 10, pulseR - 4, x, y - 10, pulseR + 4);
      ringGrd.addColorStop(0, 'rgba(200,50,255,0)');
      ringGrd.addColorStop(0.4, 'rgba(200,80,255,0.9)');
      ringGrd.addColorStop(0.6, 'rgba(255,69,0,0.9)');
      ringGrd.addColorStop(1, 'rgba(255,69,0,0)');
      ctx.strokeStyle = ringGrd;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(x, y - 10, pulseR, pulseR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner fill glow
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.03 * Math.sin(_founderAuraPulse * 0.7);
      const innerGrd = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, pulseR);
      innerGrd.addColorStop(0, 'rgba(255,100,20,0.5)');
      innerGrd.addColorStop(0.5, 'rgba(180,30,255,0.3)');
      innerGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerGrd;
      ctx.beginPath();
      ctx.ellipse(x, y - 10, pulseR, pulseR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw all avatar particles
    for (const p of _avatarParticles) {
      drawParticle(ctx, p);
    }
  }

  function drawTierBadge(ctx, tier, x, y) {
    if (!tier.badge) return;
    ctx.save();
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Soft glow bg
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 6;
    ctx.fillText(tier.badge, x, y - 42);
    ctx.restore();
  }

  // Hook into renderVisitor via window override (same pattern as physics-breach.js)
  function installAvatarHook() {
    const POLL_INTERVAL = 500;
    const tryHook = () => {
      if (typeof window.renderVisitor !== 'function' && typeof renderVisitor === 'undefined') {
        setTimeout(tryHook, POLL_INTERVAL);
        return;
      }
      const base = window.renderVisitor || (typeof renderVisitor !== 'undefined' ? renderVisitor : null);
      if (!base) { setTimeout(tryHook, POLL_INTERVAL); return; }

      window.renderVisitor = function(ctx) {
        // Call original first (draws avatar)
        base(ctx);

        // Then draw our VIP effects on top
        const v = window.S && window.S.visitor;
        if (!v) return;

        _avatarEffectTick++;
        const tier = calcTier();
        if (tier.id === 'visitor') return;

        const moving = _lastVisitorX !== v.x || _lastVisitorY !== v.y;
        _lastVisitorX = v.x;
        _lastVisitorY = v.y;

        spawnAvatarEffects(tier, v.x, v.y, moving);
        tickParticles();
        drawAvatarEffects(ctx, tier, v.x, v.y);
        drawTierBadge(ctx, tier, v.x, v.y);
      };
    };
    setTimeout(tryHook, 1000);
  }

  // ─── 3. HUD PATRON BUTTON ─────────────────────────────────────────
  function injectHUDButton() {
    const tryInject = () => {
      const hud = document.getElementById('hud');
      if (!hud) { setTimeout(tryInject, 800); return; }
      if (document.getElementById('vip-hud-btn')) return;

      const btn = document.createElement('button');
      btn.id = 'vip-hud-btn';
      btn.className = 'hud-btn';
      btn.title = 'VIP Patron Program';
      btn.innerHTML = '⭐';
      btn.style.cssText = 'position:relative;overflow:visible;';

      const tier = calcTier();
      if (tier.id !== 'visitor') {
        btn.innerHTML = tier.badge || '⭐';
        btn.style.borderColor = tier.color;
        btn.style.boxShadow = `0 0 8px ${tier.color}88`;
      }

      btn.addEventListener('click', openSubscriptionModal);
      hud.appendChild(btn);
    };
    setTimeout(tryInject, 1200);
  }

  // Coin HUD also shows tier badge
  function injectCoinHUDBadge() {
    const tryInject = () => {
      const coinHud = document.getElementById('coin-hud');
      if (!coinHud) { setTimeout(tryInject, 1000); return; }
      if (document.getElementById('vip-tier-badge')) return;

      const badge = document.createElement('span');
      badge.id = 'vip-tier-badge';
      const tier = calcTier();
      badge.textContent = tier.badge || '';
      badge.title = tier.name + ' Tier';
      badge.style.cssText = 'font-size:14px;margin-left:2px;filter:drop-shadow(0 0 4px ' + tier.color + ');cursor:pointer;';
      badge.addEventListener('click', openSubscriptionModal);
      coinHud.appendChild(badge);
    };
    setTimeout(tryInject, 1400);
  }

  // ─── 4. SUBSCRIPTION MODAL ───────────────────────────────────────
  let _modalOpen = false;

  function openSubscriptionModal() {
    if (_modalOpen) return;
    _modalOpen = true;

    const tier = calcTier();
    const next = nextTier(tier);
    const pct = tierProgressPct(tier);
    const toNext = coinsToNext(tier);

    const overlay = document.createElement('div');
    overlay.id = 'vip-modal-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.82);backdrop-filter:blur(8px);
      animation:vipFadeIn .3s ease;
    `;

    const MODAL_CSS = `
      @keyframes vipFadeIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
      @keyframes vipBadgePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
      @keyframes vipShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
      @keyframes vipSparkle{0%,100%{opacity:1;transform:translateY(0) scale(1)}50%{opacity:.6;transform:translateY(-4px) scale(1.2)}}
      @keyframes vipProgressGlow{0%,100%{box-shadow:0 0 6px currentColor}50%{box-shadow:0 0 16px currentColor}}
      #vip-modal{
        width:min(660px,96vw);max-height:90vh;overflow-y:auto;
        background:linear-gradient(160deg,rgba(12,10,24,0.98) 0%,rgba(18,10,30,0.98) 100%);
        border:1.5px solid rgba(155,89,182,0.45);border-radius:20px;
        padding:28px 28px 24px;box-shadow:0 0 60px rgba(100,0,200,0.35),0 0 120px rgba(255,69,0,0.1);
        font-family:'Courier New',monospace;color:#f0e8d8;position:relative;
      }
      #vip-modal::-webkit-scrollbar{width:5px}
      #vip-modal::-webkit-scrollbar-track{background:rgba(0,0,0,0.3)}
      #vip-modal::-webkit-scrollbar-thumb{background:#9b59b6;border-radius:3px}
      .vip-header{text-align:center;margin-bottom:18px}
      .vip-header h1{font-size:22px;letter-spacing:3px;background:linear-gradient(90deg,#9b59b6,#ff6ec7,#ffd700,#ff4500,#ff6ec7,#9b59b6);background-size:300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:vipShimmer 4s linear infinite;margin-bottom:4px}
      .vip-pin-banner{background:linear-gradient(90deg,rgba(255,215,0,0.12),rgba(255,110,199,0.12),rgba(255,215,0,0.12));border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:8px 14px;text-align:center;margin-bottom:16px;font-size:12px;color:#ffd700}
      .vip-pin-banner .sparkles{display:inline-block;animation:vipSparkle 1.5s ease-in-out infinite}
      .vip-current-tier{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 16px;margin-bottom:16px}
      .vip-tier-label{font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
      .vip-tier-name-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .vip-tier-badge-big{font-size:22px;animation:vipBadgePulse 2s ease-in-out infinite}
      .vip-progress-bar{height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-bottom:4px}
      .vip-progress-fill{height:100%;border-radius:3px;transition:width .8s ease;animation:vipProgressGlow 2s ease-in-out infinite}
      .vip-progress-text{font-size:10px;color:#666;text-align:right}
      .vip-tiers{display:flex;flex-direction:column;gap:12px;margin-bottom:18px}
      .vip-tier-card{border-radius:14px;padding:14px 16px;border:1.5px solid;position:relative;transition:transform .15s,box-shadow .15s;cursor:default}
      .vip-tier-card:hover{transform:translateY(-2px)}
      .vip-tier-card.current-tier{box-shadow:0 0 24px -4px var(--tc)}
      .vip-tier-card .current-label{position:absolute;top:-10px;right:14px;background:var(--tc);color:#000;font-size:9px;font-weight:bold;padding:2px 8px;border-radius:8px;letter-spacing:1px}
      .vip-tier-card h3{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:15px}
      .vip-tier-card .badge-anim{display:inline-block;animation:vipBadgePulse 2.5s ease-in-out infinite}
      .vip-tier-card .price{font-size:11px;color:#aaa;margin-left:auto}
      .vip-tier-card ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px}
      .vip-tier-card li{font-size:11px;color:#ccc;display:flex;align-items:flex-start;gap:6px}
      .vip-tier-card li::before{content:'•';color:var(--tc);flex-shrink:0}
      .vip-tier-card .phys-perk{color:#ffd080}
      .vip-mission{background:rgba(180,130,255,0.07);border:1px solid rgba(155,89,182,0.25);border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:16px;font-size:12px;color:#c0a0e8;line-height:1.6}
      .vip-mission em{color:#ff8888;font-style:normal}
      .vip-cta{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
      .vip-subscribe-btn{background:linear-gradient(135deg,#9b59b6,#ff6ec7,#ffd700);border:none;border-radius:12px;padding:12px 28px;font-family:inherit;font-size:14px;font-weight:bold;color:#0a0a14;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 20px rgba(155,89,182,0.4);transition:transform .15s,box-shadow .15s}
      .vip-subscribe-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(155,89,182,0.6)}
      .vip-nothanks{background:none;border:none;color:#555;font-family:inherit;font-size:11px;cursor:pointer;padding:4px 8px;transition:color .2s}
      .vip-nothanks:hover{color:#999}
      .vip-close{position:absolute;top:12px;right:14px;background:none;border:none;color:#666;font-size:18px;cursor:pointer;line-height:1;transition:color .2s;font-family:inherit}
      .vip-close:hover{color:#fff}
    `;

    const style = document.createElement('style');
    style.textContent = MODAL_CSS;

    const tierCards = [
      {
        badge: '⭐', name: 'Supporter', price: '€7/mo', id: 'citizen',
        color: '#44cc44',
        perks: [
          { text: 'Badge on avatar', phys: false },
          { text: '5% merch discount', phys: false },
          { text: 'Free enamel pin shipped to your door! 📌', phys: true },
          { text: 'Sponsor 3 free plays/day for the community', phys: false },
        ],
      },
      {
        badge: '💎', name: 'Patron', price: '€25/mo', id: 'resident',
        color: '#4488ff',
        perks: [
          { text: 'Everything in Supporter', phys: false },
          { text: 'Diamond avatar effects', phys: false },
          { text: 'VIP Lounge access', phys: false },
          { text: 'Cinema front row + name on marquee', phys: false },
          { text: '10% merch discount', phys: false },
          { text: 'Free poster shipped quarterly! 🖼️', phys: true },
        ],
      },
      {
        badge: '👑', name: 'Benefactor', price: '€50/mo', id: 'patron',
        color: '#ffd700',
        perks: [
          { text: 'Everything in Patron', phys: false },
          { text: 'Golden crown + glow on avatar', phys: false },
          { text: 'Custom skin creation session', phys: false },
          { text: 'District naming rights', phys: false },
          { text: '15% merch discount', phys: false },
          { text: 'Founding Member Box shipped! 📦', phys: true },
        ],
      },
      {
        badge: '🔮', name: 'Founder', price: '€100/mo or €500 lifetime', id: 'founder',
        color: '#ff4500',
        perks: [
          { text: 'Everything in Benefactor', phys: false },
          { text: 'Animated energy aura (ONLY founders have this)', phys: false },
          { text: 'Ring segment naming rights', phys: false },
          { text: 'Quarterly design session with Echo', phys: false },
          { text: '25% merch discount', phys: false },
          { text: 'ALL future merch drops shipped free! 🚀', phys: true },
        ],
      },
    ];

    const isCurrent = (cardId) => tier.id === cardId;

    const cardsHTML = tierCards.map(card => {
      const current = isCurrent(card.id);
      const cardStyle = `--tc:${card.color};border-color:${card.color}33;background:${card.color}08;`;
      const currentLabel = current ? `<span class="current-label">YOUR TIER</span>` : '';
      const perksHTML = card.perks.map(p =>
        `<li><span class="${p.phys ? 'phys-perk' : ''}">${p.text}</span></li>`
      ).join('');
      return `
        <div class="vip-tier-card${current ? ' current-tier' : ''}" style="${cardStyle}">
          ${currentLabel}
          <h3>
            <span class="badge-anim">${card.badge}</span>
            ${card.name}
            <span class="price">${card.price}</span>
          </h3>
          <ul>${perksHTML}</ul>
        </div>
      `;
    }).join('');

    const progressHTML = next ? `
      <div class="vip-progress-bar">
        <div class="vip-progress-fill" style="width:${pct}%;background:${next.color};color:${next.color}"></div>
      </div>
      <div class="vip-progress-text">${toNext.toLocaleString()} more ◈ to ${next.badge} ${next.name}</div>
    ` : `<div class="vip-progress-text" style="color:#ffd700;text-align:left">✅ Maximum tier — you are legendary.</div>`;

    overlay.innerHTML = `
      <div id="vip-modal">
        <button class="vip-close" id="vip-close-btn">✕</button>
        <div class="vip-header">
          <h1>✨ ECHO'S VAULT — PATRON PROGRAM ✨</h1>
        </div>
        <div class="vip-pin-banner">
          <span class="sparkles">✨</span>
          Every new subscriber receives a <strong>Station Pass enamel pin</strong> shipped FREE! 📌
          <span class="sparkles">✨</span>
        </div>
        <div class="vip-current-tier">
          <div class="vip-tier-label">Your Current Status</div>
          <div class="vip-tier-name-row">
            <span class="vip-tier-badge-big">${tier.badge || '👤'}</span>
            <span style="font-size:16px;color:${tier.color};font-weight:bold">${tier.name}</span>
          </div>
          ${progressHTML}
        </div>
        <div class="vip-tiers">${cardsHTML}</div>
        <div class="vip-mission">
          <em>"Your money funds free plays for the community and MSA brain disease research."</em> 💜<br>
          Every euro goes further than you know.
        </div>
        <div class="vip-cta">
          <button class="vip-subscribe-btn" id="vip-stripe-btn">⭐ Subscribe via Stripe — Coming Soon</button>
          <button class="vip-nothanks" id="vip-dismiss-btn">Not now — keep exploring</button>
        </div>
      </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const close = () => {
      _modalOpen = false;
      overlay.style.animation = 'none';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .2s';
      setTimeout(() => { overlay.remove(); style.remove(); }, 250);
    };

    document.getElementById('vip-close-btn').addEventListener('click', close);
    document.getElementById('vip-dismiss-btn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('vip-stripe-btn').addEventListener('click', () => {
      if (typeof showNotification === 'function') showNotification('🚀 Stripe integration coming soon — stay tuned!');
    });
  }

  // ─── 5. WELCOME CEREMONY ──────────────────────────────────────────
  function triggerWelcomeCeremony(tier) {
    const container = document.createElement('div');
    container.id = 'vip-welcome';
    container.style.cssText = `
      position:fixed;inset:0;z-index:999998;pointer-events:none;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0);transition:background .4s;
    `;
    document.body.appendChild(container);

    // Screen glow flash
    setTimeout(() => {
      container.style.background = `radial-gradient(ellipse at center, ${tier.color}22 0%, rgba(0,0,0,0) 70%)`;
    }, 50);

    // Big welcome text
    const msg = document.createElement('div');
    msg.style.cssText = `
      text-align:center;font-family:'Courier New',monospace;
      animation:vipWelcomeIn .5s cubic-bezier(0.34,1.56,0.64,1) forwards;
      opacity:0;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes vipWelcomeIn{0%{opacity:0;transform:scale(.5) translateY(30px)}100%{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes vipWelcomeOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.1) translateY(-20px)}}
    `;
    document.head.appendChild(style);

    msg.innerHTML = `
      <div style="font-size:48px;margin-bottom:10px;filter:drop-shadow(0 0 20px ${tier.color})">${tier.badge}</div>
      <div style="font-size:28px;color:${tier.color};font-weight:bold;letter-spacing:3px;text-shadow:0 0 30px ${tier.color}">
        🎉 Welcome to ${tier.name}!
      </div>
      <div style="font-size:14px;color:#ddd;margin-top:8px;opacity:.85">You just made the station better for everyone.</div>
      ${['patron','founder'].includes(tier.id) ? '<div style="font-size:13px;color:#ffd700;margin-top:6px">📌✨ Your free enamel pin is on its way!</div>' : ''}
    `;
    container.appendChild(msg);

    // Confetti / fireworks particles
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999997;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const fctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#ffd700','#ff6ec7','#00fff7',tier.color,'#ffffff','#ff4500'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 8,
        vy: -6 - Math.random() * 8,
        gravity: 0.2 + Math.random() * 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        life: 1, spin: Math.random() * Math.PI * 2, spinV: (Math.random() - 0.5) * 0.3,
        rect: Math.random() > 0.5,
      });
    }

    let start = null;
    const animParticles = (ts) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      if (elapsed > 3) { canvas.remove(); return; }
      fctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
        p.spin += p.spinV;
        p.life = Math.max(0, 1 - elapsed / 3);
        if (p.life <= 0) return;
        fctx.save();
        fctx.globalAlpha = p.life;
        fctx.fillStyle = p.color;
        fctx.translate(p.x, p.y);
        fctx.rotate(p.spin);
        if (p.rect) {
          fctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          fctx.beginPath(); fctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); fctx.fill();
        }
        fctx.restore();
      });
      requestAnimationFrame(animParticles);
    };
    requestAnimationFrame(animParticles);

    // Echo chat message
    setTimeout(() => {
      const name = LS.get('visitorName', 'Visitor');
      if (typeof addChatMsg === 'function') {
        addChatMsg('Echo', `Welcome to the inner circle, ${name}. You just made the station better for everyone. 💜`, '#ff6ec7');
        if (['patron', 'founder'].includes(tier.id)) {
          setTimeout(() => addChatMsg('Echo', 'Your free enamel pin is on its way! 📌✨', '#ffd700'), 1800);
        }
      }
    }, 600);

    // Fade out
    setTimeout(() => {
      msg.style.animation = 'vipWelcomeOut .6s ease forwards';
      setTimeout(() => { container.remove(); style.remove(); }, 700);
    }, 3200);
  }

  function checkTierUpgrade() {
    const tier = calcTier();
    const lastSeen = LS.get('echovault_vip_last_seen', 'visitor');
    if (tier.id !== lastSeen && tier.id !== 'visitor') {
      // Check it's a real upgrade (not downgrade)
      const lastIdx = VIP_TIERS.findIndex(t => t.id === lastSeen);
      const curIdx = VIP_TIERS.findIndex(t => t.id === tier.id);
      if (curIdx > lastIdx) {
        LS.set('echovault_vip_last_seen', tier.id);
        setTimeout(() => triggerWelcomeCeremony(tier), 800);
      }
    } else if (lastSeen === 'visitor' && tier.id !== 'visitor') {
      LS.set('echovault_vip_last_seen', tier.id);
      setTimeout(() => triggerWelcomeCeremony(tier), 800);
    } else {
      LS.set('echovault_vip_last_seen', tier.id);
    }
  }

  // ─── 6. VIP LOUNGE (Floor 6 overlay) ─────────────────────────────
  const LOUNGE_ROPE_X = 3480; // velvet rope x-position on floor 6
  const LOUNGE_ROPE_Y = 100;
  const LOUNGE_ROPE_H = 900;

  // Private VIP chat log
  const _vipChat = [];
  let _vipLoungePanelOpen = false;

  function isInLounge() {
    const S = window.S;
    if (!S || S.floor !== 6) return false;
    return S.visitor.x > LOUNGE_ROPE_X + 20;
  }

  function canEnterLounge() {
    return window.VIPPremium.isPatronPlus();
  }

  function renderVIPLounge(ctx) {
    const S = window.S;
    if (!S || S.floor !== 6) return;

    const tier = calcTier();
    const t = performance.now() / 1000;

    // ── Velvet rope barrier ──
    // Posts
    ctx.save();
    const postColor = '#8B0000';
    const topColor  = '#ffd700';
    const ropeY1 = LOUNGE_ROPE_Y + 40;
    const ropeY2 = LOUNGE_ROPE_Y + LOUNGE_ROPE_H - 40;

    // Left post
    ctx.fillStyle = '#5a1010';
    ctx.fillRect(LOUNGE_ROPE_X - 6, ropeY1 - 16, 12, LOUNGE_ROPE_H - 64);
    // Post tops (gold balls)
    ctx.fillStyle = topColor;
    ctx.beginPath(); ctx.arc(LOUNGE_ROPE_X, ropeY1 - 16, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(LOUNGE_ROPE_X, ropeY2 + 16, 7, 0, Math.PI * 2); ctx.fill();

    // Rope (wavy red/gold)
    const ropeH = ropeY2 - ropeY1;
    const numSegments = 40;
    ctx.beginPath();
    for (let i = 0; i <= numSegments; i++) {
      const ry = ropeY1 + (ropeH * i / numSegments);
      const rx = LOUNGE_ROPE_X + Math.sin(ry * 0.04 + t * 0.5) * 3;
      i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Gold thread on rope
    ctx.beginPath();
    for (let i = 0; i <= numSegments; i++) {
      const ry = ropeY1 + (ropeH * i / numSegments);
      const rx = LOUNGE_ROPE_X + Math.sin(ry * 0.04 + t * 0.5 + 0.3) * 3;
      i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.strokeStyle = '#ffd70066';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // VIP ONLY sign
    const signX = LOUNGE_ROPE_X - 60;
    const signY = LOUNGE_ROPE_Y + LOUNGE_ROPE_H / 2 - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    roundRect(ctx, signX, signY, 70, 36, 6);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('👑 VIP ONLY', signX + 35, signY + 13);
    ctx.font = '8px "Courier New"';
    ctx.fillStyle = '#ff6ec7';
    ctx.fillText('Patron+', signX + 35, signY + 26);
    ctx.restore();

    // ── VIP Area behind rope ──
    if (S.visitor.x > LOUNGE_ROPE_X - 60) {
      renderVIPArea(ctx, t);
    }

    // Block non-VIPs
    if (S.visitor.x > LOUNGE_ROPE_X - 10 && !canEnterLounge()) {
      // Push back
      S.visitor.x = LOUNGE_ROPE_X - 20;
      // Prompt modal
      if (!_modalOpen) {
        setTimeout(() => {
          if (typeof showNotification === 'function') showNotification('👑 Patron+ access required. Become a Patron to enter!');
          setTimeout(openSubscriptionModal, 800);
        }, 100);
      }
    }
  }

  function renderVIPArea(ctx, t) {
    const baseX = LOUNGE_ROPE_X + 40;
    const baseY = 150;

    ctx.save();

    // Ambient golden glow on floor
    const areaGrd = ctx.createRadialGradient(baseX + 200, baseY + 300, 0, baseX + 200, baseY + 300, 400);
    areaGrd.addColorStop(0, 'rgba(255,215,0,0.04)');
    areaGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = areaGrd;
    ctx.fillRect(baseX, baseY - 100, 600, 800);

    // ── Leather seating area ──
    // Sofa (dark red leather, 3 seats)
    const sofaX = baseX + 60, sofaY = baseY + 60;
    ctx.fillStyle = '#3a0808';
    ctx.fillRect(sofaX, sofaY, 160, 50);
    // Sofa cushions
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#5a1010';
      ctx.fillRect(sofaX + 4 + i * 52, sofaY + 4, 48, 34);
      ctx.fillStyle = '#6a1818';
      ctx.fillRect(sofaX + 6 + i * 52, sofaY + 6, 44, 6);
    }
    // Sofa back
    ctx.fillStyle = '#3a0808';
    ctx.fillRect(sofaX, sofaY - 20, 160, 20);

    // Crystal table
    const tableX = sofaX + 30, tableY = sofaY + 60;
    ctx.fillStyle = 'rgba(100,200,255,0.25)';
    ctx.strokeStyle = 'rgba(150,230,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tableX, tableY, 100, 40);
    ctx.strokeRect(tableX, tableY, 100, 40);
    // Crystal glint
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(tableX + 8, tableY + 4);
    ctx.lineTo(tableX + 22, tableY + 4);
    ctx.lineTo(tableX + 14, tableY + 12);
    ctx.closePath();
    ctx.fill();

    // Champagne glasses
    for (let i = 0; i < 2; i++) {
      const gx = tableX + 20 + i * 50, gy = tableY - 20;
      ctx.strokeStyle = 'rgba(200,240,255,0.9)';
      ctx.lineWidth = 1.5;
      // Glass bowl
      ctx.beginPath(); ctx.arc(gx, gy - 6, 5, Math.PI, Math.PI * 2); ctx.stroke();
      // Stem
      ctx.beginPath(); ctx.moveTo(gx, gy - 1); ctx.lineTo(gx, gy + 10); ctx.stroke();
      // Base
      ctx.beginPath(); ctx.moveTo(gx - 4, gy + 10); ctx.lineTo(gx + 4, gy + 10); ctx.stroke();
      // Bubbly liquid
      ctx.fillStyle = 'rgba(255,240,150,0.4)';
      ctx.beginPath(); ctx.arc(gx, gy - 8, 4, Math.PI * 0.2, Math.PI * 0.8); ctx.fill();
    }

    // ── Concierge NPC ──
    const npcX = baseX + 300, npcY = baseY + 100;
    const visitorName = LS.get('visitorName', 'Visitor');

    // NPC body (pixel art style, fancy outfit)
    ctx.fillStyle = '#1a1a3a'; // dark suit
    ctx.fillRect(npcX - 7, npcY - 20, 14, 18);
    ctx.fillStyle = '#ffffff'; // white shirt
    ctx.fillRect(npcX - 3, npcY - 18, 6, 14);
    ctx.fillStyle = '#ffd700'; // gold tie
    ctx.fillRect(npcX - 1, npcY - 18, 2, 10);
    // Head
    ctx.fillStyle = '#f5c89a';
    ctx.fillRect(npcX - 5, npcY - 32, 10, 12);
    // Hat (top hat)
    ctx.fillStyle = '#111';
    ctx.fillRect(npcX - 4, npcY - 40, 8, 3); // brim
    ctx.fillRect(npcX - 3, npcY - 48, 6, 10); // top
    // Gold accent on hat
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(npcX - 3, npcY - 41, 6, 1);
    // Legs
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(npcX - 6, npcY - 2, 5, 12);
    ctx.fillRect(npcX + 1, npcY - 2, 5, 12);
    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(npcX - 7, npcY + 9, 6, 3);
    ctx.fillRect(npcX + 1, npcY + 9, 6, 3);

    // NPC label
    ctx.font = '9px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Concierge', npcX, npcY - 54);

    // Speech bubble (if VIP nearby)
    if (canEnterLounge() && window.S && Math.hypot(window.S.visitor.x - npcX, window.S.visitor.y - npcY) < 80) {
      const msg = `Welcome, ${visitorName}. Your table is ready.`;
      const bx = npcX - 90, by = npcY - 90;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 1.5;
      roundRect(ctx, bx, by, 180, 30, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.font = '9px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(msg, bx + 90, by + 19);
    }

    // ── VIP Wall ──
    const wallX = baseX + 320, wallY = baseY + 200;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = '#ffd70055';
    ctx.lineWidth = 1;
    ctx.fillRect(wallX, wallY, 220, 140);
    ctx.strokeRect(wallX, wallY, 220, 140);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 TOP PATRONS', wallX + 110, wallY + 14);
    const patronNames = ['Mikel', 'Echo Fan #1', 'Pixel Lover', 'The Architect', 'StarGazer'];
    const patronAmounts = ['€500', '€250', '€150', '€100', '€75'];
    for (let i = 0; i < patronNames.length; i++) {
      ctx.font = '9px "Courier New"';
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#ffd700' : '#aaa';
      ctx.fillText(`${i + 1}. ${patronNames[i]}`, wallX + 10, wallY + 30 + i * 20);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#44cc44';
      ctx.fillText(patronAmounts[i], wallX + 210, wallY + 30 + i * 20);
    }

    // ── Impact Dashboard ──
    renderImpactDashboard(ctx, baseX + 50, baseY + 220);

    ctx.restore();
  }

  function renderImpactDashboard(ctx, x, y) {
    const w = 220, h = 160;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = 'rgba(155,89,182,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill(); ctx.stroke();

    ctx.font = 'bold 10px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff6ec7';
    ctx.fillText('📊 Your Impact This Month', x + 10, y + 18);

    const yourStats = [
      ['Plays sponsored:', '12'],
      ['Screenings funded:', '3'],
      ['MSA contribution:', '€4.50'],
    ];
    ctx.font = '9px "Courier New"';
    yourStats.forEach(([label, val], i) => {
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 10, y + 34 + i * 14);
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'right';
      ctx.fillText(val, x + w - 10, y + 34 + i * 14);
    });

    ctx.fillStyle = '#00fff7';
    ctx.font = 'bold 9px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText('🌍 Community Total', x + 10, y + 92);

    const communityStats = [
      ['Free plays given:', '4,820'],
      ['Screenings hosted:', '47'],
      ['MSA funded:', '€890'],
    ];
    ctx.font = '9px "Courier New"';
    communityStats.forEach(([label, val], i) => {
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 10, y + 106 + i * 14);
      ctx.fillStyle = '#44cc44';
      ctx.textAlign = 'right';
      ctx.fillText(val, x + w - 10, y + 106 + i * 14);
    });
    ctx.restore();
  }

  // ─── 7. EXCLUSIVE PERKS ────────────────────────────────────────────
  // Hook cinema, claw, neighborhoods via window overrides and event listeners

  function installCinemaPerk() {
    // Mark Patron+ in cinema seats — hook into addChatMsg for cinema channel
    // and flag S for cinema rendering
    if (window.S) window.S._vipCinema = window.VIPPremium.isPatronPlus();
  }

  function installClawPerk() {
    // Patrons get 1 extra free play — hook into localStorage key used by claw
    if (!window.VIPPremium.isPatronPlus()) return;
    const clawKey = 'clawFreePlays';
    const today = new Date().toDateString();
    const stored = LS.get(clawKey + '_date', '');
    if (stored !== today) {
      const base = LS.get(clawKey, 3);
      if (base <= 3) {
        LS.set(clawKey, 4);
        LS.set(clawKey + '_date', today);
      }
    }
  }

  function installSecretRoomPerk() {
    // Founders get bonus themes
    if (!window.VIPPremium.isFounder()) return;
    if (typeof window.SecretRooms !== 'undefined') {
      const nebulaTheme = {
        id: 'nebula', name: '🌌 Nebula', bg: '#0a0020',
        wallColor: '#1a0040', floorColor: '#080018', particles: 'stars',
      };
      const lightningTheme = {
        id: 'lightning', name: '⚡ Lightning', bg: '#0a0814',
        wallColor: '#1a1028', floorColor: '#060610', particles: 'lightning',
      };
      window._founderThemes = [nebulaTheme, lightningTheme];
    }
  }

  function installNeighborhoodPerk() {
    // CSS injection for patron shop gold borders
    const style = document.createElement('style');
    style.textContent = `
      .neighborhood-shop.patron-plus { border: 2px solid #ffd700 !important; box-shadow: 0 0 8px #ffd70044; }
      .neighborhood-shop.founder { border: 2px solid #ff4500 !important; animation: founderShopPulse 2s ease-in-out infinite; }
      @keyframes founderShopPulse { 0%,100%{box-shadow:0 0 10px #ff4500aa} 50%{box-shadow:0 0 24px #ff4500dd,0 0 40px #cc44ffaa} }
    `;
    document.head.appendChild(style);
  }

  // ─── 8. RENDER LOOP HOOK ──────────────────────────────────────────
  // Hook into the game's main render to draw VIP lounge elements
  function installRenderHook() {
    // Wait for the render function to exist on window
    const tryHook = () => {
      // We look for patchFloorRenders or a known render-related function
      if (!window.S) { setTimeout(tryHook, 600); return; }

      // Monkey-patch requestAnimationFrame chain for floor-6 VIP lounge rendering
      // We use a canvas overlay approach for lounge since canvas is shared
      const tryCanvas = () => {
        const canvas = document.getElementById('game');
        if (!canvas) { setTimeout(tryCanvas, 500); return; }

        // Use a transparent overlay canvas for VIP lounge
        const overlay = document.createElement('canvas');
        overlay.id = 'vip-lounge-canvas';
        overlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:45;';
        overlay.width = canvas.width;
        overlay.height = canvas.height;

        const parent = canvas.parentElement;
        if (parent) parent.appendChild(overlay);

        const oc = overlay.getContext('2d');

        // Also hook into the main ctx for lounge (simpler: hook into window.renderFloor6 if present)
        // For floor 6, we hook the post-render step
        let _hookedFloor6 = false;

        const loopHook = () => {
          if (!window.S) { requestAnimationFrame(loopHook); return; }

          // Sync overlay size
          if (overlay.width !== canvas.width) overlay.width = canvas.width;
          if (overlay.height !== canvas.height) overlay.height = canvas.height;

          oc.clearRect(0, 0, overlay.width, overlay.height);

          if (window.S.floor === 6) {
            // Camera offset — read from window if available
            const camX = window._camX || 0;
            const camY = window._camY || 0;
            oc.save();
            oc.translate(-camX, -camY);
            renderVIPLounge(oc);
            oc.restore();
          }

          requestAnimationFrame(loopHook);
        };
        requestAnimationFrame(loopHook);
      };
      tryCanvas();
    };
    setTimeout(tryHook, 1500);
  }

  // ─── UTILITY: roundRect ──────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }
  }

  // ─── TIER BADGE ON OTHER PLAYERS ─────────────────────────────────
  // Hook into EchoWS player rendering to show badges on other players
  function installOtherPlayerBadges() {
    // We hook into the otherPlayers render by wrapping the relevant function
    const tryHook = () => {
      if (!window.S) { setTimeout(tryHook, 800); return; }

      // Look for where otherPlayers are drawn — hook ctx draw
      // We patch the drawOtherPlayer or equivalent
      if (typeof window.drawOtherPlayer === 'function') {
        const _orig = window.drawOtherPlayer;
        window.drawOtherPlayer = function(ctx, player) {
          _orig.call(this, ctx, player);
          if (player.vipTier && player.vipBadge) {
            ctx.save();
            ctx.font = '9px serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = player.vipColor || '#ffd700';
            ctx.shadowBlur = 5;
            ctx.fillText(player.vipBadge, player.x, player.y - 42);
            ctx.restore();
          }
        };
      }

      // Broadcast our own tier to other players via the ws update
      // Hook into the player update broadcast
      if (window.EchoWS && window.EchoWS.ws) {
        const origSend = window.EchoWS.ws.send.bind(window.EchoWS.ws);
        window.EchoWS.ws.send = function(data) {
          try {
            const obj = JSON.parse(data);
            if (obj.type === 'player.update') {
              const tier = calcTier();
              obj.vipTier = tier.id;
              obj.vipBadge = tier.badge;
              obj.vipColor = tier.color;
              return origSend(JSON.stringify(obj));
            }
          } catch {}
          origSend(data);
        };
      }
    };
    setTimeout(tryHook, 2000);
  }

  // ─── INIT ─────────────────────────────────────────────────────────
  function init() {
    checkTierUpgrade();
    injectHUDButton();
    injectCoinHUDBadge();
    installAvatarHook();
    installRenderHook();
    installOtherPlayerBadges();
    installClawPerk();
    installCinemaPerk();
    installSecretRoomPerk();
    installNeighborhoodPerk();

    // Re-check tier on coin changes (poll every 10s)
    setInterval(() => {
      checkTierUpgrade();
      // Update HUD badge
      const badge = document.getElementById('vip-tier-badge');
      const btn = document.getElementById('vip-hud-btn');
      const tier = calcTier();
      if (badge) {
        badge.textContent = tier.badge || '';
        badge.style.filter = `drop-shadow(0 0 4px ${tier.color})`;
      }
      if (btn && tier.id !== 'visitor') {
        btn.innerHTML = tier.badge || '⭐';
        btn.style.borderColor = tier.color;
        btn.style.boxShadow = `0 0 8px ${tier.color}88`;
      }
    }, 10000);

    console.log(`%c👑 VIP Premium loaded — current tier: ${calcTier().name}`, 'color:#ffd700;font-weight:bold;font-size:13px');
  }

  // Wait for DOM + S to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

})();
