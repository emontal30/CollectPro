import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api from '@/services/api';
import eventBus from '@/utils/eventBus';
import { useRouter } from 'vue-router';
// تأكد من مسار الدالة المساعدة أو قم بتعريفها محلياً إذا لم تكن موجودة
import { calculateDaysRemaining } from '@/utils/formatters'; 
import logger from '@/utils/logger.js';

export const useMySubscriptionStore = defineStore('mySubscription', () => {
  // --- الحالة (State) ---
  const subscription = ref(null);
  const history = ref([]);
  const renewalPlans = ref([]);
  const user = ref(null);
  const isLoading = ref(false); // تم تغيير القيمة الافتراضية إلى false لمنع التحميل المستمر
  const isRenewModalOpen = ref(false);
  const loadingPlans = ref(false);
  const router = useRouter();

  // --- إعدادات الكاش ---
  const CACHE_KEY = 'user_subscription_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  // --- الحسابات (Getters/Computed) ---

  // 1. حساب الأيام المتبقية
  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    try {
      return calculateDaysRemaining(subscription.value.end_date);
    } catch (e) {
      // fallback بسيط في حالة عدم وجود الدالة
      const end = new Date(subscription.value.end_date);
      const now = new Date();
      const diff = end - now;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  });

  // 2. تصنيف الأيام لتحديد اللون
  const daysClass = computed(() => {
    const days = daysRemaining.value;
    if (days <= 0) return 'text-red-600 font-bold'; // منتهي
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

  // 4. اسم الخطة (للشريط الجانبي)
  const planName = computed(() => {
    if (!subscription.value) return 'مجاني';
    return subscription.value.plan_name || 
           subscription.value.subscription_plans?.name_ar || 
           subscription.value.subscription_plans?.name || 
           'خطة غير معروفة';
  });

  // 5. حالة الاشتراك
  const isSubscribed = computed(() => subscription.value?.status === 'active');

  // --- الإجراءات (Actions) ---

  /**
   * تهيئة الصفحة وجلب البيانات (محسن للأداء مع التخزين المؤقت)
   */
  async function init() {
    isLoading.value = true;
    try {
      // 1. التحقق من التخزين المؤقت أولاً
      const cached = loadFromCache();
      if (cached) {
        logger.info('📦 Using cached subscription data');
        subscription.value = cached.subscription;
        history.value = cached.history || [];
        user.value = cached.user;
        
        // إشعار المكونات الأخرى
        eventBus.emit('subscription-updated', subscription.value);
        isLoading.value = false;
        return;
      }

      // 2. جلب البيانات من السيرفر
      const { user: currentUser } = await api.auth.getUser();
      user.value = currentUser;

      if (currentUser) {
        // جلب البيانات بشكل متزامن
        const [subscriptionResult, historyResult] = await Promise.all([
          api.subscriptions.getSubscription(currentUser.id).catch(() => ({ subscription: null })),
          api.subscriptions.getSubscriptionHistory(currentUser.id).catch(() => ({ history: [] }))
        ]);

        subscription.value = subscriptionResult?.subscription || null;
        history.value = historyResult?.history || [];

        // حفظ في التخزين المؤقت
        saveToCache({
          subscription: subscription.value,
          history: history.value,
          user: currentUser
        });

        // إرسال حدث للشريط الجانبي
        eventBus.emit('subscription-updated', subscription.value);
      } else {
        // لا يوجد مستخدم
        subscription.value = null;
        history.value = [];
        eventBus.emit('subscription-updated', null);
      }

    } catch (error) {
      logger.error('Error loading subscription:', error);
      subscription.value = null;
      history.value = [];
      eventBus.emit('subscription-updated', null);
    } finally {
      isLoading.value = false;
    }
  }

  // --- دوال الكاش المساعدة ---

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY); // استخدام localStorage ليكون أكثر استدامة
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      const now = Date.now();
      
      // التحقق من صلاحية الوقت
      if (now - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
      return null; // انتهت الصلاحية
    } catch (e) {
      return null;
    }
  }

  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e) {
      logger.warn('Failed to save subscription cache:', e);
    }
  }

  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    subscription.value = null;
    history.value = [];
    user.value = null;
  }

  // --- التعامل مع الأحداث ---

  function updateSubscriptionFromEvent(subscriptionData) {
    subscription.value = subscriptionData;
    // تحديث الكاش عند الاستلام من حدث خارجي
    if (subscriptionData) {
      saveToCache({
        subscription: subscriptionData,
        history: history.value, // الاحتفاظ بالتاريخ القديم مؤقتاً
        user: user.value
      });
    }
    logger.info('MySubscription subscription updated from event:', subscriptionData);
  }

  // الاستماع للأحداث
  eventBus.on('subscription-updated', updateSubscriptionFromEvent);

  onUnmounted(() => {
    eventBus.off('subscription-updated', updateSubscriptionFromEvent);
  });

  // --- وظائف التجديد ---

  async function openRenewModal() {
    isRenewModalOpen.value = true;
    loadingPlans.value = true;

    try {
      // جلب الخطط
      const response = await api.subscriptions.getPlans();
      // التعامل مع اختلاف هيكل الاستجابة المحتمل (data أو plans)
      const plans = response.data || response.plans || [];

      const durationMap = { 1: 'monthly', 3: 'quarterly', 12: 'yearly' };

      renewalPlans.value = plans.map(plan => ({
        ...plan,
        planIdentifier: durationMap[plan.duration_months] || plan.id,
        displayName: plan.name_ar || plan.name,
        features: plan.description || 'وصول كامل للمنصة.'
      }));

    } catch (error) {
      logger.error('Error fetching plans:', error);
    } finally {
      loadingPlans.value = false;
    }
  }

  function selectRenewalPlan(planIdentifier) {
    localStorage.setItem('selectedPlanId', planIdentifier);
    isRenewModalOpen.value = false;
    router.push('/app/payment');
  }

  // تنسيق التاريخ
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  }

  return {
    // State
    subscription,
    history,
    user,
    isLoading,
    isRenewModalOpen,
    renewalPlans,
    loadingPlans,
    
    // Getters
    daysRemaining,
    daysClass,
    statusText,
    planName,
    isSubscribed,
    
    // Actions
    init,
    openRenewModal,
    selectRenewalPlan,
    formatDate,
    clearCache,
    loadSubscription: init // Alias للتوافق
  };
});