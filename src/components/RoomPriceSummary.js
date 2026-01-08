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
import { determineUnitAndQuantity } from '../utils/priceCalculations';

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

                  // Items that should be grouped by propertyId (same work types combined)
                  const groupablePropertyIds = [
                    'painting_wall', 'painting_ceiling',
                    'penetration_coating',
                    'netting_wall', 'netting_ceiling',
                    'plastering_wall', 'plastering_ceiling',
                    'tiling_under_60', 'paving_under_60',
                    'grouting'
                  ];

                  calculation.items.forEach(item => {
                    // Skip auxiliary items as they are rendered separately at the bottom
                    if (item.name === WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK) return;

                    if (item.calculation?.workCost > 0) {
                      // Check if this item should be grouped
                      const shouldGroup = groupablePropertyIds.includes(item.propertyId);

                      // Determine the correct unit based on work type using shared utility
                      const { unit, quantity } = determineUnitAndQuantity(item, item.calculation.quantity);

                      if (shouldGroup) {
                        // Group by propertyId (which includes wall/ceiling distinction)
                        // Add large format flag to key to keep them separate
                        const groupKey = item.isLargeFormat ? `${item.propertyId}_largeformat` : item.propertyId;

                        if (!workGroups[groupKey]) {
                          const itemName = item.name || getWorkItemNameByPropertyId(item.propertyId);
                          // Always translate the name
                          let workName = t(itemName);

                          // For Large Format, show base name + "veľkoformát" (e.g., "Obklad Veľkoformát" not "Obklad do 60cm Veľkoformát")
                          if (item.isLargeFormat) {
                            // Use base name (Tiling/Paving) instead of full name with size qualifier
                            const baseName = item.propertyId === 'tiling_under_60' ? WORK_ITEM_NAMES.TILING : WORK_ITEM_NAMES.PAVING;
                            workName = `${t(baseName)} ${t(WORK_ITEM_NAMES.LARGE_FORMAT)}`;
                          } else if (item.subtitle) {
                            // Add subtitle for specific work types (wall/ceiling distinction)
                            workName = `${workName} ${t(item.subtitle)}`;
                          }

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
                        let workName;

                        // For plasterboarding items, build full translated name with subtitle and type
                        if (item.propertyId && item.propertyId.startsWith('plasterboarding_') && item.subtitle) {
                          // Ceiling doesn't have selectedType, partition/offset have Simple/Double/Triple
                          workName = item.selectedType
                            ? `${t(item.name)} ${t(item.subtitle)}, ${t(item.selectedType)}`
                            : `${t(item.name)} ${t(item.subtitle)}`;
                        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION && (item.selectedType || item.subtitle)) {
                          // For sanitary installation, show the type name (e.g., "Rohový ventil") instead of generic name
                          // Use selectedType first, fall back to subtitle (both are set when loading from DB)
                          workName = t(item.selectedType || item.subtitle);
                        } else if ((item.propertyId === 'plinth_cutting' || item.propertyId === 'plinth_bonding') && item.subtitle) {
                          // For plinth items, show name with subtitle (e.g., "Sokel - rezanie a brúsenie")
                          workName = `${t(item.name)} - ${t(item.subtitle)}`;
                        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
                          workName = item.fields?.[WORK_ITEM_NAMES.NAME] || t(item.name);
                        } else {
                          const itemName = item.name || getWorkItemNameByPropertyId(item.propertyId);
                          // Always translate the name
                          workName = t(itemName);
                        }

                        let workDescription;
                        const fields = item.fields || {};
                        if ((item.subtitle && (item.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) ||
                          item.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
                          (item.name && item.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) {
                          if (item.subtitle.includes('- prenájom')) {
                            const duration = parseFloat(fields[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
                            workDescription = `${t(item.subtitle)} - ${duration.toFixed(0)} ${t('dní')}`;
                          } else if (item.subtitle.includes('- montáž a demontáž')) {
                            const area = parseFloat(fields[WORK_ITEM_NAMES.LENGTH] || 0) * parseFloat(fields[WORK_ITEM_NAMES.HEIGHT] || 0);
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
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {group.name} - {group.totalQuantity.toFixed(group.totalQuantity < 10 ? 1 : 0)}{t(group.unit)}
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{formatPrice(group.totalCost)}</span>
                        </div>
                      ))}
                      {nonGroupedItems.map(item => (
                        <div key={`${item.id}-work`} className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{item.description}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(item.cost)}</span>
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
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t(WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK)} ({(calculation.auxiliaryWorkRate * 100).toFixed(0)}%)</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(calculation.auxiliaryWorkCost)}</span>
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
                    // Skip auxiliary material items as they are rendered separately at the bottom
                    if (item.name === MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL) return;

                    const displayName = item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK
                      ? (item.fields?.[WORK_ITEM_NAMES.NAME] || item.name)
                      : item.name;
                    const materialKey = `${displayName}-${item.subtitle || 'no-subtitle'}`;

                    if (!materialGroups[materialKey]) {
                      materialGroups[materialKey] = {
                        name: displayName,
                        subtitle: item.subtitle,
                        propertyId: item.propertyId,
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
                    // Handle ceramic subtitle translation with correct gender based on propertyId
                    let translatedSubtitle = '';
                    if (group.subtitle) {
                      // Check if subtitle contains 'ceramic' and apply correct gender
                      if (group.subtitle.toLowerCase().includes('ceramic')) {
                        // Use masculine for tiling (Obklad), feminine for paving (Dlažba)
                        const isTiling = group.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60;
                        const genderKey = isTiling ? 'ceramic masculine' : 'ceramic feminine';
                        translatedSubtitle = t(genderKey);
                      } else {
                        translatedSubtitle = t(group.subtitle);
                      }
                    } else if (group.propertyId && group.propertyId.startsWith('plasterboarding_')) {
                      // For plasterboard materials without subtitle, derive from propertyId
                      if (group.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING) {
                        translatedSubtitle = t('ceiling');
                      } else if (group.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION) {
                        translatedSubtitle = t('partition');
                      } else if (group.propertyId === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET) {
                        translatedSubtitle = t('offset wall');
                      }
                    }
                    const materialDescription = `${t(group.name)}${translatedSubtitle ? `, ${translatedSubtitle}` : ''}`;
                    const unit = group.unit && group.unit.includes(UNIT_TYPES.PIECE) ? UNIT_TYPES.PIECE : (group.unit ? group.unit.replace('€/', '') : UNIT_TYPES.METER_SQUARE);

                    return (
                      <div key={`material-group-${index}`} className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{materialDescription} - {group.totalQuantity.toFixed(group.totalQuantity < 10 ? 1 : 0)}{t(unit)}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(group.totalCost)}</span>
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
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t(MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL)} ({(calculation.auxiliaryMaterialRate * 100).toFixed(0)}%)</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(calculation.auxiliaryMaterialCost)}</span>
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
                    // Determine the correct unit based on work type using shared utility
                    let { unit, quantity } = determineUnitAndQuantity(item, item.calculation.quantity);

                    // Fall back to looking up name from propertyId if item.name is undefined
                    // For custom work items, use the user-entered name and selected unit
                    // For scaffolding items, use subtitle which contains the full name (e.g., "Lešenie - montáž a demontáž")
                    let itemNameOthers = item.name || getWorkItemNameByPropertyId(item.propertyId);

                    // For scaffolding items, use subtitle as name
                    if (item.subtitle && (item.subtitle.includes('montáž a demontáž') || item.subtitle.includes('prenájom') ||
                      item.subtitle.includes('assembly and disassembly') || item.subtitle.includes('rental'))) {
                      itemNameOthers = item.subtitle;
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
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{workDescription}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice((item.calculation.workCost || 0) + (item.calculation.materialCost || 0))}</span>
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
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t('without VAT')}</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(calculation.total)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t('VAT')}</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(vatAmount)}</span>
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