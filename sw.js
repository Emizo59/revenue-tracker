const CACHE_NAME = 'revenue-tracker-v2.1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './logo.png',
  './manifest.json',
  './chart.js',
  './all.min.css',
  './webfonts/fa-solid-900.woff2',
  './webfonts/fa-regular-400.woff2'
];

// حدث التثبيت - التخزين المؤقت للملفات الأساسية
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// حدث التنشيط - تنظيف ذاكرة التخزين القديمة إن وجدت
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// الاستجابة الذكية لطلبات الشبكة - خدمة الملفات من الكاش في حال عدم وجود إنترنت
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
