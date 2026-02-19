// Debug: find what's covering the screen
(function() {
  var all = document.querySelectorAll('canvas, div, section');
  var blocking = [];
  all.forEach(function(el) {
    var style = getComputedStyle(el);
    var z = parseInt(style.zIndex) || 0;
    var pos = style.position;
    var opacity = parseFloat(style.opacity);
    var bg = style.backgroundColor;
    if ((pos === 'fixed' || pos === 'absolute') && z > 10) {
      blocking.push({
        tag: el.tagName,
        id: el.id,
        class: el.className,
        z: z,
        opacity: opacity,
        bg: bg,
        display: style.display,
        visibility: style.visibility,
        width: el.offsetWidth,
        height: el.offsetHeight,
        pointerEvents: style.pointerEvents
      });
    }
  });
  console.log('=== OVERLAY DEBUG ===');
  blocking.sort(function(a,b) { return b.z - a.z; });
  blocking.forEach(function(b) {
    console.log(JSON.stringify(b));
  });
  
  // Also check all canvases
  var canvases = document.querySelectorAll('canvas');
  console.log('=== ALL CANVASES ===');
  canvases.forEach(function(c) {
    var s = getComputedStyle(c);
    console.log('Canvas:', c.id || '(no id)', c.width + 'x' + c.height, 'z:', s.zIndex, 'pos:', s.position, 'opacity:', s.opacity, 'display:', s.display);
  });
})();
