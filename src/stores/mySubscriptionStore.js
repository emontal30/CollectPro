import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api from '@/services/api';
import router from '@/router';
import { calculateDaysRemaining } from '@/utils/formatters'; 
import logger from '@/utils/logger.js';
import { supabase } from '@/supabase';

export const useMySubscriptionStore = defineStore('mySubscription', () => {
  const subscription = ref(null);
  const history = ref([]);
  const renewalPlans = ref([]);
  const user = ref(null);
  const isLoading = ref(false);
  const isRenewModalOpen = ref(false);
  const loadingPlans = ref(false);


  let realtimeChannel = null;
  const SUBSCRIPTION_CACHE_KEY = 'my_subscription_data';

  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    return calculateDaysRemaining(subscription.value.end_date);
  });

  const daysClass = computed(() => {
    const days = daysRemaining.value;
    if (days <= 0) return 'text-red-600 font-bold';
    if (days <= 7) return 'low-days';
    if (days <= 30) return 'medium-days';
    return 'high-days';
  });

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

  const planName = computed(() => {
    if (!subscription.value) return 'مجاني';
    if (subscription.value.plan_name === 'اشتراك يدوي') return 'حالة الاشتراك';
    return subscription.value.plan_name || 
           subscription.value.subscription_plans?.name_ar || 
           subscription.value.subscription_plans?.name || 
           'خطة غير معروفة';
  });

  const isSubscribed = computed(() => subscription.value?.status === 'active');

  async function init() {
    isLoading.value = true;
    logger.info('🔄 Initializing subscription...');
    
    try {
      const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cachedData) {
        logger.info('✅ Found cached subscription data.');
        const { sub, hist } = JSON.parse(cachedData);
        subscription.value = sub;
        history.value = hist;
      }
      // Always refresh from network, but don't block UI if cache exists
      await forceRefresh(); 
    } catch(err) {
      logger.error("❌ Failed to init subscription store", err);
      // If cache fails to parse, clear it and fetch fresh
      await forceRefresh();
    } finally {
      isLoading.value = false;
    }
  }

  async function forceRefresh() {
    logger.info('☁️ Fetching fresh subscription data from network...');
    try {
      const { user: currentUser } = await api.auth.getUser();
      user.value = currentUser;

      if (currentUser) {
        const { subscription: sub, history: hist } = await api.subscriptions.getSubscription(currentUser.id);
        subscription.value = sub;
        history.value = hist || [];
        
        // Cache the new data
        localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({ sub, hist }));
        logger.info('💾 Cached new subscription data.');

        // Setup listener after confirming user
        setupRealtimeListener();
      } else {
        clearSubscription();
      }
    } catch (err) {
      logger.error('❌ Failed to refresh subscription data.', err);
    }
  }

  function setupRealtimeListener() {
    if (realtimeChannel || !user.value) return;

    realtimeChannel = supabase
      .channel(`public:subscriptions:user_id=eq.${user.value.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.value.id}` },
        (payload) => {
          logger.info('🔔 Realtime subscription update received!', payload);
          forceRefresh();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.info('✅ Subscribed to realtime subscription updates.');
        }
        if (status === 'CHANNEL_ERROR') {
          const errorMessage = 'Realtime subscription channel error.';
          if (err) {
            logger.error(errorMessage, err);
          } else {
            logger.error(errorMessage, 'The connection was lost and no specific error was provided.');
          }
        }
      });
  }

  function clearSubscription() {
    subscription.value = null;
    history.value = [];
    user.value = null;
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    logger.info('🗑️ Cleared subscription data and cache.');
    
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  async function openRenewModal() {
    isRenewModalOpen.value = true;
    loadingPlans.value = true;
    try {
      const response = await api.subscriptions.getPlans();
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

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  }

  onUnmounted(() => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      logger.info('👋 Unsubscribed from realtime subscription updates.');
    }
  });

  return {
    subscription,
    history,
    user,
    isLoading,
    isRenewModalOpen,
    renewalPlans,
    loadingPlans,
    daysRemaining,
    daysClass,
    statusText,
    planName,
    isSubscribed,
    init,
    forceRefresh,
    openRenewModal,
    selectRenewalPlan,
    formatDate,
    clearSubscription,
    loadSubscription: init
  };
});