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
              <!-- الحالة 1: زر التثبيت (يظهر إذا لم يكن مثبتاً) -->
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

              <!-- الحالة 2: رسالة جاري التثبيت (عند الضغط) -->
              <div v-else-if="isInstallSuccess" class="install-feedback" key="install-feedback">
                <div class="feedback-content">
                  <i class="fas fa-circle-notch fa-spin text-orange"></i>
                  <span class="pulse-text"> جاري تثبيت التطبيق...</span>
                </div>
              </div>

              <!-- الحالة 3: التطبيق مثبت بالفعل (Status Card) - هذا ما طلبته -->
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
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import logger from '@/utils/logger.js'

const store = useAuthStore();
const currentYear = ref(new Date().getFullYear());
const showInstallButton = ref(false);
const isInstallSuccess = ref(false); 

onMounted(() => {
  store.initializeAuth();
  handleInstallPromptLogic();
});

const handleInstallPromptLogic = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  // إذا كان التطبيق مثبتاً (Standalone)، المتغير showInstallButton سيكون false
  // وبالتالي سيظهر الـ v-else الأخير (app-installed-card)
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
  padding: 60px 40px;
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
   2. الشعار والعناوين
   ========================================= */
.logo-container {
  margin-bottom: 40px;
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

.app-name {
  font-size: 34px;
  font-weight: 800;
  color: var(--primary);
  margin: 0 0 10px;
  letter-spacing: -0.5px;
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
  margin: 35px 0 20px;
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
   4. الروابط والفواصل
   ========================================= */
.privacy-policy {
  margin-top: 20px;
  font-size: 13px;
  color: var(--gray-500);
}

.privacy-policy a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.privacy-divider {
  width: 100%;
  height: 1px;
  background: var(--border-color);
  border: none;
  margin: 30px 0;
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

/* --- حالة جاري التثبيت --- */
.install-feedback {
  width: 100%;
  max-width: 320px;
  height: 80px;
  background: rgba(211, 84, 0, 0.08);
  border: 1px solid #e67e22;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  box-shadow: 0 4px 15px rgba(230, 126, 34, 0.1);
}

.feedback-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #d35400;
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
}

.text-orange { color: #d35400; font-size: 1.4rem; }
.pulse-text { animation: pulse-text 2s infinite; }
@keyframes pulse-text { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }

/* --- حالة التطبيق مثبت (New Status Card) --- */
.app-installed-card {
  width: 100%;
  max-width: 320px;
  height: 80px;
  background: rgba(var(--primary-rgb), 0.05); /* أخضر فاتح جداً */
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

.status-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--primary);
}

.status-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.status-check {
  color: var(--primary);
  font-size: 18px;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* =========================================
   6. الفوتر
   ========================================= */
.footer-info {
  margin-top: 40px;
  font-size: 12px;
  color: var(--gray-500);
  width: 100%;
}

.developer-name { color: var(--gray-700); font-weight: 700; }

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .login-container {
    padding: 20px; 
    align-items: center; 
  }

  .login-card {
    border-radius: var(--border-radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    min-height: auto; 
    height: auto;
    padding: 40px 25px;
    max-width: 100%; 
    justify-content: center;
  }

  .logo-img { height: 80px; }
  .app-name { font-size: 30px; }
  
  .footer-info {
    margin-top: 30px;
    padding-top: 20px;
    padding-bottom: 0;
  }
}
</style>