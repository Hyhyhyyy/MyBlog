/* HYHY PWA service worker — 离线缓存核心静态资源（U14：全站品牌统一为「番茄头像 + Hyhyhyyy」） */
const CACHE = 'hyhy-v14';
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

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        // 仅缓存 2xx 响应，避免缓存错误页
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
