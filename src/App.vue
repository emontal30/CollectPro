<template>
  <div id="app">
    <OfflineBanner />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import OfflineBanner from '@/components/ui/OfflineBanner.vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSessionManager } from '@/composables/useSessionManager';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useRoute } from 'vue-router';
import { processPendingSyncQueue } from '@/services/archiveSyncQueue';
import logger from '@/utils/logger.js';

const authStore = useAuthStore();
const sessionManager = useSessionManager();
const router = useRouter();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const route = useRoute();

// Cleanup handlers
let visibilityCleanup = null;
let activityCleanup = null;
let onlineCleanup = null;

// Throttling for visibility checks
let lastVisibilityCheck = 0;
const VISIBILITY_CHECK_THROTTLE = 30000; // 30 seconds

// Function to update body class based on route
function updateBodyClass(routeName) {
  // Remove all page-specific classes first
  document.body.classList.remove(
    'harvest-page', 
    'archive-page', 
    'dashboard-page', 
    'counter-page', 
    'subscriptions-page', 
    'admin-page',
    'my-subscription-page'
  );
  
  // Add appropriate page class based on route
  const pageClassMap = {
    'harvest': 'harvest-page',
    'archive': 'archive-page',
    'dashboard': 'dashboard-page',
    'counter': 'counter-page',
    'subscriptions': 'subscriptions-page',
    'admin': 'admin-page',
    'my-subscription': 'my-subscription-page'
  };
  
  const pageClass = pageClassMap[routeName];
  if (pageClass) {
    document.body.classList.add(pageClass);
  }
}

// Watch for route changes
watch(() => route.name, (newName) => {
  updateBodyClass(newName);
});

// Watch auth changes for diagnostics (no redirects here)
watch(() => authStore.user, (newUser, oldUser) => {
  try {
    logger.info('🔁 authStore.user changed (diagnostic):', { hadUser: !!oldUser, hasUser: !!newUser });
  } catch (e) {
    logger.warn('Error logging auth change:', e);
  }
});

// Removed conflicting watcher that was redirecting to dashboard on auth restore
// Routing logic is now handled exclusively by Router Guard

onMounted(() => {
  logger.info('🚀 App mounted, initializing session management and stores...');

  // Initialize session management first
  sessionManager.initializeSession();
  
  // Setup activity listeners for session tracking
  activityCleanup = sessionManager.setupActivityListeners();

  // Enable performance monitor temporarily to capture freezes
  try {
    if (window.performanceMonitor && typeof window.performanceMonitor.enable === 'function') {
      window.performanceMonitor.enable();
      logger.info('📈 Performance monitor enabled (debug)');
    }
  } catch (err) {
    logger.warn('Failed to enable performance monitor:', err);
  }

  // Wrap router.push/replace to log timings and errors for diagnostics
  try {
    const origPush = router.push.bind(router);
    router.push = (...args) => {
      logger.info('➡️ router.push called', args);
      const t0 = performance.now();
      const result = origPush(...args);
      Promise.resolve(result)
        .then(() => logger.info('✅ router.push resolved', args, Math.round(performance.now() - t0), 'ms'))
        .catch(err => logger.error('❌ router.push error', err, args));
      return result;
    };

    const origReplace = router.replace.bind(router);
    router.replace = (...args) => {
      logger.info('➡️ router.replace called', args);
      const t0 = performance.now();
      const result = origReplace(...args);
      Promise.resolve(result)
        .then(() => logger.info('✅ router.replace resolved', args, Math.round(performance.now() - t0), 'ms'))
        .catch(err => logger.error('❌ router.replace error', err, args));
      return result;
    };
  } catch (err) {
    logger.warn('Router instrumentation failed:', err);
  }

  // Optional: allow disabling Service Worker via localStorage for debugging
  // Set `localStorage.setItem('collectpro_disable_sw', '1')` to unregister SW on startup
  if ('serviceWorker' in navigator) {
    try {
      const disableSW = localStorage.getItem('collectpro_disable_sw')
      if (disableSW === '1') {
          navigator.serviceWorker.getRegistrations()
            .then(regs => {
              regs.forEach(reg => {
                reg.unregister()
                  .then(ok => logger.info('ServiceWorker unregistered (debug):', ok, reg))
                  .catch(err => logger.error('ServiceWorker unregister error:', err));
              });
            })
            .catch(err => logger.error('ServiceWorker unregister error:', err));
        }
    } catch (err) {
      logger.warn('ServiceWorker debug toggle check failed:', err)
    }
  }

  // Initialize auth asynchronously (non-blocking)
    authStore.initializeAuth().catch(error => {
    logger.error('Auth initialization failed:', error);
    // Don't block UI for auth errors
  });

  // Initialize other stores immediately (non-blocking)
  if (uiStore?.loadFromLocalStorage) {
    uiStore.loadFromLocalStorage();
  }

  if (settingsStore?.loadSettings) {
    settingsStore.loadSettings();
  }

  updateBodyClass(route.name);

  // Enhanced page visibility handler with session check (throttled)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Update activity timestamp
      sessionManager.updateLastActivity();

      // Check auth state when actually needed
      if (authStore.user === null && authStore.isLoading === false) {
        authStore.getUser().catch(err => logger.error(err));
      }

      // NOTE: Removed periodic session validity checks here to avoid
      // network-driven navigation freezes. Session validity is now
      // checked only on-demand (e.g., when user is missing) or for
      // admin-protected routes in the router guard.
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
  visibilityCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  // Setup online/offline listeners for Background Sync
  const handleOnline = () => {
    logger.info('🌐 Connection restored — processing pending sync queue...');
    processPendingSyncQueue().catch(err => logger.error(err));
  };

  window.addEventListener('online', handleOnline);
  onlineCleanup = () => window.removeEventListener('online', handleOnline);

  document.body.classList.add('loaded');
  logger.info('✅ App initialization complete');
});

onUnmounted(() => {
  logger.info('🧹 App unmounting, cleaning up...');

  // Cleanup event listeners
  if (visibilityCleanup) {
    visibilityCleanup();
  }
  if (onlineCleanup) {
    onlineCleanup();
  }

  // Cleanup activity listeners
  if (activityCleanup) {
    activityCleanup();
  }

  // Stop session monitoring and cleanup
  sessionManager.cleanup();

  // Stop all monitoring systems (legacy)
  authStore.stopSessionMonitoring?.();
  authStore.stopActivityTracking?.();

  // Cleanup page tracker (legacy)
  if (window.pageTracker?.cleanup) {
    window.pageTracker.cleanup();
  }

  logger.info('✅ Cleanup complete');
});
</script>

<style>
/* Global styles are imported in main.js */
</style>