-- Quick fix: Add work_items JSONB column to rooms table
-- This allows storing work items directly in the room as JSON

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS work_items JSONB DEFAULT '[]'::jsonb;

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rooms'
AND column_name = 'work_items';
