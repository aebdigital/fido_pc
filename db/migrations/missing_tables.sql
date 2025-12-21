-- =====================================================
-- MISSING TABLES THAT NEED TO BE CREATED IN SUPABASE
-- Run these commands in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    c_id UUID NOT NULL, -- contractor_id

    -- Project details
    name TEXT NOT NULL,
    category TEXT, -- 'Flats', 'Houses', 'Companies', 'Cottages'
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

    -- Project status
    status TEXT DEFAULT 'not sent', -- 'not sent', 'sent', 'archived'
    is_archived BOOLEAN DEFAULT FALSE,

    -- Invoice relation
    has_invoice BOOLEAN DEFAULT FALSE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_status TEXT,

    -- Price list snapshot (stored as JSONB)
    price_list_snapshot JSONB,

    -- Project-specific price overrides (stored as JSONB)
    price_overrides JSONB,

    -- Timestamps
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_c_id ON projects(c_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- =====================================================
-- ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    c_id UUID NOT NULL, -- contractor_id
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Room details
    name TEXT NOT NULL,
    room_type TEXT, -- 'Hallway', 'Toilet', 'Bathroom', 'Kitchen', etc.

    -- Room dimensions
    floor_length NUMERIC DEFAULT 0,
    floor_width NUMERIC DEFAULT 0,
    wall_height NUMERIC DEFAULT 0,

    -- Timestamps
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_project_id ON rooms(project_id);

-- =====================================================
-- PRICE_LISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    c_id UUID NOT NULL, -- contractor_id (one price list per contractor)

    -- Price list data stored as JSONB
    -- Structure: { work: [], material: [], installations: [], others: [] }
    data JSONB NOT NULL DEFAULT '{"work":[],"material":[],"installations":[],"others":[]}',

    -- Timestamps
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_lists_user_id_c_id_key'
    ) THEN
        ALTER TABLE price_lists ADD CONSTRAINT price_lists_user_id_c_id_key UNIQUE(user_id, c_id);
    END IF;
END $$;

-- Create index for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_price_lists_user_id ON price_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_c_id ON price_lists(c_id);

-- =====================================================
-- UPDATED INVOICES TABLE
-- Add foreign key reference if not exists
-- =====================================================
-- Make sure invoice has project_id reference
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- Automatically update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables (DROP first to avoid "already exists" errors)
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_price_lists_updated_at ON price_lists;
CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON price_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Apply this trigger to all other tables as well if not already done
