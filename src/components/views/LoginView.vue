<template>
  <div class="login-wrapper" :class="{ 'loading': store.isLoading }">
    
    <div id="alert-container" class="alert-container"></div>

    <div class="login-page">
      <div class="login-container">
        
        <div class="login-card">
          
          <div class="animated-bg"></div>
          
          <div class="logo-container">
            <img src="/logo-momkn.png" alt="شعار التطبيق" class="logo-img" />
            <h1 class="app-name">CollectPro</h1>
            <p class="subtitle">نظام إدارة التحصيلات المتقدم</p>
          </div>

          <div class="btn-container">
            <button
              class="google-login-btn"
              :class="{ 'is-loading': store.isLoading }"
              :disabled="store.isLoading"
              @click="store.loginWithGoogle"
            >
              <template v-if="store.isLoading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>جاري التوجيه...</span>
              </template>

              <template v-else>
                <i class="fab fa-google"></i>
                <span>تسجيل الدخول باستخدام Google</span>
              </template>
            </button>
          </div>

          <p class="privacy-policy">
            بالتسجيل، أنت توافق على <a href="#">سياسة الخصوصية</a> و <a href="#">شروط الاستخدام</a>.
          </p>

          <hr class="privacy-divider">

          <div class="install-section-wrapper">
            <transition name="fade" mode="out-in">
              <div v-if="showInstallButton" class="install-app-section" key="install-btn">
                <button class="install-app-btn" @click="installApp">
                  <div class="install-app-icon">
                    <img src="/favicon.svg" alt="شعار التطبيق" />
                  </div>
                  
                  <div class="install-btn-content">
                    <span class="install-btn-title">تثبيت التطبيق</span>
                    <span class="install-btn-subtitle">احصل على تجربة أفضل</span>
                  </div>
                  
                  <div class="download-icon">
                    <i class="fas fa-download"></i>
                  </div>
                </button>
              </div>

              <div v-else-if="isInstallSuccess" class="install-feedback" key="install-feedback">
                <div class="feedback-content">
                  <i class="fas fa-circle-notch fa-spin text-orange"></i>
                  <span class="pulse-text"> جاري تثبيت التطبيق...</span>
                </div>
              </div>

              <div v-else class="app-installed-card" key="installed-card">
                <div class="status-icon">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <div class="status-content">
                  <span class="status-title">نسخة الهاتف مثبتة</span>
                  <span class="status-sub">استمتع بتطبيق تحصيل احترافى - باتصال آمن </span>
                </div>
                <div class="status-check">
                  <i class="fas fa-check-circle"></i>
                </div>
              </div>
            </transition>
          </div>

          <div class="footer-info">
            <div class="footer-controls">
              <button class="footer-action-btn" title="نشر التطبيق" @click="handleShare">
                <i class="fas fa-share-alt"></i>
              </button>
              <button class="footer-action-btn" title="تحديث البيانات" @click="handleRefresh">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
              </button>
              <button class="footer-action-btn" title="تبديل الوضع الليلي" @click="toggleDarkMode">
                <i class="fas" :class="settingsStore.darkMode ? 'fa-sun' : 'fa-moon'"></i>
              </button>
            </div>
            
            <p class="copyright">© <span id="year">{{ currentYear }}</span> جميع الحقوق محفوظة.</p>
            <p class="developer-info">
              تم التصميم والتطوير بواسطة | <strong class="developer-name">أيمن حافظ</strong> 💻
              <span class="footer-separator">|</span>
              <span class="version-badge">v{{ currentAppVersion }}</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, inject } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import logger from '@/utils/logger.js'
import localforage from 'localforage';

const store = useAuthStore();
const settingsStore = useSettingsStore();
const currentYear = ref(new Date().getFullYear());
const showInstallButton = ref(false);
const isInstallSuccess = ref(false); 
const isRefreshing = ref(false);
const currentAppVersion = ref(__APP_VERSION__);

const { confirm, addNotification } = inject('notifications');

