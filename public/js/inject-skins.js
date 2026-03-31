const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// === 1. VISITOR_SKINS entries ===
const skinEntries = `
  // === Seasonal Limited-Edition Skins (v23) ===
  {id:'cherry_blossom',label:'Cherry Blossom',icon:'🌸',color:'#ff69b4',cost:800,desc:'Pink samurai with petal particles',rarity:'epic',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  {id:'pollen_fairy',label:'Pollen Fairy',icon:'🧚',color:'#ffd700',cost:400,desc:'Golden wings, flower crown',rarity:'rare',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  {id:'spring_bunny',label:'Spring Bunny',icon:'🐰',color:'#ffb6c1',cost:200,desc:'Cute bunny suit with basket',rarity:'common',hasSprite:true,seasonal:{season:'spring',months:[3,4,5]}},
  {id:'beach_king',label:'Beach King',icon:'🏄',color:'#ff8c00',cost:400,desc:'Hawaiian shirt, sunglasses, surfboard',rarity:'rare',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  {id:'lifeguard',label:'Lifeguard',icon:'🏊',color:'#cc0000',cost:800,desc:'Red swimsuit, whistle, rescue float',rarity:'epic',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  {id:'sun_spirit',label:'Sun Spirit',icon:'☀️',color:'#ffaa00',cost:2000,desc:'Living flame/sun entity',rarity:'legendary',hasSprite:true,seasonal:{season:'summer',months:[6,7,8]}},
  {id:'pumpkin_knight',label:'Pumpkin Knight',icon:'🎃',color:'#ff6600',cost:800,desc:'Carved pumpkin head, vine armor',rarity:'epic',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  {id:'harvest_witch',label:'Harvest Witch',icon:'🧹',color:'#8b4513',cost:400,desc:'Pointed hat, broomstick, autumn palette',rarity:'rare',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  {id:'scarecrow',label:'Scarecrow',icon:'🌾',color:'#daa520',cost:200,desc:'Tattered clothes, straw sticking out',rarity:'common',hasSprite:true,seasonal:{season:'autumn',months:[9,10,11]}},
  {id:'ice_queen',label:'Ice Queen',icon:'❄️',color:'#87ceeb',cost:2000,desc:'Crystal crown, ice blue flowing dress',rarity:'legendary',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  {id:'snowdrift',label:'Snowdrift',icon:'⛄',color:'#f0f8ff',cost:400,desc:'Living snowman with top hat',rarity:'rare',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  {id:'cozy_fireplace',label:'Cozy Fireplace',icon:'🔥',color:'#ff4500',cost:800,desc:'Walking fireplace with fire on head',rarity:'epic',hasSprite:true,seasonal:{season:'winter',months:[12,1,2]}},
  // === Skin Style Variants (v23) ===
  {id:'shadow_blood',label:'Shadow Blood',icon:'🩸',color:'#8b0000',cost:600,desc:'Blood-red Shadow variant',rarity:'epic',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'shadow_frost',label:'Shadow Frost',icon:'🧊',color:'#4fc3f7',cost:600,desc:'Ice-blue Shadow variant',rarity:'epic',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'shadow_void',label:'Shadow Void',icon:'🕳️',color:'#4a0080',cost:1500,desc:'Deep purple void Shadow',rarity:'legendary',hasSprite:true,variant_of:'shadow_ninja'},
  {id:'saiyan_blue',label:'Saiyan Blue',icon:'💙',color:'#1e90ff',cost:1500,desc:'Blue-haired Super Saiyan God',rarity:'legendary',hasSprite:true,variant_of:'super_saiyan'},
  {id:'saiyan_rose',label:'Saiyan Rosé',icon:'🌹',color:'#ff69b4',cost:1500,desc:'Pink-haired Saiyan Rosé',rarity:'legendary',hasSprite:true,variant_of:'super_saiyan'},
  {id:'cyber_neon',label:'Cyber Neon',icon:'💗',color:'#ff1493',cost:350,desc:'Hot pink Cyberpunk variant',rarity:'rare',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'cyber_toxic',label:'Cyber Toxic',icon:'☢️',color:'#39ff14',cost:350,desc:'Toxic green Cyberpunk variant',rarity:'rare',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'cyber_chrome',label:'Cyber Chrome',icon:'🪞',color:'#c0c0c0',cost:600,desc:'Silver chrome Cyberpunk variant',rarity:'epic',hasSprite:true,variant_of:'cyberpunk_runner'},
  {id:'robot_gold',label:'Robot Gold',icon:'🏆',color:'#ffd700',cost:600,desc:'Golden robot variant',rarity:'epic',hasSprite:true,variant_of:'robot'},
  {id:'ninja_crimson',label:'Ninja Crimson',icon:'🔴',color:'#dc143c',cost:350,desc:'Red ninja variant',rarity:'rare',hasSprite:true,variant_of:'ninja'},
  {id:'pirate_ghost',label:'Pirate Ghost',icon:'👻',color:'#b0c4de',cost:1500,desc:'Translucent ghost pirate',rarity:'legendary',hasSprite:true,variant_of:'pirate'},
  {id:'knight_dark',label:'Knight Dark',icon:'🖤',color:'#1a1a1a',cost:600,desc:'Black armor dark knight',rarity:'epic',hasSprite:true,variant_of:'knight-v'},`;

