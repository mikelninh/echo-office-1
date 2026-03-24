#!/usr/bin/env node
/**
 * Pokémon 30th Anniversary Drop Monitor
 * 
 * Checks pokemoncenter.com, pokemon.com, and social feeds for new product drops.
 * Pings Mikel on Telegram when something drops, with direct link.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, 'pokemon-drops-seen.json');

// ── State ────────────────────────────────────────────────────────────
function loadSeen() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
  }
  return {};
}
function saveSeen(seen) {
  writeFileSync(STATE_FILE, JSON.stringify(seen, null, 2));
}

// ── Sources ──────────────────────────────────────────────────────────

/**
 * Check Pokémon Center for new/upcoming products
 */
async function checkPokemonCenter() {
  const results = [];
  try {
    // Search for 30th anniversary and new releases
    const queries = [
      'https://www.pokemoncenter.com/category/new-arrivals?sort=newest',
      'https://www.pokemoncenter.com/search/30th%20anniversary?sort=newest',
      'https://www.pokemoncenter.com/category/trading-card-game?sort=newest',
    ];
    
    for (const url of queries) {
      try {
        const html = execSync(
          `curl -s -m 20 -L '${url}' ` +
          `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' ` +
          `-H 'Accept: text/html,application/xhtml+xml'`,
          { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
        );

        // Extract product cards from HTML
        // Pokémon Center uses Next.js with JSON data in script tags
        const jsonMatches = html.matchAll(/"name"\s*:\s*"([^"]+)".*?"url"\s*:\s*"([^"]+)".*?"price"\s*:\s*"?(\d+\.?\d*)"?/g);
        for (const m of jsonMatches) {
          const name = m[1];
          const productUrl = m[2].startsWith('http') ? m[2] : `https://www.pokemoncenter.com${m[2]}`;
          const price = m[3];
          results.push({ title: name, url: productUrl, price: `$${price}`, source: 'Pokémon Center' });
        }

        // Also try structured product data
        const ldMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
        for (const m of ldMatches) {
          try {
            const ld = JSON.parse(m[1]);
            if (ld['@type'] === 'Product' || ld['@type'] === 'ItemList') {
              const items = ld.itemListElement || [ld];
              for (const item of items) {
                const product = item.item || item;
                if (product.name && product.url) {
                  results.push({
                    title: product.name,
                    url: product.url.startsWith('http') ? product.url : `https://www.pokemoncenter.com${product.url}`,
                    price: product.offers?.price ? `$${product.offers.price}` : 'TBD',
                    source: 'Pokémon Center',
                  });
                }
              }
            }
          } catch {}
        }
      } catch (e) {
        console.error(`  PokémonCenter fetch error: ${e.message}`);
      }
    }
  } catch (e) { console.error(`PokémonCenter error: ${e.message}`); }
  
  // Deduplicate by URL
  const seen = new Set();
  return results.filter(r => {
    const key = r.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check pokemon.com news for drop announcements
 */
async function checkPokemonNews() {
  const results = [];
  try {
    const html = execSync(
      `curl -s -m 20 -L 'https://www.pokemon.com/us/pokemon-news' ` +
      `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`,
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
    );
    
    // Extract news articles
    const articleMatches = html.matchAll(/<a[^>]*href="(\/us\/pokemon-news\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g);
    for (const m of articleMatches) {
      const url = `https://www.pokemon.com${m[1]}`;
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      // Only interested in TCG / product / drop related news
      if (/\b(tcg|card|expansion|set|collection|drop|release|30th|anniversary|preorder|available|launch)\b/i.test(title)) {
        results.push({ title, url, price: 'N/A', source: 'Pokémon News' });
      }
    }
  } catch (e) { console.error(`PokémonNews error: ${e.message}`); }
  return results;
}

/**
 * Check PokeBeach for TCG news (reliable TCG source)
 */
async function checkPokeBeach() {
  const results = [];
  try {
    const html = execSync(
      `curl -s -m 20 -L 'https://www.pokebeach.com/' ` +
      `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`,
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
    );
    
    // Extract article titles and links
    const matches = html.matchAll(/<a[^>]*href="(https:\/\/www\.pokebeach\.com\/\d{4}\/\d{2}\/[^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/g);
    for (const m of matches) {
      const url = m[1];
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      if (title.length > 10 && /\b(reveal|release|drop|product|set|collection|30th|anniversary|new|exclusive|promo|preorder)\b/i.test(title)) {
        results.push({ title, url, price: 'N/A', source: 'PokeBeach' });
      }
    }
  } catch (e) { console.error(`PokeBeach error: ${e.message}`); }
  return results.slice(0, 10); // Latest 10 relevant
}

/**
 * Check Twitter/X for @Pokemon and @PokemonTCG posts (via Nitter or search)
 */
async function checkPokemonSocial() {
  const results = [];
  // Try multiple Nitter instances
  const nitterInstances = [
    'nitter.privacydev.net',
    'nitter.poast.org',
    'nitter.woodland.cafe',
  ];
  
  const accounts = ['Pokemon', 'PokemonTCG'];
  
  for (const account of accounts) {
    for (const instance of nitterInstances) {
      try {
        const html = execSync(
          `curl -s -m 15 -L 'https://${instance}/${account}' ` +
          `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`,
          { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
        );
        
        const tweetMatches = html.matchAll(/<div class="tweet-content[^"]*">([\s\S]*?)<\/div>/g);
        for (const m of tweetMatches) {
          const text = m[1].replace(/<[^>]+>/g, '').trim();
          if (/\b(drop|release|available|preorder|new|exclusive|30th|anniversary|collection|launching)\b/i.test(text)) {
            results.push({
              title: `@${account}: ${text.slice(0, 200)}`,
              url: `https://x.com/${account}`,
              price: 'N/A',
              source: `Twitter @${account}`,
            });
          }
        }
        if (results.length > 0) break; // Got data, skip other instances
      } catch { continue; }
    }
  }
  return results.slice(0, 5);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Pokémon 30th Anniversary Drop Monitor');
  console.log('=========================================\n');
  
  const seen = loadSeen();
  const newDrops = [];
  
  const sources = [
    { name: 'Pokémon Center', fn: checkPokemonCenter },
    { name: 'Pokémon News', fn: checkPokemonNews },
    { name: 'PokeBeach', fn: checkPokeBeach },
    { name: 'Social', fn: checkPokemonSocial },
  ];
  
  for (const source of sources) {
    console.log(`📡 Checking ${source.name}...`);
    try {
      const items = await source.fn();
      console.log(`   Found ${items.length} items`);
      
      for (const item of items) {
        const key = item.url || item.title.slice(0, 80);
        if (!seen[key]) {
          seen[key] = {
            firstSeen: new Date().toISOString(),
            title: item.title,
            source: item.source,
          };
          newDrops.push(item);
        }
      }
    } catch (e) {
      console.error(`   ${source.name} failed: ${e.message}`);
    }
  }
  
  // Output for cron agent
  if (newDrops.length > 0) {
    console.log(`\n🚨 ${newDrops.length} NEW DROP(S) DETECTED:\n`);
    for (const drop of newDrops) {
      console.log(`🎯 [${drop.source}] ${drop.title}`);
      console.log(`   Price: ${drop.price}`);
      console.log(`   Link: ${drop.url}\n`);
    }
  } else {
    console.log('\n✅ No new drops since last check.');
  }
  
  // JSON output for parsing
  console.log('\n__POKEMON_DROPS_JSON__');
  console.log(JSON.stringify({
    newDrops: newDrops.map(d => ({
      title: d.title,
      url: d.url,
      price: d.price,
      source: d.source,
    })),
    totalTracked: Object.keys(seen).length,
    checkTime: new Date().toISOString(),
  }));
  console.log('__END_DROPS__');
  
  saveSeen(seen);
  console.log(`\nDone. Tracking ${Object.keys(seen).length} items.`);
}

main().catch(console.error);
