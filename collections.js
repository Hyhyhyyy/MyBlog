/* Collections — 娱乐合集（9 件作品）
 * 交给 InfiniteMenu 渲染：image 用各合集的真实 3:2 封面（*-tile.jpg，320×218），
 *   title 是合集名（左），description 是分类（右），link 是对应详情页。
 * 顺序对应 InfiniteMenu 旋转 disc 的 9 个槽位（atlas cell）。
 */
(function () {
  window.COLLECTIONS = [
    { image: 'six-tile.jpg',        link: 'six.html',      title: 'SIX 六位王后',                   description: '音乐剧' },
    { image: 'red-black-tile.jpg',  link: 'red-black.html', title: '摇滚红与黑 Le Rouge et le Noir', description: '音乐剧' },
    { image: 'hulanhe-tile.jpg',    link: 'hulanhe.html',   title: '呼兰河传 · 萧红',                description: '文学' },
    { image: 'caofangzi-tile.jpg',  link: 'caofangzi.html', title: '草房子 · 曹文轩',                description: '文学' },
    { image: 'calvino-tile.jpg',    link: 'calvino.html',   title: '卡尔维诺短篇小说集',             description: '文学' },
    { image: 'mlp-tile.jpg',        link: 'mlp.html',       title: '小马宝莉 Friendship Is Magic',  description: '影视' },
    { image: 'itcrowd-tile.jpg',    link: 'itcrowd.html',   title: 'IT狂人 The IT Crowd',            description: '影视' },
    { image: 'friends-tile.jpg',    link: 'friends.html',   title: 'Friends 老友记',                 description: '影视' },
    { image: 'sherlock-tile.jpg',   link: 'sherlock.html',  title: 'Sherlock 神探夏洛克',            description: '影视' }
  ];

  function boot() {
    var root = document.getElementById('im-root');
    if (!root) { console.warn('[collections] #im-root not found'); return; }
    if (!window.InfiniteMenu) { console.warn('[collections] window.InfiniteMenu missing'); return; }
    window.InfiniteMenu(root, window.COLLECTIONS, { scale: 1.0 });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
