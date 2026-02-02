-- 1. Robustly clear all existing policies on the team-related tables to ensure a clean slate
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('teams', 'team_members', 'team_projects', 'job_assignments')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. Create the membership checking function with SECURITY DEFINER and explicit search_path
-- This function runs with the privileges of the creator (you), bypassing RLS internally.
CREATE OR REPLACE FUNCTION public.check_team_membership(check_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = check_team_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-apply Comprehensive Policies

-- teams:
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (owner_id = auth.uid() OR check_team_membership(id));
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "teams_delete" ON public.teams FOR DELETE USING (owner_id = auth.uid());

-- team_members:
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT USING (user_id = auth.uid() OR check_team_membership(team_id));
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR -- Self-join
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) -- Added by owner
);
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE USING (
  user_id = auth.uid() OR -- Leave team
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) -- Removed by owner
);

-- team_projects:
CREATE POLICY "team_projects_select" ON public.team_projects FOR SELECT USING (check_team_membership(team_id));
CREATE POLICY "team_projects_insert" ON public.team_projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "team_projects_delete" ON public.team_projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- job_assignments:
CREATE POLICY "job_assignments_select" ON public.job_assignments FOR SELECT USING (
  user_id = auth.uid() OR -- The assigned user
  assigned_by_id = auth.uid() OR -- The assigner
  EXISTS (
    SELECT 1 FROM public.team_projects tp
    WHERE tp.project_id = job_assignments.project_id
    AND check_team_membership(tp.team_id)
  )
);
CREATE POLICY "job_assignments_insert" ON public.job_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "job_assignments_delete" ON public.job_assignments FOR DELETE USING (
  assigned_by_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
