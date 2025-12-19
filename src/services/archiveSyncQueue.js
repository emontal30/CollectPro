import localforage from 'localforage';
import { useArchiveStore } from '@/stores/archiveStore';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';

const QUEUE_KEY = 'archive_sync_queue';

async function addToSyncQueue(item) {
  try {
    const queue = (await localforage.getItem(QUEUE_KEY)) || [];
    // Avoid adding duplicates
    const exists = queue.some(q => q.date === item.date);
    if (!exists) {
      queue.push(item);
      await localforage.setItem(QUEUE_KEY, queue);
      logger.info(`📌 Added to sync queue: ${item.date}`);
    }
  } catch (err) {
    logger.error('Error adding to sync queue:', err);
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
    try {
      await archiveStore.uploadArchive(item.date, item.data);
      addNotification(`تمت مزامنة أرشيف تاريخ ${item.date} بنجاح في قاعدة البيانات`, 'success');
      await localforage.setItem(QUEUE_KEY, queue); // Update queue after successful upload
    } catch (err) {
      logger.error(`❌ Failed to sync ${item.date}. Re-queueing.`, err);
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

export { addToSyncQueue, processQueue, initializeSyncListener };
