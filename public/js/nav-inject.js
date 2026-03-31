/**
 * nav-inject.js — Dynamic Nav Link Injector for Card Sniper Alpha
 *
 * PURPOSE: index.html has 43K+ lines and can't be edited directly.
 * This script — dropped in via a <script> tag — dynamically adds
 * missing nav links (EU Deals, Japan Arb, Blog, Free Tier) to the
 * existing nav bar on page load.
 *
 * USAGE: Add this to the bottom of index.html's <body>:
 *   <script src="nav-inject.js"></script>
 *
 * HOW TO ADD THE TAG:
 *   Open index.html, search for </body>, paste above it:
 *   <script src="nav-inject.js"></script>
 */

(function () {
  'use strict';

  // ── Config: Links to inject ──────────────────────────────────────────────
  const NAV_LINKS = [
    { label: 'Wins',         href: 'wins.html',        id: 'nav-inject-wins' },
    { label: 'EU Deals',     href: 'cardmarket.html',  id: 'nav-inject-eu' },
    { label: '🇯🇵 Japan Arb', href: 'japan-arb.html',   id: 'nav-inject-japan' },
    { label: 'Blog',         href: 'blog.html',        id: 'nav-inject-blog' },
    { label: 'Free Tier',    href: 'free.html',        id: 'nav-inject-free' },
  ];

  const CTA_LINK = { label: 'Get Alerts →', href: 'card-sniper.html', id: 'nav-inject-cta' };

  // ── Styles ───────────────────────────────────────────────────────────────
  const STYLE = `
    .nav-inject-link {
      color: #7070a0 !important;
      text-decoration: none !important;
      font-size: 0.875rem !important;
      transition: color 0.2s !important;
      font-family: 'Space Grotesk', sans-serif !important;
    }
    .nav-inject-link:hover {
      color: #e8e8f4 !important;
    }
    .nav-inject-cta {
      background: #ff4d6d !important;
      color: white !important;
      padding: 6px 14px !important;
      border-radius: 6px !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      transition: opacity 0.2s !important;
      font-family: 'Space Grotesk', sans-serif !important;
    }
    .nav-inject-cta:hover {
      opacity: 0.85 !important;
      color: white !important;
    }
  `;

  // ── Inject stylesheet ────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('nav-inject-styles')) return;
    const style = document.createElement('style');
    style.id = 'nav-inject-styles';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  // ── Find the nav link container ──────────────────────────────────────────
  function findNavContainer() {
    // Try known selectors in order of specificity
    const candidates = [
      '.nav-links',
      'nav .nav-inner > div:last-child',
      'nav ul',
      'nav > div > div:last-child',
      'header nav',
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Fallback: find any <nav> and look for a flex container
    const nav = document.querySelector('nav');
    if (!nav) return null;
    const divs = nav.querySelectorAll('div');
    for (const div of divs) {
      const links = div.querySelectorAll('a');
      if (links.length >= 1) return div;
    }
    return nav;
  }

  // ── Check if a link already exists in nav ───────────────────────────────
  function linkAlreadyInNav(container, href) {
    const all = document.querySelectorAll('nav a');
    for (const a of all) {
      if (a.getAttribute('href') === href) return true;
    }
    return false;
  }

  // ── Create a nav link element ────────────────────────────────────────────
  function makeLink(cfg, isCta) {
    const a = document.createElement('a');
    a.id = cfg.id;
    a.href = cfg.href;
    a.textContent = cfg.label;
    if (isCta) {
      a.className = 'nav-inject-cta';
    } else {
      a.className = 'nav-inject-link';
      // Mark active if current page
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (currentPage === cfg.href) {
        a.style.color = '#e8e8f4';
      }
    }
    return a;
  }

  // ── Main: inject missing nav links ──────────────────────────────────────
  function injectNav() {
    injectStyles();
    const container = findNavContainer();
    if (!container) {
      console.warn('[nav-inject] Could not find nav container. Skipping.');
      return;
    }

    let injected = 0;

    // Inject regular links
    for (const link of NAV_LINKS) {
      if (document.getElementById(link.id)) continue; // already injected
      if (linkAlreadyInNav(container, link.href)) continue; // already exists

      const a = makeLink(link, false);
      container.insertBefore(a, container.lastElementChild);
      injected++;
    }

    // Inject CTA (always last)
    if (!document.getElementById(CTA_LINK.id) && !linkAlreadyInNav(container, CTA_LINK.href)) {
      const cta = makeLink(CTA_LINK, true);
      container.appendChild(cta);
      injected++;
    }

    if (injected > 0) {
      console.log(`[nav-inject] Injected ${injected} nav link(s).`);
    }
  }

  // ── Run on DOM ready ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }

})();
