<template>
  <div class="subscriptions-page">
    
    <PageHeader 
      title="الاشتراكات" 
      subtitle="اختر خطة الاشتراك المناسبة لك وتمتع بجميع ميزات التطبيق"
      icon="💎"
    />

    <section class="subscription-intro">
      <h2>اختر خطة الاشتراك المناسبة لك</h2>
      <p>تمتع بجميع ميزات تطبيق CollectPro مع خطط اشتراك مرنة تناسب احتياجاتك</p>
    </section>

    <div class="plans-container">
      
      <div v-if="store.isLoading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i> جاري تحميل الخطط...
      </div>

      <div v-else-if="store.error" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ store.error }}
      </div>

      <div 
        v-for="plan in store.plans" 
        v-else 
        :key="plan.plan_id"
        class="plan-card"
        :class="{ 
          'featured': plan.metadata.featured,
          'special-plan': !plan.metadata.featured,
          'quarterly-plan': plan.plan_id === 'quarterly',
          'monthly-plan': plan.plan_id === 'monthly', 
          'yearly-plan': plan.plan_id === 'yearly'
        }"
      >
        <div v-if="plan.metadata.featured" class="featured-badge">
          {{ getBadgeText(plan.plan_id) }}
        </div>

        <div class="plan-header">
          <h3>{{ plan.name }}</h3>
          <div class="plan-price">
            <span class="currency">ج.م</span>
            <span class="price">{{ plan.price }}</span>
            <span class="period">/ {{ plan.metadata.period }}</span>
          </div>
        </div>

        <div class="plan-features">
          <ul>
            <li v-for="(feature, idx) in plan.metadata.features" :key="idx">
              <i class="fas fa-check"></i> {{ feature }}
            </li>
          </ul>
        </div>

        <div class="plan-footer">
          <button class="choose-plan-btn" @click="handleSelectPlan(plan.plan_id)">
            اختر الخطة
          </button>
        </div>
      </div>
    </div>

    <section class="faq-section">
      <h2>الأسئلة الشائعة</h2>
      
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
          <p>نعم، يمكنك إلغاء اشتراكك في أي وقت من خلال التواصل مع الادمن . سيظل بإمكانك الوصول إلى الميزات المدفوعة حتى نهاية فترة الفوترة الحالية او بما تراه الاداره .</p>
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
          <p>نحن نقبل الدفع عن طريق تحويلات الكاش , وانستا باى . تتم معالجة جميع المدفوعات بشكل آمن .</p>
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

// دوال مساعدة للشارات
function getBadgeText(planId) {
  if (planId === 'quarterly') return 'الأكثر شيوعًا';
  return ''; // لا شارة للخطط الأخرى
}

// حالة الأسئلة الشائعة (Accordion)
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
/* استيراد التنسيقات من subscriptions.css و style.css */

.subscriptions-page {
  max-width: 768px;
  width: 100%;
  margin: 0 auto;
  animation: fadeIn 0.5s ease-in-out;
  padding-bottom: 40px;
}

.subscription-intro {
  text-align: center;
  margin-bottom: 40px;
}

.subscription-intro h2 {
  font-size: 2rem;
  color: var(--primary, #007965);
  margin-bottom: 10px;
}

.subscription-intro p {
  font-size: 1.1rem;
  color: #666;
  max-width: 700px;
  margin: 0 auto;
}

.plans-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
  margin-bottom: 60px;
}

.loading-state, .error-message {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
  width: 100%;
  padding: 20px;
}

