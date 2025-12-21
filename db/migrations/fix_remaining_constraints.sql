-- Fix remaining incorrect unique constraints on c_id

-- Drop constraint from receipts table
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_c_id_key;

-- Drop constraint from custom_materials table
ALTER TABLE custom_materials DROP CONSTRAINT IF EXISTS custom_materials_c_id_key;

-- Drop constraint from doors table
ALTER TABLE doors DROP CONSTRAINT IF EXISTS doors_c_id_key;

-- Drop constraint from windows table
ALTER TABLE windows DROP CONSTRAINT IF EXISTS windows_c_id_key;

-- Verify: Check if constraints were removed
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE '%c_id%'
AND contype = 'u'
AND conrelid::regclass::text IN ('receipts', 'custom_materials', 'doors', 'windows')
ORDER BY table_name;

-- This should return empty if all constraints were successfully removed
