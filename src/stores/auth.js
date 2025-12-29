import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { useNotifications } from '@/composables/useNotifications';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useSettingsStore } from '@/stores/settings';
import logger from '@/utils/logger.js';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const userProfile = ref(null) 
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const isSubscriptionEnforced = ref(false)
  const authListener = ref(null) // مرجع لحفظ المستمع

  const { addNotification } = useNotifications()
  const settingsStore = useSettingsStore()

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // --- Actions ---

  function cleanUrlHash() {
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
      logger.info('🧹 Cleaning sensitive data from URL hash');
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  }

  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      const result = await api.user.syncUserProfile(userData)
      if (result.isOffline) return;
      if (result.error) throw result.error
      userProfile.value = result.profile
    } catch (err) {
      logger.warn('Profile Sync Warning:', err.message)
    }
  }

  /**
   * تحميل إعدادات النظام مع وجود قيم افتراضية قوية لمنع التعارضات
   */
  async function loadSystemConfig() {
    const DEFAULT_ENFORCE = false; // القيمة الافتراضية في حالة عدم وجود الإعداد

    try {
      // 1. محاولة القراءة من الكاش المحلي أولاً لاستجابة سريعة
      const cached = localStorage.getItem('sys_config_enforce');
      if (cached !== null) {
        isSubscriptionEnforced.value = cached === 'true';
      } else {
        isSubscriptionEnforced.value = DEFAULT_ENFORCE;
      }

      // 2. جلب القيمة من قاعدة البيانات لتحديث الكاش
      const { data: config, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'enforce_subscription')
        .maybeSingle();
      
      // في حالة وجود خطأ في الصلاحيات (RLS) أو الشبكة
      if (error) throw error;

      if (config) {
        // تحويل القيمة إلى Boolean (سواء كانت نص "true" أو قيمة منطقية)
        const value = config.value === 'true' || config.value === true;
        isSubscriptionEnforced.value = value;
        localStorage.setItem('sys_config_enforce', String(value));
        logger.info(`⚙️ System Config Loaded: enforce_subscription = ${value}`);
      } else {
        // إذا لم يعثر على المفتاح، نستخدم القيمة الافتراضية
        isSubscriptionEnforced.value = DEFAULT_ENFORCE;
        localStorage.setItem('sys_config_enforce', String(DEFAULT_ENFORCE));
        logger.info(`ℹ️ Config key not found, using default: ${DEFAULT_ENFORCE}`);
      }
    } catch (err) {
      // في حالة الفشل التام (مثلاً أوفلاين)، نعتمد على ما في الكاش أو القيمة الافتراضية
      logger.warn('⚠️ Config Load Warning (Using fallback):', err.message);
      if (isSubscriptionEnforced.value === null) {
        isSubscriptionEnforced.value = DEFAULT_ENFORCE;
      }
    }
  }

  async function initializeAuth() {
    if (isInitialized.value) return
    
    isLoading.value = true;
    try {
      // تحميل إعدادات النظام أولاً لضمان عمل القيود فوراً
      await loadSystemConfig();

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        user.value = session.user;
        await syncUserProfile(session.user);
        settingsStore.applySettings();
        cleanUrlHash();
      }

      // تنظيف المستمع القديم إن وجد قبل إنشاء واحد جديد
      if (authListener.value) {
        authListener.value.subscription.unsubscribe();
      }

      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔐 Auth State Change: ${event}`);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            user.value = session.user;
            await syncUserProfile(session.user);
            settingsStore.applySettings();
          }
        } else if (event === 'SIGNED_OUT') {
          user.value = null;
          userProfile.value = null;
        }
      });

      authListener.value = listener;

    } catch (err) {
      logger.error('💥 Auth Init Error:', err);
      user.value = null;
    } finally {
      isInitialized.value = true;
      isLoading.value = false;
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
          queryParams: { prompt: 'select_account', access_type: 'offline' }
        }
      });
      if (error) throw error;
    } catch (err) {
      addNotification('فشل تسجيل الدخول: ' + err.message, 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      logger.info('🚀 Initiating user logout...');

      // 1. تنظيف مستمع Supabase أولاً
      if (authListener.value) {
        authListener.value.subscription.unsubscribe();
        authListener.value = null;
      }

      // 2. تصفير الحالة المحلية
      user.value = null;
      userProfile.value = null;
      isInitialized.value = false; // إعادة ضبط الحالة للسماح بتهيئة جديدة لاحقاً

      // 3. تنظيف المخازن المرتبطة
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      localStorage.removeItem('app_last_route');

      // 4. تسجيل الخروج من Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      logger.info('✅ User signed out successfully.');
      return true;

    } catch (err) {
      logger.error('💥 Logout failed:', err);
      addNotification('فشل تسجيل الخروج، يرجى المحاولة مرة أخرى', 'error');
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    user,
    userProfile,
    isLoading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isSubscriptionEnforced,
    initializeAuth,
    loginWithGoogle,
    logout
  };
});
