// app/api/integrations/status/route.js
import { getKeys } from '@/lib/config';
import { getUser } from '@/lib/db/supabase';
import { checkAllIntegrations } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = getKeys();
  const status = await checkAllIntegrations(keys);
  return Response.json(status);
}
