// JARVIS v10.9 — Service Worker
// ═══════════════════════════════════════════════════════════════
// 1. Smart caching (shell, API, media)
// 2. Periodic Sync — NEET reminders + daily brief
// 3. Push notifications — rich with actions
// 4. Background sync — offline message queue
// 5. Study schedule notifications
// ═══════════════════════════════════════════════════════════════

const VERSION = 'jarvis-v10.9';
const CACHE_SHELL  = `${VERSION}-shell`;
const CACHE_API    = `${VERSION}-api`;
const CACHE_MEDIA  = `${VERSION}-media`;

const SHELL_URLS = ['/', '/chat', '/analytics', '/goals', '/memory',
  '/knowledge', '/settings', '/offline', '/phone'];

// NEET 2026 Study Schedule
const STUDY_SCHEDULE = [
  { hour:5,  min:30, title:'🌅 Uth ja!',           body:'NEET 2026 — aaj shuru karo. Paani pi, stretch karo.',        tag:'wake',     url:'/chat' },
  { hour:6,  min:0,  title:'📚 Physics Session',    body:'2.5 ghante — fresh brain best time. Focus mode on!',         tag:'study1',   url:'/chat' },
  { hour:8,  min:30, title:'☕ Break Time',          body:'15 min naashta. Phone nahi, bas relax karo.',                tag:'break1',   url:'/' },
  { hour:9,  min:0,  title:'🧬 Biology Session',    body:'NCERT + diagrams — 2 ghante. Sabse important!',             tag:'study2',   url:'/chat' },
  { hour:11, min:0,  title:'⚗️ Chemistry Session',  body:'Reactions + organic — 2 ghante. Concentrate!',              tag:'study3',   url:'/chat' },
  { hour:13, min:0,  title:'🍽️ Lunch Break',        body:'30 min. Proper khana khao — energy chahiye.',               tag:'lunch',    url:'/' },
  { hour:14, min:0,  title:'⚡ Numericals Session',  body:'Problems + PYQ — 3 ghante. Ek ek question solve karo.',    tag:'study4',   url:'/chat' },
  { hour:17, min:30, title:'🏃 Exercise Time',       body:'30 min walk/stretch. Dimaag reset hoga!',                  tag:'exercise', url:'/' },
  { hour:18, min:15, title:'📖 Revision Session',   body:'Aaj jo padha — 2 ghante revision. Notes banana.',           tag:'study5',   url:'/chat' },
  { hour:20, min:30, title:'🌙 Dinner Time',         body:'30 min. Khana khao, aaj ka review karo mentally.',          tag:'dinner',   url:'/' },
  { hour:21, min:0,  title:'📝 Night Review',        body:'Light notes + formulas — 1.5 ghante. Brain consolidation.', tag:'study6',   url:'/chat' },
  { hour:22, min:30, title:'😴 So Jao!',             body:'7.5 ghante neend = better memory. Kal phir full josh! 🔥',  tag:'sleep',    url:'/' },
];

const MOTIVATIONAL = [
  'Har practice test teri rank improve karti hai. Chalta reh! 🔥',
  'Biology mein tera goal 360/360 hai. Ek chapter ek din — kar sakta hai!',
  'Topper woh nahi jo zyada padhta hai — woh jo smart padhta hai. Tu smart hai!',
  '48 din mein NEET crack karna possible hai — tu bhi karega!',
  'Chemistry ke formulas teri dost hain. Unhe baar baar dekho — yaad ho jayenge.',
  'Aaj jo padh raha hai woh exam mein kaam aayega. Waste nahi ho raha kuch bhi!',
];

function getDaysLeft() {
  const neet = new Date('2026-05-03');
  const today = new Date(); today.setHours(0,0,0,0); neet.setHours(0,0,0,0);
  return Math.max(0, Math.round((neet-today)/(864e5)));
}

