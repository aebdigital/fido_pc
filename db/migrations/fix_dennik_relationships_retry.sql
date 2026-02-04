-- 1. Fix Foreign Key Relationship safely
-- Drop it first to ensure we can recreate it pointing to the correct table (profiles)
ALTER TABLE dennik_time_entries
DROP CONSTRAINT IF EXISTS dennik_time_entries_user_id_fkey;

ALTER TABLE dennik_time_entries
ADD CONSTRAINT dennik_time_entries_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 2. Fix Broken RLS SELECT Policy 
DROP POLICY IF EXISTS "dennik_time_entries_select" ON dennik_time_entries;

CREATE POLICY "dennik_time_entries_select"
ON dennik_time_entries
FOR SELECT
TO authenticated
USING (
  -- User can see their own entries
  user_id = auth.uid()
  OR
  -- Project Owner can see all entries for their project
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.c_id = dennik_time_entries.project_id
    AND projects.user_id = auth.uid()
  )
  OR
  -- Project Members can see all entries for shared projects
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = dennik_time_entries.project_id
    AND project_members.user_id = auth.uid()
  )
);
