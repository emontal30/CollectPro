<template>
  <div class="harvest-page">
    
    <PageHeader 
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💰"
    />

    <div class="date-display">
      <i class="fas fa-calendar-alt text-primary"></i>
      <span class="font-bold">اليوم:</span>
      <span class="text-primary font-bold">{{ currentDay }}</span>
      <span class="text-muted">|</span>
      <span class="font-bold">التاريخ:</span>
      <span class="text-primary font-bold">{{ currentDate }}</span>
    </div>

    <ColumnVisibility
      v-model="showSettings"
      :columns="harvestColumns"
      storage-key="columns.visibility.harvest"
      @save="apply"
    />

    <div class="search-control">
      <div class="customer-count-badge" v-show="isVisible('shop')">
        <div class="count-label">عدد العملاء</div>
        <div class="count-value">{{ store.customerCount }}</div>
      </div>
      <div class="search-input-wrapper">
        <i class="fas fa-search control-icon"></i>
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder=" ...ابحث في المحل أو الكود"
          class="search-input"
        />
      </div>
      <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showSettings = true">
        <i class="fas fa-cog"></i>
      </button>
    </div>

    <div class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
            <th v-show="isVisible('shop')" class="shop">🏪 المحل</th>
            <th v-show="isVisible('code')" class="code">🔢 الكود</th>
            <th v-show="isVisible('amount')" class="amount">💵 التحويل</th>
            <th v-show="isVisible('extra')" class="extra">📌 اخرى</th>
            <th v-show="isVisible('collector')" class="collector">👤 المحصل</th>
            <th v-show="isVisible('net')" class="net highlight">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in store.filteredRows" :key="row.id">
            <td v-show="isVisible('shop')" class="shop" :class="{ 'negative-net-border': getRowNetStatus(row) === 'negative' }">
              <input v-if="!row.isImported" :value="row.shop" type="text" placeholder="اسم المحل" class="editable-input" @input="updateShop(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.shop }}</span>
            </td>
            <td v-show="isVisible('code')" class="code">
              <input v-if="!row.isImported" :value="row.code" type="text" placeholder="الكود" class="editable-input" @input="updateCode(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.code }}</span>
            </td>
            <td v-show="isVisible('amount')" class="amount">
              <input
                v-if="!row.isImported"
                type="text"
                :value="formatInputNumber(row.amount)"
                class="amount-input centered-input"
                lang="en"
                @input="updateAmount(row, index, $event)"
                @blur="updateAmount(row, index, $event)"
              />
              <span v-else class="readonly-amount">{{ formatInputNumber(row.amount) }}</span>
            </td>
            <td v-show="isVisible('extra')" class="extra">
              <input
                type="text"
                :value="formatInputNumber(row.extra)"
                class="centered-input"
                lang="en"
                @input="updateExtra(row, index, $event)"
                @blur="updateExtra(row, index, $event)"
              />
            </td>
            <td v-show="isVisible('collector')" class="collector">
              <input
                type="text"
                :value="formatInputNumber(row.collector)"
                class="centered-input"
                lang="en"
                @input="updateCollector(row, index, $event)"
                @blur="updateCollector(row, index, $event)"
              />
            </td>

            <td v-show="isVisible('net')" class="net numeric" :class="getRowNetStatus(row)">
              {{ store.formatNumber((parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0)) ) }}
              <i :class="getRowNetIcon(row)"></i>
            </td>
          </tr>

          <tr class="total-row">
            <td v-show="isVisible('shop')" class="shop">الإجمالي</td>
            <td v-show="isVisible('code')" class="code"></td>
            <td v-show="isVisible('amount')" class="amount text-center">{{ store.formatNumber(store.totals.amount) }}</td>
            <td v-show="isVisible('extra')" class="extra text-center">{{ store.formatNumber(store.totals.extra) }}</td>
            <td v-show="isVisible('collector')" class="collector text-center">{{ store.formatNumber(store.totals.collector) }}</td>
            <td v-show="isVisible('net')" class="net numeric" :class="getTotalNetClass">
              {{ store.formatNumber((parseFloat(store.totals.collector) || 0) - ((parseFloat(store.totals.amount) || 0) + (parseFloat(store.totals.extra) || 0)) ) }}
              <i :class="getTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-container">
      <section id="summary">
        <h2 class="summary-title"><i class="fas fa-file-invoice-dollar summary-title-icon text-primary"></i> ملخص البيان</h2>
        <div class="summary-divider" aria-hidden="true"></div>
        <div class="summary-grid">
          <div class="summary-row two-cols">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-crown text-primary"></i>
                <strong class="mx-2">ليمت الماستر</strong>
              </div>
              <input
                type="text"
                :value="store.masterLimit !== 100000 ? formatInputNumber(store.masterLimit) : ''"
                class="bold-input text-center font-bold"
                lang="en"
                placeholder="ادخل ليمت الماستر"
                @input="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
                @blur="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
              />
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-wallet text-primary"></i>
                <strong class="mx-2">رصيد الماستر الحالي</strong>
              </div>
              <input
                type="text"
                :value="store.currentBalance ? formatInputNumber(store.currentBalance) : ''"
                class="bold-input text-center font-bold"
                lang="en"
                placeholder="ادخل رصيد الماستر الحالي"
                @input="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
                @blur="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
              />
            </div>
          </div>

          <div class="summary-row two-cols">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-undo-alt text-warning"></i>
                <strong class="mx-2">مبلغ التصفيرة</strong>
              </div>
              <div class="calc-field" :class="{ 'text-success': store.resetAmount > 0, 'text-danger': store.resetAmount < 0 }">
                {{ store.formatNumber(store.resetAmount) }}
              </div>
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-coins text-warning"></i>
                <strong class="mx-2">إجمالي المحصل</strong>
              </div>
              <div class="calc-field text-primary">{{ store.formatNumber(store.totals.collector) }}</div>
            </div>
          </div>

          <div class="summary-row full">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-check-circle text-success"></i>
                <strong class="mx-2">حالة التصفيرة</strong>
              </div>
              <div class="calc-field" :style="{ color: store.resetStatus.color, fontSize: '1.3rem', fontWeight: '800' }">
                {{ store.resetStatus.val !== 0 ? store.formatNumber(store.resetStatus.val) : '' }}
                &nbsp;{{ store.resetStatus.text }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="buttons-container">
      <div class="buttons-row">
        <router-link to="/app/dashboard" class="btn btn-dashboard btn-dashboard--home">
          <i class="fas fa-home"></i>
          <span>صفحة الإدخال</span>
        </router-link>

        <router-link to="/app/archive" class="btn btn-dashboard btn-dashboard--archive">
          <i class="fas fa-archive"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>
      </div>

      <div class="buttons-row">
        <button class="btn btn-dashboard btn-dashboard--clear" @click="confirmClearAll">
          <i class="fas fa-broom"></i>
          <span>تفريغ الحقول</span>
        </button>
        <button class="btn btn-dashboard btn-dashboard--archive btn--archive-today" :disabled="store.rows.length === 0" @click="archiveToday">
          <i class="fas fa-folder"></i>
          <span>أرشفة اليوم</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, onActivated, watch, inject, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useArchiveStore } from '@/stores/archiveStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import localforage from 'localforage';
