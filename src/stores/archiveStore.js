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

  const DB_PREFIX = 'arch_data_'; 

  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  function getTodayLocal() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * جلب التواريخ المتاحة مع إظهار التواريخ المحلية فوراً
   */
  async function loadAvailableDates(force = false) {
    // توفير الاستهلاك: لا تقم بجلب بيانات السحابة إذا كانت حديثة (أقل من 2 دقيقة)
    const now = Date.now();
    const shouldFetchCloud = force || (now - lastDatesFetchTime.value > 2 * 60 * 1000);

    try {
      isLoadingDates.value = true;

      // 1. جلب التواريخ المحلية فوراً (INSTANT)
      const allKeys = await localforage.keys();
      const localDates = allKeys
        .filter(k => k.startsWith(DB_PREFIX))
        .map(k => k.replace(DB_PREFIX, ''));

      // تحديث القائمة فوراً بالبيانات المحلية لضمان عدم بقاء القائمة فارغة
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

      updateList(); // عرض البيانات المحلية أولاً

      // 2. جلب التواريخ من السحابة في الخلفية (إذا لزم الأمر)
      if (shouldFetchCloud && authStore.user && navigator.onLine) {
        try {
          // استخدام تايم آوت لضمان عدم تعليق العملية
          const cloudPromise = api.archive.getAvailableDates(authStore.user.id);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));
          
          const result = await Promise.race([cloudPromise, timeoutPromise]);
          
          if (result && !result.error && result.dates) {
            updateList(result.dates);
            lastDatesFetchTime.value = Date.now();
          }
        } catch (cloudErr) {
          logger.warn('⚠️ ArchiveStore: Cloud dates fetch failed or timed out', cloudErr);
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
      const localKey = `${DB_PREFIX}${dateStr}`;
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

  async function searchInAllArchives(query) {
    if (!query) return;
    
    isLoading.value = true;
    isGlobalSearching.value = true;
    const q = query.toLowerCase();
    
    try {
      const allKeys = await localforage.keys();
      const archKeys = allKeys.filter(k => k.startsWith(DB_PREFIX));
      const allData = await Promise.all(archKeys.map(key => localforage.getItem(key)));

      const results = allData.flatMap((data, index) => {
        const key = archKeys[index];
        const dateStr = key.replace(DB_PREFIX, '');
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
      await localforage.removeItem(`${DB_PREFIX}${dateStr}`);
      
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
    DB_PREFIX
  };
});
