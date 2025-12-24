<template>
  <div class="main-layout">
    <!-- حاوية التنبيهات -->
    <div id="alert-container" class="alert-container"></div>

    <!-- حاوية الإشعارات الموحدة -->
    <NotificationContainer />

    <!-- الهيدر المثبت -->
    <header class="app-header fixed-header">
      <div class="header-stretch">
         <Topbar />
      </div>
    </header>

    <Sidebar />

    <!-- منطقة المحتوى الرئيسي مع إزاحة للهيدر -->
    <main class="app-main">
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <KeepAlive include="DashboardView,HarvestView">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </div>
    </main>

    <!-- الفوتر -->
    <footer class="app-footer">
      <div class="footer-stretch">
        <Footer />
      </div>
    </footer>
  </div>
</template>

<script setup>
import { provide, onMounted, watch } from 'vue';
import Topbar from '@/components/layout/Topbar.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import Footer from '@/components/layout/Footer.vue';
import NotificationContainer from '@/components/ui/NotificationContainer.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';

const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const subStore = useMySubscriptionStore();
const notifications = useNotifications();

provide('notifications', notifications);

const checkSubscriptionExpiry = () => {
  if (!subStore.isInitialized || !subStore.isSubscribed) return;
  const days = subStore.daysRemaining;
  const HAS_SHOWN_ALERT = sessionStorage.getItem('subscription_expiry_alert_shown');
  if (days <= 3 && days > 0 && !HAS_SHOWN_ALERT) {
    notifications.addNotification(
      `تنبيه: اشتراكك ينتهي خلال ${days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : days + ' أيام'}. يرجى التجديد لضمان استمرار الخدمة.`,
      'warning',
      10000
    );
    sessionStorage.setItem('subscription_expiry_alert_shown', 'true');
  }
};

onMounted(async () => {
  if (uiStore?.loadFromLocalStorage) uiStore.loadFromLocalStorage();
  if (settingsStore?.loadSettings) settingsStore.loadSettings();
  if (subStore.isInitialized) checkSubscriptionExpiry();
});

watch(() => subStore.isInitialized, (val) => {
  if (val) checkSubscriptionExpiry();
});
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--light-bg, #f8fafc);
  width: 100%;
  position: relative;
  overflow-x: hidden;
}

/* تنسيق الهيدر المثبت */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-header, 1000);
  background: var(--header-bg);
  box-shadow: var(--shadow-md);
}

.alert-container {
  position: fixed;
  top: calc(var(--header-height, 70px) + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
}

.app-header, .app-footer {
  width: 100%;
  display: flex;
  justify-content: center;
}

.header-stretch, .footer-stretch {
    width: 100%;
    min-width: var(--app-min-width, 768px);
    display: flex;
    justify-content: center;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* إزاحة المحتوى لأسفل لتعويض الهيدر المثبت */
  padding-top: var(--header-height, 70px);
  overflow-x: auto;
}

.content-wrapper {
  flex: 1;
  width: 100%;
  max-width: var(--app-min-width, 768px);
  margin: 0 auto;
  padding-top: 20px;
  padding-bottom: 20px;
}

.app-footer {
  margin-top: auto;
}

/* ضبط موضع الإشعارات لتظهر تحت الهيدر المثبت */
:deep(.notification-container) {
  top: calc(var(--header-height, 70px) + 10px) !important;
}
</style>
