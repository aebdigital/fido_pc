# Quick Fix Instructions

## Steps to Fix All Field Mapping Issues

### Step 1: Fix Rooms Table (REQUIRED)
The rooms table is missing critical columns for room dimension calculations.

**Run this SQL in your Supabase SQL Editor:**

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix_rooms_table.sql`
4. Click **Run**

This will add these columns to the rooms table:
- `room_type` (text)
- `floor_length` (numeric)
- `floor_width` (numeric)
- `wall_height` (numeric)

### Step 2: Verify All Changes
All other field mappings have already been fixed in the code:
- ✅ Contractors - Fixed
- ✅ Clients - Fixed
- ✅ Projects - Fixed
- ✅ Invoices - Fixed
- ⏳ Rooms - Will be fixed after Step 1

### Step 3: Test the Application

Try creating each entity in this order:

1. **Create a Contractor** (Settings page)
   - Should work without errors

2. **Create a Project** (Projects page)
   - Should work without `price_list_snapshot` error

3. **Create a Client** (Clients page)
   - Should work with correct field names

4. **Add a Room to Project** (After running Step 1)
   - Should work and persist dimensions correctly

5. **Create an Invoice** (Projects page)
   - Should work with correct field names

### Troubleshooting

**If you get errors:**
- Check browser console for specific error messages
- Verify SQL in Step 1 ran successfully
- Check Supabase logs in dashboard

**Common Errors:**
- "Could not find column" → SQL from Step 1 didn't run
- "null value in column" → Check contractor exists first

### What Was Fixed

#### Contractors Table
```javascript
contactPerson → contact_person_name
website → web
vatNumber → vat_registration_number
bankAccount → bank_account_number
bankCode → swift_code
legalAppendix → legal_notice
additionalInfo → second_row_street
```

#### Clients Table
```javascript
vatId → vat_registration_number  // NOT vat_id
contactPerson → contact_person_name  // NOT contact_person
postalCode → postal_code
businessId → business_id
taxId → tax_id
additionalInfo → second_row_street
```

#### Projects Table
```javascript
status → 0 (BIGINT, not 'not sent')
// Removed: price_list_snapshot, price_overrides, has_invoice, invoice_id, invoice_status
// Added: contractor_id, number, notes
```

#### Invoices Table
```javascript
invoiceNumber → invoice_number
issueDate → issue_date
dueDate → due_date
paymentMethod → payment_type
paymentDays → maturity_days
```

#### Rooms Table (After Step 1)
```javascript
roomType → room_type
floorLength → floor_length
floorWidth → floor_width
wallHeight → wall_height
commuteLength → commute_length
daysInWork → days_in_work
toolRental → tool_rental
```

### Summary

**Before Step 1:** Contractors, Clients, Projects, Invoices will work
**After Step 1:** Everything including Rooms will work

---

**All fixes verified against actual Supabase database schema**
**Date:** 2025-11-26
