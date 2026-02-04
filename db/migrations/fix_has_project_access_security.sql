CREATE OR REPLACE FUNCTION public.has_project_access(project_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = project_uuid 
    AND (
       user_id = auth.uid() -- Owner
       OR EXISTS (
         SELECT 1 FROM public.project_members
         WHERE project_id = project_uuid
         AND user_id = auth.uid()
       ) -- Member
       OR EXISTS (
         SELECT 1 FROM public.team_projects tp
         JOIN public.team_members tm ON tp.team_id = tm.team_id
         WHERE tp.project_id = project_uuid
         AND tm.user_id = auth.uid()
         AND tm.status = 'active'
       ) -- Team Member
    )
  );
END;
$function$;
