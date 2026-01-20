-- ============================================================================
-- PERFORMANCE OPTIMIZATION FOR DELTA SYNC
-- ============================================================================
-- This migration adds indexes critical for iOS delta sync performance.
-- Without these indexes, queries like "WHERE updated_at > lastSyncDate"
-- require full table scans instead of efficient index seeks.
-- ============================================================================

-- ============================================================================
-- SECTION 1: COMPOUND INDEXES FOR DELTA SYNC
-- ============================================================================
-- These indexes support queries that filter by user_id AND sort/filter by updated_at
-- The compound index (user_id, updated_at DESC) is critical for:
-- - iOS delta sync: WHERE user_id = X AND updated_at > lastSyncDate
-- - Efficient ordering of results by most recent first

-- Projects: Critical for project delta sync
CREATE INDEX IF NOT EXISTS idx_projects_user_updated
ON projects(user_id, updated_at DESC);

-- Clients: For client sync filtering
CREATE INDEX IF NOT EXISTS idx_clients_user_updated
ON clients(user_id, updated_at DESC);

-- Contractors: For contractor sync filtering
CREATE INDEX IF NOT EXISTS idx_contractors_user_updated
ON contractors(user_id, updated_at DESC);

-- Invoices: For invoice sync filtering
CREATE INDEX IF NOT EXISTS idx_invoices_user_updated
ON invoices(user_id, updated_at DESC);

-- Rooms: Compound index with project_id for room-level delta sync
CREATE INDEX IF NOT EXISTS idx_rooms_project_updated
ON rooms(project_id, updated_at DESC);

-- Rooms: User-level index for cross-project room queries
CREATE INDEX IF NOT EXISTS idx_rooms_user_updated
ON rooms(user_id, updated_at DESC);

-- Receipts: For receipt sync
CREATE INDEX IF NOT EXISTS idx_receipts_user_updated
ON receipts(user_id, updated_at DESC);

-- Price Lists: For price list sync
CREATE INDEX IF NOT EXISTS idx_price_lists_user_updated
ON price_lists(user_id, updated_at DESC);

-- Invoice Settings: For settings sync
CREATE INDEX IF NOT EXISTS idx_invoice_settings_user_updated
ON invoice_settings(user_id, updated_at DESC);

-- History Events: For history sync
CREATE INDEX IF NOT EXISTS idx_history_events_project_updated
ON history_events(project_id, updated_at DESC);

-- Doors: For door sync (parent-based)
CREATE INDEX IF NOT EXISTS idx_doors_user_updated
ON doors(user_id, updated_at DESC);

-- Windows: For window sync (parent-based)
CREATE INDEX IF NOT EXISTS idx_windows_user_updated
ON windows(user_id, updated_at DESC);

-- ============================================================================
-- SECTION 2: SOFT DELETE PARTIAL INDEXES
-- ============================================================================
-- Partial indexes for soft-deleted items - only index rows where is_deleted = true
-- This makes soft-delete filtering extremely fast

CREATE INDEX IF NOT EXISTS idx_projects_soft_deleted
ON projects(user_id, deleted_at DESC)
WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_clients_soft_deleted
ON clients(user_id, deleted_at DESC)
WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_contractors_soft_deleted
ON contractors(user_id, deleted_at DESC)
WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_invoices_soft_deleted
ON invoices(user_id, deleted_at DESC)
WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_rooms_soft_deleted
ON rooms(project_id, deleted_at DESC)
WHERE is_deleted = true;

-- ============================================================================
-- SECTION 3: WORK ITEM TABLE INDEXES
-- ============================================================================
-- All 36 work item tables need room_id indexes for efficient RPC queries
-- Also adding user_id indexes for potential cross-room queries

-- Function to create indexes on all work item tables
DO $$
DECLARE
    table_name text;
    work_item_tables text[] := ARRAY[
        'brick_partitions',
        'brick_load_bearing_walls',
        'bricklaying_of_partitions',
        'bricklaying_of_load_bearing_masonry',
        'plastering_walls',
        'plastering_ceilings',
        'plastering_of_reveal',
        'netting_walls',
        'netting_ceilings',
        'painting_walls',
        'painting_ceilings',
        'levelling',
        'penetration_coat',
        'tiles_ceramic',
        'paving_ceramic',
        'grouting',
        'siliconing',
        'floating_floor_laying',
        'skirting_floating_floor',
        'plasterboard_partitions',
        'plasterboard_ceilings',
        'plasterboard_offset_walls',
        'installation_of_corner_bead',
        'installation_of_lined_door_frame',
        'installation_of_sanitary',
        'electrical_installation_work',
        'plumbing_work',
        'demolition_work',
        'window_installations',
        'facade_plastering',
        'custom_works',
        'custom_materials'
    ];
BEGIN
    FOREACH table_name IN ARRAY work_item_tables LOOP
        -- Check if table exists before creating index
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = table_name) THEN
            -- Create room_id index for RPC queries
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_room_id ON %I(room_id)', table_name, table_name);

            -- Create user_id + updated_at compound index for delta sync
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_user_updated ON %I(user_id, updated_at DESC)', table_name, table_name);

            RAISE NOTICE 'Created indexes for table: %', table_name;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 4: ANALYZE ALL TABLES
-- ============================================================================
-- Update PostgreSQL statistics for query planner optimization

ANALYZE projects;
ANALYZE clients;
ANALYZE contractors;
ANALYZE invoices;
ANALYZE rooms;
ANALYZE receipts;
ANALYZE price_lists;
ANALYZE invoice_settings;
ANALYZE history_events;
ANALYZE doors;
ANALYZE windows;

-- Analyze work item tables
DO $$
DECLARE
    table_name text;
    work_item_tables text[] := ARRAY[
        'brick_partitions', 'brick_load_bearing_walls', 'bricklaying_of_partitions',
        'bricklaying_of_load_bearing_masonry', 'plastering_walls', 'plastering_ceilings',
        'plastering_of_reveal', 'netting_walls', 'netting_ceilings', 'painting_walls',
        'painting_ceilings', 'levelling', 'penetration_coat', 'tiles_ceramic',
        'paving_ceramic', 'grouting', 'siliconing', 'floating_floor_laying',
        'skirting_floating_floor', 'plasterboard_partitions', 'plasterboard_ceilings',
        'plasterboard_offset_walls', 'installation_of_corner_bead',
        'installation_of_lined_door_frame', 'installation_of_sanitary',
        'electrical_installation_work', 'plumbing_work', 'demolition_work',
        'window_installations', 'facade_plastering', 'custom_works', 'custom_materials'
    ];
BEGIN
    FOREACH table_name IN ARRAY work_item_tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = table_name) THEN
            EXECUTE format('ANALYZE %I', table_name);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- EXPECTED PERFORMANCE IMPROVEMENT:
-- ============================================================================
-- Before: Delta sync queries do sequential table scans O(n)
-- After:  Delta sync queries use index seeks O(log n)
--
-- Example: Table with 10,000 rows, fetching changes from last hour (10 rows):
-- - Without index: Scans all 10,000 rows
-- - With index:    Directly seeks to 10 changed rows
--
-- Expected improvement: 5-10x faster delta sync queries
-- ============================================================================
