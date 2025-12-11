التصفية<template>
  <div class="admin-dashboard">
    
    <PageHeader 
      title="لوحة التحكم" 
      subtitle="إدارة النظام والمستخدمين والإحصائيات"
      icon="⚙️"
    />

    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-users"></i></div>
        <div class="stat-content">
          <h3>إجمالي المستخدمين</h3>
          <p class="stat-value">{{ store.stats.totalUsers }}</p>
          <div class="stat-trend positive">
            <i class="fas fa-arrow-up"></i><span>مستخدم نشط</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-user-check"></i></div>
        <div class="stat-content">
          <h3>مستخدمون فعالون</h3>
          <p class="stat-value">{{ store.stats.activeUsers }}</p>
          <div class="stat-trend positive">
            <i class="fas fa-user-clock"></i><span>نشطاء مؤخرا</span>
          </div>
          <div class="stat-filters">
            <select v-model="store.filters.activeUsersPeriod" class="stat-filter-select" @change="store.fetchStats">
              <option value="1">آخر يوم</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
            </select>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-clock"></i></div>
        <div class="stat-content">
          <h3>طلبات قيد المراجعة</h3>
          <p class="stat-value">{{ store.stats.pendingRequests }}</p>
          <div class="stat-trend neutral">
            <i class="fas fa-clock"></i><span>تحتاج مراجعة</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        <div class="stat-content">
          <h3>الاشتراكات النشطة</h3>
          <p class="stat-value">{{ store.stats.activeSubscriptions }}</p>
          <div class="stat-trend positive">
            <i class="fas fa-arrow-up"></i><span>نشط الآن</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
        <div class="stat-content">
          <h3>إجمالي الإيرادات</h3>
          <p class="stat-value">{{ store.stats.totalRevenue }} ج.م</p>
          <div class="stat-trend positive">
            <i class="fas fa-chart-line"></i><span>من الاشتراكات النشطة</span>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="section-header">
        <h2><i class="fas fa-chart-bar"></i> تحليل الإحصائيات التفاعلي</h2>
        <div class="chart-controls">
          <button
            v-for="type in ['bars', 'pie', 'line']"
            :key="type"
            class="chart-toggle"
            :class="{ active: activeChart === type }"
            @click="activeChart = type"
          >
            <i :class="getChartIcon(type)"></i>
            <span>{{ getChartLabel(type) }}</span>
          </button>
          <button class="btn-secondary chart-refresh-btn" :disabled="isRefreshingCharts" @click="refreshCharts">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshingCharts }"></i>
            <span>تحديث</span>
          </button>
        </div>
      </div>

      <div class="chart-container">
        <div v-if="activeChart === 'bars'" class="simple-chart active">
          <div class="chart-bar" data-label="اكتمال">
            <div class="bar-fill" :style="{ height: store.stats.completionRate + '%' }"></div>
            <span class="bar-label">{{ store.stats.completionRate }}%</span>
          </div>
          <div class="chart-bar" data-label="انتظار">
            <div class="bar-fill" :style="{ height: store.stats.pendingRate + '%' }"></div>
            <span class="bar-label">{{ store.stats.pendingRate }}%</span>
          </div>
        </div>

        <div v-if="activeChart === 'pie'" class="pie-chart active">
          <div class="pie-container">
            <div class="pie-segment" :style="pieStyle"></div>
          </div>
          <div class="pie-legend">
            <div class="legend-item"><span class="legend-color" style="background: #007965;"></span> نشط ({{ store.chartsData.piePercentages[0] }}%)</div>
            <div class="legend-item"><span class="legend-color" style="background: #00a085;"></span> معلق ({{ store.chartsData.piePercentages[1] }}%)</div>
            <div class="legend-item"><span class="legend-color" style="background: #28a745;"></span> ملغي ({{ store.chartsData.piePercentages[2] }}%)</div>
            <div class="legend-item"><span class="legend-color" style="background: #f39c12;"></span> منتهي ({{ store.chartsData.piePercentages[3] }}%)</div>
          </div>
        </div>

        <div v-if="activeChart === 'line'" class="line-chart active">
          <svg class="line-svg" viewBox="0 0 400 200">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#007965;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#00a085;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#00c9a7;stop-opacity:1" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#007965;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#007965;stop-opacity:0.05" />
              </linearGradient>
            </defs>
            <polyline class="line-path" :points="lineChartPoints" />
            <circle v-for="(point, index) in lineChartPointsArray" :key="index" class="line-point" :cx="point.x" :cy="point.y" r="5" />
          </svg>
          <div class="line-labels">
            <span v-for="label in store.chartsData.monthlyLabels" :key="label">{{ label.split(' ')[0] }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="section-header">
        <div class="section-title-with-stats">
          <h2><i class="fas fa-users-cog"></i> المستخدمون المسجلون</h2>
          <div class="table-stats users-header-stats">
            <span>{{ store.usersList.length }}</span> مستخدم مسجل
          </div>
        </div>
      </div>

      <div class="table-header-info">
        <div class="table-actions users-search-row">
          <input v-model="store.filters.usersSearch" type="text" class="filter-select users-search-input" placeholder="ابحث عن المستخدمين" />
          <button class="btn-secondary small-refresh-btn" :disabled="isRefreshingUsers" @click="refreshUsers"><i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshingUsers }"></i></button>
        </div>
        <div class="table-actions users-bulk-actions">
          <input v-model.number="bulkDays" type="number" class="subscription-days-input" min="1" placeholder="عدد أيام الاشتراك" />
          <button class="btn-success" @click="bulkActivate"><i class="fas fa-check-double"></i> تفعيل الكل</button>
        </div>
      </div>

      <div class="table-container">
        <table id="logged-in-users-table">
          <thead>
            <tr>
              <th class="whitespace-nowrap"><input v-model="selectAllUsers" type="checkbox" /></th>
              <th class="whitespace-nowrap">ID</th>
              <th class="whitespace-nowrap">الاسم</th>
              <th class="whitespace-nowrap">البريد</th>
              <th class="whitespace-nowrap">تاريخ التسجيل</th>
              <th class="whitespace-nowrap">مدة الاشتراك</th>
              <th class="whitespace-nowrap">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td><input v-model="selectedUsers" type="checkbox" :value="user.id" /></td>
              <td class="col-id">{{ user.id.slice(-7) }}</td>
              <td :class="{'user-no-subscription': !user.hasActiveSub}">{{ user.full_name || 'مستخدم' }}</td>
              <td class="col-email">{{ user.email }}</td>
              <td>{{ store.formatDate(user.created_at) }}</td>
              <td><input v-model="user.manualDays" type="number" class="subscription-days-input" placeholder="أيام"></td>
              <td class="col-actions">
                <button class="action-btn manual-activate" @click="store.activateManualSubscription(user.id, user.manualDays || 30)"><i class="fas fa-play-circle"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredUsers.length === 0" class="no-data"><p>لا يوجد مستخدمين</p></div>
      </div>
    </div>

    <div class="admin-section">
      <div class="section-header">
        <h2><i class="fas fa-clock"></i> طلبات الاشتراك قيد المراجعة</h2>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="whitespace-nowrap">المستخدم</th>
              <th class="whitespace-nowrap">الخطة</th>
              <th class="whitespace-nowrap">رقم العملية</th>
              <th class="whitespace-nowrap">التاريخ</th>
              <th class="whitespace-nowrap">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.pendingSubscriptions" :key="sub.id">
              <td>
                <div>{{ sub.users?.full_name || 'مستخدم' }}</div>
                <small>{{ sub.users?.email }}</small>
              </td>
              <td>{{ sub.subscription_plans?.name_ar || sub.plan_name }}</td>
              <td class="ltr">{{ sub.transaction_id }}</td>
              <td>{{ store.formatDate(sub.created_at) }}</td>
              <td class="actions-cell">
                <button class="action-btn approve" title="تفعيل" @click="store.handleSubscriptionAction(sub.id, 'approve')"><i class="fas fa-check"></i></button>
                <button class="action-btn reject" title="رفض" @click="store.handleSubscriptionAction(sub.id, 'reject')"><i class="fas fa-times"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="store.pendingSubscriptions.length === 0" class="no-data"><p>لا توجد طلبات معلقة</p></div>
      </div>
    </div>

    <div class="admin-section">
      <div class="section-header">
        <h2><i class="fas fa-list"></i> جميع الاشتراكات</h2>
      </div>
      <div class="table-header-info">
        <div class="filter-container">
          <select v-model="store.filters.status" class="filter-select" @change="store.fetchAllSubscriptions">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">ملغي</option>
          </select>
           <select v-model="store.filters.expiry" class="filter-select" @change="store.fetchAllSubscriptions">
            <option value="all">كل الصلاحيات</option>
            <option value="expiring_soon">قرب الانتهاء</option>
          </select>
          <button class="btn-secondary small-refresh-btn" :disabled="isRefreshingSubscriptions" @click="refreshSubscriptions"><i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshingSubscriptions }"></i></button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="whitespace-nowrap">المستخدم</th>
              <th class="whitespace-nowrap">الخطة</th>
              <th class="whitespace-nowrap">البدء</th>
              <th class="whitespace-nowrap">الانتهاء</th>
              <th class="whitespace-nowrap">الحالة</th>
              <th class="whitespace-nowrap">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.allSubscriptions" :key="sub.id">
              <td>{{ sub.users?.full_name || sub.users?.email }}</td>
              <td>{{ sub.subscription_plans?.name_ar || sub.plan_name }}</td>
              <td>{{ store.formatDate(sub.start_date) }}</td>
              <td>{{ store.formatDate(sub.end_date) }}</td>
              <td><span class="status-badge" :class="`status-${sub.status}`">{{ sub.status }}</span></td>
              <td class="actions-cell">
                <button class="action-btn details" title="تفاصيل الاشتراك" @click="showSubscriptionDetails(sub)"><i class="fas fa-info-circle"></i></button>
                <button v-if="sub.status === 'active'" class="action-btn deactivate" title="إلغاء" @click="store.handleSubscriptionAction(sub.id, 'cancel')"><i class="fas fa-ban"></i></button>
                <button v-if="sub.status === 'cancelled'" class="action-btn reactivate" title="إعادة تفعيل" @click="store.handleSubscriptionAction(sub.id, 'reactivate')"><i class="fas fa-undo"></i></button>
                <button class="action-btn delete" title="حذف" @click="store.handleSubscriptionAction(sub.id, 'delete')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useNotifications } from '@/composables/useNotifications';
