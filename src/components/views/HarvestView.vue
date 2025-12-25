<template>
  <div class="harvest-page">
    
    <PageHeader 
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💰"
    />

    <div class="date-display">
      <i class="fas fa-calendar-alt calendar-icon"></i>
      <span class="label">اليوم:</span>
      <span class="value">{{ currentDay }}</span>
      <span class="separator">|</span>
      <span class="label">التاريخ:</span>
      <span class="value">{{ currentDate }}</span>
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
          placeholder="ابحث في المحل أو الكود..."
          class="search-input"
          @input="handleSearch"
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
              <input 
                v-if="!row.isImported"
                :value="row.code" 
                type="text" 
                inputmode="decimal"
                placeholder="الكود" 
                class="editable-input" 
                @input="updateCode(row, index, $event)" 
              />
              <span v-else class="readonly-field">{{ row.code }}</span>
            </td>
            <td v-show="isVisible('amount')" class="amount">
              <input
                v-if="!row.isImported"
                type="text"
                inputmode="decimal"
                :value="formatInputNumber(row.amount)"
                class="amount-input centered-input"
                lang="en"
                @input="updateAmount(row, index, $event)"
                @blur="updateAmount(row, index, $event)"
              />
              <span v-else class="readonly-amount">{{ formatInputNumber(row.amount) }}</span>
            </td>
            <td v-show="isVisible('extra')" class="extra">
              <div class="input-with-action">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="formatInputNumber(row.extra)"
                  class="centered-input text-center-important"
                  lang="en"
                  @input="updateExtra(row, index, $event)"
                  @blur="updateExtra(row, index, $event)"
                />
                <button class="btn-toggle-sign" @click="toggleSign(row, 'extra')" title="إضافة سالب">-</button>
              </div>
            </td>
            <td v-show="isVisible('collector')" class="collector">
              <input
                type="text"
                inputmode="decimal"
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

          <!-- صف الإجماليات -->
          <tr class="total-row" v-if="store.filteredRows.length > 0">
            <td v-show="isVisible('shop')" class="shop">الإجمالي (المصفى)</td>
            <td v-show="isVisible('code')" class="code"></td>
            <td v-show="isVisible('amount')" class="amount text-center">{{ store.formatNumber(filteredTotals.amount) }}</td>
            <td v-show="isVisible('extra')" class="extra text-center">{{ store.formatNumber(filteredTotals.extra) }}</td>
            <td v-show="isVisible('collector')" class="collector text-center">{{ store.formatNumber(filteredTotals.collector) }}</td>
            <td v-show="isVisible('net')" class="net numeric" :class="getFilteredTotalNetClass">
              {{ store.formatNumber((parseFloat(filteredTotals.collector) || 0) - ((parseFloat(filteredTotals.amount) || 0) + (parseFloat(filteredTotals.extra) || 0)) ) }}
              <i :class="getFilteredTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="store.filteredRows.length === 0" class="no-results">
        لا توجد نتائج تطابق بحثك...
      </div>
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
                inputmode="decimal"
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
                inputmode="decimal"
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
  if (store.searchQuery) return; 
  
  if (index === store.rows.length - 1) {
    store.rows.push({ id: Date.now(), shop: '', code: '', amount: 0, extra: null, collector: null, net: 0, isImported: false });
    store.saveRowsToLocalStorage();
  }
};

const handleSearch = () => {};

const updateShop = (row, index, event) => { row.shop = event.target.value; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };
const updateCode = (row, index, event) => { row.code = event.target.value; store.saveRowsToLocalStorage(); checkAndAddEmptyRow(index); };

// دالة لتبديل الإشارة (موجب/سالب)
const toggleSign = (row, field) => {
  const currentVal = row[field];
  if (currentVal === null || currentVal === undefined || currentVal === '') {
    row[field] = '-';
  } else if (currentVal === '-') {
    row[field] = null;
  } else {
    row[field] = parseFloat(String(currentVal).replace(/,/g, '')) * -1;
  }
  store.saveRowsToLocalStorage();
  if (field === 'collector') syncWithCounterStore();
};

// دالة محسنة للتعامل مع الإدخال الرقمي بما في ذلك علامة السالب
const handleNumericInput = (event, row, field) => {
  const val = event.target.value;
  // إذا كان المستخدم يكتب علامة سالب فقط، لا تحولها لرقم الآن
  if (val === '-') {
    row[field] = '-';
    return;
  }
  const parsed = parseFloat(val.replace(/,/g, ''));
  row[field] = isNaN(parsed) ? null : parsed;
};

const updateAmount = (row, index, event) => { 
  handleNumericInput(event, row, 'amount');
  store.saveRowsToLocalStorage(); 
  checkAndAddEmptyRow(index); 
};
const updateExtra = (row, index, event) => { 
  handleNumericInput(event, row, 'extra');
  store.saveRowsToLocalStorage(); 
  checkAndAddEmptyRow(index); 
};
const updateCollector = (row, index, event) => { 
  handleNumericInput(event, row, 'collector');
  store.saveRowsToLocalStorage(); 
  checkAndAddEmptyRow(index); 
  syncWithCounterStore(); 
};

const currentDate = computed(() => new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
const currentDay = computed(() => new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));

const filteredTotals = computed(() => {
  return store.filteredRows.reduce((acc, row) => {
    acc.amount += parseFloat(row.amount) || 0;
    acc.extra += parseFloat(row.extra) || 0;
    acc.collector += parseFloat(row.collector) || 0;
    return acc;
  }, { amount: 0, extra: 0, collector: 0 });
});

const getRowNetStatus = (row) => {
  const net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
  return getNetClass(net);
};
const getRowNetIcon = (row) => {
  const net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
  return getNetIcon(net);
};

const getFilteredTotalNetClass = computed(() => {
  const net = (parseFloat(filteredTotals.value.collector) || 0) - ((parseFloat(filteredTotals.value.amount) || 0) + (parseFloat(filteredTotals.value.extra) || 0));
  return getNetClass(net);
});
const getFilteredTotalNetIcon = computed(() => {
  const net = (parseFloat(filteredTotals.value.collector) || 0) - ((parseFloat(filteredTotals.value.amount) || 0) + (parseFloat(filteredTotals.value.extra) || 0));
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

/* Input with Notch Sign Action */
.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.text-center-important {
  text-align: center !important;
}

.btn-toggle-sign {
  position: absolute;
  left: 0;
  bottom: 0;
  background: var(--border-color);
  color: var(--primary);
  border: none;
  border-radius: 0 var(--border-radius-sm) 0 0; /* شكل نوتش في الزاوية */
  width: 20px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  cursor: pointer;
  z-index: 5;
  opacity: 0.5;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 0;
}

/* الوضع الليلي لزر النوتش */
:deep(body.dark) .btn-toggle-sign {
  background: rgba(255, 255, 255, 0.1);
  color: var(--gray-400);
}

.btn-toggle-sign:hover, .btn-toggle-sign:active {
  opacity: 1;
  background: var(--primary);
  color: white;
}

/* Date Display Styling - Unified */
.date-display {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
  margin-bottom: 25px;
  padding: 15px 20px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(var(--primary-rgb), 0.03));
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.calendar-icon {
  color: var(--primary);
  font-size: 1.1rem;
}

.date-display .label {
  font-weight: 700;
  color: var(--text-muted);
}

.date-display .value {
  color: var(--primary);
  font-weight: 800;
}

.date-display .separator {
  color: var(--gray-400);
  font-weight: 300;
}

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

.no-results {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-style: italic;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
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