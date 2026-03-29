// lib/ai/web-agent.js — JARVIS Web Browsing Agent
// ═══════════════════════════════════════════════════════════════
// Lets JARVIS actually READ any URL and answer from it
// Uses Jina AI reader (free, no key) — converts any page to clean text
// ═══════════════════════════════════════════════════════════════

const JINA_BASE = 'https://r.jina.ai/';
const JINA_SEARCH = 'https://s.jina.ai/';

// ─── READ ANY URL ────────────────────────────────────────────
export async function readUrl(url, maxChars = 4000) {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const r = await fetch(`${JINA_BASE}${cleanUrl}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
        'X-No-Cache': 'true',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const text = await r.text();
    return {
      url: cleanUrl,
      content: text.slice(0, maxChars),
      truncated: text.length > maxChars,
      chars: text.length,
    };
  } catch (e) {
    // Fallback: try without Jina (direct fetch for APIs)
    try {
      const r2 = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (r2.ok) {
        const t = await r2.text();
        return { url, content: t.slice(0, maxChars), truncated: t.length > maxChars };
      }
    } catch {}
    return { url, error: `Could not read: ${e.message}`, content: null };
  }
}

// ─── SEARCH THE WEB (Jina free search) ──────────────────────
export async function webSearch(query, maxResults = 3) {
  try {
    const encoded = encodeURIComponent(query);
    const r = await fetch(`${JINA_SEARCH}${encoded}`, {
      headers: { 'Accept': 'application/json', 'X-Return-Format': 'text' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const text = await r.text();
    return { query, results: text.slice(0, 5000) };
  } catch (e) {
    return { query, error: e.message, results: null };
  }
}

// ─── DETECT URL IN MESSAGE ───────────────────────────────────
export function extractUrl(message) {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = message.match(urlPattern);
  return matches?.[0] || null;
}

// ─── DETECT IF MESSAGE NEEDS WEB FETCH ──────────────────────
export function needsWebFetch(message) {
  const msg = message.toLowerCase();
  // Explicit URL present
  if (/https?:\/\//i.test(message)) return 'url';
  // User wants to read something online
  if (/padh|read|summarize|summary|kya likha|open.*site|is site|is link|yeh link|ye link/i.test(msg) && /\.com|\.in|\.org|\.net/i.test(msg)) return 'url';
  // User wants current news/info that needs search
  if (/latest|abhi|right now|current|today.*news|aaj.*khabar|live|abhi.*kya/i.test(msg) && msg.length > 20) return 'search';
  return null;
}

// ─── SMART WEBPAGE SUMMARY ───────────────────────────────────
// Given page content, extract what matters for the query
export function extractRelevant(pageContent, query, maxChars = 2000) {
  if (!pageContent || !query) return pageContent?.slice(0, maxChars) || '';
  
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const lines = pageContent.split('\n').filter(l => l.trim().length > 20);
  
  // Score each line by relevance
  const scored = lines.map(line => {
    const lower = line.toLowerCase();
    const score = queryWords.filter(w => lower.includes(w)).length;
    return { line, score };
  });
  
  // Take top relevant lines + some context
  const topLines = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(s => s.line);
  
  return topLines.join('\n').slice(0, maxChars);
}
