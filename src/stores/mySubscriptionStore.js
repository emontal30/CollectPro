import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';
import eventBus from '@/utils/eventBus';

export const useMySubscriptionStore = defineStore('mySubscription', () => {
  const subscription = ref(null);
  const history = ref([]);
  const user = ref(null);
  const isLoading = ref(false); // تم التغيير لـ false كافتراضي
  const isInitialized = ref(false);
  const serverTimeOffset = ref(0);
  let realtimeChannel = null;
  const SUBSCRIPTION_CACHE_KEY = 'my_subscription_data_v3';

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
    return daysRemaining.value > 0;
  });

  const planName = computed(() => {
    if (!subscription.value) return 'مجاني';
    if (subscription.value.status === 'pending') {
      return `${subscription.value.plan_name || 'باقة'} (قيد المراجعة)`;
    }
    if (subscription.value.status === 'expired' || subscription.value.status === 'cancelled') {
      return `منتهية (${subscription.value.plan_name || 'باقة'})`;
    }
    return subscription.value.subscription_plans?.name_ar || subscription.value.plan_name || 'باقة نشطة';
  });

  const ui = computed(() => {
    if (subscription.value?.status === 'pending') {
      return { class: 'pending', icon: 'fa-clock', statusText: 'بانتظار التفعيل', detailsPrefix: 'جاري مراجعة طلبك', days: null, detailsSuffix: '' };
    }
    if (isSubscribed.value) {
      const days = daysRemaining.value;
      return { class: days <= 7 ? 'warning' : 'active', icon: days <= 7 ? 'fa-exclamation-circle' : 'fa-check-circle', statusText: 'نشط', detailsPrefix: 'متبقي ', days: days, detailsSuffix: ' يوم' };
    }
    if (subscription.value?.status === 'cancelled') {
      const days = daysRemaining.value;
      return { class: 'cancelled', icon: 'fa-pause-circle', statusText: 'معلق مؤقتاً', detailsPrefix: 'متبقي ', days: days, detailsSuffix: ' يوم (مجمد)' };
    }
    if (subscription.value?.status === 'expired') {
      return { class: 'expired', icon: 'fa-times-circle', statusText: 'غير نشط', detailsPrefix: 'انتهى اشتراكك', days: null, detailsSuffix: '' };
    }
    return { class: 'expired', icon: 'fa-user', statusText: 'مجاني', detailsPrefix: 'حسابك مجاني حالياً', days: null, detailsSuffix: '' };
  });

  async function init(currentUser = null) {
    if (isInitialized.value && user.value?.id === currentUser?.id) {
      return;
    }

    // 1. تحميل الكاش فوراً للسرعة
    const cachedData = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        subscription.value = parsed.sub;
        history.value = parsed.hist || [];
        isInitialized.value = true;
        logger.info('📦 Subscription loaded from cache');
      } catch (e) {
        logger.warn('Failed to parse subscription cache.');
      }
    }

    // 2. تحديث البيانات من السيرفر فقط إذا كان هناك إنترنت
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      forceRefresh(currentUser);
    } else {
      isInitialized.value = true;
    }

    setupEventListeners();
  }

  async function forceRefresh(currentUser = null) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isLoading.value = true;
    const TIMEOUT_MS = 8000; // Reduced to 8s to match system-wide safety timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Subscription Refresh Timeout (${TIMEOUT_MS}ms)`)), TIMEOUT_MS)
    );

    try {
      const userToRefresh = currentUser || user.value;

      // Perform the refresh logic wrapped in race
      await Promise.race([
        (async () => {
          if (!userToRefresh) {
            const { data: { session } } = await supabase.auth.getSession();
            user.value = session?.user || null;
          } else {
            user.value = userToRefresh;
          }

          if (!user.value) {
            clearSubscription();
            return;
          }

          // Use allSettled to ensure that if history or server time fails, we still get the subscription
          const results = await Promise.allSettled([
            api.subscriptions.getUserSubscription(user.value.id),
            api.subscriptions.getSubscriptionHistory(user.value.id),
            supabase.rpc('get_server_time')
          ]);

          const subRes = results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason };
          const histRes = results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason };
          const serverTimeRes = results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason };

          if (!serverTimeRes.error && serverTimeRes.data) {
            serverTimeOffset.value = new Date(serverTimeRes.data).getTime() - Date.now();
          }

          if (subRes.error) {
            subscription.value = null;
          } else {
            subscription.value = subRes.subscription;
          }

          if (histRes.error) {
            history.value = [];
          } else {
            history.value = histRes.history || [];
          }

          localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
            sub: subscription.value,
            hist: history.value
          }));

          isInitialized.value = true;
          setupRealtimeListener();
        })(),
        timeoutPromise
      ]);

    } catch (err) {
      // Don't treat timeouts as critical errors
      const isTimeout = err.message.includes('Timeout');
      if (isTimeout) {
        // Change to info to avoid alarming the user/admin
        logger.info('Network slow, using cached subscription:', err.message);
      } else {
        logger.error('ForceRefresh failed:', err);
      }
      // Even on error, we might want to say initialized so we don't block? 
      // OR we just leave it. If init fails, maybe we shouldn't block user from accessing free features?
      // Since this is forceRefresh, it's called often. If it fails, we assume old data or no data.
      if (!isInitialized.value) isInitialized.value = true; // Unblock app if this was the first load
    } finally {
      isLoading.value = false;
    }
  }

  function setupEventListeners() {
    eventBus.off('subscription-updated');
    eventBus.on('subscription-updated', () => forceRefresh());
  }

  function setupRealtimeListener() {
    if (realtimeChannel || !user.value || !navigator.onLine) return;
    const channelId = `sub_realtime:${user.value.id}`;
    realtimeChannel = supabase.channel(channelId)
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
    subscription, history, isLoading, isInitialized,
    daysRemaining, planName, isSubscribed, ui,
    init, forceRefresh, clearSubscription
  };
});
