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
            <div class="table-container">
              <table class="counter-table">
                <thead>
                  <tr>
                    <th class="num"><i class="fas fa-calculator"></i> الإجمالي</th>
                    <th class="num"><i class="fas fa-hashtag"></i> العدد</th>
                    <th class="ltr"><i class="fas fa-coins"></i> الفئة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="val in store.denominations" :key="'c1-'+val">
                    <td class="total-cell num highlight-text">
                      {{ store.formatNumber(val * (store.counter1[val] || 0)) }}
                    </td>
                    <td>
                      <input 
                        v-model.number="store.counter1[val]" 
                        type="number" 
                        class="input-field" 
                        min="0" 
                        placeholder="0"
                      >
                    </td>
                    <td class="ltr category-label" :data-val="val">{{ val }} جنيه</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="counter-totals">
            <div class="counter-total">
              <div class="counter-total-label">إجمالي العداد الأول</div>
              <div class="counter-total-value">{{ store.formatNumber(store.total1) }} <span class="currency-label">EG</span></div>
            </div>
            <div class="counter-total">
              <div class="counter-total-label">اجمالى الفكه :</div>
              <div class="counter-total-value secondary-val">{{ store.formatNumber(store.smallCount1) }} <span class="currency-label">EG</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="counter-container second-counter-container">
        <div class="counters-wrapper">
          <div class="counter-card">
            <h2 class="counter-title"><span>العداد الثاني</span></h2>
            <div class="cp-table">
              <div class="table-container">
                <table class="counter-table">
                  <thead>
                    <tr>
                      <th class="num"><i class="fas fa-calculator"></i> الإجمالي</th>
                      <th class="num"><i class="fas fa-hashtag"></i> العدد</th>
                      <th class="ltr"><i class="fas fa-coins"></i> الفئة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="val in store.denominations" :key="'c2-'+val">
                      <td class="total-cell num highlight-text">
                        {{ store.formatNumber(val * (store.counter2[val] || 0)) }}
                      </td>
                      <td>
                        <input 
                          v-model.number="store.counter2[val]" 
                          type="number" 
                          class="input-field" 
                          min="0" 
                          placeholder="0"
                        >
                      </td>
                      <td class="ltr category-label" :data-val="val">{{ val }} جنيه</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="counter-totals">
              <div class="counter-total">
                <div class="counter-total-label">إجمالي العداد الثاني</div>
                <div class="counter-total-value">{{ store.formatNumber(store.total2) }} <span class="currency-label">EG</span></div>
              </div>
              <div class="counter-total">
                <div class="counter-total-label">اجمالى الفكه :</div>
                <div class="counter-total-value secondary-val">{{ store.formatNumber(store.smallCount2) }} <span class="currency-label">EG</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h2 class="summary-title">ملخص إجمالي</h2>

        <div class="summary-grid summary-grid-top">
          <div class="summary-item">
            <div class="summary-label"><i class="fas fa-calculator"></i> إجمالي العداد الأول</div>
            <div class="summary-value">{{ store.formatNumber(store.total1) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item">
            <div class="summary-label"><i class="fas fa-calculator"></i> إجمالي العداد الثاني</div>
            <div class="summary-value">{{ store.formatNumber(store.total2) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item summary-item-small">
            <div class="summary-label"><i class="fas fa-coins"></i> اجمالى الفكه </div>
            <div class="summary-value">{{ store.formatNumber(store.totalSmall) }}</div>
          </div>
        </div>

        <div class="summary-row summary-row-grand">
          <div class="summary-item summary-item-total">
            <div class="summary-label"><i class="fas fa-plus-circle"></i> المجموع الكلي</div>
            <div class="summary-value">{{ store.formatNumber(store.grandTotal) }} <span class="currency-label">EG</span></div>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row summary-row-middle">
          <div class="summary-item summary-item-collected">
            <div class="summary-label"><i class="fas fa-hand-holding-usd"></i> إجمالي المحصل</div>
            <div class="summary-value">{{ store.formatNumber(store.totalCollected) }} <span class="currency-label">EG</span></div>
          </div>
          <div class="summary-item summary-item-clearance">
            <div class="summary-label"><i class="fas fa-ticket-alt"></i> مبلغ التصفيرة</div>
            <div class="summary-value">{{ store.formatNumber(store.clearanceAmount) }} <span class="currency-label">EG</span></div>
          </div>
        </div>

        <div class="summary-row summary-row-status">
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
            <div class="table-container">
              <table class="categories-table">
                <thead>
                  <tr>
                    <th class="num"><i class="fas fa-calculator"></i> الإجمالي</th>
                    <th class="num"><i class="fas fa-hashtag"></i> العدد</th>
                    <th class="ltr"><i class="fas fa-coins"></i> الفئة</th>
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
          <div class="counter-totals categories-totals">
            <div class="counter-total">
              <div class="counter-total-label">إجمالي ملخص الفئات</div>
              <div class="counter-total-value">{{ store.formatNumber(store.grandTotal) }} <span class="currency-label">EG</span></div>
            </div>
            <div class="counter-total">
              <div class="counter-total-label">اجمالى الفكه :</div>
              <div class="counter-total-value secondary-val">{{ store.formatNumber(store.totalSmall) }} <span class="currency-label">EG</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn" @click="store.resetAll">
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
import { useCounterStore } from '@/stores/counterStore';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useCounterStore();

// وظيفة التصدير (تتطلب html2canvas)
// ملاحظة: يجب تثبيت html2canvas أولاً: npm install html2canvas
import html2canvas from 'html2canvas';

const exportData = async () => {
  const element = document.querySelector('.categories-summary'); // أو أي عنصر تريد تصديره
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    
    canvas.toBlob(blob => {
      if (navigator.share && navigator.canShare) {
         const file = new File([blob], `money-counter-${Date.now()}.png`, { type: 'image/png' });
         navigator.share({
           title: 'ملخص عداد الأموال',
           files: [file]
         }).catch(console.error);
      } else {
        // Fallback للتحميل المباشر
        const link = document.createElement('a');
        link.download = 'money-counter.png';
        link.href = canvas.toDataURL();
        link.click();
      }
    });
  } catch (error) {
    console.error('Export failed:', error);
    alert('فشل تصدير الصورة');
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
</script>

<style scoped>
/* Dark Mode styles are now handled by unified-dark-mode.css */

/* تم استخراج هذه الأنماط من counter-table.css و style.css
   لضمان نفس المظهر تماماً
*/

.counter-page {
  width: 100%;
  animation: fadeIn 0.5s ease-in-out;
  padding-bottom: 50px;
}

.counter-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px;
}

.counters-wrapper {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-bottom: 30px;
}

.counter-card, .summary-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.summary-section {
  padding: 25px;
  margin-bottom: 30px;
}

.counter-title, .summary-title, .categories-title {
  text-align: center;
  color: white;
  font-size: 1.1rem;
  margin: 0;
  padding: 12px;
  background: linear-gradient(45deg, var(--primary, #007965), #005a4b);
  border-radius: 12px 12px 0 0;
}

/* جداول */
.cp-table .table-container {
  margin: 0;
  padding: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  text-align: center;
  background: white;
  table-layout: fixed;
}

th {
  background: linear-gradient(135deg, var(--primary, #007965), #005a4b);
  color: white;
  padding: 12px;
  font-weight: 700;
  border-bottom: 2px solid var(--primary, #007965);
  border-right: 1px solid rgba(255,255,255,0.2);
}

td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  vertical-align: middle;
}

/* ألوان الفئات (مأخوذة من style.css الأصلي) */
td.category-label[data-val="200"] { color: #e91e63; }
td.category-label[data-val="100"] { color: #fbbf24; }
td.category-label[data-val="50"] { color: #a855f7; }
td.category-label[data-val="20"] { color: #f97316; }
td.category-label[data-val="10"] { color: #22c55e; }
td.category-label[data-val="5"] { color: #3b82f6; }
td.category-label[data-val="1"] { color: #ef4444; }

.highlight-text {
  color: var(--primary, #007965);
  font-weight: 700;
}

/* حقول الإدخال */
.input-field {
  width: 100%;
  padding: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: #f8fafc;
  font-family: 'Cairo', sans-serif;
  font-weight: bold;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary, #007965);
  box-shadow: 0 0 0 2px rgba(0, 121, 101, 0.2);
}

/* ملخص الإجماليات أسفل الجدول */
.counter-totals {
  display: flex;
  justify-content: space-between;
  padding: 15px 20px;
  background: #f9fafb;
  border-top: 2px solid rgba(0, 121, 101, 0.3);
  align-items: center;
}

.counter-total-label {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.counter-total-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
}

.secondary-val {
  color: #6b7280;
}

/* قسم الملخص الشامل */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.summary-item {
  text-align: center;
  padding: 15px;
  background: linear-gradient(45deg, rgba(0,121,101,0.05), rgba(243,156,18,0.05));
  border-radius: 12px;
  border: 1px solid rgba(0,121,101,0.1);
}

.summary-label {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #333;
}

/* ألوان الحالة */
.status-deficit { color: #dc3545 !important; }
.status-surplus { color: #007bff !important; }
.status-zero { color: #28a745 !important; }

/* تنسيق صفوف الملخص */
.summary-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.summary-row-middle {
  grid-template-columns: 1fr;
}

.summary-row-grand {
  grid-template-columns: 1fr;
}

.summary-row-status {
  grid-template-columns: 1fr;
}

.summary-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  margin: 20px 0;
}

/* حقول الإعدادات */
.settings-input {
  width: 100%;
  padding: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #f8fafc;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  margin-top: 5px;
}

.settings-input:focus {
  outline: none;
  border-color: var(--primary, #007965);
  box-shadow: 0 0 0 2px rgba(0, 121, 101, 0.2);
}

/* أزرار */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  padding: 12px 25px;
  background: linear-gradient(45deg, var(--primary, #007965), #005a4b);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
}

.no-data-msg {
  padding: 20px;
  color: #888;
  font-style: italic;
}

/* Responsive column widths */
.counter-table th:nth-child(1),
.counter-table td:nth-child(1) {
  width: 35%;
  min-width: 120px;
}

.counter-table th:nth-child(2),
.counter-table td:nth-child(2) {
  width: 30%;
  min-width: 100px;
}

.counter-table th:nth-child(3),
.counter-table td:nth-child(3) {
  width: 35%;
  min-width: 80px;
}

.categories-table th:nth-child(1),
.categories-table td:nth-child(1) {
  width: 35%;
  min-width: 120px;
}

.categories-table th:nth-child(2),
.categories-table td:nth-child(2) {
  width: 30%;
  min-width: 100px;
}

.categories-table th:nth-child(3),
.categories-table td:nth-child(3) {
  width: 35%;
  min-width: 80px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .counter-container {
    padding: 5px;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-row-middle {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-item-collected,
  .summary-item-clearance {
    width: 100%;
  }
  
  .counter-table th:nth-child(1),
  .counter-table td:nth-child(1),
  .categories-table th:nth-child(1),
  .categories-table td:nth-child(1) {
    width: 40%;
    min-width: 100px;
  }
  
  .counter-table th:nth-child(2),
  .counter-table td:nth-child(2),
  .categories-table th:nth-child(2),
  .categories-table td:nth-child(2) {
    width: 30%;
    min-width: 80px;
  }
  
  .counter-table th:nth-child(3),
  .counter-table td:nth-child(3),
  .categories-table th:nth-child(3),
  .categories-table td:nth-child(3) {
    width: 30%;
    min-width: 60px;
  }
  
  th, td {
    padding: 8px;
    font-size: 0.9rem;
  }
  
  .input-field {
    font-size: 0.9rem;
    padding: 6px;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-row-middle {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .counter-table th:nth-child(1),
  .counter-table td:nth-child(1),
  .categories-table th:nth-child(1),
  .categories-table td:nth-child(1) {
    width: 45%;
    min-width: 80px;
  }
  
  .counter-table th:nth-child(2),
  .counter-table td:nth-child(2),
  .categories-table th:nth-child(2),
  .categories-table td:nth-child(2) {
    width: 25%;
    min-width: 60px;
  }
  
  .counter-table th:nth-child(3),
  .counter-table td:nth-child(3),
  .categories-table th:nth-child(3),
  .categories-table td:nth-child(3) {
    width: 30%;
    min-width: 50px;
  }
  
  th, td {
    padding: 6px;
    font-size: 0.8rem;
  }
  
  .input-field {
    font-size: 0.8rem;
    padding: 4px;
  }
}

/* All dark mode styles are now handled by unified-dark-mode.css */
</style>
