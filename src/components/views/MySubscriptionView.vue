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
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري تحميل بيانات اشتراكك...</p>
          </div>
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
          
          <div v-if="store.loadingPlans" class="loading-spinner">
             <p>جاري تحميل الخطط...</p>
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
import { onMounted } from 'vue';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useMySubscriptionStore();

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
  store.init();
});
</script>

<style scoped>
/* استيراد التنسيقات من my-subscription.css و style.css */

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

/* Loading Spinner */
.loading-spinner {
  text-align: center;
  padding: 40px;
}

.loading-spinner i {
  font-size: 2rem;
  color: var(--primary, #007965);
  margin-bottom: 10px;
}

.loading-spinner p {
  color: #666;
  margin: 0;
}

/* Subscription Card */
.subscription-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 30px;
  border: 1px solid rgba(0, 121, 101, 0.1);
  transition: all 0.3s ease;
}

.subscription-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
}

.subscription-header {
  padding: 30px;
  background: linear-gradient(135deg, var(--primary, #007965), #00a085);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  position: relative;
  overflow: hidden;
}

.subscription-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  transform: rotate(45deg);
}

.subscription-header h2 {
  margin: 0;
  font-size: 1.8rem;
  position: relative;
  z-index: 1;
}

/* Status Badges */
.status-badge {
  padding: 8px 20px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  position: relative;
  z-index: 1;
  color: white;
}

.status-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  animation: pulse 2s infinite;
  margin-left: 6px;
}

