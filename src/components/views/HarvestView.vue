<template>
  <div class="harvest-page">
    <PageHeader 
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💰"
    />

    <!-- التاريخ واليوم -->
    <div class="date-display">
      <i class="fas fa-calendar-alt calendar-icon"></i>
      <span class="label">اليووم:</span>
      <span class="value">{{ currentDay }}</span>
      <span class="separator">|</span>
      <span class="label">التاريخ:</span>
      <span class="value">{{ currentDate }}</span>
    </div>

    <!-- إعدادات الأعمدة -->
    <ColumnVisibility
      v-model="showSettings"
      :columns="harvestColumns"
      storage-key="columns.visibility.harvest"
      @save="apply"
    />

    <!-- أدوات التحكم والبحث -->
    <div class="search-control">
      <div class="customer-count-badge" v-show="isVisible('shop')">
        <div class="count-label">عدد العملاء</div>
        <div class="count-value">{{ store.customerCount }}</div>
      </div>
      <div class="search-input-wrapper relative">
        <i class="fas fa-search control-icon pr-2"></i>
        <input
          v-model="searchQueryLocal"
          type="text"
          placeholder="ابحث في المحل أو الكود..."
          class="search-input w-full"
          @input="handleSearchInput"
        />
        <button 
          v-if="searchQueryLocal" 
          class="clear-search-btn" 
          @click="clearSearch"
          type="button"
          title="حذف البحث"
        >
          <i class="fas fa-times-circle"></i>
        </button>
      </div>
      <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showSettings = true">
        <i class="fas fa-cog"></i>
      </button>
    </div>

    <!-- جدول التحصيلات -->
    <div id="harvest-table-container" class="table-wrapper">
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
          <tr v-for="(row, index) in localFilteredRows" :key="row.id">
            <!-- المحل -->
            <td v-show="isVisible('shop')" class="shop no-wrap-cell" :class="{ 'negative-net-border': getRowNetStatus(row) === 'negative' }" :title="row.shop">
              <input v-if="!row.isImported" :value="row.shop" type="text" placeholder="اسم المحل" class="editable-input" @input="updateShop(row, index, $event)" :title="row.shop" />
              <span v-else class="readonly-field" :title="row.shop">{{ row.shop }}</span>
            </td>

            <!-- الكود -->
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

            <!-- التحويل -->
            <td v-show="isVisible('amount')" class="amount">
              <input
                v-if="!row.isImported"
                type="text"
                inputmode="decimal"
                :value="formatInputNumber(row.amount)"
                class="amount-input centered-input"
                lang="en"
                @input="updateAmount(row, index, $event)"
              />
              <span v-else class="readonly-amount">{{ formatInputNumber(row.amount) }}</span>
            </td>

            <!-- اخرى -->
            <td v-show="isVisible('extra')" class="extra">
              <div class="input-with-action">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="formatInputNumber(row.extra)"
                  class="centered-input text-center-important"
                  :class="{ 'negative-extra': (parseFloat(row.extra) || 0) < 0 }"
                  lang="en"
                  @input="updateExtra(row, index, $event)"
                />
                <button class="btn-toggle-sign" @click="toggleSign(row, 'extra')" title="إضافة سالب">-</button>
              </div>
            </td>

            <!-- المحصل -->
            <td v-show="isVisible('collector')" class="collector">
              <input
                type="text"
                inputmode="decimal"
                :value="formatInputNumber(row.collector)"
                class="centered-input"
                lang="en"
                @input="updateCollector(row, index, $event)"
              />
            </td>

            <!-- الصافي -->
            <td v-show="isVisible('net')" class="net numeric" :class="getRowNetStatus(row)">
              {{ store.formatNumber(calculateNet(row)) }}
              <i :class="getRowNetIcon(row)"></i>
            </td>
          </tr>

          <!-- صف الإجماليات -->
          <tr class="total-row" v-if="localFilteredRows.length > 0">
            <td v-show="isVisible('shop')" class="shop">الإجمالي </td>
            <td v-show="isVisible('code')" class="code"></td>
            <td v-show="isVisible('amount')" class="amount text-center">{{ store.formatNumber(filteredTotals.amount) }}</td>
            <td v-show="isVisible('extra')" class="extra text-center">{{ store.formatNumber(filteredTotals.extra) }}</td>
            <td v-show="isVisible('collector')" class="collector text-center">{{ store.formatNumber(filteredTotals.collector) }}</td>
            <td v-show="isVisible('net')" class="net numeric" :class="getFilteredTotalNetClass">
              {{ store.formatNumber(filteredTotalNetValue) }}
              <i :class="getFilteredTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="localFilteredRows.length === 0" class="no-results">
        لا توجد نتائج تطابق بحثك...
      </div>
    </div>

    <!-- أزرار التصدير والمشاركة -->
    <div class="export-container" v-if="localFilteredRows.length > 0">
      <button class="btn-export-share" @click="handleExport" title="مشاركة الجدول كصورة">
        <i class="fas fa-share-alt"></i>
        <span>مشاركة الجدول</span>
      </button>
    </div>

    <!-- ملخص البيان -->
    <div class="summary-container">
      <section id="summary">
        <h2 class="summary-title"><i class="fas fa-file-invoice-dollar summary-title-icon text-primary"></i> ملخص البيان</h2>
        <div class="summary-divider" aria-hidden="true"></div>
        <div class="summary-grid">
          <div class="summary-row two-cols">
            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-crown crown-gold"></i>
                <strong class="mx-2">ليمت الماستر <span class="small-label">( أساسي )</span></strong>
              </div>
              <input
                type="text"
                inputmode="decimal"
                :value="store.masterLimit !== 100000 ? formatInputNumber(store.masterLimit) : ''"
                class="bold-input text-center font-bold master-limit-input"
                lang="en"
                placeholder="ادخل ليمت الماستر"
                @input="handleMoneyInput($event, (val) => store.setMasterLimit(parseFloat(val) || 0), { fieldName: 'ليمت الماستر', maxLimit: 499999 })"
              />
            </div>

            <div class="summary-item">
              <div class="field-header">
                <i class="fas fa-plus-circle text-primary"></i>
                <strong class="mx-2">ليمت اضافى <span class="small-text">(رصيد اضافى كولكتور , شركه )</span></strong>
              </div>
              <input
                type="text"
                inputmode="decimal"
                :value="store.extraLimit ? formatInputNumber(store.extraLimit) : ''"
                class="bold-input text-center font-bold"
                lang="en"
                placeholder="ادخل الليمت الإضافي"
                @input="handleMoneyInput($event, (val) => store.setExtraLimit(parseFloat(val) || 0), { fieldName: 'الليمت الإضافي', maxLimit: 499999 })"
              />
            </div>
          </div>

          <div class="summary-row full">
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
                @input="handleMoneyInput($event, (val) => store.setCurrentBalance(parseFloat(val) || 0), { fieldName: 'رصيد الماستر الحالي' })"
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

    <!-- أزرار التنقل والعمليات -->
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
import { ref, computed, onMounted, onActivated, watch, inject, onBeforeUnmount, onDeactivated } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useArchiveStore } from '@/stores/archiveStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';
import localforage from 'localforage';
import logger from '@/utils/logger.js';
import { formatInputNumber, getNetClass, getNetIcon } from '@/utils/formatters.js';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';
import { exportAndShareTable } from '@/utils/exportUtils.js';
import { handleMoneyInput } from '@/utils/validators.js';

