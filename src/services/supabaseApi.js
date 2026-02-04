import { supabase } from '../lib/supabase'

// ========== HELPER FUNCTIONS ==========

/**
 * Get current user ID
 */
export const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

/**
 * Handle Supabase errors
 */
const handleError = (operation, error) => {
  console.error(`Error in ${operation}:`, error)

  // Create a user-friendly error message
  const friendlyError = new Error(
    error?.message ||
    error?.error_description ||
    `Failed to ${operation}. Please try again.`
  )

  // Preserve properties from original error
  if (error?.code) friendlyError.code = error.code
  friendlyError.originalError = error
  friendlyError.userFriendly = true

  throw friendlyError
}

// ========== CONTRACTORS ==========

export const contractorsApi = {
  // Get all contractors for current user (excludes soft-deleted)
  getAll: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('contractors')
        .select('c_id, name, contact_person_name, email, phone, web, street, second_row_street, city, postal_code, country, business_id, tax_id, vat_registration_number, bank_account_number, swift_code, legal_notice, logo_url, signature_url, price_offer_settings, user_id, created_at, updated_at')
        .eq('user_id', userId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('contractorsApi.getAll', error)
    }
  },

  // Get contractor by ID (c_id)
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('c_id', id)
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('contractorsApi.getById', error)
    }
  },

  // Create new contractor
  create: async (contractor) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = contractor.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('contractors')
        .insert([{ ...contractor, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('contractorsApi.create', error)
    }
  },

  // Update contractor
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('contractorsApi.update', error)
    }
  },

  // Soft delete contractor (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('contractors')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('contractorsApi.delete', error)
    }
  }
}

// ========== CLIENTS ==========

export const clientsApi = {
  // Get all clients for current contractor (excludes soft-deleted)
  getAll: async (contractorId) => {
    try {
      const userId = await getCurrentUserId()
      let query = supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      // Filter by contractor if provided, but also include clients with null contractor_id (legacy/unassigned)
      if (contractorId) {
        query = query.or(`contractor_id.eq.${contractorId},contractor_id.is.null`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('clientsApi.getAll', error)
    }
  },

  // Get client by ID (c_id)
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('c_id', id)
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('clientsApi.getById', error)
    }
  },

  // Create new client
  create: async (client) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = client.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('clientsApi.create', error)
    }
  },

  // Update client
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('clientsApi.update', error)
    }
  },

  // Soft delete client (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('clients')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('clientsApi.delete', error)
    }
  }
}

// ========== PROJECTS ==========

export const projectsApi = {
  // Get all projects for contractor (excludes soft-deleted)
  // Get all projects for contractor (excludes soft-deleted)
  getAll: async (contractorId) => {
    try {
      const userId = await getCurrentUserId()

      // 1. Get Owned Projects
      let query = supabase
        .from('projects')
        .select('*, owner:profiles (id, email, full_name, avatar_url)')
        .eq('user_id', userId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      // Only filter by contractor if provided (contractor_id column stores contractor's c_id)
      if (contractorId) {
        query = query.eq('contractor_id', contractorId)
      }

      const { data: ownedProjects, error: ownedError } = await query.order('created_at', { ascending: false })
      if (ownedError) throw ownedError

      // 2. Get Shared Projects
      // a. Get my active teams
      const { data: myTeams, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (teamsError) console.warn('Error fetching teams for shared projects:', teamsError)

      let sharedProjects = []
      const teamIds = (myTeams || []).map(t => t.team_id)

      if (teamIds.length > 0) {
        // b. Get projects shared with these teams
        const { data: sharedLinks, error: linksError } = await supabase
          .from('team_projects')
          .select('project_id')
          .in('team_id', teamIds)

        if (linksError) console.warn('Error fetching team project links:', linksError)

        const sharedProjectIds = (sharedLinks || []).map(l => l.project_id)

        if (sharedProjectIds.length > 0) {
          let sharedQuery = supabase
            .from('projects')
            .select('*, owner:profiles (id, email, full_name, avatar_url)')
            .in('c_id', sharedProjectIds)
            .or('is_deleted.is.null,is_deleted.eq.false')

          if (contractorId) {
            sharedQuery = sharedQuery.eq('contractor_id', contractorId)
          }

          const { data: shared, error: sharedError } = await sharedQuery
          if (sharedError) {
            console.warn('Error fetching specific shared projects:', sharedError)
          } else {
            sharedProjects = shared || []
          }
        }
      }

      // 3. Merge and deduplicate (prioritize owned if duplicates exist, though they shouldn't)
      const allProjects = [...(ownedProjects || []), ...sharedProjects]
      // dedupe by c_id
      const uniqueProjectsMap = new Map()
      allProjects.forEach(p => uniqueProjectsMap.set(p.c_id, p))
      const uniqueProjects = Array.from(uniqueProjectsMap.values())

      // Map c_id to id for app compatibility
      return uniqueProjects.map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('projectsApi.getAll', error)
    }
  },

  // Get project by ID (c_id)
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('c_id', id)
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('projectsApi.getById', error)
    }
  },

  // Create new project
  create: async (project) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = project.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...project, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('projectsApi.create', error)
    }
  },

  // Update project
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('projectsApi.update', error)
    }
  },

  // Soft delete project (marks as deleted instead of removing)
  // Also cascade soft-deletes related entities: invoices, rooms, receipts, history_events
  delete: async (id) => {
    try {
      const now = new Date().toISOString()

      // Soft delete the project
      const { error } = await supabase
        .from('projects')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)
      if (error) throw error
      console.log(`🗑️ Project soft deleted: ${id}`)

      // Cascade soft-delete related entities in parallel
      await Promise.all([
        // Invoices
        supabase
          .from('invoices')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('project_id', id)
          .then(() => console.log(`🗑️ Cascade soft deleted invoices for project: ${id}`)),

        // Rooms
        supabase
          .from('rooms')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('project_id', id)
          .then(() => console.log(`🗑️ Cascade soft deleted rooms for project: ${id}`)),

        // Receipts
        supabase
          .from('receipts')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('project_id', id)
          .then(() => console.log(`🗑️ Cascade soft deleted receipts for project: ${id}`)),

        // History Events
        supabase
          .from('history_events')
          .update({ is_deleted: true, deleted_at: now, updated_at: now })
          .eq('project_id', id)
          .then(() => console.log(`🗑️ Cascade soft deleted history_events for project: ${id}`))
      ])

      return true
    } catch (error) {
      handleError('projectsApi.delete', error)
    }
  }
}

// ========== ROOMS ==========

export const roomsApi = {
  // Get all rooms for a project (excludes soft-deleted)
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', projectId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: true })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('roomsApi.getByProject', error)
    }
  },

  // Get room by ID (c_id)
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('c_id', id)
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('roomsApi.getById', error)
    }
  },

  // Create new room
  create: async (room) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = room.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ ...room, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('roomsApi.create', error)
    }
  },

  // Update room
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('roomsApi.update', error)
    }
  },

  // Soft delete room (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('rooms')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('roomsApi.delete', error)
    }
  }
}

// ========== INVOICES ==========

export const invoicesApi = {
  // Get all invoices for contractor (excludes soft-deleted)
  getAll: async (contractorId) => {
    try {
      const userId = await getCurrentUserId()
      let query = supabase
        .from('invoices')
        .select(`
          *,
          projects!invoices_project_id_fkey (c_id, name, category),
          contractors (c_id, name)
        `)
        .eq('user_id', userId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      // Only filter by contractor if provided (contractor_id column stores contractor's c_id)
      if (contractorId) {
        query = query.eq('contractor_id', contractorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({
        ...item,
        id: item.c_id,
        projects: item.projects ? { ...item.projects, id: item.projects.c_id } : null,
        contractors: item.contractors ? { ...item.contractors, id: item.contractors.c_id } : null
      }))
    } catch (error) {
      handleError('invoicesApi.getAll', error)
    }
  },

  // Get invoice by ID (c_id)
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects!invoices_project_id_fkey (*),
          contractors (*)
        `)
        .eq('c_id', id)
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      if (data) {
        return {
          ...data,
          id: data.c_id,
          projects: data.projects ? { ...data.projects, id: data.projects.c_id } : null,
          contractors: data.contractors ? { ...data.contractors, id: data.contractors.c_id } : null
        }
      }
      return null
    } catch (error) {
      handleError('invoicesApi.getById', error)
    }
  },

  // Get all invoices by project ID
  getInvoicesByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            projects!invoices_project_id_fkey (*),
            contractors (*)
        `)
        .eq('project_id', projectId)
        .order('date_created', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({
        ...item,
        id: item.c_id,
        issue_date: item.date_created, // Provide alias for frontend compatibility
        projects: item.projects ? { ...item.projects, id: item.projects.c_id } : null,
        contractors: item.contractors ? { ...item.contractors, id: item.contractors.c_id } : null
      }))
    } catch (error) {
      handleError('invoicesApi.getInvoicesByProject', error)
      return []
    }
  },

  // Get invoice by project ID (project_id now references project's c_id)
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('invoicesApi.getByProject', error)
    }
  },

  // Create new invoice
  create: async (invoice) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = invoice.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...invoice, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('invoicesApi.create', error)
    }
  },

  // Update invoice
  update: async (id, updates) => {
    try {
      console.log('[SUPABASE invoicesApi.update] Updating invoice with c_id:', id);
      console.log('[SUPABASE invoicesApi.update] Updates:', JSON.stringify(updates).slice(0, 1000));

      // Removed redundant pre-fetch check. If ID doesn't exist, update returns empty data.

      const { data, error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()

      console.log('[SUPABASE invoicesApi.update] Response - data:', data, 'error:', error);

      if (error) throw error
      // Handle case where invoice doesn't exist (returns empty array)
      if (!data || data.length === 0) {
        console.warn(`[SUPABASE] Invoice with c_id ${id} not found after update`)
        return null
      }
      // Map c_id to id for app compatibility
      console.log('[SUPABASE invoicesApi.update] Update successful, returning:', data[0].c_id);
      return { ...data[0], id: data[0].c_id }
    } catch (error) {
      handleError('invoicesApi.update', error)
    }
  },

  // Soft delete invoice (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('invoices')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('invoicesApi.delete', error)
    }
  }
}

