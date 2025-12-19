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
          <button class="btn btn-secondary chart-refresh-btn" :disabled="isRefreshingCharts" @click="refreshCharts">
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
          <button class="btn btn-secondary small-refresh-btn" :disabled="isRefreshingUsers" @click="refreshUsers"><i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshingUsers }"></i></button>
        </div>
        <div class="table-actions users-bulk-actions">
          <input v-model.number="bulkDays" type="number" class="subscription-days-input" min="1" placeholder="عدد أيام الاشتراك" />
          <button class="btn btn-success" @click="bulkActivate"><i class="fas fa-check-double"></i> تفعيل الكل</button>
        </div>
      </div>

      <div class="table-container">
        <table id="logged-in-users-table">
          <thead>
            <tr>
              <th class="th-checkbox"><input v-model="selectAllUsers" type="checkbox" /></th>
              <th>ID</th>
              <th>الاسم</th>
              <th>البريد</th>
              <th>تاريخ التسجيل</th>
              <th class="col-subscription-days">مدة الاشتراك</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td class="td-checkbox"><input v-model="selectedUsers" type="checkbox" :value="user.id" /></td>
              <td class="col-id">{{ user.id.slice(-7) }}</td>
              <td :class="{'user-no-subscription': !user.hasActiveSub}">{{ user.full_name || 'مستخدم' }}</td>
              <td class="col-email">{{ user.email }}</td>
              <td>{{ store.formatDate(user.created_at) }}</td>
              <td class="col-subscription-days"><input v-model="user.manualDays" type="number" class="subscription-days-input" placeholder="أيام"></td>
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
          <button class="btn btn-secondary small-refresh-btn" :disabled="isRefreshingSubscriptions" @click="refreshSubscriptions"><i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshingSubscriptions }"></i></button>
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
import { ref, onMounted, onUnmounted, onActivated, computed, watch } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import logger from '@/utils/logger.js'
import { useNotifications } from '@/composables/useNotifications';
import api from '@/services/api';

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
    <div class="direction-rtl text-right">
      <div class="mb-3"><strong>معرف الاشتراك:</strong> ${subscription.id}</div>
      <div class="mb-3"><strong>الاسم:</strong> ${subscription.users?.full_name || subscription.users?.email || 'غير محدد'}</div>
      <div class="mb-3"><strong>البريد الإلكتروني:</strong> ${subscription.users?.email || 'غير محدد'}</div>
      <div class="mb-3"><strong>الخطة:</strong> ${subscription.subscription_plans?.name_ar || subscription.plan_name || 'غير محدد'}</div>
      <div class="mb-3"><strong>السعر:</strong> ${subscription.price || subscription.subscription_plans?.price_egp || 'غير محدد'} ج.م</div>
      <div class="mb-3"><strong>تاريخ البدء:</strong> ${store.formatDate(subscription.start_date)}</div>
      <div class="mb-3"><strong>تاريخ الانتهاء:</strong> ${store.formatDate(subscription.end_date)}</div>
      <div class="mb-3"><strong>الحالة:</strong> <span class="status-badge status-${subscription.status}">${subscription.status}</span></div>
      <div class="mb-3"><strong>رقم العملية:</strong> ${subscription.transaction_id || 'غير محدد'}</div>
      <div class="mb-3"><strong>تاريخ الإنشاء:</strong> ${store.formatDate(subscription.created_at)}</div>
      <div><strong>تاريخ التحديث:</strong> ${store.formatDate(subscription.updated_at)}</div>
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
    logger.error('Error refreshing subscriptions:', error);
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
        logger.error('Error activating subscription for user:', uid, error);
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
  logger.debug('Admin view mounted, loading dashboard data...');

  try {
    // Subscribe to auth state changes so that if the user session becomes
    // available after navigation, we fetch admin data automatically.
    const res = api.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Admin view detected auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // تحميل البيانات مرة أخرى عند تحديث الجلسة
        await store.loadDashboardData();
        logger.info('Admin data reloaded after auth');
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
    logger.warn('Failed to subscribe to auth events in admin view', e);
  }

  // محاولة تحميل البيانات الأولية
  try {
    await store.loadDashboardData();
    logger.info('Admin dashboard data loaded initially');
  } catch (err) {
    logger.error('Error loading admin data initially:', err);
  }

  // محاولة إضافية لتحميل البيانات بعد فترة قصيرة (للتأكد من اكتمال المصادقة)
  setTimeout(async () => {
    logger.debug('Delayed admin data load attempt...');
    try {
      await store.loadDashboardData();
      logger.info('Admin data loaded after delay');
    } catch (err) {
      logger.error('Error loading admin data after delay:', err);
    }
  }, 1500);
});

// When using <keep-alive> the component may be cached; ensure data reloads
onActivated(() => {
  logger.info('Admin view activated — reloading admin data');
  store.loadDashboardData().catch(err => logger.error('Error reloading admin data on activate:', err));
});

onUnmounted(() => {
  try {
    if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
      authSubscription.unsubscribe();
    }
  } catch (e) {
    logger.warn('Failed to unsubscribe auth events in admin view', e);
  }
});
</script>

<style scoped>
/* Admin Dashboard Container */
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Statistics Cards Section */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.08);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 121, 101, 0.05);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  border-radius: 20px 20px 0 0;
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(0, 121, 101, 0.15);
}

.stat-icon {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  background: linear-gradient(135deg, rgba(0, 121, 101, 0.15), rgba(0, 160, 133, 0.1));
  color: var(--primary);
  box-shadow: 0 4px 15px rgba(0, 121, 101, 0.2);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--gray-700);
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary);
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-trend.positive {
  color: var(--success);
}

