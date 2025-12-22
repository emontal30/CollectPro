<template>
  <div
    class="overlay"
    :class="{ active: store.isOpen }"
    @click="store.closeSidebar"
  ></div>

  <div id="sidebar" class="sidebar" :class="{ active: store.isOpen }">

    <div class="sidebar-header">
      <!-- App Brand Box -->
      <div class="brand-box">
        <h1 class="brand-name">Collect <span class="brand-highlight">Pro</span></h1>
        <img src="/favicon.svg" alt="Collect Pro Logo" class="brand-logo" />
      </div>

      <div class="user-box">
        <div class="user-data-container">
          <div class="user-meta">
            <span id="user-name" class="user-name">
              {{ authStore.user?.user_metadata?.full_name || authStore.user?.email?.split('@')[0] || 'مستخدم' }}
            </span>
            <span id="user-email" class="user-email">
              {{ authStore.user?.email }}
            </span>
            <div class="user-id-row">
              <span id="user-id" class="user-id">
                ID: {{ authStore.user?.id?.slice(0, 8) || '---' }}
              </span>
              <button 
                class="dark-mode-toggle-small btn--icon btn" 
                title="تبديل الوضع الليلي"
                @click="toggleDarkMode"
              >
                <i class="fas" :class="isDarkMode ? 'fa-sun' : 'fa-moon'"></i>
              </button>
            </div>
          </div>
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
        
        <li v-if="authStore.isAdmin">
          <router-link to="/app/admin" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-user-cog"></i><span>لوحة التحكم</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- تذييل الشريط الجانبي - يحتوي على زر الخروج وحالة الاشتراك -->
    <div class="sidebar-footer">
      <div class="logout-container">
        <button
          id="logout-btn"
          class="logout-btn btn btn-danger"
          type="button"
          :disabled="authStore.isLoading"
          @click.stop="handleLogout"
        >
          <i class="fas fa-sign-out-alt"></i>
          <span>{{ authStore.isLoading ? 'جاري الخروج...' : 'تسجيل الخروج' }}</span>
        </button>
      </div>

      <div class="subscription-container">
        <h4 class="subscription-title">
          حالة الاشتراك: {{ subStore.planName }}
        </h4>
        <div class="subscription-info">
          <div
            class="subscription-days-simple"
            :class="subStore.ui.class"
          >
            <i class="fas" :class="subStore.ui.icon"></i>
            <span id="days-left">
              {{ subStore.ui.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, inject, onMounted } from 'vue';
import logger from '@/utils/logger.js';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';

const store = useSidebarStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const subStore = useMySubscriptionStore();

const { confirm, addNotification } = inject('notifications');

const isDarkMode = computed(() => settingsStore.darkMode);

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
};

onMounted(async () => {
  if (authStore.user) {
    await subStore.init(authStore.user);
  }
});

const handleLogout = async () => {
  const result = await confirm({
    title: 'تأكيد تسجيل الخروج',
    text: 'هل أنت متأكد من تسجيل الخروج من حسابك؟',
    icon: 'question',
    confirmButtonText: 'تسجيل الخروج',
    confirmButtonColor: '#dc3545'
  });

  if (!result.isConfirmed) return;

  try {
    await authStore.logout();
  } catch (error) {
    logger.error('Logout failed:', error);
    addNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
  }
};
</script>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    right: calc(var(--sidebar-width) * -1); /* استخدام المتغير للعرض المخفي */
    width: var(--sidebar-width); /* استخدام المتغير الموحد */
    height: 100vh;
    background: var(--primary, #007965);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1009;
    overflow-y: auto;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
}

.sidebar.active {
  right: 0;
}

.sidebar-header {
    padding: 0 10px;
    margin-bottom: 15px;
}

/* App Brand Box Styles */
.brand-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  /* ظل أصفر كناري خفيف جداً يحدد الأطراف فقط دون توهج عالي */
  filter: drop-shadow(0 0 2px rgba(255, 239, 0, 0.5));
  transition: transform 0.3s ease, filter 0.3s ease;
}

.brand-box:hover .brand-logo {
  transform: scale(1.05);
  filter: drop-shadow(0 0 4px rgba(255, 239, 0, 0.7));
}

.brand-name {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  font-family: var(--font-family-sans);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.brand-highlight {
  color: #2dd4bf;
}

.user-box {
    padding: 5px;
}

.user-data-container {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  padding: 12px 15px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.user-name {
    font-weight: 700;
    font-size: 1.1rem;
    color: #ffffff;
    margin-bottom: 4px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-email {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.8);
    margin-bottom: 8px;
    display: block;
    word-break: break-all;
}

.user-id {
    font-size: 10px;
    color: rgba(255,255,255,0.7);
    font-family: monospace;
    background: rgba(0,0,0,0.2);
    padding: 3px 8px;
    border-radius: 6px;
}

.user-id-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.dark-mode-toggle-small {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    width: 30px;
    height: 30px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    border-radius: 8px;
}

.sidebar-content {
    flex: 1;
}

.sidebar-footer {
    margin-top: auto;
    padding: 15px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.subscription-container {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 12px;
  margin-top: 12px;
}

.subscription-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-weight: 600;
  margin: 0 0 6px 0;
  text-align: right;
}

.subscription-days-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}

.subscription-days-simple.expired { color: #ff6b6b; }
.subscription-days-simple.warning { color: #feca57; }
.subscription-days-simple.active { color: #2ecc71; }
.subscription-days-simple.pending { color: rgba(255,255,255,0.7); }

.logout-container {
    margin-bottom: 5px;
}

.logout-btn {
  background: rgba(220, 53, 69, 0.9);
  border: none;
  border-radius: 12px;
  padding: 12px;
  color: white;
  font-weight: 600;
  width: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.nav-links { list-style: none; padding: 0; }
.nav-links a {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 14px 25px;
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
}

.nav-links a.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
    font-weight: 700;
}

.overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  z-index: 1008;
}

.overlay.active { opacity: 1; visibility: visible; }

@media (max-width: 480px) {
    .sidebar {
        width: 100%; /* العرض كامل على الشاشات الصغيرة جداً */
        right: -100%;
    }
}
</style>