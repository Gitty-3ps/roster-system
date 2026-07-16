/**
 * sw.js — Service Worker for GraceBoard.
 *
 * Strategy: Cache-first for app shell + PDF libraries (so the app
 * and PDF download work fully offline), network-first for everything
 * else (Firestore uses its own IndexedDB offline layer — not this SW).
 */

const CACHE_NAME = 'graceboard-v3';

// Everything needed to run the app and generate PDFs offline
const PRECACHE = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/utils.js',
  '/js/pdf.js',
  // jsPDF + autotable — cached so PDF works offline
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

// ── Install: pre-cache the app shell ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
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

// ── Fetch: cache-first for shell, passthrough for Firestore ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Let Firestore and Firebase Auth handle their own requests
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google.com')
  ) {
    return; // don't intercept
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for future offline use
        if (event.request.method === 'GET' && response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // If fetch fails and it's a page navigation, serve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    }),
  );
});
