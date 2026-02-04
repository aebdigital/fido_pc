-- Function to check membership safely (bypassing RLS recursion)
CREATE OR REPLACE FUNCTION public.is_project_member_secure(project_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = user_uuid
  );
END;
$function$;

-- Update project_members SELECT policy
DROP POLICY IF EXISTS "project_members_select" ON project_members;

CREATE POLICY "project_members_select"
ON project_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- User is owner
  is_project_owner_by_user(project_id, auth.uid())
  OR
  -- User is a member of the project (can see colleagues)
  is_project_member_secure(project_id, auth.uid())
);

-- Optimization: Update dennik_time_entries to use this safe check too
DROP POLICY IF EXISTS "dennik_time_entries_select" ON dennik_time_entries;

CREATE POLICY "dennik_time_entries_select"
ON dennik_time_entries
FOR SELECT
TO authenticated
USING (
  -- User can see their own entries
  user_id = auth.uid()
  OR
  -- Project Owner
  is_project_owner_by_user(project_id, auth.uid())
  OR
  -- Project Member
  is_project_member_secure(project_id, auth.uid())
);
