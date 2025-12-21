# Fix: Invalid UUID "null" Error

## Problem

When loading data on initial app start (before any contractor is created), the API was passing `null` as contractor ID, which caused this error:

```
invalid input syntax for type uuid: "null"
```

The issue was in the Supabase query:
```
?c_id=eq.null  ❌ Wrong - treats "null" as string
```

## Root Cause

When `contractorId` is `null`, using `.eq('c_id', null)` creates an invalid query because Supabase treats it as the string `"null"` instead of SQL NULL.

## Solution

Modified all `getAll()` methods in `supabaseApi.js` to conditionally apply the contractor filter only when a contractor ID is provided:

### Fixed APIs:

1. **clientsApi.getAll()** - Line 123-143
2. **projectsApi.getAll()** - Line 215-235
3. **invoicesApi.getAll()** - Line 392-417
4. **priceListsApi.get()** - Line 579-599
5. **invoiceSettingsApi.get()** - Line 625-645

### Pattern Applied:

```javascript
// Before (BROKEN):
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('user_id', userId)
  .eq('c_id', contractorId)  // ❌ Fails when contractorId is null
  .order('created_at', { ascending: false })

// After (FIXED):
let query = supabase
  .from('table')
  .select('*')
  .eq('user_id', userId)

// Only filter by contractor if provided
if (contractorId) {
  query = query.eq('c_id', contractorId)
}

const { data, error } = await query.order('created_at', { ascending: false })
```

## Impact

This fix allows:
- ✅ App to load successfully before any contractor is created
- ✅ Data to be fetched for all contractors when no specific contractor is selected
- ✅ Proper filtering when a contractor is selected
- ✅ Contractors to be saved to the database properly

## Testing

After this fix:
1. App should load without errors
2. You can create a contractor successfully
3. Contractor data persists in database
4. All data loads correctly after page refresh

---

**Fixed:** 2025-11-26
**Files Modified:** `/src/services/supabaseApi.js`
