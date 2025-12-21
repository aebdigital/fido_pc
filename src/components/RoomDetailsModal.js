import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { X, Hammer, Menu, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import UnsavedChangesModal from './UnsavedChangesModal';
import WorkPropertyCard from './WorkPropertyCard';
import RoomPriceSummary from './RoomPriceSummary';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES } from '../config/constants';

const RoomDetailsModal = ({ room, workProperties, onSave, onClose }) => {
  const { t } = useLanguage();
  const { generalPriceList } = useAppData();
  const [workData, setWorkData] = useState(room.workItems || []);
  const [expandedItems, setExpandedItems] = useState({});
  const [showingSanitarySelector, setShowingSanitarySelector] = useState(false);
  const [showingRentalsSelector, setShowingRentalsSelector] = useState(false);
  const [showingTypeSelector, setShowingTypeSelector] = useState(null);
  const [newlyAddedItems, setNewlyAddedItems] = useState(new Set());
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Store initial data for comparison
  const initialWorkDataRef = useRef(JSON.stringify(room.workItems || []));

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(workData) !== initialWorkDataRef.current;

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


  // Separate "Others" category properties
  const othersIds = [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK, WORK_ITEM_PROPERTY_IDS.COMMUTE, WORK_ITEM_PROPERTY_IDS.RENTALS];

  // Manual save function
  const handleSave = async () => {
    console.log('[RoomDetailsModal] handleSave - room:', room, 'roomId:', room?.id);
    setIsSaving(true);
    onSave(workData);
    // Simulate brief delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    // Update the initial data ref after saving
    initialWorkDataRef.current = JSON.stringify(workData);
    setIsSaving(false);
  };

  // Handle close - check for unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  };

  // Save and close
  const handleSaveAndClose = () => {
    console.log('[RoomDetailsModal] handleSaveAndClose - room:', room, 'roomId:', room?.id);
    onSave(workData);
    setShowUnsavedChangesModal(false);
    onClose();
  };

  // Discard and close
  const handleDiscardAndClose = () => {
    setShowUnsavedChangesModal(false);
    onClose();
  };

  // Cancel closing
  const handleCancelClose = () => {
    setShowUnsavedChangesModal(false);
  };
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
        name: t(property.name),
        subtitle: t(property.subtitle),
        fields: {},
        complementaryWorks: {},
        selectedType: null,
        selectedUnit: null,
        doorWindowItems: { doors: [], windows: [] }
      };
      setWorkData([...workData, newItem]);
      setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
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
      name: (property.id.startsWith('plasterboarding_') || property.id.startsWith('plastering_') || property.id.startsWith('painting_') || property.id.startsWith('netting_')) ? 
        `${t(property.name)} ${t(property.subtitle)}` : t(property.name),
      subtitle: t(property.subtitle),
      fields: {},
      complementaryWorks: {},
      selectedType: property.types ? property.types[0] : null,
      doorWindowItems: { doors: [], windows: [] }
    };
    setWorkData([...workData, newItem]);
    setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
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
      name: property.id === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK ? t(property.name) : 
             property.id.startsWith('plasterboarding_') ? 
               (type ? `${t(property.name)} ${t(property.subtitle)}, ${t(type)}` : `${t(property.name)} ${t(property.subtitle)}`) :
             `${t(property.name)} ${t(type)}`,
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
    // Map rental types to property IDs if needed, or keep generic 'rentals' and rely on name
    // For now we keep it simple as propertyId isn't strictly enforced for sub-items
    
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

    console.log('[COMPLEMENTARY] Toggle clicked:', { itemId, workKey, workName, currentCount });

    // If count >= 2, remove all and reset to 0
    if (currentCount >= 2) {
      console.log('[COMPLEMENTARY] Removing all instances');
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

      if (workName === WORK_ITEM_NAMES.PLASTERING) {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.PAINTING) {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === WORK_ITEM_PROPERTY_IDS.PAINTING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.NETTING) {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === WORK_ITEM_PROPERTY_IDS.NETTING_WALL : p.id === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING
        );
      } else if (workName === WORK_ITEM_NAMES.PENETRATION_COATING) {
        complementaryProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING);
      } else if (workName === WORK_ITEM_NAMES.TILING_UNDER_60CM) {
        complementaryProperty = workProperties.find(p => p.id === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60);
      }

      if (!complementaryProperty) {
        console.warn('[COMPLEMENTARY] Could not find property for:', workName);
        return;
      }

      console.log('[COMPLEMENTARY] Found property:', complementaryProperty);

      // Create new complementary work item with copied dimensions
      const newItem = {
        id: Date.now(),
        propertyId: complementaryProperty.id,
        name: (complementaryProperty.id.startsWith('plasterboarding_') ||
               complementaryProperty.id.startsWith('plastering_') ||
               complementaryProperty.id.startsWith('painting_') ||
               complementaryProperty.id.startsWith('netting_')) ?
          `${t(complementaryProperty.name)} ${t(complementaryProperty.subtitle)}` :
          t(complementaryProperty.name),
        subtitle: t(complementaryProperty.subtitle),
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

      console.log('[COMPLEMENTARY] Creating new item:', newItem);

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
      // Don't add to newlyAddedItems - keep complementary works collapsed
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
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[95vh] lg:h-[90vh] flex flex-col animate-slide-in"
          onClick={(e) => e.stopPropagation()}
        >        
          {/* Header */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{t(room.name) !== room.name ? t(room.name) : room.name}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  hasUnsavedChanges && !isSaving
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isSaving ? t('Saving...') : t('Save')}</span>
              </button>
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
                    <RoomPriceSummary room={room} workData={workData} />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary Sidebar - Desktop only */}
            <div className="hidden lg:flex lg:w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-col h-full">
              <RoomPriceSummary room={room} workData={workData} />
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onSaveAndProceed={handleSaveAndClose}
        onDiscardAndProceed={handleDiscardAndClose}
        onCancel={handleCancelClose}
      />
    </>
  );
};

export default RoomDetailsModal;