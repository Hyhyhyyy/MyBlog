/* U5：全站客户端搜索 —— 匹配标题/分类/文件名/描述，下拉展示结果（无后端依赖）
   覆盖范围：静态导航页 + 娱乐合集条目 + 动态「项目」（projects-index.json）+ 动态「笔记」（posts/manifest.json）。 */
(function () {
  'use strict';
  // 子页（posts/<slug>/）下相对路径需要回退到站点根
  var P = (/\/posts\//.test(location.pathname)) ? '../../' : '';

  // 每条目含中文(zh)与英文(en)的标题(t)与分类(c)，按当前语言选取
  var INDEX = [
    { zh: '首页', en: 'Home', h: 'index.html', zc: '导航', ec: 'Nav' },
    { zh: '娱乐合集', en: 'Entertainment', h: 'collections.html', zc: '导航', ec: 'Nav' },
    { zh: '关于', en: 'About', h: 'about.html', zc: '导航', ec: 'Nav' },
    { zh: '项目', en: 'Projects', h: 'projects.html', zc: '导航', ec: 'Nav' },
    { zh: '学习', en: 'Study', h: 'study.html', zc: '导航', ec: 'Nav' },
    { zh: 'SIX 六位王后', en: 'SIX', h: 'six.html', zc: '音乐剧', ec: 'Musical' },
    { zh: '摇滚红与黑', en: 'Le Rouge et le Noir', h: 'red-black.html', zc: '音乐剧', ec: 'Musical' },
    { zh: '呼兰河传', en: 'Hulan River', h: 'hulanhe.html', zc: '文学', ec: 'Literature' },
    { zh: '草房子', en: 'Cao Fangzi', h: 'caofangzi.html', zc: '文学', ec: 'Literature' },
    { zh: '卡尔维诺短篇小说集', en: 'Calvino Short Stories', h: 'calvino.html', zc: '文学', ec: 'Literature' },
    { zh: 'Friends 老友记', en: 'Friends', h: 'friends.html', zc: '影视', ec: 'Film & TV' },
    { zh: 'Sherlock 神探夏洛克', en: 'Sherlock', h: 'sherlock.html', zc: '影视', ec: 'Film & TV' },
    { zh: '小马宝莉', en: 'My Little Pony', h: 'mlp.html', zc: '影视', ec: 'Film & TV' },
    { zh: 'IT狂人', en: 'The IT Crowd', h: 'itcrowd.html', zc: '影视', ec: 'Film & TV' }
  ];

  function lang() { return (window.HYHY_GET_LANG && window.HYHY_GET_LANG() === 'en') ? 'en' : 'zh'; }

  var currentQ = '';

  function matchText(it) {
    var L = lang();
    return ((L === 'en' ? it.en : it.zh) + ' ' + (L === 'en' ? it.ec : it.zc) + ' ' + (it.h || '') + ' ' + (it.d || '')).toLowerCase();
  }

  function rerender() { if (currentQ) render(currentQ); }

  function render(q) {
    currentQ = q;
    q = (q || '').trim().toLowerCase();
    if (!q) { list.hidden = true; list.innerHTML = ''; return; }
    var hits = INDEX.filter(function (it) {
      return matchText(it).indexOf(q) >= 0;
    }).slice(0, 10);
    if (!hits.length) {
      var noRes = (window.HYHY_I18N && window.HYHY_GET_LANG)
        ? window.HYHY_I18N[window.HYHY_GET_LANG()].noResults
        : '无匹配结果';
      list.innerHTML = '<li><a href="#" tabindex="-1">' + noRes + '</a></li>';
      list.hidden = false; return;
    }
    var L = lang();
    list.innerHTML = hits.map(function (it) {
      return '<li><a href="' + it.h + '">' + (L === 'en' ? it.en : it.zh) + '<span class="cat">' + (L === 'en' ? it.ec : it.zc) + '</span></a></li>';
    }).join('');
    list.hidden = false;
  }

  var input, list;

  function loadExtra() {
    // 项目（GitHub 仓库）
    fetch(P + 'projects-index.json')
      .then(function (r) { return r.json(); })
      .then(function (arr) {
        (arr || []).forEach(function (p) {
          INDEX.push({ t: p.name, h: p.url, c: '项目', d: p.desc });
        });
        rerender();
      })
      .catch(function () {});
    // 笔记（传统博客文章）
    fetch(P + 'posts/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (m) {
        (m.posts || []).forEach(function (p) {
          INDEX.push({ t: p.title, h: P + p.url, c: '笔记·' + p.category, d: p.description });
        });
        rerender();
      })
      .catch(function () {});
  }

  function init() {
    input = document.getElementById('site-search');
    list = document.getElementById('search-results');
    if (!input || !list) return;
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value) render(input.value); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.site-search')) list.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { list.hidden = true; input.blur(); }
    });
    loadExtra();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
