-- ═══════════════════════════════════════════════════════════
-- JARVIS v6 Migration — Run this in Supabase SQL Editor
-- One-time setup. Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Enable pgvector extension (free on Supabase) ────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. Add embedding column to memories table ─────────────
-- Gemini embeddings = 768 dims | HuggingFace MiniLM = 384 dims
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(768);

-- ── 3. HNSW index for fast cosine similarity search ────────
-- HNSW is better than IVFFlat for small-medium datasets
CREATE INDEX IF NOT EXISTS memories_embedding_hnsw_idx
  ON memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── 4. Semantic search function ───────────────────────────
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_user_id   UUID,
  match_count     INT     DEFAULT 15,
  match_threshold FLOAT   DEFAULT 0.40
)
RETURNS TABLE(
  id          UUID,
  key         TEXT,
  value       TEXT,
  category    TEXT,
  importance  INT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id, key, value, category, importance,
    1 - (embedding <=> query_embedding) AS similarity
  FROM memories
  WHERE
    user_id = match_user_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── 5. Add custom_instructions + bio to profiles ──────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'hinglish';

-- ── 6. LLM usage logging table ───────────────────────────
CREATE TABLE IF NOT EXISTS llm_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE,
  model        TEXT,
  mode         TEXT,
  tokens_in    INT  DEFAULT 0,
  tokens_out   INT  DEFAULT 0,
  latency_ms   INT  DEFAULT 0,
  success      BOOLEAN DEFAULT TRUE,
  react_steps  INT  DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS llm_logs_user_idx ON llm_logs(user_id, created_at DESC);
ALTER TABLE llm_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_llm_logs" ON llm_logs FOR ALL USING (auth.uid() = user_id);

-- ── 7. Feedback table for quality loop ───────────────────
CREATE TABLE IF NOT EXISTS message_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  message_id  UUID,
  rating      INT CHECK (rating IN (-1, 1)),
  model_used  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_feedback" ON message_feedback FOR ALL USING (auth.uid() = user_id);

-- ── 8. Verify migration ───────────────────────────────────
SELECT
  'memories.embedding'      AS check_item,
  COUNT(*) > 0              AS column_exists
FROM information_schema.columns
WHERE table_name = 'memories' AND column_name = 'embedding'
UNION ALL
SELECT
  'pgvector installed',
  COUNT(*) > 0
FROM pg_extension WHERE extname = 'vector';