onMounted(() => {
  store.initializeAuth();
  handleInstallPromptLogic();
  
  document.body.style.minWidth = 'auto';
  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
});

onUnmounted(() => {
  document.body.style.minWidth = '';
  document.documentElement.style.overflowX = '';
  document.body.style.overflowX = '';
});

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
};

/**
 * وظيفة التحديث الموحدة (نفس منطق السايدبار)
 */
const handleRefresh = async () => {
  const result = await confirm({
    title: 'تحديث وتحسين النظام',
    text: 'هل تود مزامنة البيانات وتنظيف المؤقتات لتحسين أداء التطبيق؟ (لن تفقد بياناتك المسجلة)',
    icon: 'info',
    confirmButtonText: 'تحديث الآن',
    confirmButtonColor: 'var(--primary)'
  });

  if (result.isConfirmed) {
    isRefreshing.value = true;
    try {
      // 1. التحقق من الإصدار
      const oldVersion = localStorage.getItem('app_version');
      const currentVersion = __APP_VERSION__;
      const hasNewUpdate = oldVersion && oldVersion !== currentVersion;

      // 2. أخذ نسخة احتياطية (Backup)
      const backup = {
        localStorage: {},
        indexedDB: {}
      };

      // -- نسخ مفاتيح localStorage الأساسية
      const lsKeys = ['clientData', 'masterLimit', 'extraLimit', 'currentBalance', 'moneyCountersData', 'app_settings_v1'];
      lsKeys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) backup.localStorage[key] = val;
      });

      // -- الحفاظ على جلسة الدخول
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth-token')) backup.localStorage[key] = localStorage.getItem(key);
      });

      // -- نسخ بيانات IndexedDB (الأرشيف والتحصيلات)
      const idbKeys = await localforage.keys();
      for (const key of idbKeys) {
        if (key.startsWith('arch_data_') || key === 'harvest_rows') {
          backup.indexedDB[key] = await localforage.getItem(key);
        }
      }

      // 3. تنظيف شامل (Clear)
      localStorage.clear();
      await localforage.clear();
      
      // مسح الـ Service Worker والكاش البرمجي أيضاً لضمان ملفات جديدة
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) await reg.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      }

      // 4. استعادة البيانات (Restore)
      Object.entries(backup.localStorage).forEach(([key, val]) => localStorage.setItem(key, val));
      for (const [key, val] of Object.entries(backup.indexedDB)) {
        await localforage.setItem(key, val);
      }
      
      // تحديث رقم الإصدار
      localStorage.setItem('app_version', currentVersion);

      // 5. الإشعارات
      if (hasNewUpdate) {
        addNotification(`تمت الترقية بنجاح إلى الإصدار رقم ${currentVersion} 🚀`, 'success');
        await new Promise(r => setTimeout(r, 1500));
        addNotification('تم تحديث الملفات وتنظيف الكاش بنجاح ✅', 'success');
      } else {
        addNotification('أنت تستخدم أحدث إصدار من التطبيق بالفعل ✅', 'info');
      }

      // 6. إعادة تحميل الصفحة
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      logger.error('Login Refresh Error:', err);
      addNotification('حدث خطأ أثناء محاولة التحديث', 'error');
    } finally {
      isRefreshing.value = false;
    }
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

const handleInstallPromptLogic = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    showInstallButton.value = false;
    return;
  }

  if (window.deferredPrompt) {
    showInstallButton.value = true;
    return;
  }

  const handleInstallPrompt = (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    showInstallButton.value = true;
    window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  };

  window.addEventListener('beforeinstallprompt', handleInstallPrompt);

  setTimeout(() => {
    if (!showInstallButton.value && !window.deferredPrompt) {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    }
  }, 3000);
};