// Insert before ];
const vwAnchor = "{id:'void_walker',label:'Void Walker'";
const vwIdx = html.indexOf(vwAnchor);
const closeBracket = html.indexOf('];\n', vwIdx);
html = html.slice(0, closeBracket) + skinEntries + '\n' + html.slice(closeBracket);

// === 2. Sprite definitions — helper to make a grid function ===
// We'll create a helper that generates simple but valid 16x20 sprites
// Insert before "// Walk animation"

function mkRow(arr) {
  return '[' + arr.map(c => c === 0 ? 'T' : "'" + c + "'").join(',') + ']';
}

// Generate sprite code for all 24 skins
let spriteCode = `
  // === SEASONAL + VARIANT SKIN SPRITES (v23) ===`;

// Helper: create a simple front-facing humanoid sprite with given colors
function humanSprite(id, colors) {
  const {hair,hairD,hairL,skin,skinD,skinL,eye,top,topD,topL,bot,botD,botL,boot,bootD,accent,accentD} = colors;
  const T = 0;
  // Extra features
  const extra = colors.extra || {};
  
  let front = [
    [T,T,T,T,hair,hairL,hair,hair,hairL,hair,T,T,T,T,T,T],
    [T,T,T,hair,hairD,hair,hair,hair,hair,hairD,hair,T,T,T,T,T],
    [T,T,T,hair,hair,hairL,hair,hair,hairL,hair,hair,T,T,T,T,T],
    [T,T,T,skin,skinL,skin,skin,skin,skinL,skin,skin,T,T,T,T,T],
    [T,T,T,skin,eye,skinD,skin,skin,skinD,eye,skin,T,T,T,T,T],
    [T,T,T,skin,skin,skin,skinD,skinD,skin,skin,skin,T,T,T,T,T],
    [T,T,T,T,skin,skin,skin,skin,skin,skin,T,T,T,T,T,T],
    [T,T,T,T,skin,skin,skin,skin,skin,skin,T,T,T,T,T,T],
    [T,T,top,topL,top,top,accent||top,accent||top,top,top,topL,top,T,T,T,T],
    [T,top,topL,top,topD,top,top,top,top,topD,top,topL,top,T,T,T],
    [T,top,top,topD,top,accentD||topL,top,top,accentD||topL,top,topD,top,top,T,T,T],
    [T,top,topL,top,top,top,top,top,top,top,top,topL,top,T,T,T],
    [T,T,top,top,top,top,top,top,top,top,top,top,T,T,T,T],
    [T,T,T,bot,botD,bot,bot,bot,botD,bot,T,T,T,T,T,T],
    [T,T,T,T,bot,botD,bot,botD,bot,T,T,T,T,T,T,T],
    [T,T,T,T,bot,bot,T,bot,bot,T,T,T,T,T,T,T],
    [T,T,T,T,bot,botD,T,botD,bot,T,T,T,T,T,T,T],
    [T,T,T,T,boot,bootD,T,bootD,boot,T,T,T,T,T,T,T],
    [T,T,T,boot,boot,boot,T,boot,boot,boot,T,T,T,T,T,T],
    [T,T,T,boot,boot,boot,T,boot,boot,boot,T,T,T,T,T,T],
  ];
  return front;
}

