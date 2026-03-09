// lib/ai/edge-tts.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v5 — Edge TTS (Microsoft, Browser-based, No API Key)
// Best free Hindi voices — ElevenLabs se better lagta hai!
// Works via edge-tts npm package on server OR browser WebSpeech
// ═══════════════════════════════════════════════════════════════

// ─── EDGE TTS VOICES (Best for Hindi) ────────────────────────
export const EDGE_VOICES = {
  // Hindi voices — top picks
  hindi_female_1: { name: 'hi-IN-SwaraNeural',   lang: 'hi-IN', gender: 'Female', quality: 'Neural', best: true },
  hindi_female_2: { name: 'hi-IN-AnanyaNeural',  lang: 'hi-IN', gender: 'Female', quality: 'Neural' },
  hindi_male_1:   { name: 'hi-IN-MadhurNeural',  lang: 'hi-IN', gender: 'Male',   quality: 'Neural', best: true },
  hindi_male_2:   { name: 'hi-IN-RehaanNeural',  lang: 'hi-IN', gender: 'Male',   quality: 'Neural' },

  // English India voices
  en_in_female:   { name: 'en-IN-NeerjaNeural',  lang: 'en-IN', gender: 'Female', quality: 'Neural' },
  en_in_male:     { name: 'en-IN-PrabhatNeural', lang: 'en-IN', gender: 'Male',   quality: 'Neural' },

  // Multilingual — good for Hinglish
  multilingual_f: { name: 'en-US-AvaMultilingualNeural', lang: 'en-US', gender: 'Female', quality: 'Multilingual' },
  multilingual_m: { name: 'en-US-AndrewMultilingualNeural', lang: 'en-US', gender: 'Male', quality: 'Multilingual' },
};

// ─── EDGE TTS URL BUILDER ────────────────────────────────────
// Edge TTS works by calling Microsoft's unofficial endpoint
// This is the same endpoint Edge browser uses internally
function buildEdgeTTSUrl() {
  const timestamp = Date.now();
  return `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4e31CC0242A863&ConnectionId=${generateUUID()}`;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── BROWSER WEB SPEECH API (Enhanced) ───────────────────────
// This is the always-available fallback — but with better configuration
export function getBestBrowserVoice(gender = 'female', lang = 'hi') {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const priority = [
    // Best: Microsoft Edge neural voices (if Edge browser)
    v => v.name.includes('Swara') && v.lang.startsWith('hi'),
    v => v.name.includes('Madhur') && v.lang.startsWith('hi'),
    v => v.name.includes('Microsoft') && v.lang.startsWith('hi') && gender === 'female' && v.name.includes('Female'),
    v => v.name.includes('Microsoft') && v.lang.startsWith('hi') && gender === 'male' && v.name.includes('Male'),
    // Hindi voices any browser
    v => v.lang === 'hi-IN' && gender === 'female' && v.name.toLowerCase().includes('female'),
    v => v.lang === 'hi-IN' && gender === 'male' && v.name.toLowerCase().includes('male'),
    v => v.lang === 'hi-IN',
    v => v.lang.startsWith('hi'),
    // English India fallback
    v => v.lang === 'en-IN' && gender === 'female',
    v => v.lang === 'en-IN',
    // Last resort
    v => v.lang.startsWith('en'),
  ];

  for (const matcher of priority) {
    const match = voices.find(matcher);
    if (match) return match;
  }
  return voices[0];
}

// ─── ENHANCED BROWSER TTS ────────────────────────────────────
export function speakWithBrowserTTS(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) { reject(new Error('No TTS')); return; }
    window.speechSynthesis.cancel();

    const { gender = 'female', rate = 0.95, pitch = 1.0, lang = 'hi-IN', onStart, onEnd, onError } = options;

    const cleanText = text
      .replace(/[*_#`~[\]{}|]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = lang; u.rate = rate; u.pitch = pitch;

    // Load voices and set best one
    const setVoice = () => {
      const voice = getBestBrowserVoice(gender, lang.split('-')[0]);
      if (voice) u.voice = voice;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    u.onstart = () => onStart?.();
    u.onend   = () => { onEnd?.(); resolve(); };
    u.onerror = (e) => { onError?.(e); reject(e); };

    window.speechSynthesis.speak(u);

    // Chromium bug fix — long text stops after 15s
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);

    u.onend = () => { clearInterval(keepAlive); onEnd?.(); resolve(); };
  });
}

// ─── SPLIT TEXT FOR TTS (better for long text) ───────────────
export function splitForTTS(text, maxChars = 200) {
  const clean = text.replace(/[*_#`~[\]]/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?।]+[.!?।]*/g) || [clean];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + s).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += ' ' + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// ─── SPEAK SEQUENCE (chunked, with pauses) ───────────────────
export async function speakSequence(text, options = {}, onChunkEnd) {
  const chunks = splitForTTS(text, 180);
  for (let i = 0; i < chunks.length; i++) {
    await speakWithBrowserTTS(chunks[i], options);
    if (onChunkEnd) onChunkEnd(i, chunks.length);
    if (i < chunks.length - 1) await sleep(100);
  }
}

// ─── TTS PROVIDER SELECTOR ───────────────────────────────────
export function selectTTSProvider(keys, context = 'normal') {
  // Smart Mode — context based
  if (context === 'short' || context === 'quick') {
    // Short response → browser TTS (instant)
    return { provider: 'browser', reason: 'Quick response' };
  }

  if (context === 'important' || context === 'long') {
    // Important/long → best cloud TTS
    if (keys.ELEVENLABS_API_KEY) return { provider: 'elevenlabs', reason: 'High quality' };
    if (keys.GOOGLE_TTS_KEY) return { provider: 'google', reason: 'Neural quality' };
    if (keys.AZURE_TTS_KEY) return { provider: 'azure', reason: 'Neural quality' };
  }

  // Default chain
  if (keys.ELEVENLABS_API_KEY) return { provider: 'elevenlabs', reason: 'Best quality' };
  if (keys.GOOGLE_TTS_KEY) return { provider: 'google', reason: 'Neural Hindi' };
  if (keys.AZURE_TTS_KEY) return { provider: 'azure', reason: 'Edge Neural' };
  if (keys.FISH_AUDIO_KEY) return { provider: 'fish', reason: 'Free credits' };
  return { provider: 'browser', reason: 'Always available' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
