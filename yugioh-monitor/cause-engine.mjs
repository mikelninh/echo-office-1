#!/usr/bin/env node
/**
 * Cause Engine — Automated donation tracking with Cardano integration
 * 
 * Every profitable trade auto-splits:
 *   60% → reinvest wallet
 *   20% → owner (Mikel)  
 *   10% → cause (Michael J. Fox Foundation)
 *   10% → reserve fund
 * 
 * Blockchain: Cardano (low fees, native assets, transparent)
 * 
 * Phase 1: Off-chain tracking with on-chain verification planned
 * Phase 2: Cardano smart contract (Plutus/Aiken) for automated splits
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createDonation, getTotalDonated } from './portfolio.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAUSE_STATE_FILE = join(__dirname, 'cause-state.json');

// ── Configuration ────────────────────────────────────────────────────

const SPLIT_CONFIG = {
  reinvest: 0.60,   // 60% back to trading wallet
  owner: 0.20,      // 20% to Mikel
  cause: 0.10,      // 10% to cause
  reserve: 0.10,    // 10% reserve fund
};

const CAUSE_CONFIG = {
  name: 'Michael J. Fox Foundation for Parkinson\'s Research',
  shortName: 'MJFF',
  mission: 'Funding the cure for Parkinson\'s disease and related alpha-synuclein disorders',
  website: 'https://www.michaeljfox.org',
  donateUrl: 'https://www.michaeljfox.org/donate',
  // Cardano wallet for on-chain donations (to be created)
  cardanoWallet: null, // Will be set when wallet is created
  // Why this cause: Mikel's mother has MSA (Multiple System Atrophy)
  // MSA and Parkinson's share alpha-synuclein protein misfolding pathology
  // MJFF is the largest nonprofit funder of PD research globally
  // Their research benefits MSA patients directly
  personal: 'For Mikel\'s mother — fighting alpha-synuclein, one trade at a time.',
};

const CARDANO_CONFIG = {
  network: 'mainnet', // 'preprod' for testing
  // Blockfrost API for Cardano chain queries
  blockfrostProjectId: process.env.BLOCKFROST_PROJECT_ID || null,
  blockfrostUrl: 'https://cardano-mainnet.blockfrost.io/api/v0',
  // Wallet addresses (to be generated)
  tradingWallet: process.env.CARDANO_TRADING_WALLET || null,
  causeWallet: process.env.CARDANO_CAUSE_WALLET || null,
  reserveWallet: process.env.CARDANO_RESERVE_WALLET || null,
  ownerWallet: process.env.CARDANO_OWNER_WALLET || null,
};

// ── State ────────────────────────────────────────────────────────────

function loadState() {
  if (existsSync(CAUSE_STATE_FILE)) {
    try { return JSON.parse(readFileSync(CAUSE_STATE_FILE, 'utf8')); } catch {}
  }
  return {
    totalProfit: 0,
    totalDonatedOffChain: 0,
    totalDonatedOnChain: 0,
    totalReinvested: 0,
    totalToOwner: 0,
    totalReserve: 0,
    splits: [], // history of all splits
    pendingDonation: 0, // accumulated but not yet sent on-chain
    lastSplitDate: null,
  };
}

function saveState(state) {
  writeFileSync(CAUSE_STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Split Logic ──────────────────────────────────────────────────────

/**
 * Process a profitable trade and split the profit.
 * Returns the split breakdown.
 */
export function splitProfit(profit, currency = 'EUR', tradeInfo = {}) {
  if (profit <= 0) return null;

  const state = loadState();
  
  const split = {
    date: new Date().toISOString(),
    profit: Math.round(profit * 100) / 100,
    currency,
    reinvest: Math.round(profit * SPLIT_CONFIG.reinvest * 100) / 100,
    owner: Math.round(profit * SPLIT_CONFIG.owner * 100) / 100,
    cause: Math.round(profit * SPLIT_CONFIG.cause * 100) / 100,
    reserve: Math.round(profit * SPLIT_CONFIG.reserve * 100) / 100,
    causeName: CAUSE_CONFIG.shortName,
    tradeTitle: tradeInfo.title || 'Unknown card',
    tradeId: tradeInfo.id || null,
    onChain: false, // Will be true when Cardano tx is sent
    txHash: null,
  };

  // Update totals
  state.totalProfit += split.profit;
  state.totalReinvested += split.reinvest;
  state.totalToOwner += split.owner;
  state.totalReserve += split.reserve;
  state.totalDonatedOffChain += split.cause;
  state.pendingDonation += split.cause;
  state.lastSplitDate = split.date;
  state.splits.push(split);

  // Keep last 1000 splits
  if (state.splits.length > 1000) {
    state.splits = state.splits.slice(-1000);
  }

  saveState(state);

  // Record in portfolio donations table
  createDonation({
    transaction_id: tradeInfo.txId || null,
    amount: split.cause,
    currency,
    cause: CAUSE_CONFIG.name,
  });

  return split;
}

