<template>
  <div class="admin-dashboard">
    <PageHeader 
      title="لوحة التحكم" 
      subtitle="إدارة النظام والمستخدمين والإحصائيات"
      icon="⚙️"
    />

    <div v-if="store.fetchError" class="alert alert-danger m-3 d-flex justify-between align-center">
      <span><i class="fas fa-exclamation-triangle"></i> {{ store.fetchError }}</span>
      <button class="btn btn-sm btn-danger" @click="store.loadDashboardData(true)">إعادة المحاولة</button>
    </div>

    <section class="admin-section protection-card">
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
    </section>

    <div class="stats-container">
      <div 
        v-for="(stat, key) in adminStats" 
        :key="key" 
        class="stat-card" 
        :class="{ 'cursor-pointer hover-effect': key === 'pendingRequests' || key === 'appErrors' }"
        @click="handleStatClick(key)"
      >
        <div class="stat-icon"><i :class="stat.icon"></i></div>
        <div class="stat-content">
          <h3>{{ stat.label }}</h3>
          <p class="stat-value">
             <template v-if="key === 'appErrors'">
               <span>{{ store.appErrors.length }}</span>
             </template>
             <template v-else>
               <span v-if="store.isLoading && !store.stats[key]" class="spinner-tiny"></span>
               <span v-else>{{ store.stats[key] || 0 }}</span>
             </template>
             {{ stat.unit }}
          </p>
          
          <div v-if="key === 'activeUsers'" class="mt-2">
             <select 
               v-model="store.filters.activeUsersPeriod" 
               class="archive-select p-1 text-xs" 
               @change="handleActiveUsersPeriodChange"
             >
               <option :value="1">آخر 24 ساعة</option>
               <option :value="7">آخر 7 أيام</option>
               <option :value="30">آخر 30 يوم</option>
             </select>
          </div>
        </div>
      </div>
    </div>

    <section class="admin-section">
      <div class="admin-section-header">
        <div class="d-flex align-center gap-3">
          <h2><i class="fas fa-users-cog"></i> المستخدمون المسجلون</h2>
          <div class="bulk-actions" v-if="selectedUsers.length > 0">
            <div class="input-with-notch">
              <input v-model.number="bulkDays" type="number" class="bulk-input no-spin" placeholder="أيام">
              <button class="btn-notch-sign" @click="toggleBulkSign">-</button>
            </div>
            <button class="btn btn-secondary btn-sm p-1" @click="handleBulkActivate">تفعيل للمحددين ({{ selectedUsers.length }})</button>
          </div>
        </div>
      </div>
      
      <div class="p-3 bg-light border-bottom">
        <div class="search-input-wrapper w-full">
           <i class="fas fa-search control-icon"></i>
           <input v-model="store.filters.usersSearch" type="text" class="search-input" placeholder="ابحث بالكود، الاسم أو البريد" />
           <i v-if="store.filters.usersSearch" class="fas fa-times clear-icon" @click="store.filters.usersSearch = ''" title="مسح البحث"></i>
        </div>
      </div>

      <div class="table-wrapper m-0 rounded-none shadow-none">
        <table id="logged-in-users-table" class="modern-table auto-layout">
          <thead>
            <tr>
              <th class="th-checkbox">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll">
              </th>
              <th class="col-user">المستخدم</th>
              <th class="col-status text-center">حالة الاشتراك</th>
              <th class="col-subscription-days">إضافة أيام</th>
              <th class="text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.isLoading && store.usersList.length === 0">
              <td colspan="5" class="text-center p-3">
                <i class="fas fa-spinner fa-spin text-primary"></i> جاري تحميل المستخدمين...
              </td>
            </tr>
            <template v-else>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td class="td-checkbox">
                  <input type="checkbox" v-model="selectedUsers" :value="user.id">
                </td>
                <td class="col-user">
                  <div class="user-info-cell">
                    <div class="user-name font-bold">{{ user.full_name || 'مستخدم' }}</div>
                    <div class="user-email text-xs text-muted">{{ user.email }}</div>
                    <div class="user-short-id">{{ user.user_code || user.id.slice(0, 8) }} <i class="fas fa-copy text-xs ml-1 opacity-50"></i></div>
                  </div>
                </td>
                <td class="col-status">
                  <div class="status-column centered">
                    <span v-if="user.hasActiveSub" class="status-badge status-active">نشط</span>
                    <span v-else class="status-badge status-cancelled">غير نشط</span>
                    
                    <div class="expiry-date-sub">من: {{ store.formatDate(user.created_at) }}</div>
                    <div v-if="user.hasActiveSub" class="expiry-date-sub">إلى: {{ store.formatDate(user.expiryDate) }}</div>
                  </div>
                </td>
                <td class="col-subscription-days">
                  <div class="input-with-notch">
                    <input v-model.number="user.manualDays" type="number" class="editable-input w-full no-spin" placeholder="أيام">
                    <button class="btn-notch-sign" @click="toggleUserSign(user)">-</button>
                  </div>
                </td>
                <td class="text-center">
                  <div class="d-flex justify-center gap-1 align-center">
                    <button 
                      class="btn btn--icon"
                      :title="user.hasActiveSub ? 'إضافة أيام للاشتراك الحالي' : 'تفعيل اشتراك جديد'"
                      @click="store.activateManualSubscription(user.id, user.manualDays, user.hasActiveSub)">
                      <i class="fas fa-play-circle"></i>
                    </button>
                    
                    <!-- Support Tools Button -->
                    <button class="btn btn--icon text-muted" title="أدوات الدعم المتقدمة" @click="openSupportModal(user)">
                      <i class="fas fa-wrench"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0 && !store.isLoading">
                 <td colspan="5" class="text-center p-3 text-muted">لا يوجد مستخدمين مطابقين للبحث</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <section id="app-errors-section" class="admin-section">
      <div class="admin-section-header d-flex justify-between align-center">
        <h2><i class="fas fa-bug"></i> سجل أخطاء التطبيق ({{ store.appErrors.length }})</h2>
        <button class="btn btn-sm btn-secondary" @click="store.fetchAppErrors(true)"><i class="fas fa-sync"></i> تحديث</button>
      </div>
      
      <div class="table-wrapper m-0 rounded-none shadow-none" style="max-height: 400px; overflow-y: auto;">
        <table class="modern-table auto-layout">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المستخدم</th>
              <th>الرسالة</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.appErrors.length === 0">
              <td colspan="5" class="text-center p-3 text-muted">سجل الأخطاء نظيف ✅</td>
            </tr>
            <tr v-for="err in store.appErrors" :key="err.id" :class="{ 'bg-resolved': err.is_resolved }">
              <td class="text-xs">{{ store.formatDate(err.created_at) }} <br> {{ new Date(err.created_at).toLocaleTimeString() }}</td>
              <td class="text-xs">
                <div v-if="err.users">{{ err.users.full_name }}<br><span class="text-muted">{{ err.users.email }}</span></div>
                <div v-else class="text-muted">زائر / غير مسجل</div>
              </td>
              <td class="text-sm error-msg-cell" :title="err.stack_trace">
                <div class="font-bold text-danger">{{ err.error_message }}</div>
                <div class="text-xs text-muted truncate">{{ err.context?.url }}</div>
              </td>
              <td class="text-center">
                <span class="status-badge" :class="err.is_resolved ? 'status-active' : 'status-expired'">{{ err.is_resolved ? 'معالج' : 'جديد' }}</span>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <button v-if="!err.is_resolved" class="btn btn--icon text-success" title="تحديد كمعالج" @click="store.resolveError(err.id)"><i class="fas fa-check"></i></button>
                  <button class="btn btn--icon text-danger" title="حذف" @click="store.deleteError(err.id)"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="pending-requests-section" class="admin-section">
      <div class="admin-section-header">
        <h2><i class="fas fa-clock"></i> طلبات الاشتراك قيد المراجعة ({{ store.pendingSubscriptions.length }})</h2>
      </div>
      <div class="table-wrapper m-0 rounded-none shadow-none">
        <table id="pending-subscriptions-table" class="modern-table auto-layout" v-if="store.pendingSubscriptions.length > 0 || store.isLoading">
          <thead>
            <tr>
              <th class="col-user">المستخدم</th>
              <th class="col-plan">الخطة</th>
              <th class="col-transaction-id">رقم العملية</th>
              <th class="col-date">تاريخ الطلب</th>
              <th class="col-actions text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.isLoading && store.pendingSubscriptions.length === 0">
              <td colspan="5" class="text-center p-3">
                <i class="fas fa-spinner fa-spin text-primary"></i> جاري تحميل الطلبات المعلقة...
              </td>
            </tr>
            <template v-else>
              <tr v-for="sub in store.pendingSubscriptions" :key="sub.id">
                <td class="col-user">
                  <div class="user-info-cell">
                    <div class="user-name font-bold">{{ sub.users?.full_name || 'مستخدم' }}</div>
                    <div class="user-email text-xs text-muted">{{ sub.users?.email }}</div>
                    <div class="user-short-id">{{ sub.user_code || sub.user_id?.slice(0, 8) }}</div>
                  </div>
                </td>
                <td class="col-plan">{{ sub.subscription_plans?.name_ar || sub.plan_name }} ({{ sub.subscription_plans?.duration_months }} شهر)</td>
                <td class="col-transaction-id font-mono text-primary font-bold">{{ sub.transaction_id || '-' }}</td>
                <td class="col-date">{{ store.formatDate(sub.created_at) }}</td>
                <td class="col-actions text-center">
                  <div class="d-flex justify-center gap-2">
                    <button class="btn btn--icon text-success" title="تفعيل" @click="store.handleSubscriptionAction(sub.id, 'approve')"><i class="fas fa-check"></i></button>
                    <button class="btn btn--icon text-danger" title="رفض" @click="store.handleSubscriptionAction(sub.id, 'reject')"><i class="fas fa-times"></i></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-else-if="!store.isLoading" class="no-data p-5 text-center text-muted"><p>لا توجد طلبات معلقة</p></div>
      </div>
    </section>

    <section class="admin-section">
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
        <table id="all-subscriptions-table" class="modern-table auto-layout" v-if="store.allSubscriptions.length > 0 || store.isLoading">
          <thead>
            <tr>
              <th class="col-user">المستخدم</th>
              <th class="col-plan">الخطة</th>
              <th class="col-transaction-id">رقم العملية</th>
              <th class="col-status text-center">الحالة</th>
              <th class="col-days text-center">الأيام</th>
              <th class="col-actions text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="store.isLoading && store.allSubscriptions.length === 0">
              <td colspan="6" class="text-center p-3">
                <i class="fas fa-spinner fa-spin text-primary"></i> جاري تحميل جميع الاشتراكات...
              </td>
            </tr>
            <template v-else>
              <tr v-for="sub in store.allSubscriptions" :key="sub.id">
                <td class="col-user">
                  <div class="user-info-cell">
                    <div class="user-name font-bold">{{ sub.user_name || sub.email || 'مستخدم' }}</div>
                    <div class="user-email text-xs text-muted">{{ sub.email }}</div>
                    <div class="user-short-id">{{ sub.user_code || sub.user_id?.slice(0, 8) }}</div>
                  </div>
                </td>
                <td class="col-plan">{{ sub.plan_name || sub.subscription_plans?.name_ar || '-' }}</td>
                <td class="col-transaction-id font-mono font-bold">{{ sub.transaction_id || '-' }}</td>
                <td class="col-status text-center">
                  <span class="status-badge" :class="`status-${sub.status} text-center` ">
                    {{ sub.status === 'active' ? 'نشط' : (sub.status === 'cancelled' ? 'معلق' : (sub.status === 'expired' ? 'منتهي' : sub.status)) }}
                  </span>
                  <div v-if="sub.end_date" class="expiry-date-sub">إلى: {{ store.formatDate(sub.end_date) }}</div>
                </td>
                <td class="col-days text-center font-bold">
                  <span v-if="sub.status === 'active' || sub.status === 'cancelled'" 
                        :style="{ color: sub.status === 'cancelled' ? '#ef4444' : getRemainingDaysColor(sub.end_date) }">
                    {{ calculateRemainingDays(sub.end_date, sub.status, sub.updated_at) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="col-actions text-center">
                  <div class="d-flex justify-center gap-1">
                    <button class="btn btn--icon text-info" title="تفاصيل" @click="showSubscriptionDetails(sub)"><i class="fas fa-eye"></i></button>
                    <button v-if="sub.status === 'active'" class="btn btn--icon text-warning" title="تعليق" @click="store.handleSubscriptionAction(sub.id, 'cancel')"><i class="fas fa-pause"></i></button>
                    <button v-if="sub.status === 'cancelled'" class="btn btn--icon text-success" title="استئناف" @click="store.handleSubscriptionAction(sub.id, 'reactivate')"><i class="fas fa-play"></i></button>
                    <button class="btn btn--icon text-danger" title="حذف" @click="store.handleSubscriptionAction(sub.id, 'delete')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-else-if="!store.isLoading" class="no-data p-5 text-center text-muted"><p>لا توجد اشتراكات لعرضها</p></div>
      </div>
    </section>

    <BaseModal 
      v-model:show="showDetailsModal" 
      :title="'تفاصيل اشتراك: ' + (selectedSub?.user_name || 'مستخدم')"
    >
      <div v-if="selectedSub" class="subscription-details">
        <div class="details-grid">
          <div class="detail-item">
            <label>اسم المستخدم:</label>
            <span>{{ selectedSub.user_name || 'غير متوفر' }}</span>
          </div>
          <div class="detail-item">
            <label>البريد الإلكتروني:</label>
            <span>{{ selectedSub.email }}</span>
          </div>
          <div class="detail-item">
            <label>معرف المستخدم (كود):</label>
            <span class="font-mono text-primary font-bold">{{ selectedSub.user_code || selectedSub.user_id }}</span>
          </div>
          <hr class="full-width" />
          <div class="detail-item">
            <label>الخطة المختارة:</label>
            <span class="font-bold text-primary">{{ selectedSub.plan_name_ar || selectedSub.plan_name || 'غير محدد' }}</span>
          </div>
          <div class="detail-item">
            <label>السعر:</label>
            <span>{{ selectedSub.price_egp || 0 }} ج.م</span>
          </div>
          <div class="detail-item">
            <label>رقم عملية التحويل:</label>
            <span class="font-mono font-bold text-success">{{ selectedSub.transaction_id || 'دفع يدوي' }}</span>
          </div>
          <div class="detail-item">
            <label>الحالة الحالية:</label>
            <span class="status-badge" :class="`status-${selectedSub.status} text-center` ">{{ selectedSub.status }}</span>
          </div>
          <div class="detail-item">
            <label>تاريخ طلب الاشتراك:</label>
            <span>{{ store.formatDate(selectedSub.created_at) }}</span>
          </div>
          <div class="detail-item">
            <label>تاريخ انتهاء الاشتراك:</label>
            <span v-if="selectedSub.end_date" class="font-bold text-danger">{{ store.formatDate(selectedSub.end_date) }}</span>
            <span v-else>-</span>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetailsModal = false">إغلاق</button>
      </template>
    </BaseModal>

    <!-- New User Support Modal -->
    <BaseModal 
      v-model:show="showSupportModal" 
      :title="'دعم فني: ' + (selectedSupportUser?.full_name || 'مستخدم')"
    >
      <div v-if="selectedSupportUser" class="support-modal-content">
        <div class="user-quick-info mb-3">
          <div class="text-xs text-muted">ID: <span class="font-mono">{{ selectedSupportUser.id }}</span></div>
          <div class="text-xs text-muted">UID: <span class="font-mono font-bold text-primary">{{ selectedSupportUser.user_code || 'N/A' }}</span></div>
          <div class="text-xs text-muted">Email: {{ selectedSupportUser.email }}</div>
        </div>

        <!-- Recent Errors Section -->
        <div class="error-history-section mb-4">
          <h4 class="text-sm font-bold mb-2 border-bottom pb-1"><i class="fas fa-history text-danger"></i> أحدث الأخطاء المسجلة</h4>
          
          <div v-if="selectedUserErrors.length === 0" class="text-center p-3 text-muted bg-light rounded text-sm">
            لا توجد أخطاء مسجلة حديثاً لهذا المستخدم.
          </div>
          
          <div v-else class="error-list-container" style="max-height: 200px; overflow-y: auto;">
            <div v-for="err in selectedUserErrors" :key="err.id" class="error-item p-2 mb-1 border rounded bg-light text-xs">
              <div class="d-flex justify-between font-bold">
                 <span class="text-danger">{{ err.error_message }}</span>
                 <span class="text-muted" style="min-width: 70px; text-align: left">{{ store.formatDate(err.created_at) }}</span>
              </div>
              <div class="text-muted mt-1 truncate">{{ err.context?.url || 'No URL' }}</div>
            </div>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="support-actions-section">
          <h4 class="text-sm font-bold mb-2 border-bottom pb-1"><i class="fas fa-tools text-primary"></i> أدوات الإصلاح</h4>
          
          <div class="actions-grid d-flex gap-2 flex-wrap">
             <button class="btn btn-primary d-flex align-center gap-2 flex-1" @click="store.runRepairTool(selectedSupportUser.id)">
               <i class="fas fa-magic"></i>
               <div class="text-right">
                 <div class="font-bold">إصلاح شامل</div>
                 <div class="text-xs opacity-75">مزامنة البيانات وإصلاح الملف</div>
               </div>
             </button>

             <button class="btn btn-warning d-flex align-center gap-2 flex-1" @click="store.sendRemoteCommand(selectedSupportUser.id, 'clear_cache')">
               <i class="fas fa-eraser"></i>
               <div class="text-right">
                 <div class="font-bold">مسح الكاش</div>
                 <div class="text-xs opacity-75">إجبار التطبيق على التحديث</div>
               </div>
             </button>

             <button class="btn btn-danger d-flex align-center gap-2 flex-1" @click="store.sendRemoteCommand(selectedSupportUser.id, 'force_logout')">
               <i class="fas fa-sign-out-alt"></i>
               <div class="text-right">
                 <div class="font-bold">خروج إجباري</div>
                 <div class="text-xs opacity-75">إنهاء الجلسة الحالية</div>
               </div>
             </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showSupportModal = false">إغلاق</button>
      </template>
    </BaseModal>

    <!-- Scroll To Top Button -->
    <button v-show="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
      <i class="fas fa-arrow-up"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject, watch, onActivated } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/components/layout/PageHeader.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import logger from '@/utils/logger';
import { onBeforeRouteUpdate } from 'vue-router';
import { TimeService } from '@/utils/time';

const store = useAdminStore();
const authStore = useAuthStore();
const { confirm, addNotification } = inject('notifications');

const adminStats = {
  totalUsers: { label: 'إجمالي المستخدمين', icon: 'fas fa-users', unit: '' },
  activeUsers: { label: 'مستخدمون فعالون', icon: 'fas fa-user-check', unit: '' },
  pendingRequests: { label: 'طلبات قيد المراجعة', icon: 'fas fa-clock', unit: '' },
  activeSubscriptions: { label: 'الاشتراكات النشطة', icon: 'fas fa-check-circle', unit: '' },
  totalRevenue: { label: 'إجمالي الإيرادات', icon: 'fas fa-money-bill-wave', unit: 'ج.م' },
  appErrors: { label: 'الأخطاء', icon: 'fas fa-bug', unit: '' },
};

const selectedUsers = ref([]);
const bulkDays = ref(null);
const showDetailsModal = ref(false);
const selectedSub = ref(null);
// showDetailsModal is already defined above, avoiding duplicate
const showSupportModal = ref(false);
const selectedSupportUser = ref(null);
const showScrollTop = ref(false);

const activeDropdownId = ref(null); // REMOVED

const selectedUserErrors = computed(() => {
  if (!selectedSupportUser.value) return [];
  return store.appErrors.filter(e => e.user_id === selectedSupportUser.value.id);
});

const openSupportModal = (user) => {
  selectedSupportUser.value = user;
  showSupportModal.value = true;
};

const showSubscriptionDetails = (sub) => {
  selectedSub.value = sub;
  showDetailsModal.value = true;
};

// NEW: Scroll To Top Logic
const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300;
};

const scrollToTop = () => {
    // Force immediate scroll for maximum compatibility
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
};

// Close dropdown when clicking outside
const closeDropdown = (e) => {
  if (!e.target.closest('.dropdown-wrapper')) {
     // activeDropdownId.value = null; 
  }
};

onMounted(() => {
  window.addEventListener('click', closeDropdown);
  window.addEventListener('scroll', handleScroll);
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
  window.removeEventListener('scroll', handleScroll);
});

const handleStatClick = (key) => {
  const sectionMap = {
    'pendingRequests': 'pending-requests-section',
    'appErrors': 'app-errors-section'
  };

  const sectionId = sectionMap[key];
  if (sectionId) {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sectionElement.classList.add('highlight-section');
      setTimeout(() => sectionElement.classList.remove('highlight-section'), 2000);
    }
  } else {
    if (key === 'pendingRequests') console.warn('Pending requests section not found');
  }
};

const handleActiveUsersPeriodChange = () => store.fetchStats(false);

const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && selectedUsers.value.length === filteredUsers.value.length;
});

const toggleSelectAll = () => {
  selectedUsers.value = isAllSelected.value ? [] : filteredUsers.value.map(u => u.id);
};

const toggleBulkSign = () => {
  if (bulkDays.value) bulkDays.value *= -1;
};

const toggleUserSign = (user) => {
  if (user.manualDays) user.manualDays *= -1;
  else user.manualDays = -1;
};

const handleBulkActivate = async () => {
  if (!bulkDays.value || isNaN(bulkDays.value)) {
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
        await store.activateManualSubscription(userId, bulkDays.value, false, true, true);
        successCount++;
      } catch (e) {
        console.error('Bulk activation failed for user:', userId, e);
      }
    }
    selectedUsers.value = [];
    bulkDays.value = null;
    addNotification(`تم تفعيل الاشتراك لـ ${successCount} مستخدم.`, 'success');
    await store.loadDashboardData(true);
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
    if (result.isConfirmed) await store.toggleSubscriptionEnforcement(newVal);
    else event.target.checked = !newVal;
};

const filteredUsers = computed(() => {
  if (!store.filters.usersSearch) return store.usersList;
  const q = store.filters.usersSearch.toLowerCase();
  return store.usersList.filter(u =>
    (u.user_code?.toLowerCase().includes(q)) || 
    (u.full_name?.toLowerCase().includes(q)) || 
    (u.email?.toLowerCase().includes(q))
  );
});

/**
 * حساب الأيام المتبقية مع الأخذ في الاعتبار فارق التوقيت
 */
const calculateRemainingDays = (endDate, status = 'active', updatedAt = null) => {
  if (status === 'cancelled' && updatedAt) {
     // Freeze the countdown: Calculate remaining duration from the moment of cancellation
     // effectively: EndDate - UpdatedAt
     const end = new Date(endDate);
     const pausedAt = new Date(updatedAt);
     const diffTime = end - pausedAt;
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }
  return TimeService.calculateDaysRemaining(endDate, store.serverTimeOffset);
};

const getRemainingDaysColor = (endDate) => {
  const days = calculateRemainingDays(endDate);
  if (days <= 3) return '#ef4444';
  if (days <= 7) return '#f59e0b';
  return 'inherit';
};

/**
 * دالة تهيئة بيانات الأدمن
 * @param {boolean} force - هل يجب فرض التحديث وتجاهل الكاش؟
 */
const initAdminData = async (force = false) => {
  if (!authStore.isAdmin) return;
  try {
    await store.loadDashboardData(force);
  } catch (err) {
    logger.error('AdminView: Failed to load data', err);
  }
};

// ============================================
// Lifecycle Hooks - تحديث البيانات عند الدخول
// ============================================

// عند تحميل المكون لأول مرة، نفرض التحديث (true) لضمان بيانات طازجة
onMounted(() => { initAdminData(true); });

// عند العودة للصفحة (إذا كانت مخزنة في KeepAlive)، نفرض التحديث أيضاً
onActivated(() => { initAdminData(true); });

// عند تحديث المسار (مثل تغيير الـ Query Params)، نفرض التحديث
onBeforeRouteUpdate((to, from, next) => {
  initAdminData(true);
  next();
});

watch(() => authStore.isAdmin, (newVal) => {
  if (newVal) initAdminData(true);
});
</script>

<style scoped>
.admin-dashboard { padding-bottom: 2rem; }
.no-spin::-webkit-inner-spin-button, .no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.no-spin { -moz-appearance: textfield; }
.input-with-notch { position: relative; display: flex; align-items: center; }
.btn-notch-sign { position: absolute; left: 0; bottom: 0; background: var(--border-color, #ddd); color: var(--primary); border: none; border-radius: 0 4px 0 0; width: 18px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; cursor: pointer; opacity: 0.7; transition: all 0.2s; padding: 0; line-height: 0; }

.admin-section { margin-bottom: 2rem; background: var(--surface-bg); border-radius: var(--border-radius-lg); overflow: visible; } /* Changed to visible to allow dropdowns */
.protection-card { border: 1px solid var(--border-color); }
.protection-content { padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
.protection-info { flex: 1; }
.protection-desc { font-size: 0.9rem; color: var(--text-muted); }
.warning-text { display: block; margin-top: 0.5rem; font-weight: 700; color: var(--primary); }
.switch { position: relative; display: inline-block; width: 60px; height: 34px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--primary); }
input:checked + .slider:before { transform: translateX(26px); }
.modern-table.auto-layout { table-layout: auto !important; width: 100%; }
.modern-table th, .modern-table td { white-space: nowrap; } /* Apply to all cells by default */

/* Make all columns adapt to content */
#logged-in-users-table th,
#logged-in-users-table td,
#pending-subscriptions-table th,
#pending-subscriptions-table td,
#all-subscriptions-table th,
#all-subscriptions-table td {
  width: 1%; /* Forces columns to be as narrow as possible, fitting content */
}

/* Checkbox column - minimal width to fit checkbox only */
#logged-in-users-table th.th-checkbox,
#logged-in-users-table td.td-checkbox {
  width: 1% !important;
  min-width: 40px !important;
  max-width: 40px !important;
  padding: 8px 4px !important;
  text-align: center !important;
}

/* Dropdown Support Styles refined */
.dropdown-wrapper { position: relative; display: inline-block; }
.dropdown-content {
  display: none;
  position: absolute;
  left: 0; /* Changed to left:0 to expand into table in RTL */
  top: 100%;
  background-color: var(--surface-bg);
  min-width: 180px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1000;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  text-align: right;
  margin-top: 5px;
}
.dropdown-content.show { display: block; }

.dropdown-content a {
  color: var(--text-main);
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}
.dropdown-content a:hover { background-color: var(--bg-secondary); color: var(--primary); }
.dropdown-content a i { display: inline-block; width: 20px; text-align: center; margin-left: 8px; }

/* User column in logged-in users table - fixed width 150px */
#logged-in-users-table th.col-user,
#logged-in-users-table td.col-user {
  width: 150px !important;
  min-width: 150px !important;
  max-width: 150px !important;
}

/* User column in other tables - fixed width 200px for consistency */
#pending-subscriptions-table th.col-user,
#pending-subscriptions-table td.col-user,
#all-subscriptions-table th.col-user,
#all-subscriptions-table td.col-user {
  width: 200px !important;
  min-width: 200px !important;
  max-width: 200px !important;
}

/* Status column in all tables - fixed width 100px for consistency */
#logged-in-users-table th.col-status,
#logged-in-users-table td.col-status,
#all-subscriptions-table th.col-status,
#all-subscriptions-table td.col-status {
  width: 100px !important;
  min-width: 100px !important;
  max-width: 100px !important;
}

/* Specific column adjustments */
.col-user { /* flex-grow for user details */ }
.col-plan { }
/* Apply width constraint to Transaction ID with text wrapping */
#pending-subscriptions-table th.col-transaction-id,
#pending-subscriptions-table td.col-transaction-id,
#all-subscriptions-table th.col-transaction-id,
#all-subscriptions-table td.col-transaction-id {
  max-width: 200px;
  white-space: normal !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
}

/* Subscription days column - fixed width 50px */
#logged-in-users-table th.col-subscription-days,
#logged-in-users-table td.col-subscription-days {
  width: 50px !important;
  min-width: 50px !important;
  max-width: 50px !important;
}

/* Action column - fixed width to prevent auto-resizing */
#logged-in-users-table th:last-child,
#logged-in-users-table td:last-child {
  width: 80px !important;
  min-width: 80px !important;
  max-width: 80px !important;
}

.col-actions { min-width: 100px; } /* Keep a min-width for action buttons */

/* Apply no-wrap to plan column */
.admin-dashboard table th.col-plan,
.admin-dashboard table td.col-plan {
  white-space: nowrap;
}

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
.status-active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-cancelled { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.status-expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.user-info-cell { text-align: right; white-space: normal; /* Allow text wrapping for user names */ }

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
.status-active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-cancelled { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.status-expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.user-info-cell { text-align: right; white-space: normal; /* Allow text wrapping for user names */ }

/* التحديث: تكبير الخط وجعله عريضاً */
.user-short-id { 
  font-size: 13px;  /* تم التغيير من 10px إلى 13px */
  font-weight: bold; /* تمت إضافة هذه الخاصية */
  color: var(--gray-600); 
  background: var(--gray-100); 
  padding: 2px 6px; /* زيادة بسيطة في الحشو */
  border-radius: 4px; 
  margin-top: 4px; 
  font-family: monospace;
  display: inline-block;
  width: fit-content;
}

.expiry-date-sub { font-size: 10px; color: var(--gray-600); }
.spinner-tiny { width: 1rem; height: 1rem; border: 2px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.details-grid { display: grid; gap: 15px; }
.detail-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color); }
.full-width { grid-column: 1 / -1; border-top: 1px dashed var(--border-color); margin: 10px 0; }
body.dark .user-short-id { background: rgba(255, 255, 255, 0.05); color: var(--gray-400); }
body.dark .bg-light { background-color: #0f172a !important; border-color: #334155 !important; }
body.dark .detail-item label { color: var(--gray-400); }

/* أنماط إضافية لزر إعادة المحاولة */
.alert { padding: 0.75rem 1.25rem; margin-bottom: 1rem; border: 1px solid transparent; border-radius: 0.25rem; }
.alert-danger { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }
.d-flex { display: flex !important; }
.justify-between { justify-content: space-between !important; }
.align-center { align-items: center !important; }

/* Clear Icon Styles */
.search-input-wrapper { position: relative; display: flex; align-items: center; } /* Ensure wrapper is relative */
.clear-icon {
  position: absolute;
  left: 10px; /* Adjust based on RTL/LTR, usually left in RTL if text is right? No, input text is usually right in RTL. Icon should be on the left (end of input). */
  cursor: pointer;
  color: #999;
  padding: 5px;
  transition: color 0.2s;
  z-index: 2;
}
.clear-icon:hover { color: var(--danger, #ef4444); }

.cursor-pointer { cursor: pointer; }
.hover-effect:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: all 0.3s ease; }
.highlight-section { animation: glow 2s ease-in-out; }
@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(0, 121, 101, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 121, 101, 0.8); }
  100% { box-shadow: none; }
}


/* Scroll To Top Button */
.scroll-top-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  border: none;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  cursor: pointer;
  z-index: 2147483647; /* Max Safe Integer for z-index */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  opacity: 0.9;
}
.scroll-top-btn:hover {
  transform: translateY(-5px);
  opacity: 1;
  background-color: var(--primary-dark);
}

</style>