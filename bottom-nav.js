/* bottom-nav.js — 注入底部对称玻璃导航栏 + 主题/语言切换 + i18n
   依赖：bottom-nav.css。设计为对每个页面零侵入（自动 append 到 body）。 */
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
      langOther: 'EN',
      titles: {
        '404.html': '404 / 页面走丢了 — Hyhyhyyy',
        'about.html': 'ABOUT / 关于 — Hyhyhyyy',
        'calvino.html': '卡尔维诺短篇小说集 | 娱乐合集',
        'caofangzi.html': '草房子 · 曹文轩 | 娱乐合集',
        'collections.html': 'ENTERTAINMENT / 娱乐合集 — Hyhyhyyy',
        'friends.html': 'Friends — 老友记 | Hyhyhyyy 娱乐合集',
        'hamilton.html': '汉密尔顿 · 音乐剧 HAMILTON — 娱乐合集',
        'hulanhe.html': '呼兰河传 · 萧红 | 娱乐合集',
        'index.html': 'Hyhyhyyy — Neo-Brutalist Prototype',
        'itcrowd.html': 'The IT Crowd — IT狂人 | Hyhyhyyy 娱乐合集',
        'legally-blonde.html': '律政俏佳人 · 音乐剧 LEGALLY BLONDE — 娱乐合集',
        'mlp.html': 'My Little Pony: Friendship Is Magic — 小马宝莉 | Hyhyhyyy 娱乐合集',
        'projects.html': '项目 / PROJECTS — Hyhyhyyy',
        'red-black.html': '摇滚红与黑 — Le Rouge et le Noir | Hyhyhyyy 娱乐合集',
        'sherlock.html': 'Sherlock — 神探夏洛克 | Hyhyhyyy 娱乐合集',
        'six.html': 'SIX — 六位王后 | Hyhyhyyy 娱乐合集',
        'study.html': 'STUDY / 学习 — Hyhyhyyy',
        'woyu-ditan.html': '我与地坛 · 史铁生 — 娱乐合集'
      },
      headings: {
        '404.html': '页面走丢了',
        'calvino.html': '卡尔维诺短篇小说集',
        'caofangzi.html': '草房子',
        'friends.html': 'Friends',
        'hamilton.html': 'HAMILTON',
        'hulanhe.html': '呼兰河传',
        'itcrowd.html': 'The IT Crowd',
        'legally-blonde.html': 'LEGALLY BLONDE',
        'mlp.html': 'My Little Pony: Friendship Is Magic',
        'red-black.html': '摇滚红与黑',
        'sherlock.html': 'SHERLOCK',
        'six.html': 'SIX',
        'woyu-ditan.html': '我与地坛'
      }
    },
    en: {
      skipLink: 'Skip to main content',
      themeDark: 'Dark',
      themeLight: 'Light',
      langOther: '中',
      titles: {
        '404.html': '404 / Page Lost — Hyhyhyyy',
        'about.html': 'ABOUT — Hyhyhyyy',
        'calvino.html': 'Calvino Short Stories | Collection',
        'caofangzi.html': 'Cao Fangzi · Cao Wenxuan | Collection',
        'collections.html': 'ENTERTAINMENT / Collection — Hyhyhyyy',
        'friends.html': 'Friends — Collection | Hyhyhyyy',
        'hamilton.html': 'Hamilton · Musical — Collection | Hyhyhyyy',
        'hulanhe.html': 'Hulan River · Xiao Hong | Collection',
        'index.html': 'Hyhyhyyy — Neo-Brutalist Prototype',
        'itcrowd.html': 'The IT Crowd — Collection | Hyhyhyyy',
        'legally-blonde.html': 'Legally Blonde · Musical — Collection | Hyhyhyyy',
        'mlp.html': 'My Little Pony: Friendship Is Magic — Collection | Hyhyhyyy',
        'projects.html': 'PROJECTS — Hyhyhyyy',
        'red-black.html': 'Le Rouge et le Noir — Collection | Hyhyhyyy',
        'sherlock.html': 'Sherlock — Collection | Hyhyhyyy',
        'six.html': 'SIX — Six Queens | Hyhyhyyy',
        'study.html': 'STUDY — Hyhyhyyy',
        'woyu-ditan.html': 'Me and the Altar of Earth · Shi Tiesheng — Collection'
      },
      headings: {
        '404.html': 'Page Lost',
        'calvino.html': 'Calvino Short Stories',
        'caofangzi.html': 'Cao Fangzi',
        'friends.html': 'Friends',
        'hamilton.html': 'HAMILTON',
        'hulanhe.html': 'Hulan River',
        'itcrowd.html': 'The IT Crowd',
        'legally-blonde.html': 'LEGALLY BLONDE',
        'mlp.html': 'My Little Pony: Friendship Is Magic',
        'red-black.html': 'Le Rouge et le Noir',
        'sherlock.html': 'SHERLOCK',
        'six.html': 'SIX',
        'woyu-ditan.html': 'Me and the Altar of Earth'
      }
    }
  };

  function getLang() { try { return localStorage.getItem('hyhy_lang') || 'zh'; } catch (e) { return 'zh'; } }
  function setLang(v) { try { localStorage.setItem('hyhy_lang', v); } catch (e) {} }

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
    { key: 'index.html', href: 'index.html', label: '首页' },
    { key: 'study.html', href: 'study.html', label: '学习' },
    { key: 'projects.html', href: 'projects.html', label: '项目' },
    { key: 'collections.html', href: 'collections.html', label: '娱乐' },
    { key: 'about.html', href: 'about.html', label: '关于' }
  ];
  var linksHtml = '<nav class="bn-links" aria-label="站内导航">';
  NAV_LINKS.forEach(function (it) {
    var active = (segs[segs.length - 1] === it.key) ? ' aria-current="page"' : '';
    linksHtml += '<a class="bn-link" href="' + prefix + it.href + '"' + active + '>' + it.label + '</a>';
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

  function refreshThemeBtn() {
    var lang = getLang();
    var pack = I18N[lang];
    var dark = ROOT.getAttribute('data-theme') === 'dark';
    themeBtn.textContent = dark ? pack.themeLight : pack.themeDark;
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  themeBtn.addEventListener('click', function () {
    var d = ROOT.getAttribute('data-theme') !== 'dark';
    if (d) ROOT.setAttribute('data-theme', 'dark');
    else ROOT.removeAttribute('data-theme');
    try { localStorage.setItem('hyhy_theme', d ? 'dark' : 'light'); } catch (e) {}
    refreshThemeBtn();
  });

  function applyLang() {
    var lang = getLang();
    var pack = I18N[lang];
    if (pack.titles[PAGE]) document.title = pack.titles[PAGE];
    var h1 = document.querySelector('h1');
    if (h1 && pack.headings[PAGE]) h1.textContent = pack.headings[PAGE];
    var sk = document.querySelector('.skip-link');
    if (sk) sk.textContent = pack.skipLink;
    langBtn.textContent = pack.langOther;
    refreshThemeBtn();
  }

  langBtn.addEventListener('click', function () {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
    applyLang();
  });

  /* ---- 背景视频声音开关（仅首页 #bg-video 存在时显示并生效） ---- */
  (function initSound() {
    var v = document.getElementById('bg-video');
    if (!v) { if (soundBtn) soundBtn.hidden = true; return; }
    if (soundBtn) soundBtn.hidden = false;
    var saved = null;
    try { saved = localStorage.getItem('hyhy_bg_sound'); } catch (e) {}
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('autoplay', '');
    function applyIcon() {
      soundBtn.textContent = v.muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
      soundBtn.setAttribute('aria-label', v.muted ? '开启背景视频声音' : '关闭背景视频声音');
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

  /* ---- 自定义光标开关（记忆偏好，点击后重载以应用） ---- */
  (function initCursor() {
    if (!cursorBtn) return;
    var off = false;
    try { off = localStorage.getItem('hyhy_cursor_off') === '1'; } catch (e) {}
    function sync() {
      cursorBtn.textContent = off ? '光标: 关' : '光标: 开';
      cursorBtn.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    sync();
    cursorBtn.addEventListener('click', function () {
      off = !off;
      try { localStorage.setItem('hyhy_cursor_off', off ? '1' : '0'); } catch (e) {}
      sync();
      location.reload();
    });
  })();

  // boot
  applyTheme();
  applyLang();
})();