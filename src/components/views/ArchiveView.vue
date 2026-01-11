<template>
  <div class="archive-page">
    
    <PageHeader 
      title="الأرشيف" 
      subtitle="عرض واسترجاع بيانات التحصيلات السابقة"
      icon="📄"
    />

    <ColumnVisibility
      v-model="showSettings"
      :columns="archiveColumns"
      storage-key="columns.visibility.archive"
      @save="apply"
    />

    <div class="archive-controls">
      <div class="control-group">
        <label class="font-bold mb-2 d-flex align-center gap-2">
          <i class="fas fa-calendar-alt text-primary"></i>
          اختر التاريخ:
        </label>
        <select 
          v-model="store.selectedDate" 
          class="archive-select" 
          @change="handleDateChange"
          :disabled="store.isLoading || isSearching"
        >
          <option value="">{{ isSearching ? '-- وضع البحث الشامل نشط --' : '-- اختر تاريخ --' }}</option>
          <template v-if="store.availableDates.length > 0">
            <option 
              v-for="dateItem in store.availableDates" 
              :key="dateItem.value" 
              :value="dateItem.value"
            >
              {{ dateItem.value }} {{ dateItem.source === 'cloud' ? '(سحابة)' : '' }}
            </option>
          </template>
          <template v-else>
            <option value="" disabled>لا يوجد أرشيف لعرضه حالياً</option>
          </template>
        </select>
      </div>

      <div class="search-control">
        <div class="search-input-wrapper">
          <i class="fas fa-search control-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ابحث في كل الأرشيف (المحل/الكود)..."
            class="search-input"
            @input="handleSearch"
          />
        </div>
        <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showSettings = true">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>

    <!-- تنبيه عند البحث الشامل -->
    <div v-if="store.isGlobalSearching && searchQuery" class="search-info-banner">
      <i class="fas fa-info-circle"></i>
      نتائج البحث عن "{{ searchQuery }}" في جميع التواريخ المتاحة
      <button @click="clearSearch" class="btn-clear-search">إلغاء البحث</button>
    </div>

    <div id="archive-table-container" class="table-wrapper">
      <table class="modern-table archive-specific-table w-full">
        <thead>
          <tr class="archive-header-row">
            <th class="date-header">📅 التاريخ</th>
            <th v-show="isVisible('shop')" class="shop">🏪 المحل</th>
            <th v-show="isVisible('code')" class="code">🔢 الكود</th>
            <th v-show="isVisible('amount')" class="amount">💵 التحويل</th>
            <th v-show="isVisible('extra')" class="extra">📌 اخرى</th>
            <th v-show="isVisible('collector')" class="collector">👤 المحصل</th>
            <th v-show="isVisible('net')" class="net highlight">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.isLoading">
            <td colspan="7" class="text-center p-3">
              <i class="fas fa-spinner fa-spin text-primary"></i> جاري استعادة البيانات...
            </td>
          </tr>

          <template v-else>
            <tr v-for="(row, index) in filteredRows" :key="index">
              <td class="date-cell">{{ row.date || store.selectedDate }}</td>
              <td v-show="isVisible('shop')" class="shop shop-name-cell">{{ row.shop }}</td>
              <td v-show="isVisible('code')" class="code">{{ row.code }}</td>
              <td v-show="isVisible('amount')">{{ formatNum(row.amount) }}</td>
              <td v-show="isVisible('extra')">{{ formatNum(row.extra) }}</td>
              <td v-show="isVisible('collector')">{{ formatNum(row.collector) }}</td>
              <td v-show="isVisible('net')" class="net numeric" :class="getNetClass(row.net)">
                {{ formatNum(row.net) }}
                <i :class="getNetIcon(row.net)"></i>
              </td>
            </tr>

            <tr v-if="filteredRows.length === 0">
              <td colspan="7" class="text-center p-3 text-muted">
                {{ store.isGlobalSearching ? 'لم يتم العثور على نتائج للبحث' : (store.selectedDate ? 'لا توجد بيانات لهذا اليوم' : 'يرجى اختيار تاريخ أو كتابة اسم محل للبحث') }}
              </td>
            </tr>

            <tr v-if="filteredRows.length > 0" class="total-row">
              <td class="date-cell"></td>
              <td v-show="isVisible('shop')" class="shop">الإجمالي</td>
              <td v-show="isVisible('code')" class="code"></td>
              <td v-show="isVisible('amount')">{{ formatNum(filteredTotals.amount) }}</td>
              <td v-show="isVisible('extra')">{{ formatNum(filteredTotals.extra) }}</td>
              <td v-show="isVisible('collector')">{{ formatNum(filteredTotals.collector) }}</td>
              <td v-show="isVisible('net')" class="net numeric" :class="getNetClass(filteredTotals.net)">
                {{ formatNum(filteredTotals.net) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Export Button -->
    <div class="export-container" v-if="filteredRows.length > 0">
      <button class="btn-export-share" @click="handleExport" title="مشاركة الجدول كصورة">
        <i class="fas fa-share-alt"></i>
        <span>مشاركة الجدول</span>
      </button>
    </div>

    <div class="buttons-container footer-sticky">
      <div class="buttons-row">
        <router-link to="/app/harvest" class="btn btn-dashboard btn-dashboard--home">
          <i class="fas fa-arrow-left"></i>
          <span>العودة للتحصيلات</span>
        </router-link>

        <button 
          v-if="store.selectedDate && !store.isLoading && !store.isGlobalSearching"
          class="btn btn-dashboard btn-dashboard--clear"
          @click="deleteCurrentArchive"
        >
          <i class="fas fa-trash-alt"></i>
          <span>حذف هذا الأرشيف</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref, inject, computed, watch, onActivated } from 'vue';
import { useArchiveStore } from '@/stores/archiveStore';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import logger from '@/utils/logger.js';
import { getNetClass, getNetIcon } from '@/utils/formatters.js';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';
import { exportAndShareTable } from '@/utils/exportUtils.js';
import { onBeforeRouteUpdate } from 'vue-router';

const store = useArchiveStore();
const authStore = useAuthStore();
const searchQuery = ref('');
const { confirm, addNotification } = inject('notifications');

let searchTimeout = null;

const archiveColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 التحويل' },
  { key: 'extra', label: '📌 اخرى' },
  { key: 'collector', label: '👤 المحصل' },
  { key: 'net', label: '✅ الصافي' }
];

