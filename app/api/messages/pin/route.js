// app/api/messages/pin/route.js — Pin/Unpin Messages
import { getPinnedMessages, pinMessage, unpinMessage } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET() {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const pins = await getPinnedMessages(user.id);
  return Response.json({ pins });
}

export async function POST(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const { messageId, content, role, action } = await req.json();
  if (action === 'unpin') { await unpinMessage(user.id, messageId); return Response.json({ unpinned: true }); }
  const result = await pinMessage(user.id, { messageId, content, role });
  return Response.json({ pinned: result });
}
