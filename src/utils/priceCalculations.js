
// Helper to format price string
export const formatPrice = (price) => {
  return `€${price.toFixed(2).replace('.', ',')}`;
};

// Find matching price list item for a work item
export const findPriceListItem = (workItem, priceList) => {
  if (!workItem || !workItem.propertyId || !priceList) return null;
  
  // Create mapping from work item IDs to price list items
  const workIdMappings = {
    'preparatory': 'Preparatory and demolition works',
    'wiring': 'Wiring',
    'plumbing': 'Plumbing',
    'brick_partitions': 'Brick partitions',
    'brick_load_bearing': 'Brick load-bearing wall',
    'plasterboarding_partition': 'Plasterboarding',
    'plasterboarding_offset': 'Plasterboarding',
    'plasterboarding_ceiling': 'Plasterboarding',
    'netting_wall': 'Netting',
    'netting_ceiling': 'Netting',
    'plastering_wall': 'Plastering',
    'plastering_ceiling': 'Plastering',
    'facade_plastering': 'Facade Plastering',
    'corner_bead': 'Installation of corner bead',
    'window_sash': 'Plastering of window sash',
    'penetration_coating': 'Penetration coating',
    'painting_wall': 'Painting',
    'painting_ceiling': 'Painting',
    'levelling': 'Levelling',
    'floating_floor': 'Floating floor',
    'tiling_under_60': 'Tiling under 60cm',
    'paving_under_60': 'Paving under 60cm',
    'grouting': 'Grouting',
    'siliconing': 'Siliconing',
    'sanitary_installation': 'Sanitary installations',
    'window_installation': 'Window installation',
    'door_jamb_installation': 'Installation of door jamb',
    'custom_work': 'Custom work and material',
    'commute': 'Commute',
    'rentals': 'Tool rental' // This will be handled specially for different rental types
  };

  // For rental items, use the actual rental item name instead of generic mapping
  let targetName;
  if (workItem.propertyId === 'rentals' && workItem.name) {
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
        const nameMatch = item.name.toLowerCase().includes(targetName.toLowerCase());

        // For items with subtypes (like plasterboarding), check subtitle too
        if (workItem.selectedType && item.subtitle) {
          const subtitleMatch = item.subtitle.toLowerCase().includes(workItem.selectedType.toLowerCase());
          
          // For plasterboarding, check both the work subtype (partition/offset wall/ceiling) and type (simple/double)
          if (nameMatch && targetName.toLowerCase() === 'plasterboarding' && workItem.subtitle) {
            const workSubtitle = workItem.subtitle.toLowerCase();
            const itemSubtitle = item.subtitle.toLowerCase();
            const workType = workItem.selectedType ? workItem.selectedType.toLowerCase() : '';
            
            // Check if the item subtitle contains both the work subtype and the selected type
            const subtypeMatch = (
              (workSubtitle.includes('partition') && itemSubtitle.includes('partition')) ||
              (workSubtitle.includes('offset wall') && itemSubtitle.includes('offset wall')) ||
              (workSubtitle.includes('ceiling') && itemSubtitle.includes('ceiling'))
            );
            
            // For ceiling, no type match needed since it's just "ceiling" not "ceiling, simple"
            const typeMatch = workSubtitle.includes('ceiling') ? true : (!workType || itemSubtitle.includes(workType));
            
            return subtypeMatch && typeMatch;
          }
          
          return nameMatch && subtitleMatch;
        }
        
        // For sanitary installations, match subtitle (the actual type like "Concealed toilet")
        if (workItem.subtitle && item.subtitle && targetName.toLowerCase() === 'sanitary installations') {
          const workSubLower = workItem.subtitle.toLowerCase();
          const itemSubLower = item.subtitle.toLowerCase();

          if (workSubLower === itemSubLower) {
            return nameMatch;
          }
          return false;
        }

        // For painting work items, handle Slovak-English subtitle differences
        if (workItem.subtitle && item.subtitle && targetName.toLowerCase() === 'painting') {
          const workSubLower = workItem.subtitle.toLowerCase();
          const itemSubLower = item.subtitle.toLowerCase();

          // Match both Slovak->English and English->English
          if ((workSubLower.includes('stena') && itemSubLower.includes('wall')) ||
              (workSubLower.includes('wall') && itemSubLower.includes('wall')) ||
              (workSubLower.includes('strop') && itemSubLower.includes('ceiling')) ||
              (workSubLower.includes('ceiling') && itemSubLower.includes('ceiling'))) {
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
  if (workItem.propertyId === 'custom_work') {
    const quantity = parseFloat(values.Quantity || 0);
    const price = parseFloat(values.Price || 0);
    return quantity * price;
  }
  
  // Handle sanitary installations - use price list for work, Price field is for material
  if (workItem.propertyId === 'sanitary_installation') {
    const count = parseFloat(values.Count || 0);
    // Always use price list for installation work
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
  } else if (values.Count || values['Number of outlets'] || values['Počet vývodov']) {
    // Count calculation (pc)
    quantity = parseFloat(values.Count || values['Number of outlets'] || values['Počet vývodov'] || 0);
  } else if ((values.Distance || values.Vzdialenosť) && workItem.propertyId === 'commute') {
    // Distance calculation for commute (km × days) - must come before Duration check
    const distance = parseFloat(values.Distance || values.Vzdialenosť || 0);
    const days = parseFloat(values.Duration || values.Trvanie || 0);
    quantity = distance * (days > 0 ? days : 1);
  } else if (values.Duration || values.Trvanie) {
    // Time calculation (h)
    quantity = parseFloat(values.Duration || values.Trvanie || 0);
  } else if (values.Circumference) {
    // Linear calculation for circumference (m)
    quantity = parseFloat(values.Circumference || 0);
  } else if (values.Distance || values.Vzdialenosť) {
    // Distance calculation (km)
    quantity = parseFloat(values.Distance || values.Vzdialenosť || 0);
  } else if (values['Rental duration']) {
    // For scaffolding rentals - calculate area first, then multiply by duration
    const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
    const duration = parseFloat(values['Rental duration'] || 0);
    if (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') || 
        workItem.subtitle.toLowerCase().includes('lešenie'))) {
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
  
  // Extract base work name by removing type suffixes (Simple, Double, Triple, etc.)
  const typeSuffixes = [' Simple', ' Double', ' Triple', ' jednoduchý', ' dvojitý', ' trojitý'];
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
    'Brick partitions': 'Partition masonry',
    'Murovanie priečok': 'Partition masonry',
    'Brick load-bearing wall': 'Load-bearing masonry', 
    'Murovanie nosného muriva': 'Load-bearing masonry',
    'Plasterboarding': 'Plasterboard',
    'Sádrokartón': 'Plasterboard',
    'Sadrokartonárske práce': 'Plasterboard',
    'Netting': 'Mesh',
    'Sieťkovanie': 'Mesh',
    'Plastering': 'Plaster',
    'Omietka': 'Plaster',
    'Plastering of window sash': 'Plaster',
    'Omietka špalety': 'Plaster',
    'Facade Plastering': 'Facade Plaster',
    'Fasádne omietky': 'Facade Plaster',
    'Installation of corner bead': 'Corner bead',
    'Osadenie rohových lišt': 'Corner bead',
    'Osadenie rohovej lišty': 'Corner bead',
    'Penetration coating': 'Primer',
    'Penetračný náter': 'Primer',
    'Painting': 'Paint',
    'Maľovanie': 'Paint',
    'Levelling': 'Self-levelling compound',
    'Vyrovnávanie': 'Self-levelling compound',
    'Nivelačka': 'Self-levelling compound',
    'Floating floor': 'Floating floor',
    'Plávajúca podlaha': 'Floating floor',
    'Skirting': 'Skirting board',
    'Soklové lišty': 'Skirting board',
    'Tiling under 60cm': 'Tiles',
    'Obklad do 60cm': 'Tiles',
    'Paving under 60cm': 'Pavings',
    'Dlažba do 60 cm': 'Pavings',
    'Siliconing': 'Silicone',
    'Silikónovanie': 'Silicone',
    'Auxiliary and finishing work': 'Auxiliary and fastening material',
    'Pomocné a ukončovacie práce': 'Auxiliary and fastening material'
  };
  
  const materialName = materialMappings[baseWorkName];
  if (!materialName) return null;
  
  
  // Find material with exact name match
  let material = priceList.material.find(item => {
    const nameMatch = item.name.toLowerCase() === materialName.toLowerCase();
    
    
    // Check subtitle match if both exist
    if (workItemSubtype && item.subtitle) {
      const workSubLower = workItemSubtype.toLowerCase();
      const materialSubLower = item.subtitle.toLowerCase();
      
      // Direct match
      let subtitleMatch = materialSubLower.includes(workSubLower);
      
      // For paint items, handle Slovak-English subtitle differences
      if (!subtitleMatch && materialName.toLowerCase() === 'paint') {
        const workSubLower = workItemSubtype.toLowerCase();
        
        if (workSubLower.includes('stena') && materialSubLower.includes('wall')) {
          subtitleMatch = true;
        } else if (workSubLower.includes('strop') && materialSubLower.includes('ceiling')) {
          subtitleMatch = true;
        }
      }
      
      // Handle specific ceiling/strop case for plasterboard
      if (!subtitleMatch && (materialName.toLowerCase() === 'plasterboard' || materialName.toLowerCase() === 'sádrokartón')) {
        if ((workSubLower.includes('ceiling') && materialSubLower.includes('strop')) ||
            (workSubLower.includes('strop') && materialSubLower.includes('ceiling')) ||
            (workSubLower.includes('strop') && materialSubLower.includes('strop'))) {
          subtitleMatch = true;
        }
      }

      // For plasterboard and sádrokartón items, handle word order differences and extracted types
      if (!subtitleMatch && (materialName.toLowerCase() === 'plasterboard' || materialName.toLowerCase() === 'sádrokartón')) {
        let subtypeToMatch = workItemSubtype;
        
        if (extractedType) {
          if (subtypeToMatch) {
            const subtypeLower = subtypeToMatch.toLowerCase();
            
            // Handle specific offset wall cases
            if (subtypeLower.includes('predsadená stena') || subtypeLower.includes('offset wall')) {
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
            else if (subtypeLower.includes('priečka') || subtypeLower.includes('partition')) {
              const combo1 = `${extractedType}, ${subtypeLower}`;
              const combo2 = `${subtypeLower}, ${extractedType}`;
              
              if (materialSubLower.includes(combo1) || materialSubLower.includes(combo2)) {
                subtitleMatch = true;
              }
            }
            // Handle offset wall cases (generic)
            else if (subtypeLower.includes('predsadená stena') || subtypeLower.includes('offset wall')) {
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
                matPart.includes(part) || part.includes(matPart) ||
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
    
    // If no subtitle on either side, just match by name
    return nameMatch;
  });
  
  // If no exact match with subtitle, try without subtitle
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
  return workQuantity * material.price;
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
  if (workItem.propertyId === 'sanitary_installation') {
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
  
  // For sanitary installations, use the user-entered Price field as material cost
  let materialCost = 0;
  let material = null;

  if (workItem.propertyId === 'sanitary_installation') {
    const count = parseFloat(values.Count || 0);
    const price = parseFloat(values.Price || 0);
    materialCost = count * price; // User-entered price is for the product/material
  } else {
    // Find matching material - combine work subtitle and selected type for full context
    const fullSubtype = workItem.subtitle ?
      (workItem.selectedType ? `${workItem.subtitle}, ${workItem.selectedType}` : workItem.subtitle) :
      workItem.selectedType;
    material = findMatchingMaterial(priceItem.name, fullSubtype, priceList);
    materialCost = material ? calculateMaterialCost(workItem, material, quantity) : 0;
  }
  
  // For tiling and paving works, also add adhesive cost
  let additionalMaterial = null;
  let additionalMaterialCost = 0;
  let additionalMaterialQuantity = 0;

  if (!skipAdhesive && ((priceItem.name.toLowerCase().includes('tiling') || priceItem.name.toLowerCase().includes('obklad') ||
       workItem.propertyId === 'tiling_under_60') ||
      (priceItem.name.toLowerCase().includes('paving') || priceItem.name.toLowerCase().includes('dlažba') ||
       workItem.propertyId === 'paving_under_60'))) {

    // Find the single adhesive item for both tiling and paving
    const adhesive = priceList.material.find(item =>
      item.name.toLowerCase() === 'adhesive' &&
      item.subtitle && item.subtitle.toLowerCase().includes('tiling and paving')
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
  if (!skipAdhesive && (priceItem.name.toLowerCase().includes('netting') || priceItem.name.toLowerCase().includes('sieťkovanie') ||
      workItem.propertyId === 'netting_wall' || workItem.propertyId === 'netting_ceiling')) {

    // Find the adhesive for netting
    const adhesive = priceList.material.find(item =>
      item.name.toLowerCase() === 'adhesive' &&
      item.subtitle && item.subtitle.toLowerCase().includes('netting')
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
    quantity
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

  room.workItems.forEach(workItem => {
    const priceItem = findPriceListItem(workItem, activePriceList);
    if (priceItem && workItem.fields) {
      const isTilingOrPaving = (priceItem.name.toLowerCase().includes('tiling') ||
                                 priceItem.name.toLowerCase().includes('obklad') ||
                                 workItem.propertyId === 'tiling_under_60') ||
                                (priceItem.name.toLowerCase().includes('paving') ||
                                 priceItem.name.toLowerCase().includes('dlažba') ||
                                 workItem.propertyId === 'paving_under_60');
      const isNetting = priceItem.name.toLowerCase().includes('netting') ||
                        priceItem.name.toLowerCase().includes('sieťkovanie') ||
                        workItem.propertyId === 'netting_wall' ||
                        workItem.propertyId === 'netting_ceiling';

      if (isTilingOrPaving) {
        const values = workItem.fields;
        let area = 0;
        if (values.Width && values.Length) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Length || 0);
        } else if (values.Width && values.Height) {
          area = parseFloat(values.Width || 0) * parseFloat(values.Height || 0);
        }
        totalTilingPavingArea += area;
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
    }
  });

  room.workItems.forEach(workItem => {
    const priceItem = findPriceListItem(workItem, activePriceList);

    if (priceItem && workItem.fields) {
      // Special handling for scaffolding - show as two separate items
      const isScaffolding = (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') ||
          workItem.subtitle.toLowerCase().includes('lešenie'))) ||
          (workItem.name && (workItem.name.toLowerCase().includes('lešenie') || workItem.name.toLowerCase().includes('scaffolding'))) ||
          (workItem.propertyId === 'rentals' && workItem.name && (workItem.name.toLowerCase().includes('lešenie') || workItem.name.toLowerCase().includes('scaffolding')));
          
      if (isScaffolding) {
        const values = workItem.fields;
        const area = parseFloat(values.Length || 0) * parseFloat(values.Height || 0);
        const duration = parseFloat(values['Rental duration'] || 0);
        
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
            'Rental duration': duration
          },
          calculation: rentalCalculation
        });
        
        othersTotal += assemblyCost + rentalCost;
      } else {
        // Check if this is an "Others" category item
        const isOthersItem = workItem.propertyId === 'custom_work' || 
                            workItem.propertyId === 'commute' ||
                            workItem.propertyId === 'rentals' ||
                            (workItem.subtitle && (workItem.subtitle.toLowerCase().includes('scaffolding') || 
                             workItem.subtitle.toLowerCase().includes('lešenie'))) ||
                            (workItem.name && workItem.name.toLowerCase().includes('lešenie')) ||
                            (priceItem && (
                              priceItem.name === 'Custom work and material' ||
                              priceItem.name === 'Journey' ||
                              priceItem.name === 'Commute' ||
                              priceItem.name === 'Tool rental' ||
                              priceItem.name === 'Core Drill'
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
          const isTilingOrPaving = (priceItem.name.toLowerCase().includes('tiling') ||
                                     priceItem.name.toLowerCase().includes('obklad') ||
                                     workItem.propertyId === 'tiling_under_60') ||
                                    (priceItem.name.toLowerCase().includes('paving') ||
                                     priceItem.name.toLowerCase().includes('dlažba') ||
                                     workItem.propertyId === 'paving_under_60');
          const isNetting = priceItem.name.toLowerCase().includes('netting') ||
                            priceItem.name.toLowerCase().includes('sieťkovanie') ||
                            workItem.propertyId === 'netting_wall' ||
                            workItem.propertyId === 'netting_ceiling';

          // Check if Large Format toggle is enabled for tiling/paving
          let effectivePriceItem = priceItem;
          if (isTilingOrPaving && workItem.fields['Large Format_above 60cm']) {
            // Find the Large Format price item
            const largeFormatItem = activePriceList.work.find(item =>
              item.name === 'Large Format' && item.subtitle === 'above 60cm'
            );
            if (largeFormatItem) {
              effectivePriceItem = largeFormatItem;
            }
          }

          // Only add adhesive for the first tiling/paving or netting item
          const skipTilingPavingAdhesive = isTilingOrPaving && tilingPavingAdhesiveAdded;
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
            const materialUnit = calculation.material.unit || 'm²';
            const materialPrice = calculation.material.price || 0;
            const materialQuantity = calculation.quantity || 0;
            let materialCostForItem = 0;

            if (calculation.material.capacity) {
              const packagesNeeded = Math.ceil(materialQuantity / calculation.material.capacity);
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

          // Track additional materials (adhesive)
          if (calculation.additionalMaterial && calculation.additionalMaterialQuantity > 0) {
            const adhesiveUnit = calculation.additionalMaterial.unit || 'pkg';
            const adhesivePrice = calculation.additionalMaterial.price || 0;
            const adhesiveQuantity = calculation.additionalMaterialQuantity;
            let adhesiveCost = 0;

            if (calculation.additionalMaterial.capacity) {
              const packagesNeeded = Math.ceil(adhesiveQuantity / calculation.additionalMaterial.capacity);
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
            const jollyEdgingValue = workItem.fields['Jolly Edging'];
            if (jollyEdgingValue && jollyEdgingValue > 0) {
              const jollyEdgingPrice = activePriceList.work.find(item => item.name === 'Jolly Edging');
              if (jollyEdgingPrice) {
                const jollyEdgingCost = jollyEdgingValue * jollyEdgingPrice.price;
                workTotal += jollyEdgingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_jolly`,
                  name: 'Jolly Edging',
                  calculation: {
                    workCost: jollyEdgingCost,
                    materialCost: 0,
                    quantity: jollyEdgingValue,
                    unit: 'm'
                  }
                });
              }
            }

            const plinthCuttingValue = workItem.fields['Plinth_cutting and grinding'];
            if (plinthCuttingValue && plinthCuttingValue > 0) {
              const plinthCuttingPrice = activePriceList.work.find(item =>
                item.name === 'Plinth' && item.subtitle === 'cutting and grinding'
              );
              if (plinthCuttingPrice) {
                const plinthCuttingCost = plinthCuttingValue * plinthCuttingPrice.price;
                workTotal += plinthCuttingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_cutting`,
                  name: 'Plinth',
                  subtitle: 'cutting and grinding',
                  calculation: {
                    workCost: plinthCuttingCost,
                    materialCost: 0,
                    quantity: plinthCuttingValue,
                    unit: 'm'
                  }
                });
              }
            }

            const plinthBondingValue = workItem.fields['Plinth_bonding'];
            if (plinthBondingValue && plinthBondingValue > 0) {
              const plinthBondingPrice = activePriceList.work.find(item =>
                item.name === 'Plinth' && item.subtitle === 'bonding'
              );
              if (plinthBondingPrice) {
                const plinthBondingCost = plinthBondingValue * plinthBondingPrice.price;
                workTotal += plinthBondingCost;
                items.push({
                  ...workItem,
                  id: `${workItem.id}_plinth_bonding`,
                  name: 'Plinth',
                  subtitle: 'bonding',
                  calculation: {
                    workCost: plinthBondingCost,
                    materialCost: 0,
                    quantity: plinthBondingValue,
                    unit: 'm'
                  }
                });
              }
            }
          }
        }
      }
    }
  });
  
  const auxiliaryWorkCost = workTotal * 0.65;
  const auxiliaryMaterialCost = materialTotal * 0.10;
  
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
    items,
    materialItems,
    othersItems
  };
};

export const calculateRoomPrice = (room, priceList) => {
  const calculation = calculateRoomPriceWithMaterials(room, priceList);
  return calculation.total;
};