const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(archiveColumns, 'columns.visibility.archive');

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return store.rows;
  return store.rows.filter(row => 
    (row.shop && row.shop.toLowerCase().includes(query)) || 
    (row.code && row.code.toString().toLowerCase().includes(query)) ||
    (row.date && row.date.includes(query))
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

const isSearching = computed(() => searchQuery.value.trim().length > 0);
const formatNum = (val) => Number(val || 0).toLocaleString();

const initData = async (force = false) => {
  if (!authStore.isAuthenticated || (store.isLoading && !force)) return;
  try {
    loadColumns();
    await store.loadAvailableDates(force);
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
    }
  } catch (err) {
    logger.error('ArchiveView: Error initializing data', err);
  }
};

onMounted(() => { initData(true); });
onActivated(() => { initData(true); });
onBeforeRouteUpdate((to, from, next) => {
  initData(true);
  next();
});

watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal) initData(true);
});

const handleDateChange = async () => {
  if (store.selectedDate) {
    searchQuery.value = "";
    await store.loadArchiveByDate(store.selectedDate);
  } else {
    store.rows = [];
  }
};

const handleSearch = () => {
  const query = searchQuery.value.trim();
  if (query.length > 0 && !store.selectedDate) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      store.searchInAllArchives(query);
    }, 100);
  } else if (query.length === 0) {
    if (store.selectedDate) {
      store.loadArchiveByDate(store.selectedDate);
    } else {
      store.rows = [];
      store.isGlobalSearching = false;
    }
  }
};

const clearSearch = () => {
  searchQuery.value = '';
  handleSearch();
};

const handleExport = async () => {
  addNotification('جاري تجهيز الأرشيف للمشاركة...', 'info');
  const fileName = searchQuery.value ? `ارشيف_بحث_${searchQuery.value}` : `ارشيف_${store.selectedDate}`;
  const result = await exportAndShareTable('archive-table-container', fileName);
  if (result.success && result.message) addNotification(result.message, 'success');
  else if (!result.success) addNotification(result.message, 'error');
};

const deleteCurrentArchive = async () => {
  if (!store.selectedDate) return;
  const result = await confirm({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف أرشيف يوم ${store.selectedDate}؟ سيتم حذفه نهائياً من الهاتف والسحابة.`,
    icon: 'warning',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: 'var(--danger)',
  });
  if (result.isConfirmed) {
    const res = await store.deleteArchive(store.selectedDate);
    if (res.success) {
      addNotification(res.message, 'success');
      searchQuery.value = '';
    } else {
      addNotification(res.message, 'error');
    }
  }
};
</script>

<style scoped>
.archive-page { display: flex; flex-direction: column; min-height: calc(100vh - 80px); }
.table-wrapper { flex: 1; margin-bottom: 20px; }
.archive-header-row th { font-size: 0.8rem; }
.footer-sticky { margin-top: auto; padding-bottom: 20px; }
.search-info-banner { background: var(--primary-light, #e0f2fe); color: var(--primary-dark, #0369a1); padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; border: 1px solid var(--primary-border, #bae6fd); }
.btn-clear-search { margin-right: auto; background: white; border: 1px solid var(--primary-border); padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
.btn-clear-search:hover { background: var(--danger-light, #fee2e2); color: var(--danger); border-color: var(--danger); }
.btn-full { width: 100%; }
.date-header, .date-cell { width: 85px !important; min-width: 85px !important; }
.date-cell { font-weight: 600; color: var(--primary); white-space: nowrap; font-size: 0.55rem; }
.shop-name-cell { font-size: 0.8rem !important; }
.modern-table td.code { font-size: 0.75rem; color: var(--gray-600); font-style: italic; }
.archive-specific-table .shop, .archive-specific-table td.shop, .archive-specific-table th.shop { width: 145px !important; min-width: 145px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.export-container { display: flex; justify-content: flex-end; margin-top: 10px; margin-bottom: 15px; padding: 0 5px; }
.btn-export-share { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); transition: all 0.2s ease; }
.btn-export-share:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4); }
.btn-export-share i { font-size: 1rem; }
@media (max-width: 768px) { .archive-specific-table .shop, .archive-specific-table td.shop, .archive-specific-table th.shop { width: 115px !important; min-width: 115px !important; } .date-header, .date-cell { width: 70px !important; min-width: 70px !important; } .export-container { justify-content: center; } }

/* Use global dashboard button styles; keep simple layout spacing */
.buttons-container { margin-top: 30px; padding: 12px; }
.buttons-container .buttons-row { display:flex; gap:12px; justify-content:center; width:100%; flex-wrap:nowrap; }
.buttons-container .buttons-row > * { flex: 0 1 48%; min-width: 0; margin: 0; }

/* keep them side-by-side on all viewports (smaller gap on very small screens) */
@media (max-width: 420px) {
  .buttons-container { padding: 10px; }
  .buttons-container .buttons-row { gap:8px; }
  .buttons-container .buttons-row > * { flex: 0 1 46%; }
}
</style>