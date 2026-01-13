<template>
  <div class="my-subscription-page container">
    
    <PageHeader 
      title="إدارة اشتراكي" 
      subtitle="تحكم في باقتك وتابع تاريخ عملياتك"
      icon="🛡️"
    />

    <div v-if="route.query.access === 'denied'" class="access-denied-alert animate-fade-in">
       <div class="alert-inner">
         <div class="alert-icon"><i class="fas fa-shield-virus"></i></div>
         <div class="alert-content">
           <h4>ميزة للمشتركين فقط</h4>
           <p>الصفحة التي حاولت دخولها متاحة فقط للمشتركين الفعالين. يرجى اختيار باقة لتفعيل حسابك.</p>
         </div>
       </div>
    </div>

    <div class="content-grid">
      
      <section class="card identity-card animate-fade-in">
        <div class="card-body identity-body">
          <div class="identity-content">
            <div class="icon-box">
              <i class="fas fa-id-card-alt"></i>
            </div>
            <div class="text-box">
              <span class="label">المعرف الخاص بك (للدعم والمشاركة)</span>
              <div class="code-display">
                <strong class="user-code">{{ displayUserCode }}</strong>
              </div>
            </div>
          </div>
          <button @click="copyUserCode" class="btn btn-outline-primary btn-copy" title="نسخ الكود">
            <i class="fas fa-copy"></i> <span class="d-none-mobile">نسخ</span>
          </button>
        </div>
      </section>

      <section class="card status-card animate-fade-in">
        <div class="card-header bg-primary-gradient">
          <div class="header-icon"><i class="fas fa-crown"></i></div>
          <div class="header-text">
            <h3>الاشتراك الحالي</h3>
            <span class="plan-badge">{{ store.planName }}</span>
          </div>
          <div class="status-indicator">
             <span class="badge" :class="`badge-${store.ui.class}`">
               <i v-if="store.isSubscribed && store.ui.class === 'active'" class="fas fa-circle pulse-dot"></i>
               {{ store.ui.statusText }}
             </span>
          </div>
        </div>

        <div class="card-body">
          <div v-if="store.subscription" class="subscription-details">
            <div class="detail-item">
              <span class="label"><i class="fas fa-calendar-day"></i> يبدأ في</span>
              <span class="value">{{ formatDate(store.subscription.start_date) }}</span>
            </div>
            <div class="detail-item">
              <span class="label"><i class="fas fa-calendar-check"></i> ينتهي في</span>
              <span class="value">{{ formatDate(store.subscription.end_date) }}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="remaining-section">
               <h4 class="remaining-title">حالة الاشتراك</h4>
               <div class="days-counter" :class="store.ui.class">
                 <template v-if="store.ui.days !== null">
                    <span class="number">{{ store.ui.days }}</span>
                    <span class="unit">يوم متبقي</span>
                 </template>
                 <template v-else>
                    <span class="unit text-lg">{{ store.ui.detailsPrefix }}</span>
                 </template>
               </div>
            </div>
          </div>
          <div v-else class="empty-state text-center py-5">
            <i class="fas fa-ghost fa-3x mb-3 text-muted"></i>
            <p class="text-muted">لا يوجد اشتراك نشط حالياً</p>
          </div>
        </div>

        <div class="card-footer">
          <router-link v-if="!store.isSubscribed" to="/app/subscriptions" class="btn btn-primary btn-block">
             <i class="fas fa-rocket"></i> اشترك الآن
          </router-link>
          
          <router-link v-else-if="store.daysRemaining <= 7" to="/app/subscriptions" class="btn btn-warning btn-block">
             <i class="fas fa-sync"></i> تجديد الاشتراك
          </router-link>
          
          <div v-else class="subscription-active-msg">
            <i class="fas fa-check-circle pulse-icon"></i> اشتراكك مفعل وبحالة جيدة
          </div>
        </div>
      </section>

      <section class="card history-card animate-fade-in delay-1">
        <div class="card-header bg-primary-gradient">
          <div class="header-icon"><i class="fas fa-history"></i></div>
          <div class="header-text">
            <h3>سجل الاشتراكات</h3>
          </div>
        </div>
        <div class="card-body no-padding">
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>الباقة</th>
                  <th>الفترة</th>
                  <th class="text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sub in store.history" :key="sub.id">
                  <td class="font-bold text-main">{{ sub.subscription_plans?.name_ar || sub.plan_name }}</td>
                  <td>
                    <div class="date-range-box text-muted">
                      <span>{{ formatDate(sub.start_date) }}</span>
                      <i class="fas fa-long-arrow-alt-left"></i>
                      <span>{{ formatDate(sub.end_date) }}</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge badge-sm" :class="`badge-${sub.status}`">
                      {{ getArabicStatus(sub.status) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="store.history.length === 0">
                  <td colspan="3" class="text-center py-20 text-muted">لا يوجد سجل سابق</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref, watch } from 'vue'; // تمت إضافة ref و watch
import { useRoute } from 'vue-router';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useMySubscriptionStore();
const authStore = useAuthStore();
const route = useRoute();
const { addNotification } = inject('notifications');

// --- منطق حفظ واستدعاء المعرف محلياً ---
// 1. محاولة قراءة المعرف من الذاكرة المحلية فوراً
const cachedCode = localStorage.getItem('saved_user_code');

// 2. إنشاء متغير للعرض: الأولوية للستور، ثم الكاش، ثم نص الانتظار
const displayUserCode = ref(
  authStore.user?.userCode || 
  (cachedCode && cachedCode !== 'undefined' ? cachedCode : 'جاري التحميل...')
);

// 3. مراقبة الستور لتحديث العرض والذاكرة عند وصول البيانات
watch(() => authStore.user?.userCode, (newCode) => {
  if (newCode) {
    displayUserCode.value = newCode;
    localStorage.setItem('saved_user_code', newCode);
  }
}, { immediate: true });
// ---------------------------------------

const formatDate = (date) => {
  if (!date) return '---';
  return new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

const getArabicStatus = (status) => {
  const map = { active: 'نشط', pending: 'معلق', cancelled: 'ملغي', expired: 'منتهي' };
  return map[status] || status;
};

const copyUserCode = () => {
  // النسخ يعتمد على المتغير المعروض حالياً لضمان العمل حتى لو كان من الكاش
  const code = displayUserCode.value;
  
  if (code && code !== 'جاري التحميل...') {
    navigator.clipboard.writeText(code);
    addNotification('تم نسخ المعرف بنجاح', 'success');
  } else {
    // محاولة أخيرة من الستور
    const fallbackCode = authStore.user?.userCode;
    if (fallbackCode) {
         navigator.clipboard.writeText(fallbackCode);
         addNotification('تم نسخ المعرف بنجاح', 'success');
    } else {
         addNotification('يرجى الانتظار، جاري تحميل المعرف...', 'warning');
    }
  }
};

onMounted(() => {
  store.init();
});
</script>

<style scoped>
/* --- Layout Structure --- */
.my-subscription-page { padding-bottom: 40px; }
.content-grid { display: flex; flex-direction: column; gap: 25px; margin-top: 20px; }

/* --- Access Denied Alert --- */
.access-denied-alert {
  margin-bottom: 2rem;
  animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.alert-inner {
  background: rgba(var(--warning-rgb), 0.1);
  border: 1px solid var(--warning);
  border-right-width: 5px;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.alert-icon {
  width: 50px;
  height: 50px;
  background: var(--warning);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(var(--warning-rgb), 0.3);
}

.alert-content h4 {
  margin: 0 0 5px;
  color: var(--warning);
  font-weight: 800;
}

.alert-content p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.4;
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* --- Unified Card Design --- */
.card {
  background: var(--white);
  border-radius: var(--border-radius-xl, 16px);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
  height: fit-content;
  transition: var(--transition);
}

.card-header { padding: 20px; display: flex; align-items: center; gap: 15px; }
.bg-primary-gradient { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; }
.header-icon { width: 45px; height: 45px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.header-text h3 { margin: 0; font-size: 1.1rem; color: #fff; }
.plan-badge { font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 20px; }
.status-indicator { margin-right: auto; }

.card-body { padding: 24px; background: var(--white); } 
.card-body.no-padding { padding: 0; }

/* --- Identity Card Styles (New) --- */
.identity-card {
  border-left: 5px solid var(--primary);
}
.identity-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}
.identity-content {
  display: flex;
  align-items: center;
  gap: 15px;
}
.icon-box {
  width: 50px;
  height: 50px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.text-box { display: flex; flex-direction: column; }
.text-box .label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-bottom: 2px; }
.text-box .user-code { font-size: 1.6rem; color: var(--primary); font-family: monospace; letter-spacing: 1px; font-weight: 800; line-height: 1; }
.btn-copy { border-radius: 20px; padding: 8px 20px; border: 2px solid var(--primary); font-weight: 700; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
.btn-copy:hover { background: var(--primary); color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.3); }

/* --- Subscription Details --- */
.subscription-details {
  padding: 5px 10px; 
}

.detail-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 15px 5px; 
}
.detail-item .label { color: var(--text-muted); font-size: 0.95rem; display: flex; align-items: center; gap: 10px; }
.detail-item .value { font-weight: 700; color: var(--text-main); }

.divider { height: 1px; background: var(--border-color); margin: 20px 0; opacity: 0.5; }

.remaining-section { text-align: center; padding: 15px 0; }
.remaining-title { color: var(--primary); font-size: 1.1rem; font-weight: 800; margin-bottom: 15px; }
.days-counter { display: inline-flex; flex-direction: column; padding: 20px 40px; border-radius: 24px; min-width: 160px; box-shadow: var(--shadow-md); transition: all 0.3s ease; }
.days-counter .number { font-size: 3.5rem; font-weight: 900; line-height: 1; }
.days-counter .unit { font-size: 1.1rem; font-weight: 700; margin-top: 8px; opacity: 0.9; }
.days-counter .text-lg { font-size: 1.4rem; padding: 10px 0; }

/* Dynamic Indicators Aligned with Sidebar Logic */
.days-counter.active { background: rgba(46, 204, 113, 0.1); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.2); }
.days-counter.warning { background: rgba(254, 202, 87, 0.1); color: #feca57; border: 1px solid rgba(254, 202, 87, 0.2); animation: pulse 2s infinite; }
.days-counter.expired { background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border: 1px solid rgba(255, 107, 107, 0.2); }
.days-counter.pending { background: rgba(243, 156, 18, 0.1); color: #f39c12; border: 1px solid rgba(243, 156, 18, 0.2); }
.days-counter.cancelled { background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.2); }

.card-footer { padding: 24px; background: var(--gray-100); border-top: 1px solid var(--border-color); }
.subscription-active-msg { text-align: center; color: var(--primary); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }

/* Pulse animations */
.pulse-icon { animation: pulse 2s infinite; }
.pulse-dot {
  width: 8px;
  height: 8px;
  margin-left: 8px;
  font-size: 8px;
  color: #fff;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

/* --- Table Styles --- */
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { background: var(--gray-100); padding: 18px 24px; text-align: right; font-size: 0.9rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.modern-table td { padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.date-range-box { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }

/* --- Badges --- */
.badge { padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; display: inline-flex; align-items: center; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.badge-active { background: var(--success, #2ecc71); }
.badge-pending { background: #f39c12; }
.badge-warning { background: var(--warning, #feca57); }
.badge-expired { background: var(--gray-500, #95a5a6); }
.badge-cancelled { background: #e74c3c; }

@media (max-width: 600px) {
  .d-none-mobile { display: none; }
  .identity-body { padding: 15px; }
  .text-box .user-code { font-size: 1.2rem; }
}

/* --- Strict Dark Mode Overrides (High Accuracy) --- */
:global(body.dark-mode) .card { 
  background: #1e1e1e !important; 
  border-color: #333 !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4) !important;
}
:global(body.dark-mode) .card-body { 
  background: #1e1e1e !important; 
}
:global(body.dark-mode) .identity-body { background: #1e1e1e !important; }
:global(body.dark-mode) .icon-box { background: rgba(255, 255, 255, 0.05); }
:global(body.dark-mode) .card-footer { 
  background: #252525 !important; 
  border-top-color: #333 !important; 
}
:global(body.dark-mode) .modern-table th { 
  background: #252525 !important; 
  color: #aaa !important;
  border-bottom-color: #333 !important;
}
:global(body.dark-mode) .modern-table td { 
  border-bottom-color: #2a2a2a !important; 
}
:global(body.dark-mode) .detail-item .label { color: #bbb !important; }
:global(body.dark-mode) .detail-item .value { color: #fff !important; }
:global(body.dark-mode) .remaining-title { color: var(--primary-light) !important; }
:global(body.dark-mode) .text-main { color: #fff !important; }
:global(body.dark-mode) .text-muted { color: #aaa !important; }
:global(body.dark-mode) .divider { background: #333 !important; opacity: 1; }
:global(body.dark-mode) .days-counter.expired { background: rgba(255, 107, 107, 0.05); }
:global(body.dark-mode) .days-counter.pending { background: rgba(243, 156, 18, 0.05); color: #f39c12; }
:global(body.dark-mode) .days-counter.cancelled { background: rgba(231, 76, 60, 0.05); color: #e74c3c; }
:global(body.dark-mode) .empty-state { color: #777 !important; }

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
</style>