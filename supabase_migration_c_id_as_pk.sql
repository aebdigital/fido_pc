-- ============================================================================
-- MIGRATION: Make c_id the Primary Key (Remove id column)
-- ============================================================================
-- This migration simplifies the ID system by:
-- 1. Dropping the old 'id' column (Supabase auto-generated)
-- 2. Making 'c_id' the PRIMARY KEY
-- 3. Updating all foreign keys to reference 'c_id'
--
-- IMPORTANT: Run this in the Supabase SQL Editor
-- WARNING: This will DELETE all existing data. Backup first if needed.
-- ============================================================================

-- Step 1: Drop all foreign key constraints first
-- ============================================================================

-- Rooms FK to projects
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_project_id_fkey;

-- Receipts FK to projects
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_project_id_fkey;

-- Invoices FKs
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_contractor_id_fkey;

-- Projects FKs
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_contractor_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_price_list_id_fkey;

-- All 33 work item tables FK to rooms
ALTER TABLE brick_partitions DROP CONSTRAINT IF EXISTS brick_partitions_room_id_fkey;
ALTER TABLE brick_load_bearing_walls DROP CONSTRAINT IF EXISTS brick_load_bearing_walls_room_id_fkey;
ALTER TABLE plasterboarding_partitions DROP CONSTRAINT IF EXISTS plasterboarding_partitions_room_id_fkey;
ALTER TABLE plasterboarding_offset_walls DROP CONSTRAINT IF EXISTS plasterboarding_offset_walls_room_id_fkey;
ALTER TABLE plasterboarding_ceilings DROP CONSTRAINT IF EXISTS plasterboarding_ceilings_room_id_fkey;
ALTER TABLE netting_walls DROP CONSTRAINT IF EXISTS netting_walls_room_id_fkey;
ALTER TABLE netting_ceilings DROP CONSTRAINT IF EXISTS netting_ceilings_room_id_fkey;
ALTER TABLE plastering_walls DROP CONSTRAINT IF EXISTS plastering_walls_room_id_fkey;
ALTER TABLE plastering_ceilings DROP CONSTRAINT IF EXISTS plastering_ceilings_room_id_fkey;
ALTER TABLE facade_plasterings DROP CONSTRAINT IF EXISTS facade_plasterings_room_id_fkey;
ALTER TABLE plastering_of_window_sashes DROP CONSTRAINT IF EXISTS plastering_of_window_sashes_room_id_fkey;
ALTER TABLE painting_walls DROP CONSTRAINT IF EXISTS painting_walls_room_id_fkey;
ALTER TABLE painting_ceilings DROP CONSTRAINT IF EXISTS painting_ceilings_room_id_fkey;
ALTER TABLE levellings DROP CONSTRAINT IF EXISTS levellings_room_id_fkey;
ALTER TABLE tile_ceramics DROP CONSTRAINT IF EXISTS tile_ceramics_room_id_fkey;
ALTER TABLE paving_ceramics DROP CONSTRAINT IF EXISTS paving_ceramics_room_id_fkey;
ALTER TABLE laying_floating_floors DROP CONSTRAINT IF EXISTS laying_floating_floors_room_id_fkey;
ALTER TABLE wirings DROP CONSTRAINT IF EXISTS wirings_room_id_fkey;
ALTER TABLE plumbings DROP CONSTRAINT IF EXISTS plumbings_room_id_fkey;
ALTER TABLE installation_of_sanitaries DROP CONSTRAINT IF EXISTS installation_of_sanitaries_room_id_fkey;
ALTER TABLE installation_of_corner_beads DROP CONSTRAINT IF EXISTS installation_of_corner_beads_room_id_fkey;
ALTER TABLE installation_of_door_jambs DROP CONSTRAINT IF EXISTS installation_of_door_jambs_room_id_fkey;
ALTER TABLE window_installations DROP CONSTRAINT IF EXISTS window_installations_room_id_fkey;
ALTER TABLE demolitions DROP CONSTRAINT IF EXISTS demolitions_room_id_fkey;
ALTER TABLE groutings DROP CONSTRAINT IF EXISTS groutings_room_id_fkey;
ALTER TABLE penetration_coatings DROP CONSTRAINT IF EXISTS penetration_coatings_room_id_fkey;
ALTER TABLE siliconings DROP CONSTRAINT IF EXISTS siliconings_room_id_fkey;
ALTER TABLE custom_works DROP CONSTRAINT IF EXISTS custom_works_room_id_fkey;
ALTER TABLE custom_materials DROP CONSTRAINT IF EXISTS custom_materials_room_id_fkey;
ALTER TABLE scaffoldings DROP CONSTRAINT IF EXISTS scaffoldings_room_id_fkey;
ALTER TABLE core_drills DROP CONSTRAINT IF EXISTS core_drills_room_id_fkey;
ALTER TABLE tool_rentals DROP CONSTRAINT IF EXISTS tool_rentals_room_id_fkey;
ALTER TABLE skirting_of_floating_floors DROP CONSTRAINT IF EXISTS skirting_of_floating_floors_room_id_fkey;

