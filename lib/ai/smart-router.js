// lib/ai/smart-router.js — JARVIS v10.1
// ═══════════════════════════════════════════════════════════════
// Smart LLM Router — Credits bachao, speed badao
// Features:
//   • Daily usage tracking per provider (localStorage server-compatible)
//   • Auto-rotate when limit near (80% threshold)
//   • Cost optimizer — simple queries → free providers
//   • Message complexity detection
//   • Provider health check (ping-based)
// ═══════════════════════════════════════════════════════════════

// ─── PROVIDER REGISTRY ──────────────────────────────────────────
// priority = lower is better (tried first for that tier)
export const PROVIDERS = {

  // ══ TIER 0 — ZERO KEY (Always available, no account needed) ══
  pollinations_text: {
    name: 'Pollinations AI',
    tier: 0,
    url: 'https://text.pollinations.ai/openai',
    model: 'openai',
    authKey: null,          // NO KEY NEEDED
    dailyLimit: 99999,      // Effectively unlimited (15s rate limit between calls)
    speed: 'medium',
    quality: 'good',
    hinglish: true,
    freeForever: true,
    costPerToken: 0,
  },
  puter_browser: {
    name: 'Puter.js (Claude 3.5)',
    tier: 0,
    url: 'browser-side',   // Runs in client, NOT server
    model: 'claude-3-5-sonnet',
    authKey: null,
    dailyLimit: 99999,
    speed: 'medium',
    quality: 'excellent',
    hinglish: true,
    freeForever: true,
    clientOnly: true,       // Only usable from browser
    costPerToken: 0,
  },

  // ══ TIER 1 — FREE KEYS (Best quality, limited daily) ══════════
  gemini_flash: {
    name: 'Gemini 2.5 Flash',
    tier: 1,
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent',
    model: 'gemini-2.5-flash',
    authKey: 'GEMINI_API_KEY',
    dailyLimit: 250,        // Google free tier
    warningAt: 200,         // Switch at 200/250
    speed: 'fast',
    quality: 'excellent',
    hinglish: true,
    streaming: true,
    bestFor: ['complex', 'deep', 'image-analysis', 'long'],
    costPerToken: 0,
  },
  groq_llama4_maverick: {
    name: 'Groq Llama 4 Maverick',
    tier: 1,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct-fp8',
    authKey: 'GROQ_API_KEY',
    dailyLimit: 6000,       // Groq free tier (shared)
    warningAt: 5000,
    speed: 'fast',          // 400 t/s
    quality: 'excellent',
    hinglish: true,
    streaming: true,
    bestFor: ['auto', 'complex', 'creative'],
    costPerToken: 0,
  },
  groq_llama4_scout: {
    name: 'Groq Llama 4 Scout',
    tier: 1,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    authKey: 'GROQ_API_KEY',
    dailyLimit: 6000,       // Shared with maverick
    warningAt: 5000,
    speed: 'ultrafast',     // 460 t/s
    quality: 'very_good',
    hinglish: true,
    streaming: true,
    contextWindow: 10000000, // 10M tokens!
    bestFor: ['flash', 'simple', 'long-context'],
    costPerToken: 0,
  },
  groq_deepseek_r1: {
    name: 'Groq DeepSeek R1',
    tier: 1,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'deepseek-r1-distill-llama-70b',
    authKey: 'GROQ_API_KEY',
    dailyLimit: 6000,
    warningAt: 5000,
    speed: 'medium',
    quality: 'excellent',
    hinglish: true,
    streaming: true,
    thinking: true,
    bestFor: ['think', 'math', 'reasoning'],
    costPerToken: 0,
  },

  // ══ TIER 2 — FAST INFERENCE (Ultra-speed alternatives) ════════
  cerebras: {
    name: 'Cerebras Llama 3.3',
    tier: 2,
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    authKey: 'CEREBRAS_API_KEY',
    dailyLimit: 1000,
    warningAt: 800,
    speed: 'ultrafast',     // 3000 t/s!
    quality: 'very_good',
    hinglish: true,
    bestFor: ['flash', 'simple', 'fast-response'],
    costPerToken: 0,
  },
  sambanova: {
    name: 'SambaNova Llama 3.1',
    tier: 2,
    url: 'https://api.sambanova.ai/v1/chat/completions',
    model: 'Meta-Llama-3.1-70B-Instruct',
    authKey: 'SAMBANOVA_API_KEY',
    dailyLimit: 999999,     // Generous free tier
    warningAt: 900000,
    speed: 'fast',          // 919 t/s
    quality: 'very_good',
    hinglish: true,
    bestFor: ['auto', 'complex'],
    costPerToken: 0,
  },
  together_llama4: {
    name: 'Together Llama 4 Scout',
    tier: 2,
    url: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
    authKey: 'TOGETHER_API_KEY',
    dailyLimit: 9999,       // $1 free credit
    warningAt: 9000,
    speed: 'fast',
    quality: 'very_good',
    hinglish: true,
    contextWindow: 10000000,
    bestFor: ['long-context'],
    costPerToken: 0.0001,
  },
  mistral: {
    name: 'Mistral 7B',
    tier: 2,
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    authKey: 'MISTRAL_API_KEY',
    dailyLimit: 99999,      // 1B tokens/month free
    warningAt: 95000,
    speed: 'fast',
    quality: 'good',
    hinglish: true,
    bestFor: ['simple', 'translation'],
    costPerToken: 0,
  },

  // ══ TIER 3 — OPENROUTER FREE MODELS ══════════════════════════
  openrouter_deepseek: {
    name: 'DeepSeek V3.1 (OpenRouter)',
    tier: 3,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-chat-v3-5:free',
    authKey: 'OPENROUTER_KEY',
    dailyLimit: 99999,
    warningAt: 95000,
    speed: 'medium',
    quality: 'very_good',
    hinglish: true,
    bestFor: ['complex', 'coding'],
    costPerToken: 0,
  },
  openrouter_gemma: {
    name: 'Google Gemma 3 (OpenRouter)',
    tier: 3,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemma-3-27b-it:free',
    authKey: 'OPENROUTER_KEY',
    dailyLimit: 99999,
    speed: 'fast',
    quality: 'good',
    hinglish: true,
    costPerToken: 0,
  },
  openrouter_llama: {
    name: 'Meta Llama 3.3 (OpenRouter)',
    tier: 3,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    authKey: 'OPENROUTER_KEY',
    dailyLimit: 99999,
    speed: 'medium',
    quality: 'very_good',
    hinglish: true,
    costPerToken: 0,
  },

  // ══ TIER 4 — HUGGINGFACE (Backup) ═════════════════════════════
  huggingface: {
    name: 'HuggingFace Inference',
    tier: 4,
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    authKey: 'HUGGINGFACE_TOKEN',
    dailyLimit: 30000,
    warningAt: 25000,
    speed: 'slow',
    quality: 'good',
    hinglish: false,
    bestFor: ['backup'],
    costPerToken: 0,
  },

  // ══ TIER 5 — OFFLINE ══════════════════════════════════════════
  offline: {
    name: 'Offline Keyword Engine',
    tier: 5,
    url: 'local',
    model: 'keyword-fallback',
    authKey: null,
    dailyLimit: 99999,
    speed: 'instant',
    quality: 'basic',
    hinglish: true,
    freeForever: true,
    costPerToken: 0,
  },
};

