<template>
  <div class="login-wrapper" :class="{ 'loading': store.isLoading }">
    <div class="animated-bg"></div>
    
    <div id="alert-container" class="alert-container"></div>

    <div class="login-page">
      <div class="login-container">
        <div class="login-card">
          
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
              <span class="version-badge">v2.2.3</span>
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
import cacheManager from '@/services/cacheManager';
import logger from '@/utils/logger.js'

const store = useAuthStore();
const settingsStore = useSettingsStore();
const currentYear = ref(new Date().getFullYear());
const showInstallButton = ref(false);
const isInstallSuccess = ref(false); 
const isRefreshing = ref(false);

const { confirm, addNotification } = inject('notifications');

onMounted(() => {
  store.initializeAuth();
  handleInstallPromptLogic();
  
  // الغاء الـ min-width الثابت في صفحة الدخول فقط لضمان التجاوب ومنع السكرول
  document.body.style.minWidth = 'auto';
  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
});

onUnmounted(() => {
  // إعادة القيم الأصلية عند مغادرة الصفحة حتى لا تتأثر باقي الصفحات
  document.body.style.minWidth = '';
  document.documentElement.style.overflowX = '';
  document.body.style.overflowX = '';
});

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode();
};

const handleRefresh = async () => {
  const result = await confirm({
    title: 'تحديث البيانات',
    text: 'هل تود تحديث ملفات التطبيق والمزامنة الآن؟',
    icon: 'info',
    confirmButtonText: 'تحديث',
    confirmButtonColor: 'var(--primary)'
  });

  if (result.isConfirmed) {
    isRefreshing.value = true;
    try {
      localStorage.removeItem('sys_config_enforce');
      if (cacheManager) await cacheManager.clearAllCaches();
      addNotification('جاري التحديث...', 'info');
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (e) {
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

.animated-bg {
  content: '';
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--primary-rgb), 0) 70%);
  z-index: 0;
  animation: rotate 30s linear infinite;
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
  padding: 20px;
}

.login-card {
  background: var(--surface-bg);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 50px 40px;
  width: 100%;
  max-width: 480px;
  text-align: center;
  position: relative;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: var(--transition);
}

/* =========================================
   2. الشعار والعناوين (تم التعديل هنا)
   ========================================= */
.logo-container {
  margin-bottom: 30px;
  width: 100%;
}

.logo-img {
  height: 90px;
  width: auto;
  margin-bottom: 25px;
  filter: drop-shadow(0 5px 15px rgba(var(--primary-rgb), 0.2));
  display: block;
  margin-left: auto;
  margin-right: auto;
}

/* === تعديل اسم التطبيق لإضافة الفاصل الأخضر === */
.app-name {
  font-size: 34px;
  font-weight: 800;
  color: var(--primary);
  margin: 0 0 15px; /* زيادة الهامش السفلي قليلاً */
  letter-spacing: -0.5px;
  position: relative; /* ضروري لتموضع الخط */
  display: inline-block;
}

/* الفاصل الأخضر أسفل كلمة CollectPro */
.app-name::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 10%;
  width: 80%;
  height: 3px;
  /* استخدمنا var(--primary) ليتناسق مع السمة، يمكنك وضع اللون #007965 مباشرة إذا أردت */
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
  width: 100%;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(var(--primary-rgb), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.google-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(var(--primary-rgb), 0.3);
}

.google-login-btn i {
  font-size: 22px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: white;
  color: #ea4335;
  flex-shrink: 0;
}

/* =========================================
   4. الروابط والفواصل (تم التعديل هنا)
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

/* === الفاصل المتقدم الجديد === */
.privacy-divider {
  display: block;
  width: 85%; /* لجعله غير ممتد للنهاية */
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

/* تأثير الوهج (Glow) فوق الفاصل */
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

/* تأثير عند مرور الماوس */
.privacy-divider:hover {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(var(--primary-rgb), 0.3) 10%, 
    rgba(var(--primary-rgb), 0.7) 30%, 
    rgba(var(--primary-rgb), 0.9) 50%, 
    rgba(var(--primary-rgb), 0.7) 70%, 
    rgba(var(--primary-rgb), 0.3) 90%, 
    transparent 100%
  );
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

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-container { 
    padding: 10px 50px; /* جعل الكارد "نحيفاً" جداً */
    align-items: center; 
  }
  .login-card { 
    padding: 55px 20px; /* جعل الكارد "طويلاً" جداً */
    max-width: 100%; 
    border-radius: 24px;
  }
  .logo-img { height: 75px; margin-bottom: 12px; }
  .logo-container { margin-bottom: 15px; }
  .app-name { font-size: 28px; }
  .subtitle { font-size: 14px; }
  .btn-container { margin: 20px 0 10px; }
  .google-login-btn { padding: 14px 15px; border-radius: 12px; }
  /* تحديث هوامش الفاصل للشاشات الصغيرة */
  .privacy-divider { margin: 20px auto; }
  .footer-info { margin-top: 20px; }
  .footer-controls { margin-bottom: 15px; gap: 10px; }
}

@media (min-width: 481px) and (max-width: 768px) {
  .login-container { padding: 20px 45px; }
  .login-card { padding: 40px 25px; }
}
</style>