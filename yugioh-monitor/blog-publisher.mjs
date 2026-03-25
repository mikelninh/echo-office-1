#!/usr/bin/env node
/**
 * blog-publisher.mjs — Card Sniper Alpha Blog Publishing Pipeline
 *
 * Reads editorial-calendar.json, finds posts whose publishAt date <= today,
 * generates a fully self-contained blog.html in echo-office/, and optionally
 * announces newly published posts to the Telegram paid channel.
 *
 * Usage:
 *   node blog-publisher.mjs              — publish due posts, generate HTML
 *   node blog-publisher.mjs --dry-run    — show what would publish, no write
 *   node blog-publisher.mjs --all        — force-include all posts regardless of date
 *   node blog-publisher.mjs --announce   — also send Telegram announcement for new posts
 *   node blog-publisher.mjs --stats      — print editorial calendar stats
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CALENDAR_FILE = join(__dirname, 'editorial-calendar.json');
const OUTPUT_FILE   = join(__dirname, '../../echo-office/blog.html');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8675912510:AAFwKtU2WoheIrjtGUHa8gpZRH2AQ2Pkzt8';
const TELEGRAM_CHANNEL   = process.env.TELEGRAM_CHANNEL_PAID || '-1003702806533';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadCalendar() {
  if (!existsSync(CALENDAR_FILE)) throw new Error('editorial-calendar.json not found');
  return JSON.parse(readFileSync(CALENDAR_FILE, 'utf8'));
}

function saveCalendar(cal) {
  writeFileSync(CALENDAR_FILE, JSON.stringify(cal, null, 2));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isDue(post, forceAll = false) {
  if (forceAll) return true;
  return post.publishAt <= todayStr();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBodyParagraphs(bodyArr) {
  return bodyArr.map(para => {
    // Bold text: **text** → <strong>text</strong>
    const withBold = para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Check if it's a section header (ends in nothing but starts bold)
    if (para.startsWith('**') && para.endsWith('**') && para.indexOf('**', 2) === para.length - 2) {
      return `<h3 class="body-h3">${withBold.replace(/<\/?strong>/g, '')}</h3>`;
    }
    return `<p>${withBold}</p>`;
  }).join('\n');
}

function categoryColor(cat) {
  const map = {
    'Strategy':   '#ff4d6d',
    'Investment': '#ffd60a',
    'Education':  '#06d6a0',
    'Case Study': '#4cc9f0',
    'Technology': '#b5179e',
    'Markets':    '#f77f00',
  };
  return map[cat] || '#888';
}

// ── Telegram Announce ─────────────────────────────────────────────────────────

async function announcePost(post) {
  const text = [
    `📝 <b>New on the Card Sniper Blog</b>`,
    ``,
    `<b>${post.title}</b>`,
    `<i>${post.subtitle}</i>`,
    ``,
    `${post.excerpt}`,
    ``,
    `🔗 <a href="https://cardsniperalpha.com/blog.html#${post.slug}">Read the full post →</a>`,
    ``,
    `<i>Subscribers get early access to new posts. Share this with anyone who collects.</i>`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({
    chat_id: TELEGRAM_CHANNEL,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!data.ok) {
      console.error('[blog-publisher] ❌ Telegram error:', JSON.stringify(data));
      return false;
    }
    console.log(`[blog-publisher] 📣 Announced: "${post.title}"`);
    return true;
  } catch (err) {
    console.error('[blog-publisher] ❌ Network error:', err.message);
    return false;
  }
}

// ── HTML Generator ────────────────────────────────────────────────────────────

function generateBlogHtml(posts, calendar) {
  const categories = [...new Set(posts.map(p => p.category))].sort();

  const articleCards = posts.map((post, idx) => {
    const catColor = categoryColor(post.category);
    const tagsHtml = post.tags.slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    return `
    <article class="article-card" id="${escapeHtml(post.slug)}" data-category="${escapeHtml(post.category)}" onclick="openPost(${idx})">
      <div class="card-hero-icon">${post.hero}</div>
      <div class="card-body">
        <div class="card-meta">
          <span class="cat-badge" style="background:${catColor}22;color:${catColor};border-color:${catColor}44">${escapeHtml(post.category)}</span>
          <span class="read-time">${post.readTime} min read</span>
          <span class="pub-date">${formatDate(post.publishAt)}</span>
        </div>
        <h2 class="card-title">${escapeHtml(post.title)}</h2>
        <p class="card-subtitle">${escapeHtml(post.subtitle)}</p>
        <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="card-footer">
          <div class="tags">${tagsHtml}</div>
          <button class="read-btn">Read article →</button>
        </div>
      </div>
    </article>`;
  }).join('\n');

  const modalArticles = posts.map((post, idx) => {
    const catColor = categoryColor(post.category);
    const bodyHtml = renderBodyParagraphs(post.body);
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    return `
    <div class="modal-content" id="modal-${idx}" style="display:none">
      <div class="modal-meta">
        <span class="cat-badge" style="background:${catColor}22;color:${catColor};border-color:${catColor}44">${escapeHtml(post.category)}</span>
        <span class="read-time">${post.readTime} min read</span>
        <span class="pub-date">${formatDate(post.publishAt)}</span>
      </div>
      <div class="modal-hero-icon">${post.hero}</div>
      <h1 class="modal-title">${escapeHtml(post.title)}</h1>
      <p class="modal-subtitle">${escapeHtml(post.subtitle)}</p>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      <div class="modal-tags">${tagsHtml}</div>
      <div class="modal-cta">
        <div class="cta-box">
          <div class="cta-eyebrow">⚡ Get real-time deal alerts</div>
          <h3>Card Sniper Alpha</h3>
          <p>Our scanner watches 1,000+ eBay listings daily. When a deal scores ≥80, you get the alert — in real time.</p>
          <a href="https://t.me/CardSniperAlphaBot" class="cta-btn" target="_blank">Join from €19/month →</a>
        </div>
      </div>
    </div>`;
  }).join('\n');

  const categoryFilters = ['All', ...categories].map(cat => 
    `<button class="filter-btn ${cat === 'All' ? 'active' : ''}" onclick="filterCat('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>`
  ).join('\n    ');

  const totalPosts = posts.length;
  const totalReadTime = posts.reduce((s, p) => s + p.readTime, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — Card Sniper Alpha | TCG Grading Arb Intelligence</title>
<meta name="description" content="In-depth guides on Pokémon grading arbitrage, PSA population strategy, and TCG card investing. Real tactics from the Card Sniper Alpha team.">
<meta property="og:title" content="Card Sniper Alpha Blog — Grading Arb Intelligence">
<meta property="og:description" content="Deep guides on grading arb, PSA strategy, and TCG card investing.">
<meta property="og:image" content="https://card-sniper-production.up.railway.app/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://cardsniperalpha.com/blog.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg:       #080810;
    --surface:  #0f0f1a;
    --surface2: #161625;
    --border:   rgba(255,255,255,0.08);
    --text:     #e8e8f0;
    --muted:    rgba(255,255,255,0.45);
    --accent:   #ff4d6d;
    --gold:     #ffd60a;
    --green:    #06d6a0;
    --cyan:     #4cc9f0;
    --radius:   12px;
  }

  html { scroll-behavior: smooth; }
  body {
    font-family: 'Space Grotesk', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
  }

  /* ── Nav ── */
  nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(8,8,16,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    height: 64px;
  }
  .nav-logo { font-family: 'Space Mono', monospace; font-weight: 700; font-size: 18px; text-decoration: none; color: var(--text); }
  .nav-logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 8px; align-items: center; }
  .nav-links a {
    color: var(--muted); font-size: 14px; text-decoration: none;
    padding: 6px 12px; border-radius: 8px; transition: all 0.2s;
  }
  .nav-links a:hover, .nav-links a.active { color: var(--text); background: var(--surface2); }
  .nav-cta {
    background: var(--accent); color: white; padding: 8px 18px;
    border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;
    transition: opacity 0.2s;
  }
  .nav-cta:hover { opacity: 0.85; }

  /* ── Hero ── */
  .blog-hero {
    padding: 80px 24px 60px;
    text-align: center;
    max-width: 800px; margin: 0 auto;
  }
  .hero-eyebrow {
    font-size: 12px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--accent);
    margin-bottom: 20px;
  }
  .hero-title {
    font-size: clamp(36px, 6vw, 64px);
    font-weight: 700; line-height: 1.1;
    margin-bottom: 20px;
  }
  .hero-title em { color: var(--gold); font-style: normal; }
  .hero-sub {
    font-size: 18px; color: var(--muted); max-width: 560px; margin: 0 auto 32px;
  }
  .hero-stats {
    display: flex; gap: 32px; justify-content: center;
    flex-wrap: wrap;
  }
  .hero-stat { text-align: center; }
  .hero-stat .num { font-size: 28px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--gold); }
  .hero-stat .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }

  /* ── Filters ── */
  .filters-bar {
    max-width: 1200px; margin: 0 auto;
    padding: 0 24px 32px;
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  }
  .filters-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-right: 4px; }
  .filter-btn {
    background: var(--surface); border: 1px solid var(--border);
    color: var(--muted); font-family: 'Space Grotesk', sans-serif;
    font-size: 13px; padding: 6px 14px; border-radius: 20px;
    cursor: pointer; transition: all 0.2s;
  }
  .filter-btn:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
  .filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

  /* ── Grid ── */
  .articles-grid {
    max-width: 1200px; margin: 0 auto;
    padding: 0 24px 80px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
  }

  /* ── Article Card ── */
  .article-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s;
    display: flex; flex-direction: column;
  }
  .article-card:hover {
    border-color: rgba(255,255,255,0.18);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .article-card.hidden { display: none; }

  .card-hero-icon {
    font-size: 48px;
    background: var(--surface2);
    padding: 28px 24px;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }

  .card-body { padding: 24px; display: flex; flex-direction: column; flex: 1; }
  .card-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }

  .cat-badge {
    font-size: 11px; font-weight: 700; padding: 3px 10px;
    border-radius: 20px; border: 1px solid; text-transform: uppercase; letter-spacing: 0.06em;
  }
  .read-time, .pub-date { font-size: 12px; color: var(--muted); }

  .card-title { font-size: 18px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
  .card-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 12px; }
  .card-excerpt { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; flex: 1; margin-bottom: 20px; }

  .card-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: auto; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag {
    font-size: 11px; color: var(--muted);
    background: var(--surface2); border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 4px;
  }
  .read-btn {
    background: none; border: 1px solid var(--accent); color: var(--accent);
    font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600;
    padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s;
    white-space: nowrap;
  }
  .read-btn:hover { background: var(--accent); color: white; }

  /* ── Modal Overlay ── */
  .modal-overlay {
    display: none; position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    overflow-y: auto;
    padding: 40px 16px;
  }
  .modal-overlay.open { display: flex; justify-content: center; align-items: flex-start; }

  .modal-wrapper {
    background: var(--surface); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px; max-width: 780px; width: 100%;
    position: relative;
  }
  .modal-close {
    position: absolute; top: 20px; right: 20px;
    background: var(--surface2); border: 1px solid var(--border); color: var(--muted);
    font-size: 20px; width: 40px; height: 40px; border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; z-index: 10;
  }
  .modal-close:hover { color: var(--text); border-color: rgba(255,255,255,0.3); }

  .modal-content { padding: 48px 48px 40px; }
  @media (max-width: 600px) { .modal-content { padding: 32px 24px 32px; } }

  .modal-hero-icon { font-size: 56px; margin-bottom: 24px; text-align: center; }
  .modal-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
  .modal-title { font-size: clamp(24px, 4vw, 36px); font-weight: 700; line-height: 1.2; margin-bottom: 14px; }
  .modal-subtitle { font-size: 17px; color: var(--muted); line-height: 1.5; margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }

  .modal-body { line-height: 1.8; }
  .modal-body p { margin-bottom: 18px; color: rgba(255,255,255,0.82); font-size: 16px; }
  .modal-body h3.body-h3 {
    font-size: 17px; font-weight: 700; color: var(--gold);
    margin: 28px 0 12px; letter-spacing: -0.01em;
  }
  .modal-body strong { color: var(--text); }

  .modal-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border); }

  /* ── Modal CTA ── */
  .modal-cta { margin-top: 32px; }
  .cta-box {
    background: linear-gradient(135deg, rgba(255,77,109,0.12), rgba(255,214,10,0.06));
    border: 1px solid rgba(255,77,109,0.3);
    border-radius: 12px; padding: 28px; text-align: center;
  }
  .cta-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 10px; }
  .cta-box h3 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
  .cta-box p { color: var(--muted); font-size: 14px; margin-bottom: 20px; }
  .cta-btn {
    display: inline-block; background: var(--accent); color: white;
    padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 15px;
    text-decoration: none; transition: opacity 0.2s;
  }
  .cta-btn:hover { opacity: 0.85; }

  /* ── Sidebar subscribe strip ── */
  .subscribe-strip {
    background: linear-gradient(135deg, var(--surface2), #1a0a1a);
    border-top: 1px solid rgba(255,77,109,0.25);
    border-bottom: 1px solid rgba(255,77,109,0.25);
    padding: 48px 24px;
    text-align: center;
    margin-bottom: 48px;
  }
  .subscribe-strip h2 { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
  .subscribe-strip h2 em { color: var(--accent); font-style: normal; }
  .subscribe-strip p { color: var(--muted); max-width: 480px; margin: 0 auto 24px; font-size: 15px; }
  .subscribe-strip a {
    display: inline-block; background: var(--accent); color: white;
    padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;
    text-decoration: none; margin-right: 12px; transition: opacity 0.2s;
  }
  .subscribe-strip a:hover { opacity: 0.85; }
  .subscribe-strip .sub-note { display: block; margin-top: 12px; font-size: 12px; color: var(--muted); }

  /* ── Footer ── */
  footer {
    border-top: 1px solid var(--border);
    padding: 32px 24px;
    text-align: center;
    color: var(--muted); font-size: 13px;
  }
  footer a { color: var(--muted); }
</style>
</head>
<body>

<!-- Nav -->
<nav>
  <a href="/" class="nav-logo">Card<span>Sniper</span>.ai</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/wins.html">Wins</a>
    <a href="/free.html">Free Tier</a>
    <a href="/blog.html" class="active">Blog</a>
    <a href="https://t.me/CardSniperAlphaBot" class="nav-cta" target="_blank">Join Alpha →</a>
  </div>
</nav>

<!-- Hero -->
<header class="blog-hero">
  <div class="hero-eyebrow">📖 Card Sniper Intelligence</div>
  <h1 class="hero-title">Grading Arb.<br><em>Explained.</em></h1>
  <p class="hero-sub">Deep dives on Pokémon card investing, PSA strategy, and the math behind every deal. No fluff — just the edge.</p>
  <div class="hero-stats">
    <div class="hero-stat">
      <div class="num">${totalPosts}</div>
      <div class="label">Articles</div>
    </div>
    <div class="hero-stat">
      <div class="num">${totalReadTime}</div>
      <div class="label">Min of reading</div>
    </div>
    <div class="hero-stat">
      <div class="num">7</div>
      <div class="label">TCGs covered</div>
    </div>
    <div class="hero-stat">
      <div class="num">Free</div>
      <div class="label">Always</div>
    </div>
  </div>
</header>

<!-- Category Filters -->
<div class="filters-bar">
  <span class="filters-label">Filter:</span>
  ${categoryFilters}
</div>

<!-- Article Grid -->
<main class="articles-grid" id="articles-grid">
  ${articleCards}
</main>

<!-- Subscribe Strip -->
<section class="subscribe-strip">
  <h2>Ready for <em>real-time</em> alerts?</h2>
  <p>The blog tells you what to look for. Card Sniper Alpha finds it — live — and sends you the deal before anyone else sees it.</p>
  <a href="https://t.me/CardSniperAlphaBot" target="_blank">Start for €19/month →</a>
  <a href="/free.html" style="background:var(--surface2);border:1px solid var(--border)">Try free tier →</a>
  <span class="sub-note">Free tier: 48h delayed alerts, no credit card needed</span>
</section>

<!-- Modal Overlay -->
<div class="modal-overlay" id="modal-overlay" onclick="closeModal(event)">
  <div class="modal-wrapper" id="modal-wrapper">
    <button class="modal-close" onclick="closePost()" title="Close">✕</button>
    ${modalArticles}
  </div>
</div>

<footer>
  <p>© 2026 Card Sniper Alpha · <a href="/">cardsniperalpha.com</a> · <a href="https://t.me/CardSniperAlphaBot" target="_blank">Telegram</a></p>
  <p style="margin-top:8px;font-size:11px">Not financial advice. All card values are estimates based on recent sold comps. Grading outcomes are probabilistic.</p>
</footer>

<script>
  // ── State ─────────────────────────────────────────────────────────────
  let currentPostIdx = null;

  // ── Category filter ───────────────────────────────────────────────────
  function filterCat(cat) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === cat);
    });
    document.querySelectorAll('.article-card').forEach(card => {
      const matches = cat === 'All' || card.dataset.category === cat;
      card.classList.toggle('hidden', !matches);
    });
  }

  // ── Open / close article modal ────────────────────────────────────────
  function openPost(idx) {
    // Hide all modal contents
    document.querySelectorAll('.modal-content').forEach(el => el.style.display = 'none');
    // Show the target
    const content = document.getElementById('modal-' + idx);
    if (content) {
      content.style.display = 'block';
      currentPostIdx = idx;
    }
    // Open overlay
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    // Scroll modal wrapper to top
    document.getElementById('modal-wrapper').scrollTop = 0;
    // Update URL hash
    const cards = document.querySelectorAll('.article-card');
    if (cards[idx]) {
      const slug = cards[idx].id;
      history.replaceState(null, '', '#' + slug);
    }
  }

  function closePost() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
    currentPostIdx = null;
    history.replaceState(null, '', window.location.pathname);
  }

  function closeModal(event) {
    // Only close if clicking the overlay background itself
    if (event.target === document.getElementById('modal-overlay')) {
      closePost();
    }
  }

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && currentPostIdx !== null) closePost();
  });

  // ── Deep link via URL hash ────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        const cards = Array.from(document.querySelectorAll('.article-card'));
        const idx = cards.indexOf(target);
        if (idx >= 0) {
          setTimeout(() => openPost(idx), 200);
        }
      }
    }
  });
