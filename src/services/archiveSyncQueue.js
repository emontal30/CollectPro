import localforage from 'localforage';
import { useArchiveStore } from '@/stores/archiveStore';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';
import { supabase } from '@/supabase';

const QUEUE_KEY = 'archive_sync_queue';

/**
 * إضافة عملية (حفظ أو حذف) إلى طابور المزامنة
 */
async function addToSyncQueue(item) {
  try {
    let queue = (await localforage.getItem(QUEUE_KEY)) || [];
    
    // توحيد الحصول على التاريخ والنوع
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
      // إذا كانت أرشفة (إضافة)، نقوم بتحديث البيانات في الطابور بدلاً من التكرار
      if (type === 'daily_archive') {
        queue[existsIndex] = item;
        await localforage.setItem(QUEUE_KEY, queue);
        logger.info(`🔄 Updated sync queue: [${type}] for ${date}`);
      }
    }
  } catch (err) {
    logger.error('❌ SyncQueue Add Error:', err);
  }
}

/**
 * معالجة العمليات المنتظرة في الطابور
 */
async function processQueue() {
  const archiveStore = useArchiveStore();
  const { addNotification } = useNotifications();
  
  let queue = (await localforage.getItem(QUEUE_KEY)) || [];
  if (queue.length === 0) return;

  if (!navigator.onLine) return;

  logger.info(`🔄 Processing sync queue: ${queue.length} item(s)`);

  const remainingQueue = [...queue];
  const syncedArchives = [];
  const deletedArchives = [];

  while (remainingQueue.length > 0) {
    if (!navigator.onLine) break;

    const item = remainingQueue[0];
    const type = item.type;
    const source = item.payload || item;
    const date = source.archive_date || source.date;

    try {
      if (type === 'delete_archive') {
        const { error } = await supabase
          .from('daily_archives')
          .delete()
          .eq('user_id', source.user_id)
          .eq('archive_date', date);
        
        if (error) throw error;
        logger.info(`🗑️ Offline delete synced: ${date}`);
        deletedArchives.push(date);
      } else {
        // عملية أرشفة أو تحديث
        await archiveStore.uploadArchive(source);
        logger.info(`✅ Offline archive synced: ${date}`);
        syncedArchives.push(date);
      }

      // إزالة من الطابور بعد النجاح
      remainingQueue.shift();
      await localforage.setItem(QUEUE_KEY, remainingQueue);

    } catch (err) {
      logger.error(`❌ Sync failed for [${type}] ${date}:`, err);
      // توقف لتجنب تكرار الخطأ، سيتم المحاولة عند تغيير حالة الشبكة
      break; 
    }
  }

  // إرسال تنبيهات للمستخدم بعد انتهاء المزامنة
  if (syncedArchives.length > 0) {
    const datesStr = syncedArchives.join(', ');
    addNotification(`تم مزامنة أرشيف التواريخ: ${datesStr} سحابياً ✅`, 'success');
    await archiveStore.loadAvailableDates(); // تحديث القائمة لإظهار علامات المزامنة
  }

  if (deletedArchives.length > 0) {
    const datesStr = deletedArchives.join(', ');
    addNotification(`تم حذف التواريخ: ${datesStr} من السحاب بنجاح 🗑️`, 'success');
    await archiveStore.loadAvailableDates();
  }
}

/**
 * تهيئة مستمع حالة الشبكة
 */
function initializeSyncListener() {
  window.removeEventListener('online', processQueue); // منع التكرار
  window.addEventListener('online', processQueue);
  if (navigator.onLine) processQueue();
  logger.info('👂 Archive Sync Listener Active');
}

/**
 * مسح الطابور بالكامل (للطوارئ)
 */
async function clearSyncQueue() {
  try {
    await localforage.removeItem(QUEUE_KEY);
    logger.info('🗑️ Sync queue cleared');
    return true;
  } catch (err) {
    logger.error('❌ Clear Sync Queue Error:', err);
    return false;
  }
}

export { addToSyncQueue, processQueue, initializeSyncListener, clearSyncQueue };
