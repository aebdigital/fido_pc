import { WORK_ITEM_PROPERTY_IDS } from '../config/constants';

/**
 * Helper to get the item label based on property type
 * @param {Object} property - The property configuration object
 * @param {Object} item - The individual work item data
 * @param {Number} index - The index of the item in its group
 * @param {Number} totalCount - Total number of items in this group
 * @param {Function} t - Translation function
 * @returns {String} - The formatted label
 */
export const getItemLabel = (property, item, index, totalCount, t) => {
    if (!property || !item) return t('Work Item');

    // Reverse numbering: newest item (index 0) gets highest number
    const itemNumber = totalCount - index;

    // For brick partitions
    if (property.id === WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS) {
        return `${t('Partition no.')} ${itemNumber}`;
    }

    // For brick load-bearing wall
    if (property.id === WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING) {
        return `${t('Wall no.')} ${itemNumber}`;
    }

    // For plasterboarding with types
    if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION ||
        property.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET) {
        if (item.selectedType) {
            return `${t(item.selectedType)} ${t('no.')} ${itemNumber}`;
        }
        return `${t('no.')} ${itemNumber}`;
    }

    // For netting wall
    if (property.id === WORK_ITEM_PROPERTY_IDS.NETTING_WALL) {
        return `${t('Wall no.')} ${itemNumber}`;
    }

    // For netting ceiling
    if (property.id === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING) {
        return `${t('Ceiling no.')} ${itemNumber}`;
    }

    // For plastering wall
    if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL) {
        return `${t('Wall no.')} ${itemNumber}`;
    }

    // For plastering ceiling
    if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING) {
        return `${t('Ceiling no.')} ${itemNumber}`;
    }

    // For facade plastering
    if (property.id === WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING) {
        return `${t('Wall no.')} ${itemNumber}`;
    }

    // For penetration coating
    if (property.id === WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING) {
        return `${t('Coating no.')} ${itemNumber}`;
    }

    // For levelling
    if (property.id === WORK_ITEM_PROPERTY_IDS.LEVELLING) {
        return `${t('Process no.')} ${itemNumber}`;
    }

    // For floating floor
    if (property.id === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR) {
        return `${t('Laying no.')} ${itemNumber}`;
    }

    // For tiling
    if (property.id === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60) {
        return `${t('Laying no.')} ${itemNumber}`;
    }

    // For paving
    if (property.id === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60) {
        return `${t('Laying no.')} ${itemNumber}`;
    }

    // For window installation
    if (property.id === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
        return `${t('Window no.')} ${itemNumber}`;
    }

    // Handle Rentals specifically
    if (property.id === WORK_ITEM_PROPERTY_IDS.RENTALS || ['core_drill', 'tool_rental', 'scaffolding'].includes(property.id)) {
        if (item.name === 'Tool rental') {
            return `${t('Tool no.')} ${itemNumber}`;
        }
        return `${t(item.name || property.name)} ${t('no.')} ${itemNumber}`;
    }

    // Default: use property name + no. X
    return `${t(property.name)} ${t('no.')} ${itemNumber}`;
};
