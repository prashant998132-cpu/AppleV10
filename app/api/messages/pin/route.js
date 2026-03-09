// app/api/messages/pin/route.js — Pin/Unpin Messages
import { getUser } from '@/lib/db/supabase';
import { getPinnedMessages, pinMessage, unpinMessage } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pins = await getPinnedMessages(user.id);
  return Response.json({ pins });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { messageId, content, role, action } = await req.json();
  if (action === 'unpin') { await unpinMessage(user.id, messageId); return Response.json({ unpinned: true }); }
  const result = await pinMessage(user.id, { messageId, content, role });
  return Response.json({ pinned: result });
}
