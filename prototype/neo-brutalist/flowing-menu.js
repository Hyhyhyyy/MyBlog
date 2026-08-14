/* ============================================================
   FlowingMenu — 原生 JS 移植（对应 React Bits FlowingMenu）
   依赖 window.gsap。用法：
     FlowingMenuInit(containerEl, items, { speed })
   items: [{ text, link, shade, marqueeText, imgA, imgB }, ...]
   ============================================================ */
(function () {
  'use strict';

  if (!window.gsap) {
    console.error('[FlowingMenu] gsap 未加载，组件不可用');
    return;
  }

  function distMetric(x, y, x2, y2) {
    var dx = x - x2, dy = y - y2;
    return dx * dx + dy * dy;
  }

  function findClosestEdge(mx, my, w, h) {
    var top = distMetric(mx, my, w / 2, 0);
    var bottom = distMetric(mx, my, w / 2, h);
    return top < bottom ? 'top' : 'bottom';
  }

  function createItem(item, opts) {
    var el = document.createElement('div');
    el.className = 'menu__item';
    el.style.borderColor = item.shade;

    var link = document.createElement('a');
    link.className = 'menu__item-link';
    link.href = item.link || '#';
    link.textContent = item.text;
    link.style.color = item.shade;            // 静止文字 = 番茄色

    var marquee = document.createElement('div');
    marquee.className = 'marquee';
    marquee.style.backgroundColor = item.shade;

    var innerWrap = document.createElement('div');
    innerWrap.className = 'marquee__inner-wrap';
    var inner = document.createElement('div');
    inner.className = 'marquee__inner';
    inner.setAttribute('aria-hidden', 'true');
    innerWrap.appendChild(inner);
    marquee.appendChild(innerWrap);

    el.appendChild(link);
    el.appendChild(marquee);

    var state = {
      el: el, marquee: marquee, inner: inner, item: item,
      repetitions: 4, anim: null, speed: opts.speed
    };

    function buildParts() {
      inner.innerHTML = '';
      for (var i = 0; i < state.repetitions; i++) {
        var part = document.createElement('div');
        part.className = 'marquee__part';
        part.style.color = item.marqueeText;
        var span = document.createElement('span');
        span.textContent = item.text;
        var img = document.createElement('div');
        img.className = 'marquee__img';
        img.style.backgroundImage =
          'linear-gradient(135deg,' + item.imgA + ',' + item.imgB + ')';
        part.appendChild(span);
        part.appendChild(img);
        inner.appendChild(part);
      }
    }

    function setupMarquee() {
      var part0 = inner.querySelector('.marquee__part');
      if (!part0) return;
      var cw = part0.offsetWidth;
      if (!cw) return;
      if (state.anim) state.anim.kill();
      gsap.set(inner, { x: 0 });
      state.anim = gsap.to(inner, {
        x: -cw, duration: state.speed, ease: 'none', repeat: -1
      });
    }

    function calcReps() {
      buildParts();
      var part0 = inner.querySelector('.marquee__part');
      if (!part0) return;
      var cw = part0.offsetWidth;
      if (!cw) return;
      var needed = Math.ceil(window.innerWidth / cw) + 2;
      state.repetitions = Math.max(4, needed);
      buildParts();
      setupMarquee();
    }

    link.addEventListener('mouseenter', function (ev) {
      var rect = el.getBoundingClientRect();
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      var edge = findClosestEdge(x, y, rect.width, rect.height);
      var mFrom = edge === 'top' ? -100 : 100;   // 遮罩从最近边的反方向滑入
      var iFrom = edge === 'top' ? 100 : -100;
      gsap.timeline({ defaults: { duration: 0.6, ease: 'expo' } })
        .set(marquee, { yPercent: mFrom }, 0)
        .set(inner, { yPercent: iFrom }, 0)
        .to([marquee, inner], { yPercent: 0 }, 0);
    });

    link.addEventListener('mouseleave', function (ev) {
      var rect = el.getBoundingClientRect();
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      var edge = findClosestEdge(x, y, rect.width, rect.height);
      var mTo = edge === 'top' ? -100 : 100;     // 离开时朝最近边滑出
      var iTo = edge === 'top' ? 100 : -100;
      gsap.timeline({ defaults: { duration: 0.6, ease: 'expo' } })
        .to(marquee, { yPercent: mTo }, 0)
        .to(inner, { yPercent: iTo }, 0);
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(calcReps, 150);
    });

    setTimeout(calcReps, 60);   // 等布局完成后测量

    return el;
  }

  window.FlowingMenuInit = function (container, items, options) {
    options = options || {};
    var opts = { speed: options.speed || 15 };
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'menu-wrap';
    var menu = document.createElement('nav');
    menu.className = 'menu';
    (items || []).forEach(function (it) {
      menu.appendChild(createItem(it, opts));
    });
    wrap.appendChild(menu);
    container.appendChild(wrap);

    // 元素已入 DOM，高度确定。gsap 独占 marquee 的 transform：
    // 初始藏在下方（yPercent:100），并切到 visible（CSS 里初始 hidden 防闪现）。
    var marquees = wrap.querySelectorAll('.marquee');
    for (var i = 0; i < marquees.length; i++) {
      gsap.set(marquees[i], { yPercent: 100, visibility: 'visible' });
    }
  };
})();
