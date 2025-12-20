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
  const userProfile = ref(null) // إضافة لتخزين بيانات الملف الشخصي (بما في ذلك الدور)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const authWarning = ref('')

  const { addNotification } = useNotifications()
  const SESSION_DURATION = 48 * 60 * 60 * 1000; // 48 hours

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // --- Actions ---

  function updateLastActivity() {
    localStorage.setItem('last_active_time', Date.now().toString());
  }

  /**
   * مزامنة ملف تعريف المستخدم وجلب بياناته
   */
  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      const result = await api.user.syncUserProfile(userData)
      // إذا كان أوفلاين، نستخدم بيانات محلية بسيطة أو نتركها فارغة
      if (result.isOffline) {
        logger.info('📡 Offline: Using basic user session data.');
        return;
      }
      if (result.error) throw result.error
      userProfile.value = result.profile
      logger.debug('✅ User profile synced & loaded:', result.profile?.role)
    } catch (err) {
      // لا نحذر في الكونسول إذا كان خطأ شبكة متوقع
      if (!err.message?.includes('fetch')) {
         logger.warn('Profile Sync Warning:', err)
      }
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
        user.value = session.user;
        updateLastActivity();
        await syncUserProfile(session.user);
      } else {
        user.value = null;
        userProfile.value = null;
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
          userProfile.value = null;
          localStorage.removeItem('last_active_time');
          localStorage.removeItem('app_last_route');
        }
      });

    } catch (err) {
      // إذا كان الخطأ بسبب الشبكة عند التشغيل لأول مرة
      if (err.message?.includes('fetch') || err.name === 'TypeError') {
        logger.info('📡 Initialized in Offline Mode');
      } else {
        logger.error('💥 Auth Init Error:', err);
        authWarning.value = 'تعذر الاتصال بخدمة المصادقة';
      }
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
          redirectTo: `${window.location.origin}/app/dashboard`
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

  async function logout(redirect = true) {
    isLoading.value = true;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('Logout warning:', err);
    } finally {
      user.value = null;
      userProfile.value = null;
      localStorage.removeItem('last_active_time');
      localStorage.removeItem('app_last_route');
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      isInitialized.value = false;
      isLoading.value = false;
      if (redirect) router.replace('/');
    }
  }

  return {
    user,
    userProfile,
    isLoading,
    isInitialized,
    authWarning,
    isAuthenticated,
    isAdmin,
    initializeAuth,
    loginWithGoogle,
    logout,
    syncUserProfile
  };
});
