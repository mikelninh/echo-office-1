// Extract sprite data without running full game
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// 1. Extract VISITOR_SKINS array text
const skStart = code.indexOf('const VISITOR_SKINS=[');
let depth = 0, skEnd = skStart;
for (let i = code.indexOf('[', skStart); i < code.length; i++) {
  if (code[i] === '[') depth++;
  if (code[i] === ']') { depth--; if (depth === 0) { skEnd = i + 1; break; } }
}
const skinsCode = code.substring(skStart, skEnd);

// 2. Extract getVisitorSprite function
const sprStart = code.indexOf('function getVisitorSprite(');
depth = 0; let sprEnd = sprStart;
for (let i = sprStart; i < code.length; i++) {
  if (code[i] === '{') depth++;
  if (code[i] === '}') { depth--; if (depth === 0) { sprEnd = i + 1; break; } }
}
const sprCode = code.substring(sprStart, sprEnd);

// 3. Run just these in isolation
const evalCode = `
const T = '.';
const _visitorSpriteCache = {};
${skinsCode}
${sprCode}

const results = [];
for (const skin of VISITOR_SKINS) {
  const dirs = [];
  for (const dir of [0,1,2,3]) {
    try { dirs.push(getVisitorSprite(skin.id, dir, 0)); } catch(e) { dirs.push(null); }
  }
  results.push({ id: skin.id, label: skin.label, rarity: skin.rarity, cost: skin.cost, desc: skin.desc, icon: skin.icon, color: skin.color, seasonal: skin.seasonal, variant_of: skin.variant_of, grids: dirs });
}
results;
`;

const result = vm.runInNewContext(evalCode, { Math, Array, Object, String, console }, { timeout: 30000 });
console.log(JSON.stringify(result));
