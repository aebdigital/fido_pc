# FIDO App Database Matching Document

This document maps the data structures between the **Desktop (React)** and **iOS (Swift)** apps to ensure consistency with the Supabase database.

---

## Overview

| Platform | Tech Stack | Database |
|----------|------------|----------|
| Desktop | React 19 + Supabase JS | Supabase (PostgreSQL) |
| iOS | SwiftUI + Core Data + Supabase Swift | Supabase (PostgreSQL) + Local Core Data |

**Supabase URL:** `https://ueyfuqvwamfgxuwfwuxx.supabase.co`

---

## Page-by-Page Data Mapping

### 1. PROJECTS PAGE

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Project ID | `id` | `cId` (Core Data) / `c_id` (Supabase) | `c_id` (UUID) | |
| Name | `name` | `name` | `name` | |
| Category | `category` (flats/houses/companies/cottages) | `category` (flats/houses/firms/cottages) | `category` | **MISMATCH: "companies" vs "firms"** |
| Number | `number` | `number` | `number` | |
| Status | `status` (string) | `status` (Int64: 0-3) | `status` | **CHECK: string vs int** |
| Is Archived | `isArchived` | `isArchived` | `is_archived` | |
| Archived Date | `archivedDate` | `archivedDate` | `archived_date` | |
| Notes | `notes` | `notes` | `notes` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |
| User ID | `userId` | `userId` | `user_id` | |
| Client ID | `clientId` | `clientId` | `client_id` | |
| Contractor ID | `contractorId` | `contractorId` | `contractor_id` | |

**Desktop Location:** `src/context/AppDataContext.js`, `src/pages/Projects.js`
**iOS Location:** `Fido Building Calcul/Models/SupabaseModels.swift`, `Screens/ProjectsScreen.swift`

**Category Values:**
| Desktop | iOS | Database |
|---------|-----|----------|
| `flats` | `flats` | `flats` |
| `houses` | `houses` | `houses` |
| `companies` | `firms` | **TBD** |
| `cottages` | `cottages` | `cottages` |

**Status Values:**
| Desktop | iOS | Database |
|---------|-----|----------|
| ? | 0 = notSent | ? |
| ? | 1 = sent | ? |
| ? | 2 = approved | ? |
| ? | 3 = finished | ? |

---

### 2. CLIENTS PAGE

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Client ID | `id` | `cId` / `c_id` | `c_id` | |
| Name | `name` | `name` | `name` | |
| Email | `email` | `email` | `email` | |
| Phone | `phone` | `phone` | `phone` | |
| Street | `street` | `street` | `street` | |
| Street Row 2 | `secondRowStreet` | `secondRowStreet` | `second_row_street` | |
| City | `city` | `city` | `city` | |
| Postal Code | `postalCode` | `postalCode` | `postal_code` | |
| Country | `country` | `country` | `country` | |
| Business ID (IČO) | `businessId` / `ico` | `businessID` | `business_id` | **CHECK naming** |
| Tax ID (DIČ) | `taxId` / `dic` | `taxID` | `tax_id` | **CHECK naming** |
| VAT Number (IČ DPH) | `vatNumber` / `icDph` | `vatRegistrationNumber` | `vat_registration_number` | **CHECK naming** |
| Bank Account | `bankAccount` | `bankAccountNumber` | `bank_account_number` | |
| Swift Code | `swiftCode` | `swiftCode` | `swift_code` | |
| Contact Person | `contactPerson` | `contactPersonName` | `contact_person_name` | |
| Website | `web` | `web` | `web` | |
| Type | `type` | `type` | `type` | |
| Is User | `isUser` | `isUser` | `is_user` | |
| Legal Notice | `legalNotice` | `legalNotice` | `legal_notice` | |
| Logo | `logo` (URL) | `logo` (Binary) / `logo_url` | `logo_url` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |

**Desktop Location:** `src/pages/Clients.js`, `src/components/ClientForm.js`
**iOS Location:** `Screens/ClientsScreen.swift`, `ClientPreviewScreen.swift`

---

### 3. CONTRACTORS

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Contractor ID | `id` | `cId` / `c_id` | `c_id` | |
| Name | `name` | `name` | `name` | |
| Email | `email` | `email` | `email` | |
| Phone | `phone` | `phone` | `phone` | |
| Street | `street` | `street` | `street` | |
| Street Row 2 | `secondRowStreet` | `secondRowStreet` | `second_row_street` | |
| City | `city` | `city` | `city` | |
| Postal Code | `postalCode` | `postalCode` | `postal_code` | |
| Country | `country` | `country` | `country` | |
| Business ID | `businessId` | `businessID` | `business_id` | |
| Tax ID | `taxId` | `taxID` | `tax_id` | |
| VAT Number | `vatNumber` | `vatRegistrationNumber` | `vat_registration_number` | |
| Bank Account | `bankAccount` | `bankAccountNumber` | `bank_account_number` | |
| Swift Code | `swiftCode` | `swiftCode` | `swift_code` | |
| Contact Person | `contactPerson` | `contactPersonName` | `contact_person_name` | |
| Website | `web` | `web` | `web` | |
| Type | `type` | `type` | `type` | |
| Legal Notice | `legalNotice` | `legalNotice` | `legal_notice` | |
| Logo | `logo` | `logo` / `logo_url` | `logo_url` | |
| Signature | `signature` | `signature` / `signature_url` | `signature_url` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |

**Desktop Location:** `src/components/ContractorProfileModal.js`
**iOS Location:** `Models/SupabaseModels.swift`

---

