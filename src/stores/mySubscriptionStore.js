import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
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

  // --- التخزين المؤقت (Caching) ---
  const cache = ref({
    subscription: null,
    history: null,
    timestamp: 0,
    duration: 5 * 60 * 1000 // 5 دقائق
  });

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

  // 1. تهيئة الصفحة وجلب البيانات (محسن للأداء مع التخزين المؤقت)
  async function init() {
    isLoading.value = true;
    try {
      // التحقق من البيانات المحملة مسبقاً في sessionStorage أولاً
      const preloadedData = sessionStorage.getItem('preloadedSubscriptionData');
      if (preloadedData) {
        const parsed = JSON.parse(preloadedData);
        console.log('📋 Using preloaded subscription data');
        subscription.value = parsed.subscription;
        history.value = parsed.history || [];
        user.value = parsed.user;
        // حفظ في التخزين المؤقت المحلي أيضاً
        cache.value = { ...parsed, duration: cache.value.duration };
        eventBus.emit('subscription-updated', subscription.value);
        isLoading.value = false;
        return;
      }

      // التحقق من التخزين المؤقت أولاً
      const now = Date.now();
      if (cache.value.timestamp && (now - cache.value.timestamp) < cache.value.duration) {
        console.log('📋 Using cached subscription data');
        subscription.value = cache.value.subscription;
        history.value = cache.value.history || [];
        user.value = cache.value.user;
        eventBus.emit('subscription-updated', subscription.value);
        isLoading.value = false;
        return;
      }

      // محاولة جلب بيانات المستخدم (اختياري)
      const { user: currentUser } = await api.auth.getUser();
      user.value = currentUser;

      if (currentUser) {
        // جلب البيانات بشكل متزامن لتسريع التحميل
        const [subscriptionResult, historyResult] = await Promise.all([
          api.subscriptions.getSubscription(currentUser.id),
          api.subscriptions.getSubscriptionHistory(currentUser.id)
        ]);

        subscription.value = subscriptionResult.subscription;
        history.value = historyResult.history || [];

        // حفظ في التخزين المؤقت
        cache.value = {
          subscription: subscription.value,
          history: history.value,
          user: currentUser,
          timestamp: now
        };

        // إرسال حدث للشريط الجانبي لتحديث البيانات
        eventBus.emit('subscription-updated', subscription.value);
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

  // 1.5 تحديث بيانات الاشتراك من event bus
  function updateSubscriptionFromEvent(subscriptionData) {
    subscription.value = subscriptionData;
    // إذا جاء تحديث من event bus فنقوم أيضاً بتحديث الكاش المحلي
    try {
      if (subscriptionData) {
        cache.value.subscription = subscriptionData;
        cache.value.timestamp = Date.now();
      } else {
        cache.value.subscription = null;
        cache.value.timestamp = 0;
      }
    } catch (e) {
      console.warn('Failed to update subscription cache from event:', e);
    }

    console.log('MySubscription subscription updated from event:', subscriptionData);
  }

  // الاستماع لأحداث تحديث الاشتراك
  eventBus.on('subscription-updated', updateSubscriptionFromEvent);

  // تنظيف المستمع عند تدمير المتجر
  onUnmounted(() => {
    eventBus.off('subscription-updated', updateSubscriptionFromEvent);
  });

  // 2. جلب سجل الاشتراكات
  async function fetchHistory(userId) {
    const { history: data } = await api.subscriptions.getSubscriptionHistory(userId);
    history.value = data || [];
  }

  // 3. مسح التخزين المؤقت
  function clearCache() {
    cache.value = {
      subscription: null,
      history: null,
      user: null,
      timestamp: 0
    };
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
    formatDate,
    clearCache
  };
});