// ─── USAGE TRACKER (server-side in-memory, resets on deploy) ─────
// For persistent tracking → use Supabase llm_logs table
const _usageCache = {};

export function getUsage(providerId) {
  const key = `${providerId}_${_todayKey()}`;
  return _usageCache[key] || 0;
}

export function incrementUsage(providerId, tokens = 1) {
  const key = `${providerId}_${_todayKey()}`;
  _usageCache[key] = (_usageCache[key] || 0) + tokens;
}

export function isNearLimit(providerId) {
  const p = PROVIDERS[providerId];
  if (!p) return false;
  const usage = getUsage(providerId);
  return usage >= (p.warningAt || p.dailyLimit * 0.8);
}

export function isAtLimit(providerId) {
  const p = PROVIDERS[providerId];
  if (!p) return false;
  return getUsage(providerId) >= p.dailyLimit;
}

function _todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── COMPLEXITY DETECTOR ─────────────────────────────────────────
// Returns: 'simple' | 'normal' | 'complex' | 'long'
export function detectComplexity(message = '', history = []) {
  const len = message.length;
  const words = message.split(' ').length;
  const lower = message.toLowerCase();

  // Long message or long history = complex
  if (len > 500 || history.length > 20) return 'long';

  // Keywords for complex tasks
  if (/code|program|debug|error|function|algorithm|explain.*detail|analyze|compare|research|why.*because|how.*work/i.test(lower)) return 'complex';

  // Math or reasoning
  if (/calculate|solve|equation|math|formula|proof|derive|reason|think.*step/i.test(lower)) return 'complex';

  // Simple/quick queries
  if (words <= 5 || /hi|hello|thanks|ok|haan|nahi|shukriya|bye|kya hai|batao|karo/.test(lower)) return 'simple';

  return 'normal';
}

