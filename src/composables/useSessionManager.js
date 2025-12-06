/**
 * Session Management Composable for CollectPro
 * Extracted and refactored from vanilla JS files to Vue 3 Composition API
 * Handles session duration, activity tracking, and page navigation
 * Optimized with throttling to reduce performance impact
 */

import { ref } from 'vue';
import { supabase } from '@/supabase';
import { useRouter } from 'vue-router';

// Constants from original session-manager.js
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const LAST_ACTIVITY_KEY = 'collectpro_last_activity';
const LAST_PAGE_KEY = 'collectpro_last_page';

// Feature flag to enable/disable session management
const SESSION_MANAGEMENT_ENABLED = import.meta.env.VITE_SESSION_MANAGEMENT_ENABLED !== 'false';

// Throttling configuration
const ACTIVITY_UPDATE_THROTTLE = 5000; // 5 seconds
const SESSION_VALIDITY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSessionManager() {
  const router = useRouter();
  const sessionCheckInterval = ref(null);
  const isSessionValid = ref(true);

  // Throttling variable for activity updates
  let lastUpdateTimestamp = 0;

  // Session validity cache
  let sessionValidityCache = {
    isValid: null,
    timestamp: 0
  };

  /**
   * Update the last activity timestamp with throttling
   * Only updates localStorage every 5 seconds to reduce performance impact
   */
  const updateLastActivity = () => {
    const now = Date.now();
    if (now - lastUpdateTimestamp > ACTIVITY_UPDATE_THROTTLE) {
      lastUpdateTimestamp = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }
  };

  /**
   * Check if the current session is still valid
   * Uses caching to avoid repeated expensive checks
   * @returns {Promise<boolean>} - true if session is valid, false otherwise
   */
  const checkSessionValidity = async () => {
    if (!SESSION_MANAGEMENT_ENABLED) {
      return true; // Always valid if session management is disabled
    }

    // Check cache first (valid for 5 minutes)
    const now = Date.now();
    if (sessionValidityCache.isValid !== null &&
        (now - sessionValidityCache.timestamp) < SESSION_VALIDITY_CACHE_DURATION) {
      return sessionValidityCache.isValid;
    }

    try {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

      if (!lastActivity) {
        console.log('🕰️ No last activity found, initializing...');
        updateLastActivity();
        sessionValidityCache = { isValid: true, timestamp: now };
        return true;
      }

      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);

      // If session has expired
      if (timeSinceLastActivity > SESSION_DURATION) {
        console.log('🕰️ Session expired due to inactivity (24 hours exceeded)');

        // Only force logout if user is actually logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await forceLogout();
        }
        sessionValidityCache = { isValid: false, timestamp: now };
        return false;
      }

      // Only log occasionally to avoid spam
      if (timeSinceLastActivity % (10 * 60 * 1000) < 5000) { // Every ~10 minutes
        console.log('🕰️ Session valid, time since last activity:', Math.round(timeSinceLastActivity / 1000 / 60), 'minutes');
      }

      isSessionValid.value = true;
      sessionValidityCache = { isValid: true, timestamp: now };
      return true;
    } catch (error) {
      console.error('Error checking session validity:', error);
      // On error, assume valid to not block navigation
      sessionValidityCache = { isValid: true, timestamp: now };
      return true;
    }
  };

  /**
   * Force logout and cleanup all session data
   */
  const forceLogout = async () => {
    console.log('🚪 Force logout initiated');

    try {
      // Clear all session-related data
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem(LAST_PAGE_KEY);

      // Clear session validity cache
      sessionValidityCache = { isValid: null, timestamp: 0 };

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }

      // Stop session monitoring
      stopSessionMonitor();

      // Navigate to login
      router.push('/');

      console.log('🚪 Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still navigate to login even if there's an error
      router.push('/');
    }
  };

  /**
   * Setup activity listeners to track user interaction
   * @returns {Function} - cleanup function to remove listeners
   */
  const setupActivityListeners = () => {
    if (!SESSION_MANAGEMENT_ENABLED) {
      console.log('⏭️ Session management disabled, skipping activity listeners');
      return () => {}; // Return no-op cleanup function
    }

    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart',
      'click', 'focus', 'blur', 'visibilitychange'
    ];

    const handler = () => updateLastActivity();

    console.log('👁️ Setting up activity listeners...');

    events.forEach(event => {
      // Use passive listeners for scroll and touch events for better performance
      const options = ['scroll', 'touchstart', 'touchmove'].includes(event)
        ? { passive: true }
        : undefined;
      window.addEventListener(event, handler, options);
    });

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up activity listeners...');
      events.forEach(event => {
        window.removeEventListener(event, handler);
      });
    };
  };

  /**
   * Start session monitoring with periodic checks
   */
  const startSessionMonitor = () => {
    // Update activity immediately
    updateLastActivity();

    // Clear any existing interval
    if (sessionCheckInterval.value) {
      clearInterval(sessionCheckInterval.value);
    }

    // Check session validity every 15 minutes (less aggressive)
    sessionCheckInterval.value = setInterval(() => {
      console.log('🔍 Periodic session check...');
      checkSessionValidity();
    }, 15 * 60 * 1000);

    console.log('📊 Session monitoring started (checks every 15 minutes)');
  };

  /**
   * Stop session monitoring
   */
  const stopSessionMonitor = () => {
    if (sessionCheckInterval.value) {
      clearInterval(sessionCheckInterval.value);
      sessionCheckInterval.value = null;
      console.log('⏹️ Session monitoring stopped');
    }
  };

  /**
   * Save the current page path to localStorage
   * @param {string} path - The path to save (defaults to current route)
   */
  const saveCurrentPage = (path = null) => {
    const pagePath = path || router.currentRoute.value.fullPath;

    // Don't save login page or root path
    if (pagePath && pagePath !== '/' && pagePath !== '/login') {
      localStorage.setItem(LAST_PAGE_KEY, pagePath);
      console.log('📍 Page saved:', pagePath);
    }
  };

  /**
   * Get the last saved page path
   * @returns {string|null} - The last saved page path or null
   */
  const getLastPage = () => {
    const lastPage = localStorage.getItem(LAST_PAGE_KEY);
    return lastPage || null;
  };

  /**
   * Clear the last saved page (useful for logout)
   */
  const clearLastPage = () => {
    localStorage.removeItem(LAST_PAGE_KEY);
    console.log('🗑️ Last page cleared');
  };

  /**
   * Check if we should restore the last page after login
   * @returns {boolean} - true if we should restore, false otherwise
   */
  const shouldRestorePage = () => {
    const currentPage = router.currentRoute.value.path;
    const referrer = document.referrer;

    // Don't restore if we're already on the main app page
    if (currentPage.startsWith('/app')) {
      return false;
    }

    // Don't restore if coming from external referrer
    if (referrer && !referrer.includes(window.location.hostname)) {
      return false;
    }

    // Don't restore if coming from login page
    if (referrer && (referrer.includes('/login') || referrer.endsWith('/'))) {
      return false;
    }

    const lastPage = getLastPage();
    return lastPage && lastPage !== '/login';
  };

  /**
   * Initialize session management
   * Call this when the app starts
   */
  const initializeSession = () => {
    if (!SESSION_MANAGEMENT_ENABLED) {
      console.log('⏭️ Session management disabled, skipping initialization');
      return;
    }

    console.log('🚀 Initializing session management...');
    startSessionMonitor();
    updateLastActivity();
  };

  /**
   * Cleanup function to call on app unmount
   */
  const cleanup = () => {
    stopSessionMonitor();
  };

  return {
    // State
    isSessionValid,

    // Session management
    checkSessionValidity,
    forceLogout,
    updateLastActivity,
    startSessionMonitor,
    stopSessionMonitor,
    initializeSession,
    cleanup,

    // Page tracking
    saveCurrentPage,
    getLastPage,
    clearLastPage,
    shouldRestorePage,

    // Activity tracking
    setupActivityListeners
  };
}