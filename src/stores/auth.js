import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/supabase';
import { useNotifications } from '@/composables/useNotifications';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useSettingsStore } from '@/stores/settings';
import logger from '@/utils/logger.js';
import api, { apiInterceptor } from '@/services/api';
import { withTimeout } from '@/utils/promiseUtils';

import { clearCacheOnLogout, setLocalStorageCache, getLocalStorageCache, removeFromAllCaches } from '@/services/cacheManager';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null);
  const userProfile = ref(null);
  const isLoading = ref(true);
  const isInitialized = ref(false);
  const isSubscriptionEnforced = ref(false);
  const authListener = ref(null);
  let isInitializing = false; // Guard لمنع التنفيذ المتزامن
  const isConfigLoaded = ref(false);
  let configSubscription = null;

  const { addNotification } = useNotifications();
  const settingsStore = useSettingsStore();

  const USER_PROFILE_CACHE_KEY = 'user_profile_cache_v1';

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => userProfile.value?.role === 'admin');

  // --- Internal Helpers ---

  /**
   * دالة لجلب البيانات الإضافية (الكود المختصر) من جدول profiles
   * ودمجها في كائن المستخدم الحالي لتكون متاحة في التطبيق
   */
  async function fetchAndMergeUserProfile(userId) {
    if (!userId) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_code, full_name')
        .eq('id', userId)
        .single();

      if (profile && user.value) {
        // ندمج الكود والاسم في كائن المستخدم مباشرة لسهولة الوصول
        user.value = {
          ...user.value,
          userCode: profile.user_code || '---',
          fullName: profile.full_name || user.value.user_metadata?.full_name || user.value.email
        };
        logger.info('🆔 User code loaded:', profile.user_code);
      }
    } catch (err) {
      logger.warn('Failed to fetch user extended profile:', err.message);
    }
  }

  // --- Actions ---

  function triggerOneTimeLoginReload() {
    const RELOAD_KEY = 'app_login_sync_performed';
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, 'true');
      logger.info('🔄 Performing one-time login reload...');
      window.location.reload();
    }
  }

  /**
   * تنظيف الهاش من الرابط مع الحفاظ على حالة التاريخ
   */
  function cleanUrlHash() {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
      logger.info('🧹 URL Hash cleaned while preserving history state');
    }
  }

  async function loadProfileFromCache() {
    const cachedProfile = await getLocalStorageCache(USER_PROFILE_CACHE_KEY);
    if (cachedProfile) {
      try {
        // cacheManager parses JSON automatically if needed, but if encryption returns object, we use it directly
        // We handle potential double parsing or object structure here
        userProfile.value = typeof cachedProfile === 'string' ? JSON.parse(cachedProfile) : cachedProfile;
        logger.info('📦 Profile loaded from cache');
      } catch (e) {
        logger.warn('Failed to parse cached profile');
      }
    }
  }

  async function syncUserProfile(userData) {
    if (!userData) return;
    if (!userProfile.value) await loadProfileFromCache();
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      const result = await api.user.syncUserProfile(userData);
      if (result && !result.error && result.profile) {
        if (JSON.stringify(userProfile.value) !== JSON.stringify(result.profile)) {
          userProfile.value = result.profile;
          await setLocalStorageCache(USER_PROFILE_CACHE_KEY, result.profile);
        }
      }
    } catch (err) {
      logger.warn('Profile Sync Warning:', err.message);
    }
  }

  async function loadSystemConfig() {
    // Prevent redundant fetches in the same session
    if (isConfigLoaded.value) return;

    try {
      const cached = await getLocalStorageCache('sys_config_enforce');
      if (cached !== null) isSubscriptionEnforced.value = cached === 'true';

      if (navigator.onLine) {
        const { data: config } = await apiInterceptor(supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle());
        if (config) {
          const value = config.value === 'true' || config.value === true;
          isSubscriptionEnforced.value = value;
          await setLocalStorageCache('sys_config_enforce', String(value));
        }
      }
      isConfigLoaded.value = true;
      setupConfigListener();
    } catch (err) { }
  }

  function setupConfigListener() {
    if (configSubscription) return;
    configSubscription = supabase.channel('public:system_config_global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config', filter: "key=eq.enforce_subscription" }, (payload) => {
        if (payload.new && payload.new.value !== undefined) {
          const newVal = String(payload.new.value) === 'true';
          isSubscriptionEnforced.value = newVal;
          setLocalStorageCache('sys_config_enforce', String(newVal));
          logger.info('🔔 System Config Updated:', newVal);
        }
      })
      .subscribe();
  }

  async function initializeAuth() {
    // منع التنفيذ المتزامن
    if (isInitialized.value || isInitializing) return;

    isInitializing = true;
    isLoading.value = true;

    const MAX_ATTEMPTS = 2;
    const ATTEMPT_TIMEOUT = 5000; // 5 ثوانٍ كحد أقصى لكل محاولة

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) logger.info(`🔄 Auth: Retrying initialization (Attempt ${attempt}/${MAX_ATTEMPTS})...`);

        // سباق بين جلب الجلسة والمهلة الزمنية للمحاولة الحالية
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), ATTEMPT_TIMEOUT)
          )
        ]);

        if (session?.user) {
          await updateUserState(session);
        }

        // تحميل إعدادات النظام
        await loadSystemConfig();

        // إذا وصلنا هنا فقد نجحت العملية
        lastError = null;
        break;

      } catch (err) {
        lastError = err;
        logger.warn(`⚠️ Auth initialization attempt ${attempt} failed:`, err.message);

        if (attempt < MAX_ATTEMPTS) {
          // انتظار بسيط قبل إعادة المحاولة (يزداد مع كل محاولة)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (lastError) {
      logger.error('💥 Auth: All initialization attempts failed or timed out:', lastError);
    }

    // نعتبر العملية منتهية للسماح للتطبيق بالعمل حتى لو أوفلاين
    isLoading.value = false;
    isInitialized.value = true;
    isInitializing = false;
    cleanUrlHash();

    // إعداد مستمع تغيير حالة المصادقة (دائم)
    if (authListener.value?.subscription) authListener.value.subscription.unsubscribe();

    const { data: listener } = api.auth.onAuthStateChange(async (event, session) => {
      logger.info(`🔔 Auth State Change: ${event}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await updateUserState(session);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await logoutCleanup();
        if (window.location.pathname !== '/') window.location.href = '/';
      }
    });
    authListener.value = listener;
  }

  // Helper to consolidate user state updates and prevent race conditions
  async function updateUserState(session) {
    if (!session?.user) {
      user.value = null;
      return;
    }

    try {
      // ⚡ Robust Sync: Use allSettled so one failure doesn't block the user
      const results = await Promise.allSettled([
        api.auth.getUser(),
        supabase.from('profiles').select('user_code, full_name').eq('id', session.user.id).single()
      ]);

      let completeUser = { ...session.user };

      // Result 0: Auth User Data
      if (results[0].status === 'fulfilled' && results[0].value?.user) {
        completeUser = { ...completeUser, ...results[0].value.user };
      }

      // Result 1: Profile Data (Optional enrichment)
      if (results[1].status === 'fulfilled' && results[1].value?.data) {
        const profileData = results[1].value.data;
        completeUser.userCode = profileData.user_code || null;
        completeUser.fullName = profileData.full_name || completeUser.user_metadata?.full_name;
      } else {
        // Log warning but don't stop
        if (results[1].status === 'rejected') logger.warn('Profile fetch failed during auth update (non-critical)');
      }

      user.value = completeUser;

      // Post-update side effects
      syncUserProfile(completeUser);
      settingsStore.applySettings();

    } catch (error) {
      logger.error('Failed to update user state:', error);
      // Fallback to session user if fetches fail
      if (!user.value) user.value = session.user;
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

      // Use secure removal
      const keysToRemove = [
        USER_PROFILE_CACHE_KEY,
        'sys_config_enforce',
        'my_subscription_data_v2',
        'app_last_route'
      ];

      for (const key of keysToRemove) {
        await removeFromAllCaches(key);
      }

      // Clear Supabase/Auth items from localStorage directly (as they are managed by Supabase client)
      Object.keys(localStorage).forEach(key => {
        if (
          key.startsWith('sb-') ||
          key.includes('auth-token') ||
          key.includes('supabase.auth.token')
        ) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.removeItem('app_login_sync_performed');

      // Clean up collaboration store realtime subscription (dynamically imported to avoid circular dependency)
      try {
        const { useCollaborationStore } = await import('./collaborationStore');
        const collabStore = useCollaborationStore();
        if (collabStore && typeof collabStore.unsubscribeFromRequests === 'function') {
          collabStore.unsubscribeFromRequests();
          collabStore.$reset(); // Also reset store state
        }
      } catch (e) {
        logger.warn('Failed to cleanup collaboration store:', e);
      }

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

  async function proactivelyRefreshSession() {
    try {
      // Wrap refresh with timeout (Increased to 15s for slow networks)
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        15000,
        'Session refresh timed out'
      );

      if (session) {
        await updateUserState(session);
      } else {
        await logoutCleanup();
      }
    } catch (error) {
      if (error.message.includes('timed out')) {
        logger.info('Background session refresh timed out - proceeding with current session.');
      } else {
        logger.error('Failed to proactively refresh session:', error);
      }
      // Don't force logout on timeout, just log it. Maybe network glitch.
      // await logoutCleanup(); 
    }
  }

  /**
   * Hard revival of the app's connectivity and session integrity.
   * Useful before critical operations after long periods of inactivity.
   */
  async function reviveApp() {
    logger.info('🚀 Reviving app connectivity...');

    // 1. Force refresh session (which also tests network)
    await proactivelyRefreshSession();

    // 2. Clear internal Supabase cache if possible or just ensure it's responsive
    // supabase.auth.startAutoRefresh() is handled by the client, but we can nudge it.

    // 3. Return true if we have a user, false otherwise
    return !!user.value;
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
    logoutCleanup,
    proactivelyRefreshSession,
    reviveApp
  };
});