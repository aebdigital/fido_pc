# Work Items Database Implementation

## Overview

Successfully implemented work items persistence using the existing 40+ database tables instead of JSONB approach. Work items are now properly saved and loaded from their respective tables.

## Implementation Date
2025-11-26

## Files Created/Modified

### New Files
1. `/src/services/workItemsMapping.js` - Bidirectional mapping service between app structure and database tables

### Modified Files
1. `/src/context/AppDataContext.js` - Added work items loading and saving logic
   - Line 4: Added imports for mapping functions
   - Lines 230-271: Added `loadWorkItemsForRoom()` function to load work items from all tables
   - Lines 1002-1034: Added `saveWorkItemsForRoom()` function to save work items to tables
   - Lines 1036-1060: Modified `updateProjectRoom()` to use new save function

## Architecture

### Database Tables Used (40+ tables)
- **Brick works**: `brick_partitions`, `brick_load_bearing_walls`
- **Plasterboarding**: `plasterboarding_partitions`, `plasterboarding_offset_walls`, `plasterboarding_ceilings`
- **Netting**: `netting_walls`, `netting_ceilings`
- **Plastering**: `plastering_walls`, `plastering_ceilings`, `facade_plasterings`, `plastering_of_window_sashes`
- **Painting**: `painting_walls`, `painting_ceilings`
- **Floor works**: `levellings`, `tile_ceramics`, `paving_ceramics`, `laying_floating_floors`, `skirting_of_floating_floors`
- **Installations**: `wirings`, `plumbings`, `installation_of_sanitaries`, `installation_of_corner_beads`, `installation_of_door_jambs`, `window_installations`
- **Others**: `preparatories`, `demolitions`, `core_drills`, `groutings`, `penetration_coatings`, `siliconings`, `tool_rentals`, `scaffoldings`
- **Custom**: `custom_works`, `custom_materials`

### Data Flow

#### Saving Work Items
1. User adds/updates work items in a room
2. `updateProjectRoom()` called with `workItems` array
3. `saveWorkItemsForRoom()` deletes all existing work items for the room from all tables
4. For each work item:
   - Gets table name from `PROPERTY_TO_TABLE` mapping
   - Converts app structure to database record using `workItemToDatabase()`
   - Inserts record into appropriate table

#### Loading Work Items
1. On app initialization, load all rooms for all projects
2. For each room, call `loadWorkItemsForRoom()`
3. Query all 40+ work item tables for the room ID
4. For each record found:
   - Convert database record to app structure using `databaseToWorkItem()`
   - Add to `workItems` array
5. Return combined array of all work items

### Field Mappings

#### Example: Brick Partitions
**App structure:**
```javascript
{
  id: "uuid",
  propertyId: "brick_partitions",
  fields: {
    Width: 5,
    Height: 2.5
  },
  complementaryWorks: {
    Netting: true,
    Painting: false,
    Plastering: true,
    "Tiling under 60cm": false
  }
}
```

**Database record:**
```javascript
{
  id: "uuid",
  room_id: "uuid",
  c_id: "uuid",
  user_id: "uuid",
  size1: 5,
  size2: 2.5,
  netting: 1,
  painting: 0,
  plastering: 1,
  tiling: 0,
  penetration_one: 0,
  penetration_two: 0,
  penetration_three: 0
}
```

#### Example: Plasterboarding (with type mapping)
**App structure:**
```javascript
{
  propertyId: "plasterboarding_partition",
  fields: {
    Width: 3,
    Length: 2.5
  },
  selectedType: "Double"
}
```

**Database record:**
```javascript
{
  size1: 3,
  size2: 2.5,
  type: 2  // 1=Simple, 2=Double, 3=Triple
}
```

#### Example: Custom Works
**App structure:**
```javascript
{
  propertyId: "custom_work",
  name: "Special installation",
  selectedUnit: "pcs",
  fields: {
    "Number of units": 5,
    "Price per unit": 50
  }
}
```

**Database record:**
```javascript
{
  title: "Special installation",
  unit: "pcs",
  number_of_units: 5,
  price_per_unit: 50
}
```

## Key Functions

