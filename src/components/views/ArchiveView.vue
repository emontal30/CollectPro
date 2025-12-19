<template>
  <div class="archive-page">
    
    <PageHeader 
      title="الأرشيف" 
      subtitle="عرض واسترجاع بيانات التحصيلات السابقة"
      icon="📄"
    />

    <div class="archive-controls">
      <div class="control-group">
        <label>
          <i class="fas fa-calendar-alt control-icon"></i>
          اختر التاريخ:
          <select v-model="store.selectedDate" class="archive-select" @change="handleDateChange">
            <option value="">-- اختر تاريخ --</option>
            <option 
              v-for="dateItem in store.availableDates" 
              :key="dateItem.value" 
              :value="dateItem.value"
              :style="{ color: dateItem.source === 'cloud' ? '#1e3a8a' : '' }"
            >
              {{ dateItem.value }} {{ dateItem.source === 'cloud' ? '(سحابة)' : '' }}
            </option>
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
        <button class="btn-settings-table" title="إعدادات الأعمدة" @click="showColumnSettings = true">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="modern-table w-full">
        <thead>
          <tr>
            <th class="header-cell date-header">📅 التاريخ</th>
            <th v-if="visibleColumns.shop" class="header-cell shop-header">🏪 المحل</th>
            <th v-if="visibleColumns.code" class="header-cell code-header">🔢 الكود</th>
            <th v-if="visibleColumns.amount" class="header-cell amount-header">💵 التحويل</th>
            <th v-if="visibleColumns.extra" class="header-cell extra-header">📌 اخرى</th>
            <th class="header-cell collector-header">👤 المحصل</th>
            <th class="header-cell net-header">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.isLoading">
            <td :colspan="totalColumns" class="text-center p-20">
              <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
            </td>
          </tr>

          <tr v-for="(row, index) in filteredRows" :key="index">
            <td class="date-cell">{{ store.selectedDate }}</td>
            <td v-if="visibleColumns.shop" class="shop">{{ row.shop }}</td>
            <td v-if="visibleColumns.code" class="code">{{ row.code }}</td>
            <td v-if="visibleColumns.amount" class="amount">{{ store.formatNumber(row.amount) }}</td>
            <td v-if="visibleColumns.extra" class="extra">{{ store.formatNumber(row.extra) }}</td>
            <td class="collector">{{ store.formatNumber(row.collector) }}</td>

            <td class="net numeric" :class="getNetClass(row.net)">
              {{ store.formatNumber(row.net) }}
              <i :class="getNetIcon(row.net)" class="mr-2 text-xs"></i>
            </td>
          </tr>

          <tr v-if="!store.isLoading && filteredRows.length === 0">
            <td :colspan="totalColumns" class="no-data-row">
              {{ store.rows.length === 0 ? 'لا توجد بيانات لهذا التاريخ' : 'لا توجد نتائج مطابقة للبحث' }}
            </td>
          </tr>

          <tr v-if="filteredRows.length > 0" class="total-row">
            <td class="total-label">الإجمالي</td>
            <td v-if="visibleColumns.shop"></td>
            <td v-if="visibleColumns.code"></td>
            <td v-if="visibleColumns.amount" class="amount">{{ store.formatNumber(filteredTotals.amount) }}</td>
            <td v-if="visibleColumns.extra" class="extra">{{ store.formatNumber(filteredTotals.extra) }}</td>
            <td class="collector">{{ store.formatNumber(filteredTotals.collector) }}</td>
            <td class="net numeric" :class="getNetClass(filteredTotals.net)">
              {{ store.formatNumber(filteredTotals.net) }}
              <i :class="getNetIcon(filteredTotals.net)" class="net-icon"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

      <router-link to="/app/harvest" class="btn btn-secondary btn--back-to-harvest">
        <i class="fas fa-arrow-left"></i>
        <span>العودة للتحصيلات</span>
      </router-link>

    <BaseModal
      :show="showColumnSettings"
      title="إعدادات الأعمدة"
      @close="closeColumnSettings"
    >
      <div class="column-settings">
        <div class="column-option" v-for="(label, key) in { shop: '🏪 المحل', code: '🔢 الكود', amount: '💵 مبلغ التحويل', extra: '📌 أخرى' }" :key="key">
          <label>
            <input
              v-model="visibleColumns[key]"
              type="checkbox"
              @change="saveColumnSettings"
            />
            {{ label }}
          </label>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary btn--select-all" @click="selectAllColumns">
          تحديد الكل
        </button>
        <button class="btn btn-primary btn--save-settings" @click="closeColumnSettings">
          حفظ
        </button>
      </template>
    </BaseModal>

    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useArchiveStore } from '@/stores/archiveStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import api from '@/services/api';
