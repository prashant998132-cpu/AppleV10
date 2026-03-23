'use client';
// lib/ai/background-service.js — JARVIS Background AI Service
// ══════════════════════════════════════════════════════════════
// Web Worker + Service Worker combination
// - AI offline responses without blocking UI
// - Background study reminders
// - Periodic health checks
// ══════════════════════════════════════════════════════════════

let _worker = null;
let _callbacks = new Map();
let _msgId = 0;

// ─── Start background worker ──────────────────────────
export function startBackgroundAI() {
  if (typeof window === 'undefined' || _worker) return;

  try {
    if (typeof Worker === 'undefined') return false;
    _worker = new Worker('/ai-worker.js');
    _worker.onmessage = (e) => {
      const { id, type, ...data } = e.data || {};

      // Resolve pending promise
      if (id && _callbacks.has(id)) {
        _callbacks.get(id)({ type, ...data });
        _callbacks.delete(id);
      }

      // Handle broadcast messages (no id)
      if (type === 'SHOW_REMINDER') {
        showBgNotification(data.title, data.body);
      }
    };
    _worker.onerror = () => { _worker = null; };

    // Start periodic study check every 10 min
    setInterval(() => sendToWorker('CHECK_STUDY_TIME', {}), 10 * 60 * 1000);

    console.log('[JARVIS] Background AI service started ✅');
    return true;
  } catch (e) {
    console.warn('[JARVIS] Background AI worker failed:', e.message);
    return false;
  }
}

// ─── Send message to worker ───────────────────────────
function sendToWorker(type, data) {
  if (!_worker) return Promise.resolve(null);
  const id = ++_msgId;
  return new Promise((resolve) => {
    _callbacks.set(id, resolve);
    _worker.postMessage({ type, data, id });
    setTimeout(() => {
      if (_callbacks.has(id)) { _callbacks.delete(id); resolve(null); }
    }, 5000);
  });
}

// ─── Offline AI query ─────────────────────────────────
export async function offlineAIQuery(query) {
  const result = await sendToWorker('OFFLINE_QUERY', { query });
  return result?.response || null;
}

// ─── Show notification from background ────────────────
async function showBgNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'jarvis-bg-reminder',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'open',    title: '📚 Study start' },
        { action: 'dismiss', title: '5 min baad' },
      ],
    });
  } catch {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
}

// ─── Schedule local notifications via SW ──────────────
export async function scheduleStudyNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 3000))
    ]);
    if (!reg?.active) return;

    // Send all today's upcoming sessions to SW for scheduling
    const now = new Date();
    const SCHEDULE = [
      { h:5,  m:30, title:'🌅 Uth ja!',           body:'Aaj ka din shuru karo!' },
      { h:6,  m:0,  title:'📚 Physics Session',    body:'2.5 ghante — fresh brain, best time. Focus mode on!' },
      { h:9,  m:0,  title:'🧬 Biology Session',    body:'NCERT + diagrams — 2 ghante. Sabse important subject!' },
      { h:11, m:0,  title:'⚗️ Chemistry',          body:'Reactions + organic — 2 ghante. Concentrate!' },
      { h:14, m:0,  title:'⚡ Numericals',          body:'Problems + PYQ — 3 ghante. Ek ek question solve karo.' },
      { h:17, m:30, title:'🏃 Exercise',            body:'30 min walk/stretch. Dimaag reset hoga!' },
      { h:18, m:15, title:'📖 Revision',           body:'Aaj jo padha — 2 ghante revision.' },
      { h:21, m:0,  title:'📝 Night Review',       body:'Light notes + formulas — 1.5 ghante.' },
      { h:22, m:30, title:'😴 So Jao!',            body:'7.5 ghante neend = better memory tomorrow. 🔥' },
    ];

    for (const s of SCHEDULE) {
      const target = new Date();
      target.setHours(s.h, s.m, 0, 0);
      const delay = target.getTime() - now.getTime();
      if (delay > 0) {
        reg.active.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          data: { title: s.title, body: s.body, delay, tag: `study-${s.h}-${s.m}` }
        });
      }
    }
  } catch {}
}

// ─── Register periodic sync ───────────────────────────
export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return false;

    // Request permission if needed
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => ({ state: 'denied' }));
    if (status.state !== 'granted') return false;

    await Promise.allSettled([
      reg.periodicSync.register('jarvis-study-check',   { minInterval: 10 * 60 * 1000 }),
      reg.periodicSync.register('jarvis-daily-brief',   { minInterval: 60 * 60 * 1000 }),
      reg.periodicSync.register('jarvis-motivational',  { minInterval: 2 * 60 * 60 * 1000 }),
    ]);
    return true;
  } catch {
    return false;
  }
}

// ─── Check if background service running ──────────────
export function isBackgroundServiceRunning() {
  return _worker !== null;
}

// ─── Stop service ─────────────────────────────────────
export function stopBackgroundAI() {
  if (_worker) { _worker.terminate(); _worker = null; }
}
