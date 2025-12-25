import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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
  const serverTimeOffset = ref(0);
  let realtimeChannel = null;
  const SUBSCRIPTION_CACHE_KEY = 'my_subscription_data_v2';

  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    const now = new Date(Date.now() + serverTimeOffset.value);
    const end = new Date(subscription.value.end_date);
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  });

  const isSubscribed = computed(() => {
    if (!subscription.value || subscription.value.status !== 'active') return false;
    if (daysRemaining.value <= 0) return false;
    return true;
  });

  const isFree = computed(() => {
    return !isSubscribed.value && subscription.value?.status !== 'pending';
  });

  const planName = computed(() => {
    if (!subscription.value) return 'مجاني';
    return subscription.value.subscription_plans?.name_ar || subscription.value.plan_name || 'باقة نشطة';
  });

  const ui = computed(() => {
    if (subscription.value?.status === 'pending') {
      return {
        class: 'pending',
        icon: 'fa-clock',
        statusText: 'بانتظار التفعيل',
        detailsPrefix: 'سيتم مراجعة طلبك قريباً',
        days: null,
        detailsSuffix: ''
      };
    }

    if (subscription.value?.status === 'active' && daysRemaining.value <= 0) {
      return {
        class: 'expired',
        icon: 'fa-times-circle',
        statusText: 'غير نشط (منتهي)',
        detailsPrefix: 'يرجى تجديد الاشتراك',
        days: null,
        detailsSuffix: ''
      };
    }

    if (isSubscribed.value) {
      const days = daysRemaining.value;
      return {
        class: days <= 7 ? 'warning' : 'active',
        icon: days <= 7 ? 'fa-exclamation-circle' : 'fa-check-circle',
        statusText: 'نشط',
        detailsPrefix: 'متبقى ',
        days: days,
        detailsSuffix: ' يوم على الانتهاء'
      };
    }

    return {
      class: 'pending',
      icon: 'fa-gift',
      statusText: 'مجاني',
      detailsPrefix: '(فترة محدودة)',
      days: null,
      detailsSuffix: ''
    };
  });

  async function init(currentUser = null) {
    if (isInitialized.value && user.value?.id === currentUser?.id) return; 
    const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        subscription.value = parsed.sub;
        history.value = parsed.hist || [];
      } catch (e) {
        logger.warn('Failed to parse subscription cache');
      }
    }
    await forceRefresh(currentUser);
    setupEventListeners();
  }

  async function forceRefresh(currentUser = null) {
    try {
      if (!currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        user.value = session?.user || null;
      } else {
        user.value = currentUser;
      }

      if (user.value) {
        try {
          const { data: serverTimeStr, error: timeError } = await supabase.rpc('get_server_time');
          if (!timeError && serverTimeStr) {
            const serverTime = new Date(serverTimeStr).getTime();
            const deviceTime = Date.now();
            serverTimeOffset.value = serverTime - deviceTime;
          }
        } catch (err) {}

        const [subRes, histRes] = await Promise.all([
          api.subscriptions.getSubscription(user.value.id),
          api.subscriptions.getSubscriptionHistory(user.value.id)
        ]);
        
        subscription.value = subRes.subscription;
        history.value = histRes.history || [];
        localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({ 
          sub: subRes.subscription, 
          hist: histRes.history 
        }));
        isInitialized.value = true;
        setupRealtimeListener();
      }
    } catch (err) {
      logger.error('ForceRefresh error:', err);
    }
  }

  function setupEventListeners() {
    eventBus.off('subscription-updated'); 
    eventBus.on('subscription-updated', async (data) => {
      if (!data.userId || data.userId === user.value?.id) {
        await forceRefresh();
      }
    });
  }

  function setupRealtimeListener() {
    if (realtimeChannel || !user.value) return;
    realtimeChannel = supabase.channel(`sub_realtime:${user.value.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions', 
        filter: `user_id=eq.${user.value.id}` 
      }, () => forceRefresh())
      .subscribe();
  }

  function clearSubscription() {
    subscription.value = null;
    history.value = [];
    user.value = null;
    isInitialized.value = false;
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    if (realtimeChannel) { 
      supabase.removeChannel(realtimeChannel); 
      realtimeChannel = null; 
    }
  }

  return {
    subscription, history, isLoading, isInitialized, isRenewModalOpen, renewalPlans, loadingPlans,
    daysRemaining, planName, isSubscribed, isFree, ui,
    init, forceRefresh, clearSubscription
  };
});
