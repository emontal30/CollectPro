import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useArchiveStore = defineStore('archive', () => {
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);

  const { addNotification } = useNotifications();

  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  const DB_PREFIX = 'arch_DATA_';

  async function archiveToday(dateStr, harvestData) {
    if (!harvestData || harvestData.length === 0) {
      addNotification('لا توجد بيانات لأرشفتها', 'warning');
      return;
    }

    isLoading.value = true;
    try {
      // 1. Save locally immediately
      await localforage.setItem(`${DB_PREFIX}${dateStr}`, harvestData);
      logger.info(`✅ Saved to LocalForage: ${dateStr}`);

      // 2. Handle online/offline sync
      if (navigator.onLine) {
        await uploadArchive(dateStr, harvestData);
        addNotification('تم الحفظ على الهاتف وقاعدة البيانات بنجاح', 'success');
      } else {
        await addToSyncQueue({ date: dateStr, data: harvestData });
        addNotification('تم الحفظ على الهاتف. سيتم الرفع تلقائياً عند توفر الإنترنت', 'info');
      }

      await loadAvailableDates();
    } catch (err) {
      logger.error('Archive Error:', err);
      addNotification(`فشل الأرشفة: ${err.message}`, 'error');
    } finally {
      isLoading.value = false;
    }
  }
  
  async function uploadArchive(dateStr, data) {
    const authStore = useAuthStore();
    const user = authStore.user;
    if (!user) throw new Error('User not authenticated for upload.');
  
    const payload = {
      user_id: user.id,
      archive_date: dateStr,
      data: data, 
    };
  
    // Using upsert to prevent duplicates for the same date
    const { error } = await api.archive.upsert(payload);
    if (error) throw error;
  
    logger.info(`☁️ Successfully uploaded archive for ${dateStr}`);
  }
  

  async function cleanupOldArchives() {
    try {
      const keys = await localforage.keys();
      const archiveKeys = keys.filter(key => key.startsWith(DB_PREFIX));
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      for (const key of archiveKeys) {
        const dateStr = key.replace(DB_PREFIX, '');
        const archiveDate = new Date(dateStr);
        if (archiveDate < thirtyOneDaysAgo) {
          await localforage.removeItem(key);
          logger.info(`🧹 Cleaned up old archive: ${key}`);
        }
      }
    } catch (err) {
      logger.error('Error cleaning up old archives:', err);
    }
  }

  async function loadAvailableDates() {
    logger.info('📅 Loading available archive dates...');
    isLoading.value = true;
    const authStore = useAuthStore();
    const user = authStore.user;

    try {
      const localDates = [];
      const keys = await localforage.keys();
      keys.forEach(key => {
        if (key.startsWith(DB_PREFIX)) {
          localDates.push(key.replace(DB_PREFIX, ''));
        }
      });

      let cloudDates = [];
      if (navigator.onLine && user) {
        const { dates, error } = await api.archive.getAvailableDates(user.id);

        if (error) {
          logger.error('Failed to fetch cloud dates:', error);
          addNotification('فشل في جلب التواريخ السحابية', 'error');
        } else {
          cloudDates = dates || [];
        }
      }

      const combinedDates = new Set([...localDates, ...cloudDates]);
      
      availableDates.value = Array.from(combinedDates)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({
          value: date,
          source: localDates.includes(date) ? 'local' : 'cloud'
        }));

    } catch (err) {
      logger.error('Failed to load available dates:', err);
      addNotification('حدث خطأ فادح أثناء تحميل التواريخ', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    isLoading.value = true;
    rows.value = [];
    selectedDate.value = dateStr;
    const authStore = useAuthStore();
    const user = authStore.user;

    try {
      const localData = await localforage.getItem(`${DB_PREFIX}${dateStr}`);
      if (localData) {
        logger.info(`📌 Loaded from LocalForage: ${dateStr}`);
        rows.value = localData;
        return;
      }

      if (navigator.onLine && user) {
        logger.info(`☁️ Fetching from Cloud: ${dateStr}`);
        const { data, error } = await api.archive.getArchiveByDate(user.id, dateStr);

        if (error) throw error;
        
        rows.value = data;
        await localforage.setItem(`${DB_PREFIX}${dateStr}`, data); // Cache for next time
      } else if (!user) {
        addNotification('يجب تسجيل الدخول لعرض الأرشيف السحابي', 'warning');
      }
      else {
        addNotification('لا يوجد اتصال بالإنترنت لتحميل هذا الأرشيف', 'warning');
      }

    } catch (err) {
      logger.error('Error loading date:', err);
      addNotification('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  return {
    rows,
    availableDates,
    selectedDate,
    isLoading,
    totals,
    loadAvailableDates,
    loadArchiveByDate,
    archiveToday,
    cleanupOldArchives,
    uploadArchive,
  };
});