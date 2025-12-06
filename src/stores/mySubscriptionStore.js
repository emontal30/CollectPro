import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import eventBus from '@/utils/eventBus';
import { useRouter } from 'vue-router';
import { calculateDaysRemaining } from '@/utils/formatters';

export const useMySubscriptionStore = defineStore('mySubscription', () => {
  // --- الحالة (State) ---
  const subscription = ref(null);
  const history = ref([]);
  const renewalPlans = ref([]);
  const user = ref(null);
  const isLoading = ref(true);
  const isRenewModalOpen = ref(false);
  const loadingPlans = ref(false);
  const router = useRouter();

  // --- الحسابات (Getters/Computed) ---

  // 1. حساب الأيام المتبقية باستخدام الدالة المشتركة
  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    return calculateDaysRemaining(subscription.value.end_date);
  });

  // 2. تصنيف الأيام لتحديد اللون (أحمر/برتقالي/أخضر)
  const daysClass = computed(() => {
    const days = daysRemaining.value;
    if (days <= 0) return '';
    if (days <= 7) return 'low-days';      // أحمر
    if (days <= 30) return 'medium-days';  // برتقالي
    return 'high-days';                    // أخضر
  });

  // 3. نصوص الحالة العربية
  const statusText = computed(() => {
    const status = subscription.value?.status;
    const map = { 
      pending: 'قيد المراجعة', 
      active: 'نشط', 
      cancelled: 'ملغي', 
      expired: 'منتهي الصلاحية' 
    };
    return map[status] || 'غير معروف';
  });

  // --- الإجراءات (Actions) ---

  // 1. تهيئة الصفحة وجلب البيانات (بدون قيود)
  async function init() {
    isLoading.value = true;
    try {
      // محاولة جلب بيانات المستخدم (اختياري)
      const { user: currentUser } = await api.auth.getUser();
      user.value = currentUser;

      if (currentUser) {
        // جلب الاشتراك الحالي (الأحدث) إذا وجد مستخدم
        const { subscription: subData } = await api.subscriptions.getSubscription(currentUser.id);
        subscription.value = subData;

        // إرسال حدث للشريط الجانبي لتحديث البيانات
        eventBus.emit('subscription-updated', subData);

        // جلب سجل الاشتراكات
        await fetchHistory(currentUser.id);
      } else {
        // لا يوجد مستخدم - عرض رسالة مناسبة
        subscription.value = null;
        history.value = [];
        
        // إرسال حدث للشريط الجانبي
        eventBus.emit('subscription-updated', null);
      }

    } catch (error) {
      console.error('Error loading subscription:', error);
      // في حالة الخطأ، نظهر الصفحة الفارغة
      subscription.value = null;
      history.value = [];
      
      // إرسال حدث للشريط الجانبي
      eventBus.emit('subscription-updated', null);
    } finally {
      isLoading.value = false;
    }
  }

  // 2. جلب سجل الاشتراكات
  async function fetchHistory(userId) {
    const { history: data } = await api.subscriptions.getSubscriptionHistory(userId);
    history.value = data || [];
  }

  // 3. فتح نافذة التجديد وجلب الخطط
  async function openRenewModal() {
    isRenewModalOpen.value = true;
    loadingPlans.value = true;

    try {
      // جلب الخطط المتاحة من قاعدة البيانات
      const { plans } = await api.subscriptions.getPlans();

      // تحويلها للشكل المطلوب للعرض
      const durationMap = { 1: 'monthly', 3: 'quarterly', 12: 'yearly' };

      renewalPlans.value = (plans || []).map(plan => ({
        ...plan,
        planIdentifier: durationMap[plan.duration_months], // معرف للخزن في localStorage
        displayName: plan.name_ar || plan.name,
        features: plan.description || 'وصول كامل للمنصة.'
      })).filter(p => p.planIdentifier); // تأكد من أن الخطة صالحة

    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      loadingPlans.value = false;
    }
  }

  // 4. اختيار خطة للتجديد
  function selectRenewalPlan(planIdentifier) {
    localStorage.setItem('selectedPlanId', planIdentifier);
    isRenewModalOpen.value = false;
    router.push('/app/payment');
  }

  // 5. تنسيق التاريخ
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  }

  return {
    subscription,
    history,
    user,
    isLoading,
    daysRemaining,
    daysClass,
    statusText,
    isRenewModalOpen,
    renewalPlans,
    loadingPlans,
    init,
    openRenewModal,
    selectRenewalPlan,
    formatDate
  };
});