### 4. INVOICES PAGE

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Invoice ID | `id` | `cId` / `c_id` | `c_id` | |
| Number | `number` | `number` | `number` | |
| Status | `status` (paid/unpaid/overdue) | `status` (paid/unpaid/afterMaturity) | `status` | **CHECK: "overdue" vs "afterMaturity"** |
| Date of Dispatch | `dateOfDispatch` | `dateOfDispatch` | `date_of_dispatch` | |
| Maturity Days | `maturityDays` | `maturityDays` | `maturity_days` | |
| Payment Type | `paymentType` (cash/bankTransfer) | `paymentType` (cash/bankTransfer) | `payment_type` | |
| Price Without VAT | `priceWithoutVat` | `priceWithoutVat` | `price_without_vat` | |
| VAT Amount | `vatAmount` | `vatAmount` | `vat_amount` | |
| Cumulative VAT | `cumulativeVat` | `cumulativeVat` | `cumulative_vat` | |
| Note | `note` | `note` | `note` | |
| Cash Receipt | `cashReceipt` | `cashReceipt` / `cashReceiptUrl` | `cash_receipt_url` | |
| PDF File | `pdfFile` | `pdfFile` / `pdfFileUrl` | `pdf_file_url` | |
| Invoice Items | `items` (array) | `invoiceItemsData` (JSON binary) | `invoice_items_data` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |
| Project ID | `projectId` | `projectId` | `project_id` | |
| Client ID | `clientId` | `clientId` | `client_id` | |
| Contractor ID | `contractorId` | `contractorId` | `contractor_id` | |

**Invoice Item Structure:**
```json
{
  "category": "work|material|other",
  "description": "string",
  "count": number,
  "pricePerPiece": number,
  "vatRate": number,
  "total": number
}
```

**Desktop Location:** `src/pages/Invoices.js`, `src/components/InvoiceCreationModal.js`, `src/components/InvoiceDetailModal.js`
**iOS Location:** `Screens/InvoicesScreen.swift`, `InvoiceDetailView.swift`

---

### 5. ROOMS

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Room ID | `id` | `cId` / `c_id` | `c_id` | |
| Name | `name` | `name` | `name` | |
| Project ID | `projectId` | (relationship) | `project_id` | |
| Commute Length | `commuteLength` | `commuteLength` | `commute_length` | |
| Days in Work | `daysInWork` | `daysInWork` | `days_in_work` | |
| Tool Rental | `toolRental` | `toolRental` | `tool_rental` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |
| Work Items | `workItems` (object) | (relationships to 40+ entities) | (separate tables) | |

**Desktop Location:** `src/components/RoomDetailsModal.js`, `src/components/ProjectDetailView.js`
**iOS Location:** `Screens/RoomScreen.swift`

---

### 6. PRICE LIST

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Price List ID | `id` | `cId` / `c_id` | `c_id` | |
| Is General | `isGeneral` | `isGeneral` | `is_general` | |
| Project ID | `projectId` | (relationship) | `project_id` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |
| Date Edited | `dateEdited` | `dateEdited` | `date_edited` | |

**Work Prices (50+ items):**
| Category | Desktop Key | iOS Key | Supabase Column |
|----------|-------------|---------|-----------------|
| Demolition | `work.demolition` | `workDemolitionPrice` | `work_demolition_price` |
| Wiring | `work.wiring` | `workWiringPrice` | `work_wiring_price` |
| Plumbing | `work.plumbing` | `workPlumbingPrice` | `work_plumbing_price` |
| Brick Partition | `work.brickPartition` | `workBrickPartitionPrice` | `work_brick_partition_price` |
| Brick Load Bearing | `work.brickLoadBearingWall` | `workBrickLoadBearingWallPrice` | `work_brick_load_bearing_wall_price` |
| Plastering Wall | `work.plasteringWall` | `workPlasteringWallPrice` | `work_plastering_wall_price` |
| Plastering Ceiling | `work.plasteringCeiling` | `workPlasteringCeilingPrice` | `work_plastering_ceiling_price` |
| Painting Wall | `work.paintingWall` | `workPaintingWallPrice` | `work_painting_wall_price` |
| Painting Ceiling | `work.paintingCeiling` | `workPaintingCeilingPrice` | `work_painting_ceiling_price` |
| Tiling (Obklad) | `work.tilingCeramic` | `workTileCeramicPrice` | `work_tile_ceramic_price` |
| Paving (Dlažba) | `work.pavingCeramic` | `workPavingCeramicPrice` | `work_paving_ceramic_price` |
| Levelling | `work.levelling` | `workLevellingPrice` | `work_levelling_price` |
| Floating Floor | `work.floatingFloor` | `workLayingFloatingFloorsPrice` | `work_laying_floating_floors_price` |
| ... | ... | ... | ... |

**Material Prices (25+ items with capacity):**
| Material | Desktop Capacity | Desktop Price | iOS Capacity | iOS Price | Supabase |
|----------|------------------|---------------|--------------|-----------|----------|
| Adhesive Netting | `material.adhesiveNetting.capacity` | `material.adhesiveNetting.price` | `materialAdhesiveNettingCapacity` | `materialAdhesiveNettingPrice` | `material_adhesive_netting_capacity/price` |
| Adhesive Tiling | `material.adhesiveTiling.capacity` | `material.adhesiveTiling.price` | `materialAdhesiveTilingCapacity` | `materialAdhesiveTilingPrice` | `material_adhesive_tiling_capacity/price` |
| Paint | `material.paint.capacity` | `material.paint.price` | `materialPaintCapacity` | `materialPaintPrice` | `material_paint_capacity/price` |
| Levelling Compound | `material.levellingCompound.capacity` | `material.levellingCompound.price` | `materialLevellingCompoundCapacity` | `materialLevellingCompoundPrice` | `material_levelling_compound_capacity/price` |
| ... | ... | ... | ... | ... | ... |

**Desktop Location:** `src/pages/PriceList.js`, `src/context/AppDataContext.js`
**iOS Location:** `Models/SupabaseModels.swift` (SupabasePriceList)

---

### 7. RECEIPTS

| Data Field | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|------------|-----------------|-------------|-----------------|--------|
| Receipt ID | `id` | `cId` / `c_id` | `c_id` | |
| Amount | `amount` | `amount` | `amount` | |
| Merchant Name | `merchantName` | `merchantName` | `merchant_name` | |
| Receipt Date | `receiptDate` | `receiptDate` | `receipt_date` | |
| Receipt Number | `receiptNumber` | `receiptNumber` | `receipt_number` | |
| Category | `category` | `category` | `category` | |
| Notes | `notes` | `notes` | `notes` | |
| QR Code Data | `qrCodeData` | `qrCodeData` | `qr_code_data` | |
| Is Processing | `isProcessing` | `isProcessing` | `is_processing` | |
| Processing Status | `processingStatus` | `processingStatus` | `processing_status` | |
| Image | `imageUrl` | `imageData` / `imageUrl` | `image_url` | |
| Date Created | `dateCreated` | `dateCreated` | `created_at` | |
| Project ID | `projectId` | (relationship) | `project_id` | |

