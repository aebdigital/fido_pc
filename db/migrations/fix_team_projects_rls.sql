-- Fix RLS policies for team_projects table
-- The previous policies had incorrect join conditions (id vs project_id)

-- 1. Drop existing policies
DROP POLICY IF EXISTS "team_projects_insert" ON public.team_projects;
DROP POLICY IF EXISTS "team_projects_delete" ON public.team_projects;

-- 2. Create CORRECT Insert Policy
-- Allow insertion if:
-- A) User owns the team
-- B) User owns the project being shared
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
    WHERE projects.id = team_projects.project_id
    AND projects.user_id = auth.uid()
  ))
);

-- 3. Create CORRECT Delete Policy
-- Allow deletion if:
-- A) User owns the team
-- B) User owns the project (or is the one who shared it - checked via shared_by_id preferably, but project ownership is a good fallback)
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
    WHERE projects.id = team_projects.project_id
    AND projects.user_id = auth.uid()
  ))
);
