import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { useNotifications } from '@/composables/useNotifications';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useSettingsStore } from '@/stores/settings';
import logger from '@/utils/logger.js';
import api, { apiInterceptor } from '@/services/api';
import { clearCacheOnLogout } from '@/services/cacheManager';

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

  /**
   * دالة سحرية لإعادة تحميل الصفحة مرة واحدة لضبط الزوم
   */
  function triggerOneTimeLoginReload() {
    const RELOAD_KEY = 'app_login_sync_performed';
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, 'true');
      logger.info('🔄 Performing one-time login reload for UI/Zoom adaptation...');
      window.location.reload();
    }
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
        
        // تفعيل الإعادة لمرة واحدة عند اكتشاف جلسة نشطة
        triggerOneTimeLoginReload();
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
            
            // تفعيل الإعادة لمرة واحدة عند تسجيل الدخول
            if (event === 'SIGNED_IN') {
              triggerOneTimeLoginReload();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          await logoutCleanup();
        }
      });
      
      authListener.value = listener;
    } catch (err) {
      logger.error('💥 Auth Init Error:', err);
      await logoutCleanup();
    } finally {
      isInitialized.value = true;
      isLoading.value = false;
    }
  }

  /**
   * تنظيف عميق لكل ما يخص الجلسة والكاش
   */
  async function logoutCleanup() {
    try {
      user.value = null;
      userProfile.value = null;
      
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      
      // تنظيف الكاش الذكي (باستثناء الأرشيف)
      await clearCacheOnLogout();

      // مسح مفاتيح Supabase المتبقية في localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth.token')) {
          localStorage.removeItem(key);
        }
      });

      // مسح مفتاح الإعادة لضمان عملها عند تسجيل الدخول القادم
      sessionStorage.removeItem('app_login_sync_performed');

      localStorage.removeItem('app_last_route');
      localStorage.removeItem('my_subscription_data_v2');
      localStorage.removeItem('sys_config_enforce');
      
      logger.info('🧹 Deep Auth & Cache Cleanup Completed (Archives preserved).');
    } catch (err) {
      logger.error('Error during logout cleanup:', err);
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
      logger.info('🚀 Initiating deep logout...');
      
      if (authListener.value && authListener.value.subscription) {
        authListener.value.subscription.unsubscribe();
        authListener.value = null;
      }

      try {
        await api.auth.signOut();
      } catch (e) {
        logger.warn('⚠️ Server-side logout failed, proceeding locally.');
      }

      await logoutCleanup();
      isInitialized.value = false;

      logger.info('✅ Logout completed successfully.');
      window.location.href = '/'; 
      return true;
    } catch (err) {
      logger.error('💥 Logout error:', err);
      await logoutCleanup();
      window.location.href = '/';
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
    logoutCleanup
  };
});
