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
          :disabled="store.isLoading || searchQuery.length >= 2"
        >
          <option value="">{{ searchQuery.length >= 2 ? '-- وضع البحث الشامل نشط --' : '-- اختر تاريخ --' }}</option>
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

    <div class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
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
            <tr v-for="(row, index) in store.rows" :key="index">
              <td class="date-cell">{{ row.date || store.selectedDate }}</td>
              <td v-show="isVisible('shop')">{{ row.shop }}</td>
              <td v-show="isVisible('code')" class="code">{{ row.code }}</td>
              <td v-show="isVisible('amount')">{{ formatNum(row.amount) }}</td>
              <td v-show="isVisible('extra')">{{ formatNum(row.extra) }}</td>
              <td v-show="isVisible('collector')">{{ formatNum(row.collector) }}</td>
              <td v-show="isVisible('net')" class="net numeric" :class="getNetClass(row.net)">
                {{ formatNum(row.net) }}
                <i :class="getNetIcon(row.net)"></i>
              </td>
            </tr>

            <tr v-if="store.rows.length === 0">
              <td colspan="7" class="text-center p-3 text-muted">
                {{ store.isGlobalSearching ? 'لم يتم العثور على نتائج للبحث' : (store.selectedDate ? 'لا توجد بيانات لهذا اليوم' : 'يرجى اختيار تاريخ أو كتابة اسم محل للبحث') }}
              </td>
            </tr>

            <tr v-if="store.rows.length > 0" class="total-row">
              <td class="date-cell"></td>
              <td v-show="isVisible('shop')" class="shop">الإجمالي</td>
              <td v-show="isVisible('code')" class="code"></td>
              <td v-show="isVisible('amount')">{{ formatNum(store.totals.amount) }}</td>
              <td v-show="isVisible('extra')">{{ formatNum(store.totals.extra) }}</td>
              <td v-show="isVisible('collector')">{{ formatNum(store.totals.collector) }}</td>
              <td v-show="isVisible('net')" class="net numeric" :class="getNetClass(store.totals.net)">
                {{ formatNum(store.totals.net) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="buttons-container">
      <div class="buttons-row">
        <router-link to="/app/harvest" class="btn btn-secondary">
          <i class="fas fa-arrow-left"></i>
          <span>العودة للتحصيلات</span>
        </router-link>

        <button 
          v-if="store.selectedDate && !store.isLoading && !store.isGlobalSearching" 
          class="btn btn-danger" 
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
import { onMounted, ref, inject } from 'vue';
import { useArchiveStore } from '@/stores/archiveStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import logger from '@/utils/logger.js';
import { getNetClass, getNetIcon } from '@/utils/formatters.js';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';

const store = useArchiveStore();
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

const formatNum = (val) => Number(val || 0).toLocaleString();

onMounted(async () => {
  logger.info('🚀 ArchiveView Initializing...');
  loadColumns();
  await store.loadAvailableDates();
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

const handleSearch = () => {
  clearTimeout(searchTimeout);
  if (searchQuery.value.length >= 2) {
    searchTimeout = setTimeout(() => {
      store.searchInAllArchives(searchQuery.value);
    }, 400); 
  } else if (searchQuery.value.length === 0) {
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

const deleteCurrentArchive = async () => {
  if (!store.selectedDate) return;

  const result = await confirm({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف أرشيف يوم ${store.selectedDate}؟ سيتم حذفه من الهاتف وقاعدة البيانات نهائياً.`,
    icon: 'warning',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: 'var(--danger)',
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
.search-info-banner {
  background: var(--primary-light, #e0f2fe);
  color: var(--primary-dark, #0369a1);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  border: 1px solid var(--primary-border, #bae6fd);
}

.btn-clear-search {
  margin-right: auto;
  background: white;
  border: 1px solid var(--primary-border);
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-clear-search:hover {
  background: var(--danger-light, #fee2e2);
  color: var(--danger);
  border-color: var(--danger);
}

.date-cell {
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
  font-size: 0.75rem; /* تصغير الخط أكثر */
}

.modern-table td.code {
  font-size: 0.75rem; /* تصغير الخط أكثر */
  color: var(--gray-600);
  font-style: italic; /* جعل النص مائلاً */
}
</style>