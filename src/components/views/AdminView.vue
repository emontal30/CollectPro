<template>
  <div class="admin-dashboard">
    
    <PageHeader 
      title="لوحة التحكم" 
      subtitle="إدارة النظام والمستخدمين والإحصائيات"
      icon="⚙️"
    />

    <!-- قسم التحكم في حماية النظام (جديد) -->
    <div class="admin-section protection-card">
      <div class="admin-section-header">
        <h2><i class="fas fa-shield-alt"></i> نظام حماية الاشتراكات</h2>
      </div>
      <div class="protection-content">
        <div class="protection-info">
          <h4 class="protection-title">وضع القفل (Subscription Only)</h4>
          <p class="protection-desc">
            عند تفعيل هذا الخيار، سيتم منع أي مستخدم غير مشترك من الوصول لصفحات العمل (الإدخال، التحصيل، الأرشيف).
            <span class="warning-text">الحالة الحالية: {{ store.isSubscriptionEnforced ? 'مفعل 🔒' : 'مجاني 🔓' }}</span>
          </p>
        </div>
        
        <div class="switch-wrapper">
          <label class="switch">
            <input 
              type="checkbox" 
              :checked="store.isSubscriptionEnforced" 
              @change="handleToggleEnforcement"
            >
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-container">
      <div v-for="(stat, key) in adminStats" :key="key" class="stat-card">
        <div class="stat-icon"><i :class="stat.icon"></i></div>
        <div class="stat-content">
          <h3>{{ stat.label }}</h3>
          <p class="stat-value">{{ store.stats[key] || 0 }} {{ stat.unit }}</p>
          
          <div v-if="key === 'activeUsers'" class="mt-2">
             <select v-model="store.filters.activeUsersPeriod" class="archive-select p-1 text-xs" @change="store.fetchStats">
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
      <div class="admin-section-header">
        <div class="d-flex align-center gap-3">
          <h2><i class="fas fa-users-cog"></i> المستخدمون المسجلون</h2>
          <div class="bulk-actions" v-if="selectedUsers.length > 0">
            <input v-model.number="bulkDays" type="number" class="bulk-input" placeholder="أيام">
            <button class="btn btn-secondary btn-sm p-1" @click="handleBulkActivate">تفعيل للمحددين ({{ selectedUsers.length }})</button>
          </div>
        </div>
      </div>
      
      <div class="p-3 bg-light border-bottom">
        <div class="search-input-wrapper w-full">
           <i class="fas fa-search control-icon"></i>
           <input v-model="store.filters.usersSearch" type="text" class="search-input" placeholder="ابحث بالاسم أو البريد" />
        </div>
      </div>

      <div class="table-wrapper m-0 rounded-none shadow-none">
        <table id="logged-in-users-table" class="modern-table">
          <thead>
            <tr>
              <th class="th-checkbox">
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
              <td class="td-checkbox">
                <input type="checkbox" v-model="selectedUsers" :value="user.id">
              </td>
              <td>
                <div class="user-info-cell">
                  <div class="user-name font-bold">{{ user.full_name || 'مستخدم' }}</div>
                  <div class="user-email text-xs text-muted">{{ user.email }}</div>
                  <div class="user-short-id">ID: {{ user.id.slice(0, 8) }}</div>
                </div>
              </td>
              <td>{{ store.formatDate(user.created_at) }}</td>
              <td>
                <span v-if="user.hasActiveSub" class="status-badge status-active">فعال حتى {{ store.formatDate(user.expiryDate) }}</span>
                <span v-else class="status-badge status-cancelled">غير نشط</span>
              </td>
              <td class="col-subscription-days">
                <input v-model="user.manualDays" type="number" class="editable-input w-full" placeholder="أيام">
              </td>
              <td class="text-center">
                <button 
                  class="btn btn--icon"
                  :title="user.hasActiveSub ? 'إضافة أيام للاشتراك الحالي' : 'تفعيل اشتراك جديد'"
                  @click="store.activateManualSubscription(user.id, user.manualDays, user.hasActiveSub)">
                  <i class="fas fa-play-circle"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pending Subscriptions -->
    <div class="admin-section">
      <div class="admin-section-header">
        <h2><i class="fas fa-clock"></i> طلبات الاشتراك قيد المراجعة ({{ store.pendingSubscriptions.length }})</h2>
      </div>
      <div class="table-wrapper m-0 rounded-none shadow-none">
        <table class="modern-table" v-if="store.pendingSubscriptions.length > 0">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الخطة</th>
              <th>رقم العملية</th>
              <th>تاريخ الطلب</th>
              <th class="text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.pendingSubscriptions" :key="sub.id">
              <td>
                <div class="user-info-cell">
                  <div class="user-name font-bold">{{ sub.users?.full_name || 'مستخدم' }}</div>
                  <div class="user-email text-xs text-muted">{{ sub.users?.email }}</div>
                  <div v-if="sub.user_id" class="user-short-id">ID: {{ sub.user_id.slice(0, 8) }}</div>
                </div>
              </td>
              <td>{{ sub.subscription_plans?.name_ar || sub.plan_name }} ({{ sub.subscription_plans?.duration_months }} شهر)</td>
              <td class="font-mono text-primary font-bold">{{ sub.transaction_id || '-' }}</td>
              <td>{{ store.formatDate(sub.created_at) }}</td>
              <td class="text-center d-flex justify-center gap-2">
                <button class="btn btn--icon text-success" title="تفعيل" @click="store.handleSubscriptionAction(sub.id, 'approve')"><i class="fas fa-check"></i></button>
                <button class="btn btn--icon text-danger" title="رفض" @click="store.handleSubscriptionAction(sub.id, 'reject')"><i class="fas fa-times"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="no-data p-5 text-center text-muted"><p>لا توجد طلبات معلقة</p></div>
      </div>
    </div>

    <!-- All Subscriptions -->
    <div class="admin-section">
       <div class="admin-section-header">
        <h2><i class="fas fa-list"></i> جميع الاشتراكات</h2>
      </div>
      <div class="p-3 bg-light border-bottom d-flex gap-2">
          <select v-model="store.filters.status" class="archive-select" style="max-width: 200px" @change="store.fetchAllSubscriptions(true)">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">معلق</option>
          </select>
           <select v-model="store.filters.expiry" class="archive-select" style="max-width: 200px" @change="store.fetchAllSubscriptions(true)">
            <option value="all">كل الصلاحيات</option>
            <option value="expiring_soon">قارب على الانتهاء (7 أيام)</option>
          </select>
      </div>
      <div class="table-wrapper m-0 rounded-none shadow-none">
        <table class="modern-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الحالة</th>
              <th>تاريخ الانتهاء</th>
              <th class="text-center">الأيام</th>
              <th class="text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in store.allSubscriptions" :key="sub.id">
              <td>
                <div class="user-info-cell">
                  <div class="user-name font-bold">{{ sub.users?.full_name || sub.users?.email }}</div>
                  <div class="user-email text-xs text-muted">{{ sub.users?.email }}</div>
                  <div v-if="sub.user_id" class="user-short-id">ID: {{ sub.user_id.slice(0, 8) }}</div>
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
                  {{ calculateRemainingDays(sub.end_date) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="text-center d-flex justify-center gap-2">
                 <button v-if="sub.status === 'active'" class="btn btn--icon text-warning" title="تعليق" @click="store.handleSubscriptionAction(sub.id, 'cancel')">
                   <i class="fas fa-pause"></i>
                 </button>
                 <button v-if="sub.status === 'cancelled'" class="btn btn--icon text-success" title="استئناف" @click="store.handleSubscriptionAction(sub.id, 'reactivate')">
                   <i class="fas fa-play"></i>
                 </button>
                <button class="btn btn--icon text-danger" title="حذف" @click="store.handleSubscriptionAction(sub.id, 'delete')">
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
import { ref, onMounted, computed, inject } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useAdminStore();
const { confirm, addNotification } = inject('notifications');

const adminStats = {
  totalUsers: { label: 'إجمالي المستخدمين', icon: 'fas fa-users', unit: '' },
  activeUsers: { label: 'مستخدمون فعالون', icon: 'fas fa-user-check', unit: '' },
  pendingRequests: { label: 'طلبات قيد المراجعة', icon: 'fas fa-clock', unit: '' },
  activeSubscriptions: { label: 'الاشتراكات النشطة', icon: 'fas fa-check-circle', unit: '' },
  totalRevenue: { label: 'إجمالي الإيرادات', icon: 'fas fa-money-bill-wave', unit: 'ج.م' },
};

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
    return addNotification('يرجى إدخال عدد أيام صحيح', 'error');
  }

  const result = await confirm({
    title: 'تأكيد التفعيل الجماعي',
    text: `هل أنت متأكد من تفعيل اشتراك لمدة ${bulkDays.value} يوم لعدد ${selectedUsers.value.length} مستخدم؟`,
    icon: 'question'
  });

  if (result.isConfirmed) {
    let successCount = 0;
    for (const userId of selectedUsers.value) {
      try {
        await store.activateManualSubscription(userId, bulkDays.value, false, true);
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    selectedUsers.value = [];
    bulkDays.value = null;
    addNotification(`تم تفعيل الاشتراك لـ ${successCount} مستخدم.`, 'success');
    await store.loadDashboardData();
  }
};

const handleToggleEnforcement = async (event) => {
    const newVal = event.target.checked;
    const result = await confirm({
        title: newVal ? 'تفعيل وضع الحماية' : 'إيقاف وضع الحماية',
        text: newVal 
            ? 'هل أنت متأكد؟ سيتم منع جميع المستخدمين غير المشتركين من العمل على التطبيق فوراً.' 
            : 'هل أنت متأكد؟ سيتم السماح لجميع المستخدمين بالعمل على التطبيق مجاناً.',
        icon: newVal ? 'warning' : 'info',
        confirmButtonText: newVal ? 'تفعيل القفل 🔒' : 'فتح التطبيق 🔓',
        confirmButtonColor: newVal ? 'var(--danger)' : 'var(--primary)'
    });

    if (result.isConfirmed) {
        await store.toggleSubscriptionEnforcement(newVal);
    } else {
        // إعادة الزر لوضعه السابق إذا ألغى المستخدم
        event.target.checked = !newVal;
    }
};

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
  if (days <= 3) return '#ef4444';
  if (days <= 7) return '#f59e0b';
  return 'inherit';
};

onMounted(() => {
  store.loadDashboardData();
});
</script>

<style scoped>
.protection-card {
  border: 1px solid var(--border-color);
  background: var(--surface-bg);
  margin-bottom: 2rem;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.protection-content {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.protection-info { flex: 1; }
.protection-title { margin: 0 0 0.5rem; font-size: 1.1rem; color: var(--text-main); }
.protection-desc { margin: 0; font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; }
.warning-text { display: block; margin-top: 0.5rem; font-weight: 700; color: var(--primary); }

/* Switch Styles */
.switch { position: relative; display: inline-block; width: 60px; height: 34px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: var(--primary); }
input:focus + .slider { box-shadow: 0 0 1px var(--primary); }
input:checked + .slider:before { transform: translateX(26px); }
.slider.round { border-radius: 34px; }
.slider.round:before { border-radius: 50%; }

/* الباقي... */
.bulk-input { 
  width: 70px; 
  padding: 4px 8px; 
  border-radius: 6px; 
  border: 1px solid rgba(255,255,255,0.3); 
  background: rgba(255,255,255,0.1); 
  color: white;
  font-weight: bold;
}
.bulk-input::placeholder { color: rgba(255,255,255,0.6); }

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
.status-active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-cancelled { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.status-expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.user-info-cell { text-align: right; }
.user-short-id { 
  display: inline-block;
  font-size: 10px;
  color: var(--gray-600);
  font-family: var(--font-family-mono);
  background: var(--gray-100);
  padding: 2px 8px;
  border-radius: 6px;
  margin-top: 4px;
}

body.dark .user-short-id { background: rgba(255, 255, 255, 0.05); color: var(--gray-400); }
body.dark .bg-light { background-color: #0f172a !important; border-color: #334155 !important; }
body.dark .border-bottom { border-color: #334155 !important; }
</style>