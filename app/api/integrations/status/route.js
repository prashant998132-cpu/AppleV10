// app/api/integrations/status/route.js
import { getKeys } from '@/lib/config';
import { checkAllIntegrations } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  if (!user) { user = { id: 'local-user-jarvis', email: 'local@jarvis.app' }; } if (false) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = getKeys();
  const status = await checkAllIntegrations(keys);
  return Response.json(status);
}
