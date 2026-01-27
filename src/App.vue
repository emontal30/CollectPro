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
  </div>
</template>

<script setup>
import { onMounted, provide, onBeforeUnmount } from 'vue';
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

// إعداد نظام التنبيهات العالمي وتوفيره لكافة المكونات
const notifications = useNotifications();
provide('notifications', notifications);

// إعداد PWA Service Worker
const { needRefresh, updateServiceWorker } = useRegisterSW();
const harvestStore = useHarvestStore();

const updateSW = async () => {
  try {
    // حفظ البيانات قبل التحديث كإجراء احترازي
    await harvestStore.prepareForUpdate();
    await updateServiceWorker();
  } catch (error) {
    logger.error('Failed to update service worker:', error);
    // حتى في حالة الفشل، نحاول التحديث
    await updateServiceWorker();
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
  const refreshAllStores = async (force = false) => {
    if (!navigator.onLine || !authStore.isAuthenticated) return;

    logger.info('🔄 Starting smart refresh sequence...');

    try {
      // 1. الأولوية القصوى: التحقق من الاشتراك والحصاد (الحالة الحالية)
      // نستخدم Promise.all للأشياء الحرجة فقط
      await Promise.allSettled([
        harvestStore.initialize(),
        mySubStore.forceRefresh(authStore.user)
      ]);

      // 2. الخلفية: باقي البيانات (يمكن أن تتأخر قليلاً)
      // لا نستخدم await هنا لكي لا نعطل الواجهة، لكن نسجل الأخطاء
      Promise.allSettled([
        itineraryStore.fetchRoutes(force),
        archiveStore.loadAvailableDates(force),
        collabStore.fetchCollaborators(),
        settingsStore.checkRemoteCommands()
      ]).then(() => {
        logger.info('✅ Background data refreshed');
        // Admin dashboard is heavy, load last
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
      // Timeout is handled inside this function now
      await authStore.proactivelyRefreshSession();

      if (!authStore.isAuthenticated) return;

      // Trigger smart refresh of data
      await refreshAllStores(true);

      // Explicitly reconnect Realtime channels if they were dropped
      // This is crucial for mobile background recovery
      harvestStore.reconnectRealtime();
      collabStore.reconnectRealtime();
      
      logger.info('App resumed: stores refreshed and realtime reconnected');
    } catch (err) {
      logger.error('Error refreshing stores on resume:', err);
    }
  };

  const visibilityHandler = () => { if (!document.hidden) handleResume(); };

  window.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('focus', handleResume);

  // Cleanup on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('focus', handleResume);
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

<style>
/* تضمن هذه التنسيقات ظهور المكونات في الطبقة العليا */
#app-container {
  min-height: 100vh;
  position: relative;
}
</style>