// ========== WORK ITEMS (Generic for all work types) ==========

export const workItemsApi = {
  // Get all work items for a room using optimized RPC function
  // Note: We only use the single-parameter version (room_id only) since work items
  // are scoped by room, not contractor. The c_id field is now the primary key.
  getAllForRoomRPC: async (roomId) => {
    try {
      const { data, error } = await supabase.rpc('get_room_items', { p_room_id: roomId })
      if (error) throw error
      // Map c_id to id for app compatibility
      const mappedData = (data || []).map(item => ({ ...item, id: item.c_id }))
      return { data: mappedData, error: null }
    } catch (error) {
      // Don't throw for RPC errors, just log and return null so fallback or empty state can handle it
      console.error('RPC Error:', error)
      return { data: [], error }
    }
  },

  // Delete all work items for a room via RPC (fixes N+1 issue)
  deleteAllItemsForRoomRPC: async (roomId) => {
    try {
      const { error } = await supabase.rpc('delete_room_items', {
        p_room_id: roomId
      })

      if (error) throw error
      return true
    } catch (error) {
      handleError('workItemsApi.deleteAllItemsForRoomRPC', error)
    }
  },

  // Get work items by room and table (excludes soft-deleted)
  getByRoom: async (roomId, tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('room_id', roomId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: true })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError(`workItemsApi.getByRoom(${tableName})`, error)
    }
  },

  // Create work item
  create: async (tableName, workItem) => {
    try {
      const userId = await getCurrentUserId()
      // c_id should already be set by workItemToDatabase(), but generate if missing
      const c_id = workItem.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ ...workItem, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError(`workItemsApi.create(${tableName})`, error)
    }
  },

  // Update work item (by c_id)
  update: async (tableName, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError(`workItemsApi.update(${tableName})`, error)
    }
  },

  // Soft delete work item (marks as deleted instead of removing)
  delete: async (tableName, id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from(tableName)
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError(`workItemsApi.delete(${tableName})`, error)
    }
  },

  // Upsert work item (insert or update by c_id)
  upsert: async (tableName, workItem) => {
    try {
      const userId = await getCurrentUserId()
      // c_id should already be set by workItemToDatabase(), but generate if missing
      const c_id = workItem.c_id || crypto.randomUUID()
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from(tableName)
        .upsert([{
          ...workItem,
          c_id,
          user_id: userId,
          // CRITICAL: Set updated_at so iOS sync can detect Desktop changes
          // iOS uses updated_at to determine if remote data is newer than local
          updated_at: now,
          // Also set date_created if this is a new item (will be ignored on update if column doesn't exist)
          date_created: workItem.date_created || now
        }], { onConflict: 'c_id' })
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError(`workItemsApi.upsert(${tableName})`, error)
    }
  }
}

// ========== PRICE LISTS ==========
// iOS-compatible price list system:
// - General price list: is_general = true, project_id = null (one per contractor)
// - Project price list: is_general = false, project_id = <project_c_id> (one per project)

