import {
  WORK_ITEM_NAMES,
  WORK_ITEM_PROPERTY_IDS,
  WORK_ITEM_SUBTITLES,
  MATERIAL_ITEM_NAMES,
  UNIT_TYPES,
  DEFAULT_AREAS,
  MATERIAL_MULTIPLIERS
} from '../config/constants';
import { getMaterialKey, findMaterialByKey, getAdhesiveKey, findAdhesiveByKey } from '../config/materialKeys';
import { unitToDisplaySymbol } from '../services/workItemsMapping';

/**
 * Check if a subtitle contains a subtype (handles both English and Slovak)
 * @param {string} subtitle - The subtitle to check
 * @param {string[]} subtypePair - Pair of [english, slovak] terms to match
 * @returns {boolean} True if subtitle contains the subtype
 */
export const subtitleContainsSubtype = (subtitle, subtypePair) => {
  if (!subtitle || !subtypePair) return false;
  const subtitleLower = subtitle.toLowerCase();
  return subtypePair.some(term => subtitleLower.includes(term.toLowerCase()));
};

/**
 * Match work subtype between work item and price list item
 * Used for items like plasterboarding, netting, painting that have wall/ceiling variants
 * @param {string} workSubtitle - The work item's subtitle
 * @param {string} itemSubtitle - The price list item's subtitle
 * @param {string} subtypeKey - Key from WORK_ITEM_SUBTITLES (e.g., 'WALL', 'CEILING')
 * @returns {boolean} True if both subtitles match the same subtype
 */
export const matchWorkSubtype = (workSubtitle, itemSubtitle, subtypeKey) => {
  const subtypePair = WORK_ITEM_SUBTITLES[subtypeKey];
  if (!subtypePair) return false;

  const workHasSubtype = subtitleContainsSubtype(workSubtitle, subtypePair);
  const itemHasSubtype = subtitleContainsSubtype(itemSubtitle, subtypePair);

  return workHasSubtype && itemHasSubtype;
};

/**
 * Check if work and item are both ceiling or both NOT ceiling
 * Used for distinguishing wall vs ceiling variants
 * @param {string} workSubtitle - The work item's subtitle
 * @param {string} itemSubtitle - The price list item's subtitle
 * @returns {boolean|null} True if both ceiling, false if neither, null if mismatch
 */
export const matchCeilingSubtype = (workSubtitle, itemSubtitle) => {
  const ceilingPair = WORK_ITEM_SUBTITLES.CEILING;
  const workIsCeiling = subtitleContainsSubtype(workSubtitle, ceilingPair);
  const itemIsCeiling = subtitleContainsSubtype(itemSubtitle, ceilingPair);

  // If one is ceiling and the other isn't, it's a mismatch
  if (workIsCeiling !== itemIsCeiling) return null;

  return workIsCeiling; // Both match (either both ceiling or both not)
};

/**
 * Check if a work item is a tiling or paving item
 * @param {Object} workItem - Work item with propertyId
 * @param {Object} priceItem - Price list item with name (optional)
 * @returns {boolean} True if tiling or paving
 */
export const isTilingOrPavingItem = (workItem, priceItem = null) => {
  // Check by propertyId first (most reliable)
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60 ||
    workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60) {
    return true;
  }

  // Check by price item name if provided
  if (priceItem?.name) {
    const nameLower = priceItem.name.toLowerCase();
    return nameLower.includes(WORK_ITEM_NAMES.TILING.toLowerCase()) ||
      nameLower.includes(WORK_ITEM_NAMES.OBKLAD.toLowerCase()) ||
      nameLower.includes(WORK_ITEM_NAMES.PAVING.toLowerCase()) ||
      nameLower.includes(WORK_ITEM_NAMES.DLAZBA.toLowerCase());
  }

  return false;
};

/**
 * Check if a work item is a netting item
 * @param {Object} workItem - Work item with propertyId
 * @param {Object} priceItem - Price list item with name (optional)
 * @returns {boolean} True if netting
 */
export const isNettingItem = (workItem, priceItem = null) => {
  // Check by propertyId first (most reliable)
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL ||
    workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING) {
    return true;
  }

  // Check by price item name if provided
  if (priceItem?.name) {
    const nameLower = priceItem.name.toLowerCase();
    return nameLower.includes(WORK_ITEM_NAMES.NETTING.toLowerCase()) ||
      nameLower.includes(WORK_ITEM_NAMES.SIETKOVANIE.toLowerCase());
  }

  return false;
};

/**
 * Check if a work item is a floating floor item
 * @param {Object} workItem - Work item with propertyId
 * @param {Object} priceItem - Price list item with name (optional)
 * @returns {boolean} True if floating floor
 */
export const isFloatingFloorItem = (workItem, priceItem = null) => {
  // Check by propertyId first
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR) {
    return true;
  }

  // Check by price item name if provided
  if (priceItem?.name) {
    const nameLower = priceItem.name.toLowerCase();
    return nameLower.includes(WORK_ITEM_NAMES.FLOATING_FLOOR.toLowerCase()) ||
      nameLower.includes(WORK_ITEM_NAMES.PLAVAJUCA_PODLAHA.toLowerCase());
  }

  return false;
};

/**
 * Check if a work item is a plastering item
 * @param {Object} workItem - Work item with propertyId
 * @param {Object} priceItem - Price list item with name (optional)
 * @returns {boolean} True if plastering
 */
export const isPlasteringItem = (workItem, priceItem = null) => {
  // Check by propertyId or name mapping
  return (
    workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL ||
    workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING ||
    workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_SASH
  );
};

/**
 * Calculate work quantity from work item fields
 * Handles all quantity types: area (m²), length (m), count (pc), time (h), distance (km)
 * @param {Object} workItem - Work item with fields
 * @param {Object} options - Optional configuration
 * @param {boolean} options.subtractOpenings - Whether to subtract door/window areas (default: true)
 * @returns {number} Calculated quantity
 */
