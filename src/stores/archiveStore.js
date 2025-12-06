import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';

export const useArchiveStore = defineStore('archive', () => {
  // --- الحالة (State) ---
  const rows = ref([]); // البيانات المعروضة حالياً
  const availableDates = ref([]); // قائمة التواريخ للمنسدلة
  const selectedDate = ref('');
  const searchQuery = ref('');
  const isLoading = ref(false);

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

  // 1. تحميل التواريخ المتاحة (من LocalStorage و Supabase)
  async function loadAvailableDates() {
    const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
    const localDates = Object.keys(localArchive);
    let dbDates = [];

    try {
      const { user } = await api.auth.getUser();
      if (user) {
        const { dates } = await api.archive.getAvailableDates(user.id);
        dbDates = dates;
      }
    } catch (e) {
      console.error("خطأ في جلب التواريخ من قاعدة البيانات", e);
    }

    // دمج التواريخ وإزالة التكرار
    availableDates.value = [...new Set([...localDates, ...dbDates])].sort().reverse();
  }

  // 2. تحميل بيانات تاريخ معين
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

    // ب) التحميل من Supabase إذا لم يوجد محلياً
    try {
      const { user } = await api.auth.getUser();
      if (user) {
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
      alert("حدث خطأ أثناء جلب البيانات من السحابة.");
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
       alert("تم الحذف بنجاح!");
       // إعادة تعيين
       selectedDate.value = "";
       rows.value = [];
       await loadAvailableDates();
    } catch (e) {
      alert("تم الحذف محلياً ولكن حدث خطأ في المزامنة السحابية.");
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