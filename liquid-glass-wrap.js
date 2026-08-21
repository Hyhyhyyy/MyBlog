/*
 * liquid-glass-wrap.js — applies a glass effect to a target DOM element.
 *
 * Two modes (via opts.magnify):
 *   - magnify: false (DEFAULT) → plain frosted glass:
 *       backdrop-filter: blur() saturate() brightness()  (no displacement / no zoom)
 *       This keeps the "glass texture" while the video behind stays clear & undistorted.
 *   - magnify: true → shuding/liquid-glass SVG displacement (liquid warp + refraction).
 *
 * Requires liquid-glass.js (window.LiquidGlass.Shader) only when magnify:true.
 */
(function () {
  'use strict';
  var HAS_SHADER = !!(window.LiquidGlass && window.LiquidGlass.Shader);

  function applyHostContext(el) {
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
  }

  // ---- plain frosted glass (no magnification) ----
  function attachFrosted(el, opts) {
    applyHostContext(el);
    var blur = opts.blur != null ? opts.blur : 8;
    var saturate = opts.saturate != null ? opts.saturate : 1.12;
    var brightness = opts.brightness != null ? opts.brightness : 1.03;
    var tint = opts.tint != null ? opts.tint : 'rgba(255,255,255,0.04)';
    var radius = opts.borderRadius != null ? opts.borderRadius : '0px';

    var overlay = document.createElement('div');
    overlay.className = 'glass-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    var bf = 'blur(' + blur + 'px) saturate(' + saturate + ') brightness(' + brightness + ')';
    overlay.style.cssText = [
      'position:absolute', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'overflow:hidden', 'pointer-events:none', 'z-index:0',
      'border-radius:' + radius,
      'background:' + tint,
      'backdrop-filter:' + bf,
      '-webkit-backdrop-filter:' + bf
    ].join(';');
    el.insertBefore(overlay, el.firstChild);

    return function dispose() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
  }

  // ---- liquid-glass magnification (shuding/liquid-glass) ----
  function attachMagnified(el, opts) {
    if (!HAS_SHADER) return function () {};
    applyHostContext(el);
    var frag = opts.fragment || function (uv) { return window.LiquidGlass.texture(uv.x, uv.y); };

    var initial = el.getBoundingClientRect();
    var shader = new window.LiquidGlass.Shader({
      width: Math.max(1, Math.round(initial.width)),
      height: Math.max(1, Math.round(initial.height)),
      fragment: frag
    });

    var radius = opts.borderRadius != null ? opts.borderRadius : (getComputedStyle(el).borderRadius || '12px');
    var bf = 'url(#' + shader.id + '_filter) blur(0.4px) contrast(1.25) brightness(1.05) saturate(1.15)';
    shader.container.style.borderRadius = radius;
    shader.container.style.backdropFilter = bf;
    shader.container.style.webkitBackdropFilter = bf;

    shader.mount(el);
    el.insertBefore(shader.container, el.firstChild);
    shader.container.style.background = opts.tint || 'rgba(255,255,255,0.06)';

    var needsUpdate = true;
    function syncRect() {
      var r = el.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      shader.container.style.width = w + 'px';
      shader.container.style.height = h + 'px';
      if (w !== shader.width || h !== shader.height) {
        shader.width = w; shader.height = h; needsUpdate = true;
      }
    }
    function tick() {
      syncRect();
      if (needsUpdate) { shader.updateShader(); needsUpdate = false; }
    }
    var ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(tick) : null;
    if (ro) ro.observe(el);
    window.addEventListener('scroll', syncRect, { passive: true });
    window.addEventListener('resize', tick);
    window.addEventListener('load', tick);
    requestAnimationFrame(tick);

    return function dispose() {
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', syncRect);
      window.removeEventListener('resize', tick);
      window.removeEventListener('load', tick);
      shader.destroy();
    };
  }

  function attachLiquidGlass(el, opts) {
    if (!el) return function () {};
    opts = opts || {};
    // Default: no magnification — just frosted glass texture.
    if (opts.magnify === true) return attachMagnified(el, opts);
    return attachFrosted(el, opts);
  }

  // Attach to a host, guarding against double-apply.
  function applyOnce(el, opts) {
    if (!el || el.querySelector(':scope > .glass-overlay') ||
        el.querySelector(':scope > [id^="liquid-glass-"][id$="_host"]')) {
      return;
    }
    attachLiquidGlass(el, opts);
  }

  function auto() {
    var nodes = document.querySelectorAll('.liquid-glass');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var o = n.dataset.liquidOpts ? JSON.parse(n.dataset.liquidOpts) : {};
      attachLiquidGlass(n, o);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else {
    auto();
  }

  window.attachLiquidGlass = attachLiquidGlass;
  window.applyGlassOnce = applyOnce;
})();
