-- Add introductory_note and project_name_override to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS introductory_note TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_name_override TEXT;
