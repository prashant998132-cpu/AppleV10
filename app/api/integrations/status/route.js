// app/api/integrations/status/route.js
import { getKeys } from '@/lib/config';
import { checkAllIntegrations } from '@/lib/integrations';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const keys = getKeys();
  const status = await checkAllIntegrations(keys);
  return Response.json(status);
}
