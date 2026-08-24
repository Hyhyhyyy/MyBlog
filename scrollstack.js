/* ============================================================
   实用工具箱 — 卡片「点击展开 = 全屏专注」交互
   目标：
   1) 滚动丝滑：不再每帧重算 transform（彻底移除 pin 堆叠循环）
   2) 内容不被遮挡：卡片走原生文档流，互不叠盖
   3) 展开后页面只剩卡片本身：body 锁滚动（iOS 安全），收起后才可滑动
   ============================================================ */
(function () {
  'use strict';

  var savedY = 0;

  function lockScroll() {
    savedY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    var b = document.body;
    // iOS 安全锁：固定 body 并上移当前滚动量，杜绝惯性滚动
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
  }

  function expand(card) {
    if (!card || card.classList.contains('is-expanded')) return;
    // 若已有展开的卡片，先收起，保证同一时刻只有一个全屏
    var current = document.querySelector('.scroll-stack-card.is-expanded');
    if (current && current !== card) collapse(current);

    lockScroll();
    document.body.classList.add('card-focus');
    card.classList.add('is-expanded');
    // 把当前卡片滚动到顶部，避免内部残留偏移
    card.scrollTop = 0;
    var closeBtn = card.querySelector('.card-expand-close');
    if (closeBtn) closeBtn.focus();
  }

  function init() {
    var cards = document.querySelectorAll('.scroll-stack-card');
    cards.forEach(function (card) {
      var openBtn = card.querySelector('.card-expand-btn');
      var closeBtn = card.querySelector('.card-expand-close');

      if (openBtn) {
        openBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          expand(card);
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          collapse(card);
        });
      }
    });

    // ESC 收起任意展开卡片
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        var current = document.querySelector('.scroll-stack-card.is-expanded');
        if (current) collapse(current);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ScrollStack = { expand: expand, collapse: collapse };
})();
