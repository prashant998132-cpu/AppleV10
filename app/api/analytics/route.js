// app/api/analytics/route.js
import { getKeys } from '@/lib/config';
import { getUser } from '@/lib/db/supabase';
import { getAnalyticsData, getDailyLogs, getHabits, getGoals, saveDailyLog, getLLMLogs } from '@/lib/db/queries';
import { analyzeMoodPatterns, generateWeeklyReport, generateProactiveSuggestions, predictProductivity, buildMemoryContext } from '@/lib/ai/brain';


export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'dashboard';

  try {
    const data = await getAnalyticsData(user.id);

    if (type === 'full') {
      // Fixed: parallel fetch — no more undefined getMemoryContext
      const [moodAnalysis, memCtx, llmLogs] = await Promise.all([
        analyzeMoodPatterns(data.logs, getKeys().GEMINI_API_KEY).catch(() => null),
        buildMemoryContext(user.id).catch(() => ''),
        getLLMLogs(user.id, 7).catch(() => []),
      ]);
      const proactive = await generateProactiveSuggestions(user.id, data, memCtx, getKeys().GEMINI_API_KEY).catch(() => []);
      const prediction = await predictProductivity(data.logs, 'Regular work day', getKeys().GEMINI_API_KEY).catch(() => null);

      // LLM stats summary
      const llmStats = llmLogs.length ? {
        totalRequests: llmLogs.length,
        avgLatencyMs: Math.round(llmLogs.reduce((s,l) => s + (l.latency_ms||0), 0) / llmLogs.length),
        totalTokens: llmLogs.reduce((s,l) => s + (l.tokens||0), 0),
        modelBreakdown: llmLogs.reduce((acc, l) => { acc[l.model] = (acc[l.model]||0)+1; return acc; }, {}),
      } : null;

      return Response.json({ ...data, moodAnalysis, proactive, prediction, llmStats, llmLogs: llmLogs.slice(0,50) });
    }

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'log_day') {
      const log = await saveDailyLog(user.id, {
        log_date: body.date || new Date().toISOString().split('T')[0],
        mood_score: body.mood,
        energy: body.energy,
        productivity: body.productivity,
        focus_hours: body.focusHours,
        notes: body.notes,
      });
      return Response.json({ log });
    }

    if (action === 'weekly_report') {
      const data = await getAnalyticsData(user.id);
      const memCtx = await buildMemoryContext(user.id);
      const report = await generateWeeklyReport(data, memCtx, getKeys().GEMINI_API_KEY);
      return Response.json({ report });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

