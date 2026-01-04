-- Add project_id to price_lists table
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(c_id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_price_lists_project_id ON price_lists(project_id);

-- Standardize Project Category: 'companies' -> 'firms'
UPDATE projects SET category = 'firms' WHERE category = 'companies';
