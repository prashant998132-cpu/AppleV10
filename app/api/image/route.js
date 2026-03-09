// app/api/image/route.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — Image Route
// ─────────────────────────────────────────────────────────────
// RULE: ONLY return CDN URLs — NEVER proxy base64 through Vercel.
// Gemini Imagen returns base64 → save to Supabase Storage → return URL.
// All other providers return CDN URLs directly.
// Mobile: default 512px, highQuality flag for 1024px.
// ═══════════════════════════════════════════════════════════════

import { getKeys } from '@/lib/config';
import { getUser, getSupabaseAdmin } from '@/lib/db/supabase';
import { generateImage, IMAGE_STYLES, enhancePrompt } from '@/lib/ai/image';

// ─── Save base64 to Supabase Storage → return public URL ─────
async function base64ToSupabaseUrl(base64, userId, prompt) {
  try {
    const db = getSupabaseAdmin();
    const buf = Buffer.from(base64, 'base64');
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await db.storage.from('jarvis-media').upload(filename, buf, {
      contentType: 'image/png',
      cacheControl: '31536000', // 1 year CDN cache
      upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from('jarvis-media').getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.warn('[image/route] Supabase storage failed:', e.message);
    return null; // caller will use Pollinations fallback
  }
}

// ─── Pollinations — always works, instant, zero cost ─────────
function pollinationsUrl(prompt, w = 512, h = 512) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Date.now()}&enhance=true&model=flux`;
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt, style = 'realistic', width = 512, height = 512, highQuality = false } = await req.json();
  if (!prompt?.trim()) return Response.json({ error: 'Prompt required' }, { status: 400 });

  const keys = getKeys();
  const styleTag = IMAGE_STYLES[style] || IMAGE_STYLES.realistic;

  // Enhance prompt (lightweight Gemini text call — tiny, not image bytes)
  let finalPrompt = prompt;
  if (keys.GEMINI_API_KEY) {
    finalPrompt = await enhancePrompt(prompt, keys.GEMINI_API_KEY).catch(() => prompt);
  }
  finalPrompt = `${finalPrompt}, ${styleTag}`;

  // Mobile: use smaller size unless highQuality requested
  const w = highQuality ? Math.min(width, 1024) : Math.min(width, 512);
  const h = highQuality ? Math.min(height, 1024) : Math.min(height, 512);

  // Provider chain — CDN URL providers first (no bytes through Vercel)
  // 1. AIMLAPI  → returns CDN URL ✅
  // 2. fal.ai   → returns CDN URL ✅
  // 3. Leonardo → returns CDN URL ✅
  // 4. Gemini   → base64 → Supabase Storage → CDN URL ✅
  // 5. HF       → blob — SKIP (would go through Vercel — use client-side instead)
  // 6. Craiyon  → base64 — SKIP (same reason)
  // 7. Pollinations → instant URL ✅ (always last resort)

  const chain = [
    {
      name: 'aimlapi',
      enabled: !!keys.AIMLAPI_KEY,
      fn: async () => {
        const r = await fetch('https://api.aimlapi.com/v2/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.AIMLAPI_KEY}` },
          body: JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell', prompt: finalPrompt,
            image_size: 'square_hd', num_inference_steps: 4, num_images: 1 }),
        });
        const d = await r.json();
        const url = d.images?.[0]?.url || d.data?.[0]?.url;
        if (!url) throw new Error('AIMLAPI: no url');
        return { url, provider: 'AIMLAPI FLUX' };
      },
    },
    {
      name: 'fal',
      enabled: !!keys.FAL_API_KEY,
      fn: async () => {
        const r = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Key ${keys.FAL_API_KEY}` },
          body: JSON.stringify({ prompt: finalPrompt, image_size: 'square_hd', num_images: 1, num_inference_steps: 4 }),
        });
        const d = await r.json();
        const url = d.images?.[0]?.url;
        if (!url) throw new Error('fal.ai: no url');
        return { url, provider: 'fal.ai FLUX' };
      },
    },
    {
      name: 'gemini',
      enabled: !!keys.GEMINI_API_KEY,
      fn: async () => {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${keys.GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: finalPrompt }],
              parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_few' } }) }
        );
        const d = await r.json();
        const b64 = d.predictions?.[0]?.bytesBase64Encoded;
        if (!b64) throw new Error('Gemini Imagen: no image');
        // ✅ Key fix: save to Supabase Storage, return CDN URL — not base64 through Vercel
        const publicUrl = await base64ToSupabaseUrl(b64, user.id, finalPrompt);
        if (publicUrl) return { url: publicUrl, provider: 'Gemini Imagen (Supabase CDN)' };
        throw new Error('Supabase storage unavailable');
      },
    },
    {
      name: 'pollinations',
      enabled: true,
      fn: async () => ({ url: pollinationsUrl(finalPrompt, w, h), provider: 'Pollinations.ai' }),
    },
  ];

  for (const p of chain) {
    if (!p.enabled) continue;
    try {
      const result = await Promise.race([
        p.fn(),
        new Promise((_, r) => setTimeout(() => r(new Error(`${p.name} timeout`)), 28000)),
      ]);
      if (result?.url) {
        return Response.json({
          url: result.url, provider: result.provider,
          style, prompt: finalPrompt, originalPrompt: prompt,
        });
      }
    } catch (e) {
      console.warn(`[image/route] ${p.name} failed:`, e.message);
    }
  }

  // Absolute fallback — Pollinations always works
  return Response.json({
    url: pollinationsUrl(finalPrompt, w, h),
    provider: 'Pollinations.ai (fallback)',
    style, prompt: finalPrompt, originalPrompt: prompt,
  });
}

export async function GET() {
  return Response.json({
    styles: Object.keys(IMAGE_STYLES),
    note: 'All providers return CDN URLs — no base64 proxied through Vercel',
    providers: [
      { name: 'AIMLAPI FLUX', keyNeeded: 'AIMLAPI_KEY', returnsUrl: true },
      { name: 'fal.ai FLUX',  keyNeeded: 'FAL_API_KEY',  returnsUrl: true },
      { name: 'Gemini Imagen',keyNeeded: 'GEMINI_API_KEY', returnsUrl: true, note: 'via Supabase Storage' },
      { name: 'Pollinations', keyNeeded: false, returnsUrl: true, note: 'Always available' },
    ],
  });
}
