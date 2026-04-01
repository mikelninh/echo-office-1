/**
 * daily-deals.js — Module Bootstrapper
 * Echo's Vault · Nightly Build 2026-04-01
 *
 * This file is already referenced in index.html.
 * It loads additional enhancement modules that were created
 * after index.html was finalized.
 */
(function () {
  'use strict';

  const MODULES = [
    'public/js/observatory-deepspace.js',
  ];

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      // Don't double-inject
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => {
        console.warn('[daily-deals] Could not load module:', src);
        resolve(); // non-fatal
      };
      document.head.appendChild(s);
    });
  }

  function init() {
    MODULES.reduce((p, src) => p.then(() => injectScript(src)), Promise.resolve());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
