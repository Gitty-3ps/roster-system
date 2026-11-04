/**
 * sw.js — Service Worker for GraceBoard.
 *
 * App files: network-first, falling back to cache when offline (so deploys
 * show up right away instead of serving stale code).
 * CDN libraries (jsPDF etc.): cache-first so PDF export works offline.
 * Firestore/Firebase Auth handle their own offline layer, so we don't touch them.
 */

const CACHE_NAME = 'graceboard-v8';

// Relative paths so this works on a GitHub Pages project site (/repo-name/).
// firebase-config.js is intentionally NOT here: it is generated at deploy time.
const PRECACHE = [
  './',
  'index.html',
  'css/tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'js/app.js',
  'js/auth.js',
  'js/firebase.js',
  'js/storage.js',
  'js/ui.js',
  'js/utils.js',
  'js/pdf.js',
  // jsPDF + autotable — cached so PDF works offline
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

// ── Install: pre-cache the app shell ──────────────────────
// Each file is cached separately, so one missing file doesn't
// make the whole install fail (cache.addAll fails if any 404s).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('SW: could not precache', url, err)),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// ── Helper: store a copy of a response ────────────────────
function cachePut(request, response) {
  // Clone synchronously, before the response is returned or read
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests over http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Let Firestore and Firebase Auth handle their own requests
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;

  // CDN libraries: cache-first
  if (!isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) cachePut(request, response);
          return response;
        });
      }),
    );
    return;
  }

  // App files: network-first, cache as offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) cachePut(request, response);
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match(new URL('index.html', self.registration.scope).href);
          }
          return Response.error();
        }),
      ),
  );
});