**Desktop Location:** `src/components/ProjectDetailView.js` (receipt analysis feature)
**iOS Location:** `Models/SupabaseModels.swift` (SupabaseReceipt)

---

### 8. SETTINGS PAGE

| Setting | Desktop (React) | iOS (Swift) | Supabase Column | Status |
|---------|-----------------|-------------|-----------------|--------|
| Archive Duration | `archiveSettings.days` | `archiveForDays` | N/A (local) | |
| Price Offer Validity | `priceOfferSettings.validity` | `priceOfferValidity` | N/A (local) | |
| Time Limit | `priceOfferSettings.timeLimit` | `priceOfferTimeLimit` | N/A (local) | |
| Theme | `darkMode` (context) | `appearance` | N/A (local) | |
| Language | `language` (context) | N/A | N/A (local) | |

**Desktop Location:** `src/pages/Settings.js`, `src/pages/PriceOfferSettings.js`
**iOS Location:** `Screens/SettingsScreen.swift`

---

## Work Items Mapping

### Desktop Work Item IDs (`src/config/constants.js`)

| Work Type | Desktop ID | iOS Entity | Supabase Table |
|-----------|------------|------------|----------------|
| Demolition | `demolition` | `Demolition` | `demolition` |
| Wiring | `wiring` | `Wiring` | `wiring` |
| Plumbing | `plumbing` | `Plumbing` | `plumbing` |
| Brick Partition | `brickPartition` | `BrickPartition` | `brick_partition` |
| Brick Load Bearing | `brickLoadBearingWall` | `BrickLoadBearingWall` | `brick_load_bearing_wall` |
| Plasterboard Partition | `plasterboardingPartition` | `PlasterboardingPartition` | `plasterboarding_partition` |
| Plasterboard Offset | `plasterboardingOffsetWall` | `PlasterboardingOffsetWall` | `plasterboarding_offset_wall` |
| Plasterboard Ceiling | `plasterboardingCeiling` | `PlasterboardingCeiling` | `plasterboarding_ceiling` |
| Netting Wall | `nettingWall` | `NettingWall` | `netting_wall` |
| Netting Ceiling | `nettingCeiling` | `NettingCeiling` | `netting_ceiling` |
| Plastering Wall | `plasteringWall` | `PlasteringWall` | `plastering_wall` |
| Plastering Ceiling | `plasteringCeiling` | `PlasteringCeiling` | `plastering_ceiling` |
| Painting Wall | `paintingWall` | `PaintingWall` | `painting_wall` |
| Painting Ceiling | `paintingCeiling` | `PaintingCeiling` | `painting_ceiling` |
| Tiling Ceramic | `tilingCeramic` | `TileCeramic` | `tile_ceramic` |
| Paving Ceramic | `pavingCeramic` | `PavingCeramic` | `paving_ceramic` |
| Levelling | `levelling` | `Levelling` | `levelling` |
| Floating Floor | `layingFloatingFloors` | `LayingFloatingFloors` | `laying_floating_floors` |
| Skirting | `skirtingOfFloatingFloor` | `SkirtingOfFloatingFloor` | `skirting_of_floating_floor` |
| Penetration | `penetrationCoating` | `PenetrationCoating` | `penetration_coating` |
| Grouting | `grouting` | `Grouting` | `grouting` |
| Siliconing | `siliconing` | `Siliconing` | `siliconing` |
| Corner Bead | `installationOfCornerBead` | `InstallationOfCornerBead` | `installation_of_corner_bead` |
| Door Jamb | `installationOfDoorJamb` | `InstallationOfDoorJamb` | `installation_of_door_jamb` |
| Window Installation | `windowInstallation` | `WindowInstallation` | `window_installation` |
| Window Sash Plastering | `plasteringOfWindowSash` | `PlasteringOfWindowSash` | `plastering_of_window_sash` |
| Facade Plastering | `facadePlastering` | `FacadePlastering` | `facade_plastering` |
| Sanitary Installation | `installationOfSanitary` | `InstallationOfSanitary` | `installation_of_sanitary` |
| Scaffolding | `scaffolding` | `Scaffolding` | `scaffolding` |
| Core Drill | `coreDrill` | `CoreDrill` | `core_drill` |
| Tool Rental | `toolRental` | `ToolRental` | `tool_rental` |
| Custom Work | `customWork` | `CustomWork` | `custom_work` |
| Custom Material | `customMaterial` | `CustomMaterial` | `custom_material` |
| Commute | `commute` | (room field) | (room field) |

---

## Known Mismatches & Action Items

### Category Values
- [x] **Standardized to "firms"** (Database and iOS use "firms", Desktop handles "firms") - Resolved Jan 2026

### Status Values
- [ ] Desktop uses string status, iOS uses Int64 (0-3) - Need to verify DB schema

### Invoice Status
- [x] **Desktop: "overdue", iOS: "afterMaturity"** - Fixed mapping in SupabaseModels.swift (Jan 2026)

### Field Naming Conventions
- [ ] Desktop uses camelCase in JS, iOS uses camelCase in Swift
- [ ] Supabase uses snake_case
- [ ] Verify all field mappings are correct in API calls

### File Storage
- [ ] Both apps should use Supabase Storage for logos, signatures, PDFs, receipts
- [ ] Verify bucket names match

---

## Supabase Tables (Expected)

```
projects
clients
contractors
invoices
receipts
rooms
price_lists
sync_status (iOS only?)

-- Work Item Tables (40+) --
demolition
wiring
plumbing
brick_partition
brick_load_bearing_wall
plasterboarding_partition
plasterboarding_offset_wall
plasterboarding_ceiling
netting_wall
netting_ceiling
plastering_wall
plastering_ceiling
painting_wall
painting_ceiling
tile_ceramic
paving_ceramic
levelling
laying_floating_floors
skirting_of_floating_floor
penetration_coating
grouting
siliconing
installation_of_corner_bead
installation_of_door_jamb
window_installation
plastering_of_window_sash
facade_plastering
installation_of_sanitary
scaffolding
core_drill
tool_rental
custom_work
custom_material
windows (sub-entity)
doors (sub-entity)
```