const installApp = async () => {
  if (!window.deferredPrompt) return;
  
  try {
    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    
    window.deferredPrompt = null;
    showInstallButton.value = false;
    
    if (outcome === 'accepted') {
        logger.info('User accepted the install prompt');
        isInstallSuccess.value = true; 
    } else {
        logger.info('User dismissed the install prompt');
        isInstallSuccess.value = false; 
    }
  } catch (error) {
    logger.error('LoginView: Error during app installation:', error);
    window.deferredPrompt = null;
    showInstallButton.value = false;
    isInstallSuccess.value = false;
  }
};
</script>

<style scoped>
/* =========================================
   1. التخطيط العام والخلفيات
   ========================================= */
.login-wrapper {
  background: linear-gradient(135deg, var(--gray-100) 0%, var(--gray-200) 100%);
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  font-family: var(--font-family-sans);
  direction: rtl;
  overflow-x: hidden;
  position: relative;
}

/* ============================
   تعديل الخلفية المتحركة
   ============================ */
.animated-bg {
  content: '';
  position: absolute; /* داخل الكارد */
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  /* تدرجات ألوان حديثة ومتباينة (تدرجات الرمادى والكريمى) */
  background: conic-gradient(
    from 0deg at 50% 50%,
    rgba(189, 189, 189, 0.08) 0deg,   /* رمادى فاتح جداً */
    rgba(255, 253, 231, 0.1) 60deg,  /* كريمى ناعم */
    rgba(158, 158, 158, 0.05) 120deg, /* رمادى متوسط */
    rgba(255, 248, 225, 0.12) 180deg, /* كريمى دافئ */
    rgba(224, 224, 224, 0.06) 240deg, /* رمادى لؤلؤى */
    rgba(255, 255, 240, 0.08) 300deg  /* أبيض كريمى */
  );
  z-index: 0; /* تحت المحتوى */
  animation: rotate 20s linear infinite; /* إبطاء الحركة قليلاً لتناسب الألوان الهادئة */
  pointer-events: none;
}

.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  z-index: 1;
}

.login-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center; 
  width: 100%;
  padding: 15px; 
}

.login-card {
  background: var(--surface-bg);
  border-radius: 32px; 
  box-shadow: var(--shadow-lg);
  padding: 40px; 
  width: 100%;
  max-width: 768px;
  text-align: center;
  position: relative;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: var(--transition);
  min-height: calc(100vh - 30px); 
  /* إضافة overflow: hidden لضمان أن الخلفية لا تتعدى حدود الكارد */
  overflow: hidden; 
}

/* ضمان ظهور المحتوى فوق الخلفية المتحركة */
.logo-container, .btn-container, .footer-info, .install-section-wrapper, .privacy-policy, .privacy-divider {
  position: relative;
  z-index: 1;
}

/* =========================================
   2. الشعار والعناوين
   ========================================= */
.logo-container {
  margin-bottom: 30px;
  width: 100%;
  /* رفع الشعار والنصوص لأعلى درجتين (20px) */
  transform: translateY(-20px);
}

.logo-img {
  height: 90px;
  width: auto;
  margin-bottom: 25px;
  filter: drop-shadow(0 5px 15px rgba(var(--primary-rgb), 0.2));
  display: block;
  margin-left: auto;
  margin-right: auto;
  /* تكبير الشعار درجة واحدة (10%) */
  transform: scale(1.1);
}

.app-name {
  font-size: 34px;
  font-weight: 800;
  color: var(--primary);
  margin: 0 0 15px;
  letter-spacing: -0.5px;
  position: relative; 
  display: inline-block;
}

.app-name::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 10%;
  width: 80%;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  border-radius: 3px;
}

.subtitle {
  color: var(--gray-600);
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}

/* =========================================
   3. أزرار تسجيل الدخول
   ========================================= */
.btn-container {
  width: 100%;
  margin: 25px 0 15px;
}

