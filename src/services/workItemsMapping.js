/**
 * Work Items Mapping Service
 * Maps between app's dynamic work item structure and database tables
 */

import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';
import { workProperties } from '../config/workProperties';

/**
 * Check if a work item is a commute item
 * @param {Object} workItem - Work item to check
 * @returns {boolean} True if this is a commute work item
 */
export function isCommuteWorkItem(workItem) {
  // Explicitly check propertyId first - this is the most reliable check
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) {
    return true;
  }

  // IMPORTANT: Don't treat custom work items as commute, even if named "Cesta"/"Commute"
  // This prevents accidentally filtering out custom work items with those names
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    return false;
  }

  // Legacy check for items that might not have propertyId set correctly
  // Only match if name is exactly 'Cesta' or 'Commute' (case-sensitive)
  return workItem.name === 'Cesta' || workItem.name === 'Commute';
}

/**
 * Extract commute data from work items array
 * Used when saving - extracts commute values to save to Room fields
 * @param {Array} workItems - Array of work items
 * @returns {Object} { commuteLength, daysInWork, commutePrice } or null if no commute item
 */
export function extractCommuteFromWorkItems(workItems) {
  const commuteItem = workItems?.find(isCommuteWorkItem);
  if (!commuteItem) return null;

  return {
    commuteLength: commuteItem.fields?.[WORK_ITEM_NAMES.DISTANCE_EN] ||
                   commuteItem.fields?.[WORK_ITEM_NAMES.DISTANCE_SK] || 0,
    daysInWork: commuteItem.fields?.[WORK_ITEM_NAMES.DURATION_EN] ||
                commuteItem.fields?.[WORK_ITEM_NAMES.DURATION_SK] || 0,
    commutePrice: commuteItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0
  };
}

/**
 * Create a commute work item from Room's commute fields
 * Used when loading - creates a work item for the UI from Room fields
 * @param {Object} room - Room object with commuteLength and daysInWork
 * @returns {Object|null} Commute work item or null if no commute data
 */
export function createCommuteWorkItemFromRoom(room) {
  // Only create if there's actual commute data
  const commuteLength = room.commute_length || room.commuteLength || 0;
  const daysInWork = room.days_in_work || room.daysInWork || 0;

  if (commuteLength === 0 && daysInWork === 0) {
    return null;
  }

  // Find commute property config
  const commuteProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.COMMUTE);

  return {
    id: `commute-${room.id || room.c_id}`, // Synthetic ID for commute
    c_id: `commute-${room.id || room.c_id}`,
    propertyId: WORK_ITEM_PROPERTY_IDS.COMMUTE,
    name: commuteProperty?.name || 'Commute',
    subtitle: commuteProperty?.subtitle || '',
    fields: {
      [WORK_ITEM_NAMES.DISTANCE_EN]: commuteLength,
      [WORK_ITEM_NAMES.DISTANCE_SK]: commuteLength,
      [WORK_ITEM_NAMES.DURATION_EN]: daysInWork,
      [WORK_ITEM_NAMES.DURATION_SK]: daysInWork,
      [WORK_ITEM_NAMES.PRICE]: 0 // Price comes from price list, not stored on room
    },
    complementaryWorks: {},
    doorWindowItems: { doors: [], windows: [] }
  };
}

// Map iOS unit enum values to display symbols
// iOS stores: "basicMeter", "squareMeter", etc.
// Desktop displays: "bm", "m²", etc.
const IOS_UNIT_TO_DISPLAY = {
  'basicMeter': 'bm',
  'squareMeter': 'm²',
  'cubicMeter': 'm³',
  'piece': 'ks',
  'package': 'bal',
  'hour': 'hod',
  'kilometer': 'km',
  'day': 'deň',
  'kilogram': 'kg',
  'ton': 't',
  'percentage': '%',
  // Additional mappings for desktop units
  'pkg': 'bal',
  'pc': 'ks',
  'm2': 'm²',
  'm3': 'm³',
  'bm': 'bm',
  'h': 'hod',
  'km': 'km',
  'kg': 'kg'
};

