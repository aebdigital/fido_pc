import {
  WORK_TYPE_SUFFIXES,
  WORK_ITEM_SUBTITLES,
  MATERIAL_ITEM_NAMES,
  MATERIAL_ITEM_SUBTITLES,
  WORK_ITEM_NAMES,
  WORK_ITEM_PROPERTY_IDS,
  UNIT_TYPES
} from '../config/constants';

// Helper to format price string
export const formatPrice = (price) => {
  return `€${price.toFixed(2).replace('.', ',')}`;
};

// Find matching price list item for a work item
export const findPriceListItem = (workItem, priceList) => {
  if (!workItem || !workItem.propertyId || !priceList) return null;
  
  // Create mapping from work item IDs to price list items
  const workIdMappings = {
    [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: WORK_ITEM_NAMES.PREPARATORY_AND_DEMOLITION_WORKS,
    [WORK_ITEM_PROPERTY_IDS.WIRING]: ['Wiring', 'Electrical installation work', 'Elektroinštalačné práce'],
    [WORK_ITEM_PROPERTY_IDS.PLUMBING]: ['Plumbing', 'Plumbing work', 'Vodoinštalačné práce'],
    [WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS]: WORK_ITEM_NAMES.BRICK_PARTITIONS,
    [WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING]: WORK_ITEM_NAMES.BRICK_LOAD_BEARING_WALL,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING]: WORK_ITEM_NAMES.PLASTERBOARDING,
    [WORK_ITEM_PROPERTY_IDS.NETTING_WALL]: WORK_ITEM_NAMES.NETTING,
    [WORK_ITEM_PROPERTY_IDS.NETTING_CEILING]: WORK_ITEM_NAMES.NETTING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL]: WORK_ITEM_NAMES.PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING]: WORK_ITEM_NAMES.PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING]: WORK_ITEM_NAMES.FACADE_PLASTERING,
    [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: WORK_ITEM_NAMES.INSTALLATION_OF_CORNER_BEAD,
    [WORK_ITEM_PROPERTY_IDS.WINDOW_SASH]: WORK_ITEM_NAMES.PLASTERING_OF_WINDOW_SASH,
    [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: WORK_ITEM_NAMES.PENETRATION_COATING,
    [WORK_ITEM_PROPERTY_IDS.PAINTING_WALL]: WORK_ITEM_NAMES.PAINTING,
    [WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING]: WORK_ITEM_NAMES.PAINTING,
    [WORK_ITEM_PROPERTY_IDS.LEVELLING]: WORK_ITEM_NAMES.LEVELLING,
    [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: WORK_ITEM_NAMES.FLOATING_FLOOR,
    [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: WORK_ITEM_NAMES.TILING_UNDER_60CM,
    [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: WORK_ITEM_NAMES.PAVING_UNDER_60CM,
    [WORK_ITEM_PROPERTY_IDS.GROUTING]: WORK_ITEM_NAMES.GROUTING,
    [WORK_ITEM_PROPERTY_IDS.SILICONING]: WORK_ITEM_NAMES.SILICONING,
    [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: WORK_ITEM_NAMES.SANITARY_INSTALLATIONS,
    [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: WORK_ITEM_NAMES.WINDOW_INSTALLATION,
    [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: WORK_ITEM_NAMES.INSTALLATION_OF_DOOR_JAMB,
    [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK]: WORK_ITEM_NAMES.CUSTOM_WORK_AND_MATERIAL,
    [WORK_ITEM_PROPERTY_IDS.COMMUTE]: WORK_ITEM_NAMES.COMMUTE,
    [WORK_ITEM_PROPERTY_IDS.RENTALS]: WORK_ITEM_NAMES.TOOL_RENTAL // This will be handled specially for different rental types
  };

  // For rental items, use the actual rental item name instead of generic mapping
  let targetName;
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.RENTALS && workItem.name) {
    targetName = workItem.name; // Use "Scaffolding", "Core Drill", or "Tool rental"
  } else {
    targetName = workIdMappings[workItem.propertyId];
  }

  if (!targetName) {
    return null;
  }

  // Search through all categories in the price list
  for (const category of ['work', 'material', 'installations', 'others']) {
    if (priceList[category]) {
      // Find exact or partial match
      const item = priceList[category].find(item => {
        // Handle array of target names (for backward compatibility or multiple valid names)
        const nameMatch = Array.isArray(targetName) 
          ? targetName.some(name => item.name.toLowerCase().includes(name.toLowerCase()))
          : item.name.toLowerCase().includes(targetName.toLowerCase());

        // For items with subtypes (like plasterboarding), check subtitle too
        if (workItem.selectedType && item.subtitle) {
          const subtitleMatch = item.subtitle.toLowerCase().includes(workItem.selectedType.toLowerCase());
          
          // For plasterboarding, check both the work subtype (partition/offset wall/ceiling) and type (simple/double)
          if (nameMatch && !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.PLASTERBOARDING.toLowerCase() && workItem.subtitle) {
            const workSubtitle = workItem.subtitle.toLowerCase();
            const itemSubtitle = item.subtitle.toLowerCase();
            const workType = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
            
            // Check if the item subtitle contains both the work subtype and the selected type
            const subtypeMatch = (
              (workSubtitle.includes(WORK_ITEM_SUBTITLES.PARTITION[0]) && itemSubtitle.includes(WORK_ITEM_SUBTITLES.PARTITION[0])) ||
              (workSubtitle.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[0]) && itemSubtitle.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[0])) ||
              (workSubtitle.includes(WORK_ITEM_SUBTITLES.CEILING[0]) && itemSubtitle.includes(WORK_ITEM_SUBTITLES.CEILING[0]))
            );
            
            // For ceiling, no type match needed since it's just "ceiling" not "ceiling, simple"
            const typeMatch = workSubtitle.includes(WORK_ITEM_SUBTITLES.CEILING[0]) ? true : (!workType || itemSubtitle.includes(workType));
            
            return subtypeMatch && typeMatch;
          }
          
          return nameMatch && subtitleMatch;
        }

        // Special check for Plasterboarding to avoid incorrect matching of subtypes when selectedType is missing (e.g. ceiling)
        if (nameMatch && !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.PLASTERBOARDING.toLowerCase() && item.subtitle && workItem.subtitle) {
           const workSubLower = workItem.subtitle.toLowerCase();
           const itemSubLower = item.subtitle.toLowerCase();
           
           // If we are looking for ceiling (check both English and Slovak)
           if (workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1])) {
               // But the item is NOT ceiling (check both English and Slovak)
               if (!itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) && !itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1])) {
                   return false;
               }
               // If item IS ceiling, it's a match!
               return true;
           }
           
           // If we are NOT looking for ceiling, but the item IS ceiling, do not match
           if (itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1])) {
              return false;
           }
        }

        // Special check for Netting to ensure correct subtype matching (wall vs ceiling)
        if (nameMatch && !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.NETTING.toLowerCase() && item.subtitle && workItem.subtitle) {
           const workSubLower = workItem.subtitle.toLowerCase();
           const itemSubLower = item.subtitle.toLowerCase();
           
           // If we are looking for ceiling (check both English and Slovak)
           if (workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1])) {
               return itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]);
           }
           
           // If we are looking for wall (check both English and Slovak)
           if (workSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0]) || workSubLower.includes(WORK_ITEM_SUBTITLES.WALL[1])) {
                return itemSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0]) || itemSubLower.includes(WORK_ITEM_SUBTITLES.WALL[1]);
           }
        }
        
        // For sanitary installations, match subtitle (the actual type like "Concealed toilet")
        if (workItem.subtitle && item.subtitle && !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.SANITARY_INSTALLATIONS.toLowerCase()) {
          const workSubLower = workItem.subtitle.toLowerCase();
          const itemSubLower = item.subtitle.toLowerCase();

          if (workSubLower === itemSubLower) {
            return nameMatch;
          }
          return false;
        }

        // For painting work items, handle Slovak-English subtitle differences
        if (workItem.subtitle && item.subtitle && !Array.isArray(targetName) && targetName.toLowerCase() === WORK_ITEM_NAMES.PAINTING.toLowerCase()) {
          const workSubLower = workItem.subtitle.toLowerCase();
          const itemSubLower = item.subtitle.toLowerCase();

          // Match both Slovak->English and English->English
          if ((workSubLower.includes(WORK_ITEM_SUBTITLES.WALL[1]) && itemSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0])) || // Slovak 'stena' vs English 'wall'
              (workSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0]) && itemSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0])) || // English 'wall' vs English 'wall'
              (workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]) && itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0])) || // Slovak 'strop' vs English 'ceiling'
              (workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) && itemSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]))) { // English 'ceiling' vs English 'ceiling'
            return nameMatch;
          }
          return false;
        }

        return nameMatch;
      });
      
      if (item) return item;
    }
  }
  return null;
};

