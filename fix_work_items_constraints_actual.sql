-- Remove unique constraints on c_id from all work item tables
-- Based on actual tables found in your database

DO $$
DECLARE
    table_name text;
    constraint_name text;
BEGIN
    -- List of actual work item tables from your database
    FOR table_name IN
        SELECT unnest(ARRAY[
            'brick_load_bearing_walls',
            'brick_partitions',
            'core_drills',
            'custom_works',
            'demolitions',
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
            'wirings'
        ])
    LOOP
        -- Find and drop c_id unique constraint if it exists
        BEGIN
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
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table % does not exist, skipping', table_name;
        END;
    END LOOP;
END $$;

-- Verify: Check if any c_id unique constraints remain on work item tables
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE '%c_id%'
AND contype = 'u'
AND conrelid::regclass::text NOT IN ('projects', 'clients', 'contractors', 'invoices', 'rooms')
ORDER BY table_name;
