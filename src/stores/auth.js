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
  const isLoading = ref(true) // نبدأ بـ true لمنع الوميض
  const isInitialized = ref(false)
  const isSubscriptionEnforced = ref(false)
  const authListener = ref(null)
  // تم إزالة isPerformingAdminAction لأنه يسبب تعليق التحديثات

  const { addNotification } = useNotifications()
  const settingsStore = useSettingsStore()

  const USER_PROFILE_CACHE_KEY = 'user_profile_cache_v1';

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  // تحسين: التحقق من الرول مع حماية من القيم الفارغة
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // --- Actions ---

  function triggerOneTimeLoginReload() {
    const RELOAD_KEY = 'app_login_sync_performed';
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, 'true');
      logger.info('🔄 Performing one-time login reload...');
      window.location.reload();
    }
  }

  function cleanUrlHash() {
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  }

  /**
   * تحميل البروفايل من الكاش فوراً (synchronous)
   */
  function loadProfileFromCache() {
    const cachedProfile = localStorage.getItem(USER_PROFILE_CACHE_KEY);
    if (cachedProfile) {
      try { 
        userProfile.value = JSON.parse(cachedProfile); 
        logger.info('📦 Profile loaded from cache');
      } catch (e) {
        logger.warn('Failed to parse cached profile');
      }
    }
  }

  async function syncUserProfile(userData) {
    if (!userData) return;
    
    // محاولة التحميل من الكاش أولاً إذا لم يكن محملاً
    if (!userProfile.value) loadProfileFromCache();

    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    try {
      // جلب البيانات الحديثة في الخلفية
      const result = await api.user.syncUserProfile(userData)
      if (result && !result.error && result.profile) {
        // تحديث الحالة فقط إذا تغيرت البيانات لتجنب إعادة الرسم غير الضرورية
        if (JSON.stringify(userProfile.value) !== JSON.stringify(result.profile)) {
           userProfile.value = result.profile;
           localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(result.profile));
        }
      }
    } catch (err) {
      logger.warn('Profile Sync Warning:', err.message)
    }
  }

  async function loadSystemConfig() {
    try {
      const cached = localStorage.getItem('sys_config_enforce');
      if (cached !== null) isSubscriptionEnforced.value = cached === 'true';
      
      if (navigator.onLine) {
        const { data: config } = await apiInterceptor(supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle());
        if (config) {
          const value = config.value === 'true' || config.value === true;
          isSubscriptionEnforced.value = value;
          localStorage.setItem('sys_config_enforce', String(value));
        }
      }
    } catch (err) {}
  }

  async function initializeAuth() {
    if (isInitialized.value) return;
    
    isLoading.value = true;
    
    try {
      // 1. استرجاع البيانات المحلية فوراً لتسريع الواجهة
      loadProfileFromCache();
      await loadSystemConfig(); // ننتظر الكونفج لأنه سريع ومهم للتوجيه

      // 2. التحقق من الجلسة
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        user.value = session.user;
        
        // 3. إنهاء حالة التحميل فوراً للسماح للصفحات (Dashboard/Archive) بالعمل
        // البيانات الحديثة ستأتي في الخلفية
        isLoading.value = false;
        isInitialized.value = true;

        // 4. العمليات الخلفية (Background Tasks)
        // لا نستخدم await هنا لعدم تعطيل الواجهة
        Promise.all([
            navigator.onLine ? api.auth.getUser().then(({user: u}) => { if(u) user.value = u }) : Promise.resolve(),
            syncUserProfile(session.user),
            settingsStore.applySettings()
        ]).then(() => {
            cleanUrlHash();
            triggerOneTimeLoginReload();
        });

      } else {
        // لا يوجد مستخدم
        isLoading.value = false;
        isInitialized.value = true;
      }

      // 5. إعداد المستمع
      if (authListener.value?.subscription) authListener.value.subscription.unsubscribe();

      const { data: listener } = api.auth.onAuthStateChange(async (event, session) => {
        // تم إزالة شرط isPerformingAdminAction لمنع تعليق التحديثات
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            user.value = session.user;
            // تحديث صامت للبروفايل
            syncUserProfile(session.user);
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          await logoutCleanup();
          if (window.location.pathname !== '/') window.location.href = '/';
        }
      });
      authListener.value = listener;

    } catch (err) {
      logger.error('💥 Auth Init Error:', err);
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  async function logoutCleanup() {
    try {
      const userId = user.value?.id;
      user.value = null;
      userProfile.value = null;
      
      const subStore = useMySubscriptionStore();
      subStore.clearSubscription();
      
      if (userId) clearCacheOnLogout(userId).catch(e => logger.warn('Cache clear error', e));
      
      const keysToKeep = ['app_settings_v1'];
      Object.keys(localStorage).forEach(key => {
        if (
          key.startsWith('sb-') || 
          key.includes('auth-token') || 
          key.includes('supabase.auth.token') ||
          key === USER_PROFILE_CACHE_KEY ||
          key === 'sys_config_enforce' ||
          key === 'my_subscription_data_v2' ||
          key === 'app_last_route'
        ) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.removeItem('app_login_sync_performed');
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
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      if (authListener.value?.subscription) {
        authListener.value.subscription.unsubscribe();
        authListener.value = null;
      }
      
      const signOutPromise = api.auth.signOut();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ error: 'TIMEOUT' }), 2000));
      
      await Promise.race([signOutPromise, timeoutPromise]);
      await logoutCleanup();
      
      window.location.replace('/');
    } catch (err) {
      logger.error('Logout error:', err);
      await logoutCleanup();
      window.location.replace('/');
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
    logoutCleanup
  };
});