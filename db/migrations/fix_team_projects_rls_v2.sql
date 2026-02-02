-- Fix RLS policies for team_projects table
-- Updated to use 'c_id' for projects table instead of 'id'

-- 1. Drop existing policies
DROP POLICY IF EXISTS "team_projects_insert" ON public.team_projects;
DROP POLICY IF EXISTS "team_projects_delete" ON public.team_projects;

-- 2. Create CORRECT Insert Policy
-- Allow insertion if:
-- A) User owns the team
-- B) User owns the project (using c_id)
CREATE POLICY "team_projects_insert"
ON public.team_projects
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_projects.team_id
    AND teams.owner_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.c_id = team_projects.project_id
    AND projects.user_id = auth.uid()
  ))
);

-- 3. Create CORRECT Delete Policy
-- Allow deletion if team owner or project owner
CREATE POLICY "team_projects_delete"
ON public.team_projects
FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_projects.team_id
    AND teams.owner_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.c_id = team_projects.project_id
    AND projects.user_id = auth.uid()
  ))
);
