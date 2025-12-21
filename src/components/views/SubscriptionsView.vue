<template>
  <div class="subscriptions-page">
    
    <PageHeader 
      title="باقات الاشتراك" 
      subtitle="اختر خطة الاشتراك المناسبة لك وتمتع بجميع ميزات التطبيق الاحترافية"
      icon="💎"
    />

    <section class="subscription-intro">
      <div class="intro-content">
        <h2>استثمر في نمو أعمالك</h2>
        <p>نقدم لك حلولاً مرنة تناسب حجم أعمالك وطموحاتك، مع دعم فني متواصل وميزات حصرية.</p>
      </div>
    </section>

    <div class="plans-wrapper">
      <div v-if="store.isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>جاري تحميل الخطط المتاحة...</span>
      </div>

      <div v-else-if="store.error" class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ store.error }}</span>
      </div>

      <div v-else class="plans-grid">
        <div 
          v-for="plan in store.plans" 
          :key="plan.plan_id"
          class="plan-card"
          :class="{ 
            'featured': plan.metadata.featured,
            'plan-quarterly': plan.plan_id === 'quarterly',
            'plan-monthly': plan.plan_id === 'monthly', 
            'plan-yearly': plan.plan_id === 'yearly'
          }"
        >
          <div v-if="plan.metadata.featured" class="featured-badge">
            <i class="fas fa-star"></i> {{ getBadgeText(plan.plan_id) }}
          </div>

          <div class="plan-header">
            <div class="plan-icon">
              <i :class="getPlanIcon(plan.plan_id)"></i>
            </div>
            <h3 class="plan-name">{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="currency">ج.م</span>
              <span class="price">{{ plan.price }}</span>
              <span class="period">/ {{ plan.metadata.period }}</span>
            </div>
          </div>

          <div class="plan-features">
            <ul>
              <li v-for="(feature, idx) in plan.metadata.features" :key="idx">
                <i class="fas fa-check-circle"></i> 
                <span>{{ feature }}</span>
              </li>
            </ul>
          </div>

          <div class="plan-footer">
            <button class="choose-plan-btn" @click="handleSelectPlan(plan.plan_id)">
              <span>ابدأ الآن</span>
              <i class="fas fa-arrow-left"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <section class="faq-section">
      <div class="section-title">
        <i class="fas fa-question-circle"></i>
        <h2>الأسئلة الشائعة</h2>
      </div>
      
      <div class="faq-grid">
        <div 
          class="faq-item" 
          :class="{ 'active': faqState.q1 }"
          @click="toggleFaq('q1')"
        >
          <div class="faq-question">
            <h3>هل يمكنني إلغاء اشتراكي في أي وقت؟</h3>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>نعم، يمكنك إلغاء اشتراكك في أي وقت من خلال التواصل مع الإدارة. سيظل بإمكانك الوصول إلى الميزات المدفوعة حتى نهاية فترة الفوترة الحالية أو وفقاً لسياسة الإدارة.</p>
          </div>
        </div>

        <div 
          class="faq-item" 
          :class="{ 'active': faqState.q2 }"
          @click="toggleFaq('q2')"
        >
          <div class="faq-question">
            <h3>ما هي طرق الدفع المقبولة؟</h3>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>نقبل الدفع عن طريق تحويلات المحافظ الإلكترونية (فودافون كاش، اتصالات كاش، الخ) وتطبيق انستا باي (InstaPay). جميع العمليات تتم بآمان تام.</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';

const store = useSubscriptionsStore();
const router = useRouter();

function getBadgeText(planId) {
  if (planId === 'quarterly') return 'الأكثر توفيراً';
  if (planId === 'yearly') return 'أفضل قيمة';
  return '';
}

function getPlanIcon(planId) {
  switch(planId) {
    case 'monthly': return 'fas fa-paper-plane';
    case 'quarterly': return 'fas fa-rocket';
    case 'yearly': return 'fas fa-crown';
    default: return 'fas fa-gem';
  }
}

const faqState = reactive({
  q1: false,
  q2: false
});

function toggleFaq(key) {
  faqState[key] = !faqState[key];
}

async function handleSelectPlan(planId) {
  const success = await store.selectPlan(planId);
  if (success) {
    router.push('/app/payment');
  }
}

onMounted(() => {
  store.fetchPlans();
});
</script>

<style scoped>
.subscriptions-page {
  padding-bottom: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
}

/* Intro Section */
.subscription-intro {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg) var(--spacing-md);
}

