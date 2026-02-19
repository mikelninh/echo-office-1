// debug-overlay.js — Identify what's blocking the canvas view
// Load this script or paste in console. It will log:
// 1. All fixed/absolute elements covering >50% of the viewport
// 2. All canvas elements and their z-index
// 3. Current canvas globalAlpha state

(function debugOverlay() {
  console.log('=== OVERLAY DIAGNOSTIC ===');
  
  // 1. Find all overlay elements
  console.log('\n--- Fixed/Absolute Elements Covering Screen ---');
  var els = document.querySelectorAll('*');
  var found = 0;
  els.forEach(function(el) {
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    if (
      (style.position === 'fixed' || style.position === 'absolute') &&
      rect.width > window.innerWidth * 0.3 &&
      rect.height > window.innerHeight * 0.3 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0
    ) {
      var bg = style.backgroundColor || style.background;
      console.log(
        '🔴 ' + el.tagName + '#' + el.id + '.' + el.className.toString().split(' ')[0],
        '\n   z-index:', style.zIndex,
        '\n   size:', Math.round(rect.width) + 'x' + Math.round(rect.height),
        '\n   background:', bg.slice(0, 80),
        '\n   opacity:', style.opacity,
        '\n   pointer-events:', style.pointerEvents
      );
      found++;
    }
  });
  if (found === 0) console.log('None found.');
  
  // 2. All canvas elements
  console.log('\n--- Canvas Elements ---');
  var canvases = document.querySelectorAll('canvas');
  canvases.forEach(function(c) {
    var style = window.getComputedStyle(c);
    var rect = c.getBoundingClientRect();
    console.log(
      '🎨 canvas#' + c.id,
      '\n   size:', c.width + 'x' + c.height, '(CSS:', Math.round(rect.width) + 'x' + Math.round(rect.height) + ')',
      '\n   z-index:', style.zIndex,
      '\n   position:', style.position,
      '\n   opacity:', style.opacity,
      '\n   background:', style.backgroundColor
    );
    // Check if context has a stuck globalAlpha
    try {
      var ctx = c.getContext('2d');
      if (ctx) console.log('   globalAlpha:', ctx.globalAlpha, 'compositeOp:', ctx.globalCompositeOperation);
    } catch(e) {}
  });
  
  // 3. Check for common stuck overlays
  console.log('\n--- Known Overlay Checks ---');
  var ids = ['loader', 'welcome-overlay', 'cinematic-overlay', 'elevator-overlay', 
             'arcade-overlay', 'physics-breach-overlay', 'ring-map-canvas', 
             'vip-lounge-canvas', 'scanlines', 'elev-transition'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      var style = window.getComputedStyle(el);
      var visible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
      console.log(
        (visible ? '🔴' : '✅') + ' #' + id + ':',
        visible ? 'VISIBLE' : 'hidden',
        '| display:' + style.display,
        '| opacity:' + style.opacity,
        '| z-index:' + style.zIndex
      );
    }
  });
  
  // 4. Check for popup overlays
  var popups = document.querySelectorAll('.popup-overlay');
  console.log('\n--- Popup Overlays: ' + popups.length + ' ---');
  popups.forEach(function(p, i) {
    var style = window.getComputedStyle(p);
    console.log('  #' + i + ': display=' + style.display + ' opacity=' + style.opacity + ' z=' + style.zIndex);
  });

  // 5. Check ring-engine fade element
  var fadeEls = document.querySelectorAll('[style*="z-index:9990"], [style*="z-index: 9990"]');
  if (fadeEls.length > 0) {
    fadeEls.forEach(function(fe) {
      var bg = window.getComputedStyle(fe).backgroundColor;
      console.log('🔴 Ring-engine fade element:', bg, '| visible:', bg !== 'rgba(0, 0, 0, 0)');
    });
  }
  
  console.log('\n=== END DIAGNOSTIC ===');
  console.log('Tip: If you see a 🔴 canvas with globalAlpha < 1, that\'s the bug.');
  console.log('Tip: If you see a 🔴 div with background not transparent, that\'s blocking you.');
})();
