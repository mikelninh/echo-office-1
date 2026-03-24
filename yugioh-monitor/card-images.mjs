#!/usr/bin/env node
/**
 * Card Image Resolver — Fetches real card images from free TCG APIs
 * 
 * Sources:
 *   Pokémon: pokemontcg.io API (free, no key needed for low volume)
 *   Yu-Gi-Oh: ygoprodeck.com API (free, no key)
 *   MTG: Scryfall API (free, no key)
 *   One Piece: no free API — falls back to eBay listing image
 *   Others: eBay listing image or search
 */

import { execSync } from 'child_process';

const CACHE = new Map();

/**
 * Resolve a card image URL from the title and game.
 * Returns a URL string or null.
 */
export async function resolveCardImage(title, game) {
  const cacheKey = `${game}:${title}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  let imageUrl = null;

  try {
    switch (game?.toLowerCase()) {
      case 'pokemon':
      case 'pokémon':
        imageUrl = await searchPokemonTCG(title);
        break;
      case 'yugioh':
      case 'yu-gi-oh':
      case 'yu-gi-oh!':
        imageUrl = await searchYugioh(title);
        break;
      case 'mtg':
      case 'magic':
      case 'magic: the gathering':
        imageUrl = await searchScryfall(title);
        break;
      case 'onepiece':
      case 'one piece':
        imageUrl = await searchOnePieceTCG(title);
        break;
      default:
        imageUrl = null;
    }
  } catch (e) {
    console.error(`[card-images] Error resolving ${game}/${title}: ${e.message}`);
  }

  CACHE.set(cacheKey, imageUrl);
  return imageUrl;
}

/**
 * Extract the card name from a listing title (strip grading, edition, etc.)
 */
function extractCardName(title) {
  let name = title
    // Remove grading info
    .replace(/\b(PSA|BGS|CGC|ACE|ARS|PGS)\s*\d+(\.\d+)?/gi, '')
    // Remove edition info
    .replace(/\b(1st|2nd|first|second|unlimited)\s*(edition|ed\.?)?/gi, '')
    // Remove condition
    .replace(/\b(NM|LP|MP|HP|Mint|Near Mint|Played|Damaged|Excellent|Good)\b/gi, '')
    // Remove set info after card name (keep set code for lookup)
    .replace(/\b(Holo|Rare|Secret|Ultra|Super|Common|Uncommon|Prism|Foil|Reverse)\s*(Rare|Holo)?/gi, '')
    // Remove platform/listing artifacts
    .replace(/\b(New Listing|Neues Angebot)\b/gi, '')
    .replace(/🔥|⭐|💎|✅|🐉/g, '')
    // Remove year
    .replace(/\b(19|20)\d{2}\b/g, '')
    // Remove "Pokemon", "Yu-Gi-Oh", etc. prefix
    .replace(/\b(Pokemon|Pokémon|Yu-Gi-Oh!?|MTG|Magic|TCG|Card|Karte|Karten)\b/gi, '')
    // Clean up
    .replace(/[#()[\]{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try to extract just the card name (first recognizable part)
  // e.g. "Charizard Base Set 4/102" → "Charizard"
  // e.g. "Blue-Eyes White Dragon LOB-001" → "Blue-Eyes White Dragon"
  return name;
}

/**
 * Extract set code from title (e.g., "LOB-001", "4/102", "Base Set")
 */
function extractSetCode(title) {
  // Match patterns like LOB-001, SDY-006, 4/102, etc.
  const match = title.match(/\b([A-Z]{2,5})-?(\d{3,4})\b/) ||
                title.match(/\b(\d{1,3})\/(\d{2,3})\b/);
  return match ? match[0] : null;
}

// ── Pokémon TCG API ──────────────────────────────────────────────────

async function searchPokemonTCG(title) {
  const cardName = extractCardName(title);
  const setCode = extractSetCode(title);
  
  // Try specific card number first
  if (setCode) {
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=number:${encodeURIComponent(setCode.split('/')[0])}`;
      const res = execSync(`curl -s -m 10 '${url}' -H 'Accept: application/json'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
      const data = JSON.parse(res);
      if (data.data?.length > 0) {
        // Prefer hi-res
        return data.data[0].images?.large || data.data[0].images?.small || null;
      }
    } catch {}
  }

  // Search by name
  const searchName = cardName.split(/\s+/).slice(0, 3).join(' '); // First 3 words
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(searchName)}"&pageSize=1&orderBy=-set.releaseDate`;
    const res = execSync(`curl -s -m 10 '${url}' -H 'Accept: application/json'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const data = JSON.parse(res);
    if (data.data?.length > 0) {
      return data.data[0].images?.large || data.data[0].images?.small || null;
    }
  } catch {}

  return null;
}

// ── Yu-Gi-Oh API (ygoprodeck.com) ────────────────────────────────────

async function searchYugioh(title) {
  const cardName = extractCardName(title);
  const searchName = cardName.split(/\s+/).slice(0, 5).join(' ');

  try {
    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(searchName)}`;
    const res = execSync(`curl -s -m 10 '${url}'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const data = JSON.parse(res);
    if (data.data?.length > 0) {
      const card = data.data[0];
      // Prefer alternate art / highest quality
      const images = card.card_images || [];
      return images[0]?.image_url || null;
    }
  } catch {}

  return null;
}

// ── Scryfall (MTG) ───────────────────────────────────────────────────

async function searchScryfall(title) {
  const cardName = extractCardName(title);
  const searchName = cardName.split(/\s+/).slice(0, 5).join(' ');

  try {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(searchName)}`;
    const res = execSync(`curl -s -m 10 '${url}'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const data = JSON.parse(res);
    if (data.image_uris) {
      return data.image_uris.large || data.image_uris.normal || data.image_uris.small || null;
    }
    // Double-faced cards
    if (data.card_faces?.[0]?.image_uris) {
      return data.card_faces[0].image_uris.large || data.card_faces[0].image_uris.normal || null;
    }
  } catch {}

  // Fuzzy search fallback
  try {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchName)}&order=released&dir=desc`;
    const res = execSync(`curl -s -m 10 '${url}'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const data = JSON.parse(res);
    if (data.data?.length > 0) {
      const card = data.data[0];
      return card.image_uris?.large || card.image_uris?.normal || null;
    }
  } catch {}

  return null;
}

// ── One Piece TCG ────────────────────────────────────────────────────

async function searchOnePieceTCG(title) {
  // No great free API for One Piece TCG — try a generic image search via set code
  const setCode = extractSetCode(title);
  if (setCode) {
    try {
      // Try one piece tcg API (unofficial)
      const url = `https://apiv2.onepiececardgame.dev/cards?id=${encodeURIComponent(setCode)}`;
      const res = execSync(`curl -s -m 10 '${url}'`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
      const data = JSON.parse(res);
      if (data?.length > 0 && data[0].image) {
        return data[0].image;
      }
    } catch {}
  }
  return null;
}

// ── Batch resolve for portfolio ──────────────────────────────────────

/**
 * Resolve images for all cards in the portfolio that don't have one.
 * Rate-limited to be polite to APIs.
 */
export async function resolveAllMissing(cards) {
  const results = [];
  for (const card of cards) {
    if (card.image_url) continue; // Already has image
    
    const imageUrl = await resolveCardImage(card.title, card.game);
    if (imageUrl) {
      results.push({ id: card.id, title: card.title, imageUrl });
    }
    
    // Rate limit: 200ms between requests
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

// ── Well-known PSA 10 images (curated for display) ───────────────────

export const ICONIC_CARD_IMAGES = {
  // Pokémon
  'charizard-base-set': 'https://images.pokemontcg.io/base1/4_hires.png',
  'charizard-gold-star': 'https://images.pokemontcg.io/ex14/100_hires.png',
  'lugia-neo-genesis': 'https://images.pokemontcg.io/neo1/9_hires.png',
  'pikachu-illustrator': 'https://images.pokemontcg.io/mcd19/7_hires.png', // not exact but representative
  'shining-charizard': 'https://images.pokemontcg.io/neo4/107_hires.png',
  'blaines-charizard': 'https://images.pokemontcg.io/gym2/2_hires.png',
  'crystal-lugia': 'https://images.pokemontcg.io/ecard3/149_hires.png',
  'mewtwo-base-set': 'https://images.pokemontcg.io/base1/10_hires.png',
  
  // Yu-Gi-Oh (ygoprodeck URLs)
  'blue-eyes-white-dragon': 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
  'dark-magician': 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  'exodia': 'https://images.ygoprodeck.com/images/cards/33396948.jpg',
  'red-eyes-black-dragon': 'https://images.ygoprodeck.com/images/cards/74677422.jpg',
  'black-luster-soldier': 'https://images.ygoprodeck.com/images/cards/72989439.jpg',
  
  // MTG (Scryfall)
  'black-lotus': 'https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7571.jpg',
};

/**
 * Try to match a card title to a known iconic image.
 */
export function matchIconicImage(title) {
  const t = title.toLowerCase();
  
  if (t.includes('charizard') && (t.includes('base') || t.includes('4/102'))) return ICONIC_CARD_IMAGES['charizard-base-set'];
  if (t.includes('charizard') && t.includes('gold star')) return ICONIC_CARD_IMAGES['charizard-gold-star'];
  if (t.includes('shining charizard')) return ICONIC_CARD_IMAGES['shining-charizard'];
  if (t.includes('blaine') && t.includes('charizard')) return ICONIC_CARD_IMAGES['blaines-charizard'];
  if (t.includes('lugia') && (t.includes('neo') || t.includes('9/111'))) return ICONIC_CARD_IMAGES['lugia-neo-genesis'];
  if (t.includes('lugia') && (t.includes('crystal') || t.includes('149/147') || t.includes('aquapolis'))) return ICONIC_CARD_IMAGES['crystal-lugia'];
  if (t.includes('pikachu') && t.includes('illustrator')) return ICONIC_CARD_IMAGES['pikachu-illustrator'];
  if (t.includes('mewtwo') && t.includes('base')) return ICONIC_CARD_IMAGES['mewtwo-base-set'];
  
  if (t.includes('blue-eyes') || t.includes('blue eyes')) return ICONIC_CARD_IMAGES['blue-eyes-white-dragon'];
  if (t.includes('dark magician') && !t.includes('girl')) return ICONIC_CARD_IMAGES['dark-magician'];
  if (t.includes('exodia')) return ICONIC_CARD_IMAGES['exodia'];
  if (t.includes('red-eyes') || t.includes('red eyes')) return ICONIC_CARD_IMAGES['red-eyes-black-dragon'];
  if (t.includes('black luster')) return ICONIC_CARD_IMAGES['black-luster-soldier'];
  
  if (t.includes('black lotus')) return ICONIC_CARD_IMAGES['black-lotus'];
  
  return null;
}

// ── CLI ──────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('card-images.mjs')) {
  const title = process.argv[2] || 'Charizard Base Set 4/102';
  const game = process.argv[3] || 'pokemon';
  
  console.log(`🔍 Resolving image for: "${title}" (${game})`);
  
  // Try iconic first
  const iconic = matchIconicImage(title);
  if (iconic) {
    console.log(`⭐ Iconic match: ${iconic}`);
  }
  
  // Try API
  const apiImage = await resolveCardImage(title, game);
  if (apiImage) {
    console.log(`🌐 API result: ${apiImage}`);
  }
  
  if (!iconic && !apiImage) {
    console.log('❌ No image found');
  }
}
