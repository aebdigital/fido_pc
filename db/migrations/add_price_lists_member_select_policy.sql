-- Allow project members to view the price list of projects they have access to
-- This is needed for member project viewing on iOS/Desktop
-- Without this, members get RLS denied when trying to fetch the project's price list

CREATE POLICY "price_lists_member_select" ON public.price_lists
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.price_list_id = price_lists.c_id
    AND public.has_project_access(p.c_id)
  )
);
