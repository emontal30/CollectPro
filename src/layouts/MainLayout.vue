<template>
  <div class="main-layout">
    <!-- حاوية التنبيهات -->
    <div id="alert-container" class="alert-container"></div>

    <!-- حاوية الإشعارات الموحدة -->
    <NotificationContainer />

    <!-- الهيدر -->
    <header>
      <Topbar />
    </header>

    <Sidebar />

    <!-- Main content area -->
    <main>
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <KeepAlive include="DashboardView,HarvestView">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </div>
    </main>

    <!-- الفوتر -->
    <footer>
      <Footer />
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

// توفير نظام الإشعارات للمكونات الفرعية
provide('notifications', notifications);

// دالة التحقق من قرب انتهاء الاشتراك
const checkSubscriptionExpiry = () => {
  // التأكد من أن البيانات محملة وأن هناك اشتراك نشط
  if (!subStore.isInitialized || !subStore.isSubscribed) return;

  const days = subStore.daysRemaining;
  const HAS_SHOWN_ALERT = sessionStorage.getItem('subscription_expiry_alert_shown');

  // التنبيه إذا كان متبقي 3 أيام أو أقل ولم يتم إظهاره في هذه الجلسة
  if (days <= 3 && days > 0 && !HAS_SHOWN_ALERT) {
    notifications.addNotification(
      `تنبيه: اشتراكك ينتهي خلال ${days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : days + ' أيام'}. يرجى التجديد لضمان استمرار الخدمة.`,
      'warning',
      10000 // يبقى لمدة 10 ثوانٍ
    );
    sessionStorage.setItem('subscription_expiry_alert_shown', 'true');
  }
};

// عند تحميل التخطيط الأساسي
onMounted(async () => {
  if (uiStore?.loadFromLocalStorage) uiStore.loadFromLocalStorage();
  if (settingsStore?.loadSettings) settingsStore.loadSettings();
  
  // التحقق من الاشتراك فور التهيئة
  if (subStore.isInitialized) {
    checkSubscriptionExpiry();
  }
});

// مراقبة تهيئة المتجر لإظهار التنبيه فور توفر البيانات
watch(() => subStore.isInitialized, (val) => {
  if (val) {
    checkSubscriptionExpiry();
  }
});
</script>

<style scoped>
/* Main Layout Styles */
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--light-bg, #f8fafc);
  /* إجبار المتصفح على عرض سطح المكتب المصغر بعرض 768px */
  min-width: 768px;
  overflow-x: auto;
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

/* Main content */
main {
  flex: 1;
  padding-top: 70px; /* Space for Topbar */
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  width: 100%;
  margin: 0 auto;
}

/* Footer */
footer {
  margin-top: auto;
}

/* Mobile responsiveness - تم تعطيلها لخدمة وضع سطح المكتب */
/* 
@media (max-width: 768px) {
  .content-wrapper {
    padding: 15px 10px;
  }
}
*/
</style>