-- Doors/Windows FKs (they reference work item tables)
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_brick_load_bearing_wall_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_brick_partition_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_facade_plastering_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_netting_wall_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_plasterboarding_offset_wall_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_plasterboarding_partition_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_plastering_wall_id_fkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_tile_ceramic_id_fkey;

ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_brick_load_bearing_wall_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_brick_partition_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_facade_plastering_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_netting_wall_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_plasterboarding_ceiling_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_plasterboarding_offset_wall_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_plasterboarding_partition_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_plastering_wall_id_fkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_tile_ceramic_id_fkey;

-- Step 2: Drop old primary keys
-- ============================================================================

ALTER TABLE contractors DROP CONSTRAINT IF EXISTS contractors_pkey;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_pkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_pkey;
ALTER TABLE price_lists DROP CONSTRAINT IF EXISTS price_lists_pkey;
ALTER TABLE invoice_settings DROP CONSTRAINT IF EXISTS invoice_settings_pkey;

-- Work item tables
ALTER TABLE brick_partitions DROP CONSTRAINT IF EXISTS brick_partitions_pkey;
ALTER TABLE brick_load_bearing_walls DROP CONSTRAINT IF EXISTS brick_load_bearing_walls_pkey;
ALTER TABLE plasterboarding_partitions DROP CONSTRAINT IF EXISTS plasterboarding_partitions_pkey;
ALTER TABLE plasterboarding_offset_walls DROP CONSTRAINT IF EXISTS plasterboarding_offset_walls_pkey;
ALTER TABLE plasterboarding_ceilings DROP CONSTRAINT IF EXISTS plasterboarding_ceilings_pkey;
ALTER TABLE netting_walls DROP CONSTRAINT IF EXISTS netting_walls_pkey;
ALTER TABLE netting_ceilings DROP CONSTRAINT IF EXISTS netting_ceilings_pkey;
ALTER TABLE plastering_walls DROP CONSTRAINT IF EXISTS plastering_walls_pkey;
ALTER TABLE plastering_ceilings DROP CONSTRAINT IF EXISTS plastering_ceilings_pkey;
ALTER TABLE facade_plasterings DROP CONSTRAINT IF EXISTS facade_plasterings_pkey;
ALTER TABLE plastering_of_window_sashes DROP CONSTRAINT IF EXISTS plastering_of_window_sashes_pkey;
ALTER TABLE painting_walls DROP CONSTRAINT IF EXISTS painting_walls_pkey;
ALTER TABLE painting_ceilings DROP CONSTRAINT IF EXISTS painting_ceilings_pkey;
ALTER TABLE levellings DROP CONSTRAINT IF EXISTS levellings_pkey;
ALTER TABLE tile_ceramics DROP CONSTRAINT IF EXISTS tile_ceramics_pkey;
ALTER TABLE paving_ceramics DROP CONSTRAINT IF EXISTS paving_ceramics_pkey;
ALTER TABLE laying_floating_floors DROP CONSTRAINT IF EXISTS laying_floating_floors_pkey;
ALTER TABLE wirings DROP CONSTRAINT IF EXISTS wirings_pkey;
ALTER TABLE plumbings DROP CONSTRAINT IF EXISTS plumbings_pkey;
ALTER TABLE installation_of_sanitaries DROP CONSTRAINT IF EXISTS installation_of_sanitaries_pkey;
ALTER TABLE installation_of_corner_beads DROP CONSTRAINT IF EXISTS installation_of_corner_beads_pkey;
ALTER TABLE installation_of_door_jambs DROP CONSTRAINT IF EXISTS installation_of_door_jambs_pkey;
ALTER TABLE window_installations DROP CONSTRAINT IF EXISTS window_installations_pkey;
ALTER TABLE demolitions DROP CONSTRAINT IF EXISTS demolitions_pkey;
ALTER TABLE groutings DROP CONSTRAINT IF EXISTS groutings_pkey;
ALTER TABLE penetration_coatings DROP CONSTRAINT IF EXISTS penetration_coatings_pkey;
ALTER TABLE siliconings DROP CONSTRAINT IF EXISTS siliconings_pkey;
ALTER TABLE custom_works DROP CONSTRAINT IF EXISTS custom_works_pkey;
ALTER TABLE custom_materials DROP CONSTRAINT IF EXISTS custom_materials_pkey;
ALTER TABLE scaffoldings DROP CONSTRAINT IF EXISTS scaffoldings_pkey;
ALTER TABLE core_drills DROP CONSTRAINT IF EXISTS core_drills_pkey;
ALTER TABLE tool_rentals DROP CONSTRAINT IF EXISTS tool_rentals_pkey;
ALTER TABLE skirting_of_floating_floors DROP CONSTRAINT IF EXISTS skirting_of_floating_floors_pkey;
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_pkey;
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_pkey;

