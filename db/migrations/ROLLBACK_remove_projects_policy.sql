-- ROLLBACK: Remove the problematic RLS policy that's blocking project visibility

-- Drop the new policy that might be conflicting
DROP POLICY IF EXISTS "projects_member_select" ON public.projects;

-- This should restore visibility of your projects
-- The existing project policies will take over
