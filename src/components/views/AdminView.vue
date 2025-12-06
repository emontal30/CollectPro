<template>
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
          <h3>مستخدمون فعّالون</h3>
          <p class="stat-value">{{ store.stats.activeUsers }}</p>
          <div class="stat-trend positive">
            <i class="fas fa-user-clock"></i><span>نشطون مؤخرًا</span>
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
          <h3>اشتراكات نشطة</h3>
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
            تحديث
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
          <input v-model="store.filters.usersSearch" type="text" class="filter-select users-search-input" placeholder="ابحث..." />
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
import { ref, onMounted, computed, watch } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import Swal from 'sweetalert2';

const store = useAdminStore();
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

  Swal.fire({
    title: 'تفاصيل الاشتراك',
    html: detailsHtml,
    width: '600px',
    confirmButtonText: 'إغلاق',
    confirmButtonColor: '#007965'
  });
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
    Swal.fire('تنبيه', 'يرجى اختيار مستخدمين أولاً', 'warning');
    return;
  }
  
  if (!bulkDays.value || bulkDays.value < 1) {
    Swal.fire('تنبيه', 'يرجى إدخال عدد أيام صحيح', 'warning');
    return;
  }
  
  const confirm = await Swal.fire({
    title: 'تأكيد جماعي',
    text: `سيتم تفعيل اشتراك لمدة ${bulkDays.value} يوم لـ ${selectedUsers.value.length} مستخدم.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'نعم، نفذ'
  });

  if (confirm.isConfirmed) {
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
    bulkDays.value = ''; // إعادة تعيين الحقل ليكون فارغًا

    if (errorCount === 0) {
      Swal.fire('تم', `تم تفعيل الاشتراكات بنجاح لـ ${successCount} مستخدم`, 'success');
    } else if (successCount === 0) {
      Swal.fire('خطأ', 'فشل في تفعيل أي اشتراكات', 'error');
    } else {
      Swal.fire('تحذير', `تم تفعيل ${successCount} اشتراك بنجاح، وفشل ${errorCount}`, 'warning');
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

onMounted(() => {
  store.loadDashboardData();
});
</script>

<style scoped>
/* استيراد التنسيقات من admin.css و style.css */
/* تم تضمين أهم التنسيقات هنا لضمان عمل المكون بشكل مستقل */

.admin-dashboard {
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
  animation: fadeIn 0.5s ease;
}

/* Stats Cards */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: transform 0.3s ease;
}

.stat-card:hover { transform: translateY(-5px); }

.stat-icon {
  width: 60px; height: 60px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
  background: rgba(0, 121, 101, 0.1);
  color: var(--primary, #007965);
}

.stat-content h3 { margin: 0; font-size: 0.9rem; color: #666; }
.stat-value { font-size: 1.8rem; font-weight: 800; margin: 5px 0; color: #333; }
.stat-trend { font-size: 0.8rem; display: flex; align-items: center; gap: 5px; }
.positive { color: #28a745; }

/* Sections */
.admin-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  margin-bottom: 30px;
  overflow: hidden;
}

.section-header {
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.section-header h2 {
  font-size: 1.4rem;
  color: var(--primary, #007965);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title-with-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.section-title-with-refresh {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
}

/* Charts */
.chart-container { 
  padding: 30px; 
  height: 300px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  background: linear-gradient(135deg, #f8fffe 0%, #e6f7f5 100%);
  border-radius: 12px;
  margin: 20px;
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.08);
}
.chart-toggle {
  background: linear-gradient(135deg, #ffffff, #f8fffe); 
  border: 2px solid #e0f2f1; 
  padding: 8px 16px;
  border-radius: 8px; 
  cursor: pointer; 
  margin-left: 8px;
  display: inline-flex; 
  align-items: center; 
  gap: 6px;
  font-weight: 500;
  color: #007965;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 121, 101, 0.1);
}
.chart-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 121, 101, 0.15);
  border-color: #00a085;
}
.chart-toggle.active { 
  background: linear-gradient(135deg, #007965, #00a085); 
  color: white; 
  border-color: #007965;
  box-shadow: 0 4px 16px rgba(0, 121, 101, 0.3);
}

.chart-refresh-btn {
  margin-right: 8px;
  padding: 8px 12px;
  font-size: 13px;
  min-width: 80px;
}

/* Simple CSS Charts */
.simple-chart { 
  display: flex; 
  align-items: flex-end; 
  height: 200px; 
  gap: 30px; 
  width: 100%; 
  max-width: 500px; 
  padding: 20px;
}
.chart-bar { 
  flex: 1; 
  background: linear-gradient(135deg, #f0f9f8, #e0f2f1); 
  border-radius: 12px 12px 0 0; 
  position: relative; 
  height: 100%; 
  display: flex; 
  align-items: flex-end;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.bar-fill { 
  width: 100%; 
  background: linear-gradient(135deg, #007965, #00a085, #00c9a7); 
  border-radius: 12px 12px 0 0; 
  transition: height 1.5s cubic-bezier(0.4, 0, 0.2, 1); 
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 121, 101, 0.2);
}
.bar-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #00ffcc, #00d4aa, #007965);
  border-radius: 12px 12px 0 0;
}
.bar-label { 
  position: absolute; 
  top: -30px; 
  left: 50%; 
  transform: translateX(-50%); 
  font-weight: 700; 
  color: #007965;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.pie-container { 
  width: 200px; 
  height: 200px; 
  border-radius: 50%; 
  position: relative; 
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.15);
  border: 4px solid white;
}
.pie-segment { 
  width: 100%; 
  height: 100%; 
  border-radius: 50%;
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.5);
}
.pie-legend { 
  margin-right: 30px; 
  display: flex; 
  flex-direction: column; 
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}
.legend-item { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  font-size: 0.9rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}
.legend-item:hover {
  background: rgba(0, 121, 101, 0.05);
}
.legend-color { 
  width: 16px; 
  height: 16px; 
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Line Chart Styles */
.line-svg {
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 255, 254, 0.9));
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 121, 101, 0.1);
}

.line-path {
  fill: none;
  stroke: url(#lineGradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 4px rgba(0, 121, 101, 0.2));
}

.line-point {
  fill: #007965;
  stroke: white;
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0, 121, 101, 0.3));
  transition: all 0.3s ease;
  cursor: pointer;
}

.line-point:hover {
  r: 7;
  fill: #00a085;
  filter: drop-shadow(0 4px 8px rgba(0, 121, 101, 0.5));
}

.line-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 20px;
  font-size: 12px;
  font-weight: 500;
  color: #007965;
}

.line-labels span {
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 121, 101, 0.2);
}

/* Dark Mode Styles for Admin View */
body.dark .admin-page {
  background-color: var(--dark-bg);
  color: var(--dark-text-primary);
}

body.dark table {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
}

body.dark th {
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-hover));
  color: var(--dark-text-primary);
}

body.dark td {
  background-color: var(--dark-surface);
  color: var(--dark-text-primary);
  border-color: var(--dark-border);
}

body.dark tbody tr:hover {
  background-color: var(--dark-surface-hover);
}

body.dark .input-field {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

body.dark .input-field:focus {
  border-color: var(--dark-accent);
  box-shadow: 0 0 0 2px rgba(0, 121, 101, 0.2);
}

body.dark .btn {
  background-color: var(--dark-accent);
  color: var(--dark-text-primary);
  border-color: var(--dark-accent);
}

body.dark .btn:hover {
  background-color: var(--dark-accent-hover);
}

body.dark .stats-card {
  background-color: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

body.dark .stats-value {
  color: var(--dark-accent);
}

body.dark .stats-label {
  color: var(--dark-text-secondary);
}

body.dark .line-labels span {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

/* Tables */
.table-container {
  overflow-x: auto;
  width: 100%;
  -webkit-overflow-scrolling: touch;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  table-layout: fixed;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
}

tbody tr:hover {
  background: rgba(0, 121, 101, 0.03);
  transition: background-color 0.2s ease;
}
th, td {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  min-width: 80px;
  vertical-align: middle;
}

td {
  text-align: right;
  color: #333;
  font-weight: 500;
}
th {
  background: linear-gradient(135deg, var(--primary), #005a4b);
  color: white;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 10;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  border-bottom: 2px solid rgba(255,255,255,0.2);
  padding: 16px 12px;
  vertical-align: middle;
}

/* Specific column widths for admin tables */
#logged-in-users-table th:nth-child(1), #logged-in-users-table td:nth-child(1) { width: 25px; min-width: 25px; padding: 15px 5px; } /* Checkbox */
#logged-in-users-table th:nth-child(2), #logged-in-users-table td:nth-child(2) { width: 80px; min-width: 80px; } /* ID */
#logged-in-users-table th:nth-child(3), #logged-in-users-table td:nth-child(3) { width: 150px; min-width: 150px; } /* Name */
#logged-in-users-table th:nth-child(4), #logged-in-users-table td:nth-child(4) { width: 200px; min-width: 200px; } /* Email */
#logged-in-users-table th:nth-child(5), #logged-in-users-table td:nth-child(5) { width: 120px; min-width: 120px; } /* Date */
#logged-in-users-table th:nth-child(6), #logged-in-users-table td:nth-child(6) { width: 100px; min-width: 100px; } /* Duration */
#logged-in-users-table th:nth-child(7), #logged-in-users-table td:nth-child(7) { width: 80px; min-width: 80px; } /* Action */

/* Pending subscriptions table */
.admin-section:nth-child(4) table th:nth-child(1), .admin-section:nth-child(4) table td:nth-child(1) { width: 150px; min-width: 150px; } /* User */
.admin-section:nth-child(4) table th:nth-child(2), .admin-section:nth-child(4) table td:nth-child(2) { width: 120px; min-width: 120px; } /* Plan */
.admin-section:nth-child(4) table th:nth-child(3), .admin-section:nth-child(4) table td:nth-child(3) { width: 150px; min-width: 150px; } /* Transaction */
.admin-section:nth-child(4) table th:nth-child(4), .admin-section:nth-child(4) table td:nth-child(4) { width: 100px; min-width: 100px; } /* Date */
.admin-section:nth-child(4) table th:nth-child(5), .admin-section:nth-child(4) table td:nth-child(5) { width: 100px; min-width: 100px; } /* Actions */

/* All subscriptions table */
.admin-section:nth-child(5) table th:nth-child(1), .admin-section:nth-child(5) table td:nth-child(1) { width: 150px; min-width: 150px; } /* User */
.admin-section:nth-child(5) table th:nth-child(2), .admin-section:nth-child(5) table td:nth-child(2) { width: 120px; min-width: 120px; } /* Plan */
.admin-section:nth-child(5) table th:nth-child(3), .admin-section:nth-child(5) table td:nth-child(3) { width: 100px; min-width: 100px; } /* Start */
.admin-section:nth-child(5) table th:nth-child(4), .admin-section:nth-child(5) table td:nth-child(4) { width: 100px; min-width: 100px; } /* End */
.admin-section:nth-child(5) table th:nth-child(5), .admin-section:nth-child(5) table td:nth-child(5) { width: 100px; min-width: 100px; } /* Status */
.admin-section:nth-child(5) table th:nth-child(6), .admin-section:nth-child(5) table td:nth-child(6) { width: 100px; min-width: 100px; } /* Actions */
.status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: white; }
.status-active { background: #28a745; }
.status-pending { background: #ffc107; color: #333; }
.status-expired { background: #dc3545; }
.status-cancelled { background: #6c757d; }

/* Buttons */
.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.small-refresh-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 14px;
}

.action-btn {
  width: 32px; height: 32px; border-radius: 6px; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; margin-left: 5px;
  transition: transform 0.2s;
}
.action-btn:hover { transform: scale(1.1); }
.approve { background: rgba(40, 167, 69, 0.1); color: #28a745; }
.reject { background: rgba(220, 53, 69, 0.1); color: #dc3545; }
.delete { background: rgba(108, 117, 125, 0.1); color: #6c757d; }
.deactivate { background: rgba(255, 193, 7, 0.1); color: #856404; }
.reactivate { background: rgba(23, 162, 184, 0.1); color: #17a2b8; }
.details { background: rgba(52, 152, 219, 0.1); color: #3498db; }
.manual-activate { background: rgba(0, 123, 255, 0.1); color: #007bff; }

/* Filters */
.table-header-info { 
  padding: 15px 25px; 
  background: #fcfcfc; 
  display: flex; 
  flex-direction: column; 
  gap: 15px; 
}

.filter-select { 
  padding: 8px 12px; 
  border-radius: 8px; 
  border: 1px solid #ddd; 
  background: white; 
  outline: none; 
}

/* New layout for users search and bulk actions */
.users-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.users-search-row .users-search-input {
  width: 250px;
  flex-shrink: 0;
}

.users-bulk-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.users-bulk-actions .subscription-days-input {
  width: 180px;
  flex-shrink: 0;
}

.btn-success {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.btn-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Input fields styling */
.subscription-days-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: #333;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.subscription-days-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 121, 101, 0.1);
  background: #f8fffe;
}

.subscription-days-input:hover {
  border-color: #007965;
}

/* Users search input */
.users-search-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.users-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 121, 101, 0.1);
}

.users-search-input:hover {
  border-color: #007965;
}

/* Dark Mode */
:global(body.dark) .admin-dashboard { background: #121212; color: #eee; }
:global(body.dark) .stat-card, :global(body.dark) .admin-section { background: #1e1e1e; box-shadow: none; border: 1px solid #333; }
:global(body.dark) .stat-value { color: #eee; }
:global(body.dark) th {
  background: linear-gradient(135deg, rgba(0, 200, 150, 0.8), rgba(0, 150, 130, 0.9));
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}
:global(body.dark) td { border-bottom-color: #333; color: #ddd; }
:global(body.dark) .section-header { border-bottom-color: #333; }
:global(body.dark) .table-header-info { background: #252525; }
:global(body.dark) input, :global(body.dark) select { background: #333; color: #eee; border-color: #555; }
:global(body.dark) table { background: #1e1e1e; border-color: rgba(0, 200, 150, 0.3); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); }
:global(body.dark) tbody tr:hover { background: rgba(0, 200, 150, 0.08); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Responsive table behavior */
@media (max-width: 768px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 800px;
    font-size: 0.9rem;
  }

  th, td {
    padding: 12px 8px;
    min-width: 60px;
  }

  /* Adjust column widths for mobile */
  #logged-in-users-table th:nth-child(1), #logged-in-users-table td:nth-child(1) { width: 25px; min-width: 25px; padding: 12px 3px; }
  #logged-in-users-table th:nth-child(2), #logged-in-users-table td:nth-child(2) { width: 70px; min-width: 70px; }
  #logged-in-users-table th:nth-child(3), #logged-in-users-table td:nth-child(3) { width: 120px; min-width: 120px; }
  #logged-in-users-table th:nth-child(4), #logged-in-users-table td:nth-child(4) { width: 150px; min-width: 150px; }
  #logged-in-users-table th:nth-child(5), #logged-in-users-table td:nth-child(5) { width: 100px; min-width: 100px; }
  #logged-in-users-table th:nth-child(6), #logged-in-users-table td:nth-child(6) { width: 80px; min-width: 80px; }
  #logged-in-users-table th:nth-child(7), #logged-in-users-table td:nth-child(7) { width: 70px; min-width: 70px; }

  .admin-section:nth-child(4) table th:nth-child(1), .admin-section:nth-child(4) table td:nth-child(1) { width: 120px; min-width: 120px; }
  .admin-section:nth-child(4) table th:nth-child(2), .admin-section:nth-child(4) table td:nth-child(2) { width: 100px; min-width: 100px; }
  .admin-section:nth-child(4) table th:nth-child(3), .admin-section:nth-child(4) table td:nth-child(3) { width: 120px; min-width: 120px; }
  .admin-section:nth-child(4) table th:nth-child(4), .admin-section:nth-child(4) table td:nth-child(4) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(4) table th:nth-child(5), .admin-section:nth-child(4) table td:nth-child(5) { width: 80px; min-width: 80px; }

  .admin-section:nth-child(5) table th:nth-child(1), .admin-section:nth-child(5) table td:nth-child(1) { width: 120px; min-width: 120px; }
  .admin-section:nth-child(5) table th:nth-child(2), .admin-section:nth-child(5) table td:nth-child(2) { width: 100px; min-width: 100px; }
  .admin-section:nth-child(5) table th:nth-child(3), .admin-section:nth-child(5) table td:nth-child(3) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(5) table th:nth-child(4), .admin-section:nth-child(5) table td:nth-child(4) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(5) table th:nth-child(5), .admin-section:nth-child(5) table td:nth-child(5) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(5) table th:nth-child(6), .admin-section:nth-child(5) table td:nth-child(6) { width: 80px; min-width: 80px; }

  .table-header-info {
    flex-direction: column;
    gap: 10px;
  }

  .table-actions {
    width: 100%;
  }

  .users-search-input {
    width: 100%;
  }

  .subscription-days-input,
  .users-search-input {
    height: 36px;
    font-size: 13px;
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  table {
    min-width: 750px;
    font-size: 0.8rem;
  }

  th, td {
    padding: 8px 6px;
    min-width: 50px;
  }

  /* Further reduce column widths for very small screens */
  #logged-in-users-table th:nth-child(1), #logged-in-users-table td:nth-child(1) { width: 20px; min-width: 20px; padding: 8px 2px; }
  #logged-in-users-table th:nth-child(2), #logged-in-users-table td:nth-child(2) { width: 60px; min-width: 60px; }
  #logged-in-users-table th:nth-child(3), #logged-in-users-table td:nth-child(3) { width: 100px; min-width: 100px; }
  #logged-in-users-table th:nth-child(4), #logged-in-users-table td:nth-child(4) { width: 120px; min-width: 120px; }
  #logged-in-users-table th:nth-child(5), #logged-in-users-table td:nth-child(5) { width: 80px; min-width: 80px; }
  #logged-in-users-table th:nth-child(6), #logged-in-users-table td:nth-child(6) { width: 70px; min-width: 70px; }
  #logged-in-users-table th:nth-child(7), #logged-in-users-table td:nth-child(7) { width: 60px; min-width: 60px; }

  .admin-section:nth-child(4) table th:nth-child(1), .admin-section:nth-child(4) table td:nth-child(1) { width: 100px; min-width: 100px; }
  .admin-section:nth-child(4) table th:nth-child(2), .admin-section:nth-child(4) table td:nth-child(2) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(4) table th:nth-child(3), .admin-section:nth-child(4) table td:nth-child(3) { width: 100px; min-width: 100px; }
  .admin-section:nth-child(4) table th:nth-child(4), .admin-section:nth-child(4) table td:nth-child(4) { width: 70px; min-width: 70px; }
  .admin-section:nth-child(4) table th:nth-child(5), .admin-section:nth-child(4) table td:nth-child(5) { width: 70px; min-width: 70px; }

  .admin-section:nth-child(5) table th:nth-child(1), .admin-section:nth-child(5) table td:nth-child(1) { width: 100px; min-width: 100px; }
  .admin-section:nth-child(5) table th:nth-child(2), .admin-section:nth-child(5) table td:nth-child(2) { width: 80px; min-width: 80px; }
  .admin-section:nth-child(5) table th:nth-child(3), .admin-section:nth-child(5) table td:nth-child(3) { width: 70px; min-width: 70px; }
  .admin-section:nth-child(5) table th:nth-child(4), .admin-section:nth-child(5) table td:nth-child(4) { width: 70px; min-width: 70px; }
  .admin-section:nth-child(5) table th:nth-child(5), .admin-section:nth-child(5) table td:nth-child(5) { width: 70px; min-width: 70px; }
  .admin-section:nth-child(5) table th:nth-child(6), .admin-section:nth-child(5) table td:nth-child(6) { width: 70px; min-width: 70px; }

  .section-header {
    padding: 15px;
  }

  .section-header h2 {
    font-size: 1.2rem;
  }

  .subscription-days-input,
  .users-search-input {
    height: 32px;
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>