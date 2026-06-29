-- ============================================================
-- Blueberry Node — run this in the Supabase SQL Editor.
-- Idempotent + failure-tolerant: risky statements are wrapped so one bad
-- line can't roll back the whole script (the editor runs it as one transaction).
-- ============================================================

-- 1) CRITICAL NEW TABLES (these power the new features) ----------------

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

CREATE TABLE IF NOT EXISTS lesson_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  subject TEXT, topic TEXT, level TEXT, difficulty TEXT,
  content JSONB NOT NULL,
  hits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lesson_cache ENABLE ROW LEVEL SECURITY;

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
  status TEXT DEFAULT 'watching',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- 2) Optional column additions (safe — IF NOT EXISTS) ------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_berries_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'uz',
  ADD COLUMN IF NOT EXISTS subjects_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS skipped_questions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS level_at_time TEXT DEFAULT 'A0';
ALTER TABLE vocabulary_bank
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning';

-- 3) Risky normalizations — wrapped so a type mismatch can't abort the script.
DO $$ BEGIN
  EXECUTE $sql$ ALTER TABLE profiles ALTER COLUMN current_lesson SET DEFAULT '{"english":1,"russian":1,"math":1}' $sql$;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip current_lesson default: %', SQLERRM; END $$;

DO $$ BEGIN
  UPDATE profiles SET current_lesson = '{"english":1,"russian":1,"math":1}'
   WHERE current_lesson IS NULL OR current_lesson::text = '{}';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip current_lesson backfill: %', SQLERRM; END $$;

DO $$ BEGIN
  UPDATE profiles SET completed_lessons = '{"english":[],"russian":[],"math":[]}'
   WHERE completed_lessons IS NULL OR completed_lessons::text = '{}';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip completed_lessons backfill: %', SQLERRM; END $$;

-- 4) Word mastery trigger — wrapped (depends on vocabulary_bank columns).
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION update_word_mastery()
  RETURNS TRIGGER AS $fn$
  BEGIN
    IF NEW.times_correct >= 5 AND (NEW.times_correct::float / NULLIF(NEW.times_seen, 0)) >= 0.8 THEN
      NEW.mastered = true; NEW.status = 'mastered';
    ELSIF NEW.skipped_count >= 3 THEN
      NEW.status = 'needs_review';
    END IF;
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;
  DROP TRIGGER IF EXISTS word_mastery_trigger ON vocabulary_bank;
  CREATE TRIGGER word_mastery_trigger BEFORE UPDATE ON vocabulary_bank
    FOR EACH ROW EXECUTE FUNCTION update_word_mastery();
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip mastery trigger: %', SQLERRM; END $$;

-- 5) Tell PostgREST to pick up the new tables/columns immediately.
NOTIFY pgrst, 'reload schema';
