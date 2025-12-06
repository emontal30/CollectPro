<template>
  <div class="harvest-page">
    
    <PageHeader 
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💸"
    />

    <div class="date-display">
      <i class="fas fa-calendar-alt date-icon"></i>
      <span class="date-label">اليوم:</span>
      <span class="date-value">{{ currentDay }}</span>
      <span class="date-separator">|</span>
      <span class="date-label">التاريخ:</span>
      <span class="date-value">{{ currentDate }}</span>
    </div>

    <div class="search-container">
      <input 
        v-model="store.searchQuery" 
        type="text" 
        placeholder="🔍 ابحث في المحل أو الكود..." 
        class="search-input" 
      />
    </div>

    <div class="table-wrap">
      <table class="collections-table">
        <thead>
          <tr>
            <th class="serial">#️⃣</th>
            <th class="shop">🏪 المحل</th>
            <th class="code">🔢 الكود</th>
            <th class="amount">💸 مبلغ التحويل</th>
            <th class="extra">🔄 اخرى</th>
            <th class="collector highlight">💰 المحصّل</th>
            <th class="net highlight">⚖️ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in store.filteredRows" :key="row.id">
            <td class="serial">{{ index + 1 }}</td>
            <td class="shop">
              <input v-model="row.shop" type="text" placeholder="اسم المحل" class="editable-input" @input="store.ensureEmptyRow" />
            </td>
            <td class="code">
              <input v-model="row.code" type="text" placeholder="الكود" class="editable-input" @input="store.ensureEmptyRow" />
            </td>
            <td class="amount">
              <input 
                type="text" 
                :value="formatInputNumber(row.amount)" 
                class="amount-input centered-input" 
                lang="en"
                style="text-align: center; direction: ltr;" 
                @input="row.amount = parseFloat($event.target.value.replace(/,/g, '')) || 0" 
                @blur="row.amount = parseFloat($event.target.value.replace(/,/g, '')) || 0"
              />
            </td>
            <td class="extra">
              <input 
                type="text" 
                :value="formatInputNumber(row.extra)" 
                class="centered-input" 
                lang="en"
                style="text-align: center; direction: ltr;" 
                @input="row.extra = parseFloat($event.target.value.replace(/,/g, '')) || 0" 
                @blur="row.extra = parseFloat($event.target.value.replace(/,/g, '')) || 0"
              />
            </td>
            <td class="highlight collector">
              <input 
                type="text" 
                :value="formatInputNumber(row.collector)" 
                class="centered-input" 
                lang="en"
                style="text-align: center; direction: ltr;" 
                @input="row.collector = parseFloat($event.target.value.replace(/,/g, '')) || 0" 
                @blur="row.collector = parseFloat($event.target.value.replace(/,/g, '')) || 0"
              />
            </td>
            
            <td class="net numeric centered-text" :class="getNetClass(row)">
              {{ store.formatNumber(row.collector - (row.amount + row.extra)) }}
              <i :class="getNetIcon(row)"></i>
            </td>
          </tr>

          <tr id="totalRow" class="total-row summary-row">
            <td class="serial"></td>
            <td class="shop">الإجمالي</td>
            <td class="code"></td>
            <td class="amount centered-text">{{ store.formatNumber(store.totals.amount) }}</td>
            <td class="extra centered-text">{{ store.formatNumber(store.totals.extra) }}</td>
            <td class="collector centered-text">{{ store.formatNumber(store.totals.collector) }}</td>
            <td class="net numeric centered-text" :class="getTotalNetClass">
              {{ store.formatNumber(store.totalNet) }}
              <i :class="getTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-container">
      <section id="summary">
        <h2>ملخص البيان</h2>
        <div class="summary-grid">
          <div class="summary-row">
            <label class="master-limit-field">
              <div class="field-header">
                <i class="fas fa-crown field-icon"></i>
                <strong>ليمِت الماستر:</strong>
              </div>
              <input 
                type="text" 
                :value="formatInputNumber(store.masterLimit)" 
                class="bold-input" 
                lang="en"
                style="text-align: center; direction: ltr;" 
                @input="store.masterLimit = parseFloat($event.target.value.replace(/,/g, '')) || 0" 
                @blur="store.masterLimit = parseFloat($event.target.value.replace(/,/g, '')) || 0"
              />
            </label>
            <label class="current-balance-field">
              <div class="field-header">
                <i class="fas fa-wallet field-icon"></i>
                <strong>رصيد الماستر الحالي:</strong>
              </div>
              <input 
                type="text" 
                :value="formatInputNumber(store.currentBalance)" 
                class="bold-input" 
                lang="en"
                style="text-align: center; direction: ltr;" 
                @input="store.currentBalance = parseFloat($event.target.value.replace(/,/g, '')) || 0" 
                @blur="store.currentBalance = parseFloat($event.target.value.replace(/,/g, '')) || 0"
              />
            </label>
          </div>
          
          <div class="summary-row">
            <label class="reset-amount-field">
              <div class="field-header">
                <i class="fas fa-undo-alt field-icon"></i>
                <strong>مبلغ التصفيرة:</strong>
              </div>
              <span class="calc-field" :class="{ 'positive': store.resetAmount > 0, 'negative': store.resetAmount < 0 }">
                {{ store.formatNumber(store.resetAmount) }}
              </span>
            </label>
            <label class="total-collected-field">
              <div class="field-header">
                <i class="fas fa-coins field-icon"></i>
                <strong>إجمالي المحصل:</strong>
              </div>
              <span class="calc-field">{{ store.formatNumber(store.totals.collector) }}</span>
            </label>
          </div>

          <label class="reset-status-field">
            <div class="field-header">
              <i class="fas fa-check-circle field-icon"></i>
              <strong>حالة التصفير:</strong>
            </div>
            <span class="calc-field" :style="{ color: store.resetStatus.color }">
              {{ store.resetStatus.val !== 0 ? store.formatNumber(store.resetStatus.val) : '' }} 
              {{ store.resetStatus.text }}
            </span>
          </label>
        </div>
      </section>
    </div>

    <div class="buttons-container">
      <div class="buttons">
        <router-link to="/app/dashboard" class="btn">
          <i class="fas fa-home" style="color: #90EE90"></i>
          <span>صفحة الإدخال</span>
        </router-link>
        
        <router-link to="/app/archive" class="btn">
          <i class="fas fa-archive" style="color: #D3D3D3"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>
        
        <button id="clearHarvestBtn" class="btn" @click="store.clearFields">
          <i class="fas fa-broom" style="color: #DC143C"></i>
          <span>تفريغ الحقول</span>
        </button>
        
        <button id="archiveTodayBtn" class="btn" :disabled="store.rows.length === 0" @click="archiveToday">
          <i class="fas fa-box-archive" style="color: #FFA500"></i>
          <span>أرشفه اليوم</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useHarvestStore } from '@/stores/harvest';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useHarvestStore();

// Initialize the store
store.initialize()

onMounted(() => {
  // محاولة تحميل بيانات جديدة عند فتح الصفحة
  const dataLoaded = store.loadDataFromStorage();
  
  if (dataLoaded) {
    // يمكنك إظهار رسالة نجاح هنا إذا أردت
    console.log('تم استيراد بيانات جديدة من صفحة الإدخال');
  }
});

// Date formatting
const currentDate = computed(() => {
  return new Date().toLocaleDateString("en-GB", {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
});

const currentDay = computed(() => {
  return new Date().toLocaleDateString("ar-EG", { weekday: 'long' });
});

// Helper functions for colors and icons
const formatInputNumber = (num) => {
  if (!num && num !== 0) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num)
}

const getNetClass = (row) => {
  const net = row.collector - (row.amount + row.extra);
  if (net > 0) return 'positive';
  if (net < 0) return 'negative';
  return 'zero';
};

const getNetIcon = (row) => {
  const net = row.collector - (row.amount + row.extra);
  if (net > 0) return 'fas fa-arrow-up';
  if (net < 0) return 'fas fa-arrow-down';
  return 'fas fa-check';
};

const getTotalNetClass = computed(() => {
  if (store.totalNet > 0) return 'positive';
  if (store.totalNet < 0) return 'negative';
  return 'zero';
});

const getTotalNetIcon = computed(() => {
  if (store.totalNet > 0) return 'fas fa-arrow-up';
  if (store.totalNet < 0) return 'fas fa-arrow-down';
  return 'fas fa-check';
});

// Archive today's data
const archiveToday = async () => {
  // 1. تحقق سريع قبل الاستدعاء (اختياري)
  const todayStr = new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");

  if (localArchive[todayStr]) {
    if (!confirm(`يوجد أرشيف سابق ليوم ${todayStr}. هل تريد استبداله بالبيانات الحالية؟`)) {
      return;
    }
  } else {
    if (!confirm('هل أنت متأكد من أرشفة البيانات الحالية؟')) return;
  }

  // 2. استدعاء دالة المتجر الجديدة
  // يمكنك إضافة حالة تحميل هنا (loading spinner)
  const result = await store.archiveTodayData();

  // 3. عرض النتيجة
  if (result.success) {
    alert(result.message);
    // اختياري: هل تريد تفريغ الجدول بعد الأرشفة؟
    store.clearFields(); 
  } else {
    alert(result.message);
  }
};
</script>

<style scoped>
.harvest-page {
  width: 100%;
  animation: fadeIn 0.5s ease-in-out;
}

/* Ensure English numbers throughout the page */
input[type="number"] {
  direction: ltr;
  text-align: right;
  font-family: 'Courier New', monospace;
}

.calc-field {
  direction: ltr;
  text-align: right;
  font-family: 'Courier New', monospace;
}

.editable-input, .amount-input, input[type="text"] {
  width: 100%;
  border: none;
  background: transparent;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  padding: 5px;
}

.centered-input {
  text-align: center;
  direction: ltr;
}

input[type="text"] {
  text-align: center;
  direction: ltr;
}

.editable-input {
  text-align: center;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

.centered-text {
  text-align: center;
}

.editable-input:focus, .amount-input:focus {
  outline: 2px solid var(--secondary);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
}

.positive { color: #007bff; font-weight: bold; }
.negative { color: #dc3545; font-weight: bold; }
.zero { color: #28a745; font-weight: bold; }

.total-row {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: #00897B;
  color: white;
  font-weight: bold;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}



.total-row td {
  border-top: 2px solid white;
}

/* Date display styles */
.date-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  color: #333;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  flex-wrap: nowrap;
  white-space: nowrap;
}

.date-icon {
  font-size: 1.2rem;
}

.date-label {
  font-weight: 600;
}

.date-value {
  font-weight: bold;
  background: rgba(255,255,255,0.2);
  padding: 5px 10px;
  border-radius: 4px;
}

.date-separator {
  margin: 0 10px;
  opacity: 0.7;
}

/* All dark mode styles are now handled by unified-dark-mode.css */

/* Search container */
.search-container {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: 'Cairo', sans-serif;
  background: white;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.1);
}

/* Collections table */
.collections-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.collections-table th {
  background: var(--primary);
  color: white;
  padding: 15px 10px;
  text-align: center;
  font-weight: 600;
  border-bottom: 2px solid #00695c;
}



.collections-table td {
  padding: 12px 10px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: middle;
}

.collections-table .code,
.collections-table .amount,
.collections-table .extra,
.collections-table .collector,
.collections-table .net {
  text-align: center;
}



.collections-table tbody tr:hover {
  background: rgba(0, 137, 123, 0.05);
}

.collections-table .highlight {
  background: rgba(255, 193, 7, 0.1);
  font-weight: bold;
}

.collections-table .numeric {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  direction: ltr;
  text-align: center;
}

/* Summary container */
.summary-container {
  margin: 30px 0;
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.summary-container h2 {
  text-align: center;
  color: var(--primary);
  margin-bottom: 20px;
  font-size: 1.4rem;
}

.summary-grid {
  display: grid;
  gap: 20px;
}

.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.master-limit-field,
.current-balance-field,
.reset-amount-field,
.total-collected-field,
.reset-status-field {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  transition: border-color 0.3s ease;
}

.master-limit-field:focus-within,
.current-balance-field:focus-within {
  border-color: var(--primary);
}

.field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--primary);
}

.field-icon {
  color: var(--primary);
}

.bold-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  direction: ltr;
  text-align: center;
  background: white;
}

.calc-field {
  font-size: 1.1rem;
  font-weight: bold;
  direction: ltr;
  text-align: center;
  font-family: 'Courier New', monospace;
  color: var(--primary);
}

.calc-field.positive {
  color: #007bff;
}

.calc-field.negative {
  color: #dc3545;
}

/* Buttons container */
.buttons-container {
  margin-top: 30px;
}

.buttons {
  display: flex;
  gap: 15px;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary);
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Cairo', sans-serif;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.btn:hover {
  background: #00695c;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.btn i {
  font-size: 1.1rem;
}

