// app/api/music/route.js — JARVIS v10.1
// Chain: Spotify preview → Jamendo (free) → Suno → YouTube link
// RULE: NEVER proxy audio binary — external URLs ONLY
import { getKeys } from '@/lib/config';
import { getUser } from '@/lib/db/supabase';
import { generateMusic, MUSIC_GENRES } from '@/lib/ai/music';
import { spotify } from '@/lib/integrations';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt, genre = 'background', duration = 30 } = await req.json();
  if (!prompt?.trim()) return Response.json({ error: 'Prompt required' }, { status: 400 });

  const keys = getKeys();

  // 1. Spotify — 30s preview URL (external, zero Vercel bytes)
  if (keys.SPOTIFY_CLIENT_ID && keys.SPOTIFY_CLIENT_SECRET) {
    try {
      const token = await spotify.getAccessToken(keys.SPOTIFY_CLIENT_ID, keys.SPOTIFY_CLIENT_SECRET);
      const tracks = await spotify.searchTrack(prompt, token);
      if (tracks.length > 0) return Response.json({ source: 'spotify', tracks: tracks.slice(0, 3) });
    } catch {}
  }

  // 2. Jamendo — Free licensed music (no key needed)
  try {
    const r = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=3&search=${encodeURIComponent(prompt.slice(0,50))}&audioformat=mp32`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      const tracks = (d.results || []).map(t => ({ name: t.name, artist: t.artist_name, preview: t.audio, url: t.shareurl }));
      if (tracks.length > 0) return Response.json({ source: 'jamendo', tracks });
    }
  } catch {}

  // 3. Suno/Udio links
  try {
    const result = await generateMusic(prompt, keys, { genre, duration });
    return Response.json(result);
  } catch {}

  // 4. YouTube search (always works)
  return Response.json({
    source: 'youtube_search',
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(prompt + ' music')}`,
    note: 'Open YouTube to listen',
  });
}

export async function GET() {
  return Response.json({ genres: Object.keys(MUSIC_GENRES || {}), sources: ['spotify','jamendo','suno','youtube'] });
}
