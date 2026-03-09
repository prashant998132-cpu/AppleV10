import { getKeys } from '@/lib/config';
// app/api/goals/route.js
import { getUser } from '@/lib/db/supabase';
import { getGoals, createGoal, updateGoal } from '@/lib/db/queries';
import { decomposeGoal, buildMemoryContext } from '@/lib/ai/brain';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const goals = await getGoals(user.id, searchParams.get('status'));
  return Response.json({ goals });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (body.action === 'decompose') {
    const ctx = await buildMemoryContext(user.id);
    const plan = await decomposeGoal(body.goal, ctx, getKeys().GEMINI_API_KEY);
    // Auto-create goal from plan
    const goal = await createGoal(user.id, {
      title: plan.title,
      description: body.goal,
      category: plan.category,
      milestones: JSON.stringify(plan.milestones),
      tags: plan.keywords || [],
    });
    return Response.json({ goal, plan });
  }

  const goal = await createGoal(user.id, body);
  return Response.json({ goal });
}

export async function PATCH(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...updates } = await req.json();
  const goal = await updateGoal(user.id, id, updates);
  return Response.json({ goal });
}
