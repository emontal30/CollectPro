import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api from '@/services/api';
import router from '@/router';
import { calculateDaysRemaining } from '@/utils/formatters'; 
import logger from '@/utils/logger.js';
import { supabase } from '@/supabase';
import eventBus from '@/utils/eventBus';

export const useMySubscriptionStore = defineStore('mySubscription', () => {
  const subscription = ref(null);
  const history = ref([]);
  const renewalPlans = ref([]);
  const user = ref(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const isRenewModalOpen = ref(false);
  const loadingPlans = ref(false);

  let realtimeChannel = null;
  const SUBSCRIPTION_CACHE_KEY = 'my_subscription_data_v2'; // تغيير الإصدار لتحديث الكاش القديم

  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    return calculateDaysRemaining(subscription.value.end_date);
  });

  const daysClass = computed(() => {
    const days = daysRemaining.value;
    if (days <= 0) return 'expired-days';
    if (days <= 7) return 'low-days';
    if (days <= 30) return 'medium-days';
    return 'high-days';
  });

  const statusText = computed(() => {
    const status = subscription.value?.status;
    const map = { pending: 'قيد المراجعة', active: 'نشط', cancelled: 'معلق', expired: 'منتهي' };
    return map[status] || 'بدون اشتراك';
  });

  const planName = computed(() => {
    if (!subscription.value) return 'مجاني';
    return subscription.value.subscription_plans?.name_ar || 
           subscription.value.plan_name || 
           'خطة أساسية';
  });

  const isSubscribed = computed(() => subscription.value?.status === 'active');

  async function init() {
    if (isInitialized.value) return; 
    
    // 1. استعادة من الكاش فوراً
    const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cachedData) {
      const { sub, hist } = JSON.parse(cachedData);
      subscription.value = sub;
      history.value = hist || [];
      isInitialized.value = true;
    }

    // 2. التحديث من السيرفر
    await forceRefresh();
    setupEventListeners();
  }

  async function forceRefresh() {
    try {
      const { user: currentUser } = await api.auth.getUser();
      user.value = currentUser;

      if (currentUser) {
        // جلب البيانات الأساسية والسجل بالتوازي لضمان السرعة
        const [subRes, histRes] = await Promise.all([
          api.subscriptions.getSubscription(currentUser.id),
          api.subscriptions.getSubscriptionHistory(currentUser.id)
        ]);
        
        subscription.value = subRes.subscription;
        history.value = histRes.history || [];
        
        // تحديث الكاش
        localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({ 
          sub: subRes.subscription, 
          hist: histRes.history 
        }));
        
        isInitialized.value = true;
        setupRealtimeListener();
      }
    } catch (err) {
      logger.error('Refresh error:', err);
    }
  }

  function setupEventListeners() {
    eventBus.on('subscription-updated', async (data) => {
      if (!data.userId || data.userId === user.value?.id) {
        await forceRefresh();
      }
    });
  }

  function setupRealtimeListener() {
    if (realtimeChannel || !user.value) return;
    realtimeChannel = supabase.channel(`any:subscriptions`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.value.id}` }, () => {
        forceRefresh();
      }).subscribe();
  }

  function clearSubscription() {
    subscription.value = null;
    history.value = [];
    user.value = null;
    isInitialized.value = false;
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  }

  async function openRenewModal() {
    isRenewModalOpen.value = true;
    loadingPlans.value = true;
    try {
      const { plans } = await api.subscriptions.getPlans();
      renewalPlans.value = (plans || []).map(plan => ({
        ...plan,
        displayName: plan.name_ar || plan.name,
      }));
    } finally { loadingPlans.value = false; }
  }

  function selectRenewalPlan(planId) {
    localStorage.setItem('selectedPlanId', planId);
    isRenewModalOpen.value = false;
    router.push('/app/payment');
  }

  return {
    subscription, history, isLoading, isInitialized, isRenewModalOpen, renewalPlans, loadingPlans,
    daysRemaining, daysClass, statusText, planName, isSubscribed,
    init, forceRefresh, openRenewModal, selectRenewalPlan, clearSubscription
  };
});
