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

    <div class="search-container">
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder=" ...ابحث في المحل أو الكود"
          class="search-input"
        />
      </div>
    </div>

    <div class="table-wrap w-full">
      <table class="collections-table w-full">
        <thead>
          <tr>
            <th class="shop whitespace-nowrap">🏪 المحل</th>
            <th class="code whitespace-nowrap">🔢 الكود</th>
            <th class="amount whitespace-nowrap">💵 مبلغ التحويل</th>
            <th class="extra whitespace-nowrap">📌 اخرى</th>
            <th class="collector whitespace-nowrap">👤 المحصل</th>
            <th class="net highlight whitespace-nowrap">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in store.filteredRows" :key="row.id">
            <td class="shop" :class="{ 'negative-net': (row.collector - (row.amount + row.extra)) < 0 }">
              <input v-if="!row.isImported" :value="row.shop" type="text" placeholder="اسم المحل" class="editable-input" @input="updateShop(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.shop }}</span>
            </td>
            <td class="code" :class="{ 'negative-net': (row.collector - (row.amount + row.extra)) < 0 }">
              <input v-if="!row.isImported" :value="row.code" type="text" placeholder="الكود" class="editable-input" @input="updateCode(row, index, $event)" />
              <span v-else class="readonly-field">{{ row.code }}</span>
            </td>
            <td class="amount">
              <input
                v-if="!row.isImported"
                type="text"
                :value="formatInputNumber(row.amount)"
                class="amount-input centered-input"
                lang="en"
                style="text-align: center; direction: ltr;"
                @input="updateAmount(row, index, $event)"
                @blur="updateAmount(row, index, $event)"
              />
              <span v-else class="readonly-amount">{{ formatInputNumber(row.amount) }}</span>
            </td>
            <td class="extra">
              <input
                type="text"
                :value="formatInputNumber(row.extra)"
                class="centered-input"
                lang="en"
                style="text-align: center; direction: ltr;"
                @input="updateExtra(row, index, $event)"
                @blur="updateExtra(row, index, $event)"
              />
            </td>
            <td class="collector">
              <input
                type="text"
                :value="formatInputNumber(row.collector)"
                class="centered-input"
                lang="en"
                style="text-align: center; direction: ltr;"
                @input="updateCollector(row, index, $event)"
                @blur="updateCollector(row, index, $event)"
              />
            </td>
            
            <td class="net numeric centered-text" :class="getNetClass(row)">
              {{ store.formatNumber((parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0)) ) }}
              <i :class="getNetIcon(row)"></i>
            </td>
          </tr>

          <tr id="totalRow" class="total-row summary-row">
            <td class="shop">الإجمالي</td>
            <td class="code"></td>
            <td class="amount centered-text">{{ store.formatNumber(store.totals.amount) }}</td>
            <td class="extra centered-text">{{ store.formatNumber(store.totals.extra) }}</td>
            <td class="collector centered-text">{{ store.formatNumber(store.totals.collector) }}</td>
            <td class="net numeric centered-text" :class="getTotalNetClass">
              {{ store.formatNumber((parseFloat(store.totals.collector) || 0) - ((parseFloat(store.totals.amount) || 0) + (parseFloat(store.totals.extra) || 0)) ) }}
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
                <strong>ليمت الماستر:</strong>
              </div>
              <input
                type="text"
                :value="store.masterLimit !== 100000 ? formatInputNumber(store.masterLimit) : ''"
                class="bold-input"
                lang="en"
                style="text-align: center; direction: ltr;"
                placeholder="ادخل ليمت الماستر"
                @input="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
                @blur="store.setMasterLimit(parseFloat($event.target.value.replace(/,/g, '')) || 100000)"
              />
            </label>
            <label class="current-balance-field">
              <div class="field-header">
                <i class="fas fa-wallet field-icon"></i>
                <strong>رصيد الماستر الحالي:</strong>
              </div>
              <input
                type="text"
                :value="store.currentBalance ? formatInputNumber(store.currentBalance) : ''"
                class="bold-input"
                lang="en"
                style="text-align: center; direction: ltr;"
                placeholder="ادخل رصيد الماستر الحالي"
                @input="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
                @blur="store.setCurrentBalance(parseFloat($event.target.value.replace(/,/g, '')) || 0)"
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
              <strong>حالة التصفيرة:</strong>
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
      <div class="buttons-row">
        <router-link to="/app/dashboard" class="btn">
          <i class="fas fa-home" style="color: #90EE90"></i>
          <span>صفحة الإدخال</span>
        </router-link>

        <router-link to="/app/archive" class="btn">
          <i class="fas fa-archive" style="color: #D3D3D3"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>
      </div>

      <div class="buttons-row">
        <button id="clearHarvestBtn" class="btn" @click="store.clearFields">
          <i class="fas fa-broom" style="color: #DC143C"></i>
          <span>تفريغ الحقول</span>
        </button>

        <button id="archiveTodayBtn" class="btn" :disabled="store.rows.length === 0" @click="archiveToday">
          <i class="fas fa-box-archive" style="color: #FFA500"></i>
          <span>أرشفة اليوم</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, onActivated, watch, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useCounterStore } from '@/stores/counterStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import '@/assets/css/_unified-components.css';

