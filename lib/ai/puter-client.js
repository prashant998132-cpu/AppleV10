'use client';
// lib/ai/puter-client.js
// ══════════════════════════════════════════════════════════════
// JARVIS — Puter.js Client-Side AI Bridge
// FREE: GPT-4o, Claude 3.5, Llama, FLUX images — no API key needed
// Works from browser — Puter handles auth automatically
// ══════════════════════════════════════════════════════════════

const PUTER_CDN = 'https://js.puter.com/v2/';

// Load Puter.js once
let _puterReady = false;
let _puterLoading = false;
const _puterCallbacks = [];

export async function loadPuter() {
  if (_puterReady && window.puter) return window.puter;
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    _puterCallbacks.push(resolve);
    if (_puterLoading) return;
    _puterLoading = true;

    if (window.puter) {
      _puterReady = true;
      _puterCallbacks.forEach(cb => cb(window.puter));
      _puterCallbacks.length = 0;
      return;
    }

    const script = document.createElement('script');
    script.src = PUTER_CDN;
    script.async = true;
    script.onload = () => {
      // Wait for puter.ready
      const check = setInterval(() => {
        if (window.puter) {
          clearInterval(check);
          _puterReady = true;
          _puterLoading = false;
          _puterCallbacks.forEach(cb => cb(window.puter));
          _puterCallbacks.length = 0;
        }
      }, 100);
      setTimeout(() => clearInterval(check), 10000); // 10s timeout
    };
    script.onerror = () => {
      _puterLoading = false;
      _puterCallbacks.forEach(cb => cb(null));
      _puterCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// ─── PUTER AI CHAT (FREE GPT-4o / Claude) ────────────────────
export async function puterChat(messages, systemPrompt, model = 'gpt-4o-mini') {
  const puter = await loadPuter();
  if (!puter?.ai?.chat) return null;

  try {
    // Build messages array
    const chatMessages = [];
    if (systemPrompt) {
      chatMessages.push({ role: 'system', content: systemPrompt });
    }
    chatMessages.push(...messages.slice(-6)); // last 6 messages

    const response = await Promise.race([
      puter.ai.chat(chatMessages, { model }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ]);

    const text = typeof response === 'string'
      ? response
      : response?.message?.content || response?.content || '';

    return text.trim() || null;
  } catch {
    return null;
  }
}

// ─── PUTER IMAGE GENERATION (FREE FLUX) ───────────────────────
export async function puterImage(prompt) {
  const puter = await loadPuter();
  if (!puter?.ai?.txt2img) return null;

  try {
    const img = await Promise.race([
      puter.ai.txt2img(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
    ]);
    return img?.src || null;
  } catch {
    return null;
  }
}

// ─── PUTER CLOUD STORAGE ──────────────────────────────────────
export async function puterSave(key, value) {
  const puter = await loadPuter();
  if (!puter?.kv?.set) return false;
  try {
    await puter.kv.set(`jarvis_${key}`, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch { return false; }
}

export async function puterLoad(key) {
  const puter = await loadPuter();
  if (!puter?.kv?.get) return null;
  try {
    const val = await puter.kv.get(`jarvis_${key}`);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  } catch { return null; }
}

// ─── STATUS CHECK ─────────────────────────────────────────────
export async function isPuterAvailable() {
  const puter = await loadPuter();
  return !!(puter?.ai?.chat);
}

// ─── JARVIS FALLBACK: use Puter when server AI fails ──────────
// Call this from chat page when /api/chat returns offline/error
export async function puterFallbackChat(userMessage, systemPrompt, history = []) {
  const puter = await loadPuter();
  if (!puter) return null;

  const models = ['gpt-4o-mini', 'claude-3-5-sonnet', 'gpt-4o'];

  for (const model of models) {
    try {
      const messages = [
        ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];
      const reply = await puterChat(messages, systemPrompt, model);
      if (reply) return { reply, model: `puter-${model}`, free: true };
    } catch {}
  }

  return null;
}
