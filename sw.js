// 环境监测计算工作台 Service Worker
// v54 —— 在 v53（TVOC 附录C/D 重构 + 选择框美化 + HJ836 恒重）基础上新增：一级 Tab 栏与二级子组导航栏同时吸顶固定（tabs-scroll top:0，subgroup-nav top:56px），子组锚点 scroll-margin-top 同步 126px
const CACHE = 'envcalc-v54-20260824';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个 add，单个资源失败不影响整体安装（addAll 只要一个 404 就全盘失败）
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var isDoc = e.request.mode === 'navigate' ||
              (e.request.destination === 'document') ||
              /\.html($|\?)/.test(e.request.url);

  if (isDoc) {
    // 页面：网络优先（联网时永远拿最新版），失败回落缓存 → 断网照常可用
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        }
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(function (r) {
      if (r) return r;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        }
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
