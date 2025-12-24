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
  
  // متغير لحفظ فرق التوقيت بين السيرفر والجهاز (بالمللي ثانية)
  // القيمة الموجبة تعني أن السيرفر متقدم، والسالبة تعني أن السيرفر متأخر عن الجهاز
  const serverTimeOffset = ref(0);

  let realtimeChannel = null;
  const SUBSCRIPTION_CACHE_KEY = 'my_subscription_data_v2';

  // --- 1. المصدر الوحيد للمعلومات الحسابية ---
  
  const daysRemaining = computed(() => {
    if (!subscription.value?.end_date) return 0;
    
    // استخدام الوقت المصحح (وقت الجهاز + الفرق) للحصول على وقت السيرفر التقريبي
    const now = new Date(Date.now() + serverTimeOffset.value);
    const end = new Date(subscription.value.end_date);
    
    // تصفير الوقت للمقارنة بالأيام فقط
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  });

  const isSubscribed = computed(() => {
    // التحقق من الحالة ومن التاريخ الفعلي (باستخدام توقيت السيرفر)
    if (!subscription.value || subscription.value.status !== 'active') return false;
    
    // تحقق إضافي: هل انتهى التاريخ بالفعل؟
    if (daysRemaining.value <= 0) return false;

    return true;
  });

  const planName = computed(() => {
    if (!subscription.value) return 'الحساب المجاني';
    return subscription.value.subscription_plans?.name_ar || 
           subscription.value.plan_name || 
           'باقة نشطة';
  });

  // --- 2. الهيئة الموحدة (UI Config) - المصدر الوحيد للشكل والرسائل ---
  const ui = computed(() => {
    // الحالة الافتراضية (غير مشترك)
    if (!isSubscribed.value) {
      // إذا كان منتهي الصلاحية ولكن الحالة ما زالت active في الداتابيز
      if (subscription.value?.status === 'active' && daysRemaining.value <= 0) {
         return {
            class: 'expired',
            icon: 'fa-times-circle',
            label: 'منتهي',
            statusText: 'انتهت صلاحية الاشتراك'
         };
      }

      return {
        class: 'pending',
        icon: 'fa-clock',
        label: 'مجاني',
        statusText: 'بانتظار الاشتراك'
      };
    }

    const days = daysRemaining.value;

    // حالة الانتهاء
    if (days <= 0) {
      return {
        class: 'expired',
        icon: 'fa-times-circle',
        label: 'منتهي',
        statusText: 'انتهت صلاحية الاشتراك'
      };
    }

    // حالة التحذير (أقل من 7 أيام)
    if (days <= 7) {
      return {
        class: 'warning',
        icon: 'fa-exclamation-circle',
        label: `${days} يوم متبقي`,
        statusText: 'قارب على الانتهاء'
      };
    }

    // الحالة النشطة العادية
    return {
      class: 'active',
      icon: 'fa-check-circle',
      label: `${days} يوم متبقي`,
      statusText: 'اشتراك نشط'
    };
  });

  // --- 3. العمليات (Actions) ---

  async function init(currentUser = null) {
    if (isInitialized.value && user.value?.id === currentUser?.id) return; 
    
    // محاولة استعادة من الكاش فوراً للسرعة
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

    // التحديث من السيرفر في الخلفية
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
        // 1. مزامنة التوقيت مع السيرفر
        try {
           const { data: serverTimeStr, error: timeError } = await supabase.rpc('get_server_time');
           if (!timeError && serverTimeStr) {
              const serverTime = new Date(serverTimeStr).getTime();
              const deviceTime = Date.now();
              serverTimeOffset.value = serverTime - deviceTime;
              // logger.info(`🕒 Time synced. Offset: ${serverTimeOffset.value}ms`);
           }
        } catch (err) {
            // فشل صامت، نعتمد على توقيت الجهاز
        }

        const [subRes, histRes] = await Promise.all([
          api.subscriptions.getSubscription(user.value.id),
          api.subscriptions.getSubscriptionHistory(user.value.id)
        ]);
        
        subscription.value = subRes.subscription;
        history.value = histRes.history || [];
        
        // تحديث الكاش بالهيئة الجديدة
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
    daysRemaining, planName, isSubscribed, ui,
    init, forceRefresh, clearSubscription
  };
});
