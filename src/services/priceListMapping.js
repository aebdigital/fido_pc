// Maps Desktop generalPriceList structure to Supabase individual column names
// This ensures Desktop and iOS share the same price data

// Work items mapping: { category, index } => database column name
const WORK_COLUMN_MAPPING = {
  // work category
  'work_0': 'work_demolition_price', // Preparatory and demolition works
  'work_1': 'work_wiring_price', // Electrical installation work
  'work_2': 'work_plumbing_price', // Plumbing work
  'work_3': 'work_brick_partitions_price', // Brick partitions
  'work_4': 'work_brick_load_bearing_wall_price', // Brick load-bearing wall
  'work_5': 'work_simple_plasterboarding_partition_price', // Plasterboarding partition simple
  'work_6': 'work_double_plasterboarding_partition_price', // Plasterboarding partition double
  'work_7': 'work_triple_plasterboarding_partition_price', // Plasterboarding partition triple
  'work_8': 'work_simple_plasterboarding_offset_wall_price', // Plasterboarding offset wall simple
  'work_9': 'work_double_plasterboarding_offset_wall_price', // Plasterboarding offset wall double
  'work_10': 'work_plasterboarding_ceiling_price', // Plasterboarding ceiling
  'work_11': 'work_netting_wall_price', // Netting wall
  'work_12': 'work_netting_ceiling_price', // Netting ceiling
  'work_13': 'work_plastering_wall_price', // Plastering wall
  'work_14': 'work_plastering_ceiling_price', // Plastering ceiling
  'work_15': 'work_facade_plastering', // Facade Plastering
  'work_16': 'work_installation_of_corner_bead_price', // Installation of corner bead
  'work_17': 'work_plastering_of_window_sash_price', // Plastering of window sash
  'work_18': 'work_penetration_coating_price', // Penetration coating
  'work_19': 'work_painting_wall_price', // Painting wall
  'work_20': 'work_painting_ceiling_price', // Painting ceiling
  'work_21': 'work_levelling_price', // Levelling
  'work_22': 'work_laying_floating_floors_price', // Floating floor laying
  'work_23': 'work_skirting_of_floating_floor_price', // Skirting floating floor
  'work_24': 'work_tiling_ceramic_price', // Tiling under 60cm
  'work_25': 'work_jolly_edging_price', // Jolly Edging
  'work_26': 'work_paving_ceramic_price', // Paving under 60cm
  'work_27': 'work_plinth_cutting', // Plinth cutting and grinding
  'work_28': 'work_plinth_bonding', // Plinth bonding
  'work_29': 'work_large_format_paving_and_tiling_price', // Large Format above 60cm
  'work_30': 'work_grouting_price', // Grouting
  'work_31': 'work_siliconing_price', // Siliconing
  'work_32': 'work_window_installation_price', // Window installation
  'work_33': 'work_door_jamb_installation_price', // Installation of door jamb
  'work_34': 'work_auxiliary_and_finishing_price', // Auxiliary and finishing work
};

