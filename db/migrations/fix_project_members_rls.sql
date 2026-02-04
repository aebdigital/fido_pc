-- Fix RLS policies for project_members to use c_id instead of id

-- Drop existing policies
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

-- Recreate policies with correct column reference
-- Users can view members if they are the project owner OR they are a member themselves
CREATE POLICY "project_members_select" ON public.project_members
FOR SELECT
USING (
  -- User is a member of this project
  user_id = auth.uid() OR
  -- User is the owner of this project
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = project_members.project_id
    AND user_id = auth.uid()
  )
);

-- Only project owners can add members
CREATE POLICY "project_members_insert" ON public.project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = project_id
    AND user_id = auth.uid()
  )
);

-- Only project owners can remove members
CREATE POLICY "project_members_delete" ON public.project_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = project_id
    AND user_id = auth.uid()
  )
);
