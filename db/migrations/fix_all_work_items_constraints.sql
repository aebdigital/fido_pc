-- Remove unique constraints on c_id from all work item tables
-- These constraints are preventing multiple work items per contractor

-- Get the table names from your database structure
DO $$
DECLARE
    table_name text;
    constraint_name text;
BEGIN
    -- List of all work item tables (based on PROPERTY_TO_TABLE mapping)
    FOR table_name IN
        SELECT unnest(ARRAY[
            'demolitions',
            'wiring',
            'plumbing',
            'brick_partitions',
            'brick_load_bearing_walls',
            'plasterboarding_partitions',
            'plasterboarding_offset_walls',
            'plasterboarding_ceilings',
            'netting',
            'plastering_walls',
            'plastering_ceilings',
            'facade_plasterings',
            'corner_beads',
            'window_sash_plasterings',
            'penetration_coatings',
            'painting_walls',
            'painting_ceilings',
            'levellings',
            'floating_floors',
            'laying_floating_floors',
            'skirtings',
            'tiling',
            'jolly_edgings',
            'paving',
            'plinths',
            'large_formats',
            'groutings',
            'siliconings',
            'window_installations',
            'door_jamb_installations',
            'sanitary_installations',
            'scaffoldings',
            'scaffolding_assemblies',
            'core_drills',
            'tool_rentals',
            'custom_works',
            'commutes'
        ])
    LOOP
        -- Find and drop c_id unique constraint if it exists
        FOR constraint_name IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = table_name::regclass
            AND conname LIKE '%c_id%'
            AND contype = 'u'  -- unique constraint
        LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
            RAISE NOTICE 'Dropped constraint % from table %', constraint_name, table_name;
        END LOOP;
    END LOOP;
END $$;

-- Verify: Check if any c_id unique constraints remain
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conname LIKE '%c_id%'
AND contype = 'u'
ORDER BY table_name;
