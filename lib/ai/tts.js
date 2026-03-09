import { tFetch } from '../utils/fetch.js';
// lib/ai/tts.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v7 — Text-to-Speech Engine
// Chain: Sarvam AI → ElevenLabs → Google TTS → Azure → Browser
// Sarvam AI = Made in India, 11 languages, 25+ Hindi voices, FREE
// ═══════════════════════════════════════════════════════════════

export const TTS_PROVIDERS = {
  sarvam: {
    name: 'Sarvam AI (Bulbul v2)',
    quality: 5,
    limit: 'Free tier — sarvam.ai',
    hindiSupport: true, // 🇮🇳 Made in India — BEST for Hinglish
    voices: {
      hindi_female: 'meera',    // Natural Hindi female
      hindi_male:   'amol',     // Natural Hindi male
      english:      'maya',     // Indian English
      hinglish:     'arjun',    // Hinglish mix — perfect for JARVIS
    },
  },
  elevenlabs: {
    name: 'ElevenLabs',
    quality: 5,
    limit: '10k chars/month',
    hindiSupport: true,
    voices: {
      hindi_female: 'pFZP5JQG7iQjIQuC4Bku',  // Lily - works for Hindi
      hindi_male:   'TX3LPaxmHKxFdv7VOQHJ',  // Liam
      default:      'EXAVITQu4vr4xnSDxMaL',  // Bella
    },
  },
  google: {
    name: 'Google Cloud TTS',
    quality: 4,
    limit: '1M chars/month',
    hindiSupport: true,
    voices: {
      hindi_female: 'hi-IN-Wavenet-A',
      hindi_male:   'hi-IN-Wavenet-B',
      hindi_neural: 'hi-IN-Neural2-A',
      english:      'en-IN-Wavenet-A',
    },
  },
  pollinations: {
    name: 'Pollinations Audio (Free)',
    quality: 3,
    limit: 'Free — no key needed (15s rate limit anon)',
    hindiSupport: false, // English only currently
    voices: {
      nova:    'nova',    // Female, natural
      alloy:   'alloy',   // Male, balanced
      echo:    'echo',    // Male, clear
      shimmer: 'shimmer', // Female, warm — best for JARVIS
    },
    // v10: Puter.js (browser-side, free, unlimited)
    // puter.ai.txt2speech() — called in media-client.js
  },
  azure: {
    name: 'Azure TTS',
    quality: 4,
    limit: '500k chars/month',
    hindiSupport: true,
    voices: {
      hindi_female: 'hi-IN-SwaraNeural',
      hindi_male:   'hi-IN-MadhurNeural',
      english:      'en-IN-NeerjaExpressiveNeural',
    },
  },
  fish: {
    name: 'Fish Audio',
    quality: 4,
    limit: 'Free credits',
    hindiSupport: true,
  },
  browser: {
    name: 'Browser SpeechSynthesis',
    quality: 2,
    limit: 'Unlimited',
    hindiSupport: true, // depends on device
  },
};

// ─── DETECT LANGUAGE ─────────────────────────────────────────
function detectLang(text) {
  const hindiRatio = (text.match(/[\u0900-\u097F]/g) || []).length / text.length;
  return hindiRatio > 0.2 ? 'hindi' : 'english';
}

// ─── SARVAM AI TTS (🇮🇳 Best for Hindi/Hinglish) ─────────────
async function sarvamTTS(text, apiKey, gender = 'female') {
  if (!apiKey) throw new Error('No Sarvam key');
  const speaker = gender === 'male'
    ? TTS_PROVIDERS.sarvam.voices.hindi_male
    : TTS_PROVIDERS.sarvam.voices.hindi_female;

  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs:          [text.slice(0, 500)],
      target_language_code: 'hi-IN',
      speaker,
      pitch:           0,
      pace:            1.1,
      loudness:        1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model:           'bulbul:v3',
    }),
  });
  if (!r.ok) throw new Error(`Sarvam TTS: ${r.status}`);
  const d = await r.json();
  const b64 = d.audios?.[0];
  if (!b64) throw new Error('Sarvam: no audio');
  return { audioUrl: `data:audio/wav;base64,${b64}`, provider: 'Sarvam AI', format: 'wav' };
}

// ─── ELEVENLABS TTS ──────────────────────────────────────────
async function elevenLabsTTS(text, apiKey, gender = 'female') {
  if (!apiKey) throw new Error('No ElevenLabs key');
  const voiceId = gender === 'male'
    ? TTS_PROVIDERS.elevenlabs.voices.hindi_male
    : TTS_PROVIDERS.elevenlabs.voices.hindi_female;

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text.slice(0, 500),
      model_id: 'eleven_multilingual_v2', // supports Hindi
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
    }),
  });

  if (!r.ok) throw new Error(`ElevenLabs: ${r.status}`);
  const blob = await r.blob();
  return { audioBlob: blob, audioUrl: URL.createObjectURL(blob), provider: 'ElevenLabs', format: 'mp3' };
}

