# Supabase Migration Guide for FIDO App

## Overview
This guide will help you migrate your FIDO construction calculator from localStorage to Supabase database.

## Prerequisites
✅ Supabase project created
✅ @supabase/supabase-js installed
✅ Environment variables configured in `.env`

## Step 1: Create Missing Database Tables

Your Supabase schema is missing a few critical tables. Run the SQL in `missing_tables.sql`:

### Tables to Create:
1. **projects** - Core project data
2. **rooms** - Room data for each project
3. **price_lists** - General price lists (one per contractor)

### How to Execute:
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `missing_tables.sql`
4. Click **Run**

## Step 2: Enable Row Level Security (RLS)

RLS ensures users can only access their own data. Run the SQL in `supabase_rls_policies.sql`:

### What This Does:
- Enables RLS on all tables
- Creates policies for SELECT, INSERT, UPDATE, DELETE operations
- Restricts access based on `user_id = auth.uid()`

### How to Execute:
1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase_rls_policies.sql`
3. Click **Run**

⚠️ **IMPORTANT**: Without RLS policies, authenticated users won't be able to access any data!

## Step 3: Understanding the API Layer

The file `src/services/supabaseApi.js` provides a complete API layer with these modules:

### API Modules:

```javascript
import api from './services/supabaseApi'

// Contractors
await api.contractors.getAll()
await api.contractors.getById(id)
await api.contractors.create(data)
await api.contractors.update(id, updates)
await api.contractors.delete(id)

// Clients
await api.clients.getAll(contractorId)
await api.clients.getById(id)
await api.clients.create(data)
await api.clients.update(id, updates)
await api.clients.delete(id)

// Projects
await api.projects.getAll(contractorId)
await api.projects.getById(id)
await api.projects.create(data)
await api.projects.update(id, updates)
await api.projects.delete(id)

// Rooms
await api.rooms.getByProject(projectId)
await api.rooms.getById(id)
await api.rooms.create(data)
await api.rooms.update(id, updates)
await api.rooms.delete(id)

// Invoices
await api.invoices.getAll(contractorId)
await api.invoices.getById(id)
await api.invoices.getByProject(projectId)
await api.invoices.create(data)
await api.invoices.update(id, updates)
await api.invoices.delete(id)

// Work Items (generic for all work tables)
await api.workItems.getByRoom(roomId, 'brick_partitions')
await api.workItems.create('brick_partitions', data)
await api.workItems.update('brick_partitions', id, updates)
await api.workItems.delete('brick_partitions', id)

// Price Lists
await api.priceLists.get(contractorId)
await api.priceLists.upsert(data)

// Invoice Settings
await api.invoiceSettings.get(contractorId)
await api.invoiceSettings.upsert(data)
```

## Step 4: Data Migration Strategy

### Current localStorage Structure:
```javascript
{
  clients: [],
  projectCategories: [{ id, name, projects: [] }],
  archivedProjects: [],
  projectRoomsData: { [projectId]: [rooms] },
  contractors: [],
  contractorProjects: { [contractorId]: {...} },
  invoices: [],
  generalPriceList: { work: [], material: [], installations: [], others: [] }
}
```

### New Supabase Structure:
- **contractors** table - Direct mapping
- **clients** table - Direct mapping
- **projects** table - Flattened from projectCategories
- **rooms** table - Flattened from projectRoomsData
- **invoices** table - Direct mapping
- **price_lists** table - From generalPriceList (JSONB)
- **Work item tables** - 30+ tables for different work types

### Migration Steps:

#### Option A: Manual Migration (Recommended for Production)

1. **Export Current Data**:
```javascript
// In browser console
const currentData = localStorage.getItem('appData')
console.log(JSON.parse(currentData))
// Copy this data
```

2. **Create Migration Script**:
```javascript
// Create a temporary migration component or script
import api from './services/supabaseApi'