export const priceListsApi = {
  // Get all price lists for current user (excludes soft-deleted)
  getAll: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('priceListsApi.getAll', error)
    }
  },

  // Get the GENERAL price list for a contractor (is_general = true)
  getGeneral: async (contractorId) => {
    try {
      if (!contractorId) return null

      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('contractor_id', contractorId)
        .eq('is_general', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.getGeneral', error)
    }
  },

  // Get price list for a specific PROJECT (is_general = false, project_id = projectId)
  getByProject: async (projectId) => {
    try {
      if (!projectId) return null

      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('is_general', false)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.getByProject', error)
    }
  },

  // Legacy: Get price list for contractor (by contractor's c_id stored in contractor_id column)
  // Kept for backwards compatibility - prefer getGeneral() for new code
  get: async (contractorId) => {
    try {
      // If no contractor ID provided, return null
      if (!contractorId) {
        return null
      }

      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('contractor_id', contractorId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.get', error)
    }
  },

  // Create or update the GENERAL price list (is_general = true)
  upsertGeneral: async (contractorId, priceData) => {
    try {
      const userId = await getCurrentUserId()

      // First check if general price list exists for this contractor
      const { data: existing } = await supabase
        .from('price_lists')
        .select('c_id')
        .eq('user_id', userId)
        .eq('contractor_id', contractorId)
        .eq('is_general', true)
        .single()

      const c_id = existing?.c_id || crypto.randomUUID()
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('price_lists')
        .upsert([{
          ...priceData,
          c_id,
          user_id: userId,
          contractor_id: contractorId,
          is_general: true,
          project_id: null,
          date_edited: now,
          updated_at: now
        }], { onConflict: 'c_id' })
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.upsertGeneral', error)
    }
  },

  // Create a PROJECT-SPECIFIC price list by copying from general (is_general = false)
  // This is called when a new project is created - mimics iOS behavior
  createForProject: async (projectId, contractorId, generalPriceData) => {
    try {
      const userId = await getCurrentUserId()
      const c_id = crypto.randomUUID()
      const now = new Date().toISOString()

      console.log('[SUPABASE createForProject] Creating price list for project:', projectId);
      console.log('[SUPABASE createForProject] contractor_id:', contractorId);
      console.log('[SUPABASE createForProject] c_id:', c_id);
      console.log('[SUPABASE createForProject] Sample prices:', {
        work_demolition_price: generalPriceData.work_demolition_price,
        work_plastering_wall_price: generalPriceData.work_plastering_wall_price
      });

      const insertData = {
        ...generalPriceData,
        c_id,
        user_id: userId,
        contractor_id: contractorId,
        project_id: projectId,
        is_general: false,
        date_created: now,
        date_edited: now,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('price_lists')
        .insert([insertData])
        .select()
        .single()

      console.log('[SUPABASE createForProject] Response - data:', data?.c_id, 'error:', error);

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.createForProject', error)
    }
  },

  // Update a PROJECT-SPECIFIC price list
  updateProjectPriceList: async (projectId, priceData) => {
    try {
      const userId = await getCurrentUserId()
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('price_lists')
        .update({
          ...priceData,
          date_edited: now,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('is_general', false)
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.updateProjectPriceList', error)
    }
  },

  // Legacy: Create or update price list (kept for backwards compatibility)
  upsert: async (priceList) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = priceList.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('price_lists')
        .upsert([{ ...priceList, c_id, user_id: userId }], {
          onConflict: 'c_id'
        })
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('priceListsApi.upsert', error)
    }
  },

  // Soft delete price list for a project (cleanup when project is deleted)
  deleteByProject: async (projectId) => {
    try {
      const userId = await getCurrentUserId()
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('price_lists')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('project_id', projectId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('priceListsApi.deleteByProject', error)
    }
  }
}

// ========== INVOICE SETTINGS ==========

export const invoiceSettingsApi = {
  // Get invoice settings for contractor (by contractor's c_id stored in contractor_id column)
  get: async (contractorId) => {
    try {
      // If no contractor ID provided, return null
      if (!contractorId) {
        return null
      }

      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('contractor_id', contractorId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('invoiceSettingsApi.get', error)
    }
  },

  // Create or update invoice settings
  upsert: async (settings) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = settings.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('invoice_settings')
        .upsert([{ ...settings, c_id, user_id: userId }], {
          onConflict: 'c_id'
        })
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('invoiceSettingsApi.upsert', error)
    }
  }
}

// ========== RECEIPTS ==========

export const receiptsApi = {
  // Get all receipts for a project (excludes soft-deleted)
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('receipt_date', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('receiptsApi.getByProject', error)
    }
  },

  // Create new receipt
  create: async (receiptData) => {
    try {
      const userId = await getCurrentUserId()
      // Generate c_id if not provided
      const c_id = receiptData.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('receipts')
        .insert([{ ...receiptData, c_id, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('receiptsApi.create', error)
    }
  },

  // Update receipt (by c_id)
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('receiptsApi.update', error)
    }
  },

  // Soft delete receipt (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('receipts')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('receiptsApi.delete', error)
    }
  }
}

// ========== DOORS ==========