// Calculate price for a single work item
export const calculateWorkItemPrice = (workItem, priceItem) => {
  if (!workItem.fields || !priceItem) return 0;
  
  let quantity = 0;
  const values = workItem.fields;
  
  // Handle custom work items that have their own price
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    const quantity = parseFloat(values.Quantity || 0);
    const price = parseFloat(values.Price || 0);
    return quantity * price;
  }
  
  // Handle sanitary installations - use price list for work, Price field is for material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    // Always use price list for installation work
    return count * priceItem.price;
  }

  // Handle window installation - work cost based on circumference, Price field is for window material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
    const circumference = parseFloat(values.Circumference || 0);
    // Work cost = circumference * price per meter from price list
    return circumference * priceItem.price;
  }

  // Handle door jamb installation - work cost based on count, Price field is for door jamb material
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    // Work cost = count * price per piece from price list
    return count * priceItem.price;
  }
  
  // Calculate quantity based on work item type and values
  if (values.Width && values.Height) {
    // Area calculation (m²)
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
  } else if (values.Width && values.Length) {
    // Area calculation (m²)
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
  } else if (values.Length) {
    // Linear calculation (m)
    quantity = parseFloat(values.Length || 0);
  } else if (values.Count || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) {
    // Count calculation (pc)
    quantity = parseFloat(values.Count || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || values[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK] || 0);
  } else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) && workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) {
    // Distance calculation for commute (km × days) - must come before Duration check
    const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
    const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
    quantity = distance * (days > 0 ? days : 1);
  } else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK]) {
    // Time calculation (h)
    quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
  } else if (values.Circumference) {
    // Linear calculation for circumference (m)
    quantity = parseFloat(values.Circumference || 0);
  } else if (values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) {
    // Distance calculation (km)
    quantity = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
  } else if (values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
    // For scaffolding rentals - calculate area first, then multiply by duration
    const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
    const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
    if (workItem.subtitle && (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || 
        workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) {
      // For scaffolding, we need both assembly price (per m²) and rental price (per day)
      return area * 30 + (area * 10 * duration); // 30€/m² assembly + 10€/day rental
    }
    quantity = duration; // For other rentals, just use duration
  }
  
  // Subtract openings (doors, windows, etc.) using actual dimensions
  if (workItem.doorWindowItems) {
    // Calculate actual door areas
    if (workItem.doorWindowItems.doors) {
      workItem.doorWindowItems.doors.forEach(door => {
        const doorArea = parseFloat(door.width || 0) * parseFloat(door.height || 0);
        quantity -= doorArea;
      });
    }
    
    // Calculate actual window areas
    if (workItem.doorWindowItems.windows) {
      workItem.doorWindowItems.windows.forEach(window => {
        const windowArea = parseFloat(window.width || 0) * parseFloat(window.height || 0);
        quantity -= windowArea;
      });
    }
  }
  
  // Fallback to old method if no doorWindowItems data
  if (!workItem.doorWindowItems) {
    if (values.Doors) {
      quantity -= parseFloat(values.Doors || 0) * 2; // Subtract door area (2m² per door)
    }
    if (values.Windows) {
      quantity -= parseFloat(values.Windows || 0) * 1.5; // Subtract window area (1.5m² per window)
    }
  }
  
  return Math.max(0, quantity * priceItem.price);
};

