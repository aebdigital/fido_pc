-- Add price_list_snapshot column to projects table
-- This stores a JSON snapshot of the price list at the time the project was created

ALTER TABLE projects ADD COLUMN IF NOT EXISTS price_list_snapshot JSONB;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN projects.price_list_snapshot IS 'JSON snapshot of the price list at project creation time';
