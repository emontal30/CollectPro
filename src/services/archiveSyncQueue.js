import localforage from 'localforage';
import { useArchiveStore } from '@/stores/archiveStore';
import { useAuthStore } from '@/stores/auth';
import { useHarvestStore } from '@/stores/harvest';
import { useNotifications } from '@/composables/useNotifications';
import { useSyncStore } from '@/stores/syncStore'; // Import new store
import logger from '@/utils/logger.js';
import { supabase } from '@/supabase';
import api from '@/services/api';

export const QUEUE_KEY = 'archive_sync_queue'; // Exported for store usage

// متغير لمنع معالجة متزامنة (Race Condition Protection)
let isProcessing = false;
let processingPromise = null;

/**
 * إضافة عملية (حفظ أو حذف) إلى طابور المزامنة
 */
async function addToSyncQueue(item) {
  try {
    let queue = (await localforage.getItem(QUEUE_KEY)) || [];

    const type = item.type || 'daily_archive';
    const source = item.payload || item;
    const date = source.archive_date || source.date;

    if (!date) {
      logger.warn('⚠️ SyncQueue: Item missing date, skipping.', { item });
      return;
    }

    // تجنب تكرار نفس العملية لنفس التاريخ
    const existsIndex = queue.findIndex(q => {
      const qSource = q.payload || q;
      const qDate = qSource.archive_date || qSource.date;
      return q.type === type && qDate === date;
    });

    if (existsIndex === -1) {
      queue.push(item);
      await localforage.setItem(QUEUE_KEY, queue);
      logger.info(`📌 Added to sync queue: [${type}] for ${date}`);
    } else {
      // تحديث للأنواع التي قد تتغير بياناتها
      if (type === 'daily_archive' || type === 'sync_overdue_stores') {
        queue[existsIndex] = item;
        await localforage.setItem(QUEUE_KEY, queue);
        logger.info(`🔄 Updated sync queue: [${type}] for ${date}`);
      }
      // delete_archive لا يحتاج تحديث (عملية حذف بسيطة)
    }

    // Update Sync Status UI
    const syncStore = useSyncStore();
    syncStore.checkQueue();

    // Trigger processing immediately if online
    if (navigator.onLine) {
      // استخدام void لتفادي مشاكل ESLint مع Promise غير المحظوظة
      void processQueue();
    }

  } catch (err) {
    logger.error('❌ SyncQueue Add Error:', err);
  }
}

/**
 * معالجة العمليات المنتظرة في الطابور
 * مع حماية من Race Conditions (منع المعالجة المتزامنة)
 */
async function processQueue() {
  // منع المعالجة المتزامنة - إذا كانت المعالجة جارية، ننتظرها
  if (isProcessing) {
    if (processingPromise) {
      logger.info('⏳ SyncQueue: Already processing, attaching to existing promise.');
      return processingPromise;
    }
    return;
  }

  // تحديد حالة المعالجة
  isProcessing = true;

  // إنشاء promise للمعالجة حتى يمكن للعمليات الأخرى الانتظار
  processingPromise = (async () => {
    try {
      return await _processQueueInternal();
    } finally {
      isProcessing = false;
      processingPromise = null;
    }
  })();

  return processingPromise;
}

/**
 * الدالة الداخلية الفعلية للمعالجة
 */
async function _processQueueInternal() {
  const authStore = useAuthStore();
  const archiveStore = useArchiveStore();
  const syncStore = useSyncStore(); // Use Sync Store
  const { addNotification } = useNotifications();

  // 1. التحقق من الاتصال ووجود مستخدم مسجل دخول
  if (!navigator.onLine || !authStore.isAuthenticated || !authStore.user?.id) {
    syncStore.checkQueue(); // Update status even if we don't process
    return;
  }

  let queue = (await localforage.getItem(QUEUE_KEY)) || [];

  if (queue.length === 0) {
    syncStore.checkQueue();
    return;
  }

  logger.info(`🔄 Processing sync queue: ${queue.length} item(s)`);

  const syncedArchives = [];
  const deletedArchives = [];
  // const failedItems = []; // No longer needed as separate array

  // We process a COPY allowing us to manipulate the original queue state logically later
  const processingBatch = [...queue];
  const processedIndices = new Set(); // To track what we should remove

  for (let i = 0; i < processingBatch.length; i++) {
    const item = processingBatch[i];

    // --- Backoff Check with Exponential Backoff ---
    // If item failed recently, skip it to avoid hammering the server
    // Backoff time increases exponentially: 10s, 20s, 40s, 60s (max)
    const lastAttempt = item.lastAttempt || 0;
    const now = Date.now();
    const retryCount = item.retryCount || 0;

    if (retryCount > 0 && lastAttempt > 0) {
      // Exponential backoff: 10s * 2^retryCount, max 60s
      const backoffTime = Math.min(10000 * Math.pow(2, retryCount - 1), 60000);
      const timeSinceLastAttempt = now - lastAttempt;

      if (timeSinceLastAttempt < backoffTime) {
        logger.info(`⏳ Skipping item due to backoff: ${backoffTime - timeSinceLastAttempt}ms remaining`);
        continue; // Skip this item for now
      }
    }

    // Deadlock protection: Skip if retried too many times (10 times = ~10 mins)
    if (retryCount > 10) {
      logger.error(`❌ Item exceeded max retries (${retryCount}), removing from queue`, item);
      processedIndices.add(i); // Remove from queue (dead-letter)
      continue;
    }

    const type = item.type;
    const source = item.payload || item;
    const date = source.archive_date || source.date;

    try {
      if (type === 'sync_overdue_stores') {
        const payload = item.payload;
        const overdueItems = payload.items || [];
        const archiveDate = payload.archive_date;

        if (!archiveDate) {
          logger.error('❌ Missing archive_date in overdue sync payload');
          processedIndices.add(i); // Mark for removal (invalid)
          continue;
        }

        const harvestStore = useHarvestStore();
        // Pass a flag to avoid internal queueing on error, we handle it here
        await harvestStore.syncOverdueStoresToCloud(overdueItems, archiveDate, true);

        // Update local metadata
        const localMetadata = await localforage.getItem('overdue_stores_metadata');
        if (localMetadata && localMetadata.archive_date === archiveDate) {
          localMetadata.synced_to_cloud = true;
          await localforage.setItem('overdue_stores_metadata', localMetadata);
        }

        logger.info(`✅ Synced overdue stores for date: ${archiveDate}`);
        processedIndices.add(i); // Mark for removal (success)

      } else if (type === 'delete_archive') {
        const { error } = await supabase
          .from('daily_archives')
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('archive_date', date);

        if (error) throw error;
        deletedArchives.push(date);
        processedIndices.add(i); // Mark for removal (success)

      } else {
        const { error } = await api.archive.saveDailyArchive(authStore.user.id, date, source.data);
        if (error) throw error;
        syncedArchives.push(date);
        processedIndices.add(i); // Mark for removal (success)
      }
    } catch (err) {
      logger.error(`❌ Sync failed for [${type}]:`, err);
      // Don't remove from queue. Update retry metadata.
      // We modify the item IN PLACE within the local batch variable, 
      // but we need to ensure this update persists when we merge.
      item.lastAttempt = Date.now();
      item.retryCount = (item.retryCount || 0) + 1;
    }
  }

  // --- CRITICAL: Merge & Save ---
  // We fetch the queue AGAIN to account for items added *while* we were processing
  const currentQueue = (await localforage.getItem(QUEUE_KEY)) || [];

  // Reconstruct the new queue:
  // 1. Keep items from 'currentQueue' that were NOT part of our 'processingBatch' (newly added)
  // 2. Keep items from 'processingBatch' that FAILED (attempted but not in processedIndices)
  //    AND ensure we save their updated metadata (retryCount)
  // 3. Remove items that SUCCEEDED (in processedIndices)

  const newQueue = [];

  // A. Logic to handle items that might have been added/modified concurrently?
  // Since 'addToSyncQueue' appends or updates by (type+date), let's use a unique key map.

  // Helper to generate key
  const getItemKey = (it) => `${it.type}_${(it.payload?.archive_date || it.payload?.date || it.date)}`;

  // Map of our batch status
  const batchMap = new Map();
  processingBatch.forEach((item, idx) => {
    batchMap.set(getItemKey(item), {
      processed: processedIndices.has(idx),
      item: item // This has updated retryCount
    });
  });

  // Iterate over whatever is currently in storage
  for (const storedItem of currentQueue) {
    const key = getItemKey(storedItem);
    const batchInfo = batchMap.get(key);

    if (batchInfo) {
      // This item was part of our batch
      if (!batchInfo.processed) {
        // It failed. Keep it, but use the version with updated retryCount
        newQueue.push(batchInfo.item);
      }
      // If processed, we drop it (it's done)
    } else {
      // This item wasn't in our batch (added recently), keep it
      newQueue.push(storedItem);
    }
  }

  // Also catch edge case where something was in processingBatch but somehow not in currentQueue? 
  // (Unlikely unless 'addToSyncQueue' logic removed it, which it doesn't).

  await localforage.setItem(QUEUE_KEY, newQueue);

  // Update Sync Status UI immediately
  syncStore.checkQueue();

  // 3. إرسال تنبيهات
  // تم إيقاف التنبيه الثاني للأرشفة اليومية بناءً على طلب المستخدم لعدم الإزعاج
  // الرسالة الأولى عند الضغط على الزر تكفي
  /*
  if (syncedArchives.length > 0) {
    addNotification(`تم مزامنة أرشيف: ${syncedArchives.join(', ')} سحابياً ✅`, 'success');
  }
  */

  if (deletedArchives.length > 0) {
    addNotification(`تم حذف التواريخ: ${deletedArchives.join(', ')} من السحاب 🗑️`, 'success');
  }

  if (syncedArchives.length > 0 || deletedArchives.length > 0) {
    await archiveStore.loadAvailableDates();
  }

  // Check if we need to schedule another run (if there are failed items waiting for backoff or new items)
  if (newQueue.length > 0) {
    // Check if any item is ready to retry immediately (new items)
    const hasReadyItems = newQueue.some(i => !i.lastAttempt || (Date.now() - i.lastAttempt > 10000));
    if (hasReadyItems) {
      setTimeout(() => { void processQueue(); }, 1000);
    }
  }
}

/**
 * تهيئة مستمع المزامنة
 */
function initializeSyncListener() {
  const syncStore = useSyncStore();

  window.removeEventListener('online', processQueue);
  window.addEventListener('online', processQueue);

  // Initial check
  syncStore.checkQueue();

  // تشغيل أولي بعد استقرار الـ Auth (بعد 5 ثواني من التحميل)
  setTimeout(processQueue, 5000);
}

/**
 * مسح الطابور بالكامل (وظيفة للطوارئ)
 */
async function clearSyncQueue() {
  const syncStore = useSyncStore();
  try {
    await localforage.removeItem(QUEUE_KEY);
    logger.info('🗑️ Sync queue cleared');
    syncStore.checkQueue();
    return true;
  } catch (err) {
    logger.error('❌ Clear Sync Queue Error:', err);
    return false;
  }
}

export { addToSyncQueue, processQueue, initializeSyncListener, clearSyncQueue };