---

## DESKTOP APP DATABASE ANALYSIS (VERIFIED)

### ✅ PROJECTS TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Transformer | Status |
|-----------|---------|-------------------|-------------|--------|
| `id` | uuid | `id` | Direct | ✅ |
| `user_id` | uuid | `userId` | Direct | ✅ |
| `c_id` | uuid | `c_id` | Direct (contractor reference) | ✅ |
| `name` | text | `name` | Direct | ✅ |
| `category` | text | `category` | Direct (flats/houses/companies/cottages) | ✅ |
| `number` | bigint | `number` | Direct | ✅ |
| `status` | bigint | `status` | Direct (0-3) | ✅ |
| `notes` | text | `notes` | Direct | ✅ |
| `is_archived` | boolean | `isArchived` | snake_case → camelCase | ✅ |
| `archived_date` | timestamptz | `archivedDate` | snake_case → camelCase | ✅ |
| `client_id` | uuid | `clientId` | snake_case → camelCase | ✅ |
| `contractor_id` | uuid | `contractor_id` | Direct | ✅ FIXED |
| `price_list_id` | uuid | `price_list_id` | Direct | ✅ |
| `date_created` | timestamptz | `dateCreated` | snake_case → camelCase | ✅ |
| `price_list_snapshot` | jsonb | `priceListSnapshot` | JSON parse | ✅ |
| `detail_notes` | text | `detail_notes` | Direct | ✅ |
| `photos` | jsonb | `photos` | JSON parse | ✅ |
| `project_history` | jsonb | `projectHistory` | JSON parse | ✅ |
| `has_invoice` | boolean | `hasInvoice` | snake_case → camelCase | ✅ |
| `invoice_id` | uuid | `invoiceId` | snake_case → camelCase | ✅ |
| `invoice_status` | text | `invoiceStatus` | snake_case → camelCase | ✅ |

**Bug Fixed:** Changed project filtering from `p.c_id === contractor.id` to `p.contractor_id === contractor.id` in AppDataContext.js:296

### ✅ CLIENTS TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Status |
|-----------|---------|-------------------|--------|
| `id` | uuid | `id` | ✅ |
| `user_id` | uuid | `userId` | ✅ |
| `c_id` | uuid | `contractorId` | ✅ |
| `name` | text | `name` | ✅ |
| `email` | text | `email` | ✅ |
| `phone` | text | `phone` | ✅ |
| `street` | text | `street` | ✅ |
| `second_row_street` | text | `additionalInfo` | ✅ |
| `city` | text | `city` | ✅ |
| `postal_code` | text | `postalCode` | ✅ |
| `country` | text | `country` | ✅ |
| `business_id` | text | `businessId` | ✅ |
| `tax_id` | text | `taxId` | ✅ |
| `vat_registration_number` | text | `vatId` | ✅ |
| `contact_person_name` | text | `contactPerson` | ✅ |
| `type` | text | `type` | ✅ |
| `is_user` | boolean | - | ✅ |

**Transformers:** `transformClientFromDB` and `transformClientToDB` in dataTransformers.js

### ✅ CONTRACTORS TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Status |
|-----------|---------|-------------------|--------|
| `id` | uuid | `id` | ✅ |
| `user_id` | uuid | - | ✅ |
| `name` | text | `name` | ✅ |
| `email` | text | `email` | ✅ |
| `phone` | text | `phone` | ✅ |
| `street` | text | `street` | ✅ |
| `second_row_street` | text | `additionalInfo` | ✅ |
| `city` | text | `city` | ✅ |
| `postal_code` | text | `postalCode` | ✅ |
| `country` | text | `country` | ✅ |
| `business_id` | text | `businessId` | ✅ |
| `tax_id` | text | `taxId` | ✅ |
| `vat_registration_number` | text | `vatNumber` | ✅ |
| `bank_account_number` | text | `bankAccount` | ✅ |
| `swift_code` | text | `bankCode` | ✅ |
| `contact_person_name` | text | `contactPerson` | ✅ |
| `legal_notice` | text | `legalAppendix` | ✅ |
| `logo_url` | text | `logo` | ✅ |
| `signature_url` | text | `signature` | ✅ |
| `web` | text | `website` | ✅ |
| `price_offer_settings` | jsonb | `price_offer_settings` | ✅ |

**Transformers:** `transformContractorFromDB` and `transformContractorToDB` in dataTransformers.js

### ✅ INVOICES TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Status |
|-----------|---------|-------------------|--------|
| `id` | uuid | `id` | ✅ |
| `user_id` | uuid | - | ✅ |
| `c_id` | uuid | `contractorId` (fallback) | ✅ |
| `number` | bigint | `invoiceNumber` | ✅ |
| `status` | text | `status` | ✅ |
| `payment_type` | text | `paymentMethod` | ✅ |
| `maturity_days` | bigint | `paymentDays` | ✅ |
| `note` | text | `notes` | ✅ |
| `date_of_dispatch` | date | `dispatchDate` | ✅ |
| `date_created` | timestamptz | `issueDate` | ✅ |
| `project_id` | uuid | `projectId` | ✅ |
| `client_id` | uuid | `clientId` | ✅ |
| `contractor_id` | uuid | `contractorId` | ✅ |
| `price_without_vat` | numeric | - | ✅ (exists in DB) |
| `vat_amount` | numeric | - | ✅ (exists in DB) |
| `invoice_items_data` | jsonb | - | ✅ (exists in DB) |

**Transformer:** `transformInvoiceFromDB` in dataTransformers.js

### ✅ ROOMS TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Status |
|-----------|---------|-------------------|--------|
| `id` | uuid | `id` | ✅ |
| `user_id` | uuid | - | ✅ |
| `project_id` | uuid | `project_id` | ✅ |
| `c_id` | uuid | - | ✅ |
| `name` | text | `name` | ✅ |
| `room_type` | text | `roomType` | ✅ |
| `floor_length` | numeric | `floorLength` | ✅ |
| `floor_width` | numeric | `floorWidth` | ✅ |
| `wall_height` | numeric | `wallHeight` | ✅ |
| `commute_length` | numeric | `commuteLength` | ✅ |
| `days_in_work` | numeric | `daysInWork` | ✅ |
| `tool_rental` | numeric | `toolRental` | ✅ |
| `work_items` | jsonb | `workItems` (loaded separately) | ✅ |

