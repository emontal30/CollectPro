import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { useNotifications } from '@/composables/useNotifications';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useSettingsStore } from '@/stores/settings';
import logger from '@/utils/logger.js';
import api, { apiInterceptor } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const userProfile = ref(null) 
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const isSubscriptionEnforced = ref(false)
  const authListener = ref(null)
  const isPerformingAdminAction = ref(false);

  const { addNotification } = useNotifications()
  const settingsStore = useSettingsStore()

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // --- Actions ---
  
  function setAdminAction(status) {
    isPerformingAdminAction.value = status;
  }

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

  async function loadSystemConfig() {
    const DEFAULT_ENFORCE = false;
    try {
      const cached = localStorage.getItem('sys_config_enforce');
      if (cached !== null) {
        isSubscriptionEnforced.value = cached === 'true';
      }

      const { data: config, error } = await apiInterceptor(
        supabase
          .from('system_config')
          .select('value')
          .eq('key', 'enforce_subscription')
          .maybeSingle()
      );

      if (error) {
        if (error.status === 'network_error' || error.status === 'offline') return;
        throw error;
      }

      if (config) {
        const value = config.value === 'true' || config.value === true;
        isSubscriptionEnforced.value = value;
        localStorage.setItem('sys_config_enforce', String(value));
      }
    } catch (err) {
      logger.warn('⚠️ Config Load Warning:', err.message);
      if (isSubscriptionEnforced.value === null) {
        isSubscriptionEnforced.value = DEFAULT_ENFORCE;
      }
    }
  }

  async function initializeAuth() {
    if (isInitialized.value) return
    isLoading.value = true;
    try {
      await loadSystemConfig();
      const { session, error } = await api.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        user.value = session.user;
        await syncUserProfile(session.user);
        settingsStore.applySettings();
        cleanUrlHash();
      }

      if (authListener.value && authListener.value.subscription) {
        authListener.value.subscription.unsubscribe();
      }

      const { data: listener } = api.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔐 Auth State Change: ${event}`);
        if (isPerformingAdminAction.value) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            user.value = session.user;
            await syncUserProfile(session.user);
            settingsStore.applySettings();
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthData();
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

  /**
   * تنظيف بيانات الهوية فقط عند تسجيل الخروج
   * مع الإبقاء على البيانات المحلية (التحصيلات والأرشيف) بناءً على طلب المستخدم
   */
  function clearAuthData() {
    try {
      // 1. Auth Store
      user.value = null;
      userProfile.value = null;
      
      // 2. Subscription Store (يجب تنظيفه لأسباب أمنية)
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      
      // 3. Local Storage (تنظيف المسار الأخير وبيانات الاشتراك فقط)
      localStorage.removeItem('app_last_route');
      localStorage.removeItem('my_subscription_data_v2');
      
      logger.info('🧹 Auth Data Cleared. Local business data preserved.');
    } catch (err) {
      logger.error('Error during auth cleanup:', err);
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true;
    try {
      const { error } = await api.auth.signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      addNotification('فشل تسجيل الدخول: ' + err.message, 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    if (isLoading.value) return;
    
    isLoading.value = true;
    try {
      logger.info('🚀 Initiating graceful logout...');
      
      if (authListener.value && authListener.value.subscription) {
        authListener.value.subscription.unsubscribe();
        authListener.value = null;
      }

      const logoutPromise = api.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout Timeout')), 3000)
      );

      try {
        await Promise.race([logoutPromise, timeoutPromise]);
      } catch (e) {
        logger.warn('⚠️ Server logout timed out, proceeding with local logout.');
      }

      clearAuthData();
      isInitialized.value = false;

      logger.info('✅ User signed out successfully.');
      return true;
    } catch (err) {
      logger.error('💥 Logout error:', err);
      clearAuthData();
      return true; 
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
    logout,
    setAdminAction,
    clearAuthData
  };
});
