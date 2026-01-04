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

  // Preserve the original error for debugging
  friendlyError.originalError = error
  friendlyError.userFriendly = true

  throw friendlyError
}

// ========== CONTRACTORS ==========

export const contractorsApi = {
  // Get all contractors for current user
  getAll: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('contractors')
        .select('c_id, name, contact_person_name, email, phone, web, street, second_row_street, city, postal_code, country, business_id, tax_id, vat_registration_number, bank_account_number, swift_code, legal_notice, logo_url, signature_url, price_offer_settings, user_id, created_at, updated_at')
        .eq('user_id', userId)
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

  // Delete contractor
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
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
  // Get all clients for current contractor
  getAll: async (contractorId) => {
    try {
      const userId = await getCurrentUserId()
      let query = supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)

      // Only filter by contractor if provided (contractor_id column stores contractor's c_id)
      if (contractorId) {
        query = query.eq('contractor_id', contractorId)
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

  // Delete client
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
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
  // Get all projects for contractor
  getAll: async (contractorId) => {
    try {
      const userId = await getCurrentUserId()
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)

      // Only filter by contractor if provided (contractor_id column stores contractor's c_id)
      if (contractorId) {
        query = query.eq('contractor_id', contractorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      // Map c_id to id for app compatibility
      return (data || []).map(item => ({ ...item, id: item.c_id }))
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

  // Delete project
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('projectsApi.delete', error)
    }
  }
}

// ========== ROOMS ==========

export const roomsApi = {
  // Get all rooms for a project (project_id now references project's c_id)
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', projectId)
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

  // Delete room
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
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
  // Get all invoices for contractor
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
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('c_id', id)
        .select()
        .single()

      if (error) throw error
      // Map c_id to id for app compatibility
      return data ? { ...data, id: data.c_id } : null
    } catch (error) {
      handleError('invoicesApi.update', error)
    }
  },

  // Delete invoice
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
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

  // Get work items by room and table (room_id now references room's c_id)
  getByRoom: async (roomId, tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('room_id', roomId)
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

  // Delete work item (by c_id)
  delete: async (tableName, id) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
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
      const { data, error } = await supabase
        .from(tableName)
        .upsert([{ ...workItem, c_id, user_id: userId }], { onConflict: 'c_id' })
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
  // Get all price lists for current user
  getAll: async () => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userId)

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

      const { data, error } = await supabase
        .from('price_lists')
        .insert([{
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
        }])
        .select()
        .single()

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

  // Delete price list for a project (cleanup when project is deleted)
  deleteByProject: async (projectId) => {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('price_lists')
        .delete()
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
  // Get all receipts for a project (project_id now references project's c_id)
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
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

  // Delete receipt (by c_id)
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
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

  // Delete a door
  delete: async (doorCId) => {
    try {
      const { error } = await supabase
        .from('doors')
        .delete()
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

  // Delete a window
  delete: async (windowCId) => {
    try {
      const { error } = await supabase
        .from('windows')
        .delete()
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
  // Get all history events for a project
  getByProjectId: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('history_events')
        .select('*')
        .eq('project_id', projectId)
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

  // Delete history event
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('history_events')
        .delete()
        .eq('c_id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('historyEventsApi.delete', error)
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
}

export default api