export const calculateWorkQuantity = (workItem, options = {}) => {
  const { subtractOpenings = true } = options;

  if (!workItem || !workItem.fields) return 0;

  const values = workItem.fields;
  let quantity = 0;

  // Area calculation (Width × Height or Width × Length)
  if (values.Width && values.Height) {
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
  } else if (values.Width && values.Length) {
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
  } else if (values.Length) {
    // Linear calculation (m)
    quantity = parseFloat(values.Length || 0);
  } else if (values.Circumference) {
    // Circumference (m)
    quantity = parseFloat(values.Circumference || 0);
  } else if (values.hasOwnProperty('Count') || values.hasOwnProperty(WORK_ITEM_NAMES.COUNT) || values.hasOwnProperty(WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN) || values.hasOwnProperty(WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK)) {
    // Count calculation (pc)
    quantity = parseFloat(values.Count || values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK] || 0);
  } else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) && workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) {
    // Distance × days for commute
    const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
    const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
    quantity = distance * (days > 0 ? days : 1);
  } else if (values[WORK_ITEM_NAMES.QUANTITY]) {
    // Custom quantity field
    quantity = parseFloat(values[WORK_ITEM_NAMES.QUANTITY] || 0);
  } else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK]) {
    // Time calculation (h)
    quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
  } else if (values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) {
    // Distance calculation (km)
    quantity = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
  } else if (values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
    // Rental duration
    quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
  }

  // Subtract door/window areas (optional)
  if (subtractOpenings) {
    quantity = subtractOpeningsFromQuantity(workItem, quantity);
  }

  return Math.max(0, quantity);
};

/**
 * Subtract door and window areas from quantity
 * Uses actual dimensions if available, otherwise uses default areas
 * @param {Object} workItem - Work item with doorWindowItems or legacy fields
 * @param {number} quantity - Base quantity to subtract from
 * @returns {number} Adjusted quantity
 */
export const subtractOpeningsFromQuantity = (workItem, quantity) => {
  if (!workItem) return quantity;

  const values = workItem.fields || {};

  // Use actual door/window dimensions if available
  if (workItem.doorWindowItems) {
    if (workItem.doorWindowItems.doors) {
      workItem.doorWindowItems.doors.forEach(door => {
        const doorArea = parseFloat(door.width || 0) * parseFloat(door.height || 0);
        quantity -= doorArea;
      });
    }
    if (workItem.doorWindowItems.windows) {
      workItem.doorWindowItems.windows.forEach(window => {
        const windowArea = parseFloat(window.width || 0) * parseFloat(window.height || 0);
        quantity -= windowArea;
      });
    }
  } else {
    // Fallback to default areas
    if (values.Doors) {
      quantity -= parseFloat(values.Doors || 0) * DEFAULT_AREAS.DOOR;
    }
    if (values.Windows) {
      quantity -= parseFloat(values.Windows || 0) * DEFAULT_AREAS.WINDOW;
    }
  }

  return quantity;
};

// Helper to format price string
export const formatPrice = (price) => {
  return `€${price.toFixed(2).replace('.', ',')}`;
};

/**
 * Determine the unit and quantity for a work item based on its fields
 * @param {Object} item - Work item with fields, name, propertyId
 * @param {number} defaultQuantity - Default quantity from calculation
 * @returns {{ unit: string, quantity: number }}
 */
export const determineUnitAndQuantity = (item, defaultQuantity = 0) => {
  const values = item.fields || {};
  let unit = item.calculation?.unit || UNIT_TYPES.METER_SQUARE;
  let quantity = defaultQuantity;

  // If calculation already has a unit, use it as-is
  if (item.calculation?.unit) {
    return { unit, quantity };
  }

  // Check for scaffolding rental (has "- prenájom" in subtitle)
  if (item.subtitle && item.subtitle.includes('- prenájom') && values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
    quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
    unit = quantity > 1 ? UNIT_TYPES.DAYS : UNIT_TYPES.DAY;
  }
  // Distance-based items (Journey/Commute)
  else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) &&
    (item.name === WORK_ITEM_NAMES.JOURNEY || item.name === WORK_ITEM_NAMES.COMMUTE || item.name === 'Cesta')) {
    unit = UNIT_TYPES.KM;
    const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
    const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
    quantity = distance * (days > 0 ? days : 1);
  }
  // Duration-based items (hour-based rentals)
  else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] ||
    (values[WORK_ITEM_NAMES.COUNT] && (item.name === WORK_ITEM_NAMES.CORE_DRILL ||
      item.name === 'Rental' || item.name === WORK_ITEM_NAMES.TOOL_RENTAL))) {
    unit = UNIT_TYPES.HOUR;
    quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || values[WORK_ITEM_NAMES.COUNT] || 0);
  }
  // Count-based items (pieces)
  else if (values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) {
    unit = UNIT_TYPES.PIECE;
    quantity = parseFloat(values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK] || 0);
  }
  // Linear items (length only, no width/height)
  else if (values[WORK_ITEM_NAMES.LENGTH] && !values[WORK_ITEM_NAMES.WIDTH] && !values[WORK_ITEM_NAMES.HEIGHT]) {
    unit = UNIT_TYPES.METER;
    quantity = parseFloat(values[WORK_ITEM_NAMES.LENGTH] || 0);
  }
  // Circumference-based items
  else if (values[WORK_ITEM_NAMES.CIRCUMFERENCE]) {
    unit = UNIT_TYPES.METER;
    quantity = parseFloat(values[WORK_ITEM_NAMES.CIRCUMFERENCE] || 0);
  }
  // Distance fallback
  else if (values[WORK_ITEM_NAMES.DISTANCE_EN]) {
    unit = UNIT_TYPES.KM;
    quantity = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || 0);
  }

  return { unit, quantity };
};

// Helper to check if a work item has meaningful input (non-zero values)
export const hasWorkItemInput = (workItem) => {
  if (!workItem || !workItem.fields) return false;

  const values = workItem.fields;
  const fieldKeys = Object.keys(values);

  if (fieldKeys.length === 0) return false;

  // Check if any field has a meaningful value
  return fieldKeys.some(key => {
    const value = values[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Check if it's a non-empty string that isn't just "0" or empty
      if (trimmed.length === 0) return false;
      // If the string represents a number, check if it's > 0
      const numValue = parseFloat(trimmed);
      if (!isNaN(numValue)) return numValue > 0;
      // For non-numeric strings (like names), check if non-empty
      return trimmed.length > 0;
    }
    if (typeof value === 'boolean') return value === true;
    return false;
  });
};

/**
 * Find matching price list item for a work item
 * Maps work item propertyId to the corresponding price list entry
 * Handles subtypes (wall/ceiling, simple/double/triple) for accurate matching
 *
 * @param {Object} workItem - Work item with propertyId, subtitle, selectedType
 * @param {Object} priceList - Price list with work, material, installations, others categories
 * @returns {Object|null} Matching price list item or null if not found
 */
