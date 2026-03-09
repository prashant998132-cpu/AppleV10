import { tFetch } from '../utils/fetch.js';
// lib/ai/image.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v5 — Image Generation Engine
// Chain: Puter.js → AIMLAPI → Gemini Imagen → fal.ai → HF → Pollinations
// ═══════════════════════════════════════════════════════════════

// ─── PROMPT ENHANCER (Hindi → English + Indian context) ───────
export async function enhancePrompt(rawPrompt, geminiKey) {
  if (!geminiKey) return rawPrompt;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Convert this to an optimized English image generation prompt. If it mentions India/Indian places/people, add relevant cultural details. Keep under 100 words. Return only the prompt, nothing else.\n\nInput: "${rawPrompt}"` }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 150 }
      })
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawPrompt;
  } catch { return rawPrompt; }
}

// ─── PUTER.JS (Browser-side, truly unlimited, no key) ─────────
// Call this from frontend only — inject puter.js script first
export const PUTER_SCRIPT = 'https://js.puter.com/v2/';

export async function imageViaPuter(prompt) {
  // This runs client-side via injected puter.js
  // Returns image URL
  if (typeof window === 'undefined' || !window.puter) throw new Error('Puter not loaded');
  const img = await window.puter.ai.txt2img(prompt);
  if (img?.src) return { url: img.src, provider: 'Puter.js', free: true };
  throw new Error('Puter returned no image');
}

// ─── AIMLAPI (FLUX + others, free tier) ───────────────────────
async function imageViaAIMLAPI(prompt, apiKey, model = 'flux-schnell') {
  if (!apiKey) throw new Error('No AIMLAPI key');
  const models = {
    'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
    'flux-dev':     'black-forest-labs/FLUX.1-dev',
    'sdxl':         'stabilityai/stable-diffusion-xl-base-1.0',
  };
  const r = await tFetch('https://api.aimlapi.com/v2/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: models[model] || models['flux-schnell'],
      prompt,
      image_size: 'square_hd',
      num_inference_steps: 4,
      num_images: 1,
    })
  }, 30000);
  const d = await r.json();
  const url = d.images?.[0]?.url || d.data?.[0]?.url;
  if (!url) throw new Error('AIMLAPI: no image');
  return { url, provider: 'AIMLAPI FLUX', model };
}

// ─── GOOGLE GEMINI IMAGEN ─────────────────────────────────────
async function imageViaGemini(prompt, apiKey) {
  if (!apiKey) throw new Error('No Gemini key');
  const r = await tFetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_few' }
    })
  }, 30000);
  const d = await r.json();
  const b64 = d.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('Gemini Imagen: no image');
  return { url: `data:image/png;base64,${b64}`, provider: 'Gemini Imagen', base64: b64 };
}

// ─── FAL.AI (FLUX Schnell, 100 free credits) ──────────────────
async function imageViaFal(prompt, apiKey) {
  if (!apiKey) throw new Error('No fal.ai key');
  const r = await tFetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1, num_inference_steps: 4 })
  }, 25000);
  const d = await r.json();
  const url = d.images?.[0]?.url;
  if (!url) throw new Error('fal.ai: no image');
  return { url, provider: 'fal.ai FLUX' };
}

// ─── HUGGING FACE (FLUX Schnell, free unlimited slow) ─────────
async function imageViaHuggingFace(prompt, token) {
  if (!token) throw new Error('No HF token');
  const models = [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'runwayml/stable-diffusion-v1-5',
  ];
  for (const model of models) {
    try {
      const r = await tFetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      }, 40000);
      if (r.ok && r.headers.get('content-type')?.includes('image')) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        return { url, provider: `HuggingFace (${model.split('/')[1]})`, blob };
      }
    } catch {}
  }
  throw new Error('HuggingFace: all models failed');
}

// ─── LEONARDO.AI (150 tokens/day free) ────────────────────────
async function imageViaLeonardo(prompt, apiKey) {
  if (!apiKey) throw new Error('No Leonardo key');
  // Step 1: Generate
  const genR = await tFetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      prompt, modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
      width: 512, height: 512, num_images: 1,
    })
  }, 15000);
  const genD = await genR.json();
  const genId = genD.sdGenerationJob?.generationId;
  if (!genId) throw new Error('Leonardo: no generation ID');

  // Step 2: Poll for result
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const pollR = await tFetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }, 8000);
    const pollD = await pollR.json();
    const url = pollD.generations_by_pk?.generated_images?.[0]?.url;
    if (url) return { url, provider: 'Leonardo.ai' };
  }
  throw new Error('Leonardo: timeout');
}

// ─── DEEPAI (Free tier) ───────────────────────────────────────
async function imageViaDeepAI(prompt, apiKey) {
  if (!apiKey) throw new Error('No DeepAI key');
  const fd = new FormData();
  fd.append('text', prompt);
  const r = await tFetch('https://api.deepai.org/api/text2img', {
    method: 'POST',
    headers: { 'api-key': apiKey },
    body: fd
  }, 20000);
  const d = await r.json();
  if (!d.output_url) throw new Error('DeepAI: no image');
  return { url: d.output_url, provider: 'DeepAI' };
}

// ─── POLLINATIONS (Always-on, truly free, URL-based) ──────────
function imageViaPollinations(prompt, width = 512, height = 512) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&enhance=true`;
  return { url, provider: 'Pollinations.ai', instant: true };
}

// ─── CRAIYON (Unlimited free fallback) ────────────────────────
async function imageViaCraiyon(prompt) {
  const r = await tFetch('https://backend.craiyon.com/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, version: 'c', token: null })
  }, 60000); // Craiyon is slow
  const d = await r.json();
  const b64 = d.images?.[0];
  if (!b64) throw new Error('Craiyon: no image');
  return { url: `data:image/webp;base64,${b64}`, provider: 'Craiyon', base64: b64 };
}

// ─── STYLE PRESETS ────────────────────────────────────────────
export const IMAGE_STYLES = {
  realistic:     'photorealistic, 8k, detailed, natural lighting',
  anime:         'anime style, vibrant colors, detailed illustration',
  indian:        'Indian artistic style, vibrant colors, cultural elements',
  cinematic:     'cinematic photography, dramatic lighting, movie scene',
  watercolor:    'watercolor painting, soft colors, artistic',
  logo:          'clean logo design, minimal, vector style, white background',
  thumbnail:     'YouTube thumbnail style, bold text space, eye-catching, high contrast',
  instagram:     'Instagram-worthy, aesthetic, lifestyle photography',
  portrait:      'professional portrait, studio lighting, sharp focus',
  landscape:     'landscape photography, golden hour, stunning vista',
};

// ─── MAIN IMAGE GENERATION — Full Chain ───────────────────────
export async function generateImage(prompt, keys = {}, options = {}) {
  const {
    style = 'realistic',
    width = 512,
    height = 512,
    enhance = true,
    indianContext = true,
  } = options;

  // Enhance prompt
  let enhancedPrompt = prompt;
  if (enhance && keys.GEMINI_API_KEY) {
    enhancedPrompt = await enhancePrompt(prompt, keys.GEMINI_API_KEY);
  }

  const styleTag = IMAGE_STYLES[style] || IMAGE_STYLES.realistic;
  const finalPrompt = `${enhancedPrompt}, ${styleTag}`;

  // Provider chain — tries each in order
  const chain = [
    // Puter.js is browser-only — handled client-side before calling this
    { name: 'aimlapi',      fn: () => imageViaAIMLAPI(finalPrompt, keys.AIMLAPI_KEY),           enabled: !!keys.AIMLAPI_KEY },
    { name: 'gemini',       fn: () => imageViaGemini(finalPrompt, keys.GEMINI_API_KEY),          enabled: !!keys.GEMINI_API_KEY },
    { name: 'fal',          fn: () => imageViaFal(finalPrompt, keys.FAL_API_KEY),                enabled: !!keys.FAL_API_KEY },
    { name: 'leonardo',     fn: () => imageViaLeonardo(finalPrompt, keys.LEONARDO_API_KEY),      enabled: !!keys.LEONARDO_API_KEY },
    { name: 'huggingface',  fn: () => imageViaHuggingFace(finalPrompt, keys.HUGGINGFACE_TOKEN),  enabled: !!keys.HUGGINGFACE_TOKEN },
    { name: 'deepai',       fn: () => imageViaDeepAI(finalPrompt, keys.DEEPAI_KEY),              enabled: !!keys.DEEPAI_KEY },
    { name: 'craiyon',      fn: () => imageViaCraiyon(finalPrompt),                              enabled: true }, // always try
    { name: 'pollinations', fn: () => imageViaPollinations(finalPrompt, width, height),           enabled: true }, // always works
  ];

  for (const provider of chain) {
    if (!provider.enabled) continue;
    try {
      const result = await provider.fn();
      if (result?.url) return { ...result, prompt: finalPrompt, originalPrompt: prompt, style };
    } catch (e) {
      console.warn(`Image provider ${provider.name} failed:`, e.message);
    }
  }

  // Absolute fallback — always returns something
  return { ...imageViaPollinations(prompt, width, height), prompt: finalPrompt, originalPrompt: prompt, style };
}

// ─── UTILS ───────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
