const CACHE_NAME = 'coalition';
const toCache = [
  '/',
  './favicon.ico',
  './img/1.webp',
  './img/2.webp',
  './img/3.webp',
  './img/4.webp',
  './img/logo.png',
  './img/logo2.png',
  './img/footer-logo.png',
  './img/tab1.webp',
  './img/tab2.webp',
  './img/second_img.webp',
  './img/full-hero.webp',
  './css/animate.css',
  './css/animate.css.map',
  './css/main.css',
  './js/bootstrap-notify.min.js',
  './js/bootstrap.js',
  './js/jquery-3.5.1.min.js',
  './js/notify-script.js',
  './js/pwa.js',
  './js/voice_script.js',
  './pwa.webmanifest',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(toCache)
      })
      .then(self.skipWaiting())
  )
})

self.addEventListener('fetch', async function(event) {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.match(event.request)
          })
      })
  )
})


self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key)
            return caches.delete(key)
          }
        }))
      })
      .then(() => self.clients.claim())
  )
})