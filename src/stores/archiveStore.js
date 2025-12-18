import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { getPendingSyncItems } from '@/services/archiveSyncQueue';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js';

export const useArchiveStore = defineStore('archive', () => {
  // --- State ---
  const rows = ref([]); 
  const availableDates = ref([]); // سيحتوي على كائنات { date: '...', source: 'local'|'cloud' }
  const selectedDate = ref('');
  const isLoading = ref(false);

  const { addNotification } = useNotifications();

  // --- Getters ---
  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  // --- Helpers ---
  const formatNumber = (num) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const parseNumber = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

  // --- Actions ---

  /**
   * 1. تحميل التواريخ الذكي (مقارنة محلي vs سحابي)
   */
  async function loadAvailableDates() {
    logger.info('📅 Loading available archive dates...');
    
    // أ) المحلي
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    const localDates = Object.keys(localArchive);
    
    // ب) السحابي (تواريخ فقط)
    let cloudDates = [];
    try {
      if (navigator.onLine) {
        const { user } = await api.auth.getUser();
        if (user) {
          const { dates } = await api.archive.getAvailableDates(user.id);
          cloudDates = dates || [];
        }
      }
    } catch (e) {
      logger.warn('⚠️ Could not fetch cloud dates (Offline mode)');
    }

    // ج) دمج وتلوين
    // التواريخ الموجودة محلياً -> المصدر: local
    // التواريخ الموجودة سحابياً فقط -> المصدر: cloud (ستظهر باللون الأزرق)
    const combinedDates = new Set([...localDates, ...cloudDates]);
    
    availableDates.value = Array.from(combinedDates)
      .sort()
      .reverse()
      .map(date => ({
        value: date,
        // إذا كان موجود محلياً فهو local، وإلا فهو cloud
        source: localDates.includes(date) ? 'local' : 'cloud'
      }));
      
    logger.info('✅ Dates processed:', availableDates.value.length);
  }

  /**
   * 2. تحميل تفاصيل يوم معين
   */
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) return;
    isLoading.value = true;
    rows.value = [];
    selectedDate.value = dateStr;

    try {
      // أ) محاولة التحميل من المحلي أولاً (الأسرع والأوفر)
      const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
      if (localArchive[dateStr]) {
        logger.info('📌 Loaded from LocalStorage:', dateStr);
        rows.value = parseLocalRows(localArchive[dateStr]);
        isLoading.value = false;
        return;
      }

      // ب) التحميل من السحابة (إذا لم يوجد محلياً)
      if (navigator.onLine) {
        logger.info('☁️ Fetching from Cloud:', dateStr);
        const { user } = await api.auth.getUser();
        if (user) {
          const { data, error } = await api.archive.getArchiveByDate(user.id, dateStr);
          if (data && !error) {
            rows.value = data; // البيانات تأتي JSON جاهزة
            // ⚠️ ملاحظة: لا نحفظها محلياً تلقائياً لتجنب ملء الذاكرة، إلا بطلب المستخدم
            // أو يمكن حفظها كـ Cache مؤقت (اختياري)
          }
        }
      } else {
        addNotification('لا يوجد اتصال بالإنترنت لتحميل هذا الأرشيف', 'warning');
      }

    } catch (err) {
      logger.error('Error loading date:', err);
      addNotification('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 3. أرشفة اليوم الحالي (حفظ ذكي + ضغط + تنظيف)
   */
  async function saveCurrentArchiveAs(dateStr, currentRows) {
    if (!currentRows || currentRows.length === 0) return;

    isLoading.value = true;
    try {
      // 1. تحضير البيانات
      const rowsToSave = currentRows.map(r => ({
        shop: r.shop,
        code: r.code,
        amount: parseNumber(r.amount),
        extra: parseNumber(r.extra),
        collector: parseNumber(r.collector),
        net: parseNumber(r.net)
      }));

      // 2. الحفظ المحلي (دائماً)
      const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
      // نحولها لنص مضغوط (TSV) للتخزين المحلي لتوفير المساحة
      const localString = rowsToSave.map(r => 
        `${r.shop}\t${r.code}\t${r.amount}\t${r.extra}\t${r.collector}\t${r.net}`
      ).join('\n');
      
      localArchive[dateStr] = localString;
      
      // 3. تنظيف المحلي (حذف ما هو أقدم من 31 يوم)
      cleanLocalArchive(localArchive);
      
      localStorage.setItem("archiveData", JSON.stringify(localArchive));
      logger.info('✅ Saved locally');

      // 4. الحفظ السحابي
      if (navigator.onLine) {
        const { user } = await api.auth.getUser();
        if (user) {
          const totals = rowsToSave.reduce((acc, r) => ({ net: acc.net + r.net }), { net: 0 });
          
          const { error } = await api.archive.saveDailyArchive(user.id, dateStr, rowsToSave, totals);
          
          if (!error) {
            addNotification(`تم أرشفة يوم ${dateStr} بنجاح (محلياً وسحابياً)`, 'success');
          } else {
            throw error;
          }
        }
      } else {
        // إضافة لقائمة المزامنة
        addNotification(`تم الحفظ محلياً. سيتم الرفع عند توفر الإنترنت.`, 'info');
        // (يمكن هنا إضافة منطق الـ SyncQueue إذا كنت تستخدمه)
      }

      // تحديث القائمة
      await loadAvailableDates();

    } catch (err) {
      logger.error('Archive Save Error:', err);
      addNotification('تم الحفظ محلياً فقط، فشلت المزامنة السحابية', 'warning');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * مساعد: تنظيف الأرشيف المحلي القديم
   */
  function cleanLocalArchive(archiveObj) {
    const dates = Object.keys(archiveObj).sort();
    if (dates.length > 31) {
      const toDelete = dates.slice(0, dates.length - 31); // حذف الأقدم
      toDelete.forEach(d => delete archiveObj[d]);
      logger.info('🧹 Cleaned local archive:', toDelete);
    }
  }

  /**
   * مساعد: تحويل النص المخزن محلياً إلى كائنات
   */
  function parseLocalRows(tsvString) {
    if (!tsvString) return [];
    return tsvString.split('\n').filter(Boolean).map(line => {
      const [shop, code, amount, extra, collector, net] = line.split('\t');
      return {
        shop, code, 
        amount: Number(amount), extra: Number(extra), 
        collector: Number(collector), net: Number(net)
      };
    });
  }
  
  // دالة الحذف (مشتركة)
  async function deleteArchive(dateStr) {
     if(!confirm(`هل أنت متأكد من حذف أرشيف ${dateStr}؟`)) return;
     
     // حذف محلي
     const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
     delete localArchive[dateStr];
     localStorage.setItem("archiveData", JSON.stringify(localArchive));
     
     // حذف سحابي
     if(navigator.onLine) {
        const { user } = await api.auth.getUser();
        if(user) await api.archive.deleteArchiveByDate(user.id, dateStr);
     }
     
     addNotification('تم الحذف بنجاح', 'success');
     rows.value = [];
     selectedDate.value = '';
     await loadAvailableDates();
  }

  return {
    rows,
    availableDates,
    selectedDate,
    isLoading,
    totals,
    loadAvailableDates,
    loadArchiveByDate,
    saveCurrentArchiveAs,
    deleteArchive,
    formatNumber
  };
});