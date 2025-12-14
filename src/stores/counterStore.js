import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import logger from '@/utils/logger.js'

export const useCounterStore = defineStore('counter', () => {
  // --- الحالة (State) ---
  
  // الفئات النقدية المدعومة
  const denominations = [200, 100, 50, 20, 10, 5, 1];

  // هيكل البيانات للعدادين (يتم تحميله من LocalStorage أو تهيئته بأصفار)
  const savedData = JSON.parse(localStorage.getItem('moneyCountersData') || '{}');
  
  // دالة مساعدة لتهيئة العداد
  const initCounter = (counterId) => {
    const counter = {};
    denominations.forEach(val => {
      // المفتاح في LocalStorage كان بصيغة "1_200" (رقم العداد_القيمة)
      const key = `${counterId}_${val}`;
      counter[val] = Number(savedData[key]) || 0; // العدد (qty)
    });
    return ref(counter);
  };

  const counter1 = initCounter(1);
  const counter2 = initCounter(2);

  // بيانات خارجية (تأتي من صفحات أخرى عبر LocalStorage)
  const masterLimit = ref(Number(localStorage.getItem('masterLimit')) || 0);
  const currentBalance = ref(Number(localStorage.getItem('currentBalance')) || 0);
  
  // إجمالي المحصل يتم مزامنته مع صفحة التحصيلات
  const totalCollected = ref(0);
  
  // دالة لتحميل إجمالي المحصل من صفحة التحصيلات
  function syncTotalCollectedFromHarvest() {
    try {
      // جرب الحصول على القيمة المحفوظة مباشرة أولاً
      const savedTotal = localStorage.getItem('totalCollected');
      let newTotal = 0;
      
      if (savedTotal) {
        newTotal = Number(savedTotal) || 0;
      } else {
        // إذا لم توجد قيمة محفوظة، احسب من البيانات الخام
        const harvestRows = JSON.parse(localStorage.getItem('harvest_rows') || '[]');
        newTotal = harvestRows.reduce((sum, row) => sum + (parseFloat(row.collector) || 0), 0);
      }
      
      // تحديث القيمة فقط إذا كانت مختلفة
      if (totalCollected.value !== newTotal) {
        totalCollected.value = newTotal;
        logger.info('🔄 تم مزامنة إجمالي المحصل:', newTotal);
      } else {
        logger.info('✅ إجمالي المحصل محدث بالفعل:', newTotal);
      }
      
    } catch (error) {
      logger.error('❌ خطأ في مزامنة إجمالي المحصل:', error);
      // محاولة استخدام القيمة القديمة
      const fallback = Number(localStorage.getItem('totalCollected')) || 0;
      if (totalCollected.value !== fallback) {
        totalCollected.value = fallback;
      }
    }
  }

  // --- الحسابات (Getters/Computed) ---

  // دالة لحساب إجمالي عداد معين
  const getCounterTotal = (counter) => {
    return denominations.reduce((sum, val) => sum + (val * (counter.value[val] || 0)), 0);
  };

  // دالة لحساب "الفكة" (الفئات الصغيرة: 20 وأقل)
  const getSmallCount = (counter) => {
    return [20, 10, 5, 1].reduce((sum, val) => sum + (val * (counter.value[val] || 0)), 0);
  };

  const total1 = computed(() => getCounterTotal(counter1));
  const total2 = computed(() => getCounterTotal(counter2));
  
  const smallCount1 = computed(() => getSmallCount(counter1));
  const smallCount2 = computed(() => getSmallCount(counter2));

  const grandTotal = computed(() => total1.value + total2.value);
  const totalSmall = computed(() => smallCount1.value + smallCount2.value);

  // ملخص الفئات (مجموع العدد لكل فئة من العدادين)
  const categoriesSummary = computed(() => {
    return denominations.map(val => {
      const qty1 = counter1.value[val] || 0;
      const qty2 = counter2.value[val] || 0;
      const totalQty = qty1 + qty2;
      return {
        value: val,
        qty: totalQty,
        total: totalQty * val
      };
    }); // لا نقوم بالفلترة هنا لنعرض الجدول كاملاً، الفلترة تتم في العرض إذا رغبت
  });

  // مبلغ التصفيرة (رصيد الماستر - الليميت)
  const clearanceAmount = computed(() => currentBalance.value - masterLimit.value);

  // الحالة (الفرق بين المجموع الكلي وإجمالي المحصل)
  const statusDiff = computed(() => grandTotal.value - totalCollected.value);
  
  const status = computed(() => {
    if (statusDiff.value === 0) return { text: 'تم التصفير ●', class: 'status-zero', val: 0 };
    if (statusDiff.value > 0) return { text: 'زيادة ▲', class: 'status-surplus', val: statusDiff.value };
    return { text: 'عجز ▼', class: 'status-deficit', val: statusDiff.value };
  });

  // --- الإجراءات (Actions) ---

  function resetAll() {
    denominations.forEach(val => {
      counter1.value[val] = 0;
      counter2.value[val] = 0;
    });
    // حفظ الحالة الفارغة
    saveToStorage();
  }

  function saveToStorage() {
    const data = {};
    denominations.forEach(val => {
      if (counter1.value[val]) data[`1_${val}`] = counter1.value[val];
      if (counter2.value[val]) data[`2_${val}`] = counter2.value[val];
    });
    localStorage.setItem('moneyCountersData', JSON.stringify(data));
  }

  // دالة لتنسيق الأرقام
  function formatNumber(num) {
    return Number(num).toLocaleString('en-US');
  }

  // دالة لتحديث إجمالي المحصل من صفحة التحصيلات
  function updateTotalCollected() {
    syncTotalCollectedFromHarvest();
  }

  // --- المراقبة (Auto-Save) ---
  watch([counter1, counter2], () => {
    saveToStorage();
  }, { deep: true });

  // مراقبة تغييرات localStorage لمزامنة إجمالي المحصل
  window.addEventListener('storage', (e) => {
    if (e.key === 'harvest_rows' || e.key === 'totalCollected') {
      syncTotalCollectedFromHarvest();
    }
  });

  // مراقبة تغييرات الصفحة النشطة لإعادة المزامنة
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // عندما تصبح الصفحة نشطة، قم بالمزامنة
      setTimeout(() => {
        syncTotalCollectedFromHarvest();
      }, 100);
    }
  });

  // مراقبة تنقل الصفحة (page navigation) لمزامنة البيانات
  window.addEventListener('focus', () => {
    syncTotalCollectedFromHarvest();
  });

  // إضافة مستمع للأحداث المخصصة من harvest store
  window.addEventListener('harvestDataUpdated', (e) => {
    if (e.detail && e.detail.totalCollected !== undefined) {
      totalCollected.value = e.detail.totalCollected;
      logger.info('✅ تم تحديث إجمالي المحصل عبر الحدث المخصص:', e.detail.totalCollected);
    }
  });

  return {
    denominations,
    counter1,
    counter2,
    total1,
    total2,
    smallCount1,
    smallCount2,
    grandTotal,
    totalSmall,
    categoriesSummary,
    clearanceAmount,
    totalCollected,
    statusDiff,
    status,
    resetAll,
    formatNumber,
    updateTotalCollected,
    syncTotalCollectedFromHarvest
  };
});