export const doorsApi = {
  // Get all doors for a parent work item (by parent's c_id)
  getByParent: async (parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return []
      }

      const { data, error } = await supabase
        .from('doors')
        .select('*')
        .eq('user_id', userId)
        .eq(parentColumnName, parentCId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (error) throw error
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('doorsApi.getByParent', error)
    }
  },

  // Get all doors for multiple parent work items at once (batch load)
  getByParents: async (parentTableName, parentCIds) => {
    try {
      if (!parentCIds || parentCIds.length === 0) return []

      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return []
      }

      const { data, error } = await supabase
        .from('doors')
        .select('*')
        .eq('user_id', userId)
        .in(parentColumnName, parentCIds)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (error) throw error
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('doorsApi.getByParents', error)
    }
  },

  // Create a new door
  create: async (door, parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return null
      }

      const c_id = door.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('doors')
        .insert([{
          c_id,
          user_id: userId,
          size1: door.size1 || door.width || 0,
          size2: door.size2 || door.height || 0,
          [parentColumnName]: parentCId
        }])
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('doorsApi.create', error)
    }
  },

  // Update a door
  update: async (doorCId, updates) => {
    try {
      const { data, error } = await supabase
        .from('doors')
        .update({
          size1: updates.size1 || updates.width || 0,
          size2: updates.size2 || updates.height || 0,
          updated_at: new Date().toISOString()
        })
        .eq('c_id', doorCId)
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('doorsApi.update', error)
    }
  },

  // Upsert a door (create or update)
  upsert: async (door, parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return null
      }

      const c_id = door.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('doors')
        .upsert([{
          c_id,
          user_id: userId,
          size1: door.size1 || door.width || 0,
          size2: door.size2 || door.height || 0,
          [parentColumnName]: parentCId,
          updated_at: new Date().toISOString()
        }], { onConflict: 'c_id' })
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('doorsApi.upsert', error)
    }
  },

  // Soft delete a door (marks as deleted instead of removing)
  delete: async (doorCId) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('doors')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', doorCId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('doorsApi.delete', error)
    }
  }
}

// ========== WINDOWS ==========

export const windowsApi = {
  // Get all windows for a parent work item (by parent's c_id)
  getByParent: async (parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return []
      }

      const { data, error } = await supabase
        .from('windows')
        .select('*')
        .eq('user_id', userId)
        .eq(parentColumnName, parentCId)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (error) throw error
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('windowsApi.getByParent', error)
    }
  },

  // Get all windows for multiple parent work items at once (batch load)
  getByParents: async (parentTableName, parentCIds) => {
    try {
      if (!parentCIds || parentCIds.length === 0) return []

      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return []
      }

      const { data, error } = await supabase
        .from('windows')
        .select('*')
        .eq('user_id', userId)
        .in(parentColumnName, parentCIds)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (error) throw error
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('windowsApi.getByParents', error)
    }
  },

  // Create a new window
  create: async (window, parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return null
      }

      const c_id = window.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('windows')
        .insert([{
          c_id,
          user_id: userId,
          size1: window.size1 || window.width || 0,
          size2: window.size2 || window.height || 0,
          [parentColumnName]: parentCId
        }])
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('windowsApi.create', error)
    }
  },

  // Update a window
  update: async (windowCId, updates) => {
    try {
      const { data, error } = await supabase
        .from('windows')
        .update({
          size1: updates.size1 || updates.width || 0,
          size2: updates.size2 || updates.height || 0,
          updated_at: new Date().toISOString()
        })
        .eq('c_id', windowCId)
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('windowsApi.update', error)
    }
  },

  // Upsert a window (create or update)
  upsert: async (window, parentTableName, parentCId) => {
    try {
      const userId = await getCurrentUserId()
      const parentColumnName = tableNameToForeignKeyColumn(parentTableName)

      if (!parentColumnName) {
        console.warn(`No foreign key column mapping for table: ${parentTableName}`)
        return null
      }

      const c_id = window.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('windows')
        .upsert([{
          c_id,
          user_id: userId,
          size1: window.size1 || window.width || 0,
          size2: window.size2 || window.height || 0,
          [parentColumnName]: parentCId,
          updated_at: new Date().toISOString()
        }], { onConflict: 'c_id' })
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('windowsApi.upsert', error)
    }
  },

  // Soft delete a window (marks as deleted instead of removing)
  delete: async (windowCId) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('windows')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', windowCId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('windowsApi.delete', error)
    }
  }
}

// Helper function to map table name to foreign key column name for doors/windows
function tableNameToForeignKeyColumn(tableName) {
  const mapping = {
    'brick_load_bearing_walls': 'brick_load_bearing_wall_id',
    'brick_partitions': 'brick_partition_id',
    'facade_plasterings': 'facade_plastering_id',
    'netting_walls': 'netting_wall_id',
    'plasterboarding_offset_walls': 'plasterboarding_offset_wall_id',
    'plasterboarding_partitions': 'plasterboarding_partition_id',
    'plasterboarding_ceilings': 'plasterboarding_ceiling_id', // Windows only
    'plastering_walls': 'plastering_wall_id',
    'tile_ceramics': 'tile_ceramic_id'
  }
  return mapping[tableName] || null
}

// ========== HISTORY EVENTS ==========
// Syncs with iOS history_events table for cross-platform history display

