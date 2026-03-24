/**
 * listing-quality-scorer.mjs
 * ML-style single card detection for TCG grading arbitrage platform.
 *
 * Exports: scoreListingQuality(listing) → { score: 0-100, reasons: string[], isJunk: boolean }
 *
 * Architecture: feature extraction → weighted scoring → clamping → junk threshold
 */

// ─── Grail Card Names ────────────────────────────────────────────────────────
// Canonical grail card fragments per game used for +20 grail name bonus.
const GRAIL_PATTERNS = [
  // Yu-Gi-Oh
  /blue.?eyes\s+white\s+dragon/i,
  /dark\s+magician(\s+girl)?/i,
  /exodia\s+(the\s+)?forbidden/i,
  /red.?eyes\s+(b\.?\s+)?dragon/i,
  /jinzo/i,
  /cyber\s+stein/i,
  /black\s+luster\s+soldier/i,
  /tri.?horned\s+dragon/i,
  /raigeki/i,
  /pot\s+of\s+greed/i,
  /mirror\s+force/i,
  /hamon.*lord/i,
  /dark\s+paladin/i,
  /ancient\s+fairy\s+dragon/i,
  /horakhty/i,
  /holactie/i,

  // Pokémon
  /charizard/i,
  /pikachu.*star/i,
  /umbreon.*star/i,
  /espeon.*star/i,
  /rayquaza.*star/i,
  /gold\s+star/i,
  /illustrator/i,
  /tropical\s+wind/i,
  /prerelease\s+raichu/i,
  /pikachu.*trophy/i,
  /master.*key.*badge/i,
  /crystal.*charizard/i,
  /shining\s+(charizard|mew|gyarados|magikarp|celebi)/i,
  /dark\s+raichu/i,
  /no\.\s*1\s+trainer/i,
  /no\.\s*2\s+trainer/i,
  /no\.\s*3\s+trainer/i,
  /lugia.*expedition/i,
  /neo\s+genesis\s+lugia/i,
  /blastoise.*wotc|base\s+set.*blastoise/i,
  /venusaur.*base\s+set|base\s+set.*venusaur/i,
  /mew.*promo/i,
  /mewtwo.*base/i,
  /poncho\s+pikachu/i,

  // Magic: The Gathering
  /black\s+lotus/i,
  /mox\s+(sapphire|ruby|pearl|emerald|jet|diamond|opal)/i,
  /ancestral\s+recall/i,
  /time\s+walk/i,
  /time\s+twister/i,
  /underground\s+sea/i,
  /volcanic\s+island/i,
  /dual\s+land/i,
  /library\s+of\s+alexandria/i,
  /lotus\s+cobra/i,
  /jace.*mind\s+sculptor/i,
  /gaea.*cradle/i,
  /bazaar\s+of\s+baghdad/i,
  /the\s+tabernacle/i,
  /chaos\s+orb/i,
  /mishra.*workshop/i,
  /workshop.*mishra/i,
  /revised.*dual/i,
  /alpha.*beta.*unlimited/i,

  // One Piece
  /monkey.*d.*luffy/i,
  /roronoa.*zoro/i,
  /portgas.*ace/i,
  /shanks/i,
  /uta\s+op04/i,
  /nico\s+robin/i,

  // Dragon Ball
  /son\s+goku/i,
  /vegeta/i,
  /dragon\s+ball.*sp/i,
  /gohan/i,

  // Generic high-value markers across games
  /trophy\s+card/i,
  /prize\s+card/i,
  /promo.*limited/i,
  /world\s+championship/i,
  /tournament.*prize/i,
];

// ─── Price Reasonableness by Game ────────────────────────────────────────────
// [minReasonable, maxReasonable] in USD — outside these ranges gets no bonus.
// Listings where priceAmount is defined.
const GAME_PRICE_RANGES = {
  yugioh:     [50,    150000],
  pokemon:    [50,    250000],
  mtg:        [50,    200000],
  onepiece:   [30,    50000],
  dragonball: [30,    50000],
  weiss:      [20,    20000],
  digimon:    [20,    15000],
  lorcana:    [20,    15000],
  unionarena: [10,    10000],
  default:    [20,    150000],
};

