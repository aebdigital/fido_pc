-- Add indexes to improve query performance and prevent timeouts

-- Projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Clients table
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Contractors table
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON contractors(user_id);

-- Rooms table
CREATE INDEX IF NOT EXISTS idx_rooms_project_id ON rooms(project_id);

-- Analyze tables to update statistics
ANALYZE projects;
ANALYZE invoices;
ANALYZE clients;
ANALYZE contractors;
ANALYZE rooms;
