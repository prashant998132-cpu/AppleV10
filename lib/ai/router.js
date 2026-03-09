import { tFetch } from '../utils/fetch.js';
// lib/ai/router.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — Smart Router
// "Sirf Zaroorat par Kharch" — right model for right task
// Instant → Cerebras/SambaNova | Fast → Groq | Think → DeepSeek R1
// Deep → Gemini 2.5 Flash | Simple → Gemini Flash-Lite (1000 RPD)
// ═══════════════════════════════════════════════════════════════

// v8: SambaNova OpenAI-compatible base (919 t/s free)
export const SAMBANOVA_URL    = 'https://api.sambanova.ai/v1';
export const SAMBANOVA_MODEL  = 'Meta-Llama-3.1-70B-Instruct';
export const GEMINI_FLASH_LITE = 'gemini-2.5-flash-lite-preview-06-17';

// ─── MESSAGE COMPLEXITY CLASSIFIER ──────────────────────────
export function classifyComplexity(message) {
  const msg = message.toLowerCase().trim();
  const words = msg.split(/\s+/).length;

  // Greetings / tiny queries → FLASH (Groq, instant)
  const flashPatterns = [
    /^(hi|hello|hey|hii|helo|namaste|namaskar|yo|sup)[\s!?.]*$/i,
    /^(ok|okay|haan|nahi|ha|na|theek|shukriya|thanks|ty|bye|good|nice|wow)[\s!?.]*$/i,
    /^(kya hal|kaise ho|how are you|what's up|sab theek)[\s!?.]*$/i,
    /^(time|date|din|week|month|year|aaj|kal)[\s?]*$/i,
  ];
  if (flashPatterns.some(p => p.test(msg)) || words <= 3) return 'flash';

  // Creative / visual → IMAGE or MUSIC (no LLM needed)
  if (msg.match(/\b(image|photo|picture|draw|paint|banao|dikhao|generate.*image|photo.*banao)\b/)) return 'image';
  if (msg.match(/\b(song|music|gana|dhun|beat|generate.*music|music.*banao)\b/)) return 'music';
  if (msg.match(/\b(bolo|speak|bol|tts|voice.*mein|audio.*banao)\b/)) return 'tts';
  if (msg.match(/\b(video|clip|reel|generate.*video)\b/)) return 'video';

  // Simple factual → FLASH (Groq handles well)
  const simplePatterns = [
    /\b(weather|mausam|temp)\b/,
    /\b(joke|hasao|funny)\b/,
    /\b(quote|suvichar)\b/,
    /\b(holiday|festival)\b/,
    /\b(news|khabar)\b/,
    /\b(time|date|samay)\b/,
    /\b(currency|dollar|rupee)\b/,
  ];
  if (simplePatterns.some(p => p.test(msg)) && words < 15) return 'flash';

  // Reasoning heavy → THINK (DeepSeek R1)
  const thinkPatterns = [
    /\b(why|kyu|kyun|explain|samjhao|reason|logic|theory)\b/,
    /\b(math|calculate|solve|equation|problem)\b/,
    /\b(code|program|bug|error|function|algorithm)\b/,
    /\b(compare|difference|better|worse|pros|cons|analysis)\b/,
    /\b(neet|jee|upsc|exam|study|question|answer)\b/,
    /\b(philosophy|deep|complex|difficult|hard)\b/,
    /\b(decision|choose|option|select|kaun sa)\b/,
  ];
  if (thinkPatterns.some(p => p.test(msg))) return 'think';

  // Agentic / planning → DEEP (Gemini + tools)
  const deepPatterns = [
    /\b(plan|roadmap|strategy|goal|milestone)\b/,
    /\b(research|find|search|look up|dhundho)\b/,
    /\b(write|draft|create|compose|banao)\b/,
    /\b(email|letter|report|document)\b/,
    /\b(career|study plan|learning path)\b/,
    /\b(analyze|review|feedback|improve)\b/,
  ];
  if (deepPatterns.some(p => p.test(msg)) || words > 30) return 'deep';

  // Medium complexity → FLASH (Groq is good enough)
  if (words < 20) return 'flash';

  return 'deep';
}

// ─── ROUTE CONFIG ────────────────────────────────────────────
export const ROUTE_CONFIG = {
  flash: {
    label: '⚡ Flash',
    description: 'Fast & free — simple queries',
    model: 'groq',
    showThinking: false,
    useTools: false,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  think: {
    label: '🧠 Think',
    description: 'DeepSeek R1 — shows reasoning',
    model: 'deepseek-r1',
    showThinking: true,
    useTools: false,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  deep: {
    label: '🔬 Deep',
    description: 'Gemini + tools + agents',
    model: 'gemini',
    showThinking: false,
    useTools: true,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  auto: {
    label: '🤖 Auto',
    description: 'Smart routing — JARVIS decides',
    model: 'auto',
    showThinking: false,
    useTools: true,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
  },
};

// ─── UNLIMITED LLM CHAIN ─────────────────────────────────────
// Never runs out — cascades through all available models
export const LLM_CHAIN = [
  // Tier 1 — Fast & Free
  { id: 'groq-llama3-70b',    name: 'Groq LLaMA3 70B',      provider: 'groq',       model: 'llama3-70b-8192',                  free: true,  speed: 'fast',   quality: 4 },
  { id: 'groq-deepseek-r1',   name: 'DeepSeek R1 (Groq)',   provider: 'groq',       model: 'deepseek-r1-distill-llama-70b',    free: true,  speed: 'fast',   quality: 5, think: true },
  { id: 'groq-llama3-8b',     name: 'Groq LLaMA3 8B',       provider: 'groq',       model: 'llama3-8b-8192',                   free: true,  speed: 'instant',quality: 3 },
  { id: 'groq-mixtral',       name: 'Mixtral 8x7B (Groq)',  provider: 'groq',       model: 'mixtral-8x7b-32768',               free: true,  speed: 'fast',   quality: 4 },
  { id: 'groq-gemma2',        name: 'Gemma2 9B (Groq)',     provider: 'groq',       model: 'gemma2-9b-it',                     free: true,  speed: 'fast',   quality: 3 },

  // Tier 2 — Quality
  { id: 'gemini-flash',       name: 'Gemini 1.5 Flash',     provider: 'gemini',     model: 'gemini-1.5-flash',                 free: true,  speed: 'medium', quality: 5 },
  { id: 'gemini-pro',         name: 'Gemini 1.5 Pro',       provider: 'gemini',     model: 'gemini-1.5-pro',                   free: true,  speed: 'slow',   quality: 5 },

  // Tier 3 — OpenRouter (free models)
  { id: 'or-deepseek-r1',     name: 'DeepSeek R1 (OpenRouter)', provider: 'openrouter', model: 'deepseek/deepseek-r1:free',   free: true,  speed: 'medium', quality: 5, think: true },
  { id: 'or-llama3-70b',      name: 'LLaMA3 70B (OpenRouter)', provider: 'openrouter',  model: 'meta-llama/llama-3.1-70b-instruct:free', free: true, speed:'medium', quality:4 },
  { id: 'or-mistral',         name: 'Mistral 7B (OpenRouter)', provider: 'openrouter',  model: 'mistralai/mistral-7b-instruct:free',     free: true, speed:'medium', quality:3 },
  { id: 'or-qwen',            name: 'Qwen 72B (OpenRouter)',   provider: 'openrouter',  model: 'qwen/qwen-2.5-72b-instruct:free',        free: true, speed:'medium', quality:4 },

  // Tier 4 — Puter.js (browser-side, no key)
  { id: 'puter-gpt4o',        name: 'GPT-4o (Puter.js)',    provider: 'puter',      model: 'gpt-4o',                           free: true,  speed: 'medium', quality: 5, browserOnly: true },
  { id: 'puter-claude',       name: 'Claude (Puter.js)',     provider: 'puter',      model: 'claude-3-5-sonnet',                free: true,  speed: 'medium', quality: 5, browserOnly: true },
];

// ─── MODEL CALL FUNCTIONS ────────────────────────────────────
export async function callGroq(messages, systemPrompt, apiKey, model = 'llama3-70b-8192') {
  if (!apiKey) throw new Error('No Groq key');
  const r = await tFetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  }, 15000);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || '';
}

export async function callOpenRouter(messages, systemPrompt, apiKey, model) {
  if (!apiKey) throw new Error('No OpenRouter key');
  const r = await tFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://jarvis-ai.app',
      'X-Title': 'JARVIS Personal AI',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  }, 20000);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || '';
}

