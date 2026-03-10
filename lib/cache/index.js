// lib/cache/index.js — JARVIS Smart Cache Layer
// ════════════════════════════════════════════════
// In-memory cache with TTL per data type
// Saves Vercel bandwidth + API credits
// ════════════════════════════════════════════════

const cache = new Map(); // { key: { data, expiresAt } }

// ─── TTL CONFIG (milliseconds) ──────────────────
export const TTL = {
  weather:      10 * 60 * 1000,  // 10 min
  forecast:     30 * 60 * 1000,  // 30 min
  crypto:       30 * 1000,        // 30 sec (live prices)
  news:          5 * 60 * 1000,  // 5 min
  exchange:     60 * 60 * 1000,  // 1 hour
  wiki:         24 * 60 * 60 * 1000, // 24 hours
  quote:        10 * 60 * 1000,  // 10 min
  facts:        10 * 60 * 1000,  // 10 min
  trivia:        5 * 60 * 1000,  // 5 min
  translate:    60 * 60 * 1000,  // 1 hour (text translations)
  dictionary:   24 * 60 * 60 * 1000, // 24 hours
  time:          1 * 1000,        // 1 sec (always fresh)
  default:       5 * 60 * 1000,  // 5 min fallback
};

// ─── GET ────────────────────────────────────────
export function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

// ─── SET ────────────────────────────────────────
export function cacheSet(key, data, ttlType = 'default') {
  const ttl = TTL[ttlType] ?? TTL.default;
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ─── CACHE KEY BUILDER ──────────────────────────
export function makeCacheKey(toolName, params) {
  const sortedParams = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${toolName}::${sortedParams}`;
}

// ─── TOOL → TTL TYPE MAPPING ────────────────────
export const TOOL_TTL_MAP = {
  get_weather:      'weather',
  get_forecast:     'forecast',
  crypto_price:     'crypto',
  crypto_portfolio: 'crypto',
  get_news:         'news',
  tech_news:        'news',
  india_news:       'news',
  currency_convert: 'exchange',
  wiki_search:      'wiki',
  quote:            'quote',
  facts:            'facts',
  trivia:           'trivia',
  translate:        'translate',
  dictionary:       'dictionary',
  etymology:        'dictionary',
};

// ─── WRAPPED EXECUTOR (use inside executeTool) ──
export function withCache(toolName, params, executeFn) {
  const ttlType = TOOL_TTL_MAP[toolName];
  if (!ttlType) return executeFn(); // no cache for this tool

  const key = makeCacheKey(toolName, params);
  const cached = cacheGet(key);
  if (cached) {
    return Promise.resolve({ ...cached, _cached: true });
  }

  return Promise.resolve(executeFn()).then(result => {
    if (result && !result.error) {
      cacheSet(key, result, ttlType);
    }
    return result;
  });
}

// ─── STATS ──────────────────────────────────────
export function getCacheStats() {
  let valid = 0, expired = 0;
  const now = Date.now();
  for (const [, entry] of cache) {
    if (now > entry.expiresAt) expired++;
    else valid++;
  }
  return { total: cache.size, valid, expired };
}

// ─── CLEAR ──────────────────────────────────────
export function clearCache(toolName) {
  if (toolName) {
    for (const key of cache.keys()) {
      if (key.startsWith(toolName + '::')) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}
