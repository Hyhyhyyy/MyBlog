/*
 * liquid-glass-wrap.js — applies shuding/liquid-glass to a target DOM element.
 * - Mirrors the element's bounding rect into a Shader instance (sized to match).
 * - Re-renders the displacement map on resize / scroll / DPR changes.
 * - Adds the standard liquid-glass backdrop-filter stack onto an overlay layer
 *   inside the element so the glass effect captures whatever sits behind.
 *
 * Usage:
 *   const dispose = attachLiquidGlass(el, { strength: 1.0 });
 *   // later: dispose();
 *
 * Requires liquid-glass.js to have already loaded (window.LiquidGlass.Shader).
 */
(function () {
  'use strict';
  if (!window.LiquidGlass) return;

  var LG = window.LiquidGlass;

  // Subtle "rounded-rect ripple" fragment — gentler than the original demo.
  function liquidFrag(uv, mouse) {
    var mx = mouse && typeof mouse.x === 'number' ? mouse.x : 0.5;
    var my = mouse && typeof mouse.y === 'number' ? mouse.y : 0.5;
    var ix = uv.x - 0.5;
    var iy = uv.y - 0.5;
    var d = LG.roundedRectSDF(ix, iy, 0.32, 0.25, 0.55);
    var disp = LG.smoothStep(0.85, 0, d - 0.12);
    var s = LG.smoothStep(0, 1, disp);
    var px = ix * s + 0.5;
    var py = iy * s + 0.5;
    // Gentle cursor pull — barely visible, gives life to glass.
    var pullX = (mx - 0.5) * 0.03 * disp;
    var pullY = (my - 0.5) * 0.03 * disp;
    return LG.texture(px + pullX, py + pullY);
  }

  function attachLiquidGlass(el, opts) {
    if (!el) return function () {};
    opts = opts || {};

    // Ensure host can host an absolute child.
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';

    var initial = el.getBoundingClientRect();
    var shader = new LG.Shader({
      width: Math.max(1, Math.round(initial.width)),
      height: Math.max(1, Math.round(initial.height)),
      fragment: opts.fragment || liquidFrag
    });

    // Visual styling for the glass overlay.
    var borderRadius = opts.borderRadius != null
      ? opts.borderRadius
      : (getComputedStyle(el).borderRadius || '12px');
    shader.container.style.borderRadius = borderRadius;
    shader.container.style.backdropFilter =
      'url(#' + shader.id + '_filter) blur(0.4px) contrast(1.25) brightness(1.05) saturate(1.15)';
    shader.container.style.webkitBackdropFilter =
      'url(#' + shader.id + '_filter) blur(0.4px) contrast(1.25) brightness(1.05) saturate(1.15)';

    // Insert the host as the FIRST child so it sits behind text content.
    shader.mount(el);
    el.insertBefore(shader.container, el.firstChild);

    // Faint base tint so the glass has body even when behind content is dark.
    var tint = opts.tint || 'rgba(255,255,255,0.06)';
    shader.container.style.background = tint;

    var needsUpdate = true;
    function syncRect() {
      var r = el.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      shader.container.style.width = w + 'px';
      shader.container.style.height = h + 'px';
      if (w !== shader.width || h !== shader.height) {
        shader.width = w;
        shader.height = h;
        needsUpdate = true;
      }
    }

    function tick() {
      syncRect();
      if (needsUpdate) {
        shader.updateShader();
        needsUpdate = false;
      }
    }

    var ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(tick) : null;
    if (ro) ro.observe(el);
    window.addEventListener('scroll', syncRect, { passive: true });
    window.addEventListener('resize', tick);
    window.addEventListener('load', tick);
    // First sync after layout settle (one rAF).
    requestAnimationFrame(tick);

    return function dispose() {
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', syncRect);
      window.removeEventListener('resize', tick);
      window.removeEventListener('load', tick);
      shader.destroy();
    };
  }

  // Convenience: auto-apply to `.liquid-glass` selectors on DOMContentLoaded.
  function auto() {
    var nodes = document.querySelectorAll('.liquid-glass');
    var disposers = [];
    for (var i = 0; i < nodes.length; i++) {
      disposers.push(attachLiquidGlass(nodes[i], nodes[i].dataset.liquidOpts ? JSON.parse(nodes[i].dataset.liquidOpts) : {}));
    }
    window.__liquidGlassDisposers = disposers;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else {
    auto();
  }

  window.attachLiquidGlass = attachLiquidGlass;
})();
