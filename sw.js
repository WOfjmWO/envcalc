// 环境监测计算工作台 Service Worker
// v52 —— 范工三项增量：① 油气回收密闭性「判定检测条件」即时绿/红（无需先输剩余压力）；② g1-oil 净化效率按 GB 18483 排放速率计算（η=(Q前C前−Q后C后)/(Q前C前)×100%，新增 Q前/Q后）；③ p1b 新增 PM2.5/PM10（HJ 618-2011 恒重法）+ 排版优化；本地验证 16/16 功能断言 + 13/13 Edge 真实渲染回归全过
const CACHE = 'envcalc-v52-20260824';
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