function gridToCode(grid) {
  return grid.map(row => {
    return '        [' + row.map(c => c === 0 ? 'T' : ("'" + c + "'")).join(',') + ']';
  }).join(',\n');
}

function makeSkinBlock(id, colorDef, frontGrid, desc) {
  // Create back grid (simplified - just use same grid for all dirs)
  let backGrid = frontGrid.map(row => {
    // Replace eyes/face details with hair/hood for back view
    return [...row];
  });
  
  return `
  else if(skinId==='${id}'){
    // ${desc}
    const T=0;
    if(dir===0){
      grid=[
${gridToCode(frontGrid)}
      ];
    } else if(dir===3){
      grid=[
${gridToCode(frontGrid)}
      ];
      if(dir===2)grid=grid.map(r=>[...r].reverse());
    }
  }`;
}

// Define all 24 skins
const skinDefs = [
  // SEASONAL
  {id:'cherry_blossom', desc:'Cherry Blossom samurai', colors:{hair:'#222',hairD:'#111',hairL:'#333',skin:'#ffaa88',skinD:'#dd8866',skinL:'#ffcc99',eye:'#111',top:'#ff69b4',topD:'#cc5599',topL:'#ff99cc',bot:'#ff69b4',botD:'#cc5599',botL:'#ff99cc',boot:'#222',bootD:'#111',accent:'#fff',accentD:'#eee'}},
  {id:'pollen_fairy', desc:'Pollen Fairy with golden wings', colors:{hair:'#ffd700',hairD:'#ccaa00',hairL:'#ffee66',skin:'#ffcc88',skinD:'#dd9966',skinL:'#ffddaa',eye:'#333',top:'#ffd700',topD:'#ccaa00',topL:'#ffee66',bot:'#ffd700',botD:'#ccaa00',botL:'#ffee66',boot:'#66cc44',bootD:'#449922',accent:'#ff6699',accentD:'#cc4477'}},
  {id:'spring_bunny', desc:'Spring Bunny suit', colors:{hair:'#fff',hairD:'#eee',hairL:'#ffe0e8',skin:'#ffcc99',skinD:'#dd9977',skinL:'#ffddbb',eye:'#333',top:'#fff',topD:'#eee',topL:'#ffe0e8',bot:'#fff',botD:'#eee',botL:'#ffe0e8',boot:'#ffb6c1',bootD:'#ff8da1',accent:'#ffb6c1',accentD:'#ff8da1'}},
  {id:'beach_king', desc:'Beach King hawaiian', colors:{hair:'#553311',hairD:'#442200',hairL:'#664422',skin:'#dd9966',skinD:'#bb7744',skinL:'#ffbb88',eye:'#222',top:'#ff6600',topD:'#cc4400',topL:'#ff8844',bot:'#2288cc',botD:'#1166aa',botL:'#44aaee',boot:'#ffcc44',bootD:'#ddaa22',accent:'#ffcc44',accentD:'#ddaa22'}},
  {id:'lifeguard', desc:'Lifeguard rescue', colors:{hair:'#aa6633',hairD:'#885522',hairL:'#cc8844',skin:'#dd9966',skinD:'#bb7744',skinL:'#ffbb88',eye:'#222',top:'#cc0000',topD:'#990000',topL:'#ff3333',bot:'#cc0000',botD:'#990000',botL:'#ff3333',boot:'#cc0000',bootD:'#990000',accent:'#fff',accentD:'#eee'}},
  {id:'sun_spirit', desc:'Sun Spirit fire entity', colors:{hair:'#ff4400',hairD:'#cc2200',hairL:'#ff8800',skin:'#ffcc00',skinD:'#ddaa00',skinL:'#ffee66',eye:'#ff0000',top:'#ff8800',topD:'#cc6600',topL:'#ffaa33',bot:'#ff8800',botD:'#cc6600',botL:'#ffaa33',boot:'#ff4400',bootD:'#cc2200',accent:'#ffee66',accentD:'#ffcc00'}},
  {id:'pumpkin_knight', desc:'Pumpkin Knight', colors:{hair:'#44aa22',hairD:'#228800',hairL:'#66cc44',skin:'#ff6600',skinD:'#cc4400',skinL:'#ff8833',eye:'#ffcc00',top:'#556644',topD:'#445533',topL:'#667755',bot:'#556644',botD:'#445533',botL:'#667755',boot:'#336622',bootD:'#224411',accent:'#ff6600',accentD:'#cc4400'}},
  {id:'harvest_witch', desc:'Harvest Witch', colors:{hair:'#4a2800',hairD:'#3a1800',hairL:'#5a3800',skin:'#ddbb88',skinD:'#bb9966',skinL:'#eeccaa',eye:'#333',top:'#cc6600',topD:'#aa4400',topL:'#dd8822',bot:'#cc6600',botD:'#aa4400',botL:'#dd8822',boot:'#663300',bootD:'#552200',accent:'#cc3300',accentD:'#aa2200'}},
  {id:'scarecrow', desc:'Scarecrow', colors:{hair:'#c4a35a',hairD:'#a4834a',hairL:'#d4b36a',skin:'#daa520',skinD:'#b8860b',skinL:'#eebb33',eye:'#222',top:'#8b7355',topD:'#6b5335',topL:'#ab9375',bot:'#556b2f',botD:'#3d4f1f',botL:'#6b8b3f',boot:'#daa520',bootD:'#b8860b',accent:'#daa520',accentD:'#b8860b'}},
  {id:'ice_queen', desc:'Ice Queen', colors:{hair:'#87ceeb',hairD:'#5f9ea0',hairL:'#b0e0e6',skin:'#ddeeff',skinD:'#bbccdd',skinL:'#eef5ff',eye:'#334455',top:'#99ccee',topD:'#77aacc',topL:'#bbddee',bot:'#99ccee',botD:'#77aacc',botL:'#bbddee',boot:'#87ceeb',bootD:'#5f9ea0',accent:'#e0ffff',accentD:'#aaddff'}},
  {id:'snowdrift', desc:'Snowdrift snowman', colors:{hair:'#222',hairD:'#111',hairL:'#444',skin:'#fff',skinD:'#e8e8e8',skinL:'#f8f8ff',eye:'#111',top:'#fff',topD:'#e8e8e8',topL:'#f8f8ff',bot:'#fff',botD:'#e8e8e8',botL:'#f8f8ff',boot:'#fff',bootD:'#e8e8e8',accent:'#444',accentD:'#333'}},
  {id:'cozy_fireplace', desc:'Cozy Fireplace walking', colors:{hair:'#ff4400',hairD:'#cc2200',hairL:'#ffcc00',skin:'#8b4513',skinD:'#6b3010',skinL:'#a05520',eye:'#ffcc00',top:'#8b4513',topD:'#6b3010',topL:'#a05520',bot:'#8b4513',botD:'#6b3010',botL:'#a05520',boot:'#555',bootD:'#333',accent:'#ff6600',accentD:'#cc4400'}},
  // VARIANTS
  {id:'shadow_blood', desc:'Blood-red Shadow', colors:{hair:'#8b0000',hairD:'#550000',hairL:'#bb2222',skin:'#cc4444',skinD:'#992222',skinL:'#dd6666',eye:'#220000',top:'#8b0000',topD:'#550000',topL:'#bb2222',bot:'#8b0000',botD:'#550000',botL:'#bb2222',boot:'#441111',bootD:'#330000',accent:'#ff0000',accentD:'#cc0000'}},
  {id:'shadow_frost', desc:'Ice-blue Shadow', colors:{hair:'#4fc3f7',hairD:'#2196f3',hairL:'#81d4fa',skin:'#b3e5fc',skinD:'#80d0f0',skinL:'#cceeff',eye:'#1a237e',top:'#4fc3f7',topD:'#2196f3',topL:'#81d4fa',bot:'#4fc3f7',botD:'#2196f3',botL:'#81d4fa',boot:'#263238',bootD:'#1a2027',accent:'#e1f5fe',accentD:'#b3e5fc'}},
  {id:'shadow_void', desc:'Void Shadow', colors:{hair:'#4a0080',hairD:'#2d004d',hairL:'#7b1fa2',skin:'#9c27b0',skinD:'#7b1fa2',skinL:'#ba68c8',eye:'#e040fb',top:'#4a0080',topD:'#2d004d',topL:'#7b1fa2',bot:'#4a0080',botD:'#2d004d',botL:'#7b1fa2',boot:'#1a0033',bootD:'#0d001a',accent:'#e040fb',accentD:'#ab47bc'}},
  {id:'saiyan_blue', desc:'Saiyan Blue', colors:{hair:'#1e90ff',hairD:'#0066cc',hairL:'#4fc3f7',skin:'#ffaa77',skinD:'#dd8855',skinL:'#ffcc99',eye:'#222',top:'#ff6600',topD:'#cc4400',topL:'#ff8844',bot:'#ff6600',botD:'#cc4400',botL:'#ff8844',boot:'#884422',bootD:'#663311',accent:'#1a237e',accentD:'#0d1257'}},
  {id:'saiyan_rose', desc:'Saiyan Rosé', colors:{hair:'#ff69b4',hairD:'#cc4488',hairL:'#ff99cc',skin:'#ffaa77',skinD:'#dd8855',skinL:'#ffcc99',eye:'#222',top:'#111',topD:'#000',topL:'#222',bot:'#111',botD:'#000',botL:'#222',boot:'#884422',bootD:'#663311',accent:'#444',accentD:'#333'}},
  {id:'cyber_neon', desc:'Cyber Neon pink', colors:{hair:'#1a1a2e',hairD:'#0f0f1a',hairL:'#ff1493',skin:'#ddbbcc',skinD:'#bb99aa',skinL:'#eeccdd',eye:'#ff1493',top:'#1a1a2e',topD:'#0f0f1a',topL:'#2a2a3e',bot:'#1a1a2e',botD:'#0f0f1a',botL:'#2a2a3e',boot:'#222',bootD:'#111',accent:'#ff1493',accentD:'#cc0077'}},
  {id:'cyber_toxic', desc:'Cyber Toxic green', colors:{hair:'#1a1a2e',hairD:'#0f0f1a',hairL:'#39ff14',skin:'#bbddbb',skinD:'#99bb99',skinL:'#cceecc',eye:'#39ff14',top:'#1a1a2e',topD:'#0f0f1a',topL:'#2a2a3e',bot:'#1a1a2e',botD:'#0f0f1a',botL:'#2a2a3e',boot:'#222',bootD:'#111',accent:'#39ff14',accentD:'#22cc00'}},
  {id:'cyber_chrome', desc:'Cyber Chrome silver', colors:{hair:'#1a1a2e',hairD:'#0f0f1a',hairL:'#c0c0c0',skin:'#ddd',skinD:'#bbb',skinL:'#eee',eye:'#c0c0c0',top:'#808080',topD:'#666',topL:'#999',bot:'#808080',botD:'#666',botL:'#999',boot:'#333',bootD:'#222',accent:'#c0c0c0',accentD:'#999'}},
  {id:'robot_gold', desc:'Robot Gold', colors:{hair:'#ffd700',hairD:'#ccaa00',hairL:'#ffee66',skin:'#ffd700',skinD:'#ccaa00',skinL:'#ffee66',eye:'#ff0000',top:'#ffd700',topD:'#ccaa00',topL:'#ffee66',bot:'#ffd700',botD:'#ccaa00',botL:'#ffee66',boot:'#ccaa00',bootD:'#aa8800',accent:'#fff',accentD:'#eee'}},
  {id:'ninja_crimson', desc:'Ninja Crimson red', colors:{hair:'#dc143c',hairD:'#aa0022',hairL:'#ff3355',skin:'#dc143c',skinD:'#aa0022',skinL:'#ff3355',eye:'#fff',top:'#dc143c',topD:'#aa0022',topL:'#ff3355',bot:'#dc143c',botD:'#aa0022',botL:'#ff3355',boot:'#661122',bootD:'#440011',accent:'#fff',accentD:'#ddd'}},
  {id:'pirate_ghost', desc:'Ghost Pirate translucent', colors:{hair:'#b0c4de',hairD:'#8899bb',hairL:'#d0e0f0',skin:'#c8d8e8',skinD:'#a0b0c0',skinL:'#e0eef8',eye:'#445566',top:'#b0c4de',topD:'#8899bb',topL:'#d0e0f0',bot:'#b0c4de',botD:'#8899bb',botL:'#d0e0f0',boot:'#8899bb',bootD:'#667788',accent:'#e0eef8',accentD:'#c8d8e8'}},
  {id:'knight_dark', desc:'Dark Knight black armor', colors:{hair:'#1a1a1a',hairD:'#0a0a0a',hairL:'#333',skin:'#1a1a1a',skinD:'#0a0a0a',skinL:'#333',eye:'#ff0000',top:'#1a1a1a',topD:'#0a0a0a',topL:'#333',bot:'#1a1a1a',botD:'#0a0a0a',botL:'#333',boot:'#111',bootD:'#000',accent:'#444',accentD:'#333'}},
];

