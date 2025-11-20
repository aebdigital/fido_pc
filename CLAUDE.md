# FIDO Construction Cost Calculator - Developer Documentation

This document provides a comprehensive guide to understanding and working with the FIDO construction cost calculator React application.

## Quick Start

```bash
npm install              # Install dependencies
npm start               # Start dev server (http://localhost:3000)
npm run build           # Create production build
```

## Project Overview

FIDO is a sophisticated construction cost calculator designed for contractors to:
- Manage construction projects across 4 categories (Flats, Houses, Companies, Cottages)
- Configure room-by-room work items with automatic material calculations
- Track clients and generate invoices
- Maintain price lists with project-specific overrides
- Support multiple contractors with data isolation

## Architecture

### Technology Stack
- **React 19.2.0** - UI framework
- **React Router v7** - Client-side routing
- **Tailwind CSS 3.4** - Utility-first styling
- **Lucide React** - Icon library
- **localStorage** - Data persistence

### State Management
The app uses React Context API with 4 providers:

1. **AppDataContext** - Core business logic (2056 lines)
   - Projects, clients, contractors, invoices
   - Price lists and calculations
   - 60+ CRUD and helper functions

2. **DarkModeContext** - Theme management
3. **LanguageContext** - Multi-language support (SK/EN)
4. **NavigationBlockerContext** - Unsaved changes protection

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── InvoiceCreationModal.js
│   ├── InvoiceDetailModal.js
│   ├── RoomDetailsModal.js
│   ├── ProjectPriceList.js
│   └── ...
├── context/             # React Context providers
│   └── AppDataContext.js
├── pages/               # Route-level components
│   ├── Projects.js
│   ├── Invoices.js
│   ├── Clients.js
│   └── Settings.js
├── translations/        # i18n resources
│   └── translations.js
└── App.js              # Root component with routing
```

## Key Features

### 1. Project Management
- 4 project categories with custom imagery
- Multi-room support with room type selection
- Project status: not sent, sent, archived
- Project duplication and archiving
- Unique ID generation: `YYYYiii` (year + last 3 digits of timestamp)

### 2. Work Items & Pricing
**30+ work/material categories including:**
- Preparatory/demolition works
- Electrical/plumbing installations
- Masonry, plasterboarding, netting
- Plastering, painting, tiling
- Sanitary installations (14 types)
- Tool rentals and scaffolding

**Material Calculations:**
- Auto-calculate quantities based on work areas
- Capacity-based packaging (e.g., adhesive: 6m² per package)
- Complementary materials (auto-add adhesive for tiling/netting)
- Door/window area deductions

### 3. Pricing System
- **General Price List**: Editable baseline prices
- **Price Snapshots**: Frozen prices at project creation
- **Project Overrides**: Per-project price customization
- **Bulk Updates**: Apply percentage increases
- **Dynamic VAT**: Configurable rate (default 23%)

### 4. Client Management
- Complete profiles with business info
- Project-client bidirectional relationships
- Contact details and addresses
- Tax/business ID tracking

### 5. Contractor System
- Multiple contractor profiles
- Banking information storage
- Contractor-specific project isolation
- Active contractor switching

### 6. Invoice System
- Link invoices to projects
- Auto-generate invoice numbers (YYYYMMXXX format)
- Payment tracking (paid/unpaid/overdue)
- Configurable payment terms (7/15/30/60/90 days)
- Invoice status: unsent, sent, paid
- Bidirectional sync with project status

## Data Model

### Core Data Structure
```javascript
{
  clients: [],
  projectCategories: [
    { id, name, count, image, projects: [] }
  ],
  archivedProjects: [],
  projectRoomsData: { [projectId]: [rooms] },
  contractors: [],
  contractorProjects: {
    [contractorId]: {
      categories: [],
      archivedProjects: []
    }
  },
  invoices: [],
  priceOfferSettings: { timeLimit, defaultValidityPeriod },
  activeContractorId: null,
  generalPriceList: {
    work: [],
    material: [],
    installations: [],
    others: []
  }
}
```

### Entity Relationships
```
Contractor 1──────* Project *──────1 Client
                      │
                      │
                      └─────* Room
                              │
                              └─────* WorkItem
                                      │
                                      └─────* Material

Project 1──────1 Invoice
```

### Data Persistence
- All data stored in localStorage as `appData`
- Automatic saving on every state change via useEffect
- Backward compatibility migrations on load
- Language preference: localStorage key `language`
- Dark mode preference: localStorage key `darkMode`

## Routing

```
/                 → Redirects to /projects
/projects         → Main project hub
/projects/:id     → Individual project detail
/invoices         → Invoice listing with filters
/clients          → Client management
/settings         → Settings hub
  ├─ /settings/price-list
  ├─ /settings/archive
  └─ /settings/price-offer-settings
```

## Key Functions (AppDataContext)

### Project Management
```javascript
addProject(categoryId, projectData)
updateProject(categoryId, projectId, updates)
deleteProject(categoryId, projectId)
archiveProject(categoryId, projectId)
unarchiveProject(projectId, targetCategoryId)
findProjectById(projectId, categoryId)
```

### Price Calculations
```javascript
calculateRoomPriceWithMaterials(projectId, roomId)
calculateProjectTotalPrice(projectId)
calculateProjectTotalPriceWithBreakdown(projectId)
formatPrice(amount) // Returns: "1.234,56"
```

### Invoice Management
```javascript
createInvoice(projectId, categoryId, invoiceData)
updateInvoice(invoiceId, updates)
getInvoicesForContractor(contractorId)
getInvoiceForProject(projectId)
```

### Room Management
```javascript
addRoomToProject(projectId, roomData)
updateProjectRoom(projectId, roomId, updates)
deleteProjectRoom(projectId, roomId)
getProjectRooms(projectId)
```

## Price Calculation Logic

### Work Cost Calculation
```javascript
// For each work item:
quantity = calculateQuantity(fields, doorWindowItems)
workCost = quantity × pricePerUnit

// Unit types: €/h, €/m², €/m, €/pc, %
```

### Material Cost Calculation
```javascript
// Match work item to material by name + subtitle
materialQuantity = workQuantity
if (material.capacity) {
  packagesNeeded = Math.ceil(materialQuantity / material.capacity)
  materialCost = packagesNeeded × materialPrice
} else {
  materialCost = materialQuantity × materialPrice
}
```

### Complementary Materials
```javascript
// Auto-add adhesive for:
- Tiling/paving: adhesiveNeeded = tiledArea / 6 (6m² per package)
- Netting: adhesiveNeeded = netArea / 6
```

### Total Project Price
```javascript
totalWithoutVAT = sum(allRoomCosts + auxiliaryWork)
vat = totalWithoutVAT × vatRate
totalWithVAT = totalWithoutVAT + vat
```

## Invoice System Implementation

### Invoice Creation Workflow
1. User clicks "Create Invoice" on project (Projects.js:1201)
2. InvoiceCreationModal opens with auto-generated number
3. User configures: dates, payment terms, method, notes
4. `createInvoice()` called (AppDataContext.js:722)
5. Invoice added to `appData.invoices[]`
6. Project updated with `hasInvoice: true`, `invoiceId`, `invoiceStatus: 'unsent'`
7. Data auto-saved to localStorage

### Invoice Status Synchronization
**Critical Implementation Detail:** Invoice lookup must happen BEFORE state update to avoid async issues.

```javascript
const updateInvoice = (invoiceId, updates) => {
  // IMPORTANT: Find invoice BEFORE setAppData
  const invoice = appData.invoices.find(inv => inv.id === invoiceId);

  setAppData(prev => ({
    ...prev,
    invoices: prev.invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, ...updates } : inv
    )
  }));

  // Sync status to project
  if (updates.status && invoice) {
    updateProject(invoice.categoryId, invoice.projectId, {
      invoiceStatus: updates.status
    });
  }
};
```

### VAT Calculation in Invoices
```javascript
// Get VAT rate from general price list
const getVATRate = () => {
  const vatItem = generalPriceList?.others?.find(item => item.name === 'VAT');
  return vatItem ? vatItem.price / 100 : 0.23;
};

const vatRate = getVATRate();
const totalWithoutVAT = projectBreakdown?.total || 0;
const vat = totalWithoutVAT * vatRate;
const totalWithVAT = totalWithoutVAT + vat;
```

## Translation System

### Usage Pattern
```javascript
// In component:
import { useLanguage } from '../context/LanguageContext';

const { t } = useLanguage();
return <h1>{t('Projects')}</h1>;
```

### Translation File Structure
```javascript
// translations/translations.js
export const translations = {
  en: { /* minimal fallback */ },
  sk: {
    "Projects": "Projekty",
    "Invoices": "Faktúry",
    // 300+ translation pairs
  }
};
```

### Supported Languages
- **Slovak (sk)** - Default, full translations
- **English (en)** - Partial, falls back to key names

## Styling Conventions

### Tailwind Classes
```javascript
// Standard button
"bg-gray-900 dark:bg-white text-white dark:text-gray-900"

// Card/Container
"bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"

// Mobile responsive
"hidden lg:block"  // Desktop only
"lg:hidden"        // Mobile only
```

### Breakpoints
- Mobile: < 1024px
- Desktop: >= 1024px (lg:)

## Common Patterns

### Context Usage
```javascript
import { useAppData } from '../context/AppDataContext';

const {
  addProject,
  updateProject,
  formatPrice
} = useAppData();
```

### Modal Pattern
```javascript
const [showModal, setShowModal] = useState(false);

<Modal
  isOpen={showModal}
  onClose={(updated) => {
    setShowModal(false);
    // Handle updates if needed
  }}
  data={selectedData}
/>
```

### Date Formatting
```javascript
// SK format: DD.MM.YYYY
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('sk-SK');
};
```

## Performance Considerations

### Price List Snapshots
Each project captures a snapshot of the general price list at creation time. This ensures:
- Price stability: Changes to general prices don't affect existing projects
- Historical accuracy: Old projects maintain original pricing
- Override support: Project-specific prices stored separately

### Memoization
- EditableField component uses React.memo
- Prevents unnecessary re-renders during bulk editing

### Scroll Restoration
- RoomDetailsModal uses useLayoutEffect to restore scroll position
- Prevents jarring UX when switching between rooms

## Debugging Tips

### Check localStorage
```javascript
// In browser console:
localStorage.getItem('appData')
localStorage.getItem('language')
localStorage.getItem('darkMode')

// Clear all data:
localStorage.clear()
```

### Context Provider Errors
If you see "must be used within a Provider" errors:
- Ensure component is wrapped in the correct provider
- Check App.js provider hierarchy

### Invoice Status Not Updating
- Verify invoice lookup happens BEFORE setAppData (AppDataContext.js:760)
- Check bidirectional sync between invoice and project status

### Price Calculation Issues
- Verify project has priceListSnapshot
- Check VAT rate in generalPriceList.others
- Use `calculateProjectTotalPriceWithBreakdown()` for detailed breakdown

## File Size Reference

- **RoomDetailsModal.js** - 120KB (complex work management)
- **Projects.js** - 64KB (main project hub)
- **Clients.js** - 32KB (client CRUD)
- **AppDataContext.js** - 2056 lines (core logic)
- **PriceList.js** - 17KB (price editor)
- **Archive.js** - 17KB (archive management)

## Known Limitations & TODOs

### Pending Features
- PDF generation for invoices (placeholder buttons exist)
- Email sending functionality for invoices
- Contractor signature upload (placeholder exists)
- Project export/import

### Browser Compatibility
- localStorage required (no fallback)
- Modern browser features (ES6+, React 19)

## Development Workflow

### Adding New Work/Material Type
1. Update `translations/translations.js` with SK/EN names
2. Add to default price list in AppDataContext.js (lines 30-180)
3. Update RoomDetailsModal.js work type options
4. Test price calculation and material matching

### Adding New Translation
1. Add key-value pair to `translations/translations.js`
2. Use `t('Your Key')` in components
3. Test both SK and EN languages

### Creating New Modal
1. Create component file in `src/components/`
2. Add state management in parent component
3. Pass `isOpen`, `onClose`, and data props
4. Use consistent styling with existing modals

## Troubleshooting

### "Cannot read properties of undefined (reading 'toFixed')"
- Cause: Price breakdown returns `{total}` not `{totalWithVAT}`
- Fix: Calculate VAT from breakdown.total (see Invoice components)

### Invoice status stuck on "neodoslaný"
- Cause: Async state update timing issue
- Fix: Move invoice lookup before setAppData call

### Materials not calculating correctly
- Check material capacity (adhesive uses 6m² per package)
- Verify work-to-material name matching logic
- Ensure subtitle matching for variations (simple/double/triple)

## Best Practices

1. **Always use Context hooks**: Don't access appData directly
2. **Preserve price snapshots**: Don't mutate project.priceListSnapshot
3. **Format prices consistently**: Use `formatPrice()` for display
4. **Handle missing data**: Check for null/undefined before accessing nested properties
5. **Maintain bidirectional sync**: Update both sides of relationships (invoice ↔ project)
6. **Test with multiple contractors**: Ensure data isolation works
7. **Respect unsaved changes**: Use NavigationBlocker for forms

## Additional Resources

- React Documentation: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- React Router: https://reactrouter.com

---

**Last Updated:** 2025-01-20
**Version:** 1.0.0
**Maintainer:** Developer documentation for FIDO Construction Calculator