// ─── DEEPSEEK R1 — Extract thinking + answer ─────────────────
export function parseDeepSeekResponse(rawText) {
  const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
  const thinking = thinkMatch ? thinkMatch[1].trim() : null;
  const answer = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return { thinking, answer };
}

// ─── UNLIMITED LLM CALL — Never runs out ─────────────────────
export async function callLLMChain(messages, systemPrompt, keys, preferredRoute = 'auto', specificModel = null) {

  // Build ordered chain based on route
  let chain = [];

  if (preferredRoute === 'flash') {
    // Fast path — Groq models only
    chain = LLM_CHAIN.filter(m => m.provider === 'groq' && !m.think);
  } else if (preferredRoute === 'think') {
    // DeepSeek R1 first
    chain = [
      LLM_CHAIN.find(m => m.id === 'groq-deepseek-r1'),
      LLM_CHAIN.find(m => m.id === 'or-deepseek-r1'),
      ...LLM_CHAIN.filter(m => m.provider === 'groq' && !m.think),
    ].filter(Boolean);
  } else {
    // Deep / Auto — all models
    chain = [
      LLM_CHAIN.find(m => m.id === 'gemini-flash'),
      LLM_CHAIN.find(m => m.id === 'groq-llama3-70b'),
      LLM_CHAIN.find(m => m.id === 'groq-deepseek-r1'),
      LLM_CHAIN.find(m => m.id === 'or-deepseek-r1'),
      LLM_CHAIN.find(m => m.id === 'or-llama3-70b'),
      LLM_CHAIN.find(m => m.id === 'or-qwen'),
      LLM_CHAIN.find(m => m.id === 'groq-mixtral'),
      LLM_CHAIN.find(m => m.id === 'groq-llama3-8b'),
    ].filter(Boolean);
  }

  // Try specific model first if requested
  if (specificModel) {
    const specific = LLM_CHAIN.find(m => m.id === specificModel);
    if (specific) chain = [specific, ...chain.filter(m => m.id !== specificModel)];
  }

  const errors = [];

  for (const model of chain) {
    if (model.browserOnly) continue; // Skip browser-only on server
    try {
      let rawText = '';

      if (model.provider === 'groq' && keys.GROQ_API_KEY) {
        rawText = await callGroq(messages, systemPrompt, keys.GROQ_API_KEY, model.model);
      } else if (model.provider === 'gemini' && keys.GEMINI_API_KEY) {
        rawText = await callGemini(messages, systemPrompt, keys.GEMINI_API_KEY, model.model);
      } else if (model.provider === 'openrouter' && keys.OPENROUTER_KEY) {
        rawText = await callOpenRouter(messages, systemPrompt, keys.OPENROUTER_KEY, model.model);
      } else {
        continue; // No key for this provider
      }

      if (!rawText?.trim()) continue;

      // Parse DeepSeek thinking
      if (model.think) {
        const { thinking, answer } = parseDeepSeekResponse(rawText);
        return { text: answer, thinking, modelUsed: model.name, modelId: model.id, isThinking: !!thinking };
      }

      return { text: rawText, thinking: null, modelUsed: model.name, modelId: model.id, isThinking: false };

    } catch (e) {
      errors.push(`${model.name}: ${e.message}`);
      console.warn(`LLM ${model.name} failed:`, e.message);
    }
  }

  throw new Error(`All LLMs failed. Errors: ${errors.slice(0, 3).join(' | ')}`);
}

async function callGemini(messages, systemPrompt, apiKey, model = 'gemini-1.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await tFetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
    }),
  }, 20000);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

