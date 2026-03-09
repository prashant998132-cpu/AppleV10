// app/api/upload/analyze/route.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — Upload Analyze Endpoint
// ─────────────────────────────────────────────────────────────
// Called AFTER browser has uploaded file directly to Supabase.
// Receives only: { path, publicUrl, type, filename, size, question }
// Fetches file from Supabase CDN, analyzes with Gemini.
// File bytes: Supabase CDN → Vercel (small internal hop, not user upload)
// ═══════════════════════════════════════════════════════════════

import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';
import { saveKnowledge } from '@/lib/db/queries';
import { analyzeDocument, analyzeImage } from '@/lib/ai/brain';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { path, publicUrl, type, filename, size, question = 'Analyze and explain this content' } = await req.json();
  if (!path || !publicUrl) return Response.json({ error: 'path and publicUrl required' }, { status: 400 });

  const keys = getKeys();

  try {
    let analysis, savedKnowledge;

    if (type === 'image') {
      // Fetch from Supabase CDN → base64 for Gemini Vision
      const imgRes = await fetch(publicUrl);
      if (!imgRes.ok) throw new Error('Could not fetch image from storage');
      const buf = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      analysis = await analyzeImage(base64, question, keys.GEMINI_API_KEY);

      savedKnowledge = await saveKnowledge(user.id, {
        title: `Image: ${filename || new Date().toLocaleDateString()}`,
        content: analysis,
        source_type: 'image',
        source_url: publicUrl,
        summary: analysis.slice(0, 200),
        tags: ['image', 'vision', 'uploaded'],
        category: 'general',
      });
    } else if (type === 'pdf') {
      // For PDFs: Gemini analyzes via URL (no byte fetching needed!)
      const pdfText = `PDF file: ${filename} (${Math.round(size/1024)}KB). URL: ${publicUrl}`;
      analysis = await analyzeDocument(pdfText, 'pdf', keys.GEMINI_API_KEY);
      savedKnowledge = await saveKnowledge(user.id, {
        title: analysis.title || filename,
        content: `[PDF: ${publicUrl}]`,
        source_type: 'pdf',
        source_url: publicUrl,
        summary: analysis.summary,
        tags: analysis.tags || ['pdf', 'uploaded'],
        category: analysis.category || 'general',
      });
    } else if (type === 'audio') {
      analysis = { summary: `Audio file uploaded: ${filename}`, title: filename, tags: ['audio'] };
      savedKnowledge = await saveKnowledge(user.id, {
        title: `Audio: ${filename}`,
        content: `[Audio: ${publicUrl}]`,
        source_type: 'audio',
        source_url: publicUrl,
        summary: `Audio file: ${filename}`,
        tags: ['audio', 'uploaded'],
        category: 'general',
      });
    } else {
      const contentRes = await fetch(publicUrl);
      const content = await contentRes.text();
      analysis = await analyzeDocument(content.slice(0, 10000), 'text', keys.GEMINI_API_KEY);
      savedKnowledge = await saveKnowledge(user.id, {
        title: analysis.title || filename,
        content: content.slice(0, 5000),
        source_type: 'document',
        source_url: publicUrl,
        summary: analysis.summary,
        tags: analysis.tags || ['document'],
        category: analysis.category || 'general',
      });
    }

    return Response.json({ analysis, saved: savedKnowledge, publicUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
