// lib/utils/fetch.js — Single tFetch for entire project
export function tFetch(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then(r => { clearTimeout(t); return r; })
    .catch(e => { clearTimeout(t); throw new Error(e.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : e.message); });
}
