-- ============================================================
-- SQL Script to fix Row-Level Security (RLS) for paper_authors
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Enable Row-Level Security on paper_authors table
ALTER TABLE public.paper_authors ENABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting insert policies if they exist
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.paper_authors;
DROP POLICY IF EXISTS "Authors can insert paper_authors" ON public.paper_authors;
DROP POLICY IF EXISTS "Insert paper_authors" ON public.paper_authors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.paper_authors;

-- 3. Create the insert policy:
-- Allow authenticated authors to insert into paper_authors 
-- if they are the author of the corresponding paper (matching paper_code)
CREATE POLICY "Authors can insert paper_authors" ON public.paper_authors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT author_id 
      FROM public.papers 
      WHERE public.papers.paper_code = paper_authors.paper_code
      LIMIT 1
    )
  );

-- 4. Drop any conflicting select policies if they exist
DROP POLICY IF EXISTS "Authors can view own paper_authors" ON public.paper_authors;
DROP POLICY IF EXISTS "Select paper_authors" ON public.paper_authors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.paper_authors;

-- 5. Create the select policy:
-- Allow authors to view their own paper's authors, and admins/reviewers to view all
CREATE POLICY "Select paper_authors" ON public.paper_authors
  FOR SELECT
  TO authenticated
  USING (
    -- Author can view
    auth.uid() = (
      SELECT author_id 
      FROM public.papers 
      WHERE public.papers.paper_code = paper_authors.paper_code
      LIMIT 1
    )
    OR
    -- Admin or Reviewer can view
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.user_id = auth.uid()
      AND public.users.role IN ('admin', 'reviewer')
    )
  );

-- ============================================================
-- Done! You can verify by submitting a paper in the portal.
-- ============================================================
