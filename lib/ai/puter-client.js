'use client';
// lib/ai/puter-client.js — JARVIS Complete Puter.js v2
// ══════════════════════════════════════════════════════════════
// FULL USAGE: 400+ models, Streaming, Web Search, Function Calling,
// Vision, Cloud FS, KV Store, Auth, Image Gen, Chat Backup
// ══════════════════════════════════════════════════════════════

const PUTER_CDN = 'https://js.puter.com/v2/';
let _puter = null, _loading = false;
const _queue = [];

export async function loadPuter() {
  if (_puter) return _puter;
  if (typeof window === 'undefined') return null;
  if (window.puter) { _puter = window.puter; return _puter; }
  return new Promise((resolve) => {
    _queue.push(resolve);
    if (_loading) return;
    _loading = true;
    const s = document.createElement('script');
    s.src = PUTER_CDN; s.async = true;
    s.onload = () => {
      const poll = setInterval(() => {
        if (window.puter) {
          clearInterval(poll); _puter = window.puter; _loading = false;
          _queue.forEach(cb => cb(_puter)); _queue.length = 0;
        }
      }, 80);
      setTimeout(() => { clearInterval(poll); _loading = false; _queue.forEach(cb => cb(null)); _queue.length = 0; }, 12000);
    };
    s.onerror = () => { _loading = false; _queue.forEach(cb => cb(null)); _queue.length = 0; };
    document.head.appendChild(s);
  });
}

// ─── MODEL TIERS ─────────────────────────────────────────────
export const PUTER_MODELS = {
  // Best quality — use for complex tasks
  best:   ['claude-sonnet-4', 'google/gemini-2.5-flash', 'gpt-5.2', 'x-ai/grok-4', 'openrouter:deepseek/deepseek-chat-v3-0324:free'],
  // Fast — use for quick responses
  fast:   ['gpt-5-nano', 'gpt-4.1-nano', 'google/gemini-2.5-flash-lite'],
  // Image generation
  image:  ['gpt-image-1.5', 'dall-e-3'],
  // Web search — ONLY these models support tools:[{type:"web_search"}]
  search: ['openai/gpt-5.2-chat'],  // Only official web_search model per Puter docs
  // Real-time search — Grok 4 has native live search built-in
  realtime: ['x-ai/grok-4'],
};

// ─── HELPER ───────────────────────────────────────────────────
function extractText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (r?.message?.content) {
    const c = r.message.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.map(p => p?.text || '').join('');
  }
  if (r?.content) return String(r.content);
  return '';
}

// ─── 1. STREAMING CHAT ────────────────────────────────────────
export async function puterStream(messages, systemPrompt, onToken, model = null) {
  const puter = await loadPuter();
  if (!puter?.ai?.chat) return null;
  const models = model ? [model] : PUTER_MODELS.best;
  for (const m of models) {
    try {
      const chatMsgs = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.slice(-8),
      ];
      const stream = await puter.ai.chat(chatMsgs, { model: m, stream: true });
      let fullText = '';
      for await (const part of stream) {
        const token = part?.text || part?.delta?.text || '';
        if (token) { fullText += token; onToken?.(token, fullText); }
      }
      if (fullText) return { reply: fullText, model: m, streamed: true };
    } catch {}
  }
  return null;
}

// ─── 2. WEB SEARCH BUILT-IN (no Tavily key needed!) ──────────
// Uses openai/gpt-5.2-chat (official web_search support per Puter docs)
// Fallback: Grok 4 (native real-time search built-in)
export async function puterSearchChat(query, systemPrompt) {
  const puter = await loadPuter();
  if (!puter?.ai?.chat) return null;

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: query },
  ];

  // 1. Try openai/gpt-5.2-chat with web_search tool (official support)
  try {
    const response = await puter.ai.chat(messages, false, {
      model: 'openai/gpt-5.2-chat',
      tools: [{ type: 'web_search' }],
      stream: false,
    });
    const text = extractText(response);
    if (text) return { reply: text, model: 'puter-gpt5.2-search', hasSearch: true };
  } catch {}

  // 2. Grok 4 — native real-time search (no tools needed, it searches automatically)
  try {
    const stream = await puter.ai.chat(messages, false, {
      model: 'x-ai/grok-4',
      stream: true,
    });
    let text = '';
    for await (const part of stream) { text += part?.text || part?.delta?.text || ''; }
    if (text.trim()) return { reply: text.trim(), model: 'puter-grok4-search', hasSearch: true };
  } catch {}

  return null;
}

