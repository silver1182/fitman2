// 根据 sw.js 自身位置推断基础路径（APK 和 GitHub Pages 都适用）
const BASE = self.location.pathname.replace(/\/sw\.js$/, '/')

const CACHE = 'fitman-v2'
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
]

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 请求：缓存优先，网络兜底
self.addEventListener('fetch', event => {
  // API/分析请求直接走网络
  if (event.request.url.includes('/api/') || event.request.url.includes('google-analytics')) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 缓存命中 → 返回缓存
      if (cached) return cached

      // 网络请求 → 成功后加入缓存
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response

        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(event.request, clone))
        return response
      }).catch(() => {
        // 离线且无缓存 → 返回首页
        if (event.request.mode === 'navigate') {
          return caches.match(BASE)
        }
      })
    })
  )
})