// Find matching material from price list
export const findMatchingMaterial = (workItemName, workItemSubtype, priceList) => {
  if (!priceList || !priceList.material) return null;
  
  // Extract base work name by removing type suffixes
  const typeSuffixes = WORK_TYPE_SUFFIXES;
  let baseWorkName = workItemName;
  let extractedType = null;
  
  for (const suffix of typeSuffixes) {
    if (workItemName.endsWith(suffix)) {
      baseWorkName = workItemName.substring(0, workItemName.length - suffix.length);
      extractedType = suffix.trim().toLowerCase();
      break;
    }
  }
  
  // Material mapping based on work item names (both English and Slovak)
  const materialMappings = {
    [WORK_ITEM_NAMES.BRICK_PARTITIONS]: MATERIAL_ITEM_NAMES.PARTITION_MASONRY,
    [WORK_ITEM_NAMES.MUROVANIE_PRIECOK]: MATERIAL_ITEM_NAMES.PARTITION_MASONRY,
    [WORK_ITEM_NAMES.BRICK_LOAD_BEARING_WALL]: MATERIAL_ITEM_NAMES.LOAD_BEARING_MASONRY, 
    [WORK_ITEM_NAMES.MUROVANIE_NOSNEHO_MURIVA]: MATERIAL_ITEM_NAMES.LOAD_BEARING_MASONRY,
    [WORK_ITEM_NAMES.PLASTERBOARDING]: MATERIAL_ITEM_NAMES.PLASTERBOARD,
    [WORK_ITEM_NAMES.SADROKARTON]: MATERIAL_ITEM_NAMES.PLASTERBOARD,
    [WORK_ITEM_NAMES.SADROKARTONARSKE_PRACE]: MATERIAL_ITEM_NAMES.PLASTERBOARD,
    [WORK_ITEM_NAMES.NETTING]: MATERIAL_ITEM_NAMES.MESH,
    [WORK_ITEM_NAMES.SIETKOVANIE]: MATERIAL_ITEM_NAMES.MESH,
    [WORK_ITEM_NAMES.PLASTERING]: MATERIAL_ITEM_NAMES.PLASTER,
    [WORK_ITEM_NAMES.OMIETKA]: MATERIAL_ITEM_NAMES.PLASTER,
    [WORK_ITEM_NAMES.PLASTERING_OF_WINDOW_SASH]: MATERIAL_ITEM_NAMES.PLASTER,
    [WORK_ITEM_NAMES.OMIETKA_SPALETY]: MATERIAL_ITEM_NAMES.PLASTER,
    [WORK_ITEM_NAMES.FACADE_PLASTERING]: MATERIAL_ITEM_NAMES.FACADE_PLASTER,
    [WORK_ITEM_NAMES.FASADNE_OMIETKY]: MATERIAL_ITEM_NAMES.FACADE_PLASTER,
    [WORK_ITEM_NAMES.INSTALLATION_OF_CORNER_BEAD]: MATERIAL_ITEM_NAMES.CORNER_BEAD,
    [WORK_ITEM_NAMES.OSADENIE_ROHOVYCH_LIST]: MATERIAL_ITEM_NAMES.CORNER_BEAD,
    [WORK_ITEM_NAMES.OSADENIE_ROHOVEJ_LISTY]: MATERIAL_ITEM_NAMES.CORNER_BEAD,
    [WORK_ITEM_NAMES.PENETRATION_COATING]: MATERIAL_ITEM_NAMES.PRIMER,
    [WORK_ITEM_NAMES.PENETRACNY_NATER]: MATERIAL_ITEM_NAMES.PRIMER,
    [WORK_ITEM_NAMES.PAINTING]: MATERIAL_ITEM_NAMES.PAINT,
    [WORK_ITEM_NAMES.MALOVANIE]: MATERIAL_ITEM_NAMES.PAINT,
    [WORK_ITEM_NAMES.LEVELLING]: MATERIAL_ITEM_NAMES.SELF_LEVELLING_COMPOUND,
    [WORK_ITEM_NAMES.VYROVNAVANIE]: MATERIAL_ITEM_NAMES.SELF_LEVELLING_COMPOUND,
    [WORK_ITEM_NAMES.NIVELACKA]: MATERIAL_ITEM_NAMES.SELF_LEVELLING_COMPOUND,
    [WORK_ITEM_NAMES.FLOATING_FLOOR]: MATERIAL_ITEM_NAMES.FLOATING_FLOOR,
    [WORK_ITEM_NAMES.PLAVAJUCA_PODLAHA]: MATERIAL_ITEM_NAMES.FLOATING_FLOOR,
    [WORK_ITEM_NAMES.SKIRTING]: MATERIAL_ITEM_NAMES.SKIRTING_BOARD,
    [WORK_ITEM_NAMES.SOKLOVE_LISTY]: MATERIAL_ITEM_NAMES.SKIRTING_BOARD,
    [WORK_ITEM_NAMES.TILING_UNDER_60CM]: MATERIAL_ITEM_NAMES.TILES,
    [WORK_ITEM_NAMES.OBKLAD_DO_60CM]: MATERIAL_ITEM_NAMES.TILES,
    [WORK_ITEM_NAMES.PAVING_UNDER_60CM]: MATERIAL_ITEM_NAMES.PAVINGS,
    [WORK_ITEM_NAMES.DLAZBA_DO_60_CM]: MATERIAL_ITEM_NAMES.PAVINGS,
    [WORK_ITEM_NAMES.SILICONING]: MATERIAL_ITEM_NAMES.SILICONE,
    [WORK_ITEM_NAMES.SILIKONOVANIE]: MATERIAL_ITEM_NAMES.SILICONE,
    [WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK]: MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL,
    [WORK_ITEM_NAMES.POMOCNE_A_UKONCOVACIE_PRACE]: MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL
  };
  
  const materialName = materialMappings[baseWorkName];
  if (!materialName) return null;
  
  // 1. Try to find exact match including subtitle logic
  let material = priceList.material.find(item => {
    const nameMatch = item.name.toLowerCase() === materialName.toLowerCase();
    
    // Check subtitle match if both exist
    if (workItemSubtype && item.subtitle) {
      const workSubLower = workItemSubtype.toLowerCase();
      const materialSubLower = item.subtitle.toLowerCase();
      
      // Direct match
      let subtitleMatch = materialSubLower.includes(workSubLower);
      
      // For paint items, handle Slovak-English subtitle differences
      if (!subtitleMatch && materialName.toLowerCase() === MATERIAL_ITEM_NAMES.PAINT.toLowerCase()) {
        if ((workSubLower.includes(WORK_ITEM_SUBTITLES.WALL[1]) && materialSubLower.includes(WORK_ITEM_SUBTITLES.WALL[0])) ||
            (workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]) && materialSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]))) {
          subtitleMatch = true;
        }
      }
      
      // Handle specific ceiling/strop case for plasterboard
      if (!subtitleMatch && (materialName.toLowerCase() === MATERIAL_ITEM_NAMES.PLASTERBOARD.toLowerCase() || materialName.toLowerCase() === MATERIAL_ITEM_NAMES.SADROKARTON.toLowerCase())) {
        // Check if work is ceiling type and material is ceiling type (in either language)
        const isCeilingWork = workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]);
        const isCeilingMaterial = materialSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || materialSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]);
        if (isCeilingWork && isCeilingMaterial) {
          subtitleMatch = true;
        }
      }

      // For plasterboard and sádrokartón items, handle word order differences and extracted types
      if (!subtitleMatch && (materialName.toLowerCase() === MATERIAL_ITEM_NAMES.PLASTERBOARD.toLowerCase() || materialName.toLowerCase() === MATERIAL_ITEM_NAMES.SADROKARTON.toLowerCase())) {
        // Complex matching logic for plasterboard subtypes
        let subtypeToMatch = workItemSubtype;
        
        if (extractedType) {
          if (subtypeToMatch) {
            const subtypeLower = subtypeToMatch.toLowerCase();
            
            // Handle specific offset wall cases
            if (subtypeLower.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[1]) || subtypeLower.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[0])) {
              if (extractedType === 'simple' || extractedType === 'jednoduchý') {
                if (materialSubLower.includes('jednoduchá predsadená stena') || 
                    materialSubLower.includes('simple, offset wall')) {
                  subtitleMatch = true;
                }
              } else if (extractedType === 'double' || extractedType === 'dvojitý') {
                if (materialSubLower.includes('zdvojená predsadená stena') || 
                    materialSubLower.includes('double, offset wall')) {
                  subtitleMatch = true;
                }
              }
            } 
            // Handle partition cases  
            else if (subtypeLower.includes(WORK_ITEM_SUBTITLES.PARTITION[1]) || subtypeLower.includes(WORK_ITEM_SUBTITLES.PARTITION[0])) {
              const combo1 = `${extractedType}, ${subtypeLower}`;
              const combo2 = `${subtypeLower}, ${extractedType}`;
              
              if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                subtitleMatch = true;
              }
            }
            // Handle offset wall cases (generic)
            else if (subtypeLower.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[1]) || subtypeLower.includes(WORK_ITEM_SUBTITLES.OFFSET_WALL[0])) {
              const combo1 = `${extractedType}, offset wall`;
              const combo2 = `${extractedType}, predsadená stena`;
              
              if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                subtitleMatch = true;
              }
            }
            else {
              const combo1 = `${extractedType}, ${subtypeLower}`;
              const combo2 = `${subtypeLower}, ${extractedType}`;
              
              if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                subtitleMatch = true;
              }
            }
          }
        }
        
        // If still no match, try the original complex matching
        if (!subtitleMatch && workSubLower) {
          const workParts = workSubLower.split(',').map(p => p.trim());
          const materialParts = materialSubLower.split(',').map(p => p.trim());
          
          if (extractedType && !workParts.includes(extractedType)) {
            workParts.push(extractedType);
          }
          
          if (workParts.length <= materialParts.length) {
            subtitleMatch = workParts.every(part => 
              materialParts.some(matPart => 
                matPart.includes(part) || matPart.includes(matPart) ||
                (part.includes('jednoduč') && matPart.includes('simple')) ||
                (part.includes('simple') && matPart.includes('jednoduč')) ||
                (part.includes('dvojit') && matPart.includes('double')) ||
                (part.includes('double') && matPart.includes('dvojit')) ||
                (part.includes('trojit') && matPart.includes('triple')) ||
                (part.includes('triple') && matPart.includes('trojit')) ||
                (part.includes('priečk') && matPart.includes('partition')) ||
                (part.includes('partition') && matPart.includes('priečk')) ||
                (part.includes('predsadená') && matPart.includes('offset')) ||
                (part.includes('offset') && matPart.includes('predsadená')) ||
                (part.includes('stena') && matPart.includes('wall')) ||
                (part.includes('wall') && matPart.includes('stena')) ||
                (part.includes('strop') && matPart.includes('ceiling')) ||
                (part.includes('ceiling') && matPart.includes('strop')) ||
                (part.includes('zdvojen') && matPart.includes('double')) ||
                (part.includes('double') && matPart.includes('zdvojen'))
              )
            );
          }
        }
      }
      
      return nameMatch && subtitleMatch;
    }
    
    // If no exact match with subtitle, just match by name (fallback will happen later if this returns false, wait... no, find returns the first match)
    // Actually, if we are inside the 'if (workItemSubtype)' block, we only want to return TRUE if we found a match.
    // If we return 'nameMatch', we might return true for a name match even if subtitle didn't match, which might be wrong if there are multiple items with same name.
    
    // However, the original logic seemed to rely on nameMatch being strict.
    
    return nameMatch && (workItemSubtype ? (item.subtitle ? false : false) : true); 
    // Wait, the original logic was:
    // return nameMatch && subtitleMatch; 
    // If we are here, it means we checked subtitles.
  });
  
  // 2. Special case: If looking for plasterboard ceiling, also try Sádrokartón with strop
  if (!material && workItemSubtype && materialName.toLowerCase() === MATERIAL_ITEM_NAMES.PLASTERBOARD.toLowerCase()) {
    const workSubLower = workItemSubtype.toLowerCase();
    const isCeilingWork = workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[0]) || workSubLower.includes(WORK_ITEM_SUBTITLES.CEILING[1]);
    if (isCeilingWork) {
      material = priceList.material.find(item => {
        const isSadrokarton = item.name.toLowerCase() === MATERIAL_ITEM_NAMES.SADROKARTON.toLowerCase();
        const isCeilingMaterial = item.subtitle && (item.subtitle.toLowerCase().includes(WORK_ITEM_SUBTITLES.CEILING[0]) || item.subtitle.toLowerCase().includes(WORK_ITEM_SUBTITLES.CEILING[1]));
        return isSadrokarton && isCeilingMaterial;
      });
    }
  }

  // 3. If not found, and we have a subtype, try finding by name only as fallback
  if (!material && workItemSubtype) {
    material = priceList.material.find(item =>
      item.name.toLowerCase() === materialName.toLowerCase()
    );
  }

  return material;
};