// Material items mapping
const MATERIAL_COLUMN_MAPPING = {
  'material_0': 'material_partition_masonry_price', // Partition masonry
  'material_1': 'material_load_bearing_masonry_price', // Load-bearing masonry
  'material_2': 'material_simple_plasterboarding_partition_price', // Plasterboard simple partition
  'material_2_capacity': 'material_simple_plasterboarding_partition_capacity',
  'material_3': 'material_double_plasterboarding_partition_price', // Plasterboard double partition
  'material_3_capacity': 'material_double_plasterboarding_partition_capacity',
  'material_4': 'material_triple_plasterboarding_partition_price', // Plasterboard triple partition
  'material_4_capacity': 'material_triple_plasterboarding_partition_capacity',
  'material_5': 'material_simple_plasterboarding_offset_wall_price', // Plasterboard simple offset wall
  'material_5_capacity': 'material_simple_plasterboarding_offset_wall_capacity',
  'material_6': 'material_double_plasterboarding_offset_wall_price', // Plasterboard double offset wall
  'material_6_capacity': 'material_double_plasterboarding_offset_wall_capacity',
  'material_7': 'material_plasterboarding_ceiling_price', // Plasterboard ceiling
  'material_7_capacity': 'material_plasterboarding_ceiling_capacity',
  'material_8': 'material_mesh_price', // Mesh
  'material_9': 'material_adhesive_netting_price', // Adhesive netting
  'material_9_capacity': 'material_adhesive_netting_capacity',
  'material_10': 'material_adhesive_tiling_and_paving_price', // Adhesive tiling and paving
  'material_10_capacity': 'material_adhesive_tiling_and_paving_capacity',
  'material_11': 'material_plaster_price', // Plaster
  'material_11_capacity': 'material_plaster_capacity',
  'material_12': 'material_facade_plaster_price', // Facade Plaster
  'material_12_capacity': 'material_facade_plaster_capacity',
  'material_13': 'material_corner_bead_price', // Corner bead
  'material_13_capacity': 'material_corner_bead_capacity',
  'material_14': 'material_primer_price', // Primer
  'material_15': 'material_paint_wall_price', // Paint wall
  'material_16': 'material_paint_ceiling_price', // Paint ceiling
  'material_17': 'material_self_levelling_compound_price', // Self-levelling compound
  'material_17_capacity': 'material_self_levelling_compound_capacity',
  'material_18': 'material_floating_floor_price', // Floating floor
  'material_19': 'material_skirting_board_price', // Skirting boards
  'material_20': 'material_silicone_price', // Silicone
  'material_20_capacity': 'material_silicone_capacity',
  'material_21': 'material_tiles_price', // Tiles ceramic
  'material_22': 'material_pavings_price', // Pavings ceramic
  // material_23 (Grout) removed from UI, so Auxiliary shifts to index 23
  'material_23': 'material_auxiliary_and_fastening_price', // Auxiliary and fastening material
};

// Sanitary installations mapping
const INSTALLATIONS_COLUMN_MAPPING = {
  'installations_0': 'work_sanitary_corner_valve_price', // Corner valve
  'installations_1': 'work_sanitary_standing_mixer_tap_price', // Standing mixer tap
  'installations_2': 'work_sanitary_wall_mounted_tap_price', // Wall-mounted tap
  'installations_3': 'work_sanitary_flush_mounted_tap_price', // Flush-mounted tap
  'installations_4': 'work_sanitary_toilet_combi_price', // Toilet combi
  'installations_5': 'work_sanitary_toilet_with_concealed_cistern_price', // Concealed toilet
  'installations_6': 'work_sanitary_sink_price', // Sink
  'installations_7': 'work_sanitary_sink_with_cabinet_price', // Sink with cabinet
  'installations_8': 'work_sanitary_bathtub_price', // Bathtub
  'installations_9': 'work_sanitary_shower_cubicle_price', // Shower cubicle
  'installations_10': 'work_sanitary_gutter_price', // Installation of gutter
  'installations_11': 'work_sanitary_urinal', // Urinal
  'installations_12': 'work_sanitary_bath_screen', // Bath screen
  'installations_13': 'work_sanitary_mirror', // Mirror
};

// Others category mapping
const OTHERS_COLUMN_MAPPING = {
  'others_0': 'others_scaffolding_assembly_and_disassembly_price', // Scaffolding assembly
  'others_1': 'others_scaffolding_price', // Scaffolding rental per day
  'others_2': 'others_core_drill_rental_price', // Core Drill
  'others_3': 'others_tool_rental_price', // Tool rental
  'others_4': 'others_commute_price', // Commute
  'others_5': 'others_vat_price', // VAT
};

/**
 * Convert Desktop generalPriceList to database column format
 */