-- Step 3: Delete all data (fresh start)
-- ============================================================================

TRUNCATE TABLE doors CASCADE;
TRUNCATE TABLE windows CASCADE;
TRUNCATE TABLE brick_partitions CASCADE;
TRUNCATE TABLE brick_load_bearing_walls CASCADE;
TRUNCATE TABLE plasterboarding_partitions CASCADE;
TRUNCATE TABLE plasterboarding_offset_walls CASCADE;
TRUNCATE TABLE plasterboarding_ceilings CASCADE;
TRUNCATE TABLE netting_walls CASCADE;
TRUNCATE TABLE netting_ceilings CASCADE;
TRUNCATE TABLE plastering_walls CASCADE;
TRUNCATE TABLE plastering_ceilings CASCADE;
TRUNCATE TABLE facade_plasterings CASCADE;
TRUNCATE TABLE plastering_of_window_sashes CASCADE;
TRUNCATE TABLE painting_walls CASCADE;
TRUNCATE TABLE painting_ceilings CASCADE;
TRUNCATE TABLE levellings CASCADE;
TRUNCATE TABLE tile_ceramics CASCADE;
TRUNCATE TABLE paving_ceramics CASCADE;
TRUNCATE TABLE laying_floating_floors CASCADE;
TRUNCATE TABLE wirings CASCADE;
TRUNCATE TABLE plumbings CASCADE;
TRUNCATE TABLE installation_of_sanitaries CASCADE;
TRUNCATE TABLE installation_of_corner_beads CASCADE;
TRUNCATE TABLE installation_of_door_jambs CASCADE;
TRUNCATE TABLE window_installations CASCADE;
TRUNCATE TABLE demolitions CASCADE;
TRUNCATE TABLE groutings CASCADE;
TRUNCATE TABLE penetration_coatings CASCADE;
TRUNCATE TABLE siliconings CASCADE;
TRUNCATE TABLE custom_works CASCADE;
TRUNCATE TABLE custom_materials CASCADE;
TRUNCATE TABLE scaffoldings CASCADE;
TRUNCATE TABLE core_drills CASCADE;
TRUNCATE TABLE tool_rentals CASCADE;
TRUNCATE TABLE skirting_of_floating_floors CASCADE;
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE receipts CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE contractors CASCADE;
TRUNCATE TABLE price_lists CASCADE;
TRUNCATE TABLE invoice_settings CASCADE;

-- Step 4: Drop old 'id' columns and make c_id the primary key
-- ============================================================================

-- CONTRACTORS
ALTER TABLE contractors DROP COLUMN IF EXISTS id;
ALTER TABLE contractors ADD PRIMARY KEY (c_id);

-- CLIENTS
ALTER TABLE clients DROP COLUMN IF EXISTS id;
ALTER TABLE clients ADD PRIMARY KEY (c_id);

-- PRICE_LISTS
ALTER TABLE price_lists DROP COLUMN IF EXISTS id;
ALTER TABLE price_lists ADD PRIMARY KEY (c_id);

-- INVOICE_SETTINGS
ALTER TABLE invoice_settings DROP COLUMN IF EXISTS id;
ALTER TABLE invoice_settings ADD PRIMARY KEY (c_id);

