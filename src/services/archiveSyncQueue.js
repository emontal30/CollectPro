/**
 * Archive Sync Queue Manager
 * Manages offline archive operations and syncs when connection is restored
 */

import localforage from 'localforage';
import api from '@/services/api';

const QUEUE_STORE = 'archive_sync_queue';
const TIMESTAMP_STORE = 'archive_timestamps';

/**
 * Initialize localForage stores
 */
export async function initQueueStore() {
  try {
    await localforage.setItem('_initialized', true);
    console.log('✅ Archive sync queue initialized');
  } catch (err) {
    console.error('Failed to initialize queue store:', err);
  }
}

/**
 * Add archive operation to sync queue
 */
export async function addToSyncQueue(archiveData) {
  try {
    const queue = (await localforage.getItem(QUEUE_STORE)) || [];
    queue.push({
      id: `${Date.now()}-${Math.random()}`,
      data: archiveData,
      timestamp: Date.now(),
      retries: 0
    });
    await localforage.setItem(QUEUE_STORE, queue);
    console.log('📌 Archive added to sync queue (total pending:', queue.length, ')');
    return queue.length;
  } catch (err) {
    console.error('Error adding to sync queue:', err);
    return 0;
  }
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems() {
  try {
    return (await localforage.getItem(QUEUE_STORE)) || [];
  } catch (err) {
    console.error('Error getting pending sync items:', err);
    return [];
  }
}

/**
 * Remove sync item after successful upload
 */
export async function removeSyncItem(itemId) {
  try {
    const queue = (await localforage.getItem(QUEUE_STORE)) || [];
    const filtered = queue.filter(item => item.id !== itemId);
    await localforage.setItem(QUEUE_STORE, filtered);
    console.log('✅ Sync item removed (pending:', filtered.length, ')');
  } catch (err) {
    console.error('Error removing sync item:', err);
  }
}

/**
 * Update retry count for an item
 */
export async function incrementRetryCount(itemId) {
  try {
    const queue = (await localforage.getItem(QUEUE_STORE)) || [];
    const item = queue.find(q => q.id === itemId);
    if (item) {
      item.retries = (item.retries || 0) + 1;
      await localforage.setItem(QUEUE_STORE, queue);
    }
  } catch (err) {
    console.error('Error incrementing retry count:', err);
  }
}

/**
 * Clear entire sync queue
 */
export async function clearSyncQueue() {
  try {
    await localforage.setItem(QUEUE_STORE, []);
    console.log('🗑️ Sync queue cleared');
  } catch (err) {
    console.error('Error clearing sync queue:', err);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const queue = (await localforage.getItem(QUEUE_STORE)) || [];
    const totalRetries = queue.reduce((sum, item) => sum + (item.retries || 0), 0);
    return {
      pendingCount: queue.length,
      totalRetries,
      oldestItem: queue[0]?.timestamp ? new Date(queue[0].timestamp).toLocaleString('ar-EG') : null
    };
  } catch (err) {
    console.error('Error getting queue stats:', err);
    return { pendingCount: 0, totalRetries: 0, oldestItem: null };
  }
}

/**
 * Save archive timestamp for duplicate detection
 */
export async function saveArchiveTimestamp(date) {
  try {
    const timestamps = (await localforage.getItem(TIMESTAMP_STORE)) || {};
    timestamps[date] = Date.now();
    await localforage.setItem(TIMESTAMP_STORE, timestamps);
  } catch (err) {
    console.error('Error saving archive timestamp:', err);
  }
}

/**
 * Check if archive for a date was recently synced
 */
export async function wasRecentlySynced(date, withinMs = 60000) {
  try {
    const timestamps = (await localforage.getItem(TIMESTAMP_STORE)) || {};
    const timestamp = timestamps[date];
    if (!timestamp) return false;
    return Date.now() - timestamp < withinMs;
  } catch (err) {
    console.error('Error checking sync status:', err);
    return false;
  }
}

/**
 * Process pending sync queue — attempt to sync all queued archives to database
 * Called when connection is restored
 */
export async function processPendingSyncQueue() {
  try {
    const { supabase } = api;
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return { synced: 0, failed: 0 };
    }

    const queue = await getPendingSyncItems();

    if (queue.length === 0) {
      console.log('✅ No pending archives to sync');
      return { synced: 0, failed: 0 };
    }

    console.log(`🔄 Processing ${queue.length} pending archive(s)...`);

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        if (!navigator.onLine) {
          console.warn('⚠️ Connection lost during sync — pausing queue processing');
          break;
        }

        const { user_id, archive_date, rows } = item.data;

        if (!rows || rows.length === 0) {
          console.warn('⚠️ Skipping empty archive:', archive_date);
          await removeSyncItem(item.id);
          continue;
        }

        console.log(`📤 Syncing archive: ${archive_date} (attempt ${(item.retries || 0) + 1})`);

        // Delete old data for this date (replace)
        const { error: deleteError } = await supabase
          .from('archive_data')
          .delete()
          .eq('user_id', user_id)
          .eq('archive_date', archive_date);

        if (deleteError) throw deleteError;

        // Insert new data
        const { error: insertError } = await supabase
          .from('archive_data')
          .insert(rows);

        if (insertError) throw insertError;

        // Update archive_dates table
        await supabase
          .from('archive_dates')
          .upsert(
            { user_id, archive_date },
            { onConflict: 'user_id, archive_date' }
          );

        // Success — remove from queue
        await removeSyncItem(item.id);
        synced++;
        console.log(`✅ Archive synced: ${archive_date}`);
      } catch (err) {
        console.error(`❌ Failed to sync archive ${item.data?.archive_date}:`, err.message);
        await incrementRetryCount(item.id);
        failed++;

        // Stop on persistent errors
        if (err.message?.includes('401') || err.message?.includes('403')) {
          console.error('🚨 Authentication error — stopping sync queue processing');
          break;
        }
      }
    }

    console.log(`📊 Sync queue processing complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  } catch (err) {
    console.error('Error processing sync queue:', err);
    return { synced: 0, failed: 0 };
  }
}
