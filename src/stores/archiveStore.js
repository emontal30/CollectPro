import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { supabase } from '@/supabase';

export const useArchiveStore = defineStore('archive', () => {
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);
  const isGlobalSearching = ref(false);

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

  async function loadAvailableDates() {
    try {
      const user = authStore.user || (await supabase.auth.getSession()).data.session?.user;
      if (!user) return;

      const allKeys = await localforage.keys();
      const localDates = allKeys
        .filter(k => k.startsWith(DB_PREFIX))
        .map(k => k.replace(DB_PREFIX, ''));

      let cloudDates = [];
      
      // نعتمد على الخدمة الآن لأنها محمية بـ Interceptor
      const { dates, error } = await api.archive.getAvailableDates(user.id);
      if (!error && dates) {
        cloudDates = dates;
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
      const user = authStore.user || (await supabase.auth.getSession()).data.session?.user;
      const localKey = `${DB_PREFIX}${dateStr}`;
      const localData = await localforage.getItem(localKey);
      
      if (localData) {
        rows.value = (Array.isArray(localData) ? localData : (localData.rows || [])).map(r => ({...r, date: dateStr}));
      } else if (user) {
        const { data, error } = await api.archive.getArchiveByDate(user.id, dateStr);

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
      const user = authStore.user || (await supabase.auth.getSession()).data.session?.user;
      await localforage.removeItem(`${DB_PREFIX}${dateStr}`);
      
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }

      if (user) {
        const { error } = await api.archive.deleteArchiveByDate(user.id, dateStr);
        // إذا فشل الحذف بسبب الشبكة، نضيفه لطابور المزامنة
        if (error && (error.status === 'offline' || error.status === 'network_error')) {
          await addToSyncQueue({ type: 'delete_archive', payload: { user_id: user.id, archive_date: dateStr } });
        } else if (error) {
          throw error;
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
    getTodayLocal,
    loadAvailableDates, 
    loadArchiveByDate, 
    searchInAllArchives,
    deleteArchive,
    DB_PREFIX
  };
});
