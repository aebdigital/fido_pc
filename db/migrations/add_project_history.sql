ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_history JSONB DEFAULT '[]'::jsonb;
