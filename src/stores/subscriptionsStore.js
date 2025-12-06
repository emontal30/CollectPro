import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const plans = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // بيانات الخطط الثابتة (للاستخدام في حالة عدم الاتصال أو كقالب)
  const PLAN_DETAILS = {
    'monthly': { name: 'خطة شهرية', price: 30, durationMonths: 1, period: 'شهريًا' },
    'quarterly': { name: 'خطة 3 شهور', price: 80, durationMonths: 3, period: '3 شهور' },
    'yearly': { name: 'خطة سنوية', price: 360, durationMonths: 12, period: 'سنويًا' }
  };

  // جلب الخطط
  async function fetchPlans() {
    isLoading.value = true;
    error.value = null;
    plans.value = [];

    try {
      // محاولة الجلب من قاعدة البيانات أولاً (كما في الكود الأصلي)
      // إذا لم نستخدم قاعدة البيانات، سنعتمد على PLAN_DETAILS مباشرة
      
      // هنا سنقوم بمحاكاة المنطق الموجود في subscriptions.js الذي يدمج البيانات
      // تحويل البيانات الثابتة إلى مصفوفة للعرض
      const formattedPlans = Object.entries(PLAN_DETAILS).map(([planId, details]) => ({
        plan_id: planId,
        name: details.name,
        price: details.price,
        metadata: {
          featured: details.price === 80, // فقط خطة 3 شهور لها شارة
          features: [
            'وصول كامل للمنصة',
            'دعم فني على مدار الساعة',
            'تحديثات مجانية',
            details.durationMonths === 1 ? 'مرونة في الإلغاء' :
            details.durationMonths >= 3 ? 'مرونة في الإلغاء' : '',
            details.durationMonths === 3 ? '💰 خصم خاص للمدة الطويلة (خصم 10 جنيه)' :
            details.durationMonths === 12 ? '🎁 شهر إضافي مجاني (13 شهر بسعر 12)' : ''
          ].filter(Boolean), // إزالة النصوص الفارغة
          period: details.period
        }
      }));

      plans.value = formattedPlans;

    } catch (err) {
      console.error("Error loading plans:", err);
      error.value = "حدث خطأ أثناء تحميل الخطط.";
    } finally {
      isLoading.value = false;
    }
  }

  // اختيار خطة (الانتقال المباشر للدفع بدون قيود)
  async function selectPlan(planId) {
    try {
      // حفظ الخطة المختارة مباشرة
      localStorage.setItem('selectedPlanId', planId);
      return true; // نجاح العملية والانتقال للدفع

    } catch (err) {
      console.error('Error selecting plan:', err);
      // في حالة الخطأ، نحفظ الخطة ونسمح بالمرور
      localStorage.setItem('selectedPlanId', planId);
      return true;
    }
  }

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    selectPlan
  };
});