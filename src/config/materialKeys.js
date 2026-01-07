/**
 * Material Keys - Direct mapping between work items and materials
 *
 * This provides a clean, explicit link between work types and their corresponding materials.
 * No string matching, no fuzzy logic - just direct key lookup.
 *
 * Key format: propertyId or propertyId_type (lowercase, underscores)
 */

import { WORK_ITEM_PROPERTY_IDS } from './constants';

/**
 * Generate a material key from a work item
 * @param {string} propertyId - The work item's propertyId
 * @param {string} selectedType - The selected type (Simple, Double, Triple, etc.)
 * @returns {string} The material key
 */
export const getMaterialKey = (propertyId, selectedType) => {
  if (!propertyId) return null;

  const baseKey = propertyId.toLowerCase();

  if (selectedType) {
    const typeKey = selectedType.toLowerCase().replace(/\s+/g, '_');
    return `${baseKey}_${typeKey}`;
  }

  return baseKey;
};

/**
 * Maps material keys to material definitions
 * Each work type that needs a material has an entry here
 */
export const MATERIAL_KEY_MAPPINGS = {
  // Plasterboarding - Partitions
  'plasterboarding_partition_simple': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'simple, partition'
  },
  'plasterboarding_partition_double': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'double, partition'
  },
  'plasterboarding_partition_triple': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'triple, partition'
  },

  // Plasterboarding - Offset Walls
  'plasterboarding_offset_simple': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'simple, offset wall'
  },
  'plasterboarding_offset_double': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'double, offset wall'
  },

  // Plasterboarding - Ceiling
  'plasterboarding_ceiling': {
    name: 'Plasterboard',
    namesSk: ['Sádrokartón'],
    subtitlePattern: 'ceiling'
  },

  // Brick work (keys match WORK_ITEM_PROPERTY_IDS)
  'brick_partitions': {
    name: 'Partition masonry',
    namesSk: ['Murivo priečkové'],
    subtitlePattern: null
  },
  'brick_load_bearing': {
    name: 'Load-bearing masonry',
    namesSk: ['Murivo nosné'],
    subtitlePattern: null
  },

  // Netting
  'netting_wall': {
    name: 'Mesh',
    namesSk: ['Sieťka'],
    subtitlePattern: null
  },
  'netting_ceiling': {
    name: 'Mesh',
    namesSk: ['Sieťka'],
    subtitlePattern: null
  },

  // Plastering
  'plastering_wall': {
    name: 'Plaster',
    namesSk: ['Omietka'],
    subtitlePattern: null
  },
  'plastering_ceiling': {
    name: 'Plaster',
    namesSk: ['Omietka'],
    subtitlePattern: null
  },
  'window_sash': {
    name: 'Plaster',
    namesSk: ['Omietka'],
    subtitlePattern: null
  },

  // Facade
  'facade_plastering': {
    name: 'Facade Plaster',
    namesSk: ['Fasádna omietka'],
    subtitlePattern: null
  },

  // Corner bead
  'corner_bead': {
    name: 'Corner bead',
    namesSk: ['Rohová lišta'],
    subtitlePattern: null
  },

  // Penetration coating
  'penetration_coating': {
    name: 'Primer',
    namesSk: ['Penetrácia'],
    subtitlePattern: null
  },

  // Painting
  'painting_wall': {
    name: 'Paint',
    namesSk: ['Farba'],
    subtitlePattern: 'wall'
  },
  'painting_ceiling': {
    name: 'Paint',
    namesSk: ['Farba'],
    subtitlePattern: 'ceiling'
  },

  // Levelling
  'levelling': {
    name: 'Self-levelling compound',
    namesSk: ['Nivelačná hmota'],
    subtitlePattern: null
  },

  // Floating floor
  'floating_floor': {
    name: 'Floating floor',
    namesSk: ['Plávajúca podlaha'],
    subtitlePattern: null
  },

  // Skirting
  'skirting': {
    name: 'Soklové lišty',
    namesSk: ['Soklové lišty'],
    subtitlePattern: null
  },

  // Tiling
  'tiling_under_60': {
    name: 'Tiles',
    namesSk: ['Obklad'],
    subtitlePattern: null
  },

  // Paving
  'paving_under_60': {
    name: 'Pavings',
    namesSk: ['Dlažba'],
    subtitlePattern: null
  },

  // Siliconing
  'siliconing': {
    name: 'Silicone',
    namesSk: ['Silikón'],
    subtitlePattern: null
  }
};

/**
 * Find a material in the pricelist by material key
 * @param {string} materialKey - The material key
 * @param {Array} materials - The materials array from pricelist
 * @returns {Object|null} The matching material or null
 */
export const findMaterialByKey = (materialKey, materials) => {
  if (!materialKey || !materials) return null;

  // First try to find by explicit materialKey field (if pricelist has been updated)
  let material = materials.find(m => m.materialKey === materialKey);
  if (material) return material;

  // Fallback: Match using the mapping definition
  const mapping = MATERIAL_KEY_MAPPINGS[materialKey];
  if (!mapping) return null;

  // Find by name (English or Slovak) and subtitle pattern
  material = materials.find(m => {
    const nameMatch = m.name.toLowerCase() === mapping.name.toLowerCase() ||
                     mapping.namesSk.some(sk => m.name.toLowerCase() === sk.toLowerCase());

    if (!nameMatch) return false;

    // If mapping has a subtitle pattern, check it
    if (mapping.subtitlePattern) {
      if (!m.subtitle) return false;
      const subtitleLower = m.subtitle.toLowerCase();
      const patternLower = mapping.subtitlePattern.toLowerCase();

      // Check if subtitle contains all parts of the pattern
      const patternParts = patternLower.split(',').map(p => p.trim());
      return patternParts.every(part => subtitleLower.includes(part));
    }

    // If no subtitle pattern required, match by name only (for materials without subtypes)
    return true;
  });

  return material || null;
};

/**
 * Get material key for adhesive based on work type
 * @param {string} propertyId - The work item's propertyId
 * @returns {string|null} The adhesive material key
 */
export const getAdhesiveKey = (propertyId) => {
  // Tiling and paving use adhesive
  if (propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60 ||
      propertyId === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60) {
    return 'adhesive_tiling';
  }

  // Netting uses adhesive
  if (propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL ||
      propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING) {
    return 'adhesive_netting';
  }

  return null;
};

// Adhesive mappings
export const ADHESIVE_KEY_MAPPINGS = {
  'adhesive_tiling': {
    name: 'Adhesive',
    namesSk: ['Lepidlo'],
    subtitlePattern: 'tiling and paving'
  },
  'adhesive_netting': {
    name: 'Adhesive',
    namesSk: ['Lepidlo'],
    subtitlePattern: 'netting'
  }
};

/**
 * Find adhesive material by key
 */
export const findAdhesiveByKey = (adhesiveKey, materials) => {
  if (!adhesiveKey || !materials) return null;

  const mapping = ADHESIVE_KEY_MAPPINGS[adhesiveKey];
  if (!mapping) return null;

  return materials.find(m => {
    const nameMatch = m.name.toLowerCase() === mapping.name.toLowerCase() ||
                     mapping.namesSk.some(sk => m.name.toLowerCase() === sk.toLowerCase());

    if (!nameMatch) return false;

    if (mapping.subtitlePattern && m.subtitle) {
      return m.subtitle.toLowerCase().includes(mapping.subtitlePattern.toLowerCase());
    }

    return !mapping.subtitlePattern;
  });
};
