<template>
  <div class="counter-page">
    
    <PageHeader 
      title="عداد الأموال" 
      subtitle="حساب وتتبع الفئات النقدية والكميات بدقة"
      icon="🧮"
    />

    <div class="counter-container">
      <div class="counters-grid">
        <!-- العداد الأول -->
        <div class="counter-card">
          <div class="card-header centered-header">
            <h2 class="counter-title">العداد الأول</h2>
            <button @click="toggleSort(1)" class="sort-btn header-action" :title="sortOrder1 === 'desc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'">
              <i :class="sortOrder1 === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up'"></i>
            </button>
          </div>
          
          <div class="table-container">
            <table class="modern-counter-table">
              <thead>
                <tr>
                  <th class="col-total">الإجمالي</th>
                  <th class="col-qty">العدد</th>
                  <th class="col-cat">الفئة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="val in sortedDenominations1" :key="'c1-'+val" :class="'row-val-' + val">
                  <td class="total-cell">{{ store.formatNumber(val * (store.counter1[val] || 0)) }}</td>
                  <td class="qty-column">
                    <input
                      :value="formatWithCommas(store.counter1[val])"
                      type="text"
                      inputmode="numeric"
                      class="counter-input-field"
                      @input="onRawInput($event, val, 1)"
                      @blur="onBlurFormat(val, 1)"
                    />
                  </td>
                  <td class="category-cell" :class="'cat-' + val">
                    <div class="category-wrapper">
                      <span class="val-badge">{{ val }}</span>
                      <span class="val-unit">جنيه</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card-footer-stats">
            <div class="stat-item">
              <span class="stat-label">الإجمالي</span>
              <span class="stat-value">{{ store.formatNumber(store.total1) }}</span>
            </div>
            <div class="stat-item small">
              <span class="stat-label">الفكة</span>
              <span class="stat-value">{{ store.formatNumber(store.smallCount1) }}</span>
            </div>
          </div>
        </div>

        <!-- العداد الثاني -->
        <div class="counter-card">
          <div class="card-header centered-header">
            <h2 class="counter-title">العداد الثاني</h2>
            <button @click="toggleSort(2)" class="sort-btn header-action" :title="sortOrder2 === 'desc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'">
              <i :class="sortOrder2 === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up'"></i>
            </button>
          </div>
          
          <div class="table-container">
            <table class="modern-counter-table">
              <thead>
                <tr>
                  <th class="col-total">الإجمالي</th>
                  <th class="col-qty">العدد</th>
                  <th class="col-cat">الفئة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="val in sortedDenominations2" :key="'c2-'+val" :class="'row-val-' + val">
                  <td class="total-cell">{{ store.formatNumber(val * (store.counter2[val] || 0)) }}</td>
                  <td class="qty-column">
                    <input
                      :value="formatWithCommas(store.counter2[val])"
                      type="text"
                      inputmode="numeric"
                      class="counter-input-field"
                      @input="onRawInput($event, val, 2)"
                      @blur="onBlurFormat(val, 2)"
                    />
                  </td>
                  <td class="category-cell" :class="'cat-' + val">
                    <div class="category-wrapper">
                      <span class="val-badge">{{ val }}</span>
                      <span class="val-unit">جنيه</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card-footer-stats">
            <div class="stat-item">
              <span class="stat-label">الإجمالي</span>
              <span class="stat-value">{{ store.formatNumber(store.total2) }}</span>
            </div>
            <div class="stat-item small">
              <span class="stat-label">الفكة</span>
              <span class="stat-value">{{ store.formatNumber(store.smallCount2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- الملخص الكلي -->
      <div class="summary-section">
        <div class="summary-header centered-header">
          <i class="fas fa-chart-pie"></i>
          <h2 class="counter-title">ملخص إجمالي</h2>
        </div>
        
        <div class="summary-grid consolidated-summary">
          <div class="summary-card primary">
            <span class="label">إجمالي العدادات</span>
            <span class="value">{{ store.formatNumber(store.grandTotal) }} <small>ج.م</small></span>
          </div>
          <div class="summary-card">
            <span class="label">إجمالي الفكة</span>
            <span class="value">{{ store.formatNumber(store.totalSmall) }} <small>ج.م</small></span>
          </div>
          <div class="summary-card">
            <span class="label">مبلغ التصفيرة</span>
            <span class="value">{{ store.formatNumber(store.clearanceAmount) }} <small>ج.م</small></span>
          </div>
          <div class="summary-card">
            <span class="label">إجمالي المحصل</span>
            <span class="value">{{ store.formatNumber(store.totalCollected) }} <small>ج.م</small></span>
          </div>
          <div class="summary-card full-width" :class="store.status.class">
            <span class="label">الحالة ({{ store.status.text }})</span>
            <span class="value">{{ store.formatNumber(store.status.val) }} <small>ج.م</small></span>
          </div>
        </div>
      </div>

      <!-- ملخص الفئات -->
      <div class="categories-section categories-card">
        <div class="card-header centered-header">
          <h2 class="counter-title">ملخص الفئات</h2>
          <button @click="toggleSort(3)" class="sort-btn header-action">
             <i :class="sortOrderSummary === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up'"></i>
          </button>
        </div>
        
        <div class="table-container categories-export">
          <table class="modern-counter-table summary-table">
            <thead>
              <tr>
                <th class="col-total">الإجمالي</th>
                <th class="col-qty">العدد</th>
                <th class="col-cat">الفئة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in sortedCategoriesSummary" v-show="cat.qty > 0" :key="'cat-'+cat.value" :class="'row-val-' + cat.value">
                <td class="total-cell highlight">{{ store.formatNumber(cat.total) }}</td>
                <td class="qty-cell">{{ store.formatNumber(cat.qty) }}</td>
                <td class="category-cell" :class="'cat-' + cat.value">
                  <div class="category-wrapper">
                    <span class="val-badge">{{ cat.value }}</span>
                    <span class="val-unit">جنيه</span>
                  </div>
                </td>
              </tr>
              <tr v-if="store.categoriesSummary.every(c => c.qty === 0)">
                <td colspan="3" class="no-data">لا توجد بيانات مسجلة</td>
              </tr>
            </tbody>
          </table>
          
          <div class="card-footer-stats" v-if="!store.categoriesSummary.every(c => c.qty === 0)">
            <div class="stat-item">
              <span class="stat-label">الإجمالي</span>
              <span class="stat-value">{{ store.formatNumber(store.grandTotal) }}</span>
            </div>
            <div class="stat-item small">
              <span class="stat-label">الفكة</span>
              <span class="stat-value">{{ store.formatNumber(store.totalSmall) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- أزرار التحكم -->
      <div class="action-buttons">
        <button class="action-btn reset" @click="handleResetAll">
          <i class="fas fa-undo-alt"></i>
          <span>إعادة تعيين</span>
        </button>
        <button class="action-btn export" @click="exportData">
          <i class="fas fa-file-export"></i>
          <span>تصدير الملخص</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { inject, onMounted, ref, computed } from 'vue';
import { useCounterStore } from '@/stores/counterStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import html2canvas from 'html2canvas';

const store = useCounterStore();
const sortOrder1 = ref('desc');
const sortOrder2 = ref('desc');
const sortOrderSummary = ref('desc');

const toggleSort = (id) => {
  if (id === 1) sortOrder1.value = sortOrder1.value === 'desc' ? 'asc' : 'desc';
  if (id === 2) sortOrder2.value = sortOrder2.value === 'desc' ? 'asc' : 'desc';
  if (id === 3) sortOrderSummary.value = sortOrderSummary.value === 'desc' ? 'asc' : 'desc';
};

const sortedDenominations1 = computed(() => {
  const denoms = [...store.denominations];
  return sortOrder1.value === 'desc' ? denoms.sort((a, b) => b - a) : denoms.sort((a, b) => a - b);
});

const sortedDenominations2 = computed(() => {
  const denoms = [...store.denominations];
  return sortOrder2.value === 'desc' ? denoms.sort((a, b) => b - a) : denoms.sort((a, b) => a - b);
});

const sortedCategoriesSummary = computed(() => {
  const summary = [...store.categoriesSummary];
  return sortOrderSummary.value === 'desc' 
    ? summary.sort((a, b) => b.value - a.value) 
    : summary.sort((a, b) => a.value - b.value);
});

const { confirm, addNotification } = inject('notifications');

onMounted(() => {
  store.updateTotalCollected();
  window.addEventListener('focus', () => store.updateTotalCollected());
});

const exportData = async () => {
  const element = document.querySelector('.categories-export');
  if (!element) return;
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: getComputedStyle(document.body).getPropertyValue('--content-bg') || '#ffffff',
      scale: 2,
    });
    canvas.toBlob(blob => {
      if (blob && navigator.share) {
        const file = new File([blob], `counter-${Date.now()}.png`, { type: 'image/png' });
        navigator.share({ title: 'ملخص الفئات', files: [file] });
      } else if (blob) {
        const link = document.createElement('a');
        link.download = `counter-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    });
  } catch (err) {
    addNotification('فشل التصدير', 'error');
  }
};

const handleResetAll = async () => {
  const result = await confirm({
    title: 'تأكيد الحذف',
    text: 'هل تريد تصفير جميع العدادات؟',
    icon: 'warning',
    confirmButtonText: 'تصفير الكل'
  });
  if (result.isConfirmed) {
    store.resetAll();
    addNotification('تم تصفير العدادات', 'success');
  }
};

const formatWithCommas = (value) => {
  if (!value || value === 0) return '';
  return new Intl.NumberFormat('en-US').format(value);
};

const parseNumber = (str) => {
  const cleaned = String(str).replace(/,/g, '').replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
};

const onRawInput = (event, val, counterIdx) => {
  const parsed = parseNumber(event.target.value);
  if (counterIdx === 1) store.counter1[val] = parsed;
  else store.counter2[val] = parsed;
};

const onBlurFormat = (val, counterIdx) => {
  if (counterIdx === 1) store.counter1[val] = Number(store.counter1[val]) || 0;
  else store.counter2[val] = Number(store.counter2[val]) || 0;
};
</script>

<style scoped>
.counter-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.counter-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 15px;
}

.counters-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.counter-card, .summary-section, .categories-card {
  overflow: hidden;
  padding: 0 !important;
}

.centered-header {
  padding: 15px 20px;
  background: var(--table-header-bg);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
}

.counter-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: white !important;
  text-align: center;
}

.header-action {
  position: absolute;
  left: 15px;
}

.sort-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
}

.sort-btn:hover {
  background: white;
  color: var(--primary);
}

.table-container {
  overflow-x: auto;
}

.modern-counter-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; /* توزيع متساوٍ للأعمدة */
}

.modern-counter-table th {
  background: var(--gray-100);
  padding: 14px;
  font-size: 0.9rem;
  color: var(--primary-dark);
  font-weight: 800;
  text-align: center;
  border-bottom: 2px solid var(--border-color);
}

/* توزيع متساوٍ للأعمدة لضمان التناسق */
.col-total, .col-qty, .col-cat {
  width: 33.33%;
}

.modern-counter-table td {
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.category-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.qty-column {
  width: 33.33%;
}

.counter-input-field {
  width: 100%;
  max-width: 160px; /* زيادة بسيطة للتناسب مع العرض الجديد */
  padding: 10px;
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
  background: var(--input-bg);
  color: var(--input-text);
  transition: var(--transition);
  display: inline-block;
  vertical-align: middle;
}

.counter-input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
  outline: none;
}

.category-cell {
  font-weight: 900;
  vertical-align: middle;
}

.val-badge {
  font-size: 1.25rem;
  line-height: 1;
}

.val-unit { 
  font-size: 0.8rem; 
  color: var(--gray-500); 
  font-weight: 600;
  margin-top: 4px;
}

.cat-200 .val-badge { color: #27ae60; }
.cat-100 .val-badge { color: #3498db; }
.cat-50 .val-badge { color: #e67e22; }
.cat-20 .val-badge { color: #2980b9; }
.cat-10 .val-badge { color: #8e44ad; }
.cat-5 .val-badge { color: #16a085; }
.cat-1 .val-badge { color: #7f8c8d; }

.total-cell {
  font-weight: 800;
  color: var(--gray-900);
  font-size: 1.05rem;
  vertical-align: middle;
}

.total-cell.highlight {
  color: var(--primary);
}

.card-footer-stats {
  padding: 15px 20px;
  background: rgba(var(--primary-rgb), 0.03);
  display: flex;
  justify-content: space-between;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label { font-size: 0.75rem; color: var(--gray-600); font-weight: 700; }
.stat-value { font-size: 1.2rem; font-weight: 900; color: var(--primary); }
.stat-item.small .stat-value { font-size: 1rem; color: var(--gray-700); }

.consolidated-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 20px;
}

.consolidated-summary .full-width {
  grid-column: span 2;
}

.summary-card {
  padding: 15px;
  border-radius: 12px;
  background: var(--light-bg);
  display: flex;
  flex-direction: column;
  gap: 5px;
  border: 1px solid var(--border-color);
  text-align: center;
}

.summary-card.primary {
  background: rgba(var(--primary-rgb), 0.05);
  border-color: var(--primary-light);
}

.summary-card .label { font-size: 0.8rem; color: var(--gray-600); font-weight: 700; }
.summary-card .value { font-size: 1.4rem; font-weight: 900; color: var(--gray-900); }

.summary-card.status-surplus .value { color: var(--success); }
.summary-card.status-deficit .value { color: var(--danger); }

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: var(--transition);
}

.action-btn.reset { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.action-btn.reset:hover { background: #ef4444; color: white; }

.action-btn.export { background: var(--primary); color: white; }
.action-btn.export:hover { background: var(--primary-dark); transform: translateY(-2px); }

/* Dark Mode Overrides */
body.dark .modern-counter-table th {
  background: rgba(255,255,255,0.05);
  color: var(--primary-light);
}

body.dark .val-unit { color: var(--gray-600); }

body.dark .cat-200 .val-badge { color: #2dd4bf; }
body.dark .cat-100 .val-badge { color: #60a5fa; }
body.dark .cat-50 .val-badge { color: #fb923c; }
body.dark .cat-20 .val-badge { color: #38bdf8; }
body.dark .cat-10 .val-badge { color: #c084fc; }
body.dark .cat-5 .val-badge { color: #34d399; }
body.dark .cat-1 .val-badge { color: #94a3b8; }

body.dark .card-footer-stats { background: rgba(0,0,0,0.15); }
body.dark .stat-value { color: var(--primary-light); }
body.dark .stat-item.small .stat-value { color: var(--gray-700); }
</style>