for (const def of skinDefs) {
  const g = humanSprite(def.id, def.colors);
  spriteCode += makeSkinBlock(def.id, null, g, def.desc);
}

// Insert before "// Walk animation" — use the one after getVisitorSprite skin defs (NOT the one inside a skin)
const walkAnchor = '  // Walk animation\n  if(grid&&frame===1';
const walkIdx = html.indexOf(walkAnchor);
if (walkIdx === -1) { console.error('Could not find walk animation anchor'); process.exit(1); }
html = html.slice(0, walkIdx) + spriteCode + '\n\n  ' + html.slice(walkIdx);

// === 3. Echo reactions ===
const echoReactions = `
    // Seasonal skins (v23)
    cherry_blossom: ["The petals... they're falling all around you! 🌸 Bushido has never looked so beautiful."],
    pollen_fairy: ["Those wings shimmer like liquid gold! The garden on Floor 4 is jealous. 🧚"],
    spring_bunny: ["Hop hop! 🐰 That basket better have cosmic carrots in it."],
    beach_king: ["Surf's up! 🏄 That Hawaiian shirt is giving me vacation vibes. I need a vacation."],
    lifeguard: ["No running on the space station pool deck! 🏊 ...we don't have a pool deck."],
    sun_spirit: ["You're literally radiating! My temperature sensors just spiked. ☀️🔥"],
    pumpkin_knight: ["That carved grin is TERRIFYING. I love it. 🎃 Happy hauntings!"],
    harvest_witch: ["That broomstick parks in the broom closet on Floor 3. Nice hat btw! 🧹"],
    scarecrow: ["Is that straw? In SPACE? Bold move. The crows won't follow you up here. 🌾"],
    ice_queen: ["The temperature just dropped 20 degrees. ❄️ Majestic. Absolutely majestic."],
    snowdrift: ["A snowman! In a heated space station! ⛄ Your bravery is unmatched."],
    cozy_fireplace: ["You're... a walking fireplace? With LEGS? 🔥 I have so many questions."],
    // Variant skins (v23)
    shadow_blood: ["Blood moon energy. 🩸 That crimson shadow is giving me chills."],
    shadow_frost: ["Ice cold shadow! 🧊 The frost patterns on that outfit are mesmerizing."],
    shadow_void: ["The void stares back... and it's wearing YOUR outfit. 🕳️ Terrifyingly cool."],
    saiyan_blue: ["SUPER SAIYAN BLUE?! 💙 The divine ki is off the charts!"],
    saiyan_rose: ["Saiyan Rosé! 🌹 Elegant destruction has never looked so stylish."],
    cyber_neon: ["Hot pink circuits! 💗 That neon is burning my optical sensors. Worth it."],
    cyber_toxic: ["Toxic green glow! ☢️ Careful, you might contaminate the station... with style."],
    cyber_chrome: ["Chrome finish! 🪞 I can see my reflection in your armor. Looking good, both of us."],
    robot_gold: ["GOLD PLATED?! 🏆 That's not a robot, that's a trophy walking around!"],
    ninja_crimson: ["Red ninja! 🔴 Like a shadow dipped in blood. Dramatic. I approve."],
    pirate_ghost: ["A GHOST pirate?! 👻 You've transcended death AND the seven seas!"],
    knight_dark: ["The darkest knight. 🖤 Even light is afraid of that armor."],`;