import api from '@/services/api';
import '@/assets/css/_unified-components.css';

const store = useAdminStore();
const { error, success, confirm, warning, showDetails } = useNotifications();
let authSubscription = null;
const activeChart = ref('bars');
const selectedUsers = ref([]);
const bulkDays = ref('');
const isRefreshingUsers = ref(false);
const isRefreshingSubscriptions = ref(false);
const isRefreshingCharts = ref(false);

// Chart Helpers
const getChartIcon = (type) => ({
  'bars': 'fas fa-chart-bar',
  'pie': 'fas fa-chart-pie',
  'line': 'fas fa-chart-line'
}[type]);

const getChartLabel = (type) => ({
  'bars': 'أعمدة',
  'pie': 'دائري',
  'line': 'خطي'
}[type]);

// Computed Style for Pie Chart (Conic Gradient Simulation)
const pieStyle = computed(() => {
  const p = store.chartsData.piePercentages;
  // [active, pending, cancelled, expired]
  // Colors: #007965, #00a085, #28a745, #f39c12
  return {
    background: `conic-gradient(
      #007965 0% ${p[0]}%,
      #00a085 ${p[0]}% ${p[0]+p[1]}%,
      #28a745 ${p[0]+p[1]}% ${p[0]+p[1]+p[2]}%,
      #f39c12 ${p[0]+p[1]+p[2]}% 100%
    )`
  };
});

