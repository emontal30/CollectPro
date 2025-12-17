<template>
  <div class="main-layout">
    <!-- حاوية التنبيهات -->
    <div id="alert-container" class="alert-container"></div>

    <!-- حاوية الإشعارات الموحدة -->
    <NotificationContainer />

    <!-- الهيدر -->
    <header>
      <Topbar :page-title="pageTitle" />
    </header>

    <Sidebar />

    <!-- Main content area -->
    <main>
      <div class="content">
        <router-view />
      </div>
    </main>

    <!-- الفوتر -->
    <footer>
      <Footer />
    </footer>
  </div>
</template>

<script setup>
import { computed, provide, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Topbar from '@/components/layout/Topbar.vue';
import Sidebar from '@/components/layout/Sidebar.vue';
import Footer from '@/components/layout/Footer.vue';
import NotificationContainer from '@/components/ui/NotificationContainer.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';

const route = useRoute();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

// Initialize UI and Settings stores when the main layout is mounted
onMounted(() => {
  if (uiStore?.loadFromLocalStorage) uiStore.loadFromLocalStorage();
  if (settingsStore?.loadSettings) settingsStore.loadSettings();
});

// نظام الإشعارات الموحد
const notifications = useNotifications();

// توفير نظام الإشعارات للمكونات الفرعية
provide('notifications', notifications);

// Dynamic page titles
const pageTitle = computed(() => {
  const titles = {
    '/dashboard': 'إدخال البيانات 📝',
    '/harvest': 'التحصيلات 📊',
    '/archive': 'الأرشيف 📚',
    '/counter': 'عداد الأموال 🧮',
    '/subscriptions': 'الاشتراكات 💳',
    '/my-subscription': 'اشتراكي 🛡️',
    '/admin': 'لوحة التحكم 👑'
  };
  return titles[route.path] || 'CollectPro';
});
</script>

<style scoped>
/* Main Layout Styles */
.main-layout {
  min-height: 100vh;
  font-family: 'Cairo', sans-serif;
}

/* Alert container */
.alert-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  pointer-events: none;
}

.alert {
  background: white;
  border-radius: 8px;
  padding: 15px 20px;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  pointer-events: auto;
  min-width: 300px;
  max-width: 500px;
}

.alert.show {
  opacity: 1;
  transform: translateY(0);
}

.alert-info {
  border-left: 4px solid var(--primary);
  color: var(--primary);
}

.alert-success {
  border-left: 4px solid var(--success);
  color: var(--success);
}

.alert-warning {
  border-left: 4px solid var(--secondary);
  color: var(--secondary);
}

.alert-error {
  border-left: 4px solid var(--danger);
  color: var(--danger);
}

/* Main content */
main {
  min-height: 100vh;
  display: flex;
  background: var(--light-bg);
  padding-top: 80px;
}

.content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Footer */
footer {
  margin-top: auto;
  background: transparent;
}

/* Night mode rules migrated to src/assets/css/unified-dark-mode.css */

/* Mobile responsiveness */
@media (max-width: 768px) {
  .alert {
    min-width: 250px;
    max-width: 90vw;
    font-size: 0.9rem;
  }

  .content {
    padding: 15px;
  }
}
</style>