-- Check all table schemas in Supabase

-- CONTRACTORS TABLE
SELECT 'CONTRACTORS' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contractors'
ORDER BY ordinal_position;

-- CLIENTS TABLE
SELECT 'CLIENTS' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

-- PROJECTS TABLE
SELECT 'PROJECTS' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- ROOMS TABLE
SELECT 'ROOMS' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rooms'
ORDER BY ordinal_position;

-- INVOICES TABLE
SELECT 'INVOICES' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;

-- PRICE_LISTS TABLE
SELECT 'PRICE_LISTS' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'price_lists'
ORDER BY ordinal_position;
