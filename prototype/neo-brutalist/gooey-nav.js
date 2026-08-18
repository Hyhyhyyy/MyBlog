/* ============================================================
   Nav — 基础页面切换（无动效）
   保留真实 href 跳转 + 当前页高亮，去掉 GooeyNav 的果冻形变 /
   番茄粒子 / 滤镜混合等全部动效，只做最基础的链接切换。
   ============================================================ */
(function () {
  'use strict';

  var NAV_ITEMS = [
    { label: '首页', href: 'index.html' },
    { label: '学习', href: 'study.html' },
    { label: '项目', href: 'projects.html' },
    { label: '娱乐', href: 'collections.html' },
    { label: '关于', href: 'about.html' }
  ];

  function currentPageKey() {
    var p = (location.pathname || '').split('/').pop();
    if (!p || p === '' || p === '/') return 'index.html';
    return p;
  }

  function buildNav(root) {
    if (root.querySelector('.gooey-nav-container')) return; // 已构建，幂等

    var pageKey = currentPageKey();
    var activeIndex = 0;
    for (var i = 0; i < NAV_ITEMS.length; i++) {
      if (NAV_ITEMS[i].href === pageKey) { activeIndex = i; break; }
    }

    var container = document.createElement('div');
    container.className = 'gooey-nav-container';

    var nav = document.createElement('nav');
    var ul = document.createElement('ul');
    NAV_ITEMS.forEach(function (item, idx) {
      var li = document.createElement('li');
      if (idx === activeIndex) li.className = 'active';
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      a.setAttribute('data-index', String(idx));
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
    container.appendChild(nav);
    root.appendChild(container);
  }

  function init() {
    var roots = document.querySelectorAll('[data-gooey-nav]');
    roots.forEach(function (root) { buildNav(root); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
