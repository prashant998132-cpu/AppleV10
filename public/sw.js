// JARVIS v8 — Service Worker
// ═══════════════════════════════════════════════════════════════
// CACHE STRATEGY:
//   Shell (HTML/JS/CSS) → StaleWhileRevalidate
//   API JSON            → NetworkFirst (fresh data)
//   Media (audio/image) → CacheFirst + 7d TTL (zero re-downloads)
//   TTS audio           → CacheFirst permanent (same text = same audio)
//   Pollinations images → CacheFirst 7d
//   External CDN media  → CacheFirst 30d
// ═══════════════════════════════════════════════════════════════

const VERSION = 'jarvis-v8.1';
const CACHE_SHELL  = `${VERSION}-shell`;
const CACHE_API    = `${VERSION}-api`;
const CACHE_MEDIA  = `${VERSION}-media`;   // audio + images
const CACHE_STATIC = `${VERSION}-static`;

const SHELL_URLS = ['/', '/chat', '/analytics', '/goals', '/memory', '/knowledge', '/settings', '/offline'];

// ─── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(c =>
      c.addAll(SHELL_URLS.map(u => new Request(u, { credentials: 'same-origin' })))
    ).catch(() => {}) // don't fail install if shell cache fails
    .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE — clear old caches ─────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k.startsWith('jarvis-') && !k.startsWith(VERSION))
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ────────────────────────────────────────────────────

// ─── OFFLINE SMART RESPONSES ─────────────────────────────────
// Agar net nahi hai toh bhi JARVIS kuch basic cheezein answer kar sakta hai
const OFFLINE_ANSWERS = [
  { keys: ['time', 'samay', 'baje', 'clock', 'kitne baje'], fn: () => `Abhi ${new Date().toLocaleTimeString('hi-IN', {hour:'2-digit',minute:'2-digit'})} baje hain.` },
  { keys: ['date', 'aaj', 'today', 'tareekh', 'din'], fn: () => `Aaj ${new Date().toLocaleDateString('hi-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})} hai.` },
  { keys: ['calculator', 'calculate', 'math', 'plus', 'minus', 'multiply', '+', '-', '*', '/'],
    fn: (q) => { try { const expr = q.replace(/[^0-9+\-*/().%\s]/g,''); const r = Function('"use strict";return ('+expr+')')(); return `${expr} = ${r}`; } catch { return 'Calculation nahi kar paya. Net chahiye.'; } } },
  { keys: ['hello', 'hi', 'namaste', 'hey', 'hii'], fn: () => 'Namaste! 👋 Abhi offline hoon, lekin main yahan hoon. Net aate hi full power mein wapas aaunga!' },
  { keys: ['bmi', 'weight', 'height'], fn: () => 'BMI = Weight(kg) / Height(m)². Apna weight aur height batao toh main calculate kar sakta hoon offline bhi!' },
  { keys: ['joke', 'funny', 'hasao', 'maza'], fn: () => 'Offline mode mein ek joke: "WiFi bola Modem se — tum sirf cable ho, main connection hoon!" 😄' },
  { keys: ['jarvis', 'kaisa hai', 'how are you', 'theek hai'], fn: () => 'Main theek hoon! Thoda offline hoon abhi, lekin ready hoon. Net aao toh full power! 💪' },
  { keys: ['weather', 'mausam', 'temperature', 'garmi', 'thandi'], fn: () => 'Weather ke liye internet chahiye. Abhi offline hoon.' },
  { keys: ['help', 'kya kar', 'features', 'kya karta'], fn: () => 'Offline mein main kar sakta hoon: ⏰ Time/Date, 🧮 Calculator, 💬 Basic chat. Net aane pe: AI chat, weather, news, phone control sab!' },
];

