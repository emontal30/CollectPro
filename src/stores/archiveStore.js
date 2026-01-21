import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { retry } from '@/utils/retryWrapper';
import { TimeService } from '@/utils/time';

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

  async function getTodayLocal() {
    return await TimeService.getCairoDate();
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
   * استراتيجية محسّنة: Smart Comparison + Selective Fetching
   * 1. عرض المحلي فوراً
   * 2. مقارنة مع السحابة
   * 3. جلب البيانات الناقصة فقط (توفيراً للباندويدث)
   */
  async function loadAvailableDates(force = false) {
    // تنظيف الأرشيفات القديمة في الخلفية (Non-blocking)
    cleanupOldArchives().catch(err => logger.warn('Background cleanup error:', err));

    const currentPrefix = DB_PREFIX.value;
    const localDatesSet = new Set(); // لتسريع المقارنة

    // --- المرحلة 1: الجلب المحلي (Blocking UI for initial render) ---
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
          localDatesSet.add(d); // تخزين للمقارنة
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

    // --- المرحلة 2: المقارنة الذكية مع السحابة ---
    if (authStore.user && navigator.onLine) {
      isFetchingCloudDates.value = true;

      (async () => {
        try {
          const result = await retry(() => api.archive.getAvailableDates(authStore.user.id), {
            retries: 2,
            delay: 3000
          });

          if (result && result.dates) {
            const cloudDates = result.dates;

            // 🔍 مقارنة: إيجاد التواريخ الناقصة
            const missingDates = cloudDates.filter(date => !localDatesSet.has(date));

            if (missingDates.length === 0) {
              // ✅ جميع التواريخ متطابقة - لا حاجة لجلب أي شيء
              logger.info('✅ ArchiveStore: All dates synced. No missing archives.');

              // تحديث المصدر فقط (synced)
              const currentLocal = new Map();
              availableDates.value.forEach(d => {
                currentLocal.set(d.value, { value: d.value, source: 'synced' });
              });

              availableDates.value = Array.from(currentLocal.values())
                .sort((a, b) => new Date(b.value) - new Date(a.value));

            } else {
              // ⚠️ يوجد تواريخ ناقصة - جلبها بشكل انتقائي
              logger.info(`📥 ArchiveStore: Found ${missingDates.length} missing archives. Fetching...`);

              // جلب البيانات الناقصة فقط
              await fetchMissingArchives(missingDates);

              // دمج التواريخ المحلية مع الناقصة
              const allDatesMap = new Map();

              // إضافة المحلية الموجودة
              availableDates.value.forEach(d => {
                allDatesMap.set(d.value, { value: d.value, source: 'synced' });
              });

              // إضافة الناقصة المجلوبة
              missingDates.forEach(date => {
                allDatesMap.set(date, { value: date, source: 'synced' });
              });

              // تحديث القائمة النهائية
              availableDates.value = Array.from(allDatesMap.values())
                .sort((a, b) => new Date(b.value) - new Date(a.value));
            }

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
   * جلب بيانات الأرشيف للتواريخ الناقصة فقط
   */
  async function fetchMissingArchives(missingDates) {
    if (!missingDates || missingDates.length === 0) return;

    const user = authStore.user;
    if (!user) return;

    try {
      // جلب كل تاريخ ناقص بشكل متوازي (مع حد أقصى)
      const fetchPromises = missingDates.map(async (dateStr) => {
        try {
          const { data, error } = await retry(
            () => api.archive.getArchiveByDate(user.id, dateStr),
            { retries: 2, delay: 2000 }
          );

          if (!error && data) {
            // تخزين البيانات المجلوبة محلياً
            const localKey = `${DB_PREFIX.value}${dateStr}`;
            await localforage.setItem(localKey, data);
            logger.debug(`✅ Fetched and stored archive for ${dateStr}`);
            return { success: true, date: dateStr };
          } else {
            logger.warn(`⚠️ Failed to fetch archive for ${dateStr}:`, error);
            return { success: false, date: dateStr };
          }
        } catch (err) {
          logger.error(`❌ Error fetching archive for ${dateStr}:`, err);
          return { success: false, date: dateStr };
        }
      });

      const results = await Promise.all(fetchPromises);
      const successCount = results.filter(r => r.success).length;

      logger.info(`📊 Successfully fetched ${successCount}/${missingDates.length} missing archives.`);

    } catch (err) {
      logger.error('❌ ArchiveStore: fetchMissingArchives Error:', err);
    }
  }

  /**
   * المنطق 1: جلب أرشيف تاريخ محدد
   * استراتيجية: Stale-While-Revalidate
   * 1. اعرض المحلي فوراً (اذا وجد).
   * 2. اذهب للسحابة دائماً (اذا اونلاين) لجلب أحدث نسخة.
   * 3. حدث العرض والكاش.
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;

    selectedDate.value = dateStr;
    isGlobalSearching.value = false;

    // مفتاح الكاش المحلي
    const localKey = `${DB_PREFIX.value}${dateStr}`;
    let foundLocal = false;

    try {
      // 1. محاولة الجلب المحلي أولاً وعرضه فوراً
      const localData = await localforage.getItem(localKey);

      if (localData) {
        const dataRows = Array.isArray(localData) ? localData : (localData.rows || []);
        rows.value = dataRows.map(r => ({ ...r, date: dateStr }));
        foundLocal = true;
      }
    } catch (err) {
      logger.error('❌ ArchiveStore: Local load error', err);
    }

    // إذا لم نجد محلي، نفعل اللودينق، غير ذلك لا نفعله لكي لا نربك المستخدم (أو نتركه false لتحديث صامت)
    if (!foundLocal) {
      isLoading.value = true;
    }

    // 2. الجلب السحابي (Background Revalidation)
    // يتم دائماً طالما هناك انترنت، لضمان تحديث البيانات
    const user = authStore.user;
    if (user && navigator.onLine) {
      (async () => {
        try {
          const { data, error } = await retry(() => api.archive.getArchiveByDate(user.id, dateStr), {
            retries: 2,
            delay: 2000
          });

          if (!error && data) {
            // هل تغيرت البيانات؟ (يمكن إضافة مقارنة هنا، لكن للأمان نحدث دائماً)
            rows.value = data.map(r => ({ ...r, date: dateStr }));

            // 3. تحديث الكاش المحلي بالبيانات الجديدة
            await localforage.setItem(localKey, data);
          }
        } catch (fetchErr) {
          logger.error(`❌ ArchiveStore: Cloud refresh failed for ${dateStr}`, fetchErr);
          // في حالة الفشل، نكتفي بالمحلي الذي عرضناه
          if (!foundLocal) {
            addNotification('فشل تحميل الأرشيف من السحابة', 'error');
            rows.value = [];
          }
        } finally {
          isLoading.value = false;
        }
      })();
    } else {
      // لا يوجد انترنت
      isLoading.value = false;
      if (!foundLocal) {
        rows.value = []; // لا محلي ولا انترنت
      }
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

    // UI Feedback immediately
    isLoading.value = true;

    try {
      // 1. Local Delete (Immediate)
      await localforage.removeItem(`${DB_PREFIX.value}${dateStr}`);

      // Clear current view if it matches
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }

      // 2. Cloud Delete (Background / Fire & Forget strategy for UI responsiveness)
      const user = authStore.user;
      if (user) {
        // We do NOT await the cloud operation to keep UI snappy.
        // We trigger it and let it handle itself or fall back to queue.
        const deleteCloud = async () => {
          try {
            if (navigator.onLine) {
              const { error } = await retry(() => api.archive.deleteArchiveByDate(user.id, dateStr), {
                retries: 2,
                delay: 2000,
                timeout: 8000 // Reduced timeout
              });
              if (error) throw error;
            } else {
              throw new Error('Offline');
            }
          } catch (err) {
            // Silently queue for background sync
            logger.warn('⚠️ Cloud delete failed/skipped, queuing:', err.message);
            await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
          }
        };

        // Execute background task
        deleteCloud();
      }

      // 3. Refresh List (Immediate)
      // We don't need to wait for cloud to refresh the list, we just removed it locally.
      // But we should refresh available dates to update the dropdown.
      await loadAvailableDates(true); // This might be fast enough locally

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