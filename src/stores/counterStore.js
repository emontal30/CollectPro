import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

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
  const totalCollected = ref(Number(localStorage.getItem('totalCollected')) || 0);

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
    if (confirm('سيتم تفريغ جميع حقول العدادات! هل أنت متأكد؟')) {
      denominations.forEach(val => {
        counter1.value[val] = 0;
        counter2.value[val] = 0;
      });
      // حفظ الحالة الفارغة
      saveToStorage();
    }
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

  // --- المراقبة (Auto-Save) ---
  watch([counter1, counter2], () => {
    saveToStorage();
  }, { deep: true });

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
    formatNumber
  };
});