// Calculate cost for a specific material based on quantity
export const calculateMaterialCost = (workItem, material, workQuantity) => {
  if (!material || !workQuantity) return 0;
  
  // If material has capacity, calculate based on packages needed
  if (material.capacity) {
    const packagesNeeded = Math.ceil(workQuantity / material.capacity.value);
    return packagesNeeded * material.price;
  }
  
  // Direct calculation for materials priced per unit area/length
  return workQuantity * (material.price || 0);
};

// Comprehensive calculation for a work item including materials and adhesive
export const calculateWorkItemWithMaterials = (
  workItem, 
  priceItem, 
  priceList, 
  totalTilingPavingArea = 0, 
  skipAdhesive = false, 
  totalNettingArea = 0
) => {
  const workCost = calculateWorkItemPrice(workItem, priceItem);
  
  // Calculate work quantity for material calculation
  let quantity = 0;
  const values = workItem.fields;
  
  // Handle sanitary installations - quantity is the count, not area
  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    quantity = parseFloat(values.Count || 0);
  } else if (values.Width && values.Height) {
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
  } else if (values.Width && values.Length) {
    quantity = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
  } else if (values.Length) {
    quantity = parseFloat(values.Length || 0);
  } else if (values.Circumference) {
    quantity = parseFloat(values.Circumference || 0);
  }
  
  // Subtract door/window areas from material quantity too
  if (workItem.doorWindowItems) {
    if (workItem.doorWindowItems.doors) {
      workItem.doorWindowItems.doors.forEach(door => {
        const doorArea = parseFloat(door.width || 0) * parseFloat(door.height || 0);
        quantity -= doorArea;
      });
    }
    if (workItem.doorWindowItems.windows) {
      workItem.doorWindowItems.windows.forEach(window => {
        const windowArea = parseFloat(window.width || 0) * parseFloat(window.height || 0);
        quantity -= windowArea;
      });
    }
  }
  
  quantity = Math.max(0, quantity);
  
  // Initialize materialQuantityToUse with base quantity
  let materialQuantityToUse = quantity;

  // For sanitary installations, use the user-entered Price field as material cost
  let materialCost = 0;
  let material = null;

  if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) {
    const count = parseFloat(values.Count || 0);
    const price = parseFloat(values.Price || 0);
    materialCost = count * price; // User-entered price is for the product/material
  } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) {
    // Window installation: Price field is the cost of the actual window (material)
    const price = parseFloat(values.Price || 0);
    materialCost = price; // Each window item has its own price
  } else if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) {
    // Door jamb installation: Price field is the cost per door jamb (material)
    const count = parseFloat(values.Count || 0);
    const price = parseFloat(values.Price || 0);
    materialCost = count * price; // Count * price per piece
  } else {
    // Find matching material - combine work subtitle and selected type for full context
    const fullSubtype = workItem.subtitle ?
      (workItem.selectedType ? `${workItem.subtitle}, ${workItem.selectedType}` : workItem.subtitle) :
      workItem.selectedType;
    material = findMatchingMaterial(priceItem.name, fullSubtype, priceList);
    
    if (material && workItem.propertyId === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR) {
      materialQuantityToUse = Math.ceil(quantity * 1.1); // Add 10% and round up for floating floor material
    }

    materialCost = material ? calculateMaterialCost(workItem, material, materialQuantityToUse) : 0;
  }
  
  // For tiling and paving works, also add adhesive cost
  let additionalMaterial = null;
  let additionalMaterialCost = 0;
  let additionalMaterialQuantity = 0;

  if (!skipAdhesive && ((priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.TILING.toLowerCase()) || priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.OBKLAD.toLowerCase()) ||
       workItem.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60) ||
      (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.PAVING.toLowerCase()) || priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.DLAZBA.toLowerCase()) ||
       workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60))) {

    // Find the single adhesive item for both tiling and paving
    const adhesive = priceList.material.find(item =>
      item.name.toLowerCase() === MATERIAL_ITEM_NAMES.ADHESIVE.toLowerCase() &&
      item.subtitle && item.subtitle.toLowerCase().includes(MATERIAL_ITEM_SUBTITLES.TILING_PAVING.toLowerCase())
    );

    if (adhesive) {
      additionalMaterial = adhesive;
      // If total area is provided, use it for aggregated calculation; otherwise use individual quantity
      const areaToUse = totalTilingPavingArea > 0 ? totalTilingPavingArea : quantity;
      additionalMaterialQuantity = areaToUse;
      additionalMaterialCost = calculateMaterialCost(workItem, additionalMaterial, areaToUse);
      materialCost += additionalMaterialCost;
    }
  }

  // For netting works, also add adhesive cost
  if (!skipAdhesive && (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.NETTING.toLowerCase()) || priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SIETKOVANIE.toLowerCase()) ||
      workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL || workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING)) {

    // Find the adhesive for netting
    const adhesive = priceList.material.find(item =>
      item.name.toLowerCase() === MATERIAL_ITEM_NAMES.ADHESIVE.toLowerCase() &&
      item.subtitle && item.subtitle.toLowerCase().includes(MATERIAL_ITEM_SUBTITLES.NETTING.toLowerCase())
    );

    if (adhesive) {
      additionalMaterial = adhesive;
      // If total netting area is provided, use it for aggregated calculation; otherwise use individual quantity
      const areaToUse = totalNettingArea > 0 ? totalNettingArea : quantity;
      additionalMaterialQuantity = areaToUse;
      additionalMaterialCost = calculateMaterialCost(workItem, additionalMaterial, areaToUse);
      materialCost += additionalMaterialCost;
    }
  }

  return {
    workCost,
    materialCost,
    material,
    additionalMaterial,
    additionalMaterialQuantity,
    quantity,
    materialQuantity: materialQuantityToUse // Return the specific material quantity used
  };
};

