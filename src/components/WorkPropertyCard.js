import React from 'react';
import {
  Plus,
  Trash2,
  X,
  Hammer,
  Package,
  ChevronDown,
  Copy
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from './NumberInput';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';
import { SimpleLayerIcon, DoubleLayerIcon, TripleLayerIcon, ActiveLayersIcon } from './LayerIcons';
import { unitToDisplaySymbol } from '../services/workItemsMapping';

// Helper to get the item label based on property type
const getItemLabel = (property, item, index, totalCount, t) => {
  // Reverse numbering: newest item (index 0) gets highest number
  const itemNumber = totalCount - index;

  // For brick partitions: "Priečka č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS) {
    return `${t('Partition no.')} ${itemNumber}`;
  }

  // For brick load-bearing wall: "Stena č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING) {
    return `${t('Wall no.')} ${itemNumber}`;
  }

  // For plasterboarding with types: "Jednoduchá č. 1", "Dvojitá č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION ||
    property.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET) {
    if (item.selectedType) {
      return `${t(item.selectedType)} ${t('no.')} ${itemNumber}`;
    }
    return `${t('no.')} ${itemNumber}`;
  }

  // For netting wall: "Stena č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.NETTING_WALL) {
    return `${t('Wall no.')} ${itemNumber}`;
  }

  // For netting ceiling: "Strop č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING) {
    return `${t('Ceiling no.')} ${itemNumber}`;
  }

  // For plastering wall: "Stena č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL) {
    return `${t('Wall no.')} ${itemNumber}`;
  }

  // For plastering ceiling: "Strop č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING) {
    return `${t('Ceiling no.')} ${itemNumber}`;
  }

  // For facade plastering: "Stena č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING) {
    return `${t('Wall no.')} ${itemNumber}`;
  }

  // For penetration coating: "Náter č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING) {
    return `${t('Coating no.')} ${itemNumber}`;
  }

  // For levelling: "Proces č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.LEVELLING) {
    return `${t('Process no.')} ${itemNumber}`;
  }

  // For floating floor: "Pokládka č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR) {
    return `${t('Laying no.')} ${itemNumber}`;
  }

  // For tiling under 60cm: "Pokládka č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60) {
    return `${t('Laying no.')} ${itemNumber}`;
  }

  // For paving under 60cm: "Pokládka č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60) {
    return `${t('Laying no.')} ${itemNumber}`;
  }

  // For window installation: "Okno č. 1"
  if (property.id === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
    return `${t('Window no.')} ${itemNumber}`;
  }

  // Default: use property name + no. X
  return `${t(property.name)} ${t('no.')} ${itemNumber}`;
};

