<template>
  <div class="counter-page">
    
    <PageHeader 
      title="عداد الأموال" 
      subtitle="حساب وتتبع الفئات النقدية والكميات"
      icon="🧮"
    />

    <div class="counter-container">
      <div class="counters-wrapper">
        <div class="counter-card">
          <h2 class="counter-title"><span>العداد الأول</span></h2>
          <div class="cp-table">
            <div class="table-wrap w-full">
              <table class="counter-table w-full">
                <thead>
                  <tr>
                    <th class="num whitespace-nowrap"><i class="fas fa-calculator"></i> الإجمالي</th>
                    <th class="num whitespace-nowrap"><i class="fas fa-hashtag"></i> العدد</th>
                    <th class="ltr whitespace-nowrap"><i class="fas fa-coins"></i> الفئة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="val in store.denominations" :key="'c1-'+val">
                    <td class="total-cell num highlight-text">
                      {{ store.formatNumber(val * (store.counter1[val] || 0)) }}
                    </td>
                    <td>
                      <input
                        :value="formatWithCommas(store.counter1[val])"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9,]*"
                        class="input-field centered-number"
                        @input="onRawInput($event, val, 1)"
                        @blur="onBlurFormat(val, 1)"
                      />
                    </td>
                    <td class="ltr category-label" :data-val="val">{{ val }} جنيه</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- شريط إجمالي العداد الأول -->
          <div class="counter-totals">
            <div class="counter-total">
              <div class="counter-total-label"><i class="fas fa-calculator"></i> الإجمالي</div>
              <div class="counter-total-value">{{ store.formatNumber(store.total1) }} <span class="currency-label">EG</span></div>
            </div>
            <div class="counter-total">
              <div class="counter-total-label"><i class="fas fa-coins"></i> الفكة</div>
              <div class="counter-total-value small-text">{{ store.formatNumber(store.smallCount1) }} <span class="currency-label">EG</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="second-counter-container">
        <div class="counters-wrapper">
          <div class="counter-card">
            <h2 class="counter-title"><span>العداد الثاني</span></h2>
            <div class="cp-table">
              <div class="table-wrap w-full">
                <table class="counter-table w-full">
                  <thead>
                    <tr>
                      <th class="num whitespace-nowrap"><i class="fas fa-calculator"></i> الإجمالي</th>
                      <th class="num whitespace-nowrap"><i class="fas fa-hashtag"></i> العدد</th>
                      <th class="ltr whitespace-nowrap"><i class="fas fa-coins"></i> الفئة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="val in store.denominations" :key="'c2-'+val">
                      <td class="total-cell num highlight-text">
                        {{ store.formatNumber(val * (store.counter2[val] || 0)) }}
                      </td>
                      <td>
                        <input
                          :value="formatWithCommas(store.counter2[val])"
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9,]*"
                          class="input-field centered-number"
                          @input="onRawInput($event, val, 2)"
                          @blur="onBlurFormat(val, 2)"
                        />
                      </td>
                      <td class="ltr category-label" :data-val="val">{{ val }} جنيه</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <!-- شريط إجمالي العداد الثاني -->
            <div class="counter-totals">
              <div class="counter-total">
                <div class="counter-total-label"><i class="fas fa-calculator"></i> الإجمالي</div>
                <div class="counter-total-value">{{ store.formatNumber(store.total2) }} <span class="currency-label">EG</span></div>
              </div>
              <div class="counter-total">
                <div class="counter-total-label"><i class="fas fa-coins"></i> الفكة</div>
                <div class="counter-total-value small-text">{{ store.formatNumber(store.smallCount2) }} <span class="currency-label">EG</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h2 class="summary-title">ملخص إجمالي</h2>
        <!-- أول سطر: ثلاثة إجماليات في صف واحد بعرض الحاوية بالكامل -->
        <div class="summary-row summary-row-3">
          <div class="summary-item">
            <div class="summary-label"><i class="fas fa-calculator"></i> إجمالي العداد الأول</div>
            <div class="summary-value">{{ store.formatNumber(store.total1) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item">
            <div class="summary-label"><i class="fas fa-calculator"></i> إجمالي العداد الثاني</div>
            <div class="summary-value">{{ store.formatNumber(store.total2) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item">
            <div class="summary-label"><i class="fas fa-coins"></i> اجمالى الفكه </div>
            <div class="summary-value">{{ store.formatNumber(store.totalSmall) }} <span class="currency-label">EG</span></div>
          </div>
        </div>
        <!-- ثاني سطر: المجموع الكلي بعرض الحاوية بالكامل -->
        <div class="summary-row">
          <div class="summary-item summary-item-total">
            <div class="summary-label"><i class="fas fa-plus-circle"></i> المجموع الكلي</div>
            <div class="summary-value">{{ store.formatNumber(store.grandTotal) }} <span class="currency-label">EG</span></div>
          </div>
        </div>
        <!-- فاصل -->
        <div class="summary-divider"></div>
        <!-- ثالث سطر: إجمالي المحصل ومبلغ التصفيرة في صف واحد بعرض الحاوية بالكامل -->
        <div class="summary-row summary-row-2">
          <div class="summary-item summary-item-collected">
            <div class="summary-label"><i class="fas fa-hand-holding-usd"></i> إجمالي المحصل</div>
            <div class="summary-value">{{ store.formatNumber(store.totalCollected) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item summary-item-clearance">
            <div class="summary-label"><i class="fas fa-ticket-alt"></i> مبلغ التصفيرة</div>
            <div class="summary-value">{{ store.formatNumber(store.clearanceAmount) }} <span class="currency-label">EG</span></div>
          </div>
        </div>
        <!-- رابع سطر: مربع الحالة بعرض الحاوية بالكامل -->
        <div class="summary-row">
          <div class="summary-item summary-item-status">
            <div class="summary-label"><i class="fas fa-info-circle"></i> الحاله</div>
            <div class="summary-value" :class="store.status.class">
              <span class="status-number">{{ store.formatNumber(store.status.val) }}</span> {{ store.status.text }}
            </div>
          </div>
        </div>
      </div>

      <div class="categories-section">
        <div class="categories-summary">
          <h3 class="categories-title">ملخص الفئات</h3>
          <div class="cp-table">
              <div class="table-wrap w-full">
              <table class="categories-table w-full">
                <thead>
                  <tr>
                    <th class="num whitespace-nowrap"><i class="fas fa-calculator"></i> الإجمالي</th>
                    <th class="num whitespace-nowrap"><i class="fas fa-hashtag"></i> العدد</th>
                    <th class="ltr whitespace-nowrap"><i class="fas fa-coins"></i> الفئة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cat in store.categoriesSummary" v-show="cat.qty > 0" :key="'cat-'+cat.value">
                    <td class="total-cell num highlight-text">{{ store.formatNumber(cat.total) }}</td>
                    <td class="num">{{ store.formatNumber(cat.qty) }}</td>
                    <td class="ltr category-label" :data-val="cat.value">{{ cat.value }} جنيه</td>
                  </tr>
                  <tr v-if="store.categoriesSummary.every(c => c.qty === 0)">
                    <td colspan="3" class="no-data-msg">لا توجد بيانات لعرضها</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- شريط اجمالي لملخص الفئات -->
          <div class="counter-totals">
            <div class="counter-total">
              <div class="counter-total-label"><i class="fas fa-calculator"></i> إجمالي الفئات</div>
              <div class="counter-total-value">{{ store.formatNumber(store.grandTotal) }} <span class="currency-label">EG</span></div>
            </div>
            <div class="counter-total">
              <div class="counter-total-label"><i class="fas fa-coins"></i> إجمالى الفكه</div>
              <div class="counter-total-value small-text">{{ store.formatNumber(store.totalSmall) }} <span class="currency-label">EG</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn" @click="handleResetAll">
          <i class="fas fa-undo"></i>
          <span>إعادة تعيين الكل</span>
        </button>
        <button class="btn" @click="exportData">
          <i class="fas fa-share-alt"></i>
          <span>تصدير ملخص الفئات</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { inject, onMounted, onUnmounted } from 'vue';
import { useCounterStore } from '@/stores/counterStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import logger from '@/utils/logger.js'

const store = useCounterStore();

// دالة لمزامنة إجمالي المحصل من صفحة التحصيلات
const syncTotalCollected = () => {
  store.updateTotalCollected();
  logger.debug('تم تشغيل مزامنة إجمالي المحصل');
};

// مزامنة عند تحميل الصفحة
onMounted(() => {
  syncTotalCollected();
  
  // مراقبة عودة التركيز للصفحة
  const handleFocus = () => {
    syncTotalCollected();
  };
  
  window.addEventListener('focus', handleFocus);
  
  // تخزين المرجع لإزالته عند إلغاء التحميل
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', handleFocus);
  });
});

// نظام الإشعارات الموحد
const { confirm, error, messages, addNotification } = inject('notifications');

// وظيفة التصدير (تتطلب html2canvas)
// ملاحظة: يجب تثبيت html2canvas أولاً: npm install html2canvas
import html2canvas from 'html2canvas';

const exportData = async () => {
  const element = document.querySelector('.categories-summary'); // أو أي عنصر تريد تصديره
  if (!element) {
    addNotification('لم يتم العثور على عنصر ملخص الفئات', 'error');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: 'var(--bg-white, #ffffff)',
      scale: 2,
      useCORS: true
    });

    canvas.toBlob(blob => {
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `money-counter-${Date.now()}.png`, { type: 'image/png' });
        navigator.share({
          title: 'ملخص عداد الأموال',
          files: [file]
        }).then(() => {
          // تم حذف رسالة النجاح
        }).catch(error => {
          logger.error('Share failed:', error);
          addNotification('❌ فشل المشاركة', 'error', 3000);
        });
      } else {
        // Fallback للتحميل المباشر
        const link = document.createElement('a');
        link.download = `money-counter-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        addNotification('✅ تم التحميل بنجاح', 'success', 3000);
      }
    });
  } catch (error) {
    logger.error('Export failed:', error);
    addNotification('❌ فشل التصدير', 'error', 3000);
  }
};

// دالة إعادة التعيين مع تأكيد
const handleResetAll = async () => {
  const result = await confirm({
    title: 'تأكيد إعادة التعيين',
    text: 'هل أنت متأكد من إعادة تعيين جميع العدادات؟ هذا الإجراء لا يمكن التراجع عنه.',
    icon: 'warning',
    confirmButtonText: 'إعادة التعيين',
    confirmButtonColor: 'var(--danger, #dc3545)'
  });

  if (result.isConfirmed) {
    store.resetAll();
    addNotification('تم إعادة تعيين جميع العدادات بنجاح', 'success');
  }
};

// حفظ البيانات إلى localStorage عند تغييرها
import { watch } from 'vue';

// مراقبة تغيير قيم الماستر والحفظ التلقائي
watch(() => store.masterLimit, (newVal) => {
  localStorage.setItem('masterLimit', newVal.toString());
});

watch(() => store.currentBalance, (newVal) => {
  localStorage.setItem('currentBalance', newVal.toString());
});

watch(() => store.totalCollected, (newVal) => {
  localStorage.setItem('totalCollected', newVal.toString());
});

// -----------------------
// Formatting helpers for numeric inputs (thousand separators)
// -----------------------
const formatWithCommas = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  // Show empty string for zero so inputs appear empty by default
  if (num === 0) return '';
  // use en-US to get comma separators
  return new Intl.NumberFormat('en-US').format(num);
};

const parseNumber = (str) => {
  if (str === null || str === undefined) return 0;
  // remove commas and non-digit (allow minus)
  const cleaned = String(str).replace(/,/g, '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

const onRawInput = (event, val, counterIdx) => {
  // keep underlying model numeric while allowing user typing
  const raw = event.target.value;
  const parsed = parseNumber(raw);
  if (counterIdx === 1) {
    store.counter1[val] = parsed;
  } else {
    store.counter2[val] = parsed;
  }
};

const onBlurFormat = (val, counterIdx) => {
  // Force re-render of formatted value (value binding uses formatWithCommas)
  if (counterIdx === 1) {
    store.counter1[val] = Number(store.counter1[val]) || 0;
  } else {
    store.counter2[val] = Number(store.counter2[val]) || 0;
  }
};
</script>

<style scoped>
/* All styles imported from _unified-components.css */

/* Center all table headers */
th {
  text-align: center;
}

/* Center all three columns */
td:nth-child(1), td:nth-child(2), td:nth-child(3) {
  text-align: center;
}

/* Make table header icons very light gray */
th i {
  color: #f5f5f5;
}

/* ====== COUNTER TOTALS STYLING ====== */
.counter-totals {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f9fafb;
  border-top: 2px solid rgba(0, 121, 101, 0.3);
}

.counter-total {
  text-align: center;
}

.counter-total-label {
  font-size: 0.9rem;
  color: #666;
}

.counter-total-label.small-text {
  font-size: 0.75rem !important;
  color: #999;
}

.counter-total-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.counter-total-value.small-text {
  font-size: 0.9rem !important;
  font-weight: 600 !important;
}

/* Night mode rules migrated to src/assets/css/unified-dark-mode.css */
.counter-table .centered-number,
.categories-table .centered-number {
  text-align: center !important;
  direction: ltr !important;
  font-variant-numeric: tabular-nums;
}

/* حواف دائرية لشريط الملخص الإجمالي في الوضع النهاري فقط */
.summary-section {
  border-radius: 12px;
}

/* Night mode rule migrated to src/assets/css/unified-dark-mode.css */

/* ====== RESPONSIVE DESIGN FOR SMALL SCREENS ====== */

/* إصلاح مشكلة الفراغ في جدول ملخص الفئات للشاشات الصغيرة */
@media (max-width: 768px) {
  .counter-page {
    padding: 10px;
  }
  
  .counter-container {
    padding: 10px;
  }
  
  /* تحسين عرض الجداول على الشاشات الصغيرة */
  .cp-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
  }
  
  .counter-table,
  .categories-table {
    min-width: 100%;
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.9rem;
  }
  
  /* تقليل حجم الخطوط في الشاشات الصغيرة */
  .counter-table th,
  .categories-table th {
    padding: 8px 4px;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .counter-table td,
  .categories-table td {
    padding: 6px 4px;
    font-size: 0.8rem;
    word-break: break-word;
  }
  
  /* تحسين عرض الأعمدة الثلاثة */
  .counter-table th,
  .counter-table td {
    width: 33.33%;
  }
  
  /* تحسين عرض ملخص الفئات */
  .categories-section {
    margin-top: 20px;
  }
  
  .categories-table {
    border-collapse: collapse;
    width: 100%;
  }
  
  /* إصلاح مشكلة الفراغ في الشاشات الصغيرة جداً */
  .categories-table th,
  .categories-table td {
    min-width: auto;
    text-align: center;
  }
  
  .categories-table .category-label {
    white-space: normal;
  }
  
  /* تحسين عرض المدخلات في الشاشات الصغيرة */
  .input-field {
    width: 100% !important;
    font-size: 0.8rem !important;
    padding: 4px 2px !important;
    box-sizing: border-box;
  }
}

/* إصلاح للشاشات الصغيرة جداً */
@media (max-width: 480px) {
  .counter-table,
  .categories-table {
    min-width: 100%;
    width: 100%;
    font-size: 0.75rem;
  }
  
  .counter-table th,
  .categories-table th {
    padding: 6px 2px;
    font-size: 0.7rem;
  }
  
  .counter-table td,
  .categories-table td {
    padding: 4px 2px;
    font-size: 0.7rem;
  }
  
  .input-field {
    width: 100% !important;
    font-size: 0.7rem !important;
    padding: 3px 1px !important;
  }
  
  /* إخفاء النصوص الطويلة في الشاشات الصغيرة */
  .summary-label {
    font-size: 0.8rem !important;
  }
  
  .summary-value {
    font-size: 1rem !important;
  }
}

/* تحسين عرض الجداول بشكل عام */
.table-wrap {
  position: relative;
  overflow: hidden;
  width: 100%;
}

.cp-table {
  position: relative;
  width: 100%;
}

/* إصلاح مشكلة overflow للشاشات الصغيرة */
@media (max-width: 768px) {
  .categories-summary {
    overflow-x: auto;
  }
  
  .counter-table,
  .categories-table {
    table-layout: fixed;
    width: 100%;
  }
  
  /* ضمان عرض المحتوى بدون فراغ */
  .categories-table th:nth-child(1),
  .categories-table td:nth-child(1) {
    width: 33.33%;
  }
  
  .categories-table th:nth-child(2),
  .categories-table td:nth-child(2) {
    width: 33.33%;
  }
  
  .categories-table th:nth-child(3),
  .categories-table td:nth-child(3) {
    width: 33.34%;
  }
}
</style>
