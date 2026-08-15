/* ============================================================
   DotField (React Bits) — vanilla WebGL-less port
   移植自 React Bits <DotField />（原依赖 React）。本文件无框架依赖，
   暴露 window.DotFieldInit(containerEl, opts)，在 containerEl 内创建
   canvas（点阵）+ svg（跟随光标的径向微光），并启动 RAF 动画。

   鼠标在附近移动时点会向外"凸起"，移动越快光晕越明显；
   静止时回落为静态点阵。底色透明，叠在父容器背景之上。
   ============================================================ */
(function () {
  'use strict';

  var TWO_PI = Math.PI * 2;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function num(v, d) { return v == null ? d : v; }

  function DotFieldInit(container, opts) {
    opts = opts || {};

    var p = {
      dotRadius: num(opts.dotRadius, 1.5),
      dotSpacing: num(opts.dotSpacing, 14),
      cursorRadius: num(opts.cursorRadius, 500),
      cursorForce: num(opts.cursorForce, 0.1),
      bulgeOnly: opts.bulgeOnly !== false,        // 默认 true
      bulgeStrength: num(opts.bulgeStrength, 67),
      glowRadius: num(opts.glowRadius, 160),
      sparkle: !!opts.sparkle,
      waveAmplitude: num(opts.waveAmplitude, 0),
      gradientFrom: opts.gradientFrom || 'rgba(168, 85, 247, 0.35)',
      gradientTo: opts.gradientTo || 'rgba(180, 151, 207, 0.25)',
      glowColor: opts.glowColor || '#120F17'
    };

    // ---- canvas（点阵） ----
    var canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // ---- svg（跟随光标的径向微光） ----
    var glowId = 'dot-field-glow-' + Math.random().toString(36).slice(2, 9);
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';

    var defs = document.createElementNS(SVG_NS, 'defs');
    var rg = document.createElementNS(SVG_NS, 'radialGradient');
    rg.setAttribute('id', glowId);
    var stop0 = document.createElementNS(SVG_NS, 'stop');
    stop0.setAttribute('offset', '0%');
    stop0.setAttribute('stop-color', p.glowColor);
    var stop1 = document.createElementNS(SVG_NS, 'stop');
    stop1.setAttribute('offset', '100%');
    stop1.setAttribute('stop-color', 'transparent');
    rg.appendChild(stop0);
    rg.appendChild(stop1);
    defs.appendChild(rg);

    var glow = document.createElementNS(SVG_NS, 'circle');
    glow.setAttribute('cx', '-9999');
    glow.setAttribute('cy', '-9999');
    glow.setAttribute('r', p.glowRadius);
    glow.setAttribute('fill', 'url(#' + glowId + ')');
    glow.style.opacity = '0';
    glow.style.willChange = 'opacity';
    svg.appendChild(defs);
    svg.appendChild(glow);
    container.appendChild(svg);

    // ---- state ----
    var ctx = canvas.getContext('2d', { alpha: true });
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
    var dots = [];
    var mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    var glowOpacity = 0;
    var engagement = 0;
    var raf = null;
    var resizeTimer = null;
    var frameCount = 0;

    function buildDots(w, h) {
      var step = p.dotRadius + p.dotSpacing;
      var cols = Math.floor(w / step);
      var rows = Math.floor(h / step);
      var padX = (w % step) / 2;
      var padY = (h % step) / 2;
      dots = new Array(rows * cols);
      var idx = 0;
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var ax = padX + col * step + step / 2;
          var ay = padY + row * step + step / 2;
          dots[idx++] = { ax: ax, ay: ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
        }
      }
    }

    function doResize() {
      var rect = container.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = {
        w: w,
        h: h,
        offsetX: rect.left + window.scrollX,
        offsetY: rect.top + window.scrollY
      };
      buildDots(w, h);
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    }

    function onMouseMove(e) {
      mouse.x = e.pageX - size.offsetX;
      mouse.y = e.pageY - size.offsetY;
    }

    function updateMouseSpeed() {
      var dx = mouse.prevX - mouse.x;
      var dy = mouse.prevY - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (dist - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    var speedInterval = setInterval(updateMouseSpeed, 20);

    function tick() {
      frameCount++;
      var len = dots.length;
      var w = size.w;
      var h = size.h;
      var t = frameCount * 0.02;

      var targetEngagement = Math.min(mouse.speed / 5, 1);
      engagement += (targetEngagement - engagement) * 0.06;
      if (engagement < 0.001) engagement = 0;
      var eng = engagement;

      glowOpacity += (eng - glowOpacity) * 0.08;
      glow.setAttribute('cx', mouse.x);
      glow.setAttribute('cy', mouse.y);
      glow.style.opacity = glowOpacity;

      ctx.clearRect(0, 0, w, h);

      var grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx.fillStyle = grad;

      var cr = p.cursorRadius;
      var crSq = cr * cr;
      var rad = p.dotRadius / 2;
      var isBulge = p.bulgeOnly;

      ctx.beginPath();
      for (var i = 0; i < len; i++) {
        var d = dots[i];
        var dx = mouse.x - d.ax;
        var dy = mouse.y - d.ay;
        var distSq = dx * dx + dy * dy;

        if (distSq < crSq && eng > 0.01) {
          var dist = Math.sqrt(distSq);
          if (isBulge) {
            var tt = 1 - dist / cr;
            var push = tt * tt * p.bulgeStrength * eng;
            var angle = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
          } else {
            var angle2 = Math.atan2(dy, dx);
            var move = (500 / dist) * (mouse.speed * p.cursorForce);
            d.vx += Math.cos(angle2) * -move;
            d.vy += Math.sin(angle2) * -move;
          }
        } else if (isBulge) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!isBulge) {
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x = d.ax + d.vx;
          d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        var drawX = d.sx;
        var drawY = d.sy;
        if (p.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
        }

        if (p.sparkle) {
          var hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
          if ((hash % 100) < 3) {
            ctx.moveTo(drawX + rad * 1.8, drawY);
            ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
          } else {
            ctx.moveTo(drawX + rad, drawY);
            ctx.arc(drawX, drawY, rad, 0, TWO_PI);
          }
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }

      ctx.fill();
      raf = requestAnimationFrame(tick);
    }

    doResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        clearInterval(speedInterval);
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMouseMove);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        if (svg.parentNode) svg.parentNode.removeChild(svg);
      }
    };
  }

  window.DotFieldInit = DotFieldInit;
})();
