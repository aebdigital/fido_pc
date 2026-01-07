-- Migration: Add all tables to supabase_realtime publication
-- This enables real-time Postgres Changes for all tables
-- Run this in the Supabase SQL Editor

-- First, check current publication status
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add all main tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.contractors;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.price_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.history_events;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.invoice_settings;

-- Add all work type tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.brick_load_bearing_walls;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.brick_partitions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.core_drills;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.custom_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.custom_works;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.demolitions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.doors;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.facade_plasterings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.groutings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.installation_of_corner_beads;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.installation_of_door_jambs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.installation_of_sanitaries;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.laying_floating_floors;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.levellings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.netting_ceilings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.netting_walls;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.painting_ceilings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.painting_walls;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.paving_ceramics;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.penetration_coatings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plasterboarding_ceilings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plasterboarding_offset_walls;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plasterboarding_partitions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plastering_ceilings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plastering_of_window_sashes;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plastering_walls;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.plumbings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.scaffoldings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.siliconings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.skirting_of_floating_floors;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.tile_ceramics;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.tool_rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.window_installations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.windows;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.wirings;

-- Verify the publication now includes all tables
SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
