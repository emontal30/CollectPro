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
/* Minimal scoped styles - all other styles imported from _unified-components.css */
</style>