const WorkPropertyCard = ({
  property,
  workData,
  expandedItems,
  newlyAddedItems,
  showingRentalsSelector,
  showingSanitarySelector,
  showingTypeSelector,
  onAddWorkItem,
  onRemoveWorkItem,
  onToggleExpanded,
  onRentalTypeSelect,
  onSanitaryTypeSelect,
  onTypeSelect,
  onUpdateWorkItem,
  onUnitSelect,
  onAddDoorWindow,
  onUpdateDoorWindow,
  onRemoveDoorWindow,
  onCopyDoorWindow,
  onToggleAllComplementaryWorks,
  onToggleComplementaryWork,
  onCloseSelector, // For closing type/rental/sanitary selectors
  onUpdateItemState // For updating top-level item properties like selectedType
}) => {
  const { t } = useLanguage();

  // For rentals, we need to match items with specific rental propertyIds (core_drill, tool_rental, scaffolding)
  // as well as the parent 'rentals' propertyId
  const rentalPropertyIds = ['rentals', 'core_drill', 'tool_rental', 'scaffolding'];
  const existingItems = workData.filter(item => {
    if (property.id === WORK_ITEM_PROPERTY_IDS.RENTALS) {
      return rentalPropertyIds.includes(item.propertyId);
    }
    return item.propertyId === property.id;
  });

  // Helper to get the toggle-all icon state for complementary works
  // Returns the icon that represents what clicking will do (next state)
  const getToggleAllIconState = (item, complementaryWorks, supportsDouble) => {
    if (!complementaryWorks || complementaryWorks.length === 0) return 0;

    // Get max value across all complementary works
    const values = complementaryWorks.map((work, index) => {
      const occurrenceIndex = complementaryWorks.slice(0, index).filter(w => w === work).length;
      const uniqueKey = `${work}_${occurrenceIndex}`;
      return item.complementaryWorks?.[uniqueKey] || 0;
    });

    const maxValue = Math.max(...values);
    const maxAllowed = supportsDouble ? 2 : 1;

    // Return the NEXT state (what clicking will do)
    // Icon shows: single layer -> will set all to 1
    //             double layer -> will set all to 2 (if supported)
    //             empty/none -> will set all to 0
    if (maxValue === 0) {
      return 1; // Show single layer icon (clicking sets all to 1)
    } else if (maxValue === 1 && maxAllowed === 2) {
      return 2; // Show double layer icon (clicking sets all to 2)
    } else {
      return 0; // Show empty icon (clicking sets all to 0)
    }
  };

  const renderDoorWindowSection = (item, type) => {
    const items = item.doorWindowItems?.[type] || [];
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);

    return (
      <div className="space-y-3 lg:space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-base lg:text-sm font-semibold text-gray-900 dark:text-white">{t(typeName)}</span>
          <button
            onClick={(e) => onAddDoorWindow(item.id, type, e)}
            className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4 lg:w-3 lg:h-3" />
          </button>
        </div>

        {items.map((subItem, index) => (
          <div key={subItem.id} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 space-y-3 lg:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base lg:text-sm font-semibold text-gray-900 dark:text-white">
                {t('no.')} {index + 1}
              </span>
              <div className="flex gap-2 lg:gap-1">
                <button
                  onClick={(e) => onCopyDoorWindow(item.id, type, subItem.id, e)}
                  className="w-7 h-7 lg:w-6 lg:h-6 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Copy className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>
                <button
                  onClick={(e) => onRemoveDoorWindow(item.id, type, subItem.id, e)}
                  className="w-7 h-7 lg:w-6 lg:h-6 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400 sm:w-12 sm:flex-shrink-0">{t('Width')}</span>
                <div className="flex items-center gap-2 justify-end w-full">
                  <NumberInput
                    value={subItem.width || 0}
                    onChange={(value) => onUpdateDoorWindow(item.id, type, subItem.id, 'width', value)}
                    size="small"
                    className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                    min={0}
                  />
                  <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400">m</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400 sm:w-12 sm:flex-shrink-0">{t('Height')}</span>
                <div className="flex items-center gap-2 justify-end w-full">
                  <NumberInput
                    value={subItem.height || 0}
                    onChange={(value) => onUpdateDoorWindow(item.id, type, subItem.id, 'height', value)}
                    size="small"
                    className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                    min={0}
                  />
                  <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400">m</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderField = (item, field) => {
    const fieldKey = field.subtitle ? `${field.name}_${field.subtitle}` : field.name;
    const value = item.fields[fieldKey];
    const isTextType = field.type === 'text';
    const isToggleType = field.type === 'toggle';

    // Skip doors and windows fields as they're rendered separately
    if (field.name === WORK_ITEM_NAMES.DOORS || field.name === WORK_ITEM_NAMES.WINDOWS) {
      return null;
    }

    // Skip Name field for custom work as it's now in the header
    if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && field.name === WORK_ITEM_NAMES.NAME) {
      return null;
    }

    // For custom work, show selected unit for Quantity and Price fields
    // Convert iOS unit values (e.g., "squareMeter") to display symbols (e.g., "m²")
    let unitDisplay = field.unit;
    if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && item.selectedUnit) {
      const displayUnit = unitToDisplaySymbol(item.selectedUnit);
      if (field.name === WORK_ITEM_NAMES.QUANTITY) {
        unitDisplay = displayUnit;
      } else if (field.name === WORK_ITEM_NAMES.PRICE) {
        unitDisplay = `€/${displayUnit}`;
      }
    }

    // Handle toggle type (checkbox)
    if (isToggleType) {
      return (
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white text-base">{t(field.name)}</div>
            {field.subtitle && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{t(field.subtitle)}</div>
            )}
          </div>
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onUpdateWorkItem(item.id, fieldKey, e.target.checked)}
            className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400">
          {t(field.name)}
          {field.subtitle && ` - ${t(field.subtitle)}`}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isTextType ? (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onUpdateWorkItem(item.id, fieldKey, e.target.value, true)}
              className="w-32 px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
              placeholder={t(field.name)}
            />
          ) : (
            <NumberInput
              value={value || 0}
              onChange={(value) => onUpdateWorkItem(item.id, fieldKey, value)}
              className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
              min={0}
            />
          )}
          {unitDisplay && <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{t(unitDisplay)}</span>}
        </div>
      </div>
    );
  };

  // 1. Rentals
  if (property.id === WORK_ITEM_PROPERTY_IDS.RENTALS) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm transition-all duration-300 ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        {/* Always show header with plus button */}
        <div
          className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={(e) => {
            if (existingItems.length > 0) {
              e.preventDefault();
              onToggleExpanded(property.id, e);
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
          </div>
          <div
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            onClick={(e) => onAddWorkItem(property.id, e)}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Type selector when showing */}
        {showingRentalsSelector && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm" key="rentals-selector">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Select Rental Type')}</h4>
              <button
                onClick={onCloseSelector}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {property.items.map(item => (
                <button
                  key={item.name}
                  onClick={(e) => onRentalTypeSelect(item.name, e)}
                  className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  {t(item.name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing rental items */}
        {expandedItems[property.id] && existingItems.map((item, index) => {
          // Custom label for tool rental: "Náradie č. 1"
          const rentalLabel = item.name === 'Tool rental'
            ? `${t('Tool no.')} ${index + 1}`
            : `${t(item.name)} ${t('no.')} ${index + 1}`;

          return (
            <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 animate-slide-in ${newlyAddedItems.has(item.id) ? '' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white text-lg">
                  {rentalLabel}
                </span>
                <button
                  onClick={(e) => onRemoveWorkItem(item.id, e)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
                </button>
              </div>

              {/* Rental fields */}
              {item.rentalFields && (
                <div className="space-y-3 lg:space-y-2">
                  {item.rentalFields.map(field => (
                    <div key={field.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{t(field.name)}</span>
                      <div className="flex items-center gap-2 justify-end w-full">
                        <NumberInput
                          value={item.fields[field.name] || 0}
                          onChange={(value) => onUpdateWorkItem(item.id, field.name, value)}
                          className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                          min={0}
                        />
                        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">{t(field.unit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 2. Single behavior items (e.g. Commute, Preparatory works)
  if (property.behavior === 'single') {
    const existingItem = workData.find(item => item.propertyId === property.id);

    const hasInput = (item) => {
      if (!item) return false;
      // Check fields - must have at least one field with a meaningful value
      if (item.fields && Object.keys(item.fields).length > 0) {
        const hasFieldInput = Object.entries(item.fields).some(([key, value]) => {
          // Skip undefined/null values
          if (value === undefined || value === null) return false;
          if (typeof value === 'number') return value > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          if (typeof value === 'boolean') return value === true;
          return false;
        });
        if (hasFieldInput) return true;
      }
      // Check doors/windows
      if (item.doorWindowItems) {
        if (item.doorWindowItems.doors?.length > 0) return true;
        if (item.doorWindowItems.windows?.length > 0) return true;
      }
      return false;
    };

    const isFilled = hasInput(existingItem);

    return (
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm transition-all duration-300 ${isFilled ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        {/* Header with plus/minus button */}
        <div
          className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (existingItem) {
              onToggleExpanded(existingItem.id, e);
            } else {
              onAddWorkItem(property.id, e);
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
            )}
          </div>
          {existingItem && expandedItems[existingItem.id] ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveWorkItem(existingItem.id, e);
              }}
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              title={t('Delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Show fields only when item exists AND is expanded */}
        {existingItem && expandedItems[existingItem.id] && (
          <div className="space-y-3 lg:space-y-2 animate-slide-in">
            {property.fields?.map(field => (
              <div key={field.name}>
                {renderField(existingItem, field)}
              </div>
            ))}

            {/* Doors and Windows sections */}
            {property.fields && (() => {
              const hasDoors = property.fields.some(f => f.name === WORK_ITEM_NAMES.DOORS);
              const hasWindows = property.fields.some(f => f.name === WORK_ITEM_NAMES.WINDOWS);

              if (hasDoors && hasWindows) {
                return (
                  <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3">
                    {renderDoorWindowSection(existingItem, 'doors')}
                    {renderDoorWindowSection(existingItem, 'windows')}
                  </div>
                );
              } else if (hasWindows) {
                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {renderDoorWindowSection(existingItem, 'windows')}
                    <div className="hidden lg:block"></div>
                  </div>
                );
              } else if (hasDoors) {
                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {renderDoorWindowSection(existingItem, 'doors')}
                    <div className="hidden lg:block"></div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Additional Fields (toggles and extra inputs) */}
            {property.additionalFields && (
              <div className="space-y-3 lg:space-y-2">
                {property.additionalFields.map((field, index) => (
                  <div key={`${field.name}-${field.subtitle || index}`}>
                    {renderField(existingItem, field)}
                  </div>
                ))}
              </div>
            )}

            {/* Complementary works */}
            {property.complementaryWorks && (
              <div className="space-y-3 lg:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base lg:text-sm font-semibold text-gray-900 dark:text-white">{t('Complementary works')}</span>
                  {/* Use separate key for complementary works expansion */}
                  <button
                    onClick={(e) => onToggleExpanded(`${existingItem.id}_complementary`, e)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {expandedItems[`${existingItem.id}_complementary`] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                  </button>
                </div>

                {expandedItems[`${existingItem.id}_complementary`] && (
                  <div className="space-y-3 lg:space-y-2 ">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => onToggleAllComplementaryWorks(existingItem.id, e)}
                        className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                        title="Toggle all complementary works"
                      >
                        <ActiveLayersIcon activeLayers={getToggleAllIconState(existingItem, property.complementaryWorks, property.supportsDoubleComplementary)} className="w-full h-full" />
                      </button>
                    </div>
                    {property.complementaryWorks.map((work, index) => {
                      // Count occurrences of this work type before current index
                      const occurrenceIndex = property.complementaryWorks.slice(0, index).filter(w => w === work).length;
                      const uniqueKey = `${work}_${occurrenceIndex}`;
                      // Read the flag value from complementaryWorks (0, 1, or 2)
                      const instanceCount = existingItem.complementaryWorks?.[uniqueKey] || 0;

                      return (
                        <div key={`${work}_${index}`} className="flex items-center justify-between gap-3">
                          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                          <button
                            onClick={(e) => onToggleComplementaryWork(existingItem.id, uniqueKey, e)}
                            className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <ActiveLayersIcon activeLayers={instanceCount} className="w-full h-full" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. Special handling for properties with types (Simple/Double/Triple) - but NOT custom_work
  // custom_work is handled in the regular property card section below
  if (property.types && property.id !== WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION && property.id !== WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const existingItems = workData.filter(item => item.propertyId === property.id);

    return (
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        {/* Always show header with plus button */}
        <div
          className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={(e) => {
            if (existingItems.length > 0) {
              e.preventDefault();
              onToggleExpanded(property.id, e);
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
            )}
          </div>
          <div
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            onClick={(e) => onAddWorkItem(property.id, e)}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Type selector when showing */}
        {showingTypeSelector === property.id && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm" key="type-selector">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Select Type')}</h4>
              <button
                onClick={onCloseSelector}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {property.types.map(type => (
                <button
                  key={type}
                  onClick={(e) => onTypeSelect(type, e)}
                  className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center flex flex-col items-center justify-center gap-1"
                >
                  {type === 'Work' && <Hammer className="w-4 h-4" />}
                  {type === 'Material' && <Package className="w-4 h-4" />}
                  {type === 'Simple' && <SimpleLayerIcon className="w-10 h-10" />}
                  {type === 'Double' && <DoubleLayerIcon className="w-10 h-10" />}
                  {type === 'Triple' && <TripleLayerIcon className="w-10 h-10" />}
                  {t(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing type items */}
        {expandedItems[property.id] && existingItems.map((item, index) => (
          <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 ${newlyAddedItems.has(item.id) ? '' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {getItemLabel(property, item, index, existingItems.length, t)}
              </span>
              <button
                onClick={(e) => onRemoveWorkItem(item.id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
              </button>
            </div>

            {/* Fields */}
            {property.fields && (
              <div className="space-y-3 lg:space-y-2">
                {property.fields.map(field => (
                  <div key={field.name}>
                    {renderField(item, field)}
                  </div>
                ))}
              </div>
            )}

            {/* Doors and Windows sections */}
            {property.fields && (() => {
              const hasDoors = property.fields.some(f => f.name === WORK_ITEM_NAMES.DOORS);
              const hasWindows = property.fields.some(f => f.name === WORK_ITEM_NAMES.WINDOWS);

              if (hasDoors && hasWindows) {
                return (
                  <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3">
                    {renderDoorWindowSection(item, 'doors')}
                    {renderDoorWindowSection(item, 'windows')}
                  </div>
                );
              } else if (hasWindows) {
                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {renderDoorWindowSection(item, 'windows')}
                    <div className="hidden lg:block"></div>
                  </div>
                );
              } else if (hasDoors) {
                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {renderDoorWindowSection(item, 'doors')}
                    <div className="hidden lg:block"></div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Additional Fields (toggles and extra inputs) */}
            {property.additionalFields && (
              <div className="space-y-3 lg:space-y-2">
                {property.additionalFields.map((field, index) => (
                  <div key={`${field.name}-${field.subtitle || index}`}>
                    {renderField(item, field)}
                  </div>
                ))}
              </div>
            )}

            {/* Complementary works */}
            {property.complementaryWorks && (
              <div className="space-y-3 lg:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base lg:text-sm font-semibold text-gray-900 dark:text-white">{t('Complementary works')}</span>
                  <button
                    onClick={(e) => onToggleExpanded(`${item.id}_complementary`, e)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {expandedItems[`${item.id}_complementary`] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                  </button>
                </div>

                {expandedItems[`${item.id}_complementary`] && (
                  <div className="space-y-3 lg:space-y-2 ">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => onToggleAllComplementaryWorks(item.id, e)}
                        className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                        title="Toggle all complementary works"
                      >
                        <ActiveLayersIcon activeLayers={getToggleAllIconState(item, property.complementaryWorks, property.supportsDoubleComplementary)} className="w-full h-full" />
                      </button>
                    </div>
                    {property.complementaryWorks.map((work, index) => {
                      // Count occurrences of this work type before current index
                      const occurrenceIndex = property.complementaryWorks.slice(0, index).filter(w => w === work).length;
                      const uniqueKey = `${work}_${occurrenceIndex}`;
                      // Read the flag value from complementaryWorks (0, 1, or 2)
                      const instanceCount = item.complementaryWorks?.[uniqueKey] || 0;

                      return (
                        <div key={`${work}_${index}`} className="flex items-center justify-between gap-3">
                          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                          <button
                            onClick={(e) => onToggleComplementaryWork(item.id, uniqueKey, e)}
                            className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <ActiveLayersIcon activeLayers={instanceCount} className="w-full h-full" />
                          </button>
                        </div>);
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4. Special handling for sanitary installation
  if (property.id === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        {/* Always show header with plus button */}
        <div
          className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-pointer hover:opacity-80'}`}
          onClick={(e) => {
            if (existingItems.length > 0) {
              e.preventDefault();
              onToggleExpanded(property.id, e);
            } else {
              if (showingSanitarySelector) {
                onCloseSelector();
              } else {
                onAddWorkItem(property.id, e);
              }
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{property.subtitle}</p>
            )}
          </div>
          <div
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              // Ensure we don't trigger the parent click which might toggle instead of add
              e.stopPropagation();
              onAddWorkItem(property.id, e);
            }}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Type selector when showing */}
        {showingSanitarySelector && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm" key="sanitary-selector">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Type of Sanitary')}</h4>
              <button
                onClick={onCloseSelector}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {property.types.map(type => (
                <button
                  key={type}
                  onClick={(e) => onSanitaryTypeSelect(type, e)}
                  className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  {t(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing sanitary items */}
        {expandedItems[property.id] && existingItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {t(item.selectedType)}
              </span>
              <button
                onClick={(e) => onRemoveWorkItem(item.id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
              </button>
            </div>

            {/* Count and Price fields */}
            <div className="space-y-3 lg:space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0 flex items-center gap-2">
                  {t(WORK_ITEM_NAMES.COUNT)}
                  <Hammer className="w-3 h-3" />
                </span>
                <div className="flex items-center gap-2 justify-end w-full">
                  <NumberInput
                    value={item.fields[WORK_ITEM_NAMES.COUNT] || 0}
                    onChange={(value) => onUpdateWorkItem(item.id, WORK_ITEM_NAMES.COUNT, value)}
                    className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                    min={0}
                  />
                  <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">{t('pc')}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0 flex items-center gap-2">
                  {t(WORK_ITEM_NAMES.PRICE)}
                  <Package className="w-3 h-3" />
                </span>
                <div className="flex items-center gap-2 justify-end w-full">
                  <NumberInput
                    value={item.fields[WORK_ITEM_NAMES.PRICE] || 0}
                    onChange={(value) => onUpdateWorkItem(item.id, WORK_ITEM_NAMES.PRICE, value)}
                    className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                    min={0}
                  />
                  <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">€/{t('pc')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 5. Special handling for Custom Work (Grouped by Type)
  if (property.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const unclassifiedItems = existingItems.filter(item => !item.selectedUnit);
    const workItems = existingItems.filter(item => item.selectedType === 'Work' && item.selectedUnit);
    const materialItems = existingItems.filter(item => item.selectedType === 'Material' && item.selectedUnit);

    const renderCustomItem = (item, index, totalCount) => (
      <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
        <div className="flex items-center justify-between">
          {item.selectedUnit ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                id={`custom-work-name-${item.id}`}
                type="text"
                defaultValue={item.fields[WORK_ITEM_NAMES.NAME] || ''}
                onBlur={(e) => onUpdateWorkItem(item.id, WORK_ITEM_NAMES.NAME, e.target.value, true)}
                className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded border-none focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm min-w-0 font-semibold"
                placeholder={item.selectedType === 'Work' ? t('Work name') : t('Material name')}
              />
            </div>
          ) : (
            <span className="font-semibold text-gray-900 dark:text-white text-lg">
              {t(property.name)}
            </span>
          )}
          <button
            onClick={(e) => onRemoveWorkItem(item.id, e)}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
        </div>

        {/* Property type selection - only show if unit not yet selected */}
        {property.types && !item.selectedUnit && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {property.types.map(type => (
              <button
                key={type}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdateItemState(item.id, { selectedType: type });
                }}
                className={`p-3 lg:p-2 rounded-lg text-sm lg:text-sm transition-colors flex flex-col items-center justify-center gap-1 ${item.selectedType === type
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {type === 'Work' && <Hammer className="w-4 h-4" />}
                {type === 'Material' && <Package className="w-4 h-4" />}
                {t(type)}
              </button>
            ))}
          </div>
        )}

        {/* Unit selector - only show after type is selected but before unit is selected */}
        {property.hasUnitSelector && item.selectedType && !item.selectedUnit && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3">
            <span className="text-base font-semibold text-gray-900 dark:text-white">{t('Select unit')}</span>
            <div className="grid grid-cols-4 gap-2">
              {(item.selectedType === 'Work' ? property.workUnits : property.materialUnits)?.map(unit => (
                <button
                  key={unit}
                  onClick={(e) => onUnitSelect(item.id, unit, e)}
                  className="p-2 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Property fields - only show if unit is selected */}
        {property.fields && item.selectedUnit && (
          <div className="space-y-3 lg:space-y-2">
            {property.fields.map(field => (
              <div key={field.name}>
                {renderField(item, field)}
              </div>
            ))}
          </div>
        )}
      </div>
    );

    return (
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        <div
          className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={(e) => {
            if (existingItems.length > 0) {
              e.preventDefault();
              onToggleExpanded(property.id, e);
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
            )}
          </div>
          <div
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            onClick={(e) => onAddWorkItem(property.id, e)}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {expandedItems[property.id] && (
          <div className="space-y-4 animate-slide-in">
            {/* 1. Unclassified Items (sorting/unit selection) */}
            {unclassifiedItems.length > 0 && (
              <div className="space-y-3">
                {unclassifiedItems.map((item, index) => renderCustomItem(item, index))}
              </div>
            )}

            {/* 2. Work Items */}
            {workItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Hammer className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('Work')}</h5>
                </div>
                {workItems.map((item, index) => renderCustomItem(item, index))}
              </div>
            )}

            {/* 3. Material Items */}
            {materialItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Package className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{t('Material')}</h5>
                </div>
                {materialItems.map((item, index) => renderCustomItem(item, index))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 6. Regular property card for other properties (default)
  return (
    <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
      <div
        className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={(e) => {
          if (existingItems.length > 0) {
            e.preventDefault();
            onToggleExpanded(property.id, e);
          }
        }}
      >
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t(property.name)}</h4>
          {property.subtitle && (
            <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
          )}
        </div>
        <div
          className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          onClick={(e) => onAddWorkItem(property.id, e)}
        >
          <Plus className="w-4 h-4" />
        </div>
      </div>

      {/* Show existing work items for this property */}
      {expandedItems[property.id] && existingItems.map((item, index) => (
        <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
          <div className="flex items-center justify-between">
            {property.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && item.selectedUnit ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  id={`custom-work-name-${item.id}`}
                  type="text"
                  defaultValue={item.fields[WORK_ITEM_NAMES.NAME] || ''}
                  onBlur={(e) => onUpdateWorkItem(item.id, WORK_ITEM_NAMES.NAME, e.target.value, true)}
                  className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded border-none focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm min-w-0"
                  placeholder={item.selectedType === 'Work' ? t('Work name') : t('Material name')}
                />
              </div>
            ) : property.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK ? (
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {t(property.name)}
              </span>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {getItemLabel(property, item, index, existingItems.length, t)}
              </span>
            )}
            <button
              onClick={(e) => onRemoveWorkItem(item.id, e)}
              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
            </button>
          </div>

          {/* Property type selection - for custom_work, only show if unit not yet selected */}
          {property.types && (property.id !== WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK || !item.selectedUnit) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {property.types.map(type => (
                <button
                  key={type}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpdateItemState(item.id, { selectedType: type });
                  }}
                  className={`p-3 lg:p-2 rounded-lg text-sm lg:text-sm transition-colors flex flex-col items-center justify-center gap-1 ${item.selectedType === type
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {type === 'Work' && <Hammer className="w-4 h-4" />}
                  {type === 'Material' && <Package className="w-4 h-4" />}
                  {type === 'Simple' && <SimpleLayerIcon className="w-10 h-10" />}
                  {type === 'Double' && <DoubleLayerIcon className="w-10 h-10" />}
                  {type === 'Triple' && <TripleLayerIcon className="w-10 h-10" />}
                  {t(type)}
                </button>
              ))}
            </div>
          )}

          {/* Unit selector for custom work - only show after type is selected but before unit is selected */}
          {property.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && property.hasUnitSelector && item.selectedType && !item.selectedUnit && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3">
              <span className="text-base font-semibold text-gray-900 dark:text-white">{t('Select unit')}</span>
              <div className="grid grid-cols-4 gap-2">
                {(item.selectedType === 'Work' ? property.workUnits : property.materialUnits)?.map(unit => (
                  <button
                    key={unit}
                    onClick={(e) => onUnitSelect(item.id, unit, e)}
                    className="p-2 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Property fields */}
          {property.fields && (property.id !== WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK || item.selectedUnit) && (
            <div className="space-y-3 lg:space-y-2">
              {property.fields.map(field => (
                <div key={field.name}>
                  {renderField(item, field)}
                </div>
              ))}
            </div>
          )}

          {/* Doors and Windows sections */}
          {property.fields && (() => {
            const hasDoors = property.fields.some(f => f.name === WORK_ITEM_NAMES.DOORS);
            const hasWindows = property.fields.some(f => f.name === WORK_ITEM_NAMES.WINDOWS);

            if (hasDoors && hasWindows) {
              return (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3">
                  {renderDoorWindowSection(item, 'doors')}
                  {renderDoorWindowSection(item, 'windows')}
                </div>
              );
            } else if (hasWindows) {
              return (
                <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                  {renderDoorWindowSection(item, 'windows')}
                  <div className="hidden lg:block"></div>
                </div>
              );
            } else if (hasDoors) {
              return (
                <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                  {renderDoorWindowSection(item, 'doors')}
                  <div className="hidden lg:block"></div>
                </div>
              );
            }
            return null;
          })()}

          {/* Additional Fields (toggles and extra inputs) */}
          {property.additionalFields && (
            <div className="space-y-3 lg:space-y-2">
              {property.additionalFields.map((field, index) => (
                <div key={`${field.name}-${field.subtitle || index}`}>
                  {renderField(item, field)}
                </div>
              ))}
            </div>
          )}

          {/* Complementary works */}
          {property.complementaryWorks && (
            <div className="space-y-3 lg:space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base lg:text-sm font-semibold text-gray-900 dark:text-white">{t('Complementary works')}</span>
                <button
                  onClick={(e) => onToggleExpanded(`${item.id}_complementary`, e)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {expandedItems[`${item.id}_complementary`] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                </button>
              </div>

              {expandedItems[`${item.id}_complementary`] && (
                <div className="space-y-3 lg:space-y-2 ">
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => onToggleAllComplementaryWorks(item.id, e)}
                      className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                      title="Toggle all complementary works"
                    >
                      <ActiveLayersIcon activeLayers={getToggleAllIconState(item, property.complementaryWorks, property.supportsDoubleComplementary)} className="w-full h-full" />
                    </button>
                  </div>
                  {property.complementaryWorks.map((work, index) => {
                    // Count occurrences of this work type before current index
                    const occurrenceIndex = property.complementaryWorks.slice(0, index).filter(w => w === work).length;
                    const uniqueKey = `${work}_${occurrenceIndex}`;
                    // Read the flag value from complementaryWorks (0, 1, or 2)
                    const instanceCount = item.complementaryWorks?.[uniqueKey] || 0;

                    return (
                      <div key={`${work}_${index}`} className="flex items-center justify-between gap-3">
                        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                        <button
                          onClick={(e) => onToggleComplementaryWork(item.id, uniqueKey, e)}
                          className="w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          <ActiveLayersIcon activeLayers={instanceCount} className="w-full h-full" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkPropertyCard;