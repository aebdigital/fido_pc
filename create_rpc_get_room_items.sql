-- Function to fetch all work items for a room from all relevant tables
-- Returns a JSON array of objects, where each object has the original table's columns plus '_table_name'

CREATE OR REPLACE FUNCTION get_room_items(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  temp_json jsonb;
  table_name text;
  -- List of all work item tables
  tables text[] := ARRAY[
    'brick_partitions',
    'brick_load_bearing_walls',
    'plasterboarding_partitions',
    'plasterboarding_offset_walls',
    'plasterboarding_ceilings',
    'netting_walls',
    'netting_ceilings',
    'plastering_walls',
    'plastering_ceilings',
    'facade_plasterings',
    'plastering_of_window_sashes',
    'painting_walls',
    'painting_ceilings',
    'levellings',
    'tile_ceramics',
    'paving_ceramics',
    'laying_floating_floors',
    'skirting_of_floating_floors',
    'wirings',
    'plumbings',
    'installation_of_sanitaries',
    'installation_of_corner_beads',
    'installation_of_door_jambs',
    'window_installations',
    'demolitions',
    'core_drills',
    'groutings',
    'penetration_coatings',
    'siliconings',
    'tool_rentals',
    'scaffoldings',
    'custom_works',
    'custom_materials'
  ];
BEGIN
  -- Iterate through each table
  FOREACH table_name IN ARRAY tables LOOP
    -- Dynamic query to fetch rows, convert to JSON, add table name, and aggregate
    -- We use COALESCE to handle empty results (keep them as null, don't append)
    EXECUTE format(
      'SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object(''_table_name'', %L)) FROM %I t WHERE room_id = %L',
      table_name,
      table_name,
      p_room_id
    ) INTO temp_json;

    -- If we found records, append them to our result
    IF temp_json IS NOT NULL THEN
      result := result || temp_json;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;
