<template>
  <div id="app" :class="pageClasses">
    <OfflineBanner />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import OfflineBanner from '@/components/ui/OfflineBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { useSessionManager } from '@/composables/useSessionManager';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { processPendingSyncQueue } from '@/services/archiveSyncQueue';
import logger from '@/utils/logger.js';

// --- Stores & Composables ---
const authStore = useAuthStore();
const sessionManager = useSessionManager();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const route = useRoute();

// --- Local State ---
const isLoaded = ref(false);

// --- Cleanup References ---
let visibilityCleanup = null;
let activityCleanup = null;
let onlineCleanup = null;

// --- Computed: Page Classes (Reactive Logic) ---
const pageClasses = computed(() => {
  const currentRoute = route.name;
  
  // خريطة الكلاسات الخاصة بكل صفحة للحفاظ على التنسيق
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
    'loaded': isLoaded.value // بديل لتلاعب body.classList.add('loaded')
  };
});

// --- Diagnostics ---
watch(() => authStore.user, (newUser, oldUser) => {
  if (newUser !== oldUser) {
    logger.debug('👤 Auth State Updated:', { hasUser: !!newUser });
  }
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  logger.info('🚀 App initializing...');

  try {
    // 1. Initialize Stores & Session
    // نقوم بتهيئة الجلسة أولاً لضمان توفر المعلومات الأساسية
    sessionManager.initializeSession();
    activityCleanup = sessionManager.setupActivityListeners();

    // تهيئة المخازن الأخرى (Non-blocking)
    // Removed eager loading of UI and Settings stores.
    // These are now loaded in MainLayout.vue after authentication.

    // محاولة تهيئة المصادقة (بدون تعطيل الواجهة)
    authStore.initializeAuth().catch(err => {
      logger.warn('⚠️ Auth init background warning:', err.message);
    });

    // 2. Setup Event Listeners
    setupVisibilityHandler();
    setupOnlineHandler();

    // 3. Mark App as Loaded (Trigger CSS Transitions)
    // نستخدم setTimeout صغير لضمان تطبيق الأنيميشن بعد الرسم الأولي
    setTimeout(() => {
      isLoaded.value = true;
      logger.info('✅ App fully mounted and loaded');
    }, 100);

  } catch (error) {
    logger.error('❌ Critical App Initialization Error:', error);
  }
});

onUnmounted(() => {
  logger.info('🧹 App cleaning up...');
  
  // إزالة جميع المستمعين لتجنب تسريب الذاكرة
  if (visibilityCleanup) visibilityCleanup();
  if (onlineCleanup) onlineCleanup();
  if (activityCleanup) activityCleanup();
  
  // تنظيف إدارة الجلسة
  sessionManager.cleanup();
});

// --- Helper Functions ---

function setupVisibilityHandler() {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      sessionManager.updateLastActivity();
      
      // تحقق خفيف من التوكن عند العودة للتطبيق إذا لم يكن هناك مستخدم
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
    logger.info('🌐 Connection restored — syncing...');
    processPendingSyncQueue().catch(err => logger.error('Sync Error:', err));
  };

  window.addEventListener('online', handleOnline);
  onlineCleanup = () => window.removeEventListener('online', handleOnline);
}
</script>

<style>
/* Global styles are managed via assets/css imports in main.js.
  No local styles needed here to preserve the unified system.
*/
</style>