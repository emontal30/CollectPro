<template>
  <div class="admin-dashboard">
    
    <PageHeader 
      title="لوحة التحكم" 
      subtitle="إدارة النظام والمستخدمين والإحصائيات"
      icon="⚙️"
    />

    <!-- Stats Cards -->
    <div class="stats-container">
      <div v-for="(stat, key) in adminStats" :key="key" class="stat-card">
        <div class="stat-icon"><i :class="stat.icon"></i></div>
        <div class="stat-content">
          <h3>{{ stat.label }}</h3>
          <p class="stat-value">{{ store.stats[key] || 0 }} {{ stat.unit }}</p>
          
          <div v-if="key === 'activeUsers'" class="stat-filter-wrapper">
             <select v-model="store.filters.activeUsersPeriod" class="stat-select" @change="store.fetchStats">
               <option :value="1">آخر 24 ساعة</option>
               <option :value="7">آخر 7 أيام</option>
               <option :value="30">آخر 30 يوم</option>
             </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="admin-section">
      <div class="section-header">
        <div class="header-main">
          <h2><i class="fas fa-users-cog"></i> المستخدمون المسجلون</h2>
          <div class="bulk-actions" v-if="selectedUsers.length > 0">
            <input v-model.number="bulkDays" type="number" class="bulk-input" placeholder="أيام الاشتراك">
            <button class="btn-bulk" @click="handleBulkActivate">تفعيل للمحددين ({{ selectedUsers.length }})</button>
          </div>
        </div>
      </div>
      <div class="table-header-info">
        <input v-model="store.filters.usersSearch" type="text" class="filter-select users-search-input" placeholder="ابحث بالاسم أو البريد" />
      </div>
      <div class="table-container">
        <table id="logged-in-users-table">
          <thead>
            <tr>
              <th class="text-center col-selection">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
              </th>
              <th>المستخدم</th>
              <th>تاريخ التسجيل</th>
              <th>حالة الاشتراك</th>
              <th class="col-subscription-days">إضافة أيام</th>
              <th class="text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td class="text-center col-selection">
                <input type="checkbox" v-model="selectedUsers" :value="user.id">
              </td>
              <td>
                <div class="user-info-cell">
                  <div class="user-name">{{ user.full_name || 'مستخدم' }}</div>
                  <div class="user-email">{{ user.email }}</div>
                  <div class="user-id-text">ID: {{ user.id?.slice(0, 8) }}</div>
                </div>
              </td>
              <td>{{ store.formatDate(user.created_at) }}</td>
              <td>
                <span v-if="user.hasActiveSub" class="status-badge status-active">فعال حتى {{ store.formatDate(user.expiryDate) }}</span>
                <span v-else class="status-badge status-cancelled">غير نشط</span>
              </td>
              <td class="col-subscription-days">
                <input v-model="user.manualDays" type="number" class="subscription-days-input" placeholder="أيام">
              </td>
              <td class="col-actions text-center">
                <button 
                  class="action-btn manual-activate"
                  :title="user.hasActiveSub ? 'إضافة أيام للاشتراك الحالي' : 'تفعيل اشتراك جديد'"
                  @click="store.activateManualSubscription(user.id, user.manualDays, user.hasActiveSub)">
                  <i class="fas fa-play-circle"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredUsers.length === 0" class="no-data"><p>لا يوجد مستخدمون مطابقون للبحث</p></div>
      </div>
    </div>

    <!-- Pending Subscriptions -->
    <div class="admin-section">
      <div class="section-header">
        <h2><i class="fas fa-clock"></i> طلبات الاشتراك قيد المراجعة ({{ store.pendingSubscriptions.length }})</h2>
      </div>
      <div class="table-container">
        <table v-if="store.pendingSubscriptions.length > 0">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الخطة</th>
              <th>تاريخ الطلب</th>
              <th class="text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.pendingSubscriptions" :key="sub.id">
              <td>
                <div class="user-info-cell">
                  <div class="user-name">{{ sub.users?.full_name || 'مستخدم' }}</div>
                  <div class="user-email">{{ sub.users?.email }}</div>
                  <div class="user-id-text">ID: {{ sub.user_id?.slice(0, 8) }}</div>
                </div>
              </td>
              <td>{{ sub.subscription_plans?.name_ar || sub.plan_name }} ({{ sub.subscription_plans?.duration_months }} شهر)</td>
              <td>{{ store.formatDate(sub.created_at) }}</td>
              <td class="actions-cell">
                <button class="action-btn approve" title="تفعيل" @click="store.handleSubscriptionAction(sub.id, 'approve')"><i class="fas fa-check"></i></button>
                <button class="action-btn reject" title="رفض" @click="store.handleSubscriptionAction(sub.id, 'reject')"><i class="fas fa-times"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="no-data"><p>لا توجد طلبات معلقة</p></div>
      </div>
    </div>

    <!-- All Subscriptions -->
    <div class="admin-section">
       <div class="section-header">
        <h2><i class="fas fa-list"></i> جميع الاشتراكات</h2>
      </div>
      <div class="table-header-info">
        <div class="filter-container">
          <select v-model="store.filters.status" class="filter-select" @change="store.fetchAllSubscriptions(true)">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">معلق</option>
          </select>
           <select v-model="store.filters.expiry" class="filter-select" @change="store.fetchAllSubscriptions(true)">
            <option value="all">كل الصلاحيات</option>
            <option value="expiring_soon">قارب على الانتهاء (7 أيام)</option>
          </select>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الحالة</th>
              <th>تاريخ الانتهاء</th>
              <th class="text-center">الأيام المتبقية</th>
              <th class="text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.allSubscriptions" :key="sub.id">
              <td>
                <div class="user-info-cell">
                  <div class="user-name">{{ sub.users?.full_name || sub.users?.email }}</div>
                  <div class="user-email">{{ sub.users?.email }}</div>
                  <div class="user-id-text">ID: {{ sub.user_id?.slice(0, 8) }}</div>
                </div>
              </td>
              <td>
                <span class="status-badge" :class="`status-${sub.status}`">
                  {{ sub.status === 'cancelled' ? 'معلق' : sub.status }}
                </span>
              </td>
              <td>{{ store.formatDate(sub.end_date) }}</td>
              <td class="text-center font-bold">
                <span v-if="sub.status === 'active'" :style="{ color: getRemainingDaysColor(sub.end_date) }">
                  {{ calculateRemainingDays(sub.end_date) }} يوم
                </span>
                <span v-else>-</span>
              </td>
              <td class="actions-cell">
                 <button v-if="sub.status === 'active'" class="action-btn deactivate" title="تعليق" @click="store.handleSubscriptionAction(sub.id, 'cancel')">
                   <i class="fas fa-pause"></i>
                 </button>
                 <button v-if="sub.status === 'cancelled'" class="action-btn reactivate" title="استئناف" @click="store.handleSubscriptionAction(sub.id, 'reactivate')">
                   <i class="fas fa-play"></i>
                 </button>
                <button class="action-btn delete" title="حذف" @click="store.handleSubscriptionAction(sub.id, 'delete')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useNotifications } from '@/composables/useNotifications';

const store = useAdminStore();
const { confirm, success, error } = useNotifications();

const adminStats = {
  totalUsers: { label: 'إجمالي المستخدمين', icon: 'fas fa-users', unit: '' },
  activeUsers: { label: 'مستخدمون فعالون', icon: 'fas fa-user-check', unit: '' },
  pendingRequests: { label: 'طلبات قيد المراجعة', icon: 'fas fa-clock', unit: '' },
  activeSubscriptions: { label: 'الاشتراكات النشطة', icon: 'fas fa-check-circle', unit: '' },
  totalRevenue: { label: 'إجمالي الإيرادات', icon: 'fas fa-money-bill-wave', unit: 'ج.م' },
};

// --- Bulk Actions logic ---
const selectedUsers = ref([]);
const bulkDays = ref(null);

const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && selectedUsers.value.length === filteredUsers.value.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = [];
  } else {
    selectedUsers.value = filteredUsers.value.map(u => u.id);
  }
};

const handleBulkActivate = async () => {
  if (!bulkDays.value || bulkDays.value < 1) {
    return error('يرجى إدخال عدد أيام صحيح للتفعيل الجماعي');
  }

  const result = await confirm({
    title: 'تأكيد التفعيل الجماعي',
    text: `هل أنت متأكد من تفعيل اشتراك لمدة ${bulkDays.value} يوم لعدد ${selectedUsers.value.length} مستخدم؟`,
    icon: 'question'
  });

  if (result.isConfirmed) {
    let successCount = 0;
    for (const userId of selectedUsers.value) {
      // Logic for bulk activation (can be optimized but keeping simple for now)
      try {
        await store.activateManualSubscription(userId, bulkDays.value, false, true);
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    selectedUsers.value = [];
    bulkDays.value = null;
    success(`تم تفعيل الاشتراك بنجاح لـ ${successCount} مستخدم.`);
    await store.loadDashboardData();
  }
};

// Filtering & Helpers
const filteredUsers = computed(() => {
  if (!store.filters.usersSearch) return store.usersList;
  const q = store.filters.usersSearch.toLowerCase();
  return store.usersList.filter(u =>
    (u.full_name && u.full_name.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q))
  );
});

const calculateRemainingDays = (endDate) => {
  if (!endDate) return 0;
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
};

const getRemainingDaysColor = (endDate) => {
  const days = calculateRemainingDays(endDate);
  if (days <= 3) return '#e74c3c';
  if (days <= 7) return '#f39c12';
  return 'inherit';
};

onMounted(() => {
  store.loadDashboardData();
});
</script>

<style scoped>
.admin-dashboard { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
.stats-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 40px; }
.stat-card { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 20px; position: relative; }
.stat-icon { font-size: 1.8rem; color: var(--primary); }
.stat-value { font-size: 1.8rem; font-weight: 700; color: var(--primary); margin: 0; }

.stat-filter-wrapper { margin-top: 10px; }
.stat-select { padding: 4px 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 0.8rem; outline: none; }

.admin-section { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 32px; }
.section-header { background: var(--primary); padding: 20px; color: white; border-radius: 12px 12px 0 0; }
.header-main { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }

.bulk-actions { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 8px; }
.bulk-input { width: 80px; padding: 6px; border-radius: 4px; border: none; outline: none; color: #333; }
.btn-bulk { background: #fff; color: var(--primary); border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-bulk:hover { background: #eef; }

.table-header-info { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; }
.filter-select, .users-search-input { padding: 10px; border-radius: 8px; border: 1px solid #ced4da; min-width: 200px; }
.table-container { padding: 20px; overflow-x: auto; }

.col-selection { width: 40px; max-width: 40px; padding-left: 8px !important; padding-right: 8px !important; }
.col-actions { text-align: center !important; vertical-align: middle !important; }
.action-btn { display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin: 0 auto; }
.action-btn.manual-activate { background: var(--primary); color: white; }
.action-btn.deactivate { background: #f39c12; color: white; }
.action-btn.reactivate { background: var(--success); color: white; }
.action-btn.delete { background: #343a40; color: white; }

.actions-cell { display: flex; gap: 8px; justify-content: center; align-items: center; }
.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.status-active { background: rgba(39, 174, 96, 0.1); color: var(--success); }
.status-cancelled { background: rgba(243, 156, 18, 0.1); color: #f39c12; }
.no-data { text-align: center; padding: 40px; color: var(--gray-500); }
.text-center { text-align: center !important; }

/* User Info Styling */
.user-info-cell { text-align: right; display: flex; flex-direction: column; gap: 2px; }
.user-name { font-weight: 600; color: #333; }
.user-email { font-size: 0.85rem; color: #666; }
.user-id-text { font-size: 0.7rem; color: #999; font-family: var(--font-family-mono); }
</style>
