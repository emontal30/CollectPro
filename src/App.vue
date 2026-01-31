<template>
  <div id="app-container">
    <ErrorBoundary>
      <router-view />
    </ErrorBoundary>

    <!-- مكونات النظام العالمية -->
    <InstallPrompt />
    <UpdateNotification :show="needRefresh" @reload="updateSW" />
    <NotificationContainer />
    <OfflineBanner />

    <!-- Vue-level Loading Fallback (Visible if Splash is gone but App is busy) -->
    <div v-if="isLoading && !authStore.isAuthenticated" class="vue-loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, provide, onBeforeUnmount, ref } from 'vue';
import { RouterView } from 'vue-router';
import ErrorBoundary from '@/components/ErrorBoundary.vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useSettingsStore } from '@/stores/settings';
import { initializeSyncListener } from '@/services/archiveSyncQueue';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger';
import { useItineraryStore } from '@/stores/itineraryStore';
import { useArchiveStore } from '@/stores/archiveStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAdminStore } from '@/stores/adminStore';
import { useHarvestStore } from '@/stores/harvest';
import { useAuthStore } from '@/stores/auth';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';

// استيراد المكونات العالمية
import InstallPrompt from '@/components/ui/InstallPrompt.vue';
import UpdateNotification from '@/components/views/UpdateNotification.vue';
import NotificationContainer from '@/components/ui/NotificationContainer.vue';
import OfflineBanner from '@/components/ui/OfflineBanner.vue';

// إعداد متجر الإعدادات
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const isLoading = ref(true);

onMounted(() => {
  // Give Vue a moment to render, then disable local loader
  setTimeout(() => { isLoading.value = false; }, 2000);
});

// إعداد نظام التنبيهات العالمي وتوفيره لكافة المكونات
const notifications = useNotifications();
provide('notifications', notifications);

// إعداد PWA Service Worker مع فحص دوري للتحديثات
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegistered(r) {
    if (r) {
      // فحص وجود تحديثات كل 60 ثانية
      setInterval(() => {
        logger.debug('Checking for App updates...');
        r.update();
      }, 60 * 1000);
    }
  }
});
const harvestStore = useHarvestStore();

const updateSW = async () => {
  try {
    logger.info('🔄 Application updating...');
    
    // 1. Save critical data first
    await harvestStore.prepareForUpdate();
    
    // 2. Unregister ALL service workers to ensure clean slate for new version
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // 3. Force update via PWA plugin (might fail if unregistered, but good to try)
    await updateServiceWorker();
    
    // 4. Hard reload just in case
    window.location.reload(true);
  } catch (error) {
    logger.error('Failed to update service worker:', error);
    window.location.reload(true);
  }
};

onMounted(() => {
  // 1. تحميل وتطبيق إعدادات التنسيقات والألوان من الكاش
  settingsStore.loadSettings();
  
  logger.info('🚀 App Mounted - System Initialized');
  
  // إضافة كلاس محمل للجسم بعد تحميل التطبيق
  document.body.classList.add('loaded');
  
  // تشغيل مستمع المزامنة التلقائية
  initializeSyncListener();

  // Refresh key stores when app returns from background or window regains focus
  const itineraryStore = useItineraryStore();
  const archiveStore = useArchiveStore();
  const collabStore = useCollaborationStore();
  const adminStore = useAdminStore();
  const harvestStore = useHarvestStore();
  const authStore = useAuthStore();
  const mySubStore = useMySubscriptionStore(); // متجر اشتراك المستخدم الحالي

  // تهيئة اشتراك المستخدم الحالي والاستماع للتحديثات الحية
  if (authStore.isAuthenticated) {
     mySubStore.init(authStore.user);
  }

  // دالة مركزية لتحديث جميع البيانات بذكاء (تسلسلي لتخفيف الضغط)
  const refreshAllStores = async (force = false, isResume = false) => {
    if (!navigator.onLine || !authStore.isAuthenticated) return;

    logger.info(`🔄 Starting smart refresh sequence (Resume: ${isResume})...`);

    try {
      // 1. الأولوية القصوى: التحقق من الاشتراك والحصاد
      const criticalTasks = [];

      // إذا كنا في وضع "استئناف" والبيانات موجودة بالفعل، نستخدم المزامنة الذكية بدلاً من إعادة التهيئة الكاملة
      if (isResume && harvestStore.hasData) {
        criticalTasks.push(harvestStore.handleConnectionRestored());
      } else {
        // تهيئة كاملة (عند بدء التطبيق أو إذا كانت البيانات فارغة)
        criticalTasks.push(harvestStore.initialize());
      }

      criticalTasks.push(mySubStore.forceRefresh(authStore.user));

      await Promise.allSettled(criticalTasks);

      // 2. الخلفية: باقي البيانات (يمكن أن تتأخر قليلاً)
      Promise.allSettled([
        itineraryStore.fetchRoutes(force),
        archiveStore.loadAvailableDates(force),
        settingsStore.checkRemoteCommands()
      ]).then(() => {
        logger.info('✅ Background data refreshed');
        if (authStore.isAdmin) adminStore.loadDashboardData(force);
      });

      logger.info('✅ Critical Data Refreshed');
    } catch (err) {
      logger.error('❌ Error refreshing critical stores:', err);
    }
  };

  const handleResume = async () => {
    try {
      if (!navigator.onLine) return;
      
      // Proactively refresh the session to handle expired tokens
      await authStore.proactivelyRefreshSession();

      if (!authStore.isAuthenticated) return;

      // Trigger smart refresh of data (pass true for isResume)
      await refreshAllStores(true, true);
      
      // Reconnect Collaboration Realtime separately as it is not part of harvest
      collabStore.reconnectRealtime();
      
      logger.info('App resumed: stores refreshed and realtime reconnected');
    } catch (err) {
      logger.error('Error refreshing stores on resume:', err);
    }
  };

  const handleOnline = () => {
    logger.info('🌐 Network Online Detected - Triggering Immediate Sync');
    handleResume();
  };

  const visibilityHandler = () => { if (!document.hidden) handleResume(); };

  window.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('focus', handleResume);
  window.addEventListener('online', handleOnline); // ✨ Added Listener

  // Cleanup on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('focus', handleResume);
    window.removeEventListener('online', handleOnline);
  });

  // --- Initial App Mount Logic ---
  const initializeApp = async () => {
    try {
      logger.info('🚀 Starting App Initialization...');
      
      // 1. Initialize Auth FIRST
      await authStore.initializeAuth();

      // 2. Fetch Data if Authenticated
      if (authStore.isAuthenticated) {
        logger.info('👤 User authenticated, fetching initial data...');
        mySubStore.init(authStore.user);
        await refreshAllStores(true); // Force fetch on first load to ensure fresh data
      } else {
        logger.info('👋 No user session found (Guest)');
      }
      
    } catch (error) {
      logger.error('💥 App Initialization Failed:', error);
    }
  };

  // تشغيل التهيئة عند التركيب
  initializeApp();
});
</script>

<style scoped>
.vue-loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-light);
  z-index: 9990;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dark .vue-loading-overlay {
  background: var(--bg-dark);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 121, 101, 0.3);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<style>
/* تضمن هذه التنسيقات ظهور المكونات في الطبقة العليا */
#app-container {
  min-height: 100vh;
  position: relative;
}
</style>