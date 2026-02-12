-- Missing secondary indexes for query optimization
-- These complement the existing (user_id, updated_at) indexes from optimize_delta_sync_performance.sql

-- Invoices sorted by creation date (used in project invoice list view)
CREATE INDEX IF NOT EXISTS idx_invoices_project_date_created
ON invoices(project_id, date_created DESC);

-- Receipts sorted by receipt date (used in project receipt list view)
CREATE INDEX IF NOT EXISTS idx_receipts_project_receipt_date
ON receipts(project_id, receipt_date DESC);

-- Price list lookup by contractor (general price list query uses user_id + contractor_id + is_general)
CREATE INDEX IF NOT EXISTS idx_price_lists_user_contractor_general
ON price_lists(user_id, contractor_id) WHERE is_general = true;

-- Price list lookup by project (project-specific price list)
CREATE INDEX IF NOT EXISTS idx_price_lists_user_project_specific
ON price_lists(user_id, project_id) WHERE is_general = false;

-- Active timer lookup (global — checks all projects for user's running timer)
CREATE INDEX IF NOT EXISTS idx_dennik_time_entries_user_active
ON dennik_time_entries(user_id, start_time DESC) WHERE end_time IS NULL;

-- Job assignments by user and project (team task queries)
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id
ON job_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_project_id
ON job_assignments(project_id);

-- Team members by user/status (active member lookup) and team/user compound
CREATE INDEX IF NOT EXISTS idx_team_members_user_status
ON team_members(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_team_members_team_user
ON team_members(team_id, user_id);
