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
    return () => {}
  }

  // Clean up existing subscription
  if (activeChannel) {
    console.log('[RealtimeSync] Cleaning up existing subscription')
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  console.log('[RealtimeSync] Setting up real-time subscriptions for user:', userId)

  // Create a single channel for all table subscriptions
  const channel = supabase.channel('desktop-realtime-sync', {
    config: {
      broadcast: { self: false }, // Don't receive own broadcasts
    }
  })

  // Subscribe to each table
  REALTIME_TABLES.forEach(tableName => {
    channel.on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: tableName,
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log(`[RealtimeSync] Change detected in ${tableName}:`, payload.eventType)

        // Debounce to batch rapid changes
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
          onDataChange({
            table: tableName,
            eventType: payload.eventType,
            record: payload.new,
            oldRecord: payload.old
          })
        }, DEBOUNCE_DELAY)
      }
    )
  })

  // Subscribe to the channel
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[RealtimeSync] Successfully subscribed to real-time changes')
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[RealtimeSync] Failed to subscribe to channel')
    } else if (status === 'TIMED_OUT') {
      console.warn('[RealtimeSync] Subscription timed out, will retry...')
    }
  })

  activeChannel = channel

  // Return cleanup function
  return () => {
    console.log('[RealtimeSync] Unsubscribing from real-time changes')
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }
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

export default {
  subscribeToRealtimeChanges,
  getRefreshCategories,
  isRealtimeConnected
}
