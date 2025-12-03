-- Export entire database schema as JSON
-- Copy the entire output and paste it back

SELECT json_object_agg(
  table_name,
  columns
) as database_schema
FROM (
  SELECT
    t.table_name,
    json_agg(
      json_build_object(
        'column_name', c.column_name,
        'data_type', c.data_type,
        'is_nullable', c.is_nullable,
        'column_default', c.column_default,
        'character_maximum_length', c.character_maximum_length,
        'numeric_precision', c.numeric_precision
      ) ORDER BY c.ordinal_position
    ) as columns
  FROM information_schema.tables t
  JOIN information_schema.columns c
    ON t.table_name = c.table_name
    AND t.table_schema = c.table_schema
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  GROUP BY t.table_name
) subquery;