export const findPriceListItem = (workItem, priceList) => {
  if (!workItem || !workItem.propertyId || !priceList) return null;

  // Create mapping from work item IDs to price list items
  const workIdMappings = {
    [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: WORK_ITEM_NAMES.PREPARATORY_AND_DEMOLITION_WORKS,
    [WORK_ITEM_PROPERTY_IDS.WIRING]: ['Wiring', 'Electrical installation work', 'Elektroinštalačné práce'],
    [WORK_ITEM_PROPERTY_IDS.PLUMBING]: ['Plumbing', 'Plumbing work', 'Vodoinštalačné práce'],
    [WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS]: WORK_ITEM_NAMES.BRICK_PARTITIONS,
    [WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING]: WORK_ITEM_NAMES.BRICK_LOAD_BEARING_WALL,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.NETTING_WALL]: WORK_ITEM_NAMES.NETTING,
    [WORK_ITEM_PROPERTY_IDS.NETTING_CEILING]: WORK_ITEM_NAMES.NETTING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL]: WORK_ITEM_NAMES.PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING]: WORK_ITEM_NAMES.PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING]: WORK_ITEM_NAMES.FACADE_PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: WORK_ITEM_NAMES.INSTALLATION_OF_CORNER_BEAD,
    [WORK_ITEM_PROPERTY_IDS.WINDOW_SASH]: WORK_ITEM_NAMES.PLASTERING_OF_WINDOW_SASH,
    [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: WORK_ITEM_NAMES.PENETRATION_COATING,
    [WORK_ITEM_PROPERTY_IDS.PAINTING_WALL]: WORK_ITEM_NAMES.PAINTING,
    [WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING]: WORK_ITEM_NAMES.PAINTING,
    [WORK_ITEM_PROPERTY_IDS.LEVELLING]: WORK_ITEM_NAMES.LEVELLING,
    [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: WORK_ITEM_NAMES.FLOATING_FLOOR,
    [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: WORK_ITEM_NAMES.TILING_UNDER_60CM,
    [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: WORK_ITEM_NAMES.PAVING_UNDER_60CM,
    [WORK_ITEM_PROPERTY_IDS.GROUTING]: WORK_ITEM_NAMES.GROUTING,
    [WORK_ITEM_PROPERTY_IDS.SILICONING]: WORK_ITEM_NAMES.SILICONING,
    [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: WORK_ITEM_NAMES.SANITARY_INSTALLATIONS,
    [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: WORK_ITEM_NAMES.WINDOW_INSTALLATION,
    [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: WORK_ITEM_NAMES.INSTALLATION_OF_DOOR_JAMB,
    [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK]: WORK_ITEM_NAMES.CUSTOM_WORK_AND_MATERIAL,
    [WORK_ITEM_PROPERTY_IDS.COMMUTE]: WORK_ITEM_NAMES.COMMUTE,
    [WORK_ITEM_PROPERTY_IDS.RENTALS]: WORK_ITEM_NAMES.TOOL_RENTAL // This will be handled specially for different rental types
  };

  // For rental items, use the actual rental item name instead of generic mapping
  // Rental items can have propertyId of 'rentals', 'core_drill', 'tool_rental', or 'scaffolding'
  const rentalPropertyIds = ['rentals', 'core_drill', 'tool_rental', 'scaffolding'];
  let targetName;
  if (rentalPropertyIds.includes(workItem.propertyId) && workItem.name) {
    targetName = workItem.name; // Use "Scaffolding", "Core Drill", or "Tool rental"
  } else {
    targetName = workIdMappings[workItem.propertyId];
  }

  if (!targetName) {
    return null;
  }

  // Search through all categories in the price list
  for (const category of ['work', 'material', 'installations', 'others']) {
    if (priceList[category]) {
      // Find exact or partial match
      const item = priceList[category].find(item => {
        // Handle array of target names (for backward compatibility or multiple valid names)
        const nameMatch = Array.isArray(targetName)
          ? targetName.some(name => item.name.toLowerCase().includes(name.toLowerCase()))
          : item.name.toLowerCase().includes(targetName.toLowerCase());

        if (!nameMatch) return false;

        const isPlasterboarding = !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.PLASTERBOARDING.toLowerCase();
        const isNetting = !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.NETTING.toLowerCase();
        const isPainting = !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.PAINTING.toLowerCase();
        const isSanitary = !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.SANITARY_INSTALLATIONS.toLowerCase();

        // Skip subtitle matching for rental items (Scaffolding, Core Drill, Tool rental)
        // These items have selectedType set to the item name but subtitles are descriptive (e.g., "assembly and disassembly")
        const rentalPropertyIds = ['rentals', 'core_drill', 'tool_rental', 'scaffolding'];
        if (rentalPropertyIds.includes(workItem.propertyId)) {
          return true; // Just match by name for rentals
        }

        // For items with subtypes (like plasterboarding), check subtitle too
        if (workItem.selectedType && item.subtitle) {
          const subtitleMatch = item.subtitle.toLowerCase().includes(workItem.selectedType.toLowerCase());

          // For plasterboarding, check both the work subtype (partition/offset wall/ceiling) and type (simple/double)
          if (isPlasterboarding && workItem.subtitle) {
            const subtypeMatch = (
              matchWorkSubtype(workItem.subtitle, item.subtitle, 'PARTITION') ||
              matchWorkSubtype(workItem.subtitle, item.subtitle, 'OFFSET_WALL') ||
              matchWorkSubtype(workItem.subtitle, item.subtitle, 'CEILING')
            );

            // For ceiling, no type match needed since it's just "ceiling" not "ceiling, simple"
            const isCeiling = subtitleContainsSubtype(workItem.subtitle, WORK_ITEM_SUBTITLES.CEILING);
            const workType = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
            const typeMatch = isCeiling ? true : (!workType || item.subtitle.toLowerCase().includes(workType));

            return subtypeMatch && typeMatch;
          }

          return subtitleMatch;
        }

        // Check for wall/ceiling subtype matching (Plasterboarding, Netting, Painting)
        if ((isPlasterboarding || isNetting || isPainting) && item.subtitle && workItem.subtitle) {
          const ceilingMatch = matchCeilingSubtype(workItem.subtitle, item.subtitle);

          // If ceiling match returns null, it means mismatch (one is ceiling, other isn't)
          if (ceilingMatch === null) return false;

          // For Netting and Painting, also check wall subtype when not ceiling
          if (!ceilingMatch && (isNetting || isPainting)) {
            return matchWorkSubtype(workItem.subtitle, item.subtitle, 'WALL');
          }

          return true;
        }

        // For sanitary installations, match subtitle exactly (the actual type like "Concealed toilet")
        if (isSanitary && workItem.subtitle && item.subtitle) {
          return workItem.subtitle.toLowerCase() === item.subtitle.toLowerCase();
        }

        return true;
      });

      if (item) return item;
    }
  }
  return null;
};

/**
 * Calculate price for a single work item
 * Multiplies quantity by price per unit from price list
 * Handles special cases: custom work, sanitary, window/door installation, scaffolding
 *
 * @param {Object} workItem - Work item with fields and propertyId
 * @param {Object} priceItem - Matching price list item with price
 * @returns {number} Calculated work cost
 */
export const calculateWorkItemPrice = (workItem, priceItem) => {
  const values = workItem.fields;

  // Handle custom work items that have their own price
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const quantity = parseFloat(values[WORK_ITEM_NAMES.QUANTITY] || 0);
    const price = parseFloat(values[WORK_ITEM_NAMES.PRICE] || 0);
    return quantity * price;
  }

  if (!priceItem) return 0;

  // Handle sanitary installations - use price list for work, Price field is for material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    // Always use price list for installation work
    return count * priceItem.price;
  }

  // Handle window installation - work cost based on circumference, Price field is for window material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
    const circumference = parseFloat(values.Circumference || 0);
    // Work cost = circumference * price per meter from price list
    return circumference * priceItem.price;
  }

  // Handle door jamb installation - work cost based on count, Price field is for door jamb material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    // Work cost = count * price per piece from price list
    return count * priceItem.price;
  }

  // Note: Scaffolding is handled specially in calculateRoomPriceWithMaterials with price list lookup
  // This fallback uses priceItem.price for assembly and default rental rate
  if (values[WORK_ITEM_NAMES.RENTAL_DURATION] && workItem.subtitle &&
    (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) ||
      workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) {
    const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
    const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
    // Scaffolding cost = assembly (priceItem.price per m²) + rental (default rate)
    const assemblyCost = area * priceItem.price;
    const rentalCost = area * 10 * duration;
    return assemblyCost + rentalCost;
  }

  // Use the shared helper function for quantity calculation
  const quantity = calculateWorkQuantity(workItem);

  return Math.max(0, quantity * priceItem.price);
};

/**
 * Calculate cost for a specific material based on quantity
 * Handles materials with capacity (packages) and direct unit pricing
 *
 * @param {Object} material - Material item with price and optional capacity
 * @param {number} workQuantity - Quantity of work (area, length, etc.)
 * @returns {number} Calculated material cost
 */
/**
 * Calculate cost for a specific material based on quantity
 * Handles materials with capacity (packages) and direct unit pricing
 *
 * @param {Object} material - Material item with price and optional capacity
 * @param {number} workQuantity - Quantity of work (area, length, etc.)
 * @returns {{ cost: number, count: number }} Calculated material cost and package count
 */
export const calculateMaterialCost = (material, workQuantity) => {
  if (!material || !workQuantity) return { cost: 0, count: 0 };

  // If material has capacity, calculate based on packages needed
  if (material.capacity) {
    const capacityValue = material.capacity.value || material.capacity;
    const packagesNeeded = Math.ceil(workQuantity / capacityValue);
    return {
      cost: packagesNeeded * (material.price || 0),
      count: packagesNeeded
    };
  }

  // Direct calculation for materials priced per unit area/length
  return {
    cost: workQuantity * (material.price || 0),
    count: workQuantity
  };
};

/**
 * Comprehensive calculation for a work item including materials and adhesive
 * @param {Object} workItem - Work item with fields, propertyId
 * @param {Object} priceItem - Matching price list item
 * @param {Object} priceList - Full price list for material lookup
 */
export const calculateWorkItemWithMaterials = (
  workItem,
  priceItem,
  priceList,
  totalTilingPavingArea = 0,
  skipAdhesive = false,
  totalNettingArea = 0,
  totalPlasteringQuantity = 0,
  skipPlasteringMaterial = false,
  skipNettingMaterial = false
) => {
  const values = workItem.fields || {};

  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const totalCost = calculateWorkItemPrice(workItem, null);
    const quantity = parseFloat(values[WORK_ITEM_NAMES.QUANTITY] || 0);
    // Convert iOS unit values (e.g., "squareMeter") to display symbols (e.g., "m²")
    const rawUnit = workItem.selectedUnit || values[WORK_ITEM_NAMES.UNIT] || values.Unit || UNIT_TYPES.METER_SQUARE;
    const unit = unitToDisplaySymbol(rawUnit);

    if (workItem.selectedType === 'Material') {
      return { workCost: 0, materialCost: totalCost, quantity, unit };
    }
    return { workCost: totalCost, materialCost: 0, quantity, unit };
  }

  const workCost = calculateWorkItemPrice(workItem, priceItem);
  let materialCost = 0;
  let material = null;
  let additionalMaterial = null;
  let additionalMaterialQuantity = 0;
  let additionalMaterialCost = 0;

  // Calculate quantity using the shared helper (includes door/window subtraction)
  let quantity = calculateWorkQuantity(workItem);

  // Initialize materialQuantityToUse with base quantity
  let materialQuantityToUse = quantity;

  // For plastering aggregation, use the total room quantity if available
  const isPlastering = isPlasteringItem(workItem, priceItem);
  if (isPlastering && totalPlasteringQuantity > 0) {
    materialQuantityToUse = totalPlasteringQuantity;
  }

  const isNetting = isNettingItem(workItem, priceItem);
  if (isNetting && totalNettingArea > 0) {
    materialQuantityToUse = totalNettingArea;
  }

  let materialQuantityUnrounded = materialQuantityToUse;

  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    const price = parseFloat(values.Price || 0);
    materialCost = count * price; // User-entered price is for the product/material
  } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
    // Window installation: Price field is the cost of the actual window (material)
    const price = parseFloat(values.Price || 0);
    materialCost = price; // Each window item has its own price
  } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) {
    // Door jamb installation: Price field is the cost per door jamb (material)
    const count = parseFloat(values.Count || 0);
    const price = parseFloat(values.Price || 0);
    materialCost = count * price; // Count * price per piece
  } else {
    // Find matching material using direct key lookup
    const materialKey = getMaterialKey(workItem.propertyId, workItem.selectedType);
    material = findMaterialByKey(materialKey, priceList.material);

    // Skip if we are told to skip this material (used for aggregation)
    if (material && isPlastering && skipPlasteringMaterial) {
      materialCost = 0;
      materialQuantityToUse = 0;
      materialQuantityUnrounded = 0;
    } else if (material && isNetting && skipNettingMaterial) {
      materialCost = 0;
      materialQuantityToUse = 0;
      materialQuantityUnrounded = 0;
    } else if (material) {
      // Apply multipliers and rounding based on work type
      if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR) {
        materialQuantityToUse = Math.ceil(quantity * MATERIAL_MULTIPLIERS.FLOATING_FLOOR);
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION) {
        const type = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
        if (type.includes('simple') || type.includes('jednoduch')) {
          materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.PARTITION_SIMPLE;
        } else if (type.includes('double') || type.includes('dvojit')) {
          materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.PARTITION_DOUBLE;
        } else if (type.includes('triple') || type.includes('trojit')) {
          materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.PARTITION_TRIPLE;
        }
        // Plasterboard is already rounded by its capacity in calculateMaterialCost
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET) {
        const type = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
        if (type.includes('simple') || type.includes('jednoduch')) {
          materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.OFFSET_SIMPLE;
        } else if (type.includes('double') || type.includes('dvojit')) {
          materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.OFFSET_DOUBLE;
        }
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING) {
        materialQuantityToUse = quantity * MATERIAL_MULTIPLIERS.PLASTERBOARDING.CEILING;
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL || workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING) {
        materialQuantityToUse = Math.ceil(materialQuantityToUse * MATERIAL_MULTIPLIERS.NETTING);
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS || workItem.propertyId === WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING) {
        materialQuantityToUse = Math.ceil(materialQuantityToUse);
      } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING) {
        materialQuantityToUse = Math.ceil(materialQuantityToUse);
      }

      materialQuantityUnrounded = materialQuantityToUse;
      const materialCalc = calculateMaterialCost(material, materialQuantityToUse);
      materialCost = materialCalc.cost;
      // Store the calculated count (packages or units)
      materialQuantityToUse = materialCalc.count;
    }
  }

  // For tiling and paving works, add adhesive cost using key lookup
  const adhesiveKey = getAdhesiveKey(workItem.propertyId);
  if (!skipAdhesive && adhesiveKey) {
    const adhesive = findAdhesiveByKey(adhesiveKey, priceList.material);

    if (adhesive) {
      additionalMaterial = adhesive;
      // Determine area to use based on work type
      let areaToUse = quantity;
      if (adhesiveKey === 'adhesive_tiling' && totalTilingPavingArea > 0) {
        areaToUse = totalTilingPavingArea;
      } else if (adhesiveKey === 'adhesive_netting' && totalNettingArea > 0) {
        areaToUse = totalNettingArea;
      }
      additionalMaterialQuantity = areaToUse;
      const additionalMaterialCalc = calculateMaterialCost(additionalMaterial, areaToUse);
      additionalMaterialCost = additionalMaterialCalc.cost;
      // Store the calculated count (packages) for display
      additionalMaterialQuantity = additionalMaterialCalc.count;
    }
  }

  return {
    workCost,
    materialCost,
    additionalMaterialCost,
    material,
    additionalMaterial,
    additionalMaterialQuantity,
    quantity,
    materialQuantity: materialQuantityToUse, // Return the specific material quantity used (rounded)
    materialQuantityUnrounded // Return the raw quantity before rounding
  };
};