/**
 * Convert iOS unit value to display symbol
 * @param {string} unit - Unit value (may be iOS enum value or already a display symbol)
 * @returns {string} Display symbol
 */
export function unitToDisplaySymbol(unit) {
  if (!unit) return '';

  // Strip €/ prefix if present (desktop sends units like "€/pkg", "€/m2")
  let normalized = unit;
  if (normalized.startsWith('€/')) {
    normalized = normalized.substring(2);
  }

  // Check if it's an iOS enum value that needs conversion
  if (IOS_UNIT_TO_DISPLAY[normalized]) {
    return IOS_UNIT_TO_DISPLAY[normalized];
  }
  // Already a display symbol or unknown, return as-is
  return normalized;
}

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
  [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: 'tile_ceramics',
  [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: 'paving_ceramics',
  [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: 'laying_floating_floors',

  // Installations
  [WORK_ITEM_PROPERTY_IDS.WIRING]: 'wirings',
  [WORK_ITEM_PROPERTY_IDS.PLUMBING]: 'plumbings',
  [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: 'installation_of_sanitaries',
  [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: 'installation_of_corner_beads',
  [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: 'installation_of_door_jambs',
  [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: 'window_installations',

  // Others
  [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: 'demolitions',
  [WORK_ITEM_PROPERTY_IDS.COMMUTE]: 'custom_works', // Map commute to custom_works
  [WORK_ITEM_PROPERTY_IDS.GROUTING]: 'groutings',
  [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: 'penetration_coatings',
  [WORK_ITEM_PROPERTY_IDS.SILICONING]: 'siliconings',

  // Rentals - each item type maps to its own table
  'core_drill': 'core_drills',
  'tool_rental': 'tool_rentals',
  'scaffolding': 'scaffoldings',
  [WORK_ITEM_PROPERTY_IDS.RENTALS]: 'scaffoldings', // Default for rentals property

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
  // Skip commute items - they are saved to Room fields, not custom_works table
  // This ensures iOS compatibility (iOS stores commute in Room.commuteLength/daysInWork)
  if (isCommuteWorkItem(workItem)) {
    return null;
  }

  let tableName = PROPERTY_TO_TABLE[workItem.propertyId];

  // Handle custom work/material - route to correct table based on selectedType
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    if (workItem.selectedType === 'Material') {
      tableName = 'custom_materials';
    } else {
      tableName = 'custom_works';
    }
  }

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

  // Preserve existing c_id or generate a new one (iOS compatibility)
  // IMPORTANT: Must preserve c_id for upsert to work correctly!
  // Only use workItem.id if it's a valid UUID (not a timestamp-based numeric ID)
  const isValidUUID = (id) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };
  const workItemCId = workItem.c_id || (isValidUUID(workItem.id) ? workItem.id : null) || crypto.randomUUID();

  const baseRecord = {
    room_id: roomId,
    c_id: workItemCId,
    // Include linked fields for complementary works (will be null for non-linked items)
    linked_to_parent: workItem.linkedToParent || null,
    linked_work_key: workItem.linkedWorkKey || null
  };

  // Map based on table type
  switch (tableName) {
    case 'brick_partitions':
    case 'brick_load_bearing_walls':
      // Use keys with _0/_1/_2 suffix to match how RoomDetailsModal stores them
      // Values can be 0, 1, or 2 (for double/both sides)
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        netting: workItem.complementaryWorks?.['Netting WALL_0'] || workItem.complementaryWorks?.['Netting_0'] || 0,
        painting: workItem.complementaryWorks?.['Painting WALL_0'] || workItem.complementaryWorks?.['Painting_0'] || 0,
        plastering: workItem.complementaryWorks?.['Plastering WALL_0'] || workItem.complementaryWorks?.['Plastering_0'] || 0,
        tiling: workItem.complementaryWorks?.['Tiling under 60cm_0'] || 0,
        penetration_one: workItem.complementaryWorks?.['Penetration coating_0'] || 0,
        penetration_two: workItem.complementaryWorks?.['Penetration coating_1'] || 0,
        penetration_three: workItem.complementaryWorks?.['Penetration coating_2'] || 0
      };

    case 'plasterboarding_partitions':
    case 'plasterboarding_offset_walls': {
      // Map type to bigint: Simple=1, Double=2, Triple=3
      const typeMapWall = { 'Simple': 1, 'Double': 2, 'Triple': 3 };
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        type: typeMapWall[workItem.selectedType] || 1,
        painting: (workItem.complementaryWorks?.['Painting WALL_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        penetration: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0
      };
    }

    case 'plasterboarding_ceilings': {
      // Map type to bigint: Simple=1, Double=2, Triple=3
      const typeMapCeiling = { 'Simple': 1, 'Double': 2, 'Triple': 3 };
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        type: typeMapCeiling[workItem.selectedType] || 1,
        painting: (workItem.complementaryWorks?.['Painting CEILING_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        penetration: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0
      };
    }

    case 'netting_walls':
      // Netting walls have: painting, plastering, tiling, penetration_one, penetration_two
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        painting: (workItem.complementaryWorks?.['Painting WALL_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        plastering: (workItem.complementaryWorks?.['Plastering WALL_0'] || workItem.complementaryWorks?.['Plastering_0']) ? 1 : 0,
        tiling: workItem.complementaryWorks?.['Tiling under 60cm_0'] ? 1 : 0,
        penetration_one: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0,
        penetration_two: workItem.complementaryWorks?.['Penetration coating_1'] ? 1 : 0
      };

    case 'plastering_walls':
    case 'painting_walls':
    case 'facade_plasterings':
      // Wall types use WIDTH x HEIGHT with painting and penetration
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        painting: (workItem.complementaryWorks?.['Painting WALL_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        penetration: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0
      };

    case 'penetration_coatings':
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0
      };

    case 'netting_ceilings':
      // Netting ceilings have: painting, plastering, penetration_one, penetration_two
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        painting: (workItem.complementaryWorks?.['Painting CEILING_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        plastering: (workItem.complementaryWorks?.['Plastering CEILING_0'] || workItem.complementaryWorks?.['Plastering_0']) ? 1 : 0,
        penetration_one: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0,
        penetration_two: workItem.complementaryWorks?.['Penetration coating_1'] ? 1 : 0
      };

    case 'plastering_ceilings':
    case 'painting_ceilings':
      // Ceiling types use WIDTH x LENGTH with painting and penetration
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        painting: (workItem.complementaryWorks?.['Painting CEILING_0'] || workItem.complementaryWorks?.['Painting_0']) ? 1 : 0,
        penetration: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0
      };

    case 'tile_ceramics':
      // Tiling uses WIDTH x HEIGHT (wall tiling) + additional fields
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.HEIGHT] || 0,
        large_format: workItem.fields?.[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD] || workItem.fields?.[WORK_ITEM_NAMES.LARGE_FORMAT] || false,
        jolly_edging: workItem.fields?.[WORK_ITEM_NAMES.JOLLY_EDGING] || workItem.fields?.[WORK_ITEM_NAMES.JOLLY_EDGING_FIELD] || 0
      };

    case 'paving_ceramics':
      // Paving uses WIDTH x LENGTH + additional fields
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        large_format: workItem.fields?.[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD] || workItem.fields?.[WORK_ITEM_NAMES.LARGE_FORMAT] || false,
        plinth_cutting: workItem.fields?.[WORK_ITEM_NAMES.PLINTH_CUTTING_AND_GRINDING_FIELD] || workItem.fields?.['Plinth_cutting and grinding'] || 0,
        plinth_bonding: workItem.fields?.[WORK_ITEM_NAMES.PLINTH_BONDING_FIELD] || workItem.fields?.['Plinth_bonding'] || 0
      };

    case 'laying_floating_floors':
      // Floating floor uses WIDTH x LENGTH (no penetration column)
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0
      };

    case 'groutings':
      // Groutings uses WIDTH x LENGTH (no penetration column)
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0
      };

    case 'levellings':
      // Levelling uses WIDTH x LENGTH with penetration
      return {
        ...baseRecord,
        size1: workItem.fields?.[WORK_ITEM_NAMES.WIDTH] || 0,
        size2: workItem.fields?.[WORK_ITEM_NAMES.LENGTH] || 0,
        penetration: workItem.complementaryWorks?.['Penetration coating_0'] ? 1 : 0
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

    case 'custom_works': {
      // Handle both custom work items and commute items
      // Commute items have Distance and Duration fields, custom work items have Quantity field
      // Note: custom_works table doesn't have linked_to_parent/linked_work_key columns
      const isCommute = workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE ||
        workItem.name === 'Cesta' || workItem.name === 'Commute';
      const quantity = isCommute
        ? (workItem.fields?.[WORK_ITEM_NAMES.DISTANCE_EN] || workItem.fields?.[WORK_ITEM_NAMES.DISTANCE_SK] || 0)
        : (workItem.fields?.[WORK_ITEM_NAMES.QUANTITY] || workItem.fields?.['Quantity'] || 0);
      const unit = isCommute ? 'km' : (workItem.selectedUnit || '');
      // Only store user-entered name, not the fallback 'Custom work and material'
      // Let each platform handle fallback display name
      const title = isCommute ? 'Cesta' : (workItem.fields?.[WORK_ITEM_NAMES.NAME] || '');
      const numberOfDays = isCommute
        ? (workItem.fields?.[WORK_ITEM_NAMES.DURATION_EN] || workItem.fields?.[WORK_ITEM_NAMES.DURATION_SK] || 0)
        : 0;

      return {
        room_id: roomId,
        c_id: workItemCId,
        title: title,
        unit: unit,
        number_of_units: quantity,
        price_per_unit: workItem.fields?.[WORK_ITEM_NAMES.PRICE] || 0,
        number_of_days: numberOfDays
      };
    }

    case 'custom_materials':
      // Note: custom_materials table doesn't have linked_to_parent/linked_work_key columns
      // Only store user-entered name, let each platform handle fallback display name
      return {
        room_id: roomId,
        c_id: workItemCId,
        title: workItem.fields?.[WORK_ITEM_NAMES.NAME] || '',
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

    case 'core_drills':
    case 'tool_rentals':
      return {
        ...baseRecord,
        count: workItem.fields?.[WORK_ITEM_NAMES.COUNT] || 0
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
  // Note: Some tables like custom_works are shared by multiple propertyIds (CUSTOM_WORK, COMMUTE)
  // so we need to detect the correct one based on the record data
  let propertyId = Object.keys(PROPERTY_TO_TABLE).find(
    key => PROPERTY_TO_TABLE[key] === tableName
  );

  // Special handling for custom_works table - detect commute vs custom work
  if (tableName === 'custom_works') {
    const isCommuteRecord = (dbRecord.title === 'Cesta' || dbRecord.title === 'Commute') &&
      dbRecord.unit === 'km';
    propertyId = isCommuteRecord ? WORK_ITEM_PROPERTY_IDS.COMMUTE : WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK;
  }

  // Special handling for custom_materials table
  if (tableName === 'custom_materials') {
    propertyId = WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK;
  }

  if (!propertyId) {
    console.warn(`No propertyId mapping for table: ${tableName}`);
    return null;
  }

  // Look up the work property config to get name and subtitle
  const workProperty = workProperties.find(p => p.id === propertyId);
  const name = workProperty?.name || '';
  const subtitle = workProperty?.subtitle || '';

  const baseItem = {
    id: dbRecord.id || dbRecord.c_id,
    c_id: dbRecord.c_id,  // IMPORTANT: Preserve c_id for proper upsert on save
    propertyId,
    name,
    subtitle,
    fields: {},
    complementaryWorks: {},
    doorWindowItems: { doors: [], windows: [] },
    // Include linked fields for complementary works
    linkedToParent: dbRecord.linked_to_parent || null,
    linkedWorkKey: dbRecord.linked_work_key || null
  };

  // Map based on table type
  switch (tableName) {
    case 'brick_partitions':
    case 'brick_load_bearing_walls':
      // Load complementary works as numbers (0, 1, or 2) with WALL suffix keys
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Netting WALL_0': dbRecord.netting || 0,
          'Painting WALL_0': dbRecord.painting || 0,
          'Plastering WALL_0': dbRecord.plastering || 0,
          'Tiling under 60cm_0': dbRecord.tiling || 0,
          'Penetration coating_0': dbRecord.penetration_one || 0,
          'Penetration coating_1': dbRecord.penetration_two || 0,
          'Penetration coating_2': dbRecord.penetration_three || 0
        }
      };

    case 'plasterboarding_partitions': {
      // Partitions use WIDTH x LENGTH with WALL suffix
      // Map bigint type back to string: 1=Simple, 2=Double, 3=Triple
      const typeNamesPartition = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      const partitionType = typeNamesPartition[dbRecord.type] || 'Simple';
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        selectedType: partitionType,
        complementaryWorks: {
          'Painting WALL_0': dbRecord.painting ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
        }
      };
    }

    case 'plasterboarding_ceilings': {
      // Ceilings use WIDTH x LENGTH with CEILING suffix
      // Map bigint type back to string: 1=Simple, 2=Double, 3=Triple
      const typeNamesCeiling = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      const ceilingType = typeNamesCeiling[dbRecord.type] || 'Simple';
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        selectedType: ceilingType,
        complementaryWorks: {
          'Painting CEILING_0': dbRecord.painting ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
        }
      };
    }

    case 'plasterboarding_offset_walls': {
      // Offset walls use WIDTH x HEIGHT with WALL suffix
      const typeNamesOffset = { 1: 'Simple', 2: 'Double', 3: 'Triple' };
      const offsetType = typeNamesOffset[dbRecord.type] || 'Simple';
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        selectedType: offsetType,
        complementaryWorks: {
          'Painting WALL_0': dbRecord.painting ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
        }
      };
    }

    case 'netting_walls':
      // Netting walls have: painting, plastering, tiling, penetration_one, penetration_two with WALL suffix
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Painting WALL_0': dbRecord.painting ? 1 : 0,
          'Plastering WALL_0': dbRecord.plastering ? 1 : 0,
          'Tiling under 60cm_0': dbRecord.tiling ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration_one ? 1 : 0,
          'Penetration coating_1': dbRecord.penetration_two ? 1 : 0
        }
      };

    case 'plastering_walls':
    case 'painting_walls':
    case 'facade_plasterings':
      // Wall types use WIDTH x HEIGHT with painting and penetration with WALL suffix
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Painting WALL_0': dbRecord.painting ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
        }
      };

    case 'penetration_coatings':
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0
        }
      };

    case 'netting_ceilings':
      // Netting ceilings have: painting, plastering, penetration_one, penetration_two with CEILING suffix
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Painting CEILING_0': dbRecord.painting ? 1 : 0,
          'Plastering CEILING_0': dbRecord.plastering ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration_one ? 1 : 0,
          'Penetration coating_1': dbRecord.penetration_two ? 1 : 0
        }
      };

    case 'plastering_ceilings':
    case 'painting_ceilings':
      // Ceiling types use WIDTH x LENGTH with painting and penetration with CEILING suffix
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Painting CEILING_0': dbRecord.painting ? 1 : 0,
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
        }
      };

    case 'tile_ceramics':
      // Tiling uses WIDTH x HEIGHT (wall tiling) + additional fields
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0,
          [WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD]: dbRecord.large_format || false,
          [WORK_ITEM_NAMES.JOLLY_EDGING]: dbRecord.jolly_edging || 0
        }
      };

    case 'paving_ceramics':
      // Paving uses WIDTH x LENGTH + additional fields
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0,
          [WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD]: dbRecord.large_format || false,
          [WORK_ITEM_NAMES.PLINTH_CUTTING_AND_GRINDING_FIELD]: dbRecord.plinth_cutting || 0,
          [WORK_ITEM_NAMES.PLINTH_BONDING_FIELD]: dbRecord.plinth_bonding || 0
        }
      };

    case 'laying_floating_floors':
      // Floating floor uses WIDTH x LENGTH (no penetration column)
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        }
      };

    case 'groutings':
      // Groutings uses WIDTH x LENGTH (no penetration column)
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        }
      };

    case 'levellings':
      // Levelling uses WIDTH x LENGTH with penetration
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.WIDTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size2 || 0
        },
        complementaryWorks: {
          'Penetration coating_0': dbRecord.penetration ? 1 : 0
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
      // Skip commute items from custom_works table - they are now loaded from Room fields
      // This ensures iOS compatibility (iOS stores commute in Room.commuteLength/daysInWork)
      const isCommuteItem = (dbRecord.title === 'Cesta' || dbRecord.title === 'Commute') &&
        dbRecord.unit === 'km';

      if (isCommuteItem) {
        // Return null to skip - commute will be created from Room fields instead
        return null;
      }

      // Regular custom work item
      console.log('[DB Load] custom_works item:', {
        title: dbRecord.title,
        unit: dbRecord.unit,
        number_of_units: dbRecord.number_of_units,
        price_per_unit: dbRecord.price_per_unit
      });
      return {
        ...baseItem,
        name: dbRecord.title,
        selectedType: 'Work',
        selectedUnit: dbRecord.unit,
        fields: {
          [WORK_ITEM_NAMES.NAME]: dbRecord.title,
          [WORK_ITEM_NAMES.QUANTITY]: dbRecord.number_of_units || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_unit || 0
        }
      };

    case 'custom_materials':
      console.log('[DB Load] custom_materials item:', {
        title: dbRecord.title,
        unit: dbRecord.unit,
        number_of_units: dbRecord.number_of_units,
        price_per_unit: dbRecord.price_per_unit
      });
      return {
        ...baseItem,
        name: dbRecord.title,
        selectedType: 'Material',
        selectedUnit: dbRecord.unit,
        fields: {
          [WORK_ITEM_NAMES.NAME]: dbRecord.title,
          [WORK_ITEM_NAMES.QUANTITY]: dbRecord.number_of_units || 0,
          [WORK_ITEM_NAMES.PRICE]: dbRecord.price_per_unit || 0
        }
      };

    case 'scaffoldings': {
      // Get rentalFields from workProperties for Scaffolding
      const rentalsProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.RENTALS);
      const scaffoldingItem = rentalsProperty?.items?.find(item => item.name === WORK_ITEM_NAMES.SCAFFOLDING_EN);
      return {
        ...baseItem,
        propertyId: 'scaffolding',
        name: WORK_ITEM_NAMES.SCAFFOLDING_EN,
        selectedType: WORK_ITEM_NAMES.SCAFFOLDING_EN,
        rentalFields: scaffoldingItem?.fields || [],
        fields: {
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.size1 || 0,
          [WORK_ITEM_NAMES.HEIGHT]: dbRecord.size2 || 0,
          [WORK_ITEM_NAMES.RENTAL_DURATION]: dbRecord.number_of_days || 0
        }
      };
    }

    case 'core_drills': {
      // Get rentalFields from workProperties for Core Drill
      const rentalsPropertyCD = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.RENTALS);
      const coreDrillItem = rentalsPropertyCD?.items?.find(item => item.name === WORK_ITEM_NAMES.CORE_DRILL);
      return {
        ...baseItem,
        propertyId: 'core_drill',
        name: WORK_ITEM_NAMES.CORE_DRILL,
        selectedType: WORK_ITEM_NAMES.CORE_DRILL,
        rentalFields: coreDrillItem?.fields || [],
        fields: {
          [WORK_ITEM_NAMES.COUNT]: dbRecord.count || 0
        }
      };
    }

    case 'tool_rentals': {
      // Get rentalFields from workProperties for Tool Rental
      const rentalsPropertyTR = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.RENTALS);
      const toolRentalItem = rentalsPropertyTR?.items?.find(item => item.name === WORK_ITEM_NAMES.TOOL_RENTAL);
      return {
        ...baseItem,
        propertyId: 'tool_rental',
        name: WORK_ITEM_NAMES.TOOL_RENTAL,
        selectedType: WORK_ITEM_NAMES.TOOL_RENTAL,
        rentalFields: toolRentalItem?.fields || [],
        fields: {
          [WORK_ITEM_NAMES.COUNT]: dbRecord.count || 0
        }
      };
    }

    case 'demolitions':
      // Preparatory and demolition works use DURATION (hours)
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.DURATION_EN]: dbRecord.count || 0
        }
      };

    case 'installation_of_corner_beads':
    case 'plastering_of_window_sashes':
      // These use LENGTH field stored as count
      return {
        ...baseItem,
        fields: {
          [WORK_ITEM_NAMES.LENGTH]: dbRecord.count || 0
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
 * @param {Object} workItem - Optional work item to check selectedType for custom work/material
 * @returns {string|null} Database table name
 */
export function getTableName(propertyId, workItem = null) {
  // Handle custom work/material - route to correct table based on selectedType
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && workItem) {
    if (workItem.selectedType === 'Material') {
      return 'custom_materials';
    } else {
      return 'custom_works';
    }
  }
  return PROPERTY_TO_TABLE[propertyId] || null;
}

/**
 * Tables that can have doors/windows
 */
export const TABLES_WITH_DOORS_WINDOWS = [
  'brick_load_bearing_walls',
  'brick_partitions',
  'facade_plasterings',
  'netting_walls',
  'plasterboarding_offset_walls',
  'plasterboarding_partitions',
  'plastering_walls',
  'tile_ceramics',
  'plasterboarding_ceilings' // Windows only
];

/**
 * Check if a table can have doors
 */
export function tableCanHaveDoors(tableName) {
  // Ceilings can't have doors
  return TABLES_WITH_DOORS_WINDOWS.includes(tableName) && tableName !== 'plasterboarding_ceilings';
}

/**
 * Check if a table can have windows
 */
export function tableCanHaveWindows(tableName) {
  return TABLES_WITH_DOORS_WINDOWS.includes(tableName);
}

/**
 * Convert door from database to app format
 * @param {Object} dbDoor - Door record from database
 * @returns {Object} App door item
 */
export function doorFromDatabase(dbDoor) {
  return {
    id: dbDoor.id || dbDoor.c_id,
    c_id: dbDoor.c_id,
    width: dbDoor.size1 || 0,
    height: dbDoor.size2 || 0
  };
}

/**
 * Convert window from database to app format
 * @param {Object} dbWindow - Window record from database
 * @returns {Object} App window item
 */
export function windowFromDatabase(dbWindow) {
  return {
    id: dbWindow.id || dbWindow.c_id,
    c_id: dbWindow.c_id,
    width: dbWindow.size1 || 0,
    height: dbWindow.size2 || 0
  };
}

/**
 * Convert door from app to database format
 * @param {Object} appDoor - Door from app
 * @returns {Object} Database door record
 */
export function doorToDatabase(appDoor) {
  return {
    c_id: appDoor.c_id || appDoor.id || crypto.randomUUID(),
    size1: appDoor.width || 0,
    size2: appDoor.height || 0
  };
}

/**
 * Convert window from app to database format
 * @param {Object} appWindow - Window from app
 * @returns {Object} Database window record
 */
export function windowToDatabase(appWindow) {
  return {
    c_id: appWindow.c_id || appWindow.id || crypto.randomUUID(),
    size1: appWindow.width || 0,
    size2: appWindow.height || 0
  };
}