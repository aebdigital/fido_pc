-- Fix Member Project Access: Room Access + Price List + Doors/Windows RLS
--
-- ROOT CAUSE 1: has_room_access() used "WHERE id = room_uuid" but work item tables
-- store the room's c_id in their room_id column, not rooms.id.
-- ROOT CAUSE 2: doors and windows tables don't have room_id (they're children of walls).
-- The fix_all_visibility_policies migration failed to create proper policies for them.

-- 1. Fix has_room_access to use c_id instead of id
CREATE OR REPLACE FUNCTION public.has_room_access(room_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.has_project_access(project_id)
  FROM public.rooms
  WHERE c_id = room_uuid;
$$;

-- 2. Add price_lists member SELECT policy (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_lists'
    AND policyname = 'price_lists_member_select'
  ) THEN
    CREATE POLICY "price_lists_member_select" ON public.price_lists
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.price_list_id = price_lists.c_id
        AND public.has_project_access(p.c_id)
      )
    );
  END IF;
END $$;

-- 3. Fix doors RLS: they don't have room_id, access is through parent wall items
-- Drop the broken policy (if it was created despite column not existing)
DROP POLICY IF EXISTS "work_items_select_policy" ON public.doors;
DROP POLICY IF EXISTS "doors_member_select" ON public.doors;

CREATE POLICY "doors_member_select" ON public.doors
FOR SELECT USING (
  user_id = auth.uid()
  OR (brick_load_bearing_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brick_load_bearing_walls w
    WHERE w.c_id = doors.brick_load_bearing_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (brick_partition_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brick_partitions w
    WHERE w.c_id = doors.brick_partition_id AND public.has_room_access(w.room_id)
  ))
  OR (facade_plastering_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.facade_plasterings w
    WHERE w.c_id = doors.facade_plastering_id AND public.has_room_access(w.room_id)
  ))
  OR (netting_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.netting_walls w
    WHERE w.c_id = doors.netting_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (plasterboarding_offset_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plasterboarding_offset_walls w
    WHERE w.c_id = doors.plasterboarding_offset_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (plasterboarding_partition_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plasterboarding_partitions w
    WHERE w.c_id = doors.plasterboarding_partition_id AND public.has_room_access(w.room_id)
  ))
  OR (plastering_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plastering_walls w
    WHERE w.c_id = doors.plastering_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (tile_ceramic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tile_ceramics w
    WHERE w.c_id = doors.tile_ceramic_id AND public.has_room_access(w.room_id)
  ))
);

-- 4. Fix windows RLS: same issue as doors (children of walls, no room_id)
DROP POLICY IF EXISTS "work_items_select_policy" ON public.windows;
DROP POLICY IF EXISTS "windows_member_select" ON public.windows;

CREATE POLICY "windows_member_select" ON public.windows
FOR SELECT USING (
  user_id = auth.uid()
  OR (brick_load_bearing_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brick_load_bearing_walls w
    WHERE w.c_id = windows.brick_load_bearing_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (brick_partition_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brick_partitions w
    WHERE w.c_id = windows.brick_partition_id AND public.has_room_access(w.room_id)
  ))
  OR (facade_plastering_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.facade_plasterings w
    WHERE w.c_id = windows.facade_plastering_id AND public.has_room_access(w.room_id)
  ))
  OR (netting_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.netting_walls w
    WHERE w.c_id = windows.netting_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (plasterboarding_ceiling_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plasterboarding_ceilings w
    WHERE w.c_id = windows.plasterboarding_ceiling_id AND public.has_room_access(w.room_id)
  ))
  OR (plasterboarding_offset_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plasterboarding_offset_walls w
    WHERE w.c_id = windows.plasterboarding_offset_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (plasterboarding_partition_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plasterboarding_partitions w
    WHERE w.c_id = windows.plasterboarding_partition_id AND public.has_room_access(w.room_id)
  ))
  OR (plastering_wall_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plastering_walls w
    WHERE w.c_id = windows.plastering_wall_id AND public.has_room_access(w.room_id)
  ))
  OR (tile_ceramic_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tile_ceramics w
    WHERE w.c_id = windows.tile_ceramic_id AND public.has_room_access(w.room_id)
  ))
);