// Line Chart Points Calculation
const lineChartPoints = computed(() => {
  const values = store.chartsData.monthlyValues;
  if (!values.length) return "0,180 400,180";

  const max = Math.max(...values, 10); // الحد الأدنى 10 لتجنب القسمة على صفر
  const width = 400;
  const height = 180;
  const step = width / (values.length - 1 || 1);

  return values.map((val, index) => {
    const x = index * step + 20; // offset
    const y = height - (val / max) * 150; // scale height
    return `${x},${y}`;
  }).join(' ');
});

const lineChartPointsArray = computed(() => {
  return lineChartPoints.value.split(' ').map(p => {
    const [x, y] = p.split(',');
    return { x, y };
  });
});

// Users Filtering
const filteredUsers = computed(() => {
  if (!store.filters.usersSearch) return store.usersList;
  const q = store.filters.usersSearch.toLowerCase();
  return store.usersList.filter(u =>
    (u.full_name && u.full_name.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q))
  );
});

// Select All Logic
const selectAllUsers = computed({
  get: () => store.usersList.length > 0 && selectedUsers.value.length === store.usersList.length,
  set: (val) => {
    selectedUsers.value = val ? store.usersList.map(u => u.id) : [];
  }
});

// Subscription Details Modal
function showSubscriptionDetails(subscription) {
  const detailsHtml = `
    <div style="text-align: right; direction: rtl;">
      <div style="margin-bottom: 15px;"><strong>معرف الاشتراك:</strong> ${subscription.id}</div>
      <div style="margin-bottom: 15px;"><strong>الاسم:</strong> ${subscription.users?.full_name || subscription.users?.email || 'غير محدد'}</div>
      <div style="margin-bottom: 15px;"><strong>البريد الإلكتروني:</strong> ${subscription.users?.email || 'غير محدد'}</div>
      <div style="margin-bottom: 15px;"><strong>الخطة:</strong> ${subscription.subscription_plans?.name_ar || subscription.plan_name || 'غير محدد'}</div>
      <div style="margin-bottom: 15px;"><strong>السعر:</strong> ${subscription.price || subscription.subscription_plans?.price_egp || 'غير محدد'} ج.م</div>
      <div style="margin-bottom: 15px;"><strong>تاريخ البدء:</strong> ${store.formatDate(subscription.start_date)}</div>
      <div style="margin-bottom: 15px;"><strong>تاريخ الانتهاء:</strong> ${store.formatDate(subscription.end_date)}</div>
      <div style="margin-bottom: 15px;"><strong>الحالة:</strong> <span class="status-badge status-${subscription.status}">${subscription.status}</span></div>
      <div style="margin-bottom: 15px;"><strong>رقم العملية:</strong> ${subscription.transaction_id || 'غير محدد'}</div>
      <div style="margin-bottom: 15px;"><strong>تاريخ الإنشاء:</strong> ${store.formatDate(subscription.created_at)}</div>
      <div style="margin-bottom: 15px;"><strong>تاريخ التحديث:</strong> ${store.formatDate(subscription.updated_at)}</div>
    </div>
  `;

  showDetails('تفاصيل الاشتراك', detailsHtml);
}

