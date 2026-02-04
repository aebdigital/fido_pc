-- Fix: Update existing RLS policy to include project_members access
-- This adds dennik member access without breaking existing team-based access

-- Drop the existing "Users can view own or shared projects" policy
DROP POLICY IF EXISTS "Users can view own or shared projects" ON public.projects;

-- Recreate it with project_members support added
CREATE POLICY "Users can view own or shared projects" ON public.projects
FOR SELECT
USING (
  -- User owns the project
  user_id = auth.uid() 
  OR 
  -- User is a member via teams (existing functionality)
  EXISTS (
    SELECT 1
    FROM team_projects tp
    JOIN team_members tm ON tp.team_id = tm.team_id
    WHERE tp.project_id = projects.c_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
  OR
  -- User is a member via dennik project sharing (NEW)
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = projects.c_id
    AND pm.user_id = auth.uid()
  )
);
