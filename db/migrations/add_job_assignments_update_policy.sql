-- Add missing UPDATE policy for job_assignments table
-- This allows the assigned user or the assigner to update the assignment (status, notes, photos, etc.)

CREATE POLICY "job_assignments_update" ON public.job_assignments FOR UPDATE USING (
  user_id = auth.uid() OR -- The assigned user can update
  assigned_by_id = auth.uid() OR -- The assigner can update
  EXISTS (
    SELECT 1 FROM public.team_projects tp
    WHERE tp.project_id = job_assignments.project_id
    AND check_team_membership(tp.team_id)
  )
);