.google-login-btn {
  /* تقليل العرض درجتين (85%) وتوسيطه */
  width: 85%;
  margin: 0 auto;
  /* زيادة الارتفاع درجة (22px padding) */
  padding: 22px 20px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.google-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.google-login-btn i {
  font-size: 22px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

/* =========================================
   4. الروابط والفواصل
   ========================================= */
.privacy-policy {
  margin-top: 15px;
  font-size: 13px;
  color: var(--gray-500);
}

.privacy-policy a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.privacy-divider {
  display: block;
  width: 85%; 
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(var(--primary-rgb), 0.2) 10%, 
    rgba(var(--primary-rgb), 0.6) 30%, 
    rgba(var(--primary-rgb), 0.8) 50%, 
    rgba(var(--primary-rgb), 0.6) 70%, 
    rgba(var(--primary-rgb), 0.2) 90%, 
    transparent 100%
  );
  border: none;
  margin: 30px auto;
  border-radius: 2px;
  position: relative;
  box-shadow: 0 1px 3px rgba(var(--primary-rgb), 0.2);
}

.privacy-divider::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(var(--primary-rgb), 0.1) 20%, 
    rgba(var(--primary-rgb), 0.15) 50%, 
    rgba(var(--primary-rgb), 0.1) 80%, 
    transparent 100%
  );
  filter: blur(2px);
  border-radius: 2px;
}

/* =========================================
   5. زر التثبيت والحالات
   ========================================= */
.install-section-wrapper {
  width: 100%;
  min-height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.install-app-section {
  width: 100%;
  display: flex;
  justify-content: center;
}

.install-app-btn {
  width: 100%;
  max-width: 320px;
  height: 80px;
  background: var(--gray-100);
  border: 1px solid var(--gray-300);
  border-radius: 16px;
  padding: 0 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between; 
  gap: 15px;
  transition: all 0.2s ease;
}

.install-app-btn:hover {
  background: var(--gray-200);
  border-color: var(--gray-400);
}

.install-app-icon {
  width: 44px;
  height: 44px;
  background: var(--surface-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.install-app-icon img { 
  width: 28px; 
  height: 28px; 
  animation: pulse-logo 2s infinite ease-in-out;
}

@keyframes pulse-logo {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}

.install-btn-content {
  flex: 1;
  text-align: center; 
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.install-btn-title { font-size: 15px; font-weight: 700; color: var(--gray-900); }
.install-btn-subtitle { font-size: 12px; color: var(--gray-600); }

.download-icon { 
  color: var(--primary); 
  font-size: 18px; 
  flex-shrink: 0;
}

.app-installed-card {
  width: 100%;
  max-width: 320px;
  height: 80px;
  background: rgba(var(--primary-rgb), 0.05);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.status-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.status-content {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.status-title { font-size: 14px; font-weight: 800; color: var(--primary); }
.status-sub { font-size: 11px; color: var(--text-muted); }
.status-check { color: var(--primary); font-size: 18px; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* =========================================
   6. الفوتر والتحكم
   ========================================= */
.footer-info {
  margin-top: 30px;
  font-size: 12px;
  color: var(--gray-500);
  width: 100%;
  /* تحريك الفوتر لأسفل درجتين (20px) */
  transform: translateY(40px);
}

.footer-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.footer-action-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--gray-100);
  color: var(--gray-600);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.footer-action-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-2px);
}

.developer-name { color: var(--gray-700); font-weight: 700; }

.version-badge {
  background: var(--primary-light);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  margin-left: 5px;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-container { 
    padding: 10px; 
    align-items: center; 
  }
  .login-card { 
    padding: 40px 20px; 
    max-width: 100%; 
    border-radius: 32px; /* Stay curvy on mobile */
    border: 1px solid var(--border-color);
    min-height: calc(100vh - 20px);
  }
  .logo-img { height: 85px; margin-bottom: 20px; }
  .logo-container { margin-bottom: 20px; }
  .app-name { font-size: 32px; }
  .subtitle { font-size: 15px; }
  .btn-container { margin: 25px 0 15px; }
  .google-login-btn { padding: 22px 20px; border-radius: 16px; width: 90%; }
  .privacy-divider { margin: 25px auto; }
  .footer-info { margin-top: 25px; }
  .footer-controls { margin-bottom: 18px; gap: 12px; }
}
</style>