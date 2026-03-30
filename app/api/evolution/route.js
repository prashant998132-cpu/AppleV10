// app/api/evolution/route.js — JARVIS 24h Evolution Insight
import { getKeys } from '@/lib/config';
import { getAnalyticsData, getEvolutionInsights, saveEvolutionInsight } from '@/lib/db/queries';
import { generateEvolutionInsight } from '@/lib/ai/brain';

export const runtime = 'nodejs';

export async function GET() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const insights = await getEvolutionInsights(user.id, 5);
  return Response.json({ insights });
}

export async function POST() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
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
