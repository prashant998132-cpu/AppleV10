import { tFetch } from '../utils/fetch.js';
// lib/ai/music.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v5 — Music & Song Generation Engine
// Chain: Mubert → HuggingFace MusicGen → Suno link → YouTube Audio
// Indian music styles supported
// ═══════════════════════════════════════════════════════════════

// ─── GENRE PRESETS ────────────────────────────────────────────
export const MUSIC_GENRES = {
  hindi_film:       { mubert: 'bollywood', hf: 'indian classical, film music, melodic', tags: ['Indian', 'Bollywood', 'melodic'] },
  hindi_sad:        { mubert: 'ambient',   hf: 'sad, emotional, Indian instruments, sitar', tags: ['sad', 'emotional'] },
  hindi_happy:      { mubert: 'pop',       hf: 'upbeat, happy, Indian pop, dhol', tags: ['happy', 'upbeat'] },
  motivational:     { mubert: 'electronic',hf: 'motivational, epic, orchestral, powerful', tags: ['motivational', 'epic'] },
  meditation:       { mubert: 'ambient',   hf: 'meditation, peaceful, Indian flute, calm', tags: ['meditation', 'peaceful'] },
  lofi:             { mubert: 'lo-fi',     hf: 'lo-fi hip hop, study, relaxing beats', tags: ['lofi', 'study'] },
  classical_indian: { mubert: 'classical', hf: 'Indian classical raga, sitar, tabla', tags: ['classical', 'raga'] },
  party:            { mubert: 'dance',     hf: 'dance, EDM, high energy, party beats', tags: ['dance', 'party'] },
  folk:             { mubert: 'folk',      hf: 'Indian folk music, dholak, rustic, village', tags: ['folk', 'Indian'] },
  background:       { mubert: 'ambient',   hf: 'background music, neutral, soft', tags: ['background'] },
};

// ─── MUBERT (Royalty-free, reliable API) ──────────────────────
async function musicViaMubert(prompt, apiKey, options = {}) {
  if (!apiKey) throw new Error('No Mubert key');
  const { duration = 30, genre = 'background', format = 'mp3' } = options;
  const g = MUSIC_GENRES[genre] || MUSIC_GENRES.background;

  // Step 1: Get track
  const r = await tFetch('https://api-b2b.mubert.com/v2/RecordTrackTTM', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'RecordTrackTTM',
      params: {
        pat: apiKey,
        duration,
        format,
        intensity: 'medium',
        tags: g.tags,
        prompt: `${prompt}, ${g.mubert}`,
        mode: 'track',
      }
    })
  }, 30000);

  const d = await r.json();
  if (d.error) throw new Error(`Mubert: ${d.error.text}`);
  const url = d.data?.tasks?.[0]?.download_link;
  if (!url) throw new Error('Mubert: no download link');

  return { url, provider: 'Mubert', duration, royaltyFree: true, format: 'mp3' };
}

// ─── HUGGINGFACE MUSICGEN (Free unlimited, slow) ──────────────
async function musicViaHuggingFace(prompt, token, options = {}) {
  const { duration = 10 } = options;
  const endpoint = token
    ? 'https://api-inference.huggingface.co/models/facebook/musicgen-small'
    : null;

  if (!endpoint) throw new Error('No HF token');

  const r = await tFetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: Math.min(duration * 50, 500) },
    })
  }, 60000); // MusicGen can be slow

  if (!r.ok) throw new Error(`HF MusicGen: ${r.status}`);
  const blob = await r.blob();
  if (!blob.type.includes('audio')) throw new Error('HF MusicGen: not audio response');

  const url = URL.createObjectURL(blob);
  return { url, blob, provider: 'HuggingFace MusicGen', format: 'wav' };
}

