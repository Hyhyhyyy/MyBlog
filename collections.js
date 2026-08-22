/* Collections — 娱乐合集（9 件作品）
 * 交给 InfiniteMenu 渲染：image 用各合集的真实 3:2 封面（*-tile.jpg，320×218），
 *   title 是中文名（左列第一行），original 是原文名（左列第二行），description 是分类（左列、与标题同字体对称），
 *   link 是对应详情页。顺序对应 InfiniteMenu 旋转 disc 的 9 个槽位（atlas cell）。
 * 注：中文原产作品（呼兰河传 / 草房子）无外文原名，original 取其汉语拼音作为"原文"行。
 */
(function () {
  window.COLLECTIONS = [
    { image: 'six-tile.jpg',        link: 'six.html',      title: '六',          original: 'SIX',                description: '音乐剧' },
    { image: 'red-black-tile.jpg',  link: 'red-black.html', title: '红与黑',      original: 'Le Rouge et le Noir', description: '音乐剧' },
    { image: 'hulanhe-tile.jpg',    link: 'hulanhe.html',   title: '呼兰河传',    original: 'Hūlán Hé Zhuàn',    description: '文学' },
    { image: 'caofangzi-tile.jpg',  link: 'caofangzi.html', title: '草房子',      original: 'Cǎo Fángzi',        description: '文学' },
    { image: 'calvino-tile.jpg',    link: 'calvino.html',   title: '卡尔维诺',    original: 'Italo Calvino',     description: '文学' },
    { image: 'mlp-tile.jpg',        link: 'mlp.html',       title: '小马宝莉',    original: 'My Little Pony',    description: '影视' },
    { image: 'itcrowd-tile.jpg',    link: 'itcrowd.html',   title: 'IT狂人',      original: 'The IT Crowd',      description: '影视' },
    { image: 'friends-tile.jpg',    link: 'friends.html',   title: '老友记',      original: 'Friends',           description: '影视' },
    { image: 'sherlock-tile.jpg',   link: 'sherlock.html',  title: '神探夏洛克',  original: 'Sherlock',          description: '影视' }
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
