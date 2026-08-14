/* ============================================================
   MagicBento (React Bits) — vanilla port
   依赖：全局 window.gsap（gsap.min.js 已通过 <script> 加载）
   适配：博客成长档案内容 + 亮色模式 + 番茄红辉光
   ============================================================ */

(function () {
  'use strict';

  // gsap 已在 window 上（由 gsap.min.js 注入）。若缺失则降级为无动效。
  const gsap = window.gsap;
  const HAS_GSAP = typeof gsap !== 'undefined';

  const DEFAULT_PARTICLE_COUNT = 12;
  const DEFAULT_SPOTLIGHT_RADIUS = 300;
  const DEFAULT_GLOW_COLOR = '255, 68, 56'; // 番茄红 rgb
  const MOBILE_BREAKPOINT = 768;

  // ---- 卡片内容（成长档案主题，5 卡） ----
  // 新布局（按截图比例）：
  //   ① 娱乐（左上 2×1 宽块）
  //   ② 项目（左下 2×2 大竖块）
  //   ③ 学习（右上 2×2 大竖块）
  //   ④ 关于（右下 1×1）  ⑤ 联系（右下 1×1）
  const cardData = [
    {
      color: '#ffffff',
      title: '娱乐收藏合集',
      description: '影视、文学、音乐、剧集、游戏的归档与收藏，持续整理中。',
      label: 'ENTERTAINMENT',
      href: 'collections.html',
      size: 'wide'
    },
    {
      color: '#ffffff',
      title: '项目展示',
      description: '已确认的作品、项目与公开产出，持续更新与沉淀。',
      label: 'PROJECTS',
      href: 'projects.html',
      size: 'large'
    },
    {
      color: '#ffffff',
      title: '学习与感悟',
      description: '备考、研究与日常思考的记录，留下的都是真实、可被查阅的痕迹。',
      label: 'LEARNING',
      href: 'study.html',
      size: 'large'
    },
    {
      color: '#ffffff',
      title: '关于我',
      description: 'Hyhyhyyy —— 一份持续书写的成长档案。',
      label: 'ABOUT',
      href: 'about.html',
      size: 'small'
    },
    {
      color: '#ffffff',
      title: '联系',
      description: '13581912370@139.com · GitHub',
      label: 'CONTACT',
      href: 'mailto:13581912370@139.com',
      size: 'small'
    }
  ];

  // ---- 配置（来自 React Bits 默认，亮色模式适配） ----
  const config = {
    textAutoHide: false,
    enableStars: true,
    enableSpotlight: true,
    enableBorderGlow: true,
    disableAnimations: false,
    spotlightRadius: DEFAULT_SPOTLIGHT_RADIUS,
    particleCount: DEFAULT_PARTICLE_COUNT,
    enableTilt: true,
    glowColor: DEFAULT_GLOW_COLOR,
    clickEffect: true,
    enableMagnetism: true
  };

  // ---- 工具：创建星点粒子 ----
  function createParticleElement(x, y, color) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText =
      'position:absolute;width:4px;height:4px;border-radius:50%;' +
      'background:rgba(' + color + ',1);box-shadow:0 0 6px rgba(' + color + ',0.6);' +
      'pointer-events:none;z-index:100;left:' + x + 'px;top:' + y + 'px;';
    return el;
  }

  function calculateSpotlightValues(radius) {
    return { proximity: radius * 0.5, fadeDistance: radius * 0.75 };
  }

  function updateCardGlowProperties(card, mouseX, mouseY, glow, radius) {
    const rect = card.getBoundingClientRect();
    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;
    card.style.setProperty('--glow-x', relativeX + '%');
    card.style.setProperty('--glow-y', relativeY + '%');
    card.style.setProperty('--glow-intensity', glow.toString());
    card.style.setProperty('--glow-radius', radius + 'px');
  }

  // ---- ParticleCard：单卡的交互（粒子/倾斜/磁吸/点击涟漪） ----
  function attachParticleCard(cardEl, opts) {
    const {
      particleCount = DEFAULT_PARTICLE_COUNT,
      glowColor = DEFAULT_GLOW_COLOR,
      enableTilt = true,
      clickEffect = false,
      enableMagnetism = false,
      disableAnimations = false
    } = opts || {};

    let particlesRef = [];
    let timeoutsRef = [];
    let isHovered = false;
    let memoizedParticles = [];
    let particlesInitialized = false;
    let magnetismAnimation = null;

    function initializeParticles() {
      if (particlesInitialized || !cardEl) return;
      const rect = cardEl.getBoundingClientRect();
      memoizedParticles = [];
      for (let i = 0; i < particleCount; i++) {
        memoizedParticles.push(
          createParticleElement(Math.random() * rect.width, Math.random() * rect.height, glowColor)
        );
      }
      particlesInitialized = true;
    }

    function clearAllParticles() {
      timeoutsRef.forEach(clearTimeout);
      timeoutsRef = [];
      if (magnetismAnimation) magnetismAnimation.kill();
      particlesRef.forEach(function (particle) {
        if (HAS_GSAP) {
          gsap.to(particle, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'back.in(1.7)',
            onComplete: function () {
              if (particle.parentNode) particle.parentNode.removeChild(particle);
            }
          });
        } else if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
      particlesRef = [];
    }

    function animateParticles() {
      if (!cardEl || !isHovered) return;
      if (!particlesInitialized) initializeParticles();
      memoizedParticles.forEach(function (particle, index) {
        const timeoutId = setTimeout(function () {
          if (!isHovered || !cardEl) return;
          const clone = particle.cloneNode(true);
          cardEl.appendChild(clone);
          particlesRef.push(clone);
          if (HAS_GSAP) {
            gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
            gsap.to(clone, {
              x: (Math.random() - 0.5) * 100,
              y: (Math.random() - 0.5) * 100,
              rotation: Math.random() * 360,
              duration: 2 + Math.random() * 2,
              ease: 'none',
              repeat: -1,
              yoyo: true
            });
            gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
          }
        }, index * 100);
        timeoutsRef.push(timeoutId);
      });
    }

    function handleMouseEnter() {
      isHovered = true;
      if (config.enableStars) animateParticles();
      if (enableTilt && HAS_GSAP) {
        gsap.to(cardEl, { rotateX: 5, rotateY: 5, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
      }
    }

    function handleMouseLeave() {
      isHovered = false;
      clearAllParticles();
      if (enableTilt && HAS_GSAP) {
        gsap.to(cardEl, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' });
      }
      if (enableMagnetism && HAS_GSAP) {
        gsap.to(cardEl, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
      }
    }

    function handleMouseMove(e) {
      if (!enableTilt && !enableMagnetism) return;
      const rect = cardEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      if (enableTilt && HAS_GSAP) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        gsap.to(cardEl, { rotateX: rotateX, rotateY: rotateY, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
      }
      if (enableMagnetism && HAS_GSAP) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;
        magnetismAnimation = gsap.to(cardEl, { x: magnetX, y: magnetY, duration: 0.3, ease: 'power2.out' });
      }
    }

    function handleClick(e) {
      if (!clickEffect) return;
      const rect = cardEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );
      const ripple = document.createElement('div');
      ripple.style.cssText =
        'position:absolute;width:' + maxDistance * 2 + 'px;height:' + maxDistance * 2 + 'px;' +
        'border-radius:50%;background:radial-gradient(circle,rgba(' + glowColor + ',0.35) 0%,rgba(' +
        glowColor + ',0.18) 30%,transparent 70%);left:' + (x - maxDistance) + 'px;top:' +
        (y - maxDistance) + 'px;pointer-events:none;z-index:1000;';
      cardEl.appendChild(ripple);
      if (HAS_GSAP) {
        gsap.fromTo(ripple, { scale: 0, opacity: 1 }, {
          scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out',
          onComplete: function () { ripple.remove(); }
        });
      } else {
        ripple.remove();
      }
    }

    if (disableAnimations || !HAS_GSAP) return;
    cardEl.addEventListener('mouseenter', handleMouseEnter);
    cardEl.addEventListener('mouseleave', handleMouseLeave);
    cardEl.addEventListener('mousemove', handleMouseMove);
    cardEl.addEventListener('click', handleClick);
  }

  // ---- 全局聚光（跟随鼠标，照亮最近卡片的边框辉光） ----
  function attachGlobalSpotlight(gridEl) {
    if (!gridEl || !config.enableSpotlight || config.disableAnimations || !HAS_GSAP) return;
    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText =
      'position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(' + config.glowColor + ',0.12) 0%,rgba(' + config.glowColor +
      ',0.06) 15%,rgba(' + config.glowColor + ',0.03) 25%,rgba(' + config.glowColor +
      ',0.015) 40%,transparent 70%);z-index:200;opacity:0;transform:translate(-50%,-50%);';
    document.body.appendChild(spotlight);

    function handleMouseMove(e) {
      if (!gridEl) return;
      const section = gridEl.closest('.bento-section');
      const rect = section && section.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const cards = gridEl.querySelectorAll('.magic-bento-card');

      if (!mouseInside) {
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards.forEach(function (card) { card.style.setProperty('--glow-intensity', '0'); });
        return;
      }

      const values = calculateSpotlightValues(config.spotlightRadius);
      const proximity = values.proximity;
      const fadeDistance = values.fadeDistance;
      let minDistance = Infinity;

      cards.forEach(function (card) {
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);
        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) glowIntensity = 1;
        else if (effectiveDistance <= fadeDistance)
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);

        updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, config.spotlightRadius);
      });

      gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;
      gsap.to(spotlight, { opacity: targetOpacity, duration: targetOpacity > 0 ? 0.2 : 0.5, ease: 'power2.out' });
    }

    function handleMouseLeave() {
      const cards = gridEl && gridEl.querySelectorAll('.magic-bento-card');
      if (cards) cards.forEach(function (card) { card.style.setProperty('--glow-intensity', '0'); });
      if (spotlight) gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
  }

  // ---- 构建网格 ----
  function buildBento(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const grid = document.createElement('div');
    grid.className = 'card-grid bento-section';

    cardData.forEach(function (card, index) {
      const cardEl = document.createElement('a');
      cardEl.href = card.href || ((card.label === 'ENTERTAINMENT') ? 'collections.html' : '#');
      cardEl.className =
        'magic-bento-card particle-container bento-size-' + (card.size || 'small') + ' ' +
        (config.textAutoHide ? 'magic-bento-card--text-autohide ' : '') +
        (config.enableBorderGlow ? 'magic-bento-card--border-glow' : '');
      cardEl.style.backgroundColor = card.color;
      cardEl.style.setProperty('--glow-color', config.glowColor);

      const header = document.createElement('div');
      header.className = 'magic-bento-card__header';
      const label = document.createElement('div');
      label.className = 'magic-bento-card__label';
      label.textContent = card.label;
      header.appendChild(label);

      const content = document.createElement('div');
      content.className = 'magic-bento-card__content';
      const title = document.createElement('h2');
      title.className = 'magic-bento-card__title';
      title.textContent = card.title;
      const desc = document.createElement('p');
      desc.className = 'magic-bento-card__description';
      desc.textContent = card.description;
      content.appendChild(title);
      content.appendChild(desc);

      cardEl.appendChild(header);
      cardEl.appendChild(content);
      grid.appendChild(cardEl);

      attachParticleCard(cardEl, {
        particleCount: config.particleCount,
        glowColor: config.glowColor,
        enableTilt: config.enableTilt,
        clickEffect: config.clickEffect,
        enableMagnetism: config.enableMagnetism,
        disableAnimations: config.disableAnimations
      });
    });

    container.appendChild(grid);
    attachGlobalSpotlight(grid);
  }

  function detectMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 移动端自动禁用部分动效，避免性能/误触问题
    config.disableAnimations = detectMobile();
    buildBento('bento');
  });

  window.addEventListener('resize', function () {
    // 仅切换一次性标记，避免重建 DOM
    config.disableAnimations = detectMobile();
  });
})();
