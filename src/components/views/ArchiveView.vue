<template>
  <div class="archive-page">
    
    <PageHeader 
      title="الأرشيف" 
      subtitle="عرض واسترجاع بيانات التحصيلات السابقة"
      icon="📁"
    />

    <div class="archive-controls">
      <div class="control-group">
        <label>
          <i class="fas fa-calendar-alt control-icon"></i>
          اختر التاريخ:
          <select id="archiveSelect" v-model="store.selectedDate" @change="handleDateChange">
            <option value="">-- اختر تاريخ --</option>
            <option v-for="date in store.availableDates" :key="date" :value="date">
              {{ date }}
            </option>
          </select>
        </label>
      </div>

      <div class="control-group">
        <label>
          <i class="fas fa-search control-icon"></i>
          بحث:
          <input 
            id="archiveSearch" 
            v-model="store.searchQuery" 
            type="text"
            placeholder="اكتب اسم المحل أو الكود" 
            @input="handleSearch" 
          />
        </label>
      </div>
    </div>

    <div class="overflow-x-auto w-full">
      <table id="archiveTable" class="collections-table w-full">
        <thead>
          <tr>
            <th class="whitespace-nowrap">📅 التاريخ</th>
            <th class="whitespace-nowrap">🏪 المحل</th>
            <th class="whitespace-nowrap">🔢 الكود</th>
            <th class="whitespace-nowrap">💸 مبلغ التحويل</th>
            <th class="extra whitespace-nowrap">🔄 اخرى</th>
            <th class="whitespace-nowrap">💰 المحصّل</th>
            <th class="whitespace-nowrap">⚖️ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.isLoading">
            <td colspan="7" style="text-align: center; padding: 20px;">
              <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
            </td>
          </tr>
          <tr v-if="store.isLoading">
            <td colspan="7" style="text-align: center; padding: 20px;">
              <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
            </td>
          </tr>

          <tr v-for="(row, index) in store.rows" :key="index">
            <td class="date-cell">{{ row.date }}</td>
            <td class="shop">{{ row.shop }}</td>
            <td class="code">{{ row.code }}</td>
            <td class="amount">{{ store.formatNumber(row.amount) }}</td>
            <td class="extra">{{ store.formatNumber(row.extra) }}</td>
            <td class="collector">{{ store.formatNumber(row.collector) }}</td>
            
            <td class="net numeric" :class="getNetClass(row.net)">
              {{ store.formatNumber(row.net) }}
              <i :class="getNetIcon(row.net)" style="margin-right: 4px; font-size: 0.8em;"></i>
            </td>
          </tr>

          <tr v-if="!store.isLoading && store.rows.length === 0">
            <td colspan="7" class="no-data-row">لا توجد بيانات لعرضها</td>
          </tr>

          <tr v-if="store.rows.length > 0" id="archiveTotalRow" class="total-row">
            <td colspan="3" style="text-align: center; font-size: 20px; font-weight: 800;">الإجمالي</td>
            <td class="amount">{{ store.formatNumber(store.totals.amount) }}</td>
            <td class="extra">{{ store.formatNumber(store.totals.extra) }}</td>
            <td class="collector">{{ store.formatNumber(store.totals.collector) }}</td>
            <td class="net numeric" :class="getNetClass(store.totals.net)">
              {{ store.formatNumber(store.totals.net) }}
              <i :class="getNetIcon(store.totals.net)" style="margin-right: 4px; font-size: 0.8em;"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="buttons">
      <router-link id="backToHarvestBtn" to="/app/harvest" class="btn">
        <i class="fas fa-arrow-left" style="color: #90EE90 !important;"></i>
        <span>رجوع للتحصيلات</span>
      </router-link>
      
      <button 
        id="deleteArchiveBtn" 
        class="btn" 
        :disabled="!store.selectedDate"
        @click="store.deleteCurrentArchive"
      >
        <i class="fas fa-trash-alt" style="color: #DC143C !important;"></i>
        <span>حذف التاريخ الحالي</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useArchiveStore } from '@/stores/archiveStore';
import debounce from 'lodash/debounce'; // تأكد من تثبيت lodash أو اكتب دالة debounce يدوياً
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useArchiveStore();

onMounted(() => {
  document.body.classList.add('page-has-fixed-width');
  store.loadAvailableDates();
});

onUnmounted(() => {
  document.body.classList.remove('page-has-fixed-width');
});

const handleDateChange = () => {
  // تصفير البحث عند اختيار تاريخ
  store.searchQuery = "";
  store.loadArchiveByDate(store.selectedDate);
};

// استخدام Debounce للبحث لتجنب التلعثم عند الكتابة
const handleSearch = debounce((e) => {
  const query = e.target.value;
  if (query) {
    store.searchArchive(query);
  } else if (store.selectedDate) {
    // إذا تم مسح البحث، نعود لبيانات التاريخ المختار
    store.loadArchiveByDate(store.selectedDate);
  }
}, 500);

