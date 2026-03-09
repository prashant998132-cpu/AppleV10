-- JARVIS v9 — Gamification + Pinned Messages + Evolution Schema
-- Run in Supabase SQL Editor AFTER previous schema files

-- ─── XP & LEVEL SYSTEM ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp            INTEGER DEFAULT 0,
  level         INTEGER DEFAULT 1,          -- 1=Stranger 2=Acquaintance 3=Friend 4=BestFriend 5=JARVIS_MODE
  streak_days   INTEGER DEFAULT 0,
  last_active   DATE DEFAULT CURRENT_DATE,
  total_msgs    INTEGER DEFAULT 0,
  total_days    INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_self" ON user_xp FOR ALL USING (user_id = auth.uid());

-- ─── BADGES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    TEXT NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_self" ON user_badges FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_badges_user ON user_badges(user_id);

-- ─── PINNED MESSAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pinned_messages (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message_id  TEXT NOT NULL,
  content     TEXT NOT NULL,
  role        TEXT DEFAULT 'assistant',
  pinned_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, message_id)
);
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pins_self" ON pinned_messages FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_pins_user ON pinned_messages(user_id, pinned_at DESC);

-- ─── JARVIS EVOLUTION ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jarvis_evolution (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  insight     TEXT NOT NULL,
  pattern     TEXT,                          -- 'night_owl' | 'morning_person' | 'creative' | 'analytical' etc.
  run_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE jarvis_evolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evolution_self" ON jarvis_evolution FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_evolution_user ON jarvis_evolution(user_id, run_at DESC);

-- ─── PIN LOCK (stored in profiles) ────────────────────────────
-- Add pin_hash column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT false;

-- ─── XP VALUES COMMENT ────────────────────────────────────────
-- Every message sent:    +5 XP
-- Daily first message:   +20 XP
-- Streak bonus:          +streak_days * 2 XP per day
-- Goal completed:        +50 XP
-- Memory saved:          +10 XP
-- Badge earned:          +25 XP
-- Level thresholds: L1=0 L2=200 L3=500 L4=1000 L5=2500