export const historyEventsApi = {
  // Get all history events for a project (excludes soft-deleted)
  getByProjectId: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('history_events')
        .select('*')
        .eq('project_id', projectId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(item => ({ ...item, id: item.c_id }))
    } catch (error) {
      handleError('historyEventsApi.getByProjectId', error)
    }
  },

  // Create a new history event
  create: async (historyEvent) => {
    try {
      const userId = await getCurrentUserId()
      const c_id = historyEvent.c_id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('history_events')
        .insert([{
          c_id,
          user_id: userId,
          type: historyEvent.type,
          project_id: historyEvent.project_id,
          created_at: historyEvent.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('historyEventsApi.create', error)
    }
  },

  // Soft delete history event (marks as deleted instead of removing)
  delete: async (id) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('history_events')
        .update({
          is_deleted: true,
          deleted_at: now,
          updated_at: now
        })
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('historyEventsApi.delete', error)
    }
  }
}


// ========== PROFILES ==========

export const profilesApi = {
  getFilterYear: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('profiles')
        .select('project_filter_year')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.project_filter_year || 'all'
    } catch (error) {
      // Don't throw, just return default
      // handleError('profilesApi.getFilterYear', error)
      return 'all'
    }
  },

  upsertFilterYear: async (year) => {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, project_filter_year: year }, { onConflict: 'id' })

      if (error) throw error
      return true
    } catch (error) {
      handleError('profilesApi.upsertFilterYear', error)
    }
  },

  // Get full profile
  getProfile: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.warn('Error fetching profile:', error)
      return null
    }
  },

  // Activate free trial
  activateTrial: async (days = 14) => {
    try {
      const userId = await getCurrentUserId()
      const now = new Date()
      const trialUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          trial_until: trialUntil
        }, { onConflict: 'id' })

      if (error) throw error
      return trialUntil
    } catch (error) {
      handleError('profilesApi.activateTrial', error)
    }
  }
}

// ========== TEAMS & COLLABORATION ==========

