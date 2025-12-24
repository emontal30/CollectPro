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
              <div class="d-flex gap-1">
                 <button 
                  class="action-btn-small btn--icon btn" 
                  title="تحديث البيانات وإصلاح المشاكل"
                  @click="handleRefreshData"
                >
                  <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
                </button>
                <button 
                  class="action-btn-small btn--icon btn" 
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
    </div>

    <div class="sidebar-content">
      <ul class="nav-links">
        <li v-for="link in navLinks" :key="link.to">
          <router-link :to="link.to" active-class="active" @click="store.closeSidebar" :class="{ 'locked-link': isLocked(link) }">
            <i :class="link.icon"></i>
            <span>{{ link.label }}</span>
            <i v-if="isLocked(link)" class="fas fa-lock lock-icon-mini"></i>
          </router-link>
        </li>
        
        <li v-if="authStore.isAdmin">
          <router-link to="/app/admin" active-class="active" @click="store.closeSidebar">
            <i class="fas fa-user-cog"></i><span>لوحة التحكم</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- تذييل الشريط الجانبي -->
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
import { computed, inject, onMounted, ref } from 'vue';
import logger from '@/utils/logger.js';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import cacheManager from '@/services/cacheManager';
import { supabase } from '@/supabase';

const store = useSidebarStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const subStore = useMySubscriptionStore();

const { confirm, addNotification } = inject('notifications');

const isDarkMode = computed(() => settingsStore.darkMode);
const isRefreshing = ref(false);
const isEnforced = ref(false); // حالة قفل النظام

const navLinks = [
  { to: '/app/dashboard', label: 'إدخال البيانات', icon: 'fas fa-tachometer-alt', protected: true },
  { to: '/app/harvest', label: 'التحصيلات', icon: 'fas fa-donate', protected: true },
  { to: '/app/archive', label: 'الأرشيف', icon: 'fas fa-archive', protected: true },
  { to: '/app/counter', label: 'عداد الأموال', icon: 'fas fa-calculator', protected: true },
  { to: '/app/subscriptions', label: 'الاشتراكات', icon: 'fas fa-credit-card', protected: false },
  { to: '/app/my-subscription', label: 'اشتراكي', icon: 'fas fa-user-shield', protected: false },
];

const isLocked = (link) => {
    // الرابط مقفل فقط إذا كان: (محمياً) وَ (النظام مغلق) وَ (المستخدم غير مشترك) وَ (ليس مديراً)
    return link.protected && isEnforced.value && !subStore.isSubscribed && !authStore.isAdmin;
};

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
};

const checkEnforcementStatus = async () => {
    try {
        const cached = localStorage.getItem('sys_config_enforce');
        if (cached !== null) isEnforced.value = cached === 'true';
        
        // تحديث من السيرفر بصمت
        const { data } = await supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle();
        if (data) {
            isEnforced.value = data.value === true || data.value === 'true';
            localStorage.setItem('sys_config_enforce', String(isEnforced.value));
        }
    } catch (e) {
        logger.error('Failed to check enforcement status');
    }
};

const handleRefreshData = async () => {
  const result = await confirm({
    title: 'تحديث ومزامنة البيانات',
    text: 'هل تود إعادة مزامنة البيانات مع السحابه؟ سيضمن هذا تحديث كافة المعلومات وحل أي مشاكل تقنية في العرض لضمان دقة بياناتك.',
    icon: 'info',
    confirmButtonText: 'تحديث الآن',
    confirmButtonColor: 'var(--primary)'
  });

  if (result.isConfirmed) {
    isRefreshing.value = true;
    try {
      localStorage.removeItem('my_subscription_data_v2');
      localStorage.removeItem('sys_config_enforce'); // مسح حالة القفل أيضاً للتجديد
      if (cacheManager) await cacheManager.clearAllCaches();
      addNotification('جاري مزامنة وتحديث التطبيق...', 'info');
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (e) {
      isRefreshing.value = false;
    }
  }
};

onMounted(async () => {
  await checkEnforcementStatus();
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
    addNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
  }
};
</script>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    right: calc(var(--sidebar-width) * -1);
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--primary, #007965);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2000;
    overflow-y: auto;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    visibility: hidden;
    pointer-events: none;
}

.sidebar.active {
  right: 0;
  visibility: visible;
  pointer-events: auto;
}

/* Locked Link Style */
.locked-link {
    opacity: 0.6;
}
.lock-icon-mini {
    margin-right: auto; /* دفع القفل لليسار (أقصى اليسار في العربي) */
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    animation: lockShake 3s infinite;
}

@keyframes lockShake {
    0%, 90%, 100% { transform: rotate(0); }
    92% { transform: rotate(10deg); }
    94% { transform: rotate(-10deg); }
    96% { transform: rotate(10deg); }
    98% { transform: rotate(-10deg); }
}

.sidebar-header { padding: 0 10px; margin-bottom: 15px; }
.brand-box { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px 0; margin-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.brand-logo { width: 32px; height: 32px; object-fit: contain; filter: drop-shadow(0 0 2px rgba(255, 239, 0, 0.5)); transition: transform 0.3s ease; }
.brand-name { font-size: 1.4rem; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.5px; }
.brand-highlight { color: #2dd4bf; }
.user-data-container { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 14px; padding: 12px 15px; margin-bottom: 12px; }
.user-name { font-weight: 700; font-size: 1.1rem; color: #ffffff; margin-bottom: 4px; display: block; overflow: hidden; text-overflow: ellipsis; }
.user-email { font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-bottom: 8px; display: block; word-break: break-all; }
.user-id { font-size: 10px; color: rgba(255,255,255,0.7); font-family: monospace; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 6px; }
.user-id-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.action-btn-small { background: rgba(255, 255, 255, 0.2); border: none; width: 30px; height: 30px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.2s; }
.action-btn-small:hover { background: rgba(255, 255, 255, 0.3); }
.d-flex { display: flex; }
.gap-1 { gap: 4px; }

.sidebar-content { flex: 1; }
.sidebar-footer { margin-top: auto; padding: 15px; background: rgba(0, 0, 0, 0.05); border-top: 1px solid rgba(255, 255, 255, 0.1); }
.subscription-container { background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 12px; margin-top: 12px; }
.subscription-title { color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 600; margin: 0 0 6px 0; text-align: right; }
.subscription-days-simple { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; color: #ffffff; }
.subscription-days-simple.expired { color: #ff6b6b; }
.subscription-days-simple.warning { color: #feca57; }
.subscription-days-simple.active { color: #2ecc71; }
.logout-btn { background: rgba(220, 53, 69, 0.9); border: none; border-radius: 12px; padding: 12px; color: white; font-weight: 600; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
.nav-links { list-style: none; padding: 0; }
.nav-links a { display: flex; align-items: center; gap: 15px; padding: 14px 25px; color: rgba(255, 255, 255, 0.85); text-decoration: none; }
.nav-links a.active { color: #fff; background: rgba(255, 255, 255, 0.15); font-weight: 700; }
.overlay { position: fixed; top: 0; right: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); opacity: 0; visibility: hidden; z-index: 1008; transition: opacity 0.3s ease; }
.overlay.active { opacity: 1; visibility: visible; }
</style>