// Placeholder / reserve price patterns (in USD string)
const PLACEHOLDER_PRICE_PATTERN = /^\$?(99[,.]?999|77[,.]?777|66[,.]?666|55[,.]?555|111[,.]?111|1[,.]?234[,.]?567)/i;

// ─── Bulk / Lot signal patterns ───────────────────────────────────────────────
const BULK_LOT_PATTERNS = [
  /\bx\s*[2-9]\b(?!\s*\d)/i,               // x2, x3, x4 (not x20 set numbers)
  /\b[2-9]\s*x\s+(copies|cards?|rare|ultra|secret|common)\b/i,  // 3x copies, 3x Ultra Rare
  /\blot\s+of\s+\d+/i,                     // lot of 4
  /\b\d{2,}\s*(cards?)\s*(lot|set|bundle)\b/i,
  /\bbundle\b/i,
  /\bdeck\s+\d+\b/i,                        // DECK 27, DECK 42
  /\b(starter|structure|speed)\s+deck\b/i,
  /\bbooster\s+(pack|box|set)\b/i,
  /\bfactory\s+sealed\b/i,                  // sealed product, not a single
  /\bmaster\s+set\b/i,
  /\bcollection\s+(lot|set|bundle)\b/i,
  /\bpack\s+(booster|\(\d)/i,
  /\b[1-9]\d+\s+cards?\b/i,               // "42 cards", "18 cards" (10+ cards)
  /\b\d{2,}\s+karten\b/i,                  // German: "18 Karten"
  /\b(set\s+of|lot\s+of)\s+\d+/i,
  /\bx\d+\s+\|\s/i,                        // "x4 |" pipe-separated lot
];

// Accessories / non-card items
const ACCESSORY_PATTERNS = [
  /\bplaymat\b/i,
  /\bsleeve[s]?\b/i,
  /\bbinder\b/i,
  /\bbox\s+(set|lot|collection)\b/i,
  /\bcard\s+box\b/i,
  /\bbooster\s+box\b/i,
  /\btoploader[s]?\b/i,
  /\bstorage\b.*\bcard\b/i,
  /\bstandalone\s+poster\b/i,  // standalone poster (not MTG borderless poster cards)
  /\bgift\s+(set|box)\b/i,
  /\bbriefcase\b/i,
  /\bcard\s+case\b/i,
];

// ─── Single-card signals ──────────────────────────────────────────────────────
const PSA_BGS_PATTERN     = /\b(PSA|BGS|CGC|SGC|HGA)\s*\d+(\.\d+)?\b/i;
const GRADE_WORDS_PATTERN = /\b(gem\s*mint|pristine)\b/i;
const FIRST_EDITION_PAT   = /\b(1st\s+ed(ition)?|first\s+edition)\b/i;
const HOLO_PATTERN        = /\b(holo(graphic)?|foil|holographic|ghost\s+rare|prismatic|ultra\s+rare|secret\s+rare)\b/i;
const CARD_NUMBER_PAT     = /\b[A-Z]{2,6}[-_]?\d{2,4}[A-Z]?\b/;  // e.g. LOB-001, SDK-001
const CONDITION_PAT       = /\b(NM|near\s*mint|mint|NM-?MT|nm-?mt|lightly\s+played|LP|EX|excellent)\b/i;

// ─── Suspicious / CAPS bulk title ────────────────────────────────────────────
function isSuspiciousAllCaps(title) {
  // More than 65% of alpha chars are uppercase AND title is long (bulk-style)
  // AND has many words (not a short promo code like "PSA 10 BLUE-EYES")
  const letters = title.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 30) return false;  // Short all-caps titles are fine (set codes, promos)
  const wordCount = title.trim().split(/\s+/).length;
  if (wordCount < 6) return false;        // Few words = probably a card name, not bulk
  const upperCount = (title.match(/[A-Z]/g) || []).length;
  return upperCount / letters.length > 0.65;
}