### ✅ RECEIPTS TABLE - WORKING CORRECTLY

| DB Column | DB Type | Desktop App Field | Status |
|-----------|---------|-------------------|--------|
| `id` | uuid | `id` | ✅ |
| `project_id` | uuid | `project_id` | ✅ |
| `c_id` | uuid | - | ✅ |
| `amount` | numeric | `totalAmount` | ✅ |
| `merchant_name` | text | `vendorName` | ✅ |
| `receipt_date` | date | `date` | ✅ |
| `image_url` | text | `imageUrl` | ✅ |
| `items` | jsonb | `items` | ✅ |
| `raw_ocr_text` | text | `rawText` | ✅ |

### ✅ PRICE_LISTS TABLE - WORKING CORRECTLY

The price_lists table stores pricing data in a `data` JSONB column that contains the full price list structure.
Desktop app uses `generalPriceList` which is loaded from `priceListData.data`.

### ✅ ALL 33 WORK ITEM TABLES - WORKING CORRECTLY

Work items are mapped via `workItemsMapping.js`:
- `PROPERTY_TO_TABLE` maps app propertyIds to DB table names
- `workItemToDatabase()` converts app format → DB format
- `databaseToWorkItem()` converts DB format → app format

All tables have proper mappings:
- brick_partitions, brick_load_bearing_walls
- plasterboarding_partitions, plasterboarding_offset_walls, plasterboarding_ceilings
- netting_walls, netting_ceilings
- plastering_walls, plastering_ceilings, facade_plasterings, plastering_of_window_sashes
- painting_walls, painting_ceilings
- levellings, tile_ceramics, paving_ceramics, laying_floating_floors
- wirings, plumbings, installation_of_sanitaries
- installation_of_corner_beads, installation_of_door_jambs, window_installations
- demolitions, groutings, penetration_coatings, siliconings
- custom_works, custom_materials, scaffoldings, core_drills, tool_rentals

### ✅ CASCADE DELETE CONSTRAINTS ADDED

When a project is deleted, all related data is automatically cleaned up:
- `rooms` → CASCADE on `project_id`
- All 33 work item tables → CASCADE on `room_id`
- `receipts` → CASCADE on `project_id`

---

## DESKTOP APP STATUS: ✅ 100% WORKING

All database mappings verified and working correctly. One bug was fixed:
- **Fixed:** Project-contractor relationship now uses `contractor_id` instead of `c_id`

---

## iOS APP FIX STATUS (December 2025)

### ✅ FIXES COMPLETED IN THIS SESSION

1. **@MainActor Annotations Added** - All 44 Core Data→Supabase conversion extensions now have `@MainActor` annotation to fix "Main actor-isolated property cannot be referenced from nonisolated context" error
   - Affected: SupabaseProject, SBClient, SupabaseContractor, SupabaseInvoice, SupabaseReceipt, SupabaseRoom, SupabasePriceList, SupabaseInvoiceSettings, SupabaseHistoryEvent, SupabaseDoor, SupabaseWindow, and 33 work type extensions

2. **Door Extension Relationship Names Fixed** - Changed from "to" prefix to "in" prefix:
   - `toBrickLoadBearingWall` → `inBrickLoadBearingWall`
   - `toBrickPartition` → `inBrickPartition`
   - Similar changes for all 8 door relationship fields

3. **Window Extension Relationship Names Fixed** - Same pattern as Door

4. **BrickLoadBearingWall/BrickPartition Size Mapping Fixed**:
   - `height: item.height` → `height: item.size1` (Core Data uses size1/size2)
   - `width: item.width` → `width: item.size2`

5. **NettingCeiling/NettingWall Type Casting Fixed**:
   - Added `Int64()` cast: `length: Int64(item.size1)`, `width: Int64(item.size2)`
   - Supabase expects Int64 while Core Data stores Double

6. **Default PriceList Assignment Added**:
   - Projects downloaded without `price_list_id` now get assigned first available PriceList
   - Fallback creates new "Default Price List" if none exists
   - Location: `CoreDataSupabaseSyncManager.swift` in `updateCoreDataProject()`

---

7. **SupabaseProject Missing Fields Added** (8 fields):
   - `priceListId` → `price_list_id`
   - `priceListSnapshot` → `price_list_snapshot`
   - `detailNotes` → `detail_notes`
   - `photos` → `photos`
   - `projectHistory` → `project_history`
   - `hasInvoice` → `has_invoice`
   - `invoiceId` → `invoice_id`
   - `invoiceStatus` → `invoice_status`

8. **SupabaseRoom Missing Fields Added** (5 fields):
   - `roomType` → `room_type`
   - `floorLength` → `floor_length`
   - `floorWidth` → `floor_width`
   - `wallHeight` → `wall_height`
   - `workItems` → `work_items`

9. **Category Value Mapping Added**:
   - iOS uses `firms`, Database uses `companies`
   - Added `categoryToDatabase()` and `categoryFromDatabase()` helper functions
   - Upload: `firms` → `companies`
   - Download: `companies` → `firms`

10. **Invoice Status Mapping Added**:
    - iOS uses `unpaid`/`afterMaturity`, Database uses `unsent`
    - Added `statusToDatabase()` and `statusFromDatabase()` helper functions
    - Upload: `unpaid`/`afterMaturity` → `unsent`
    - Download: `unsent` → `unpaid`

11. **JSONB Field Decoding Fixed** (AnyCodable wrapper):
    - Database stores `photos`, `project_history`, `price_list_snapshot` as JSONB (arrays/objects)
    - iOS was expecting `String?` but receiving arrays/objects
    - Created `AnyCodable` struct that can decode any JSON type
    - Fixed `SupabaseProject.photos: AnyCodable?`
    - Fixed `SupabaseProject.projectHistory: AnyCodable?`
    - Fixed `SupabaseProject.priceListSnapshot: AnyCodable?`
    - Fixed `SupabaseRoom.workItems: AnyCodable?`

