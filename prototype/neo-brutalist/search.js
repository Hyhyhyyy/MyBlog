/* U5：全站客户端搜索 —— 匹配标题/分类/文件名，下拉展示结果（无后端依赖） */
(function () {
  'use strict';
  var INDEX = [
    { t: '首页', h: 'index.html', c: '导航' },
    { t: '娱乐合集', h: 'collections.html', c: '导航' },
    { t: '关于', h: 'about.html', c: '导航' },
    { t: '项目', h: 'projects.html', c: '导航' },
    { t: '学习', h: 'study.html', c: '导航' },
    { t: 'SIX 六位王后', h: 'six.html', c: '音乐剧' },
    { t: '摇滚红与黑', h: 'red-black.html', c: '音乐剧' },
    { t: '呼兰河传', h: 'hulanhe.html', c: '文学' },
    { t: '草房子', h: 'caofangzi.html', c: '文学' },
    { t: '卡尔维诺短篇小说集', h: 'calvino.html', c: '文学' },
    { t: 'Friends 老友记', h: 'friends.html', c: '影视' },
    { t: 'Sherlock 神探夏洛克', h: 'sherlock.html', c: '影视' },
    { t: '小马宝莉', h: 'mlp.html', c: '影视' },
    { t: 'IT狂人', h: 'itcrowd.html', c: '影视' }
  ];
  function init() {
    var input = document.getElementById('site-search');
    var list = document.getElementById('search-results');
    if (!input || !list) return;
    function render(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) { list.hidden = true; list.innerHTML = ''; return; }
      var hits = INDEX.filter(function (it) {
        return (it.t + ' ' + it.c + ' ' + it.h).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 8);
      if (!hits.length) {
        list.innerHTML = '<li><a href="#" tabindex="-1">无匹配结果</a></li>';
        list.hidden = false; return;
      }
      list.innerHTML = hits.map(function (it) {
        return '<li><a href="' + it.h + '">' + it.t + '<span class="cat">' + it.c + '</span></a></li>';
      }).join('');
      list.hidden = false;
    }
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value) render(input.value); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.site-search')) list.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { list.hidden = true; input.blur(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
