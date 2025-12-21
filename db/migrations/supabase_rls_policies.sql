-- =====================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Run these commands in your Supabase SQL Editor
-- =====================================================

-- Helper function to safely enable RLS only if table exists
DO $$
DECLARE
    table_name TEXT;
    tables_to_enable TEXT[] := ARRAY[
        'contractors', 'clients', 'projects', 'rooms', 'invoices',
        'invoice_settings', 'price_lists',
        'brick_load_bearing_walls', 'brick_partitions', 'core_drills',
        'custom_materials', 'custom_works', 'demolitions', 'doors',
        'facade_plasterings', 'groutings', 'installation_of_corner_beads',
        'installation_of_door_jambs', 'installation_of_sanitaries',
        'laying_floating_floors', 'levellings', 'netting_ceilings',
        'netting_walls', 'painting_ceilings', 'painting_walls',
        'plasterboarding_ceilings', 'plasterboarding_offset_walls',
        'plasterboarding_partitions', 'plastering_ceilings', 'plastering_walls',
        'plumbings', 'preparatories', 'rent_scaffoldings', 'rent_tools',
        'suspended_ceilings', 'tile_ceramics', 'tile_pavings', 'tile_sockets',
        'windows', 'wirings'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_enable
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Enabled RLS on table: %', table_name;
        ELSE
            RAISE NOTICE 'Skipping table (does not exist): %', table_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- CONTRACTORS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own contractors" ON contractors;
CREATE POLICY "Users can view their own contractors"
ON contractors FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contractors" ON contractors;
CREATE POLICY "Users can insert their own contractors"
ON contractors FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contractors" ON contractors;
CREATE POLICY "Users can update their own contractors"
ON contractors FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contractors" ON contractors;
CREATE POLICY "Users can delete their own contractors"
ON contractors FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
CREATE POLICY "Users can view their own clients"
ON clients FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
CREATE POLICY "Users can insert their own clients"
ON clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;
CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- ROOMS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own rooms" ON rooms;
CREATE POLICY "Users can view their own rooms"
ON rooms FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rooms" ON rooms;
CREATE POLICY "Users can insert their own rooms"
ON rooms FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rooms" ON rooms;
CREATE POLICY "Users can update their own rooms"
ON rooms FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rooms" ON rooms;
CREATE POLICY "Users can delete their own rooms"
ON rooms FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices"
ON invoices FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
CREATE POLICY "Users can insert their own invoices"
ON invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
CREATE POLICY "Users can update their own invoices"
ON invoices FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
CREATE POLICY "Users can delete their own invoices"
ON invoices FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- PRICE LISTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own price lists" ON price_lists;
CREATE POLICY "Users can view their own price lists"
ON price_lists FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own price lists" ON price_lists;
CREATE POLICY "Users can insert their own price lists"
ON price_lists FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own price lists" ON price_lists;
CREATE POLICY "Users can update their own price lists"
ON price_lists FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own price lists" ON price_lists;
CREATE POLICY "Users can delete their own price lists"
ON price_lists FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- INVOICE SETTINGS POLICIES
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_settings') THEN
        DROP POLICY IF EXISTS "Users can view their own invoice settings" ON invoice_settings;
        CREATE POLICY "Users can view their own invoice settings"
        ON invoice_settings FOR SELECT
        USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own invoice settings" ON invoice_settings;
        CREATE POLICY "Users can insert their own invoice settings"
        ON invoice_settings FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own invoice settings" ON invoice_settings;
        CREATE POLICY "Users can update their own invoice settings"
        ON invoice_settings FOR UPDATE
        USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own invoice settings" ON invoice_settings;
        CREATE POLICY "Users can delete their own invoice settings"
        ON invoice_settings FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- =====================================================
-- WORK ITEM TABLES POLICIES
-- Only create policies for tables that exist
-- =====================================================

DO $$
DECLARE
    table_name TEXT;
    work_tables TEXT[] := ARRAY[
        'brick_load_bearing_walls', 'brick_partitions', 'core_drills',
        'custom_materials', 'custom_works', 'demolitions', 'doors',
        'facade_plasterings', 'groutings', 'installation_of_corner_beads',
        'installation_of_door_jambs', 'installation_of_sanitaries',
        'laying_floating_floors', 'levellings', 'netting_ceilings',
        'netting_walls', 'painting_ceilings', 'painting_walls',
        'plasterboarding_ceilings', 'plasterboarding_offset_walls',
        'plasterboarding_partitions', 'plastering_ceilings', 'plastering_walls',
        'plumbings', 'preparatories', 'rent_scaffoldings', 'rent_tools',
        'suspended_ceilings', 'tile_ceramics', 'tile_pavings', 'tile_sockets',
        'windows', 'wirings'
    ];
BEGIN
    FOREACH table_name IN ARRAY work_tables
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            -- Drop existing policies first
            EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %I" ON %I', table_name, table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own %I" ON %I', table_name, table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %I" ON %I', table_name, table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %I" ON %I', table_name, table_name);

            -- Create new policies
            EXECUTE format('CREATE POLICY "Users can view their own %I" ON %I FOR SELECT USING (auth.uid() = user_id)', table_name, table_name);
            EXECUTE format('CREATE POLICY "Users can insert their own %I" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', table_name, table_name);
            EXECUTE format('CREATE POLICY "Users can update their own %I" ON %I FOR UPDATE USING (auth.uid() = user_id)', table_name, table_name);
            EXECUTE format('CREATE POLICY "Users can delete their own %I" ON %I FOR DELETE USING (auth.uid() = user_id)', table_name, table_name);

            RAISE NOTICE 'Created RLS policies for table: %', table_name;
        ELSE
            RAISE NOTICE 'Skipping policies for table (does not exist): %', table_name;
        END IF;
    END LOOP;
END $$;
