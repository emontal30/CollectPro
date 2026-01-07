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
  
  // Loading states
  const isLoading = ref(false); // لتحميل تفاصيل الأرشيف
  const isLoadingDates = ref(false); // لتحميل قائمة التواريخ (محلياً فقط)
  const isFetchingCloudDates = ref(false); // مؤشر لعملية الخلفية (سحابة)
  
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
   * تنظيف الأرشيفات المحلية القديمة (أقدم من 31 يوم)
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
   * المنطق 2: جلب التواريخ المتاحة
   * استراتيجية: عرض المحلي فوراً + تحديث صامت من السحابة
   */
  async function loadAvailableDates(force = false) {
    // تنظيف الأرشيفات القديمة أولاً
    await cleanupOldArchives();

    const currentPrefix = DB_PREFIX.value;
    const now = Date.now();
    // التحقق هل يجب الجلب من السحابة؟ (إجباري أو مر وقت كافٍ)
    const shouldFetchCloud = force || (now - lastDatesFetchTime.value > 2 * 60 * 1000);

    // --- المرحلة 1: الجلب المحلي (Blocking UI) ---
    // نستخدم isLoadingDates فقط هنا لضمان ظهور البيانات المحلية بسرعة
    try {
      isLoadingDates.value = true;
      const allKeys = await localforage.keys();

      // البحث عن المفاتيح الخاصة بالمستخدم + المفاتيح القديمة (Fallback)
      let keys = allKeys.filter(k => k.startsWith(currentPrefix));
      if (keys.length === 0 && currentPrefix !== BASE_PREFIX) {
          const legacyKeys = allKeys.filter(k => k.startsWith(BASE_PREFIX));
          keys = [...keys, ...legacyKeys];
      }

      // تحويل المفاتيح إلى قائمة تواريخ
      const localMap = new Map();
      keys.forEach(k => {
          const d = k.replace(currentPrefix, '').replace(BASE_PREFIX, '');
          if (d && d.length >= 10) {
             localMap.set(d, { value: d, source: 'local' });
          }
      });

      // تحديث الحالة فوراً لتظهر للمستخدم
      availableDates.value = Array.from(localMap.values())
        .sort((a, b) => new Date(b.value) - new Date(a.value));

    } catch (err) {
      logger.error('❌ ArchiveStore: Local dates fetch error:', err);
    } finally {
      // إيقاف التحميل فوراً ليتم عرض البيانات المحلية
      isLoadingDates.value = false;
    }

    // --- المرحلة 2: الجلب السحابي (Background Sync) ---
    // لا نغير isLoadingDates هنا حتى لا تختفي القائمة
    if (shouldFetchCloud && authStore.user && navigator.onLine && !isFetchingCloudDates.value) {
      isFetchingCloudDates.value = true;
      
      // نستخدم دالة غير متزامنة معزولة (IIFE) لعدم انتظار الاستجابة
      (async () => {
        try {
          const result = await retry(() => api.archive.getAvailableDates(authStore.user.id), {
            retries: 2,
            delay: 3000,
            onRetry: (attempt) => logger.warn(`Retrying cloud dates fetch (attempt ${attempt})...`)
          });

          if (result && result.dates) {
            // إعادة بناء القائمة بدمج المحلي والسحابي
            const currentLocal = new Map();
            // نعيد قراءة availableDates الحالية للحفاظ على ما هو موجود
            availableDates.value.forEach(d => currentLocal.set(d.value, { ...d, source: 'local' }));

            // دمج القادم من السحابة
            result.dates.forEach(d => {
              if (currentLocal.has(d)) {
                currentLocal.get(d).source = 'synced'; // موجود في الاثنين
              } else {
                currentLocal.set(d, { value: d, source: 'cloud' }); // موجود في السحابة فقط
              }
            });

            // تحديث القائمة النهائية
            availableDates.value = Array.from(currentLocal.values())
              .sort((a, b) => new Date(b.value) - new Date(a.value));

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

  /**
   * المنطق 1: جلب أرشيف تاريخ محدد
   * استراتيجية: المحلي أولاً (Cache-First) -> إذا لم يوجد اذهب للسحابة واحفظ
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    
    // تفعيل التحميل للجدول فقط
    isLoading.value = true;
    selectedDate.value = dateStr;
    isGlobalSearching.value = false;
    
    try {
      const localKey = `${DB_PREFIX.value}${dateStr}`;
      
      // 1. فحص المحلي
      const localData = await localforage.getItem(localKey);
      
      if (localData) {
        // وجدنا البيانات محلياً -> نعرضها فوراً ولا نذهب للسحابة
        // نتعامل مع هيكل البيانات سواء كان مصفوفة مباشرة أو كائن
        const dataRows = Array.isArray(localData) ? localData : (localData.rows || []);
        rows.value = dataRows.map(r => ({...r, date: dateStr}));
        
        // انتهينا هنا (Cache First)
      } else {
        // 2. لم نجد البيانات محلياً -> نذهب للسحابة
        const user = authStore.user;
        if (!user || !navigator.onLine) {
          rows.value = []; // لا يوجد إنترنت ولا بيانات محلية
          return;
        }
        
        try {
          const { data, error } = await retry(() => api.archive.getArchiveByDate(user.id, dateStr), {
            retries: 2,
            delay: 3000
          });

          if (!error && data) {
            // عرض البيانات
            rows.value = data.map(r => ({...r, date: dateStr}));
            // 3. حفظ في الكاش للمرة القادمة
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
      // الحذف المحلي دائماً أولاً
      await localforage.removeItem(`${DB_PREFIX.value}${dateStr}`);
      
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }

      const user = authStore.user;
      
      // الحذف السحابي أو جدولته
      if (user) {
        if (navigator.onLine) {
          try {
            const { error } = await retry(() => api.archive.deleteArchiveByDate(user.id, dateStr), {
              retries: 2,
              delay: 3000,
              onRetry: (attempt, err) => {
                 // لا نعيد المحاولة إذا كان الخطأ انترنت، ننتقل للجدولة
                 if (err.status === 'offline' || err.status === 'network_error') throw err;
              }
            });
            if (error) throw error;
          } catch (err) {
            // فشل الحذف المباشر -> إضافة للطابور
            await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
          }
        } else {
          // أوفلاين -> إضافة للطابور مباشرة
          await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
        }
      }

      // تحديث القائمة بعد الحذف
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
    isFetchingCloudDates,
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