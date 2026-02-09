import { supabase } from '../lib/supabase'

/**
 * Real-time Sync Service for Desktop App
 *
 * Subscribes to Supabase Realtime changes to keep desktop app in sync
 * with changes made from iOS or other clients.
 */

// Debounce timer to batch rapid changes
let debounceTimer = null
const DEBOUNCE_DELAY = 500 // ms

// Track active subscriptions
let activeChannel = null

/**
 * Tables to subscribe to for real-time updates
 * Matches iOS RealtimeSyncService tables
 */
const REALTIME_TABLES = [
  // Primary entities
  'contractors',
  'clients',
  'projects',
  'rooms',
  'invoices',
  'receipts',
  'price_lists',
  'invoice_settings',
  'history_events',

  // Work item tables
  'brick_load_bearing_walls',
  'brick_partitions',
  'core_drills',
  'custom_materials',
  'custom_works',
  'demolitions',
  'doors',
  'facade_plasterings',
  'groutings',
  'installation_of_corner_beads',
  'installation_of_door_jambs',
  'installation_of_sanitaries',
  'laying_floating_floors',
  'levellings',
  'netting_ceilings',
  'netting_walls',
  'painting_ceilings',
  'painting_walls',
  'paving_ceramics',
  'penetration_coatings',
  'plasterboarding_ceilings',
  'plasterboarding_offset_walls',
  'plasterboarding_partitions',
  'plastering_ceilings',
  'plastering_of_window_sashes',
  'plastering_walls',
  'plumbings',
  'scaffoldings',
  'siliconings',
  'skirting_of_floating_floors',
  'tile_ceramics',
  'tool_rentals',
  'window_installations',
  'windows',
  'wirings'
]

/**
 * Create a real-time subscription for all tables
 * @param {string} userId - Current user ID
 * @param {Function} onDataChange - Callback when data changes
 * @returns {Function} Cleanup function to unsubscribe
 */
export const subscribeToRealtimeChanges = (userId, onDataChange) => {
  if (!userId) {
    console.warn('[RealtimeSync] No user ID provided, skipping subscription')
    return () => { }
  }

  // Clean up existing subscription
  if (activeChannel) {
    console.log('[RealtimeSync] Cleaning up existing subscription')
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  console.log('[RealtimeSync] Setting up real-time subscriptions for user:', userId)

  // Event buffer to batch rapid changes
  let eventBuffer = []

  // Reconnection state
  let reconnectTimer = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_DELAY = 30000 // 30 seconds max delay
  const BASE_RECONNECT_DELAY = 1000 // 1 second start delay

  const setupSubscription = () => {
    // Create a single channel for all table subscriptions (schema level)
    console.log(`[RealtimeSync] initializing subscription (attempt ${reconnectAttempts + 1})...`)

    const channel = supabase.channel('desktop-realtime-sync-global', {
      config: {
        broadcast: { self: false },
      }
    })

    // Subscribe to all changes in public schema
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
      },
      (payload) => {
        // CLIENT-SIDE FILTERING

        // 1. Filter by Table Name
        if (!REALTIME_TABLES.includes(payload.table)) {
          // console.log(`[RealtimeSync] Ignoring change in non-monitored table: ${payload.table}`)
          return
        }

        // 2. Filter by User ID
        // We need to check if this record belongs to the current user
        // For INSERT/UPDATE: check payload.new.user_id
        // For DELETE: check payload.old.user_id (if available) or assume relevant if we have it in local state

        let recordUserId = null

        if (payload.new && payload.new.user_id) {
          recordUserId = payload.new.user_id
        } else if (payload.old && payload.old.user_id) {
          recordUserId = payload.old.user_id
        }

        // If we can't determine user_id (e.g. DELETE with only ID), we should process it 
        // if we have local data, but to be safe/simple for now we'll process it.
        // Most tables have user_id.
        // NOTE: RLS Policies on server should prevents us receiving events for other users
        // even with schema-level subscription if properly configured. 
        // BUT strict client-side check is good practice.

        if (recordUserId && recordUserId !== userId) {
          // console.log('[RealtimeSync] Ignoring change from another user')
          return
        }

        // console.log(`[RealtimeSync] Change detected in ${payload.table}:`, payload.eventType)

        // Add to buffer
        eventBuffer.push({
          table: payload.table,
          eventType: payload.eventType,
          record: payload.new,
          oldRecord: payload.old,
          timestamp: Date.now()
        })

        // Debounce flush
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
          if (eventBuffer.length > 0) {
            console.log(`[RealtimeSync] Flushing ${eventBuffer.length} batched events`)
            // Pass the copy of buffer and clear it
            const batch = [...eventBuffer]
            eventBuffer = []
            onDataChange(batch)
          }
        }, DEBOUNCE_DELAY)
      }
    )

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeSync] Successfully subscribed to real-time changes')
        reconnectAttempts = 0 // Reset attempts on success
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeSync] Channel error, attempting reconnect...')
        cleanupAndReconnect()
      } else if (status === 'TIMED_OUT') {
        console.warn('[RealtimeSync] Subscription timed out, attempting reconnect...')
        cleanupAndReconnect()
      } else if (status === 'CLOSED') {
        console.log('[RealtimeSync] Channel closed')
      }
    })

    activeChannel = channel
  }

  const cleanupAndReconnect = () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
    if (reconnectTimer) clearTimeout(reconnectTimer)

    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
    console.log(`[RealtimeSync] Scheduling reconnect in ${delay}ms`)

    reconnectTimer = setTimeout(() => {
      reconnectAttempts++
      setupSubscription()
    }, delay)
  }

  // Initial setup
  setupSubscription()

  // Return cleanup function
  return () => {
    console.log('[RealtimeSync] Unsubscribing from real-time changes')
    if (debounceTimer) clearTimeout(debounceTimer)
    if (reconnectTimer) clearTimeout(reconnectTimer)

    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
    eventBuffer = []
  }
}

