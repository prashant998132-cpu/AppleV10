// app/api/conversations/route.js
import { getUser } from '@/lib/db/supabase';
import { getConversations, getMessages, deleteConversation } from '@/lib/db/queries';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await deleteConversation(user.id, id);
  return Response.json({ ok: true });
}
