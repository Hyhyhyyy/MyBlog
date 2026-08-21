/*!
 * Masonry — vanilla JS + GSAP port of React Bits "Masonry" (JS + CSS variant).
 * https://reactbits.dev (originally a React component; ported to plain DOM here).
 *
 * Usage:
 *   var m = new Masonry(containerEl, { animateFrom: 'bottom', stagger: 0.05, ... });
 *   m.setItems([ { id, img, url, height }, ... ]);
 *
 * The component builds an inner `.masonry` canvas inside `containerEl`, lays the
 * items out in the shortest column, and animates them in with GSAP.
 */
(function (global) {
  'use strict';

  var gsap = global.gsap;

  var DEFAULTS = {
    ease: 'power3.out',
    duration: 0.6,
    stagger: 0.05,
    animateFrom: 'bottom',
    scaleOnHover: true,
    hoverScale: 0.95,
    blurToFocus: true,
    colorShiftOnHover: false,
    gap: 14,
    maxColumns: 5
  };

  // 尊重「减少动态效果」偏好
  var REDUCED = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function preloadImages(urls) {
    return Promise.all(urls.map(function (src) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.src = src;
        img.onload = img.onerror = function () { resolve(); };
      });
    }));
  }

  function Masonry(container, options) {
    if (!container) throw new Error('Masonry: container element is required');
    this.container = container;
    this.opts = {};
    for (var k in DEFAULTS) this.opts[k] = DEFAULTS[k];
    if (options) for (var j in options) this.opts[j] = options[j];
    this.items = [];
    this.canvas = null;
    this._raf = 0;
    this._init();
  }

  Masonry.prototype._init = function () {
    var self = this;
    this.canvas = document.createElement('div');
    this.canvas.className = 'masonry';
    this.container.appendChild(this.canvas);

    if ('ResizeObserver' in global) {
      this.ro = new ResizeObserver(function () { self._scheduleRelayout(); });
      this.ro.observe(this.container);
    } else {
      global.addEventListener('resize', function () { self._scheduleRelayout(); });
    }
  };

  // 列数随容器内容宽度自适应（而非整窗宽度，因为我们在左栏内）
  Masonry.prototype._computeColumns = function (width) {
    var max = this.opts.maxColumns;
    var cols = 1;
    if (width >= 1100) cols = 5;
    else if (width >= 820) cols = 4;
    else if (width >= 540) cols = 3;
    else if (width >= 360) cols = 2;
    else cols = 1;
    return Math.max(1, Math.min(cols, max));
  };

  Masonry.prototype._contentWidth = function () {
    var cs = global.getComputedStyle(this.container);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    return Math.max(0, this.container.clientWidth - padL - padR);
  };

  // 计算布局：返回定位后的 items，并设置 canvas 高度
  Masonry.prototype._layout = function () {
    var width = this._contentWidth();
    if (!width) return null;
    var gap = this.opts.gap;
    var columns = this._computeColumns(width);
    var columnWidth = (width - gap * (columns - 1)) / columns;
    var colHeights = new Array(columns).fill(0);
    var maxH = 0;

    var positioned = this.items.map(function (child) {
      var col = colHeights.indexOf(Math.min.apply(null, colHeights));
      var x = col * (columnWidth + gap);
      var h = child.height;
      var y = colHeights[col];
      colHeights[col] += h + gap;
      maxH = Math.max(maxH, colHeights[col]);
      return { id: child.id, img: child.img, url: child.url, x: x, y: y, w: columnWidth, h: h };
    });

    this.canvas.style.width = width + 'px';
    this.canvas.style.height = maxH + 'px';
    return positioned;
  };

  Masonry.prototype._initialPosition = function (item) {
    var rect = this.container.getBoundingClientRect();
    var direction = this.opts.animateFrom;
    if (direction === 'random') {
      var dirs = ['top', 'bottom', 'left', 'right'];
      direction = dirs[Math.floor(Math.random() * dirs.length)];
    }
    switch (direction) {
      case 'top': return { x: item.x, y: -200 };
      case 'bottom': return { x: item.x, y: (rect.height || global.innerHeight) + 200 };
      case 'left': return { x: -200, y: item.y };
      case 'right': return { x: (rect.width || global.innerWidth) + 200, y: item.y };
      case 'center':
        return { x: (rect.width || global.innerWidth) / 2 - item.w / 2, y: (rect.height || global.innerHeight) / 2 - item.h / 2 };
      default: return { x: item.x, y: item.y + 100 };
    }
  };

  Masonry.prototype._el = function (id) {
    return this.canvas.querySelector('[data-key="' + (id + '').replace(/"/g, '\\"') + '"]');
  };

  // 首次/筛选变更：重建 DOM + 入场动画（blur-to-focus + 方向飞入 + stagger）
  Masonry.prototype.setItems = function (items) {
    var self = this;
    this.items = items || [];

    this.canvas.innerHTML = '';
    this.items.forEach(function (it) {
      var wrapper = document.createElement('div');
      wrapper.className = 'item-wrapper';
      wrapper.setAttribute('data-key', it.id);
      wrapper.setAttribute('role', 'link');
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('aria-label', it.title ? ('打开：' + it.title) : '打开文章');

      var img = document.createElement('div');
      img.className = 'item-img';
      img.style.backgroundImage = 'url("' + it.img + '")';

      if (self.opts.colorShiftOnHover) {
        var ov = document.createElement('div');
        ov.className = 'color-overlay';
        img.appendChild(ov);
      }
      wrapper.appendChild(img);

      wrapper.addEventListener('click', function () {
        if (it.url) global.location.href = it.url;
      });
      wrapper.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && it.url) {
          e.preventDefault();
          global.location.href = it.url;
        }
      });
      wrapper.addEventListener('mouseenter', function () { self._enter(wrapper); });
      wrapper.addEventListener('mouseleave', function () { self._leave(wrapper); });

      self.canvas.appendChild(wrapper);
    });

    preloadImages(this.items.map(function (i) { return i.img; })).then(function () {
      self._entrance();
    });
  };

  Masonry.prototype._entrance = function () {
    var self = this;
    var pos = this._layout();
    if (!pos) return;

    pos.forEach(function (item, index) {
      var el = self._el(item.id);
      if (!el) return;
      var init = self._initialPosition(item);
      var from = {
        opacity: 0,
        x: init.x,
        y: init.y,
        width: item.w,
        height: item.h
      };
      var to = {
        opacity: 1,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
        duration: REDUCED ? 0.01 : 0.8,
        ease: 'power3.out',
        delay: REDUCED ? 0 : index * self.opts.stagger
      };
      if (self.opts.blurToFocus && !REDUCED) {
        from.filter = 'blur(10px)';
        to.filter = 'blur(0px)';
      }
      if (gsap) gsap.fromTo(el, from, to);
      else { el.style.opacity = 1; }
    });
  };

  Masonry.prototype._scheduleRelayout = function () {
    var self = this;
    if (this._raf) return;
    this._raf = global.requestAnimationFrame(function () {
      self._raf = 0;
      self._relayout();
    });
  };

  // 容器尺寸变化：平滑重排（不重新入场、不模糊）
  Masonry.prototype._relayout = function () {
    var self = this;
    var pos = this._layout();
    if (!pos) return;
    pos.forEach(function (item) {
      var el = self._el(item.id);
      if (!el) return;
      if (gsap) {
        gsap.to(el, {
          x: item.x, y: item.y, width: item.w, height: item.h,
          duration: REDUCED ? 0.01 : self.opts.duration,
          ease: self.opts.ease,
          overwrite: 'auto'
        });
      } else {
        el.style.transform = 'translate(' + item.x + 'px,' + item.y + 'px)';
        el.style.width = item.w + 'px';
        el.style.height = item.h + 'px';
      }
    });
  };

  Masonry.prototype._enter = function (el) {
    if (!gsap) return;
    if (this.opts.scaleOnHover) {
      gsap.to(el, { scale: this.opts.hoverScale, duration: 0.3, ease: 'power2.out' });
    }
    if (this.opts.colorShiftOnHover) {
      var ov = el.querySelector('.color-overlay');
      if (ov) gsap.to(ov, { opacity: 0.3, duration: 0.3 });
    }
  };

  Masonry.prototype._leave = function (el) {
    if (!gsap) return;
    if (this.opts.scaleOnHover) {
      gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out' });
    }
    if (this.opts.colorShiftOnHover) {
      var ov = el.querySelector('.color-overlay');
      if (ov) gsap.to(ov, { opacity: 0, duration: 0.3 });
    }
  };

  Masonry.prototype.destroy = function () {
    if (this.ro) this.ro.disconnect();
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  global.Masonry = Masonry;
})(window);
