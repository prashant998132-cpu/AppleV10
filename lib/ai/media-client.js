// lib/ai/media-client.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — Client-Side Media Engine
// ─────────────────────────────────────────────────────────────
// KEY PRINCIPLE: Media bytes NEVER touch Vercel.
//   TTS   → called directly from browser (Sarvam CORS ✓)
//   Image → Pollinations URL (no server) or CDN URL from /api/image
//   Music → HuggingFace direct or Mubert CDN URL
//   All results cached in Service Worker (zero re-downloads)
//
// Mobile Chrome optimised:
//   • AudioContext reused (no GC spikes)
//   • Images lazy-loaded as <img src="url"> (not base64 in DOM)
//   • Text chunked before TTS (< 500 chars per call)
//   • Timeout hard-capped per provider
// ═══════════════════════════════════════════════════════════════

'use client';

// ─── AUDIO CONTEXT (singleton — reuse, no GC) ─────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 22050 });
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// ─── CURRENT AUDIO (stop previous before playing new) ─────────
let _currentSource = null;
export function stopCurrentAudio() {
  try { _currentSource?.stop(); } catch {}
  _currentSource = null;
  window.speechSynthesis?.cancel();
}

// ─── TTS CACHE (session-level, keyed by text hash) ────────────
const _ttsCache = new Map();
function hashText(t) {
  // djb2 — tiny, fast, good enough for cache keys
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h) ^ t.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// ─── PLAY ArrayBuffer VIA AudioContext ────────────────────────
async function playBuffer(arrayBuffer, onEnd) {
  const ctx = getAudioCtx();
  if (!ctx) return false;
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0)); // slice = safe copy
    stopCurrentAudio();
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(ctx.destination);
    src.onended = onEnd || null;
    src.start(0);
    _currentSource = src;
    return true;
  } catch (e) {
    console.warn('[media-client] playBuffer error:', e.message);
    return false;
  }
}

// ─── CHUNK LONG TEXT FOR TTS ──────────────────────────────────
function chunkText(text, maxLen = 490) {
  const clean = text
    .replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[_~`]/g, '').trim().slice(0, 1400); // hard cap 1400 chars total
  if (clean.length <= maxLen) return [clean];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxLen, clean.length);
    // break at sentence boundary
    const dot = clean.lastIndexOf('. ', end);
    if (dot > start + 100) end = dot + 1;
    chunks.push(clean.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// TTS — DIRECT FROM BROWSER
// ═══════════════════════════════════════════════════════════════

// Sarvam AI — browser calls directly (CORS allowed)
async function sarvamClientTTS(text, apiKey, voice = 'meera') {
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)],
      target_language_code: 'hi-IN',
      speaker: voice,
      pitch: 0, pace: 1.05, loudness: 1.4,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v3',
    }),
  });
  if (!r.ok) throw new Error(`Sarvam ${r.status}`);
  const d = await r.json();
  const b64 = d.audios?.[0];
  if (!b64) throw new Error('Sarvam: no audio');
  // base64 → ArrayBuffer (never stored as string in DOM)
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ElevenLabs — direct from browser
async function elevenLabsClientTTS(text, apiKey, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text: text.slice(0, 500),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}`);
  return r.arrayBuffer();
}

