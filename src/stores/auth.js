import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const router = useRouter();
  let sessionCheckInterval = null;
  let activityCleanup = null;

  // Constants disabled for persistent login
  // const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes - disabled
  // const SESSION_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes - disabled

  // 1. Initialize auth - non-blocking, async
  async function initializeAuth() {
    // Prevent multiple initializations
    if (isInitialized.value) {
      console.log('Auth already initialized, skipping...');
      return;
    }
    
    isLoading.value = true;
    try {
      console.log('Initializing auth...');
      
      // Handle OAuth callback from URL hash first
      await handleOAuthCallback();

      const { session } = await api.auth.getSession();
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      
      if (session?.user) {
        // Keep user logged in regardless of session expiration
        console.log('Session found, setting user:', session.user.email);
        user.value = session.user;
        await syncUserProfile(session.user);
        // Monitoring systems disabled for persistent login
        console.log('User stays logged in - monitoring disabled');
      }

      // Listen for auth state changes (only set once)
      api.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user');
        
        if (event === 'SIGNED_IN' && session?.user) {
           user.value = session.user;
           await syncUserProfile(session.user);
           // Monitoring disabled for persistent login
           console.log('User signed in - monitoring disabled');
         } else if (event === 'SIGNED_OUT') {
           console.log('User signed out');
           user.value = null;
           isInitialized.value = false;
           // Monitoring already disabled
         }
        // Ignore INITIAL_SESSION to prevent conflicts
      });
      
      isInitialized.value = true;
    } catch (error) {
      console.error('Auth Initialization Error:', error);
      // Don't block the app for auth errors
    } finally {
      isLoading.value = false;
    }
  }

  // 2. Get user - helper method for router
  async function getUser() {
    if (user.value !== null) {
      return user.value;
    }

    try {
      isLoading.value = true;
      const { session } = await api.auth.getSession();
      if (session?.user) {
        // Keep user logged in regardless of session expiration
        user.value = session.user;
        await syncUserProfile(session.user);
        console.log('User stays logged in - monitoring disabled');
      }
    } catch (error) {
      console.error('Failed to get user:', error);
      user.value = null;
    } finally {
      isLoading.value = false;
    }

    return user.value;
  }

  // 3. Handle OAuth callback from URL
  async function handleOAuthCallback() {
    console.log('Checking for OAuth callback...');
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    console.log('OAuth tokens found:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
    
    if (accessToken || refreshToken) {
      try {
        console.log('Processing OAuth callback...');
        // Let Supabase handle the OAuth session
        const { data, error } = await api.auth.getSession();
        if (error) {
          console.error('OAuth callback error:', error);
          // Clear the URL to remove stale parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (data?.session?.user) {
          console.log('OAuth callback successful, user:', data.session.user.email);
          // Clear the URL to remove stale parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        // Clear the URL even on error
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  // 4. Login with Google
  async function loginWithGoogle() {
    isLoading.value = true;
    try {
      // Ensure we're logged out first if there's an active session
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

  // 5. Logout with cleanup
  async function logout() {
    isLoading.value = true;
    try {
      // Clear local storage (keep settings for dark mode)
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token');
      sessionStorage.clear();

      // Clean up Google-related data
      cleanupGoogleData();

      // Sign out from Supabase
      const { error } = await api.auth.signOut();
      if (error) {
        console.warn('SignOut error (continuing anyway):', error);
      }

      // Force clear session
      user.value = null;
      isInitialized.value = false;

      // Navigate to login
      router.push('/');

    } catch (error) {
      console.error('Logout Error:', error);
      // Ensure we clear state even on error
      user.value = null;
      isInitialized.value = false;
      router.push('/');
    } finally {
      isLoading.value = false;
    }
  }

  // 6. Clean up Google data
  function cleanupGoogleData() {
    // Clean cookies
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      if (cookieName.toLowerCase().includes('google') || 
          cookieName.toLowerCase().includes('g_state') ||
          cookieName.toLowerCase().includes('oauth')) {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${window.location.hostname};`;
      }
    });

    // Clean localStorage and sessionStorage
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
  }

  // 7. Sync user profile
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

  // 8. Session monitoring - disabled for persistent login
  function startSessionMonitoring() {
    // Disabled - user stays logged in until manual logout
    console.log('Session monitoring disabled - user stays logged in');
  }

  function stopSessionMonitoring() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  }

  // 9. Activity tracking - disabled for persistent login
  function startActivityTracking() {
    // Disabled - user stays logged in until manual logout
    console.log('Activity tracking disabled - user stays logged in');
  }

  function stopActivityTracking() {
    if (activityCleanup) {
      activityCleanup();
      activityCleanup = null;
    }
  }

  return {
    user,
    isLoading,
    isInitialized,
    initializeAuth,
    getUser,
    loginWithGoogle,
    logout,
    syncUserProfile,
    startSessionMonitoring,
    stopSessionMonitoring,
    startActivityTracking,
    stopActivityTracking
  };
});