// ─── ELEVENLABS MUSIC (Sound effects + music) ─────────────────
async function musicViaElevenLabs(prompt, apiKey, duration = 10) {
  if (!apiKey) throw new Error('No ElevenLabs key');

  const r = await tFetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({ text: prompt, duration_seconds: Math.min(duration, 22), prompt_influence: 0.3 })
  }, 30000);

  if (!r.ok) throw new Error(`ElevenLabs music: ${r.status}`);
  const blob = await r.blob();
  return { url: URL.createObjectURL(blob), blob, provider: 'ElevenLabs Sound', format: 'mp3' };
}

// ─── SUNO (Redirect-based — no reliable API) ──────────────────
export function getSunoLink(prompt, genre = 'hindi film') {
  const encoded = encodeURIComponent(`${prompt}, style: ${genre}, instrumental`);
  return {
    provider: 'Suno',
    redirectUrl: `https://suno.com/create?prompt=${encoded}`,
    message: 'Suno ka official API abhi available nahi hai. Link pe jaao aur manually generate karo.',
    manual: true,
  };
}

// ─── UDIO (Redirect-based) ────────────────────────────────────
export function getUdioLink(prompt) {
  return {
    provider: 'Udio',
    redirectUrl: `https://www.udio.com/create?prompt=${encodeURIComponent(prompt)}`,
    message: 'Udio pe jaao aur song generate karo.',
    manual: true,
  };
}

// ─── YOUTUBE AUDIO LIBRARY (Free, legal) ─────────────────────
export function getYouTubeAudioSuggestions(genre, mood) {
  const suggestions = {
    hindi_happy:    ['Bollywood Dance Mix', 'Indian Celebration', 'Festive Beats'],
    motivational:   ['Epic Cinematic', 'Inspiring Corporate', 'Triumphant Orchestral'],
    lofi:           ['Lo-Fi Beats Study', 'Chill Hip Hop', 'Ambient Study'],
    meditation:     ['Indian Meditation', 'Peaceful Piano', 'Nature Sounds India'],
    background:     ['Subtle Corporate', 'Positive Background', 'Uplifting Background'],
  };

  const key = `${genre}_${mood}` in suggestions ? `${genre}_${mood}` : genre in suggestions ? genre : 'background';
  return {
    provider: 'YouTube Audio Library',
    url: `https://studio.youtube.com/channel/music`,
    suggestions: suggestions[key] || suggestions.background,
    message: 'YouTube Audio Library mein yeh tracks free mein available hain',
    free: true,
    royaltyFree: true,
  };
}

// ─── MAIN MUSIC GENERATION ───────────────────────────────────
export async function generateMusic(prompt, keys = {}, options = {}) {
  const { genre = 'background', duration = 30, wantSong = false } = options;

  // Enhance prompt with Indian context
  const genreData = MUSIC_GENRES[genre] || MUSIC_GENRES.background;
  const enhancedPrompt = `${prompt}, ${genreData.hf}, high quality`;

  const chain = [
    { name: 'mubert',      fn: () => musicViaMubert(enhancedPrompt, keys.MUBERT_API_KEY, { duration, genre }), enabled: !!keys.MUBERT_API_KEY },
    { name: 'elevenlabs',  fn: () => musicViaElevenLabs(enhancedPrompt, keys.ELEVENLABS_API_KEY, Math.min(duration, 22)), enabled: !!keys.ELEVENLABS_API_KEY },
    { name: 'huggingface', fn: () => musicViaHuggingFace(enhancedPrompt, keys.HUGGINGFACE_TOKEN, { duration: Math.min(duration, 30) }), enabled: !!keys.HUGGINGFACE_TOKEN },
  ];

  for (const p of chain) {
    if (!p.enabled) continue;
    try {
      const result = await p.fn();
      if (result?.url) return { ...result, prompt: enhancedPrompt, genre };
    } catch (e) {
      console.warn(`Music ${p.name} failed:`, e.message);
    }
  }

  // Fallback — provide links + suggestions
  return {
    status: 'manual_only',
    provider: 'Links Only',
    suno: getSunoLink(prompt, genre),
    udio: getUdioLink(prompt),
    youtube: getYouTubeAudioSuggestions(genre, 'happy'),
    message: 'Free music generate karne ke liye in platforms pe jaao',
  };
}