/**
 * Calculate total price for a room including work, materials, and others
 *
 * This is the main calculation function that:
 * - Iterates through all work items in a room
 * - Calculates work costs and material costs for each item
 * - Handles special cases: scaffolding (split into assembly + rental), tiling/paving (adhesive aggregation)
 * - Adds auxiliary costs (percentage of work and material totals)
 * - Returns detailed breakdown for display in RoomPriceSummary
 *
 * @param {Object} room - Room object with workItems array
 * @param {Object} priceList - Price list with work, material, installations, others categories
 * @returns {Object} Calculation result with totals and itemized breakdowns
 */
export const calculateRoomPriceWithMaterials = (room, priceList) => {
  if (!room.workItems || room.workItems.length === 0) return {
    workTotal: 0,
    materialTotal: 0,
    othersTotal: 0,
    total: 0,
    items: [],
    materialItems: [],
    othersItems: [],
    baseWorkTotal: 0,
    baseMaterialTotal: 0,
    auxiliaryWorkCost: 0,
    auxiliaryMaterialCost: 0
  };

  // Use provided price list (mandatory for this utility)
  const activePriceList = priceList;
  if (!activePriceList) return {
    workTotal: 0, materialTotal: 0, othersTotal: 0, total: 0, items: [], materialItems: [], othersItems: [],
    baseWorkTotal: 0, baseMaterialTotal: 0, auxiliaryWorkCost: 0, auxiliaryMaterialCost: 0
  };

  let workTotal = 0;
  let materialTotal = 0;
  let othersTotal = 0;
  const items = [];
  const materialItems = [];
  const othersItems = [];

  // Pre-calculate total area for tiling and paving to optimize adhesive calculation
  let totalTilingPavingArea = 0;
  let tilingPavingAdhesiveAdded = false;
  let totalNettingArea = 0;
  let nettingAdhesiveAdded = false;
  // Track non-large-format tiling/paving area for grouting work calculation
  let totalGroutingArea = 0;
  // Track floating floor perimeter for skirting calculation
  let totalFloatingFloorPerimeter = 0;
  // Track total plastering quantity for material aggregation (bags)
  let totalPlasteringQuantity = 0;
  let plasteringMaterialAdded = false;
  let nettingMaterialAdded = false;

  room.workItems.forEach(workItem => {
    // Skip items with no meaningful input (all fields are 0 or empty)
    if (!hasWorkItemInput(workItem)) return;

    const priceItem = findPriceListItem(workItem, activePriceList);
    if (workItem.fields && (priceItem || workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK)) {
      const isTilingOrPaving = isTilingOrPavingItem(workItem, priceItem);
      const isNetting = isNettingItem(workItem, priceItem);
      const isFloatingFloor = isFloatingFloorItem(workItem, priceItem);
      const isLargeFormat = isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD];

      if (isTilingOrPaving) {
        const area = calculateWorkQuantity(workItem);
        totalTilingPavingArea += area;
        // Only add to grouting area if NOT large format
        if (!isLargeFormat) {
          totalGroutingArea += area;
        }
      }

      if (isNetting) {
        const area = calculateWorkQuantity(workItem);
        totalNettingArea += area;
      }

      if (isFloatingFloor) {
        const values = workItem.fields;
        let perimeter = 0;
        if (values.Width && values.Length) {
          perimeter = (parseFloat(values.Width || 0) + parseFloat(values.Length || 0)) * 2;
        } else if (values.Width && values.Height) {
          perimeter = (parseFloat(values.Width || 0) + parseFloat(values.Height || 0)) * 2;
        } else if (values.Circumference) {
          perimeter = parseFloat(values.Circumference || 0);
        }

        // Subtract door widths from perimeter if doors are defined?
        // Usually skirting is not installed under doors. 
        // Logic: perimeter - (doors * door_width)
        // For simplicity, using simple perimeter for now as per instructions "2+2+5+5 thats 14".

        totalFloatingFloorPerimeter += perimeter;
      }

      if (isPlasteringItem(workItem, priceItem)) {
        totalPlasteringQuantity += calculateWorkQuantity(workItem);
      }
    }
  });

  room.workItems.forEach(workItem => {
    // Skip items with no meaningful input (all fields are 0 or empty)
    if (!hasWorkItemInput(workItem)) return;

    const priceItem = findPriceListItem(workItem, activePriceList);

    if (workItem.fields && (priceItem || workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK)) {
      // Special handling for scaffolding - show as two separate items
      // Check by propertyId first (most reliable), then by name/subtitle
      const isScaffolding = workItem.propertyId === 'scaffolding' ||
        (workItem.subtitle && (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) ||
          workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
        (workItem.name && (workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase())));

      if (isScaffolding) {
        const values = workItem.fields;
        const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
        const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);

        // Look up scaffolding prices from price list
        const scaffoldingAssemblyItem = activePriceList.others?.find(item =>
          item.name === WORK_ITEM_NAMES.SCAFFOLDING_EN && item.subtitle?.includes('assembly')
        );
        const scaffoldingRentalItem = activePriceList.others?.find(item =>
          item.name === WORK_ITEM_NAMES.SCAFFOLDING_EN && item.subtitle?.includes('rental')
        );

        // Use price list values or fallback to defaults
        const assemblyPricePerM2 = scaffoldingAssemblyItem?.price || 30;
        const rentalPricePerDayPerM2 = scaffoldingRentalItem?.price || 10;

        // Assembly cost
        const assemblyCost = area * assemblyPricePerM2;
        const assemblyCalculation = {
          workCost: assemblyCost,
          materialCost: 0,
          quantity: area
        };

        // Use the scaffolding name constant for the subtitle
        const scaffoldingName = WORK_ITEM_NAMES.SCAFFOLDING_SK;

        othersItems.push({
          ...workItem,
          subtitle: scaffoldingName + ' - montáž a demontáž',
          calculation: assemblyCalculation
        });

        // Daily rental cost
        const rentalCost = area * rentalPricePerDayPerM2 * duration;
        const rentalCalculation = {
          workCost: rentalCost,
          materialCost: 0,
          quantity: area * duration
        };

        othersItems.push({
          ...workItem,
          id: workItem.id + '_rental',
          subtitle: scaffoldingName + ' - prenájom',
          fields: {
            ...workItem.fields,
            [WORK_ITEM_NAMES.RENTAL_DURATION]: duration
          },
          calculation: rentalCalculation
        });

        othersTotal += assemblyCost + rentalCost;
      } else {
        // Check if this is an "Others" category item
        // Rental items can have propertyId of 'rentals', 'core_drill', 'tool_rental', or 'scaffolding'
        const rentalPropertyIds = ['rentals', 'core_drill', 'tool_rental', 'scaffolding'];
        const isOthersItem = workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK ||
          workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE ||
          rentalPropertyIds.includes(workItem.propertyId) ||
          (workItem.subtitle && (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) ||
            workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
          (workItem.name && workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase())) ||
          (priceItem && (
            priceItem.name === WORK_ITEM_NAMES.CUSTOM_WORK_AND_MATERIAL ||
            priceItem.name === WORK_ITEM_NAMES.JOURNEY ||
            priceItem.name === WORK_ITEM_NAMES.COMMUTE ||
            priceItem.name === WORK_ITEM_NAMES.TOOL_RENTAL ||
            priceItem.name === WORK_ITEM_NAMES.CORE_DRILL
          ));

        if (isOthersItem) {
          const calculation = calculateWorkItemWithMaterials(workItem, priceItem, activePriceList);

          if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
            if (workItem.selectedType === 'Material') {
              materialTotal += (calculation.materialCost || 0) + (calculation.additionalMaterialCost || 0);
              materialItems.push({
                ...workItem,
                calculation
              });
            } else {
              workTotal += calculation.workCost;
              items.push({
                ...workItem,
                calculation
              });
            }
          } else {
            othersTotal += (calculation.workCost || 0) + (calculation.materialCost || 0);
            othersItems.push({
              ...workItem,
              calculation
            });
          }
        } else {
          // Normal calculation for work/material items
          // Check if this is a tiling/paving, netting, or plastering item for aggregation
          const isTilingOrPaving = isTilingOrPavingItem(workItem, priceItem);
          const isNetting = isNettingItem(workItem, priceItem);
          const isPlastering = isPlasteringItem(workItem, priceItem);

          // Check if Large Format toggle is enabled for tiling/paving
          let effectivePriceItem = priceItem;
          if (isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD]) {
            // Find the Large Format price item
            const largeFormatItem = activePriceList.work.find(item =>
              item.name === WORK_ITEM_NAMES.LARGE_FORMAT && item.subtitle === WORK_ITEM_NAMES.ABOVE_60CM
            );
            if (largeFormatItem) {
              effectivePriceItem = largeFormatItem;
            }
          }

          // Only add adhesive for the first tiling/paving or netting item
          const isLargeFormat = isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD];
          const skipTilingPavingAdhesive = isTilingOrPaving && tilingPavingAdhesiveAdded;
          const skipNettingAdhesive = isNetting && nettingAdhesiveAdded;
          const skipAdhesive = skipTilingPavingAdhesive || skipNettingAdhesive;

          // Only add material for the first item of its type in the room to aggregate quantities
          const skipPlasteringMaterial = isPlastering && plasteringMaterialAdded;
          const skipNettingMaterial = isNetting && nettingMaterialAdded;

          const calculation = calculateWorkItemWithMaterials(
            workItem,
            effectivePriceItem,
            activePriceList,
            totalTilingPavingArea,
            skipAdhesive,
            totalNettingArea,
            totalPlasteringQuantity,
            skipPlasteringMaterial,
            skipNettingMaterial
          );

          if (isTilingOrPaving && !tilingPavingAdhesiveAdded) {
            tilingPavingAdhesiveAdded = true;
          }
          if (isNetting && !nettingAdhesiveAdded) {
            nettingAdhesiveAdded = true;
            nettingMaterialAdded = true;
          }
          if (isPlastering && !plasteringMaterialAdded) {
            plasteringMaterialAdded = true;
          }

          workTotal += calculation.workCost;
          materialTotal += (calculation.materialCost || 0) + (calculation.additionalMaterialCost || 0);

          // For Large Format tiling/paving, update the name to show "veľkoformát"
          const itemToAdd = {
            ...workItem,
            calculation
          };
          if (isLargeFormat) {
            itemToAdd.isLargeFormat = true;
            // Update subtitle to indicate large format
            itemToAdd.subtitle = WORK_ITEM_NAMES.LARGE_FORMAT;
          }
          items.push(itemToAdd);

          // Track materials as separate items
          if (calculation.material) {
            let materialUnit = calculation.material.unit || UNIT_TYPES.METER_SQUARE;

            // If material has capacity, the quantity is packages/pieces. 
            // Extract the unit from material.unit (e.g. "€/pkg" -> "pkg")
            if (calculation.material.capacity && calculation.material.unit) {
              materialUnit = calculation.material.unit.includes('€/')
                ? calculation.material.unit.split('€/')[1]
                : calculation.material.unit;
            }

            materialItems.push({
              id: `${workItem.id}_material`,
              name: calculation.material.name,
              subtitle: calculation.material.subtitle || '',
              propertyId: workItem.propertyId,
              calculation: {
                quantity: calculation.materialQuantity, // Use the calculated quantity (packages/units)
                materialCost: calculation.materialCost,
                pricePerUnit: calculation.material.price,
                unit: materialUnit
              }
            });
          }

          // Track window installation materials (Okná)
          if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION && calculation.materialCost > 0) {
            const price = parseFloat(workItem.fields?.Price || 0);
            // Each window item is 1 piece
            materialItems.push({
              id: `${workItem.id}_window_material`,
              name: WORK_ITEM_NAMES.OKNA_DISPLAY_NAME,
              subtitle: '',
              propertyId: WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION,
              calculation: {
                quantity: 1,
                materialCost: price,
                pricePerUnit: price,
                unit: UNIT_TYPES.PIECE
              }
            });
          }

          // Track door jamb installation materials (Zárubne)
          if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION && calculation.materialCost > 0) {
            const count = parseFloat(workItem.fields?.Count || 0);
            const price = parseFloat(workItem.fields?.Price || 0);
            materialItems.push({
              id: `${workItem.id}_doorjamb_material`,
              name: WORK_ITEM_NAMES.ZARUBNA_DISPLAY_NAME,
              subtitle: '',
              propertyId: WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION,
              calculation: {
                quantity: count,
                materialCost: count * price,
                pricePerUnit: price,
                unit: UNIT_TYPES.PIECE
              }
            });
          }

          // Track additional materials (adhesive)
          if (calculation.additionalMaterial && calculation.additionalMaterialCost > 0) {
            const adhesiveUnit = calculation.additionalMaterial.unit || UNIT_TYPES.PACKAGE;
            const adhesivePrice = calculation.additionalMaterial.price || 0;
            const adhesiveCost = calculation.additionalMaterialCost;

            const adhesiveName = calculation.additionalMaterial.name;
            const adhesiveSubtitle = calculation.additionalMaterial.subtitle || '';
            const existingAdhesive = materialItems.find(item =>
              item.name === adhesiveName && item.subtitle === adhesiveSubtitle
            );

            if (!existingAdhesive) {
              materialItems.push({
                id: `${workItem.id}_adhesive`,
                name: adhesiveName,
                subtitle: adhesiveSubtitle,
                calculation: {
                  quantity: calculation.additionalMaterialQuantity, // Use the calculated quantity (packages)
                  materialCost: adhesiveCost,
                  pricePerUnit: adhesivePrice,
                  unit: adhesiveUnit
                }
              });
            }
          }

          // Handle additional fields
          if (workItem.fields) {
            const jollyEdgingValue = workItem.fields[WORK_ITEM_NAMES.JOLLY_EDGING_FIELD];
            if (jollyEdgingValue && jollyEdgingValue > 0) {
              const jollyEdgingPrice = activePriceList.work.find(item => item.name === WORK_ITEM_NAMES.JOLLY_EDGING);
              if (jollyEdgingPrice) {
                const jollyEdgingCost = jollyEdgingValue * jollyEdgingPrice.price;
                workTotal += jollyEdgingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_jolly`,
                  propertyId: 'jolly_edging', // Override to prevent grouping with tiling
                  name: WORK_ITEM_NAMES.JOLLY_EDGING,
                  calculation: {
                    workCost: jollyEdgingCost,
                    materialCost: 0,
                    quantity: jollyEdgingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }

            const plinthCuttingValue = workItem.fields[WORK_ITEM_NAMES.PLINTH_CUTTING_AND_GRINDING_FIELD];
            if (plinthCuttingValue && plinthCuttingValue > 0) {
              const plinthCuttingPrice = activePriceList.work.find(item =>
                item.name === WORK_ITEM_NAMES.PLINTH && item.subtitle === WORK_ITEM_NAMES.CUTTING_AND_GRINDING
              );
              if (plinthCuttingPrice) {
                const plinthCuttingCost = plinthCuttingValue * plinthCuttingPrice.price;
                workTotal += plinthCuttingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_cutting`,
                  propertyId: 'plinth_cutting', // Override to prevent grouping with paving
                  name: WORK_ITEM_NAMES.PLINTH,
                  subtitle: WORK_ITEM_NAMES.CUTTING_AND_GRINDING,
                  calculation: {
                    workCost: plinthCuttingCost,
                    materialCost: 0,
                    quantity: plinthCuttingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }

            const plinthBondingValue = workItem.fields[WORK_ITEM_NAMES.PLINTH_BONDING_FIELD];
            if (plinthBondingValue && plinthBondingValue > 0) {
              const plinthBondingPrice = activePriceList.work.find(item =>
                item.name === WORK_ITEM_NAMES.PLINTH && item.subtitle === WORK_ITEM_NAMES.BONDING
              );
              if (plinthBondingPrice) {
                const plinthBondingCost = plinthBondingValue * plinthBondingPrice.price;
                workTotal += plinthBondingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_bonding`,
                  propertyId: 'plinth_bonding', // Override to prevent grouping with paving
                  name: WORK_ITEM_NAMES.PLINTH,
                  subtitle: WORK_ITEM_NAMES.BONDING,
                  calculation: {
                    workCost: plinthBondingCost,
                    materialCost: 0,
                    quantity: plinthBondingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }
          }
        }
      }
    }
  });

  // Add grouting work for non-large-format tiling/paving (no material - matches iOS)
  if (totalGroutingArea > 0) {
    // Grouting work
    const groutingPriceItem = activePriceList.work.find(item =>
      item.name === WORK_ITEM_NAMES.GROUTING
    );
    if (groutingPriceItem) {
      const groutingCost = totalGroutingArea * groutingPriceItem.price;
      workTotal += groutingCost;
      items.push({
        id: 'grouting_work',
        name: WORK_ITEM_NAMES.GROUTING,
        subtitle: groutingPriceItem.subtitle || '',
        propertyId: WORK_ITEM_PROPERTY_IDS.GROUTING,
        calculation: {
          workCost: groutingCost,
          materialCost: 0,
          quantity: totalGroutingArea,
          unit: UNIT_TYPES.METER_SQUARE
        }
      });
    }
  }

  // Add Skirting (Lištovanie) work and material for Floating Floor
  if (totalFloatingFloorPerimeter > 0) {
    // 1. Skirting Work (Lištovanie)
    let skirtingWorkItem = activePriceList.work.find(item =>
      item.name === WORK_ITEM_NAMES.SKIRTING // Matches 'Lištovanie'
    );

    // Fallback for old projects/snapshots that still have 'Skirting'
    if (!skirtingWorkItem) {
      skirtingWorkItem = activePriceList.work.find(item => item.name === 'Skirting');
    }

    if (skirtingWorkItem) {
      const skirtingWorkCost = totalFloatingFloorPerimeter * skirtingWorkItem.price;
      workTotal += skirtingWorkCost;

      items.push({
        id: 'skirting_work',
        name: WORK_ITEM_NAMES.SKIRTING, // Force 'Lištovanie' regardless of what was found
        subtitle: skirtingWorkItem.subtitle || '',
        propertyId: 'skirting_work_auto', // Virtual property ID
        calculation: {
          workCost: skirtingWorkCost,
          materialCost: 0,
          quantity: totalFloatingFloorPerimeter,
          unit: UNIT_TYPES.METER
        }
      });
    }

    // 2. Skirting Board Material (Soklové lišty)
    let skirtingMaterialItem = activePriceList.material.find(item =>
      item.name === MATERIAL_ITEM_NAMES.SKIRTING_BOARD // Matches 'Soklové lišty'
    );

    // Fallback for old projects/snapshots that still have 'Skirting board'
    if (!skirtingMaterialItem) {
      skirtingMaterialItem = activePriceList.material.find(item => item.name === 'Skirting board');
    }

    if (skirtingMaterialItem) {
      let skirtingMaterialCost = 0;
      // Handle capacity if defined (though usually skirting is per meter)
      if (skirtingMaterialItem.capacity) {
        const packagesNeeded = Math.ceil(totalFloatingFloorPerimeter / skirtingMaterialItem.capacity.value);
        skirtingMaterialCost = packagesNeeded * skirtingMaterialItem.price;
      } else {
        skirtingMaterialCost = totalFloatingFloorPerimeter * skirtingMaterialItem.price;
      }

      materialTotal += skirtingMaterialCost;

      materialItems.push({
        id: 'skirting_material',
        name: MATERIAL_ITEM_NAMES.SKIRTING_BOARD, // Force 'Soklové lišty' regardless of what was found
        subtitle: skirtingMaterialItem.subtitle || '',
        calculation: {
          quantity: totalFloatingFloorPerimeter,
          materialCost: skirtingMaterialCost,
          pricePerUnit: skirtingMaterialItem.price,
          unit: UNIT_TYPES.METER
        }
      });
    }
  }

  // Calculate auxiliary costs based on price list values
  const auxiliaryWorkItem = activePriceList.work.find(item => item.name === WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK);
  const auxiliaryWorkRate = auxiliaryWorkItem ? auxiliaryWorkItem.price / 100 : 0.10; // Default to 10% if not found
  const auxiliaryWorkCost = workTotal * auxiliaryWorkRate;

  const auxiliaryMaterialItem = activePriceList.material.find(item => item.name === MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL);
  const auxiliaryMaterialRate = auxiliaryMaterialItem ? auxiliaryMaterialItem.price / 100 : 0.10; // Default to 10% if not found
  const auxiliaryMaterialCost = materialTotal * auxiliaryMaterialRate;

  // Add auxiliary work to items if cost > 0
  if (auxiliaryWorkCost > 0) {
    items.push({
      id: 'auxiliary_work_item',
      name: WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK,
      subtitle: '',
      propertyId: 'auxiliary_work',
      calculation: {
        workCost: auxiliaryWorkCost,
        materialCost: 0,
        quantity: auxiliaryWorkRate * 100,
        unit: '%'
      }
    });
  }

  // Add auxiliary material to materialItems if cost > 0
  if (auxiliaryMaterialCost > 0) {
    materialItems.push({
      id: 'auxiliary_material_item',
      name: MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL,
      subtitle: '',
      propertyId: 'auxiliary_material',
      calculation: {
        quantity: auxiliaryMaterialRate * 100,
        materialCost: auxiliaryMaterialCost,
        pricePerUnit: 0,
        unit: '%'
      }
    });
  }

  const finalWorkTotal = workTotal + auxiliaryWorkCost;
  const finalMaterialTotal = materialTotal + auxiliaryMaterialCost;

  return {
    workTotal: finalWorkTotal,
    materialTotal: finalMaterialTotal,
    othersTotal,
    total: finalWorkTotal + finalMaterialTotal + othersTotal,
    baseWorkTotal: workTotal,
    baseMaterialTotal: materialTotal,
    auxiliaryWorkCost,
    auxiliaryMaterialCost,
    auxiliaryWorkRate,     // Return the rate used
    auxiliaryMaterialRate, // Return the rate used
    items,
    materialItems,
    othersItems
  };
};

export const calculateRoomPrice = (room, priceList) => {
  const calculation = calculateRoomPriceWithMaterials(room, priceList);
  return calculation.total;
};