const migrateData = async (oldData) => {
  // 1. Migrate contractors
  for (const contractor of oldData.contractors) {
    await api.contractors.create(contractor)
  }

  // 2. Migrate clients
  for (const client of oldData.clients) {
    await api.clients.create(client)
  }

  // 3. Migrate projects
  for (const category of oldData.projectCategories) {
    for (const project of category.projects) {
      await api.projects.create({
        ...project,
        category: category.name
      })
    }
  }

  // 4. Migrate rooms
  for (const [projectId, rooms] of Object.entries(oldData.projectRoomsData)) {
    for (const room of rooms) {
      await api.rooms.create({
        ...room,
        project_id: projectId
      })
    }
  }

  // 5. Migrate invoices
  for (const invoice of oldData.invoices) {
    await api.invoices.create(invoice)
  }

  // 6. Migrate price lists
  if (oldData.generalPriceList) {
    await api.priceLists.upsert({
      c_id: activeContractorId,
      data: oldData.generalPriceList
    })
  }
}
```

#### Option B: Dual-Write Pattern (Gradual Migration)

Keep localStorage AND write to Supabase simultaneously:
```javascript
// In AppDataContext
const updateData = async (newData) => {
  // Write to localStorage (existing)
  localStorage.setItem('appData', JSON.stringify(newData))

  // Also write to Supabase (new)
  // ... API calls
}
```

## Step 5: Key Integration Points

### AppDataContext.js Changes Needed:

1. **Add Supabase imports**:
```javascript
import api from '../services/supabaseApi'
import { supabase } from '../lib/supabase'
```

2. **Load data from Supabase on mount**:
```javascript
useEffect(() => {
  const loadData = async () => {
    const contractors = await api.contractors.getAll()
    const clients = await api.clients.getAll(activeContractorId)
    const projects = await api.projects.getAll(activeContractorId)
    // ... etc

    setAppData({ contractors, clients, projects, ... })
  }

  loadData()
}, [])
```

3. **Update CRUD functions to use API**:
```javascript
const addProject = async (categoryId, projectData) => {
  // Instead of updating localStorage
  const newProject = await api.projects.create({
    ...projectData,
    c_id: activeContractorId,
    category: categoryId
  })

  // Update local state
  setAppData(prev => ({
    ...prev,
    projectCategories: prev.projectCategories.map(cat =>
      cat.id === categoryId
        ? { ...cat, projects: [...cat.projects, newProject] }
        : cat
    )
  }))
}
```

## Step 6: Handle Real-time Updates (Optional)

Supabase supports real-time subscriptions:

```javascript
useEffect(() => {
  const projectsSubscription = supabase
    .channel('projects-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Project changed:', payload)
        // Update local state
      }
    )
    .subscribe()

  return () => {
    projectsSubscription.unsubscribe()
  }
}, [])
```

## Step 7: Testing Checklist

- [ ] User can sign up and login
- [ ] User can create contractor profile
- [ ] User can create clients
- [ ] User can create projects
- [ ] User can add rooms to projects
- [ ] User can add work items to rooms
- [ ] User can create invoices
- [ ] User can manage price lists
- [ ] Data persists across sessions
- [ ] Data is isolated per user (RLS working)
- [ ] Multi-device sync works

## Common Issues & Solutions

### Issue: "new row violates row-level security policy"
**Solution**: Make sure RLS policies are created and `user_id` is set on insert

### Issue: "null value in column 'user_id' violates not-null constraint"
**Solution**: Ensure `getCurrentUserId()` returns valid user ID before insert

### Issue: Data not appearing after insert
**Solution**: Check if RLS policies allow SELECT for the user

### Issue: "relation 'projects' does not exist"
**Solution**: Run `missing_tables.sql` to create missing tables

## Work Item Tables Mapping

Your schema has 30+ work item tables. Here's the mapping:

| Table Name | Usage |
|------------|-------|
| brick_load_bearing_walls | Brick load-bearing wall work |
| brick_partitions | Brick partition work |
| plasterboarding_partitions | Plasterboard partition work |
| plasterboarding_offset_walls | Plasterboard offset walls |
| plasterboarding_ceilings | Plasterboard ceilings |
| netting_walls | Wall netting work |
| netting_ceilings | Ceiling netting work |
| plastering_walls | Wall plastering |
| plastering_ceilings | Ceiling plastering |
| facade_plasterings | Facade plastering |
| painting_walls | Wall painting |
| painting_ceilings | Ceiling painting |
| levellings | Floor leveling |
| tile_ceramics | Ceramic tiling |
| tile_pavings | Floor paving |
| tile_sockets | Socket installations |
| laying_floating_floors | Floating floor installation |
| suspended_ceilings | Suspended ceiling work |
| installation_of_sanitaries | Sanitary installations |
| installation_of_door_jambs | Door jamb installation |
| installation_of_corner_beads | Corner bead installation |
| wirings | Electrical wiring |
| plumbings | Plumbing work |
| preparatories | Preparatory work |
| demolitions | Demolition work |
| core_drills | Core drilling |
| groutings | Grouting work |
| rent_scaffoldings | Scaffolding rental |
| rent_tools | Tool rental |
| doors | Door openings |
| windows | Window openings |
| custom_works | Custom work items |
| custom_materials | Custom materials |

## Next Steps

1. ✅ Run `missing_tables.sql` in Supabase SQL Editor
2. ✅ Run `supabase_rls_policies.sql` in Supabase SQL Editor
3. ⏳ Test authentication flow
4. ⏳ Implement data loading from Supabase in AppDataContext
5. ⏳ Update CRUD operations to use API
6. ⏳ Migrate existing localStorage data
7. ⏳ Test full application flow
8. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Check browser console for errors
3. Verify RLS policies are correct
4. Test API calls in isolation

---

**Created**: 2025-01-26
**Status**: Ready for implementation
