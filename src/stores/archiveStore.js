import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { retry } from '@/utils/retryWrapper';

export const useArchiveStore = defineStore('archive', () => {
  // --- State ---
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);
  const isLoadingDates = ref(false);
  // Flag to avoid concurrent cloud fetches
  const isFetchingCloudDates = ref(false);
  const isGlobalSearching = ref(false);
  const lastDatesFetchTime = ref(0);

  const { addNotification } = useNotifications();
  const authStore = useAuthStore();

  /**
   * بريفكس معزول لكل مستخدم لمنع تسريب البيانات بين الحسابات
   */
  const BASE_PREFIX = 'arch_data_';
  const DB_PREFIX = computed(() => {
    const userId = authStore.user?.id;
    return userId ? `u_${userId}_${BASE_PREFIX}` : BASE_PREFIX;
  });

  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  const dateExists = computed(() => {
    return (date) => availableDates.value.some(d => d.value === date);
  });

  function getTodayLocal() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * تنظيف الأرشيفات المحلية القديمة
   */
  async function cleanupOldArchives() {
    try {
      const currentPrefix = DB_PREFIX.value;
      if (!currentPrefix || currentPrefix === BASE_PREFIX) return;

      const allKeys = await localforage.keys();
      const archKeys = allKeys.filter(k => k.startsWith(currentPrefix));
      
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 31);
      limitDate.setHours(0, 0, 0, 0);

      let deletedCount = 0;
      for (const key of archKeys) {
        const dateStr = key.replace(currentPrefix, '');
        const archDate = new Date(dateStr);
        
        if (!isNaN(archDate.getTime()) && archDate < limitDate) {
          await localforage.removeItem(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`🧹 Archive Cleanup: Removed ${deletedCount} old local archives.`);
      }
    } catch (err) {
      logger.error('❌ ArchiveStore: cleanupOldArchives Error:', err);
    }
  }

  /**
   * جلب التواريخ المتاحة
   * تم تعديل المنطق لضمان ظهور البيانات المحلية فوراً وعدم انتظار السحابة
   */
  async function loadAvailableDates(force = false) {
    await cleanupOldArchives();

    const now = Date.now();
    const shouldFetchCloud = force || (now - lastDatesFetchTime.value > 2 * 60 * 1000);
    const currentPrefix = DB_PREFIX.value;
    
    // متغير لتخزين التواريخ المحلية لاستخدامها لاحقاً في الدمج
    let localDatesSet = new Set();

    // --- المرحلة 1: جلب وعرض البيانات المحلية فوراً ---
    try {
      isLoadingDates.value = true;
      const allKeys = await localforage.keys();

      // جلب المفاتيح مع دعم المفاتيح القديمة (Legacy Fallback)
      let keys = allKeys.filter(k => k.startsWith(currentPrefix));
      
      // إذا لم نجد بيانات بالبريفكس الجديد، نبحث عن القديم لضمان عدم اختفاء البيانات
      if (keys.length === 0 && currentPrefix !== BASE_PREFIX) {
         const legacy = allKeys.filter(k => k.startsWith(BASE_PREFIX));
         keys = [...keys, ...legacy];
      }
      
      // استخراج التواريخ
      keys.forEach(k => {
          // نحذف أي بريفكس محتمل لنحصل على التاريخ الصافي
          const d = k.replace(currentPrefix, '').replace(BASE_PREFIX, '');
          if(d && d.length >= 10) localDatesSet.add(d);
      });

      // تحديث الحالة فوراً بالبيانات المحلية
      availableDates.value = Array.from(localDatesSet).map(d => ({
          value: d,
          source: 'local'
      })).sort((a, b) => new Date(b.value) - new Date(a.value));

    } catch (err) {
      logger.error('❌ ArchiveStore: Local dates fetch error:', err);
    } finally {
      // إيقاف التحميل فور انتهاء الجلب المحلي ليظهر المحتوى للمستخدم
      isLoadingDates.value = false;
    }

    // --- المرحلة 2: التحديث من السحابة في الخلفية (دون تعطيل الواجهة)
    // Run cloud fetch as fire-and-forget to avoid blocking callers/UI and
    // prevent excessive DB usage. Respect `lastDatesFetchTime` and
    // use `isFetchingCloudDates` to avoid concurrent requests.
    if (shouldFetchCloud && authStore.user && navigator.onLine && !isFetchingCloudDates.value) {
      isFetchingCloudDates.value = true;
      (async () => {
        try {
          const result = await retry(() => api.archive.getAvailableDates(authStore.user.id), {
            retries: 2,
            delay: 3000,
            onRetry: (attempt, err) => logger.warn(`Retrying cloud dates fetch (attempt ${attempt})...`, err)
          });

          if (result && result.dates) {
            const combinedMap = new Map();
            localDatesSet.forEach(d => combinedMap.set(d, { value: d, source: 'local' }));

            result.dates.forEach(d => {
              if (combinedMap.has(d)) combinedMap.get(d).source = 'synced';
              else combinedMap.set(d, { value: d, source: 'cloud' });
            });

            const merged = Array.from(combinedMap.values())
              .filter(item => !isNaN(new Date(item.value).getTime()))
              .sort((a, b) => new Date(b.value) - new Date(a.value));

            // Update list only if it changed (reduce writes)
            const same = merged.length === availableDates.value.length && merged.every((m, i) => m.value === availableDates.value[i]?.value && m.source === availableDates.value[i]?.source);
            if (!same) availableDates.value = merged;

            lastDatesFetchTime.value = Date.now();
          }
        } catch (cloudErr) {
          logger.error('❌ ArchiveStore: Cloud dates fetch failed (background)', cloudErr);
        } finally {
          isFetchingCloudDates.value = false;
        }
      })();
    }
  }

  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    isLoading.value = true;
    selectedDate.value = dateStr;
    isGlobalSearching.value = false;
    
    try {
      const localKey = `${DB_PREFIX.value}${dateStr}`;
      const localData = await localforage.getItem(localKey);
      
      if (localData) {
        rows.value = (Array.isArray(localData) ? localData : (localData.rows || [])).map(r => ({...r, date: dateStr}));
      } else {
        const user = authStore.user;
        if (!user || !navigator.onLine) {
          rows.value = [];
          return;
        }
        
        try {
          const { data, error } = await retry(() => api.archive.getArchiveByDate(user.id, dateStr), {
            retries: 2,
            delay: 3000,
            onRetry: (attempt, err) => logger.warn(`Retrying archive fetch (attempt ${attempt})...`)
          });

          if (!error && data) {
            rows.value = data.map(r => ({...r, date: dateStr}));
            await localforage.setItem(localKey, data);
          } else {
            rows.value = [];
          }
        } catch (fetchErr) {
          logger.error(`❌ ArchiveStore: Cloud fetch failed for ${dateStr}`, fetchErr);
          addNotification('فشل تحميل الأرشيف من السحابة', 'error');
          rows.value = [];
        }
      }
    } catch (err) {
      logger.error('❌ ArchiveStore: loadArchiveByDate Error:', err);
      addNotification('حدث خطأ أثناء تحميل بيانات الأرشيف', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function searchInAllArchives(query) {
    if (!query) return;
    
    isLoading.value = true;
    isGlobalSearching.value = true;
    const q = query.toLowerCase();
    const currentPrefix = DB_PREFIX.value;
    
    try {
      const allKeys = await localforage.keys();
      const archKeys = allKeys.filter(k => k.startsWith(currentPrefix));
      const allData = await Promise.all(archKeys.map(key => localforage.getItem(key)));

      const results = allData.flatMap((data, index) => {
        const key = archKeys[index];
        const dateStr = key.replace(currentPrefix, '');
        const records = Array.isArray(data) ? data : (data.rows || []);
        
        return records
          .filter(r => 
            (r.shop && r.shop.toLowerCase().includes(q)) || 
            (r.code && r.code.toString().toLowerCase().includes(q))
          )
          .map(r => ({ ...r, date: dateStr }));
      });

      rows.value = results;
      selectedDate.value = '';
    } catch (err) {
      logger.error('❌ Global Search Error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteArchive(dateStr) {
    if (!dateStr) return { success: false, message: 'لا يوجد تاريخ محدد' };
    isLoading.value = true;
    try {
      await localforage.removeItem(`${DB_PREFIX.value}${dateStr}`);
      
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }

      const user = authStore.user;
      
      if (user && navigator.onLine) {
        try {
          const { error } = await retry(() => api.archive.deleteArchiveByDate(user.id, dateStr), {
            retries: 2,
            delay: 3000,
            onRetry: (attempt, err) => {
              if (err.status !== 'offline' && err.status !== 'network_error') {
                 logger.warn(`Retrying delete for ${dateStr}...`, err);
              } else {
                 throw err;
              }
            }
          });

          if (error) throw error;

        } catch (err) {
          if (err.status === 'offline' || err.status === 'network_error') {
            await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
          } else {
            logger.error(`❌ ArchiveStore: Delete failed for ${dateStr}`, err);
            addNotification('فشل حذف الأرشيف من السحابة', 'error');
          }
        }
      } else if (user) {
        await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
      }

      await loadAvailableDates(true);
      return { success: true, message: `تم حذف الأرشيف بنجاح 🗑️` };
    } catch (err) {
      logger.error('❌ ArchiveStore: deleteArchive Error:', err);
      return { success: false, message: 'فشل في حذف الأرشيف' };
    } finally {
      isLoading.value = false;
    }
  }

  return {
    rows, 
    availableDates, 
    selectedDate, 
    isLoading, 
    isLoadingDates,
    isGlobalSearching,
    totals,
    getTodayLocal,
    loadAvailableDates, 
    loadArchiveByDate, 
    searchInAllArchives,
    deleteArchive,
    DB_PREFIX,
    cleanupOldArchives,
    dateExists
  };
});