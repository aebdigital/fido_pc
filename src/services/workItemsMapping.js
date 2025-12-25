/**
 * Work Items Mapping Service
 * Maps between app's dynamic work item structure and database tables
 */

import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';
import { workProperties } from '../config/workProperties';

// Map propertyId to database table name
export const PROPERTY_TO_TABLE = {
  // Brick works
  [WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS]: 'brick_partitions',
  [WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING]: 'brick_load_bearing_walls',

  // Plasterboarding
  [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION]: 'plasterboarding_partitions',
  [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET]: 'plasterboarding_offset_walls',
  [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING]: 'plasterboarding_ceilings',

  // Netting
  [WORK_ITEM_PROPERTY_IDS.NETTING_WALL]: 'netting_walls',
  [WORK_ITEM_PROPERTY_IDS.NETTING_CEILING]: 'netting_ceilings',

  // Plastering
  [WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL]: 'plastering_walls',
  [WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING]: 'plastering_ceilings',
  [WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING]: 'facade_plasterings',
  [WORK_ITEM_PROPERTY_IDS.WINDOW_SASH]: 'plastering_of_window_sashes',

  // Painting
  [WORK_ITEM_PROPERTY_IDS.PAINTING_WALL]: 'painting_walls',
  [WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING]: 'painting_ceilings',

  // Floor works
  [WORK_ITEM_PROPERTY_IDS.LEVELLING]: 'levellings',
  'tile_ceramic': 'tile_ceramics', // Legacy or unused?
  [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: 'tile_ceramics',
  'paving_ceramic': 'paving_ceramics', // Legacy or unused?
  [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: 'paving_ceramics',
  [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: 'laying_floating_floors',
  'skirting_floor': 'skirting_of_floating_floors', // Legacy or unused?

  // Installations
  [WORK_ITEM_PROPERTY_IDS.WIRING]: 'wirings',
  [WORK_ITEM_PROPERTY_IDS.PLUMBING]: 'plumbings',
  [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: 'installation_of_sanitaries',
  [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: 'installation_of_corner_beads',
  'door_jamb': 'installation_of_door_jambs', // Legacy or unused?
  [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: 'installation_of_door_jambs',
  [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: 'window_installations',

  // Others
  [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: 'demolitions',
  'demolition': 'demolitions', // Legacy?
  [WORK_ITEM_PROPERTY_IDS.COMMUTE]: 'custom_works', // Map commute to custom_works for now as there is no specific table
  'core_drill': 'core_drills', // rentals item
  [WORK_ITEM_PROPERTY_IDS.GROUTING]: 'groutings',
  [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: 'penetration_coatings',
  [WORK_ITEM_PROPERTY_IDS.SILICONING]: 'siliconings',
  'tool_rental': 'tool_rentals', // rentals item
  'scaffolding': 'scaffoldings', // rentals item
  [WORK_ITEM_PROPERTY_IDS.RENTALS]: 'scaffoldings', // Main rentals property maps to scaffoldings

  // Custom
  [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK]: 'custom_works',
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
  let tableName = PROPERTY_TO_TABLE[workItem.propertyId];

  // Fallback for rentals items that might not have propertyId set correctly in older data
  // or if they are sub-items of 'rentals' property
  if (!tableName && workItem.name) {
     if (workItem.name === 'Scaffolding' || workItem.name === 'Lešenie') {
       tableName = 'scaffoldings';
     }
  }

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
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        netting: workItem.complementaryWorks?.['Netting'] ? 1 : 0, // Should be constant but complementaryWorks keys are stored as strings
        painting: workItem.complementaryWorks?.['Painting'] ? 1 : 0,
        plastering: workItem.complementaryWorks?.['Plastering'] ? 1 : 0,
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
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        type: typeMap[workItem.selectedType] || 1
      };

    case 'netting_walls':
    case 'plastering_walls':
    case 'painting_walls':
    case 'facade_plasterings':
    case 'penetration_coatings':
      // Wall types use WIDTH x HEIGHT
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0
      };

    case 'netting_ceilings':
    case 'plastering_ceilings':
    case 'painting_ceilings':
      // Ceiling types use WIDTH x LENGTH
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0
      };

    case 'tile_ceramics':
      // Tiling uses WIDTH x HEIGHT (wall tiling)
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0
      };

    case 'paving_ceramics':
    case 'laying_floating_floors':
    case 'levellings':
    case 'groutings':
      // Floor types use WIDTH x LENGTH
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0
      };

    case 'siliconings':
      // Siliconing only uses LENGTH - stored as count
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0
      };

    case 'demolitions':
      // Preparatory and demolition works use DURATION (hours) - stored as count
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.DURATION_EN] || 0
      };

    case 'window_installations':
      // Window installation uses CIRCUMFERENCE (stored as count) and PRICE
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.CIRCUMFERENCE] || 0,
        price_per_window: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
      };

    case 'wirings':
    case 'plumbings':
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || 0
      };

    case 'installation_of_sanitaries':
      return {
        ...baseRecord,
        type: workItem.selectedType || workItem.subtitle || '',
        count: workItem.fields?.[WORK_ITEM_NAMES.COUNT] || 0,
        price_per_sanitary: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
      };

    case 'installation_of_door_jambs':
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.COUNT] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        price_per_door_jamb: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
      };

    case 'custom_works':
      // Handle both custom work items and commute items
      // Commute items have Distance field, custom work items have Quantity field
      const isCommute = workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE ||
                        workItem.name === 'Cesta' || workItem.name === 'Commute';
      const quantity = isCommute
        ? (workItem.fields?.[WORK_ITEM_NAMES.DISTANCE_EN] || workItem.fields?.[WORK_ITEM_NAMES.DISTANCE_SK] || 0)
        : (workItem.fields?.[WORK_ITEM_NAMES.QUANTITY] || workItem.fields?.['Quantity'] || 0);
      const unit = isCommute ? 'km' : (workItem.selectedUnit || '');
      const title = isCommute ? 'Cesta' : (workItem.fields?.[WORK_ITEM_NAMES.NAME] || workItem.name || '');

      return {
        ...baseRecord,
        title: title,
        unit: unit,
        number_of_units: quantity,
        price_per_unit: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
      };

    case 'custom_materials':
      return {
        ...baseRecord,
        title: workItem.fields?.[WORK_ITEM_NAMES.NAME] || workItem.name || '',
        unit: workItem.selectedUnit || '',
        number_of_units: workItem.fields?.[WORK_ITEM_NAMES.QUANTITY] || 0,
        price_per_unit: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
      };

    case 'scaffoldings':
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        number_of_days: workItem.fields?.[WORK_ITEM_NAMES.RENTAL_DURATION] || 0
      };

    default:
      // Generic mapping for simple tables with just count
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.COUNT] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || workItem.fields?.[WORK_ITEM_NAMES.DURATION_EN] || 0
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

  // Look up the work property config to get name and subtitle
  const workProperty = workProperties.find(p => p.id === propertyId);
  const name = workProperty?.name || '';
  const subtitle = workProperty?.subtitle || '';

  const baseItem = {
    id: dbRecord.id,
    propertyId,
    name,
    subtitle,
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
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Netting': dbRecord.netting === 1,
          'Painting': dbRecord.painting === 1,
          'Plastering': dbRecord.plastering === 1,
          'Tiling under 60cm': dbRecord.tiling === 1
        }
      };

    case 'plasterboarding_partitions':
    case 'plasterboarding_ceilings': {
      // Partitions and ceilings use WIDTH x LENGTH
      // Map bigint type back to string: 1=Simple, 2=Double, 3=Triple
      const typeNames = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      const plasterboardType = typeNames[dbRecord.type] || 'Simple';
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        selectedType: plasterboardType
      };
    }

    case 'plasterboarding_offset_walls': {
      // Offset walls use WIDTH x HEIGHT
      const typeNamesOffset = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      const offsetType = typeNamesOffset[dbRecord.type] || 'Simple';
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        selectedType: offsetType
      };
    }

    case 'netting_walls':
    case 'plastering_walls':
    case 'painting_walls':
    case 'facade_plasterings':
    case 'penetration_coatings':
      // Wall types use WIDTH x HEIGHT
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        }
      };

    case 'netting_ceilings':
    case 'plastering_ceilings':
    case 'painting_ceilings':
      // Ceiling types use WIDTH x LENGTH
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        }
      };

    case 'tile_ceramics':
      // Tiling uses WIDTH x HEIGHT (wall tiling)
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        }
      };

    case 'paving_ceramics':
    case 'laying_floating_floors':
    case 'levellings':
    case 'groutings':
      // Floor types use WIDTH x LENGTH
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        }
      };

    case 'siliconings':
      // Siliconing only uses LENGTH - stored as count
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.count || 0
        }
      };

    case 'window_installations':
      // Window installation uses CIRCUMFERENCE (stored as count) and PRICE
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.CIRCUMFERENCE]: dbRecord.count || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_window || 0
        }
      };

    case 'wirings':
    case 'plumbings':
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN]: dbRecord.count || 0
        }
      };

    case 'installation_of_sanitaries':
      return {
        ...baseItem,
        selectedType: dbRecord.type,
        subtitle: dbRecord.type,
        fields: {
          [WORK_ITEM_NAMES.COUNT]: dbRecord.count || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_sanitary || 0
        }
      };

    case 'installation_of_door_jambs':
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.COUNT]: dbRecord.count || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_door_jamb || 0
        }
      };

    case 'custom_works':
      // Detect if this is a commute item (saved with unit 'km' or title 'Cesta'/'Commute')
      const isCommuteItem = dbRecord.unit === 'km' ||
                            dbRecord.title === 'Cesta' ||
                            dbRecord.title === 'Commute';

      if (isCommuteItem) {
        return {
          ...baseItem,
          propertyId: WORK_ITEM_PROPERTY_IDS.COMMUTE,
          name: 'Cesta',
          fields: {
            [WORK_ITEM_NAMES.DISTANCE_EN]: dbRecord.number_of_units || 0,
            [WORK_ITEM_NAMES.DISTANCE_SK]: dbRecord.number_of_units || 0,
            [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_unit || 0
          }
        };
      }

      // Regular custom work item
      return {
        ...baseItem,
        name: dbRecord.title,
        selectedUnit: dbRecord.unit,
        fields: {
          [WORK_ITEM_NAMES.NAME]: dbRecord.title,
          [WORK_ITEM_NAMES.QUANTITY]: dbRecord.number_of_units || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_unit || 0
        }
      };

    case 'custom_materials':
      return {
        ...baseItem,
        name: dbRecord.title,
        selectedUnit: dbRecord.unit,
        fields: {
          [WORK_ITEM_NAMES.NAME]: dbRecord.title,
          [WORK_ITEM_NAMES.QUANTITY]: dbRecord.number_of_units || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_unit || 0
        }
      };

    case 'scaffoldings':
      return {
        ...baseItem,
        name: 'Lešenie',
        subtitle: 'Lešenie',
        fields: {
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0,
          [WORK_ITEM_NAMES.RENTAL_DURATION]: dbRecord.number_of_days || 0
        }
      };

    case 'demolitions':
      // Preparatory and demolition works use DURATION (hours)
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.DURATION_EN]: dbRecord.count || 0
        }
      };

    default:
      // Generic mapping
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.COUNT]: dbRecord.count || 0
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