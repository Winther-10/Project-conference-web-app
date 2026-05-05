-- ============================================================
-- IC-Sci 2025 — Supabase Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add 'role' column to users table (if not exists)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'author'
  CHECK (role IN ('author', 'reviewer', 'admin'));

-- 2. Add other missing columns used by the app
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS academic_position TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 3. Set the admin user (use the ID from the create-admin script output)
UPDATE users
  SET role = 'admin'
  WHERE user_id = '27d06c15-c150-474e-b50e-b54c22cadb06';

-- 4. Create papers table if it doesn't exist
CREATE TABLE IF NOT EXISTS papers (
  paper_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_th TEXT,
  title_en TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT[],
  track TEXT,
  presentation_type TEXT DEFAULT 'oral',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft','submitted','under_review','revision_required','accepted','rejected','published')),
  has_paid BOOLEAN DEFAULT FALSE,
  file_url TEXT,
  payment_slip_url TEXT,
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending','paid','refunded')),
  reviewers_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create sessions table for schedule
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  day_id TEXT NOT NULL DEFAULT 'day1',
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  session_code TEXT,
  track TEXT,
  format TEXT DEFAULT 'Onsite',
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create awards table
CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  article_id TEXT,
  type TEXT DEFAULT 'oral',
  level TEXT DEFAULT 'good'
    CHECK (level IN ('excellent','distinguished','good')),
  title TEXT,
  university TEXT,
  track TEXT,
  authors JSONB,
  abstract TEXT,
  committee_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create downloads table for templates/manuals
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title_en TEXT NOT NULL,
  title_th TEXT,
  file_type TEXT DEFAULT 'pdf',
  filename TEXT,
  file_url TEXT,
  size TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create conference_statistics table
CREATE TABLE IF NOT EXISTS conference_statistics (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  participants_count INTEGER DEFAULT 0,
  participants_delta INTEGER DEFAULT 0,
  papers_count INTEGER DEFAULT 0,
  papers_note TEXT,
  speakers_count INTEGER DEFAULT 0,
  accepted_rate INTEGER DEFAULT 0,
  satisfaction_score NUMERIC(3,1) DEFAULT 0,
  tracks_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security — enable and set policies
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Users: can read/update their own profile; admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = user_id OR
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = 'author');

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Papers: authors can CRUD their own; admins can read all
DROP POLICY IF EXISTS "Authors manage own papers" ON papers;
CREATE POLICY "Authors manage own papers" ON papers
  FOR ALL USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins read all papers" ON papers;
CREATE POLICY "Admins read all papers" ON papers
  FOR SELECT USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins update any paper" ON papers;
CREATE POLICY "Admins update any paper" ON papers
  FOR UPDATE USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

-- Sessions, awards, downloads: public read
DROP POLICY IF EXISTS "Public read sessions" ON sessions;
CREATE POLICY "Public read sessions" ON sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read awards" ON awards;
CREATE POLICY "Public read awards" ON awards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read downloads" ON downloads;
CREATE POLICY "Public read downloads" ON downloads FOR SELECT USING (true);

-- Admins can manage sessions, awards, downloads
DROP POLICY IF EXISTS "Admins manage sessions" ON sessions;
CREATE POLICY "Admins manage sessions" ON sessions
  FOR ALL USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins manage awards" ON awards;
CREATE POLICY "Admins manage awards" ON awards
  FOR ALL USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins manage downloads" ON downloads;
CREATE POLICY "Admins manage downloads" ON downloads
  FOR ALL USING (
    (SELECT role FROM users WHERE user_id = auth.uid()) = 'admin'
  );

-- ============================================================
-- Done! Verify with: SELECT * FROM users WHERE role = 'admin';
-- ============================================================