import logger from '@/utils/logger.js';
import { formatInputNumber, getNetClass, getNetIcon } from '@/utils/formatters.js';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';

const store = useHarvestStore();
const archiveStore = useArchiveStore();
const route = useRoute();

const harvestColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 مبلغ التحويل' },
  { key: 'extra', label: '📌 اخرى' }
];

const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(harvestColumns, 'columns.visibility.harvest');

const { confirm, addNotification } = inject('notifications');

onActivated(() => store.initialize && store.initialize());
watch(() => route.name, (newName) => {
  if (newName === 'Harvest') store.initialize && store.initialize();
});

const syncWithCounterStore = () => {
  try {
    const totalCollected = store.totals.collector;
    localStorage.setItem('totalCollected', totalCollected.toString());
    window.dispatchEvent(new CustomEvent('harvestDataUpdated', { detail: { totalCollected } }));
  } catch (error) {
    logger.error('Sync error:', error);
  }
};

onMounted(() => {
  store.initialize && store.initialize();
  loadColumns();
  store.loadDataFromStorage();
  syncWithCounterStore();
  window.addEventListener('focus', syncWithCounterStore);
  onBeforeUnmount(() => window.removeEventListener('focus', syncWithCounterStore));
});

const checkAndAddEmptyRow = (index) => {
  if (index === store.rows.length - 1) {
    store.rows.push({ id: Date.now(), shop: '', code: '', amount: 0, extra: null, collector: null, net: 0, isImported: false });
    store.saveRowsToLocalStorage();
  }
};

