-- Add missing columns to job_assignments table for finance access and job naming
ALTER TABLE public.job_assignments 
ADD COLUMN IF NOT EXISTS has_finance_access BOOLEAN DEFAULT FALSE;

ALTER TABLE public.job_assignments 
ADD COLUMN IF NOT EXISTS job_name TEXT;

-- Update existing assignments to have finance access by default if needed (optional)
-- UPDATE public.job_assignments SET has_finance_access = true WHERE has_finance_access IS NULL;