// --- دوال التنسيق البصري ---
const getNetClass = (val) => {
  if (val > 0) return 'positive';
  if (val < 0) return 'negative';
  return 'zero';
};

const getNetIcon = (val) => {
  if (val > 0) return 'fas fa-arrow-up';
  if (val < 0) return 'fas fa-arrow-down';
  return 'fas fa-check';
};
</script>

<style scoped>
/* هنا ننسخ التنسيقات الخاصة بالأرشيف فقط من style.css 
  لضمان العزل والتطابق
*/

/* Fixed width for archive page */
.archive-page {
  max-width: 768px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 50px;
  animation: fadeIn 0.5s ease-in-out;
}

/* --- Archive Controls --- */
.archive-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 15px;
  padding: 15px 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.9));
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,121,101,0.05);
  border: 2px solid rgba(0,121,101,0.1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  justify-content: space-between;
}

.archive-controls::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,121,101,0.03), transparent);
  transition: left 0.8s ease;
}

.archive-controls:hover::before {
  left: 100%;
}

.control-group {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--primary, #007965);
  font-size: 13px;
  margin: 0;
  width: 100%;
}

.control-icon {
  font-size: 1.2rem;
  color: var(--primary, #007965);
  background: linear-gradient(135deg, rgba(0,121,101,0.1), rgba(0,121,101,0.05));
  padding: 8px;
  border-radius: 8px;
  min-width: 32px;
  text-align: center;
}

select, input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid rgba(0,121,101,0.3);
  border-radius: 10px;
  font-size: 14px;
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  color: #333;
  font-family: 'Cairo', sans-serif;
  outline: none;
}

select:focus, input:focus {
  border-color: var(--primary, #007965);
  box-shadow: 0 0 0 3px rgba(0, 121, 101, 0.2);
}

/* Dark Mode Styles for Archive View */
body.dark .archive-page {
  background-color: var(--dark-bg);
  color: var(--dark-text-primary);
}

body.dark table {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
}

body.dark th {
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-hover));
  color: var(--dark-text-primary);
}

body.dark td {
  background-color: var(--dark-surface);
  color: var(--dark-text-primary);
  border-color: var(--dark-border);
}

body.dark .date-cell {
  color: var(--dark-text-secondary);
}

body.dark .total-row {
  background: var(--dark-accent);
  color: var(--dark-text-primary);
}

body.dark .total-row td {
  border-color: rgba(255,255,255,0.3);
}

body.dark .search-input {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

body.dark .search-input:focus {
  border-color: var(--dark-accent);
  box-shadow: 0 0 0 2px rgba(0, 121, 101, 0.2);
}

body.dark .btn {
  background-color: var(--dark-accent);
  color: var(--dark-text-primary);
  border-color: var(--dark-accent);
}

body.dark .btn:hover {
  background-color: var(--dark-accent-hover);
}

body.dark .filter-btn {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

body.dark .filter-btn:hover {
  background-color: var(--dark-surface-hover);
}

body.dark .filter-btn.active {
  background-color: var(--dark-accent);
  color: var(--dark-text-primary);
}

/* --- Table Styles --- */
.table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 25px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

th {
  background: linear-gradient(135deg, #007965, #005a4b);
  color: white;
  padding: 18px 12px;
  text-align: center;
  white-space: nowrap;
}

td {
  padding: 16px 12px;
  text-align: center;
  border-bottom: 1px solid rgba(0,121,101,0.1);
  font-weight: 600;
}

.date-cell {
  white-space: nowrap;
  font-size: 0.9em;
  color: #666;
}

/* Total Row Style */
.total-row {
  background: #00897B;
  color: white;
  font-weight: bold;
  position: sticky;
  bottom: 0;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
}

.total-row td {
  border-top: 1px solid rgba(255,255,255,0.3);
  border-right: 1px solid rgba(255,255,255,0.2);
  color: white;
}

/* Buttons */
.buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #007965, #005a4b);
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Helpers */
.positive { color: #007bff; }
.negative { color: #dc3545; }
.zero { color: #28a745; }
.no-data-row {
  padding: 40px;
  color: #888;
  font-style: italic;
}

/* Dark Mode adjustments if handled globally via body class */
:global(body.dark) .archive-controls {
  background: linear-gradient(135deg, #2a2a2a, #1e1e1e);
  border-color: rgba(0,200,150,0.2);
}
:global(body.dark) select, :global(body.dark) input {
  background: #333;
  color: #eee;
  border-color: #555;
}
:global(body.dark) table {
  background: #1e1e1e;
  color: #eee;
}
:global(body.dark) .total-row {
  background: #1a1a1a;
}
</style>