#!/usr/bin/env node
/**
 * Card Trading Advisor — Phase 1
 * 
 * Analyzes deals from the monitor, sends BUY/PASS/WATCH recommendations
 * via Telegram with inline buttons. Tracks approved buys in portfolio.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  addCard, getCard, listCards, updateCard, sellCard,
  getPortfolioSummary, takeSnapshot, getTransactions, getTotalDonated,
} from './portfolio.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deal Analysis ────────────────────────────────────────────────────

/**
 * Enhanced deal scoring for advisor recommendations.
 * Takes a holy grail alert or deal alert and produces a recommendation.
 */
export function analyzeForAdvisor(alert) {
  const rec = {
    action: 'PASS',        // BUY, WATCH, PASS
    confidence: 0,          // 0-100
    reasons: [],
    risks: [],
    evSummary: null,
    pricingContext: null,
  };

  const price = alert.price?.amount || parseFloat(String(alert.price).replace(/[^0-9.]/g, '')) || 0;

  // ── EV Analysis ───────────────────────────────────────────────
  if (alert.evResult || alert.ev) {
    const ev = alert.evResult?.ev || alert.ev;
    const verdict = alert.evResult?.verdict || alert.evVerdict;

    if (ev && ev > price * 1.5) {
      rec.reasons.push(`EV €${Math.round(ev)} is ${Math.round((ev/price - 1) * 100)}% above buy price — strong +EV`);
      rec.confidence += 30;
    } else if (ev && ev > price * 1.15) {
      rec.reasons.push(`EV €${Math.round(ev)} is ${Math.round((ev/price - 1) * 100)}% above buy price — positive EV`);
      rec.confidence += 20;
    } else if (ev && ev > price) {
      rec.reasons.push(`EV €${Math.round(ev)} is slightly above buy price — thin margin`);
      rec.confidence += 8;
    } else if (ev) {
      rec.risks.push(`EV €${Math.round(ev)} is below buy price — negative expected value`);
      rec.confidence -= 15;
    }
    rec.evSummary = verdict || (ev ? `EV: €${Math.round(ev)}` : null);
  }

  // ── Sold Comps ────────────────────────────────────────────────
  if (alert.soldComps || alert.soldMedian) {
    const median = alert.soldComps?.median || parseFloat(String(alert.soldMedian).replace(/[^0-9.]/g, ''));
    const count = alert.soldComps?.count || alert.soldCount || 0;

    if (median && count >= 5) {
      rec.reasons.push(`${count} sold comps, median €${Math.round(median)}`);
      rec.confidence += 15;
      if (price < median * 0.8) {
        rec.reasons.push(`Price is ${Math.round((1 - price/median) * 100)}% below sold median — potential steal`);
        rec.confidence += 20;
      }
    } else if (count < 3) {
      rec.risks.push('Few sold comps — thin market, harder to exit');
      rec.confidence -= 10;
    }
    rec.pricingContext = median ? `Sold median: €${Math.round(median)} (${count} sales)` : null;
  }

  // ── PSA Pop ───────────────────────────────────────────────────
  if (alert.psaPop || alert.psa10Pop) {
    const pop10 = alert.psaPop?.psa10Pop || alert.psa10Pop;
    const popRisk = alert.psaPop?.popRisk || alert.popRisk;

    if (popRisk === 'LOW' || (pop10 && pop10 < 20)) {
      rec.reasons.push(`Low pop (${pop10 || '?'} PSA 10s) — scarce supply`);
      rec.confidence += 15;
    } else if (popRisk === 'HIGH' || (pop10 && pop10 > 200)) {
      rec.risks.push(`High pop (${pop10}) — supply could pressure price`);
      rec.confidence -= 5;
    }
  }

  // ── Deal Score (from monitor) ──────────────────────────────────
  if (alert.deal?.score || alert.score) {
    const score = alert.deal?.score || alert.score;
    if (score >= 90) {
      rec.reasons.push(`Deal score ${score}/100 — LEGENDARY`);
      rec.confidence += 25;
    } else if (score >= 80) {
      rec.reasons.push(`Deal score ${score}/100 — HOT`);
      rec.confidence += 15;
    } else if (score >= 70) {
      rec.reasons.push(`Deal score ${score}/100 — SOLID`);
      rec.confidence += 10;
    }
  }

  // ── Grade Risk ─────────────────────────────────────────────────
  if (alert.gradeRisks || alert.gradeRiskLevel) {
    const level = alert.gradeRisks?.riskLevel || alert.gradeRiskLevel;
    if (level === 'HIGH') {
      rec.risks.push('High grading risk — known centering/print quality issues');
      rec.confidence -= 10;
    } else if (level === 'LOW') {
      rec.reasons.push('Low grading risk — clean print run');
      rec.confidence += 5;
    }
  }

  // ── Price Tier ─────────────────────────────────────────────────
  if (price > 10000) {
    rec.risks.push(`High ticket (€${Math.round(price)}) — needs more conviction`);
    rec.confidence -= 10;
  } else if (price < 100) {
    rec.reasons.push('Low risk entry — small position');
    rec.confidence += 5;
  }

  // ── Platform Trust ─────────────────────────────────────────────
  const platform = alert.platform || '';
  if (platform.includes('TCGPlayer')) {
    rec.reasons.push('TCGPlayer — buyer protection, reliable');
    rec.confidence += 5;
  } else if (platform.includes('Fanatics')) {
    rec.reasons.push('Fanatics — authenticated inventory');
    rec.confidence += 5;
  }
  // eBay is neutral — depends on seller

  // ── Final Decision ─────────────────────────────────────────────
  rec.confidence = Math.max(0, Math.min(100, rec.confidence));

  if (rec.confidence >= 70 && rec.risks.length <= 1) {
    rec.action = 'BUY';
  } else if (rec.confidence >= 40) {
    rec.action = 'WATCH';
  } else {
    rec.action = 'PASS';
  }

  return rec;
}

