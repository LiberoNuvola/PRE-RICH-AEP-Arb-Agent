const CACHE_NAME = 'arb-wallet-companion-w1-v1'
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.webmanifest',
  './icon.svg',
  // main.js imports these modules from the repository-root wallet companion.
  // They must be cached because this worker intercepts same-origin requests
  // from the controlled app, including requests outside its /app/ scope.
  '../wallet-companion/cip30-read-only.js',
  '../wallet-companion/minswap-v2-position-link.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// This shell serves only pre-cached same-origin application assets. It does not
// proxy, contact, or cache wallet/provider API traffic.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  // Tracking/query parameters must not make an otherwise cached static asset
  // miss the app shell cache (for example, /app/?utm_source=...).
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => cached || Response.error()),
  )
})
