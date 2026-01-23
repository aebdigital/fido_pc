/**
 * Work Items Delta Utility
 * Computes the difference between original and current work items
 * to enable efficient delta-only database updates
 */

import { workItemToDatabase, getTableName } from '../services/workItemsMapping';

/**
 * Compare two database records for equality (ignoring metadata fields)
 * @param {Object} dbRecord1 - First database record
 * @param {Object} dbRecord2 - Second database record
 * @returns {boolean} True if records are equal
 */
function areDbRecordsEqual(dbRecord1, dbRecord2) {
  if (!dbRecord1 || !dbRecord2) return false;

  // Create copies without metadata fields that shouldn't affect comparison
  const fieldsToIgnore = ['room_id', 'c_id', 'user_id', 'updated_at', 'date_created', 'created_at'];

  const clean1 = { ...dbRecord1 };
  const clean2 = { ...dbRecord2 };

  fieldsToIgnore.forEach(field => {
    delete clean1[field];
    delete clean2[field];
  });

  return JSON.stringify(clean1) === JSON.stringify(clean2);
}

/**
 * Check if a work item has changed compared to its original state
 * @param {Object} original - Original work item from database load
 * @param {Object} current - Current work item state
 * @returns {boolean} True if the item has changed
 */
export function hasItemChanged(original, current) {
  // Convert both to database format for consistent comparison
  const origDb = workItemToDatabase(original, 'temp', 'temp');
  const currDb = workItemToDatabase(current, 'temp', 'temp');

  // If either conversion failed, consider them different
  if (!origDb || !currDb) return true;

  // Check if table changed (e.g., custom work to material)
  const origTable = getTableName(original.propertyId, original);
  const currTable = getTableName(current.propertyId, current);
  if (origTable !== currTable) return true;

  // Compare the database records
  return !areDbRecordsEqual(origDb, currDb);
}

/**
 * Check if doors/windows have changed for a work item
 * @param {Object} original - Original doorWindowItems
 * @param {Object} current - Current doorWindowItems
 * @returns {boolean} True if doors or windows changed
 */
export function hasDoorWindowChanged(original, current) {
  const origDoors = original?.doors || [];
  const origWindows = original?.windows || [];
  const currDoors = current?.doors || [];
  const currWindows = current?.windows || [];

  // Quick length check
  if (origDoors.length !== currDoors.length || origWindows.length !== currWindows.length) {
    return true;
  }

  // Compare doors by c_id and values
  const origDoorMap = new Map(origDoors.map(d => [d.c_id, d]));
  for (const door of currDoors) {
    const origDoor = origDoorMap.get(door.c_id);
    if (!origDoor) return true; // New door
    if (origDoor.width !== door.width || origDoor.height !== door.height) return true;
  }

  // Compare windows by c_id and values
  const origWindowMap = new Map(origWindows.map(w => [w.c_id, w]));
  for (const window of currWindows) {
    const origWindow = origWindowMap.get(window.c_id);
    if (!origWindow) return true; // New window
    if (origWindow.width !== window.width || origWindow.height !== window.height) return true;
  }

  return false;
}

/**
 * Compute the delta between original and current work items
 * @param {Array} originalItems - Work items as loaded from database
 * @param {Array} currentItems - Current work items state
 * @returns {Object} { toInsert, toUpdate, toDelete, unchanged }
 */
export function computeWorkItemsDelta(originalItems, currentItems) {
  const originalMap = new Map((originalItems || []).map(item => [item.c_id || item.id, item]));
  const currentMap = new Map((currentItems || []).map(item => [item.c_id || item.id, item]));

  const toInsert = [];
  const toUpdate = [];
  const toDelete = [];
  const unchanged = [];

  // Find items to insert or update
  for (const [cId, current] of currentMap) {
    if (!cId) {
      // Item without c_id is always new
      toInsert.push(current);
      continue;
    }

    const original = originalMap.get(cId);
    if (!original) {
      // New item (has c_id but wasn't in original)
      toInsert.push(current);
    } else if (hasItemChanged(original, current)) {
      // Check if table changed (type change like work->material)
      const origTable = getTableName(original.propertyId, original);
      const currTable = getTableName(current.propertyId, current);

      if (origTable !== currTable) {
        // Table changed - delete from old, insert into new
        toDelete.push({ ...original, _deleteTable: origTable });
        toInsert.push(current);
      } else {
        // Same table, just update
        toUpdate.push(current);
      }
    } else {
      // No change to main item, but check doors/windows
      if (hasDoorWindowChanged(original.doorWindowItems, current.doorWindowItems)) {
        toUpdate.push(current);
      } else {
        unchanged.push(current);
      }
    }
  }

  // Find items to delete (in original but not in current)
  for (const [cId, original] of originalMap) {
    if (!currentMap.has(cId)) {
      toDelete.push(original);
    }
  }

  return { toInsert, toUpdate, toDelete, unchanged };
}

/**
 * Compute delta for doors/windows within a work item
 * @param {Object} originalDoorWindow - Original doorWindowItems
 * @param {Object} currentDoorWindow - Current doorWindowItems
 * @returns {Object} { doorsToInsert, doorsToUpdate, doorsToDelete, windowsToInsert, windowsToUpdate, windowsToDelete }
 */
export function computeDoorWindowDelta(originalDoorWindow, currentDoorWindow) {
  const result = {
    doorsToInsert: [],
    doorsToUpdate: [],
    doorsToDelete: [],
    windowsToInsert: [],
    windowsToUpdate: [],
    windowsToDelete: []
  };

  const origDoors = originalDoorWindow?.doors || [];
  const origWindows = originalDoorWindow?.windows || [];
  const currDoors = currentDoorWindow?.doors || [];
  const currWindows = currentDoorWindow?.windows || [];

  // Process doors
  const origDoorMap = new Map(origDoors.map(d => [d.c_id, d]));
  const currDoorMap = new Map(currDoors.map(d => [d.c_id, d]));

  for (const [cId, currDoor] of currDoorMap) {
    const origDoor = origDoorMap.get(cId);
    if (!origDoor) {
      result.doorsToInsert.push(currDoor);
    } else if (origDoor.width !== currDoor.width || origDoor.height !== currDoor.height) {
      result.doorsToUpdate.push(currDoor);
    }
  }

  for (const [cId] of origDoorMap) {
    if (!currDoorMap.has(cId)) {
      result.doorsToDelete.push(origDoorMap.get(cId));
    }
  }

  // Process windows
  const origWindowMap = new Map(origWindows.map(w => [w.c_id, w]));
  const currWindowMap = new Map(currWindows.map(w => [w.c_id, w]));

  for (const [cId, currWindow] of currWindowMap) {
    const origWindow = origWindowMap.get(cId);
    if (!origWindow) {
      result.windowsToInsert.push(currWindow);
    } else if (origWindow.width !== currWindow.width || origWindow.height !== currWindow.height) {
      result.windowsToUpdate.push(currWindow);
    }
  }

  for (const [cId] of origWindowMap) {
    if (!currWindowMap.has(cId)) {
      result.windowsToDelete.push(origWindowMap.get(cId));
    }
  }

  return result;
}
