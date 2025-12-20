<template>
  <div class="my-subscription-page container">
    
    <PageHeader 
      title="إدارة اشتراكي" 
      subtitle="تحكم في باقتك وتابع تاريخ عملياتك"
      icon="🛡️"
    />

    <div class="content-grid">
      <!-- Card 1: Current Status -->
      <section class="card status-card animate-fade-in">
        <div class="card-header bg-primary-gradient">
          <div class="header-icon"><i class="fas fa-crown"></i></div>
          <div class="header-text">
            <h3>الاشتراك الحالي</h3>
            <span class="plan-badge">{{ store.planName }}</span>
          </div>
          <div class="status-indicator">
             <span class="badge" :class="`badge-${store.subscription?.status || 'none'}`">
               {{ store.statusText }}
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
               <h4 class="remaining-title">الأيام المتبقية</h4>
               <div class="days-counter" :class="store.daysClass">
                 <span class="number">{{ store.daysRemaining }}</span>
                 <span class="unit">يوم</span>
               </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="fas fa-ghost"></i>
            <p>لا يوجد اشتراك نشط حالياً</p>
          </div>
        </div>

        <div class="card-footer">
          <router-link v-if="!store.isSubscribed || store.daysRemaining <= 0" to="/app/subscriptions" class="btn btn-primary btn-block">
             <i class="fas fa-rocket"></i> اشترك الآن
          </router-link>
          
          <router-link v-else-if="store.daysRemaining <= 7" to="/app/subscriptions" class="btn btn-warning btn-block">
             <i class="fas fa-sync"></i> تجديد الاشتراك
          </router-link>
          
          <div v-else class="subscription-active-msg">
            <i class="fas fa-check-circle"></i> اشتراكك مفعل وبحالة جيدة
          </div>
        </div>
      </section>

      <!-- Card 2: History -->
      <section class="card history-card animate-fade-in delay-1">
        <div class="card-header border-bottom">
          <h3 class="text-main"><i class="fas fa-history text-primary"></i> سجل الاشتراكات</h3>
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
import { onMounted } from 'vue';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useMySubscriptionStore();

const formatDate = (date) => {
  if (!date) return '---';
  return new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
};

const getArabicStatus = (status) => {
  const map = { active: 'نشط', pending: 'معلق', cancelled: 'ملغي', expired: 'منتهي' };
  return map[status] || status;
};

onMounted(() => {
  store.init();
});
</script>

<style scoped>
/* --- Layout Structure --- */
.my-subscription-page { padding-bottom: 40px; }
.content-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 25px; margin-top: 20px; }
@media (max-width: 992px) { .content-grid { grid-template-columns: 1fr; } }

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

.card-body { padding: 24px; background: var(--white); } /* Added more padding for breathing room */
.card-body.no-padding { padding: 0; }

.subscription-details {
  padding: 5px 10px; /* Internal spacing to prevent items from sticking to card edge */
}

.detail-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 15px 5px; /* Better vertical spacing */
}
.detail-item .label { color: var(--text-muted); font-size: 0.95rem; display: flex; align-items: center; gap: 10px; }
.detail-item .value { font-weight: 700; color: var(--text-main); }

.divider { height: 1px; background: var(--border-color); margin: 20px 0; opacity: 0.5; }

.remaining-section { text-align: center; padding: 15px 0; }
.remaining-title { color: var(--primary); font-size: 1.1rem; font-weight: 800; margin-bottom: 15px; }
.days-counter { display: inline-flex; flex-direction: column; padding: 20px 40px; border-radius: 24px; min-width: 160px; box-shadow: var(--shadow-md); }
.days-counter .number { font-size: 3.5rem; font-weight: 900; line-height: 1; }
.days-counter .unit { font-size: 1.1rem; font-weight: 700; margin-top: 8px; opacity: 0.9; }

/* Dynamic Indicators */
.high-days { background: rgba(0, 121, 101, 0.08); color: var(--primary); }
.medium-days { background: rgba(243, 156, 18, 0.1); color: var(--warning); }
.low-days { background: rgba(231, 76, 60, 0.1); color: var(--danger); animation: pulse 2s infinite; }
.expired-days { background: var(--gray-200); color: var(--gray-600); }

.card-footer { padding: 24px; background: var(--gray-100); border-top: 1px solid var(--border-color); }
.subscription-active-msg { text-align: center; color: var(--primary); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }

/* --- Table Styles --- */
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { background: var(--gray-100); padding: 18px 24px; text-align: right; font-size: 0.9rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.modern-table td { padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.date-range-box { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }

/* --- Badges --- */
.badge { padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; display: inline-block; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.badge-active { background: var(--success); }
.badge-pending { background: var(--warning); }
.badge-expired, .badge-cancelled { background: var(--gray-500); }

/* --- Strict Dark Mode Overrides (High Accuracy) --- */
:global(body.dark-mode) .card { 
  background: #1e1e1e !important; 
  border-color: #333 !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4) !important;
}
:global(body.dark-mode) .card-body { 
  background: #1e1e1e !important; 
}
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
:global(body.dark-mode) .days-counter.expired-days { background: #333 !important; color: #888 !important; }
:global(body.dark-mode) .empty-state { color: #777 !important; }

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
</style>
