-- =====================================================
-- CHECK CONTRACTORS TABLE COLUMNS
-- Run this in your Supabase SQL Editor to see existing columns
-- =====================================================

-- Check all columns in the contractors table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'contractors'
ORDER BY
    ordinal_position;

-- This will show you exactly which columns exist in the contractors table
