<template>
  <div id="app-container">
    <router-view />

    <!-- مكونات النظام العالمية -->
    <InstallPrompt />
    <UpdateNotification :show="needRefresh" @reload="updateSW" />
    <NotificationContainer />
    <OfflineBanner />
  </div>
</template>

<script setup>
import { onMounted, provide } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useSettingsStore } from '@/stores/settings';
import { initializeSyncListener } from '@/services/archiveSyncQueue';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger';

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

const updateSW = async () => {
  await updateServiceWorker();
};

onMounted(() => {
  // 1. تحميل وتطبيق إعدادات التنسيقات والألوان من الكاش
  settingsStore.loadSettings();
  
  logger.info('🚀 App Mounted - System Initialized');
  
  // إضافة كلاس محمل للجسم بعد تحميل التطبيق
  document.body.classList.add('loaded');
  
  // تشغيل مستمع المزامنة التلقائية
  initializeSyncListener();
});
</script>

<style>
/* تضمن هذه التنسيقات ظهور المكونات في الطبقة العليا */
#app-container {
  min-height: 100vh;
  position: relative;
}
</style>
