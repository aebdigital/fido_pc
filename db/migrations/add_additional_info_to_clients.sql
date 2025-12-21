-- Add additional_info column to clients table
-- Run this in your Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Verify the change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
AND column_name = 'additional_info';
