-- Migration: Create project_members table for project sharing
-- This replaces team-based sharing with direct project sharing

-- Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(c_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' or 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_members
-- Users can view members if they are the project owner OR they are a member themselves
CREATE POLICY "project_members_select" ON public.project_members
FOR SELECT
USING (
  -- User is a member of this project
  user_id = auth.uid() OR
  -- User is the owner of this project
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_members.project_id
    AND user_id = auth.uid()
  )
);

-- Only project owners can add members
CREATE POLICY "project_members_insert" ON public.project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id
    AND user_id = auth.uid()
  )
);

-- Only project owners can remove members
CREATE POLICY "project_members_delete" ON public.project_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id
    AND user_id = auth.uid()
  )
);

-- Add is_dennik_enabled column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_dennik_enabled BOOLEAN DEFAULT FALSE;

-- Create index for filtering dennik projects
CREATE INDEX IF NOT EXISTS idx_projects_dennik_enabled ON public.projects(is_dennik_enabled) WHERE is_dennik_enabled = TRUE;
