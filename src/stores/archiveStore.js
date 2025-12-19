import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/supabase'; // استدعاء مباشر لضمان الدقة
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
  const DB_PREFIX = 'arch_data_'; // تم توحيد التسمية lowercase لسهولة القراءة
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
   * 1. أرشفة بيانات اليوم
   * يحفظ محلياً أولاً، ثم يحاول الرفع أو يضعه في الطابور
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

      // تجهيز البيانات كـ JSON
      const archivePayload = {
        user_id: user.id,
        archive_date: dateStr,
        data: harvestData, // المصفوفة كما هي
        updated_at: new Date().toISOString()
      };

      // أ. الحفظ محلياً فوراً (Offline First)
      await localforage.setItem(`${DB_PREFIX}${dateStr}`, harvestData);
      logger.info(`✅ Saved locally: ${dateStr}`);

      // ب. التحقق من الإنترنت والمزامنة
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

      // تحديث القائمة لإظهار التاريخ الجديد
      await loadAvailableDates();

    } catch (err) {
      logger.error('Archive Error:', err);
      addNotification(`فشل الأرشفة: ${err.message}`, 'error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * دالة مساعدة داخلية للرفع إلى Supabase
   */
  async function _uploadToSupabase(payload) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        user_id: payload.user_id,
        archive_date: payload.archive_date,
        data: payload.data
      }, { onConflict: 'user_id, archive_date' });

    if (error) throw error;
    logger.info(`☁️ Uploaded to Supabase: ${payload.archive_date}`);
  }

  /**
   * 2. تحميل التواريخ المتاحة (المحلية + السحابية)
   * هذا هو الجزء الذي تم إصلاحه ليقرأ من الجدول الصحيح
   */
  async function loadAvailableDates() {
    isLoading.value = true;
    availableDates.value = []; // تصفير القائمة لمنع التكرار البصري أثناء التحميل
    const user = authStore.user;

    try {
      // أ. جلب التواريخ المحلية
      const keys = await localforage.keys();
      const localDates = keys
        .filter(k => k.startsWith(DB_PREFIX))
        .map(k => k.replace(DB_PREFIX, ''));

      // ب. جلب التواريخ السحابية (إذا وجد نت ومستخدم)
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

      // ج. دمج التواريخ وحذف التكرار
      const uniqueDates = new Set([...localDates, ...cloudDates]);

      // د. بناء القائمة النهائية مع تحديد المصدر (لتلوين السحابي بالأزرق)
      availableDates.value = Array.from(uniqueDates)
        .sort((a, b) => new Date(b) - new Date(a)) // الأحدث أولاً
        .map(date => {
          const isLocal = localDates.includes(date);
          return {
            value: date,
            // إذا كان موجود محلياً، نعتبره محلي (الأولوية للسرعة).
            // إذا كان سحابي فقط، نعطيه 'cloud' ليظهر بالأزرق
            source: isLocal ? 'local' : 'cloud'
          };
        });
        
      logger.info(`📅 Available dates loaded: ${availableDates.value.length}`);

    } catch (err) {
      logger.error('Load Dates Error:', err);
      addNotification('تعذر تحميل قائمة التواريخ', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 3. عرض أرشيف تاريخ معين
   * جلب ذكي: محلي أولاً، ثم سحابي مع التخزين (Caching)
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    
    isLoading.value = true;
    selectedDate.value = dateStr;
    rows.value = [];
    const user = authStore.user;

    try {
      // أ. محاولة الجلب محلياً
      const localData = await localforage.getItem(`${DB_PREFIX}${dateStr}`);
      
      if (localData) {
        // وجدنا البيانات محلياً
        logger.info(`📂 Loaded from Cache: ${dateStr}`);
        // دعم الهيكلية القديمة والجديدة (للأمان)
        rows.value = localData.rows || localData; 
      } else {
        // ب. غير موجود محلياً -> اطلب من السحابة
        if (navigator.onLine && user) {
           logger.info(`☁️ Fetching from Cloud: ${dateStr}`);
           
           const { data, error } = await supabase
             .from(TABLE_NAME)
             .select('data')
             .eq('user_id', user.id)
             .eq('archive_date', dateStr)
             .single(); // نتوقع صف واحد لأننا نستخدم JSONB
           
           if (error) throw error;
           
           if (data && data.data) {
             const fetchedRows = data.data; // المصفوفة داخل عمود data
             rows.value = fetchedRows;
             
             // ج. تخزين البيانات محلياً للمستقبل (Cache)
             await localforage.setItem(`${DB_PREFIX}${dateStr}`, fetchedRows);
             
             // تحديث حالة التاريخ في القائمة ليصبح محلياً (إزالة اللون الأزرق)
             const dateItem = availableDates.value.find(d => d.value === dateStr);
             if (dateItem) dateItem.source = 'local';
             
             logger.info(`💾 Cached ${dateStr} locally`);
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
   * 4. تنظيف الأرشيف القديم (أكثر من 31 يوم)
   */
  async function cleanupOldArchives() {
    try {
      const keys = await localforage.keys();
      const archiveKeys = keys.filter(k => k.startsWith(DB_PREFIX));
      
      const today = new Date();
      // 31 يوم بالمللي ثانية
      const limit = 31 * 24 * 60 * 60 * 1000; 

      for (const key of archiveKeys) {
        const dateStr = key.replace(DB_PREFIX, '');
        const dateObj = new Date(dateStr);
        
        // التحقق من صحة التاريخ
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

  // تشغيل التنظيف مرة واحدة عند بدء التطبيق
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
    // تصدير دالة الرفع للاستخدام الخارجي إذا لزم الأمر (مثل Queue)
    uploadArchive: _uploadToSupabase 
  };
});