function hasPipeDelimitedBulk(title) {
  // Titles like "DECK 27 | Card1 Card2 Card3 ..."  — pipe + many words after pipe
  if (!/\|/.test(title)) return false;
  const parts = title.split('|');
  if (parts.length < 3) return false; // needs 2+ pipes
  // Or: has a pipe and the section after has 5+ words
  if (parts.length >= 2) {
    const afterPipe = parts.slice(1).join(' ');
    if (afterPipe.trim().split(/\s+/).length >= 5) return true;
  }
  return false;
}

// ─── Language detection (heuristic) ──────────────────────────────────────────
const FOREIGN_LANG_MARKERS = [
  /\bdeutsch\b/i, /\bfranzösisch\b/i, /\bfrançais\b/i,
  /\bjaponais\b/i, /\bitaliano\b/i, /\bespañol\b/i, /\bespañola\b/i,
  /\bportugu[eê]s\b/i, /\brussian\b/i, /\bkorea[n]?\b/i,
  /\bchinese\b/i, /[\u3040-\u30FF\u4E00-\u9FFF]/,  // CJK/kana chars
  /\bjpn\b.*\b(only|text)\b/i,
];

// ─── Non-card / sealed product title patterns ─────────────────────────────────
const SEALED_PRODUCT_PAT = /\b(booster\s+box|booster\s+pack|theme\s+deck|tin\s+|elite\s+trainer|etb|sealed\s+(box|product|pack)|display\s+box)\b/i;

// ─── "New Listing" prefix (eBay noise) ───────────────────────────────────────
function cleanTitle(title) {
  return title.replace(/^New\s+Listing\s*/i, '').trim();
}

// ─── Main Scoring Function ────────────────────────────────────────────────────
/**
 * @param {object} listing
 *   - title: string
 *   - price?: string   (e.g. "$1,234.56")
 *   - priceAmount?: number
 *   - game?: string
 * @returns {{ score: number, reasons: string[], isJunk: boolean }}
 */