// --- الاستخدامات والتعريفات الأساسية ---
const store = useHarvestStore();
const archiveStore = useArchiveStore();
const route = useRoute();
const { confirm, addNotification } = inject('notifications');

// --- حالة البحث والتحكم في الأعمدة ---
const searchQueryLocal = ref('');
const harvestColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 مبلغ التحويل' },
  { key: 'extra', label: '📌 اخرى' }
];

const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(harvestColumns, 'columns.visibility.harvest');

// --- الخواص المحسوبة (Computed Properties) ---

/**
 * فلترة الصفوف محلياً لضمان سرعة الاستجابة أثناء الكتابة
 */
const localFilteredRows = computed(() => {
  const data = store.rows || [];
  const query = searchQueryLocal.value?.toLowerCase().trim();
  if (!query) return data;

  return data.filter(row => 
    (row.shop && row.shop.toLowerCase().includes(query)) || 
    (row.code && row.code.toString().toLowerCase().includes(query))
  );
});

const currentDate = computed(() => new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
const currentDay = computed(() => new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));

/**
 * حساب إجماليات الصفوف المفلترة فقط
 */
const filteredTotals = computed(() => {
  return localFilteredRows.value.reduce((acc, row) => {
    acc.amount += parseFloat(row.amount) || 0;
    acc.extra += parseFloat(row.extra) || 0;
    acc.collector += parseFloat(row.collector) || 0;
    return acc;
  }, { amount: 0, extra: 0, collector: 0 });
});