-- PROJECTS - also need to update FK columns to reference c_id
ALTER TABLE projects DROP COLUMN IF EXISTS id;
ALTER TABLE projects ADD PRIMARY KEY (c_id);
-- Rename FK columns: client_id -> client_c_id, contractor_id -> contractor_c_id, price_list_id -> price_list_c_id
-- Actually, let's keep the column names but they now reference c_id

-- ROOMS
ALTER TABLE rooms DROP COLUMN IF EXISTS id;
ALTER TABLE rooms ADD PRIMARY KEY (c_id);

-- RECEIPTS
ALTER TABLE receipts DROP COLUMN IF EXISTS id;
ALTER TABLE receipts ADD PRIMARY KEY (c_id);

-- INVOICES
ALTER TABLE invoices DROP COLUMN IF EXISTS id;
ALTER TABLE invoices ADD PRIMARY KEY (c_id);

-- All 33 work item tables
ALTER TABLE brick_partitions DROP COLUMN IF EXISTS id;
ALTER TABLE brick_partitions ADD PRIMARY KEY (c_id);

ALTER TABLE brick_load_bearing_walls DROP COLUMN IF EXISTS id;
ALTER TABLE brick_load_bearing_walls ADD PRIMARY KEY (c_id);

ALTER TABLE plasterboarding_partitions DROP COLUMN IF EXISTS id;
ALTER TABLE plasterboarding_partitions ADD PRIMARY KEY (c_id);

ALTER TABLE plasterboarding_offset_walls DROP COLUMN IF EXISTS id;
ALTER TABLE plasterboarding_offset_walls ADD PRIMARY KEY (c_id);

ALTER TABLE plasterboarding_ceilings DROP COLUMN IF EXISTS id;
ALTER TABLE plasterboarding_ceilings ADD PRIMARY KEY (c_id);

ALTER TABLE netting_walls DROP COLUMN IF EXISTS id;
ALTER TABLE netting_walls ADD PRIMARY KEY (c_id);

ALTER TABLE netting_ceilings DROP COLUMN IF EXISTS id;
ALTER TABLE netting_ceilings ADD PRIMARY KEY (c_id);

ALTER TABLE plastering_walls DROP COLUMN IF EXISTS id;
ALTER TABLE plastering_walls ADD PRIMARY KEY (c_id);

ALTER TABLE plastering_ceilings DROP COLUMN IF EXISTS id;
ALTER TABLE plastering_ceilings ADD PRIMARY KEY (c_id);

ALTER TABLE facade_plasterings DROP COLUMN IF EXISTS id;
ALTER TABLE facade_plasterings ADD PRIMARY KEY (c_id);

ALTER TABLE plastering_of_window_sashes DROP COLUMN IF EXISTS id;
ALTER TABLE plastering_of_window_sashes ADD PRIMARY KEY (c_id);

ALTER TABLE painting_walls DROP COLUMN IF EXISTS id;
ALTER TABLE painting_walls ADD PRIMARY KEY (c_id);

ALTER TABLE painting_ceilings DROP COLUMN IF EXISTS id;
ALTER TABLE painting_ceilings ADD PRIMARY KEY (c_id);

ALTER TABLE levellings DROP COLUMN IF EXISTS id;
ALTER TABLE levellings ADD PRIMARY KEY (c_id);

ALTER TABLE tile_ceramics DROP COLUMN IF EXISTS id;
ALTER TABLE tile_ceramics ADD PRIMARY KEY (c_id);

ALTER TABLE paving_ceramics DROP COLUMN IF EXISTS id;
ALTER TABLE paving_ceramics ADD PRIMARY KEY (c_id);

ALTER TABLE laying_floating_floors DROP COLUMN IF EXISTS id;
ALTER TABLE laying_floating_floors ADD PRIMARY KEY (c_id);

ALTER TABLE wirings DROP COLUMN IF EXISTS id;
ALTER TABLE wirings ADD PRIMARY KEY (c_id);

ALTER TABLE plumbings DROP COLUMN IF EXISTS id;
ALTER TABLE plumbings ADD PRIMARY KEY (c_id);

ALTER TABLE installation_of_sanitaries DROP COLUMN IF EXISTS id;
ALTER TABLE installation_of_sanitaries ADD PRIMARY KEY (c_id);

ALTER TABLE installation_of_corner_beads DROP COLUMN IF EXISTS id;
ALTER TABLE installation_of_corner_beads ADD PRIMARY KEY (c_id);

