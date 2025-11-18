import React, { useState, useRef, useLayoutEffect } from 'react';
import { X, Plus, Trash2, Check, Menu, Copy, Hammer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import NumberInput from './NumberInput';

const RoomDetailsModal = ({ room, workProperties, onSave, onClose }) => {
  const { t } = useLanguage();
  const { calculateRoomPriceWithMaterials, formatPrice, generalPriceList } = useAppData();
  const [workData, setWorkData] = useState(room.workItems || []);
  const [expandedItems, setExpandedItems] = useState({});
  const [showingSanitarySelector, setShowingSanitarySelector] = useState(false);
  const [showingRentalsSelector, setShowingRentalsSelector] = useState(false);
  const [showingTypeSelector, setShowingTypeSelector] = useState(null);
  const [showingUnitSelector, setShowingUnitSelector] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Save scroll position before any state change
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Restore scroll position after render
  useLayoutEffect(() => {
    if (scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  });


  // Separate "Others" category properties
  const othersIds = ['custom_work', 'commute', 'rentals'];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      // Save data before closing
      onSave(workData);
      onClose();
    }, 300);
  };
  const mainProperties = workProperties.filter(prop => !othersIds.includes(prop.id) && !prop.hidden);
  const othersProperties = workProperties.filter(prop => othersIds.includes(prop.id) && !prop.hidden);

  const handleAddWorkItem = (propertyId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    if (propertyId === 'sanitary_installation') {
      setShowingSanitarySelector(true);
      return;
    }
    
    if (propertyId === 'rentals') {
      setShowingRentalsSelector(true);
      return;
    }
    
    // Check if this property has types (like Simple/Double/Triple)
    const property = workProperties.find(p => p.id === propertyId);
    if (property?.types && property.id !== 'sanitary_installation') {
      setShowingTypeSelector(propertyId);
      return;
    }
    const newItem = {
      id: Date.now(),
      propertyId,
      name: t(property.name),
      subtitle: t(property.subtitle),
      fields: {},
      complementaryWorks: {},
      selectedType: property.types ? property.types[0] : null,
      doorWindowItems: { doors: [], windows: [] }
    };
    setWorkData([...workData, newItem]);
  };

  const handleSanitaryTypeSelect = (sanitaryType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    const newItem = {
      id: Date.now(),
      propertyId: 'sanitary_installation',
      name: 'Sanitary installation',
      subtitle: sanitaryType,
      fields: {
        'Count': 0,
        'Price': 0
      },
      complementaryWorks: {},
      selectedType: sanitaryType
    };
    setWorkData([...workData, newItem]);
    setShowingSanitarySelector(false);
  };
  
  const handleTypeSelect = (type, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    const property = workProperties.find(p => p.id === showingTypeSelector);
    if (!property) return;
    
    const newItem = {
      id: Date.now(),
      propertyId: property.id,
      name: property.id === 'custom_work' ? t(property.name) : `${t(property.name)} ${t(type)}`,
      subtitle: property.subtitle,
      fields: {},
      complementaryWorks: {},
      selectedType: type,
      selectedUnit: null,
      doorWindowItems: { doors: [], windows: [] }
    };
    
    // Initialize fields
    property.fields?.forEach(field => {
      newItem.fields[field.name] = field.type === 'text' ? '' : 0;
    });
    
    setWorkData([...workData, newItem]);
    
    // For custom work, show unit selector after type selection and close type selector
    if (property.id === 'custom_work' && property.hasUnitSelector) {
      setShowingTypeSelector(null);
      setShowingUnitSelector(newItem.id);
    } else {
      setShowingTypeSelector(null);
    }
  };

  const handleUnitSelect = (itemId, unit, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, selectedUnit: unit }
          : item
      )
    );
    setShowingUnitSelector(null);
  };

  const handleRentalTypeSelect = (rentalType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    const rentalItem = workProperties.find(p => p.id === 'rentals')?.items?.find(item => item.name === rentalType);
    if (!rentalItem) return;

    const newItem = {
      id: Date.now(),
      propertyId: 'rentals',
      name: rentalType,
      subtitle: 'no. 1',
      fields: {},
      complementaryWorks: {},
      selectedType: rentalType,
      rentalFields: rentalItem.fields
    };

    // Initialize fields based on rental type
    rentalItem.fields.forEach(field => {
      newItem.fields[field.name] = 0;
    });

    setWorkData([...workData, newItem]);
    setShowingRentalsSelector(false);
  };

  const handleUpdateWorkItem = (itemId, field, value, isText = false) => {
    // Handle both text and numeric inputs
    const processedValue = isText ? value || '' : value || 0;
    
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, fields: { ...item.fields, [field]: processedValue } }
          : item
      )
    );
  };

  const handleAddDoorWindow = (itemId, type, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              doorWindowItems: {
                ...item.doorWindowItems,
                [type]: [
                  ...(item.doorWindowItems?.[type] || []),
                  {
                    id: Date.now(),
                    width: 0,
                    height: 0
                  }
                ]
              }
            }
          : item
      )
    );
  };

  const handleUpdateDoorWindow = (itemId, type, subItemId, field, value) => {
    // NumberInput component already handles validation and returns a numeric value
    const processedValue = value || 0;
    
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              doorWindowItems: {
                ...item.doorWindowItems,
                [type]: item.doorWindowItems?.[type]?.map(subItem =>
                  subItem.id === subItemId
                    ? { ...subItem, [field]: processedValue }
                    : subItem
                ) || []
              }
            }
          : item
      )
    );
  };

  const handleRemoveDoorWindow = (itemId, type, subItemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              doorWindowItems: {
                ...item.doorWindowItems,
                [type]: item.doorWindowItems?.[type]?.filter(subItem => subItem.id !== subItemId) || []
              }
            }
          : item
      )
    );
  };

  const handleCopyDoorWindow = (itemId, type, subItemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              doorWindowItems: {
                ...item.doorWindowItems,
                [type]: [
                  ...(item.doorWindowItems?.[type] || []),
                  {
                    ...item.doorWindowItems[type].find(subItem => subItem.id === subItemId),
                    id: Date.now()
                  }
                ]
              }
            }
          : item
      )
    );
  };

  const handleToggleComplementaryWork = (itemId, workName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              complementaryWorks: { 
                ...item.complementaryWorks, 
                [workName]: !item.complementaryWorks[workName] 
              } 
            }
          : item
      )
    );
  };

  const handleRemoveWorkItem = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    setWorkData(items => items.filter(item => item.id !== itemId));
  };

  const toggleExpanded = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    saveScrollPosition();
    
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderDoorWindowSection = (item, type) => {
    const items = item.doorWindowItems?.[type] || [];
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    
    return (
      <div className="space-y-3 lg:space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t(typeName)}</span>
          <button
            onClick={(e) => handleAddDoorWindow(item.id, type, e)}
            className="w-7 h-7 lg:w-6 lg:h-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4 lg:w-3 lg:h-3" />
          </button>
        </div>
        
        {items.map((subItem, index) => (
          <div key={subItem.id} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 space-y-3 lg:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">
                {t('no.')} {index + 1}
              </span>
              <div className="flex gap-2 lg:gap-1">
                <button
                  onClick={(e) => handleCopyDoorWindow(item.id, type, subItem.id, e)}
                  className="w-7 h-7 lg:w-6 lg:h-6 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  <Copy className="w-4 h-4 lg:w-3 lg:h-3" />
                </button>
                <button
                  onClick={(e) => handleRemoveDoorWindow(item.id, type, subItem.id, e)}
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
                    onChange={(value) => handleUpdateDoorWindow(item.id, type, subItem.id, 'width', value)}
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
                    onChange={(value) => handleUpdateDoorWindow(item.id, type, subItem.id, 'height', value)}
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
    const value = item.fields[field.name];
    const isTextType = field.type === 'text';
    
    // Skip doors and windows fields as they're rendered separately
    if (field.name === 'Doors' || field.name === 'Windows') {
      return null;
    }

    // Skip Name field for custom work as it's now in the header
    if (item.propertyId === 'custom_work' && field.name === 'Name') {
      return null;
    }

    // For custom work price field, show unit in the label
    let unitDisplay = field.unit;
    if (item.propertyId === 'custom_work' && field.name === 'Price' && item.selectedUnit) {
      unitDisplay = `€/${item.selectedUnit}`;
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{t(field.name)}</span>
        <div className="flex items-center gap-2 justify-end w-full">
          {isTextType ? (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleUpdateWorkItem(item.id, field.name, e.target.value, true)}
              className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
              placeholder={t(field.name)}
            />
          ) : (
            <NumberInput
              value={value || 0}
              onChange={(value) => handleUpdateWorkItem(item.id, field.name, value)}
              className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
              min={0}
            />
          )}
          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">{unitDisplay}</span>
        </div>
      </div>
    );
  };

  const WorkPropertyCard = ({ property }) => {
    const existingItems = workData.filter(item => item.propertyId === property.id);
    
    // Special handling for rentals
    if (property.id === 'rentals') {
      return (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Always show header with plus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
            </div>
            <button
              onClick={(e) => handleAddWorkItem(property.id, e)}
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector when showing */}
          {showingRentalsSelector && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm animate-slide-in-top"
                 key="rentals-selector">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('Select Rental Type')}</h4>
                <button
                  onClick={() => setShowingRentalsSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.items.map(item => (
                  <button
                    key={item.name}
                    onClick={(e) => handleRentalTypeSelect(item.name, e)}
                    className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    {t(item.name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing rental items */}
          {existingItems.map((item, index) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 animate-slide-in-top">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {t(item.name)} {t('no.')} {index + 1}
                </span>
                <button
                  onClick={(e) => handleRemoveWorkItem(item.id, e)}
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
                          onChange={(value) => handleUpdateWorkItem(item.id, field.name, value)}
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
          ))}
        </div>
      );
    }
    
    // Special handling for single behavior items
    if (property.behavior === 'single') {
      const existingItem = workData.find(item => item.propertyId === property.id);
      
      return (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Header with plus/minus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveScrollPosition();
                
                if (existingItem) {
                  // Remove the item
                  setWorkData(items => items.filter(item => item.id !== existingItem.id));
                } else {
                  // Add the item
                  const newItem = {
                    id: Date.now(),
                    propertyId: property.id,
                    name: property.name,
                    subtitle: property.subtitle,
                    fields: {},
                    complementaryWorks: {},
                    doorWindowItems: { doors: [], windows: [] }
                  };
                  
                  // Initialize fields
                  property.fields?.forEach(field => {
                    newItem.fields[field.name] = 0;
                  });
                  
                  setWorkData([...workData, newItem]);
                }
              }}
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              {existingItem ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Show fields directly when item exists */}
          {existingItem && (
            <div className="space-y-3 lg:space-y-2 animate-slide-in-top">
              {property.fields?.map(field => (
                <div key={field.name}>
                  {renderField(existingItem, field)}
                </div>
              ))}
              
              {/* Doors and Windows sections */}
              {property.fields && (() => {
                const hasDoors = property.fields.some(f => f.name === 'Doors');
                const hasWindows = property.fields.some(f => f.name === 'Windows');
                
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

              {/* Complementary works */}
              {property.complementaryWorks && (
                <div className="space-y-3 lg:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                    <button
                      onClick={(e) => toggleExpanded(existingItem.id, e)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedItems[existingItem.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>
                  
                  {expandedItems[existingItem.id] && (
                    <div className="space-y-3 lg:space-y-2 animate-slide-in-top">
                      {property.complementaryWorks.map((work, index) => {
                        const uniqueKey = `${work}_${index}`;
                        return (
                          <div key={uniqueKey} className="flex items-center justify-between gap-3">
                            <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                            <button
                              onClick={(e) => handleToggleComplementaryWork(existingItem.id, uniqueKey, e)}
                              className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                existingItem.complementaryWorks[uniqueKey]
                                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {existingItem.complementaryWorks[uniqueKey] && (
                                <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white dark:text-gray-900" />
                              )}
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

    // Special handling for properties with types (Simple/Double/Triple)
    if (property.types && property.id !== 'sanitary_installation') {
      const existingItems = workData.filter(item => item.propertyId === property.id);
      
      return (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Always show header with plus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
              )}
            </div>
            <button
              onClick={(e) => handleAddWorkItem(property.id, e)}
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector when showing */}
          {showingTypeSelector === property.id && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm animate-slide-in-top"
                 key="type-selector">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('Select Type')}</h4>
                <button
                  onClick={() => setShowingTypeSelector(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.types.map(type => (
                  <button
                    key={type}
                    onClick={(e) => handleTypeSelect(type, e)}
                    className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing type items */}
          {existingItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 animate-slide-in-top">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {item.name}
                </span>
                <button
                  onClick={(e) => handleRemoveWorkItem(item.id, e)}
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
                const hasDoors = property.fields.some(f => f.name === 'Doors');
                const hasWindows = property.fields.some(f => f.name === 'Windows');
                
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

              {/* Complementary works */}
              {property.complementaryWorks && (
                <div className="space-y-3 lg:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                    <button
                      onClick={(e) => toggleExpanded(item.id, e)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedItems[item.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>
                  
                  {expandedItems[item.id] && (
                    <div className="space-y-3 lg:space-y-2 animate-slide-in-top">
                      {property.complementaryWorks.map((work, index) => {
                        const uniqueKey = `${work}_${index}`;
                        return (
                          <div key={uniqueKey} className="flex items-center justify-between gap-3">
                            <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                            <button
                              onClick={(e) => handleToggleComplementaryWork(item.id, uniqueKey, e)}
                              className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                item.complementaryWorks[uniqueKey]
                                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {item.complementaryWorks[uniqueKey] && (
                                <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white dark:text-gray-900" />
                              )}
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
    }

    // Special handling for sanitary installation
    if (property.id === 'sanitary_installation') {
      return (
        <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Always show header with plus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{property.subtitle}</p>
              )}
            </div>
            <button
              onClick={(e) => handleAddWorkItem(property.id, e)}
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector when showing */}
          {showingSanitarySelector && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm animate-slide-in-top"
                 key="sanitary-selector">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('Type of Sanitary')}</h4>
                <button
                  onClick={() => setShowingSanitarySelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.types.map(type => (
                  <button
                    key={type}
                    onClick={(e) => handleSanitaryTypeSelect(type, e)}
                    className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing sanitary items */}
          {existingItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {t(item.selectedType)}
                </span>
                <button
                  onClick={(e) => handleRemoveWorkItem(item.id, e)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
                </button>
              </div>
              
              {/* Count and Price fields */}
              <div className="space-y-3 lg:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{t('Count')}</span>
                  <div className="flex items-center gap-2 justify-end w-full">
                    <NumberInput
                      value={item.fields['Count'] || 0}
                      onChange={(value) => handleUpdateWorkItem(item.id, 'Count', value)}
                      className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                      min={0}
                    />
                    <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">{t('pc')}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{t('Price')}</span>
                  <div className="flex items-center gap-2 justify-end w-full">
                    <NumberInput
                      value={item.fields['Price'] || 0}
                      onChange={(value) => handleUpdateWorkItem(item.id, 'Price', value)}
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
    
    // Regular property card for other properties
    return (
      <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
            )}
          </div>
          <button
            onClick={(e) => handleAddWorkItem(property.id, e)}
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Show existing work items for this property */}
        {existingItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
            <div className="flex items-center justify-between">
              {property.id === 'custom_work' ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {item.selectedType === 'Work' ? t('Názov práce') : t('Názov materiálu')}:
                  </span>
                  <input
                    type="text"
                    value={item.fields.Name || ''}
                    onChange={(e) => handleUpdateWorkItem(item.id, 'Name', e.target.value, true)}
                    className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded border-none focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm min-w-0"
                    placeholder={item.selectedType === 'Work' ? t('Názov práce') : t('Názov materiálu')}
                  />
                  {item.selectedUnit && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                      {item.selectedUnit}
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {t(property.name)} {t('no.')} {existingItems.indexOf(item) + 1}
                </span>
              )}
              <button
                onClick={(e) => handleRemoveWorkItem(item.id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
              </button>
            </div>

            {/* Property type selection */}
            {property.types && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.types.map(type => (
                  <button
                    key={type}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      saveScrollPosition();
                      
                      setWorkData(items =>
                        items.map(i => i.id === item.id ? { ...i, selectedType: type } : i)
                      );
                    }}
                    className={`p-3 lg:p-2 rounded-lg text-sm lg:text-sm transition-colors ${
                      item.selectedType === type
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            )}

            {/* Unit selector for custom work */}
            {property.id === 'custom_work' && property.hasUnitSelector && item.selectedType && (
              <div>
                {showingUnitSelector === item.id ? (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3 shadow-sm animate-slide-in-top">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900 dark:text-white">{t('Vyberte jednotku')}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowingUnitSelector(null);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {property.units?.map(unit => (
                        <button
                          key={unit}
                          onClick={(e) => handleUnitSelect(item.id, unit, e)}
                          className="p-2 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  item.selectedUnit ? (
                    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('Jednotka')}: {item.selectedUnit}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowingUnitSelector(item.id);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {t('Zmeniť')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowingUnitSelector(item.id);
                      }}
                      className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {t('Vyberte jednotku')}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Property fields */}
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
              const hasDoors = property.fields.some(f => f.name === 'Doors');
              const hasWindows = property.fields.some(f => f.name === 'Windows');
              
              if (hasDoors && hasWindows) {
                // Both doors and windows - stacked on mobile, side by side on desktop
                return (
                  <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3">
                    {renderDoorWindowSection(item, 'doors')}
                    {renderDoorWindowSection(item, 'windows')}
                  </div>
                );
              } else if (hasWindows) {
                // Only windows - full width on mobile, 50% width on desktop
                return (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                    {renderDoorWindowSection(item, 'windows')}
                    <div className="hidden lg:block"></div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Complementary works */}
            {property.complementaryWorks && (
              <div className="space-y-3 lg:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                  <button
                    onClick={(e) => toggleExpanded(item.id, e)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandedItems[item.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                  </button>
                </div>
                
                {expandedItems[item.id] && (
                  <div className="space-y-3 lg:space-y-2">
                    {property.complementaryWorks.map((work, index) => {
                      const uniqueKey = `${work}_${index}`;
                      return (
                        <div key={uniqueKey} className="flex items-center justify-between gap-3">
                          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                          <button
                            onClick={(e) => handleToggleComplementaryWork(item.id, uniqueKey, e)}
                            className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              item.complementaryWorks[uniqueKey]
                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {item.complementaryWorks[uniqueKey] && (
                              <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white dark:text-gray-900" />
                            )}
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

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <div className={`bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[95vh] lg:h-[90vh] flex flex-col ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{room.name}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area - Scrollable */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#9CA3AF #F3F4F6',
            }}
          >
          <div className="space-y-3 lg:space-y-2">
            {/* Work section */}
            <div className="flex items-center gap-3 pb-2">
              <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h3>
            </div>
            
            {/* Main properties - Single column on mobile, 3 columns on desktop */}
            <div className="space-y-3 lg:space-y-0 lg:flex lg:gap-2">
              <div className="lg:hidden space-y-3">
                {/* Mobile: Single column layout */}
                {mainProperties.map(property => (
                  <WorkPropertyCard key={property.id} property={property} />
                ))}
              </div>
              <div className="hidden lg:flex lg:gap-2 w-full">
                {/* Desktop: 3 column layout - custom distribution */}
                {Array.from({ length: 3 }, (_, colIndex) => {
                  let startIndex, endIndex;
                  if (colIndex === 0) {
                    // First column: exactly 8 items (positions 1-8)
                    startIndex = 0;
                    endIndex = 8;
                  } else if (colIndex === 1) {
                    // Second column: positions 9-18 (includes Maľovanie items)
                    startIndex = 8;
                    endIndex = Math.min(18, mainProperties.length);
                  } else {
                    // Third column: remaining items from position 19+
                    startIndex = 18;
                    endIndex = mainProperties.length;
                  }
                  
                  return (
                    <div key={colIndex} className="flex-1 space-y-2">
                      {mainProperties
                        .slice(startIndex, endIndex)
                        .map(property => (
                          <WorkPropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Others section */}
            {othersProperties.length > 0 && (
              <div className="space-y-3 lg:space-y-2">
                <div className="flex items-center gap-3 pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Others')}</h3>
                </div>
                <div className="space-y-3 lg:space-y-0 lg:flex lg:gap-2">
                  <div className="lg:hidden space-y-3">
                    {/* Mobile: Single column layout */}
                    {othersProperties.map(property => (
                      <WorkPropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                  <div className="hidden lg:flex lg:gap-2 w-full">
                    {/* Desktop: 3 column layout - even distribution for others */}
                    {Array.from({ length: 3 }, (_, colIndex) => {
                      const itemsPerColumn = Math.ceil(othersProperties.length / 3);
                      const startIndex = colIndex * itemsPerColumn;
                      const endIndex = Math.min(startIndex + itemsPerColumn, othersProperties.length);
                      
                      return (
                        <div key={colIndex} className="flex-1 space-y-2">
                          {othersProperties
                            .slice(startIndex, endIndex)
                            .map(property => (
                              <WorkPropertyCard key={property.id} property={property} />
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Price Summary Sidebar - Always visible and fixed */}
            {(() => {
              const roomWithWorkItems = { ...room, workItems: workData };
              const calculation = calculateRoomPriceWithMaterials(roomWithWorkItems, generalPriceList);
              const vatRate = generalPriceList?.others?.find(item => item.name === 'VAT')?.price / 100 || 0.23;
              const vatAmount = calculation.total * vatRate;
              const totalWithVat = calculation.total + vatAmount;

              return (
                <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col h-full">
                  <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Celková cenová ponuka')}</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar">
                    {workData.length > 0 ? (
                      <>
                        {/* Work Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('Práca')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.workTotal)}</span>
                          </div>
                          {calculation.items.length > 0 ? (
                            calculation.items.map(item => {
                              if (item.calculation?.workCost > 0) {
                                // Determine the correct unit based on work type
                                let unit = 'm²';
                                let quantity = item.calculation.quantity;
                                const values = item.fields;
                                
                                if (values.Duration || values.Trvanie) {
                                  unit = 'h';
                                  quantity = parseFloat(values.Duration || values.Trvanie || 0);
                                } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
                                  unit = 'ks';
                                  quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
                                } else if (values.Length && !values.Width && !values.Height) {
                                  unit = 'bm';
                                  quantity = parseFloat(values.Length || 0);
                                } else if (values.Circumference) {
                                  unit = 'bm';
                                  quantity = parseFloat(values.Circumference || 0);
                                } else if (values.Distance) {
                                  unit = 'km';
                                  quantity = parseFloat(values.Distance || 0);
                                }
                                
                                const workDescription = `${item.name}${item.selectedType ? `, ${item.selectedType}` : ''} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${unit}`;
                                return (
                                  <div key={`${item.id}-work`} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{workDescription}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{formatPrice(item.calculation.workCost)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              {t('Žiadne práce neboli pridané')}
                            </div>
                          )}
                        </div>

                        {/* Material Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('Materiál')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.materialTotal)}</span>
                          </div>
                          {calculation.items.some(item => item.calculation?.materialCost > 0) ? (
                            calculation.items.map(item => {
                              if (item.calculation?.materialCost > 0 && item.calculation?.material) {
                                const materialDescription = `${item.calculation.material.name}${item.calculation.material.subtitle ? `, ${item.calculation.material.subtitle}` : ''}`;
                                const quantity = item.calculation.material.capacity 
                                  ? Math.ceil(item.calculation.quantity / item.calculation.material.capacity.value)
                                  : item.calculation.quantity;
                                const unit = item.calculation.material.capacity?.unit || item.calculation.material.unit?.replace('€/', '');
                                
                                return (
                                  <div key={`${item.id}-material`} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{materialDescription} - {quantity.toFixed(0)}{unit}</span>
                                    <span className="text-gray-600 dark:text-gray-400">{formatPrice(item.calculation.materialCost)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              {t('Žiadne materiály neboli identifikované')}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <p className="text-base font-medium">{t('Žiadne práce')}</p>
                          <p className="text-sm mt-1">{t('Pridajte práce pre zobrazenie cenového súhrnu')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Totals - Fixed at bottom */}
                  <div className="p-4 lg:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t('bez DPH')}</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatPrice(calculation.total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{t('DPH')}</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatPrice(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">{t('Celková cena')}</span>
                      <span className="text-gray-900 dark:text-white">{formatPrice(totalWithVat)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>

        </div>
      </div>
    </>
  );
};

export default RoomDetailsModal;