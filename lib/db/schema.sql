-- ═══════════════════════════════════════════════════════════
-- JARVIS v5 — Supabase Schema
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ─── USER PROFILES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT,
  city        TEXT DEFAULT 'India',
  timezone    TEXT DEFAULT 'Asia/Kolkata',
  language    TEXT DEFAULT 'hinglish',
  personality TEXT DEFAULT 'normal', -- normal|motivational|fun|sarcastic
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── MEMORIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
    'profile','goal','daily_log','study','emotion',
    'preference','relationship','performance','general'
  )),
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  importance  INT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  tags        TEXT[] DEFAULT '{}',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_category ON memories(user_id, category);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_search ON memories USING GIN(to_tsvector('english', key || ' ' || value));

-- ─── GOALS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'general',
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  target_date DATE,
  progress    INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  milestones  JSONB DEFAULT '[]',
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_goals_user ON goals(user_id, status);

-- ─── CONVERSATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT DEFAULT 'Naya Chat',
  summary     TEXT,
  message_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}', -- agents_used, timing, image_url, workflow, etc.
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- ─── DAILY LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score  INT CHECK (mood_score BETWEEN 1 AND 10),
  energy      INT CHECK (energy BETWEEN 1 AND 10),
  productivity INT CHECK (productivity BETWEEN 1 AND 10),
  focus_hours DECIMAL(4,2) DEFAULT 0,
  notes       TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);
CREATE INDEX idx_logs_user_date ON daily_logs(user_id, log_date DESC);

-- ─── HABITS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  frequency   TEXT DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly')),
  target_days INT DEFAULT 7,
  streak      INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  total_done  INT DEFAULT 0,
  last_done   DATE,
  color       TEXT DEFAULT '#1A56DB',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_habits_user ON habits(user_id, is_active);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id   UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  done_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, done_date)
);

-- ─── KNOWLEDGE BASE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_items (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual','pdf','image','voice','url','screenshot')),
  source_url  TEXT,
  summary     TEXT,
  tags        TEXT[] DEFAULT '{}',
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_knowledge_user ON knowledge_items(user_id);
CREATE INDEX idx_knowledge_search ON knowledge_items USING GIN(to_tsvector('english', title || ' ' || content));

-- ─── AUTOMATION TASKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('reminder','scheduled_report','goal_check','habit_check','custom')),
  schedule    TEXT, -- cron-like: daily|weekly|monday etc.
  trigger_at  TIME,
  payload     JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  last_run    TIMESTAMPTZ,
  next_run    TIMESTAMPTZ,
  run_count   INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── ANALYTICS CACHE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_cache (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,
  period      TEXT NOT NULL, -- 'week_2024-W01', 'month_2024-01'
  data        JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_type, period)
);

-- ─── LINKED RESOURCES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url         TEXT NOT NULL,
  title       TEXT,
  category    TEXT DEFAULT 'Other',
  tags        TEXT[] DEFAULT '{}',
  click_count INT DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE links            ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['memories','goals','conversations','messages','daily_logs','habits','habit_logs','knowledge_items','automations','analytics_cache','links']
  LOOP
    EXECUTE format('CREATE POLICY "%s_self" ON %s FOR ALL USING (user_id = auth.uid())', t, t);
  END LOOP;
END $$;

CREATE POLICY "profiles_self" ON profiles FOR ALL USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name) VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','memories','goals','conversations','knowledge_items']
  LOOP
    EXECUTE format('CREATE TRIGGER %s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;
-- ═══════════════════════════════════════════════════════════════
-- JARVIS v5 — Additional Schema (run after main schema.sql)
-- OAuth tokens table for social media connections
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN ('google','meta','linkedin')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  meta          JSONB DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oauth_tokens_self" ON oauth_tokens FOR ALL USING (user_id = auth.uid());

-- Index for fast lookup
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id, platform);

-- Merged from schema_v5_additions.sql on Thu Mar  5 01:10:54 UTC 2026
