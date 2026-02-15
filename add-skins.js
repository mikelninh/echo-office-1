// Script to add 24 new skins to index.html
const fs = require('fs');
let html = fs.readFileSync('/Users/mikel/.openclaw/workspace/echo-office/index.html', 'utf8');

// === PART 1: Add skin entries to VISITOR_SKINS array ===
const newSkinEntries = `
  // === Seasonal Limited-Edition Skins (v23) ===
  // Spring Collection (March-May)
  {id:'cherry_blossom',label:'Cherry Blossom',icon:'🌸',color:'#ff69b4',cost:800,desc:'Pink samurai with petal particles',rarity:'epic',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  {id:'pollen_fairy',label:'Pollen Fairy',icon:'🧚',color:'#ffd700',cost:400,desc:'Golden wings, flower crown',rarity:'rare',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  {id:'spring_bunny',label:'Spring Bunny',icon:'🐰',color:'#ffb6c1',cost:200,desc:'Cute bunny suit with basket',rarity:'common',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  // Summer Collection (June-August)
  {id:'beach_king',label:'Beach King',icon:'🏄',color:'#ff8c00',cost:400,desc:'Hawaiian shirt, sunglasses, surfboard',rarity:'rare',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  {id:'lifeguard',label:'Lifeguard',icon:'🏊',color:'#cc0000',cost:800,desc:'Red swimsuit, whistle, rescue float',rarity:'epic',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  {id:'sun_spirit',label:'Sun Spirit',icon:'☀️',color:'#ffaa00',cost:2000,desc:'Living flame/sun entity',rarity:'legendary',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  // Autumn Collection (September-November)
  {id:'pumpkin_knight',label:'Pumpkin Knight',icon:'🎃',color:'#ff6600',cost:800,desc:'Carved pumpkin head, vine armor',rarity:'epic',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  {id:'harvest_witch',label:'Harvest Witch',icon:'🧹',color:'#8b4513',cost:400,desc:'Pointed hat, broomstick, autumn palette',rarity:'rare',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  {id:'scarecrow',label:'Scarecrow',icon:'🌾',color:'#daa520',cost:200,desc:'Tattered clothes, straw sticking out',rarity:'common',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  // Winter Collection (December-February)
  {id:'ice_queen',label:'Ice Queen',icon:'❄️',color:'#87ceeb',cost:2000,desc:'Crystal crown, ice blue flowing dress',rarity:'legendary',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  {id:'snowdrift',label:'Snowdrift',icon:'⛄',color:'#f0f8ff',cost:400,desc:'Living snowman with top hat',rarity:'rare',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  {id:'cozy_fireplace',label:'Cozy Fireplace',icon:'🔥',color:'#ff4500',cost:800,desc:'Walking fireplace with fire on head',rarity:'epic',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  // === Skin Style Variants (v23) ===
  {id:'shadow_blood',label:'Shadow Blood',icon:'🩸',color:'#8b0000',cost:600,desc:'Blood-red Shadow Echo variant',rarity:'epic',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'shadow_frost',label:'Shadow Frost',icon:'🧊',color:'#4fc3f7',cost:600,desc:'Ice-blue Shadow Echo variant',rarity:'epic',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'shadow_void',label:'Shadow Void',icon:'🕳️',color:'#4a0080',cost:1500,desc:'Deep purple void Shadow Echo',rarity:'legendary',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'saiyan_blue',label:'Saiyan Blue',icon:'💙',color:'#1e90ff',cost:1500,desc:'Blue-haired Super Saiyan God',rarity:'legendary',hasSprite:true,variant_of:'super_saiyan'},
  {id:'saiyan_rose',label:'Saiyan Rosé',icon:'🌹',color:'#ff69b4',cost:1500,desc:'Pink-haired Saiyan Rosé',rarity:'legendary',hasSprite:true,variant_of:'super_saiyan'},
  {id:'cyber_neon',label:'Cyber Neon',icon:'💗',color:'#ff1493',cost:350,desc:'Hot pink Cyberpunk variant',rarity:'rare',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'cyber_toxic',label:'Cyber Toxic',icon:'☢️',color:'#39ff14',cost:350,desc:'Toxic green Cyberpunk variant',rarity:'rare',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'cyber_chrome',label:'Cyber Chrome',icon:'🪞',color:'#c0c0c0',cost:600,desc:'Silver chrome Cyberpunk variant',rarity:'epic',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'robot_gold',label:'Robot Gold',icon:'🏆',color:'#ffd700',cost:600,desc:'Golden robot variant',rarity:'epic',hasSprite:true,variant_of:'robot'},
  {id:'ninja_crimson',label:'Ninja Crimson',icon:'🔴',color:'#dc143c',cost:350,desc:'Red ninja variant',rarity:'rare',hasSprite:true,variant_of:'ninja'},
  {id:'pirate_ghost',label:'Pirate Ghost',icon:'👻',color:'#b0c4de',cost:1500,desc:'Translucent ghost pirate',rarity:'legendary',hasSprite:true,variant_of:'pirate'},
  {id:'knight_dark',label:'Knight Dark',icon:'🖤',color:'#1a1a1a',cost:600,desc:'Black armor dark knight',rarity:'epic',hasSprite:true,variant_of:'knight-v'},`;

// Insert before the closing ];
html = html.replace(
  `{id:'void_walker',label:'Void Walker',icon:'🌀',color:'#220033',cost:-1,desc:'Animated glitch effect — reality tears around you',accent:'#ff3344',rarity:'mythic',lootOnly:true,hasSprite:true},\n];`,
  `{id:'void_walker',label:'Void Walker',icon:'🌀',color:'#220033',cost:-1,desc:'Animated glitch effect — reality tears around you',accent:'#ff3344',rarity:'mythic',lootOnly:true,hasSprite:true},${newSkinEntries}\n];`
);

