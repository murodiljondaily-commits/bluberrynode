-- ============================================================
-- Blueberry Node — run this ONCE in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

-- 1) Per-subject adaptive progress (source of truth for roadmap + level brain)
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  current_lesson INTEGER DEFAULT 1,
  current_level TEXT DEFAULT 'A0',
  completed_lessons INTEGER[] DEFAULT '{}',
  skipped_questions JSONB DEFAULT '[]',
  weak_points JSONB DEFAULT '[]',
  total_sessions INTEGER DEFAULT 0,
  avg_accuracy INTEGER DEFAULT 0,
  avg_speaking_score INTEGER DEFAULT 0,
  learning_style TEXT DEFAULT 'unknown',
  last_studied DATE,
  streak INTEGER DEFAULT 0,
  total_berries_earned INTEGER DEFAULT 0,
  ui_language TEXT DEFAULT 'uz',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject)
);
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON student_progress;
CREATE POLICY "Users manage own progress" ON student_progress
  FOR ALL USING (auth.uid() = user_id);

-- 2) Shared lesson content cache (turns ~30s cold generation into <0.5s lookups).
--    Written by the server (service key) only; readable by the server.
CREATE TABLE IF NOT EXISTS lesson_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  subject TEXT,
  topic TEXT,
  level TEXT,
  difficulty TEXT,
  content JSONB NOT NULL,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lesson_cache ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service role (server) bypasses RLS and can read/write.

-- 3) profiles defaults / new columns
ALTER TABLE profiles
  ALTER COLUMN current_lesson SET DEFAULT '{"english":1,"russian":1,"math":1}';
UPDATE profiles SET current_lesson = '{"english":1,"russian":1,"math":1}'
  WHERE current_lesson = '{}' OR current_lesson IS NULL;
UPDATE profiles SET completed_lessons = '{"english":[],"russian":[],"math":[]}'
  WHERE completed_lessons = '{}' OR completed_lessons IS NULL;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_berries_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'uz',
  ADD COLUMN IF NOT EXISTS subjects_data JSONB DEFAULT '{}';

-- 4) session_logs / vocabulary_bank new columns
ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS skipped_questions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS level_at_time TEXT DEFAULT 'A0';
ALTER TABLE vocabulary_bank
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning';

-- 4b) Video watch sessions (drives the escalating Telegram "come back" reminders)
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  telegram_id TEXT,
  ui_lang TEXT DEFAULT 'uz',
  topic TEXT,
  kind TEXT DEFAULT 'lesson',
  duration_sec INTEGER DEFAULT 360,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  stage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'watching',   -- watching | done | expired
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
-- Server (service role) manages these; no public policies needed.

-- 5) Word mastery trigger
CREATE OR REPLACE FUNCTION update_word_mastery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.times_correct >= 5 AND
     (NEW.times_correct::float / NULLIF(NEW.times_seen, 0)) >= 0.8 THEN
    NEW.mastered = true;
    NEW.status = 'mastered';
  ELSIF NEW.skipped_count >= 3 THEN
    NEW.status = 'needs_review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS word_mastery_trigger ON vocabulary_bank;
CREATE TRIGGER word_mastery_trigger
  BEFORE UPDATE ON vocabulary_bank
  FOR EACH ROW EXECUTE FUNCTION update_word_mastery();
