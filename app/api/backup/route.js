// app/api/backup/route.js — Full data export + import
import { exportAllData, saveMemory, createGoal, saveKnowledge } from '@/lib/db/queries';
export const runtime = 'nodejs';
const USER = { id: 'local-user-jarvis' };

export async function GET() {
  try {
    const data = await exportAllData(USER.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="jarvis-backup-${new Date().toISOString().slice(0,10)}.json"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action, data } = await req.json();
    if (action !== 'restore' || !data) return Response.json({ error: 'Invalid' }, { status: 400 });
    const results = { memories: 0, goals: 0, knowledge: 0 };
    if (Array.isArray(data.memories)) {
      for (const m of data.memories.slice(0, 500)) {
        if (m.key && m.value) { await saveMemory(USER.id, { key: m.key, value: m.value, category: m.category||'general', importance: m.importance||5 }); results.memories++; }
      }
    }
    if (Array.isArray(data.goals)) {
      for (const g of data.goals.slice(0, 100)) {
        if (g.title && g.status !== 'deleted') { await createGoal(USER.id, { title: g.title, category: g.category, progress: g.progress||0, status:'active' }); results.goals++; }
      }
    }
    if (Array.isArray(data.knowledge)) {
      for (const k of data.knowledge.slice(0, 100)) {
        if (k.title && k.content) { await saveKnowledge(USER.id, { title: k.title, content: k.content, type: k.type||'note' }); results.knowledge++; }
      }
    }
    return Response.json({ success: true, restored: results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
