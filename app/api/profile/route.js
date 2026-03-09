// app/api/profile/route.js
import { getUser } from '@/lib/db/supabase';
import { getProfile, updateProfile } from '@/lib/db/queries';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await getProfile(user.id);
  return Response.json({ profile: profile || {} });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const allowed = ['name','city','personality','language','bio','timezone'];
  const updates = {};
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
  const profile = await updateProfile(user.id, updates);
  return Response.json({ profile, ok: true });
}