.stat-trend.neutral {
  color: var(--warning);
}

.stat-filters {
  margin-top: 12px;
}

.stat-filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 0.85rem;
  color: var(--gray-700);
}

/* Admin Sections */
.admin-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.06);
  border: 1px solid rgba(0, 121, 101, 0.05);
  margin-bottom: 32px;
  overflow: hidden;
}

.section-header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  padding: 24px 32px;
  color: white;
  border-radius: 20px 20px 0 0;
}

.section-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-header h2 i {
  font-size: 1.6rem;
  opacity: 0.9;
}

.chart-controls {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.chart-toggle {
  padding: 8px 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
}

.chart-toggle:hover,
.chart-toggle.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.chart-refresh-btn {
  margin-left: auto;
}

/* Chart Container */
.chart-container {
  padding: 32px;
  background: linear-gradient(135deg, #f8fffe 0%, #e6f7f5 50%, #d1f2eb 100%);
  border-radius: 0;
  box-shadow: none;
  margin-top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 350px;
  position: relative;
  overflow: hidden;
}

.chart-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(0, 121, 101, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(0, 160, 133, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

/* Charts */
.simple-chart {
  display: flex;
  align-items: flex-end;
  height: 250px;
  gap: 24px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.chart-bar {
  flex: 1;
  background: rgba(0, 121, 101, 0.08);
  border-radius: 12px 12px 0 0;
  position: relative;
  height: 100%;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 121, 101, 0.1);
}

.bar-fill {
  background: linear-gradient(180deg, var(--primary-light), var(--primary), var(--primary-dark));
  border-radius: 12px 12px 0 0;
  width: 100%;
  position: absolute;
  bottom: 0;
  transition: height 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3);
}

.bar-label {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 700;
  color: var(--primary);
  font-size: 0.9rem;
  white-space: nowrap;
}

/* Pie Chart */
.pie-chart {
  position: relative;
  z-index: 1;
}

.pie-container {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  position: relative;
}

.pie-segment {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 0;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--gray-700);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* Line Chart */
.line-chart {
  width: 100%;
  position: relative;
  z-index: 1;
}

.line-svg {
  width: 100%;
  height: 250px;
}

.line-path {
  fill: none;
  stroke: url(#lineGradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-point {
  fill: var(--primary);
  stroke: white;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.3s ease;
}

.line-point:hover {
  r: 6;
  fill: var(--primary-light);
}

.line-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding: 0 20px;
}

.line-labels span {
  font-size: 0.8rem;
  color: var(--gray-600);
  font-weight: 500;
}

/* Table Sections */
.table-container {
  padding: 24px 32px;
  background: white;
  border-radius: 0 0 20px 20px;
}

.table-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 16px;
}

.section-title-with-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.section-title-with-stats h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-stats {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 121, 101, 0.2);
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select,
.users-search-input,
.subscription-days-input {
  padding: 10px 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  min-width: 200px;
}

.filter-select:focus,
.users-search-input:focus,
.subscription-days-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 121, 101, 0.1);
  outline: none;
}

.subscription-days-input {
  width: 100%;
}

/* Table Styling */
/* These styles are now handled globally in src/assets/css/components/tables.css */

/*
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

thead th {
  background: var(--table-header-bg);
  color: white;
  padding: 16px 12px;
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

tbody td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  vertical-align: middle;
  transition: background 0.2s ease;
}
*/

tbody tr:hover {
  background: var(--table-row-hover);
}

.col-id {
  font-family: var(--font-family-mono);
  font-weight: 600;
  color: var(--gray-600);
}

.col-email {
  font-size: 0.85rem;
  color: var(--gray-700);
}

.user-no-subscription {
  opacity: 0.7;
  font-style: italic;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background: rgba(39, 174, 96, 0.1);
  color: var(--success);
}

.status-expired {
  background: rgba(231, 76, 60, 0.1);
  color: var(--danger);
}

.status-cancelled {
  background: rgba(149, 165, 166, 0.1);
  color: var(--gray-600);
}

.status-pending {
  background: rgba(243, 156, 18, 0.1);
  color: var(--warning);
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn.approve {
  background: linear-gradient(135deg, var(--success), #27ae60);
  color: white;
}

.action-btn.reject {
  background: linear-gradient(135deg, var(--danger), #e74c3c);
  color: white;
}

.action-btn.details {
  background: linear-gradient(135deg, var(--info), #3498db);
  color: white;
}

.action-btn.deactivate {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
}

.action-btn.reactivate {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.action-btn.delete {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.action-btn.manual-activate {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

/* No Data State */
.no-data {
  text-align: center;
  padding: 40px 20px;
  color: var(--gray-500);
}

.no-data p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .stats-container {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .section-header,
  .table-header-info,
  .table-container {
    padding-left: 20px;
    padding-right: 20px;
  }

  .chart-container {
    padding: 20px;
    min-height: 280px;
  }

  .simple-chart {
    height: 200px;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 0 10px;
  }

  .stats-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stat-card {
    padding: 20px;
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .section-title-with-stats {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .table-header-info {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .table-actions {
    justify-content: center;
  }

  .filter-select,
  .users-search-input {
    min-width: 100%;
  }

  .chart-controls {
    justify-content: center;
  }

  .pie-container {
    width: 150px;
    height: 150px;
  }

  .actions-cell {
    flex-direction: column;
    gap: 4px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
}
</style>