.status-active { background: linear-gradient(135deg, #10b981, #059669); }
.status-pending { background: linear-gradient(135deg, #f59e0b, #d97706); }
.status-expired, .status-cancelled { background: linear-gradient(135deg, #ef4444, #dc2626); }

/* Details Section */
.subscription-details {
  padding: 30px;
  background: #fafafa;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-value {
  font-weight: 600;
  color: #333;
  font-size: 1.05rem;
  padding: 6px 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

/* Days Remaining Colors */
.low-days { 
  background: linear-gradient(135deg, #ef4444, #dc2626); color: white; 
  animation: pulse 2s infinite;
}
.medium-days { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
.high-days { background: linear-gradient(135deg, #10b981, #059669); color: white; }

/* Actions Section */
.subscription-actions {
  padding: 0 30px 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.action-info, .action-warning, .action-success {
  padding: 15px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-info { background: rgba(0, 121, 101, 0.1); color: var(--primary, #007965); }
.action-warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.action-success { background: rgba(16, 185, 129, 0.1); color: #059669; }

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--primary, #007965), #005a4b);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  width: fit-content;
}

/* Column widths for modern table */
.modern-table th:nth-child(1),
.modern-table td:nth-child(1) {
  width: 25%;
  min-width: 150px;
}

.modern-table th:nth-child(2),
.modern-table td:nth-child(2) {
  width: 25%;
  min-width: 120px;
}

.modern-table th:nth-child(3),
.modern-table td:nth-child(3) {
  width: 25%;
  min-width: 120px;
}

.modern-table th:nth-child(4),
.modern-table td:nth-child(4) {
  width: 25%;
  min-width: 100px;
}

/* History Table */
.subscription-history {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid rgba(0, 121, 101, 0.1);
}

.history-header {
  padding: 25px 30px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid rgba(0, 121, 101, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h2 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--primary, #007965);
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-stats .total-subscriptions {
  background: linear-gradient(135deg, var(--primary, #007965), #005a4b);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.table-container {
  padding: 20px;
  background: white;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #d1d5db;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  background: white;
  table-layout: fixed;
}

th {
  padding: 16px 12px;
  text-align: right;
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #d1d5db;
  border-right: 1px solid #d1d5db;
  position: relative;
}

th:last-child {
  border-right: none;
}

th i {
  margin-left: 6px;
  color: #6b7280;
}

td {
  padding: 16px 12px;
  text-align: right;
  border-bottom: 1px solid #d1d5db;
  border-right: 1px solid #d1d5db;
  vertical-align: middle;
  color: #374151;
  font-size: 0.95rem;
  overflow: hidden;
  word-wrap: break-word;
}

td:last-child {
  border-right: none;
}

tbody tr:last-child td {
  border-bottom: none;
}

/* Plan Info Cell */
.plan-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-height: 40px;
}

.plan-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary, #007965), #005a4b);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.plan-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.plan-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.plan-duration {
  font-size: 0.85rem;
  color: #6b7280;
  background: rgba(0, 121, 101, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  width: fit-content;
  flex-shrink: 0;
}

/* Date Cell */
.date-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  font-size: 0.9rem;
}

.date-cell i {
  color: var(--primary, #007965);
  font-size: 0.9rem;
}

/* Status Badge in Table */
.status-badge {
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-width: 80px;
  text-align: center;
}

/* Row Status Colors - Add left border instead of right to avoid conflicts */
tr.row-active { border-left: 4px solid #10b981; }
tr.row-pending { border-left: 4px solid #f59e0b; }
tr.row-expired, tr.row-cancelled { border-left: 4px solid #ef4444; }

/* Table Hover Effects */
tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background: #f9fafb;
}

/* No Data State */
.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.no-data-icon {
  font-size: 4rem;
  color: #d1d5db;
  margin-bottom: 20px;
}

.no-data h3 {
  margin: 0 0 10px 0;
  color: #374151;
  font-size: 1.3rem;
}

.no-data p {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .modern-table {
    font-size: 0.85rem;
  }
  
  th, td {
    padding: 12px 8px;
  }
  
  .plan-info {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .date-cell {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalScale 0.3s ease;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 { margin: 0; color: var(--primary, #007965); }

.close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body { padding: 20px; }
.modal-footer { padding: 20px; border-top: 1px solid #eee; text-align: right; }

.btn-secondary {
  padding: 10px 20px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Renewal Plans inside Modal */
.renew-plans {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.renew-plan {
  flex: 1;
  min-width: 200px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.renew-plan:hover {
  border-color: var(--primary, #007965);
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.renew-plan h3 { margin: 0 0 10px; color: #333; }

.plan-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary, #007965);
}

.plan-offer {
  background: #27ae60;
  color: white;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-top: 10px;
  display: inline-block;
}

.no-subscription, .no-data {
  text-align: center;
  padding: 30px;
  color: #666;
}

.no-subscription i, .no-data i {
  font-size: 2rem;
  margin-bottom: 10px;
  display: block;
}

/* Dark Mode Support */
:global(body.dark) .subscription-card, 
:global(body.dark) .subscription-history,
:global(body.dark) .modal-content {
  background: #1e1e1e;
  border-color: rgba(0, 121, 101, 0.2);
  color: #e8e8e8;
}

:global(body.dark) .subscription-details, :global(body.dark) .action-info {
  background: rgba(0,0,0,0.2);
}

:global(body.dark) .detail-value {
  background: rgba(0,0,0,0.3);
  color: #e8e8e8;
}

:global(body.dark) .detail-label { color: #aaa; }
:global(body.dark) th { background: #2a2a2a; color: #e8e8e8; }
:global(body.dark) tr:hover { background: rgba(0, 121, 101, 0.1); }

/* Table status icons for history (from CSS) */
#history-table .status-active::before { content: '\f058'; font-family: "Font Awesome 6 Free"; font-weight: 900; margin-left: 5px; }
#history-table .status-pending::before { content: '\f111'; font-family: "Font Awesome 6 Free"; font-weight: 900; margin-left: 5px; }
#history-table .status-expired::before, 
#history-table .status-cancelled::before { content: '\f057'; font-family: "Font Awesome 6 Free"; font-weight: 900; margin-left: 5px; }


@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalScale {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .subscription-header { flex-direction: column; align-items: flex-start; }
  .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
  .subscription-actions { padding: 0 20px 20px; }
  .btn-primary { width: 100%; }
  .modal-content { width: 95%; }
}
</style>