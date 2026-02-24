-- Add missing invoice columns for document type sync between iOS and Desktop
-- These columns are referenced in code but were never added via migration.
-- Without invoice_type, all invoices default to 'regular' (Faktúra) on the receiving device.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'regular';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_settings JSONB DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS return_reason TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_number TEXT DEFAULT NULL;