/* Mobile responsiveness */
@media (max-width: 1024px) {
  .collections-table th {
    padding: 12px 8px;
    font-size: 0.9rem;
  }
  
  .collections-table td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }
  
  .editable-input, .amount-input {
    font-size: 0.9rem;
    padding: 4px;
  }
}

@media (max-width: 768px) {
  /* Keep desktop layout - no responsive changes */
  .harvest-page {
    padding: 0;
    min-width: 768px;
  }
  
  .date-display {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    min-height: auto;
  }
  
  .date-display > * {
    white-space: nowrap;
  }
  
  .date-separator {
    display: none;
  }
  
  .search-input {
    padding: 10px 12px;
    font-size: 0.95rem;
  }
  
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .collections-table {
    min-width: 700px;
    font-size: 0.85rem;
  }
  
  .collections-table th {
    padding: 10px 6px;
    font-size: 0.8rem;
  }
  
  .collections-table td {
    padding: 8px 6px;
    font-size: 0.8rem;
  }
  
  .editable-input, .amount-input {
    font-size: 0.8rem;
    padding: 3px;
  }
  
  .summary-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-container {
    padding: 20px 15px;
  }
  
  .bold-input {
    padding: 8px 10px;
    font-size: 0.95rem;
  }
  
  .calc-field {
    font-size: 1rem;
  }
  
  .buttons {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  
  .btn {
    width: 100%;
    max-width: 280px;
    justify-content: center;
    padding: 12px 16px;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .harvest-page {
    padding: 0 5px;
  }
  
  .date-display {
    padding: 10px;
  }
  
  .date-value {
    padding: 3px 8px;
    font-size: 0.9rem;
  }
  
  .search-input {
    padding: 8px 10px;
    font-size: 0.9rem;
  }
  
  .collections-table {
    min-width: 650px;
    font-size: 0.75rem;
  }
  
  .collections-table th {
    padding: 8px 4px;
    font-size: 0.75rem;
  }
  
  .collections-table td {
    padding: 6px 4px;
    font-size: 0.75rem;
  }
  
  .editable-input, .amount-input {
    font-size: 0.75rem;
    padding: 2px;
  }
  
  .summary-container {
    padding: 15px 10px;
    margin: 20px 0;
  }
  
  .summary-container h2 {
    font-size: 1.2rem;
  }
  
  .bold-input {
    padding: 6px 8px;
    font-size: 0.9rem;
  }
  
  .calc-field {
    font-size: 0.9rem;
  }
  
  .field-header {
    font-size: 0.9rem;
    gap: 6px;
  }
  
  .btn {
    flex: 1;
    min-width: 90px;
    max-width: 120px;
    justify-content: center;
    padding: 8px 10px;
    font-size: 0.75rem;
  }
  
  .buttons {
    gap: 8px;
  }
}
</style>