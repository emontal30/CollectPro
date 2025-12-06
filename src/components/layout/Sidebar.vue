<template>
  <div
    class="overlay"
    :class="{ active: store.isOpen }"
    @click="store.closeSidebar"
  ></div>

  <div id="sidebar" class="sidebar" :class="{ active: store.isOpen }">

    <div class="sidebar-header">
      <div class="user-box">

        <div class="user-data-container">
          <div class="user-meta">
            <span id="user-name" class="user-name">
              {{ store.user?.user_metadata?.full_name || store.user?.email || 'مستخدم' }}
            </span>
            <span id="user-email" class="user-email">
              {{ store.user?.email }}
            </span>
            <span id="user-id" class="user-id">
              ID: {{ store.user?.id?.slice(-7) }}
            </span>
          </div>
        </div>

        <div class="subscription-container">
          <h4 class="subscription-title">حالة الاشتراك</h4>
          <div class="subscription-info">
            <div
              class="subscription-days-simple"
              :class="store.subscriptionStatusClass"
            >
              <i class="fas fa-clock"></i>
              <span id="days-left">{{ store.daysDisplay }}</span>
              <span v-if="store.showDaysText"> يوم متبقي</span>
            </div>
          </div>
        </div>

        <div class="logout-container">
          <button 
            class="dark-mode-toggle" 
            title="تبديل الوضع الليلي"
            @click="toggleDarkMode"
          >
            <i class="fas" :class="isDarkMode ? 'fa-sun' : 'fa-moon'"></i>
            <span>{{ isDarkMode ? 'وضع نهاري' : 'وضع ليلي' }}</span>
          </button>
          
          <button id="logout-btn" class="logout-btn" @click="store.logout">
            <i class="fas fa-sign-out-alt"></i>
            <span>تسجيل الخروج</span>
          </button>
        </div>

      </div>
    </div>

    <div class="sidebar-content">
      <ul class="nav-links">
        <li>
          <router-link to="/app/dashboard" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-tachometer-alt"></i><span>إدخال البيانات</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/harvest" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-donate"></i><span>التحصيلات</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/archive" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-archive"></i><span>الأرشيف</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/counter" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-calculator"></i><span>عداد الأموال</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/subscriptions" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-credit-card"></i><span>الاشتراكات</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/my-subscription" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-user-shield"></i><span>اشتراكي</span>
          </router-link>
        </li>
        <li>
          <router-link to="/app/admin" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-user-cog"></i><span>لوحة التحكم</span>
          </router-link>
        </li>
      </ul>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSettingsStore } from '@/stores/settings';

const store = useSidebarStore();
const settingsStore = useSettingsStore();

const isDarkMode = computed(() => settingsStore.darkMode);

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
}

// تحميل البيانات عند فتح الشريط الجانبي
onMounted(() => {
  store.fetchSidebarData();
});
</script>

<style scoped>
/* استيراد المتغيرات الأساسية */
/* تأكد من أن المتغيرات مثل --primary معرفة في ملف global css */

