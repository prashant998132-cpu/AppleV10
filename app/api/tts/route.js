// app/api/tts/route.js — Text to Speech (placeholder)
export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ error: 'TTS not configured' }, { status: 501 });
}
