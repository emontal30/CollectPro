<template>
  <div class="payment-page">
    
    <PageHeader 
      title="الدفع" 
      subtitle="أكمل عملية الدفع لتفعيل اشتراكك"
      icon="💳"
    />

    <div class="payment-container">
      <div class="payment-card shadow-lg">
        
        <div class="payment-header">
          <h2 class="section-title">تفاصيل الدفع</h2>
          <div v-if="store.selectedPlan" class="plan-summary">
            <div class="plan-info">
              <span class="plan-label">الخطة المختارة:</span>
              <span class="plan-value highlighted-orange">{{ store.selectedPlan.name }}</span>
            </div>
            <div class="plan-info">
              <span class="plan-label">السعر:</span>
              <span class="plan-value highlighted-orange">{{ store.selectedPlan.price }} ج.م</span>
            </div>
          </div>
        </div>

        <div class="payment-form">
          <form @submit.prevent="store.submitPayment">
            
            <div class="form-grid">
              <div class="form-group">
                <label class="input-label">اسم المستخدم</label>
                <div class="input-wrapper">
                  <i class="fas fa-user icon"></i>
                  <input type="text" :value="store.userData.name" readonly class="base-input readonly" />
                </div>
              </div>

              <div class="form-group">
                <label class="input-label">البريد الإلكتروني</label>
                <div class="input-wrapper">
                  <i class="fas fa-envelope icon"></i>
                  <input type="email" :value="store.userData.email" readonly class="base-input readonly" />
                </div>
              </div>
            </div>

            <div class="form-group mt-4">
              <label for="transaction-id" class="input-label">رقم عملية التحويل <span class="required">*</span></label>
              <div class="input-wrapper">
                <i class="fas fa-money-check-alt icon"></i>
                <input 
                  id="transaction-id" 
                  v-model="store.transactionId" 
                  type="text" 
                  placeholder="أدخل رقم عملية التحويل المكون من أرقام" 
                  required 
                  class="base-input highlight"
                />
              </div>
              <small class="help-text">أدخل رقم العملية الذي حصلت عليه بعد إتمام التحويل من محفظتك</small>
            </div>

            <div class="payment-methods-section">
              <h3 class="methods-title">طرق الدفع المتاحة</h3>
              <p class="methods-subtitle">اختر وسيلة الدفع ثم اتبع التعليمات الظاهرة</p>

              <div class="methods-grid">
                <div 
                  class="method-card" 
                  :class="{ active: store.paymentMethod === 'vodafone-cash' }"
                  @click="store.setPaymentMethod('vodafone-cash')"
                >
                  <div class="method-icon v-cash">
                    <i class="fas fa-mobile-alt"></i>
                  </div>
                  <div class="method-info">
                    <h4>فودافون كاش</h4>
                    <p>عبر محفظة الهاتف</p>
                  </div>
                  <div class="check-mark"><i class="fas fa-check-circle"></i></div>
                </div>

                <div 
                  class="method-card" 
                  :class="{ active: store.paymentMethod === 'instapay' }"
                  @click="store.setPaymentMethod('instapay')"
                >
                  <div class="method-icon instapay">
                    <i class="fas fa-university"></i>
                  </div>
                  <div class="method-info">
                    <h4>انستا باي</h4>
                    <p>تحويل بنكي مباشر</p>
                  </div>
                  <div class="check-mark"><i class="fas fa-check-circle"></i></div>
                </div>
              </div>

              <!-- تفاصيل الخطوات -->
              <div v-if="store.paymentMethod" class="steps-box animate-fade-in">
                <h4 class="steps-title">
                  <i class="fas fa-info-circle"></i>
                  خطوات الدفع عبر {{ store.paymentMethod === 'vodafone-cash' ? 'فودافون كاش' : 'انستا باي' }}:
                </h4>
                <ol class="steps-list">
                  <li>افتح تطبيق {{ store.paymentMethod === 'vodafone-cash' ? 'فودافون كاش' : 'انستا باي' }}</li>
                  <li>اختر "تحويل الأموال"</li>
                  <li>
                    ادخل رقم الحساب: 
                    <span class="copy-container">
                      <strong class="copyable-text">01094085228</strong>
                      <button type="button" class="btn-copy-small" @click="copyToClipboard('01094085228')" title="نسخ الرقم">
                        <i class="fas fa-copy"></i>
                      </button>
                    </span>
                  </li>
                  <li>ادخل المبلغ المطلوب: <strong class="highlighted-orange">{{ store.selectedPlan?.price }} ج.م</strong></li>
                  <li>بعد النجاح، انسخ <strong>رقم العملية</strong> وأدخله في الحقل أعلاه</li>
                </ol>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="store.isLoading || store.isSubmitting || !store.transactionId">
                <template v-if="!store.isSubmitting">
                  <span>إرسال طلب الدفع</span>
                  <i class="fas fa-paper-plane mr-2"></i>
                </template>
                <template v-else>
                  <i class="fas fa-spinner fa-spin ml-2"></i>
                  جاري الإرسال...
                </template>
              </button>
              
              <router-link to="/app/subscriptions" class="btn btn-ghost btn-block mt-2">
                تغيير الخطة المختارة
              </router-link>
            </div>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject } from 'vue';