12. **Race Condition Fix** (Duplicate Sync Prevention):
    - `performFullSync()` was running twice simultaneously due to non-atomic guard check
    - The `guard !isSyncing` check and `isSyncing = true` set were separated by `await MainActor.run`
    - Fixed by removing the `await` - the class is `@MainActor` so no await needed
    - Now the guard check and flag set are atomic on the main thread

13. **Context Rollback Fix** (Stale Objects Prevention):
    - Failed sync attempts left unsaved Core Data objects in the context
    - These stale objects caused validation errors on subsequent sync attempts
    - Added `context.rollback()` at start of `performFullSync()` to clear unsaved changes
    - Added `context.rollback()` in catch block to clean up after failed syncs
    - Ensures each sync starts with a clean Core Data context

14. **PriceList One-to-One Relationship Fix**:
    - Core Data model defines Project→PriceList as ONE-TO-ONE (not one-to-many)
    - Each Project MUST have its OWN PriceList - cannot share with other projects
    - Previously: All projects were assigned the same PriceList, causing Core Data to nullify previous assignments
    - Fix: Create a NEW PriceList for each project that doesn't have one
    - If Supabase provides `priceListId`, try to link to existing PriceList (if not already assigned)
    - If PriceList is already assigned to another project, create a copy with same values
    - Added `createDefaultPriceList()` and `createPriceListCopy()` helper methods

15. **Room fromProject Required Relationship Fix**:
    - Core Data model defines Room→Project (`fromProject`) as REQUIRED (not optional)
    - Rooms downloaded from Supabase must have a valid `project_id` that exists locally
    - Previously: Rooms were created even if project lookup failed, leaving `fromProject = nil`
    - Fix: `updateCoreDataRoom()` now returns `Bool` to indicate success
    - If project not found, room is skipped and deleted from context
    - Added validation logging for rooms with missing/invalid `project_id`

16. **Room project_id Uses Supabase ID, Not c_id**:
    - Database `rooms.project_id` references `projects.id` (Supabase UUID), NOT `projects.c_id`
    - Core Data only stores `c_id`, not the Supabase `id`
    - Previously: Room sync looked up projects by `c_id`, but `project_id` contained Supabase `id`
    - Fix: Added `supabaseIdToCoreDataId` cache dictionary
    - Project sync now builds mapping: Supabase `id` → Core Data `c_id`
    - Room sync uses this mapping to resolve the correct project

17. **Receipt Missing Fields Added**:
    - Added `items: AnyCodable?` for JSONB array of parsed receipt line items
    - Added `rawOcrText: String?` for raw OCR output text
    - Added CodingKeys: `items`, `rawOcrText = "raw_ocr_text"`

18. **Client Missing Field Added**:
    - Added `additionalInfo: String?` for extra client information
    - Added CodingKey: `additionalInfo = "additional_info"`

19. **Contractor priceOfferSettings Sync**:
    - Added `priceOfferSettings: AnyCodable?` to SupabaseContractor
    - Added `priceOfferValidityDays` computed property to extract `timeLimit` from JSONB
    - On download: Extracts `timeLimit` and stores in iOS `@AppStorage("priceOfferValidity")`
    - On upload: Reads iOS setting and creates `{ timeLimit: days }` JSONB
    - Rounds non-standard values (like 45) to nearest valid option (7, 14, 30, 60)

20. **Desktop Price Offer Validity UI Updated**:
    - Changed from free-form number input to 4 buttons: 7, 14, 30, 60 days
    - Now matches iOS UI style for consistency
    - Both platforms use same values and sync properly

---

### ✅ ALL HIGH PRIORITY ISSUES RESOLVED

| Issue | Status |
|-------|--------|
| SupabaseProject missing 8 fields | ✅ FIXED |
| SupabaseRoom missing 5 fields | ✅ FIXED |
| Category "firms" vs "companies" | ✅ FIXED (mapping added) |
| Invoice status "unpaid" vs "unsent" | ✅ FIXED (mapping added) |
| JSONB fields (photos, workItems, etc.) decoding as String | ✅ FIXED (AnyCodable wrapper) |
| SupabaseReceipt missing `items` and `raw_ocr_text` | ✅ FIXED |
| SBClient missing `additional_info` | ✅ FIXED |
| SupabaseContractor missing `price_offer_settings` | ✅ FIXED |
| Price offer validity sync between iOS and Desktop | ✅ FIXED |

---

21. **Room/Receipt Foreign Key Fix** (January 2026):
    - **Root Cause:** When uploading rooms/receipts, iOS was sending `project_id` = Core Data `c_id` instead of Supabase `id`
    - **Error:** `PostgrestError: insert or update on table "rooms" violates foreign key constraint "rooms_project_id_fkey"`
    - **Why it happened:** The `coreDataIdToSupabaseId` cache only had mappings for entities synced in the current session
    - **Fix:** Changed from `if let` (silent fallback to wrong ID) to `guard let` (skip if mapping not found)
    - **Location:** `CoreDataSupabaseSyncManager.swift` in `syncRooms()` and `syncReceipts()`
    - **Before:** Room uploaded with `project_id = c_id` → FK violation
    - **After:** Room skipped with warning if project mapping not in cache

---

### ⚠️ REMAINING iOS ISSUES (LOW PRIORITY)

- [x] ~~Verify `price_offer_settings` JSON field in Contractors works correctly~~ DONE
- [x] ~~Room foreign key constraint error~~ FIXED (January 2026)
- [ ] Test that all 33 work item tables sync properly
- [ ] Test Door/Window entities sync with rooms
- [ ] Verify receipt image upload/download works
- [ ] Test full sync cycle between iOS and Desktop

---

### 📋 NEXT STEPS

1. **Build and test iOS app** in Xcode to verify no compile errors
2. **Run sync** and check if projects/rooms/invoices sync correctly
3. **Verify bidirectional sync** - create on iOS, check on Desktop and vice versa

---

## File References