// Enhanced room calculation with materials
export const calculateRoomPriceWithMaterials = (room, priceList) => {
  if (!room.workItems || room.workItems.length === 0) return {
    workTotal: 0,
    materialTotal: 0,
    othersTotal: 0,
    total: 0,
    items: [],
    materialItems: [],
    othersItems: [],
    baseWorkTotal: 0,
    baseMaterialTotal: 0,
    auxiliaryWorkCost: 0,
    auxiliaryMaterialCost: 0
  };
  
  // Use provided price list (mandatory for this utility)
  const activePriceList = priceList;
  if (!activePriceList) return {
    workTotal: 0, materialTotal: 0, othersTotal: 0, total: 0, items: [], materialItems: [], othersItems: [],
    baseWorkTotal: 0, baseMaterialTotal: 0, auxiliaryWorkCost: 0, auxiliaryMaterialCost: 0
  };

  let workTotal = 0;
  let materialTotal = 0;
  let othersTotal = 0;
  const items = [];
  const materialItems = [];
  const othersItems = [];
  
  // Pre-calculate total area for tiling and paving to optimize adhesive calculation
  let totalTilingPavingArea = 0;
  let tilingPavingAdhesiveAdded = false;
  let totalNettingArea = 0;
  let nettingAdhesiveAdded = false;
  // Track non-large-format tiling/paving area for grouting calculation
  let totalGroutingArea = 0;
  // Track floating floor perimeter for skirting calculation
  let totalFloatingFloorPerimeter = 0;

  room.workItems.forEach(workItem => {
    const priceItem = findPriceListItem(workItem, activePriceList);
    if (priceItem && workItem.fields) {
      const isTilingOrPaving = (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.TILING.toLowerCase()) ||
                                 priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.OBKLAD.toLowerCase()) ||
                                 workItem.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60) ||
                                (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.PAVING.toLowerCase()) ||
                                 priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.DLAZBA.toLowerCase()) ||
                                 workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60);
      const isNetting = priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.NETTING.toLowerCase()) ||
                        priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SIETKOVANIE.toLowerCase()) ||
                        workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL ||
                        workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING;
      const isFloatingFloor = priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.FLOATING_FLOOR.toLowerCase()) ||
                              priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.PLAVAJUCA_PODLAHA.toLowerCase()) ||
                              workItem.propertyId === WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR;
                              
      const isLargeFormat = isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD];

      if (isTilingOrPaving) {
        const values = workItem.fields;
        let area = 0;
        if (values.Width && values.Length) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
        } else if (values.Width && values.Height) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
        }
        totalTilingPavingArea += area;
        // Only add to grouting area if NOT large format
        if (!isLargeFormat) {
          totalGroutingArea += area;
        }
      }

      if (isNetting) {
        const values = workItem.fields;
        let area = 0;
        if (values.Width && values.Length) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
        } else if (values.Width && values.Height) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
        }
        totalNettingArea += area;
      }
      
      if (isFloatingFloor) {
        const values = workItem.fields;
        let perimeter = 0;
        if (values.Width && values.Length) {
          perimeter = (parseFloat(values.Width || 0) + parseFloat(values.Length || 0)) * 2;
        } else if (values.Width && values.Height) {
          perimeter = (parseFloat(values.Width || 0) + parseFloat(values.Height || 0)) * 2;
        } else if (values.Circumference) {
          perimeter = parseFloat(values.Circumference || 0);
        }
        
        // Subtract door widths from perimeter if doors are defined?
        // Usually skirting is not installed under doors. 
        // Logic: perimeter - (doors * door_width)
        // For simplicity, using simple perimeter for now as per instructions "2+2+5+5 thats 14".
        
        totalFloatingFloorPerimeter += perimeter;
      }
    }
  });

  room.workItems.forEach(workItem => {
    const priceItem = findPriceListItem(workItem, activePriceList);

    if (priceItem && workItem.fields) {
      // Special handling for scaffolding - show as two separate items
      const isScaffolding = (workItem.subtitle && (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || 
          workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
          (workItem.name && (workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
          (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.RENTALS && workItem.name && (workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase())));
          
      if (isScaffolding) {
        const values = workItem.fields;
        const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
        const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
        
        // Assembly cost (€30/m²)
        const assemblyCost = area * 30;
        const assemblyCalculation = {
          workCost: assemblyCost,
          materialCost: 0,
          quantity: area
        };
        
        othersItems.push({
          ...workItem,
          subtitle: workItem.subtitle + ' - montáž a demontáž',
          calculation: assemblyCalculation
        });
        
        // Daily rental cost (€10/day per m²)
        const rentalCost = area * 10 * duration;
        const rentalCalculation = {
          workCost: rentalCost,
          materialCost: 0,
          quantity: area * duration
        };
        
        othersItems.push({
          ...workItem,
          id: workItem.id + '_rental',
          subtitle: workItem.subtitle + ' - prenájom',
          fields: {
            ...workItem.fields,
            [WORK_ITEM_NAMES.RENTAL_DURATION]: duration
          },
          calculation: rentalCalculation
        });
        
        othersTotal += assemblyCost + rentalCost;
      } else {
        // Check if this is an "Others" category item
        const isOthersItem = workItem.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK || 
                            workItem.propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE ||
                            workItem.propertyId === WORK_ITEM_PROPERTY_IDS.RENTALS ||
                            (workItem.subtitle && (workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase()) || 
                             workItem.subtitle.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_SK.toLowerCase()))) ||
                            (workItem.name && workItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SCAFFOLDING_EN.toLowerCase())) ||
                            (priceItem && (
                              priceItem.name === WORK_ITEM_NAMES.CUSTOM_WORK_AND_MATERIAL ||
                              priceItem.name === WORK_ITEM_NAMES.JOURNEY ||
                              priceItem.name === WORK_ITEM_NAMES.COMMUTE ||
                              priceItem.name === WORK_ITEM_NAMES.TOOL_RENTAL ||
                              priceItem.name === WORK_ITEM_NAMES.CORE_DRILL
                            ));
        
        if (isOthersItem) {
          const calculation = calculateWorkItemWithMaterials(workItem, priceItem, activePriceList);
          othersTotal += calculation.workCost;
          
          othersItems.push({
            ...workItem,
            calculation
          });
        } else {
          // Normal calculation for work/material items
          // Check if this is a tiling/paving item for adhesive aggregation
          const isTilingOrPaving = (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.TILING.toLowerCase()) ||
                                     priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.OBKLAD.toLowerCase()) ||
                                     workItem.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60) ||
                                    (priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.PAVING.toLowerCase()) ||
                                     priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.DLAZBA.toLowerCase()) ||
                                     workItem.propertyId === WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60);
          const isNetting = priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.NETTING.toLowerCase()) ||
                            priceItem.name.toLowerCase().includes(WORK_ITEM_NAMES.SIETKOVANIE.toLowerCase()) ||
                            workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_WALL ||
                            workItem.propertyId === WORK_ITEM_PROPERTY_IDS.NETTING_CEILING;

          // Check if Large Format toggle is enabled for tiling/paving
          let effectivePriceItem = priceItem;
          if (isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD]) {
            // Find the Large Format price item
            const largeFormatItem = activePriceList.work.find(item =>
              item.name === WORK_ITEM_NAMES.LARGE_FORMAT && item.subtitle === WORK_ITEM_NAMES.ABOVE_60CM
            );
            if (largeFormatItem) {
              effectivePriceItem = largeFormatItem;
            }
          }

          // Only add adhesive for the first tiling/paving or netting item
          // Skip adhesive entirely if Large Format is enabled (no materials for large format)
          const isLargeFormat = isTilingOrPaving && workItem.fields[WORK_ITEM_NAMES.LARGE_FORMAT_ABOVE_60CM_FIELD];
          const skipTilingPavingAdhesive = isTilingOrPaving && (tilingPavingAdhesiveAdded || isLargeFormat);
          const skipNettingAdhesive = isNetting && nettingAdhesiveAdded;
          const skipAdhesive = skipTilingPavingAdhesive || skipNettingAdhesive;

          const calculation = calculateWorkItemWithMaterials(
            workItem,
            effectivePriceItem,
            activePriceList,
            totalTilingPavingArea,
            skipAdhesive,
            totalNettingArea
          );

          if (isTilingOrPaving && !tilingPavingAdhesiveAdded) {
            tilingPavingAdhesiveAdded = true;
          }
          if (isNetting && !nettingAdhesiveAdded) {
            nettingAdhesiveAdded = true;
          }

          workTotal += calculation.workCost;
          materialTotal += calculation.materialCost;

          items.push({
            ...workItem,
            calculation
          });

          // Track materials as separate items
          if (calculation.material) {
            const materialUnit = calculation.material.unit || UNIT_TYPES.METER_SQUARE;
            const materialPrice = calculation.material.price || 0;
            const materialQuantity = calculation.materialQuantity || calculation.quantity || 0;
            let materialCostForItem = 0;

            if (calculation.material.capacity) {
              const capacityValue = calculation.material.capacity.value || calculation.material.capacity;
              const packagesNeeded = Math.ceil(materialQuantity / capacityValue);
              materialCostForItem = packagesNeeded * materialPrice;
            } else {
              materialCostForItem = materialQuantity * materialPrice;
            }

            materialItems.push({
              id: `${workItem.id}_material`,
              name: calculation.material.name,
              subtitle: calculation.material.subtitle || '',
              calculation: {
                quantity: materialQuantity,
                materialCost: materialCostForItem,
                pricePerUnit: materialPrice,
                unit: materialUnit
              }
            });
          }

          // Track window installation materials (Okná)
          if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION && calculation.materialCost > 0) {
            const price = parseFloat(workItem.fields?.Price || 0);
            // Each window item is 1 piece
            materialItems.push({
              id: `${workItem.id}_window_material`,
              name: WORK_ITEM_NAMES.OKNA_DISPLAY_NAME,
              subtitle: '',
              propertyId: WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION,
              calculation: {
                quantity: 1,
                materialCost: price,
                pricePerUnit: price,
                unit: UNIT_TYPES.PIECE
              }
            });
          }

          // Track door jamb installation materials (Zárubne)
          if (workItem.propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION && calculation.materialCost > 0) {
            const count = parseFloat(workItem.fields?.Count || 0);
            const price = parseFloat(workItem.fields?.Price || 0);
            materialItems.push({
              id: `${workItem.id}_doorjamb_material`,
              name: WORK_ITEM_NAMES.ZARUBNA_DISPLAY_NAME,
              subtitle: '',
              propertyId: WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION,
              calculation: {
                quantity: count,
                materialCost: count * price,
                pricePerUnit: price,
                unit: UNIT_TYPES.PIECE
              }
            });
          }

          // Track additional materials (adhesive)
          if (calculation.additionalMaterial && calculation.additionalMaterialQuantity > 0) {
            const adhesiveUnit = calculation.additionalMaterial.unit || UNIT_TYPES.PACKAGE;
            const adhesivePrice = calculation.additionalMaterial.price || 0;
            const adhesiveQuantity = calculation.additionalMaterialQuantity;
            let adhesiveCost = 0;

            if (calculation.additionalMaterial.capacity) {
              const capacityValue = calculation.additionalMaterial.capacity.value || calculation.additionalMaterial.capacity;
              const packagesNeeded = Math.ceil(adhesiveQuantity / capacityValue);
              adhesiveCost = packagesNeeded * adhesivePrice;
            } else {
              adhesiveCost = adhesiveQuantity * adhesivePrice;
            }

            const adhesiveName = calculation.additionalMaterial.name;
            const adhesiveSubtitle = calculation.additionalMaterial.subtitle || '';
            const existingAdhesive = materialItems.find(item =>
              item.name === adhesiveName && item.subtitle === adhesiveSubtitle
            );

            if (!existingAdhesive) {
              materialItems.push({
                id: `${workItem.id}_adhesive`,
                name: adhesiveName,
                subtitle: adhesiveSubtitle,
                calculation: {
                  quantity: adhesiveQuantity,
                  materialCost: adhesiveCost,
                  pricePerUnit: adhesivePrice,
                  unit: adhesiveUnit
                }
              });
            }
          }

          // Handle additional fields
          if (workItem.fields) {
            const jollyEdgingValue = workItem.fields[WORK_ITEM_NAMES.JOLLY_EDGING_FIELD];
            if (jollyEdgingValue && jollyEdgingValue > 0) {
              const jollyEdgingPrice = activePriceList.work.find(item => item.name === WORK_ITEM_NAMES.JOLLY_EDGING);
              if (jollyEdgingPrice) {
                const jollyEdgingCost = jollyEdgingValue * jollyEdgingPrice.price;
                workTotal += jollyEdgingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_jolly`,
                  name: WORK_ITEM_NAMES.JOLLY_EDGING,
                  calculation: {
                    workCost: jollyEdgingCost,
                    materialCost: 0,
                    quantity: jollyEdgingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }

            const plinthCuttingValue = workItem.fields[WORK_ITEM_NAMES.PLINTH_CUTTING_AND_GRINDING_FIELD];
            if (plinthCuttingValue && plinthCuttingValue > 0) {
              const plinthCuttingPrice = activePriceList.work.find(item =>
                item.name === WORK_ITEM_NAMES.PLINTH && item.subtitle === WORK_ITEM_NAMES.CUTTING_AND_GRINDING
              );
              if (plinthCuttingPrice) {
                const plinthCuttingCost = plinthCuttingValue * plinthCuttingPrice.price;
                workTotal += plinthCuttingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_cutting`,
                  name: WORK_ITEM_NAMES.PLINTH,
                  subtitle: WORK_ITEM_NAMES.CUTTING_AND_GRINDING,
                  calculation: {
                    workCost: plinthCuttingCost,
                    materialCost: 0,
                    quantity: plinthCuttingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }

            const plinthBondingValue = workItem.fields[WORK_ITEM_NAMES.PLINTH_BONDING_FIELD];
            if (plinthBondingValue && plinthBondingValue > 0) {
              const plinthBondingPrice = activePriceList.work.find(item =>
                item.name === WORK_ITEM_NAMES.PLINTH && item.subtitle === WORK_ITEM_NAMES.BONDING
              );
              if (plinthBondingPrice) {
                const plinthBondingCost = plinthBondingValue * plinthBondingPrice.price;
                workTotal += plinthBondingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_bonding`,
                  name: WORK_ITEM_NAMES.PLINTH,
                  subtitle: WORK_ITEM_NAMES.BONDING,
                  calculation: {
                    workCost: plinthBondingCost,
                    materialCost: 0,
                    quantity: plinthBondingValue,
                    unit: UNIT_TYPES.METER
                  }
                });
              }
            }
          }
        }
      }
    }
  });

  // Add grouting work for non-large-format tiling/paving
  if (totalGroutingArea > 0) {
    const groutingPriceItem = activePriceList.work.find(item =>
      item.name === WORK_ITEM_NAMES.GROUTING
    );
    if (groutingPriceItem) {
      const groutingCost = totalGroutingArea * groutingPriceItem.price;
      workTotal += groutingCost;
      items.push({
        id: 'grouting_work',
        name: WORK_ITEM_NAMES.GROUTING,
        subtitle: groutingPriceItem.subtitle || '',
        propertyId: WORK_ITEM_PROPERTY_IDS.GROUTING,
        calculation: {
          workCost: groutingCost,
          materialCost: 0,
          quantity: totalGroutingArea,
          unit: UNIT_TYPES.METER_SQUARE
        }
      });
    }
  }
  
  // Add Skirting (Lištovanie) work and material for Floating Floor
  if (totalFloatingFloorPerimeter > 0) {
    // 1. Skirting Work (Lištovanie)
    let skirtingWorkItem = activePriceList.work.find(item => 
      item.name === WORK_ITEM_NAMES.SKIRTING // Matches 'Lištovanie'
    );
    
    // Fallback for old projects/snapshots that still have 'Skirting'
    if (!skirtingWorkItem) {
      skirtingWorkItem = activePriceList.work.find(item => item.name === 'Skirting');
    }
    
    if (skirtingWorkItem) {
      const skirtingWorkCost = totalFloatingFloorPerimeter * skirtingWorkItem.price;
      workTotal += skirtingWorkCost;
      
      items.push({
        id: 'skirting_work',
        name: WORK_ITEM_NAMES.SKIRTING, // Force 'Lištovanie' regardless of what was found
        subtitle: skirtingWorkItem.subtitle || '',
        propertyId: 'skirting_work_auto', // Virtual property ID
        calculation: {
          workCost: skirtingWorkCost,
          materialCost: 0,
          quantity: totalFloatingFloorPerimeter,
          unit: UNIT_TYPES.METER
        }
      });
    }
    
    // 2. Skirting Board Material (Soklové lišty)
    let skirtingMaterialItem = activePriceList.material.find(item => 
      item.name === MATERIAL_ITEM_NAMES.SKIRTING_BOARD // Matches 'Soklové lišty'
    );
    
    // Fallback for old projects/snapshots that still have 'Skirting board'
    if (!skirtingMaterialItem) {
      skirtingMaterialItem = activePriceList.material.find(item => item.name === 'Skirting board');
    }
    
    if (skirtingMaterialItem) {
      let skirtingMaterialCost = 0;
      // Handle capacity if defined (though usually skirting is per meter)
      if (skirtingMaterialItem.capacity) {
        const packagesNeeded = Math.ceil(totalFloatingFloorPerimeter / skirtingMaterialItem.capacity.value);
        skirtingMaterialCost = packagesNeeded * skirtingMaterialItem.price;
      } else {
        skirtingMaterialCost = totalFloatingFloorPerimeter * skirtingMaterialItem.price;
      }
      
      materialTotal += skirtingMaterialCost;
      
      materialItems.push({
        id: 'skirting_material',
        name: MATERIAL_ITEM_NAMES.SKIRTING_BOARD, // Force 'Soklové lišty' regardless of what was found
        subtitle: skirtingMaterialItem.subtitle || '',
        calculation: {
          quantity: totalFloatingFloorPerimeter,
          materialCost: skirtingMaterialCost,
          pricePerUnit: skirtingMaterialItem.price,
          unit: UNIT_TYPES.METER
        }
      });
    }
  }

  // Calculate auxiliary costs based on price list values
  const auxiliaryWorkItem = activePriceList.work.find(item => item.name === WORK_ITEM_NAMES.AUXILIARY_AND_FINISHING_WORK);
  const auxiliaryWorkRate = auxiliaryWorkItem ? auxiliaryWorkItem.price / 100 : 0.10; // Default to 10% if not found
  const auxiliaryWorkCost = workTotal * auxiliaryWorkRate;

  const auxiliaryMaterialItem = activePriceList.material.find(item => item.name === MATERIAL_ITEM_NAMES.AUXILIARY_AND_FASTENING_MATERIAL);
  const auxiliaryMaterialRate = auxiliaryMaterialItem ? auxiliaryMaterialItem.price / 100 : 0.10; // Default to 10% if not found
  const auxiliaryMaterialCost = materialTotal * auxiliaryMaterialRate;
  
  const finalWorkTotal = workTotal + auxiliaryWorkCost;
  const finalMaterialTotal = materialTotal + auxiliaryMaterialCost;
  
  return {
    workTotal: finalWorkTotal,
    materialTotal: finalMaterialTotal,
    othersTotal,
    total: finalWorkTotal + finalMaterialTotal + othersTotal,
    baseWorkTotal: workTotal,
    baseMaterialTotal: materialTotal,
    auxiliaryWorkCost,
    auxiliaryMaterialCost,
    auxiliaryWorkRate,     // Return the rate used
    auxiliaryMaterialRate, // Return the rate used
    items,
    materialItems,
    othersItems
  };
};

export const calculateRoomPrice = (room, priceList) => {
  const calculation = calculateRoomPriceWithMaterials(room, priceList);
  return calculation.total;
};