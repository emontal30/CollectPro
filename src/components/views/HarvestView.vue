<template>
  <div class="harvest-page">
    
    <PageHeader 
      title="التحصيلات" 
      subtitle="إدارة وتتبع جميع تحصيلات العملاء"
      icon="💰"
    />

    <div class="date-display">
      <i class="fas fa-calendar-alt date-icon"></i>
      <span class="date-label">اليوم:</span>
      <span class="date-value">{{ currentDay }}</span>
      <span class="date-separator">|</span>
      <span class="date-label">التاريخ:</span>
      <span class="date-value">{{ currentDate }}</span>
    </div>

    <ColumnVisibility
      v-model="showColumnsHarvest"
      :columns="harvestColumns"
      storage-key="columns.visibility.harvest"
      @save="applySavedColumnsHarvest"
    />

    <div class="search-control">
      <div class="search-input-wrapper">
        <i class="fas fa-search control-icon"></i>
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder=" ...ابحث في المحل أو الكود"
          class="search-input"
        />
      </div>
      <button class="btn-settings-table" title="عرض/اخفاء الأعمدة" @click="showColumnsHarvest = true">
        <i class="fas fa-cog"></i>
      </button>
    </div>

    <div class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
            <th v-show="isVisibleHarvest('shop')" class="shop whitespace-nowrap">🏪 المحل</th>
            <th v-show="isVisibleHarvest('code')" class="code whitespace-nowrap">🔢 الكود</th>
            <th v-show="isVisibleHarvest('amount')" class="amount whitespace-nowrap">💵 التحويل</th>
            <th v-show="isVisibleHarvest('extra')" class="extra whitespace-nowrap">📌 اخرى</th>
            <th v-show="isVisibleHarvest('collector')" class="collector whitespace-nowrap">👤 المحصل</th>
            <th v-show="isVisibleHarvest('net')" class="net highlight whitespace-nowrap">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in store.filteredRows" :key="row.id">
            <td v-show="isVisibleHarvest('shop')" class="shop" :class="{ 'negative-net-border': getNetClass(row) === 'negative' }">
              <input v-if="!row.isImported" :value="row.shop" type="text" placeholder="اسم المحل" class="editable-input" @input="updateShop(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.shop }}</span>
            </td>
            <td v-show="isVisibleHarvest('code')" class="code">
              <input v-if="!row.isImported" :value="row.code" type="text" placeholder="الكود" class="editable-input" @input="updateCode(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.code }}</span>
            </td>
            <td v-show="isVisibleHarvest('amount')" class="amount">
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
            <td v-show="isVisibleHarvest('extra')" class="extra">
              <input
                type="text"
                :value="formatInputNumber(row.extra)"
                class="centered-input"
                lang="en"
                @input="updateExtra(row, index, $event)"
                @blur="updateExtra(row, index, $event)"
              />
            </td>
            <td v-show="isVisibleHarvest('collector')" class="collector">
              <input
                type="text"
                :value="formatInputNumber(row.collector)"
                class="centered-input"
                lang="en"
                @input="updateCollector(row, index, $event)"
                @blur="updateCollector(row, index, $event)"
              />
            </td>

            <td v-show="isVisibleHarvest('net')" class="net numeric centered-text" :class="getNetClass(row)">
              {{ store.formatNumber((parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0)) ) }}
              <i :class="getNetIcon(row)"></i>
            </td>
          </tr>

          <tr class="total-row">
            <td v-show="isVisibleHarvest('shop')" class="shop">الإجمالي</td>
            <td v-show="isVisibleHarvest('code')" class="code"></td>
            <td v-show="isVisibleHarvest('amount')" class="amount centered-text">{{ store.formatNumber(store.totals.amount) }}</td>
            <td v-show="isVisibleHarvest('extra')" class="extra centered-text">{{ store.formatNumber(store.totals.extra) }}</td>
            <td v-show="isVisibleHarvest('collector')" class="collector centered-text">{{ store.formatNumber(store.totals.collector) }}</td>
            <td v-show="isVisibleHarvest('net')" class="net numeric centered-text" :class="getTotalNetClass">
              {{ store.formatNumber((parseFloat(store.totals.collector) || 0) - ((parseFloat(store.totals.amount) || 0) + (parseFloat(store.totals.extra) || 0)) ) }}
              <i :class="getTotalNetIcon"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-container">
      <section id="summary">
        <h2 class="summary-title"><i class="fas fa-file-invoice-dollar summary-title-icon"></i> ملخص البيان</h2>
        <div class="summary-divider" aria-hidden="true"></div>
        <div class="summary-grid">
          <div class="summary-row two-cols">
            <div class="summary-item master-limit-field">
              <div class="field-header">
                <i class="fas fa-crown field-icon master-icon"></i>
                <strong>ليمت الماستر</strong>
              </div>
              <input
                type="text"
                :value="store.masterLimit !== 100000 ? formatInputNumber(store.masterLimit) : ''"
                class="bold-input"
                lang="en"
                placeholder="ادخل ليمت الماستر"
                @input="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
                @blur="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
              />
            </div>

            <div class="summary-item current-balance-field">
              <div class="field-header">
                <i class="fas fa-wallet field-icon balance-icon"></i>
                <strong>رصيد الماستر الحالي</strong>
              </div>
              <input
                type="text"
                :value="store.currentBalance ? formatInputNumber(store.currentBalance) : ''"
                class="bold-input"
                lang="en"
                placeholder="ادخل رصيد الماستر الحالي"
                @input="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
                @blur="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
              />
            </div>
          </div>

          <div class="summary-row two-cols">
            <div class="summary-item reset-amount-field">
              <div class="field-header">
                <i class="fas fa-undo-alt field-icon reset-icon"></i>
                <strong>مبلغ التصفيرة</strong>
              </div>
              <div class="summary-value calc-field" :class="{ 'positive': store.resetAmount > 0, 'negative': store.resetAmount < 0 }">
                {{ store.formatNumber(store.resetAmount) }}
              </div>
            </div>

            <div class="summary-item total-collected-field">
              <div class="field-header">
                <i class="fas fa-coins field-icon coins-icon"></i>
                <strong>إجمالي المحصل</strong>
              </div>
              <div class="summary-value calc-field">{{ store.formatNumber(store.totals.collector) }}</div>
            </div>
          </div>

          <div class="summary-row full">
            <div class="summary-item reset-status-field full-width">
              <div class="field-header">
                <i class="fas fa-check-circle field-icon status-icon"></i>
                <strong>حالة التصفيرة</strong>
              </div>
              <div class="summary-value calc-field" :style="{ color: store.resetStatus.color }">
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

        <router-link id="goToArchiveBtn" to="/app/archive" class="btn btn-dashboard btn-dashboard--archive">
          <i class="fas fa-archive"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>
      </div>

      <div class="buttons-row">
        <button class="btn btn-dashboard btn-dashboard--clear" @click="store.clearFields">
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
import { computed, onMounted, onActivated, watch, inject, ref, reactive, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useCounterStore } from '@/stores/counterStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import logger from '@/utils/logger.js'
import ColumnVisibility from '@/components/ui/ColumnVisibility.vue';