// Insert into EchoSkinReactions.reactions
const reactionsAnchor = "web_slinger: [\"Thwip thwip! 🕸️ Please don't web my telescope, I just cleaned it.\"],";
html = html.replace(reactionsAnchor, reactionsAnchor + echoReactions);

// === 4. Seasonal availability check in shop ===
// Modify shop rendering to handle seasonal skins
const seasonalCheck = `
    // Seasonal availability check (v23)
    const currentMonth = new Date().getMonth() + 1;
    const isSeasonal = sk.seasonal;
    const isAvailable = !isSeasonal || isSeasonal.months.includes(currentMonth);
    const seasonLabel = isSeasonal ? isSeasonal.season.charAt(0).toUpperCase() + isSeasonal.season.slice(1) : '';
`;

// Find the skin card rendering in the shop
const skinCardAnchor = "const isLootOnly=sk.lootOnly||sk.cost<0;";
const skinCardIdx = html.indexOf(skinCardAnchor);
if (skinCardIdx === -1) { console.error('Could not find skin card anchor'); process.exit(1); }
html = html.slice(0, skinCardIdx) + seasonalCheck + '    ' + html.slice(skinCardIdx);

// Add seasonal badge display and greyed-out logic
// After the loot-only badge, add seasonal badge
const lootBadgeAnchor = "else html+='<div class=\"lock\" style=\"font-size:8px;color:'+(owned?'#0f0':'#ffd700')+'\">'+(current?'WORN':owned?'OWNED':sk.cost+'◈')+'</div>';";
const seasonalBadge = `
    if(isSeasonal && !isAvailable) html+='<div style=\"font-size:7px;color:#888;margin-top:2px\">🔒 Back in '+seasonLabel+'</div>';
    else if(isSeasonal && isAvailable) html+='<div style=\"font-size:7px;color:#4fc3f7;margin-top:2px\">🌟 Limited: '+seasonLabel+'</div>';
    if(sk.variant_of) html+='<div style=\"font-size:7px;color:#aaa;margin-top:1px\">✨ Variant</div>';`;
