import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { X, Plus, Trash2, Check, Menu, Copy, Hammer, Package, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAppData } from '../context/AppDataContext';
import NumberInput from './NumberInput';
import UnsavedChangesModal from './UnsavedChangesModal';

const RoomDetailsModal = ({ room, workProperties, onSave, onClose }) => {
  const { t } = useLanguage();
  const { calculateRoomPriceWithMaterials, formatPrice, generalPriceList } = useAppData();
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
  const othersIds = ['custom_work', 'commute', 'rentals'];

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
    
    if (propertyId === 'sanitary_installation') {
      setShowingSanitarySelector(true);
      return;
    }
    
    if (propertyId === 'rentals') {
      setShowingRentalsSelector(true);
      return;
    }

    const property = workProperties.find(p => p.id === propertyId);

    // For custom_work, create item directly - user will select type from inline buttons
    if (propertyId === 'custom_work') {
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
    if (property?.types && property.id !== 'sanitary_installation') {
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
      propertyId: 'sanitary_installation',
      name: 'Sanitary installation',
      subtitle: sanitaryType,
      fields: {
        'Count': 0,
        'Price': defaultPrice
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
      name: property.id === 'custom_work' ? t(property.name) : 
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
    
    const rentalItem = workProperties.find(p => p.id === 'rentals')?.items?.find(item => item.name === rentalType);
    if (!rentalItem) return;

    let specificPropertyId = 'rentals';
    if (rentalType === 'Scaffolding') specificPropertyId = 'scaffolding';
    else if (rentalType === 'Core Drill') specificPropertyId = 'core_drill';
    else if (rentalType === 'Tool rental') specificPropertyId = 'tool_rental';

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
    setExpandedItems(prev => ({ ...prev, rentals: true }));
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
            (field === 'Width' || field === 'Height' || field === 'Length')) {
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
      const hasHeightField = parentProperty?.fields?.some(f => f.name === 'Height');
      const hasLengthField = parentProperty?.fields?.some(f => f.name === 'Length');

      if (workName === 'Plastering') {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === 'plastering_wall' : p.id === 'plastering_ceiling'
        );
      } else if (workName === 'Painting') {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === 'painting_wall' : p.id === 'painting_ceiling'
        );
      } else if (workName === 'Netting') {
        complementaryProperty = workProperties.find(p =>
          hasHeightField ? p.id === 'netting_wall' : p.id === 'netting_ceiling'
        );
      } else if (workName === 'Penetration coating') {
        complementaryProperty = workProperties.find(p => p.id === 'penetration_coating');
      } else if (workName === 'Tiling under 60cm') {
        complementaryProperty = workProperties.find(p => p.id === 'tiling_under_60');
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
        if (parentItem.fields.Width !== undefined) {
          newItem.fields.Width = parentItem.fields.Width;
        } else if (parentItem.fields.Šírka !== undefined) {
          newItem.fields.Width = parentItem.fields.Šírka;
        }

        // Copy Height or Length depending on complementary work type
        if (hasHeightField && (parentItem.fields.Height !== undefined || parentItem.fields.Výška !== undefined)) {
          newItem.fields.Height = parentItem.fields.Height || parentItem.fields.Výška;
        } else if (hasLengthField && (parentItem.fields.Length !== undefined || parentItem.fields.Dĺžka !== undefined)) {
          newItem.fields.Length = parentItem.fields.Length || parentItem.fields.Dĺžka;
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
    const fieldKey = field.subtitle ? `${field.name}_${field.subtitle}` : field.name;
    const value = item.fields[fieldKey];
    const isTextType = field.type === 'text';
    const isToggleType = field.type === 'toggle';

    // Skip doors and windows fields as they're rendered separately
    if (field.name === 'Doors' || field.name === 'Windows') {
      return null;
    }

    // Skip Name field for custom work as it's now in the header
    if (item.propertyId === 'custom_work' && field.name === 'Name') {
      return null;
    }

    // For custom work, show selected unit for Quantity and Price fields
    let unitDisplay = field.unit;
    if (item.propertyId === 'custom_work' && item.selectedUnit) {
      if (field.name === 'Quantity') {
        unitDisplay = item.selectedUnit;
      } else if (field.name === 'Price') {
        unitDisplay = `€/${item.selectedUnit}`;
      }
    }

    // Handle toggle type (checkbox)
    if (isToggleType) {
      return (
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white text-base">{t(field.name)}</div>
            {field.subtitle && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{t(field.subtitle)}</div>
            )}
          </div>
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleUpdateWorkItem(item.id, fieldKey, e.target.checked)}
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
              onChange={(e) => handleUpdateWorkItem(item.id, fieldKey, e.target.value, true)}
              className="w-32 px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
              placeholder={t(field.name)}
            />
          ) : (
            <NumberInput
              value={value || 0}
              onChange={(value) => handleUpdateWorkItem(item.id, fieldKey, value)}
              className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
              min={0}
            />
          )}
          {unitDisplay && <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{t(unitDisplay)}</span>}
        </div>
      </div>
    );
  };

  const WorkPropertyCard = ({ property }) => {
    const existingItems = workData.filter(item => item.propertyId === property.id);
    
    // Special handling for rentals
    if (property.id === 'rentals') {
      return (
        <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
          {/* Always show header with plus button */}
          <div
            className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={(e) => {
              if (existingItems.length > 0) {
                e.preventDefault();
                toggleExpanded(property.id, e);
              }
            }}
          >
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
            </div>
            <div 
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              onClick={(e) => handleAddWorkItem(property.id, e)}
            >
              <Plus className="w-4 h-4" />
            </div>
          </div>

          {/* Type selector when showing */}
          {showingRentalsSelector && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm "
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
          {expandedItems[property.id] && existingItems.map((item, index) => (
            <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 ${newlyAddedItems.has(item.id) ? '' : ''}`}>
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

      const hasInput = (item) => {
        if (!item) return false;
        // Check fields
        if (item.fields) {
          const hasFieldInput = Object.entries(item.fields).some(([key, value]) => {
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
        <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${isFilled ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
          {/* Header with plus/minus button */}
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveScrollPosition();

              if (existingItem) {
                // Toggle expansion or remove
                if (expandedItems[existingItem.id]) {
                  // If expanded, collapse it
                  setExpandedItems(prev => ({ ...prev, [existingItem.id]: false }));
                } else {
                  // If collapsed, expand it
                  setExpandedItems(prev => ({ ...prev, [existingItem.id]: true }));
                }
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
                setNewlyAddedItems(prev => new Set([...prev, newItem.id]));
                
                // Auto-expand ONLY if it's NOT an "Other" property (e.g. expand Wiring, but keep Commute collapsed)
                const isOtherProperty = othersIds.includes(property.id);
                if (!isOtherProperty) {
                  setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
                } else {
                  // Explicitly collapse "Other" properties when adding
                  setExpandedItems(prev => ({ ...prev, [newItem.id]: false }));
                }
              }
            }}
          >
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
              )}
            </div>
            <div className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              {existingItem ? (
                expandedItems[existingItem.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Show fields only when item exists AND is expanded */}
          {existingItem && expandedItems[existingItem.id] && (
            <div className="space-y-3 lg:space-y-2 ">
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
                    <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                    <button
                      onClick={(e) => toggleExpanded(existingItem.id, e)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {expandedItems[existingItem.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>

                  {expandedItems[existingItem.id] && (
                    <div className="space-y-3 lg:space-y-2 ">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => handleToggleAllComplementaryWorks(existingItem.id, e)}
                          className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-gray-400 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 flex items-center justify-center transition-colors"
                          title="Toggle all complementary works"
                        >
                          <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white" />
                        </button>
                      </div>
                      {property.complementaryWorks.map((work, index) => {
                        const uniqueKey = `${work}_${index}`;
                        // Count how many instances exist
                        const instanceCount = workData.filter(item =>
                          item.linkedToParent === existingItem.id &&
                          item.linkedWorkKey === uniqueKey
                        ).length;

                        return (
                          <div key={uniqueKey} className="flex items-center justify-between gap-3">
                            <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                            <button
                              onClick={(e) => handleToggleComplementaryWork(existingItem.id, uniqueKey, e)}
                              className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                instanceCount > 0
                                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {instanceCount > 0 ? (
                                <span className="text-xs font-bold text-white dark:text-gray-900">{instanceCount}</span>
                              ) : null}
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

    // Special handling for properties with types (Simple/Double/Triple) - but NOT custom_work
    // custom_work is handled in the regular property card section below
    if (property.types && property.id !== 'sanitary_installation' && property.id !== 'custom_work') {
      const existingItems = workData.filter(item => item.propertyId === property.id);
      
      return (
        <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
          {/* Always show header with plus button */}
          <div
            className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={(e) => {
              if (existingItems.length > 0) {
                e.preventDefault();
                toggleExpanded(property.id, e);
              }
            }}
          >
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
              )}
            </div>
            <div 
              className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              onClick={(e) => handleAddWorkItem(property.id, e)}
            >
              <Plus className="w-4 h-4" />
            </div>
          </div>

          {/* Type selector when showing */}
          {showingTypeSelector === property.id && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm "
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
                    className="p-3 lg:p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm lg:text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center flex items-center justify-center gap-2"
                  >
                    {type === 'Work' && <Hammer className="w-4 h-4" />}
                    {type === 'Material' && <Package className="w-4 h-4" />}
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing type items */}
          {expandedItems[property.id] && existingItems.map(item => (
            <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3 ${newlyAddedItems.has(item.id) ? '' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {t(item.name)}
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
                    <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                    <button
                      onClick={(e) => toggleExpanded(item.id, e)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {expandedItems[item.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>

                  {expandedItems[item.id] && (
                    <div className="space-y-3 lg:space-y-2 ">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => handleToggleAllComplementaryWorks(item.id, e)}
                          className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-gray-400 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 flex items-center justify-center transition-colors"
                          title="Toggle all complementary works"
                        >
                          <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white" />
                        </button>
                      </div>
                      {property.complementaryWorks.map((work, index) => {
                        const uniqueKey = `${work}_${index}`;
                        // Count how many instances exist
                        const instanceCount = workData.filter(itm =>
                          itm.linkedToParent === item.id &&
                          itm.linkedWorkKey === uniqueKey
                        ).length;

                        return (
                          <div key={uniqueKey} className="flex items-center justify-between gap-3">
                            <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                            <button
                              onClick={(e) => handleToggleComplementaryWork(item.id, uniqueKey, e)}
                              className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                instanceCount > 0
                                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {instanceCount > 0 ? (
                                <span className="text-xs font-bold text-white dark:text-gray-900">{instanceCount}</span>
                              ) : null}
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
        <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 shadow-sm ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
          {/* Always show header with plus button */}
          <div
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => handleAddWorkItem(property.id, e)}
          >
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
              {property.subtitle && (
                <p className="text-base text-gray-600 dark:text-gray-400">{property.subtitle}</p>
              )}
            </div>
            <div className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
          </div>

          {/* Type selector when showing */}
          {showingSanitarySelector && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-3 shadow-sm "
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
      <div className={`bg-gray-200 dark:bg-gray-800 rounded-2xl p-3 lg:p-3 space-y-3 lg:space-y-2 ${existingItems.length > 0 ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
        <div
          className={`flex items-center justify-between transition-opacity ${existingItems.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={(e) => {
            if (existingItems.length > 0) {
              e.preventDefault();
              toggleExpanded(property.id, e);
            }
          }}
        >
          <div className="flex-1">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t(property.name)}</h4>
            {property.subtitle && (
              <p className="text-base text-gray-600 dark:text-gray-400">{t(property.subtitle)}</p>
            )}
          </div>
          <div 
            className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            onClick={(e) => handleAddWorkItem(property.id, e)}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Show existing work items for this property */}
        {expandedItems[property.id] && existingItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 lg:p-3 space-y-3">
            <div className="flex items-center justify-between">
              {property.id === 'custom_work' && item.selectedUnit ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {item.selectedType === 'Work' ? t('Názov práce') : t('Názov materiálu')}:
                  </span>
                  <input
                    id={`custom-work-name-${item.id}`}
                    type="text"
                    defaultValue={item.fields.Name || ''}
                    onBlur={(e) => handleUpdateWorkItem(item.id, 'Name', e.target.value, true)}
                    className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded border-none focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm min-w-0"
                    placeholder={item.selectedType === 'Work' ? t('Názov práce') : t('Názov materiálu')}
                  />
                </div>
              ) : property.id === 'custom_work' ? (
                <span className="font-medium text-gray-900 dark:text-white text-lg">
                  {t(property.name)}
                </span>
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

            {/* Property type selection - for custom_work, only show if unit not yet selected */}
            {property.types && (property.id !== 'custom_work' || !item.selectedUnit) && (
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
                    className={`p-3 lg:p-2 rounded-lg text-sm lg:text-sm transition-colors flex items-center justify-center gap-2 ${
                      item.selectedType === type
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

            {/* Unit selector for custom work - only show after type is selected but before unit is selected */}
            {property.id === 'custom_work' && property.hasUnitSelector && item.selectedType && !item.selectedUnit && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3">
                <span className="text-base font-medium text-gray-900 dark:text-white">{t('Vyberte jednotku')}</span>
                <div className="grid grid-cols-4 gap-2">
                  {(item.selectedType === 'Work' ? property.workUnits : property.materialUnits)?.map(unit => (
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
            )}

            {/* Property fields */}
            {property.fields && (property.id !== 'custom_work' || item.selectedUnit) && (
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
                  <span className="text-base lg:text-sm font-medium text-gray-900 dark:text-white">{t('Complementary works')}</span>
                  <button
                    onClick={(e) => toggleExpanded(item.id, e)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {expandedItems[item.id] ? <X className="w-5 h-5 lg:w-4 lg:h-4" /> : <Plus className="w-5 h-5 lg:w-4 lg:h-4" />}
                  </button>
                </div>

                {expandedItems[item.id] && (
                  <div className="space-y-3 lg:space-y-2 ">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => handleToggleAllComplementaryWorks(item.id, e)}
                        className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-gray-400 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 flex items-center justify-center transition-colors"
                        title="Toggle all complementary works"
                      >
                        <Check className="w-4 h-4 lg:w-3 lg:h-3 text-white" />
                      </button>
                    </div>
                    {property.complementaryWorks.map((work, index) => {
                      const uniqueKey = `${work}_${index}`;
                      // Count how many instances exist
                      const instanceCount = workData.filter(itm =>
                        itm.linkedToParent === item.id &&
                        itm.linkedWorkKey === uniqueKey
                      ).length;

                      return (
                        <div key={uniqueKey} className="flex items-center justify-between gap-3">
                          <span className="text-base lg:text-sm text-gray-600 dark:text-gray-400 flex-1">{t(work)}</span>
                          <button
                            onClick={(e) => handleToggleComplementaryWork(item.id, uniqueKey, e)}
                            className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              instanceCount > 0
                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {instanceCount > 0 ? (
                              <span className="text-xs font-bold text-white dark:text-gray-900">{instanceCount}</span>
                            ) : null}
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
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4 animate-fade-in"
        onClick={handleClose}
      >
              <div 
                className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[95vw] h-[95vh] lg:h-[90vh] flex flex-col animate-slide-in"
                onClick={(e) => e.stopPropagation()}
              >        {/* Header */}
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

            {/* Price Summary - Mobile inline version */}
            {(() => {
              const roomWithWorkItems = { ...room, workItems: workData };
              const calculation = calculateRoomPriceWithMaterials(roomWithWorkItems, generalPriceList);
              const vatRate = generalPriceList?.others?.find(item => item.name === 'VAT')?.price / 100 || 0.23;
              const vatAmount = calculation.total * vatRate;
              const totalWithVat = calculation.total + vatAmount;

              return (
                <div className="lg:hidden mt-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h3>
                    
                    {workData.length > 0 ? (
                      <div className="space-y-4">
                        {/* Work Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('Work')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.workTotal)}</span>
                          </div>
                          {calculation.items.length > 0 ? (
                            calculation.items.map(item => {
                              if (item.calculation?.workCost > 0) {
                                // Determine the correct unit based on work type
                                // First check if calculation already has a unit (e.g., for additional fields like Jolly Edging, Plinth)
                                let unit = item.calculation.unit || 'm²';
                                let quantity = item.calculation.quantity;
                                const values = item.fields;

                                // Only derive unit from fields if not already set in calculation
                                if (!item.calculation.unit) {
                                  // Check for scaffolding rental (has "- prenájom" in subtitle)
                                  if (item.subtitle && item.subtitle.includes('- prenájom') && values['Rental duration']) {
                                    quantity = parseFloat(values['Rental duration'] || 0);
                                    unit = quantity > 1 ? 'days' : 'day';
                                  } else if ((values.Distance || values.Vzdialenosť) && (item.name === 'Journey' || item.name === 'Commute' || item.name === 'Cesta')) {
                                    unit = 'km';
                                    const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
                                    const days = parseFloat(values.Duration || values.Trvanie || 0);
                                    quantity = distance * (days > 0 ? days : 1);
                                    console.log('[COMMUTE DISPLAY]', { itemName: item.name, distance, days, quantity, values });
                                  } else if (values.Duration || values.Trvanie || (values.Count && (item.name === 'Core Drill' || item.name === 'Rental' || item.name === 'Tool rental'))) {
                                    unit = 'h';
                                    quantity = parseFloat(values.Duration || values.Trvanie || values.Count || 0);
                                  } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
                                    unit = 'ks';
                                    quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
                                  } else if (values.Length && !values.Width && !values.Height) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Length || 0);
                                  } else if (values.Circumference) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Circumference || 0);
                                  } else if (values.Distance) {
                                    unit = 'km';
                                    quantity = parseFloat(values.Distance || 0);
                                  }
                                }
                                
                                // For work types with subtitles (plasterboarding, plastering, painting, netting), use the constructed name directly, otherwise translate
                                const workName = item.propertyId && (item.propertyId.startsWith('plasterboarding_') || item.propertyId.startsWith('plastering_') || item.propertyId.startsWith('painting_') || item.propertyId.startsWith('netting_')) ? 
                                  item.name : t(item.name);
                                
                                // Special handling for scaffolding items
                                let workDescription;
                                if ((item.subtitle && (item.subtitle.toLowerCase().includes('scaffolding') || 
                                    item.subtitle.toLowerCase().includes('lešenie'))) ||
                                    (item.name && item.name.toLowerCase().includes('lešenie'))) {
                                  if (item.subtitle.includes('- prenájom')) {
                                    // For rental component, show days
                                    const duration = parseFloat(values['Rental duration'] || 0);
                                    workDescription = `${t(item.subtitle)} - ${duration.toFixed(0)} ${t('dní')}`;
                                  } else if (item.subtitle.includes('- montáž a demontáž')) {
                                    // For assembly component, show area
                                    const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
                                    workDescription = `${t(item.subtitle)} - ${area.toFixed(1)}${t('m²')}`;
                                  } else {
                                    workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                                  }
                                } else {
                                  workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                                }
                                
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
                              {t('No work items added')}
                            </div>
                          )}
                          {/* Add auxiliary work cost at bottom of work section */}
                          {calculation.auxiliaryWorkCost > 0 && (
                            <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                              <span className="text-gray-600 dark:text-gray-400">{t('Auxiliary and finishing work')} (65%)</span>
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
                          {calculation.items.some(item => item.calculation?.materialCost > 0) ? (
                            (() => {
                              const materialGroups = {};
                              
                              // Group materials by name and subtitle
                              calculation.items.forEach(item => {
                                // Handle sanitary installations separately (no material object, just cost)
                                if (item.propertyId === 'sanitary_installation' && item.calculation?.materialCost > 0) {
                                  const sanitaryKey = `${item.name}-${item.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[sanitaryKey]) {
                                    materialGroups[sanitaryKey] = {
                                      material: {
                                        name: item.name,
                                        subtitle: item.subtitle,
                                        unit: 'pc'
                                      },
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: [],
                                      isSanitary: true
                                    };
                                  }

                                  const quantity = parseFloat(item.fields.Count || 0);
                                  const cost = item.calculation.materialCost;

                                  materialGroups[sanitaryKey].totalQuantity += quantity;
                                  materialGroups[sanitaryKey].totalCost += cost;
                                  materialGroups[sanitaryKey].items.push(item);
                                } else if (item.calculation?.materialCost > 0 && item.calculation?.material) {
                                  const material = item.calculation.material;
                                  const materialKey = `${material.name}-${material.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[materialKey]) {
                                    materialGroups[materialKey] = {
                                      material,
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: []
                                    };
                                  }

                                  const quantity = material.capacity
                                    ? Math.ceil(item.calculation.quantity / material.capacity.value)
                                    : item.calculation.quantity;
                                  const cost = material.capacity
                                    ? quantity * material.price
                                    : item.calculation.quantity * material.price;

                                  materialGroups[materialKey].totalQuantity += quantity;
                                  materialGroups[materialKey].totalCost += cost;
                                  materialGroups[materialKey].items.push(item);
                                }
                                
                                // Handle additional materials (like adhesive)
                                if (item.calculation?.additionalMaterial) {
                                  const additionalMaterial = item.calculation.additionalMaterial;
                                  const additionalKey = `${additionalMaterial.name}-${additionalMaterial.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[additionalKey]) {
                                    materialGroups[additionalKey] = {
                                      material: additionalMaterial,
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: []
                                    };
                                  }

                                  // Use additionalMaterialQuantity if available (for aggregated calculations like tiling/paving adhesive)
                                  const quantityToUse = item.calculation.additionalMaterialQuantity || item.calculation.quantity;
                                  const additionalQuantity = additionalMaterial.capacity
                                    ? Math.ceil(quantityToUse / additionalMaterial.capacity.value)
                                    : quantityToUse;
                                  const additionalCost = additionalMaterial.capacity
                                    ? additionalQuantity * additionalMaterial.price
                                    : quantityToUse * additionalMaterial.price;

                                  materialGroups[additionalKey].totalQuantity += additionalQuantity;
                                  materialGroups[additionalKey].totalCost += additionalCost;
                                  materialGroups[additionalKey].items.push(item);
                                }
                              });
                              
                              // Render grouped materials
                              return Object.values(materialGroups).map((group, index) => {
                                const materialDescription = `${t(group.material.name)}${group.material.subtitle ? `, ${t(group.material.subtitle)}` : ''}`;
                                const unit = group.material.capacity 
                                  ? (group.material.unit.includes('pc') ? 'pc' : 'pkg')
                                  : group.material.unit?.replace('€/', '');
                                
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
                              <span className="text-gray-600 dark:text-gray-400">{t('Auxiliary and connecting material')} (10%)</span>
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
                                let unit = item.calculation.unit || 'm²';
                                let quantity = item.calculation.quantity;
                                const values = item.fields;

                                // Only derive unit from fields if not already set in calculation
                                if (!item.calculation.unit) {
                                  // Check for scaffolding rental (has "- prenájom" in subtitle)
                                  if (item.subtitle && item.subtitle.includes('- prenájom') && values['Rental duration']) {
                                    quantity = parseFloat(values['Rental duration'] || 0);
                                    unit = quantity > 1 ? 'days' : 'day';
                                  } else if ((values.Distance || values.Vzdialenosť) && (item.name === 'Journey' || item.name === 'Commute' || item.name === 'Cesta')) {
                                    unit = 'km';
                                    const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
                                    const days = parseFloat(values.Duration || values.Trvanie || 0);
                                    quantity = distance * (days > 0 ? days : 1);
                                    console.log('[COMMUTE DISPLAY]', { itemName: item.name, distance, days, quantity, values });
                                  } else if (values.Duration || values.Trvanie || (values.Count && (item.name === 'Core Drill' || item.name === 'Rental' || item.name === 'Tool rental'))) {
                                    unit = 'h';
                                    quantity = parseFloat(values.Duration || values.Trvanie || values.Count || 0);
                                  } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
                                    unit = 'ks';
                                    quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
                                  } else if (values.Length && !values.Width && !values.Height) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Length || 0);
                                  } else if (values.Circumference) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Circumference || 0);
                                  } else if (values.Distance) {
                                    unit = 'km';
                                    quantity = parseFloat(values.Distance || 0);
                                  }
                                }
                                
                                const workName = t(item.name);
                                // Format quantity: for days show as integer with space, otherwise use existing format
                                const translatedUnit = t(unit);
                                const formattedQuantity = (unit === 'day' || unit === 'days')
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

                        {/* Totals */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-2">
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
                    ) : (
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <p className="text-base font-medium">{t('No work items')}</p>
                          <p className="text-sm mt-1">{t('Add work items to see price summary')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          </div>

          {/* Price Summary Sidebar - Desktop only */}
            {(() => {
              const roomWithWorkItems = { ...room, workItems: workData };
              const calculation = calculateRoomPriceWithMaterials(roomWithWorkItems, generalPriceList);
              const vatRate = generalPriceList?.others?.find(item => item.name === 'VAT')?.price / 100 || 0.23;
              const vatAmount = calculation.total * vatRate;
              const totalWithVat = calculation.total + vatAmount;

              return (
                <div className="hidden lg:flex lg:w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-col h-full">
                  <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total price offer')}</h3>
                  </div>
                  
                  <div className="lg:flex-1 lg:overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar">
                    {workData.length > 0 ? (
                      <>
                        {/* Work Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900 dark:text-white">{t('Work')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(calculation.workTotal)}</span>
                          </div>
                          {calculation.items.length > 0 ? (
                            calculation.items.map(item => {
                              if (item.calculation?.workCost > 0) {
                                // Determine the correct unit based on work type
                                // First check if calculation already has a unit (e.g., for additional fields like Jolly Edging, Plinth)
                                let unit = item.calculation.unit || 'm²';
                                let quantity = item.calculation.quantity;
                                const values = item.fields;

                                // Only derive unit from fields if not already set in calculation
                                if (!item.calculation.unit) {
                                  // Check for scaffolding rental (has "- prenájom" in subtitle)
                                  if (item.subtitle && item.subtitle.includes('- prenájom') && values['Rental duration']) {
                                    quantity = parseFloat(values['Rental duration'] || 0);
                                    unit = quantity > 1 ? 'days' : 'day';
                                  } else if ((values.Distance || values.Vzdialenosť) && (item.name === 'Journey' || item.name === 'Commute' || item.name === 'Cesta')) {
                                    unit = 'km';
                                    const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
                                    const days = parseFloat(values.Duration || values.Trvanie || 0);
                                    quantity = distance * (days > 0 ? days : 1);
                                    console.log('[COMMUTE DISPLAY]', { itemName: item.name, distance, days, quantity, values });
                                  } else if (values.Duration || values.Trvanie || (values.Count && (item.name === 'Core Drill' || item.name === 'Rental' || item.name === 'Tool rental'))) {
                                    unit = 'h';
                                    quantity = parseFloat(values.Duration || values.Trvanie || values.Count || 0);
                                  } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
                                    unit = 'ks';
                                    quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
                                  } else if (values.Length && !values.Width && !values.Height) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Length || 0);
                                  } else if (values.Circumference) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Circumference || 0);
                                  } else if (values.Distance) {
                                    unit = 'km';
                                    quantity = parseFloat(values.Distance || 0);
                                  }
                                }
                                
                                // For work types with subtitles (plasterboarding, plastering, painting, netting), use the constructed name directly, otherwise translate
                                const workName = item.propertyId && (item.propertyId.startsWith('plasterboarding_') || item.propertyId.startsWith('plastering_') || item.propertyId.startsWith('painting_') || item.propertyId.startsWith('netting_')) ? 
                                  item.name : t(item.name);
                                
                                // Special handling for scaffolding items
                                let workDescription;
                                if ((item.subtitle && (item.subtitle.toLowerCase().includes('scaffolding') || 
                                    item.subtitle.toLowerCase().includes('lešenie'))) ||
                                    (item.name && item.name.toLowerCase().includes('lešenie'))) {
                                  if (item.subtitle.includes('- prenájom')) {
                                    // For rental component, show days
                                    const duration = parseFloat(values['Rental duration'] || 0);
                                    workDescription = `${t(item.subtitle)} - ${duration.toFixed(0)} ${t('dní')}`;
                                  } else if (item.subtitle.includes('- montáž a demontáž')) {
                                    // For assembly component, show area
                                    const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
                                    workDescription = `${t(item.subtitle)} - ${area.toFixed(1)}${t('m²')}`;
                                  } else {
                                    workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                                  }
                                } else {
                                  workDescription = `${workName} - ${quantity.toFixed(quantity < 10 ? 1 : 0)}${t(unit)}`;
                                }
                                
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
                              {t('No work items added')}
                            </div>
                          )}
                          {/* Add auxiliary work cost at bottom of work section */}
                          {calculation.auxiliaryWorkCost > 0 && (
                            <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                              <span className="text-gray-600 dark:text-gray-400">{t('Auxiliary and finishing work')} (65%)</span>
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
                          {calculation.items.some(item => item.calculation?.materialCost > 0) ? (
                            (() => {
                              const materialGroups = {};
                              
                              // Group materials by name and subtitle
                              calculation.items.forEach(item => {
                                // Handle sanitary installations separately (no material object, just cost)
                                if (item.propertyId === 'sanitary_installation' && item.calculation?.materialCost > 0) {
                                  const sanitaryKey = `${item.name}-${item.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[sanitaryKey]) {
                                    materialGroups[sanitaryKey] = {
                                      material: {
                                        name: item.name,
                                        subtitle: item.subtitle,
                                        unit: 'pc'
                                      },
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: [],
                                      isSanitary: true
                                    };
                                  }

                                  const quantity = parseFloat(item.fields.Count || 0);
                                  const cost = item.calculation.materialCost;

                                  materialGroups[sanitaryKey].totalQuantity += quantity;
                                  materialGroups[sanitaryKey].totalCost += cost;
                                  materialGroups[sanitaryKey].items.push(item);
                                } else if (item.calculation?.materialCost > 0 && item.calculation?.material) {
                                  const material = item.calculation.material;
                                  const materialKey = `${material.name}-${material.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[materialKey]) {
                                    materialGroups[materialKey] = {
                                      material,
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: []
                                    };
                                  }

                                  const quantity = material.capacity
                                    ? Math.ceil(item.calculation.quantity / material.capacity.value)
                                    : item.calculation.quantity;
                                  const cost = material.capacity
                                    ? quantity * material.price
                                    : item.calculation.quantity * material.price;

                                  materialGroups[materialKey].totalQuantity += quantity;
                                  materialGroups[materialKey].totalCost += cost;
                                  materialGroups[materialKey].items.push(item);
                                }
                                
                                // Handle additional materials (like adhesive)
                                if (item.calculation?.additionalMaterial) {
                                  const additionalMaterial = item.calculation.additionalMaterial;
                                  const additionalKey = `${additionalMaterial.name}-${additionalMaterial.subtitle || 'no-subtitle'}`;

                                  if (!materialGroups[additionalKey]) {
                                    materialGroups[additionalKey] = {
                                      material: additionalMaterial,
                                      totalQuantity: 0,
                                      totalCost: 0,
                                      items: []
                                    };
                                  }

                                  // Use additionalMaterialQuantity if available (for aggregated calculations like tiling/paving adhesive)
                                  const quantityToUse = item.calculation.additionalMaterialQuantity || item.calculation.quantity;
                                  const additionalQuantity = additionalMaterial.capacity
                                    ? Math.ceil(quantityToUse / additionalMaterial.capacity.value)
                                    : quantityToUse;
                                  const additionalCost = additionalMaterial.capacity
                                    ? additionalQuantity * additionalMaterial.price
                                    : quantityToUse * additionalMaterial.price;

                                  materialGroups[additionalKey].totalQuantity += additionalQuantity;
                                  materialGroups[additionalKey].totalCost += additionalCost;
                                  materialGroups[additionalKey].items.push(item);
                                }
                              });
                              
                              // Render grouped materials
                              return Object.values(materialGroups).map((group, index) => {
                                const materialDescription = `${t(group.material.name)}${group.material.subtitle ? `, ${t(group.material.subtitle)}` : ''}`;
                                const unit = group.material.capacity 
                                  ? (group.material.unit.includes('pc') ? 'pc' : 'pkg')
                                  : group.material.unit?.replace('€/', '');
                                
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
                              <span className="text-gray-600 dark:text-gray-400">{t('Auxiliary and connecting material')} (10%)</span>
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
                                let unit = item.calculation.unit || 'm²';
                                let quantity = item.calculation.quantity;
                                const values = item.fields;

                                // Only derive unit from fields if not already set in calculation
                                if (!item.calculation.unit) {
                                  // Check for scaffolding rental (has "- prenájom" in subtitle)
                                  if (item.subtitle && item.subtitle.includes('- prenájom') && values['Rental duration']) {
                                    quantity = parseFloat(values['Rental duration'] || 0);
                                    unit = quantity > 1 ? 'days' : 'day';
                                  } else if ((values.Distance || values.Vzdialenosť) && (item.name === 'Journey' || item.name === 'Commute' || item.name === 'Cesta')) {
                                    unit = 'km';
                                    const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
                                    const days = parseFloat(values.Duration || values.Trvanie || 0);
                                    quantity = distance * (days > 0 ? days : 1);
                                    console.log('[COMMUTE DISPLAY]', { itemName: item.name, distance, days, quantity, values });
                                  } else if (values.Duration || values.Trvanie || (values.Count && (item.name === 'Core Drill' || item.name === 'Rental' || item.name === 'Tool rental'))) {
                                    unit = 'h';
                                    quantity = parseFloat(values.Duration || values.Trvanie || values.Count || 0);
                                  } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
                                    unit = 'ks';
                                    quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
                                  } else if (values.Length && !values.Width && !values.Height) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Length || 0);
                                  } else if (values.Circumference) {
                                    unit = 'm';
                                    quantity = parseFloat(values.Circumference || 0);
                                  } else if (values.Distance) {
                                    unit = 'km';
                                    quantity = parseFloat(values.Distance || 0);
                                  }
                                }
                                
                                const workName = t(item.name);
                                // Format quantity: for days show as integer with space, otherwise use existing format
                                const translatedUnit = t(unit);
                                const formattedQuantity = (unit === 'day' || unit === 'days')
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
            })()}
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