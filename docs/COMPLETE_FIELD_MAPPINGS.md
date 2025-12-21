# Complete Database Field Mappings

**Generated:** 2025-11-26
**Status:** ✅ All fields mapped and verified against actual Supabase schema

---

## 1. CONTRACTORS Table

### Database Schema:
```
id, user_id, c_id, name, business_id, tax_id, vat_registration_number,
email, phone, street, second_row_street, city, postal_code, country,
contact_person_name, bank_account_number, swift_code, legal_notice,
logo_url, signature_url, web, type, date_created, created_at, updated_at
```

### Field Mappings (Frontend → Database):
```javascript
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

**Status:** ✅ Fixed in ContractorProfileModal.js

---

## 2. CLIENTS Table

### Database Schema:
```
id, user_id, c_id, name, business_id, tax_id, vat_registration_number,
email, phone, street, second_row_street, city, postal_code, country,
contact_person_name, bank_account_number, swift_code, legal_notice,
logo_url, web, type, is_user, date_created, created_at, updated_at
```

### Field Mappings (Frontend → Database):
```javascript
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
vatId → vat_registration_number  // ⚠️ NOT vat_id!
contactPerson → contact_person_name  // ⚠️ NOT contact_person!
type → type ('private' or 'business')
c_id → c_id
is_user → false (default)
```

**Removed Fields:**
- ❌ `projects` array (not a database column)

**Status:** ✅ Fixed in AppDataContext.js line 287-304

---

## 3. PROJECTS Table

### Database Schema:
```
id, user_id, c_id, name, category, number, status, notes,
is_archived, archived_date, client_id, contractor_id, price_list_id,
date_created, created_at, updated_at
```

### Field Mappings (Frontend → Database):
```javascript
name → name
category → category ('Flats', 'Houses', 'Companies', 'Cottages')
c_id → c_id
client_id → client_id
contractor_id → contractor_id
status → status  // ⚠️ BIGINT not TEXT! (0=not sent, 1=sent, 2=archived)
is_archived → is_archived
number → number (default: 0)
notes → notes
price_list_id → price_list_id (foreign key reference)
```

**Removed Fields:**
- ❌ `price_list_snapshot` (NOT in database - uses price_list_id instead)
- ❌ `price_overrides` (NOT in database)
- ❌ `has_invoice` (NOT in database)
- ❌ `invoice_id` (NOT in database)
- ❌ `invoice_status` (NOT in database)

**Status Value Mapping:**
```javascript
// Database uses BIGINT
0 = 'not sent'
1 = 'sent'
2 = 'archived'
```

**Status:** ✅ Fixed in AppDataContext.js line 344-356

---

## 4. ROOMS Table

### Database Schema:
```
id, user_id, project_id, c_id, name,
commute_length, days_in_work, tool_rental,
date_created, created_at, updated_at
```

### Field Mappings (Frontend → Database):
```javascript
name → name
project_id → project_id
c_id → c_id
commute_length → 0 (placeholder)
days_in_work → 0 (placeholder)
tool_rental → 0 (placeholder)
```

**⚠️ CRITICAL MISSING FIELDS:**
The application needs these fields for calculations, but they DON'T EXIST in database:
- ❌ `room_type` (e.g., 'bathroom', 'kitchen')
- ❌ `floor_length` (for area calculations)
- ❌ `floor_width` (for area calculations)
- ❌ `wall_height` (for wall area calculations)

**Workaround:**
Room dimensions are stored locally in `projectRoomsData` but NOT persisted to database.
This breaks on page refresh.

**TODO:** Either:
1. Add missing columns to database, OR
2. Store dimensions in JSONB field

**Status:** ⚠️ Temporary fix in AppDataContext.js line 927-938

---

## 5. INVOICES Table

### Database Schema:
```
id, user_id, c_id, number, invoice_number, issue_date, due_date,
maturity_days, payment_type, status, project_id, client_id, contractor_id,
note, notes, total_sum, date_of_dispatch, date_created, created_at, updated_at
```

### Field Mappings (Frontend → Database):
```javascript
invoiceNumber → invoice_number
issueDate → issue_date
dueDate → due_date
paymentMethod → payment_type ('transfer', 'cash', 'card')
paymentDays → maturity_days
notes → notes
project_id → project_id
c_id → c_id
client_id → client_id
contractor_id → contractor_id
status → status ('unsent', 'sent', 'paid')
```

**Status:** ✅ Fixed in AppDataContext.js line 743-758

---

## 6. WORK ITEM TABLES

All work tables follow similar pattern. Example: `brick_partitions`

### Common Schema Pattern:
```
id, user_id, room_id, c_id,
size1, size2, netting, painting, plastering, tiling,
penetration_one, penetration_two, penetration_three,
date_created, created_at, updated_at
```

### Field Mappings:
```javascript
room_id → room_id
c_id → c_id
size1 → size1 (numeric)
size2 → size2 (numeric)
netting → netting (bigint 0/1)
painting → painting (bigint 0/1)
plastering → plastering (bigint 0/1)
tiling → tiling (bigint 0/1)
penetration_one → penetration_one (bigint count)
penetration_two → penetration_two (bigint count)
penetration_three → penetration_three (bigint count)
```

**Status:** ✅ Schema matches - using generic workItemsApi

---

## 7. DOORS & WINDOWS Tables

### Doors Schema:
```
id, user_id, c_id, size1, size2,
brick_load_bearing_wall_id, brick_partition_id, facade_plastering_id,
netting_wall_id, plasterboarding_offset_wall_id, plasterboarding_partition_id,
plastering_wall_id, tile_ceramic_id,
date_created, created_at, updated_at
```

### Windows Schema:
```
id, user_id, c_id, size1, size2,
[similar foreign key fields as doors],
date_created, created_at, updated_at
```

**Note:** Doors/Windows reference parent work items via foreign keys.

**Status:** ✅ Schema understood

---

## 8. SPECIAL TABLES

### custom_works / custom_materials
```
id, user_id, room_id, c_id,
title, unit, number_of_units, price_per_unit,
date_created, created_at, updated_at
```

### installation_of_sanitaries
```
id, user_id, room_id, c_id,
type, count, price_per_sanitary,
date_created, created_at, updated_at
```

### installation_of_door_jambs
```
id, user_id, room_id, c_id,
count, price_per_door_jamb,
date_created, created_at, updated_at
```

**Status:** ✅ Schema understood

---

## Summary of Changes Made

### ✅ FIXED:
1. **Contractors** - All fields correctly mapped (ContractorProfileModal.js)
2. **Clients** - Fixed `vat_registration_number` and `contact_person_name` (AppDataContext.js)
3. **Projects** - Removed non-existent fields, fixed status to BIGINT (AppDataContext.js)
4. **Invoices** - All fields correctly mapped (AppDataContext.js)

### ⚠️ PARTIAL:
5. **Rooms** - Using placeholder values, missing dimension fields

### ❌ OUTSTANDING ISSUES:
1. **Rooms table missing critical fields** for room dimensions
2. **Projects table** uses different price list approach (foreign key vs snapshot)
3. **Invoice-Project relationship** one-directional only

---

## Testing Checklist

- [x] Contractor creation
- [x] Client creation (fixed vat_registration_number)
- [x] Project creation (fixed status to bigint 0)
- [ ] Room creation (will work but lose dimensions on refresh)
- [x] Invoice creation
- [ ] Work item creation

---

## Next Steps

1. **Decide on rooms table:** Add dimension columns OR use JSONB field
2. **Test all CRUD operations** end-to-end
3. **Verify data persistence** across page refreshes

---

**All mappings verified against actual database schema on 2025-11-26**
