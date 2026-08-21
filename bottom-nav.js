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
        '404.html': '404 / 页面走丢了 — HYHY',
        'about.html': 'ABOUT / 关于 — HYHY',
        'calvino.html': '卡尔维诺短篇小说集 | 娱乐合集',
        'caofangzi.html': '草房子 · 曹文轩 | 娱乐合集',
        'collections.html': 'ENTERTAINMENT / 娱乐合集 — HYHY',
        'friends.html': 'Friends — 老友记 | HYHY 娱乐合集',
        'hamilton.html': '汉密尔顿 · 音乐剧 HAMILTON — 娱乐合集',
        'hulanhe.html': '呼兰河传 · 萧红 | 娱乐合集',
        'index.html': 'HYHY · Growth Archive — Neo-Brutalist Prototype',
        'itcrowd.html': 'The IT Crowd — IT狂人 | HYHY 娱乐合集',
        'legally-blonde.html': '律政俏佳人 · 音乐剧 LEGALLY BLONDE — 娱乐合集',
        'mlp.html': 'My Little Pony: Friendship Is Magic — 小马宝莉 | HYHY 娱乐合集',
        'projects.html': '项目 / PROJECTS — HYHY',
        'red-black.html': '摇滚红与黑 — Le Rouge et le Noir | HYHY 娱乐合集',
        'sherlock.html': 'Sherlock — 神探夏洛克 | HYHY 娱乐合集',
        'six.html': 'SIX — 六位王后 | HYHY 娱乐合集',
        'study.html': 'STUDY / 学习 — HYHY',
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
        '404.html': '404 / Page Lost — HYHY',
        'about.html': 'ABOUT — HYHY',
        'calvino.html': 'Calvino Short Stories | Collection',
        'caofangzi.html': 'Cao Fangzi · Cao Wenxuan | Collection',
        'collections.html': 'ENTERTAINMENT / Collection — HYHY',
        'friends.html': 'Friends — Collection | HYHY',
        'hamilton.html': 'Hamilton · Musical — Collection | HYHY',
        'hulanhe.html': 'Hulan River · Xiao Hong | Collection',
        'index.html': 'HYHY · Growth Archive — Neo-Brutalist Prototype',
        'itcrowd.html': 'The IT Crowd — Collection | HYHY',
        'legally-blonde.html': 'Legally Blonde · Musical — Collection | HYHY',
        'mlp.html': 'My Little Pony: Friendship Is Magic — Collection | HYHY',
        'projects.html': 'PROJECTS — HYHY',
        'red-black.html': 'Le Rouge et le Noir — Collection | HYHY',
        'sherlock.html': 'Sherlock — Collection | HYHY',
        'six.html': 'SIX — Six Queens | HYHY',
        'study.html': 'STUDY — HYHY',
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
  nav.innerHTML =
    '<div class="bottom-nav-inner">' +
      '<button class="bn-btn bn-theme" type="button" aria-label="切换深浅模式"></button>' +
      '<button class="bn-btn bn-lang" type="button" aria-label="切换语言"></button>' +
    '</div>';
  document.body.appendChild(nav);

  var themeBtn = nav.querySelector('.bn-theme');
  var langBtn = nav.querySelector('.bn-lang');

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

  // boot
  applyTheme();
  applyLang();
})();