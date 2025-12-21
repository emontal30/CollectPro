import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useArchiveStore = defineStore('archive', () => {
  const rows = ref([]);
  const availableDates = ref([]);
  const selectedDate = ref('');
  const isLoading = ref(false);

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

  /**
   * الحصول على التاريخ المحلي للجهاز
   */
  function getTodayLocal() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }

  /**
   * تحميل قائمة التواريخ المتاحة
   */
  async function loadAvailableDates() {
    try {
      const user = authStore.user;
      const allKeys = await localforage.keys();
      const localDates = allKeys
        .filter(k => k.startsWith(DB_PREFIX))
        .map(k => k.replace(DB_PREFIX, ''));

      let cloudDates = [];
      
      // محاولة الجلب من السحاب إذا كان أونلاين عبر الخدمة المتخصصة
      if (navigator.onLine && user) {
        const { dates, error } = await apiInterceptor(
          api.archive.getAvailableDates(user.id)
        );
        
        if (!error && dates) {
          cloudDates = dates;
        }
      }

      const dateMap = new Map();
      
      // دمج المحلي
      localDates.forEach(d => { 
        if (d && d.length >= 10) dateMap.set(d, { value: d, source: 'local' }); 
      });

      // دمج السحابي
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

  /**
   * تحميل بيانات يوم معين
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    isLoading.value = true;
    selectedDate.value = dateStr;
    
    try {
      const user = authStore.user;
      const localKey = `${DB_PREFIX}${dateStr}`;
      
      // الأولوية للمحلي
      const localData = await localforage.getItem(localKey);
      
      if (localData) {
        rows.value = Array.isArray(localData) ? localData : (localData.rows || []);
      } else if (navigator.onLine && user) {
        const { data, error } = await apiInterceptor(
          api.archive.getArchiveByDate(user.id, dateStr)
        );

        if (!error && data) {
          rows.value = data;
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
   * رفع الأرشيف (تستخدم من قبل واجهة المستخدم أو الطابور)
   */
  async function uploadArchive(payload) {
    const { user_id, archive_date, data } = payload;
    const { error } = await apiInterceptor(
      api.archive.saveDailyArchive(user_id, archive_date, data)
    );

    if (error) throw error;
    return true;
  }

  /**
   * حذف الأرشيف (محلياً وسحابياً مع دعم الأوفلاين)
   */
  async function deleteArchive(dateStr) {
    if (!dateStr) return { success: false, message: 'لا يوجد تاريخ محدد' };
    
    isLoading.value = true;
    try {
      const user = authStore.user;
      
      // 1. الحذف المحلي الفوري دائماً أولاً لضمان سرعة الاستجابة للمستخدم
      await localforage.removeItem(`${DB_PREFIX}${dateStr}`);
      
      // إذا كان هذا هو التاريخ المعروض حالياً، قم بتفريغ الجدول
      if (selectedDate.value === dateStr) {
        rows.value = [];
        selectedDate.value = '';
      }

      // 2. محاولة الحذف السحابي (أو الجدولة للطابور)
      if (user) {
        if (navigator.onLine) {
          try {
            const { error } = await apiInterceptor(
              api.archive.deleteArchiveByDate(user.id, dateStr)
            );
            
            // إذا فشل الحذف بسبب الشبكة، نضعه في طابور المزامنة
            if (error && (error.status === 'offline' || error.status === 'network_error' || error.silent)) {
              await addToSyncQueue({
                type: 'delete_archive',
                payload: { user_id: user.id, archive_date: dateStr }
              });
            } else if (error) {
              // خطأ آخر غير الشبكة (مثل صلاحيات)، نلقيه للمعالجة في الـ catch
              throw error;
            }
          } catch (netErr) {
             // في حال حدوث خطأ غير متوقع أثناء محاولة الاتصال
             await addToSyncQueue({
               type: 'delete_archive',
               payload: { user_id: user.id, archive_date: dateStr }
             });
          }
        } else {
           // إضافة طلب حذف للطابور إذا كان أوفلاين صراحة
           await addToSyncQueue({
             type: 'delete_archive',
             payload: { user_id: user.id, archive_date: dateStr }
           });
        }
      }

      // تحديث قائمة التواريخ
      await loadAvailableDates();
      
      const statusMsg = (navigator.onLine) ? 'بنجاح' : 'محلياً (سيتم المزامنة لاحقاً)';
      return { success: true, message: `تم حذف الأرشيف ${statusMsg} 🗑️` };
      
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
    totals,
    loadAvailableDates, 
    loadArchiveByDate, 
    deleteArchive,
    uploadArchive,
    getTodayLocal,
    DB_PREFIX
  };
});
