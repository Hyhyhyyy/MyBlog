/* ============================================================
   ScrollStack (React Bits) — vanilla JS port
   - 忠实移植 window-scroll 分支的堆叠/pin 数学（与 React 版逐行一致）
   - 可选依赖 lenis（CDN）。若 window.Lenis 不存在则静默降级为原生滚动。
   - 通过 data-* 配置（见 DEFAULTS）。默认 useWindowScroll=true。
   用法：
     <div class="scroll-stack-scroller">
       <div class="scroll-stack-inner">
         <div class="scroll-stack-card"> ... </div>
         <div class="scroll-stack-card"> ... </div>
         <div class="scroll-stack-end"></div>
       </div>
     </div>
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    'item-distance': 100,
    'item-scale': 0.03,
    'item-stack-distance': 30,
    'stack-position': '20%',
    'scale-end-position': '10%',
    'base-scale': 0.85,
    'scale-duration': 0.5,
    'rotation-amount': 0,
    'blur-amount': 0
  };

  function attr(el, name, def) {
    var v = el.getAttribute('data-' + name);
    return v === null ? def : v;
  }
  function num(el, name, def) {
    var v = parseFloat(attr(el, name, def));
    return isNaN(v) ? def : v;
  }
  function parsePercentage(value, containerHeight) {
    if (typeof value === 'string' && value.indexOf('%') !== -1) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }
  function calculateProgress(scrollTop, start, end) {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }

  function initScrollStack(scroller) {
    if (!scroller || scroller._ssInited) return;
    scroller._ssInited = true;

    var itemDistance = num(scroller, 'item-distance', DEFAULTS['item-distance']);
    var itemScale = num(scroller, 'item-scale', DEFAULTS['item-scale']);
    var itemStackDistance = num(scroller, 'item-stack-distance', DEFAULTS['item-stack-distance']);
    var stackPosition = attr(scroller, 'stack-position', DEFAULTS['stack-position']);
    var scaleEndPosition = attr(scroller, 'scale-end-position', DEFAULTS['scale-end-position']);
    var baseScale = num(scroller, 'base-scale', DEFAULTS['base-scale']);
    var scaleDuration = num(scroller, 'scale-duration', DEFAULTS['scale-duration']);
    var rotationAmount = num(scroller, 'rotation-amount', DEFAULTS['rotation-amount']);
    var blurAmount = num(scroller, 'blur-amount', DEFAULTS['blur-amount']);

    var cards = Array.prototype.slice.call(scroller.querySelectorAll('.scroll-stack-card'));
    if (!cards.length) return;

    var transformsCache = new Map();
    var lastScrollTop = -1;

    cards.forEach(function (card, i) {
      if (i < cards.length - 1) {
        card.style.marginBottom = itemDistance + 'px';
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
    });

    function getScrollData() {
      return {
        scrollTop: window.pageYOffset || document.documentElement.scrollTop || 0,
        containerHeight: window.innerHeight
      };
    }
    function getElementOffset(el) {
      var rect = el.getBoundingClientRect();
      return rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
    }

    function updateCardTransforms() {
      var data = getScrollData();
      var scrollTop = data.scrollTop;
      var containerHeight = data.containerHeight;
      var stackPositionPx = parsePercentage(stackPosition, containerHeight);
      var scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);

      var endEl = scroller.querySelector('.scroll-stack-end');
      var endElementTop = endEl ? getElementOffset(endEl) : 0;

      cards.forEach(function (card, i) {
        var cardTop = getElementOffset(card);
        var triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
        var triggerEnd = cardTop - scaleEndPositionPx;
        var pinStart = cardTop - stackPositionPx - itemStackDistance * i;
        var pinEnd = endElementTop - containerHeight / 2;

        var scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
        var targetScale = baseScale + i * itemScale;
        var scale = 1 - scaleProgress * (1 - targetScale);
        var rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

        var blur = 0;
        if (blurAmount) {
          var topCardIndex = 0;
          for (var j = 0; j < cards.length; j++) {
            var jCardTop = getElementOffset(cards[j]);
            var jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
            if (scrollTop >= jTriggerStart) topCardIndex = j;
          }
          if (i < topCardIndex) {
            var depthInStack = topCardIndex - i;
            blur = Math.max(0, depthInStack * blurAmount);
          }
        }

        var translateY = 0;
        var isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isPinned) {
          translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
        } else if (scrollTop > pinEnd) {
          translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
        }

        var newTransform = {
          translateY: Math.round(translateY * 100) / 100,
          scale: Math.round(scale * 1000) / 1000,
          rotation: Math.round(rotation * 100) / 100,
          blur: Math.round(blur * 100) / 100
        };

        var last = transformsCache.get(i);
        var hasChanged = !last ||
          Math.abs(last.translateY - newTransform.translateY) > 0.1 ||
          Math.abs(last.scale - newTransform.scale) > 0.001 ||
          Math.abs(last.rotation - newTransform.rotation) > 0.1 ||
          Math.abs(last.blur - newTransform.blur) > 0.1;

        if (hasChanged) {
          var transform = 'translate3d(0,' + newTransform.translateY + 'px,0) scale(' +
            newTransform.scale + ') rotate(' + newTransform.rotation + 'deg)';
          var filter = newTransform.blur > 0 ? 'blur(' + newTransform.blur + 'px)' : '';
          card.style.transform = transform;
          card.style.filter = filter;
          transformsCache.set(i, newTransform);
        }
      });
    }

    function loop() {
      var st = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (st !== lastScrollTop) {
        lastScrollTop = st;
        updateCardTransforms();
      }
      requestAnimationFrame(loop);
    }

    // 原生滚动兜底 + 持续 rAF 校正（保证任何滚动方式下都正确）
    window.addEventListener('scroll', updateCardTransforms, { passive: true });
    window.addEventListener('resize', updateCardTransforms);
    updateCardTransforms();
    requestAnimationFrame(loop);

    // 可选：Lenis 平滑滚动（React Bits 依赖项）。缺失则降级原生。
    try {
      if (typeof window.Lenis === 'function') {
        var lenis = new window.Lenis({
          duration: 1.2,
          easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          smoothWheel: true
        });
        (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
        lenis.on('scroll', updateCardTransforms);
      }
    } catch (e) { /* 降级原生滚动 */ }
  }

  function initAll() {
    var list = document.querySelectorAll('.scroll-stack-scroller');
    for (var i = 0; i < list.length; i++) initScrollStack(list[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.ScrollStack = { init: initScrollStack };
})();