// ─── GOOGLE CLOUD TTS ────────────────────────────────────────
async function googleTTS(text, apiKey, lang = 'hindi', gender = 'female') {
  if (!apiKey) throw new Error('No Google TTS key');
  const voiceMap = {
    hindi_female: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
    hindi_male:   { languageCode: 'hi-IN', name: 'hi-IN-Neural2-B', ssmlGender: 'MALE'   },
    english:      { languageCode: 'en-IN', name: 'en-IN-Wavenet-A', ssmlGender: 'FEMALE' },
  };
  const voiceKey = lang === 'hindi' ? `hindi_${gender}` : 'english';
  const voice = voiceMap[voiceKey] || voiceMap.hindi_female;

  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: text.slice(0, 5000) },
      voice,
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0, effectsProfileId: ['handset-class-device'] },
    }),
  });

  if (!r.ok) throw new Error(`Google TTS: ${r.status}`);
  const d = await r.json();
  const audioData = `data:audio/mp3;base64,${d.audioContent}`;
  return { audioUrl: audioData, provider: 'Google TTS', format: 'mp3', base64: d.audioContent };
}

// ─── AZURE TTS ───────────────────────────────────────────────
async function azureTTS(text, apiKey, region = 'eastus', lang = 'hindi', gender = 'female') {
  if (!apiKey) throw new Error('No Azure key');
  const voiceName = lang === 'hindi'
    ? (gender === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural')
    : 'en-IN-NeerjaExpressiveNeural';
  const langCode = lang === 'hindi' ? 'hi-IN' : 'en-IN';

  // Get token
  const tokenR = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!tokenR.ok) throw new Error('Azure token failed');
  const token = await tokenR.text();

  const ssml = `<speak version='1.0' xml:lang='${langCode}'><voice xml:lang='${langCode}' xml:gender='${gender === 'male' ? 'Male' : 'Female'}' name='${voiceName}'>${text.slice(0, 3000)}</voice></speak>`;

  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!r.ok) throw new Error(`Azure TTS: ${r.status}`);
  const blob = await r.blob();
  return { audioBlob: blob, audioUrl: URL.createObjectURL(blob), provider: 'Azure TTS', format: 'mp3' };
}

// ─── FISH AUDIO TTS ──────────────────────────────────────────
async function fishAudioTTS(text, apiKey) {
  if (!apiKey) throw new Error('No Fish Audio key');
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text.slice(0, 1000),
      format: 'mp3',
      // Hindi voice reference model
    }),
  });
  if (!r.ok) throw new Error(`Fish Audio: ${r.status}`);
  const blob = await r.blob();
  return { audioBlob: blob, audioUrl: URL.createObjectURL(blob), provider: 'Fish Audio', format: 'mp3' };
}

// ─── MAIN TTS FUNCTION — Smart Chain ─────────────────────────
export async function textToSpeech(text, keys = {}, options = {}) {
  const {
    gender = 'female',
    lang = detectLang(text),
    maxLength = 800,
  } = options;

  const cleanText = text
    .replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[_~`]/g, '').trim()
    .slice(0, maxLength);

  const providers = [
    { name: 'sarvam',     fn: () => sarvamTTS(cleanText, keys.SARVAM_API_KEY, gender),           enabled: !!keys.SARVAM_API_KEY },
    { name: 'elevenlabs', fn: () => elevenLabsTTS(cleanText, keys.ELEVENLABS_API_KEY, gender),   enabled: !!keys.ELEVENLABS_API_KEY },
    { name: 'google',     fn: () => googleTTS(cleanText, keys.GOOGLE_TTS_KEY, lang, gender),     enabled: !!keys.GOOGLE_TTS_KEY },
    { name: 'azure',      fn: () => azureTTS(cleanText, keys.AZURE_TTS_KEY, keys.AZURE_REGION || 'eastus', lang, gender), enabled: !!keys.AZURE_TTS_KEY },
    { name: 'fish',       fn: () => fishAudioTTS(cleanText, keys.FISH_AUDIO_KEY),                enabled: !!keys.FISH_AUDIO_KEY },
  ];

  for (const provider of providers) {
    if (!provider.enabled) continue;
    try {
      const result = await Promise.race([
        provider.fn(),
        new Promise((_, r) => setTimeout(() => r(new Error('TTS timeout')), 12000)),
      ]);
      return { ...result, text: cleanText, lang };
    } catch (e) {
      console.warn(`TTS ${provider.name} failed:`, e.message);
    }
  }

  // ── v10: Pollinations Audio TTS (FREE, no key, URL-based) ────
  // Zero Vercel bandwidth — client plays URL directly
  if (cleanText.length < 300) {
    try {
      const pollinUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanText.slice(0, 280))}?model=openai-audio&voice=nova`;
      return { url: pollinUrl, provider: 'Pollinations Audio', voice: 'nova', useBrowser: false, direct: true };
    } catch {}
  }

  // Browser fallback — always works
  return { provider: 'browser', text: cleanText, lang, browserFallback: true };
}

// ─── BROWSER TTS (client-side) ───────────────────────────────
export function speakBrowser(text, lang = 'hi-IN', rate = 1.0, onEnd = null) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#[\]`~]/g, ' ').slice(0, 500));
  u.lang = lang; u.rate = rate; u.pitch = 1.0;

  // Try to find best available voice
  const voices = window.speechSynthesis.getVoices();
  const hindiVoice = voices.find(v => v.lang.startsWith('hi')) ||
                     voices.find(v => v.lang.startsWith('en-IN'));
  if (hindiVoice) u.voice = hindiVoice;

  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

// Play audio from URL or blob
export function playAudio(audioUrl, onEnd = null) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = () => { if (onEnd) onEnd(); resolve(); };
    audio.onerror = reject;
    audio.play().catch(reject);
  });
}
