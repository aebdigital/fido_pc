import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import {
  WORK_ITEM_NAMES,
  WORK_ITEM_PROPERTY_IDS,
  UNIT_TYPES,
  MATERIAL_ITEM_NAMES
} from '../config/constants';
import { workProperties } from '../config/workProperties';

// Helper to get work item name from propertyId
const getWorkItemNameByPropertyId = (propertyId) => {
  const property = workProperties.find(p => p.id === propertyId);
  return property ? property.name : null;
};

const RoomPriceSummary = ({ room, workData, priceList }) => {
  const { t } = useLanguage();
  const { calculateRoomPriceWithMaterials, formatPrice, generalPriceList } = useAppData();

  const activePriceList = priceList || generalPriceList;
  const roomWithWorkItems = { ...room, workItems: workData };
  const calculation = calculateRoomPriceWithMaterials(roomWithWorkItems, activePriceList);
  const vatRate = activePriceList?.others?.find(item => item.name === 'VAT')?.price / 100 || 0.23;
  const vatAmount = calculation.total * vatRate;
  const totalWithVat = calculation.total + vatAmount;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar">
        {workData.length > 0 ? (
          <>
            {/* Work Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">{t('Work')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.workTotal)}</span>
              </div>
              {calculation.items.length > 0 ? (
                (() => {
                  const workGroups = {};
                  const nonGroupedItems = [];

                  // Items that should be grouped by name + subtitle
                  const groupablePropertyIds = [
                    'painting_wall', 'painting_ceiling',
                    'penetration_coating'
                  ];

                  calculation.items.forEach(item => {
                    if (item.calculation?.workCost > 0) {
                      // Check if this item should be grouped
                      const shouldGroup = groupablePropertyIds.includes(item.propertyId);

                      // Determine the correct unit based on work type
                      let unit = item.calculation.unit || UNIT_TYPES.METER_SQUARE;
                      let quantity = item.calculation.quantity;
                      const values = item.fields;

                      // Only derive unit from fields if not already set in calculation
                      if (!item.calculation.unit) {
                        if (item.subtitle && item.subtitle.includes('- prenájom') && values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
                          quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
                          unit = quantity > 1 ? UNIT_TYPES.DAYS : UNIT_TYPES.DAY;
                        } else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) && (item.name === WORK_ITEM_NAMES.JOURNEY || item.name === WORK_ITEM_NAMES.COMMUTE || item.name === 'Cesta')) {
                          unit = UNIT_TYPES.KM;
                          const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
                          const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
                          quantity = distance * (days > 0 ? days : 1);
                        } else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || (values[WORK_ITEM_NAMES.COUNT] && (item.name === WORK_ITEM_NAMES.CORE_DRILL || item.name === 'Rental' || item.name === WORK_ITEM_NAMES.TOOL_RENTAL))) {
                          unit = UNIT_TYPES.HOUR;
                          quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || values[WORK_ITEM_NAMES.COUNT] || 0);
                        } else if (values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) {
                          unit = UNIT_TYPES.PIECE;
                          quantity = parseFloat(values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK] || 0);
                        } else if (values[WORK_ITEM_NAMES.LENGTH] && !values[WORK_ITEM_NAMES.WIDTH] && !values[WORK_ITEM_NAMES.HEIGHT]) {
                          unit = UNIT_TYPES.METER;
                          quantity = parseFloat(values[WORK_ITEM_NAMES.LENGTH] || 0);
                        } else if (values[WORK_ITEM_NAMES.CIRCUMFERENCE]) {
                          unit = UNIT_TYPES.METER;
                          quantity = parseFloat(values[WORK_ITEM_NAMES.CIRCUMFERENCE] || 0);
                        } else if (values[WORK_ITEM_NAMES.DISTANCE_EN]) {
                          unit = UNIT_TYPES.KM;
                          quantity = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || 0);
                        }
                      }

                      if (shouldGroup) {
                        // Group by propertyId (which includes wall/ceiling distinction)
                        const groupKey = item.propertyId;

                        if (!workGroups[groupKey]) {
                          const itemName = item.name || getWorkItemNameByPropertyId(item.propertyId);
                          // Always translate the name
                          const workName = t(itemName);

                          workGroups[groupKey] = {
                            name: workName,
                            unit: unit,
                            totalQuantity: 0,
                            totalCost: 0
                          };
                        }

                        workGroups[groupKey].totalQuantity += quantity;
                        workGroups[groupKey].totalCost += item.calculation.workCost;
                      } else {
                        // Non-grouped items - render as before
                        const itemName = item.name || getWorkItemNameByPropertyId(item.propertyId);
                        // Always translate the name
                        const workName = t(itemName);

                        let workDescription;
                        if ((item.subtitle && (item.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) ||
                            item.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
                            (item.name && item.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) {
                          if (item.subtitle.includes('- prenájom')) {
                            const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
                            workDescription = `${t(item.subtitle)} - ${duration.toFixed(0)} ${t('dní')}`;
                          } else if (item.subtitle.includes('- montáž a demontáž')) {
                            const area = parseFloat(values[WORK_ITEM_NAMES.LENGTH] || 0) * parseFloat(values[WORK_ITEM_NAMES.HEIGHT] || 0);
                            workDescription = `${t(item.subtitle)} - ${area.toFixed(1)}${t(UNIT_TYPES.METER_SQUARE)}`;
                          } else {
                            workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                          }
                        } else {
                          workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                        }

                        nonGroupedItems.push({
                          id: item.id,
                          description: workDescription,
                          cost: item.calculation.workCost
                        });
                      }
                    }
                  });

                  // Render grouped items first, then non-grouped items
                  return (
                    <>
                      {Object.entries(workGroups).map(([key, group]) => (
                        <div key={`work-group-${key}`} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {group.name} - {group.totalQuantity.toFixed(group.totalQuantity < 10 ? 1 : 0)}{t(group.unit)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">{formatPrice(group.totalCost)}</span>
                        </div>
                      ))}
                      {nonGroupedItems.map(item => (
                        <div key={`${item.id}-work`} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                          <span className="text-gray-600 dark:text-gray-400">{formatPrice(item.cost)}</span>
                        </div>
                      ))}
                    </>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('No work items added')}
                </div>
              )}
              {/* Add auxiliary work cost at bottom of work section */}
              {calculation.auxiliaryWorkCost > 0 && (
                <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="text-gray-600 dark:text-gray-400">{t(WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK)} ({(calculation.auxiliaryWorkRate * 100).toFixed(0)}%)</span>
                  <span className="text-gray-600 dark:text-gray-400">{formatPrice(calculation.auxiliaryWorkCost)}</span>
                </div>
              )}
            </div>

            {/* Material Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">{t('Material')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.materialTotal)}</span>
              </div>
              {calculation.materialItems && calculation.materialItems.length > 0 ? (
                (() => {
                  const materialGroups = {};
                  
                  // Group materials by name and subtitle
                  calculation.materialItems.forEach(item => {
                    const materialKey = `${item.name}-${item.subtitle || 'no-subtitle'}`;

                    if (!materialGroups[materialKey]) {
                      materialGroups[materialKey] = {
                        name: item.name,
                        subtitle: item.subtitle,
                        unit: item.calculation.unit,
                        totalQuantity: 0,
                        totalCost: 0
                      };
                    }

                    materialGroups[materialKey].totalQuantity += item.calculation.quantity;
                    materialGroups[materialKey].totalCost += item.calculation.materialCost;
                  });
                  
                  // Render grouped materials
                  return Object.values(materialGroups).map((group, index) => {
                    const materialDescription = `${t(group.name)}${group.subtitle ? `, ${t(group.subtitle)}` : ''}`;
                    const unit = group.unit && group.unit.includes(UNIT_TYPES.PIECE) ? UNIT_TYPES.PIECE : (group.unit ? group.unit.replace('€/', '') : UNIT_TYPES.METER_SQUARE);
                    
                    return (
                      <div key={`material-group-${index}`} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{materialDescription} - {group.totalQuantity.toFixed(0)}{t(unit)}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatPrice(group.totalCost)}</span>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('No materials identified')}
                </div>
              )}
              {/* Add auxiliary material cost at bottom of material section */}
              {calculation.auxiliaryMaterialCost > 0 && (
                <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="text-gray-600 dark:text-gray-400">{t(MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL)} ({(calculation.auxiliaryMaterialRate * 100).toFixed(0)}%)</span>
                  <span className="text-gray-600 dark:text-gray-400">{formatPrice(calculation.auxiliaryMaterialCost)}</span>
                </div>
              )}
            </div>

            {/* Others Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">{t('Others')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.othersTotal || 0)}</span>
              </div>
              {calculation.othersItems && calculation.othersItems.length > 0 ? (
                calculation.othersItems.map(item => {
                  if (item.calculation?.workCost > 0) {
                    // Determine the correct unit based on work type
                    // First check if calculation already has a unit (e.g., for additional fields like Jolly Edging, Plinth)
                    let unit = item.calculation.unit || UNIT_TYPES.METER_SQUARE;
                    let quantity = item.calculation.quantity;
                    const values = item.fields;

                    // Only derive unit from fields if not already set in calculation
                    if (!item.calculation.unit) {
                      // Check for scaffolding rental (has "- prenájom" in subtitle)
                      if (item.subtitle && item.subtitle.includes('- prenájom') && values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
                        quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
                        unit = quantity > 1 ? UNIT_TYPES.DAYS : UNIT_TYPES.DAY;
                      } else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) && (item.name === WORK_ITEM_NAMES.JOURNEY || item.name === WORK_ITEM_NAMES.COMMUTE || item.name === 'Cesta')) {
                        unit = UNIT_TYPES.KM;
                        const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
                        const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
                        quantity = distance * (days > 0 ? days : 1);
                      } else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || (values[WORK_ITEM_NAMES.COUNT] && (item.name === WORK_ITEM_NAMES.CORE_DRILL || item.name === 'Rental' || item.name === WORK_ITEM_NAMES.TOOL_RENTAL))) {
                        unit = UNIT_TYPES.HOUR;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || values[WORK_ITEM_NAMES.COUNT] || 0);
                      } else if (values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) {
                        unit = UNIT_TYPES.PIECE;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.COUNT] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK] || 0);
                      } else if (values[WORK_ITEM_NAMES.LENGTH] && !values[WORK_ITEM_NAMES.WIDTH] && !values[WORK_ITEM_NAMES.HEIGHT]) {
                        unit = UNIT_TYPES.METER;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.LENGTH] || 0);
                      } else if (values[WORK_ITEM_NAMES.CIRCUMFERENCE]) {
                        unit = UNIT_TYPES.METER;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.CIRCUMFERENCE] || 0);
                      } else if (values[WORK_ITEM_NAMES.DISTANCE_EN]) {
                        unit = UNIT_TYPES.KM;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || 0);
                      }
                    }
                    
                    // Fall back to looking up name from propertyId if item.name is undefined
                    // For custom work items, use the user-entered name and selected unit
                    // For scaffolding items, use subtitle which contains the full name (e.g., "Lešenie - montáž a demontáž")
                    let itemNameOthers = item.name || getWorkItemNameByPropertyId(item.propertyId);

                    // For scaffolding items, use subtitle as name
                    if (item.subtitle && (item.subtitle.includes('montáž a demontáž') || item.subtitle.includes('prenájom') ||
                        item.subtitle.includes('assembly and disassembly') || item.subtitle.includes('rental'))) {
                      itemNameOthers = item.subtitle;
                    }

                    if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
                      if (item.fields?.[WORK_ITEM_NAMES.NAME]) {
                        itemNameOthers = item.fields[WORK_ITEM_NAMES.NAME];
                      }
                      // Use the user-selected unit for custom work
                      if (item.selectedUnit) {
                        unit = item.selectedUnit;
                        quantity = parseFloat(values[WORK_ITEM_NAMES.QUANTITY] || values.Quantity || 0);
                      }
                    }
                    const workName = t(itemNameOthers);
                    // Format quantity: for days show as integer with space, otherwise use existing format
                    const translatedUnit = t(unit);
                    const formattedQuantity = (unit === UNIT_TYPES.DAY || unit === UNIT_TYPES.DAYS)
                      ? `${Math.round(quantity)} ${translatedUnit}`
                      : `${quantity.toFixed(quantity < 10 ? 1 : 0)}${translatedUnit}`;
                    const workDescription = `${workName} - ${formattedQuantity}`;

                    return (
                      <div key={`${item.id}-others`} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{workDescription}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatPrice(item.calculation.workCost)}</span>
                      </div>
                    );
                  }
                  return null;
                })
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  {t('No other items added')}
                </div>
              )}
            </div>

          </>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-base font-medium">{t('No work items')}</p>
              <p className="text-sm mt-1">{t('Add work items to see price summary')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Totals - Fixed at bottom */}
      <div className="p-4 lg:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">{t('without VAT')}</span>
          <span className="text-gray-600 dark:text-gray-400">{formatPrice(calculation.total)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">{t('VAT')}</span>
          <span className="text-gray-600 dark:text-gray-400">{formatPrice(vatAmount)}</span>
        </div>
        <div className="flex justify-between items-center text-lg font-bold">
          <span className="text-gray-900 dark:text-white">{t('Total price')}</span>
          <span className="text-gray-900 dark:text-white">{formatPrice(totalWithVat)}</span>
        </div>
      </div>
    </div>
  );
};

export default RoomPriceSummary;