</script>
</body>
</html>`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function printStats(cal) {
  const today = todayStr();
  const posts = cal.posts;
  const published = posts.filter(p => p.publishAt <= today);
  const scheduled = posts.filter(p => p.publishAt > today);
  const announced = posts.filter(p => p.announced);

  console.log(`\n[blog-publisher] 📊 Editorial Calendar Stats`);
  console.log(`  Total posts:    ${posts.length}`);
  console.log(`  Published:      ${published.length} (≤ today: ${today})`);
  console.log(`  Scheduled:      ${scheduled.length}`);
  console.log(`  Announced:      ${announced.length}`);
  console.log(`\n  Published posts:`);
  published.forEach(p => {
    const flag = p.announced ? '✅' : '⏳';
    console.log(`    ${flag} [${p.publishAt}] ${p.title.slice(0, 60)}...`);
  });
  if (scheduled.length) {
    console.log(`\n  Upcoming:`);
    scheduled.forEach(p => console.log(`    📅 [${p.publishAt}] ${p.title.slice(0, 60)}...`));
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function publish({ dryRun = false, forceAll = false, announce = false, statsOnly = false } = {}) {
  console.log(`[blog-publisher] 🚀 Starting — ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);

  const cal = loadCalendar();

  if (statsOnly) {
    printStats(cal);
    return;
  }

  const today = todayStr();
  const duePosts = cal.posts.filter(p => isDue(p, forceAll));
  const newPosts  = duePosts.filter(p => !p.announced);

  console.log(`[blog-publisher] 📅 Today: ${today}`);
  console.log(`[blog-publisher] 📄 Due posts: ${duePosts.length} | Unannounced: ${newPosts.length}`);

  if (!duePosts.length) {
    console.log('[blog-publisher] ✅ No posts due yet. Nothing to generate.');
    return { published: 0, announced: 0 };
  }

  // Generate HTML
  if (dryRun) {
    console.log(`[blog-publisher] DRY RUN — would generate blog.html with ${duePosts.length} posts`);
    duePosts.forEach(p => console.log(`  - ${p.publishAt} [${p.category}] ${p.title}`));
  } else {
    const html = generateBlogHtml(duePosts, cal);
    writeFileSync(OUTPUT_FILE, html, 'utf8');
    console.log(`[blog-publisher] ✅ Generated: ${OUTPUT_FILE} (${Math.round(html.length / 1024)}KB, ${duePosts.length} posts)`);
  }

  // Announce new posts to Telegram
  let announced = 0;
  if (announce && newPosts.length > 0) {
    console.log(`[blog-publisher] 📣 Announcing ${newPosts.length} new post(s) to Telegram...`);
    for (const post of newPosts) {
      if (dryRun) {
        console.log(`[blog-publisher] DRY RUN — would announce: "${post.title}"`);
      } else {
        const ok = await announcePost(post);
        if (ok) {
          post.announced = true;
          announced++;
        }
        // Rate limit guard
        if (newPosts.indexOf(post) < newPosts.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    if (!dryRun) saveCalendar(cal);
  }

  console.log(`[blog-publisher] 🏁 Done. Posts rendered: ${duePosts.length} | Announced: ${announced}`);
  return { published: duePosts.length, announced };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun    = args.includes('--dry-run');
  const forceAll  = args.includes('--all');
  const announce  = args.includes('--announce');
  const statsOnly = args.includes('--stats');

  publish({ dryRun, forceAll, announce, statsOnly })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[blog-publisher] Fatal:', err);
      process.exit(1);
    });
}

export { publish };