ALTER TABLE installation_of_door_jambs DROP COLUMN IF EXISTS id;
ALTER TABLE installation_of_door_jambs ADD PRIMARY KEY (c_id);

ALTER TABLE window_installations DROP COLUMN IF EXISTS id;
ALTER TABLE window_installations ADD PRIMARY KEY (c_id);

ALTER TABLE demolitions DROP COLUMN IF EXISTS id;
ALTER TABLE demolitions ADD PRIMARY KEY (c_id);

ALTER TABLE groutings DROP COLUMN IF EXISTS id;
ALTER TABLE groutings ADD PRIMARY KEY (c_id);

ALTER TABLE penetration_coatings DROP COLUMN IF EXISTS id;
ALTER TABLE penetration_coatings ADD PRIMARY KEY (c_id);

ALTER TABLE siliconings DROP COLUMN IF EXISTS id;
ALTER TABLE siliconings ADD PRIMARY KEY (c_id);

ALTER TABLE custom_works DROP COLUMN IF EXISTS id;
ALTER TABLE custom_works ADD PRIMARY KEY (c_id);

ALTER TABLE custom_materials DROP COLUMN IF EXISTS id;
ALTER TABLE custom_materials ADD PRIMARY KEY (c_id);

ALTER TABLE scaffoldings DROP COLUMN IF EXISTS id;
ALTER TABLE scaffoldings ADD PRIMARY KEY (c_id);

ALTER TABLE core_drills DROP COLUMN IF EXISTS id;
ALTER TABLE core_drills ADD PRIMARY KEY (c_id);

ALTER TABLE tool_rentals DROP COLUMN IF EXISTS id;
ALTER TABLE tool_rentals ADD PRIMARY KEY (c_id);

ALTER TABLE skirting_of_floating_floors DROP COLUMN IF EXISTS id;
ALTER TABLE skirting_of_floating_floors ADD PRIMARY KEY (c_id);

ALTER TABLE doors DROP COLUMN IF EXISTS id;
ALTER TABLE doors ADD PRIMARY KEY (c_id);

ALTER TABLE windows DROP COLUMN IF EXISTS id;
ALTER TABLE windows ADD PRIMARY KEY (c_id);

-- Step 5: Add new foreign key constraints (now referencing c_id)
-- ============================================================================