.intro-content h2 {
  font-size: 1.8rem;
  color: var(--gray-900);
  margin-bottom: var(--spacing-sm);
  font-weight: 700;
}

.intro-content p {
  color: var(--gray-600);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Plans Grid */
.plans-wrapper {
  margin-bottom: 50px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  justify-items: center;
}

/* Plan Card */
.plan-card {
  background: var(--white);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  width: 100%;
  max-width: 380px;
  transition: var(--transition);
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--gray-200);
}

.plan-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-light);
}

.plan-card.featured {
  border: 2px solid var(--primary);
  transform: scale(1.02);
  z-index: 2;
}

.plan-card.featured:hover {
  transform: scale(1.05) translateY(-8px);
}

/* Badge */
.featured-badge {
  position: absolute;
  top: 15px;
  right: -35px;
  background: var(--primary);
  color: white;
  padding: 5px 40px;
  transform: rotate(45deg);
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

/* Plan Header */
.plan-header {
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
  background: linear-gradient(to bottom, var(--gray-100), var(--white));
  border-bottom: 1px solid var(--gray-200);
}

.plan-icon {
  font-size: 2.5rem;
  color: var(--primary);
  margin-bottom: var(--spacing-md);
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: var(--spacing-sm);
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.price {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--primary);
}

.currency {
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-600);
}

.period {
  font-size: 0.9rem;
  color: var(--gray-500);
  margin-right: 5px;
}

/* Plan Features */
.plan-features {
  padding: var(--spacing-lg);
  flex-grow: 1;
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--gray-700);
  font-size: 0.95rem;
  border-bottom: 1px dashed var(--gray-200);
}

.plan-features li:last-child {
  border-bottom: none;
}

.plan-features li i { 
  color: var(--success);
  font-size: 1.1rem;
}

/* Plan Footer */
.plan-footer {
  padding: var(--spacing-lg);
  text-align: center;
}

.choose-plan-btn {
  width: 100%;
  padding: 14px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-lg);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.choose-plan-btn:hover {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.choose-plan-btn i {
  transition: transform 0.3s ease;
}

.choose-plan-btn:hover i {
  transform: translateX(-5px);
}

/* FAQ Section */
.faq-section {
  padding: var(--spacing-xl) var(--spacing-md);
  background: var(--gray-100);
  border-radius: var(--border-radius-xl);
  margin: var(--spacing-lg);
}

.faq-section .section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--spacing-xl);
  justify-content: center;
}

.faq-section .section-title i {
  font-size: 1.8rem;
  color: var(--primary);
}

.faq-section h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-md);
}

@media (max-width: 600px) {
  .faq-grid {
    grid-template-columns: 1fr;
  }
}

.faq-item {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition);
}

.faq-item:hover {
  border-color: var(--primary-light);
}

.faq-question {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.faq-question h3 {
  font-size: 1.05rem;
  margin: 0;
  color: var(--gray-800);
  font-weight: 700;
}

.faq-question i {
  color: var(--gray-400);
  transition: transform 0.3s ease;
}

.faq-item.active .faq-question i {
  transform: rotate(180deg);
  color: var(--primary);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  background: var(--gray-100);
}

.faq-item.active .faq-answer {
  max-height: 200px;
  border-top: 1px solid var(--gray-200);
}

.faq-answer p {
  padding: var(--spacing-md) var(--spacing-lg);
  margin: 0;
  color: var(--gray-600);
  line-height: 1.6;
}

/* States */
.loading-state, .error-message {
  text-align: center;
  padding: 50px;
  color: var(--gray-600);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--gray-200);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message i {
  font-size: 3rem;
  color: var(--danger);
  margin-bottom: 15px;
  display: block;
}

/* Dark Mode Overrides (Handled mainly by unified system, but specific tweaks here) */
body.dark .plan-header {
  background: linear-gradient(to bottom, var(--dark-surface), var(--content-bg));
  border-bottom-color: var(--dark-border);
}

body.dark .plan-card {
  border-color: var(--dark-border);
}

body.dark .plan-features li {
  border-bottom-color: rgba(255,255,255,0.05);
  color: var(--gray-600);
}

body.dark .faq-section {
  background: var(--dark-surface);
}

body.dark .faq-item {
  background: var(--content-bg);
  border-color: var(--dark-border);
}

body.dark .faq-answer {
  background: var(--dark-surface);
}
</style>