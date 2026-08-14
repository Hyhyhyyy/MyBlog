/* ============================================================
   TextPressure — 原生 JS 移植（对应 React Bits TextPressure）
   用法：TextPressureInit(containerEl, options)
     options: {
       text, fontFamily, flex, scale, alpha, stroke,
       width, weight, italic, textColor, strokeColor, className, minFontSize
     }
   依赖：CSS 里声明的可变字体（见 text-pressure.css 的 @font-face）。
   ============================================================ */
(function () {
  'use strict';

  function dist(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getAttr(distance, maxDist, minVal, maxVal) {
    var val = maxVal - Math.abs((maxVal * distance) / maxDist);
    return Math.max(minVal, val + minVal);
  }

  function debounce(func, delay) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { func.apply(self, args); }, delay);
    };
  }

  function TextPressure(container, opts) {
    opts = opts || {};
    var text = opts.text != null ? opts.text : 'Hello!';
    var fontFamily = opts.fontFamily || 'Roboto Flex';
    var flex = opts.flex !== false;
    var scale = !!opts.scale;
    var alpha = !!opts.alpha;
    var stroke = !!opts.stroke;
    var width = opts.width !== false;
    var weight = opts.weight !== false;
    var italic = opts.italic !== false;
    var textColor = opts.textColor || '#000000';
    var strokeColor = opts.strokeColor || '#FF0000';
    var className = opts.className || '';
    var minFontSize = opts.minFontSize || 24;

    var chars = text.split('');
    if (!chars.length) chars = [' '];

    // 容器样式
    container.innerHTML = '';
    container.classList.add('tp-container');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.background = 'transparent';
    container.style.setProperty('--tp-text', textColor);
    container.style.setProperty('--tp-stroke', strokeColor);

    // 标题
    var h1 = document.createElement('h1');
    h1.className = 'text-pressure-title ' + className +
      (flex ? ' flex' : '') + (stroke ? ' stroke' : '');
    h1.style.fontFamily = "'" + fontFamily + "', sans-serif";
    h1.style.fontSize = minFontSize + 'px';
    h1.style.lineHeight = '1';
    h1.style.transform = 'scale(1, 1)';

    var spans = [];
    chars.forEach(function (ch, i) {
      var s = document.createElement('span');
      s.setAttribute('data-char', ch);
      if (!stroke) s.style.color = textColor;
      s.textContent = ch;
      h1.appendChild(s);
      spans.push(s);
    });
    container.appendChild(h1);

    var mouse = { x: 0, y: 0 };
    var cursor = { x: 0, y: 0 };
    var scaleY = 1;

    function setSize() {
      var cr = container.getBoundingClientRect();
      if (!cr.width) return;
      var newFs = cr.width / (chars.length / 2);
      newFs = Math.max(newFs, minFontSize);
      h1.style.fontSize = newFs + 'px';
      scaleY = 1;
      h1.style.transform = 'scale(1, ' + scaleY + ')';
      h1.style.lineHeight = '1';

      // 等 DOM 更新后测量实际字符总宽；若超出容器，按宽度等比缩小字号，
      // 避免 426px 大字把 "!" 甩到屏幕外。
      var naturalW = 0;
      for (var k = 0; k < spans.length; k++) {
        naturalW += spans[k] ? spans[k].offsetWidth : 0;
      }
      // 字体变宽后可能超出容器，统一按容器的 72% 排布，给 wght/wdth 变化留足余量，
      // 确保贴近某字符时 "Hello!" 整体不会被裁掉。
      newFs = Math.max(newFs * Math.min(cr.width / naturalW, 1) * 0.72, minFontSize);
      h1.style.fontSize = newFs + 'px';

      requestAnimationFrame(function () {
        var tr = h1.getBoundingClientRect();
        if (scale && tr.height > 0) {
          var yRatio = cr.height / tr.height;
          scaleY = yRatio;
          h1.style.transform = 'scale(1, ' + scaleY + ')';
          h1.style.lineHeight = yRatio;
        }
      });
    }

    function handleMove(e) { cursor.x = e.clientX; cursor.y = e.clientY; }
    function handleTouch(e) {
      var t = e.touches && e.touches[0];
      if (t) { cursor.x = t.clientX; cursor.y = t.clientY; }
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleTouch, { passive: true });

    var cr0 = container.getBoundingClientRect();
    mouse.x = cr0.left + cr0.width / 2;
    mouse.y = cr0.top + cr0.height / 2;
    cursor.x = mouse.x;
    cursor.y = mouse.y;

    var dSet = debounce(setSize, 100);
    setSize();
    window.addEventListener('resize', dSet);

    var rafId;
    function animate() {
      mouse.x += (cursor.x - mouse.x) / 15;
      mouse.y += (cursor.y - mouse.y) / 15;

      var tr = h1.getBoundingClientRect();
      // 缩小响应半径：鼠标稍远离字符中心时字就回到最细/最窄，贴近时明显加粗变宽，视觉对比更强
      var maxDist = Math.max(tr.width / 3, 180) || 1;

      for (var i = 0; i < spans.length; i++) {
        var s = spans[i];
        if (!s) continue;
        var r = s.getBoundingClientRect();
        var cc = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        var d = dist(mouse, cc);

      var wdth = width ? Math.floor(getAttr(d, maxDist, 25, 151)) : 100;
      var wght = weight ? Math.floor(getAttr(d, maxDist, 100, 1000)) : 400;
      var italVal = italic ? getAttr(d, maxDist, 0, 1).toFixed(2) : 0;
        var alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : 1;

        // 字体支持 slnt（倾斜）轴而非 ital；把 0..1 映射到 0..-10deg
        var slntVal = (-italVal * 10).toFixed(2);
        var fvs = "'wght' " + wght + ", 'wdth' " + wdth + ", 'slnt' " + slntVal;
        if (s.style.fontVariationSettings !== fvs) {
          s.style.fontVariationSettings = fvs;
        }
        if (alpha) {
          if (s.style.opacity !== alphaVal) s.style.opacity = alphaVal;
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    // 清理句柄（再次初始化前可调用）
    container._tpCleanup = function () {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('resize', dSet);
    };
  }

  window.TextPressureInit = function (container, opts) {
    return TextPressure(container, opts);
  };
})();