// ─── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(c => c.addAll(SHELL_URLS.map(u => new Request(u.trim(), {credentials:'same-origin'}))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jarvis-') && !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        if (self.registration.periodicSync) {
          Promise.allSettled([
            self.registration.periodicSync.register('jarvis-study-check',   { minInterval: 10 * 60 * 1000 }),
            self.registration.periodicSync.register('jarvis-daily-brief',   { minInterval: 60 * 60 * 1000 }),
            self.registration.periodicSync.register('jarvis-motivational',  { minInterval: 2 * 60 * 60 * 1000 }),
          ]);
        }
      })
  );
});

// ─── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname === '/share' && e.request.method === 'POST') {
    e.respondWith((async () => {
      const fd = await e.request.formData();
      const p = new URLSearchParams({title:fd.get('title')||'',text:fd.get('text')||'',url:fd.get('url')||''});
      return Response.redirect(\`/share?${p}\`, 303);
    })());
    return;
  }

  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request, CACHE_API)); return;
  }
  if (/\.(mp3|wav|ogg|webp|png|jpg|jpeg|gif|svg|woff2?)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(e.request, CACHE_MEDIA)); return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(e.request)); return;
  }
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return await cache.match(req) || new Response(JSON.stringify({error:'offline'}), {status:503,headers:{'Content-Type':'application/json'}});
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; } catch { return new Response('', {status:404}); }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_SHELL);
  const cached = await cache.match(req);
  const networkP = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return cached || await networkP || await caches.match('/offline') || new Response('<h1>Offline</h1>',{status:200,headers:{'Content-Type':'text/html'}});
}

// ─── PERIODIC SYNC ────────────────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'jarvis-study-check')  e.waitUntil(checkStudyTime());
  if (e.tag === 'jarvis-daily-brief')  e.waitUntil(sendDailyBrief());
  if (e.tag === 'jarvis-motivational') e.waitUntil(sendMotivation());
});

async function checkStudyTime() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const s of STUDY_SCHEDULE) {
    const target = s.hour * 60 + s.min;
    if (cur >= target && cur <= target + 8) {
      const shown = await getKV('shown_' + s.tag);
      const todayKey = new Date().toDateString();
      if (shown === todayKey) continue;
      await setKV('shown_' + s.tag, todayKey);
      await self.registration.showNotification(s.title, {
        body: s.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
        tag: 'neet-' + s.tag, data: {url: s.url},
        vibrate: [200,100,200,100,300],
        requireInteraction: s.tag.includes('study') || s.tag === 'wake',
        actions: [
          {action:'open',   title:'✅ Ready hoon'},
          {action:'snooze', title:'⏰ 5 min baad'},
        ],
      });
      break;
    }
  }
}

async function sendDailyBrief() {
  const h = new Date().getHours();
  if (h < 6 || h > 8) return;
  const shown = await getKV('brief_' + new Date().toDateString());
  if (shown) return;
  await setKV('brief_' + new Date().toDateString(), true);
  const days = getDaysLeft();
  await self.registration.showNotification('📚 JARVIS Morning Brief', {
    body: \`NEET 2026 mein sirf ${days} din bache hain. Aaj ka plan ready karo!\`,
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: 'jarvis-morning-brief', data: {url:'/chat'},
    vibrate: [100,50,100],
    actions: [{action:'open', title:'📋 Plan dekhna'}],
  });
}

async function sendMotivation() {
  const h = new Date().getHours();
  if (h < 7 || h > 21) return;
  const msg = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
  await self.registration.showNotification('💪 JARVIS — Keep Going!', {
    body: msg, icon: '/icons/icon-192.png',
    tag: 'jarvis-motivation', data: {url:'/chat'},
    silent: true, vibrate: [50],
  });
}

// Simple KV using caches API (no IndexedDB needed)
async function getKV(key) {
  const c = await caches.open('jarvis-kv');
  const r = await c.match('/kv/' + key);
  return r ? await r.text().then(t => { try { return JSON.parse(t); } catch { return t; } }) : null;
}
async function setKV(key, value) {
  const c = await caches.open('jarvis-kv');
  await c.put('/kv/' + key, new Response(JSON.stringify(value), {headers:{'Content-Type':'application/json'}}));
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch { data = {body: e.data?.text()}; }
  e.waitUntil(self.registration.showNotification(data.title || '📚 JARVIS', {
    body: data.body || 'Naya message!',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: data.tag || 'jarvis', data: {url: data.url || '/chat'},
    vibrate: data.tag?.includes('study') ? [200,100,200,100,300] : [100,50,100],
    requireInteraction: !!data.requireInteraction,
    actions: [{action:'open',title:'📱 Kholna'},{action:'dismiss',title:'✕ Baad mein'}],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  if (e.action === 'snooze') {
    setTimeout(() => {
      self.registration.showNotification(e.notification.title, {
        body: e.notification.body + ' (Snoozed)',
        icon: '/icons/icon-192.png', tag: e.notification.tag + '-snooze',
        vibrate: [200,100,200],
      });
    }, 5 * 60 * 1000);
    return;
  }
  const url = e.notification.data?.url || '/chat';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs => {
      const w = cs.find(c => c.url.includes('apple-v10') || c.url.includes('localhost'));
      if (w) { w.focus(); w.postMessage({type:'NOTIFICATION_CLICK',url,data:e.notification.data}); return; }
      return clients.openWindow(url);
    })
  );
});

// ─── BACKGROUND SYNC — Offline message queue ──────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'jarvis-send-message') e.waitUntil(flushOfflineQueue());
});

async function flushOfflineQueue() {
  const cache = await caches.open('jarvis-offline-queue');
  const keys = await cache.keys();
  for (const req of keys) {
    try {
      const cached = await cache.match(req);
      const body = await cached.json();
      const res = await fetch('/api/chat/stream', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
      });
      if (res.ok) {
        await cache.delete(req);
        const cs = await clients.matchAll({type:'window'});
        cs.forEach(c => c.postMessage({type:'OFFLINE_MSG_SENT', id: body.id}));
      }
    } catch {}
  }
}

// ─── BACKGROUND FETCH ─────────────────────────────────────────
self.addEventListener('backgroundfetchsuccess', e => {
  e.waitUntil((async () => {
    const cache = await caches.open('jarvis-bg-fetch');
    const records = await e.registration.matchAll();
    await Promise.all(records.map(async r => { const res = await r.responseReady; await cache.put(r.request, res); }));
    await e.updateUI({title:'JARVIS: Download complete! ✅'});
  })());
});

// ─── MESSAGE — App se commands ────────────────────────────────
self.addEventListener('message', async e => {
  const {type, data} = e.data || {};
  switch(type) {
    case 'SKIP_WAITING': self.skipWaiting(); break;
    case 'CLEAR_MEDIA_CACHE': await caches.delete(CACHE_MEDIA); e.source?.postMessage({type:'MEDIA_CACHE_CLEARED'}); break;
    case 'GET_VERSION': e.source?.postMessage({type:'VERSION', version:VERSION}); break;
    case 'SHOW_NOTIFICATION':
      await self.registration.showNotification(data?.title||'JARVIS', {
        body:data?.body, icon:'/icons/icon-192.png', badge:'/icons/icon-192.png',
        tag:data?.tag||'jarvis', data:{url:data?.url||'/chat'},
        vibrate:data?.vibrate||[100,50,100], requireInteraction:!!data?.requireInteraction,
      });
      break;
    case 'SCHEDULE_NOTIFICATION':
      setTimeout(async () => {
        await self.registration.showNotification(data?.title||'📚 JARVIS', {
          body:data?.body, icon:'/icons/icon-192.png',
          tag:data?.tag||'scheduled', data:{url:data?.url||'/chat'},
          vibrate:[200,100,200], requireInteraction:true,
        });
      }, data?.delay||0);
      e.source?.postMessage({type:'NOTIFICATION_SCHEDULED'});
      break;
    case 'QUEUE_OFFLINE_MSG':
      const qCache = await caches.open('jarvis-offline-queue');
      await qCache.put('/offline-queue/'+Date.now(), new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}}));
      if (self.registration.sync) await self.registration.sync.register('jarvis-send-message');
      e.source?.postMessage({type:'MSG_QUEUED', id:data?.id});
      break;
  }
});
