<template>
  <div class="my-subscription-page">
    
    <PageHeader 
      title="اشتراكي" 
      subtitle="عرض وتفاصيل اشتراكك الحالي"
      icon="👤"
    />

    <div class="subscription-container">
      <div v-if="store.isLoading" class="subscription-card">
        <div class="subscription-details">
          <Loader message="جاري تحميل بيانات اشتراكك..." />
        </div>
      </div>

      <div v-else>
        <div class="subscription-card">
          <div class="subscription-header">
            <h2><i class="fas fa-shield-alt"></i> حالة اشتراكك</h2>
            
            <div v-if="store.subscription">
              <span class="status-badge" :class="`status-${store.subscription.status}`">
                {{ store.statusText }}
              </span>
            </div>
            <div v-else>
              <span class="status-badge status-expired">لا يوجد اشتراك</span>
            </div>
          </div>

          <div v-if="store.subscription" class="subscription-details">
            <div class="detail-row">
              <span class="detail-label"><i class="fas fa-cube"></i> نوع الخطة:</span>
              <span class="detail-value">
                {{ store.subscription.subscription_plans?.name_ar || store.subscription.plan_name }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label"><i class="fas fa-calendar-alt"></i> تاريخ البدء:</span>
              <span class="detail-value">{{ store.formatDate(store.subscription.start_date) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label"><i class="fas fa-calendar-check"></i> تاريخ الانتهاء:</span>
              <span class="detail-value">{{ store.formatDate(store.subscription.end_date) }}</span>
            </div>
            <div class="detail-row">
               <span class="detail-label"><i class="fas fa-info-circle"></i> الحالة:</span>
               <span class="detail-value">{{ store.statusText }}</span>
            </div>
            <div class="detail-row">
               <span class="detail-label"><i class="fas fa-hourglass-half"></i> الأيام المتبقية:</span>
               <span 
                 id="days-remaining" 
                 class="detail-value" 
                 :class="store.daysClass"
               >
                 {{ store.daysRemaining > 0 ? `${store.daysRemaining} يوم` : 'اشتراك منتهي' }}
               </span>
            </div>
          </div>

          <div v-else class="subscription-details">
             <div class="no-subscription">
               <i class="fas fa-info-circle"></i>
               <p>أنت غير مشترك حاليًا في أي باقة.</p>
             </div>
          </div>

          <div class="subscription-actions">
            
            <div v-if="store.subscription?.status === 'pending'" class="action-info">
              <i class="fas fa-clock"></i>
              <p>طلبك قيد المراجعة. سيتم تفعيل اشتراكك خلال 24 ساعة.</p>
            </div>

            <template v-else-if="store.subscription?.status === 'active'">
              <div v-if="store.daysRemaining <= 7 && store.daysRemaining > 0">
                <div class="action-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <p>تنبيه: اشتراكك ينتهي خلال {{ store.daysRemaining }} أيام. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.</p>
                </div>
                <button class="btn-primary" @click="store.openRenewModal">
                  <i class="fas fa-sync-alt"></i> تجديد الاشتراك
                </button>
              </div>
              
              <div v-else-if="store.daysRemaining <= 0">
                <div class="action-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <p>انتهت صلاحية اشتراكك. جدد الآن للاستمرار.</p>
                </div>
                <router-link to="/app/subscriptions" class="btn-primary">
                  <i class="fas fa-rocket"></i> اشترك الآن
                </router-link>
              </div>

              <div v-else class="action-success">
                <i class="fas fa-check-circle"></i>
                <p>اشتراكك نشط ومستمر. متبقي {{ store.daysRemaining }} يوم.</p>
              </div>
            </template>

            <router-link v-else to="/app/subscriptions" class="btn-primary">
              <i class="fas fa-rocket"></i> اشترك الآن
            </router-link>
          </div>
        </div>

        <div class="subscription-history">
          <div class="history-header">
            <h2><i class="fas fa-history"></i> تاريخ الاشتراكات</h2>
            <div class="history-stats">
              <span class="total-subscriptions">{{ store.history.length }} اشتراك</span>
            </div>
          </div>
          
          <div class="table-container">
            <div class="table-wrapper">
              <table id="history-table" class="modern-table">
                <thead>
                  <tr>
                    <th><i class="fas fa-cube"></i> نوع الخطة</th>
                    <th><i class="fas fa-calendar-alt"></i> تاريخ البدء</th>
                    <th><i class="fas fa-calendar-check"></i> تاريخ الانتهاء</th>
                    <th><i class="fas fa-info-circle"></i> الحالة</th>
                  </tr>
                </thead>
                <tbody v-if="store.history.length > 0">
                  <tr v-for="(sub, index) in store.history" :key="sub.id" :class="`row-${sub.status}`">
                    <td>
                      <div class="plan-info">
                        <div class="plan-icon">
                          <i class="fas fa-cube"></i>
                        </div>
                        <div class="plan-details">
                          <span class="plan-name">{{ sub.subscription_plans?.name_ar || sub.plan_name }}</span>
                          <span class="plan-duration">{{ getDurationText(sub) }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="date-cell">
                        <i class="fas fa-calendar-day"></i>
                        <span>{{ store.formatDate(sub.start_date) }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="date-cell">
                        <i class="fas fa-calendar-check"></i>
                        <span>{{ store.formatDate(sub.end_date) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" :class="`status-${sub.status}`">
                        <i class="fas" :class="getStatusIcon(sub.status)"></i>
                        {{ getStatusText(sub.status) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-if="store.history.length === 0" class="no-data">
              <div class="no-data-icon">
                <i class="fas fa-inbox"></i>
              </div>
              <h3>لا يوجد تاريخ اشتراكات</h3>
              <p>لم تقم بإنشاء أي اشتراكات بعد</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.isRenewModalOpen" class="modal show">
      <div class="modal-content">
        <div class="modal-header">
          <h2>تجديد الاشتراك</h2>
          <button class="close-modal" @click="store.isRenewModalOpen = false">&times;</button>
        </div>
        <div class="modal-body">
          
           <div v-if="store.loadingPlans">
             <Loader message="جاري تحميل الخطط..." />
           </div>
          
          <div v-else class="renew-plans">
            <div 
              v-for="plan in store.renewalPlans" 
              :key="plan.id" 
              class="renew-plan"
              @click="store.selectRenewalPlan(plan.planIdentifier)"
            >
              <h3>{{ plan.displayName }}</h3>
              <div class="plan-price">{{ plan.price }} ج.م</div>
              <div class="plan-offer">{{ plan.features }}</div>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="store.isRenewModalOpen = false">إلغاء</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { onMounted, onActivated, watch } from 'vue';
import logger from '@/utils/logger.js'
import { useRoute } from 'vue-router';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import Loader from '@/components/ui/Loader.vue';

const store = useMySubscriptionStore();
const route = useRoute();

// When the route becomes active (or user navigates back), re-init to ensure fresh data
onActivated(() => {
  logger.info('MySubscription activated — re-initializing store');
  store.init().catch(err => logger.error('Error re-initializing subscription on activate:', err));
});

// Watch route changes to re-init when the user navigates to this view
watch(() => route.name, (newName) => {
  if (newName === 'MySubscription') {
    logger.info('Route changed to MySubscription — init store');
    store.init().catch(err => logger.error('Error init on route change:', err));
  }
});

// دالة للحصول على نص المدة
function getDurationText(subscription) {
  if (!subscription.start_date || !subscription.end_date) return '';
  
  const start = new Date(subscription.start_date);
  const end = new Date(subscription.end_date);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 30) return 'شهري';
  if (diffDays === 90) return 'ربع سنوي';
  if (diffDays === 365) return 'سنوي';
  return `${diffDays} يوم`;
}

// دالة للحصول على أيقونة الحالة
function getStatusIcon(status) {
  const icons = {
    active: 'fa-check-circle',
    pending: 'fa-clock',
    expired: 'fa-times-circle',
    cancelled: 'fa-times-circle'
  };
  return icons[status] || 'fa-question-circle';
}

// دالة للحصول على نص الحالة
function getStatusText(status) {
  const texts = {
    active: 'نشط',
    pending: 'قيد المراجعة',
    expired: 'منتهي',
    cancelled: 'ملغي'
  };
  return texts[status] || 'غير معروف';
}

onMounted(() => {
  logger.info('📱 MySubscription view mounted, loading subscription data...');
  store.init().then(() => {
    logger.info('✅ Subscription data loaded');
  }).catch(err => {
    logger.error('❌ Error loading subscription:', err);
  });
});
</script>

<style scoped>
.my-subscription-page {
  width: 100%;
  animation: fadeIn 0.5s ease-in-out;
  padding-bottom: 50px;
}

.subscription-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>