/**
 * Format a recommendation as a Telegram message.
 */
export function formatRecommendation(alert, rec) {
  const price = typeof alert.price === 'object'
    ? `${alert.price.currency === 'EUR' ? '€' : '$'}${alert.price.amount.toLocaleString()}`
    : alert.price;

  const emoji = rec.action === 'BUY' ? '🟢' : rec.action === 'WATCH' ? '🟡' : '🔴';
  const game = alert.gameName || alert.game || '?';

  let msg = `${emoji} **${rec.action}** — ${rec.confidence}% confidence\n`;
  msg += `\n🃏 **${alert.title}**\n`;
  msg += `🎮 ${game} | ${alert.platform || '?'}\n`;
  msg += `💰 ${price}\n`;

  if (rec.evSummary) msg += `📊 ${rec.evSummary}\n`;
  if (rec.pricingContext) msg += `📈 ${rec.pricingContext}\n`;

  if (rec.reasons.length > 0) {
    msg += `\n✅ **Why:**\n`;
    for (const r of rec.reasons) msg += `  • ${r}\n`;
  }

  if (rec.risks.length > 0) {
    msg += `\n⚠️ **Risks:**\n`;
    for (const r of rec.risks) msg += `  • ${r}\n`;
  }

  const url = alert.affiliateUrl || alert.url;
  if (url) msg += `\n🔗 ${url}`;

  return msg;
}

/**
 * Generate Telegram inline keyboard for a recommendation.
 */
export function getButtons(alertId, rec) {
  if (rec.action === 'BUY') {
    return [
      [
        { text: '✅ Buy (HOLD)', callback_data: `card_buy_hold_${alertId}` },
        { text: '🔄 Buy (FLIP)', callback_data: `card_buy_flip_${alertId}` },
      ],
      [
        { text: '👀 Watch', callback_data: `card_watch_${alertId}` },
        { text: '❌ Pass', callback_data: `card_pass_${alertId}` },
      ],
    ];
  } else if (rec.action === 'WATCH') {
    return [
      [
        { text: '✅ Buy Anyway', callback_data: `card_buy_hold_${alertId}` },
        { text: '👀 Watch', callback_data: `card_watch_${alertId}` },
      ],
      [
        { text: '❌ Pass', callback_data: `card_pass_${alertId}` },
      ],
    ];
  } else {
    return [
      [
        { text: '✅ Buy Anyway', callback_data: `card_buy_hold_${alertId}` },
        { text: '❌ Confirmed Pass', callback_data: `card_pass_${alertId}` },
      ],
    ];
  }
}

// ── Sell Signal Detection ────────────────────────────────────────────

/**
 * Check portfolio for cards that should be sold or relisted.
 */