// Refresh Users with Loading Animation
async function refreshUsers() {
  isRefreshingUsers.value = true;
  try {
    await store.fetchUsers(true);
  } finally {
    isRefreshingUsers.value = false;
  }
}

// Refresh Subscriptions with Loading Animation
async function refreshSubscriptions() {
  isRefreshingSubscriptions.value = true;
  try {
    await store.fetchAllSubscriptions(true);
    isRefreshingSubscriptions.value = false;
  } catch (error) {
    console.error('Error refreshing subscriptions:', error);
  }
}

// Bulk Actions
async function bulkActivate() {
  if (selectedUsers.value.length === 0) {
    warning('يرجى اختيار مستخدمين أولاً');
    return;
  }

  if (!bulkDays.value || bulkDays.value < 1) {
    warning('يرجى إدخال عدد أيام صحيح');
    return;
  }

  const confirmResult = await confirm({
    title: 'تأكيد جماعي',
    text: `سيتم تفعيل اشتراك لمدة ${bulkDays.value} يوم لـ ${selectedUsers.value.length} مستخدم.`,
    icon: 'question',
    confirmButtonText: 'نعم، نفذ'
  });

  if (confirmResult.isConfirmed) {
    let successCount = 0;
    let errorCount = 0;

    for (const uid of selectedUsers.value) {
      try {
        await store.activateManualSubscription(uid, bulkDays.value);
        successCount++;
      } catch (error) {
        console.error('Error activating subscription for user:', uid, error);
        errorCount++;
      }
    }

    selectedUsers.value = [];
    bulkDays.value = ''; // إعادة تعيين الحقل ليكون فارغاً

    if (errorCount === 0) {
      success(`تم تفعيل الاشتراكات بنجاح لـ ${successCount} مستخدم`);
    } else if (successCount === 0) {
      error('فشل في تفعيل أي اشتراكات');
    } else {
      warning(`تم تفعيل ${successCount} اشتراك بنجاح، وفشل ${errorCount}`);
    }
  }
}