const store = useHarvestStore();
const route = useRoute();
const counterStore = useCounterStore();

// Columns config for harvest page
const harvestColumns = [
  { key: 'shop', label: '🏪 المحل' },
  { key: 'code', label: '🔢 الكود' },
  { key: 'amount', label: '💵 مبلغ التحويل' },
  { key: 'extra', label: '📌 اخرى' }
];

const showColumnsHarvest = ref(false);
const columnsVisibilityHarvest = reactive({});

function loadColumnsVisibilityHarvest(){
  const raw = localStorage.getItem('columns.visibility.harvest');
  const saved = raw ? JSON.parse(raw) : null;
  harvestColumns.forEach(c => { columnsVisibilityHarvest[c.key] = saved && typeof saved[c.key] === 'boolean' ? saved[c.key] : true; });
}

function isVisibleHarvest(key){ return columnsVisibilityHarvest[key] !== false; }

function applySavedColumnsHarvest(obj){ Object.keys(obj || {}).forEach(k => { columnsVisibilityHarvest[k] = !!obj[k]; }); }

// نظام الإشعارات الموحد
const { confirm, success, error, messages, addNotification } = inject('notifications');

// Initialize the store when the view mounts or becomes active
// (Initialization is consolidated into the main onMounted below)

onActivated(() => {
  logger.debug('Harvest view activated — initializing store');
  store.initialize && store.initialize();
});

