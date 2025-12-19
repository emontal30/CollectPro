import localforage from 'localforage';
import { useArchiveStore } from '@/stores/archiveStore';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';

const QUEUE_KEY = 'archive_sync_queue';

async function addToSyncQueue(item) {
  try {
    let queue = (await localforage.getItem(QUEUE_KEY)) || [];
    
    // Normalize getting the date, whether it's nested in payload or not
    const newDate = item.payload ? item.payload.archive_date : item.archive_date;

    // Don't add if there's no date
    if (!newDate) {
      logger.warn('⚠️ addToSyncQueue called with an item that has no date.', { item });
      return;
    }

    // Avoid adding duplicates by checking the date in either structure
    const exists = queue.some(q => {
      const oldDate = q.payload ? q.payload.archive_date : q.archive_date;
      return oldDate === newDate;
    });

    if (!exists) {
      queue.push(item);
      await localforage.setItem(QUEUE_KEY, queue);
      logger.info(`📌 Added to sync queue: ${newDate}`);
    } else {
      logger.info(`📋 Item for date ${newDate} already in queue. Skipping.`);
    }
  } catch (err) {
    // This catch block is crucial for handling malformed items during the .some() check
    logger.error('Error adding to sync queue. The queue might contain a malformed item.', err);
  }
}

async function processQueue() {
  const archiveStore = useArchiveStore();
  const { addNotification } = useNotifications();
  let queue = (await localforage.getItem(QUEUE_KEY)) || [];

  if (queue.length === 0) {
    return;
  }

  logger.info(`🔄 Processing sync queue with ${queue.length} item(s)`);

  while (queue.length > 0) {
    if (!navigator.onLine) {
      logger.warn('🔌 Connection lost. Pausing sync queue.');
      return;
    }

    const item = queue.shift(); // Process one by one

    // --- Start of new robust logic ---

    // 1. Normalize data from either structure
    const isPayloadNested = !!item.payload;
    const source = isPayloadNested ? item.payload : item;
    
    const { user_id, archive_date, data } = source;

    // 2. Validate the extracted data
    if (!user_id || !archive_date || !data) {
      logger.error('❌ Invalid or malformed item in sync queue, skipping.', { original_item: item });
      // Update the queue to permanently remove the bad item
      await localforage.setItem(QUEUE_KEY, queue); 
      continue; // Move to the next item
    }

    // 3. Prepare the payload for the store function
    const uploadPayload = { user_id, archive_date, data };

    // --- End of new robust logic ---
    
    try {
      // 4. Call the store function with the unified payload object
      await archiveStore.uploadArchive(uploadPayload);
      addNotification(`تمت مزامنة أرشيف تاريخ ${archive_date} بنجاح في قاعدة البيانات`, 'success');
      await localforage.setItem(QUEUE_KEY, queue); // Update queue after successful upload
    } catch (err) {
      // Log the full error object received from the store for better debugging
      logger.error(`❌ Sync failed for date ${archive_date}. The error object from the store is:`, err);
      logger.error('The item that failed to sync will be re-queued. Item:', item);

      queue.unshift(item); // Add back to the front of the queue to retry next time
      await localforage.setItem(QUEUE_KEY, queue);
      // Stop processing if an error occurs to avoid multiple failures
      return; 
    }
  }
}

function initializeSyncListener() {
  window.addEventListener('online', processQueue);
  logger.info('👂 Online event listener for sync queue initialized.');

  // Also try to process the queue on startup, in case the app was closed while offline
  if(navigator.onLine) {
    processQueue();
  }
}

async function clearSyncQueue() {
  await localforage.removeItem(QUEUE_KEY);
  logger.info('🗑️ Archive sync queue cleared.');
  const { addNotification } = useNotifications();
  addNotification('تم مسح قائمة المزامنة بنجاح.', 'info');
}

export { addToSyncQueue, processQueue, initializeSyncListener, clearSyncQueue };