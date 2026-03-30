// app/api/tts/route.js — TTS via GROQ (whisper-large-v3 for STT, PlayHT/browser for TTS)
// Strategy: GROQ has no TTS endpoint, so we use browser TTS signal + optional ElevenLabs
export const dynamic = 'force-dynamic';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { text, voice = 'meera' } = await req.json();
    if (!text) return Response.json({ error: 'No text' }, { status: 400 });

    const keys = getKeys();

    // 1. Try ElevenLabs if key available
    if (keys.ELEVENLABS_API_KEY) {
      const voiceId = voice === 'meera' ? 'Rachel' : 'Adam';
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': keys.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        return new Response(buf, {
          headers: { 'Content-Type': 'audio/mpeg', 'X-Provider': 'elevenlabs' },
        });
      }
    }

    // 2. Try Sarvam.ai (Hindi TTS - Made in India, free tier)
    if (keys.SARVAM_API_KEY) {
      const r = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': keys.SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [text.slice(0, 500)],
          target_language_code: 'hi-IN',
          speaker: 'meera',
          model: 'bulbul:v1',
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const audioB64 = d.audios?.[0];
        if (audioB64) {
          const buf = Buffer.from(audioB64, 'base64');
          return new Response(buf, {
            headers: { 'Content-Type': 'audio/wav', 'X-Provider': 'sarvam' },
          });
        }
      }
    }

    // 3. No API key — signal client to use browser TTS
    return Response.json({ useBrowser: true, text }, { status: 200 });

  } catch (e) {
    return Response.json({ useBrowser: true, error: e.message }, { status: 200 });
  }
}
