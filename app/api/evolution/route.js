// app/api/evolution/route.js — JARVIS 24h Evolution Insight
import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';
import { getAnalyticsData, getEvolutionInsights, saveEvolutionInsight } from '@/lib/db/queries';
import { generateEvolutionInsight } from '@/lib/ai/brain';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const insights = await getEvolutionInsights(user.id, 5);
  return Response.json({ insights });
}

export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = getKeys();
  try {
    const analytics = await getAnalyticsData(user.id);
    const result = await generateEvolutionInsight(analytics, analytics?.totalMessages || 0, keys.GEMINI_API_KEY);
    const saved = await saveEvolutionInsight(user.id, result);
    return Response.json({ ...result, saved });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
