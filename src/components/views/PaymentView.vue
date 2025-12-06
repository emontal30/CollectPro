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
/* استيراد التنسيقات الخاصة بصفحة الدفع من payment.css و style.css */

.payment-page {
  width: 100%;
  padding-bottom: 40px;
  animation: fadeIn 0.5s ease-in-out;
}

.payment-container {
  max-width: 800px;
  margin: 0 auto;
}

.payment-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid rgba(0, 121, 101, 0.1);
}

.payment-header {
  padding: 30px;
  background: linear-gradient(135deg, #007965, #00a085);
  color: white;
}

.payment-header h2 {
  margin: 0 0 20px;
  font-size: 1.8rem;
}

.plan-summary {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.plan-label {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: 5px;
  display: block;
}

.plan-value {
  font-size: 1.2rem;
  font-weight: 700;
}

.payment-form {
  padding: 30px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.required { color: #dc3545; }

.input-container {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #777;
}

.transaction-icon {
  color: #ff8c00;
}

input {
  width: 100%;
  padding: 12px 45px 12px 15px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
  font-family: 'Cairo', sans-serif;
  transition: all 0.3s ease;
}

input:focus {
  border-color: #007965;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 121, 101, 0.2);
}

.readonly-input {
  background-color: #f8f9fa;
  color: #666;
  cursor: default;
}

.help-text {
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
  display: block;
}

.field-note {
  font-size: 0.8rem;
  color: #888;
  margin-top: 5px;
  display: block;
  font-style: italic;
}

/* طرق الدفع */
.payment-methods {
  margin: 30px 0;
}

.payment-info-text {
  margin-bottom: 25px;
  color: #666;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-option {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  position: relative;
}

.payment-option:hover {
  border-color: #007965;
  box-shadow: 0 4px 15px rgba(0, 121, 101, 0.1);
  transform: translateY(-2px);
}

.payment-option.active {
  border-color: #007965;
  background: rgba(0, 121, 101, 0.02);
}

.payment-option.active::after {
  content: "✓";
  position: absolute;
  top: 15px;
  left: 15px;
  width: 25px;
  height: 25px;
  background: #007965;
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 14px;
}

.payment-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 1.8rem;
  margin-left: 20px;
  flex-shrink: 0;
}

.v-cash {
  background: linear-gradient(135deg, #e60012, #b3000c);
}

.instapay {
  background: linear-gradient(135deg, #1e40af, #1e3a8a);
}

.payment-details {
  flex: 1;
}

.payment-details h4 {
  margin: 0 0 5px;
  color: #333;
  font-weight: 700;
}

.payment-details p {
  margin: 0 0 10px;
  color: #666;
  font-size: 0.95rem;
}

.payment-steps {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-right: 4px solid #007965;
  margin-top: 10px;
  animation: fadeIn 0.3s ease;
}

.payment-steps ol {
  margin: 0;
  padding-right: 20px;
}

.payment-steps li {
  margin-bottom: 5px;
  color: #555;
  font-size: 0.9rem;
}

.payment-steps strong {
  color: #007965;
}

/* زر الإرسال */
.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #007965, #00a085);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #00a085, #007965);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 121, 101, 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Dark Mode */
:global(body.dark) .payment-card {
  background: #1e1e1e;
  border-color: #333;
  color: #eee;
}

:global(body.dark) .form-group label,
:global(body.dark) .payment-methods h3,
:global(body.dark) .payment-details h4 {
  color: #eee;
}

:global(body.dark) input {
  background: #2a2a2a;
  border-color: #444;
  color: #eee;
}

:global(body.dark) .readonly-input {
  background: #333;
  color: #aaa;
}

:global(body.dark) .payment-option {
  background: #2a2a2a;
  border-color: #444;
}

:global(body.dark) .payment-option:hover,
:global(body.dark) .payment-option.active {
  border-color: #007965;
}

:global(body.dark) .payment-steps {
  background: #333;
}

:global(body.dark) .payment-steps li,
:global(body.dark) .payment-details p {
  color: #ccc;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .payment-header { padding: 20px; }
  .payment-form { padding: 20px; }
  
  .plan-summary {
    flex-direction: column;
    gap: 10px;
  }
  
  .payment-option {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  
  .payment-icon { margin-left: 0; margin-bottom: 15px; }
  
  .payment-steps { text-align: right; width: 100%; }
  
  .payment-option.active::after {
    top: 10px; left: 10px;
  }
}
</style>