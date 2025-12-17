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
            <option v-for="date in store.availableDates" :key="date" :value="date">
              {{ date }}
            </option>
          </select>
        </label>
      </div>

      <div class="search-control">
        <div class="search-input-wrapper">
          <i class="fas fa-search control-icon"></i>
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="ابحث في المحل أو الكود"
            class="search-input"
            @input="handleSearch"
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

          <tr v-for="(row, index) in store.rows" :key="index">
            <td class="date-cell">{{ row.date }}</td>
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

          <tr v-if="!store.isLoading && store.rows.length === 0">
            <td :colspan="totalColumns" class="no-data-row">لا توجد بيانات لعرضها</td>
          </tr>

          <tr v-if="store.rows.length > 0" class="total-row">
            <td class="total-label">الإجمالي</td>
            <td v-if="visibleColumns.shop"></td>
            <td v-if="visibleColumns.code"></td>
            <td v-if="visibleColumns.amount" class="amount">{{ store.formatNumber(store.totals.amount) }}</td>
            <td v-if="visibleColumns.extra" class="extra">{{ store.formatNumber(store.totals.extra) }}</td>
            <td class="collector">{{ store.formatNumber(store.totals.collector) }}</td>
            <td class="net numeric" :class="getNetClass(store.totals.net)">
              {{ store.formatNumber(store.totals.net) }}
              <i :class="getNetIcon(store.totals.net)" class="net-icon"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="buttons">
      <router-link to="/app/harvest" class="btn btn--back-to-harvest">
        <i class="fas fa-arrow-left"></i>
        <span>العودة للتحصيلات</span>
      </router-link>

      <button
        class="btn btn--delete-archive"
        :disabled="!store.selectedDate"
        @click="store.deleteCurrentArchive"
      >
        <i class="fas fa-trash-alt"></i>
        <span>حذف الأرشيف الحالي</span>
      </button>
    </div>

    <!-- Modal إعدادات الأعمدة -->
    <BaseModal
      :show="showColumnSettings"
      title="إعدادات الأعمدة"
      @close="closeColumnSettings"
    >
      <div class="column-settings">
        <div class="column-option">
          <label>
            <input
              v-model="visibleColumns.shop"
              type="checkbox"
              @change="saveColumnSettings"
            />
            🏪 المحل
          </label>
        </div>
        <div class="column-option">
          <label>
            <input
              v-model="visibleColumns.code"
              type="checkbox"
              @change="saveColumnSettings"
            />
            🔢 الكود
          </label>
        </div>
        <div class="column-option">
          <label>
            <input
              v-model="visibleColumns.amount"
              type="checkbox"
              @change="saveColumnSettings"
            />
            💵 مبلغ التحويل
          </label>
        </div>
        <div class="column-option">
          <label>
            <input
              v-model="visibleColumns.extra"
              type="checkbox"
              @change="saveColumnSettings"
            />
            📌 أخرى
          </label>
        </div>
      </div>

      <template #footer>
        <button class="btn btn--select-all" @click="selectAllColumns">
          تحديد الكل
        </button>
        <button class="btn btn--save-settings" @click="closeColumnSettings">
          حفظ
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, onActivated, watch, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useArchiveStore } from '@/stores/archiveStore';
import debounce from 'lodash/debounce'; // استخدام من مكتبة lodash أو إكتب دالة debounce يدوياً
import PageHeader from '@/components/layout/PageHeader.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import api from '@/services/api';
import logger from '@/utils/logger.js'

const store = useArchiveStore();
const route = useRoute();

// إعدادات الأعمدة
const showColumnSettings = ref(false);
const visibleColumns = ref({
  shop: true,
  code: true,
  amount: true,
  extra: true
});

// تحميل إعدادات الأعمدة من localStorage
const loadColumnSettings = () => {
  const saved = localStorage.getItem('archiveColumnSettings');
  if (saved) {
    visibleColumns.value = { ...visibleColumns.value, ...JSON.parse(saved) };
  }
};

// حفظ إعدادات الأعمدة في localStorage
const saveColumnSettings = () => {
  localStorage.setItem('archiveColumnSettings', JSON.stringify(visibleColumns.value));
};

