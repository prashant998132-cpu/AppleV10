// app/api/memory/route.js
import { getMemories, saveMemory, deleteMemory, exportAllData, deleteAllUserData, saveFeedback } from '@/lib/db/queries';
import { saveLearningPattern } from '@/lib/ai/self-learning';

export const runtime = 'nodejs';

const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const category   = searchParams.get('category');
  const search     = searchParams.get('search');
  const exportData = searchParams.get('export');

  if (exportData === 'true') {
    const data = await exportAllData(user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="jarvis-export.json"' }
    });
  }

  const memories = await getMemories(user.id, { category, search, limit: 100 });
  return Response.json({ memories });
}

export async function POST(req) {
  const body = await req.json();

  if (body.action === 'delete_all') {
    await deleteAllUserData(user.id);
    return Response.json({ success: true });
  }

  // 👍👎 Feedback — self-learning: uses saveMemory (localStorage, no Supabase)
  if (body.action === 'feedback') {
    if (body.rating && body.userMessage && body.botReply) {
      saveLearningPattern(user.id, body.userMessage, body.botReply, body.rating, saveMemory).catch(() => {});
    }
    await saveFeedback(user.id, {
      messageId: body.messageId,
      rating:    body.rating,
      content:   body.content,
    });
    return Response.json({ success: true });
  }

  const memory = await saveMemory(user.id, {
    category:   body.category  || 'general',
    key:        body.key,
    value:      body.value,
    importance: body.importance || 5,
    tags:       body.tags      || [],
  });
  return Response.json({ memory });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await deleteMemory(user.id, id);
  return Response.json({ success: true });
}
