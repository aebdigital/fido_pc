# Fix: Work Items Not Persisting on Page Refresh

## Problem

When adding work items to rooms (dimensions, materials, etc.), the data appeared in the UI but was lost after page refresh. This happened because `workItems` was only stored in local React state, not in the database.

## Root Cause

The app was originally designed for `localStorage` where rooms had a simple `workItems` array. In Supabase, the database had 30+ separate work item tables (`brick_partitions`, `custom_works`, etc.) but the rooms table didn't have a `work_items` column to store this data.

## Solution

Added a `work_items` JSONB column to the rooms table to store the work items array directly in the room record.

### Step 1: Run SQL Migration

**File:** `add_work_items_to_rooms.sql`

```sql
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS work_items JSONB DEFAULT '[]'::jsonb;
```

This adds a JSONB column that can store the entire work items array as JSON.

### Step 2: Code Changes

**File:** `/src/context/AppDataContext.js`

#### When Creating Rooms (line 934-946)
```javascript
const newRoom = await api.rooms.create({
  project_id: projectId,
  c_id: appData.activeContractorId,
  name: roomData.name,
  room_type: roomData.roomType || null,
  floor_length: roomData.floorLength || 0,
  floor_width: roomData.floorWidth || 0,
  wall_height: roomData.wallHeight || 0,
  commute_length: roomData.commuteLength || 0,
  days_in_work: roomData.daysInWork || 0,
  tool_rental: roomData.toolRental || 0,
  work_items: [] // ✅ Initialize empty array
});
```

#### When Updating Rooms (line 972-981)
```javascript
const updateProjectRoom = async (projectId, roomId, roomData) => {
  try {
    // Map workItems to work_items for database storage
    const { workItems, ...otherData } = roomData;
    const dbRoomData = {
      ...otherData,
      work_items: workItems || [] // ✅ Save to database
    };

    await api.rooms.update(roomId, dbRoomData);
```

#### When Loading Rooms (line 229-240)
```javascript
// Build project rooms data structure
const projectRoomsData = {};
for (const project of projects) {
  const rooms = await api.rooms.getByProject(project.id);
  if (rooms && rooms.length > 0) {
    // Map work_items from database to workItems for app use
    projectRoomsData[project.id] = rooms.map(room => ({
      ...room,
      workItems: room.work_items || room.workItems || [] // ✅ Load from database
    }));
  }
}
```

## Field Mapping

| Frontend (React) | Database (PostgreSQL) |
|------------------|----------------------|
| `workItems` (camelCase) | `work_items` (snake_case, JSONB) |

## Benefits of JSONB Approach

✅ **Simple** - No need to manage 30+ separate work item tables
✅ **Fast** - Work items stored with room, no JOINs needed
✅ **Flexible** - Can store any work item structure
✅ **localStorage Compatible** - Maintains same data structure

## Testing

After running the SQL and code changes:

1. ✅ Add work items to a room
2. ✅ Verify they appear in UI
3. ✅ Refresh the page
4. ✅ Work items should still be there

## Alternative Approach (Not Used)

The database has 30+ separate work item tables (`brick_partitions`, `custom_works`, etc.). We could have:
- Created work item records in these tables
- Loaded them with JOINs
- Managed complex relationships

But the JSONB approach is **simpler and faster** for this use case.

---

**Fixed:** 2025-11-26
**Files Modified:**
- `/src/context/AppDataContext.js` (3 locations)
- SQL: `add_work_items_to_rooms.sql`
