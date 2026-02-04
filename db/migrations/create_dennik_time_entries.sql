-- Migration: Create dennik_time_entries table for time tracking
-- This table stores time entries for dennik-enabled projects

-- Create dennik_time_entries table
CREATE TABLE IF NOT EXISTS public.dennik_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(c_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours_worked DECIMAL(5,2), -- Calculated: (end_time - start_time) in hours
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_dennik_time_entries_project_id ON public.dennik_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_dennik_time_entries_user_id ON public.dennik_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dennik_time_entries_date ON public.dennik_time_entries(date);
CREATE INDEX IF NOT EXISTS idx_dennik_time_entries_project_user_date ON public.dennik_time_entries(project_id, user_id, date);

-- Enable RLS
ALTER TABLE public.dennik_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dennik_time_entries

-- Users can view time entries if they are the project owner OR a project member
CREATE POLICY "dennik_time_entries_select" ON public.dennik_time_entries
FOR SELECT
USING (
  -- User owns the time entry
  user_id = auth.uid() OR
  -- User is the project owner
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = dennik_time_entries.project_id
    AND user_id = auth.uid()
  ) OR
  -- User is a project member
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = dennik_time_entries.project_id
    AND user_id = auth.uid()
  )
);

-- Project members can create time entries
CREATE POLICY "dennik_time_entries_insert" ON public.dennik_time_entries
FOR INSERT
WITH CHECK (
  -- User is creating their own entry
  user_id = auth.uid() AND (
    -- User is the project owner
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id
      AND user_id = auth.uid()
    ) OR
    -- User is a project member
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = dennik_time_entries.project_id
      AND user_id = auth.uid()
    )
  )
);

-- Users can update their own time entries
CREATE POLICY "dennik_time_entries_update" ON public.dennik_time_entries
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Users can delete their own entries, or project owner can delete any entry
CREATE POLICY "dennik_time_entries_delete" ON public.dennik_time_entries
FOR DELETE
USING (
  -- User owns the entry
  user_id = auth.uid() OR
  -- User is the project owner
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id
    AND user_id = auth.uid()
  )
);

-- Function to automatically calculate hours_worked when end_time is set
CREATE OR REPLACE FUNCTION calculate_hours_worked()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.hours_worked := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate hours_worked automatically
DROP TRIGGER IF EXISTS trigger_calculate_hours_worked ON public.dennik_time_entries;
CREATE TRIGGER trigger_calculate_hours_worked
BEFORE INSERT OR UPDATE ON public.dennik_time_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_hours_worked();
