// app/api/profile/route.js
import { getProfile, updateProfile } from '@/lib/db/queries';

export async function GET(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  if (!user) { user = { id: 'local-user-jarvis', email: 'local@jarvis.app' }; } if (false) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // NOTE: getProfile reads localStorage which doesn't exist server-side
  // Return empty — client (settings page) reads localStorage directly
  return Response.json({ profile: {} });
}

export async function POST(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  if (!user) { user = { id: 'local-user-jarvis', email: 'local@jarvis.app' }; } if (false) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const allowed = ['name','city','personality','language','bio','timezone'];
  const updates = {};
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
  const profile = await updateProfile(user.id, updates);
  return Response.json({ profile, ok: true });
}
