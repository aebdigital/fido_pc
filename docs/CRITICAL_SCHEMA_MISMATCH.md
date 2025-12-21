# CRITICAL: Database Schema Mismatch

## Issue
The actual Supabase database schema does NOT match the application's requirements or the `missing_tables.sql` file.

## Rooms Table Mismatch

### Current Database Schema:
```sql
rooms (
  id uuid
  user_id uuid
  project_id uuid
  c_id uuid
  name text
  commute_length numeric  -- ❌ NOT used by app
  days_in_work numeric    -- ❌ NOT used by app
  tool_rental numeric     -- ❌ NOT used by app
  date_created timestamp
  created_at timestamp
  updated_at timestamp
)
```

### Required Schema (from missing_tables.sql):
```sql
rooms (
  id uuid
  user_id uuid
  project_id uuid
  c_id uuid
  name text
  room_type text           -- ✅ NEEDED for app
  floor_length numeric     -- ✅ NEEDED for calculations
  floor_width numeric      -- ✅ NEEDED for calculations
  wall_height numeric      -- ✅ NEEDED for calculations
  date_created timestamp
  created_at timestamp
  updated_at timestamp
)
```

### Why This Matters:
The application calculates work quantities based on room dimensions:
- **Floor area** = floor_length × floor_width
- **Wall area** = (floor_length + floor_width) × 2 × wall_height
- **Ceiling area** = floor_length × floor_width

Without these dimensions, the entire pricing calculation system breaks.

## Projects Table Mismatch

### Current Database Schema:
```sql
projects (
  id uuid
  user_id uuid
  c_id uuid
  name text
  category text
  number bigint
  status bigint            -- ⚠️ BIGINT not TEXT
  notes text
  is_archived boolean
  archived_date timestamp
  client_id uuid
  contractor_id uuid
  price_list_id uuid       -- Foreign key to price_lists
  date_created timestamp
  created_at timestamp
  updated_at timestamp
)
```

### Expected Schema (from missing_tables.sql):
```sql
projects (
  id uuid
  user_id uuid
  c_id uuid
  name text
  category text
  client_id uuid
  status text              -- ⚠️ TEXT not BIGINT ('not sent', 'sent', 'archived')
  is_archived boolean
  has_invoice boolean      -- ❌ MISSING in current DB
  invoice_id uuid         -- ❌ MISSING in current DB
  invoice_status text     -- ❌ MISSING in current DB
  price_list_snapshot jsonb  -- ❌ MISSING in current DB (uses price_list_id instead)
  price_overrides jsonb   -- ❌ MISSING in current DB
  date_created timestamp
  created_at timestamp
  updated_at timestamp
)
```

## Root Cause Analysis

There are TWO possible scenarios:

### Scenario 1: Existing Database
You had an existing Supabase database with a different schema BEFORE starting this migration.

### Scenario 2: Wrong Schema File
The `missing_tables.sql` file was not run, or a different schema was used.

## Immediate Actions Required

### Option A: Use missing_tables.sql Schema (RECOMMENDED)
This matches the application's design and preserves all functionality.

**Steps:**
1. **Backup current data** (if any exists)
2. **Drop existing tables** (if safe to do so):
   ```sql
   DROP TABLE IF EXISTS rooms CASCADE;
   DROP TABLE IF EXISTS projects CASCADE;
   -- Add other tables as needed
   ```
3. **Run missing_tables.sql** to create correct schema
4. **Re-import data** (if backed up)

### Option B: Adapt Application to Current Schema
Modify the application to work with the existing database schema.

**Challenges:**
- Rooms have no dimensions → Can't calculate work quantities
- Projects missing price snapshots → Can't preserve historical pricing
- Projects missing invoice fields → Need to change invoice-project relationship

**Not recommended** because it fundamentally changes the application's functionality.

## Decision Needed

**Please choose:**

1. **Use missing_tables.sql schema** (preserves app functionality)
2. **Keep current schema** (requires major app refactoring)
3. **Provide context** about where the current schema came from

## Temporary Workaround

For now, I've set up the code to:
- Create projects with available fields only
- Create rooms with dummy values (0 for commute_length, days_in_work, tool_rental)
- Store room dimensions locally in `projectRoomsData` (not persisted to database)

**This is NOT a permanent solution** - it will break on page refresh as room dimensions won't be saved.

## Files Affected

- `/src/context/AppDataContext.js` - Room creation (line 927-938)
- `/src/context/AppDataContext.js` - Project creation (line 344-356)
- `/src/context/AppDataContext.js` - Invoice-project sync (removed)

## Next Steps

1. ⏸️ **PAUSE** further development
2. 🔍 **Investigate** where current database schema came from
3. ✅ **Decide** which schema to use
4. 🔧 **Execute** migration plan
5. ✅ **Test** all functionality

---

**Status:** ⚠️ BLOCKED - Waiting for schema decision
**Date:** 2025-11-26
