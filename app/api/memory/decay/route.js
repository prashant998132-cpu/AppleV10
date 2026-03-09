// app/api/memory/decay/route.js — Smart Memory Decay
import { getUser } from '@/lib/db/supabase';
import { decayOldMemories } from '@/lib/db/queries';

export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await decayOldMemories(user.id);
  return Response.json(result);
}