// Watch route changes to re-initialize when navigating to Harvest
watch(() => route.name, (newName) => {
  if (newName === 'Harvest') {
    logger.debug('Route changed to Harvest — initialize store');
    store.initialize && store.initialize();
  }
});

// مزامنة إجمالي المحصل مع صفحة عداد الأموال عند تحميل الصفحة وعند التركيز
const syncWithCounterStore = () => {
  try {
    const totalCollected = store.totals.collector;
    localStorage.setItem('totalCollected', totalCollected.toString());
    
    // إشعار counter store بالتحديث
    window.dispatchEvent(new CustomEvent('harvestDataUpdated', { 
      detail: { totalCollected } 
    }));
    
    logger.info('🔄 تم مزامنة إجمالي المحصل مع صفحة عداد الأموال:', totalCollected);
  } catch (error) {
    logger.error('❌ خطأ في مزامنة إجمالي المحصل:', error);
  }
};

onMounted(() => {
  // محاولة تحميل بيانات جديدة عند فتح الصفحة (بدون إشعارات)
  store.initialize && store.initialize();
  try { loadColumnsVisibilityHarvest(); } catch (e) { logger.debug('no saved harvest columns'); }

  const dataLoaded = store.loadDataFromStorage();
  if (dataLoaded) {
    logger.info('✅ تم تحميل البيانات من صفحة الإدخال');
  }

  // مزامنة إجمالي المحصل مع صفحة عداد الأموال
  syncWithCounterStore();

  // مراقبة عودة التركيز للصفحة
  const handleFocus = () => {
    syncWithCounterStore();
  };

  window.addEventListener('focus', handleFocus);

  // تنظيف المراجع عند إلغاء تحميل المكوّن
  onBeforeUnmount(() => {
    window.removeEventListener('focus', handleFocus);
  });
});

// Check and add empty row if last row has data
const checkAndAddEmptyRow = (index) => {
  // Always ensure there's at least one empty row at the end
  if (index === store.rows.length - 1) {
    store.rows.push({
      id: Date.now(),
      shop: '',
      code: '',
      amount: 0,
      extra: null,
      collector: null,
      net: 0,
      isImported: false
    });
    store.saveRowsToLocalStorage();
  }
};

// Update shop and save
const updateShop = (row, index, event) => {
   row.shop = event.target.value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
};

// Update code and save
const updateCode = (row, index, event) => {
   row.code = event.target.value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
};

// Update amount and save
const updateAmount = (row, index, event) => {
   const value = parseFloat(event.target.value.replace(/,/g, '')) || 0;
   row.amount = value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
};

// Update extra and save
const updateExtra = (row, index, event) => {
   const rawValue = event.target.value.replace(/,/g, '');
   const value = rawValue === '' ? null : parseFloat(rawValue) || 0;
   row.extra = value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
};

// Update collector and save
const updateCollector = (row, index, event) => {
   const rawValue = event.target.value.replace(/,/g, '');
   const value = rawValue === '' ? null : parseFloat(rawValue) || 0;
   row.collector = value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
   
   // مزامنة فورية مع صفحة عداد الأموال
   setTimeout(() => {
     syncWithCounterStore();
   }, 50);
};

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
   if (num === 0) return '' // Show empty string for zero values
   return new Intl.NumberFormat('en-US', {
     minimumFractionDigits: 0,
     maximumFractionDigits: 2
   }).format(num);
};