/**
 * Categorize which data needs to be refreshed based on table name
 * @param {string} tableName - Name of the changed table
 * @returns {string[]} Array of data categories to refresh
 */
export const getRefreshCategories = (tableName) => {
  // Primary entities
  if (tableName === 'contractors') return ['contractors']
  if (tableName === 'clients') return ['clients']
  if (tableName === 'projects') return ['projects']
  if (tableName === 'rooms') return ['rooms']
  if (tableName === 'invoices') return ['invoices']
  if (tableName === 'receipts') return ['receipts']
  if (tableName === 'price_lists') return ['priceLists']
  if (tableName === 'invoice_settings') return ['invoiceSettings']
  if (tableName === 'history_events') return ['history']

  // Work items - refresh rooms data
  const workItemTables = [
    'brick_load_bearing_walls', 'brick_partitions', 'core_drills',
    'custom_materials', 'custom_works', 'demolitions', 'doors',
    'facade_plasterings', 'groutings', 'installation_of_corner_beads',
    'installation_of_door_jambs', 'installation_of_sanitaries',
    'laying_floating_floors', 'levellings', 'netting_ceilings',
    'netting_walls', 'painting_ceilings', 'painting_walls',
    'paving_ceramics', 'penetration_coatings', 'plasterboarding_ceilings',
    'plasterboarding_offset_walls', 'plasterboarding_partitions',
    'plastering_ceilings', 'plastering_of_window_sashes', 'plastering_walls',
    'plumbings', 'scaffoldings', 'siliconings', 'skirting_of_floating_floors',
    'tile_ceramics', 'tool_rentals', 'window_installations', 'windows', 'wirings'
  ]

  if (workItemTables.includes(tableName)) {
    return ['workItems']
  }

  return []
}

/**
 * Check if realtime is connected
 * @returns {boolean}
 */
export const isRealtimeConnected = () => {
  return activeChannel !== null
}

const realtimeSyncService = {
  subscribeToRealtimeChanges,
  getRefreshCategories,
  isRealtimeConnected
}

export default realtimeSyncService
