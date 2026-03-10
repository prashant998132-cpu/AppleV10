// lib/cache/client-cache.js — JARVIS Client-Side IndexedDB Cache
// ════════════════════════════════════════════════════════════════
// Browser-side cache for repeat queries = zero server calls
// Uses IndexedDB (persistent across page reloads)
// ════════════════════════════════════════════════════════════════

const DB_NAME = 'jarvis_cache';
const STORE = 'responses';
const DB_VERSION = 1;

// TTL for different query types (ms)
const CLIENT_TTL = {
  weather: 10 * 60 * 1000,   // 10 min
  news:     5 * 60 * 1000,   // 5 min
  crypto:      30 * 1000,    // 30 sec
  wiki:   6 * 60 * 60 * 1000, // 6 hours
  default: 5 * 60 * 1000,   // 5 min
};

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

// ─── GET FROM CACHE ──────────────────────────────────────────────
export async function clientCacheGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry) return resolve(null);
        if (Date.now() > entry.expiresAt) {
          // Expired — delete async, return null
          clientCacheDelete(key);
          return resolve(null);
        }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ─── SET IN CACHE ────────────────────────────────────────────────
export async function clientCacheSet(key, data, ttlType = 'default') {
  try {
    const db = await openDB();
    const ttl = CLIENT_TTL[ttlType] ?? CLIENT_TTL.default;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, data, expiresAt: Date.now() + ttl });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── DELETE ─────────────────────────────────────────────────────
export async function clientCacheDelete(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── CLEAR ALL ───────────────────────────────────────────────────
export async function clientCacheClear() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── DETECT TTL TYPE FROM MESSAGE ───────────────────────────────
export function detectCacheTTLType(message = '') {
  const lower = message.toLowerCase();
  if (/weather|mausam|barish|temperature/.test(lower)) return 'weather';
  if (/news|khabar|headlines|latest/.test(lower)) return 'news';
  if (/bitcoin|crypto|eth|price|rate/.test(lower)) return 'crypto';
  if (/wikipedia|wiki|what is|who is|kya hai/.test(lower)) return 'wiki';
  return 'default';
}

// ─── REACT HOOK ──────────────────────────────────────────────────
// Usage: const { cachedGet, cachedSet } = useClientCache();
export function useClientCache() {
  const makeKey = (message) => {
    // Normalize: lowercase, trim, remove punctuation
    return message.toLowerCase().trim().replace(/[^\w\s]/g, '').slice(0, 100);
  };

  const get = async (message) => {
    const key = makeKey(message);
    return clientCacheGet(key);
  };

  const set = async (message, data) => {
    const key = makeKey(message);
    const ttlType = detectCacheTTLType(message);
    return clientCacheSet(key, data, ttlType);
  };

  return { get, set, clear: clientCacheClear };
}
