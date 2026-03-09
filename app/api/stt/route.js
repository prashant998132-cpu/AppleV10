// app/api/stt/route.js — Speech-to-Text via Groq Whisper
// ═══════════════════════════════════════════════════════════════
// JARVIS v7 — STT Engine
// Primary: Groq Whisper Large v3 — FREE, fast, Hindi+Hinglish
// Fallback: Sarvam AI Saaras — Made in India, Indian languages
// ═══════════════════════════════════════════════════════════════
import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const language  = formData.get('language') || 'hi'; // hi = Hindi, en = English

    if (!audioFile) return Response.json({ error: 'No audio file' }, { status: 400 });

    const keys = getKeys();

    // ── Try Groq Whisper first ───────────────────────────────
    if (keys.GROQ_API_KEY) {
      try {
        const groqForm = new FormData();
        groqForm.append('file', audioFile, 'audio.webm');
        groqForm.append('model', 'whisper-large-v3');
        groqForm.append('response_format', 'json');
        groqForm.append('language', language);
        groqForm.append('temperature', '0');

        const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${keys.GROQ_API_KEY}` },
          body: groqForm,
        });

        if (r.ok) {
          const d = await r.json();
          return Response.json({
            text:     d.text || '',
            provider: 'Groq Whisper v3',
            language,
          });
        }
      } catch (e) {
        console.warn('Groq STT failed:', e.message);
      }
    }

    // ── Fallback: Sarvam AI Saaras (Indian languages) ────────
    if (keys.SARVAM_API_KEY) {
      try {
        const sarvamForm = new FormData();
        sarvamForm.append('file', audioFile, 'audio.webm');
        sarvamForm.append('model', 'saaras:v2');
        sarvamForm.append('language_code', language === 'hi' ? 'hi-IN' : 'en-IN');

        const r = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: { 'api-subscription-key': keys.SARVAM_API_KEY },
          body: sarvamForm,
        });

        if (r.ok) {
          const d = await r.json();
          return Response.json({
            text:     d.transcript || '',
            provider: 'Sarvam AI',
            language,
          });
        }
      } catch (e) {
        console.warn('Sarvam STT failed:', e.message);
      }
    }

    // ── No provider available ─────────────────────────────────
    return Response.json({
      error:    'No STT provider configured',
      hint:     'Add GROQ_API_KEY (Whisper free) or SARVAM_API_KEY to .env.local',
      fallback: 'browser', // client will use Web Speech API
    }, { status: 503 });

  } catch (e) {
    console.error('STT route error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
