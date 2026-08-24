/* ============================================================
   实用工具箱 — 交互
   1) 点击展开 = 全屏专注（锁滚动，收起才滑）— 主交互
   2) 滚动层叠装饰：卡片滚过顶部时轻微缩放/上移/微旋转，营造 ScrollStack 卡组观感
      - 纯 transform 装饰，卡片仍在文档流、互不叠盖 → 不遮挡内容
      - rAF 批处理 + 先读后写，杜绝每帧重排卡顿 → 丝滑
   ============================================================ */
(function () {
  'use strict';

  var savedY = 0;

  function lockScroll() {
    savedY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    var b = document.body;
    b.style.position = 'fixed';
    b.style.top = '-' + savedY + 'px';
    b.style.left = '0';
    b.style.right = '0';
    b.style.width = '100%';
  }

  function unlockScroll() {
    var b = document.body;
    b.style.position = '';
    b.style.top = '';
    b.style.left = '';
    b.style.right = '';
    b.style.width = '';
    window.scrollTo(0, savedY);
  }

  function collapse(card) {
    if (!card) return;
    card.classList.remove('is-expanded');
    document.body.classList.remove('card-focus');
    unlockScroll();
    requestAnimationFrame(updateDecoration);
  }

  function expand(card) {
    if (!card || card.classList.contains('is-expanded')) return;
    var current = document.querySelector('.scroll-stack-card.is-expanded');
    if (current && current !== card) collapse(current);

    lockScroll();
    document.body.classList.add('card-focus');
    card.classList.add('is-expanded');
    card.scrollTop = 0;
    var closeBtn = card.querySelector('.card-expand-close');
    if (closeBtn) closeBtn.focus();
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 滚动层叠装饰 ----------
  function updateDecoration() {
    var cards = document.querySelectorAll('.scroll-stack-card');
    var vh = window.innerHeight;
    if (!cards.length) return;
    // 先批量读取，避免读-写交错触发重排
    var rects = [];
    for (var k = 0; k < cards.length; k++) rects.push(cards[k].getBoundingClientRect());
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.classList.contains('is-expanded')) continue;
      var top = rects[i].top;
      // 卡片顶部进入视口顶部 15% 后开始"收进卡组"，越过 -50% 视口时收到底
      var start = vh * 0.15;
      var end = -vh * 0.5;
      var t = clamp((start - top) / (start - end), 0, 1);
      var scale = 1 - 0.16 * t;     // 最多缩小 16%
      var ty = -28 * t;             // 微微上移
      var rot = -2 * t;             // 轻微旋转
      c.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)';
    }
  }

  var ticking = false;
  var lastY = -1;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y === lastY) return;
    lastY = y;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { ticking = false; updateDecoration(); });
    }
  }

  function init() {
    var cards = document.querySelectorAll('.scroll-stack-card');
    cards.forEach(function (card) {
      var openBtn = card.querySelector('.card-expand-btn');
      var closeBtn = card.querySelector('.card-expand-close');
      if (openBtn) openBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); expand(card); });
      if (closeBtn) closeBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); collapse(card); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        var current = document.querySelector('.scroll-stack-card.is-expanded');
        if (current) collapse(current);
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateDecoration);
    updateDecoration();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ScrollStack = { expand: expand, collapse: collapse };
})();
