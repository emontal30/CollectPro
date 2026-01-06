import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useArchiveStore = defineStore('archive', () => {
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);
  const isLoadingDates = ref(false);
  const isGlobalSearching = ref(false);
  const lastDatesFetchTime = ref(0);

  const { addNotification } = useNotifications();
  const authStore = useAuthStore();

  /**
   * بريفكس معزول لكل مستخدم لمنع تسريب البيانات بين الحسابات على نفس الجهاز.
   * يستخدم 'u_[userId]_arch_data_' كمفتاح أساسي.
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
   * تنظيف الأرشيفات المحلية القديمة (أقدم من 31 يوم) للحفاظ على مساحة الجهاز
   * يتم ذلك للمستخدم الحالي فقط بناءً على الـ Scoped DB_PREFIX
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
        logger.info(`🧹 Archive Cleanup: Removed ${deletedCount} old local archives (older than 31 days).`);
      }
    } catch (err) {
      logger.error('❌ ArchiveStore: cleanupOldArchives Error:', err);
    }
  }

  /**
   * جلب التواريخ المتاحة للمستخدم الحالي فقط
   */
  async function loadAvailableDates(force = false) {
    // تنظيف الأرشيفات القديمة أولاً
    await cleanupOldArchives();

    const now = Date.now();
    const shouldFetchCloud = force || (now - lastDatesFetchTime.value > 2 * 60 * 1000);

    try {
      isLoadingDates.value = true;
      const currentPrefix = DB_PREFIX.value;

      // 1. جلب التواريخ المحلية للمستخدم الحالي فقط (الفلترة بناءً على البريفكس المعزول)
      const allKeys = await localforage.keys();
      const localDates = allKeys
        .filter(k => k.startsWith(currentPrefix))
        .map(k => k.replace(currentPrefix, ''));

      const updateList = (cDates = []) => {
        const dateMap = new Map();
        localDates.forEach(d => { 
          if (d && d.length >= 10) dateMap.set(d, { value: d, source: 'local' }); 
        });
        cDates.forEach(d => {
          if (d) {
            if (dateMap.has(d)) dateMap.get(d).source = 'synced'; 
            else dateMap.set(d, { value: d, source: 'cloud' });
          }
        });
        availableDates.value = Array.from(dateMap.values())
          .filter(item => !isNaN(new Date(item.value).getTime()))
          .sort((a, b) => new Date(b.value) - new Date(a.value));
      };

      updateList();

      // 2. جلب التواريخ من السحابة في الخلفية
      if (shouldFetchCloud && authStore.user && navigator.onLine) {
        try {
          const cloudPromise = api.archive.getAvailableDates(authStore.user.id);
          // زيادة وقت الانتظار إلى 15 ثانية لتجنب التايم أوت في الشبكات الضعيفة
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000));
          
          const result = await Promise.race([cloudPromise, timeoutPromise]);
          
          if (result && !result.error && result.dates) {
            updateList(result.dates);
            lastDatesFetchTime.value = Date.now();
          }
        } catch (cloudErr) {
          if (cloudErr.message === 'TIMEOUT') {
            logger.warn('⏳ ArchiveStore: Cloud dates fetch timed out (15s). Using local data.');
          } else {
            logger.warn('⚠️ ArchiveStore: Cloud dates fetch failed', cloudErr);
          }
        }
      }

    } catch (err) {
      logger.error('❌ ArchiveStore: loadAvailableDates Error:', err);
    } finally {
      isLoadingDates.value = false;
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
        
        const { data, error } = await api.archive.getArchiveByDate(user.id, dateStr);

        if (!error && data) {
          rows.value = data.map(r => ({...r, date: dateStr}));
          await localforage.setItem(localKey, data);
        } else {
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

  /**
   * البحث في أرشيفات المستخدم الحالي فقط
   */
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
      if (user) {
        const { error } = await api.archive.deleteArchiveByDate(user.id, dateStr);
        if (error && (error.status === 'offline' || error.status === 'network_error')) {
          await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
        } else if (error) {
          throw error;
        }
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
