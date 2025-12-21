-- Check current constraints on projects table
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass;

-- Drop the incorrect unique constraint on c_id
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_c_id_key;

-- Verify the constraint is removed
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass;
