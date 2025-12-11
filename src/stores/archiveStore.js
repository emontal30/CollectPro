import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { getPendingSyncItems } from '@/services/archiveSyncQueue';
import { getSmartCache, setSmartCache, removeFromAllCaches } from '@/services/cacheManager';
import { useNotifications } from '@/composables/useNotifications';

export const useArchiveStore = defineStore('archive', () => {
  // --- الحالة (State) ---
  const rows = ref([]); // البيانات المعروضة حالياً
  const availableDates = ref([]); // قائمة التواريخ للمنسدلة
  const selectedDate = ref('');
  const searchQuery = ref('');
  const isLoading = ref(false);

  // نظام الإشعارات الموحد
  const { addNotification } = useNotifications();

  // --- الحسابات (Getters/Computed) ---
  
  // حساب الإجماليات للصفوف المعروضة
  const totals = computed(() => {
    return rows.value.reduce((acc, row) => {
      acc.amount += Number(row.amount) || 0;
      acc.extra += Number(row.extra) || 0;
      acc.collector += Number(row.collector) || 0;
      acc.net += Number(row.net) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0, net: 0 });
  });

  // --- دوال مساعدة (Helpers) ---
  const parseNumber = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
  
  const formatNumber = (num) => {
    return Number(num).toLocaleString('en-US', { 
      minimumFractionDigits: 0, maximumFractionDigits: 2 
    });
  };

  // --- الإجراءات (Actions) ---

  // 1. تحميل التواريخ المتاحة (من LocalStorage و Supabase والـ Sync Queue)
  async function loadAvailableDates() {
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    const localDates = Object.keys(localArchive);
    let dbDates = [];
    let queueDates = [];

    console.log('📅 Loading available archive dates...');
    console.log('📌 Local dates found:', localDates);

    // تحديث فوري بالتواريخ المحلية أولاً
    const initialMerged = [...new Set([...localDates, ...queueDates])].sort().reverse();
    availableDates.value = initialMerged;
    console.log('📅 Initial available dates (local only):', initialMerged);

    try {
      // Get pending sync queue dates
      const pendingItems = await getPendingSyncItems();
      queueDates = [...new Set(pendingItems.map(item => item.data?.archive_date).filter(Boolean))];
      console.log('📋 Sync queue dates found:', queueDates);
    } catch (err) {
      console.warn('⚠️ Could not read sync queue:', err);
    }

    try {
      const { user } = await api.auth.getUser();
      if (user) {
        console.log('👤 User found:', user.id);
        const { dates, error } = await api.archive.getAvailableDates(user.id);
        if (error) {
          console.error('❌ Error fetching DB dates:', error);
        } else {
          console.log('📊 DB dates found:', dates);
          dbDates = dates || [];
        }
      } else {
        console.warn('⚠️ No user found for loading archive dates');
      }
    } catch (e) {
      console.error("❌ خطأ في جلب التواريخ من قاعدة البيانات", e);
    }

    // دمج التواريخ وإزالة التكرار وتحديث القائمة
    const merged = [...new Set([...localDates, ...dbDates, ...queueDates])].sort().reverse();
    availableDates.value = merged;
    console.log('✅ Available dates merged and updated:', merged);
  }

  // 2. تحميل بيانات تاريخ معين (من LocalStorage, Sync Queue, ثم Supabase)
  async function loadArchiveByDate(dateStr) {
    if (!dateStr) {
      rows.value = [];
      return;
    }
    
    isLoading.value = true;
    rows.value = []; // تصفير الجدول

    // أ) محاولة التحميل من LocalStorage أولاً
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    const localData = localArchive[dateStr];

    if (localData) {
      console.log('📌 Loading from localStorage:', dateStr);
      // تحليل النص (مفصول بـ Tabs)
      const lines = localData.split("\n");
      rows.value = lines.map(line => {
        if (!line.trim()) return null;
        const parts = line.split("\t");
        // التنسيق: [المحل, الكود, المبلغ, أخرى, المحصل, الصافي(اختياري)]
        const amount = parseNumber(parts[2]);
        const extra = parseNumber(parts[3]);
        const collector = parseNumber(parts[4]);
        // حساب الصافي إذا لم يكن موجوداً
        const net = parts[5] !== undefined ? parseNumber(parts[5]) : collector - (extra + amount);

        return {
          date: dateStr,
          shop: parts[0] || "",
          code: parts[1] || "",
          amount,
          extra,
          collector,
          net
        };
      }).filter(Boolean); // إزالة الصفوف الفارغة
      
      isLoading.value = false;
      return;
    }

    // ب) التحقق من الـ Sync Queue
    try {
      console.log('📋 Checking sync queue for date:', dateStr);
      const pendingItems = await getPendingSyncItems();
      const queueItem = pendingItems.find(item => item.data?.archive_date === dateStr);
      
      if (queueItem && queueItem.data?.rows) {
        console.log('✅ Found in sync queue:', dateStr, queueItem.data.rows);
        rows.value = queueItem.data.rows.map(row => ({
          date: dateStr,
          shop: row.shop || "",
          code: row.code || "",
          amount: Number(row.amount) || 0,
          extra: Number(row.extra) || 0,
          collector: Number(row.collector) || 0,
          net: Number(row.net) || 0
        }));
        isLoading.value = false;
        return;
      }
    } catch (err) {
      console.warn('⚠️ Error checking sync queue:', err);
    }

    // ج) التحميل من Supabase إذا لم يوجد محلياً أو في الـ queue
    try {
      const { user } = await api.auth.getUser();
      if (user) {
        console.log('🔍 Loading from database:', dateStr);
        const { data } = await api.archive.getArchiveByDate(user.id, dateStr);

        if (data && data.length > 0) {
          rows.value = data.map(item => {
             const amount = parseNumber(item.amount);
             const extra = parseNumber(item.extra);
             const collector = parseNumber(item.collector);
             return {
               date: dateStr,
               shop: item.shop,
               code: item.code,
               amount,
               extra,
               collector,
               net: collector - (extra + amount)
             };
          });

          // حفظ نسخة محلياً للسرعة مستقبلاً
          const archiveToSave = JSON.parse(localStorage.getItem("archiveData") || "{}");
          const rawLines = rows.value.map(r =>
            `${r.shop}\t${r.code}\t${r.amount}\t${r.extra}\t${r.collector}\t${r.net}`
          ).join("\n");
          archiveToSave[dateStr] = rawLines;
          localStorage.setItem("archiveData", JSON.stringify(archiveToSave));
        }
      }
    } catch (e) {
      console.error("فشل تحميل الأرشيف", e);
      addNotification("حدث خطأ أثناء جلب البيانات من السحابة.", 'error');
    } finally {
      isLoading.value = false;
    }
  }

  // 3. البحث الشامل (محلي + سحابي)
  async function searchArchive(query) {
    if (!query) return;
    isLoading.value = true;
    rows.value = [];
    const searchLower = query.toLowerCase();

    // أ) البحث المحلي
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    let foundLocal = false;

    Object.keys(localArchive).forEach(date => {
      const lines = localArchive[date].split("\n");
      lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.split("\t");
        const shop = parts[0] || "";
        const code = parts[1] || "";

        if (shop.toLowerCase().includes(searchLower) || code.toLowerCase().includes(searchLower)) {
          foundLocal = true;
          const amount = parseNumber(parts[2]);
          const extra = parseNumber(parts[3]);
          const collector = parseNumber(parts[4]);
          const net = parts[5] !== undefined ? parseNumber(parts[5]) : collector - (extra + amount);

          rows.value.push({
            date, shop, code, amount, extra, collector, net
          });
        }
      });
    });

    // ب) البحث السحابي (إذا لم نجد نتائج كثيرة أو للشمولية)
    // هنا سنكتفي بالمحلي إذا وجد، أو نبحث في السحابة إذا لم يوجد
    if (!foundLocal) {
       try {
        const { user } = await api.auth.getUser();
        if (user) {
          const { data } = await api.archive.searchArchive(user.id, query);

          if (data) {
            rows.value = data.map(item => ({
               date: item.date,
               shop: item.shop,
               code: item.code,
               amount: parseNumber(item.amount),
               extra: parseNumber(item.extra),
               collector: parseNumber(item.collector),
               net: parseNumber(item.collector) - (parseNumber(item.extra) + parseNumber(item.amount))
            }));
          }
        }
       } catch(e) {
         console.error("خطأ في البحث السحابي", e);
       }
    }
    isLoading.value = false;
  }

  // 4. حذف الأرشيف الحالي
  async function deleteCurrentArchive() {
    if (!selectedDate.value) return;
    
    if (!confirm(`هل أنت متأكد من حذف أرشيف يوم ${selectedDate.value}؟`)) return;

    // حذف محلي
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    delete localArchive[selectedDate.value];
    localStorage.setItem("archiveData", JSON.stringify(localArchive));

    // حذف سحابي
    try {
       const { user } = await api.auth.getUser();
       if (user) {
         const { error } = await api.archive.deleteArchiveByDate(user.id, selectedDate.value);
         if (error) throw error;
       }
       addNotification("تم الحذف بنجاح!", 'success');
       // إعادة تعيين
       selectedDate.value = "";
       rows.value = [];
       await loadAvailableDates();
   } catch (e) {
     addNotification("تم الحذف محلياً ولكن حدث خطأ في المزامنة السحابية.", 'warning');
   }
  }

  return {
    rows,
    availableDates,
    selectedDate,
    searchQuery,
    isLoading,
    totals,
    loadAvailableDates,
    loadArchiveByDate,
    searchArchive,
    deleteCurrentArchive,
    formatNumber
  };
});