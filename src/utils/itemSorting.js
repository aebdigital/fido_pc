import { WORK_ITEM_PROPERTY_IDS } from '../config/constants';

/**
 * Sorts items based on their order in the master price list.
 * 
 * @param {Array} items - Array of items to sort. Items can be ungrouped objects or grouped objects.
 * @param {Object} masterList - The master price list object (generalPriceList).
 * @param {string} category - 'work', 'material', or 'others'.
 * @returns {Array} - Sorted array of items.
 */
export const sortItemsByMasterList = (items, masterList, category = 'work') => {
    if (!items || !masterList) return items || [];

    // Safety check: Parse masterList if it's a string
    let parsedMasterList = masterList;
    if (typeof masterList === 'string') {
        try {
            parsedMasterList = JSON.parse(masterList);
        } catch (e) {
            console.error("Failed to parse masterList in sortItemsByMasterList", e);
            return items;
        }
    }

    // Create a map of propertyId/name to index in the master list
    const indexMap = new Map();
    let currentIndex = 0;

    // Helper to process a category from the price list
    const processCategory = (listCategory) => {
        if (!parsedMasterList[listCategory]) return;

        parsedMasterList[listCategory].forEach(item => {
            // Map by generic name
            if (item.name) {
                indexMap.set(item.name, currentIndex);

                // Also map with subtitle for better specificity (e.g., "Sanitary installations-Corner valve")
                if (item.subtitle) {
                    indexMap.set(`${item.name}-${item.subtitle}`, currentIndex);
                }
            }

            // Map propertyId if it exists in master list (for some future-proofing)
            if (item.propertyId) {
                indexMap.set(item.propertyId, currentIndex);
            }

            currentIndex++;
        });
    };

    // Determine which parts of the master list to use for indexing based on PC structure
    if (category === 'work') {
        processCategory('work');
        processCategory('installations');
    } else if (category === 'material') {
        processCategory('material');
    } else if (category === 'others') {
        processCategory('others');
    }

    // Hardcoded propertyId to index mapping for standard items (since generalPriceList doesn't have them)
    // This handles the case where items match by propertyId but masterList only has names.
    const propertyToNameMap = {
        [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: 'Preparatory and demolition works',
        [WORK_ITEM_PROPERTY_IDS.WIRING]: 'Elektroinštalačné práce',
        [WORK_ITEM_PROPERTY_IDS.PLUMBING]: 'Vodoinštalačné práce',
        [WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS]: 'Brick partitions',
        [WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING]: 'Brick load-bearing wall',
        [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION]: 'Plasterboarding',
        [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET]: 'Plasterboarding',
        [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING]: 'Plasterboarding',
        [WORK_ITEM_PROPERTY_IDS.NETTING_WALL]: 'Netting',
        [WORK_ITEM_PROPERTY_IDS.NETTING_CEILING]: 'Netting',
        [WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL]: 'Plastering',
        [WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING]: 'Plastering',
        [WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING]: 'Facade Plastering',
        [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: 'Installation of corner bead',
        [WORK_ITEM_PROPERTY_IDS.WINDOW_SASH]: 'Plastering of window sash',
        [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: 'Penetration coating',
        [WORK_ITEM_PROPERTY_IDS.PAINTING_WALL]: 'Painting',
        [WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING]: 'Painting',
        [WORK_ITEM_PROPERTY_IDS.LEVELLING]: 'Levelling',
        [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: 'Floating floor',
        [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: 'Tiling under 60cm',
        [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: 'Paving under 60cm',
        [WORK_ITEM_PROPERTY_IDS.GROUTING]: 'Grouting',
        [WORK_ITEM_PROPERTY_IDS.SILICONING]: 'Siliconing',
        [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: 'Window installation',
        [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: 'Installation of door jamb',
        [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: 'Sanitary installations'
    };

    return [...items].sort((a, b) => {
        const getIndex = (item) => {
            // 1. Try propertyId directly if it's in the map
            if (item.propertyId && indexMap.has(item.propertyId)) {
                return indexMap.get(item.propertyId);
            }

            // 2. Try mapping propertyId to name then lookup
            if (item.propertyId && propertyToNameMap[item.propertyId]) {
                const name = propertyToNameMap[item.propertyId];

                // If it's a sanitary installation or has a subtitle, try name + subtitle first
                const subtitle = item.subtitle || item.selectedType;
                if (subtitle && indexMap.has(`${name}-${subtitle}`)) {
                    return indexMap.get(`${name}-${subtitle}`);
                }

                if (indexMap.has(name)) {
                    return indexMap.get(name);
                }
            }

            // 3. Try name + subtitle lookup directly
            const itemSubtitle = item.subtitle || item.selectedType;
            if (item.name && itemSubtitle && indexMap.has(`${item.name}-${itemSubtitle}`)) {
                return indexMap.get(`${item.name}-${itemSubtitle}`);
            }

            // 4. Try name lookup directly
            if (item.name && indexMap.has(item.name)) {
                return indexMap.get(item.name);
            }

            // 5. Special cases / Derived IDs
            if (item.name && item.name.includes('Veľkoformát')) {
                if (indexMap.has('Tiling under 60cm') && item.name.includes('Obklad')) return indexMap.get('Tiling under 60cm');
                if (indexMap.has('Paving under 60cm') && item.name.includes('Dlažba')) return indexMap.get('Paving under 60cm');
            }

            if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
                return 999999;
            }

            return 99999; // Unknown items go to the end
        };

        const indexA = getIndex(a);
        const indexB = getIndex(b);

        return indexA - indexB;
    });
};
