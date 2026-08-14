/* ============================================================
   TargetCursor (React Bits) — vanilla port
   去 React 依赖，暴露 window.TargetCursorInit(opts)。
   行为与原组件一致：
     - 跟随鼠标的绿色圆点 + 四角括号（静止时绕中心旋转 spinDuration 秒/圈）
     - 悬停命中 targetSelector 元素时，四角括号锁定到该元素外框（hoverDuration 过渡）
     - parallaxOn：锁定时跟随鼠标做轻微视差
     - hideDefaultCursor：隐藏系统光标（移动端自动禁用，恢复系统光标）
   依赖：window.gsap（gsap.min.js 已加载）。
   ============================================================ */
(function () {
  'use strict';

  var gsap = window.gsap;

  // 默认命中选择器：覆盖全站常见可交互元素（含由 JS 动态生成的导航/仓库链接）。
  // 用具体可点击元素（链接/按钮/卡片/输入框），避免对整块大盘面板描边。
  var DEFAULT_TARGET_SELECTOR =
    'a, button, .magic-bento-card, .lanyard-slot, .card, ' +
    '.dw-add-btn, input, select, textarea';

  // 当祖先元素建立了包含块（transform/perspective/filter/will-change/contain）时，
  // fixed 的 translate 不再映射视口坐标，需要测量并补偿。
  function getContainingBlock(element) {
    var node = element ? element.parentElement : null;
    while (node && node !== document.documentElement) {
      var style = getComputedStyle(node);
      if (
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        style.filter !== 'none' ||
        style.willChange.indexOf('transform') !== -1 ||
        style.willChange.indexOf('perspective') !== -1 ||
        style.willChange.indexOf('filter') !== -1 ||
        /paint|layout|strict|content/.test(style.contain)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function getContainingBlockOffset(block) {
    if (!block) return { x: 0, y: 0 };
    var rect = block.getBoundingClientRect();
    return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
  }

  function isMobileDevice() {
    if (typeof window === 'undefined') return false;
    var hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var isSmall = window.innerWidth <= 768;
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return (hasTouch && isSmall) || mobileRegex.test(ua.toLowerCase());
  }

  function TargetCursorInit(opts) {
    opts = opts || {};
    if (typeof gsap === 'undefined') {
      console.warn('[TargetCursor] window.gsap 未加载，鼠标特效未启用');
      return;
    }

    var targetSelector = opts.targetSelector || DEFAULT_TARGET_SELECTOR;
    var spinDuration = opts.spinDuration != null ? opts.spinDuration : 2;
    var hideDefaultCursor = opts.hideDefaultCursor != null ? opts.hideDefaultCursor : true;
    var hoverDuration = opts.hoverDuration != null ? opts.hoverDuration : 0.2;
    var parallaxOn = opts.parallaxOn != null ? opts.parallaxOn : true;
    var cursorColor = opts.cursorColor || '#1FD17B';
    var cursorColorOnTarget = opts.cursorColorOnTarget || undefined;

    var constants = { borderWidth: 3, cornerSize: 12 };

    if (isMobileDevice()) return; // 移动端不启用自定义光标

    // ---- 构建 DOM ----
    var cursor = document.createElement('div');
    cursor.className = 'target-cursor-wrapper';

    var dot = document.createElement('div');
    dot.className = 'target-cursor-dot';
    dot.style.backgroundColor = cursorColor;

    var corners = [];
    ['tl', 'tr', 'br', 'bl'].forEach(function (pos) {
      var c = document.createElement('div');
      c.className = 'target-cursor-corner corner-' + pos;
      c.style.borderColor = cursorColor;
      cursor.appendChild(c);
      corners.push(c);
    });
    cursor.appendChild(dot);
    document.body.appendChild(cursor);

    // ---- 状态 ----
    var containingBlock = getContainingBlock(cursor);
    var getOffset = function () { return getContainingBlockOffset(containingBlock); };

    var activeTarget = null;
    var currentLeaveHandler = null;
    var resumeTimeout = null;
    var isActive = false;
    var targetCornerPositions = null;
    var activeStrength = { current: 0 };
    var spinTl = null;
    var tickerFn = null;

    // ---- 隐藏系统光标 ----
    var originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = 'none';

    // ---- 初始定位到屏幕中心 ----
    var initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y
    });

    // ---- 旋转时间线（静止时） ----
    function createSpinTimeline() {
      if (spinTl) spinTl.kill();
      spinTl = gsap.timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
    }
    createSpinTimeline();

    // ---- 跟随鼠标 ----
    function moveCursor(x, y) {
      var off = getOffset();
      gsap.to(cursor, {
        x: x - off.x,
        y: y - off.y,
        duration: 0.1,
        ease: 'power3.out'
      });
    }

    // ---- 每帧：锁定时让四角视差跟随鼠标 ----
    tickerFn = function () {
      if (!targetCornerPositions || !isActive) return;
      var strength = activeStrength.current;
      if (strength === 0) return;

      var cursorX = gsap.getProperty(cursor, 'x');
      var cursorY = gsap.getProperty(cursor, 'y');

      corners.forEach(function (corner, i) {
        var currentX = gsap.getProperty(corner, 'x');
        var currentY = gsap.getProperty(corner, 'y');

        var targetX = targetCornerPositions[i].x - cursorX;
        var targetY = targetCornerPositions[i].y - cursorY;

        var finalX = currentX + (targetX - currentX) * strength;
        var finalY = currentY + (targetY - currentY) * strength;

        var duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    };

    // ---- 事件 ----
    function moveHandler(e) { moveCursor(e.clientX, e.clientY); }
    window.addEventListener('mousemove', moveHandler);

    function scrollHandler() {
      if (!activeTarget) return;
      var off = getOffset();
      var mouseX = gsap.getProperty(cursor, 'x') + off.x;
      var mouseY = gsap.getProperty(cursor, 'y') + off.y;
      var el = document.elementFromPoint(mouseX, mouseY);
      var stillOver = el && (el === activeTarget || el.closest(targetSelector) === activeTarget);
      if (!stillOver && currentLeaveHandler) currentLeaveHandler();
    }
    window.addEventListener('scroll', scrollHandler, { passive: true });

    function mouseDownHandler() {
      gsap.to(dot, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    }
    function mouseUpHandler() {
      gsap.to(dot, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    }
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    function cleanupTarget(target) {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler);
      }
      currentLeaveHandler = null;
    }

    function enterHandler(e) {
      var directTarget = e.target;
      var allTargets = [];
      var current = directTarget;
      while (current && current !== document.body) {
        if (current.matches && current.matches(targetSelector)) allTargets.push(current);
        current = current.parentElement;
      }
      var target = allTargets[0] || null;
      if (!target) return;
      if (activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

      activeTarget = target;
      corners.forEach(function (corner) { gsap.killTweensOf(corner, 'x,y'); });

      gsap.killTweensOf(cursor, 'rotation');
      if (spinTl) spinTl.pause();
      gsap.set(cursor, { rotation: 0 });

      if (cursorColorOnTarget) {
        gsap.to(corners, { borderColor: cursorColorOnTarget, duration: 0.15, ease: 'power2.out' });
        gsap.to(dot, { backgroundColor: cursorColorOnTarget, duration: 0.15, ease: 'power2.out' });
      }

      var rect = target.getBoundingClientRect();
      var borderWidth = constants.borderWidth;
      var cornerSize = constants.cornerSize;
      var off = getOffset();
      var cursorX = gsap.getProperty(cursor, 'x');
      var cursorY = gsap.getProperty(cursor, 'y');

      targetCornerPositions = [
        { x: rect.left - borderWidth - off.x, y: rect.top - borderWidth - off.y },
        { x: rect.right + borderWidth - cornerSize - off.x, y: rect.top - borderWidth - off.y },
        { x: rect.right + borderWidth - cornerSize - off.x, y: rect.bottom + borderWidth - cornerSize - off.y },
        { x: rect.left - borderWidth - off.x, y: rect.bottom + borderWidth - cornerSize - off.y }
      ];

      isActive = true;
      gsap.ticker.add(tickerFn);

      gsap.to(activeStrength, { current: 1, duration: hoverDuration, ease: 'power2.out' });

      corners.forEach(function (corner, i) {
        gsap.to(corner, {
          x: targetCornerPositions[i].x - cursorX,
          y: targetCornerPositions[i].y - cursorY,
          duration: 0.2,
          ease: 'power2.out'
        });
      });

      var leaveHandler = function () {
        gsap.ticker.remove(tickerFn);

        isActive = false;
        targetCornerPositions = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });
        activeTarget = null;

        if (cursorColorOnTarget) {
          gsap.to(corners, { borderColor: cursorColor, duration: 0.15, ease: 'power2.out' });
          gsap.to(dot, { backgroundColor: cursorColor, duration: 0.15, ease: 'power2.out' });
        }

        gsap.killTweensOf(corners, 'x,y');
        var cs = constants.cornerSize;
        var positions = [
          { x: -cs * 1.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: cs * 0.5 },
          { x: -cs * 1.5, y: cs * 0.5 }
        ];
        var tl = gsap.timeline();
        corners.forEach(function (corner, index) {
          tl.to(corner, {
            x: positions[index].x,
            y: positions[index].y,
            duration: 0.3,
            ease: 'power3.out'
          }, 0);
        });

        resumeTimeout = setTimeout(function () {
          if (!activeTarget && spinTl) {
            var currentRotation = gsap.getProperty(cursor, 'rotation');
            var normalized = currentRotation % 360;
            spinTl.kill();
            spinTl = gsap.timeline({ repeat: -1 })
              .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
            gsap.to(cursor, {
              rotation: normalized + 360,
              duration: spinDuration * (1 - normalized / 360),
              ease: 'none',
              onComplete: function () { if (spinTl) spinTl.restart(); }
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    }

    window.addEventListener('mouseover', enterHandler, { passive: true });

    function resizeHandler() { containingBlock = getContainingBlock(cursor); }
    window.addEventListener('resize', resizeHandler);

    // 卸载清理（单页原型基本不会触发，但保留以防）
    window.addEventListener('beforeunload', function () {
      if (tickerFn) gsap.ticker.remove(tickerFn);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      if (activeTarget) cleanupTarget(activeTarget);
      if (spinTl) spinTl.kill();
      document.body.style.cursor = originalCursor;
    });
  }

  window.TargetCursorInit = TargetCursorInit;
})();
