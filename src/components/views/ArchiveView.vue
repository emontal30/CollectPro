<template>
  <div class="archive-page">
    
    <PageHeader 
      title="الأرشيف" 
      subtitle="عرض واسترجاع بيانات التحصيلات السابقة"
      icon="📄"
    />

    <ColumnVisibility
      v-model="showColumnsArchive"
      :columns="archiveColumns"
      storage-key="columns.visibility.archive"
      @save="applySavedColumnsArchive"
    />

    <div class="archive-controls">
      <div class="control-group">
        <label>
          <i class="fas fa-calendar-alt control-icon"></i>
          اختر التاريخ:
          <select 
            v-model="store.selectedDate" 
            class="archive-select" 
            @change="handleDateChange"
            :disabled="store.isLoading"
          >
            <option value="">-- اختر تاريخ --</option>
            <template v-if="store.availableDates.length > 0">
              <option 
                v-for="dateItem in store.availableDates" 
                :key="dateItem.value" 
                :value="dateItem.value"
                :style="{ color: dateItem.source === 'cloud' ? 'var(--primary)' : '' }"
              >
                {{ dateItem.value }} {{ dateItem.source === 'cloud' ? '(سحابة)' : '' }}
              </option>
            </template>
            <template v-else>
              <option value="" disabled>لا يوجد أرشيف لعرضه حالياً</option>
            </template>
          </select>
        </label>
      </div>

      <div class="search-control">
        <div class="search-input-wrapper">
          <i class="fas fa-search control-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ابحث في المحل أو الكود"
            class="search-input"
          />
        </div>
        <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showColumnsArchive = true">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
            <th class="header-cell date-header">📅 التاريخ</th>
            <th v-show="isVisibleArchive('shop')" class="header-cell shop-header">🏪 المحل</th>
            <th v-show="isVisibleArchive('code')" class="header-cell code-header">🔢 الكود</th>
            <th v-show="isVisibleArchive('amount')" class="header-cell amount-header">💵 التحويل</th>
            <th v-show="isVisibleArchive('extra')" class="header-cell extra-header">📌 اخرى</th>
            <th v-show="isVisibleArchive('collector')" class="header-cell collector-header">👤 المحصل</th>
            <th v-show="isVisibleArchive('net')" class="header-cell net-header">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <!-- يتم عرض اللودر في حال التحميل فقط -->
          <tr v-if="store.isLoading">
            <td colspan="7" class="text-center p-20">
              <i class="fas fa-spinner fa-spin"></i> جاري استعادة البيانات...
            </td>
          </tr>

          <template v-else>
            <tr v-for="(row, index) in filteredRows" :key="index">
              <td class="date-cell">{{ store.selectedDate }}</td>
              <td v-show="isVisibleArchive('shop')">{{ row.shop }}</td>
              <td v-show="isVisibleArchive('code')">{{ row.code }}</td>
              <td v-show="isVisibleArchive('amount')">{{ formatNum(row.amount) }}</td>
              <td v-show="isVisibleArchive('extra')">{{ formatNum(row.extra) }}</td>
              <td v-show="isVisibleArchive('collector')">{{ formatNum(row.collector) }}</td>
              <td v-show="isVisibleArchive('net')" class="net numeric" :class="getNetClass(row.net)">
                {{ formatNum(row.net) }}
                <i :class="getNetIcon(row.net)" class="mr-2 text-xs"></i>
              </td>
            </tr>

            <tr v-if="filteredRows.length === 0">
              <td colspan="7" class="no-data-row">
                {{ store.selectedDate ? 'لا توجد بيانات لهذا اليوم' : 'يرجى اختيار تاريخ من القائمة أعلاه' }}
              </td>
            </tr>

            <tr v-if="filteredRows.length > 0" class="total-row">
              <td class="total-label">الإجمالي</td>
              <td v-show="isVisibleArchive('shop')"></td>
              <td v-show="isVisibleArchive('code')"></td>
              <td v-show="isVisibleArchive('amount')">{{ formatNum(filteredTotals.amount) }}</td>
              <td v-show="isVisibleArchive('extra')">{{ formatNum(filteredTotals.extra) }}</td>
              <td v-show="isVisibleArchive('collector')">{{ formatNum(filteredTotals.collector) }}</td>
              <td v-show="isVisibleArchive('net')" class="net numeric" :class="getNetClass(filteredTotals.net)">
                {{ formatNum(filteredTotals.net) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="archive-actions">
      <router-link to="/app/harvest" class="btn btn-secondary btn--back-to-harvest">
        <i class="fas fa-arrow-left"></i>
        <span>العودة للتحصيلات</span>
      </router-link>

      <button 
        v-if="store.selectedDate && !store.isLoading" 
        class="btn btn-danger btn--delete-archive" 
        @click="deleteCurrentArchive"
      >
        <i class="fas fa-trash-alt"></i>
        <span>حذف هذا الأرشيف</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref, computed, reactive, inject } from 'vue';
import { useArchiveStore } from '@/stores/archiveStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import logger from '@/utils/logger.js';

const store = useArchiveStore();
const searchQuery = ref('');
const { confirm, addNotification } = inject('notifications');

// ==========================================
// 1. إعدادات الأعمدة
// ==========================================
const archiveColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 التحويل' },
  { key: 'extra', label: '📌 اخرى' },
  { key: 'collector', label: '👤 المحصل' },
  { key: 'net', label: '✅ الصافي' }
];

