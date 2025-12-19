import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/supabase'; 
import { useAuthStore } from '@/stores/auth';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useArchiveStore = defineStore('archive', () => {
  // --- State ---
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);

  // --- Composables ---
  const { addNotification } = useNotifications();
  const authStore = useAuthStore();

  // --- Constants ---
  const DB_PREFIX = 'arch_data_'; 
  const TABLE_NAME = 'daily_archives';

  // --- Computed ---
  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  // --- Actions ---

  /**
   * 1. Archive Today's Data
   */
  async function archiveToday(dateStr, harvestData) {
    if (!harvestData || harvestData.length === 0) {
      addNotification('لا توجد بيانات لأرشفتها', 'warning');
      return;
    }

    isLoading.value = true;
    try {
      const user = authStore.user;
      if (!user) throw new Error('المستخدم غير مسجل للدخول');

      const archivePayload = {
        user_id: user.id,
        archive_date: dateStr,
        data: harvestData,
        updated_at: new Date().toISOString()
      };

      // Save locally (using standard lowercase prefix)
      await localforage.setItem(`${DB_PREFIX}${dateStr}`, harvestData);
      logger.info(`✅ Saved locally: ${dateStr}`);

      // Sync
      if (navigator.onLine) {
        await _uploadToSupabase(archivePayload);
        addNotification('تم الحفظ محلياً وعلى السحابة بنجاح ✅', 'success');
      } else {
        await addToSyncQueue({ 
            user_id: user.id, 
            archive_date: dateStr, 
            data: harvestData 
        });
        addNotification('تم الحفظ على الهاتف 📱. سيتم الرفع عند توفر الإنترنت.', 'info');
      }

      await loadAvailableDates();

    } catch (err) {
      logger.error('Archive Error:', err);
      addNotification(`فشل الأرشفة: ${err.message}`, 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function _uploadToSupabase(payload) {
    logger.info(`Attempting to upsert archive for date: ${payload.archive_date}`, { payload });
    
    const { data, error, status, statusText } = await supabase
      .from(TABLE_NAME)
      .upsert({
        user_id: payload.user_id,
        archive_date: payload.archive_date,
        data: payload.data
      }, { onConflict: 'user_id, archive_date' });

    // Log the full response from Supabase for debugging
    logger.info('Supabase upsert response:', {
      data: data,
      error: error,
      status: status,
      statusText: statusText
    });

    if (error) {
      logger.error('Supabase upsert failed with an error object.', error);
      // Also notify the user with more specific feedback if possible
      const { addNotification } = useNotifications();
      let message = `فشل الرفع إلى السحابة: ${error.message}`;
      if (error.code === '42501') { // permission_denied
        message = 'فشل الرفع: لا توجد صلاحية للكتابة. يرجى مراجعة قواعد الأمان (RLS) في Supabase.';
      }
      addNotification(message, 'error');
      throw error;
    }

    logger.info(`☁️ Successfully upserted to Supabase: ${payload.archive_date}`);
  }

  /**
   * 2. Load Available Dates (FIXED: Case Insensitive)
   */
  async function loadAvailableDates() {
    isLoading.value = true;
    availableDates.value = [];
    const user = authStore.user;

    try {
      // A. Get Local Dates (Smart Check)
      const keys = await localforage.keys();
      const localDates = keys
        .filter(k => k.toLowerCase().startsWith('arch_data_')) // Checks for 'arch_data_' OR 'arch_DATA_'
        .map(k => {
            // Remove prefix regardless of case to get the date
            return k.replace(/arch_data_/i, ''); 
        });

      // B. Get Cloud Dates
      let cloudDates = [];
      if (navigator.onLine && user) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('archive_date')
          .eq('user_id', user.id)
          .order('archive_date', { ascending: false });

        if (error) {
          logger.error('Supabase Date Fetch Error:', error);
        } else if (data) {
          cloudDates = data.map(d => d.archive_date);
        }
      }

      // C. Merge
      const uniqueDates = new Set([...localDates, ...cloudDates]);

      availableDates.value = Array.from(uniqueDates)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => {
          const isLocal = localDates.includes(date);
          return {
            value: date,
            source: isLocal ? 'local' : 'cloud'
          };
        });
        
      logger.info(`📅 Available dates loaded: ${availableDates.value.length}`);

    } catch (err) {
      logger.error('Load Dates Error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 3. Load Specific Archive Date (FIXED: Case Insensitive)
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    
    isLoading.value = true;
    selectedDate.value = dateStr;
    rows.value = [];
    const user = authStore.user;

    try {
      // A. Try to find the correct local key
      const keys = await localforage.keys();
      // Find key ending with this date, ignoring prefix case
      const targetKey = keys.find(k => k.toLowerCase() === `arch_data_${dateStr}`);

      let localData = null;
      if (targetKey) {
          localData = await localforage.getItem(targetKey);
      }
      
      if (localData) {
        logger.info(`📂 Loaded from Cache (${targetKey}): ${dateStr}`);
        rows.value = localData.rows || localData; 
      } else {
        // B. Not local -> Fetch from Cloud
        if (navigator.onLine && user) {
           logger.info(`☁️ Fetching from Cloud: ${dateStr}`);
           
           const { data, error } = await supabase
             .from(TABLE_NAME)
             .select('data')
             .eq('user_id', user.id)
             .eq('archive_date', dateStr)
             .single();
           
           if (error) throw error;
           
           if (data && data.data) {
             const fetchedRows = data.data;
             rows.value = fetchedRows;
             
             // C. Cache locally (using new standard lowercase key)
             await localforage.setItem(`${DB_PREFIX}${dateStr}`, fetchedRows);
             
             // Update source in list
             const dateItem = availableDates.value.find(d => d.value === dateStr);
             if (dateItem) dateItem.source = 'local';
           }
        } else {
            addNotification('البيانات غير موجودة محلياً ولا يوجد اتصال بالإنترنت', 'warning');
        }
      }
    } catch (err) {
      logger.error('Error loading archive data:', err);
      addNotification('تعذر تحميل بيانات الأرشيف', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 4. Cleanup Old Archives
   */
  async function cleanupOldArchives() {
    try {
      const keys = await localforage.keys();
      const archiveKeys = keys.filter(k => k.toLowerCase().startsWith('arch_data_'));
      
      const today = new Date();
      const limit = 31 * 24 * 60 * 60 * 1000; 

      for (const key of archiveKeys) {
        const dateStr = key.replace(/arch_data_/i, '');
        const dateObj = new Date(dateStr);
        
        if (isNaN(dateObj.getTime())) continue; 

        if ((today - dateObj) > limit) {
          await localforage.removeItem(key);
          logger.info(`🧹 Cleaned up old archive: ${dateStr}`);
        }
      }
    } catch (err) {
      logger.error('Cleanup error:', err);
    }
  }

  // Run cleanup on init
  cleanupOldArchives();

  return {
    rows,
    availableDates,
    selectedDate,
    isLoading,
    totals,
    archiveToday,
    loadAvailableDates,
    loadArchiveByDate,
    cleanupOldArchives,
    uploadArchive: _uploadToSupabase 
  };
});