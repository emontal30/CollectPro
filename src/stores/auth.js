import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isLoading = ref(false);
  const router = useRouter();
  let sessionCheckInterval = null;
  let inactivityTimer = null;
  let activityCleanup = null;
  // Optimized constants - reduced frequency to prevent memory issues
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes (increased from 30)
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (increased from 2)

  // 1. تهيئة الجلسة عند بدء التطبيق
async function initializeAuth() {
isLoading.value = true;
try {
  // Handle OAuth callback from URL hash
  await handleOAuthCallback();

  const { session } = await api.auth.getSession();
  if (session?.user) {
    // Check if session is still valid (not expired)
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at > now) {
      user.value = session.user;
      await syncUserProfile(session.user);
      // بدء أنظمة المراقبة فقط عند تسجيل الدخول
      startSessionMonitoring();
      startActivityTracking();
      // التوجيه الذكي (إذا كان المستخدم في صفحة الدخول)
      if (router.currentRoute.value.path === '/' || router.currentRoute.value.path === '/login') {
           redirectUser(session.user);
      }
    } else {
      // Session expired, clear it
      await api.auth.signOut();
      stopSessionMonitoring();
    }
  }

  // الاستماع لتغيرات الحالة
  api.auth.onAuthStateChange(async (_event, session) => {
    if (_event === 'SIGNED_IN' && session?.user) {
      user.value = session.user;
      await syncUserProfile(session.user);
      startSessionMonitoring();
      startActivityTracking();
    } else if (_event === 'SIGNED_OUT') {
      user.value = null;
      stopSessionMonitoring();
    }
  });
} catch (error) {
  console.error('Auth Initialization Error:', error);
} finally {
  isLoading.value = false;
}
}

  // Handle OAuth callback from URL
  async function handleOAuthCallback() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (accessToken || refreshToken) {
      try {
        // Let Supabase handle the OAuth session
        const { data, error } = await api.auth.getSession();
        if (error) {
          console.error('OAuth callback error:', error);
          // Clear the URL to remove stale parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
      }
    }
  }

  // 2. تسجيل الدخول باستخدام Google
  async function loginWithGoogle() {
    isLoading.value = true;
    try {
      // تأكد من تسجيل الخروج أولاً إذا كان هناك جلسة نشطة
      const { session } = await api.auth.getSession();
      if (session) {
        await api.auth.signOut();
      }

      const { error } = await api.auth.signInWithGoogle();

      if (error) throw error;

    } catch (error) {
      console.error('Google Login Error:', error);
      alert('فشل تسجيل الدخول: ' + error.message);
      isLoading.value = false;
    }
  }

  // 3. تسجيل الخروج مع إيقاف المراقبة
  async function logout() {
    isLoading.value = true;
    try {
      // إيقاف أنظمة المراقبة
      stopSessionMonitoring();
      
      // تنظيف التخزين المحلي أولاً
      localStorage.clear();
      sessionStorage.clear();

      // تنظيف سجلات Google بشكل محدد
      // حذف جميع الكوكيز المتعلقة بـ Google
      document.cookie.split(";").forEach(cookie => {
        const cookieName = cookie.split("=")[0].trim();
        if (cookieName.toLowerCase().includes('google') || 
            cookieName.toLowerCase().includes('g_state') ||
            cookieName.toLowerCase().includes('oauth')) {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${window.location.hostname};`;
        }
      });

      // تنظيف IndexedDB من بيانات Google
      if (window.indexedDB) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name && (db.name.includes('google') || db.name.includes('gauth'))) {
            try {
              await indexedDB.deleteDatabase(db.name);
            } catch (e) {
              console.warn('Failed to delete IndexedDB:', db.name, e);
            }
          }
        }
      }

      // إجبار حذف أي بيانات Google متبقية في localStorage
      const googleKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('google') || 
                   key.toLowerCase().includes('gauth') ||
                   key.toLowerCase().includes('oauth'))) {
          googleKeys.push(key);
        }
      }
      googleKeys.forEach(key => localStorage.removeItem(key));

      // تنظيف sessionStorage من بيانات Google
      const sessionGoogleKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.toLowerCase().includes('google') || 
                   key.toLowerCase().includes('gauth') ||
                   key.toLowerCase().includes('oauth'))) {
          sessionGoogleKeys.push(key);
        }
      }
      sessionGoogleKeys.forEach(key => sessionStorage.removeItem(key));

      // تسجيل الخروج من Supabase
      const { error } = await api.auth.signOut();
      if (error) {
        console.warn('SignOut error (continuing anyway):', error);
      }

      // إجبار تنظيف الجلسة
      user.value = null;

      // إعادة توجيه لصفحة الدخول
      router.push('/');

    } catch (error) {
      console.error('Logout Error:', error);
      // في حالة الخطأ، تأكد من التوجيه
      user.value = null;
      router.push('/');
    } finally {
      isLoading.value = false;
    }
  }

  // 4. مزامنة بيانات المستخدم (User Profile Sync)
  async function syncUserProfile(userData) {
    try {
      const { error } = await api.user.syncUserProfile(userData);
      if (error) {
        console.error('Profile Sync Error:', error);
      }
    } catch (err) {
      console.error('Profile Sync Error:', err);
    }
  }

  // 5. منطق التوجيه (Admin vs User)
  function redirectUser(userData) {
    // Prevent redirect loops - check current route first
    const currentPath = router.currentRoute.value.path;
    if (currentPath !== '/' && currentPath !== '/login') {
      console.log('User already on a protected route, skipping redirect');
      return;
    }
    
    const adminEmails = ['emontal.33@gmail.com'];
    if (adminEmails.includes(userData.email)) {
      router.push('/app/dashboard'); // أو /admin
    } else {
      // التحقق من آخر صفحة محفوظة
      const lastPage = localStorage.getItem('lastPage');
      if (lastPage && lastPage !== '/' && !lastPage.includes('index.html')) {
        router.push(lastPage);
      } else {
        router.push('/app/dashboard');
      }
    }
  }

  // 6. التحقق من تنظيف سجلات Google
  async function verifyGoogleRecordsCleared() {
    const remainingGoogleData = [];
    
    // التحقق من localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('google') || 
                 key.toLowerCase().includes('gauth') ||
                 key.toLowerCase().includes('oauth'))) {
        remainingGoogleData.push({ type: 'localStorage', key, value: localStorage.getItem(key) });
      }
    }
    
    // التحقق من sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.toLowerCase().includes('google') || 
                 key.toLowerCase().includes('gauth') ||
                 key.toLowerCase().includes('oauth'))) {
        remainingGoogleData.push({ type: 'sessionStorage', key, value: sessionStorage.getItem(key) });
      }
    }
    
    // التحقق من الكوكيز
    const googleCookies = document.cookie.split(";").filter(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      return cookieName.toLowerCase().includes('google') || 
             cookieName.toLowerCase().includes('g_state') ||
             cookieName.toLowerCase().includes('oauth');
    });
    
    if (googleCookies.length > 0) {
      remainingGoogleData.push({ type: 'cookies', keys: googleCookies });
    }
    
    return remainingGoogleData;
  }

  // 4. نظام مراقبة الجلسة المحسن
  function startSessionMonitoring() {
    stopSessionMonitoring(); // إيقاف أي مراقبة قديمة
    
    sessionCheckInterval = setInterval(async () => {
      try {
        // Debounce: only check if user is still active
        if (!user.value) {
          stopSessionMonitoring();
          return;
        }

        const { session, error } = await api.auth.getSession();
        
        if (error || !session) {
          console.warn('Session lost, logging out...');
          await logout();
          return;
        }
        
        // التحقق من انتهاء صلاحية الجلسة
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at <= now) {
          console.warn('Session expired, logging out...');
          await logout();
          return;
        }
        
        // محاولة تجديد الجلسة إذا كانت قريبة من الانتهاء
        const timeUntilExpiry = (session.expires_at - now) * 1000;
        if (timeUntilExpiry < 5 * 60 * 1000) { // أقل من 5 دقائق
          console.log('Session expiring soon, attempting refresh...');
          // Supabase handles refresh automatically
        }
        
      } catch (error) {
        console.error('Session monitoring error:', error);
        // إزالة الاستدعاء المتكرر لتجنب الحلقات اللانهائية
        // المستخدم يمكنه إعادة تحديث الصفحة يدوياً إذا لزم الأمر
      }
    }, SESSION_CHECK_INTERVAL);
  }

  function stopSessionMonitoring() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  // 5. نظام تتبع النشاط المحسن
  function startActivityTracking() {
    stopActivityTracking();
    
    let activityTimeout;
    const maxInactivityTime = INACTIVITY_TIMEOUT;
    
    const resetInactivityTimer = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      activityTimeout = setTimeout(async () => {
        console.warn('User inactive, checking session...');
        try {
          const { session } = await api.auth.getSession();
          if (!session) {
            await logout();
          }
        } catch (error) {
          console.error('Inactivity check error:', error);
          // Don't auto-logout on network errors
        }
      }, maxInactivityTime);
    };
    
    // Reduced number of events to prevent performance issues
    // Only track essential events
    const events = ['click', 'keydown']; // Removed scroll for better performance
  
    // Add listeners with passive option for better performance
    const addEventListener = (event) => {
      document.addEventListener(event, resetInactivityTimer, { passive: true });
    };
  
    events.forEach(addEventListener);
    
    // تعيين المؤقت الأولي
    resetInactivityTimer();
    
    // إرجاع دالة التنظيف
    activityCleanup = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
    
    return activityCleanup;
  }

  function stopActivityTracking() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    if (activityCleanup) {
      activityCleanup();
      activityCleanup = null;
    }
  }

  return {
    user,
    isLoading,
    initializeAuth,
    loginWithGoogle,
    logout,
    verifyGoogleRecordsCleared,
    startSessionMonitoring,
    stopSessionMonitoring,
    stopActivityTracking
  };
});
