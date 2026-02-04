-- URGENT: Check if projects still exist in database
-- Run this in Supabase SQL Editor to verify data integrity

-- 1. Check total number of projects (bypassing RLS)
SELECT COUNT(*) as total_projects FROM projects;

-- 2. Check projects for specific user
SELECT 
  p.c_id,
  p.name,
  p.category,
  p.user_id,
  u.email
FROM projects p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 's.kamencik@gmail.com'
ORDER BY p.created_at DESC;

-- 3. Check all active RLS policies on projects table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects';

-- 4. If projects exist but aren't visible, temporarily disable RLS to confirm
-- (Re-enable after testing!)
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- SELECT * FROM projects WHERE user_id = (SELECT id FROM auth.users WHERE email = 's.kamencik@gmail.com');
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
