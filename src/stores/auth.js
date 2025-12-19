import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import router from '@/router'
import { useNotifications } from '@/composables/useNotifications';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import logger from '@/utils/logger.js';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const authWarning = ref('')

  const { addNotification } = useNotifications()
  const SESSION_DURATION = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.email === 'emontal.33@gmail.com')

  // --- Actions ---

  function updateLastActivity() {
    localStorage.setItem('last_active_time', Date.now().toString());
  }

  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      await api.user.syncUserProfile(userData)
      logger.debug('✅ User profile synced')
    } catch (err) {
      logger.error('Profile Sync Warning:', err)
    }
  }

  /**
   * تهيئة المصادقة
   */
  async function initializeAuth() {
    if (isInitialized.value) return
    
    isLoading.value = true;
    try {
      logger.info('🚀 Initializing Auth...');

      const lastActiveTime = localStorage.getItem('last_active_time');
      if (lastActiveTime) {
        const timeSinceLastActive = Date.now() - parseInt(lastActiveTime, 10);
        if (timeSinceLastActive > SESSION_DURATION) {
          logger.info('🛑 Session expired. Logging out.');
          await logout(false);
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (session?.user) {
        logger.debug('✅ Session restored/active for:', session.user.email);
        user.value = session.user;
        updateLastActivity();
        
        syncUserProfile(session.user);
      } else {
        user.value = null;
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        logger.debug(`🔔 Auth Event: ${event}`);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          user.value = session?.user || null;
          if (user.value) {
            updateLastActivity();
            await syncUserProfile(user.value);
          }
        } else if (event === 'SIGNED_OUT') {
          user.value = null;
          localStorage.removeItem('last_active_time');
          localStorage.removeItem('app_last_route');
        }
      });

    } catch (err) {
      logger.error('💥 Auth Init Error:', err);
      authWarning.value = 'تعذر الاتصال بخدمة المصادقة';
      user.value = null;
    } finally {
      isInitialized.value = true;
      isLoading.value = false;
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true;
    authWarning.value = '';
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
      updateLastActivity();
    } catch (err) {
      logger.error('Login Error:', err);
      addNotification('فشل تسجيل الدخول: ' + err.message, 'error');
      authWarning.value = 'حدث خطأ أثناء الاتصال بجوجل';
      isLoading.value = false;
    }
  }

  async function getUser() {
    if (user.value) return user.value;
    try {
      const { data } = await supabase.auth.getUser();
      user.value = data.user;
      return user.value;
    } catch (e) {
      return null;
    }
  }

  async function logout(redirect = true) {
    isLoading.value = true;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('Logout warning:', err);
    } finally {
      user.value = null;
      localStorage.removeItem('last_active_time');
      localStorage.removeItem('app_last_route');
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      isInitialized.value = false;
      isLoading.value = false;
      if (redirect) router.replace('/');
    }
  }

  function clearAuthWarning() {
    authWarning.value = '';
  }

  return {
    user,
    isLoading,
    isInitialized,
    authWarning,
    isAuthenticated,
    isAdmin,
    initializeAuth,
    loginWithGoogle,
    getUser,
    logout,
    clearAuthWarning,
    syncUserProfile
  };
});