// ─── 3. FUNCTION CALLING ──────────────────────────────────────
export async function puterWithTools(messages, systemPrompt, tools, executeTool) {
  const puter = await loadPuter();
  if (!puter?.ai?.chat) return null;
  const puterTools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters || { type: 'object', properties: {} } } }));
  try {
    const chatMsgs = [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), ...messages.slice(-6)];
    const response = await puter.ai.chat(chatMsgs, { model: 'claude-sonnet-4', tools: puterTools, stream: false });
    if (response?.message?.tool_calls?.length > 0) {
      const tc = response.message.tool_calls[0];
      const args = JSON.parse(tc.function.arguments || '{}');
      const result = await executeTool(tc.function.name, args);
      const final = await puter.ai.chat([
        ...chatMsgs,
        { role: 'assistant', tool_calls: [{ id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } }] },
        { role: 'tool', tool_call_id: tc.id, content: String(result) },
      ], { model: 'claude-sonnet-4', stream: false });
      return { reply: extractText(final), model: 'puter-claude-tools', usedTool: tc.function.name };
    }
    return { reply: extractText(response), model: 'puter-claude' };
  } catch { return null; }
}

// ─── 4. IMAGE GENERATION (FREE!) ──────────────────────────────
export async function puterGenerateImage(prompt, model = 'gpt-image-1.5') {
  const puter = await loadPuter();
  if (!puter?.ai?.txt2img) return null;
  try {
    const img = await Promise.race([
      puter.ai.txt2img(prompt, { model }),
      new Promise((_, rej) => setTimeout(() => rej('timeout'), 45000)),
    ]);
    if (img instanceof HTMLImageElement) return img.src;
    return img?.src || null;
  } catch { return null; }
}

// ─── 5. IMAGE VISION (analyze photos) ────────────────────────
export async function puterAnalyzeImage(imageSource, question = 'Is image mein kya hai? Hinglish mein batao.') {
  const puter = await loadPuter();
  if (!puter?.ai?.chat) return null;
  try {
    const response = await puter.ai.chat(question, imageSource, { model: 'gpt-5-nano' });
    return extractText(response);
  } catch { return null; }
}

// ─── 6. CLOUD FILE STORAGE ────────────────────────────────────
export async function puterSaveFile(path, content) {
  const puter = await loadPuter();
  if (!puter?.fs?.write) return false;
  try {
    await puter.fs.write(`jarvis/${path}`, typeof content === 'string' ? content : JSON.stringify(content, null, 2), { createMissingParents: true });
    return true;
  } catch { return false; }
}
export async function puterReadFile(path) {
  const puter = await loadPuter();
  if (!puter?.fs?.read) return null;
  try { const blob = await puter.fs.read(`jarvis/${path}`); const text = await blob.text(); try { return JSON.parse(text); } catch { return text; } } catch { return null; }
}
export async function puterListFiles(dir = '') {
  const puter = await loadPuter();
  if (!puter?.fs?.readdir) return [];
  try { return await puter.fs.readdir(`jarvis/${dir}`) || []; } catch { return []; }
}

// ─── 7. KEY-VALUE STORE ───────────────────────────────────────
export async function puterSet(key, value) {
  const puter = await loadPuter();
  if (!puter?.kv?.set) return false;
  try { await puter.kv.set(`jarvis_${key}`, typeof value === 'string' ? value : JSON.stringify(value)); return true; } catch { return false; }
}
export async function puterGet(key) {
  const puter = await loadPuter();
  if (!puter?.kv?.get) return null;
  try { const v = await puter.kv.get(`jarvis_${key}`); if (!v) return null; try { return JSON.parse(v); } catch { return v; } } catch { return null; }
}
export async function puterDel(key) {
  const puter = await loadPuter();
  try { await puter?.kv?.del?.(`jarvis_${key}`); return true; } catch { return false; }
}

// ─── 8. CHAT BACKUP TO PUTER CLOUD ───────────────────────────
export async function backupChatToPuter(convId, messages) {
  if (!messages?.length) return false;
  return puterSaveFile(`chats/${convId || 'chat_' + Date.now()}.json`, {
    id: convId, savedAt: new Date().toISOString(),
    messages: messages.map(m => ({ role: m.role, content: m.content, ts: m.ts })),
  });
}

// ─── 9. FULL FALLBACK CHAIN ───────────────────────────────────
export async function puterFallbackChat(userMessage, systemPrompt, history = []) {
  const puter = await loadPuter();
  if (!puter) return null;

  const messages = [
    ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  // Web search for news/current events
  const needsSearch = /news|latest|today|current|price|kya hua|khabar|abhi|2025|2026/i.test(userMessage);
  if (needsSearch) {
    const sr = await puterSearchChat(userMessage, systemPrompt);
    if (sr) return sr;
  }

  // Streaming with best models
  for (const model of PUTER_MODELS.best) {
    try {
      const chatMsgs = [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), ...messages];
      const stream = await puter.ai.chat(chatMsgs, { model, stream: true });
      let text = '';
      for await (const part of stream) { text += part?.text || part?.delta?.text || ''; }
      if (text.trim()) return { reply: text.trim(), model, streamed: true };
    } catch {}
  }
  return null;
}

// ─── 10. PUTER AUTH STATUS ────────────────────────────────────
export async function getPuterUser() {
  const puter = await loadPuter();
  try { if (!puter?.auth?.isSignedIn?.()) return null; return await puter.auth.getUser(); } catch { return null; }
}
export async function isPuterAvailable() {
  const puter = await loadPuter();
  return !!(puter?.ai?.chat);
}
