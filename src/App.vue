<template>
  <div id="app" :class="pageClasses">
    <OfflineBanner />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router'; // Router is used in template/computed
import OfflineBanner from '@/components/ui/OfflineBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { useSessionManager } from '@/composables/useSessionManager';
import logger from '@/utils/logger.js';

// --- Stores & Composables ---
const authStore = useAuthStore();
const sessionManager = useSessionManager();
const route = useRoute();

// --- Local State ---
const isLoaded = ref(false);

// --- Cleanup References ---
let visibilityCleanup = null;
let onlineCleanup = null;
let activityCleanup = null;

// --- Computed: Page Classes ---
const pageClasses = computed(() => {
  const currentRoute = route.name;
  
  const classMap = {
    'Harvest': 'harvest-page',
    'Archive': 'archive-page',
    'Dashboard': 'dashboard-page',
    'Counter': 'counter-page',
    'Subscriptions': 'subscriptions-page',
    'Admin': 'admin-page',
    'MySubscription': 'my-subscription-page'
  };

  const specificClass = classMap[currentRoute] || (currentRoute ? `${currentRoute.toLowerCase()}-page` : '');

  return {
    [specificClass]: !!specificClass,
    'loaded': isLoaded.value
  };
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  logger.info('🚀 App initializing...');

  try {
    // 1. Setup Session Listeners (Only listeners, no init check here)
    // التغيير هنا: قمنا بإزالة initializeSession واستبدالها بإعداد المستمعين فقط
    activityCleanup = sessionManager.setupActivityListeners();

    // 2. Initialize Auth (This handles the session validity check now)
    // ننتظر المصادقة لضمان عدم حدوث تعارض
    await authStore.initializeAuth();

    // 3. Setup Handlers
    setupVisibilityHandler();
    setupOnlineHandler();

    // 4. Mark App as Loaded
    setTimeout(() => {
      isLoaded.value = true;
      logger.info('✅ Application Mounted Successfully');
    }, 100);

  } catch (error) {
    logger.error('❌ Critical App Initialization Error:', error);
  }
});

onUnmounted(() => {
  logger.info('🧹 App cleaning up...');
  
  if (visibilityCleanup) visibilityCleanup();
  if (onlineCleanup) onlineCleanup();
  if (activityCleanup) activityCleanup();
  
  sessionManager.clearLocalSession(); // Optional: clears strictly on destroy if needed
});

// --- Helper Functions ---

function setupVisibilityHandler() {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      sessionManager.updateLastActivity();
      
      // Re-check user if returning to app
      if (!authStore.user && !authStore.isLoading) {
        authStore.getUser().catch(() => {});
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
  visibilityCleanup = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function setupOnlineHandler() {
  const handleOnline = () => {
    logger.info('🌐 Connection restored');
    // Here we will add sync logic later (Phase 3)
  };

  window.addEventListener('online', handleOnline);
  onlineCleanup = () => window.removeEventListener('online', handleOnline);
}
</script>

<style>
/* Global styles managed in assets/css */
</style>