import logger from '@/utils/logger.js';

// --- التهيئة ---
const store = useArchiveStore();

// --- الحالة المحلية (Local State) ---
const searchQuery = ref('');
const showColumnSettings = ref(false);
const visibleColumns = ref({
  shop: true,
  code: true,
  amount: true,
  extra: true
});

// --- الخصائص المحسوبة (Computed Properties) ---

// 1. فلترة البيانات محلياً (أداء أسرع)
const filteredRows = computed(() => {
  if (!searchQuery.value) return store.rows;
  const q = searchQuery.value.toLowerCase();
  return store.rows.filter(row => 
    (row.shop && row.shop.toLowerCase().includes(q)) || 
    (row.code && row.code.toString().toLowerCase().includes(q))
  );
});

// 2. إعادة حساب الإجماليات بناءً على الفلترة الحالية
const filteredTotals = computed(() => {
  return filteredRows.value.reduce((acc, row) => {
    acc.amount += Number(row.amount) || 0;
    acc.extra += Number(row.extra) || 0;
    acc.collector += Number(row.collector) || 0;
    acc.net += Number(row.net) || 0;
    return acc;
  }, { amount: 0, extra: 0, collector: 0, net: 0 });
});

// 3. حساب عدد الأعمدة لضبط الجدول (colspan)
const totalColumns = computed(() => {
  let count = 3; // date, collector, net (أعمدة ثابتة)
  if (visibleColumns.value.shop) count++;
  if (visibleColumns.value.code) count++;
  if (visibleColumns.value.amount) count++;
  if (visibleColumns.value.extra) count++;
  return count;
});

// --- إدارة إعدادات الأعمدة ---
const loadColumnSettings = () => {
  const saved = localStorage.getItem('archiveColumnSettings');
  if (saved) {
    visibleColumns.value = { ...visibleColumns.value, ...JSON.parse(saved) };
  }
};

const saveColumnSettings = () => {
  localStorage.setItem('archiveColumnSettings', JSON.stringify(visibleColumns.value));
};

const selectAllColumns = () => {
  visibleColumns.value = { shop: true, code: true, amount: true, extra: true };
  saveColumnSettings();
};

const closeColumnSettings = () => {
  showColumnSettings.value = false;
  saveColumnSettings();
};

// --- دورة حياة المكون (Lifecycle Hooks) ---
let authSubscription = null;

onMounted(async () => {
  // إضافة كلاس لتنسيق الصفحة
  document.body.classList.add('page-has-fixed-width');
  logger.debug('🚀 ArchiveView Mounted');
  
  loadColumnSettings();

  try {
    // تحميل قائمة التواريخ المتاحة (محلي + سحابي)
    await store.loadAvailableDates();
    
    // إذا كان هناك تاريخ محدد مسبقاً، قم بتحميل بياناته
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
    }
  } catch (error) {
    logger.error('❌ Error initializing archive view:', error);
  }

  // الاستماع لتغيرات تسجيل الدخول (لتحديث التواريخ السحابية)
  const res = api.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      logger.info('🔄 Auth changed, reloading archive dates...');
      await store.loadAvailableDates();
      // تحديث البيانات المعروضة إذا لزم الأمر
      if (store.selectedDate) await store.loadArchiveByDate(store.selectedDate);
    } else if (event === 'SIGNED_OUT') {
      store.availableDates = [];
      store.rows = [];
    }
  });
  
  // حفظ الاشتراك لإلغائه لاحقاً
  authSubscription = res?.data?.subscription;
});

onUnmounted(() => {
  document.body.classList.remove('page-has-fixed-width');
  if (authSubscription?.unsubscribe) authSubscription.unsubscribe();
});

// --- التفاعلات (Methods) ---

const handleDateChange = async () => {
  logger.info('📅 Date selection changed:', store.selectedDate);
  searchQuery.value = ""; // تصفير البحث عند تغيير اليوم
  
  if (store.selectedDate) {
    await store.loadArchiveByDate(store.selectedDate);
  } else {
    store.rows = [];
  }
};

// --- دوال التنسيق المساعدة ---
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
.archive-page {
  max-width: 1200px;
  margin: 0 auto;
}

.archive-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.9));
  border-radius: 16px;
  border: 1px solid rgba(0, 121, 101, 0.1);
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}


/* تحسينات للشاشات الصغيرة */
@media (max-width: 640px) {
  .archive-controls {
    padding: 15px;
  }
}
</style>