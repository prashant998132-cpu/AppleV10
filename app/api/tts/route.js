// app/api/tts/route.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — TTS Route (Edge Runtime)
// ─────────────────────────────────────────────────────────────
// Normally TTS is called directly from browser (media-client.js).
// This route is fallback for CORS issues / key security.
// Edge runtime = pipes audio stream, no 4.5MB body limit,
// no buffering in Vercel memory. Bytes: provider → client directly.
// Cache-Control: 24h immutable → SW caches it forever.
// ═══════════════════════════════════════════════════════════════

export const runtime = 'edge';

const KEYS = () => ({
  SARVAM_API_KEY:     process.env.SARVAM_API_KEY     || '',
  GOOGLE_TTS_KEY:     process.env.GOOGLE_TTS_KEY     || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
});

// ─── SARVAM ───────────────────────────────────────────────────
async function sarvamEdge(text, voice = 'meera') {
  const k = KEYS().SARVAM_API_KEY;
  if (!k) throw new Error('No Sarvam key');
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': k, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)], target_language_code: 'hi-IN', speaker: voice,
      pitch: 0, pace: 1.05, loudness: 1.4, speech_sample_rate: 22050,
      enable_preprocessing: true, model: 'bulbul:v3',
    }),
  });
  if (!r.ok) throw new Error(`Sarvam ${r.status}`);
  const d = await r.json();
  const b64 = d.audios?.[0];
  if (!b64) throw new Error('Sarvam: no audio');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: {
    'Content-Type': 'audio/wav',
    'Cache-Control': 'public, max-age=86400, immutable',
    'X-TTS-Provider': 'sarvam',
  }});
}

// ─── ELEVENLABS — pipe upstream stream directly ───────────────
async function elevenLabsEdge(text) {
  const k = KEYS().ELEVENLABS_API_KEY;
  if (!k) throw new Error('No ElevenLabs key');
  const up = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
    method: 'POST',
    headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': k },
    body: JSON.stringify({ text: text.slice(0, 500), model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!up.ok) throw new Error(`ElevenLabs ${up.status}`);
  return new Response(up.body, { headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=86400, immutable',
    'X-TTS-Provider': 'elevenlabs',
    'Transfer-Encoding': 'chunked',
  }});
}

// ─── GOOGLE TTS ───────────────────────────────────────────────
async function googleEdge(text, lang = 'hindi', gender = 'female') {
  const k = KEYS().GOOGLE_TTS_KEY;
  if (!k) throw new Error('No Google TTS key');
  const voiceMap = {
    hindi_female: { languageCode:'hi-IN', name:'hi-IN-Neural2-A', ssmlGender:'FEMALE' },
    hindi_male:   { languageCode:'hi-IN', name:'hi-IN-Neural2-B', ssmlGender:'MALE'   },
    english:      { languageCode:'en-IN', name:'en-IN-Wavenet-A', ssmlGender:'FEMALE' },
  };
  const voice = voiceMap[`${lang}_${gender}`] || voiceMap.hindi_female;
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${k}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input:{ text: text.slice(0,3000) }, voice,
      audioConfig:{ audioEncoding:'MP3', speakingRate:1.0, pitch:0, effectsProfileId:['handset-class-device'] } }),
  });
  if (!r.ok) throw new Error(`Google TTS ${r.status}`);
  const d = await r.json();
  const b64 = d.audioContent;
  if (!b64) throw new Error('Google TTS: no audio');
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=86400, immutable',
    'X-TTS-Provider': 'google',
  }});
}

// ─── POST — used by chat page TTS button ─────────────────────
export async function POST(req) {
  try {
    const { text, voice = 'meera', gender = 'female', lang = 'hindi' } = await req.json();
    if (!text?.trim()) return Response.json({ error: 'Text required' }, { status: 400 });
    const clean = text.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').trim().slice(0,800);
    const keys = KEYS();
    const chain = [
      { fn: () => sarvamEdge(clean, voice),        enabled: !!keys.SARVAM_API_KEY },
      { fn: () => elevenLabsEdge(clean),            enabled: !!keys.ELEVENLABS_API_KEY },
      { fn: () => googleEdge(clean, lang, gender),  enabled: !!keys.GOOGLE_TTS_KEY },
      // v10.1: Pollinations Audio — FREE, no key, returns direct URL
      {
        fn: async () => {
          if (clean.length > 300) throw new Error('Too long for Pollinations');
          const pollinVoice = gender === 'male' ? 'echo' : 'nova';
          const url = `https://text.pollinations.ai/${encodeURIComponent(clean.slice(0,280))}?model=openai-audio&voice=${pollinVoice}`;
          // Return as URL reference — zero Vercel bytes
          return Response.json({ url, provider: 'Pollinations Audio', direct: true });
        },
        enabled: clean.length <= 300,
      },
    ];
    for (const p of chain) {
      if (!p.enabled) continue;
      try {
        return await Promise.race([
          p.fn(),
          new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 12000)),
        ]);
      } catch {}
    }
    // Final fallback — browser speech synthesis
    return Response.json({ browserFallback: true, text: clean, lang });
  } catch (e) {
    return Response.json({ browserFallback: true, error: e.message });
  }
}

// ─── GET — TTS as cacheable URL (<audio src="/api/tts?t=...&v=meera">) ─
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('t') || '';
  const voice = searchParams.get('v') || 'meera';
  if (!text) return new Response('Missing t param', { status: 400 });
  try { return await sarvamEdge(decodeURIComponent(text), voice); }
  catch { return new Response('TTS unavailable', { status: 503 }); }
}