// ─── MAIN SMART ROUTER ───────────────────────────────────────────
// Returns ordered list of providers to try, based on:
//  - mode (auto/flash/think/deep)
//  - message complexity
//  - current usage levels
//  - available keys
export function getProviderOrder(mode = 'auto', message = '', history = [], availableKeys = {}) {
  const complexity = detectComplexity(message, history);
  const lower = message.toLowerCase();

  // Helper: check if provider usable
  const usable = (id) => {
    const p = PROVIDERS[id];
    if (!p) return false;
    if (p.clientOnly) return false;          // Browser-only, skip server
    if (p.authKey && !availableKeys[p.authKey]) return false; // No key
    if (isAtLimit(id)) return false;         // At daily limit
    return true;
  };

  // ── MODE: think → DeepSeek R1 (reasoning) ──────────────────
  if (mode === 'think') {
    return [
      'groq_deepseek_r1',
      'gemini_flash',
      'openrouter_deepseek',
      'groq_llama4_maverick',
      'cerebras',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // ── MODE: flash → Fastest providers ────────────────────────
  if (mode === 'flash') {
    return [
      'groq_llama4_scout',    // 460 t/s
      'cerebras',              // 3000 t/s
      'groq_llama4_maverick', // 400 t/s
      'sambanova',             // 919 t/s
      'mistral',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // ── MODE: deep → Best quality ──────────────────────────────
  if (mode === 'deep') {
    return [
      'gemini_flash',
      'groq_llama4_maverick',
      'together_llama4',
      'openrouter_deepseek',
      'sambanova',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // ── MODE: auto → Smart routing by complexity ────────────────
  // Simple messages → free/fast providers first (save credits)
  if (complexity === 'simple') {
    // Hindi/Hinglish greetings → Groq fastest
    if (/haan|nahi|ok|hi|hello|thanks|bye|kya|batao|yaar/.test(lower)) {
      return [
        'groq_llama4_scout',
        'cerebras',
        'pollinations_text',
        'groq_llama4_maverick',
        'mistral',
        'offline',
      ].filter(usable);
    }
    return [
      'groq_llama4_scout',
      'cerebras',
      'groq_llama4_maverick',
      'mistral',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // Complex → Gemini first (best quality)
  if (complexity === 'complex') {
    return [
      'gemini_flash',
      'groq_llama4_maverick',
      'openrouter_deepseek',
      'sambanova',
      'together_llama4',
      'cerebras',
      'mistral',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // Long context → Llama 4 Scout (10M tokens!)
  if (complexity === 'long') {
    return [
      'groq_llama4_scout',    // 10M context on Groq
      'together_llama4',       // 10M context
      'gemini_flash',
      'groq_llama4_maverick',
      'sambanova',
      'pollinations_text',
      'offline',
    ].filter(usable);
  }

  // Normal — balanced
  return [
    'gemini_flash',
    'groq_llama4_maverick',
    'groq_llama4_scout',
    'cerebras',
    'sambanova',
    'openrouter_deepseek',
    'mistral',
    'pollinations_text',
    'offline',
  ].filter(usable);
}

// ─── CALL ANY PROVIDER ───────────────────────────────────────────
export async function callProvider(providerId, messages, systemPrompt, availableKeys, options = {}) {
  const p = PROVIDERS[providerId];
  if (!p) throw new Error(`Unknown provider: ${providerId}`);
  if (p.url === 'local') throw new Error('Offline provider — use offlineFallback()');
  if (p.clientOnly) throw new Error('Browser-only provider');

  const apiKey = p.authKey ? availableKeys[p.authKey] : 'free';
  const maxTokens = options.maxTokens || 1200;
  const temperature = options.temperature || 0.85;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey !== 'free') headers['Authorization'] = `Bearer ${apiKey}`;

  let body;

  // HuggingFace has different format
  if (providerId === 'huggingface') {
    const prompt = messages.map(m => m.content).join('\n');
    body = { inputs: `${systemPrompt}\n\n${prompt}`, parameters: { max_new_tokens: maxTokens, temperature } };
  } else {
    // OpenAI-compatible format (Groq, Cerebras, Together, SambaNova, OpenRouter, Mistral, Pollinations)
    body = {
      model: p.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature,
      max_tokens: maxTokens,
      stream: false, // Non-streaming for fallback
    };
  }

  const res = await fetch(p.url.replace(':streamGenerateContent', ':generateContent').replace('alt=sse&', ''), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`${p.name} ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Extract text from different response formats
  let text = '';
  if (providerId === 'huggingface') {
    text = data[0]?.generated_text || data?.generated_text || '';
  } else if (providerId.startsWith('gemini')) {
    text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    text = data.choices?.[0]?.message?.content || '';
  }

  if (!text) throw new Error(`${p.name} returned empty response`);

  // Track usage
  incrementUsage(providerId, Math.round(text.length / 4));

  return { text, provider: p.name, model: p.model };
}

// ─── STREAMING VERSION ────────────────────────────────────────────
// Returns async generator of tokens
export async function* streamProvider(providerId, messages, systemPrompt, availableKeys, options = {}) {
  const p = PROVIDERS[providerId];
  if (!p) throw new Error(`Unknown provider: ${providerId}`);

  const apiKey = p.authKey ? availableKeys[p.authKey] : null;
  const maxTokens = options.maxTokens || 1500;
  const temperature = options.temperature || 0.85;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  let url = p.url;
  let body;

  // Gemini streaming
  if (providerId.startsWith('gemini')) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
  } else {
    // OpenAI-compatible streaming (Groq, Cerebras, Together, SambaNova, OpenRouter, Mistral, Pollinations)
    body = {
      model: p.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`${p.name} stream ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let totalTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const json = JSON.parse(line.slice(6));

        let token = '';
        if (providerId.startsWith('gemini')) {
          token = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          token = json.choices?.[0]?.delta?.content || '';
        }

        if (token) {
          totalTokens++;
          yield { token, provider: p.name, model: p.model };
        }
      } catch { /* skip malformed lines */ }
    }
  }

  // Track usage after stream completes
  incrementUsage(providerId, totalTokens);
}

// ─── PROVIDER HEALTH CHECK ────────────────────────────────────────
// Quick ping to see if provider is responding
export async function checkProviderHealth(providerId, apiKey) {
  const p = PROVIDERS[providerId];
  if (!p || p.url === 'local' || p.clientOnly) return { healthy: true, latency: 0 };

  const start = Date.now();
  try {
    const testMsg = [{ role: 'user', content: 'Hi' }];
    await callProvider(providerId, testMsg, 'Say "ok" only.', { [p.authKey]: apiKey }, { maxTokens: 5 });
    return { healthy: true, latency: Date.now() - start, provider: p.name };
  } catch (e) {
    return { healthy: false, error: e.message, provider: p.name };
  }
}

// ─── USAGE STATS (for /api/profile/usage) ────────────────────────
export function getUsageStats() {
  const stats = {};
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const usage = getUsage(id);
    if (usage > 0 || p.tier <= 1) {
      stats[id] = {
        name: p.name,
        used: usage,
        limit: p.dailyLimit,
        percent: Math.min(100, Math.round((usage / p.dailyLimit) * 100)),
        nearLimit: isNearLimit(id),
        atLimit: isAtLimit(id),
      };
    }
  }
  return stats;
}
