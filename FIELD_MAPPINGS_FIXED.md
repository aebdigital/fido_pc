# Field Mapping Fixes - Database Schema Alignment

This document lists all the field mapping corrections made to align the application code with the actual Supabase database schema.

## Date: 2025-11-26

## Summary of Issues
The application code was using field names that didn't match the actual database schema. This caused errors like "Could not find the 'field_name' column in the schema cache".

## Fixed Files

### 1. AppDataContext.js - Projects Table

**Location:** `/src/context/AppDataContext.js` line 344-356

**Issue:** Using fields that don't exist in projects table

**Database Schema for projects:**
```
- id (uuid)
- user_id (uuid)
- c_id (uuid)
- name (text)
- category (text)
- number (bigint)
- status (bigint) - NOT text!
- notes (text)
- is_archived (boolean)
- archived_date (timestamp)
- client_id (uuid)
- contractor_id (uuid)
- price_list_id (uuid)
- date_created (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**Fields REMOVED (don't exist in database):**
- ❌ `price_list_snapshot` - NOT in database
- ❌ `price_overrides` - NOT in database
- ❌ `has_invoice` - NOT in database
- ❌ `invoice_id` - NOT in database
- ❌ `invoice_status` - NOT in database

**Fields FIXED:**
- ✅ `status`: Changed from TEXT ('not sent') to BIGINT (0)
  - 0 = not sent
  - 1 = sent
  - 2 = archived
- ✅ Added `contractor_id` field
- ✅ Added `number` field (default: 0)
- ✅ Added `notes` field (default: null)

### 2. AppDataContext.js - Clients Table

**Location:** `/src/context/AppDataContext.js` line 286-305

**Issue:** Using camelCase fields and non-existent `projects` array

**Field Mappings:**
```javascript
// Frontend → Database
name → name
email → email
phone → phone
street → street
additionalInfo → second_row_street
city → city
postalCode → postal_code
country → country
businessId → business_id
taxId → tax_id
vatId → vat_id
contactPerson → contact_person
type → type
c_id → c_id
```

**Fields REMOVED:**
- ❌ `projects: []` - NOT a database column

### 3. AppDataContext.js - Invoices Table

**Location:** `/src/context/AppDataContext.js` line 743-758

**Issue:** Using camelCase fields with spread operator

**Field Mappings:**
```javascript
// Frontend → Database
invoiceNumber → invoice_number
issueDate → issue_date
dueDate → due_date
paymentMethod → payment_type
paymentDays → maturity_days
notes → notes
```

**Additional Fields:**
```javascript
project_id: projectId
c_id: appData.activeContractorId
client_id: project.client_id
contractor_id: appData.activeContractorId
status: 'unsent'
```

### 4. AppDataContext.js - Invoice-Project Relationship

**Locations:** Lines 744-745, 767-768, 786-787

**Issue:** Trying to update project fields that don't exist

**REMOVED Updates:**
```javascript
// These fields don't exist in projects table:
❌ has_invoice
❌ invoice_id
❌ invoice_status
```

**Note:** Invoice-project relationship is managed via `invoices.project_id` column only.

### 5. ContractorProfileModal.js - Contractors Table

**Location:** `/src/components/ContractorProfileModal.js` (previously fixed)

**Field Mappings:**
```javascript
// Frontend → Database
name → name
contactPerson → contact_person_name
email → email
phone → phone
website → web
street → street
additionalInfo → second_row_street
city → city
postalCode → postal_code
country → country
businessId → business_id
taxId → tax_id
vatNumber → vat_registration_number
bankAccount → bank_account_number
bankCode → swift_code
legalAppendix → legal_notice
```

## Rooms Table

**Location:** `/src/context/AppDataContext.js` line 906-916

**Status:** ✅ Already correct

The room fields already match the database schema:
```javascript
project_id → project_id
c_id → c_id
name → name
room_type → room_type
floor_length → floor_length
floor_width → floor_width
wall_height → wall_height
```

**Note:** `workItems` field is added locally but NOT sent to database (rooms table doesn't have it).

## Testing Checklist

Before testing, ensure:
1. ✅ All field mappings are snake_case for database
2. ✅ No non-existent fields are being sent
3. ✅ Status field uses integers (0, 1, 2) not strings
4. ✅ Null values are properly handled

## Database Status Fields

### Projects Status (bigint)
- 0 = not sent
- 1 = sent
- 2 = archived

### Invoices Status (text)
- 'unsent'
- 'sent'
- 'paid'

## Next Steps

1. Test contractor creation ✅ (previously tested)
2. Test project creation 🔄 (ready to test)
3. Test client creation 🔄 (ready to test)
4. Test invoice creation 🔄 (ready to test)
5. Test room creation 🔄 (ready to test)

## Important Notes

- The `projects` table schema differs significantly from `missing_tables.sql`
- The actual database uses `price_list_id` (foreign key) instead of `price_list_snapshot` (JSONB)
- Invoice-project relationship is one-directional via `invoices.project_id`
- All snake_case mappings must be done explicitly (no automatic conversion)