export function priceListToDbColumns(generalPriceList) {
  const dbData = {};

  // Map work items
  if (generalPriceList.work) {
    generalPriceList.work.forEach((item, index) => {
      const columnName = WORK_COLUMN_MAPPING[`work_${index}`];
      if (columnName) {
        dbData[columnName] = item.price;
      }
    });
  }

  // Map material items (including capacity)
  if (generalPriceList.material) {
    generalPriceList.material.forEach((item, index) => {
      const priceColumn = MATERIAL_COLUMN_MAPPING[`material_${index}`];
      const capacityColumn = MATERIAL_COLUMN_MAPPING[`material_${index}_capacity`];
      if (priceColumn) {
        dbData[priceColumn] = item.price;
      }
      if (capacityColumn && item.capacity) {
        dbData[capacityColumn] = item.capacity.value;
      }
    });
  }

  // Map installations
  if (generalPriceList.installations) {
    generalPriceList.installations.forEach((item, index) => {
      const columnName = INSTALLATIONS_COLUMN_MAPPING[`installations_${index}`];
      if (columnName) {
        dbData[columnName] = item.price;
      }
    });
  }

  // Map others
  if (generalPriceList.others) {
    generalPriceList.others.forEach((item, index) => {
      const columnName = OTHERS_COLUMN_MAPPING[`others_${index}`];
      if (columnName) {
        dbData[columnName] = item.price;
      }
    });
  }

  return dbData;
}

/**
 * Get the database column name for a specific price item
 */
export function getDbColumnForItem(category, index) {
  const key = `${category}_${index}`;
  switch (category) {
    case 'work':
      return WORK_COLUMN_MAPPING[key];
    case 'material':
      return MATERIAL_COLUMN_MAPPING[key];
    case 'installations':
      return INSTALLATIONS_COLUMN_MAPPING[key];
    case 'others':
      return OTHERS_COLUMN_MAPPING[key];
    default:
      return null;
  }
}

/**
 * Get the database column name for a specific material capacity item
 */
export function getDbColumnForCapacity(category, index) {
  if (category !== 'material') return null;
  const key = `${category}_${index}_capacity`;
  return MATERIAL_COLUMN_MAPPING[key] || null;
}

/**
 * Convert database columns back to generalPriceList format
 */
export function dbColumnsToPriceList(dbRow, defaultPriceList) {
  const result = JSON.parse(JSON.stringify(defaultPriceList)); // Deep clone

  // Reverse mapping for work
  Object.entries(WORK_COLUMN_MAPPING).forEach(([key, column]) => {
    if (dbRow[column] !== undefined && dbRow[column] !== null) {
      const index = parseInt(key.split('_')[1]);
      if (result.work[index]) {
        result.work[index].price = parseFloat(dbRow[column]);
      }
    }
  });

  // Reverse mapping for material
  Object.entries(MATERIAL_COLUMN_MAPPING).forEach(([key, column]) => {
    if (dbRow[column] !== undefined && dbRow[column] !== null) {
      const parts = key.split('_');
      const index = parseInt(parts[1]);
      const isCapacity = parts[2] === 'capacity';

      if (result.material[index]) {
        if (isCapacity) {
          if (!result.material[index].capacity) {
            result.material[index].capacity = { value: 0, unit: 'm2' };
          }
          result.material[index].capacity.value = parseFloat(dbRow[column]);
        } else {
          result.material[index].price = parseFloat(dbRow[column]);
        }
      }
    }
  });

  // Reverse mapping for installations
  Object.entries(INSTALLATIONS_COLUMN_MAPPING).forEach(([key, column]) => {
    if (dbRow[column] !== undefined && dbRow[column] !== null) {
      const index = parseInt(key.split('_')[1]);
      if (result.installations[index]) {
        result.installations[index].price = parseFloat(dbRow[column]);
      }
    }
  });

  // Reverse mapping for others
  Object.entries(OTHERS_COLUMN_MAPPING).forEach(([key, column]) => {
    if (dbRow[column] !== undefined && dbRow[column] !== null) {
      const index = parseInt(key.split('_')[1]);
      if (result.others[index]) {
        result.others[index].price = parseFloat(dbRow[column]);
      }
    }
  });

  return result;
}
