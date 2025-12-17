<template>
  <div class="payment-page">
    
    <PageHeader 
      title="الدفع" 
      subtitle="أكمل عملية الدفع لتفعيل اشتراكك"
      icon="💳"
    />

    <div class="payment-container">
      <div class="payment-card">
        
        <div class="payment-header">
          <h2>تفاصيل الدفع</h2>
          <div v-if="store.selectedPlan" class="plan-summary">
            <div class="plan-info">
              <span class="plan-label">الخطة المختارة:</span>
              <span class="plan-value">{{ store.selectedPlan.name }}</span>
            </div>
            <div class="plan-info">
              <span class="plan-label">السعر:</span>
              <span class="plan-value">{{ store.selectedPlan.price }} ج.م</span>
            </div>
          </div>
        </div>

        <div class="payment-form">
          <form @submit.prevent="store.submitPayment">
            
            <div class="form-group">
              <label>اسم المستخدم <span class="required">*</span></label>
              <div class="input-container">
                <i class="fas fa-user input-icon"></i>
                <input type="text" :value="store.userData.name" readonly class="readonly-input" />
              </div>
              <small class="field-note">يتم جلب اسم المستخدم من حسابك المسجل</small>
            </div>

            <div class="form-group">
              <label>البريد الإلكتروني <span class="required">*</span></label>
              <div class="input-container">
                <i class="fas fa-envelope input-icon"></i>
                <input type="email" :value="store.userData.email" readonly class="readonly-input" />
              </div>
            </div>

            <div class="form-group">
              <label>نوع الاشتراك</label>
              <div class="input-container">
                <i class="fas fa-calendar-alt input-icon"></i>
                <input type="text" :value="store.selectedPlan?.name || '-'" readonly class="readonly-input" />
              </div>
            </div>

            <div class="form-group">
              <label for="transaction-id">رقم عملية التحويل</label>
              <div class="input-container">
                <i class="fas fa-money-check-alt input-icon transaction-icon"></i>
                <input 
                  id="transaction-id" 
                  v-model="store.transactionId" 
                  type="text" 
                  placeholder="أدخل رقم عملية التحويل" 
                  required 
                />
              </div>
              <span class="help-text">أدخل رقم العملية الذي حصلت عليه بعد إتمام التحويل</span>
            </div>

            <div class="payment-methods">
              <h3>طرق الدفع المتاحة</h3>
              <p class="payment-info-text">اختر طريقة الدفع المفضلة لديك، ثم أدخل رقم عملية التحويل في الحقل أعلاه.</p>

              <div class="payment-options">
                
                <div 
                  class="payment-option" 
                  :class="{ active: store.paymentMethod === 'vodafone-cash' }"
                  @click="store.setPaymentMethod('vodafone-cash')"
                >
                  <div class="payment-icon v-cash">
                    <i class="fas fa-mobile-alt"></i>
                  </div>
                  <div class="payment-details">
                    <h4>فودافون كاش</h4>
                    <p>ادفع بسهولة من خلال تطبيق فودافون كاش</p>
                    <div v-show="store.paymentMethod === 'vodafone-cash'" class="payment-steps">
                      <p><strong>الخطوات:</strong></p>
                      <ol>
                        <li>افتح تطبيق - فودافون كاش</li>
                        <li>اختر "تحويل الأموال"</li>
                        <li>ادخل رقم الحساب: <strong>01094085228</strong></li>
                        <li>ادخل المبلغ المطلوب ({{ store.selectedPlan?.price }} ج.م)</li>
                        <li>انسخ رقم العملية وأدخله في الحقل أعلاه</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div 
                  class="payment-option" 
                  :class="{ active: store.paymentMethod === 'instapay' }"
                  @click="store.setPaymentMethod('instapay')"
                >
                  <div class="payment-icon instapay">
                    <i class="fas fa-university"></i>
                  </div>
                  <div class="payment-details">
                    <h4>انستا باي</h4>
                    <p>ادفع مباشرة من خلال خدمة انستا باي البنكية</p>
                    <div v-show="store.paymentMethod === 'instapay'" class="payment-steps">
                      <p><strong>الخطوات:</strong></p>
                      <ol>
                        <li>افتح تطبيق - انستا باي</li>
                        <li>اختر "تحويل لحساب آخر"</li>
                        <li>ادخل رقم الحساب: <strong>01094085228</strong></li>
                        <li>ادخل المبلغ المطلوب ({{ store.selectedPlan?.price }} ج.م)</li>
                        <li>انسخ رقم العملية وأدخله في الحقل أعلاه</li>
                      </ol>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <button type="submit" class="submit-btn" :disabled="store.isLoading">
              <span v-if="!store.isLoading" class="btn-text">إرسال طلب الدفع</span>
              <div v-else class="spinner">
                <i class="fas fa-spinner fa-spin"></i> جاري الإرسال...
              </div>
            </button>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePaymentStore } from '@/stores/paymentStore';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = usePaymentStore();

onMounted(() => {
  store.init();
});
</script>

<style scoped>
.payment-option {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 2px solid var(--gray-300);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 15px;
  position: relative;
}

.payment-option:hover, .payment-option.active {
  border-color: var(--primary);
  background: rgba(0, 121, 101, 0.02);
}

.payment-option.active::after {
  content: "✔"; /* Checkmark */
  position: absolute;
  top: 15px;
  left: 15px;
  color: var(--primary);
  font-weight: bold;
}

.payment-icon {
  width: 50px; height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  margin-left: 15px;
}

.v-cash { background: #e60012; }
.instapay { background: #1e40af; }
</style>