const getNetClass = (row) => {
  if (!row) {
    // Development-only error logging
    if (import.meta.env.DEV) {
      console.error('getNetClass called with undefined row');
    }
    return 'zero';
  }
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
  const todayStr = new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");

  // رسالة تأكيد باستخدام النظام الموحد
  const confirmResult = await confirm({
    title: localArchive[todayStr] ? 'تأكيد استبدال الأرشيف' : 'تأكيد الأرشفة',
    text: localArchive[todayStr]
      ? `توجد أرشيف سابق ليوم ${todayStr}. هل تريد استبداله بالبيانات الحالية؟`
      : 'هل أنت متأكد من أرشفة البيانات الحالية؟',
    icon: 'question',
    confirmButtonText: 'أرشفة',
    confirmButtonColor: 'var(--primary, #007965)'
  });

  if (!confirmResult.isConfirmed) return;

  try {
    const result = await store.archiveTodayData();

    if (result.success) {
      addNotification(result.message, 'success');
      // تصفير الحقول بعد الأرشفة الناجحة
      store.clearFields();
    } else {
      addNotification(result.message || 'فشل في الأرشفة', 'error');
    }
  } catch (error) {
    logger.error('Archive error:', error);
    addNotification('حدث خطأ غير متوقع أثناء الأرشفة', 'error', {
      suggestion: 'تأكد من وجود بيانات صحيحة وحاول مرة أخرى'
    });
  }
};
</script>
<style scoped>
.harvest-page { 
  max-width: 800px; 
}

.date-display {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, rgba(0, 121, 101, 0.1), rgba(0, 121, 101, 0.05));
  border-radius: 12px;
  border: 1px solid rgba(0, 121, 101, 0.2);
}

.date-value {
  font-weight: 700;
  color: var(--primary);
  font-size: 1.1rem;
}

.summary-container {
  margin: 30px 0;
  padding: 22px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  border: 1px solid rgba(0, 121, 101, 0.08);
}

.summary-title {
  text-align: center;
  font-size: 1.15rem;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--gray-900);
}

.summary-title-icon {
  font-size: 1.6rem;
  color: var(--primary);
}

.summary-divider {
  display: block;
  width: 85%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(0, 121, 101, 0.22), transparent);
  border: none;
  margin: 10px auto 18px;
  border-radius: 3px;
}

.summary-grid { display: block; }

.summary-row { margin-bottom: 12px; }

.summary-row.two-cols {
  display: flex;
  gap: 12px;
}

.summary-row.full { display: block; }

.summary-item {
  flex: 1 1 0;
  min-width: 180px;
  text-align: center;
  padding: 14px;
  background: linear-gradient(45deg, rgba(0,121,101,0.03), rgba(243,156,18,0.03));
  border-radius: 10px;
  border: 1px solid rgba(0,121,101,0.08);
}

.summary-item.full-width { width: 100%; }

.field-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  text-align: center;
}

.field-icon { font-size: 1.05rem; opacity: 0.95; }
.master-icon { color: var(--primary); }
.balance-icon { color: #0ea5a4; }
.reset-icon { color: #f59e0b; }
.coins-icon { color: #fbbf24; }
.status-icon { color: #10b981; }

.bold-input {
  width: 100%;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 0.95rem;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.07);
  background: transparent;
  text-align: center;
}

.calc-field { font-size: 1.35rem; font-weight: 800; color: var(--gray-900); text-align: center; }

/* Reduce size for reset amount and total collected by one step */
.reset-amount-field .calc-field,
.total-collected-field .calc-field {
  font-size: 1.15rem;
}

/* small screens: stack */
@media (max-width: 640px) {
  .summary-row.two-cols { flex-direction: column; }
  .summary-item { width: 100%; }
  .summary-title { font-size: 1rem; }
}
</style>