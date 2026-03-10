// app/api/chat/title/route.js — Auto-generate smart conversation title
// Uses lightweight model. Fallback: first 8 words of user message

import { getUser } from '@/lib/db/supabase';
import { updateConversation } from '@/lib/db/queries';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId, firstMessage, firstReply } = await req.json();
    if (!conversationId || !firstMessage) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const keys = getKeys();

    // ── Generate title ───────────────────────────────────────────
    let title = fallbackTitle(firstMessage); // instant fallback

    try {
      const prompt = `Generate a very short (3-6 words), descriptive title for this conversation.
User said: "${firstMessage.slice(0, 200)}"
${firstReply ? `AI replied: "${firstReply.slice(0, 100)}"` : ''}

Rules:
- 3-6 words max
- No quotes, no punctuation at end
- Hindi/English/Hinglish (match user's language)
- Descriptive, not generic (avoid "AI Chat" or "Conversation")
- Examples: "Delhi ka mausam", "Python code debug", "Career advice needed", "Spotify playlist banana"

Reply with ONLY the title, nothing else.`;

      // Try Groq first (fastest)
      if (keys.GROQ_API_KEY) {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.GROQ_API_KEY}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant', // fastest, cheapest
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 20,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(4000), // 4s timeout
        });
        if (r.ok) {
          const d = await r.json();
          const t = d.choices?.[0]?.message?.content?.trim();
          if (t && t.length > 2 && t.length < 60) title = t;
        }
      }
      // Try Pollinations as free fallback (no key needed)
      else {
        const r = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai',
            seed: 42,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
          const t = (await r.text()).trim();
          if (t && t.length > 2 && t.length < 60) title = t;
        }
      }
    } catch {
      // Use fallback title — silent fail
    }

    // Save to DB
    await updateConversation(user.id, conversationId, { title }).catch(() => {});

    return Response.json({ title, conversationId });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ── Fallback: smart extraction from message ──────────────────────
function fallbackTitle(msg) {
  const clean = msg.trim().replace(/[*_#`]/g, '');
  const words = clean.split(/\s+/).slice(0, 7).join(' ');
  return words.length > 50 ? words.slice(0, 47) + '...' : words || 'Naya Chat';
}