const updateShop = (row, index, event) => { row.shop = event.target.value; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };
const updateCode = (row, index, event) => { row.code = event.target.value; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };
const updateAmount = (row, index, event) => { row.amount = parseFloat(event.target.value.replace(/,/g, '')) || 0; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };
const updateExtra = (row, index, event) => { row.extra = parseFloat(event.target.value.replace(/,/g, '')) || null; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };
const updateCollector = (row, index, event) => { row.collector = parseFloat(event.target.value.replace(/,/g, '')) || null; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); syncWithCounterStore(); };

const currentDate = computed(() => new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
const currentDay = computed(() => new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));

const getRowNetStatus = (row) => {
  const net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
  return getNetClass(net);
};
const getRowNetIcon = (row) => {
  const net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
  return getNetIcon(net);
};
const getTotalNetClass = computed(() => {
  const net = (parseFloat(store.totals.collector) || 0) - ((parseFloat(store.totals.amount) || 0) + (parseFloat(store.totals.extra) || 0));
  return getNetClass(net);
});
const getTotalNetIcon = computed(() => {
  const net = (parseFloat(store.totals.collector) || 0) - ((parseFloat(store.totals.amount) || 0) + (parseFloat(store.totals.extra) || 0));
  return getNetIcon(net);
});

const confirmClearAll = async () => {
  const result = await confirm({
    title: 'تأكيد تفريغ الحقول',
    text: 'هل أنت متأكد من مسح جميع البيانات الحالية في الجدول؟ لا يمكن التراجع عن هذه الخطوة.',
    icon: 'warning',
    confirmButtonText: 'نعم، مسح الكل',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#dc3545'
  });

  if (result.isConfirmed) {
    store.clearAll();
    addNotification('تم تفريغ الحقول بنجاح', 'info');
  }
};

const archiveToday = async () => {
  const todayIso = archiveStore.getTodayLocal();
  const existingArchive = await localforage.getItem(`${archiveStore.DB_PREFIX}${todayIso}`);
  const confirmResult = await confirm({
    title: existingArchive ? 'تأكيد استبدال الأرشيف' : 'تأكيد الأرشفة',
    text: existingArchive ? `يوجد أرشيف سابق ليوم ${todayIso}. هل تريد استبداله؟` : 'هل أنت متأكد من أرشفة البيانات الحالية؟',
    icon: 'question',
    confirmButtonText: 'أرشفة',
    confirmButtonColor: 'var(--primary)'
  });
  if (!confirmResult.isConfirmed) return;
  const result = await store.archiveTodayData();
  if (result.success) { addNotification(result.message, 'success'); store.clearAll(); }
  else addNotification(result.message, 'error');
};
</script>

<style scoped>
.mx-2 { margin: 0 8px; }

.customer-count-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px 12px;
  min-width: 80px;
  box-shadow: var(--shadow-sm);
}

.count-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.count-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary);
}

@media (max-width: 768px) {
  .search-control {
    flex-wrap: wrap;
    gap: 10px;
  }
  .customer-count-badge {
    order: 2;
    flex: 1;
  }
  .search-input-wrapper {
    order: 1;
    width: 100%;
  }
  .btn-settings-table {
    order: 3;
  }
}
</style>