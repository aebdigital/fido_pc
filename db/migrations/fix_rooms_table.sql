-- Fix rooms table by adding missing columns needed for calculations
-- Run this in Supabase SQL Editor

-- Add room_type column
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_type text;

-- Add dimension columns needed for area calculations
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS floor_length numeric DEFAULT 0;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS floor_width numeric DEFAULT 0;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS wall_height numeric DEFAULT 0;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rooms'
ORDER BY ordinal_position;