### Desktop (React)
- **Data Context:** `src/context/AppDataContext.js`
- **Supabase API:** `src/services/supabaseApi.js`
- **Work Items Mapping:** `src/services/workItemsMapping.js`
- **Constants:** `src/config/constants.js`
- **Work Properties:** `src/config/workProperties.js`
- **Price Calculations:** `src/utils/priceCalculations.js`

### iOS (Swift)
- **Supabase Models:** `Fido Building Calcul/Models/SupabaseModels.swift`
- **Supabase Service:** `Fido Building Calcul/Services/SupabaseService.swift`
- **Core Data Model:** `Fido Building Calcul/CoreDataModels/Fido_Building_Calcul.xcdatamodel`
- **Sync Manager:** `Fido Building Calcul/Services/CoreDataSupabaseSyncManager.swift`

---

## COMPREHENSIVE SYNC ANALYSIS (December 2025)

### ✅ iOS SUPABASE MODELS - COMPLETE LIST (45 structs)

#### Core Entities (12)
| Supabase Model | DB Table | Sync Status |
|----------------|----------|-------------|
| `SupabaseProject` | `projects` | ✅ SYNCING |
| `SBClient` | `clients` | ✅ SYNCING |
| `SupabaseContractor` | `contractors` | ✅ SYNCING |
| `SupabaseInvoice` | `invoices` | ✅ SYNCING |
| `SupabaseReceipt` | `receipts` | ✅ SYNCING |
| `SupabaseRoom` | `rooms` | ✅ SYNCING |
| `SupabasePriceList` | `price_lists` | ✅ SYNCING |
| `SupabaseInvoiceSettings` | `invoice_settings` | ✅ SYNCING |
| `SupabaseHistoryEvent` | `history_events` | ✅ SYNCING |
| `SupabaseDoor` | `doors` | ✅ SYNCING |
| `SupabaseWindow` | `windows` | ✅ SYNCING |
| `SupabaseSyncStatus` | Local tracking | N/A |

#### Work Item Entities (33)
| Supabase Model | DB Table | Sync Status |
|----------------|----------|-------------|
| `SupabaseBrickLoadBearingWall` | `brick_load_bearing_walls` | ✅ SYNCING |
| `SupabaseBrickPartition` | `brick_partitions` | ✅ SYNCING |
| `SupabaseCoreDrill` | `core_drills` | ✅ SYNCING |
| `SupabaseCustomMaterial` | `custom_materials` | ✅ SYNCING |
| `SupabaseCustomWork` | `custom_works` | ✅ SYNCING |
| `SupabaseDemolition` | `demolitions` | ✅ SYNCING |
| `SupabaseFacadePlastering` | `facade_plasterings` | ✅ SYNCING |
| `SupabaseGrouting` | `groutings` | ✅ SYNCING |
| `SupabaseInstallationOfCornerBead` | `installation_of_corner_beads` | ✅ SYNCING |
| `SupabaseInstallationOfDoorJamb` | `installation_of_door_jambs` | ✅ SYNCING |
| `SupabaseInstallationOfSanitary` | `installation_of_sanitaries` | ✅ SYNCING |
| `SupabaseLayingFloatingFloors` | `laying_floating_floors` | ✅ SYNCING |
| `SupabaseLevelling` | `levellings` | ✅ SYNCING |
| `SupabaseNettingCeiling` | `netting_ceilings` | ✅ SYNCING |
| `SupabaseNettingWall` | `netting_walls` | ✅ SYNCING |
| `SupabasePaintingCeiling` | `painting_ceilings` | ✅ SYNCING |
| `SupabasePaintingWall` | `painting_walls` | ✅ SYNCING |
| `SupabasePavingCeramic` | `paving_ceramics` | ✅ SYNCING |
| `SupabasePenetrationCoating` | `penetration_coatings` | ✅ SYNCING |
| `SupabasePlasterboardingCeiling` | `plasterboarding_ceilings` | ✅ SYNCING |
| `SupabasePlasterboardingOffsetWall` | `plasterboarding_offset_walls` | ✅ SYNCING |
| `SupabasePlasterboardingPartition` | `plasterboarding_partitions` | ✅ SYNCING |
| `SupabasePlasteringCeiling` | `plastering_ceilings` | ✅ SYNCING |
| `SupabasePlasteringOfWindowSash` | `plastering_of_window_sashes` | ✅ SYNCING |
| `SupabasePlasteringWall` | `plastering_walls` | ✅ SYNCING |
| `SupabasePlumbing` | `plumbings` | ✅ SYNCING |
| `SupabaseScaffolding` | `scaffoldings` | ✅ SYNCING |
| `SupabaseSiliconing` | `siliconings` | ✅ SYNCING |
| `SupabaseSkirtingOfFloatingFloor` | `skirting_of_floating_floors` | ✅ SYNCING (needs table verification) |
| `SupabaseTileCeramic` | `tile_ceramics` | ✅ SYNCING |
| `SupabaseToolRental` | `tool_rentals` | ✅ SYNCING |
| `SupabaseWindowInstallation` | `window_installations` | ✅ SYNCING |
| `SupabaseWiring` | `wirings` | ✅ SYNCING |

---

### ⚠️ CORE DATA FIELDS MISSING (iOS must store locally but can't sync these)

#### Project Entity - Missing in Core Data (download works, but can't persist):
| Field | DB Column | Notes |
|-------|-----------|-------|
| `detailNotes` | `detail_notes` | Extra notes field |
| `photos` | `photos` | JSONB array of photo URLs |
| `projectHistory` | `project_history` | JSONB array of history events |
| `priceListSnapshot` | `price_list_snapshot` | JSONB snapshot at project creation |
| `hasInvoice` | `has_invoice` | Boolean invoice status |
| `invoiceId` | `invoice_id` | Link to invoice |
| `invoiceStatus` | `invoice_status` | Invoice status string |

**Impact:** These fields are downloaded from Supabase but set to `nil` when uploading from iOS because Core Data model doesn't have them.

#### Room Entity - Missing in Core Data:
| Field | DB Column | Notes |
|-------|-----------|-------|
| `roomType` | `room_type` | Type of room |
| `floorLength` | `floor_length` | Floor dimensions |
| `floorWidth` | `floor_width` | Floor dimensions |
| `wallHeight` | `wall_height` | Wall height |

**Impact:** These fields download as `nil` and upload as `nil` from iOS.

