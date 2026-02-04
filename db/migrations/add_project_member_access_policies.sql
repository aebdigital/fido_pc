-- Add RLS policies to allow project members to view rooms and projects
-- This enables shared project access for dennik members

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "rooms_member_select" ON public.rooms;
DROP POLICY IF EXISTS "projects_member_select" ON public.projects;

-- Policy for rooms: Allow members to view rooms of shared projects
CREATE POLICY "rooms_member_select" ON public.rooms
FOR SELECT
USING (
  -- User owns the project
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = rooms.project_id
    AND user_id = auth.uid()
  )
  OR
  -- User is a member of the project
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = rooms.project_id
    AND user_id = auth.uid()
  )
);

-- Policy for projects: Allow members to view shared projects
CREATE POLICY "projects_member_select" ON public.projects
FOR SELECT
USING (
  -- User owns the project
  user_id = auth.uid()
  OR
  -- User is a member of the project
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = projects.c_id
    AND user_id = auth.uid()
  )
);
