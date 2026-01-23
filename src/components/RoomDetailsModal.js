import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { X, Hammer, Menu, Loader2, Check } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import WorkPropertyCard from './WorkPropertyCard';
import RoomPriceSummary from './RoomPriceSummary';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';

// Helper to generate UUID for new work items (prevents duplicate inserts on autosave)
const generateWorkItemId = () => crypto.randomUUID();

const RoomDetailsModal = ({ room, workProperties, onSave, onClose, priceList }) => {
  useScrollLock(true);
  const { t } = useLanguage();
  useAppData(); // No destructuring needed here
  const [workData, setWorkData] = useState(room.workItems || []);
  const [expandedItems, setExpandedItems] = useState({});
  const [showingSanitarySelector, setShowingSanitarySelector] = useState(false);
  const [showingRentalsSelector, setShowingRentalsSelector] = useState(false);
  const [showingTypeSelector, setShowingTypeSelector] = useState(null);
  const [newlyAddedItems, setNewlyAddedItems] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'modified'
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Store initial data for comparison and tracking saves
  const lastSavedData = useRef(JSON.stringify(room.workItems || []));
  const onSaveRef = useRef(onSave);
  const isUnmounting = useRef(false);
  const saveTimerRef = useRef(null);

  // Store original work items for delta save optimization
  // This is the state as loaded from the database when modal opened
  const originalWorkItems = useRef(JSON.parse(JSON.stringify(room.workItems || [])));

  // Update ref when prop changes
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Save scroll position before any state change
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      shouldRestoreScroll.current = true;
    }
  };

  // Track if we should restore scroll (only for structural changes, not field updates)
  const shouldRestoreScroll = useRef(false);

  // Restore scroll position after render (only when needed)
  useLayoutEffect(() => {
    if (shouldRestoreScroll.current && scrollContainerRef.current && scrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
      shouldRestoreScroll.current = false;
    }
  });

  // Clean up newly added items immediately after first render to prevent re-animation
  useEffect(() => {
    if (newlyAddedItems.size > 0) {
      // Use requestAnimationFrame to clear after the DOM has been painted with the animation class
      requestAnimationFrame(() => {
        setNewlyAddedItems(new Set());
      });
    }
  }, [newlyAddedItems]);

  // Sync workData when room.workItems changes (e.g., after loading from database)
  useEffect(() => {
    // Only sync if room.workItems has items and our local state doesn't match
    // Use functional update to avoid needing workData in dependency array
    if (room.workItems && room.workItems.length > 0) {
      const roomItemIds = room.workItems.map(i => i.id).sort().join(',');

      setWorkData(currentWorkData => {
        const currentIds = currentWorkData.map(i => i.id).sort().join(',');
        if (roomItemIds !== currentIds) {
          // Room data was updated externally (e.g., loaded from database)
          lastSavedData.current = JSON.stringify(room.workItems);
          // Also update original items baseline for delta saves
          originalWorkItems.current = JSON.parse(JSON.stringify(room.workItems));
          return room.workItems;
        }
        return currentWorkData;
      });
    }
  }, [room.workItems]);

  // Autosave Logic with proper debouncing
  useEffect(() => {
    if (isUnmounting.current) return;

    const currentDataString = JSON.stringify(workData);
    if (currentDataString !== lastSavedData.current) {
      setSaveStatus('modified');

      // Clear any existing timer before setting a new one
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        if (isUnmounting.current) return;

        setSaveStatus('saving');
        // Pass both current data and original data for delta save optimization
        onSaveRef.current(workData, originalWorkItems.current);
        lastSavedData.current = currentDataString;
        // Update original after successful save so next save compares against this state
        originalWorkItems.current = JSON.parse(currentDataString);
        saveTimerRef.current = null;

        // Short delay to show "Saving" state before switching to "Saved"
        setTimeout(() => {
          if (!isUnmounting.current) setSaveStatus('saved');
        }, 800);
      }, 1500); // 1.5 second debounce for more buffer while typing
    }

    // Cleanup on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [workData]);

  const handleClose = async () => {
    // If pending changes, save immediately before closing
    if (saveStatus === 'modified') {
      try {
        // Pass both current data and original data for delta save optimization
        await onSaveRef.current(workData, originalWorkItems.current);
      } catch (error) {
        console.error('Auto-save failed on close:', error);
      }
    }
    isUnmounting.current = true;
    onClose();
  };

  // Separate "Others" category properties
  const othersIds = [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK, WORK_ITEM_PROPERTY_IDS.COMMUTE, WORK_ITEM_PROPERTY_IDS.RENTALS];

  const mainProperties = workProperties.filter(prop => !othersIds.includes(prop.id) && !prop.hidden);

  // Construct others list with split Custom Work/Material
  const othersPropertiesSource = workProperties.filter(prop => othersIds.includes(prop.id) && !prop.hidden);
  const othersProperties = [];

  othersPropertiesSource.forEach(prop => {
    if (prop.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
      // Add "Custom Work" virtual property
      othersProperties.push({
        ...prop,
        id: WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK, // Real ID
        name: 'Custom work', // Override name for display if needed, translation handles 'Custom work'
        virtualType: 'Work' // Flag for UI logic
      });
      // Add "Custom Material" virtual property
      othersProperties.push({
        ...prop,
        id: 'custom_work_material_only', // Virtual ID for adding
        name: 'Custom material', // Distinct name
        virtualType: 'Material'
      });
    } else {
      othersProperties.push(prop);
    }
  });

  const handleAddWorkItem = (propertyId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    // Ensure the group is expanded when adding an item
    setExpandedItems(prev => ({ ...prev, [propertyId]: true }));

    if (propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
      setShowingSanitarySelector(true);
      return;
    }

    if (propertyId === WORK_ITEM_PROPERTY_IDS.RENTALS) {
      setShowingRentalsSelector(true);
      return;
    }

    const property = workProperties.find(p => p.id === propertyId);

    // For custom_work, create item directly - user will select type from inline buttons
    if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK || propertyId === 'custom_work_material_only') {
      const isMaterial = propertyId === 'custom_work_material_only';
      const actualPropertyId = WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK; // Always save as custom_work in DB
      const property = workProperties.find(p => p.id === actualPropertyId);

      const newItem = {
        id: generateWorkItemId(),
        propertyId: actualPropertyId,
        // Store English keys - display code will translate
        name: property.name,
        subtitle: property.subtitle,
        fields: {},
        complementaryWorks: {},
        selectedType: isMaterial ? 'Material' : 'Work',
        selectedUnit: null,
        doorWindowItems: { doors: [], windows: [] }
      };
      // Add new custom work items at the TOP of the list
      setWorkData([newItem, ...workData]);
      setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
      // Expand both the new item (if it has sub-content) AND the property card itself
      setExpandedItems(prev => ({
        ...prev,
        [newItem.id]: true,
        [propertyId]: true // Ensure the card (Custom Work or Custom Material) is open
      }));
      return;
    }

    // Check if this property has types (like Simple/Double/Triple)
    if (property?.types && property.id !== WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
      setShowingTypeSelector(propertyId);
      return;
    }
    const newItem = {
      id: generateWorkItemId(),
      propertyId,
      // Store English keys - display code will translate
      name: property.name,
      subtitle: property.subtitle,
      fields: {},
      complementaryWorks: {},
      selectedType: property.types ? property.types[0] : null,
      doorWindowItems: { doors: [], windows: [] }
    };
    setWorkData([newItem, ...workData]);
    setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
    setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const handleSanitaryTypeSelect = (sanitaryType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    // Price defaults to 0 - user will enter the actual product price
    // The work price comes from the price list separately
    const defaultPrice = 0;

    const newItem = {
      id: generateWorkItemId(),
      propertyId: WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION,
      name: WORK_ITEM_NAMES.SANITARY_INSTALLATIONS,
      subtitle: sanitaryType,
      fields: {
        [WORK_ITEM_NAMES.COUNT]: 0,
        [WORK_ITEM_NAMES.PRICE]: defaultPrice
      },
      complementaryWorks: {},
      selectedType: sanitaryType
    };
    setWorkData([newItem, ...workData]);
    setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
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
      id: generateWorkItemId(),
      propertyId: property.id,
      // Store just the base name - display code will build full name with subtitle and type
      name: property.name,
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

    setWorkData([newItem, ...workData]);
    setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
    setShowingTypeSelector(null);
    setExpandedItems(prev => ({ ...prev, [property.id]: true }));
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
  };

  const handleRentalTypeSelect = (rentalType, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    const rentalItem = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.RENTALS)?.items?.find(item => item.name === rentalType);
    if (!rentalItem) return;

    // Map rental type to specific propertyId for correct table mapping
    let specificPropertyId = WORK_ITEM_PROPERTY_IDS.RENTALS;
    if (rentalType === WORK_ITEM_NAMES.CORE_DRILL) {
      specificPropertyId = 'core_drill';
    } else if (rentalType === WORK_ITEM_NAMES.TOOL_RENTAL) {
      specificPropertyId = 'tool_rental';
    } else if (rentalType === WORK_ITEM_NAMES.SCAFFOLDING_EN || rentalType === 'Lešenie') {
      specificPropertyId = 'scaffolding';
    }

    const newItem = {
      id: generateWorkItemId(),
      propertyId: specificPropertyId,
      name: rentalType,
      subtitle: 'no. 1',
      fields: {},
      complementaryWorks: {},
      selectedType: rentalType,
      rentalFields: rentalItem.fields
    };

    // Initialize fields
    rentalItem.fields.forEach(field => {
      newItem.fields[field.name] = 0;
    });

    setWorkData([newItem, ...workData]);
    setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
    setShowingRentalsSelector(false);
    setExpandedItems(prev => ({ ...prev, [WORK_ITEM_PROPERTY_IDS.RENTALS]: true }));
  };

  const handleUpdateWorkItem = (itemId, field, value, isText = false) => {
    // Handle both text and numeric inputs
    const processedValue = isText ? value || '' : value || 0;

    setWorkData(items =>
      items.map(item => {
        // Update the target item
        if (item.id === itemId) {
          return { ...item, fields: { ...item.fields, [field]: processedValue } };
        }

        return item;
      })
    );
  };

  // Helper for generic item updates (top level props)
  const handleUpdateItemState = (itemId, updates) => {
    saveScrollPosition();
    setWorkData(items => items.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleAddDoorWindow = (itemId, type, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    const newId = generateWorkItemId();
    const newDoorWindow = {
      id: newId,
      c_id: newId, // Ensure c_id is set for database sync
      width: 0,
      height: 0
    };

    setWorkData(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            doorWindowItems: {
              ...item.doorWindowItems,
              [type]: [
                ...(item.doorWindowItems?.[type] || []),
                newDoorWindow
              ]
            }
          };
        }

        return item;
      })
    );
  };

  const handleUpdateDoorWindow = (itemId, type, subItemId, field, value) => {
    // NumberInput component already handles validation and returns a numeric value
    const processedValue = value || 0;

    setWorkData(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            doorWindowItems: {
              ...item.doorWindowItems,
              [type]: item.doorWindowItems?.[type]?.map(subItem =>
                subItem.id === subItemId
                  ? { ...subItem, [field]: processedValue }
                  : subItem
              ) || []
            }
          };
        }

        return item;
      })
    );
  };

  const handleRemoveDoorWindow = (itemId, type, subItemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setWorkData(items =>
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            doorWindowItems: {
              ...item.doorWindowItems,
              [type]: item.doorWindowItems?.[type]?.filter(subItem => subItem.id !== subItemId) || []
            }
          };
        }

        return item;
      })
    );
  };

  const handleCopyDoorWindow = (itemId, type, subItemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const newId = generateWorkItemId();

    setWorkData(items =>
      items.map(item => {
        if (item.id === itemId) {
          const copiedItem = item.doorWindowItems[type].find(subItem => subItem.id === subItemId);
          return {
            ...item,
            doorWindowItems: {
              ...item.doorWindowItems,
              [type]: [
                ...(item.doorWindowItems?.[type] || []),
                {
                  ...copiedItem,
                  id: newId
                }
              ]
            }
          };
        }

        return item;
      })
    );
  };

  const handleToggleAllComplementaryWorks = (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    const parentItem = workData.find(item => item.id === itemId);
    if (!parentItem) return;

    const parentProperty = workProperties.find(p => p.id === parentItem.propertyId);
    if (!parentProperty?.complementaryWorks) return;

    // Check if parent work type supports double (both sides) complementary works
    // Only Brick Partitions and Brick Load-bearing Wall support values up to 2
    const maxValue = parentProperty?.supportsDoubleComplementary ? 2 : 1;

    // Get the maximum value across all complementary works flags
    // Use occurrence-based indexing (count of same work type before this index)
    const values = parentProperty.complementaryWorks.map((work, index) => {
      const occurrenceIndex = parentProperty.complementaryWorks.slice(0, index).filter(w => w === work).length;
      const uniqueKey = `${work}_${occurrenceIndex}`;
      return parentItem.complementaryWorks?.[uniqueKey] || 0;
    });

    const maxCurrentValue = Math.max(...values);

    // Cycle through states: 0 -> 1 -> 2 (if supported) -> 0
    // Next state is based on the highest current value
    let newValue;
    if (maxCurrentValue === 0) {
      newValue = 1; // All off -> all single layer
    } else if (maxCurrentValue === 1 && maxValue === 2) {
      newValue = 2; // All single -> all double (if supported)
    } else {
      newValue = 0; // All double (or single if max=1) -> all off
    }

    // Update all complementary work flags on the parent item
    const newComplementaryWorks = {};
    parentProperty.complementaryWorks.forEach((work, index) => {
      const occurrenceIndex = parentProperty.complementaryWorks.slice(0, index).filter(w => w === work).length;
      const uniqueKey = `${work}_${occurrenceIndex}`;
      newComplementaryWorks[uniqueKey] = newValue;
    });

    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
            ...item,
            complementaryWorks: {
              ...item.complementaryWorks,
              ...newComplementaryWorks
            }
          }
          : item
      )
    );
  };

  const handleToggleComplementaryWork = (itemId, workKey, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    saveScrollPosition();

    // Find the parent item
    const parentItem = workData.find(item => item.id === itemId);
    if (!parentItem) return;

    // Get current flag value (0, 1, or 2)
    const currentValue = parentItem.complementaryWorks?.[workKey] || 0;

    // Check if parent work type supports double (both sides) complementary works
    // Only Brick Partitions and Brick Load-bearing Wall support values up to 2
    const parentProperty = workProperties.find(p => p.id === parentItem.propertyId);
    const maxValue = parentProperty?.supportsDoubleComplementary ? 2 : 1;

    // Toggle: 0 → 1 → 2 → 0 (for brick) or 0 → 1 → 0 (for others)
    const newValue = currentValue >= maxValue ? 0 : currentValue + 1;

    // Update only the flag on the parent item - no linked items created
    setWorkData(items =>
      items.map(item =>
        item.id === itemId
          ? {
            ...item,
            complementaryWorks: {
              ...item.complementaryWorks,
              [workKey]: newValue
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

    // Check if we are removing the last item of a group, if so, collapse the group
    const itemToRemove = workData.find(i => i.id === itemId);
    if (itemToRemove) {
      const propId = itemToRemove.propertyId;
      const itemsOfThisProp = workData.filter(i => i.propertyId === propId);
      // If this is the last item (or somehow we have 0), collapse the group
      if (itemsOfThisProp.length <= 1) {
        setExpandedItems(prev => ({ ...prev, [propId]: false }));
      }
    }

    // Remove the item (no linked items to worry about - we only use flags now)
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

  const handleCloseSelector = () => {
    setShowingSanitarySelector(false);
    setShowingRentalsSelector(false);
    setShowingTypeSelector(null);
  };

  // Helper to render work property cards with props passed down
  const renderWorkPropertyCard = (property) => (
    <WorkPropertyCard
      key={property.id}
      property={property}
      workData={workData}
      expandedItems={expandedItems}
      newlyAddedItems={newlyAddedItems}
      showingRentalsSelector={showingRentalsSelector}
      showingSanitarySelector={showingSanitarySelector}
      showingTypeSelector={showingTypeSelector}
      onAddWorkItem={handleAddWorkItem}
      onRemoveWorkItem={handleRemoveWorkItem}
      onToggleExpanded={toggleExpanded}
      onRentalTypeSelect={handleRentalTypeSelect}
      onSanitaryTypeSelect={handleSanitaryTypeSelect}
      onTypeSelect={handleTypeSelect}
      onUpdateWorkItem={handleUpdateWorkItem}
      onUpdateItemState={handleUpdateItemState}
      onUnitSelect={handleUnitSelect}
      onAddDoorWindow={handleAddDoorWindow}
      onUpdateDoorWindow={handleUpdateDoorWindow}
      onRemoveDoorWindow={handleRemoveDoorWindow}
      onCopyDoorWindow={handleCopyDoorWindow}
      onToggleAllComplementaryWorks={handleToggleAllComplementaryWorks}
      onToggleComplementaryWork={handleToggleComplementaryWork}
      onCloseSelector={handleCloseSelector}
    />
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-2 lg:p-4 animate-fade-in"
        onClick={handleClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-[95vw] h-[100dvh] sm:h-[75dvh] lg:h-[85dvh] max-h-[100dvh] sm:max-h-[calc(100dvh-6rem)] flex flex-col animate-slide-in-bottom sm:animate-slide-in my-0 sm:my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t(room.name) !== room.name ? t(room.name) : room.name}</h2>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${saveStatus === 'saved'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : saveStatus === 'saving'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                  }`}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Loader2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {saveStatus === 'saved' ? t('Saved') : saveStatus === 'saving' ? t('Saving...') : t('Saving...')}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-6 lg:space-y-8 overscroll-y-contain"
            >
              {/* Work Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 lg:p-6 pb-20 sm:pb-6">
                <div className="flex items-center gap-3 pb-2">
                  <Hammer className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">{t('Work')}</h3>
                </div>

                {/* Main properties - Single column on mobile, 3 columns on desktop */}
                <div className="space-y-3 lg:space-y-0 lg:flex lg:gap-2">
                  <div className="lg:hidden space-y-3">
                    {/* Mobile: Single column layout */}
                    {mainProperties.map(renderWorkPropertyCard)}
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
                            .map(renderWorkPropertyCard)}
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
                        {othersProperties.map(renderWorkPropertyCard)}
                      </div>
                      <div className="hidden lg:flex lg:gap-2 w-full">
                        {/* Desktop: 3 column layout - Custom distribution for Others */}
                        <div className="flex-1 space-y-2">
                          {/* Col 1: Custom Work */}
                          {othersProperties
                            .filter(p => p.virtualType === 'Work' || p.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK)
                            .map(renderWorkPropertyCard)}
                        </div>
                        <div className="flex-1 space-y-2">
                          {/* Col 2: Custom Material */}
                          {othersProperties
                            .filter(p => p.id === 'custom_work_material_only' || p.virtualType === 'Material')
                            .map(renderWorkPropertyCard)}
                        </div>
                        <div className="flex-1 space-y-2">
                          {/* Col 3: The rest (Commute, Rentals) */}
                          {othersProperties
                            .filter(p => p.id !== WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && p.id !== 'custom_work_material_only')
                            .map(renderWorkPropertyCard)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Summary - Mobile inline version */}
                <div className="lg:hidden mt-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                    <RoomPriceSummary room={room} workData={workData} priceList={priceList} />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary Sidebar - Desktop only */}
            <div className="hidden lg:flex lg:w-64 xl:w-72 2xl:w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-col h-full">
              <RoomPriceSummary room={room} workData={workData} priceList={priceList} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomDetailsModal;