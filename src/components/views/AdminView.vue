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
        :class="{ 'cursor-pointer hover-effect': key === 'pendingRequests' || key === 'appErrors' || key === 'locations' }"
        @click="handleStatClick(key)"
      >
        <div class="stat-icon"><i :class="stat.icon"></i></div>
        <div class="stat-content">
          <h3>{{ stat.label }}</h3>
          <p class="stat-value">
             <template v-if="key === 'appErrors'">
               <span>{{ store.appErrors.length }}</span>
             </template>
             <template v-else-if="key === 'locations'">
               <span>{{ locationsStats.total }}</span>
             </template>
             <template v-else>
               <span v-if="store.isLoading && !store.stats[key]" class="spinner-tiny"></span>
               <span v-else>{{ store.stats[key] || 0 }}</span>
             </template>
             {{ stat.unit }}
          </p>
          
          <div v-if="key === 'locations'" class="mt-2 text-xs">
             <div class="location-stat-row">
               <span class="stat-label"><i class="fas fa-map-pin"></i> إجمالي المواقع:</span>
               <span class="stat-highlight">{{ locationsStats.withCoords }} / {{ locationsStats.total }}</span>
             </div>
          </div>
          
          <div v-else-if="key === 'appErrors'" class="mt-2 text-xs">
             <div class="error-stat-row">
               <span class="stat-label"><i class="fas fa-check-circle"></i> معالج:</span>
               <span class="stat-highlight text-success">{{ errorStats.resolved }}</span>
               <span class="stat-divider">|</span>
               <span class="stat-label"><i class="fas fa-times-circle"></i> جديد:</span>
               <span class="stat-highlight text-danger">{{ errorStats.unresolved }}</span>
             </div>
          </div>
          
          <div v-else-if="key === 'activeUsers'" class="mt-2">
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
              <td class="text-center" style="white-space: nowrap;">
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

    <!-- NEW: Locations Modal -->
    <BaseModal 
      v-model:show="showLocationsModal" 
      title="📍 مواقع العملاء المجمعة"
      size="x-large"
    >
      <div class="locations-modal-content">
         <div class="d-flex justify-between align-center mb-3">
             <div class="d-flex gap-3 align-center">
                 <button class="btn btn-sm btn-primary" @click="refreshLocations">
                    <i class="fas fa-sync" :class="{'fa-spin': isLoadingLocations}"></i> تحديث
                 </button>
                 <div v-if="selectedLocationIds.length > 0" class="bulk-actions-locations">
                    <span class="text-xs text-muted">{{ selectedLocationIds.length }} محدد</span>
                    <button class="btn btn-sm btn-danger" @click="deleteSelectedLocations" :disabled="isLoadingLocations">
                       <i class="fas fa-trash"></i> حذف
                    </button>
                 </div>
                 <div class="location-stats-display">
                    <div class="stat-item">
                       <span class="stat-label">إجمالي العملاء:</span>
                       <span class="stat-value">{{ locationsStats.total }}</span>
                    </div>
                    <div class="stat-divider">|</div>
                    <div class="stat-item">
                       <span class="stat-label">إجمالي المواقع:</span>
                       <span class="stat-value text-success">{{ locationsStats.withCoords }}</span>
                    </div>
                 </div>
             </div>
             <div class="d-flex gap-2">
                 <button class="btn btn-sm btn-secondary" @click="exportLocations('all')">
                    <i class="fas fa-file-export"></i> تصدير المواقع
                 </button>
             </div>
         </div>

         <div id="locations-table-container" class="table-wrapper m-0" style="max-height: 500px; overflow-y: auto;">
            <table class="modern-table auto-layout">
                <thead>
                    <tr>
                        <th class="th-checkbox" style="width: 40px;">
                           <input type="checkbox" :checked="isAllLocationsSelected" @change="toggleSelectAllLocations">
                        </th>
                        <th>كود العميل</th>
                        <th>اسم المحل</th>
                        <th>الإحداثيات (Lat, Lng)</th>
                        <th>آخر تحديث للموقع</th>
                        <th class="text-center">خريطة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="isLoadingLocations && allLocations.length === 0">
                        <td colspan="6" class="text-center p-4">جاري التحميل...</td>
                    </tr>
                    <tr v-else-if="allLocations.length === 0">
                        <td colspan="6" class="text-center p-4">لا توجد مواقع مسجلة</td>
                    </tr>
                    <tr v-for="loc in allLocations" :key="loc.id" :class="{ 'has-location': loc.latitude }">
                        <td class="td-checkbox">
                           <input type="checkbox" v-model="selectedLocationIds" :value="loc.id">
                        </td>
                        <td class="font-mono font-bold text-primary">{{ loc.shop_code }}</td>
                        <td>{{ loc.shop_name }}</td>
                        <td class="text-xs" dir="ltr">
                           <template v-if="loc.latitude">
                              <span class="location-badge">{{ Number(loc.latitude).toFixed(6) }}, {{ Number(loc.longitude).toFixed(6) }}</span>
                           </template>
                           <template v-else>
                              <span class="no-location-badge">-</span>
                           </template>
                        </td>
                        <td class="text-xs">{{ store.formatDate(loc.location_updated_at || loc.updated_at) }}</td>
                        <td class="text-center">
                            <a v-if="loc.latitude" :href="`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`" target="_blank" class="btn btn--icon text-primary" title="عرض في Google Maps">
                                <i class="fas fa-map-marked-alt"></i>
                            </a>
                            <span v-else class="text-muted text-xs">بدون موقع</span>
                        </td>
                    </tr>
                </tbody>
            </table>
         </div>
      </div>
       <template #footer>
        <button class="btn btn-secondary" @click="showLocationsModal = false">إغلاق</button>
      </template>
    </BaseModal>

    <!-- Scroll To Top Button -->
    <button v-show="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
      <i class="fas fa-arrow-up"></i>
    </button>
  </div>
</template>

<script setup>
import PageHeader from '@/components/layout/PageHeader.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import { useAdminView } from '@/composables/useAdminView';

// Destructure every single property returned from the composable
// so they are available to the template
const {
  store,
  adminStats,
  selectedUsers,
  bulkDays,
  showDetailsModal,
  selectedSub,
  showSupportModal,
  selectedSupportUser,
  showLocationsModal,
  allLocations,
  isLoadingLocations,
  selectedLocationIds,
  showScrollTop,
  selectedUserErrors,
  locationsWithCoords,
  locationsStats,
  isAllLocationsSelected,
  errorStats,
  openSupportModal,
  showSubscriptionDetails,
  handleStatClick,
  handleActiveUsersPeriodChange,
  filteredUsers,
  isAllSelected,
  toggleSelectAll,
  toggleBulkSign,
  toggleUserSign,
  handleBulkActivate,
  handleToggleEnforcement,
  calculateRemainingDays,
  getRemainingDaysColor,
  refreshLocations,
  deleteSelectedLocations,
  exportLocations,
  toggleSelectAllLocations,
  scrollToTop
} = useAdminView();

</script>