export function scoreListingQuality(listing) {
  const raw = (listing.title || '').toString();
  const title = cleanTitle(raw);
  const game  = (listing.game || 'default').toLowerCase();
  const reasons = [];
  let score = 50; // neutral start

  // ── 1. Placeholder price ───────────────────────────────────────────────────
  const priceStr = (listing.price || '').toString();
  if (PLACEHOLDER_PRICE_PATTERN.test(priceStr)) {
    score -= 50;
    reasons.push('PENALTY: placeholder/reserve price pattern');
  }

  // ── 2. Sealed product / accessory ─────────────────────────────────────────
  if (SEALED_PRODUCT_PAT.test(title)) {
    score -= 35;
    reasons.push('PENALTY: sealed product / not a single card');
  }
  const accMatch = ACCESSORY_PATTERNS.find(p => p.test(title));
  if (accMatch) {
    score -= 35;
    reasons.push(`PENALTY: accessory/non-card item detected`);
  }

  // ── 3. Bulk / lot detection ────────────────────────────────────────────────
  const bulkMatch = BULK_LOT_PATTERNS.find(p => p.test(title));
  if (bulkMatch) {
    score -= 40;
    reasons.push('PENALTY: bulk/lot listing detected');
  }

  // ── 4. Suspicious ALL-CAPS bulk title ─────────────────────────────────────
  if (isSuspiciousAllCaps(title)) {
    score -= 30;
    reasons.push('PENALTY: suspicious all-caps bulk title');
  }
  if (hasPipeDelimitedBulk(title)) {
    score -= 20;
    reasons.push('PENALTY: pipe-delimited multi-card title');
  }

  // ── 5. Single-card positive signals ───────────────────────────────────────
  let singleCardBonus = 0;

  if (PSA_BGS_PATTERN.test(title)) {
    singleCardBonus += 25;
    reasons.push('BONUS: graded card (PSA/BGS/CGC)');
  } else if (GRADE_WORDS_PATTERN.test(title)) {
    singleCardBonus += 15;
    reasons.push('BONUS: gem mint / pristine grade language');
  }

  if (FIRST_EDITION_PAT.test(title)) {
    singleCardBonus += 15;
    reasons.push('BONUS: 1st Edition marker');
  }

  if (HOLO_PATTERN.test(title)) {
    singleCardBonus += 10;
    reasons.push('BONUS: holo/foil/rare rarity marker');
  }

  if (CARD_NUMBER_PAT.test(title)) {
    singleCardBonus += 10;
    reasons.push('BONUS: specific card number/set code');
  }

  score += Math.min(singleCardBonus, 25); // cap single-card bonus at 25

  // ── 6. Grail card name match ───────────────────────────────────────────────
  const grailMatch = GRAIL_PATTERNS.find(p => p.test(title));
  if (grailMatch) {
    score += 20;
    reasons.push(`BONUS: grail card name detected`);
  }

  // ── 7. Condition keywords ──────────────────────────────────────────────────
  if (CONDITION_PAT.test(title)) {
    score += 10;
    reasons.push('BONUS: condition keyword (NM/Mint/etc)');
  }

  // ── 8. Language confidence ─────────────────────────────────────────────────
  const foreignMatch = FOREIGN_LANG_MARKERS.find(p => p.test(title));
  if (!foreignMatch) {
    score += 10;
    reasons.push('BONUS: appears to be English listing');
  } else {
    score -= 5;
    reasons.push('PENALTY: non-English language marker detected');
  }

  // ── 9. Price reasonableness ────────────────────────────────────────────────
  const priceAmount = listing.priceAmount || parseFloat((priceStr || '').replace(/[^0-9.]/g, '')) || null;
  if (priceAmount !== null && priceAmount > 0) {
    const range = GAME_PRICE_RANGES[game] || GAME_PRICE_RANGES.default;
    if (priceAmount >= range[0] && priceAmount <= range[1]) {
      score += 15;
      reasons.push(`BONUS: price $${priceAmount.toFixed(2)} within reasonable range for ${game}`);
    } else if (priceAmount < range[0]) {
      score -= 10;
      reasons.push(`PENALTY: price $${priceAmount.toFixed(2)} suspiciously low for ${game}`);
    } else {
      // Very high price but within ultra-rare territory — no penalty, no bonus
      reasons.push(`INFO: price $${priceAmount.toFixed(2)} is high but not placeholder`);
    }
  }

  // ── 10. Very generic / vague title ────────────────────────────────────────
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3) {
    score -= 20;
    reasons.push('PENALTY: very short / generic title');
  }

  // ── 11. Clamp to [0, 100] ─────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── 12. Junk threshold ────────────────────────────────────────────────────
  // Anything below 40 is junk, OR if we have strong negative signals
  const hasHardJunkSignal =
    reasons.some(r => r.includes('bulk/lot')) ||
    reasons.some(r => r.includes('sealed product')) ||
    reasons.some(r => r.includes('accessory')) ||
    reasons.some(r => r.includes('placeholder'));

  const isJunk = score < 40 || (hasHardJunkSignal && score < 55);

  return { score, reasons, isJunk };
}

// ─── Convenience: batch score ─────────────────────────────────────────────────
/**
 * Score an array of listing objects.
 * @param {object[]} listings
 * @returns {{ listing: object, score: number, reasons: string[], isJunk: boolean }[]}
 */
export function batchScore(listings) {
  return listings.map(listing => ({ listing, ...scoreListingQuality(listing) }));
}