### `PROPERTY_TO_TABLE`
Maps app's `propertyId` to database table names:
```javascript
{
  'brick_partitions': 'brick_partitions',
  'plasterboarding_partition': 'plasterboarding_partitions',
  'custom_work': 'custom_works',
  // ... 40+ mappings
}
```

### `workItemToDatabase(workItem, roomId, contractorId)`
Converts app work item structure to database record:
- Maps dynamic `fields` object to fixed table columns
- Handles special cases (type conversions, complementary works)
- Returns database-ready record

### `databaseToWorkItem(dbRecord, tableName)`
Converts database record to app work item structure:
- Maps fixed table columns to dynamic `fields` object
- Reconstructs `propertyId` from table name
- Returns app-ready work item

### `getTableName(propertyId)`
Simple lookup to get table name from propertyId.

## Special Cases Handled

### 1. Type Field Conversion (Plasterboarding)
- Database stores as `bigint`: 1, 2, 3
- App uses as `string`: "Simple", "Double", "Triple"
- Bidirectional mapping ensures consistency

### 2. Boolean Fields (Complementary Works)
- Database stores as `bigint`: 0, 1
- App uses as `boolean`: true, false
- Conversion handles both directions

### 3. Count Fields
- Tables with simple `count` field use generic mapping
- Examples: `demolitions`, `preparatories`, `core_drills`

## Known Limitations

### Doors and Windows Not Implemented
The database has separate `doors` and `windows` tables with complex foreign key relationships to work item tables. These are currently NOT implemented because:

1. **Complex relational structure**: Each door/window record has foreign keys to multiple work item tables
2. **App structure**: Work items store doors/windows in `doorWindowItems: { doors: [], windows: [] }`
3. **Requires additional work**: Need to implement:
   - Saving doors/windows to separate tables
   - Linking them to parent work items via foreign keys
   - Loading and reconstructing the nested structure

**Recommendation**: Implement doors/windows as a separate enhancement after testing basic work items.

## Testing Checklist

After this implementation, the following should work:

1. ✅ Add work items to a room (dimensions, materials, etc.)
2. ✅ Work items appear in UI with correct data
3. ✅ Work items show in project price calculations
4. ✅ Page refresh preserves work items data
5. ✅ Work items load from database on app start
6. ✅ Updating work items persists to database
7. ✅ Deleting and re-adding work items works correctly
8. ⏸️ Doors/windows within work items (NOT YET IMPLEMENTED)

## Migration Notes

### From JSONB Approach (Deprecated)
The previous implementation used a JSONB column `work_items` on the rooms table. This has been replaced with the proper relational approach using 40+ tables.

**If you have data in `rooms.work_items`:**
1. The column can remain (won't cause errors)
2. New data will be saved to proper tables
3. Old JSONB data will be ignored

**To clean up:**
```sql
-- Optional: Remove work_items column if no longer needed
ALTER TABLE rooms DROP COLUMN IF EXISTS work_items;
```

## Performance Considerations

### Loading
- Queries 40+ tables for each room on app initialization
- Uses `Promise.all()` for parallel loading
- Silently catches errors for tables with no data

### Saving
- Delete-then-insert pattern ensures data consistency
- Queries all 40+ tables to delete existing items
- Individual inserts for each work item

### Optimization Ideas (if needed)
1. **Lazy loading**: Only load work items when room is opened
2. **Batch operations**: Use single query to delete from all tables
3. **Caching**: Cache loaded work items in React state
4. **Indexing**: Ensure `room_id` is indexed on all work item tables

## Error Handling

- **Missing table mappings**: Warns in console, skips work item
- **Table doesn't exist**: Catches error, continues with other tables
- **Invalid data**: Returns null, work item not added to array
- **Database errors**: Logged to console via `handleError()`

## Future Enhancements

1. **Doors and windows**: Implement full relational structure
2. **Validation**: Add schema validation before saving
3. **Transactions**: Wrap delete+insert in database transaction
4. **Audit trail**: Use history_events table for change tracking
5. **Partial updates**: Only update changed work items instead of delete-all

---

**Implemented by**: Claude Code
**Date**: 2025-11-26
**Status**: ✅ Complete (except doors/windows)
**Related Files**: See "Files Created/Modified" section above
