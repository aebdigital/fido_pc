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
        .select('id, name, contact_person_name, email, phone, web, street, second_row_street, city, postal_code, country, business_id, tax_id, vat_registration_number, bank_account_number, swift_code, legal_notice, logo_url, signature_url, price_offer_settings, user_id, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('contractorsApi.getAll', error)
    }
  },

  // Get contractor by ID
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('contractorsApi.getById', error)
    }
  },

  // Create new contractor
  create: async (contractor) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('contractors')
        .insert([{ ...contractor, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)

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

      // Only filter by contractor if provided
      if (contractorId) {
        query = query.eq('c_id', contractorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('clientsApi.getAll', error)
    }
  },

  // Get client by ID
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('clientsApi.getById', error)
    }
  },

  // Create new client
  create: async (client) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)

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

      // Only filter by contractor if provided
      if (contractorId) {
        query = query.eq('c_id', contractorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('projectsApi.getAll', error)
    }
  },

  // Get project by ID
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('projectsApi.getById', error)
    }
  },

  // Create new project
  create: async (project) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...project, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('projectsApi.delete', error)
    }
  }
}

// ========== ROOMS ==========

export const roomsApi = {
  // Get all rooms for a project
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('roomsApi.getByProject', error)
    }
  },

  // Get room by ID
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('roomsApi.getById', error)
    }
  },

  // Create new room
  create: async (room) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ ...room, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)

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
          projects!invoices_project_id_fkey (id, name, category),
          contractors (id, name)
        `)
        .eq('user_id', userId)

      // Only filter by contractor if provided
      if (contractorId) {
        query = query.eq('c_id', contractorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('invoicesApi.getAll', error)
    }
  },

  // Get invoice by ID
  getById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          projects!invoices_project_id_fkey (*),
          contractors (*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('invoicesApi.getById', error)
    }
  },

  // Get invoice by project ID
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data
    } catch (error) {
      handleError('invoicesApi.getByProject', error)
    }
  },

  // Create new invoice
  create: async (invoice) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...invoice, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .eq('id', id)

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
  getAllForRoomRPC: async (roomId, contractorId = null) => {
    try {
      const params = { p_room_id: roomId };
      if (contractorId) {
        params.p_contractor_id = contractorId;
      }
      const { data, error } = await supabase.rpc('get_room_items', params)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      // Don't throw for RPC errors, just log and return null so fallback or empty state can handle it
      console.error('RPC Error:', error)
      return { data: [], error }
    }
  },

  // Get work items by room and table
  getByRoom: async (roomId, tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError(`workItemsApi.getByRoom(${tableName})`, error)
    }
  },

  // Create work item
  create: async (tableName, workItem) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ ...workItem, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError(`workItemsApi.create(${tableName})`, error)
    }
  },

  // Update work item
  update: async (tableName, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError(`workItemsApi.update(${tableName})`, error)
    }
  },

  // Delete work item
  delete: async (tableName, id) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError(`workItemsApi.delete(${tableName})`, error)
    }
  }
}

// ========== PRICE LISTS ==========

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
      return data || []
    } catch (error) {
      handleError('priceListsApi.getAll', error)
    }
  },

  // Get price list for contractor
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
        .eq('c_id', contractorId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      handleError('priceListsApi.get', error)
    }
  },

  // Create or update price list
  upsert: async (priceList) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('price_lists')
        .upsert([{ ...priceList, user_id: userId }], {
          onConflict: 'c_id,user_id'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('priceListsApi.upsert', error)
    }
  }
}

// ========== INVOICE SETTINGS ==========

export const invoiceSettingsApi = {
  // Get invoice settings for contractor
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
        .eq('c_id', contractorId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      handleError('invoiceSettingsApi.get', error)
    }
  },

  // Create or update invoice settings
  upsert: async (settings) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('invoice_settings')
        .upsert([{ ...settings, user_id: userId }], {
          onConflict: 'c_id,user_id'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('invoiceSettingsApi.upsert', error)
    }
  }
}

// ========== RECEIPTS ==========

export const receiptsApi = {
  // Get all receipts for a project
  getByProject: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('project_id', projectId)
        .order('receipt_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleError('receiptsApi.getByProject', error)
    }
  },

  // Create new receipt
  create: async (receiptData) => {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('receipts')
        .insert([{ ...receiptData, user_id: userId }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('receiptsApi.create', error)
    }
  },

  // Update receipt
  update: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleError('receiptsApi.update', error)
    }
  },

  // Delete receipt
  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      handleError('receiptsApi.delete', error)
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
}

export default api
