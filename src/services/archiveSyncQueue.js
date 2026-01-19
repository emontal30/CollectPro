import localforage from 'localforage';
import { useArchiveStore } from '@/stores/archiveStore';
import { useAuthStore } from '@/stores/auth';
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
      // إذا كانت أرشفة (إضافة)، نقوم بتحديث البيانات في الطابور بدلاً من التكرار
      if (type === 'daily_archive') {
        queue[existsIndex] = item;
        await localforage.setItem(QUEUE_KEY, queue);
        logger.info(`🔄 Updated sync queue: [${type}] for ${date}`);
      }
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
  const failedItems = [];

  for (const item of queue) {
    const type = item.type;
    const source = item.payload || item;
    const date = source.archive_date || source.date;

    try {
      if (type === 'delete_archive') {
        const { error } = await supabase
          .from('daily_archives')
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('archive_date', date);

        if (error) throw error;
        deletedArchives.push(date);
      } else {
        // استخدام API الأرشفة الموحد
        const { error } = await api.archive.saveDailyArchive(authStore.user.id, date, source.data);
        if (error) throw error;
        syncedArchives.push(date);
      }
    } catch (err) {
      logger.error(`❌ Sync failed for [${type}] ${date}:`, err);
      failedItems.push(item); // الاحتفاظ بالعناصر الفاشلة للمرة القادمة
    }
  }

  // 2. تحديث الطابور بما تبقى فقط
  await localforage.setItem(QUEUE_KEY, failedItems);

  // Update Sync Status UI immediately
  syncStore.checkQueue();

  // 3. إرسال تنبيهات مفصلة للمستخدم
  if (syncedArchives.length > 0) {
    addNotification(`تم مزامنة أرشيف: ${syncedArchives.join(', ')} سحابياً ✅`, 'success');
  }

  if (deletedArchives.length > 0) {
    addNotification(`تم حذف التواريخ: ${deletedArchives.join(', ')} من السحاب 🗑️`, 'success');
  }

  if (syncedArchives.length > 0 || deletedArchives.length > 0) {
    await archiveStore.loadAvailableDates();
  }

  // التحقق مرة أخرى من وجود عناصر جديدة في الطابور بعد المعالجة
  // (في حالة إضافة عناصر جديدة أثناء المعالجة)
  const remainingQueue = (await localforage.getItem(QUEUE_KEY)) || [];
  if (remainingQueue.length > 0) {
    logger.info(`🔄 Queue still has ${remainingQueue.length} item(s), scheduling another process...`);
    // جدولة معالجة أخرى بعد وقت قصير لمعالجة العناصر الجديدة
    setTimeout(() => {
      void processQueue();
    }, 1000);
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
