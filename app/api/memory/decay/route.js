// app/api/memory/decay/route.js — Smart Memory Decay
import { decayOldMemories } from '@/lib/db/queries';

export async function POST() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  if (!user) { user = { id: 'local-user-jarvis', email: 'local@jarvis.app' }; } if (false) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await decayOldMemories(user.id);
  return Response.json(result);
}
