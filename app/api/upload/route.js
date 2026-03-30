import { getKeys } from '@/lib/config';
// app/api/upload/route.js
import { saveKnowledge } from '@/lib/db/queries';
import { analyzeDocument, analyzeImage } from '@/lib/ai/brain';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };

  const formData = await req.formData();
  const type = formData.get('type');
  const file = formData.get('file');
  const text = formData.get('text');
  const question = formData.get('question') || 'Analyze and explain this content';

  const keys = getKeys();

  try {
    if (type === 'text' || type === 'url') {
      let content = text || '';
      // For URLs — fetch actual content via Jina AI reader (free, no key)
      if (type === 'url' && content.startsWith('http')) {
        try {
          const jinaUrl = `https://r.jina.ai/${content}`;
          const jr = await fetch(jinaUrl, { 
            headers: { 'Accept': 'text/plain' }, 
            signal: AbortSignal.timeout(8000) 
          });
          if (jr.ok) {
            const fetched = await jr.text();
            content = fetched.slice(0, 8000); // max 8k chars
          }
        } catch { /* use URL as-is if fetch fails */ }
      }
      const analysis = await analyzeDocument(content || text, type, keys.GEMINI_API_KEY);
      const saved = await saveKnowledge(user.id, {
        title: analysis.title,
        content,
        source_type: type,
        source_url: type === 'url' ? text : null,
        summary: analysis.summary,
        tags: analysis.tags,
        category: analysis.category,
      });
      return Response.json({ saved, analysis });
    }

    if (type === 'image' && file) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const analysis = await analyzeImage(base64, question, keys.GEMINI_API_KEY);
      const saved = await saveKnowledge(user.id, {
        title: `Image: ${new Date().toLocaleDateString()}`,
        content: analysis,
        source_type: 'image',
        summary: analysis.slice(0, 200),
        tags: ['image', 'vision'],
        category: 'general',
      });
      return Response.json({ saved, analysis });
    }

    if (type === 'pdf' && file) {
      // Extract text from PDF (basic — in production use pdf-parse)
      const text = `PDF uploaded: ${file.name}. Full text extraction requires pdf-parse library.`;
      const analysis = await analyzeDocument(text, 'pdf', keys.GEMINI_API_KEY);
      const saved = await saveKnowledge(user.id, {
        title: analysis.title || file.name,
        content: text,
        source_type: 'pdf',
        summary: analysis.summary,
        tags: analysis.tags,
        category: analysis.category,
      });
      return Response.json({ saved, analysis });
    }

    return Response.json({ error: 'Unknown upload type' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
