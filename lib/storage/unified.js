// lib/storage/unified.js — JARVIS v10.9 Unified Storage
// ══════════════════════════════════════════════════════════════
// One API for all storage — auto-picks best layer:
//   Hot data  → localStorage (instant, ~5MB)
//   Cache     → IndexedDB (persistent, ~500MB)
//   AI data   → Puter KV (cross-device, free)
//   Important → Supabase (cloud, permanent)
// ══════════════════════════════════════════════════════════════
'use client';

// ─── STORAGE KEYS ────────────────────────────────────────────────
export const KEYS = {
  THEME:        'jarvis_theme',
  FONT_SIZE:    'jarvis_font_size',
  AI_NAME:      'jarvis_ai_name',
  CUSTOM_ACCENT:'jarvis_custom_accent',
  MACRODROID_ID:'macrodroid_device_id',
  TASKER_IP:    'tasker_ip',
  AUTO_REPLY:   'jarvis_autoreply',
  AI_REPLY:     'jarvis_autoreply_ai',
  VOICE_ON:     'jarvis_voice_auto',
  WAKE_WORD:    'jarvis_wake_word',
  CONV_ID:      'jarvis_last_conv',
  MODE:         'jarvis_chat_mode',
  PERSONALITY:  'jarvis_personality',
  NOTIFICATIONS:'jarvis_notifs_enabled',
  QUICK_ACTIONS:'jarvis_quick_actions',
  PINNED_MSGS:  'jarvis_pinned',
  CHAT_HISTORY: 'jarvis_chat_local',
};

// ─── LAYER 1: localStorage (hot, instant) ────────────────────────
export const local = {
  get: (key, fallback = null) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? (v === 'true' ? true : v === 'false' ? false : v) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, String(value)); return true; } catch { return false; }
  },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
  getJSON: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
  },
  setJSON: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};

// ─── LAYER 2: IndexedDB (large data, persistent) ─────────────────
const IDB_NAME = 'jarvis_v10', IDB_VER = 2;
const STORES = ['cache', 'conversations', 'media', 'phone_events', 'knowledge'];
let _idb = null;

async function openIDB() {
  if (_idb) return _idb;
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: 'key' });
        }
      });
    };
    req.onsuccess = e => { _idb = e.target.result; res(_idb); };
    req.onerror = () => rej(req.error);
  });
}

export const idb = {
  get: async (store, key) => {
    try {
      const db = await openIDB();
      if (!db) return null;
      return new Promise((res) => {
        const req = db.transaction(store, 'readonly').objectStore(store).get(key);
        req.onsuccess = () => {
          const item = req.result;
          if (!item) return res(null);
          if (item.expires && Date.now() > item.expires) {
            idb.delete(store, key);
            return res(null);
          }
          res(item.value);
        };
        req.onerror = () => res(null);
      });
    } catch { return null; }
  },
  set: async (store, key, value, ttlMs = null) => {
    try {
      const db = await openIDB();
      if (!db) return false;
      return new Promise((res) => {
        const item = { key, value, ts: Date.now(), expires: ttlMs ? Date.now() + ttlMs : null };
        const req = db.transaction(store, 'readwrite').objectStore(store).put(item);
        req.onsuccess = () => res(true);
        req.onerror = () => res(false);
      });
    } catch { return false; }
  },
  delete: async (store, key) => {
    try {
      const db = await openIDB();
      if (!db) return;
      db.transaction(store, 'readwrite').objectStore(store).delete(key);
    } catch {}
  },
  getAll: async (store) => {
    try {
      const db = await openIDB();
      if (!db) return [];
      return new Promise((res) => {
        const req = db.transaction(store, 'readonly').objectStore(store).getAll();
        req.onsuccess = () => res(req.result?.map(i => i.value).filter(Boolean) || []);
        req.onerror = () => res([]);
      });
    } catch { return []; }
  },
  clear: async (store) => {
    try {
      const db = await openIDB();
      if (!db) return;
      db.transaction(store, 'readwrite').objectStore(store).clear();
    } catch {}
  },
};

// ─── LAYER 3: Puter KV (cross-device, free, cloud) ───────────────
export const puterKV = {
  get: async (key) => {
    try {
      const { puterGet } = await import('@/lib/ai/puter-client');
      return await puterGet(key);
    } catch { return null; }
  },
  set: async (key, value) => {
    try {
      const { puterSet } = await import('@/lib/ai/puter-client');
      await puterSet(key, value);
      return true;
    } catch { return false; }
  },
};

// ─── SMART CACHE — cache wrapper with TTL ────────────────────────
export async function cacheGet(key) {
  // Check IndexedDB first (local, fast)
  const cached = await idb.get('cache', key);
  if (cached) return cached;
  return null;
}

export async function cacheSet(key, value, ttlMs = 5 * 60 * 1000) {
  await idb.set('cache', key, value, ttlMs);
  return true;
}

// ─── PHONE EVENTS — store notifications from MacroDroid ──────────
export async function savePhoneEvent(event) {
  const e = { ...event, id: Date.now(), ts: new Date().toISOString() };
  await idb.set('phone_events', String(e.id), e);
  return e;
}

export async function getPhoneEvents(limit = 50) {
  const all = await idb.getAll('phone_events');
  return all.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, limit);
}

// ─── SETTINGS HELPERS ────────────────────────────────────────────
export const settings = {
  theme:       () => local.get(KEYS.THEME, 'dark'),
  aiName:      () => local.get(KEYS.AI_NAME, 'JARVIS'),
  fontSize:    () => local.get(KEYS.FONT_SIZE, 'normal'),
  accentColor: () => local.get(KEYS.CUSTOM_ACCENT, null),
  macrodroidId:() => local.get(KEYS.MACRODROID_ID, ''),
  autoReply:   () => local.get(KEYS.AUTO_REPLY, false),
  voiceAuto:   () => local.get(KEYS.VOICE_ON, false),
  personality: () => local.get(KEYS.PERSONALITY, 'normal'),
  mode:        () => local.get(KEYS.MODE, 'auto'),

  setTheme:    (v) => { local.set(KEYS.THEME, v); return v; },
  setAiName:   (v) => { local.set(KEYS.AI_NAME, v); return v; },
  setFontSize: (v) => { local.set(KEYS.FONT_SIZE, v); return v; },
  setAccent:   (v) => { local.set(KEYS.CUSTOM_ACCENT, v); return v; },
  setMacrodroid:(v) => { local.set(KEYS.MACRODROID_ID, v); return v; },
};

// ─── APPLY SAVED SETTINGS ON LOAD ────────────────────────────────
export function applyStoredSettings() {
  if (typeof document === 'undefined') return;
  // Font size
  const fontSize = { small: '13px', normal: '14px', large: '16px', xlarge: '18px' };
  const fs = settings.fontSize();
  if (fontSize[fs]) document.documentElement.style.fontSize = fontSize[fs];
  // Custom accent
  const accent = settings.accentColor();
  if (accent) document.documentElement.style.setProperty('--accent', accent);
}

// ─── STORAGE SIZE INFO (for settings page) ───────────────────────
export async function getStorageInfo() {
  const info = { localStorage: 0, indexedDB: 0, estimate: null };
  try {
    let lsSize = 0;
    for (const k of Object.keys(localStorage)) lsSize += (localStorage.getItem(k) || '').length + k.length;
    info.localStorage = Math.round(lsSize / 1024); // KB
  } catch {}
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      info.estimate = { used: Math.round((est.usage || 0) / 1024 / 1024), quota: Math.round((est.quota || 0) / 1024 / 1024) };
    }
  } catch {}
  return info;
}
