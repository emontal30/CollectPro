import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { supabase } from '@/supabase';

export const useArchiveStore = defineStore('archive', () => {
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);
  const isGlobalSearching = ref(false); // حالة للبحث الشامل

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
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }

  async function loadAvailableDates() {
    try {
      if (!authStore.user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          authStore.user = session.user;
        }
      }

      const user = authStore.user;
      const allKeys = await localforage.keys();
      const localDates = allKeys
        .filter(k => k.startsWith(DB_PREFIX))
        .map(k => k.replace(DB_PREFIX, ''));

      let cloudDates = [];
      
      if (navigator.onLine && user) {
        const { dates, error } = await apiInterceptor(
          api.archive.getAvailableDates(user.id)
        );
        
        if (!error && dates) {
          cloudDates = dates;
        }
      }

      const dateMap = new Map();
      localDates.forEach(d => { 
        if (d && d.length >= 10) dateMap.set(d, { value: d, source: 'local' }); 
      });

      cloudDates.forEach(d => {
        if (d) {
          if (dateMap.has(d)) dateMap.get(d).source = 'synced'; 
          else dateMap.set(d, { value: d, source: 'cloud' });
        }
      });

      availableDates.value = Array.from(dateMap.values())
        .filter(item => !isNaN(new Date(item.value).getTime()))
        .sort((a, b) => new Date(b.value) - new Date(a.value));
        
    } catch (err) {
      logger.error('❌ ArchiveStore: loadAvailableDates Error:', err);
    }
  }

  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    isLoading.value = true;
    selectedDate.value = dateStr;
    isGlobalSearching.value = false;
    
    try {
      if (!authStore.user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) authStore.user = session.user;
      }

      const user = authStore.user;
      const localKey = `${DB_PREFIX}${dateStr}`;
      const localData = await localforage.getItem(localKey);
      
      if (localData) {
        rows.value = (Array.isArray(localData) ? localData : (localData.rows || [])).map(r => ({...r, date: dateStr}));
      } else if (navigator.onLine && user) {
        const { data, error } = await apiInterceptor(
          api.archive.getArchiveByDate(user.id, dateStr)
        );

        if (!error && data) {
          rows.value = data.map(r => ({...r, date: dateStr}));
          await localforage.setItem(localKey, data);
        } else {
          rows.value = [];
        }
      } else {
        rows.value = [];
      }
    } catch (err) {
      logger.error('❌ ArchiveStore: loadArchiveByDate Error:', err);
      addNotification('حدث خطأ أثناء تحميل بيانات الأرشيف', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * البحث في جميع الأرشيفات المتاحة محلياً
   */
  async function searchInAllArchives(query) {
    if (!query || query.length < 2) return;
    
    isLoading.value = true;
    isGlobalSearching.value = true;
    const q = query.toLowerCase();
    const results = [];

    try {
      const allKeys = await localforage.keys();
      const archKeys = allKeys.filter(k => k.startsWith(DB_PREFIX));

      for (const key of archKeys) {
        const dateStr = key.replace(DB_PREFIX, '');
        const data = await localforage.getItem(key);
        const records = Array.isArray(data) ? data : (data.rows || []);
        
        const matches = records.filter(r => 
          (r.shop && r.shop.toLowerCase().includes(q)) || 
          (r.code && r.code.toString().toLowerCase().includes(q))
        ).map(r => ({ ...r, date: dateStr }));
        
        results.push(...matches);
      }

      rows.value = results;
      selectedDate.value = ''; // إلغاء اختيار التاريخ المحدد أثناء البحث الشامل
    } catch (err) {
      logger.error('❌ Global Search Error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadArchive(payload) {
    const { user_id, archive_date, data } = payload;
    const { error } = await apiInterceptor(
      api.archive.saveDailyArchive(user_id, archive_date, data)
    );
    if (error) throw error;
    return true;
  }

  async function deleteArchive(dateStr) {
    if (!dateStr) return { success: false, message: 'لا يوجد تاريخ محدد' };
    isLoading.value = true;
    try {
      const user = authStore.user;
      await localforage.removeItem(`${DB_PREFIX}${dateStr}`);
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }
      if (user) {
        if (navigator.onLine) {
          try {
            const { error } = await apiInterceptor(api.archive.deleteArchiveByDate(user.id, dateStr));
            if (error && (error.status === 'offline' || error.status === 'network_error' || error.silent)) {
              await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
            } else if (error) throw error;
          } catch (netErr) {
             await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
          }
        } else {
           await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
        }
      }
      await loadAvailableDates();
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
    isGlobalSearching,
    totals,
    loadAvailableDates, 
    loadArchiveByDate, 
    searchInAllArchives,
    deleteArchive,
    uploadArchive,
    getTodayLocal,
    DB_PREFIX
  };
});