const showColumnsArchive = ref(false);
const columnsVisibilityArchive = reactive({});

function loadColumnsVisibilityArchive() {
  const raw = localStorage.getItem('columns.visibility.archive');
  const saved = raw ? JSON.parse(raw) : null;
  archiveColumns.forEach(c => { 
    columnsVisibilityArchive[c.key] = saved && typeof saved[c.key] === 'boolean' ? saved[c.key] : true; 
  });
}

function isVisibleArchive(key) { return columnsVisibilityArchive[key] !== false; }

function applySavedColumnsArchive(obj) { 
  Object.keys(obj || {}).forEach(k => { columnsVisibilityArchive[k] = !!obj[k]; }); 
}

// ==========================================
// 2. المنطق الأساسي
// ==========================================

const filteredRows = computed(() => {
  if (!searchQuery.value) return store.rows;
  const q = searchQuery.value.toLowerCase();
  return store.rows.filter(row => 
    (row.shop && row.shop.toLowerCase().includes(q)) || 
    (row.code && row.code.toString().toLowerCase().includes(q))
  );
});

const filteredTotals = computed(() => {
  return filteredRows.value.reduce((acc, row) => {
    acc.amount += Number(row.amount) || 0;
    acc.extra += Number(row.extra) || 0;
    acc.collector += Number(row.collector) || 0;
    acc.net += Number(row.net) || 0;
    return acc;
  }, { amount: 0, extra: 0, collector: 0, net: 0 });
});

const formatNum = (val) => Number(val || 0).toLocaleString();

onMounted(async () => {
  logger.info('🚀 ArchiveView Initializing...');
  loadColumnsVisibilityArchive();

  // تحميل قائمة التواريخ
  await store.loadAvailableDates();

  // إذا كان هناك تاريخ محدد، حمله
  if (store.selectedDate) {
    await store.loadArchiveByDate(store.selectedDate);
  }
});

const handleDateChange = async () => {
  searchQuery.value = "";
  if (store.selectedDate) {
    await store.loadArchiveByDate(store.selectedDate);
  } else {
    store.rows = [];
  }
};

const getNetClass = (val) => val > 0 ? 'positive' : (val < 0 ? 'negative' : 'zero');
const getNetIcon = (val) => val > 0 ? 'fas fa-arrow-up' : (val < 0 ? 'fas fa-arrow-down' : 'fas fa-check');

// ==========================================
// 3. منطق الحذف
// ==========================================
const deleteCurrentArchive = async () => {
  if (!store.selectedDate) return;

  const result = await confirm({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف أرشيف يوم ${store.selectedDate}؟ سيتم حذفه من الهاتف وقاعدة البيانات نهائياً.`,
    icon: 'warning',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33',
  });

  if (result.isConfirmed) {
    const deleteResult = await store.deleteArchive(store.selectedDate);
    if (deleteResult.success) {
      addNotification(deleteResult.message, 'success');
      searchQuery.value = '';
    } else {
      addNotification(deleteResult.message, 'error');
    }
  }
};
</script>

<style scoped>
.archive-page { max-width: 1200px; margin: 0 auto; padding-bottom: 40px; }
.archive-controls { display: flex; flex-direction: column; gap: 15px; padding: 25px; background: var(--card-bg); border-radius: 20px; border: 1px solid var(--border-color); margin-bottom: 25px; box-shadow: var(--card-shadow); }

.btn-settings-table {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--text-secondary);
  padding: 0 10px;
  transition: color 0.3s;
  display: flex;
  align-items: center;
}

.btn-settings-table:hover {
  color: var(--primary);
}

.archive-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.btn--back-to-harvest {
  min-width: 180px;
}

.btn--delete-archive {
  background-color: #ef4444;
  color: white;
  min-width: 180px;
}

.btn--delete-archive:hover {
  background-color: #dc2626;
}

@media (max-width: 600px) {
  .archive-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .btn--back-to-harvest, 
  .btn--delete-archive {
    width: 100%;
  }
}
</style>
