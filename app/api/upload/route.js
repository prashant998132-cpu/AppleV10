import { getKeys } from '@/lib/config';
// app/api/upload/route.js
import { getUser } from '@/lib/db/supabase';
import { saveKnowledge } from '@/lib/db/queries';
import { analyzeDocument, analyzeImage } from '@/lib/ai/brain';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const type = formData.get('type');
  const file = formData.get('file');
  const text = formData.get('text');
  const question = formData.get('question') || 'Analyze and explain this content';

  const keys = getKeys();

  try {
    if (type === 'text' || type === 'url') {
      const content = text || '';
      const analysis = await analyzeDocument(content, type, keys.GEMINI_API_KEY);
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