export function checkSellSignals() {
  const signals = [];
  const cards = listCards({ status: 'FLIP' });

  for (const card of cards) {
    if (!card.buy_price || !card.current_value) continue;

    const plPct = ((card.current_value - card.buy_price) / card.buy_price) * 100;
    const daysSinceBuy = card.buy_date
      ? Math.ceil((Date.now() - new Date(card.buy_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Profit target hit
    if (plPct >= 30) {
      signals.push({
        type: 'SELL_TARGET',
        card,
        message: `📈 ${card.title} is up ${Math.round(plPct)}% — sell target hit!`,
        urgency: 'HIGH',
      });
    }

    // Stale card (60+ days, no movement)
    if (daysSinceBuy >= 60 && plPct < 10) {
      signals.push({
        type: 'STALE',
        card,
        message: `🐢 ${card.title} has been in portfolio ${daysSinceBuy} days with only ${Math.round(plPct)}% gain — consider relisting with discount`,
        urgency: 'MEDIUM',
      });
    }

    // Loss cut (down 20%+ after 30 days)
    if (daysSinceBuy >= 30 && plPct <= -20) {
      signals.push({
        type: 'LOSS_CUT',
        card,
        message: `📉 ${card.title} is down ${Math.round(Math.abs(plPct))}% after ${daysSinceBuy} days — consider cutting losses`,
        urgency: 'HIGH',
      });
    }
  }

  // Also check HOLD cards for massive spikes
  const holdCards = listCards({ status: 'HOLD' });
  for (const card of holdCards) {
    if (!card.buy_price || !card.current_value) continue;
    const plPct = ((card.current_value - card.buy_price) / card.buy_price) * 100;

    if (plPct >= 100) {
      signals.push({
        type: 'HOLD_SPIKE',
        card,
        message: `🚀 HOLD card ${card.title} has DOUBLED (+${Math.round(plPct)}%) — still holding?`,
        urgency: 'LOW', // It's a HOLD, just informing
      });
    }
  }

  return signals;
}

// ── Daily Brief ──────────────────────────────────────────────────────

/**
 * Generate a daily portfolio brief for Telegram.
 */
export function generateDailyBrief() {
  const summary = getPortfolioSummary();
  const signals = checkSellSignals();

  let msg = `📊 **Daily Portfolio Brief**\n`;
  msg += `${'─'.repeat(30)}\n\n`;

  msg += `🃏 **${summary.totalCards} cards** | €${summary.totalValue.toFixed(0)} value\n`;
  msg += `💰 Invested: €${summary.totalInvested.toFixed(0)}\n`;
  msg += `📈 Unrealized P&L: €${summary.unrealizedPL.toFixed(0)} (${summary.totalInvested > 0 ? Math.round((summary.unrealizedPL / summary.totalInvested) * 100) : 0}%)\n`;
  msg += `✅ Realized: €${summary.realizedProfit.toFixed(0)}\n`;
  msg += `❤️ Donated: €${summary.totalDonated.toFixed(2)} to MSA Research\n`;
  msg += `⚡ Speed: ${summary.speedRating}\n`;

  if (summary.bestPerformer) {
    msg += `\n🏆 Best: ${summary.bestPerformer.title} (${summary.bestPerformer.pl})`;
  }
  if (summary.worstPerformer && summary.worstPerformer.title !== summary.bestPerformer?.title) {
    msg += `\n💀 Worst: ${summary.worstPerformer.title} (${summary.worstPerformer.pl})`;
  }

  if (summary.byGame && Object.keys(summary.byGame).length > 0) {
    msg += `\n\n**By Game:**\n`;
    for (const [game, data] of Object.entries(summary.byGame).sort((a, b) => b[1].value - a[1].value)) {
      msg += `  ${game}: ${data.count} cards, €${data.value.toFixed(0)}\n`;
    }
  }

  if (signals.length > 0) {
    msg += `\n\n🔔 **${signals.length} Signal(s):**\n`;
    for (const sig of signals.sort((a, b) => (a.urgency === 'HIGH' ? 0 : 1) - (b.urgency === 'HIGH' ? 0 : 1))) {
      msg += `${sig.message}\n`;
    }
  }

  return msg;
}

// ── CLI ──────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('advisor.mjs')) {
  const cmd = process.argv[2];

  if (cmd === 'brief') {
    console.log(generateDailyBrief());
  } else if (cmd === 'signals') {
    const signals = checkSellSignals();
    if (signals.length === 0) {
      console.log('No sell signals right now.');
    } else {
      for (const s of signals) console.log(`[${s.urgency}] ${s.message}`);
    }
  } else if (cmd === 'analyze') {
    // Read latest alerts from monitor output
    const alertsFile = join(__dirname, 'alerts-log.json');
    if (!existsSync(alertsFile)) {
      console.log('No alerts log found. Run monitor first.');
      process.exit(1);
    }
    const raw = readFileSync(alertsFile, 'utf8').trim();
    const lines = raw.split('\n').filter(Boolean).slice(-5);
    for (const line of lines) {
      try {
        const alert = JSON.parse(line);
        const rec = analyzeForAdvisor(alert);
        console.log(formatRecommendation(alert, rec));
        console.log('---');
      } catch {}
    }
  } else {
    console.log('Usage: advisor.mjs [brief|signals|analyze]');
  }
}