// === PART 2: Add sprite definitions in getVisitorSprite ===
// Insert before the "// Walk animation" comment
const spriteCode = `
  // === SEASONAL SKINS (v23) ===
  else if(skinId==='cherry_blossom'){
    const P='#ff69b4',Pd='#cc5599',Pl='#ff99cc',A='#c0c0c0',Ad='#888',Al='#ddd',S1='#ffaa88',S1d='#dd8866',S1l='#ffcc99',H='#222',E='#111',R='#ff3366',Sk='#ffddcc',W='#fff';
    if(dir===0){
      grid=[
        [T, T, T, T, T, P, Pl,P, Pl,P, T, T, T, T, T, T],
        [T, T, T, T, P, Pd,P, P, P, Pd,P, T, T, T, T, T],
        [T, T, T, P, H, H, H, H, H, H, P, T, T, T, T, T],
        [T, T, T, H, H, H, H, H, H, H, H, T, T, T, T, T],
        [T, T, T, S1,S1l,S1,S1,S1,S1l,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,R, S1,S1,S1,T, T, T, T, T, T],
        [T, T, A, Al,P, Pl,P, P, Pl,P, Al,A, T, T, T, T],
        [T, T, A, P, Pd,P, P, P, P, Pd,P, A, T, T, T, T],
        [T, A, P, Pl,P, P, Pd,Pd,P, P, Pl,P, A, T, T, T],
        [T, A, P, P, Pd,P, P, P, P, Pd,P, P, A, T, T, T],
        [T, T, P, P, P, W, W, W, W, P, P, P, T, T, T, T],
        [T, T, A, P, P, P, Pd,Pd,P, P, P, A, T, T, T, T],
        [T, T, T, P, P, P, P, P, P, P, P, T, T, T, T, T],
        [T, T, T, T, P, Pd,P, P, Pd,P, T, T, T, T, T, T],
        [T, T, T, T, Pd,P, T, T, P, Pd,T, T, T, T, T, T],
        [T, T, T, T, H, H, T, T, H, H, T, T, T, T, T, T],
        [T, T, T, H, H, H, T, T, H, H, H, T, T, T, T, T],
        [T, T, T, H, H, H, T, T, H, H, H, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,T,P,Pl,P,Pl,P,T,T,T,T,T,T],[T,T,T,T,P,Pd,P,P,P,Pd,P,T,T,T,T,T],[T,T,T,P,H,H,H,H,H,H,P,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,T,H,H,H,H,H,H,T,T,T,T,T,T],[T,T,A,Al,P,P,P,P,P,P,Al,A,T,T,T,T],[T,T,A,P,P,P,P,P,P,P,P,A,T,T,T,T],[T,A,P,Pl,P,P,P,P,P,P,Pl,P,A,T,T,T],[T,A,P,P,P,P,P,P,P,P,P,P,A,T,T,T],[T,T,P,P,P,P,P,P,P,P,P,P,T,T,T,T],[T,T,A,P,P,P,P,P,P,P,P,A,T,T,T,T],[T,T,T,P,P,P,P,P,P,P,P,T,T,T,T,T],[T,T,T,T,P,P,P,P,P,P,T,T,T,T,T,T],[T,T,T,T,Pd,P,T,T,P,Pd,T,T,T,T,T,T],[T,T,T,T,H,H,T,T,H,H,T,T,T,T,T,T],[T,T,T,H,H,H,T,T,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,T,T,H,H,H,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='pollen_fairy'){
    const G='#ffd700',Gd='#ccaa00',Gl='#ffee66',W='#ffffcc',Wd='#eedd99',S1='#ffcc88',S1d='#dd9966',E='#333',Lf='#66cc44',Lfd='#449922',Fl='#ff6699',B='#885522';
    if(dir===0){
      grid=[
        [T, T, T, T, Fl,Lf,G, Gl,G, Lf,Fl,T, T, T, T, T],
        [T, T, T, Fl,Lf,Fl,Lf,Lf,Fl,Lf,Fl,T, T, T, T, T],
        [T, T, T, T, G, Gd,G, G, Gd,G, T, T, T, T, T, T],
        [T, T, T, G, G, Gl,G, G, Gl,G, G, T, T, T, T, T],
        [T, T, T, S1,S1,S1d,S1,S1,S1d,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, W, Wd,T, G, Gl,G, G, Gl,G, T, Wd,W, T, T, T],
        [W, Wd,W, T, G, G, Gd,Gd,G, G, T, W, Wd,W, T, T],
        [T, W, Wd,T, Gl,G, G, G, G, Gl,T, Wd,W, T, T, T],
        [T, T, W, T, G, Gd,G, G, Gd,G, T, W, T, T, T, T],
        [T, T, T, T, G, G, G, G, G, G, T, T, T, T, T, T],
        [T, T, T, T, G, G, G, G, G, G, T, T, T, T, T, T],
        [T, T, T, T, T, G, Gd,Gd,G, T, T, T, T, T, T, T],
        [T, T, T, T, T, Gd,G, G, Gd,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1d,T, T, S1d,S1,T, T, T, T, T, T],
        [T, T, T, T, B, B, T, T, B, B, T, T, T, T, T, T],
        [T, T, T, T, Lf,Lfd,T, T, Lfd,Lf,T, T, T, T, T, T],
        [T, T, T, T, Lf,Lf,T, T, Lf,Lf,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,Fl,Lf,G,Gl,G,Lf,Fl,T,T,T,T,T],[T,T,T,Fl,Lf,Fl,Lf,Lf,Fl,Lf,Fl,T,T,T,T,T],[T,T,T,T,G,Gd,G,G,Gd,G,T,T,T,T,T,T],[T,T,T,G,G,G,G,G,G,G,G,T,T,T,T,T],[T,T,T,G,G,G,G,G,G,G,G,T,T,T,T,T],[T,T,T,G,G,G,G,G,G,G,G,T,T,T,T,T],[T,T,T,G,G,G,G,G,G,G,G,T,T,T,T,T],[T,T,T,T,G,G,G,G,G,G,T,T,T,T,T,T],[T,W,Wd,T,G,G,G,G,G,G,T,Wd,W,T,T,T],[W,Wd,W,T,G,G,G,G,G,G,T,W,Wd,W,T,T],[T,W,Wd,T,G,G,G,G,G,G,T,Wd,W,T,T,T],[T,T,W,T,G,G,G,G,G,G,T,W,T,T,T,T],[T,T,T,T,G,G,G,G,G,G,T,T,T,T,T,T],[T,T,T,T,G,G,G,G,G,G,T,T,T,T,T,T],[T,T,T,T,T,G,Gd,Gd,G,T,T,T,T,T,T,T],[T,T,T,T,T,Gd,G,G,Gd,T,T,T,T,T,T,T],[T,T,T,T,S1,S1d,T,T,S1d,S1,T,T,T,T,T,T],[T,T,T,T,B,B,T,T,B,B,T,T,T,T,T,T],[T,T,T,T,Lf,Lfd,T,T,Lfd,Lf,T,T,T,T,T,T],[T,T,T,T,Lf,Lf,T,T,Lf,Lf,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='spring_bunny'){
    const W='#fff',Wd='#eee',Wl='#ffe0e8',P='#ffb6c1',Pd='#ff8da1',S1='#ffcc99',S1d='#dd9977',E='#333',N='#ff6699',Bs='#8b6914',Bsl='#a0801a',Bt='#884422';
    if(dir===0){
      grid=[
        [T, T, T, W, Wd,T, T, T, T, Wd,W, T, T, T, T, T],
        [T, T, T, W, Wl,T, T, T, T, Wl,W, T, T, T, T, T],
        [T, T, T, W, Wl,T, T, T, T, Wl,W, T, T, T, T, T],
        [T, T, T, W, W, W, W, W, W, W, W, T, T, T, T, T],
        [T, T, T, S1,S1l,S1,S1,S1,S1l,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,N, N, S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, W, Wl,W, W, W, Wl,W, T, T, T, T, T, T],
        [T, T, W, Wl,P, W, W, W, P, Wl,W, T, T, T, T, T],
        [T, T, W, W, P, Pd,P, Pd,P, W, W, T, T, T, T, T],
        [T, T, W, Wl,W, W, W, W, W, Wl,W, T, T, T, T, T],
        [T, T, T, W, W, W, W, W, W, W, T, T, T, T, T, T],
        [T, T, T, W, Wl,W, W, W, Wl,W, T, Bs,Bsl,T, T, T],
        [T, T, T, T, W, P, T, P, W, T, T, Bs,Bsl,Bs,T, T],
        [T, T, T, T, W, W, T, W, W, T, T, T, Bs,T, T, T],
        [T, T, T, T, W, Wd,T, Wd,W, T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, P, P, P, T, P, P, P, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,W,Wd,T,T,T,T,Wd,W,T,T,T,T,T],[T,T,T,W,Wl,T,T,T,T,Wl,W,T,T,T,T,T],[T,T,T,W,Wl,T,T,T,T,Wl,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,T,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,T,W,W,T,W,W,T,T,T,T,T,T,T],[T,T,T,T,W,W,T,W,W,T,T,T,T,T,T,T],[T,T,T,T,W,Wd,T,Wd,W,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,P,P,P,T,P,P,P,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='beach_king'){
    const Ha='#ff6600',Had='#cc4400',Hal='#ff8844',Sg='#222',Sgl='#666',S1='#dd9966',S1d='#bb7744',S1l='#ffbb88',H='#553311',E='#222',Sh='#2288cc',Shd='#1166aa',B='#ffcc44',Bd='#ddaa22',Bt='#884422',Sf='#00aacc',Sfd='#008899';
    if(dir===0){
      grid=[
        [T, T, T, T, H, H, H, H, H, H, T, T, T, T, T, T],
        [T, T, T, H, H, H, H, H, H, H, H, T, T, T, T, T],
        [T, T, T, H, H, H, H, H, H, H, H, T, T, T, T, T],
        [T, T, T, S1,S1l,S1,S1,S1,S1l,S1,S1,T, T, T, T, T],
        [T, T, T, Sg,Sgl,S1,S1,S1,Sg,Sgl,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, Ha,Hal,Ha,Ha,Ha,Ha,Ha,Ha,Hal,Ha,T, T, T, T],
        [T, Ha,Hal,Ha,Had,B, Ha,Ha,B, Had,Ha,Hal,Ha,T, T, T],
        [T, Ha,Ha,Had,Ha,B, Bd,Bd,B, Ha,Had,Ha,Ha,T, T, T],
        [T, Ha,Hal,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Hal,Ha,T, T, T],
        [T, T, Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,T, T, T, T],
        [T, T, T, Sh,Shd,Sh,Sh,Sh,Shd,Sh,T, T, T, T, T, T],
        [T, T, T, Sh,Sh,Shd,Sh,Shd,Sh,Sh,T, T, T, T, T, T],
        [T, T, T, T, S1,S1d,T, S1d,S1,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1,T, S1,S1,T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, B, Bd,B, T, B, Bd,B, T, T, T, T, T, T],
        [T, T, T, B, B, B, T, B, B, B, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,H,H,H,H,H,H,T,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,Ha,Hal,Ha,Ha,Ha,Ha,Ha,Ha,Hal,Ha,T,Sf,T,T],[T,Ha,Hal,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Hal,Ha,Sf,Sfd,T],[T,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Sf,T,T],[T,Ha,Hal,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Hal,Ha,Sf,Sfd,T],[T,T,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,Ha,T,Sf,T,T],[T,T,T,Sh,Sh,Sh,Sh,Sh,Sh,Sh,T,T,T,T,T,T],[T,T,T,Sh,Sh,Sh,Sh,Sh,Sh,Sh,T,T,T,T,T,T],[T,T,T,T,S1,S1,T,S1,S1,T,T,T,T,T,T,T],[T,T,T,T,S1,S1,T,S1,S1,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,B,Bd,B,T,B,Bd,B,T,T,T,T,T,T],[T,T,T,B,B,B,T,B,B,B,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='lifeguard'){
    const R='#cc0000',Rd='#990000',Rl='#ff3333',W='#fff',S1='#dd9966',S1d='#bb7744',S1l='#ffbb88',H='#aa6633',E='#222',Wh='#ccc',F='#ff6600',Fd='#cc4400',Bt='#884422';
    if(dir===0){
      grid=[
        [T, T, T, T, H, H, H, H, H, H, T, T, T, T, T, T],
        [T, T, T, H, H, H, H, H, H, H, H, T, T, T, T, T],
        [T, T, T, H, H, H, H, H, H, H, H, T, T, T, T, T],
        [T, T, T, S1,S1l,S1,S1,S1,S1l,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1l,S1,S1l,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,Wh,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, R, Rl,R, R, W, W, R, R, Rl,R, T, T, T, T],
        [T, R, Rl,R, Rd,R, W, W, R, Rd,R, Rl,R, T, T, T],
        [T, R, R, Rd,R, R, R, R, R, R, Rd,R, R, T, T, T],
        [T, R, Rl,R, R, R, R, R, R, R, R, Rl,R, T, T, T],
        [T, T, R, R, R, R, R, R, R, R, R, R, T, T, T, T],
        [T, T, T, R, R, R, R, R, R, R, T, F, Fd,F, T, T],
        [T, T, T, T, S1,S1d,T, S1d,S1,T, F, W, W, F, T, T],
        [T, T, T, T, S1,S1,T, S1,S1,T, T, F, F, T, T, T],
        [T, T, T, T, S1,S1d,T, S1d,S1,T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, R, R, R, T, R, R, R, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,H,H,H,H,H,H,T,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,R,Rl,R,R,R,R,R,R,Rl,R,T,T,T,T],[T,R,Rl,R,R,R,R,R,R,R,R,Rl,R,T,T,T],[T,R,R,R,R,R,R,R,R,R,R,R,R,T,T,T],[T,R,Rl,R,R,R,R,R,R,R,R,Rl,R,T,T,T],[T,T,R,R,R,R,R,R,R,R,R,R,T,T,T,T],[T,T,T,R,R,R,R,R,R,R,T,T,T,T,T,T],[T,T,T,T,S1,S1,T,S1,S1,T,T,T,T,T,T,T],[T,T,T,T,S1,S1,T,S1,S1,T,T,T,T,T,T,T],[T,T,T,T,S1,S1,T,S1,S1,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,R,R,R,T,R,R,R,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='sun_spirit'){
    const F1='#ffdd00',F2='#ff8800',F3='#ff4400',F4='#ffaa22',Fl='#ffee66',W='#fff',E='#ff0000',Ed='#cc0000',B='#ffcc00',Bd='#ddaa00';
    if(dir===0){
      grid=[
        [T, T, T, F3,F2,F1,Fl,Fl,F1,F2,F3,T, T, T, T, T],
        [T, T, F3,F2,F1,Fl,W, W, Fl,F1,F2,F3,T, T, T, T],
        [T, F3,F2,F1,Fl,F1,Fl,Fl,F1,Fl,F1,F2,F3,T, T, T],
        [T, T, F2,F1,F4,F1,F1,F1,F1,F4,F1,F2,T, T, T, T],
        [T, T, T, F1,F4,F1,F1,F1,F1,F4,F1,T, T, T, T, T],
        [T, T, T, F1,E, Ed,F1,F1,E, Ed,F1,T, T, T, T, T],
        [T, T, T, F1,F1,F1,F4,F4,F1,F1,F1,T, T, T, T, T],
        [T, T, T, T, F1,F1,E, F1,F1,F1,T, T, T, T, T, T],
        [T, T, F2,F1,F4,Fl,F1,F1,Fl,F4,F1,F2,T, T, T, T],
        [T, F2,F1,Fl,F1,F1,F4,F4,F1,F1,Fl,F1,F2,T, T, T],
        [T, F2,F1,F1,F2,F1,F1,F1,F1,F2,F1,F1,F2,T, T, T],
        [T, T, F2,F1,F1,Fl,F1,F1,Fl,F1,F1,F2,T, T, T, T],
        [T, T, T, F2,F1,F1,F1,F1,F1,F1,F2,T, T, T, T, T],
        [T, T, T, T, F2,F1,F4,F4,F1,F2,T, T, T, T, T, T],
        [T, T, T, T, F2,F1,F1,F1,F1,F2,T, T, T, T, T, T],
        [T, T, T, T, T, F2,F1,F1,F2,T, T, T, T, T, T, T],
        [T, T, T, T, F2,F1,T, F1,F2,T, T, T, T, T, T, T],
        [T, T, T, T, F3,F2,T, F2,F3,T, T, T, T, T, T, T],
        [T, T, T, F3,F2,F1,T, F1,F2,F3,T, T, T, T, T, T],
        [T, T, T, F3,F2,F1,T, F1,F2,F3,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,F3,F2,F1,Fl,Fl,F1,F2,F3,T,T,T,T,T],[T,T,F3,F2,F1,Fl,W,W,Fl,F1,F2,F3,T,T,T,T],[T,F3,F2,F1,Fl,F1,Fl,Fl,F1,Fl,F1,F2,F3,T,T,T],[T,T,F2,F1,F1,F1,F1,F1,F1,F1,F1,F2,T,T,T,T],[T,T,T,F1,F1,F1,F1,F1,F1,F1,F1,T,T,T,T,T],[T,T,T,F1,F1,F1,F1,F1,F1,F1,F1,T,T,T,T,T],[T,T,T,F1,F1,F1,F1,F1,F1,F1,F1,T,T,T,T,T],[T,T,T,T,F1,F1,F1,F1,F1,F1,T,T,T,T,T,T],[T,T,F2,F1,F1,F1,F1,F1,F1,F1,F1,F2,T,T,T,T],[T,F2,F1,F1,F1,F1,F1,F1,F1,F1,F1,F1,F2,T,T,T],[T,F2,F1,F1,F1,F1,F1,F1,F1,F1,F1,F1,F2,T,T,T],[T,T,F2,F1,F1,F1,F1,F1,F1,F1,F1,F2,T,T,T,T],[T,T,T,F2,F1,F1,F1,F1,F1,F1,F2,T,T,T,T,T],[T,T,T,T,F2,F1,F1,F1,F1,F2,T,T,T,T,T,T],[T,T,T,T,F2,F1,F1,F1,F1,F2,T,T,T,T,T,T],[T,T,T,T,T,F2,F1,F1,F2,T,T,T,T,T,T,T],[T,T,T,T,F2,F1,T,F1,F2,T,T,T,T,T,T,T],[T,T,T,T,F3,F2,T,F2,F3,T,T,T,T,T,T,T],[T,T,T,F3,F2,F1,T,F1,F2,F3,T,T,T,T,T,T],[T,T,T,F3,F2,F1,T,F1,F2,F3,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='pumpkin_knight'){
    const P='#ff6600',Pd='#cc4400',Pl='#ff8833',Pg='#44aa22',V='#336622',Vd='#224411',A='#556644',Ad='#445533',E='#ffcc00',Ed='#ffaa00',M='#222',Bt='#553311';
    if(dir===0){
      grid=[
        [T, T, T, Pg,P, Pl,P, P, Pl,P, Pg,T, T, T, T, T],
        [T, T, Pg,P, Pl,P, Pg,Pg,P, Pl,P, Pg,T, T, T, T],
        [T, T, P, Pd,P, P, P, P, P, P, Pd,P, T, T, T, T],
        [T, T, P, E, Ed,P, P, P, E, Ed,P, P, T, T, T, T],
        [T, T, P, P, P, P, P, P, P, P, P, P, T, T, T, T],
        [T, T, Pd,P, M, M, M, M, M, M, P, Pd,T, T, T, T],
        [T, T, T, Pd,P, P, Pd,Pd,P, P, Pd,T, T, T, T, T],
        [T, T, T, T, Pd,P, P, P, P, Pd,T, T, T, T, T, T],
        [T, T, V, Vd,A, Ad,A, A, Ad,A, Vd,V, T, T, T, T],
        [T, V, Vd,A, Ad,V, A, A, V, Ad,A, Vd,V, T, T, T],
        [T, V, A, Ad,A, A, V, V, A, A, Ad,A, V, T, T, T],
        [T, V, Vd,A, A, A, A, A, A, A, A, Vd,V, T, T, T],
        [T, T, V, A, Ad,A, A, A, A, Ad,A, V, T, T, T, T],
        [T, T, T, V, A, A, V, V, A, A, V, T, T, T, T, T],
        [T, T, T, V, Vd,V, V, V, Vd,V, T, T, T, T, T, T],
        [T, T, T, T, A, Ad,T, Ad,A, T, T, T, T, T, T, T],
        [T, T, T, T, A, A, T, A, A, T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, V, Vd,V, T, V, Vd,V, T, T, T, T, T, T],
        [T, T, T, V, V, V, T, V, V, V, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,Pg,P,Pl,P,P,Pl,P,Pg,T,T,T,T,T],[T,T,Pg,P,Pl,P,Pg,Pg,P,Pl,P,Pg,T,T,T,T],[T,T,P,Pd,P,P,P,P,P,P,Pd,P,T,T,T,T],[T,T,P,P,P,P,P,P,P,P,P,P,T,T,T,T],[T,T,P,P,P,P,P,P,P,P,P,P,T,T,T,T],[T,T,Pd,P,P,P,P,P,P,P,P,Pd,T,T,T,T],[T,T,T,Pd,P,P,P,P,P,P,Pd,T,T,T,T,T],[T,T,T,T,Pd,P,P,P,P,Pd,T,T,T,T,T,T],[T,T,V,Vd,A,A,A,A,A,A,Vd,V,T,T,T,T],[T,V,Vd,A,A,A,A,A,A,A,A,Vd,V,T,T,T],[T,V,A,A,A,A,A,A,A,A,A,A,V,T,T,T],[T,V,Vd,A,A,A,A,A,A,A,A,Vd,V,T,T,T],[T,T,V,A,A,A,A,A,A,A,A,V,T,T,T,T],[T,T,T,V,A,A,A,A,A,A,V,T,T,T,T,T],[T,T,T,V,Vd,V,V,V,Vd,V,T,T,T,T,T,T],[T,T,T,T,A,Ad,T,Ad,A,T,T,T,T,T,T,T],[T,T,T,T,A,A,T,A,A,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,V,Vd,V,T,V,Vd,V,T,T,T,T,T,T],[T,T,T,V,V,V,T,V,V,V,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='harvest_witch'){
    const Ht='#4a2800',Htd='#3a1800',Htl='#5a3800',O='#cc6600',Od='#aa4400',Ol='#dd8822',S1='#ddbb88',S1d='#bb9966',E='#333',R='#cc3300',Br='#663300',Brd='#552200',Brl='#774411',Bt='#553311';
    if(dir===0){
      grid=[
        [T, T, T, Ht,Htl,Ht,Ht,Ht,Htl,Ht,T, T, T, T, T, T],
        [T, T, Ht,Htd,Ht,Htl,Ht,Htl,Ht,Htd,Ht,T, T, T, T, T],
        [T, Ht,Htd,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Htd,Ht,T, T, T, T],
        [T, T, T, Ht,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,R, R, S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, O, Ol,O, O, O, O, O, O, Ol,O, T, Br,T, T],
        [T, O, Ol,O, Od,O, O, O, O, Od,O, Ol,O, Br,T, T],
        [T, O, O, Od,O, O, Od,Od,O, O, Od,O, O, Br,T, T],
        [T, O, Ol,O, O, O, O, O, O, O, O, Ol,O, Brl,T, T],
        [T, T, O, O, O, O, O, O, O, O, O, O, T, Brd,T, T],
        [T, T, T, O, Od,O, O, O, Od,O, T, T, T, Br,T, T],
        [T, T, T, T, O, Od,O, Od,O, T, T, T, T, Brl,T, T],
        [T, T, T, T, O, O, T, O, O, T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, Br,Brd,Br,T, Br,Brd,Br,T, T, T, T, T, T],
        [T, T, T, Br,Br,Br,T, Br,Br,Br,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,Ht,Htl,Ht,Ht,Ht,Htl,Ht,T,T,T,T,T,T],[T,T,Ht,Htd,Ht,Htl,Ht,Htl,Ht,Htd,Ht,T,T,T,T,T],[T,Ht,Htd,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Htd,Ht,T,T,T,T],[T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T],[T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T],[T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T],[T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T],[T,T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T,T],[T,T,O,Ol,O,O,O,O,O,O,Ol,O,T,T,T,T],[T,O,Ol,O,O,O,O,O,O,O,O,Ol,O,T,T,T],[T,O,O,O,O,O,O,O,O,O,O,O,O,T,T,T],[T,O,Ol,O,O,O,O,O,O,O,O,Ol,O,T,T,T],[T,T,O,O,O,O,O,O,O,O,O,O,T,T,T,T],[T,T,T,O,O,O,O,O,O,O,T,T,T,T,T,T],[T,T,T,T,O,O,O,O,O,T,T,T,T,T,T,T],[T,T,T,T,O,O,T,O,O,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,Br,Brd,Br,T,Br,Brd,Br,T,T,T,T,T,T],[T,T,T,Br,Br,Br,T,Br,Br,Br,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='scarecrow'){
    const St='#daa520',Std='#b8860b',Stl='#eebb33',Cl='#8b7355',Cld='#6b5335',Cll='#ab9375',Ht='#c4a35a',Htd='#a4834a',S1='#ddbb88',E='#222',Pt='#556b2f',Bt='#884422';
    if(dir===0){
      grid=[
        [T, T, T, Ht,Htd,Ht,Ht,Ht,Htd,Ht,T, T, T, T, T, T],
        [T, T, Ht,Htd,Ht,Ht,Ht,Ht,Ht,Htd,Ht,T, T, T, T, T],
        [T, T, T, Ht,Ht,Ht,Ht,Ht,Ht,Ht,T, T, T, T, T, T],
        [T, T, T, St,Stl,St,St,St,Stl,St,T, T, T, T, T, T],
        [T, T, T, St,E, St,St,St,E, St,St,T, T, T, T, T],
        [T, T, T, St,St,St,Std,Std,St,St,St,T, T, T, T, T],
        [T, T, St,St,St,St,St,St,St,St,St,St,T, T, T, T],
        [T, T, T, T, St,St,St,St,St,St,T, T, T, T, T, T],
        [T, Stl,Cl,Cll,Cl,Cl,Cl,Cl,Cl,Cl,Cll,Cl,Stl,T, T, T],
        [T, T, Cl,Cll,Cld,Cl,Cl,Cl,Cl,Cld,Cll,Cl,T, T, T, T],
        [T, T, Cl,Cl,Cld,Cl,Cl,Cl,Cl,Cld,Cl,Cl,T, T, T, T],
        [T, T, Cl,Cll,Cl,Cl,Cl,Cl,Cl,Cl,Cll,Cl,T, T, T, T],
        [T, T, T, Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T, T, T, T, T],
        [T, T, T, Cl,Cld,Cl,Cl,Cl,Cld,Cl,T, T, T, T, T, T],
        [T, T, T, Pt,Pt,Cl,Cl,Cl,Pt,Pt,T, T, T, T, T, T],
        [T, T, T, T, Pt,Cl,T, Cl,Pt,T, T, T, T, T, T, T],
        [T, T, T, T, Stl,Pt,T, Pt,Stl,T, T, T, T, T, T, T],
        [T, T, T, T, Bt,Bt,T, Bt,Bt,T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, St,Std,St,T, St,Std,St,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,Ht,Htd,Ht,Ht,Ht,Htd,Ht,T,T,T,T,T,T],[T,T,Ht,Htd,Ht,Ht,Ht,Ht,Ht,Htd,Ht,T,T,T,T,T],[T,T,T,Ht,Ht,Ht,Ht,Ht,Ht,Ht,T,T,T,T,T,T],[T,T,T,St,St,St,St,St,St,St,T,T,T,T,T,T],[T,T,T,St,St,St,St,St,St,St,St,T,T,T,T,T],[T,T,T,St,St,St,St,St,St,St,St,T,T,T,T,T],[T,T,St,St,St,St,St,St,St,St,St,St,T,T,T,T],[T,T,T,T,St,St,St,St,St,St,T,T,T,T,T,T],[T,Stl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Stl,T,T,T],[T,T,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T,T,T,T],[T,T,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T,T,T,T],[T,T,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T,T,T,T],[T,T,T,Cl,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T,T,T,T,T],[T,T,T,Cl,Cl,Cl,Cl,Cl,Cl,Cl,T,T,T,T,T,T],[T,T,T,Pt,Pt,Cl,Cl,Cl,Pt,Pt,T,T,T,T,T,T],[T,T,T,T,Pt,Cl,T,Cl,Pt,T,T,T,T,T,T,T],[T,T,T,T,Stl,Pt,T,Pt,Stl,T,T,T,T,T,T,T],[T,T,T,T,Bt,Bt,T,Bt,Bt,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,St,Std,St,T,St,Std,St,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='ice_queen'){
    const I='#87ceeb',Id='#5f9ea0',Il='#b0e0e6',C='#e0ffff',Cl2='#f0ffff',W='#fff',Cr='#aaddff',Crd='#88bbdd',S1='#ddeeff',S1d='#bbccdd',E='#334455',Lp='#6688aa',D='#99ccee',Dd='#77aacc',Dl='#bbddee';
    if(dir===0){
      grid=[
        [T, T, T, T, Cr,Crd,W, W, Crd,Cr,T, T, T, T, T, T],
        [T, T, T, Cr,W, Cr,W, W, Cr,W, Cr,T, T, T, T, T],
        [T, T, T, C, Il,I, I, I, Il,I, C, T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,S1,T, T, T, T, T],
        [T, T, T, S1,E, S1d,S1,S1d,E, S1,S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,Lp,Lp,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, D, Dl,D, D, Dd,Dd,D, D, Dl,D, T, T, T, T],
        [T, D, Dl,D, Dd,D, D, D, D, Dd,D, Dl,D, T, T, T],
        [T, D, D, Dd,D, Il,D, D, Il,D, Dd,D, D, T, T, T],
        [T, D, Dl,D, D, D, D, D, D, D, D, Dl,D, T, T, T],
        [T, T, D, D, D, D, D, D, D, D, D, D, T, T, T, T],
        [T, T, D, Dl,D, D, Dd,Dd,D, D, Dl,D, T, T, T, T],
        [T, T, T, D, Dl,D, D, D, D, Dl,D, T, T, T, T, T],
        [T, T, T, D, D, Dl,D, D, Dl,D, D, T, T, T, T, T],
        [T, T, T, T, D, D, D, D, D, D, T, T, T, T, T, T],
        [T, T, T, T, Il,I, T, I, Il,T, T, T, T, T, T, T],
        [T, T, T, I, Il,I, T, I, Il,I, T, T, T, T, T, T],
        [T, T, T, I, I, I, T, I, I, I, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,Cr,Crd,W,W,Crd,Cr,T,T,T,T,T,T],[T,T,T,Cr,W,Cr,W,W,Cr,W,Cr,T,T,T,T,T],[T,T,T,C,Il,I,I,I,Il,I,C,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,S1,S1,S1,S1,S1,S1,S1,S1,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,T,T,S1,S1,S1,S1,S1,S1,T,T,T,T,T,T],[T,T,D,Dl,D,D,D,D,D,D,Dl,D,T,T,T,T],[T,D,Dl,D,D,D,D,D,D,D,D,Dl,D,T,T,T],[T,D,D,D,D,D,D,D,D,D,D,D,D,T,T,T],[T,D,Dl,D,D,D,D,D,D,D,D,Dl,D,T,T,T],[T,T,D,D,D,D,D,D,D,D,D,D,T,T,T,T],[T,T,D,D,D,D,D,D,D,D,D,D,T,T,T,T],[T,T,T,D,D,D,D,D,D,D,D,T,T,T,T,T],[T,T,T,D,D,D,D,D,D,D,D,T,T,T,T,T],[T,T,T,T,D,D,D,D,D,D,T,T,T,T,T,T],[T,T,T,T,Il,I,T,I,Il,T,T,T,T,T,T,T],[T,T,T,I,Il,I,T,I,Il,I,T,T,T,T,T,T],[T,T,T,I,I,I,T,I,I,I,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='snowdrift'){
    const W='#fff',Wd='#e8e8e8',Wl='#f8f8ff',Ht='#222',Htl='#444',Htd='#111',C='#ff6600',Cd='#cc4400',E='#111',B='#333',Bd='#222',Sc='#cc0000',Btn='#444';
    if(dir===0){
      grid=[
        [T, T, T, T, Ht,Htl,Ht,Ht,Htl,Ht,T, T, T, T, T, T],
        [T, T, T, Ht,Htd,Ht,Ht,Ht,Ht,Htd,Ht,T, T, T, T, T],
        [T, T, Ht,Htd,Ht,Htl,Ht,Htl,Ht,Htd,Ht,Ht,T, T, T, T],
        [T, T, T, W, Wl,W, W, W, Wl,W, T, T, T, T, T, T],
        [T, T, T, W, E, Wd,W, Wd,E, W, T, T, T, T, T, T],
        [T, T, T, W, W, W, C, Cd,W, W, T, T, T, T, T, T],
        [T, T, T, W, W, W, C, W, W, W, T, T, T, T, T, T],
        [T, T, T, T, W, B, B, B, B, T, T, T, T, T, T, T],
        [T, T, W, Wl,W, W, W, W, W, W, Wl,W, T, T, T, T],
        [T, W, Wl,W, Wd,W, Btn,W, W, Wd,W, Wl,W, T, T, T],
        [T, W, W, Wd,W, W, W, W, W, W, Wd,W, W, T, T, T],
        [T, W, Wl,W, W, W, Btn,W, W, W, W, Wl,W, T, T, T],
        [T, T, W, W, W, W, W, W, W, W, W, W, T, T, T, T],
        [T, T, T, W, W, W, Btn,W, W, W, T, T, T, T, T, T],
        [T, T, W, Wl,W, Wd,W, Wd,W, Wl,W, T, T, T, T, T],
        [T, W, Wl,W, W, W, W, W, W, W, Wl,W, T, T, T, T],
        [T, W, W, Wd,W, W, W, W, W, Wd,W, W, T, T, T, T],
        [T, W, Wl,W, W, W, W, W, W, W, Wl,W, T, T, T, T],
        [T, T, W, W, W, W, W, W, W, W, W, T, T, T, T, T],
        [T, T, T, W, Wd,W, W, W, Wd,W, T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,Ht,Htl,Ht,Ht,Htl,Ht,T,T,T,T,T,T],[T,T,T,Ht,Htd,Ht,Ht,Ht,Ht,Htd,Ht,T,T,T,T,T],[T,T,Ht,Htd,Ht,Htl,Ht,Htl,Ht,Htd,Ht,Ht,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,T,T,W,W,W,W,W,T,T,T,T,T,T,T],[T,T,W,Wl,W,W,W,W,W,W,Wl,W,T,T,T,T],[T,W,Wl,W,W,W,W,W,W,W,W,Wl,W,T,T,T],[T,W,W,W,W,W,W,W,W,W,W,W,W,T,T,T],[T,W,Wl,W,W,W,W,W,W,W,W,Wl,W,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,W,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,W,W,W,W,W,W,W,W,W,W,W,T,T,T,T],[T,W,W,W,W,W,W,W,W,W,W,W,T,T,T,T],[T,W,W,W,W,W,W,W,W,W,W,W,T,T,T,T],[T,T,W,W,W,W,W,W,W,W,W,T,T,T,T,T],[T,T,T,W,W,W,W,W,W,W,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='cozy_fireplace'){
    const Br='#8b4513',Brd='#6b3010',Brl='#a05520',F1='#ff4400',F2='#ff8800',F3='#ffcc00',Fl='#ffee66',S='#555',Sd='#333',Sl='#777',R='#cc3300',Rd='#aa2200',Bt='#663300';
    if(dir===0){
      grid=[
        [T, T, T, T, F3,Fl,F2,F1,Fl,F3,T, T, T, T, T, T],
        [T, T, T, F1,F2,F3,Fl,F3,F2,F1,T, T, T, T, T, T],
        [T, T, T, F2,F3,Fl,F3,Fl,F3,F2,T, T, T, T, T, T],
        [T, T, T, S, Sd,S, S, S, Sd,S, T, T, T, T, T, T],
        [T, T, Br,Brl,Br,Br,Br,Br,Br,Br,Brl,Br,T, T, T, T],
        [T, T, Br,Brd,Br,R, Rd,Rd,R, Br,Brd,Br,T, T, T, T],
        [T, T, Br,Br,R, F1,F2,F2,F1,R, Br,Br,T, T, T, T],
        [T, T, Br,Br,R, F2,F3,F3,F2,R, Br,Br,T, T, T, T],
        [T, T, Br,Brd,R, F1,F2,F1,F1,R, Brd,Br,T, T, T, T],
        [T, T, Br,Br,R, F2,Fl,F3,F2,R, Br,Br,T, T, T, T],
        [T, T, Br,Brl,R, F1,F2,F1,F1,R, Brl,Br,T, T, T, T],
        [T, T, Br,Br,R, Rd,R, R, Rd,R, Br,Br,T, T, T, T],
        [T, T, Br,Brd,Br,Br,Br,Br,Br,Br,Brd,Br,T, T, T, T],
        [T, T, Br,Brl,Br,Br,Br,Br,Br,Br,Brl,Br,T, T, T, T],
        [T, T, T, Br,Br,Brd,Br,Brd,Br,Br,T, T, T, T, T, T],
        [T, T, T, T, Br,Brd,T, Brd,Br,T, T, T, T, T, T, T],
        [T, T, T, T, S, Sd,T, Sd,S, T, T, T, T, T, T, T],
        [T, T, T, T, S, S, T, S, S, T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,S, T, S, Bt,Bt,T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,T,F3,Fl,F2,F1,Fl,F3,T,T,T,T,T,T],[T,T,T,F1,F2,F3,Fl,F3,F2,F1,T,T,T,T,T,T],[T,T,T,F2,F3,Fl,F3,Fl,F3,F2,T,T,T,T,T,T],[T,T,T,S,Sd,S,S,S,Sd,S,T,T,T,T,T,T],[T,T,Br,Brl,Br,Br,Br,Br,Br,Br,Brl,Br,T,T,T,T],[T,T,Br,Brd,Br,Br,Br,Br,Br,Br,Brd,Br,T,T,T,T],[T,T,Br,Br,Br,Br,Br,Br,Br,Br,Br,Br,T,T,T,T],[T,T,Br,Br,Br,Br,Br,Br,Br,Br,Br,Br,T,T,T,T],[T,T,Br,Brd,Br,Br,Br,Br,Br,Br,Brd,Br,T,T,T,T],[T,T,Br,Br,Br,Br,Br,Br,Br,Br,Br,Br,T,T,T,T],[T,T,Br,Brl,Br,Br,Br,Br,Br,Br,Brl,Br,T,T,T,T],[T,T,Br,Br,Br,Br,Br,Br,Br,Br,Br,Br,T,T,T,T],[T,T,Br,Brd,Br,Br,Br,Br,Br,Br,Brd,Br,T,T,T,T],[T,T,Br,Brl,Br,Br,Br,Br,Br,Br,Brl,Br,T,T,T,T],[T,T,T,Br,Br,Br,Br,Br,Br,Br,T,T,T,T,T,T],[T,T,T,T,Br,Brd,T,Brd,Br,T,T,T,T,T,T,T],[T,T,T,T,S,Sd,T,Sd,S,T,T,T,T,T,T,T],[T,T,T,T,S,S,T,S,S,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,S,T,S,Bt,Bt,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  // === SKIN STYLE VARIANTS (v23) ===
  else if(skinId==='shadow_blood'){
    const N='#8b0000',Nd='#550000',Nl='#bb2222',Hb='#ff0000',S1='#cc4444',S1d='#992222',E='#220000',B='#333',Bd='#222',Bt='#441111';
    if(dir===0){
      grid=[
        [T, T, T, N, Nl,N, N, N, Nl,N, T, T, T, T, T, T],
        [T, T, N, Nd,N, Nl,N, Nl,N, Nd,N, T, T, T, T, T],
        [T, T, N, Nd,N, N, N, N, N, Nd,N, T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,T, T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,T, T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, N, Nl,N, N, N, N, N, N, Nl,N, T, T, T, T],
        [T, N, Nl,N, Nd,N, N, N, N, Nd,N, Nl,N, T, T, T],
        [T, N, N, Nd,N, Hb,N, N, Hb,N, Nd,N, N, T, T, T],
        [T, N, Nl,N, N, N, N, N, N, N, N, Nl,N, T, T, T],
        [T, T, N, N, N, N, N, N, N, N, N, N, T, T, T, T],
        [T, T, T, N, Nd,N, N, N, Nd,N, T, T, T, T, T, T],
        [T, T, T, T, N, N, N, N, N, T, T, T, T, T, T, T],
        [T, T, T, T, N, Nd,T, Nd,N, T, T, T, T, T, T, T],
        [T, T, T, T, B, B, T, B, B, T, T, T, T, T, T, T],
        [T, T, T, T, B, Bd,T, Bd,B, T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,N,Nl,N,N,N,Nl,N,T,T,T,T,T,T],[T,T,N,Nd,N,Nl,N,Nl,N,Nd,N,T,T,T,T,T],[T,T,N,Nd,N,N,N,N,N,Nd,N,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,N,Nl,N,N,N,N,N,N,Nl,N,T,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,N,N,N,N,N,N,N,N,N,N,N,N,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,T,N,N,N,N,N,N,N,N,N,N,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,Nd,T,Nd,N,T,T,T,T,T,T,T],[T,T,T,T,B,B,T,B,B,T,T,T,T,T,T,T],[T,T,T,T,B,Bd,T,Bd,B,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='shadow_frost'){
    const N='#4fc3f7',Nd='#2196f3',Nl='#81d4fa',S1='#b3e5fc',S1d='#80d0f0',E='#1a237e',B='#455a64',Bd='#37474f',Bt='#263238';
    if(dir===0){
      grid=[
        [T, T, T, N, Nl,N, N, N, Nl,N, T, T, T, T, T, T],
        [T, T, N, Nd,N, Nl,N, Nl,N, Nd,N, T, T, T, T, T],
        [T, T, N, Nd,N, N, N, N, N, Nd,N, T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,T, T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,T, T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, N, Nl,N, N, N, N, N, N, Nl,N, T, T, T, T],
        [T, N, Nl,N, Nd,N, N, N, N, Nd,N, Nl,N, T, T, T],
        [T, N, N, Nd,N, Nl,N, N, Nl,N, Nd,N, N, T, T, T],
        [T, N, Nl,N, N, N, N, N, N, N, N, Nl,N, T, T, T],
        [T, T, N, N, N, N, N, N, N, N, N, N, T, T, T, T],
        [T, T, T, N, Nd,N, N, N, Nd,N, T, T, T, T, T, T],
        [T, T, T, T, N, N, N, N, N, T, T, T, T, T, T, T],
        [T, T, T, T, N, Nd,T, Nd,N, T, T, T, T, T, T, T],
        [T, T, T, T, B, B, T, B, B, T, T, T, T, T, T, T],
        [T, T, T, T, B, Bd,T, Bd,B, T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,N,Nl,N,N,N,Nl,N,T,T,T,T,T,T],[T,T,N,Nd,N,Nl,N,Nl,N,Nd,N,T,T,T,T,T],[T,T,N,Nd,N,N,N,N,N,Nd,N,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,N,Nl,N,N,N,N,N,N,Nl,N,T,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,N,N,N,N,N,N,N,N,N,N,N,N,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,T,N,N,N,N,N,N,N,N,N,N,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,Nd,T,Nd,N,T,T,T,T,T,T,T],[T,T,T,T,B,B,T,B,B,T,T,T,T,T,T,T],[T,T,T,T,B,Bd,T,Bd,B,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='shadow_void'){
    const N='#4a0080',Nd='#2d004d',Nl='#7b1fa2',S1='#9c27b0',S1d='#7b1fa2',E='#e040fb',B='#1a0033',Bd='#0d001a',Bt='#1a0033';
    if(dir===0){
      grid=[
        [T, T, T, N, Nl,N, N, N, Nl,N, T, T, T, T, T, T],
        [T, T, N, Nd,N, Nl,N, Nl,N, Nd,N, T, T, T, T, T],
        [T, T, N, Nd,N, N, N, N, N, Nd,N, T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,T, T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,T, T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, N, Nl,N, N, N, N, N, N, Nl,N, T, T, T, T],
        [T, N, Nl,N, Nd,N, N, N, N, Nd,N, Nl,N, T, T, T],
        [T, N, N, Nd,N, E, N, N, E, N, Nd,N, N, T, T, T],
        [T, N, Nl,N, N, N, N, N, N, N, N, Nl,N, T, T, T],
        [T, T, N, N, N, N, N, N, N, N, N, N, T, T, T, T],
        [T, T, T, N, Nd,N, N, N, Nd,N, T, T, T, T, T, T],
        [T, T, T, T, N, N, N, N, N, T, T, T, T, T, T, T],
        [T, T, T, T, N, Nd,T, Nd,N, T, T, T, T, T, T, T],
        [T, T, T, T, B, B, T, B, B, T, T, T, T, T, T, T],
        [T, T, T, T, B, Bd,T, Bd,B, T, T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,N,Nl,N,N,N,Nl,N,T,T,T,T,T,T],[T,T,N,Nd,N,Nl,N,Nl,N,Nd,N,T,T,T,T,T],[T,T,N,Nd,N,N,N,N,N,Nd,N,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,N,Nl,N,N,N,N,N,N,Nl,N,T,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,N,N,N,N,N,N,N,N,N,N,N,N,T,T,T],[T,N,Nl,N,N,N,N,N,N,N,N,Nl,N,T,T,T],[T,T,N,N,N,N,N,N,N,N,N,N,T,T,T,T],[T,T,T,N,N,N,N,N,N,N,T,T,T,T,T,T],[T,T,T,T,N,N,N,N,N,T,T,T,T,T,T,T],[T,T,T,T,N,Nd,T,Nd,N,T,T,T,T,T,T,T],[T,T,T,T,B,B,T,B,B,T,T,T,T,T,T,T],[T,T,T,T,B,Bd,T,Bd,B,T,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T],[T,T,T,Bt,Bt,Bt,T,Bt,Bt,Bt,T,T,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='saiyan_blue'){
    const H='#1e90ff',Hd='#0066cc',Hl='#4fc3f7',S1='#ffaa77',S1d='#dd8855',S1l='#ffcc99',G='#ff6600',Gd='#cc4400',Gl='#ff8844',U='#1a237e',Ud='#0d1257',Ul='#283593',B='#333',Bd='#222',E='#222',Bt='#884422',Btl='#996633';
    if(dir===0){
      grid=[
        [T, T, T, H, Hl,H, H, H, Hl,H, T, T, T, T, T, T],
        [T, T, H, H, Hl,H, H, H, Hl,H, H, T, T, T, T, T],
        [T, H, H, Hl,H, H, H, H, H, Hl,H, H, T, T, T, T],
        [T, H, H, H, H, H, H, H, H, H, H, H, T, T, T, T],
        [T, T, H, H, S1,S1l,S1,S1,S1l,S1,H, H, T, T, T, T],
        [T, T, H, S1,S1,S1d,S1,S1,S1d,S1,S1,H, T, T, T, T],
        [T, T, T, S1,E, '#4fc3f7',S1,S1,'#4fc3f7',E, S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, G, G, U, Ul,Ul,U, G, G, T, T, T, T, T],
        [T, T, G, G, Gl,U, U, U, U, Gl,G, G, T, T, T, T],
        [T, G, G, Gl,G, G, G, G, G, G, Gl,G, G, T, T, T],
        [T, G, G, G, Gd,G, G, G, G, Gd,G, G, G, T, T, T],
        [T, G, G, G, G, G, G, G, G, G, G, G, G, T, T, T],
        [T, T, G, G, G, G, G, G, G, G, G, G, T, T, T, T],
        [T, T, T, G, G, B, B, B, B, G, G, T, T, T, T, T],
        [T, T, T, T, B, B, B, T, B, B, B, T, T, T, T, T],
        [T, T, T, T, B, B, B, T, B, B, B, T, T, T, T, T],
        [T, T, T, Bt,Bt,Btl,Bt,T, Bt,Btl,Bt,Bt,T, T, T, T],
        [T, T, T, Bt,Bt,Bt,Bt,T, Bt,Bt,Bt,Bt,T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,H,Hl,H,H,H,Hl,H,T,T,T,T,T,T],[T,T,H,H,Hl,H,H,H,Hl,H,H,T,T,T,T,T],[T,H,H,Hl,H,H,H,H,H,Hl,H,H,T,T,T,T],[T,H,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,T,H,H,H,H,H,H,T,T,T,T,T,T],[T,T,T,G,G,U,U,U,U,G,G,T,T,T,T,T],[T,T,G,G,G,U,U,U,U,G,G,G,T,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,T,G,G,G,G,G,G,G,G,G,G,T,T,T,T],[T,T,T,G,G,B,B,B,B,G,G,T,T,T,T,T],[T,T,T,T,B,B,B,T,B,B,B,T,T,T,T,T],[T,T,T,T,B,B,B,T,B,B,B,T,T,T,T,T],[T,T,T,Bt,Bt,Btl,Bt,T,Bt,Btl,Bt,Bt,T,T,T,T],[T,T,T,Bt,Bt,Bt,Bt,T,Bt,Bt,Bt,Bt,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='saiyan_rose'){
    const H='#ff69b4',Hd='#cc4488',Hl='#ff99cc',S1='#ffaa77',S1d='#dd8855',S1l='#ffcc99',G='#111',Gd='#000',Gl='#222',U='#444',Ud='#333',Ul='#555',B='#333',Bd='#222',E='#222',Bt='#884422',Btl='#996633';
    if(dir===0){
      grid=[
        [T, T, T, H, Hl,H, H, H, Hl,H, T, T, T, T, T, T],
        [T, T, H, H, Hl,H, H, H, Hl,H, H, T, T, T, T, T],
        [T, H, H, Hl,H, H, H, H, H, Hl,H, H, T, T, T, T],
        [T, H, H, H, H, H, H, H, H, H, H, H, T, T, T, T],
        [T, T, H, H, S1,S1l,S1,S1,S1l,S1,H, H, T, T, T, T],
        [T, T, H, S1,S1,S1d,S1,S1,S1d,S1,S1,H, T, T, T, T],
        [T, T, T, S1,E, '#ff69b4',S1,S1,'#ff69b4',E, S1,T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,S1,T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,S1,T, T, T, T, T, T],
        [T, T, T, G, G, U, Ul,Ul,U, G, G, T, T, T, T, T],
        [T, T, G, G, Gl,U, U, U, U, Gl,G, G, T, T, T, T],
        [T, G, G, Gl,G, G, G, G, G, G, Gl,G, G, T, T, T],
        [T, G, G, G, Gd,G, G, G, G, Gd,G, G, G, T, T, T],
        [T, G, G, G, G, G, G, G, G, G, G, G, G, T, T, T],
        [T, T, G, G, G, G, G, G, G, G, G, G, T, T, T, T],
        [T, T, T, G, G, B, B, B, B, G, G, T, T, T, T, T],
        [T, T, T, T, B, B, B, T, B, B, B, T, T, T, T, T],
        [T, T, T, T, B, B, B, T, B, B, B, T, T, T, T, T],
        [T, T, T, Bt,Bt,Btl,Bt,T, Bt,Btl,Bt,Bt,T, T, T, T],
        [T, T, T, Bt,Bt,Bt,Bt,T, Bt,Bt,Bt,Bt,T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,H,Hl,H,H,H,Hl,H,T,T,T,T,T,T],[T,T,H,H,Hl,H,H,H,Hl,H,H,T,T,T,T,T],[T,H,H,Hl,H,H,H,H,H,Hl,H,H,T,T,T,T],[T,H,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,H,H,H,H,H,H,H,H,H,H,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,H,H,H,H,H,H,H,H,T,T,T,T,T],[T,T,T,T,H,H,H,H,H,H,T,T,T,T,T,T],[T,T,T,G,G,U,U,U,U,G,G,T,T,T,T,T],[T,T,G,G,G,U,U,U,U,G,G,G,T,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,G,G,G,G,G,G,G,G,G,G,G,G,T,T,T],[T,T,G,G,G,G,G,G,G,G,G,G,T,T,T,T],[T,T,T,G,G,B,B,B,B,G,G,T,T,T,T,T],[T,T,T,T,B,B,B,T,B,B,B,T,T,T,T,T],[T,T,T,T,B,B,B,T,B,B,B,T,T,T,T,T],[T,T,T,Bt,Bt,Btl,Bt,T,Bt,Btl,Bt,Bt,T,T,T,T],[T,T,T,Bt,Bt,Bt,Bt,T,Bt,Bt,Bt,Bt,T,T,T,T]];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }
  else if(skinId==='cyber_neon'){
    const M='#1a1a2e',Md='#0f0f1a',Ml='#2a2a3e',N='#ff1493',Nd='#cc0077',Nl='#ff66b2',S1='#ddbbcc',S1d='#bb99aa',E='#ff1493',V='#ff1493',B='#333',Bd='#222',Bt='#222';
    if(dir===0){
      grid=[
        [T, T, T, M, Ml,N, M, M, N, Ml,M, T, T, T, T, T],
        [T, T, M, Md,M, Ml,N, Ml,M, Md,M, T, T, T, T, T],
        [T, T, M, Md,M, M, M, M, M, Md,M, T, T, T, T, T],
        [T, T, T, S1,S1d,S1,S1,S1,S1d,S1,T, T, T, T, T, T],
        [T, T, T, S1,E, S1,S1,S1,E, S1,T, T, T, T, T, T],
        [T, T, T, S1,S1,S1,S1d,S1d,S1,S1,T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, T, T, S1,S1,S1,S1,S1,T, T, T, T, T, T, T],
        [T, T, M, Ml,M, N, M, M, N, M, Ml,M, T, T, T, T],
        [T, M, Ml,M, Md,N, Nl,Nl,N, Md,M, Ml,M, T, T, T],
        [T, M, M, Md,M, V, M, M, V, M, Md,M, M, T, T, T],
        [T, M, Ml,M, M, N, M, M, N, M, M, Ml,M, T, T, T],
        [T, T, M, M, M, M, N, N, M, M, M, M, T, T, T, T],
        [T, T, T, M, Md,M, M, M, Md,M, T, T, T, T, T, T],
        [T, T, T, T, M, M, M, M, M, T, T, T, T, T, T, T],
        [T, T, T, T, M, Md,T, Md,M, T, T, T, T, T, T, T],
        [T, T, T, T, B, N, T, N, B, T, T, T, T, T, T, T],
        [T, T, T, T, B, Bd,T, Bd,B, T, T, T, T, T, T, T],
        [T, T, T, Bt,N, Bt,T, Bt,N, Bt,T, T, T, T, T, T],
        [T, T, T, Bt,Bt,Bt,T, Bt,Bt,Bt,T, T, T, T, T, T],
      ];
    } else if(dir===3){grid=[[T,T,T,M,Ml,N,M,M,N,Ml,M,T,T,T,T,T],[T,T,M,Md,M,Ml,N,Ml,M,Md,M,T,T,T,T,T],[T,T,M,Md,M,M,M,M,M,Md,M,T,T,T,T,T],[T,T,T,M,M,M,M,M,M,M,T,T,T,T,T,T],[T,T,T,M,M,M,M,M,M,M,T,T,T,T,T,T],[T,T,T,M,M,M,M,M,M,M,T,T,T,T,T,T],[T,T,T,T,M,M,M,M,M,T,T,T,T,T,T,T],[T,T,T,T,M,M,M,M,M,T,T,T,T,T,T,T],[T,T,M,Ml,M,M,M,M,M,M,Ml,M,T,T,T,T],[T,M,Ml,M,M,M,M,M,M,M,M,Ml,M,T,T,T],[T,M,M,M,M,M,M,M,M,M,M,M,M,T,T,T],[T,M,Ml,M,M,M,M,M,M,M,M,Ml,M,T,T,T],[T,T,M,M,M,M,M,M,M,M,M,M,T,T,T,T],[T,T,T,M,M,M,M,M,M,M,T,T,T,T,T,T],[T,T,T,T,M,M,M,M,M,T,T,T,T,T,T,T],[T,T,T,T,M