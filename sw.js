/* HYHY PWA service worker — U18：改为「永不缓存」纯透传。
   每次同域 GET 都带 cache:'no-cache' 走网络拿最新资源（绕过浏览器 HTTP 缓存），
   仅把响应留作离线兜底。彻底消除回访用户被旧缓存挡住、看不到更新的问题。 */
const CACHE = 'hyhy-v18';
const CORE = [
  'index.html', 'collections.html', 'about.html', 'projects.html', 'study.html',
  'six.html', 'red-black.html', 'hulanhe.html', 'caofangzi.html', 'calvino.html',
  'friends.html', 'sherlock.html', 'mlp.html', 'itcrowd.html',
  'style.css', 'a11y.css', 'favicon.svg',
  'gooey-nav.js', 'magic-bento.js', 'DotField.js', 'drift-wall.js', 'collections.js',
  'liquid-glass.js', 'liquid-glass-wrap.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () {
      return self.skipWaiting();
    }).catch(function () { /* 离线环境下 addAll 可能失败，忽略以允许安装 */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 所有同域 GET：network-first + cache:'no-cache'，保证内容永远最新；
   仅在断网时降级到离线缓存（或首页），不影响在线访问的新鲜度。 */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      })
      .catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('index.html');
        });
      })
  );
});
