-- Remove unique constraints on c_id from all work item tables
-- This version checks if tables exist before trying to drop constraints

DO $$
DECLARE
    table_record RECORD;
    constraint_name text;
BEGIN
    -- Find all tables that have a c_id column (these are likely work item tables)
    FOR table_record IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'c_id'
        AND table_schema = 'public'
        AND table_name NOT IN ('projects', 'clients', 'contractors', 'invoices', 'rooms', 'price_lists', 'invoice_settings')
    LOOP
        -- Find and drop c_id unique constraint if it exists
        FOR constraint_name IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = table_record.table_name::regclass
            AND conname LIKE '%c_id%'
            AND contype = 'u'  -- unique constraint
        LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_record.table_name, constraint_name);
            RAISE NOTICE 'Dropped constraint % from table %', constraint_name, table_record.table_name;
        END LOOP;
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
