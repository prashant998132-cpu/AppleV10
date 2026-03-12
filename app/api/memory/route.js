// app/api/memory/route.js
import { getUser } from '@/lib/db/supabase';
import { getMemories, saveMemory, deleteMemory, exportAllData, deleteAllUserData, saveFeedback } from '@/lib/db/queries';
import { saveLearningPattern } from '@/lib/ai/self-learning';
import { getSupabaseServer } from '@/lib/db/supabase';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search   = searchParams.get('search');
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
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (body.action === 'delete_all') {
    await deleteAllUserData(user.id);
    return Response.json({ success: true });
  }

  // 👍👎 Feedback from chat Bubble component
  if (body.action === 'feedback') {
    // Self-learning: analyze pattern and save
    if (body.rating && body.userMessage && body.botReply) {
      const db = await getSupabaseServer();
      saveLearningPattern(user.id, body.userMessage, body.botReply, body.rating, db).catch(() => {});
    }
    await saveFeedback(user.id, {
      messageId: body.messageId,
      rating: body.rating,       // 'up' | 'down'
      content: body.content,
    });
    return Response.json({ success: true });
  }

  const memory = await saveMemory(user.id, {
    category: body.category || 'general',
    key: body.key,
    value: body.value,
    importance: body.importance || 5,
    tags: body.tags || [],
  });
  return Response.json({ memory });
}

export async function DELETE(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await deleteMemory(user.id, id);
  return Response.json({ success: true });
}