// منطق الصافي الموحد
const calculateNet = (row) => {
  const collector = parseFloat(row.collector) || 0;
  const amount = parseFloat(row.amount) || 0;
  const extra = parseFloat(row.extra) || 0;
  return collector - (amount + extra);
};

const filteredTotalNetValue = computed(() => {
  const totals = filteredTotals.value;
  return totals.collector - (totals.amount + totals.extra);
});

// أيقونات وتنسيقات الصافي
const getRowNetStatus = (row) => getNetClass(calculateNet(row));
const getRowNetIcon = (row) => getNetIcon(calculateNet(row));
const getFilteredTotalNetClass = computed(() => getNetClass(filteredTotalNetValue.value));
const getFilteredTotalNetIcon = computed(() => getNetIcon(filteredTotalNetValue.value));

// --- الدوال الأساسية (Methods) ---

const handleSearchInput = (e) => { searchQueryLocal.value = e.target.value; };
const clearSearch = () => { searchQueryLocal.value = ''; };

const syncWithCounterStore = () => {
  try {
    const totalCollected = store.totals.collector;
    localStorage.setItem('totalCollected', totalCollected.toString());
    window.dispatchEvent(new CustomEvent('harvestDataUpdated', { detail: { totalCollected } }));
  } catch (error) {
    logger.error('Sync error:', error);
  }
};

const checkAndAddEmptyRow = (index) => {
  if (searchQueryLocal.value) return; 
  if (index === store.rows.length - 1) store.addRow();
};

// تحديث الحقول مع حفظ البيانات
const updateField = (row, index, field, value, syncCounter = false) => {
  row[field] = value;
  store.saveRowsToStorage();
  checkAndAddEmptyRow(index);
  if (syncCounter) syncWithCounterStore();
};

const updateShop = (row, index, e) => updateField(row, index, 'shop', e.target.value);
const updateCode = (row, index, e) => updateField(row, index, 'code', e.target.value);

const updateAmount = (row, index, e) => {
  handleMoneyInput(e, (val) => updateField(row, index, 'amount', val ? parseFloat(val) : null), { fieldName: 'مبلغ التحويل', maxLimit: 9999 });
};

const updateExtra = (row, index, e) => {
  handleMoneyInput(e, (val) => {
    if (val === '-') row.extra = '-';
    else updateField(row, index, 'extra', (val !== '' && val !== null && !isNaN(parseFloat(val))) ? parseFloat(val) : null);
  }, { allowNegative: true, fieldName: 'المبلغ الإضافي', maxLimit: 9999 });
};

const updateCollector = (row, index, e) => {
  const amountVal = parseFloat(row.amount) || 0;
  const collectorMaxLimit = amountVal + 2999;
  
  handleMoneyInput(e, (val) => updateField(row, index, 'collector', val ? parseFloat(val) : null, true), { 
    fieldName: 'مبلغ المحصل', 
    maxLimit: collectorMaxLimit 
  });
};

const toggleSign = (row, field) => {
  const currentVal = row[field];
  if (!currentVal || currentVal === '') row[field] = '-';
  else if (currentVal === '-') row[field] = null;
  else row[field] = parseFloat(String(currentVal).replace(/,/g, '')) * -1;
  
  store.saveRowsToStorage();
  if (field === 'collector') syncWithCounterStore();
};

// --- عمليات الأرشفة والمسح ---

