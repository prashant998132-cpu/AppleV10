// app/api/memory/decay/route.js — Smart Memory Decay
import { decayOldMemories } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function POST() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const result = await decayOldMemories(user.id);
  return Response.json(result);
}