// تحديد الكل
const selectAllColumns = () => {
  visibleColumns.value = {
    shop: true,
    code: true,
    amount: true,
    extra: true
  };
  saveColumnSettings();
};

// إغلاق الmodal وحفظ
const closeColumnSettings = () => {
  showColumnSettings.value = false;
  saveColumnSettings();
};

onActivated(async () => {
  logger.debug('Archive view activated — reloading available dates');
  try {
    await store.loadAvailableDates();
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
    }
  } catch (err) {
    logger.error('Error reloading archive on activate:', err);
  }
});

// Watch route changes to reload when navigated to
watch(() => route.name, (newName) => {
  if (newName === 'Archive') {
    logger.debug('Route changed to Archive — reloading dates');
    store.loadAvailableDates().catch(err => logger.error('Error loading dates on route change:', err));
  }
});

let authSubscription = null;

onMounted(async () => {
  document.body.classList.add('page-has-fixed-width');
  logger.debug('Archive view mounted, loading dates immediately...');

  // تحميل إعدادات الأعمدة
  loadColumnSettings();

  try {
    // تحميل البيانات بشكل فوري
    await store.loadAvailableDates();
    logger.info('Archive dates loaded immediately on mount:', store.availableDates);

    // إذا كان هناك تاريخ محدد من قبل، إعادة تحميل البيانات
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
      logger.info('Archive data reloaded for selected date:', store.selectedDate);
    }
  } catch (error) {
    logger.error('Error loading archive data:', error);
  }

  // Subscribe to auth state changes so that if the user session becomes
  // available after navigation, we fetch DB-backed dates automatically.
  try {
    const res = api.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Archive view detected auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // تحميل البيانات مرة أخرى عند تحديث الجلسة
        await store.loadAvailableDates();
        if (store.selectedDate) {
          await store.loadArchiveByDate(store.selectedDate);
        }
        logger.info('Archive dates reloaded after auth:', store.availableDates);
      } else if (event === 'SIGNED_OUT') {
        // تنظيف البيانات عند تسجيل الخروج
        store.availableDates = [];
        store.selectedDate = '';
        store.rows = [];
      }
    });

    // supabase returns { data: { subscription } }
    authSubscription = res?.data?.subscription;
  } catch (e) {
    logger.warn('Failed to subscribe to auth events in archive view', e);
  }

  // محاولة إضافية لتحميل التواريخ بعد فترة قصيرة (للتأكد من اكتمال المصادقة)
  setTimeout(async () => {
    logger.debug('Delayed loadAvailableDates attempt...');
    await store.loadAvailableDates();
    logger.info('Delayed available dates loaded:', store.availableDates);
  }, 1000);
});

onUnmounted(() => {
  document.body.classList.remove('page-has-fixed-width');
  try {
    if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
      authSubscription.unsubscribe();
    }
  } catch (e) {
    logger.warn('Failed to unsubscribe auth events in archive view', e);
  }
});

const handleDateChange = async () => {
  logger.info('Date changed to:', store.selectedDate);
  // تصفير البحث عند اختيار تاريخ
  store.searchQuery = "";
  // تحميل البيانات للتاريخ المختار
  await store.loadArchiveByDate(store.selectedDate);
  logger.info('Archive data loaded for date:', store.selectedDate, 'Rows:', store.rows.length);

  // التأكد من تحديث قائمة التواريخ المتاحة (في حالة إضافة تاريخ جديد)
  await store.loadAvailableDates();
};

// استخدام Debounce للبحث لتجنب الإلحاح عند الكتابة
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

// حساب عدد الأعمدة الإجمالي للـ colspan
const totalColumns = computed(() => {
  let count = 3; // date, collector, net
  if (visibleColumns.value.shop) count++;
  if (visibleColumns.value.code) count++;
  if (visibleColumns.value.amount) count++;
  if (visibleColumns.value.extra) count++;
  return count;
});
</script>
<style scoped>
.archive-page {
  max-width: 1200px;
}

.archive-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.9));
  border-radius: 15px;
  border: 2px solid rgba(0,121,101,0.1);
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}
</style>