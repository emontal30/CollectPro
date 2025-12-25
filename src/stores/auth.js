import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import router from '@/router'
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
  const authWarning = ref('')

  const { addNotification } = useNotifications()
  const settingsStore = useSettingsStore()
  const SESSION_DURATION = 48 * 60 * 60 * 1000; // 48 hours

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // --- Actions ---

  function updateLastActivity() {
    localStorage.setItem('last_active_time', Date.now().toString());
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
    try {
      const cached = localStorage.getItem('sys_config_enforce');
      if (cached !== null) {
        isSubscriptionEnforced.value = cached === 'true';
      }

      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'enforce_subscription')
        .maybeSingle();
      
      if (config) {
        const value = config.value === 'true' || config.value === true;
        isSubscriptionEnforced.value = value;
        localStorage.setItem('sys_config_enforce', String(value));
      }
    } catch (err) {
      logger.warn('Config Load Warning:', err.message);
    }
  }

  async function initializeAuth() {
    if (isInitialized.value) return
    
    isLoading.value = true;
    try {
      await loadSystemConfig();

      const lastActiveTime = localStorage.getItem('last_active_time');
      if (lastActiveTime) {
        const timeSinceLastActive = Date.now() - parseInt(lastActiveTime, 10);
        if (timeSinceLastActive > SESSION_DURATION) {
          logger.info('🛑 Session expired by duration. Logging out.');
          await logout();
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        user.value = session.user;
        updateLastActivity();
        await syncUserProfile(session.user);
        // تأكيد تطبيق إعدادات الزوم والوضع الليلي فور استعادة الجلسة
        settingsStore.applySettings();
        cleanUrlHash();
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            user.value = session.user;
            updateLastActivity();
            syncUserProfile(session.user);
            // تأكيد تطبيق الإعدادات عند تسجيل الدخول
            settingsStore.applySettings();
          }
        } else if (event === 'SIGNED_OUT') {
          user.value = null;
          userProfile.value = null;
          localStorage.removeItem('last_active_time');
        }
      });

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
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      user.value = null;
      userProfile.value = null;
      localStorage.removeItem('last_active_time');
      localStorage.removeItem('app_last_route');
      
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();

      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('Logout warning:', err);
    } finally {
      isInitialized.value = false;
      isLoading.value = false;
      window.location.href = '/';
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
