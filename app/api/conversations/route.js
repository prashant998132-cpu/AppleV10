// app/api/conversations/route.js
import { getConversations, getMessages, deleteConversation } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const { searchParams } = new URL(req.url);
  const convId = searchParams.get('id');
  if (convId) {
    const messages = await getMessages(convId, 50);
    return Response.json({ messages });
  }
  const conversations = await getConversations(user.id, 30);
  return Response.json({ conversations });
}

export async function DELETE(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const { id } = await req.json();
  await deleteConversation(user.id, id);
  return Response.json({ ok: true });
}
