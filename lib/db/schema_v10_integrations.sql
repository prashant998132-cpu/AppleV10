-- JARVIS v10.1 — Integrations + Smart Router Schema
-- Run AFTER schema_v10_tools.sql
-- ─────────────────────────────────────────────────────────────

-- ─── CONNECTED INTEGRATIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_integrations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name    TEXT NOT NULL,   -- github, vercel, telegram, spotify, notion, etc.
  access_token TEXT,           -- encrypted ideally
  refresh_token TEXT,
  metadata    JSONB,           -- {username, chatId, playlistId, etc.}
  is_active   BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app_name)
);

-- ─── SMART ROUTER USAGE LOG ───────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,   -- groq, gemini, cerebras, etc.
  tokens_used INT DEFAULT 0,
  requests    INT DEFAULT 1,
  date        DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, provider_id, date)
);

-- Increment usage efficiently
CREATE OR REPLACE FUNCTION increment_provider_usage(
  p_user_id UUID, p_provider TEXT, p_tokens INT DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO provider_usage (user_id, provider_id, tokens_used, requests, date)
  VALUES (p_user_id, p_provider, p_tokens, 1, CURRENT_DATE)
  ON CONFLICT (user_id, provider_id, date)
  DO UPDATE SET tokens_used = provider_usage.tokens_used + p_tokens,
                requests    = provider_usage.requests + 1;
END;
$$ LANGUAGE plpgsql;

-- ─── INTEGRATION ACTIONS LOG ──────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_name   TEXT NOT NULL,
  action     TEXT NOT NULL,
  success    BOOLEAN DEFAULT true,
  error_msg  TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_int_logs_user ON integration_logs(user_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_own" ON user_integrations USING (auth.uid() = user_id);
CREATE POLICY "usage_own"        ON provider_usage    USING (auth.uid() = user_id);
CREATE POLICY "int_logs_own"     ON integration_logs  USING (auth.uid() = user_id);

-- Done! Now JARVIS tracks which apps are connected + AI provider usage.