/* 🎨 الشريط الجانبي - من sidebar.css */
.sidebar {
    position: fixed;
    top: 70px; /* يبدأ من أسفل الشريط العلوي مباشرة */
    right: -280px;
    width: 280px;
    height: calc(100vh - 70px);
    background: var(--primary, #007965);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    transition: right 0.3s ease, transform 0.3s ease;
    z-index: 1009;
    transform: translateX(0);
    backdrop-filter: blur(10px);
    overflow-y: auto;
}

.sidebar.active {
  right: 0;
}

.sidebar-header {
    padding: 0 15px;
    margin-bottom: 20px;
}

/* User Box Styles */
.user-box {
    background: rgba(255,255,255,0.05);
    padding: 12px 15px;
    border-radius: 8px;
    margin: 0 15px 15px 15px;
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.2s ease;
}

.user-box:hover {
    background: rgba(255,255,255,0.08);
}

/* User Data Container */
.user-data-container {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 15px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.user-data-container:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.user-meta { width: 100%; }

.user-name {
    font-weight: 600;
    font-size: 18px;
    color: #ffffff;
    margin-bottom: 5px;
    display: block;
}

.user-email {
    font-size: 13px;
    color: rgba(255,255,255,0.8);
    margin-bottom: 5px;
    display: block;
}

.user-id {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    font-family: monospace;
    background: rgba(255,255,255,0.08);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
}

/* Subscription Container */
.subscription-container {
  background: rgba(0, 121, 101, 0.2);
  border: 1px solid rgba(0, 121, 101, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.subscription-container:hover {
  background: rgba(0, 121, 101, 0.3);
  border-color: rgba(0, 121, 101, 0.5);
}

.subscription-title {
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-align: center;
  letter-spacing: 0.5px;
}

.subscription-info {
  background: transparent;
  border: none;
  border-radius: 8px;
  padding: 0;
  margin: 0;
}

.subscription-days-simple {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.subscription-days-simple i {
  color: #ffffff;
  font-size: 14px;
}

/* حالات الاشتراك (ألوان) */
.subscription-days-simple.expired { color: #ff6b6b; }
.subscription-days-simple.expired i { color: #ff6b6b; }
.subscription-days-simple.pending { color: #ffffff; }
.subscription-days-simple.pending i { color: #ffffff; }
.subscription-days-simple.warning { color: #f39c12; }
.subscription-days-simple.warning i { color: #f39c12; }

/* Logout Container */
.logout-container {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 12px;
  padding: 8px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logout-container:hover {
  background: rgba(220, 53, 69, 0.2);
  border-color: rgba(220, 53, 69, 0.5);
}

.logout-btn {
  background: #dc3545;
  border: none;
  border-radius: 10px;
  padding: 10px 15px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  width: 100%;
}

.logout-btn:hover {
  background: #c82333;
}

/* Dark mode toggle button */
.dark-mode-toggle {
  background: rgba(52, 152, 219, 0.8);
  border: none;
  border-radius: 10px;
  padding: 10px 15px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  width: 100%;
  margin-bottom: 8px;
}

.dark-mode-toggle:hover {
  background: rgba(52, 152, 219, 1);
  transform: scale(1.02);
}

/* Navigation Links */
.sidebar-content { flex: 1; overflow-y: auto; }
.nav-links { list-style: none; padding: 0 15px; }

.nav-links a {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px 15px;
    margin: 5px 15px;
    border-radius: 12px;
    color: #fff;
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 18px;
    font-weight: 500;
    position: relative;
    overflow: hidden;
}

.nav-links a::before {
    content: '';
    position: absolute;
    top: 0;
    right: -100%;
    width: 100%;
    height: 100%;
    background: rgba(255,255,255,0.1);
    transition: right 0.3s ease;
}

.nav-links a:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(5px);
}

.nav-links a:hover::before { right: 100%; }

/* الرابط النشط (Vue Router يضيف كلاس active) */
.nav-links a.active {
    background: rgba(255, 255, 255, 0.2);
    border-left: 4px solid #f39c12;
    transform: translateX(8px);
}

.nav-links a i {
    font-size: 22px;
    min-width: 27px;
    text-align: center;
}

/* Overlay */
.overlay {
  position: fixed;
  top: 70px;
  right: 0;
  width: 100%;
  height: calc(100vh - 70px);
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  transition: 0.3s ease;
  z-index: 1008;
}

.overlay.active {
  opacity: 1;
  visibility: visible;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 1; }
}

/* Dark Mode Styles - Cleaned Up */
:global(body.dark) .sidebar {
    background: var(--dark-surface) !important;
    color: var(--dark-text-primary) !important;
    border-right: 1px solid var(--dark-border) !important;
}

:global(body.dark) .sidebar-header {
    background: transparent !important;
    border-bottom: 1px solid var(--dark-border) !important;
}

:global(body.dark) .user-box {
    background: rgba(255,255,255,0.05) !important;
    border-color: var(--dark-border) !important;
}

:global(body.dark) .user-box:hover {
    background: rgba(255,255,255,0.08) !important;
}

:global(body.dark) .user-data-container {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: var(--dark-border) !important;
}

:global(body.dark) .user-data-container:hover {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: var(--dark-accent) !important;
}

:global(body.dark) .user-name {
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .user-email {
    color: var(--dark-text-secondary) !important;
}

:global(body.dark) .user-id {
    background: rgba(255,255,255,0.1) !important;
    color: var(--dark-text-muted) !important;
}

:global(body.dark) .subscription-container {
    background: rgba(0, 121, 101, 0.2) !important;
    border-color: var(--dark-accent) !important;
}

:global(body.dark) .subscription-container:hover {
    background: rgba(0, 121, 101, 0.3) !important;
    border-color: var(--dark-accent-hover) !important;
}

:global(body.dark) .subscription-title {
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .subscription-days-simple {
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .subscription-days-simple i {
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .logout-container {
    background: rgba(220, 53, 69, 0.1) !important;
    border-color: var(--dark-border) !important;
}

:global(body.dark) .logout-container:hover {
    background: rgba(220, 53, 69, 0.2) !important;
    border-color: var(--dark-danger) !important;
}

:global(body.dark) .dark-mode-toggle {
    background: rgba(52, 152, 219, 0.6) !important;
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .dark-mode-toggle:hover {
    background: rgba(52, 152, 219, 0.8) !important;
}

:global(body.dark) .logout-btn {
    background: var(--dark-danger) !important;
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .logout-btn:hover {
    background: #c82333 !important;
}

:global(body.dark) .nav-links a {
    color: var(--dark-text-primary) !important;
}

:global(body.dark) .nav-links a:hover,
:global(body.dark) .nav-links a.active {
    background: rgba(0,200,150,0.2) !important;
    border-left-color: var(--dark-accent) !important;
}

:global(body.dark) .nav-links a::before {
    background: rgba(255,255,255,0.1) !important;
}

:global(body.dark) .overlay {
    background: rgba(0, 0, 0, 0.6) !important;
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    right: -290px;
  }
  .sidebar.active { right: 0; }
  
  .overlay {
    top: 70px;
    height: calc(100vh - 70px);
  }
}

@media (max-width: 768px) {
    .sidebar { top: 70px; height: calc(100vh - 70px); }
    .overlay { top: 70px; height: calc(100vh - 70px); }
}

@media (max-width: 480px) {
    .sidebar {
      width: 100vw;
      right: -100vw;
      top: 70px;
      height: calc(100vh - 70px);
      border-radius: 0;
    }
    .sidebar.active { right: 0; }
    
    .overlay {
      top: 70px;
      height: calc(100vh - 70px);
    }
}
</style>