// ── Cardano Integration ──────────────────────────────────────────────

/**
 * Check Cardano wallet balance via Blockfrost
 */
async function getWalletBalance(address) {
  if (!CARDANO_CONFIG.blockfrostProjectId || !address) return null;

  try {
    const res = await fetch(`${CARDANO_CONFIG.blockfrostUrl}/addresses/${address}`, {
      headers: { 'project_id': CARDANO_CONFIG.blockfrostProjectId },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const lovelace = data.amount?.find(a => a.unit === 'lovelace');
    return lovelace ? parseInt(lovelace.quantity) / 1_000_000 : 0; // ADA
  } catch { return null; }
}

/**
 * Get transaction history for a wallet
 */
async function getTransactionHistory(address, count = 10) {
  if (!CARDANO_CONFIG.blockfrostProjectId || !address) return [];

  try {
    const res = await fetch(`${CARDANO_CONFIG.blockfrostUrl}/addresses/${address}/transactions?count=${count}&order=desc`, {
      headers: { 'project_id': CARDANO_CONFIG.blockfrostProjectId },
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

/**
 * Send ADA to cause wallet (requires cardano-cli or lucid)
 * Phase 2: This will use Lucid (Cardano tx builder for JS)
 * For now, generates the transaction parameters for manual execution
 */
export function prepareDonationTx(amountADA) {
  if (!CARDANO_CONFIG.causeWallet) {
    return { error: 'Cause wallet not configured. Set CARDANO_CAUSE_WALLET env var.' };
  }

  return {
    from: CARDANO_CONFIG.tradingWallet,
    to: CARDANO_CONFIG.causeWallet,
    amount: `${amountADA} ADA`,
    amountLovelace: Math.round(amountADA * 1_000_000),
    network: CARDANO_CONFIG.network,
    note: `Card Trader donation to ${CAUSE_CONFIG.shortName}`,
    // For cardano-cli:
    cliCommand: [
      'cardano-cli', 'transaction', 'build',
      '--tx-in', '<UTXO>',
      '--tx-out', `${CARDANO_CONFIG.causeWallet}+${Math.round(amountADA * 1_000_000)}`,
      '--change-address', CARDANO_CONFIG.tradingWallet,
      `--${CARDANO_CONFIG.network}`,
    ].join(' '),
  };
}

// ── Reporting ────────────────────────────────────────────────────────

/**
 * Generate a cause impact report
 */
export function generateImpactReport() {
  const state = loadState();
  const dbDonated = getTotalDonated(CAUSE_CONFIG.name);

  const report = {
    cause: CAUSE_CONFIG.name,
    website: CAUSE_CONFIG.website,
    personal: CAUSE_CONFIG.personal,
    
    totalTradeProfit: Math.round(state.totalProfit * 100) / 100,
    totalDonated: Math.round((state.totalDonatedOffChain + state.totalDonatedOnChain) * 100) / 100,
    totalDonatedDb: Math.round(dbDonated * 100) / 100,
    pendingDonation: Math.round(state.pendingDonation * 100) / 100,
    
    splitBreakdown: {
      reinvested: Math.round(state.totalReinvested * 100) / 100,
      toOwner: Math.round(state.totalToOwner * 100) / 100,
      toCause: Math.round((state.totalDonatedOffChain + state.totalDonatedOnChain) * 100) / 100,
      reserve: Math.round(state.totalReserve * 100) / 100,
    },
    
    totalSplits: state.splits.length,
    lastSplit: state.lastSplitDate,
    
    onChainVerification: state.totalDonatedOnChain > 0
      ? `Verified on Cardano: ${state.totalDonatedOnChain} ADA`
      : 'On-chain verification pending (Phase 2)',
    
    recentSplits: state.splits.slice(-5).map(s => ({
      date: s.date.slice(0, 10),
      card: s.tradeTitle,
      profit: `€${s.profit}`,
      donated: `€${s.cause}`,
    })),
  };

  return report;
}

/**
 * Format impact report for Telegram
 */
export function formatImpactMessage() {
  const report = generateImpactReport();

  let msg = `❤️ **Impact Report — ${report.cause}**\n`;
  msg += `${'─'.repeat(35)}\n\n`;
  msg += `${report.personal}\n\n`;
  msg += `💰 Total trade profit: €${report.totalTradeProfit}\n`;
  msg += `❤️ Total donated: €${report.totalDonated}\n`;
  msg += `⏳ Pending donation: €${report.pendingDonation}\n\n`;

  msg += `**Split breakdown:**\n`;
  msg += `  🔄 Reinvested: €${report.splitBreakdown.reinvested}\n`;
  msg += `  👤 To owner: €${report.splitBreakdown.toOwner}\n`;
  msg += `  ❤️ To MJFF: €${report.splitBreakdown.toCause}\n`;
  msg += `  🏦 Reserve: €${report.splitBreakdown.reserve}\n\n`;

  msg += `📊 ${report.totalSplits} trades processed\n`;
  msg += `🔗 ${report.onChainVerification}\n\n`;

  if (report.recentSplits.length > 0) {
    msg += `**Recent donations:**\n`;
    for (const s of report.recentSplits) {
      msg += `  ${s.date}: ${s.card.slice(0, 40)} → ${s.donated}\n`;
    }
  }

  msg += `\n🌐 ${report.website}`;

  return msg;
}

// ── Aiken Smart Contract Blueprint ───────────────────────────────────
// (Cardano's modern smart contract language — replaces Plutus/Haskell)

export const AIKEN_CONTRACT_BLUEPRINT = `
// cause_splitter.ak — Cardano smart contract for automated profit splits
// Language: Aiken (https://aiken-lang.org)
// Deploy: cardano-cli + aiken build

use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction.{ScriptContext, Transaction, find_input, find_datum_else_fail}

// Split percentages in basis points (10000 = 100%)
const reinvest_bps = 6000  // 60%
const owner_bps = 2000     // 20%  
const cause_bps = 1000     // 10%
const reserve_bps = 1000   // 10%

type Datum {
  owner: Hash<Blake2b_224, VerificationKey>,
  cause_wallet: Hash<Blake2b_224, VerificationKey>,
  reserve_wallet: Hash<Blake2b_224, VerificationKey>,
  trade_id: ByteArray,
}

type Redeemer {
  SplitProfit
  WithdrawReserve
}

validator cause_splitter {
  spend(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) {
    let tx = ctx.transaction
    
    when redeemer is {
      SplitProfit -> {
        // Verify outputs match the split ratios
        // Each output must go to the correct wallet with correct amount
        let total_input = get_total_ada_input(tx)
        let expected_cause = total_input * cause_bps / 10000
        let expected_owner = total_input * owner_bps / 10000
        let expected_reserve = total_input * reserve_bps / 10000
        
        // Verify cause wallet receives its share
        expect Some(cause_output) = find_output_to(tx.outputs, datum.cause_wallet)
        expect cause_output.value >= expected_cause
        
        // Verify owner receives their share  
        expect Some(owner_output) = find_output_to(tx.outputs, datum.owner)
        expect owner_output.value >= expected_owner
        
        // Rest stays in contract (reinvest) or goes to reserve
        True
      }
      
      WithdrawReserve -> {
        // Only owner can withdraw reserve funds
        list.has(tx.extra_signatories, datum.owner)
      }
    }
  }
}
`;

// ── CLI ──────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('cause-engine.mjs')) {
  const cmd = process.argv[2];

  if (cmd === 'report') {
    console.log(formatImpactMessage());
  } else if (cmd === 'status') {
    const state = loadState();
    console.log('\n❤️ CAUSE ENGINE STATUS');
    console.log('='.repeat(40));
    console.log(`Cause: ${CAUSE_CONFIG.name}`);
    console.log(`Total profit processed: €${state.totalProfit.toFixed(2)}`);
    console.log(`Total donated: €${(state.totalDonatedOffChain + state.totalDonatedOnChain).toFixed(2)}`);
    console.log(`Pending on-chain: €${state.pendingDonation.toFixed(2)}`);
    console.log(`Splits processed: ${state.splits.length}`);
    console.log(`\nCardano wallet: ${CARDANO_CONFIG.causeWallet || 'Not configured'}`);
    console.log(`Blockfrost: ${CARDANO_CONFIG.blockfrostProjectId ? 'Connected' : 'Not configured'}`);
  } else if (cmd === 'simulate') {
    // Simulate a profitable trade
    const profit = parseFloat(process.argv[3] || '100');
    const split = splitProfit(profit, 'EUR', { title: 'Test Card', id: 'test-001' });
    console.log('\n🧪 SIMULATED SPLIT');
    console.log('='.repeat(40));
    console.log(`Profit: €${split.profit}`);
    console.log(`→ Reinvest: €${split.reinvest}`);
    console.log(`→ Owner: €${split.owner}`);
    console.log(`→ MJFF: €${split.cause}`);
    console.log(`→ Reserve: €${split.reserve}`);
  } else if (cmd === 'prepare-tx') {
    const amount = parseFloat(process.argv[3] || '0');
    const tx = prepareDonationTx(amount);
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`
Cause Engine — Automated donations via Cardano

Commands:
  status        Show cause engine status
  report        Generate impact report
  simulate <€>  Simulate a profit split
  prepare-tx <ADA>  Prepare Cardano donation transaction

Environment:
  BLOCKFROST_PROJECT_ID    Blockfrost API key for Cardano
  CARDANO_TRADING_WALLET   Trading wallet address
  CARDANO_CAUSE_WALLET     MJFF donation wallet address
  CARDANO_OWNER_WALLET     Owner wallet address
  CARDANO_RESERVE_WALLET   Reserve wallet address

Cause: ${CAUSE_CONFIG.name}
Personal: ${CAUSE_CONFIG.personal}
    `);
  }
}
