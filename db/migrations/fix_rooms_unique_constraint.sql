-- Fix: Remove incorrect UNIQUE constraint on rooms.c_id
-- The error "duplicate key value violates unique constraint rooms_c_id_key"
-- means c_id has a UNIQUE constraint, but a contractor should have MANY rooms

-- First, check if the constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'rooms'
  AND constraint_name LIKE '%c_id%';

-- Drop the unique constraint on c_id (if it exists)
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_c_id_key;

-- Verify the constraint is gone
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'rooms'
  AND constraint_name LIKE '%c_id%';

-- The rooms table should allow:
-- - One contractor (c_id) to have MANY rooms
-- - Each room must have a contractor (NOT NULL)
-- This is correct: c_id is NOT NULL but NOT UNIQUE