const confirmClearAll = async () => {
  const result = await confirm({
    title: 'تأكيد تفريغ الحقول',
    text: 'هل أنت متأكد من مسح جميع البيانات الحالية في الجدول؟ لا يمكن التراجع عن هذه الخطوة.',
    icon: 'warning',
    confirmButtonText: 'نعم، مسح الكل',
    confirmButtonColor: '#dc3545'
  });

  if (result.isConfirmed) {
    store.clearAll();
    searchQueryLocal.value = '';
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
  
  store.searchQuery = searchQueryLocal.value; 
  const result = await store.archiveTodayData();
  if (result.success) { 
    addNotification(result.message, 'success'); 
    store.clearAll(); 
    searchQueryLocal.value = ''; 
  } else {
    addNotification(result.message, 'error');
  }
};

const handleExport = async () => {
  addNotification('جاري تجهيز البيانات للمشاركة...', 'info');
  const fileName = searchQueryLocal.value ? `تحصيلات_بحث_${searchQueryLocal.value}` : `تحصيلات_${currentDate.value.replace(/\//g, '-')}`;
  const result = await exportAndShareTable('harvest-table-container', fileName);
  if (result.success && result.message) addNotification(result.message, 'success');
  else if (!result.success) addNotification(result.message, 'error');
};

// --- دورة الحياة (Lifecycle Hooks) ---

onMounted(() => {
  store.initialize?.();
  loadColumns();
  store.loadDataFromStorage();
  syncWithCounterStore();
  searchQueryLocal.value = store.searchQuery || '';
  window.addEventListener('focus', syncWithCounterStore);
});

onActivated(() => {
  store.initialize?.();
  searchQueryLocal.value = store.searchQuery || '';
});

onBeforeUnmount(() => {
  store.searchQuery = searchQueryLocal.value;
  window.removeEventListener('focus', syncWithCounterStore);
});

onDeactivated(() => { store.searchQuery = searchQueryLocal.value; });

watch(() => route.name, (newName) => { if (newName === 'Harvest') store.initialize?.(); });
</script>

<style scoped>
/* تصغير حجم خط عناوين الجدول */
.modern-table thead th {
  font-size: 0.85rem !important;
}

/* منع التفاف النص في عمود المحل والتأكد من عدم التداخل */
.no-wrap-cell {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* التباعد الموحد */
.mx-2 { margin: 0 8px; }

/* ملصقات ونصوص صغيرة */
.small-text {
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.8;
  display: block;
  pointer-events: none;
}

.small-label {
  font-size: 0.7rem;
  font-weight: normal;
  opacity: 0.7;
  margin-right: 4px;
}

/* ليمت الماستر */
.master-limit-input {
  border: 2px solid var(--primary-light) !important;
  background-color: rgba(var(--primary-rgb), 0.05) !important;
}

.crown-gold {
  color: #ffc107;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.2));
}

/* حقل الإدخال مع زر تغيير الإشارة */
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

/* تنسيق المبالغ السالبة في عمود "اخرى" */
.negative-extra {
  color: #ff6b6b !important;
  font-weight: bold;
}

:deep(body.dark) .negative-extra {
  color: #ff8e8e !important;
}

.btn-toggle-sign {
  position: absolute;
  left: 0;
  bottom: 0;
  background: var(--border-color);
  color: var(--primary);
  border: none;
  border-radius: 0 var(--border-radius-sm) 0 0;
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
  transition: var(--transition-fast);
  padding: 0;
  line-height: 0;
}

:deep(body.dark) .btn-toggle-sign {
  background: rgba(255, 255, 255, 0.1);
  color: var(--gray-400);
}

.btn-toggle-sign:hover, .btn-toggle-sign:active {
  opacity: 1;
  background: var(--primary);
  color: white;
}

/* عرض التاريخ */
.date-display {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
  margin-bottom: 25px;
  padding: 15px 20px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(var(--primary-rgb), 0.03));
  border-radius: var(--border-radius-lg);
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

/* شارة عدد العملاء */
.customer-count-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
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

/* أزرار التصدير والمشاركة */
.export-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  margin-bottom: 15px;
  padding: 0 5px;
}

.btn-export-share {
  background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3);
  transition: var(--transition);
}

.btn-export-share:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
}

/* تحسين زر حذف البحث */
.clear-search-btn {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--gray-500);
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  font-size: 1.2rem;
}

.clear-search-btn:hover {
  color: var(--danger);
  transform: translateY(-50%) scale(1.1);
}

.relative { position: relative; }
.w-full { width: 100%; }
.pr-2 { padding-right: 8px; }

/* الميديا كويري للهواتف */
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
  .export-container {
    justify-content: center;
  }
}

/* Sticky Toast Styles */
:deep(.sticky-warning-toast) {
  position: fixed !important;
  top: 10px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 9999 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  border: 1px solid #ffeeba !important;
}
</style>