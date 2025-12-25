import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { X, Hammer, Menu, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import WorkPropertyCard from './WorkPropertyCard';
import RoomPriceSummary from './RoomPriceSummary';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';

const RoomDetailsModal = ({ room, workProperties, onSave, onClose, priceList }) => {
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
    // Check by comparing the IDs in both arrays
    const roomItemIds = (room.workItems || []).map(i => i.id).sort().join(',');
    const workDataIds = workData.map(i => i.id).sort().join(',');

    if (roomItemIds !== workDataIds && room.workItems && room.workItems.length > 0) {
      // Room data was updated externally (e.g., loaded from database)
      setWorkData(room.workItems);
      lastSavedData.current = JSON.stringify(room.workItems);
    }
  }, [room.workItems]);

  // Autosave Logic
  useEffect(() => {
    if (isUnmounting.current) return;

    const currentDataString = JSON.stringify(workData);
    if (currentDataString !== lastSavedData.current) {
      setSaveStatus('modified');
      
      const timer = setTimeout(() => {
        if (isUnmounting.current) return;
        
        setSaveStatus('saving');
        onSaveRef.current(workData);
        lastSavedData.current = currentDataString;
        
        // Short delay to show "Saving" state before switching to "Saved"
        setTimeout(() => {
          if (!isUnmounting.current) setSaveStatus('saved');
        }, 800);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
    }
  }, [workData]);

  const handleClose = () => {
    // If pending changes, save immediately before closing
    if (saveStatus === 'modified') {
       onSaveRef.current(workData);
    }
    isUnmounting.current = true;
    onClose();
  };

  // Separate "Others" category properties
  const othersIds = [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK, WORK_ITEM_PROPERTY_IDS.COMMUTE, WORK_ITEM_PROPERTY_IDS.RENTALS];

  const mainProperties = workProperties.filter(prop => !othersIds.includes(prop.id) && !prop.hidden);
  const othersProperties = workProperties.filter(prop => othersIds.includes(prop.id) && !prop.hidden);

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
    if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
      const newItem = {
        id: Date.now(),
        propertyId,
        // Store English keys - display code will translate
        name: property.name,
        subtitle: property.subtitle,
        fields: {},
        complementaryWorks: {},
        selectedType: null,
        selectedUnit: null,
        doorWindowItems: { doors: [], windows: [] }
      };
      setWorkData([...workData, newItem]);
      setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
      setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
      return;
    }

    // Check if this property has types (like Simple/Double/Triple)
    if (property?.types && property.id !== WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
      setShowingTypeSelector(propertyId);
      return;
    }
    const newItem = {
      id: Date.now(),
      propertyId,
      // Store English keys - display code will translate
      name: property.name,
      subtitle: property.subtitle,
      fields: {},
      complementaryWorks: {},
      selectedType: property.types ? property.types[0] : null,
      doorWindowItems: { doors: [], windows: [] }
    };
    setWorkData([...workData, newItem]);
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
      id: Date.now(),
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
    setWorkData([...workData, newItem]);
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
      id: Date.now(),
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
    
    setWorkData([...workData, newItem]);
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

    let specificPropertyId = WORK_ITEM_PROPERTY_IDS.RENTALS;
    
    const newItem = {
      id: Date.now(),
      propertyId: specificPropertyId,
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

        // Also update linked complementary work items if this is a dimension field
        if (item.linkedToParent === itemId &&
            (field === WORK_ITEM_NAMES.WIDTH || field === WORK_ITEM_NAMES.HEIGHT || field === WORK_ITEM_NAMES.LENGTH)) {
          // Only update if the complementary item has this field
          const complementaryProperty = workProperties.find(p => p.id === item.propertyId);
          const hasField = complementaryProperty?.fields?.some(f => f.name === field);

          if (hasField) {
            return { ...item, fields: { ...item.fields, [field]: processedValue } };
          }
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

    const newDoorWindow = {
      id: Date.now(),
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

        // Also add to linked complementary items
        if (item.linkedToParent === itemId) {
          return {
            ...item,
            doorWindowItems: {
              ...item.doorWindowItems,
              [type]: [
                ...(item.doorWindowItems?.[type] || []),
                { ...newDoorWindow }
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

        // Also update linked complementary items
        if (item.linkedToParent === itemId) {
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

        // Also remove from linked complementary items
        if (item.linkedToParent === itemId) {
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

    const newId = Date.now();

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

        // Also copy to linked complementary items
        if (item.linkedToParent === itemId) {
          const parentItem = items.find(i => i.id === itemId);
          const copiedItem = parentItem?.doorWindowItems?.[type]?.find(subItem => subItem.id === subItemId);
          if (copiedItem) {
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

    // Get the minimum count across all complementary works
    const counts = parentProperty.complementaryWorks.map((work, index) => {
      const uniqueKey = `${work}_${index}`;
      const count = workData.filter(item =>
        item.linkedToParent === itemId && item.linkedWorkKey === uniqueKey
      ).length;
      return count;
    });

    const minCount = Math.min(...counts);

    // If all are at 2 or higher, remove all and reset to 0
    if (minCount >= 2) {
      setWorkData(items =>
        items.filter(item => item.linkedToParent !== itemId).map(item =>
          item.id === itemId
            ? {
                ...item,
                complementaryWorks: Object.fromEntries(
                  parentProperty.complementaryWorks.map((work, index) => [
                    `${work}_${index}`,
                    0
                  ])
                )
              }
            : item
        )
      );
      return;
    }

    // Otherwise, increment all to the next level (all go to minCount + 1)
    parentProperty.complementaryWorks.forEach((work, index) => {
      const uniqueKey = `${work}_${index}`;
      const currentCount = workData.filter(item =>
        item.linkedToParent === itemId && item.linkedWorkKey === uniqueKey
      ).length;

      // If this work is at the minimum count, increment it
      if (currentCount === minCount) {
        handleToggleComplementaryWork(itemId, uniqueKey, null);
      }
    });
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

    // Extract work name from key (e.g., "Plastering_0" -> "Plastering")
    const workName = workKey.replace(/_\d+$/, '');

    // Count current instances
    const currentCount = workData.filter(item =>
      item.linkedToParent === itemId && item.linkedWorkKey === workKey
    ).length;

    // If count >= 2, remove all and reset to 0
    if (currentCount >= 2) {
      setWorkData(items =>
        items.filter(item =>
          !(item.linkedToParent === itemId && item.linkedWorkKey === workKey)
        ).map(item =>
          item.id === itemId
            ? {
                ...item,
                complementaryWorks: {
                  ...item.complementaryWorks,
                  [workKey]: 0
                }
              }
            : item
        )
      );
      return;
    }

    // Otherwise, create a new item and increment count
    {
      // Checking: Create a new complementary work item
      const parentProperty = workProperties.find(p => p.id === parentItem.propertyId);

      // Find matching complementary work property
      let complementaryProperty = null;

      // Determine which variant to use based on parent's field structure
      const hasHeightField = parentProperty?.fields?.some(f => f.name === WORK_ITEM_NAMES.HEIGHT);
      const hasLengthField = parentProperty?.fields?.some(f => f.name === WORK_ITEM_NAMES.LENGTH);

      // Check if parent is a partition or offset wall (these are walls even though they don't have HEIGHT field)
      const isPartitionOrOffsetWall = parentProperty?.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION ||
                                       parentProperty?.id === WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET;

      // Wall type: has HEIGHT field OR is a partition/offset wall
      const isWallType = hasHeightField || isPartitionOrOffsetWall;

      if (workName === WORK_ITEM_NAMES.PLASTERING) {
        complementaryProperty = workProperties.find(p =>
          isWallType ? p.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.PAINTING) {
        complementaryProperty = workProperties.find(p =>
          isWallType ? p.id === WORK_ITEM_PROPERTY_IDS.PAINTING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.NETTING) {
        complementaryProperty = workProperties.find(p =>
          isWallType ? p.id === WORK_ITEM_PROPERTY_IDS.NETTING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.PENETRATION_COATING) {
        complementaryProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING);
      } else if (workName === WORK_ITEM_NAMES.TILING_UNDER_60CM) {
        complementaryProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60);
      }

      if (!complementaryProperty) {
        return;
      }

      // Create new complementary work item with copied dimensions
      const newItem = {
        id: Date.now(),
        propertyId: complementaryProperty.id,
        // Store English keys - display code will translate
        name: complementaryProperty.name,
        subtitle: complementaryProperty.subtitle,
        fields: {},
        complementaryWorks: {},
        selectedType: complementaryProperty.types ? complementaryProperty.types[0] : null,
        doorWindowItems: { doors: [], windows: [] },
        linkedToParent: itemId, // Track which item this is linked to
        linkedWorkKey: workKey // Track the specific work key
      };

      // Copy dimensions from parent to complementary item
      if (parentItem.fields) {
        // Copy Width
        if (parentItem.fields[WORK_ITEM_NAMES.WIDTH] !== undefined) {
          newItem.fields[WORK_ITEM_NAMES.WIDTH] = parentItem.fields[WORK_ITEM_NAMES.WIDTH];
        } else if (parentItem.fields.Šírka !== undefined) {
          newItem.fields[WORK_ITEM_NAMES.WIDTH] = parentItem.fields.Šírka;
        }

        // Copy Height or Length depending on complementary work type
        if (hasHeightField && (parentItem.fields[WORK_ITEM_NAMES.HEIGHT] !== undefined || parentItem.fields.Výška !== undefined)) {
          newItem.fields[WORK_ITEM_NAMES.HEIGHT] = parentItem.fields[WORK_ITEM_NAMES.HEIGHT] || parentItem.fields.Výška;
        } else if (hasLengthField && (parentItem.fields[WORK_ITEM_NAMES.LENGTH] !== undefined || parentItem.fields.Dĺžka !== undefined)) {
          newItem.fields[WORK_ITEM_NAMES.LENGTH] = parentItem.fields[WORK_ITEM_NAMES.LENGTH] || parentItem.fields.Dĺžka;
        }

        // Copy doors and windows if present
        if (parentItem.doorWindowItems) {
          newItem.doorWindowItems = {
            doors: [...(parentItem.doorWindowItems.doors || [])],
            windows: [...(parentItem.doorWindowItems.windows || [])]
          };
        }
      }

      // Update state: increment count and add new item
      const newCount = currentCount + 1;
      setWorkData(items => [
        ...items.map(item =>
          item.id === itemId
            ? {
                ...item,
                complementaryWorks: {
                  ...item.complementaryWorks,
                  [workKey]: newCount
                }
              }
            : item
        ),
        newItem
      ]);
    }
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

    // When removing an item, also remove all complementary work items linked to it
    setWorkData(items => items.filter(item =>
      item.id !== itemId && item.linkedToParent !== itemId
    ));
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 animate-fade-in"
        onClick={handleClose}
      >
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[85vh] lg:h-[90vh] max-h-[calc(100vh-2rem)] flex flex-col animate-slide-in"
          onClick={(e) => e.stopPropagation()}
        >        
          {/* Header */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t(room.name) !== room.name ? t(room.name) : room.name}</h2>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  saveStatus === 'saved'
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
                        {/* Desktop: 3 column layout - even distribution for others */}
                        {Array.from({ length: 3 }, (_, colIndex) => {
                          const itemsPerColumn = Math.ceil(othersProperties.length / 3);
                          const startIndex = colIndex * itemsPerColumn;
                          const endIndex = Math.min(startIndex + itemsPerColumn, othersProperties.length);
                          
                          return (
                            <div key={colIndex} className="flex-1 space-y-2">
                              {othersProperties
                                .slice(startIndex, endIndex)
                                .map(renderWorkPropertyCard)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Summary - Mobile inline version */}
                <div className="lg:hidden mt-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h3>
                    <RoomPriceSummary room={room} workData={workData} priceList={priceList} />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary Sidebar - Desktop only */}
            <div className="hidden lg:flex lg:w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-col h-full">
              <RoomPriceSummary room={room} workData={workData} priceList={priceList} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomDetailsModal;