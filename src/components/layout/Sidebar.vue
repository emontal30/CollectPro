<template>
  <div
    class="overlay"
    :class="{ active: store.isOpen }"
    @click="store.closeSidebar"
  ></div>

  <div id="sidebar" class="sidebar" :class="{ active: store.isOpen }">

    <div class="sidebar-header">
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
              <div class="id-content-wrapper">
                 <span id="user-id" class="user-id" title="كود المشاركة">
                   UID: {{ authStore.user?.userCode || authStore.user?.id?.slice(0,8) || '---' }}
                 </span>
              </div>
              <button @click="copyUserId" class="copy-id-btn" title="نسخ الكود فقط">
                <i class="fas fa-copy"></i>
              </button>
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

    <div class="sidebar-footer">
      
        <!-- WhatsApp join block: opens group link in new tab -->
        <div class="whatsapp-join" aria-hidden="false">
          <a :href="whatsappLink" target="_blank" rel="noopener" class="whatsapp-link" @click="store.closeSidebar" aria-label="انضم ليصلك كل جديد عبر واتساب">
            <span class="whatsapp-badge"><i class="fab fa-whatsapp"></i></span>
            <span class="whatsapp-text">انضم ليصلك كل جديد</span>
          </a>
        </div>

      <div class="footer-actions-row">
        <button 
          class="sidebar-action-btn" 
          title="نشر التطبيق"
          @click="handleShare"
        >
          <i class="fas fa-share-alt"></i>
        </button>
        <button 
          class="sidebar-action-btn" 
          title="تحدث البيانات"
          @click="handleRefreshData"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
        </button>
        <button 
          class="sidebar-action-btn dark-mode-toggle-btn" 
          title="تبديل الوضع الليلي"
          @click="toggleDarkMode"
        >
          <i v-if="isDarkMode" class="fas fa-sun sun-icon"></i>
          <i v-else class="fas fa-moon moon-icon"></i>
        </button>
      </div>

      <div class="footer-divider"></div>

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
        <h4 class="subscription-title">حالة الاشتراك:</h4>
        <div class="subscription-info-box" :class="subStore.ui.class">
          <div class="subscription-main-row">
              <i class="fas status-icon" :class="subStore.ui.icon"></i>
              <span class="status-text">{{ subStore.ui.statusText }}</span>
          </div>
          <div class="subscription-details-row">
              <span class="details-text">
                {{ subStore.ui.detailsPrefix }}
                <span v-if="subStore.ui.days !== null" class="days-number">{{ subStore.ui.days }}</span>
                {{ subStore.ui.detailsSuffix }}
              </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import logger from '@/utils/logger.js';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { useArchiveStore } from '@/stores/archiveStore';
import { useHarvestStore } from '@/stores/harvest';
import cacheManager from '@/services/cacheManager';
import { supabase } from '@/supabase';
import localforage from 'localforage';

const store = useSidebarStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const subStore = useMySubscriptionStore();
const archiveStore = useArchiveStore();
const harvestStore = useHarvestStore();
const router = useRouter();

const { confirm, addNotification } = inject('notifications');

const copyUserId = async () => {
  const codeToCopy = authStore.user?.userCode || authStore.user?.id;
  
  if (!codeToCopy) return;
  
  try {
    await navigator.clipboard.writeText(codeToCopy);
    addNotification(`تم نسخ الكود بنجاح: ${codeToCopy}`, 'success');
  } catch (err) {
    logger.error('Failed to copy user ID:', err);
    addNotification('فشل نسخ المعرف', 'error');
  }
};

const isDarkMode = computed(() => settingsStore.darkMode);
const isRefreshing = ref(false);
const isEnforced = ref(false); 
// رابط مجموعة واتساب للانضمام
const whatsappLink = 'https://chat.whatsapp.com/GuITuDz0xmJKHqKJ5QstDu';

// تم التحديث: إضافة رابط صفحة المشاركة
const navLinks = [
  { to: '/app/dashboard', label: 'إدخال البيانات', icon: 'fas fa-tachometer-alt', protected: true },
  { to: '/app/harvest', label: 'التحصيلات', icon: 'fas fa-donate', protected: true },
  { to: '/app/archive', label: 'الأرشيف', icon: 'fas fa-archive', protected: true },
  { to: '/app/itinerary', label: 'خط السير', icon: 'fas fa-map-marked-alt', protected: true },
  { to: '/app/share', label: 'مشاركة التحصيل', icon: 'fas fa-users', protected: true }, // رابط جديد
  { to: '/app/counter', label: 'عداد الأموال', icon: 'fas fa-calculator', protected: true },
  { to: '/app/subscriptions', label: 'الاشتراكات', icon: 'fas fa-credit-card', protected: false },
  { to: '/app/my-subscription', label: 'اشتراكي', icon: 'fas fa-user-shield', protected: false },
];

const isLocked = (link) => {
    return link.protected && isEnforced.value && !subStore.isSubscribed && !authStore.isAdmin;
};

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
};

const checkEnforcementStatus = async () => {
    try {
        const cached = localStorage.getItem('sys_config_enforce');
        if (cached !== null) isEnforced.value = cached === 'true';
        
        const { data } = await supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle();
        if (data) {
            isEnforced.value = data.value === true || data.value === 'true';
            localStorage.setItem('sys_config_enforce', String(isEnforced.value));
        }
    } catch (e) {
        logger.error('Failed to check enforcement status');
    }
};

const handleShare = async () => {
  const shareData = {
    title: 'Collect Pro',
    text: 'نظام إدارة التحصيلات المتقدم - تطبيق احترافي لإدارة أعمالك بكل سهولة.',
    url: window.location.origin
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.origin);
      addNotification('تم نسخ رابط التطبيق بنجاح', 'success');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      addNotification('فشل في نشر التطبيق', 'error');
    }
  }
};

/**
 * وظيفة تحديث البيانات والتحقق من الإصدار وتنظيف الكاش
 */
const handleRefreshData = async () => {
  store.closeSidebar();
  
  const result = await confirm({
    title: 'تحديث وتحسين النظام',
    text: 'هل تود تحديث التطبيق ومزامنه البيانات وتحسين الأداء؟ (لن تفقد بياناتك المسجلة)',
    icon: 'info',
    confirmButtonText: 'تحديث الآن',
    confirmButtonColor: 'var(--primary)'
  });

  if (result.isConfirmed) {
    isRefreshing.value = true;
    try {
      const oldVersion = localStorage.getItem('app_version');
      const currentVersion = __APP_VERSION__;
      const hasNewUpdate = oldVersion && oldVersion !== currentVersion;
      const backup = { localStorage: {}, indexedDB: {} };
      const lsKeys = ['clientData', 'masterLimit', 'extraLimit', 'currentBalance', 'moneyCountersData', 'app_settings_v1'];
      lsKeys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) backup.localStorage[key] = val;
      });
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth-token')) backup.localStorage[key] = localStorage.getItem(key);
      });
      const idbKeys = await localforage.keys();
      for (const key of idbKeys) {
        if (key.startsWith('arch_data_') || key === 'harvest_rows') {
          backup.indexedDB[key] = await localforage.getItem(key);
        }
      }
      localStorage.clear();
      await localforage.clear();
      Object.entries(backup.localStorage).forEach(([key, val]) => localStorage.setItem(key, val));
      for (const [key, val] of Object.entries(backup.indexedDB)) {
        await localforage.setItem(key, val);
      }
      localStorage.setItem('app_version', currentVersion);
      await subStore.forceRefresh(authStore.user);
      await checkEnforcementStatus();
      await archiveStore.loadAvailableDates();
      if (hasNewUpdate) {
        addNotification(`تمت الترقية بنجاح إلى الإصدار رقم ${currentVersion} 🚀`, 'success');
        await new Promise(r => setTimeout(r, 1500));
        addNotification('تم تحديث البيانات بنجاح ✅', 'success');
      } else {
        addNotification('أنت تستخدم أحدث إصدار بالفعل ✅', 'info');
      }
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (e) {
      addNotification('حدث خطأ أثناء محاولة التحديث', 'error');
    } finally {
      isRefreshing.value = false;
    }
  }
};

// --- Offline Sync Logic ---
async function processLocationQueue() {
  const queue = await localforage.getItem('pending_locations_queue') || [];
  if (queue.length === 0) return;

  addNotification(`Syncing ${queue.length} pending location updates...`, 'info');

  const { error } = await supabase.from('client_routes').upsert(queue, { onConflict: 'user_id, shop_code' });

  if (error) {
    addNotification('Failed to sync some locations.', 'error');
    console.error('Supabase sync error:', error);
    await localforage.removeItem('pending_locations_queue');
  } else {
    addNotification('Offline locations synced successfully!', 'success');
    await localforage.removeItem('pending_locations_queue');
  }
}

onMounted(async () => {
  await checkEnforcementStatus();
  if (authStore.user) { await subStore.init(authStore.user); }

  window.addEventListener('online', processLocationQueue);
  if (navigator.onLine) {
    processLocationQueue();
  }
});

const handleLogout = async () => {
  store.closeSidebar();
  const result = await confirm({
    title: 'تأكيد تسجيل الخروج',
    text: 'هل أنت متأكد من تسجيل الخروج؟',
    icon: 'question',
    confirmButtonText: 'تسجيل الخروج',
    confirmButtonColor: '#dc3545'
  });
  if (!result.isConfirmed) return;
  try {
    const success = await authStore.logout();
    if (success) { router.push('/'); }
  } catch (error) {
    addNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
  }
};
</script>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--primary, #007965);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;
    z-index: 2000;
    overflow-y: auto;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    visibility: hidden;
    pointer-events: none;
    will-change: transform;
}

.sidebar::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.sidebar.active {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

.locked-link { opacity: 0.6; }
.lock-icon-mini { margin-right: auto; font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); animation: lockShake 3s infinite; }

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

/* --- تنسيقات بيانات المستخدم الجديدة لضمان عدم الاختفاء --- */
.user-data-container { 
    background: rgba(255, 255, 255, 0.12); 
    border: 1px solid rgba(255, 255, 255, 0.2); 
    border-radius: 14px; 
    padding: 12px 15px; 
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
}

.user-meta {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.user-name { font-weight: 700; font-size: 1.1rem; color: #ffffff; margin-bottom: 4px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-email { font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-bottom: 10px; display: block; word-break: break-all; }

/* شريط المعرف ليكون ظاهراً وقوياً */
.user-id-row { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    gap: 8px; 
    padding: 6px 0; /* Adjust padding for the row */
}

.id-content-wrapper {
  /* Allow the UID badge to size to its content instead of stretching */
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: visible;
}

.user-id { 
  font-size: 12px; 
  color: #a7f3d0; 
  font-family: monospace; 
  font-weight: bold; 
  letter-spacing: 0.5px;
  white-space: nowrap; /* يمنع الالتفاف */
  display: inline-block; /* يحجم العرض تبعاً للنص */
  direction: rtl; /* لضمان ظهور UID على اليمين دائماً */
  text-align: right;
  overflow: visible; /* السماح للعنصر بالتوسع */
  text-overflow: clip;
    
  /* Badge styling */
  background: rgba(0, 0, 0, 0.25); /* خلفية داكنة للشريط */
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.copy-id-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0;
  margin: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0; /* يمنع الزر من الانكماش */
}
.copy-id-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: scale(1.05);
}
.copy-id-btn:active {
  transform: scale(0.95);
}
/* ------------------------------------------------ */

.sidebar-content { flex: 1; }
.sidebar-footer { margin-top: auto; padding: 15px; background: rgba(0, 0, 0, 0.08); border-top: 1px solid rgba(255, 255, 255, 0.1); }

.footer-actions-row { display: flex; justify-content: space-between; gap: 10px; }

.sidebar-action-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 40px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-size: 1.1rem;
}

/* تمييز أيقونات الوضع الليلي والنهاري بألوان محددة */
.sun-icon {
  color: #ffca28; /* لون أصفر ذهبي للشمس */
}

.moon-icon {
  color: #c7d2fe; /* لون أزرق سماوي/بنفسجي هادئ للقمر */
}

.sidebar-action-btn:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
.sidebar-action-btn:active { transform: translateY(0); }

.footer-divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 15px 0; width: 100%; }

.subscription-container { background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 12px; margin-top: 12px; }
.subscription-title { color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 600; margin: 0 0 6px 0; text-align: right; }

.subscription-info-box { display: flex; flex-direction: column; gap: 2px; }
.subscription-main-row { display: flex; align-items: center; gap: 8px; }
.status-icon { font-size: 1rem; }
.status-text { font-size: 1.1rem; font-weight: 800; color: #fff; }
.subscription-details-row { padding-right: 24px; }
.details-text { font-size: 0.8rem; font-weight: 400; color: rgba(255, 255, 255, 0.8); }
.days-number { font-weight: 900; font-size: 1rem; margin: 0 2px; }

.subscription-info-box.active .status-text, .subscription-info-box.active .days-number { color: #2ecc71; }
.subscription-info-box.warning .status-text, .subscription-info-box.warning .days-number { color: #feca57; }
.subscription-info-box.expired .status-text, .subscription-info-box.expired .days-number { color: #ff6b6b; }
.subscription-info-box.pending .status-text, .subscription-info-box.pending .days-number { color: #3498db; }

.logout-btn { background: rgba(220, 53, 69, 0.9); border: none; border-radius: 12px; padding: 12px; color: white; font-weight: 600; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
.nav-links { list-style: none; padding: 0; }
.nav-links a { display: flex; align-items: center; gap: 15px; padding: 14px 25px; color: rgba(255, 255, 255, 0.85); text-decoration: none; }
.nav-links a.active { color: #fff; background: rgba(255, 255, 255, 0.15); font-weight: 700; }

.overlay { position: fixed; top: 0; right: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); opacity: 0; visibility: hidden; z-index: 1008; transition: opacity 0.3s ease, visibility 0.3s; }
.overlay.active { opacity: 1; visibility: visible; backdrop-filter: blur(2px); }

/* WhatsApp join block styles */
.whatsapp-join {
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px;
  border-radius:14px;
  margin-bottom:12px;
  width:100%;
  background: linear-gradient(180deg, rgba(37,211,102,0.06), rgba(0,0,0,0.06));
  border: 1px solid rgba(255,255,255,0.06);
  border-left: 4px solid #25D366; /* accent green */
  box-shadow: 0 8px 24px rgba(37,211,102,0.08);
  backdrop-filter: blur(6px);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.whatsapp-join:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(37,211,102,0.12); }
.whatsapp-link { display:flex; align-items:center; gap:12px; text-decoration:none; color: #fff; width:100%; padding-right:6px; }
.whatsapp-badge { background:#25D366; color:#fff; padding:8px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; font-size:1.05rem; min-width:40px; min-height:40px; box-shadow: 0 6px 18px rgba(37,211,102,0.12); }
.whatsapp-text { font-weight:800; color:#fff; font-size:0.98rem; margin-right:6px; letter-spacing:0.2px; }
.whatsapp-link:hover .whatsapp-badge { transform: scale(1.04); }

@media (max-width: 640px) {
  .whatsapp-text { display: none; }
  .whatsapp-join { padding: 8px; }
}
</style>