html = html.replace(lootBadgeAnchor, lootBadgeAnchor + seasonalBadge);

// Also add greyed-out class for unavailable seasonal skins  
const skinCardClass = "data-action=\"buy-skin\" data-id=\"'+sk.id+'\" data-cost=\"'+sk.cost+'\"";
html = html.replace(
  skinCardClass,
  "data-action=\"buy-skin\" data-id=\"'+sk.id+'\" data-cost=\"'+sk.cost+'\" "
  + "style=\"'+(isSeasonal&&!isAvailable?'opacity:0.4;pointer-events:none;':'')+'border-color:'+r.border+';--rarity-glow:'+(r.glow||'transparent')+'\"'"
);
// Remove the duplicate style attr 
html = html.replace(
  "\" style=\"'+(isSeasonal&&!isAvailable?'opacity:0.4;pointer-events:none;':'')+'border-color:'+r.border+';--rarity-glow:'+(r.glow||'transparent')+'\"'\" style=\"border-color:'+r.border+';--rarity-glow:'+(r.glow||'transparent')+'\">'",
  "\" style=\"'+(isSeasonal&&!isAvailable?'opacity:0.4;pointer-events:none;':'')+'border-color:'+r.border+';--rarity-glow:'+(r.glow||'transparent')+'\">'",
);

fs.writeFileSync('index.html', html);
console.log('Done! Injected 24 skins.');