const store = useHarvestStore();
const route = useRoute();
const counterStore = useCounterStore();

// نظام الإشعارات الموحد
const { confirm, success, error, messages, addNotification } = inject('notifications');

// Initialize the store when the view mounts or becomes active
onMounted(() => {
  store.initialize && store.initialize();
});

onActivated(() => {
  console.log('Harvest view activated — initializing store');
  store.initialize && store.initialize();
});

// Watch route changes to re-initialize when navigating to Harvest
watch(() => route.name, (newName) => {
  if (newName === 'Harvest') {
    console.log('Route changed to Harvest — initialize store');
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
    
    console.log('🔄 تم مزامنة إجمالي المحصل مع صفحة عداد الأموال:', totalCollected);
  } catch (error) {
    console.error('❌ خطأ في مزامنة إجمالي المحصل:', error);
  }
};

onMounted(() => {
  // محاولة تحميل بيانات جديدة عند فتح الصفحة (بدون إشعارات)
  const dataLoaded = store.loadDataFromStorage();
  if (dataLoaded) {
    console.log('✅ تم تحميل البيانات من صفحة الإدخال');
  }
  
  // مزامنة إجمالي المحصل مع صفحة عداد الأموال
  syncWithCounterStore();
  
  // مراقبة عودة التركيز للصفحة
  const handleFocus = () => {
    syncWithCounterStore();
  };
  
  window.addEventListener('focus', handleFocus);
  
  // تنظيف المراجع عند إلغاء تحميل الصفحة
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', handleFocus);
  });
});

// Check and add empty row if last row has data
const checkAndAddEmptyRow = (index) => {
   if (index === store.rows.length - 1) {
     const lastRow = store.rows[index];
     if (lastRow.shop || lastRow.code || lastRow.amount || lastRow.extra || lastRow.collector) {
       store.rows.push({
         id: Date.now(),
         shop: '',
         code: '',
         amount: 0,
         extra: 0,
         collector: 0,
         net: 0,
         isImported: false
       });
       store.saveRowsToLocalStorage();
     }
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
   const value = parseFloat(event.target.value.replace(/,/g, '')) || 0;
   row.extra = value;
   row.net = (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0));
   store.saveRowsToLocalStorage();
   checkAndAddEmptyRow(index);
};

// Update collector and save
const updateCollector = (row, index, event) => {
   const value = parseFloat(event.target.value.replace(/,/g, '')) || 0;
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
    confirmButtonColor: '#007965'
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
    console.error('Archive error:', error);
    addNotification('حدث خطأ غير متوقع أثناء الأرشفة', 'error', {
      suggestion: 'تأكد من وجود بيانات صحيحة وحاول مرة أخرى'
    });
  }
};
</script>

<style scoped>
/* All styles imported from _unified-components.css */

/* Center the "✅ الصافي" header */
th.net {
  text-align: center;
}

/* تنسيق صفوف الأزرار */
.buttons-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}

.buttons-row:last-child {
  margin-bottom: 0;
}
</style>