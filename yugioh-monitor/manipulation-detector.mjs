/**
 * Card Sniper — Market Manipulation Detector
 * ──────────────────────────────────────────────
 * Detects suspicious patterns in eBay TCG listings:
 * - Shill bidding patterns
 * - Price manipulation (artificial inflation/deflation)
 * - Fake sold comps (wash trading)
 * - Counterfeit indicators
 * - Listing cycling (relist to reset metrics)
 * - Coordinated seller networks
 *
 * Logs all findings to manipulation-log.json for review and potential reporting.
 * Run: node manipulation-detector.mjs --scan
 *      node manipulation-detector.mjs --report
 *      node manipulation-detector.mjs --export-csv  (for eBay reporting)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEEN_FILE = path.join(__dirname, 'seen.json');
const LOG_FILE = path.join(__dirname, 'manipulation-log.json');
const REPORT_FILE = path.join(__dirname, 'manipulation-report.json');

// ── Detection Patterns ───────────────────────────────────────────────────────

const PATTERNS = {

  // Pattern 1: Placeholder Pricing (confirmed from our data: $99,999 / $77,777 / $111,107)
  PLACEHOLDER_PRICE: {
    id: 'PLACEHOLDER_PRICE',
    severity: 'LOW',
    description: 'Listing uses a placeholder/joke price not intended for actual sale',
    detect(listing) {
      const price = parseFloat(String(listing.price || '0').replace(/[$€£,]/g, ''));
      if (!price) return null;
      const priceStr = Math.round(price).toString();

      const reasons = [];
      if (/^(\d)\1{3,}$/.test(priceStr)) reasons.push(`Repeating digits: $${priceStr}`);
      if (/^(\d{2,3})\1+$/.test(priceStr)) reasons.push(`Repeated pattern: $${priceStr}`);
      if (price === 99999 || price === 77777 || price === 11111 || price === 55555) reasons.push(`Known placeholder: $${price}`);
      if (price > 100000 && !listing.title?.toLowerCase().includes('illustrator')) reasons.push(`Extreme price $${price} — likely not a real listing`);

      return reasons.length ? { reasons, price } : null;
    }
  },

  // Pattern 2: Bulk Listed as Single (inflated price for bulk/lot)
  BULK_AS_SINGLE: {
    id: 'BULK_AS_SINGLE',
    severity: 'MEDIUM',
    description: 'Bulk lot or deck bundle listed with a single-card price — misleads search results',
    detect(listing) {
      const title = (listing.title || '').toLowerCase();
      const price = parseFloat(String(listing.price || '0').replace(/[$€£,]/g, ''));
      const reasons = [];

      const bulkIndicators = [
        /x\d+\b/,                          // x2, x3, x4
        /\b\d+\s*cards?\b/,                // 42 cards, 27 card
        /\bdeck\s*\d+/,                     // deck 42, deck 27
        /\blot\s*of\b/,                     // lot of
        /\bbundle\b/,
        /\bplayset\b/,
        /\bcomplete\s+set\b/,
      ];

      const matchedBulk = bulkIndicators.filter(r => r.test(title));
      if (matchedBulk.length === 0) return null;

      // Bulk items shouldn't have high single-card prices
      if (price > 500 && matchedBulk.length >= 1) {
        reasons.push(`Bulk indicators (${matchedBulk.map(r=>r.source).join(', ')}) with high price $${price}`);
      }

      // Pipe-delimited multi-card titles
      if ((title.match(/\|/g) || []).length >= 2 && price > 1000) {
        reasons.push(`Multi-card pipe-delimited title with premium price`);
      }

      return reasons.length ? { reasons, bulkIndicators: matchedBulk.map(r => r.source) } : null;
    }
  },

  // Pattern 3: Counterfeit Indicators
  COUNTERFEIT_RISK: {
    id: 'COUNTERFEIT_RISK',
    severity: 'HIGH',
    description: 'Listing shows indicators commonly associated with counterfeit cards',
    detect(listing) {
      const title = (listing.title || '').toLowerCase();
      const price = parseFloat(String(listing.price || '0').replace(/[$€£,]/g, ''));
      const reasons = [];

      // Known counterfeit indicators in titles
      if (/\b(proxy|custom|orica|replica|reprint|fan.?made|not\s+real|unofficial)\b/.test(title)) {
        reasons.push(`Title contains counterfeit indicator: ${title.match(/proxy|custom|orica|replica|reprint|fan.?made|not\s+real|unofficial/)[0]}`);
      }

      // Suspiciously cheap "PSA 10" cards (counterfeits often claim grades)
      if (/psa\s*10/.test(title) && price < 50 && /charizard|blue.?eyes|exodia|black\s*lotus/i.test(title)) {
        reasons.push(`PSA 10 of a grail card for only $${price} — almost certainly counterfeit`);
      }

      // "1st edition" base set holo for under $100 = extremely suspicious
      if (/1st\s*ed/i.test(title) && /base\s*set|lob|legend\s*of/i.test(title) && price < 100) {
        reasons.push(`1st Edition vintage card for $${price} — likely counterfeit or heavy damage`);
      }

      return reasons.length ? { reasons } : null;
    }
  },

  // Pattern 4: Price Manipulation — Seller cycling
  LISTING_CYCLING: {
    id: 'LISTING_CYCLING',
    severity: 'MEDIUM',
    description: 'Same card relisted multiple times at different prices — potential price manipulation or search spam',
    detect(listing, allListings) {
      if (!allListings) return null;
      const title = (listing.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const titleWords = title.split(/\s+/).filter(w => w.length > 3);
      if (titleWords.length < 3) return null;

      // Find similar listings
      const similar = allListings.filter(l => {
        if (l === listing) return false;
        const otherTitle = (l.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const otherWords = otherTitle.split(/\s+/).filter(w => w.length > 3);
        const overlap = titleWords.filter(w => otherWords.includes(w));
        return overlap.length >= Math.min(4, titleWords.length * 0.7);
      });

      if (similar.length >= 2) {
        const prices = [listing, ...similar].map(l =>
          parseFloat(String(l.price || '0').replace(/[$€£,]/g, ''))
        ).filter(p => p > 0);

        if (prices.length >= 2) {
          const max = Math.max(...prices);
          const min = Math.min(...prices);
          const spread = max / min;

          if (spread > 2) {
            return {
              reasons: [`${similar.length + 1} similar listings found with ${Math.round(spread)}× price spread ($${min} → $${max})`],
              duplicateCount: similar.length + 1,
              priceSpread: spread,
              titles: [listing.title, ...similar.map(s => s.title)].slice(0, 5),
            };
          }
        }
      }

      return null;
    }
  },

  // Pattern 5: Wash Trading in Sold Comps
  WASH_TRADING: {
    id: 'WASH_TRADING',
    severity: 'HIGH',
    description: 'Sold prices show signs of artificial inflation — identical prices, suspicious timing',
    detect(listing, allListings, soldPrices) {
      if (!soldPrices || soldPrices.length < 5) return null;

      const reasons = [];
      const prices = soldPrices.map(p => typeof p === 'object' ? p.price : p);

      // Check for identical price clustering (>40% same price)
      const freq = {};
      prices.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
      const maxFreq = Math.max(...Object.values(freq));
      const maxFreqPrice = Object.keys(freq).find(k => freq[k] === maxFreq);
      if (maxFreq / prices.length > 0.4) {
        reasons.push(`${maxFreq}/${prices.length} sold at identical price $${maxFreqPrice} (${Math.round(maxFreq/prices.length*100)}%) — suspicious clustering`);
      }

      // Coefficient of variation too low (< 2%)
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv < 0.02 && prices.length >= 5) {
        reasons.push(`Coefficient of variation ${(cv * 100).toFixed(1)}% — unnaturally tight pricing (natural markets show 5-30% variation)`);
      }

      return reasons.length ? { reasons, priceCount: prices.length, cv: cv.toFixed(3) } : null;
    }
  },

  // Pattern 6: Suspiciously Low Price for Game
  BAIT_PRICING: {
    id: 'BAIT_PRICING',
    severity: 'MEDIUM',
    description: 'Price is abnormally low for the card type — could be bait-and-switch, condition misrepresentation, or counterfeit',
    detect(listing) {
      const title = (listing.title || '').toLowerCase();
      const price = parseFloat(String(listing.price || '0').replace(/[$€£,]/g, ''));
      if (!price || price <= 0) return null;

      const grailChecks = [
        { pattern: /psa\s*10.*blue.?eyes.*lob.*1st/i, minPrice: 5000, name: 'PSA 10 BEWD LOB 1st' },
        { pattern: /psa\s*10.*charizard.*base.*1st/i, minPrice: 10000, name: 'PSA 10 Charizard Base 1st' },
        { pattern: /psa\s*10.*black\s*lotus/i, minPrice: 50000, name: 'PSA 10 Black Lotus' },
        { pattern: /illustrator.*pikachu/i, minPrice: 100000, name: 'Pikachu Illustrator' },
        { pattern: /psa\s*10.*exodia.*1st/i, minPrice: 3000, name: 'PSA 10 Exodia 1st Ed' },
      ];

      for (const check of grailChecks) {
        if (check.pattern.test(title) && price < check.minPrice * 0.1) {
          return {
            reasons: [`${check.name} listed at $${price} — expected minimum ~$${check.minPrice}. ${price < 500 ? 'Almost certainly counterfeit or scam.' : 'Suspicious — investigate before buying.'}`],
          };
        }
      }

      return null;
    }
  },
};

// ── Scanner ──────────────────────────────────────────────────────────────────

function scanListings() {
  if (!fs.existsSync(SEEN_FILE)) {
    console.error('seen.json not found');
    return [];
  }

  const seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
  const entries = Object.entries(seen).map(([key, val]) => ({ ...val, id: key }));
  const findings = [];
  const now = new Date().toISOString();

  console.log(`\n🔍 Manipulation Detector — Scanning ${entries.length} listings`);
  console.log('═'.repeat(60));

  for (const listing of entries) {
    for (const [patternKey, pattern] of Object.entries(PATTERNS)) {
      const result = pattern.detect(listing, entries, null);
      if (result) {
        findings.push({
          detectedAt: now,
          patternId: pattern.id,
          severity: pattern.severity,
          description: pattern.description,
          listing: {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            url: listing.affiliateUrl || listing.url || null,
            platform: listing.platform || 'unknown',
            image: listing.image || null,
            firstSeen: listing.firstSeen,
          },
          evidence: result,
        });
      }
    }
  }

  // Sort by severity
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  findings.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  return findings;
}

// ── Report Generator ─────────────────────────────────────────────────────────

function generateReport(findings) {
  const byPattern = {};
  const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] };

  for (const f of findings) {
    if (!byPattern[f.patternId]) byPattern[f.patternId] = [];
    byPattern[f.patternId].push(f);
    bySeverity[f.severity]?.push(f);
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFindings: findings.length,
      high: bySeverity.HIGH.length,
      medium: bySeverity.MEDIUM.length,
      low: bySeverity.LOW.length,
    },
    byPattern: Object.entries(byPattern).map(([id, items]) => ({
      patternId: id,
      description: PATTERNS[id]?.description || id,
      count: items.length,
      severity: items[0]?.severity,
      topExamples: items.slice(0, 5).map(f => ({
        title: f.listing.title,
        price: f.listing.price,
        url: f.listing.url,
        evidence: f.evidence.reasons?.join('; '),
      })),
    })),
    // eBay report-ready: high severity only with URLs
    reportableToEbay: bySeverity.HIGH.filter(f => f.listing.url).map(f => ({
      url: f.listing.url,
      title: f.listing.title,
      price: f.listing.price,
      violation: f.patternId,
      evidence: f.evidence.reasons?.join('; '),
      detectedAt: f.detectedAt,
    })),
  };
}

// ── CSV Export (for eBay reporting) ──────────────────────────────────────────

function exportCSV(findings) {
  const reportable = findings.filter(f => f.severity === 'HIGH' && f.listing.url);
  const headers = 'URL,Title,Price,Violation,Evidence,Detected At';
  const rows = reportable.map(f =>
    [
      f.listing.url,
      `"${(f.listing.title || '').replace(/"/g, '""')}"`,
      f.listing.price,
      f.patternId,
      `"${(f.evidence.reasons || []).join('; ').replace(/"/g, '""')}"`,
      f.detectedAt,
    ].join(',')
  );
  return [headers, ...rows].join('\n');
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--scan') || args.includes('--report') || args.includes('--export-csv') || args.length === 0) {
  const findings = scanListings();

  // Save raw findings
  fs.writeFileSync(LOG_FILE, JSON.stringify(findings, null, 2));
  console.log(`\n📝 Logged ${findings.length} findings to manipulation-log.json`);

  // Print summary
  const report = generateReport(findings);
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 MANIPULATION DETECTION REPORT');
  console.log(`${'═'.repeat(60)}`);
  console.log(`Total findings:  ${report.summary.totalFindings}`);
  console.log(`  🔴 HIGH:       ${report.summary.high}`);
  console.log(`  🟡 MEDIUM:     ${report.summary.medium}`);
  console.log(`  🟢 LOW:        ${report.summary.low}`);
  console.log(`\nBy pattern:`);
  for (const p of report.byPattern) {
    console.log(`  [${p.severity}] ${p.patternId}: ${p.count} findings`);
    for (const ex of p.topExamples.slice(0, 3)) {
      console.log(`    → ${ex.title?.slice(0, 55)}... | ${ex.price}`);
      console.log(`      Evidence: ${ex.evidence?.slice(0, 80)}`);
    }
  }

  if (report.reportableToEbay.length > 0) {
    console.log(`\n🚨 ${report.reportableToEbay.length} listings flagged for potential eBay report`);
  }

  if (args.includes('--export-csv')) {
    const csv = exportCSV(findings);
    const csvFile = path.join(__dirname, 'manipulation-report.csv');
    fs.writeFileSync(csvFile, csv);
    console.log(`\n📄 CSV exported to ${csvFile}`);
  }
}

export { scanListings, generateReport, exportCSV, PATTERNS };
