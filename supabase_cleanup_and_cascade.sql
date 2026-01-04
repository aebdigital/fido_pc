-- ============================================
-- SUPABASE CLEANUP AND CASCADE DELETE SCRIPT
-- For Fido Building Calcul
-- ============================================
-- Run this in your Supabase SQL Editor

-- ============================================
-- PART 1: CLEANUP ORPHANED DATA
-- ============================================

-- 1.1 Delete orphaned projects (empty name)
DELETE FROM projects WHERE name IS NULL OR name = '';

-- 1.2 Delete orphaned receipts (no project_id or project doesn't exist)
DELETE FROM receipts WHERE project_id IS NULL;
DELETE FROM receipts WHERE project_id NOT IN (SELECT c_id FROM projects);

-- 1.3 Delete orphaned rooms (project doesn't exist)
DELETE FROM rooms WHERE project_id NOT IN (SELECT c_id FROM projects);

-- 1.4 Delete orphaned invoices (project doesn't exist - optional, as invoices use SET NULL)
-- Uncomment if you want to remove invoices with no project
-- DELETE FROM invoices WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT c_id FROM projects);


-- ============================================
-- PART 2: UPDATE FOREIGN KEY CONSTRAINTS
-- Add CASCADE DELETE to all project-related tables
-- ============================================

-- 2.1 Update invoices to CASCADE DELETE (instead of SET NULL)
-- First drop the existing constraint, then add the new one
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;

-- 2.2 Ensure rooms have CASCADE DELETE
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_project_id_fkey;
ALTER TABLE rooms ADD CONSTRAINT rooms_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;

-- 2.3 Ensure receipts have CASCADE DELETE
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_project_id_fkey;
ALTER TABLE receipts ADD CONSTRAINT receipts_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;

-- 2.4 Update price_lists link (if using project_id)
ALTER TABLE price_lists DROP CONSTRAINT IF EXISTS price_lists_project_id_fkey;
-- Only add if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_lists' AND column_name = 'project_id') THEN
        ALTER TABLE price_lists ADD CONSTRAINT price_lists_project_id_fkey
            FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2.5 Update history_events (if exists)
ALTER TABLE history_events DROP CONSTRAINT IF EXISTS history_events_project_id_fkey;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'history_events' AND column_name = 'project_id') THEN
        ALTER TABLE history_events ADD CONSTRAINT history_events_project_id_fkey
            FOREIGN KEY (project_id) REFERENCES projects(c_id) ON DELETE CASCADE;
    END IF;
END $$;


-- ============================================
-- PART 3: UPDATE WORK TYPE TABLES
-- All work types reference room_id, rooms reference project_id
-- Rooms already cascade from projects, so work types need to cascade from rooms
-- ============================================

-- Helper function to add cascade delete to work type tables
DO $$
DECLARE
    work_table TEXT;
    work_tables TEXT[] := ARRAY[
        'brick_load_bearing_walls',
        'brick_partitions',
        'core_drills',
        'custom_materials',
        'custom_works',
        'demolitions',
        'doors',
        'facade_plasterings',
        'groutings',
        'installation_of_corner_beads',
        'installation_of_door_jambs',
        'installation_of_sanitaries',
        'laying_floating_floors',
        'levellings',
        'netting_ceilings',
        'netting_walls',
        'painting_ceilings',
        'painting_walls',
        'paving_ceramics',
        'penetration_coatings',
        'plasterboarding_ceilings',
        'plasterboarding_offset_walls',
        'plasterboarding_partitions',
        'plastering_ceilings',
        'plastering_of_window_sashes',
        'plastering_walls',
        'plumbings',
        'scaffoldings',
        'siliconings',
        'skirting_of_floating_floors',
        'tile_ceramics',
        'tool_rentals',
        'window_installations',
        'windows',
        'wirings'
    ];
BEGIN
    FOREACH work_table IN ARRAY work_tables
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = work_table) THEN
            -- Drop existing constraint
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                work_table, work_table || '_room_id_fkey');

            -- Check if room_id column exists
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = work_table AND column_name = 'room_id') THEN
                -- Add new constraint with CASCADE
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I
                    FOREIGN KEY (room_id) REFERENCES rooms(c_id) ON DELETE CASCADE',
                    work_table, work_table || '_room_id_fkey');
                RAISE NOTICE 'Updated cascade delete for %', work_table;
            END IF;
        END IF;
    END LOOP;
END $$;


-- ============================================
-- PART 4: VERIFY SETUP
-- ============================================

-- Check orphaned projects count
SELECT 'Orphaned projects' as check_type, COUNT(*) as count
FROM projects WHERE name IS NULL OR name = '';

-- Check orphaned receipts count
SELECT 'Orphaned receipts (no project_id)' as check_type, COUNT(*) as count
FROM receipts WHERE project_id IS NULL;

-- Check orphaned rooms count
SELECT 'Orphaned rooms' as check_type, COUNT(*) as count
FROM rooms WHERE project_id NOT IN (SELECT c_id FROM projects WHERE c_id IS NOT NULL);

-- List all foreign key constraints for verification
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;
