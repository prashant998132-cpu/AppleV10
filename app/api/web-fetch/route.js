// app/api/web-fetch/route.js — JARVIS Web Content Fetcher
// Proxy for fetching URLs server-side (avoids CORS issues)
export const runtime = 'nodejs';
import { readUrl, webSearch } from '@/lib/ai/web-agent';

export async function POST(req) {
  try {
    const { url, query, type = 'url' } = await req.json();
    
    if (type === 'search' && query) {
      const result = await webSearch(query, 3);
      return Response.json({ ok: true, ...result });
    }
    
    if (type === 'url' && url) {
      if (!url.startsWith('http')) {
        return Response.json({ error: 'Invalid URL' }, { status: 400 });
      }
      // Block internal/private URLs
      if (/localhost|127\.|192\.168\.|10\.\d|::1/.test(url)) {
        return Response.json({ error: 'Internal URLs not allowed' }, { status: 403 });
      }
      const result = await readUrl(url, 5000);
      return Response.json({ ok: true, ...result });
    }
    
    return Response.json({ error: 'Provide url or query' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
