// 环境监测计算工作台 Service Worker
// v64 —— 在 v63 基础上：① g8-tvoc「检测方法」select 改为跨整行 + 加 title，彻底解决选项文字截断（此前 #78 全局改造未覆盖 input-grid 内 select）；② g8-tvoc-d 将 "Aᵢ/kᵢ" 明确为 "峰面积 Aᵢ/斜率 kᵢ" 并放大卡片列宽（每卡片≥300px、内部两列），解决格子过小与标注不清；③ 三处恒重模块（g8-pm / p1b / a20）改为"恒重不合格仍照算并输出浓度、红字标注仅供参考"，移除"不恒重不输出"限制；④ g1-nmhc 干基折算整合进有组织废气场景（移除 hj1332 单独输入方式），新增氧峰输入（总烃减氧峰），输入含湿量即自动折算干基浓度 C干基=C湿基/(1−Xsw)；⑤ HJ 734-2014 与 HJ 644-2013 改为每行输入（ng / 峰面积+斜率）即自动计算该化合物浓度，标况体积/标干废气量变更也触发全量重算。v63：统一分光光度法 Bs=1/k 范式、O1 输入即自动判定、weigh-status 红绿配色。
const CACHE = 'envcalc-v64-20260825';
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
