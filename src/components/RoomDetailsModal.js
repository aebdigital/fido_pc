import React, { useState, useRef, useLayoutEffect } from 'react';
import { X, Plus, Trash2, Check, Menu, Copy, Hammer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NumberInput from './NumberInput';

const RoomDetailsModal = ({ room, workProperties, onSave, onClose }) => {
  const { t } = useLanguage();
  const [workData, setWorkData] = useState(room.workItems || []);
  const [expandedItems, setExpandedItems] = useState({});
  const [showingSanitarySelector, setShowingSanitarySelector] = useState(false);
  const [showingRentalsSelector, setShowingRentalsSelector] = useState(false);
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
      onClose();
    }, 300);
  };
  const mainProperties = workProperties.filter(prop => !othersIds.includes(prop.id));
  const othersProperties = workProperties.filter(prop => othersIds.includes(prop.id));

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
    
    const property = workProperties.find(p => p.id === propertyId);
    const newItem = {
      id: Date.now(),
      propertyId,
      name: property.name,
      subtitle: property.subtitle,
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

  const handleUpdateWorkItem = (itemId, field, value) => {
    // NumberInput component already handles validation and returns a numeric value
    const processedValue = value || 0;
    
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
          <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{typeName}</span>
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
                <div className="flex items-center gap-2 sm:justify-end">
                  <NumberInput
                    value={subItem.width}
                    onChange={(value) => handleUpdateDoorWindow(item.id, type, subItem.id, 'width', value)}
                    size="small"
                    className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    min={0}
                  />
                  <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400">m</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-base lg:text-xs text-gray-600 dark:text-gray-400 sm:w-12 sm:flex-shrink-0">{t('Height')}</span>
                <div className="flex items-center gap-2 sm:justify-end">
                  <NumberInput
                    value={subItem.height}
                    onChange={(value) => handleUpdateDoorWindow(item.id, type, subItem.id, 'height', value)}
                    size="small"
                    className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
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
    const value = item.fields[field.name] || 0;
    
    // Skip doors and windows fields as they're rendered separately
    if (field.name === 'Doors' || field.name === 'Windows') {
      return null;
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{field.name}</span>
        <div className="flex items-center gap-2 sm:justify-end">
          <NumberInput
            value={value}
            onChange={(value) => handleUpdateWorkItem(item.id, field.name, value)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
            min={0}
          />
          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">{field.unit}</span>
        </div>
      </div>
    );
  };

  const WorkPropertyCard = ({ property }) => {
    const existingItems = workData.filter(item => item.propertyId === property.id);
    
    // Special handling for rentals
    if (property.id === 'rentals') {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Always show header with plus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{property.name}</h4>
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
                    className="p-3 lg:p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing rental items */}
          {existingItems.map((item, index) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {item.name} {t('no.')} {index + 1}
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
                      <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{field.name}</span>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <NumberInput
                          value={item.fields[field.name] || 0}
                          onChange={(value) => handleUpdateWorkItem(item.id, field.name, value)}
                          className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          min={0}
                        />
                        <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">{field.unit}</span>
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
    
    // Special handling for sanitary installation
    if (property.id === 'sanitary_installation') {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm">
          {/* Always show header with plus button */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{property.name}</h4>
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
                    className="p-3 lg:p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    {type}
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
                  {item.selectedType}
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
                  <div className="flex items-center gap-2 sm:justify-end">
                    <NumberInput
                      value={item.fields['Count'] || 0}
                      onChange={(value) => handleUpdateWorkItem(item.id, 'Count', value)}
                      className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      min={0}
                    />
                    <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">pc</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 sm:w-32 sm:flex-shrink-0">{t('Price')}</span>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <NumberInput
                      value={item.fields['Price'] || 0}
                      onChange={(value) => handleUpdateWorkItem(item.id, 'Price', value)}
                      className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      min={0}
                    />
                    <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 w-12 flex-shrink-0">€/pc</span>
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
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2">
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
              <span className="font-medium text-gray-900 dark:text-white text-lg">
                {property.name} {t('no.')} {existingItems.indexOf(item) + 1}
              </span>
              <button
                onClick={(e) => handleRemoveWorkItem(item.id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors"
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
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
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
                          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{work}</span>
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
        <div className={`bg-white dark:bg-gray-900 rounded-2xl w-full max-w-7xl h-[95vh] lg:h-[90vh] flex flex-col ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
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
                {/* Desktop: 3 column layout */}
                {Array.from({ length: 3 }, (_, colIndex) => (
                  <div key={colIndex} className="flex-1 space-y-2">
                    {mainProperties
                      .filter((_, index) => index % 3 === colIndex)
                      .map(property => (
                        <WorkPropertyCard key={property.id} property={property} />
                      ))}
                  </div>
                ))}
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
                    {/* Desktop: 3 column layout */}
                    {Array.from({ length: 3 }, (_, colIndex) => (
                      <div key={colIndex} className="flex-1 space-y-2">
                        {othersProperties
                          .filter((_, index) => index % 3 === colIndex)
                          .map(property => (
                            <WorkPropertyCard key={property.id} property={property} />
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleClose}
            className="px-6 lg:px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm hover:shadow-md text-lg"
          >
            {t('Cancel')}
          </button>
          <button
            onClick={() => onSave(workData)}
            className="px-6 lg:px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm hover:shadow-md text-lg"
          >
            {t('Save')}
          </button>
        </div>
        </div>
      </div>
    </>
  );
};

export default RoomDetailsModal;