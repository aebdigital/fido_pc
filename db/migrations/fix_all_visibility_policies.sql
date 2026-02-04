-- Comprehensive Fix for Shared Data Visibility (RLS)

-- 1. Helper Function: Check Project Access (Owner or Member)
-- SECURITY DEFINER to bypass RLS recursion on projects table
CREATE OR REPLACE FUNCTION public.has_project_access(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE c_id = project_uuid 
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.team_projects tp
    JOIN public.team_members tm ON tp.team_id = tm.team_id
    WHERE tp.project_id = project_uuid
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  );
$$;

-- 2. Helper Function: Check Room Access (via Project)
CREATE OR REPLACE FUNCTION public.has_room_access(room_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.has_project_access(project_id)
  FROM public.rooms
  WHERE id = room_uuid;
$$;


-- 3. Apply to 'job_assignments'
DROP POLICY IF EXISTS "job_assignments_select_policy" ON public.job_assignments;
CREATE POLICY "job_assignments_select_policy" ON public.job_assignments
FOR SELECT USING (public.has_project_access(project_id));


-- 4. Apply to 'invoices'
DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
CREATE POLICY "invoices_select_policy" ON public.invoices
FOR SELECT USING (public.has_project_access(project_id));


-- 5. Apply to 'rooms' (Update existing if needed)
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
-- Note: Dropping old name if it exists, creating consistent name
DROP POLICY IF EXISTS "rooms_member_select" ON public.rooms; 
CREATE POLICY "rooms_select_policy" ON public.rooms
FOR SELECT USING (public.has_project_access(project_id));


-- 6. Apply to All Work Item Tables
-- List of tables identified from schema
DO $$
DECLARE
  work_tables TEXT[] := ARRAY[
    'brick_load_bearing_walls', 'brick_partitions', 'core_drills', 
    'custom_materials', 'custom_works', 'demolitions', 'doors', 
    'facade_plasterings', 'groutings', 'installation_of_corner_beads', 
    'installation_of_door_jambs', 'installation_of_sanitaries', 
    'laying_floating_floors', 'levellings', 'netting_ceilings', 
    'netting_walls', 'painting_ceilings', 'painting_walls', 
    'paving_ceramics', 'penetration_coatings', 'plasterboarding_ceilings', 
    'plasterboarding_offset_walls', 'plasterboarding_partitions', 
    'plastering_ceilings', 'plastering_of_window_sashes', 'plastering_walls', 
    'plumbings', 'scaffoldings', 'siliconings', 'skirting_of_floating_floors', 
    'tile_ceramics', 'window_installations', 'windows', 'wirings'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY work_tables LOOP
    -- Drop existing policy if any (generic name)
    EXECUTE format('DROP POLICY IF EXISTS "work_items_select_policy" ON public.%I', t);
    
    -- Create new policy checking room access
    -- We assume these tables have 'room_id'
    EXECUTE format('
      CREATE POLICY "work_items_select_policy" ON public.%I
      FOR SELECT USING (public.has_room_access(room_id))
    ', t);
  END LOOP;
END;
$$;
