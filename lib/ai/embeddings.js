// lib/ai/embeddings.js
// Semantic memory search using Gemini embeddings (FREE — 1500 RPM)
// Fallback: HuggingFace all-MiniLM-L6-v2 (also free)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const HF_EMBED_URL     = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

// Generate embedding vector for a text
export async function getEmbedding(text, geminiKey, hfToken = null) {
  // Truncate to reasonable length
  const input = text.slice(0, 1500).trim();

  // Try Gemini first (768 dims, higher quality)
  if (geminiKey) {
    try {
      const r = await fetch(`${GEMINI_EMBED_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: input }] },
          taskType: 'SEMANTIC_SIMILARITY',
        }),
      });
      const d = await r.json();
      if (d.embedding?.values) return { vector: d.embedding.values, dims: 768, model: 'gemini' };
    } catch {}
  }

  // Fallback: HuggingFace (384 dims, still good)
  if (hfToken) {
    try {
      const r = await fetch(HF_EMBED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hfToken}` },
        body: JSON.stringify({ inputs: input }),
      });
      const d = await r.json();
      if (Array.isArray(d) && d[0]) return { vector: d[0], dims: 384, model: 'hf-minilm' };
    } catch {}
  }

  return null; // No embedding available — fall back to keyword search
}

// Semantic search: find memories most similar to query
export async function semanticMemorySearch(userId, query, geminiKey, hfToken, supabase, limit = 15) {
  try {
    const emb = await getEmbedding(query, geminiKey, hfToken);
    if (!emb) return null; // Caller will fall back to keyword search

    // Call the match_memories RPC function in Supabase
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding:  emb.vector,
      match_user_id:    userId,
      match_count:      limit,
      match_threshold:  0.40,
    });

    if (error || !data?.length) return null;
    return data; // [{id, key, value, category, similarity}]
  } catch {
    return null;
  }
}

// Store embedding when saving a memory
export async function embedAndStore(memoryId, text, geminiKey, hfToken, supabase) {
  try {
    const emb = await getEmbedding(text, geminiKey, hfToken);
    if (!emb) return;
    await supabase
      .from('memories')
      .update({ embedding: emb.vector })
      .eq('id', memoryId);
  } catch {}
}