// Browser SpeechSynthesis (always available, zero bandwidth)
function browserTTS(text, onEnd) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 500).replace(/[*_#[\]`~]/g, ' '));
  u.lang = 'hi-IN'; u.rate = 0.92; u.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const best = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang === 'en-IN');
  if (best) u.voice = best;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

/**
 * Main client-side TTS — plays audio directly, zero Vercel bandwidth.
 * @param {string} text
 * @param {{ sarvamKey?: string, elevenLabsKey?: string, voice?: string, onEnd?: fn }} opts
 */
export async function clientSpeak(text, opts = {}) {
  const { sarvamKey, elevenLabsKey, voice = 'meera', onEnd } = opts;
  stopCurrentAudio();

  const cacheKey = hashText(text + voice);
  if (_ttsCache.has(cacheKey)) {
    const cached = _ttsCache.get(cacheKey);
    await playBuffer(cached.slice(0), onEnd); // slice = fresh copy each play
    return { provider: 'cache', cached: true };
  }

  // Sarvam → ElevenLabs → Browser
  if (sarvamKey) {
    try {
      const chunks = chunkText(text);
      // Play first chunk immediately, queue rest
      const playChunks = async () => {
        for (let i = 0; i < chunks.length; i++) {
          const buf = await Promise.race([
            sarvamClientTTS(chunks[i], sarvamKey, voice),
            new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
          ]);
          if (i === 0 && chunks.length === 1 && buf.byteLength < 1_000_000) {
            _ttsCache.set(cacheKey, buf.slice(0)); // cache only single-chunk audio
          }
          const isLast = i === chunks.length - 1;
          await playBuffer(buf, isLast ? onEnd : null);
          if (isLast) return;
          // wait for chunk to finish before fetching next
          await new Promise(r => setTimeout(r, 50));
        }
      };
      await playChunks();
      return { provider: 'sarvam' };
    } catch (e) {
      console.warn('[media-client] Sarvam TTS failed:', e.message);
    }
  }

  if (elevenLabsKey) {
    try {
      const buf = await Promise.race([
        elevenLabsClientTTS(text, elevenLabsKey),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000)),
      ]);
      _ttsCache.set(cacheKey, buf.slice(0));
      await playBuffer(buf, onEnd);
      return { provider: 'elevenlabs' };
    } catch (e) {
      console.warn('[media-client] ElevenLabs TTS failed:', e.message);
    }
  }

  // Browser fallback — zero bandwidth
  browserTTS(text, onEnd);
  return { provider: 'browser' };
}

// ═══════════════════════════════════════════════════════════════
// IMAGE — ZERO SERVER ROUND-TRIP FOR COMMON CASES
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a Pollinations URL instantly (no server call, no bandwidth).
 * For FLUX/Gemini quality → call /api/image which returns a CDN URL.
 */
