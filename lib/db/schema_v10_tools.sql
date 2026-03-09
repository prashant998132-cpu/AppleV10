-- JARVIS v10 — Tools Usage + Enhancements Schema
-- Run in Supabase SQL Editor AFTER schema_v9_gamification.sql
-- ─────────────────────────────────────────────────────────────

-- ─── TOOLS USAGE LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tool_name   TEXT NOT NULL,
  params      JSONB,
  result      JSONB,
  success     BOOLEAN DEFAULT true,
  latency_ms  INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tools_usage_user ON tools_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_usage_tool ON tools_usage(tool_name);

-- ─── FOLLOW-UP CHIPS LOG (for learning) ───────────────────────
CREATE TABLE IF NOT EXISTS followup_clicks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chip_text   TEXT NOT NULL,
  context     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── USER PREFERENCES (v10 additions) ─────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_tts_voice TEXT DEFAULT 'nova',
  ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS follow_up_chips BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS festival_banner BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tools_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_mode TEXT DEFAULT 'auto';

-- ─── TOOLS FAVORITES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_tools (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  added_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tool_name)
);

-- ─── RLS POLICIES ─────────────────────────────────────────────
ALTER TABLE tools_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tools_usage_own" ON tools_usage USING (auth.uid() = user_id);
CREATE POLICY "followup_own"    ON followup_clicks USING (auth.uid() = user_id);
CREATE POLICY "favorites_own"   ON favorite_tools USING (auth.uid() = user_id);

-- Done! Run after schema_v9_gamification.sql
