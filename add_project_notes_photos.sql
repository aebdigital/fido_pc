-- Migration to add detail_notes and photos columns to projects table
-- Run this in Supabase SQL Editor

-- Add detail_notes column for project notes
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS detail_notes TEXT;

-- Add photos column for storing photo data as JSONB
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN projects.detail_notes IS 'Project notes/comments entered by the user';
COMMENT ON COLUMN projects.photos IS 'Array of photo objects with id, url (base64), name, and createdAt';