export const teamsApi = {
  // Get all teams for current user
  getMyTeams: async () => {
    try {
      const userId = await getCurrentUserId()

      // 1. Get the IDs of teams the user is a member of (status='active')
      const { data: memberOf, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (memberError) throw memberError
      if (!memberOf || memberOf.length === 0) return []

      const teamIds = memberOf.map(m => m.team_id)

      // 2. Get the full details for those teams, including ALL members
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            role, 
            joined_at, 
            status,
            user_id,
            profiles!user_id (id, email, full_name, avatar_url)
          )
        `)
        .in('id', teamIds)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getMyTeams', error)
    }
  },

  // Search teams by name
  searchTeams: async (query) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.searchTeams', error)
    }
  },

  // Create new team
  create: async (name) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name, owner_id: userId }])
        .select()
        .single()

      if (error) throw error

      // Automatically add owner as active member
      await supabase.from('team_members').insert([{
        team_id: data.id,
        user_id: userId,
        role: 'owner',
        status: 'active'
      }])

      return data
    } catch (error) {
      handleError('teamsApi.create', error)
    }
  },

  // Invite a member (status='invited') or Join a team (status='active')
  join: async (teamId, userId = null) => {
    try {
      const isInvitation = !!userId
      const targetUserId = userId || await getCurrentUserId()

      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamId,
          user_id: targetUserId,
          role: 'member',
          status: isInvitation ? 'invited' : 'active'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.join', error)
    }
  },

  // Respond to invitation
  respondToInvitation: async (teamId, accept = true) => {
    try {
      const userId = await getCurrentUserId()
      if (accept) {
        const { error } = await supabase
          .from('team_members')
          .update({ status: 'active' })
          .eq('team_id', teamId)
          .eq('user_id', userId)
        if (error) throw error
        return true
      } else {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('user_id', userId)
        if (error) throw error
        return true
      }
    } catch (error) {
      handleError('teamsApi.respondToInvitation', error)
    }
  },

  // Get pending invitations for current user
  getMyInvitations: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'invited')

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getMyInvitations', error)
    }
  },

  // Get members of a team (counts both active and invited)
  getMembers: async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!user_id (id, email, full_name, avatar_url)
        `)
        .eq('team_id', teamId)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getMembers', error)
    }
  },

  // Share project with team
  shareProject: async (teamId, projectId) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('team_projects')
        .upsert([{
          team_id: teamId,
          project_id: projectId,
          shared_by_id: userId
        }], { onConflict: 'team_id,project_id' })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.shareProject', error)
    }
  },

  // Unshare project from team
  unshareProject: async (teamId, projectId) => {
    try {
      const { error } = await supabase
        .from('team_projects')
        .delete()
        .eq('team_id', teamId)
        .eq('project_id', projectId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('teamsApi.unshareProject', error)
    }
  },

  // Get shared projects for a team
  getSharedProjects: async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_projects')
        .select(`
          *,
          projects (*)
        `)
        .eq('team_id', teamId)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getSharedProjects', error)
    }
  },

  // Get eligible assignees for a project (members of all teams the project is shared with)
  getEligibleAssignees: async (projectId) => {
    try {
      // 1. Get all teams this project is shared with
      const { data: sharedTeams, error: sharedError } = await supabase
        .from('team_projects')
        .select('team_id')
        .eq('project_id', projectId)

      if (sharedError) throw sharedError
      if (!sharedTeams || sharedTeams.length === 0) return []

      const teamIds = sharedTeams.map(st => st.team_id)

      // 2. Get all members of those teams
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (name),
          profiles!user_id (id, email, full_name, avatar_url)
        `)
        .in('team_id', teamIds)
        .eq('status', 'active')

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getEligibleAssignees', error)
    }
  },

  // Assign job to user
  assignJob: async (assignment) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('job_assignments')
        .insert([{
          ...assignment,
          assigned_by_id: userId
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.assignJob', error)
    }
  },

  // Get jobs assigned to current user
  getMyJobs: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          projects (name),
          rooms (name)
        `)
        .eq('user_id', userId)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getMyJobs', error)
    }
  },

  // Get all assignments for a project
  getProjectAssignments: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          profiles!user_id (id, email, full_name, avatar_url)
        `)
        .eq('project_id', projectId)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getProjectAssignments', error)
    }
  },

  // Get all assignments for multiple projects (for team view)
  getTeamAssignments: async (projectIds) => {
    try {
      if (!projectIds || projectIds.length === 0) return []
      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          projects (name),
          rooms (name),
          profiles:user_id (id, email, full_name, avatar_url)
        `)
        .in('project_id', projectIds)

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getTeamAssignments', error)
    }
  },

  // Update a job assignment (status, notes, photos)
  updateAssignment: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('job_assignments')
        .update({
          ...updates,
          assigned_at: new Date().toISOString() // Or use a separate "updated_at" if we add it
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.updateAssignment', error)
    }
  },

  // Delete a job assignment (revoke task)
  deleteAssignment: async (id) => {
    try {
      const { error } = await supabase
        .from('job_assignments')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('teamsApi.deleteAssignment', error)
    }
  },

  // Remove a member from a team (owner only)
  removeMember: async (teamId, userId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('teamsApi.removeMember', error)
    }
  },

  // Delete a team (owner only) - cascades to team_members and team_projects
  deleteTeam: async (teamId) => {
    try {
      // Delete team_projects first
      await supabase
        .from('team_projects')
        .delete()
        .eq('team_id', teamId)

      // Delete team_members
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)

      // Delete the team itself
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('teamsApi.deleteTeam', error)
    }
  },

  // Get assignments for a specific member
  getMemberAssignments: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          projects (name),
          rooms (name, work_items)
        `)
        .eq('user_id', userId)
        .order('status', { ascending: false }) // Show pending first (pending > finished alphabetically? No, P > F. Wait. finished < pending. To show pending first, we want descending? pending > finished is true. )
      // Let's sort by status so 'pending' comes before 'finished' if we want active first.
      // Or just let the UI handle sorting.
      // Let's just order by created_at desc for now or similar.
      // Actually, let's stick to status if we want pending first. 'pending' > 'finished'.
      // So descending order of status puts pending first.

      if (error) throw error
      return data
    } catch (error) {
      handleError('teamsApi.getMemberAssignments', error)
    }
  }
}

export const userProfilesApi = {
  search: async (query) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      return data
    } catch (error) {
      handleError('userProfilesApi.search', error)
    }
  },

  // Get profiles by IDs
  getByIds: async (userIds) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (error) throw error
      return data
    } catch (error) {
      handleError('userProfilesApi.getByIds', error)
      return []
    }
  }
}

// ========== DENNIK (PROJECT-BASED TIME TRACKING) ==========

export const dennikApi = {
  // ===== PROJECT MEMBERS =====

  // Get all members for a project
  getProjectMembers: async (projectId) => {
    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Fetch user profiles separately from profiles table
      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds)

        // Merge profile data with members
        return members.map(member => ({
          ...member,
          profiles: profiles?.find(p => p.id === member.user_id) || null
        }))
      }

      return members || []
    } catch (error) {
      handleError('dennikApi.getProjectMembers', error)
      return []
    }
  },

  // Add a member to a project
  addProjectMember: async (projectId, userId, role = 'member') => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role
        })
        .select()
        .single()

      if (error) throw error

      // Fetch user profile separately
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', userId)
          .single()

        return {
          ...data,
          profiles: profile || null
        }
      }

      return data
    } catch (error) {
      handleError('dennikApi.addProjectMember', error)
    }
  },

  // Remove a member from a project
  removeProjectMember: async (projectId, userId) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('dennikApi.removeProjectMember', error)
    }
  },

  // ===== TIME ENTRIES =====

  // Get time entries for a project within a date range
  getTimeEntries: async (projectId, startDate, endDate) => {
    try {
      const query = supabase
        .from('dennik_time_entries')
        .select(`
          *,
          profiles (id, email, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

      if (startDate) {
        query.gte('date', startDate)
      }
      if (endDate) {
        query.lte('date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.getTimeEntries', error)
    }
  },

  // Get time entries for a specific user on a specific date
  getUserTimeEntries: async (projectId, userId, date) => {
    try {
      const { data, error } = await supabase
        .from('dennik_time_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('date', date)
        .order('start_time', { ascending: true })

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.getUserTimeEntries', error)
    }
  },

  // Get active timer for current user (entry with start_time but no end_time)
  getActiveTimer: async (projectId) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('dennik_time_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.getActiveTimer', error)
    }
  },

  // Start a timer (create entry with start_time only)
  startTimer: async (projectId, date = null) => {
    try {
      const userId = await getCurrentUserId()
      const now = new Date().toISOString()
      const entryDate = date || new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('dennik_time_entries')
        .insert({
          project_id: projectId,
          user_id: userId,
          date: entryDate,
          start_time: now
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.startTimer', error)
    }
  },

  // End a timer (update entry with end_time)
  endTimer: async (entryId) => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('dennik_time_entries')
        .update({ end_time: now })
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.endTimer', error)
    }
  },

  // Create a time entry manually
  createTimeEntry: async (projectId, entryData) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('dennik_time_entries')
        .insert({
          project_id: projectId,
          user_id: userId,
          ...entryData
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.createTimeEntry', error)
    }
  },

  // Update a time entry
  updateTimeEntry: async (entryId, updates) => {
    try {
      const { data, error } = await supabase
        .from('dennik_time_entries')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.updateTimeEntry', error)
    }
  },

  // Delete a time entry
  deleteTimeEntry: async (entryId) => {
    try {
      const { error } = await supabase
        .from('dennik_time_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      return true
    } catch (error) {
      handleError('dennikApi.deleteTimeEntry', error)
    }
  },

  // ===== PROJECT DENNIK MANAGEMENT =====

  // Enable dennik for a project
  enableDennik: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_dennik_enabled: true })
        .eq('c_id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.enableDennik', error)
    }
  },

  // Disable dennik for a project
  disableDennik: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_dennik_enabled: false })
        .eq('c_id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('dennikApi.disableDennik', error)
    }
  },

  // Get all dennik-enabled projects for current user (owned + member)
  getDennikProjects: async () => {
    try {
      const userId = await getCurrentUserId()

      // Get projects where user is owner and dennik is enabled
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*, owner:profiles (id, email, full_name, avatar_url)')
        .eq('user_id', userId)
        .eq('is_dennik_enabled', true)
        .order('created_at', { ascending: false })

      if (ownedError) throw ownedError

      // Get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          projects (*, owner:profiles (id, email, full_name, avatar_url))
        `)
        .eq('user_id', userId)
        .eq('projects.is_dennik_enabled', true)

      if (memberError) throw memberError

      // Combine and mark role
      const owned = (ownedProjects || []).map(p => ({ ...p, userRole: 'owner' }))
      const member = (memberProjects || []).map(pm => ({ ...pm.projects, userRole: pm.role }))

      return [...owned, ...member]
    } catch (error) {
      handleError('dennikApi.getDennikProjects', error)
    }
  },

  // Check if user has access to a project (owner or member)
  hasProjectAccess: async (projectId) => {
    try {
      const userId = await getCurrentUserId()

      // Check if owner
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

      if (projectError) throw projectError
      if (project) return { hasAccess: true, role: 'owner' }

      // Check if member
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

      if (memberError) throw memberError
      if (member) return { hasAccess: true, role: member.role }

      return { hasAccess: false, role: null }
    } catch (error) {
      handleError('dennikApi.hasProjectAccess', error)
    }
  }
}

// Export all APIs
const api = {
  contractors: contractorsApi,
  clients: clientsApi,
  projects: projectsApi,
  rooms: roomsApi,
  invoices: invoicesApi,
  workItems: workItemsApi,
  priceLists: priceListsApi,
  invoiceSettings: invoiceSettingsApi,
  receipts: receiptsApi,
  doors: doorsApi,
  windows: windowsApi,
  historyEvents: historyEventsApi,
  profiles: profilesApi,
  teams: teamsApi,
  userProfiles: userProfilesApi,
  dennik: dennikApi,
  supabase: supabase,
}

export default api

