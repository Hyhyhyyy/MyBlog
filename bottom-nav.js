/* bottom-nav.js — 注入底部对称玻璃导航栏 + 主题/语言切换 + i18n
   依赖：bottom-nav.css。设计为对每个页面零侵入（自动 append 到 body）。
   英文模式（EN）严谨翻译：导航链接、主题/语言/光标/声音按钮及全部 aria 标签；
   浏览器标签标题在两种语言下始终为 "Hyhyhyyy"（与站点统一标题要求一致）。 */
(function () {
  if (document.getElementById('hyhy-bottom-nav')) return;
  var ROOT = document.documentElement;
  // 站点可能挂在 /MyBlog/ 子路径下；统一取「仓库根之后的相对路径」作为页面标识，
  // 这样 posts/<slug>/index.html 这类子页不会误匹配根页（index.html）的标题翻译。
  var PAGE = (location.pathname.replace(/^.*\/MyBlog\//, '').replace(/^\//, '') || 'index.html');

  var I18N = {
    zh: {
      skipLink: '跳到主内容',
      themeDark: '深色',
      themeLight: '浅色',
      themeAria: '切换深浅模式',
      langOther: 'EN',
      langAria: '切换语言',
      cursorOn: '光标: 开',
      cursorOff: '光标: 关',
      cursorAria: '切换自定义鼠标指针',
      soundOnAria: '关闭背景视频声音',
      soundOffAria: '开启背景视频声音',
      searchPlaceholder: '搜索…',
      searchLabel: '站内搜索',
      searchAria: '站内搜索',
      noResults: '无匹配结果',
      indexDesc: 'Hyhyhyyy — Neo-Brutalist 娱乐合集原型站：以新野兽派视觉呈现音乐剧、文学与影视收藏。',
      headings: {
        '404.html': '页面走丢了',
        'calvino.html': '卡尔维诺短篇小说集',
        'caofangzi.html': '草房子',
        'friends.html': 'Friends',
        'hulanhe.html': '呼兰河传',
        'itcrowd.html': 'The IT Crowd',
        'mlp.html': 'My Little Pony: Friendship Is Magic',
        'red-black.html': '摇滚红与黑',
        'sherlock.html': 'SHERLOCK',
        'six.html': 'SIX'
      }
    },
    en: {
      skipLink: 'Skip to main content',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeAria: 'Toggle theme',
      langOther: '中',
      langAria: 'Switch language',
      cursorOn: 'Cursor: On',
      cursorOff: 'Cursor: Off',
      cursorAria: 'Toggle custom cursor',
      soundOnAria: 'Turn off background video sound',
      soundOffAria: 'Turn on background video sound',
      searchPlaceholder: 'Search…',
      searchLabel: 'Search site',
      searchAria: 'Search site',
      noResults: 'No results found',
      indexDesc: 'Hyhyhyyy — a Neo-Brutalist entertainment collection prototype: musicals, literature, and film presented in neo-brutalist visuals.',
      headings: {
        '404.html': 'Page Lost',
        'calvino.html': 'Calvino Short Stories',
        'caofangzi.html': 'Cao Fangzi',
        'friends.html': 'Friends',
        'hulanhe.html': 'Hulan River',
        'itcrowd.html': 'The IT Crowd',
        'mlp.html': 'My Little Pony: Friendship Is Magic',
        'red-black.html': 'Le Rouge et le Noir',
        'sherlock.html': 'SHERLOCK',
        'six.html': 'SIX'
      }
    }
  };

  function getLang() { try { return localStorage.getItem('hyhy_lang') || 'zh'; } catch (e) { return 'zh'; } }
  function setLang(v) { try { localStorage.setItem('hyhy_lang', v); } catch (e) {} }
  function pack() { return I18N[getLang()]; }
  // 暴露给 search.js 等其它脚本在运行时取当前语言文案（如搜索无结果提示）
  window.HYHY_I18N = I18N;
  window.HYHY_GET_LANG = getLang;

  function applyTheme() {
    var d; try { d = localStorage.getItem('hyhy_theme') === 'dark'; } catch (e) { d = false; }
    if (d) ROOT.setAttribute('data-theme', 'dark');
    else ROOT.removeAttribute('data-theme');
  }

  // inject bottom nav
  var nav = document.createElement('footer');
  nav.className = 'bottom-nav';
  nav.id = 'hyhy-bottom-nav';
  nav.setAttribute('aria-label', '底部导航 / Bottom bar');
  // 计算站内链接相对前缀（posts/*/index.html 需要 ../../）
  var segs = PAGE.split('/');
  var depth = Math.max(0, segs.length - 1);
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : '';

  var NAV_LINKS = [
    { key: 'index.html', href: 'index.html', zh: '首页', en: 'Home' },
    { key: 'study.html', href: 'study.html', zh: '学习', en: 'Study' },
    { key: 'projects.html', href: 'projects.html', zh: '项目', en: 'Projects' },
    { key: 'collections.html', href: 'collections.html', zh: '娱乐', en: 'Entertainment' },
    { key: 'about.html', href: 'about.html', zh: '关于', en: 'About' }
  ];
  var linksHtml = '<nav class="bn-links" aria-label="站内导航">';
  NAV_LINKS.forEach(function (it) {
    var active = (segs[segs.length - 1] === it.key) ? ' aria-current="page"' : '';
    linksHtml += '<a class="bn-link" href="' + prefix + it.href + '"' + active + '>' + it.zh + '</a>';
  });
  linksHtml += '</nav>';

  nav.innerHTML =
    '<div class="bottom-nav-inner">' +
      linksHtml +
      '<div class="bn-controls">' +
        '<button class="bn-btn bn-sound" type="button" aria-label="开关背景视频声音" hidden>🔇</button>' +
        '<button class="bn-btn bn-cursor" type="button" aria-label="切换自定义鼠标指针">光标: 开</button>' +
        '<button class="bn-btn bn-theme" type="button" aria-label="切换深浅模式"></button>' +
        '<button class="bn-btn bn-lang" type="button" aria-label="切换语言"></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(nav);

  var themeBtn = nav.querySelector('.bn-theme');
  var langBtn = nav.querySelector('.bn-lang');
  var soundBtn = nav.querySelector('.bn-sound');
  var cursorBtn = nav.querySelector('.bn-cursor');
  var linkEls = nav.querySelectorAll('.bn-link');

  function refreshThemeBtn() {
    var p = pack();
    var dark = ROOT.getAttribute('data-theme') === 'dark';
    themeBtn.textContent = dark ? p.themeLight : p.themeDark;
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', p.themeAria);
  }

  function applyLang() {
    var p = pack();
    var lang = getLang();
    // 浏览器标签标题在两种语言下始终为站点名（与“网页名称只叫 Hyhyhyyy”一致）
    document.title = 'Hyhyhyyy';
    var h1 = document.querySelector('h1');
    if (h1 && p.headings[PAGE]) h1.textContent = p.headings[PAGE];
    var sk = document.querySelector('.skip-link');
    if (sk) sk.textContent = p.skipLink;
    // 站内搜索框（首页及多页共用 UI 外壳）：随语言切换占位符 / 可见标签 / aria
    var searchInput = document.getElementById('site-search');
    if (searchInput) {
      searchInput.placeholder = p.searchPlaceholder;
      searchInput.setAttribute('aria-label', p.searchAria);
    }
    var searchLabel = document.querySelector('.site-search label');
    if (searchLabel) searchLabel.textContent = p.searchLabel;
    // 首页 meta 描述（社交分享 / SEO）：随语言切换，保证英文模式下分享卡片也是英文
    if (PAGE === 'index.html') {
      ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(function (sel) {
        var m = document.querySelector(sel);
        if (m) m.setAttribute('content', p.indexDesc);
      });
    }
    langBtn.textContent = p.langOther;
    langBtn.setAttribute('aria-label', p.langAria);
    // 导航链接文案随语言切换
    for (var i = 0; i < linkEls.length && i < NAV_LINKS.length; i++) {
      linkEls[i].textContent = lang === 'en' ? NAV_LINKS[i].en : NAV_LINKS[i].zh;
    }
    syncCursorLabel();
    refreshSoundAria();
    refreshThemeBtn();
  }

  langBtn.addEventListener('click', function () {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
    applyLang();
  });

  themeBtn.addEventListener('click', function () {
    var d = ROOT.getAttribute('data-theme') !== 'dark';
    if (d) ROOT.setAttribute('data-theme', 'dark');
    else ROOT.removeAttribute('data-theme');
    try { localStorage.setItem('hyhy_theme', d ? 'dark' : 'light'); } catch (e) {}
    refreshThemeBtn();
  });

  /* ---- 自定义光标开关（记忆偏好，点击后重载以应用） ---- */
  var cursorOff = false;
  try { cursorOff = localStorage.getItem('hyhy_cursor_off') === '1'; } catch (e) {}
  function syncCursorLabel() {
    var p = pack();
    cursorBtn.textContent = cursorOff ? p.cursorOff : p.cursorOn;
    cursorBtn.setAttribute('aria-pressed', cursorOff ? 'true' : 'false');
    cursorBtn.setAttribute('aria-label', p.cursorAria);
  }
  cursorBtn.addEventListener('click', function () {
    cursorOff = !cursorOff;
    try { localStorage.setItem('hyhy_cursor_off', cursorOff ? '1' : '0'); } catch (e) {}
    syncCursorLabel();
    location.reload();
  });

  /* ---- 背景视频声音开关（仅首页 #bg-video 存在时显示并生效） ---- */
  var bgVideo = null;
  function refreshSoundAria() {
    if (!bgVideo || !soundBtn || soundBtn.hidden) return;
    var p = pack();
    soundBtn.setAttribute('aria-label', bgVideo.muted ? p.soundOffAria : p.soundOnAria);
  }
  (function initSound() {
    var v = document.getElementById('bg-video');
    if (!v) { if (soundBtn) soundBtn.hidden = true; return; }
    bgVideo = v;
    if (soundBtn) soundBtn.hidden = false;
    var saved = null;
    try { saved = localStorage.getItem('hyhy_bg_sound'); } catch (e) {}
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('autoplay', '');
    function applyIcon() {
      soundBtn.textContent = v.muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
      refreshSoundAria();
    }
    function startMuted() {
      var p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          var onFirst = function () {
            var q = v.play();
            if (q && typeof q.catch === 'function') q.catch(function () {});
            window.removeEventListener('pointerdown', onFirst);
            window.removeEventListener('keydown', onFirst);
          };
          window.addEventListener('pointerdown', onFirst, { once: true });
          window.addEventListener('keydown', onFirst, { once: true });
        });
      }
    }
    startMuted();
    if (saved === '1') {
      var restore = function (e) {
        if (soundBtn.contains(e.target)) return;
        v.muted = false;
        applyIcon();
        window.removeEventListener('pointerdown', restore);
        window.removeEventListener('keydown', restore);
      };
      window.addEventListener('pointerdown', restore);
      window.addEventListener('keydown', restore);
    }
    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      v.muted = !v.muted;
      try { localStorage.setItem('hyhy_bg_sound', v.muted ? '0' : '1'); } catch (e) {}
      applyIcon();
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });
    applyIcon();
  })();

  // boot
  applyTheme();
  applyLang();
})();
