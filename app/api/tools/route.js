// app/api/tools/route.js — JARVIS v10 Tools API
// ═══════════════════════════════════════════════════════════════
// Executes any of the 58 tools
// ═══════════════════════════════════════════════════════════════
import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';
import { executeTool, TOOLS } from '@/lib/tools';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // Return tool catalog
  const catalog = Object.entries(TOOLS).map(([id, t]) => ({ id, ...t }));
  return Response.json({ total: catalog.length, tools: catalog });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tool, params = {} } = await req.json();
  if (!tool) return Response.json({ error: 'tool name required' }, { status: 400 });

  const keys = getKeys();
  const start = Date.now();

  const result = await executeTool(tool, params, keys);
  return Response.json({ tool, result, latency_ms: Date.now() - start });
}
