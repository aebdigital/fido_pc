/**
 * Work Items Mapping Service
 * Maps between app's dynamic work item structure and database tables
 */

// Map propertyId to database table name
export const PROPERTY_TO_TABLE = {
  // Brick works
  'brick_partitions': 'brick_partitions',
  'brick_load_bearing': 'brick_load_bearing_walls',

  // Plasterboarding
  'plasterboarding_partition': 'plasterboarding_partitions',
  'plasterboarding_offset': 'plasterboarding_offset_walls',
  'plasterboarding_ceiling': 'plasterboarding_ceilings',

  // Netting
  'netting_wall': 'netting_walls',
  'netting_ceiling': 'netting_ceilings',

  // Plastering
  'plastering_wall': 'plastering_walls',
  'plastering_ceiling': 'plastering_ceilings',
  'facade_plastering': 'facade_plasterings',
  'window_sash': 'plastering_of_window_sashes',

  // Painting
  'painting_wall': 'painting_walls',
  'painting_ceiling': 'painting_ceilings',

  // Floor works
  'levelling': 'levellings',
  'tile_ceramic': 'tile_ceramics',
  'tiling_under_60': 'tile_ceramics',
  'paving_ceramic': 'paving_ceramics',
  'paving_under_60': 'paving_ceramics',
  'floating_floor': 'laying_floating_floors',
  'skirting_floor': 'skirting_of_floating_floors',

  // Installations
  'wiring': 'wirings',
  'plumbing': 'plumbings',
  'sanitary_installation': 'installation_of_sanitaries',
  'corner_bead': 'installation_of_corner_beads',
  'door_jamb': 'installation_of_door_jambs',
  'door_jamb_installation': 'installation_of_door_jambs',
  'window_installation': 'window_installations',

  // Others
  'preparatory': 'demolitions',
  'demolition': 'demolitions',
  'commute': 'custom_works', // Map commute to custom_works for now as there is no specific table
  'core_drill': 'core_drills',
  'grouting': 'groutings',
  'penetration_coating': 'penetration_coatings',
  'siliconing': 'siliconings',
  'tool_rental': 'tool_rentals',
  'scaffolding': 'scaffoldings',

  // Custom
  'custom_work': 'custom_works',
  'custom_material': 'custom_materials'
};

/**
 * Convert app work item to database record
 * @param {Object} workItem - Work item from app
 * @param {string} roomId - Room UUID
 * @param {string} contractorId - Contractor UUID
 * @returns {Object} Database record
 */
export function workItemToDatabase(workItem, roomId, contractorId) {
  const tableName = PROPERTY_TO_TABLE[workItem.propertyId];

  if (!tableName) {
    console.warn(`No table mapping for propertyId: ${workItem.propertyId}`);
    return null;
  }

  const baseRecord = {
    room_id: roomId,
    c_id: contractorId
  };

  // Map based on table type
  switch (tableName) {
    case 'brick_partitions':
    case 'brick_load_bearing_walls':
      return {
        ...baseRecord,
        size1: workItem.fields?.Width || workItem.fields?.Length || 0,
        size2: workItem.fields?.Height || 0,
        netting: workItem.complementaryWorks?.Netting ? 1 : 0,
        painting: workItem.complementaryWorks?.Painting ? 1 : 0,
        plastering: workItem.complementaryWorks?.Plastering ? 1 : 0,
        tiling: workItem.complementaryWorks?.['Tiling under 60cm'] ? 1 : 0,
        penetration_one: workItem.complementaryWorks?.['Penetration coating'] ? 1 : 0,
        penetration_two: 0,
        penetration_three: 0
      };

    case 'plasterboarding_partitions':
    case 'plasterboarding_offset_walls':
    case 'plasterboarding_ceilings':
      // Map type to bigint: Simple=1, Double=2, Triple=3
      const typeMap = { 'Simple': 1, 'Double': 2, 'Triple': 3 };
      return {
        ...baseRecord,
        size1: workItem.fields?.Width || workItem.fields?.Length || 0,
        size2: workItem.fields?.Height || workItem.fields?.Length || 0,
        type: typeMap[workItem.selectedType] || 1
      };

    case 'netting_walls':
    case 'netting_ceilings':
    case 'plastering_walls':
    case 'plastering_ceilings':
    case 'painting_walls':
    case 'painting_ceilings':
    case 'facade_plasterings':
    case 'penetration_coatings':
      return {
        ...baseRecord,
        size1: workItem.fields?.Width || workItem.fields?.Length || 0,
        size2: workItem.fields?.Height || workItem.fields?.Length || 0
      };

    case 'tile_ceramics':
    case 'paving_ceramics':
    case 'laying_floating_floors':
    case 'levellings':
    case 'skirting_of_floating_floors':
    case 'groutings':
      return {
        ...baseRecord,
        size1: workItem.fields?.Width || workItem.fields?.Length || 0,
        size2: workItem.fields?.Height || workItem.fields?.Length || 0
      };

    case 'wirings':
    case 'plumbings':
      return {
        ...baseRecord,
        count: workItem.fields?.['Number of outlets'] || 0
      };

    case 'installation_of_sanitaries':
      return {
        ...baseRecord,
        type: workItem.selectedType || workItem.subtitle || '',
        count: workItem.fields?.Count || 0,
        price_per_sanitary: workItem.fields?.Price || 0
      };

    case 'installation_of_door_jambs':
      return {
        ...baseRecord,
        count: workItem.fields?.Count || workItem.fields?.Length || 0,
        price_per_door_jamb: workItem.fields?.Price || 0
      };

    case 'custom_works':
      return {
        ...baseRecord,
        title: workItem.fields?.Name || workItem.name || '',
        unit: workItem.selectedUnit || '',
        number_of_units: workItem.fields?.Quantity || 0,
        price_per_unit: workItem.fields?.Price || 0
      };

    case 'custom_materials':
      return {
        ...baseRecord,
        title: workItem.fields?.Name || workItem.name || '',
        unit: workItem.selectedUnit || '',
        number_of_units: workItem.fields?.Quantity || 0,
        price_per_unit: workItem.fields?.Price || 0
      };

    default:
      // Generic mapping for simple tables with just count
      return {
        ...baseRecord,
        count: workItem.fields?.Count || workItem.fields?.Length || workItem.fields?.Duration || 0
      };
  }
}

/**
 * Convert database record to app work item
 * @param {Object} dbRecord - Database record
 * @param {string} tableName - Database table name
 * @returns {Object} App work item
 */
export function databaseToWorkItem(dbRecord, tableName) {
  // Find propertyId from table name
  const propertyId = Object.keys(PROPERTY_TO_TABLE).find(
    key => PROPERTY_TO_TABLE[key] === tableName
  );

  if (!propertyId) {
    console.warn(`No propertyId mapping for table: ${tableName}`);
    return null;
  }

  const baseItem = {
    id: dbRecord.id,
    propertyId,
    fields: {},
    complementaryWorks: {},
    doorWindowItems: { doors: [], windows: [] }
  };

  // Map based on table type
  switch (tableName) {
    case 'brick_partitions':
    case 'brick_load_bearing_walls':
      return {
        ...baseItem,
        fields: {
          Width: dbRecord.size1 || 0,
          Height: dbRecord.size2 || 0
        },
        complementaryWorks: {
          Netting: dbRecord.netting === 1,
          Painting: dbRecord.painting === 1,
          Plastering: dbRecord.plastering === 1,
          'Tiling under 60cm': dbRecord.tiling === 1
        }
      };

    case 'plasterboarding_partitions':
    case 'plasterboarding_offset_walls':
    case 'plasterboarding_ceilings':
      // Map bigint type back to string: 1=Simple, 2=Double, 3=Triple
      const typeNames = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      return {
        ...baseItem,
        fields: {
          Width: dbRecord.size1 || 0,
          Length: dbRecord.size2 || 0
        },
        selectedType: typeNames[dbRecord.type] || 'Simple'
      };

    case 'netting_walls':
    case 'netting_ceilings':
    case 'plastering_walls':
    case 'plastering_ceilings':
    case 'painting_walls':
    case 'painting_ceilings':
    case 'facade_plasterings':
    case 'penetration_coatings':
      return {
        ...baseItem,
        fields: {
          Width: dbRecord.size1 || 0,
          Height: dbRecord.size2 || 0
        }
      };

    case 'tile_ceramics':
    case 'paving_ceramics':
    case 'laying_floating_floors':
    case 'levellings':
    case 'skirting_of_floating_floors':
    case 'groutings':
      return {
        ...baseItem,
        fields: {
          Width: dbRecord.size1 || 0,
          Length: dbRecord.size2 || 0
        }
      };

    case 'wirings':
    case 'plumbings':
      return {
        ...baseItem,
        fields: {
          'Number of outlets': dbRecord.count || 0
        }
      };

    case 'installation_of_sanitaries':
      return {
        ...baseItem,
        selectedType: dbRecord.type,
        subtitle: dbRecord.type,
        fields: {
          Count: dbRecord.count || 0,
          Price: dbRecord.price_per_sanitary || 0
        }
      };

    case 'installation_of_door_jambs':
      return {
        ...baseItem,
        fields: {
          Count: dbRecord.count || 0,
          Price: dbRecord.price_per_door_jamb || 0
        }
      };

    case 'custom_works':
    case 'custom_materials':
      return {
        ...baseItem,
        name: dbRecord.title,
        selectedUnit: dbRecord.unit,
        fields: {
          Name: dbRecord.title,
          Quantity: dbRecord.number_of_units || 0,
          Price: dbRecord.price_per_unit || 0
        }
      };

    default:
      // Generic mapping
      return {
        ...baseItem,
        fields: {
          Count: dbRecord.count || 0
        }
      };
  }
}

/**
 * Get table name for a work item
 * @param {string} propertyId - Work item propertyId
 * @returns {string|null} Database table name
 */
export function getTableName(propertyId) {
  return PROPERTY_TO_TABLE[propertyId] || null;
}