function getOfflineAnswer(message) {
  if (!message) return null;
  const msg = message.toLowerCase();
  for (const item of OFFLINE_ANSWERS) {
    if (item.keys.some(k => msg.includes(k))) {
      return item.fn(msg);
    }
  }
  return null;
}

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, non-HTTP, chrome-extension etc.
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // 1. TTS audio — permanent cache (same text → same audio)
  if (url.pathname.startsWith('/api/tts') && request.method === 'GET') {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 30));
    return;
  }

  // 2. Pollinations images — 7 day cache
  if (url.hostname === 'image.pollinations.ai') {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 7));
    return;
  }

  // 3. Supabase Storage CDN (our generated images) — 30 day cache
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 30));
    return;
  }

  // 4. AIMLAPI / fal.ai CDN image URLs — 7 day cache
  if (url.hostname.includes('aimlapi.com') || url.hostname.includes('fal.run') ||
      url.hostname.includes('cdn.fal.ai') || url.hostname.includes('storage.googleapis.com')) {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 7));
    return;
  }

  // 5. Mubert CDN music — 30 day cache
  if (url.hostname.includes('mubert.com')) {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 30));
    return;
  }

  // 6. HuggingFace model CDN — 7 day cache
  if (url.hostname.includes('huggingface.co') && url.pathname.includes('/resolve/')) {
    e.respondWith(cacheFirstMedia(request, CACHE_MEDIA, 86400 * 7));
    return;
  }

  // 7. Static assets (JS, CSS, fonts, icons) — CacheFirst 30d
  if (
    url.hostname === self.location.hostname &&
    (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') ||
     url.pathname.endsWith('.woff2') || url.pathname.endsWith('.png'))
  ) {
    e.respondWith(cacheFirstStatic(request));
    return;
  }

  // 8. App API JSON — NetworkFirst 5s timeout, then cache
  if (url.hostname === self.location.hostname && url.pathname.startsWith('/api/')) {
    // Never cache auth or streaming endpoints
    if (url.pathname.includes('/auth') || url.pathname.includes('/stream')) return;
    e.respondWith(networkFirstAPI(request));
    return;
  }

  // 9. App shell pages — StaleWhileRevalidate
  if (url.hostname === self.location.hostname && !url.pathname.includes('.')) {
    e.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ─── STRATEGIES ──────────────────────────────────────────────

// CacheFirst for media — if cached, return immediately (zero network)
async function cacheFirstMedia(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate) {
      const age = (Date.now() - parseInt(cachedDate)) / 1000;
      if (age < maxAgeSeconds) return cached; // fresh — return immediately
    } else {
      return cached; // no date header — assume fresh
    }
  }

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      // Clone and add cache timestamp header
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));
      const toCache = new Response(await response.clone().arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, toCache);
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

// CacheFirst for static assets (immutable — never re-fetch)
async function cacheFirstStatic(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// NetworkFirst with fallback (API JSON)
async function networkFirstAPI(request) {
  const cache = await caches.open(CACHE_API);
  try {
    const response = await Promise.race([
      fetch(request.clone()),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    // Try offline smart answer for /api/chat
    if (request.url.includes('/api/chat')) {
      try {
        const body = await request.clone().json();
        const msg = body.message || '';
        const answer = getOfflineAnswer(msg);
        if (answer) {
          return Response.json({ reply: answer, offline: true, model: 'offline' });
        }
      } catch {}
    }
    return cached || Response.json({ error: 'Offline', offline: true, reply: 'Main abhi offline hoon. Net check karo aur dobara try karo!' }, { status: 503 });
  }
}

// StaleWhileRevalidate for HTML pages
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_SHELL);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(r => {
    if (r.ok) cache.put(request, r.clone());
    return r;
  }).catch(() => null);
  return cached || await networkPromise || new Response('Offline', {
    status: 200, headers: { 'Content-Type': 'text/html' }
  });
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'JARVIS', {
    body: data.body || 'Naya message hai!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'jarvis',
    data: { url: data.url || '/chat' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',    title: '📱 Open' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/chat';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(url));
      if (existing) { existing.focus(); return; }
      return clients.openWindow(url);
    })
  );
});

// ─── MESSAGE (from app — force update, clear media cache) ─────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_MEDIA_CACHE') {
    caches.delete(CACHE_MEDIA).then(() => {
      e.source?.postMessage({ type: 'MEDIA_CACHE_CLEARED' });
    });
  }
  if (e.data?.type === 'GET_VERSION') {
    e.source?.postMessage({ type: 'VERSION', version: VERSION });
  }
});