export function pollinationsUrl(prompt, width = 512, height = 512, seed = Date.now()) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}&enhance=true&model=flux`;
}

/**
 * Client-side image generation.
 * Priority: Pollinations (instant URL) → /api/image (CDN URL, no base64 proxied)
 */
export async function clientImage(prompt, opts = {}) {
  const { width = 512, height = 512, style = 'realistic', highQuality = false } = opts;

  if (!highQuality) {
    // Pollinations: pure URL, zero server cost, mobile-fast
    return { url: pollinationsUrl(`${prompt}, ${style}`, width, height), provider: 'Pollinations.ai', instant: true };
  }

  // High quality: server returns CDN URL only (no base64)
  const r = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style, width, height }),
  });
  const d = await r.json();
  if (!d.url) throw new Error(d.error || 'Image failed');
  return d;
}

// ═══════════════════════════════════════════════════════════════
// MUSIC — DIRECT OR CDN URL
// ═══════════════════════════════════════════════════════════════

/**
 * HuggingFace MusicGen — called directly from browser.
 * Returns an ObjectURL for the audio blob.
 * Zero Vercel bandwidth.
 */
export async function clientMusicHF(prompt, hfToken, durationSeconds = 10) {
  if (!hfToken) throw new Error('No HF token');
  const r = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: Math.min(durationSeconds * 50, 500) },
    }),
  });
  if (!r.ok) throw new Error(`HF MusicGen: ${r.status}`);
  const blob = await r.blob();
  if (!blob.type.includes('audio')) throw new Error('HF: not audio');
  return { url: URL.createObjectURL(blob), provider: 'HuggingFace MusicGen', format: 'wav' };
}

/**
 * Main client music — tries /api/music (returns CDN URL) then HF direct.
 */
export async function clientMusic(prompt, opts = {}) {
  const { genre = 'background', duration = 20, hfToken = null } = opts;

  // Server returns CDN URL (Mubert) or redirect links — no binary through Vercel
  try {
    const r = await fetch('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, genre, duration }),
    });
    const d = await r.json();
    if (d.url) return d; // Mubert CDN URL — client streams directly
    if (d.status === 'manual_only') return d; // links fallback
  } catch {}

  // HuggingFace direct from browser — zero Vercel bandwidth
  if (hfToken) {
    try {
      return await clientMusicHF(prompt, hfToken, Math.min(duration, 30));
    } catch (e) {
      console.warn('[media-client] HF Music failed:', e.message);
    }
  }

  return { status: 'unavailable', message: 'Music API key nahi hai' };
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD — DIRECT TO SUPABASE STORAGE (skip Vercel entirely)
// ═══════════════════════════════════════════════════════════════

/**
 * Upload a file directly from browser to Supabase Storage.
 * Vercel se file kabhi nahi guzarti.
 * Steps:
 *   1. GET /api/upload/presign  → { signedUrl, path, publicUrl }
 *   2. PUT signedUrl  (browser → Supabase direct)
 *   3. POST /api/upload/analyze { path, type, question }  → { analysis, saved }
 */
export async function uploadDirect(file, question = 'Analyze this content') {
  const type = file.type.includes('pdf') ? 'pdf'
    : file.type.includes('image') ? 'image'
    : file.type.includes('audio') ? 'audio'
    : 'document';

  // Step 1 — get presigned URL from server (tiny JSON, no file bytes)
  const presignRes = await fetch(`/api/upload/presign?type=${type}&filename=${encodeURIComponent(file.name)}&size=${file.size}`);
  if (!presignRes.ok) throw new Error('Presign failed — server error');
  const { signedUrl, path, publicUrl } = await presignRes.json();

  // Step 2 — PUT file directly to Supabase (Vercel never sees the bytes!)
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(`Storage upload failed: ${uploadRes.status}`);

  // Step 3 — Ask server to analyze (only path sent, not file bytes)
  const analyzeRes = await fetch('/api/upload/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, publicUrl, type, filename: file.name, size: file.size, question }),
  });
  if (!analyzeRes.ok) throw new Error('Analyze failed');
  return analyzeRes.json(); // { analysis, saved }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

/** Preload image into browser cache (for gallery / history views). */
export function preloadImage(url) {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

/** Play a URL via <audio> tag (lightweight, no AudioContext). */
export function playUrl(url, onEnd) {
  stopCurrentAudio();
  const audio = new Audio(url);
  audio.preload = 'auto';
  if (onEnd) audio.onended = onEnd;
  audio.onerror = () => console.warn('[media-client] playUrl error');
  audio.play().catch(e => console.warn('[media-client] play blocked:', e.message));
  return audio;
}

// ═══════════════════════════════════════════════════════════════
// JARVIS v9 — EMOTIONAL TTS
// ═══════════════════════════════════════════════════════════════

/**
 * Detect emotion from text — returns: 'happy' | 'sad' | 'urgent' | 'excited' | 'calm'
 */
export function detectEmotion(text) {
  const t = text.toLowerCase();
  if (/(!{2,}|🎉|🥳|🔥|amazing|wah|ekdum|best|jeet|congrats|awesome|level up|badhai)/i.test(t)) return 'excited';
  if (/(sad|dukhi|afsos|sorry|mushkil|bura|cry|hurt|struggle|힘들)/i.test(t)) return 'sad';
  if (/(warning|danger|important|zaruri|urgent|dhyan|alert|careful|watch out)/i.test(t)) return 'urgent';
  if (/(haha|lol|😄|😂|joke|funny|mazak|hasao)/i.test(t)) return 'happy';
  return 'calm';
}

/**
 * speakWithEmotion — adjusts voice based on text emotion
 * Maps emotion → Sarvam voice + pace + pitch
 */
export async function speakWithEmotion(text, opts = {}) {
  const { sarvamKey, elevenLabsKey, onEnd } = opts;
  const emotion = detectEmotion(text);

  // Voice config per emotion
  const voiceMap = {
    excited: { voice: 'arjun', pace: 1.2, },   // energetic male
    happy:   { voice: 'meera', pace: 1.1, },   // warm female
    sad:     { voice: 'meera', pace: 0.88, },  // slower, softer
    urgent:  { voice: 'amol',  pace: 1.15, },  // firm male
    calm:    { voice: 'meera', pace: 1.0, },   // default
  };

  const cfg = voiceMap[emotion] || voiceMap.calm;

  // Browser TTS: adjust rate + pitch based on emotion
  if (!sarvamKey) {
    if (!('speechSynthesis' in window)) return { provider: 'none', emotion };
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#[\]`~]/g, ' ').slice(0, 500));
    u.lang = 'hi-IN';
    u.rate = cfg.pace;
    u.pitch = emotion === 'excited' ? 1.2 : emotion === 'sad' ? 0.85 : 1.0;
    const voices = window.speechSynthesis.getVoices();
    const hv = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang === 'en-IN');
    if (hv) u.voice = hv;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
    return { provider: 'browser', emotion };
  }

  // Sarvam: different voice per emotion
  return clientSpeak(text, { sarvamKey, elevenLabsKey, voice: cfg.voice, onEnd });
}