-- Projects references
ALTER TABLE projects ADD CONSTRAINT projects_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES contractors(c_id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(c_id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT projects_price_list_id_fkey
  FOREIGN KEY (price_list_id) REFERENCES price_lists(c_id) ON DELETE SET NULL;

-- Rooms reference projects
ALTER TABLE rooms ADD CONSTRAINT rooms_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;

-- Receipts reference projects
ALTER TABLE receipts ADD CONSTRAINT receipts_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;

-- Invoices references
ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(c_id) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES contractors(c_id) ON DELETE SET NULL;

-- All work item tables reference rooms
ALTER TABLE brick_partitions ADD CONSTRAINT brick_partitions_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE brick_load_bearing_walls ADD CONSTRAINT brick_load_bearing_walls_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plasterboarding_partitions ADD CONSTRAINT plasterboarding_partitions_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plasterboarding_offset_walls ADD CONSTRAINT plasterboarding_offset_walls_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plasterboarding_ceilings ADD CONSTRAINT plasterboarding_ceilings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE netting_walls ADD CONSTRAINT netting_walls_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE netting_ceilings ADD CONSTRAINT netting_ceilings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plastering_walls ADD CONSTRAINT plastering_walls_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plastering_ceilings ADD CONSTRAINT plastering_ceilings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE facade_plasterings ADD CONSTRAINT facade_plasterings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plastering_of_window_sashes ADD CONSTRAINT plastering_of_window_sashes_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE painting_walls ADD CONSTRAINT painting_walls_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE painting_ceilings ADD CONSTRAINT painting_ceilings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE levellings ADD CONSTRAINT levellings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE tile_ceramics ADD CONSTRAINT tile_ceramics_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE paving_ceramics ADD CONSTRAINT paving_ceramics_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE laying_floating_floors ADD CONSTRAINT laying_floating_floors_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE wirings ADD CONSTRAINT wirings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE plumbings ADD CONSTRAINT plumbings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE installation_of_sanitaries ADD CONSTRAINT installation_of_sanitaries_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE installation_of_corner_beads ADD CONSTRAINT installation_of_corner_beads_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE installation_of_door_jambs ADD CONSTRAINT installation_of_door_jambs_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE window_installations ADD CONSTRAINT window_installations_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE demolitions ADD CONSTRAINT demolitions_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE groutings ADD CONSTRAINT groutings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE penetration_coatings ADD CONSTRAINT penetration_coatings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE siliconings ADD CONSTRAINT siliconings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE custom_works ADD CONSTRAINT custom_works_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE custom_materials ADD CONSTRAINT custom_materials_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE scaffoldings ADD CONSTRAINT scaffoldings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE core_drills ADD CONSTRAINT core_drills_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE tool_rentals ADD CONSTRAINT tool_rentals_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;
ALTER TABLE skirting_of_floating_floors ADD CONSTRAINT skirting_of_floating_floors_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE;

-- Doors reference work item tables (optional FKs)
ALTER TABLE doors ADD CONSTRAINT doors_brick_load_bearing_wall_id_fkey
  FOREIGN KEY (brick_load_bearing_wall_id) REFERENCES brick_load_bearing_walls(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_brick_partition_id_fkey
  FOREIGN KEY (brick_partition_id) REFERENCES brick_partitions(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_facade_plastering_id_fkey
  FOREIGN KEY (facade_plastering_id) REFERENCES facade_plasterings(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_netting_wall_id_fkey
  FOREIGN KEY (netting_wall_id) REFERENCES netting_walls(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_plasterboarding_offset_wall_id_fkey
  FOREIGN KEY (plasterboarding_offset_wall_id) REFERENCES plasterboarding_offset_walls(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_plasterboarding_partition_id_fkey
  FOREIGN KEY (plasterboarding_partition_id) REFERENCES plasterboarding_partitions(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_plastering_wall_id_fkey
  FOREIGN KEY (plastering_wall_id) REFERENCES plastering_walls(c_id) ON DELETE CASCADE;
ALTER TABLE doors ADD CONSTRAINT doors_tile_ceramic_id_fkey
  FOREIGN KEY (tile_ceramic_id) REFERENCES tile_ceramics(c_id) ON DELETE CASCADE;

-- Windows reference work item tables (optional FKs)
ALTER TABLE windows ADD CONSTRAINT windows_brick_load_bearing_wall_id_fkey
  FOREIGN KEY (brick_load_bearing_wall_id) REFERENCES brick_load_bearing_walls(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_brick_partition_id_fkey
  FOREIGN KEY (brick_partition_id) REFERENCES brick_partitions(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_facade_plastering_id_fkey
  FOREIGN KEY (facade_plastering_id) REFERENCES facade_plasterings(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_netting_wall_id_fkey
  FOREIGN KEY (netting_wall_id) REFERENCES netting_walls(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_plasterboarding_ceiling_id_fkey
  FOREIGN KEY (plasterboarding_ceiling_id) REFERENCES plasterboarding_ceilings(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_plasterboarding_offset_wall_id_fkey
  FOREIGN KEY (plasterboarding_offset_wall_id) REFERENCES plasterboarding_offset_walls(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_plasterboarding_partition_id_fkey
  FOREIGN KEY (plasterboarding_partition_id) REFERENCES plasterboarding_partitions(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_plastering_wall_id_fkey
  FOREIGN KEY (plastering_wall_id) REFERENCES plastering_walls(c_id) ON DELETE CASCADE;
ALTER TABLE windows ADD CONSTRAINT windows_tile_ceramic_id_fkey
  FOREIGN KEY (tile_ceramic_id) REFERENCES tile_ceramics(c_id) ON DELETE CASCADE;

-- Step 6: Update RLS policies if needed (they might reference 'id')
-- ============================================================================
-- Most RLS policies use user_id, not the table's id column, so they should still work.
-- But if any policy references 'id', it needs to be updated to 'c_id'.

-- Step 7: Update the get_room_items RPC function if it exists
-- ============================================================================
-- Check if the function references 'id' and update to 'c_id' if needed

-- Done!
-- ============================================================================
-- After running this migration:
-- 1. All tables now use c_id as PRIMARY KEY
-- 2. All FK relationships reference c_id
-- 3. Desktop app needs to be updated to use c_id instead of id
-- 4. iOS app translation layer can be removed (it already uses c_id)
-- ============================================================================