import { usePaymentStore } from '@/stores/paymentStore';
import PageHeader from '@/components/layout/PageHeader.vue';
import logger from '@/utils/logger.js';

const store = usePaymentStore();
const { addNotification } = inject('notifications') || {};

const copyToClipboard = (text) => {
  if (!navigator.clipboard) {
    logger.warn('Clipboard API not available');
    return;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    if (addNotification) {
      addNotification('تم نسخ الرقم بنجاح ✅', 'success');
    }
  }).catch(err => {
    logger.error('Failed to copy text: ', err);
  });
};

onMounted(() => {
  store.init();
});
</script>

<style scoped>
.payment-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.payment-card {
  background: var(--surface-bg);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.payment-header {
  padding: 25px;
  background: var(--table-header-bg);
  color: white;
  text-align: center;
}

.section-title {
  margin: 0 0 15px 0;
  font-size: 1.4rem;
  font-weight: 800;
}

.plan-summary {
  display: flex;
  justify-content: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: var(--border-radius);
  font-size: 0.95rem;
}

.plan-label { opacity: 0.9; margin-left: 5px; }
.plan-value { font-weight: 700; }

.highlighted-orange {
  color: #fb923c !important; /* لون برتقالي واضح */
  font-weight: 800;
}

.payment-form { padding: 30px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--gray-900);
}

.input-wrapper {
  position: relative;
  margin-top: 8px;
}

.input-wrapper .icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--primary);
  opacity: 0.7;
}

.base-input {
  width: 100%;
  padding: 12px 40px 12px 15px;
  border: 1.5px solid var(--gray-300);
  border-radius: var(--border-radius);
  font-family: inherit;
  transition: var(--transition);
  background: var(--surface-bg);
  color: var(--gray-900);
}

.base-input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.base-input.readonly {
  background: var(--gray-100);
  cursor: not-allowed;
  border-color: var(--gray-200);
}

.base-input.highlight {
  border-color: var(--primary-light);
  background: rgba(var(--primary-rgb), 0.01);
  font-weight: 700;
  font-size: 1.1rem;
}

.help-text {
  display: block;
  margin-top: 6px;
  font-size: 0.85rem;
  color: var(--gray-600);
}

/* Payment Methods */
.payment-methods-section {
  margin-top: 35px;
  padding-top: 25px;
  border-top: 1px solid var(--border-color);
}

.methods-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 5px;
  color: var(--gray-900);
}

.methods-subtitle {
  color: var(--gray-600);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.methods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 25px;
}

.method-card {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  background: var(--surface-bg);
}

.method-card:hover {
  border-color: var(--primary-light);
  background: rgba(var(--primary-rgb), 0.02);
}

.method-card.active {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.05);
}

.method-icon {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: white;
  margin-left: 12px;
}

.v-cash { background: #e60012; }
.instapay { background: #1e40af; }

.method-info h4 { margin: 0; font-size: 1rem; color: var(--gray-900); }
.method-info p { margin: 0; font-size: 0.8rem; color: var(--gray-600); }

.check-mark {
  position: absolute;
  top: -10px;
  left: -10px;
  font-size: 1.2rem;
  color: var(--primary);
  background: var(--surface-bg);
  border-radius: 50%;
  display: none;
}

.method-card.active .check-mark { display: block; }

/* Steps Box */
.steps-box {
  background: var(--gray-100);
  padding: 20px;
  border-radius: var(--border-radius);
  border-right: 4px solid var(--primary);
  margin-bottom: 25px;
}

.steps-title {
  margin: 0 0 12px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-dark);
}

.steps-list {
  padding-right: 20px;
  margin: 0;
}

.steps-list li {
  margin-bottom: 8px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--gray-800);
}

.copy-container {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.copyable-text {
  color: var(--danger);
  background: var(--surface-bg);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px dashed var(--danger);
  font-family: monospace;
}

.btn-copy-small {
  background: var(--gray-200);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--primary);
  font-size: 0.9rem;
  transition: var(--transition);
}

.btn-copy-small:hover {
  background: var(--primary);
  color: white;
}

/* Actions */
.form-actions { margin-top: 30px; }
.btn-block { width: 100%; justify-content: center; }
.btn-lg { padding: 15px; font-size: 1.1rem; }

.animate-fade-in {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dark Mode Overrides */
body.dark .input-label,
body.dark .methods-title,
body.dark .method-info h4 {
  color: var(--gray-900);
}

body.dark .base-input { 
  background: var(--gray-100);
  border-color: var(--gray-300); 
  color: #f8fafc; 
}

body.dark .base-input.readonly { 
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray-600);
}

body.dark .help-text,
body.dark .methods-subtitle,
body.dark .method-info p {
  color: var(--gray-600);
}

body.dark .steps-box { 
  background: var(--gray-100);
}

body.dark .steps-list li {
  color: var(--gray-800);
}
</style>