// Refresh Charts with Loading Animation
async function refreshCharts() {
  isRefreshingCharts.value = true;
  try {
    await store.fetchStats();
    await store.fetchChartsData();
  } finally {
    isRefreshingCharts.value = false;
  }
}

onMounted(async () => {
  console.log('⚙️ Admin view mounted, loading dashboard data...');

  try {
    // Subscribe to auth state changes so that if the user session becomes
    // available after navigation, we fetch admin data automatically.
    const res = api.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Admin view detected auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // تحميل البيانات مرة أخرى عند تحديث الجلسة
        await store.loadDashboardData();
        console.log('✅ Admin data reloaded after auth');
      } else if (event === 'SIGNED_OUT') {
        // تنظيف البيانات عند تسجيل الخروج
        store.stats = {
          totalUsers: 0,
          activeUsers: 0,
          pendingRequests: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          cancelled: 0,
          expired: 0,
          completionRate: 0,
          pendingRate: 0
        };
        store.usersList = [];
        store.pendingSubscriptions = [];
        store.allSubscriptions = [];
      }
    });

    // supabase returns { data: { subscription } }
    authSubscription = res?.data?.subscription;
  } catch (e) {
    console.warn('⚠️ Failed to subscribe to auth events in admin view', e);
  }

  // محاولة تحميل البيانات الأولية
  try {
    await store.loadDashboardData();
    console.log('✅ Admin dashboard data loaded initially');
  } catch (err) {
    console.error('❌ Error loading admin data initially:', err);
  }

  // محاولة إضافية لتحميل البيانات بعد فترة قصيرة (للتأكد من اكتمال المصادقة)
  setTimeout(async () => {
    console.log('⏰ Delayed admin data load attempt...');
    try {
      await store.loadDashboardData();
      console.log('✅ Admin data loaded after delay');
    } catch (err) {
      console.error('❌ Error loading admin data after delay:', err);
    }
  }, 1500);
});

onUnmounted(() => {
  try {
    if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
      authSubscription.unsubscribe();
    }
  } catch (e) {
    console.warn('⚠️ Failed to unsubscribe auth events in admin view', e);
  }
});
</script>

<style scoped>
/* All styles imported from _unified-components.css */

/* Center all table headers */
th {
  text-align: center;
}
</style>