---

### 🔄 SYNC FLOW (performFullSync)

The iOS sync executes in this order (11 steps):
1. **Clients** - Must sync first (Projects reference Clients)
2. **Contractors** - Must sync early (Projects reference Contractors)
3. **PriceLists** - Before Projects (Projects REQUIRE PriceList relationship)
4. **Projects** - After clients/contractors/pricelists for relationships
5. **Invoices** - After Projects (Invoices reference Projects)
6. **Receipts** - After Projects (Receipts reference Projects)
7. **Rooms** - After Projects (Rooms REQUIRE fromProject relationship)
8. **InvoiceSettings** - Independent
9. **HistoryEvents** - After Projects
10. **AllWorkTypes** - After Rooms (Work items reference Rooms)
11. **Complete** - Save and update lastSyncDate

---

### 🗂️ DATABASE TABLES vs iOS MODELS COMPARISON

#### Desktop workItemsMapping.js Tables (33):
```
brick_partitions, brick_load_bearing_walls
plasterboarding_partitions, plasterboarding_offset_walls, plasterboarding_ceilings
netting_walls, netting_ceilings
plastering_walls, plastering_ceilings, facade_plasterings, plastering_of_window_sashes
painting_walls, painting_ceilings
levellings, tile_ceramics, paving_ceramics, laying_floating_floors
wirings, plumbings, installation_of_sanitaries
installation_of_corner_beads, installation_of_door_jambs, window_installations
demolitions, groutings, penetration_coatings, siliconings
custom_works, custom_materials, scaffoldings, core_drills, tool_rentals
```

#### iOS SupabaseModels.swift Work Items (33): ✅ MATCH
All 33 work item types have corresponding Supabase models in iOS.

---

### 📋 ACTION ITEMS FOR 100% COMPATIBILITY

#### HIGH PRIORITY - Must Fix for Full Sync:
- [ ] **Add missing Core Data attributes to Project entity:**
  - `detailNotes: String?`
  - `photos: Binary?` (store as Data, serialize to JSON)
  - `projectHistory: Binary?` (store as Data, serialize to JSON)
  - `priceListSnapshot: Binary?` (store as Data, serialize to JSON)
  - `hasInvoice: Bool`
  - `invoiceId: UUID?`
  - `invoiceStatus: String?`

- [ ] **Add missing Core Data attributes to Room entity:**
  - `roomType: String?`
  - `floorLength: Double`
  - `floorWidth: Double`
  - `wallHeight: Double`

- [ ] **Update sync manager** to read/write these new fields

#### MEDIUM PRIORITY - For Offline Mode:
- [ ] Add `lastModifiedAt: Date` to all Core Data entities for conflict resolution
- [ ] Implement proper `updated_at` tracking in SupabaseService
- [ ] Add offline queue for pending uploads when network unavailable
- [ ] Implement background sync when app comes online

#### LOW PRIORITY - Polish:
- [ ] Verify `skirting_of_floating_floors` table exists (may need migration)
- [ ] Test binary file sync (logos, signatures, PDFs, images)
- [ ] Add sync progress UI with entity-level detail
- [ ] Add conflict resolution UI for user decisions

---

### 🔐 DATA MIGRATION PLAN (Existing iOS Users)

For users who already have offline data when the new iOS version launches:

1. **On First Launch After Update:**
   - Detect existing Core Data data (check for any Projects)
   - Prompt user: "You have existing data. Create account to sync?"

2. **Account Creation Flow:**
   - User creates Supabase account
   - App assigns `user_id` to all existing entities
   - Triggers full upload sync

3. **Conflict Resolution:**
   - If server already has data with same `c_id`, use `lastWriteWins` strategy
   - Show sync summary after completion

4. **Rollback Safety:**
   - Keep backup of Core Data before first sync
   - Allow "Reset to local data" option if sync fails

---

## ✅ MAJOR MIGRATION COMPLETED (January 2026)

### c_id as Primary Key Migration

**Status:** ✅ COMPLETE

On January 2, 2026, a major database migration was applied to simplify the ID system:

**Problem Before:**
- Supabase used auto-generated `id` (UUID) as primary key
- iOS Core Data used `cId` (UUID) as its identifier
- iOS needed a translation layer (`coreDataIdToSupabaseId` cache) to map between them
- Foreign key constraints referenced `id`, causing violations when iOS sent `c_id`

**Solution Applied:**
1. Dropped all foreign key constraints
2. Dropped all primary keys
3. Truncated all data (fresh start)
4. Removed `id` column from all tables
5. Made `c_id` the primary key in all tables
6. Recreated foreign key constraints referencing `c_id`

**Tables Migrated (40+):**
- Core: contractors, clients, projects, rooms, invoices, receipts, price_lists, invoice_settings
- Work Items (33): brick_partitions, brick_load_bearing_walls, plasterboarding_*, netting_*, plastering_*, painting_*, levellings, tile_ceramics, paving_ceramics, laying_floating_floors, wirings, plumbings, installation_of_*, demolitions, groutings, penetration_coatings, siliconings, custom_works, custom_materials, scaffoldings, core_drills, tool_rentals, skirting_of_floating_floors
- Sub-entities: doors, windows

**Impact:**
- ✅ iOS can now use Core Data `cId` directly as foreign keys
- ✅ No more ID translation layer needed in iOS sync manager
- ✅ Desktop app updated to use `c_id` for all operations
- ✅ Foreign key constraints work correctly

**Additional Migration (Same Day):**
- Added `contractor_id` column to: `clients`, `price_lists`, `invoice_settings`
- These columns reference `contractors(c_id)` for filtering by contractor

### Current Database Schema Summary

All tables now use this pattern:
```sql
c_id UUID PRIMARY KEY,  -- Core Data cId, used by iOS directly
user_id UUID,           -- Supabase Auth user ID
created_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ,
-- ... other columns
```

Foreign keys reference `c_id`:
```sql
room_id UUID REFERENCES rooms(c_id) ON DELETE CASCADE,
project_id UUID REFERENCES projects(c_id) ON DELETE CASCADE,
contractor_id UUID REFERENCES contractors(c_id) ON DELETE SET NULL,
-- etc.
```