.error-message { color: var(--danger, #e74c3c); }

/* Plan Card Styles */
.plan-card {
  background: white;
  border-radius: 16px; /* var(--border-radius) */
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  overflow: hidden;
  width: 100%;
  max-width: 350px;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid rgba(0,0,0,0.05);
}

.plan-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.plan-card.featured,
.plan-card.special-plan {
  border: 2px solid #66bb6a; /* أخضر فاتح لجميع الخطط */
}

.plan-card.featured {
  transform: scale(1.05);
  z-index: 1;
}

/* إطار خاص لخطة 3 شهور */
.quarterly-plan.featured {
  border: 2px solid #ff9800; /* برتقالي */
}

.plan-card.featured:hover {
  transform: scale(1.05) translateY(-10px);
}

.featured-badge {
  position: absolute;
  top: 15px;
  left: -30px;
  background: #66bb6a; /* أخضر فاتح */
  color: white;
  padding: 5px 30px;
  font-size: 0.9rem;
  font-weight: 600;
  transform: rotate(-45deg);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

/* شارة خاصة لخطة 3 شهور */
.quarterly-plan .featured-badge {
  background: #ff9800; /* برتقالي */
}

.plan-header {
  padding: 30px 20px;
  text-align: center;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.plan-header h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: #333;
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 10px;
}

.currency {
  font-size: 1rem;
  color: #666;
  margin-left: 5px;
}

.price {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary, #007965);
}

.period {
  font-size: 1rem;
  color: #666;
  margin-right: 5px;
}

.plan-features {
  padding: 20px;
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  color: #555;
}

.plan-features li:last-child {
  border-bottom: none;
}

.plan-features i {
  color: var(--success, #27ae60);
  margin-left: 10px;
  font-size: 1.2rem;
}

.plan-footer {
  padding: 20px;
  text-align: center;
}

.choose-plan-btn {
  background: linear-gradient(135deg, var(--primary, #007965), #00a085);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 30px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  font-family: 'Cairo', sans-serif;
}

.choose-plan-btn:hover {
  background: linear-gradient(135deg, #00a085, var(--primary, #007965));
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 121, 101, 0.3);
}

/* FAQ Section */
.faq-section {
  max-width: 800px;
  margin: 0 auto;
}

.faq-section h2 {
  text-align: center;
  font-size: 1.8rem;
  color: var(--primary, #007965);
  margin-bottom: 30px;
}

.faq-item {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 15px;
  overflow: hidden;
  border: 1px solid #eee;
  transition: all 0.3s ease;
}

.faq-question {
  padding: 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.faq-question:hover {
  background: #f8f9fa;
}

.faq-question h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.faq-question i {
  color: var(--primary, #007965);
  transition: transform 0.3s ease;
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  background: #fafafa;
}

.faq-answer p {
  padding: 0 20px;
  margin: 0;
  color: #666;
  line-height: 1.6;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Active FAQ State */
.faq-item.active .faq-question i {
  transform: rotate(180deg);
}

.faq-item.active .faq-answer {
  max-height: 200px; /* قيمة تقديرية للسماح بالتمدد */
}

.faq-item.active .faq-answer p {
  padding: 20px;
  opacity: 1;
}

/* Enhanced Dark Mode Support */
:global(body.dark) .subscriptions-page {
  background-color: var(--dark-bg);
  color: var(--dark-text-primary);
}

:global(body.dark) .plan-card {
  background: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

:global(body.dark) .plan-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
}

:global(body.dark) .plan-header {
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-hover));
  border-bottom: 2px solid var(--dark-border);
}

:global(body.dark) .plan-header h3,
:global(body.dark) .plan-features li {
  color: var(--dark-text-primary);
  border-color: var(--dark-border);
}

:global(body.dark) .currency, 
:global(body.dark) .period {
  color: var(--dark-text-secondary);
}

:global(body.dark) .btn-primary {
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-hover));
  color: var(--dark-text-primary);
  border: none;
}

:global(body.dark) .btn-primary:hover {
  background: linear-gradient(135deg, var(--dark-accent-hover), var(--dark-accent));
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 121, 101, 0.3);
}

:global(body.dark) .faq-section {
  background: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

:global(body.dark) .faq-section h2 {
  color: var(--dark-text-primary);
}

:global(body.dark) .faq-item {
  background: var(--dark-surface);
  border-color: var(--dark-border);
  color: var(--dark-text-primary);
}

:global(body.dark) .faq-question {
  background: var(--dark-surface);
  color: var(--dark-text-primary);
}

:global(body.dark) .faq-question:hover {
  background: var(--dark-surface-hover);
}

:global(body.dark) .faq-question h3 {
  color: var(--dark-text-primary);
}

:global(body.dark) .faq-answer {
  background: var(--dark-surface);
  color: var(--dark-text-secondary);
}

:global(body.dark) .faq-answer p {
  color: var(--dark-text-secondary);
}

:global(body.dark) .faq-icon {
  color: var(--dark-accent);
}

:global(body.dark) .page-header {
  background: linear-gradient(135deg, var(--dark-surface), var(--dark-surface-hover));
  color: var(--dark-text-primary);
}

:global(body.dark) .page-title {
  color: var(--dark-text-primary);
}

:global(body.dark) .page-subtitle {
  color: #aaa;
}

/* Dark Mode Support */
:global(body.dark) .plan-card {
  background: #1e1e1e; /* linear-gradient handled in main css if needed */
  border-color: rgba(0,200,150,0.1);
  color: #e8e8e8;
}

:global(body.dark) .plan-header {
  background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
}

:global(body.dark) .plan-header h3,
:global(body.dark) .plan-features li {
  color: #e0e0e0;
  border-color: #444;
}

:global(body.dark) .currency, 
:global(body.dark) .period {
  color: #aaa;
}

:global(body.dark) .faq-item {
  background: #1e1e1e;
  border-color: #333;
}

:global(body.dark) .faq-question {
  background: #1e1e1e;
}

:global(body.dark) .faq-question:hover {
  background: #2a2a2a;
}

:global(body.dark) .faq-question h3 {
  color: #e0e0e0;
}

:global(body.dark) .faq-answer {
  background: #252525;
}

:global(body.dark) .faq-answer p {
  color: #ccc;
}

/* Responsive */
@media (max-width: 768px) {
  .plans-container {
    flex-direction: column;
    align-items: center;
  }
  
  .plan-card {
    max-width: 100%;
  }
  
  .plan-card.featured {
    transform: scale(1);
  }
  
  .plan-card.featured:hover {
    transform: translateY(-5px);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>