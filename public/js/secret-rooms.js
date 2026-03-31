// secret-rooms.js — Private Room System for Echo Station
// Loaded after main scripts. Does NOT modify index.html.
// ─────────────────────────────────────────────────────────────────────────────
(function SecretRooms() {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────────────
  var LS_ROOM_KEY      = 'echovault_secret_room';
  var LS_INVITES_KEY   = 'echovault_secret_invites';
  var LS_GUESTBOOK_KEY = 'echovault_guestbook_secret';
  var LS_AGE_KEY       = 'echovault_age_verified';
  var LS_DEMO_ROOMS    = 'echovault_demo_rooms';
  var FLOOR_SECRET_ROOM = 25;

  // ─── Theme Definitions ──────────────────────────────────────────────────────
  var THEMES = {
    midnight: {
      id: 'midnight', label: '🌙 Midnight',
      wallColor: '#0a0a1a', floorColor: '#111133',
      accentColor: '#7799ff', glowColor: '#4466cc',
      lightColor: 'rgba(120,150,255,0.15)',
      particleColor: '#ffffff', particleType: 'star',
      doorColor: '#1a1a4a', doorMetal: '#889be0',
      ambientSound: '✨ Soft starfield hum · distant radio chatter',
      particles: 12,
    },
    ember: {
      id: 'ember', label: '🔥 Ember',
      wallColor: '#1a0800', floorColor: '#2a0e00',
      accentColor: '#ff6622', glowColor: '#cc4400',
      lightColor: 'rgba(255,120,30,0.2)',
      particleColor: '#ff8844', particleType: 'ember',
      doorColor: '#3a1200', doorMetal: '#cc7733',
      ambientSound: '🔥 Fireplace crackling · timber settling',
      particles: 10,
    },
    ocean: {
      id: 'ocean', label: '🌊 Ocean',
      wallColor: '#001a22', floorColor: '#00121a',
      accentColor: '#00cccc', glowColor: '#009999',
      lightColor: 'rgba(0,200,200,0.12)',
      particleColor: '#66eeff', particleType: 'bubble',
      doorColor: '#002233', doorMetal: '#339999',
      ambientSound: '🌊 Deep ocean hum · whale song far away',
      particles: 14,
    },
    forest: {
      id: 'forest', label: '🌿 Forest',
      wallColor: '#051a05', floorColor: '#0a2208',
      accentColor: '#44ff66', glowColor: '#228844',
      lightColor: 'rgba(60,200,80,0.12)',
      particleColor: '#aaffaa', particleType: 'firefly',
      doorColor: '#0e2a10', doorMetal: '#558855',
      ambientSound: '🌿 Crickets · wind through leaves · distant owl',
      particles: 13,
    },
    void: {
      id: 'void', label: '💜 Void',
      wallColor: '#000000', floorColor: '#050008',
      accentColor: '#aa44ff', glowColor: '#7722cc',
      lightColor: 'rgba(150,60,255,0.15)',
      particleColor: '#dd88ff', particleType: 'cosmic',
      doorColor: '#0a0014', doorMetal: '#9933cc',
      ambientSound: '💜 Infinite silence · subharmonic drone',
      particles: 8,
    },
    sakura: {
      id: 'sakura', label: '🌸 Sakura',
      wallColor: '#1a0a14', floorColor: '#220e18',
      accentColor: '#ff88bb', glowColor: '#cc5588',
      lightColor: 'rgba(255,150,200,0.12)',
      particleColor: '#ffaacc', particleType: 'petal',
      doorColor: '#2a0e1a', doorMetal: '#cc6699',
      ambientSound: '🌸 Koto strings · bamboo water · wind chimes',
      particles: 11,
    },
  };

  var MOOD_COLORS = {
    'Come In':             '#44ff88',
    'Creating':            '#ffcc44',
    'Chilling':            '#88ccff',
    'Do Not Disturb':      '#ff4444',
    'Hidden':              '#aa44ff',
  };

  var MUSIC_TRACKS = [
    'Lo-fi Beats', 'Rain & Thunder', 'Space Ambient',
    'Jazz Café', 'Nature Sounds', 'Silence'
  ];

  var FURNITURE_ITEMS = [
    { id: 'chair',     label: '🪑 Cozy Chair',  w: 40, h: 35 },
    { id: 'bookshelf', label: '📚 Bookshelf',    w: 50, h: 70 },
    { id: 'plant',     label: '🪴 Plant',        w: 30, h: 50 },
    { id: 'neon',      label: '💡 Neon Sign',    w: 80, h: 30 },
  ];

  // ─── State ──────────────────────────────────────────────────────────────────
  var _myRoom   = null;   // loaded from localStorage
  var _invites  = [];     // loaded from localStorage
  var _particles = [];
  var _particleTick = 0;
  var _inSecretRoom = false;
  var _customizeOpen = false;
  var _guestBookOpen = false;
  var _ageVerified = false;
  var _demoRooms = [];
  var _doorInteractTarget = null;  // room near player
  var _tick = 0;

  // ─── localStorage helpers ───────────────────────────────────────────────────
  function lsGet(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch(e) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    _myRoom       = lsGet(LS_ROOM_KEY);
    _invites      = lsGet(LS_INVITES_KEY) || [];
    _ageVerified  = !!lsGet(LS_AGE_KEY);
    _demoRooms    = lsGet(LS_DEMO_ROOMS) || buildDemoRooms();

    injectStyles();
    createHUDIcon();
    registerFloor25();
    listenKeys();

    console.log('[SecretRooms] ready. My room:', _myRoom ? _myRoom.name : 'none');
  }

  // ─── Demo Rooms (pre-populate corridor) ────────────────────────────────────
  function buildDemoRooms() {
    var demos = [
      { owner: 'Lyra', name: "Lyra's Den", theme: 'midnight', mood: 'Chilling',    access: 'Open',         nsfw: false },
      { owner: 'Nyx',  name: 'Nyx Void',   theme: 'void',     mood: 'Creating',   access: 'Invite Only',  nsfw: false },
      { owner: 'Sol',  name: 'Sol Garden', theme: 'forest',   mood: 'Come In',    access: 'Open',         nsfw: false },
      { owner: 'Ara',  name: 'Ara Ocean',  theme: 'ocean',    mood: 'Do Not Disturb', access: 'Hidden',  nsfw: false },
      { owner: 'Kira', name: 'Ember Keep', theme: 'ember',    mood: 'Creating',   access: 'Open',         nsfw: false },
    ];
    lsSet(LS_DEMO_ROOMS, demos);
    return demos;
  }

  function getAllDoors() {
    var doors = _demoRooms.slice();
    if (_myRoom) {
      var idx = doors.findIndex(function(d) { return d.owner === getMyName(); });
      if (idx >= 0) doors[idx] = _myRoom;
      else doors.unshift(_myRoom);
    }
    return doors;
  }

  function getMyName() {
    var S = window._S;
    if (!S) return 'You';
    if (S.useVisitor && S.visitor) return S.visitor.name || 'Visitor';
    return 'Echo';
  }

  // ─── HUD Icon ────────────────────────────────────────────────────────────────
  function createHUDIcon() {
    var hud = document.getElementById('hud');
    if (!hud) { setTimeout(createHUDIcon, 500); return; }

    var btn = document.createElement('div');
    btn.className = 'hud-btn';
    btn.id = 'btn-secret-room';
    btn.title = _myRoom ? ('🔒 ' + (_myRoom.mood || 'My Room')) : 'Create Secret Room';
    btn.textContent = '🔒';
    btn.style.position = 'relative';
    btn.addEventListener('click', onHUDClick);
    hud.appendChild(btn);

    window._secretRoomsHudBtn = btn;
  }

  function refreshHUDTooltip() {
    var btn = document.getElementById('btn-secret-room');
    if (!btn) return;
    if (_myRoom) {
      btn.title = '🔒 ' + _myRoom.name + ' · ' + (_myRoom.mood || 'Chilling');
    } else {
      btn.title = 'Create Secret Room';
    }
  }

  function onHUDClick() {
    if (_myRoom) {
      showRoomMenu();
    } else {
      showCreateModal();
    }
  }

  function showRoomMenu() {
    var existing = document.getElementById('sr-room-menu');
    if (existing) { existing.remove(); return; }

    var menu = document.createElement('div');
    menu.id = 'sr-room-menu';
    menu.className = 'sr-popup';
    menu.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9000;' +
      'background:#0a0a18;border:2px solid #7755cc;border-radius:12px;padding:16px;min-width:220px;text-align:center';
    menu.innerHTML =
      '<div style="color:#cc88ff;font-size:14px;font-weight:bold;margin-bottom:10px">🔒 ' + escHtml(_myRoom.name) + '</div>' +
      '<div style="color:#888;font-size:11px;margin-bottom:12px">' + escHtml(_myRoom.mood || '') + ' · ' + escHtml(_myRoom.access || '') + '</div>' +
      '<button class="sr-btn sr-btn-primary" id="sr-goto-room">🚪 Go to Your Room</button>' +
      '<button class="sr-btn" id="sr-room-settings" style="margin-top:6px">⚙️ Room Settings</button>' +
      '<button class="sr-btn sr-btn-danger" id="sr-close-menu" style="margin-top:6px">✕ Close</button>';
    document.body.appendChild(menu);

    document.getElementById('sr-goto-room').onclick = function() {
      menu.remove();
      enterMyRoom();
    };
    document.getElementById('sr-room-settings').onclick = function() {
      menu.remove();
      showCreateModal(true);
    };
    document.getElementById('sr-close-menu').onclick = function() { menu.remove(); };
  }

  // ─── Create / Edit Room Modal ────────────────────────────────────────────────
  function showCreateModal(editing) {
    closeAllSRPopups();
    var room = editing && _myRoom ? _myRoom : {};

    var overlay = document.createElement('div');
    overlay.id = 'sr-create-overlay';
    overlay.className = 'sr-overlay';

    var themeOpts = Object.values(THEMES).map(function(t) {
      var sel = (room.theme === t.id) ? 'sr-theme-opt selected' : 'sr-theme-opt';
      return '<button class="' + sel + '" data-theme="' + t.id + '" style="--tc:' + t.accentColor + '">' + t.label + '</button>';
    }).join('');

    var moodOpts = ['Creating','Chilling','Do Not Disturb','Come In'].map(function(m) {
      var sel = (room.mood === m) ? ' selected' : '';
      return '<option value="' + m + '"' + sel + '>' + m + '</option>';
    }).join('');

    var accessOpts = ['Open','Invite Only','Hidden'].map(function(a) {
      var sel = (room.access === a) ? ' selected' : '';
      return '<option value="' + a + '"' + sel + '>' + a + '</option>';
    }).join('');

    overlay.innerHTML = '<div class="sr-modal" id="sr-create-modal">' +
      '<div class="sr-modal-title">' + (editing ? '⚙️ Room Settings' : '🔒 Create Your Secret Room') + '</div>' +

      '<label class="sr-label">Room Name <span style="color:#555;font-size:10px">(max 30 chars)</span></label>' +
      '<input id="sr-room-name" class="sr-input" maxlength="30" placeholder="My Secret Space" value="' + escHtml(room.name || '') + '">' +

      '<label class="sr-label">Theme</label>' +
      '<div class="sr-theme-grid">' + themeOpts + '</div>' +

      '<label class="sr-label">Mood Indicator</label>' +
      '<select id="sr-mood" class="sr-select">' + moodOpts + '</select>' +
      '<input id="sr-mood-custom" class="sr-input" maxlength="30" placeholder="Custom mood... (optional)" style="margin-top:4px" value="' + escHtml(/^(Creating|Chilling|Do Not Disturb|Come In)$/.test(room.mood || '') ? '' : (room.mood || '')) + '">' +

      '<label class="sr-label">Access Level</label>' +
      '<select id="sr-access" class="sr-select">' + accessOpts + '</select>' +

      '<div class="sr-toggle-row">' +
        '<label class="sr-label" style="margin-bottom:0">🔞 NSFW Room</label>' +
        '<label class="sr-toggle"><input type="checkbox" id="sr-nsfw"' + (room.nsfw ? ' checked' : '') + '><span class="sr-toggle-slider"></span></label>' +
      '</div>' +
      '<div style="color:#888;font-size:10px;margin-top:4px">NSFW rooms require age confirmation to enter.</div>' +

      '<div style="display:flex;gap:8px;margin-top:18px">' +
        '<button class="sr-btn sr-btn-primary" id="sr-save-room">' + (editing ? '💾 Save Changes' : '✨ Create Room') + '</button>' +
        '<button class="sr-btn sr-btn-danger" id="sr-cancel-create">Cancel</button>' +
      '</div>' +
    '</div>';

    document.body.appendChild(overlay);

    // Theme selection
    var selectedTheme = room.theme || 'midnight';
    overlay.querySelectorAll('.sr-theme-opt').forEach(function(btn) {
      btn.addEventListener('click', function() {
        overlay.querySelectorAll('.sr-theme-opt').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedTheme = btn.dataset.theme;
      });
    });

    document.getElementById('sr-save-room').onclick = function() {
      var name = document.getElementById('sr-room-name').value.trim();
      if (!name) { showToast('Please enter a room name', 'error'); return; }
      var moodSel = document.getElementById('sr-mood').value;
      var moodCustom = document.getElementById('sr-mood-custom').value.trim();
      var mood = moodCustom || moodSel;
      var newRoom = {
        owner:  getMyName(),
        name:   name,
        theme:  selectedTheme,
        mood:   mood,
        access: document.getElementById('sr-access').value,
        nsfw:   document.getElementById('sr-nsfw').checked,
        music:  room.music  || 'Silence',
        photos: room.photos || [],
        furniture: room.furniture || [],
      };
      _myRoom = newRoom;
      lsSet(LS_ROOM_KEY, _myRoom);
      overlay.remove();
      refreshHUDTooltip();
      showToast(editing ? '✅ Room updated!' : '🔒 Secret Room created!', 'success');
    };

    document.getElementById('sr-cancel-create').onclick = function() { overlay.remove(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Floor 25 Registration ───────────────────────────────────────────────────
  function registerFloor25() {
    window.renderFloor25 = renderSecretRoomFloor;

    // Inject floor 25 into the render dispatcher via RAF overlay
    var _orig = window.requestAnimationFrame;
    var installed = false;
    function installOverlay() {
      if (installed) return;
      installed = true;
      var _origRAF = window.requestAnimationFrame;
      function overlayTick() {
        var S = window._S;
        if (S && S.floor === FLOOR_SECRET_ROOM) {
          var ctx = window.ctx || window._ctx;
          if (ctx) renderSecretRoomFloor();
        }
        _origRAF(overlayTick);
      }
      _origRAF(overlayTick);
    }

    // Try immediately, then retry
    if (document.readyState === 'complete') installOverlay();
    else window.addEventListener('load', installOverlay);
    setTimeout(installOverlay, 1000);
  }

  function enterMyRoom() {
    _inSecretRoom = true;
    _customizeOpen = false;
    _guestBookOpen = false;
    _particles = [];
    if (typeof window.changeFloor === 'function') {
      window.changeFloor(FLOOR_SECRET_ROOM);
    } else if (window._S) {
      window._S.floor = FLOOR_SECRET_ROOM;
    }
  }

  // ─── Secret Room Floor Renderer (Floor 25) ──────────────────────────────────
  function renderSecretRoomFloor() {
    var ctx = window.ctx || window._ctx;
    var W   = window.W  || window._W  || 800;
    var H   = window.H  || window._H  || 600;
    if (!ctx) return;

    var room = _myRoom;
    if (!room) {
      // No room yet — show prompt
      ctx.fillStyle = '#050010';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#cc88ff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 You don\'t have a Secret Room yet', W/2, H/2 - 30);
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText('Click the 🔒 icon in the HUD to create one', W/2, H/2 + 10);
      ctx.textAlign = 'left';
      return;
    }

    var theme = THEMES[room.theme] || THEMES.midnight;
    _tick++;

    // Background
    ctx.fillStyle = theme.wallColor;
    ctx.fillRect(0, 0, W, H);

    // Floor stripe
    ctx.fillStyle = theme.floorColor;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // Floor line
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.lineTo(W, H * 0.72);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Theme-specific background elements
    renderThemeBackground(ctx, W, H, theme, room);

    // Ambient lighting overlay
    var grad = ctx.createRadialGradient(W/2, H*0.4, 0, W/2, H*0.4, W*0.6);
    grad.addColorStop(0, theme.lightColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Particles
    tickParticles(ctx, W, H, theme, room);

    // Furniture
    renderFurniture(ctx, W, H, room, theme);

    // Photo frames
    renderPhotoFrames(ctx, W, H, room, theme);

    // Guest book on table
    renderGuestBook(ctx, W, H, theme);

    // Room info panel (top left)
    renderRoomInfo(ctx, W, H, room, theme);

    // Ambient sound label
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(200,200,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(theme.ambientSound, W - 12, H - 8);
    ctx.textAlign = 'left';

    // Controls hint
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(180,180,220,0.35)';
    ctx.fillText('[TAB] Customize · [G] Guest Book · [ESC] Leave', 10, H - 8);

    // Panels
    if (_customizeOpen) renderCustomizePanel(ctx, W, H, room, theme);
    if (_guestBookOpen) renderGuestBookPanel(ctx, W, H, room);
  }

  // ─── Theme Background Elements ───────────────────────────────────────────────
  function renderThemeBackground(ctx, W, H, theme, room) {
    var t = _tick;
    ctx.save();

    if (theme.id === 'midnight') {
      // Star field
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < 60; i++) {
        var sx = ((i * 137 + 17) % W);
        var sy = ((i * 89 + 31) % (H * 0.7));
        var br = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.02 + i));
        ctx.globalAlpha = br * 0.8;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
      // Moon window
      drawWindow(ctx, W * 0.75, H * 0.18, 100, 130, '#001144', '#334488');
      ctx.fillStyle = 'rgba(180,200,255,0.9)';
      ctx.beginPath(); ctx.arc(W*0.75 + 25, H*0.18 + 40, 28, 0, Math.PI*2); ctx.fill();
      // Silver wall trim
      ctx.strokeStyle = '#5566aa';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      for (var j = 0; j < 5; j++) {
        ctx.beginPath(); ctx.moveTo(j * W/5, H * 0.72); ctx.lineTo(j * W/5, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    else if (theme.id === 'ember') {
      // Stone wall texture
      ctx.fillStyle = '#3a1a00';
      for (var ri = 0; ri < 6; ri++) {
        for (var ci = 0; ci < 12; ci++) {
          var bx = ci * (W/11) + (ri % 2 ? W/22 : 0);
          var by = ri * (H * 0.7 / 6);
          ctx.fillRect(bx + 2, by + 2, W/11 - 4, H * 0.7 / 6 - 4);
        }
      }
      // Fireplace
      drawFireplace(ctx, W * 0.5 - 60, H * 0.3, 120, 160);
      // Amber window glow
      var aglow = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, W*0.5);
      aglow.addColorStop(0, 'rgba(255,100,20,0.08)');
      aglow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aglow;
      ctx.fillRect(0, 0, W, H);
    }

    else if (theme.id === 'ocean') {
      // Caustic light patterns
      for (var ci2 = 0; ci2 < 8; ci2++) {
        var cx2 = (ci2 * 140 + Math.sin(t * 0.01 + ci2) * 40) % W;
        var cy2 = 50 + ci2 * 30 + Math.cos(t * 0.008 + ci2) * 20;
        var cg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 60);
        cg.addColorStop(0, 'rgba(0,220,220,0.08)');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, W, H);
      }
      // Kelp
      for (var ki = 0; ki < 5; ki++) {
        var kx = 80 + ki * (W / 5);
        drawKelp(ctx, kx, H * 0.72, t);
      }
      // Window with underwater glow
      drawWindow(ctx, 50, H * 0.15, 120, 140, '#001a2a', '#006666');
      ctx.fillStyle = 'rgba(0,180,180,0.25)';
      ctx.fillRect(60, H * 0.2, 100, 120);
    }

    else if (theme.id === 'forest') {
      // Tree trunk walls
      for (var ti = 0; ti < 6; ti++) {
        var tx = ti * (W / 5) - 20;
        drawTreeTrunk(ctx, tx, 0, 40, H * 0.72);
      }
      // Leaf canopy at top
      ctx.fillStyle = '#0a2a0a';
      ctx.fillRect(0, 0, W, H * 0.12);
      for (var li = 0; li < 15; li++) {
        var lx = li * (W / 13) + Math.sin(t * 0.005 + li) * 8;
        var ly = 10 + li % 3 * 20;
        ctx.fillStyle = li % 2 === 0 ? '#1a4a1a' : '#225522';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 35, 20, Math.sin(t * 0.003 + li) * 0.2, 0, Math.PI*2);
        ctx.fill();
      }
      // Mushroom glows
      for (var mi = 0; mi < 3; mi++) {
        var mgx = 150 + mi * (W / 3.5);
        drawMushroom(ctx, mgx, H * 0.72, theme.accentColor);
      }
    }

    else if (theme.id === 'void') {
      // Floating geometric shapes
      for (var gi = 0; gi < 6; gi++) {
        var gx = (gi * 150 + Math.sin(t * 0.005 + gi * 1.5) * 60) % W;
        var gy = 50 + gi * 60 + Math.cos(t * 0.004 + gi) * 30;
        var ga = 0.1 + 0.1 * Math.sin(t * 0.02 + gi);
        ctx.globalAlpha = ga;
        ctx.strokeStyle = '#aa44ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (gi % 3 === 0) {
          // triangle
          ctx.moveTo(gx, gy - 20); ctx.lineTo(gx + 20, gy + 15); ctx.lineTo(gx - 20, gy + 15); ctx.closePath();
        } else if (gi % 3 === 1) {
          // square
          ctx.rect(gx - 15, gy - 15, 30, 30);
        } else {
          // hexagon
          for (var hi = 0; hi < 6; hi++) {
            var ang = (Math.PI / 3) * hi + t * 0.01 + gi;
            hi === 0 ? ctx.moveTo(gx + 18 * Math.cos(ang), gy + 18 * Math.sin(ang))
                     : ctx.lineTo(gx + 18 * Math.cos(ang), gy + 18 * Math.sin(ang));
          }
          ctx.closePath();
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Cosmic dust band
      ctx.fillStyle = 'rgba(100,40,180,0.04)';
      ctx.fillRect(0, H * 0.3, W, H * 0.15);
    }

    else if (theme.id === 'sakura') {
      // Soft gradient walls
      var sg = ctx.createLinearGradient(0, 0, W, H * 0.72);
      sg.addColorStop(0, '#1a0814');
      sg.addColorStop(1, '#2a1020');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H * 0.72);
      // Paper lanterns
      for (var pli = 0; pli < 4; pli++) {
        var plx = 80 + pli * (W / 4);
        var ply = 60 + pli % 2 * 30;
        drawLantern(ctx, plx, ply, t);
      }
      // Zen garden floor marks
      for (var zr = 0; zr < 4; zr++) {
        ctx.strokeStyle = 'rgba(200,150,180,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.72 + zr * 20);
        ctx.bezierCurveTo(W * 0.3, H * 0.72 + zr * 20 - 5, W * 0.7, H * 0.72 + zr * 20 + 5, W, H * 0.72 + zr * 20);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ─── Theme Drawing Helpers ───────────────────────────────────────────────────
  function drawWindow(ctx, x, y, w, h, innerColor, borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = innerColor;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    // cross bar
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(x + w/2, y); ctx.lineTo(x + w/2, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawFireplace(ctx, x, y, w, h) {
    // Stone surround
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(x - 10, y, w + 20, h);
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(x, y + 20, w, h - 20);
    // Animated pixel fire
    var t = _tick;
    var fireCols = ['#ff4400','#ff8800','#ffcc00','#ff2200','#ff6600'];
    for (var fi = 0; fi < 12; fi++) {
      var fx = x + 10 + fi * (w - 20) / 12;
      var fh = 20 + 15 * Math.abs(Math.sin(t * 0.15 + fi * 0.8));
      var fc = fireCols[fi % fireCols.length];
      ctx.fillStyle = fc;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(fx, y + h - 20 - fh, 6, fh);
    }
    ctx.globalAlpha = 1;
    // Glow
    var fg = ctx.createRadialGradient(x + w/2, y + h - 10, 0, x + w/2, y + h - 10, 80);
    fg.addColorStop(0, 'rgba(255,120,30,0.2)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(x - 60, y + 20, w + 120, h);
    // Mantle
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(x - 15, y, w + 30, 15);
  }

  function drawKelp(ctx, x, bottomY, t) {
    ctx.save();
    ctx.strokeStyle = '#228844';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    var segments = 6;
    var sh = 20;
    ctx.beginPath();
    ctx.moveTo(x, bottomY);
    for (var s = 0; s < segments; s++) {
      var sway = Math.sin(t * 0.02 + s * 0.5) * 8;
      ctx.lineTo(x + sway, bottomY - (s + 1) * sh);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawTreeTrunk(ctx, x, y, w, h) {
    ctx.fillStyle = '#2a1200';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1a0800';
    ctx.lineWidth = 1;
    for (var ri = 0; ri < 6; ri++) {
      ctx.beginPath();
      ctx.moveTo(x + ri * (w / 5), y);
      ctx.lineTo(x + ri * (w / 5) + 5, y + h);
      ctx.stroke();
    }
  }

  function drawMushroom(ctx, x, bottomY, color) {
    // stem
    ctx.fillStyle = '#ccaa88';
    ctx.fillRect(x - 5, bottomY - 20, 10, 20);
    // cap
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, bottomY - 22, 18, 12, 0, 0, Math.PI*2);
    ctx.fill();
    // glow
    var mg = ctx.createRadialGradient(x, bottomY - 22, 0, x, bottomY - 22, 30);
    mg.addColorStop(0, 'rgba(100,255,100,0.15)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(x, bottomY - 22, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawLantern(ctx, x, y, t) {
    // String
    ctx.strokeStyle = '#886644';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y); ctx.stroke();
    // Body
    var sway = Math.sin(t * 0.015 + x) * 4;
    ctx.save();
    ctx.translate(x + sway, y);
    ctx.fillStyle = '#cc3366';
    ctx.fillRect(-12, 0, 24, 35);
    // Glow
    var lg = ctx.createRadialGradient(0, 17, 0, 0, 17, 30);
    lg.addColorStop(0, 'rgba(255,180,150,0.3)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-30, -15, 60, 65);
    // Tassel
    ctx.strokeStyle = '#ffaacc';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 35); ctx.lineTo(0, 45); ctx.stroke();
    ctx.restore();
  }

  // ─── Particles ───────────────────────────────────────────────────────────────
  function tickParticles(ctx, W, H, theme, room) {
    _particleTick++;
    var maxParticles = theme.particles;

    // Spawn
    while (_particles.length < maxParticles) {
      _particles.push(spawnParticle(W, H, theme));
    }

    // Update & draw
    _particles = _particles.filter(function(p) {
      p.life++;
      p.x += p.vx + Math.sin(p.life * 0.05 + p.seed) * 0.3;
      p.y += p.vy;
      p.alpha = p.maxAlpha * Math.min(1, (p.maxLife - p.life) / (p.maxLife * 0.3));
      if (p.alpha <= 0 || p.life > p.maxLife) return false;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (theme.particleType === 'star') {
        ctx.fillStyle = '#ffffff';
        var twinkle = 0.5 + 0.5 * Math.sin(p.life * 0.1 + p.seed);
        ctx.globalAlpha *= twinkle;
        ctx.fillRect(p.x, p.y, 2, 2);
      } else if (theme.particleType === 'ember') {
        ctx.fillStyle = p.life % 3 === 0 ? '#ff8800' : '#ff4400';
        ctx.fillRect(p.x, p.y, 3, 3);
      } else if (theme.particleType === 'bubble') {
        ctx.strokeStyle = theme.particleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (theme.particleType === 'firefly') {
        var pulse = 0.4 + 0.6 * Math.sin(p.life * 0.08 + p.seed);
        ctx.globalAlpha *= pulse;
        ctx.fillStyle = '#aaffaa';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.globalAlpha *= 0.3;
        ctx.fillStyle = '#66ff66';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.particleType === 'cosmic') {
        ctx.fillStyle = theme.particleColor;
        ctx.fillRect(p.x, p.y, 1, 1);
      } else if (theme.particleType === 'petal') {
        ctx.fillStyle = '#ffaacc';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 0.03 + p.seed);
        ctx.scale(1, 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      return true;
    });
  }

  function spawnParticle(W, H, theme) {
    var vxDir = theme.particleType === 'ember' ? (Math.random() - 0.5) * 1.5 : (Math.random() - 0.5) * 0.5;
    var vyBase = theme.particleType === 'ember' ? -2 - Math.random() * 2
               : theme.particleType === 'bubble' ? -0.5 - Math.random()
               : theme.particleType === 'petal' ? 0.5 + Math.random()
               : theme.particleType === 'firefly' ? (Math.random() - 0.5) * 0.4
               : (Math.random() - 0.5) * 0.2;
    return {
      x: Math.random() * W,
      y: theme.particleType === 'petal' ? Math.random() * H * 0.3
       : theme.particleType === 'ember' ? H * 0.5 + Math.random() * H * 0.2
       : theme.particleType === 'bubble' ? H * 0.7 + Math.random() * H * 0.3
       : Math.random() * H,
      vx: vxDir, vy: vyBase,
      alpha: 0, maxAlpha: 0.6 + Math.random() * 0.4,
      life: 0, maxLife: 80 + Math.floor(Math.random() * 80),
      seed: Math.random() * Math.PI * 2,
      size: 2 + Math.random() * 3,
    };
  }

  // ─── Furniture ───────────────────────────────────────────────────────────────
  function renderFurniture(ctx, W, H, room, theme) {
    var placed = room.furniture || [];
    var defaultPos = [
      { id: 'chair', x: W * 0.2, y: H * 0.62 },
      { id: 'bookshelf', x: W * 0.08, y: H * 0.5 },
      { id: 'plant', x: W * 0.85, y: H * 0.6 },
    ];
    // Render whatever is in room.furniture, or defaults
    (placed.length > 0 ? placed : defaultPos).forEach(function(item) {
      drawFurnitureItem(ctx, item, theme, room);
    });
  }

  function drawFurnitureItem(ctx, item, theme, room) {
    var x = item.x, y = item.y;
    ctx.save();

    if (item.id === 'chair') {
      ctx.fillStyle = theme.accentColor;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, 36, 8);  // seat
      ctx.fillRect(x, y - 28, 8, 28);  // back
      ctx.fillRect(x + 4, y + 8, 6, 18);  // left leg
      ctx.fillRect(x + 26, y + 8, 6, 18); // right leg
    } else if (item.id === 'bookshelf') {
      ctx.fillStyle = '#6a3a10';
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, 50, 70);
      // Shelves
      for (var s = 0; s < 3; s++) {
        ctx.fillStyle = '#3a1a00';
        ctx.fillRect(x + 2, y + 8 + s * 22, 46, 3);
        // Books
        var bookColors = ['#cc4444','#4488cc','#44aa66','#ccaa00','#aa44cc'];
        for (var b = 0; b < 5; b++) {
          ctx.fillStyle = bookColors[b % bookColors.length];
          ctx.fillRect(x + 4 + b * 9, y + 10 + s * 22, 7, 18);
        }
      }
    } else if (item.id === 'plant') {
      ctx.fillStyle = '#3a2000';
      ctx.fillRect(x + 8, y + 30, 14, 20);
      ctx.fillStyle = theme.id === 'forest' ? '#44ff66' : '#33cc55';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x + 15, y + 20, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 5, y + 28, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 25, y + 28, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.id === 'neon') {
      var text = (item.text || 'ECHO').substring(0, 12);
      var neonColor = theme.accentColor;
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = neonColor;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ─── Photo Frames ─────────────────────────────────────────────────────────────
  function renderPhotoFrames(ctx, W, H, room, theme) {
    var photos = room.photos || [];
    var framePositions = [
      { x: W * 0.3, y: H * 0.12, w: 90, h: 70 },
      { x: W * 0.44, y: H * 0.08, w: 90, h: 70 },
      { x: W * 0.58, y: H * 0.12, w: 90, h: 70 },
      { x: W * 0.3, y: H * 0.26, w: 90, h: 70 },
      { x: W * 0.44, y: H * 0.26, w: 90, h: 70 },
      { x: W * 0.58, y: H * 0.26, w: 90, h: 70 },
    ];
    framePositions.forEach(function(fp, i) {
      var photo = photos[i];
      // Frame border
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.strokeRect(fp.x, fp.y, fp.w, fp.h);
      if (photo && photo.url) {
        // Show colored placeholder with title
        ctx.fillStyle = theme.lightColor || 'rgba(100,100,200,0.2)';
        ctx.fillRect(fp.x + 3, fp.y + 3, fp.w - 6, fp.h - 6);
        ctx.font = '9px monospace';
        ctx.fillStyle = theme.accentColor;
        ctx.fillText((photo.title || 'Photo').substring(0, 10), fp.x + 5, fp.y + fp.h - 6);
      } else {
        ctx.fillStyle = 'rgba(50,50,80,0.4)';
        ctx.fillRect(fp.x + 3, fp.y + 3, fp.w - 6, fp.h - 6);
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(150,150,200,0.4)';
        ctx.fillText('+ Photo', fp.x + 8, fp.y + fp.h / 2 + 4);
      }
      ctx.globalAlpha = 1;
    });
  }

  // ─── Guest Book Object ────────────────────────────────────────────────────────
  function renderGuestBook(ctx, W, H, theme) {
    var bx = W * 0.48, by = H * 0.67;
    // Table
    ctx.fillStyle = '#3a1a00';
    ctx.fillRect(bx - 30, by + 18, 80, 8);
    ctx.fillRect(bx - 20, by + 26, 10, 20);
    ctx.fillRect(bx + 30, by + 26, 10, 20);
    // Book
    ctx.fillStyle = '#cc8844';
    ctx.fillRect(bx - 15, by, 40, 18);
    ctx.fillStyle = '#aa6622';
    ctx.fillRect(bx - 14, by + 1, 18, 16);
    ctx.fillStyle = '#ddaa66';
    ctx.fillRect(bx + 4, by + 1, 20, 16);
    // Line details
    ctx.strokeStyle = 'rgba(80,40,0,0.5)';
    ctx.lineWidth = 1;
    for (var li = 0; li < 3; li++) {
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 4 + li * 5);
      ctx.lineTo(bx + 22, by + 4 + li * 5);
      ctx.stroke();
    }
    // Label
    ctx.font = '9px monospace';
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.7;
    ctx.fillText('📖 Guest Book', bx - 20, by + 32);
    ctx.globalAlpha = 1;
  }

  // ─── Room Info Panel ─────────────────────────────────────────────────────────
  function renderRoomInfo(ctx, W, H, room, theme) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    roundRect(ctx, 8, 8, 200, 58, 6);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText('🔒 ' + (room.name || 'Secret Room').substring(0, 20), 16, 26);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('Owner: ' + (room.owner || 'You'), 16, 40);

    var moodColor = MOOD_COLORS[room.mood] || '#aaaacc';
    ctx.fillStyle = moodColor;
    ctx.fillText('● ' + (room.mood || 'Chilling'), 16, 54);
    ctx.restore();
  }

  // ─── Customize Panel ─────────────────────────────────────────────────────────
  function renderCustomizePanel(ctx, W, H, room, theme) {
    // Rendered as DOM overlay
    if (!document.getElementById('sr-customize-dom')) {
      showCustomizeDOMPanel(room, theme);
    }
  }

  function showCustomizeDOMPanel(room, theme) {
    closeAllSRPopups();
    var panel = document.createElement('div');
    panel.id = 'sr-customize-dom';
    panel.className = 'sr-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9001;' +
      'background:#080818;border:2px solid ' + theme.accentColor + ';border-radius:14px;padding:20px;' +
      'width:420px;max-width:95vw;max-height:85vh;overflow-y:auto;color:#ddd;font-family:monospace;';

    var trackOpts = MUSIC_TRACKS.map(function(tr) {
      var sel = (room.music === tr) ? ' selected' : '';
      return '<option value="' + tr + '"' + sel + '>' + tr + '</option>';
    }).join('');

    var furnitureHTML = FURNITURE_ITEMS.map(function(fi) {
      var hasFurni = (room.furniture || []).some(function(f) { return f.id === fi.id; });
      var style = 'background:' + (hasFurni ? 'rgba(100,80,200,0.3)' : 'rgba(30,30,60,0.6)') +
        ';border:1px solid ' + (hasFurni ? theme.accentColor : '#444') + ';';
      return '<button class="sr-furniture-btn" data-id="' + fi.id + '" style="' + style + 'padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#ddd;margin:3px">' +
        fi.label + (hasFurni ? ' ✓' : '') + '</button>';
    }).join('');

    panel.innerHTML =
      '<div style="color:' + theme.accentColor + ';font-size:15px;font-weight:bold;margin-bottom:14px">⚙️ Customize Room</div>' +

      '<div class="sr-section-label">🎵 Ambient Music</div>' +
      '<select id="sr-music-select" class="sr-select">' + trackOpts + '</select>' +
      '<div id="sr-now-playing" style="font-size:10px;color:#888;margin-top:4px">Now: ' + escHtml(room.music || 'Silence') + '</div>' +

      '<div class="sr-section-label" style="margin-top:12px">🪑 Furniture</div>' +
      '<div id="sr-furniture-grid">' + furnitureHTML + '</div>' +

      '<div class="sr-section-label" style="margin-top:12px">🖼️ Photo Wall (URLs)</div>' +
      buildPhotoInputs(room) +

      '<div style="display:flex;gap:8px;margin-top:18px">' +
        '<button class="sr-btn sr-btn-primary" id="sr-save-customize">💾 Save</button>' +
        '<button class="sr-btn sr-btn-danger" id="sr-close-customize">✕ Close</button>' +
      '</div>';

    document.body.appendChild(panel);

    // Furniture toggles
    panel.querySelectorAll('.sr-furniture-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.id;
        var furniture = room.furniture || [];
        var existing = furniture.findIndex(function(f) { return f.id === id; });
        if (existing >= 0) {
          furniture.splice(existing, 1);
          btn.style.background = 'rgba(30,30,60,0.6)';
          btn.style.borderColor = '#444';
          btn.textContent = FURNITURE_ITEMS.find(function(fi) { return fi.id === id; }).label;
        } else {
          var defaults = { chair: { x: 200, y: 360 }, bookshelf: { x: 50, y: 300 }, plant: { x: 680, y: 360 }, neon: { x: 350, y: 200 } };
          furniture.push(Object.assign({ id: id }, defaults[id] || { x: 200, y: 350 }));
          btn.style.background = 'rgba(100,80,200,0.3)';
          btn.style.borderColor = theme.accentColor;
          btn.textContent = FURNITURE_ITEMS.find(function(fi) { return fi.id === id; }).label + ' ✓';
        }
        room.furniture = furniture;
      });
    });

    document.getElementById('sr-save-customize').onclick = function() {
      var musicSel = document.getElementById('sr-music-select');
      if (musicSel) room.music = musicSel.value;
      // Collect photos
      var photos = [];
      for (var i = 0; i < 6; i++) {
        var urlEl = document.getElementById('sr-photo-url-' + i);
        var titleEl = document.getElementById('sr-photo-title-' + i);
        if (urlEl && urlEl.value.trim()) {
          photos.push({ url: urlEl.value.trim(), title: titleEl ? titleEl.value.trim() : '' });
        } else {
          photos.push(null);
        }
      }
      room.photos = photos;
      _myRoom = room;
      lsSet(LS_ROOM_KEY, _myRoom);
      panel.remove();
      _customizeOpen = false;
      showToast('✅ Room saved!', 'success');
    };
    document.getElementById('sr-close-customize').onclick = function() {
      panel.remove();
      _customizeOpen = false;
    };
  }

  function buildPhotoInputs(room) {
    var photos = room.photos || [];
    var html = '';
    for (var i = 0; i < 6; i++) {
      var p = photos[i] || {};
      html += '<div style="display:flex;gap:6px;margin-bottom:4px">' +
        '<input id="sr-photo-url-' + i + '" class="sr-input" style="flex:2" placeholder="Image URL ' + (i+1) + '" value="' + escHtml(p.url || '') + '">' +
        '<input id="sr-photo-title-' + i + '" class="sr-input" style="flex:1" placeholder="Title" value="' + escHtml(p.title || '') + '">' +
        '</div>';
    }
    return html;
  }

  // ─── Guest Book Panel ─────────────────────────────────────────────────────────
  function renderGuestBookPanel(ctx, W, H, room) {
    if (!document.getElementById('sr-guestbook-dom')) {
      showGuestBookDOMPanel(room);
    }
  }

  function showGuestBookDOMPanel(room) {
    closeAllSRPopups();
    var entries = lsGet(LS_GUESTBOOK_KEY) || [];
    var isOwner = (room.owner === getMyName());

    var panel = document.createElement('div');
    panel.id = 'sr-guestbook-dom';
    panel.className = 'sr-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9001;' +
      'background:#080818;border:2px solid #cc8844;border-radius:14px;padding:20px;' +
      'width:380px;max-width:95vw;max-height:80vh;overflow-y:auto;color:#ddd;font-family:monospace;';

    var entriesHTML = entries.length === 0
      ? '<div style="color:#555;font-style:italic;margin:12px 0">No messages yet. Be the first!</div>'
      : entries.map(function(e, i) {
          var del = isOwner ? ' <button class="sr-gb-del" data-i="' + i + '" style="color:#ff4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>' : '';
          return '<div style="border:1px solid #333;border-radius:6px;padding:8px;margin:4px 0">' +
            '<span style="color:#cc8844;font-size:11px;font-weight:bold">' + escHtml(e.name || 'Anonymous') + '</span>' + del +
            '<div style="color:#bbb;font-size:12px;margin-top:3px">' + escHtml(e.msg || '') + '</div>' +
            '</div>';
        }).join('');

    panel.innerHTML =
      '<div style="color:#cc8844;font-size:15px;font-weight:bold;margin-bottom:14px">📖 Guest Book</div>' +
      '<div id="sr-gb-entries">' + entriesHTML + '</div>' +
      '<div style="margin-top:14px">' +
        '<input id="sr-gb-name" class="sr-input" placeholder="Your name" maxlength="30" style="margin-bottom:6px">' +
        '<textarea id="sr-gb-msg" class="sr-input" placeholder="Leave a message... (max 100 chars)" maxlength="100" style="resize:none;height:56px;width:100%;box-sizing:border-box"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button class="sr-btn sr-btn-primary" id="sr-gb-submit">✍️ Sign</button>' +
          '<button class="sr-btn sr-btn-danger" id="sr-gb-close">✕ Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    panel.querySelectorAll('.sr-gb-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.i);
        var ents = lsGet(LS_GUESTBOOK_KEY) || [];
        ents.splice(idx, 1);
        lsSet(LS_GUESTBOOK_KEY, ents);
        panel.remove();
        _guestBookOpen = false;
        showGuestBookDOMPanel(room);
        _guestBookOpen = true;
      });
    });

    document.getElementById('sr-gb-submit').onclick = function() {
      var name = (document.getElementById('sr-gb-name').value || '').trim();
      var msg  = (document.getElementById('sr-gb-msg').value || '').trim();
      if (!msg) { showToast('Write something first!', 'error'); return; }
      var ents = lsGet(LS_GUESTBOOK_KEY) || [];
      if (ents.length >= 20) ents.shift();
      ents.push({ name: name || 'Anonymous', msg: msg, ts: Date.now() });
      lsSet(LS_GUESTBOOK_KEY, ents);
      showToast('✍️ Message signed!', 'success');
      panel.remove();
      _guestBookOpen = false;
      showGuestBookDOMPanel(room);
      _guestBookOpen = true;
    };

    document.getElementById('sr-gb-close').onclick = function() {
      panel.remove();
      _guestBookOpen = false;
    };
  }

  // ─── Corridor of Doors (Floor 7) ─────────────────────────────────────────────
  // We hook into renderFloor7 to add the door corridor overlay
  function hookFloor7() {
    var _orig7 = window.renderFloor7;
    window.renderFloor7 = function() {
      if (typeof _orig7 === 'function') _orig7();
      var ctx = window.ctx || window._ctx;
      var W   = window.W  || window._W  || 800;
      var H   = window.H  || window._H  || 600;
      if (ctx) renderDoorCorridor(ctx, W, H);
    };
  }

  var _doorRects = []; // [{room, x, y, w, h}]

  function renderDoorCorridor(ctx, W, H) {
    var doors = getAllDoors();
    var doorW = 70, doorH = 110;
    var startX = 80;
    var spacing = 120;
    var groundY = H * 0.72;
    _doorRects = [];

    // Corridor label
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = 'rgba(200,180,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 Secret Room Corridor — Walk up to a door and press SPACE', W / 2, H * 0.88);
    ctx.textAlign = 'left';
    ctx.restore();

    doors.forEach(function(room, i) {
      var x = startX + i * spacing;
      var y = groundY - doorH;
      _doorRects.push({ room: room, x: x, y: y, w: doorW, h: doorH });
      drawDoor(ctx, x, y, doorW, doorH, room);
    });

    // Check player proximity
    checkDoorProximity(doors);
  }

  function drawDoor(ctx, x, y, w, h, room) {
    var theme = THEMES[room.theme] || THEMES.midnight;
    var isHidden = room.access === 'Hidden';
    var moodColor = MOOD_COLORS[room.mood] || '#aaaacc';
    var t = _tick;

    ctx.save();
    if (isHidden) ctx.globalAlpha = 0.45;

    // Glow behind door
    var glowPulse = 0.5 + 0.5 * Math.sin(t * 0.04);
    var glow = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, w * 1.2);
    glow.addColorStop(0, 'rgba(' + hexToRgb(theme.glowColor) + ',' + (0.25 * glowPulse) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - w * 0.5, y - 10, w * 2, h + 20);

    // Door arch (top-rounded)
    ctx.fillStyle = theme.doorColor;
    ctx.beginPath();
    ctx.moveTo(x, y + w / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // Door border / frame
    ctx.strokeStyle = theme.doorMetal;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Door inner panel
    ctx.fillStyle = adjustBrightness(theme.doorColor, 20);
    ctx.fillRect(x + 6, y + w / 2 - 2, w - 12, h - w / 2 - 8);

    // Door panel decorative lines
    ctx.strokeStyle = theme.doorMetal;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(x + 10, y + w / 2 + 4, w - 20, (h - w / 2 - 16) / 2 - 4);
    ctx.strokeRect(x + 10, y + w / 2 + (h - w / 2 - 16) / 2 + 4, w - 20, (h - w / 2 - 16) / 2 - 4);
    ctx.globalAlpha = isHidden ? 0.45 : 1;

    // Door knob
    ctx.fillStyle = theme.doorMetal;
    ctx.beginPath();
    ctx.arc(x + w - 14, y + h / 2 + 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Mood indicator light
    ctx.shadowColor = moodColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = moodColor;
    ctx.beginPath();
    ctx.arc(x + w / 2, y - 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nameplate
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1220';
    ctx.fillRect(x + 2, y - 28, w - 4, 14);
    ctx.strokeStyle = theme.doorMetal;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(x + 2, y - 28, w - 4, 14);
    ctx.globalAlpha = isHidden ? 0.45 : 1;
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'center';
    var label = (room.owner || '?') + '\'s';
    ctx.fillText(label.substring(0, 9), x + w / 2, y - 19);
    ctx.textAlign = 'left';

    // Lock icon if Invite Only
    if (room.access === 'Invite Only') {
      ctx.font = '12px serif';
      ctx.fillStyle = '#ffcc44';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', x + w / 2, y + 20);
      ctx.textAlign = 'left';
    }

    // NSFW badge
    if (room.nsfw) {
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔞', x + w - 8, y + h - 8);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  function checkDoorProximity(doors) {
    var S = window._S;
    if (!S) return;
    var player = S.useVisitor ? S.visitor : S.echo;
    if (!player) return;

    _doorInteractTarget = null;
    _doorRects.forEach(function(dr) {
      var px = player.x, py = player.y;
      var inRange = px > dr.x - 20 && px < dr.x + dr.w + 20 &&
                    py > dr.y - 20 && py < dr.y + dr.h + 40;
      if (inRange) _doorInteractTarget = dr.room;
    });

    // Show/hide interact prompt
    var prompt = document.getElementById('interact-prompt');
    if (prompt) {
      if (_doorInteractTarget) {
        prompt.style.display = 'block';
        var r = _doorInteractTarget;
        if (r.owner === getMyName()) {
          prompt.textContent = 'SPACE — Enter ' + (r.name || 'Your Room');
        } else if (r.access === 'Hidden') {
          prompt.textContent = '👻 This room exists in another dimension...';
        } else if (r.access === 'Invite Only') {
          prompt.textContent = '🔒 ' + (r.owner || '?') + '\'s Space — Invitation Only';
        } else {
          prompt.textContent = 'SPACE — Enter ' + (r.name || r.owner + '\'s Room');
        }
      } else {
        if (prompt.textContent.indexOf('SPACE — Enter') === 0 || prompt.textContent.indexOf('🔒') === 0 || prompt.textContent.indexOf('👻') === 0) {
          prompt.style.display = 'none';
        }
      }
    }
  }

  // ─── Access Control ───────────────────────────────────────────────────────────
  function tryEnterDoor(room) {
    if (!room) return;
    var myName = getMyName();

    // Owner always enters immediately
    if (room.owner === myName) {
      enterMyRoom(); return;
    }

    // NSFW gate first
    if (room.nsfw && !_ageVerified) {
      showAgeGate(function() { tryEnterDoor(room); }); return;
    }

    if (room.access === 'Hidden') {
      showAccessDenied('👻 This room exists in another dimension.\n"You sense a presence, but the door isn\'t really there."', room);
      return;
    }

    if (room.access === 'Invite Only') {
      var invites = lsGet(LS_INVITES_KEY) || [];
      if (invites.indexOf(myName) >= 0) {
        enterRoomAs(room); return;
      }
      showAccessDenied('🔒 This room is private.\n"' + (room.owner || '?') + ' has locked this door for a reason."\n\nRequest access?', room, true);
      return;
    }

    // Open
    enterRoomAs(room);
  }

  function enterRoomAs(room) {
    // For demo: set _myRoom temporarily so the renderer uses this room's theme
    var _savedRoom = _myRoom;
    _myRoom = room;
    _inSecretRoom = true;
    _particles = [];
    if (typeof window.changeFloor === 'function') window.changeFloor(FLOOR_SECRET_ROOM);
    else if (window._S) window._S.floor = FLOOR_SECRET_ROOM;
    // Don't save over their own room
    _myRoom = _savedRoom;
    showToast('🚪 Entered ' + (room.name || room.owner + '\'s Room'), 'success');
  }

  function showAccessDenied(msg, room, canRequest) {
    closeAllSRPopups();
    var overlay = document.createElement('div');
    overlay.id = 'sr-access-denied';
    overlay.className = 'sr-overlay';
    var theme = THEMES[room.theme] || THEMES.midnight;
    overlay.innerHTML = '<div class="sr-modal" style="border-color:' + theme.accentColor + ';max-width:340px;text-align:center">' +
      '<div style="font-size:32px;margin-bottom:10px">' + (room.access === 'Hidden' ? '👻' : '🔒') + '</div>' +
      '<div style="color:' + theme.accentColor + ';font-size:14px;font-weight:bold;margin-bottom:10px">' + escHtml(room.name || room.owner + '\'s Space') + '</div>' +
      '<div style="color:#aaa;font-size:12px;line-height:1.6;margin-bottom:16px;white-space:pre-wrap">' + escHtml(msg) + '</div>' +
      (canRequest ? '<button class="sr-btn sr-btn-primary" id="sr-request-access" style="margin-bottom:8px">📨 Request Access</button>' : '') +
      '<button class="sr-btn sr-btn-danger" id="sr-deny-close">Not now</button>' +
    '</div>';
    document.body.appendChild(overlay);

    if (canRequest) {
      document.getElementById('sr-request-access').onclick = function() {
        overlay.remove();
        showToast('📨 Request sent to ' + (room.owner || '?') + '!', 'success');
      };
    }
    document.getElementById('sr-deny-close').onclick = function() { overlay.remove(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  function showAgeGate(onConfirm) {
    closeAllSRPopups();
    var overlay = document.createElement('div');
    overlay.id = 'sr-age-gate';
    overlay.className = 'sr-overlay';
    overlay.innerHTML = '<div class="sr-modal" style="text-align:center;max-width:320px">' +
      '<div style="font-size:36px;margin-bottom:10px">🔞</div>' +
      '<div style="color:#ff8888;font-size:14px;font-weight:bold;margin-bottom:8px">18+ Content</div>' +
      '<div style="color:#aaa;font-size:12px;margin-bottom:16px">This room contains mature content.\nBy entering, you confirm you are 18 or older.</div>' +
      '<button class="sr-btn sr-btn-primary" id="sr-age-confirm" style="margin-bottom:8px">I am 18+ — Enter</button>' +
      '<button class="sr-btn sr-btn-danger" id="sr-age-cancel">Go back</button>' +
    '</div>';
    document.body.appendChild(overlay);
    document.getElementById('sr-age-confirm').onclick = function() {
      _ageVerified = true; lsSet(LS_AGE_KEY, true);
      overlay.remove();
      onConfirm();
    };
    document.getElementById('sr-age-cancel').onclick = function() { overlay.remove(); };
  }

  // ─── Key Bindings ─────────────────────────────────────────────────────────────
  function listenKeys() {
    document.addEventListener('keydown', function(e) {
      var S = window._S;
      if (!S) return;

      // SPACE to interact with door on floor 7
      if (e.code === 'Space' && S.floor === 7 && _doorInteractTarget) {
        e.preventDefault();
        e.stopPropagation();
        tryEnterDoor(_doorInteractTarget);
        return;
      }

      // Inside secret room (floor 25)
      if (S.floor === FLOOR_SECRET_ROOM) {
        if (e.code === 'Tab') {
          e.preventDefault();
          if (_myRoom) {
            _customizeOpen = !_customizeOpen;
            if (_customizeOpen) {
              _guestBookOpen = false;
              document.getElementById('sr-guestbook-dom') && document.getElementById('sr-guestbook-dom').remove();
              showCustomizeDOMPanel(_myRoom, THEMES[_myRoom.theme] || THEMES.midnight);
            } else {
              document.getElementById('sr-customize-dom') && document.getElementById('sr-customize-dom').remove();
            }
          }
          return;
        }
        if (e.code === 'KeyG') {
          if (_myRoom) {
            _guestBookOpen = !_guestBookOpen;
            if (_guestBookOpen) {
              _customizeOpen = false;
              document.getElementById('sr-customize-dom') && document.getElementById('sr-customize-dom').remove();
              showGuestBookDOMPanel(_myRoom);
            } else {
              document.getElementById('sr-guestbook-dom') && document.getElementById('sr-guestbook-dom').remove();
            }
          }
          return;
        }
        if (e.code === 'Escape') {
          closeAllSRPopups();
          _inSecretRoom = false;
          _customizeOpen = false;
          _guestBookOpen = false;
          _particles = [];
          if (typeof window.changeFloor === 'function') window.changeFloor(7);
          return;
        }
      }
    });
  }

  // ─── Toast Notifications ──────────────────────────────────────────────────────
  function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed', 'bottom:120px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9999', 'background:' + (type === 'error' ? '#2a0808' : '#080a20'),
      'border:2px solid ' + (type === 'error' ? '#ff4444' : '#44ff88'),
      'border-radius:8px', 'padding:8px 18px',
      'color:' + (type === 'error' ? '#ff8888' : '#88ffaa'),
      'font-family:monospace', 'font-size:13px',
      'pointer-events:none',
      'transition:opacity 0.4s',
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; }, 1800);
    setTimeout(function() { toast.remove(); }, 2300);
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────
  function closeAllSRPopups() {
    ['sr-create-overlay','sr-room-menu','sr-customize-dom','sr-guestbook-dom',
     'sr-access-denied','sr-age-gate'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    _customizeOpen = false;
    _guestBookOpen = false;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return r + ',' + g + ',' + b;
  }

  function adjustBrightness(hex, amount) {
    try {
      var r = Math.min(255, parseInt(hex.slice(1,3),16) + amount);
      var g = Math.min(255, parseInt(hex.slice(3,5),16) + amount);
      var b = Math.min(255, parseInt(hex.slice(5,7),16) + amount);
      return '#' + ('0' + r.toString(16)).slice(-2) + ('0' + g.toString(16)).slice(-2) + ('0' + b.toString(16)).slice(-2);
    } catch(e) { return hex; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ─── Inject CSS ───────────────────────────────────────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.sr-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:8999;display:flex;align-items:center;justify-content:center}',
      '.sr-modal{background:#0a0a1c;border:2px solid #7755cc;border-radius:14px;padding:24px;max-width:420px;width:95vw;font-family:monospace;color:#ddd;max-height:90vh;overflow-y:auto}',
      '.sr-modal-title{color:#cc88ff;font-size:17px;font-weight:bold;margin-bottom:16px;text-align:center}',
      '.sr-label{display:block;font-size:11px;color:#8888aa;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.05em}',
      '.sr-section-label{font-size:11px;color:#8888aa;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px}',
      '.sr-input{width:100%;background:#050514;border:1px solid #334;border-radius:6px;color:#ddd;font-family:monospace;font-size:13px;padding:6px 10px;box-sizing:border-box;outline:none}',
      '.sr-input:focus{border-color:#7755cc}',
      '.sr-select{width:100%;background:#050514;border:1px solid #334;border-radius:6px;color:#ddd;font-family:monospace;font-size:13px;padding:6px 10px;box-sizing:border-box}',
      '.sr-theme-grid{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}',
      '.sr-theme-opt{flex:1 1 30%;background:#0a0a20;border:2px solid #333;border-radius:8px;color:#aaa;font-family:monospace;font-size:11px;padding:8px 4px;cursor:pointer;transition:all 0.2s}',
      '.sr-theme-opt:hover{border-color:var(--tc,#7755cc);color:#fff}',
      '.sr-theme-opt.selected{border-color:var(--tc,#7755cc);background:rgba(100,70,200,0.2);color:#fff}',
      '.sr-toggle-row{display:flex;align-items:center;justify-content:space-between;margin-top:12px}',
      '.sr-toggle{position:relative;display:inline-block;width:40px;height:22px}',
      '.sr-toggle input{opacity:0;width:0;height:0}',
      '.sr-toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#222;border-radius:22px;transition:.3s}',
      '.sr-toggle-slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;background:#555;border-radius:50%;transition:.3s}',
      '.sr-toggle input:checked + .sr-toggle-slider{background:#553388}',
      '.sr-toggle input:checked + .sr-toggle-slider:before{transform:translateX(18px);background:#cc88ff}',
      '.sr-btn{display:block;width:100%;background:#0e0e28;border:1px solid #444;border-radius:8px;color:#ddd;font-family:monospace;font-size:12px;padding:9px 14px;cursor:pointer;transition:all 0.2s}',
      '.sr-btn:hover{border-color:#7755cc;background:#1a1840}',
      '.sr-btn-primary{border-color:#7755cc;background:rgba(100,70,200,0.15);color:#cc88ff}',
      '.sr-btn-primary:hover{background:rgba(100,70,200,0.3)}',
      '.sr-btn-danger{border-color:#554;color:#aa8888}',
      '.sr-btn-danger:hover{border-color:#ff4444;color:#ff8888}',
      '.sr-panel{font-family:monospace;color:#ddd}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─── Wait & Boot ──────────────────────────────────────────────────────────────
  function waitReady(fn, attempts) {
    attempts = attempts || 0;
    if (attempts > 200) { console.warn('[SecretRooms] gave up waiting'); return; }
    if (document.getElementById('hud') && typeof window.changeFloor === 'function') {
      fn();
    } else {
      setTimeout(function() { waitReady(fn, attempts + 1); }, 100);
    }
  }

  function boot() {
    waitReady(function() {
      init();
      // Hook floor 7 after a short delay to let other scripts initialize
      setTimeout(hookFloor7, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
