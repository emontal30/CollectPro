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
          <select id="archiveSelect" v-model="store.selectedDate" @change="handleDateChange">
            <option value="">-- اختر تاريخ --</option>
            <option v-for="date in store.availableDates" :key="date" :value="date">
              {{ date }}
            </option>
          </select>
        </label>
      </div>

      <div class="control-group">
        <label>
          <i class="fas fa-search control-icon"></i>
          بحث:
          <input 
            id="archiveSearch" 
            v-model="store.searchQuery" 
            type="text"
            placeholder="اكتب اسم المحل أو الكود" 
            @input="handleSearch" 
          />
        </label>
      </div>
    </div>

    <div class="table-wrap w-full">
      <table id="archiveTable" class="collections-table w-full">
        <thead>
          <tr>
            <th class="whitespace-nowrap">📅 التاريخ</th>
            <th class="whitespace-nowrap">🏪 المحل</th>
            <th class="whitespace-nowrap">🔢 الكود</th>
            <th class="whitespace-nowrap">💵 مبلغ التحويل</th>
            <th class="extra whitespace-nowrap">📌 اخرى</th>
            <th class="whitespace-nowrap">👤 المحصل</th>
            <th class="whitespace-nowrap">✅ الصافي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.isLoading">
            <td colspan="7" style="text-align: center; padding: 20px;">
              <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
            </td>
          </tr>
          <tr v-if="store.isLoading">
            <td colspan="7" style="text-align: center; padding: 20px;">
              <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
            </td>
          </tr>

          <tr v-for="(row, index) in store.rows" :key="index">
            <td class="date-cell">{{ row.date }}</td>
            <td class="shop">{{ row.shop }}</td>
            <td class="code">{{ row.code }}</td>
            <td class="amount">{{ store.formatNumber(row.amount) }}</td>
            <td class="extra">{{ store.formatNumber(row.extra) }}</td>
            <td class="collector">{{ store.formatNumber(row.collector) }}</td>
            
            <td class="net numeric" :class="getNetClass(row.net)">
              {{ store.formatNumber(row.net) }}
              <i :class="getNetIcon(row.net)" style="margin-right: 4px; font-size: 0.8em;"></i>
            </td>
          </tr>

          <tr v-if="!store.isLoading && store.rows.length === 0">
            <td colspan="7" class="no-data-row">لا توجد بيانات لعرضها</td>
          </tr>

          <tr v-if="store.rows.length > 0" id="archiveTotalRow" class="total-row">
            <td colspan="3" style="text-align: center; font-size: 20px; font-weight: 800;">الإجمالي</td>
            <td class="amount">{{ store.formatNumber(store.totals.amount) }}</td>
            <td class="extra">{{ store.formatNumber(store.totals.extra) }}</td>
            <td class="collector">{{ store.formatNumber(store.totals.collector) }}</td>
            <td class="net numeric" :class="getNetClass(store.totals.net)">
              {{ store.formatNumber(store.totals.net) }}
              <i :class="getNetIcon(store.totals.net)" style="margin-right: 4px; font-size: 0.8em;"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="buttons">
      <router-link id="backToHarvestBtn" to="/app/harvest" class="btn">
        <i class="fas fa-arrow-left" style="color: #90EE90 !important;"></i>
        <span>العودة للتحصيلات</span>
      </router-link>

      <button
        id="deleteArchiveBtn"
        class="btn"
        :disabled="!store.selectedDate"
        @click="store.deleteCurrentArchive"
      >
        <i class="fas fa-trash-alt" style="color: #DC143C !important;"></i>
        <span>حذف الأرشيف الحالي</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, onActivated, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useArchiveStore } from '@/stores/archiveStore';
import debounce from 'lodash/debounce'; // استخدام من مكتبة lodash أو إكتب دالة debounce يدوياً
import PageHeader from '@/components/layout/PageHeader.vue';
import api from '@/services/api';
import '@/assets/css/_unified-components.css';

const store = useArchiveStore();
const route = useRoute();

onActivated(async () => {
  console.log('Archive view activated — reloading available dates');
  try {
    await store.loadAvailableDates();
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
    }
  } catch (err) {
    console.error('Error reloading archive on activate:', err);
  }
});

// Watch route changes to reload when navigated to
watch(() => route.name, (newName) => {
  if (newName === 'Archive') {
    console.log('Route changed to Archive — reloading dates');
    store.loadAvailableDates().catch(err => console.error('Error loading dates on route change:', err));
  }
});

let authSubscription = null;

onMounted(async () => {
  document.body.classList.add('page-has-fixed-width');
  console.log('ًں“‚ Archive view mounted, loading dates immediately...');

  try {
    // تحميل البيانات بشكل فوري
    await store.loadAvailableDates();
    console.log('âœ… Archive dates loaded immediately on mount:', store.availableDates);

    // إذا كان هناك تاريخ محدد من قبل، إعادة تحميل البيانات
    if (store.selectedDate) {
      await store.loadArchiveByDate(store.selectedDate);
      console.log('âœ… Archive data reloaded for selected date:', store.selectedDate);
    }
  } catch (error) {
    console.error('â‌Œ Error loading archive data:', error);
  }

  // Subscribe to auth state changes so that if the user session becomes
  // available after navigation, we fetch DB-backed dates automatically.
  try {
    const res = api.auth.onAuthStateChange(async (event, session) => {
      console.log('ًں”” Archive view detected auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // تحميل البيانات مرة أخرى عند تحديث الجلسة
        await store.loadAvailableDates();
        if (store.selectedDate) {
          await store.loadArchiveByDate(store.selectedDate);
        }
        console.log('âœ… Archive dates reloaded after auth:', store.availableDates);
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
    console.warn('âڑ ï¸ڈ Failed to subscribe to auth events in archive view', e);
  }

  // محاولة إضافية لتحميل التواريخ بعد فترة قصيرة (للتأكد من اكتمال المصادقة)
  setTimeout(async () => {
    console.log('⏰ Delayed loadAvailableDates attempt...');
    await store.loadAvailableDates();
    console.log('✅ Delayed available dates loaded:', store.availableDates);
  }, 1000);
});

onUnmounted(() => {
  document.body.classList.remove('page-has-fixed-width');
  try {
    if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
      authSubscription.unsubscribe();
    }
  } catch (e) {
    console.warn('âڑ ï¸ڈ Failed to unsubscribe auth events in archive view', e);
  }
});

const handleDateChange = async () => {
  console.log('📅 Date changed to:', store.selectedDate);
  // تصفير البحث عند اختيار تاريخ
  store.searchQuery = "";
  // تحميل البيانات للتاريخ المختار
  await store.loadArchiveByDate(store.selectedDate);
  console.log('✅ Archive data loaded for date:', store.selectedDate, 'Rows:', store.rows.length);

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
</script>
<style scoped>
/* All styles imported from _unified-components.css */

/* Center all table headers */
th {
  text-align: center;
}
</style>