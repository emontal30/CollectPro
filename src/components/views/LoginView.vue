<template>
  <div class="login-wrapper" :class="{ 'loading': store.isLoading }">
    <!-- خلفية متحركة (اختياري) -->
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
              class="google-login-btn btn btn-primary" 
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

          <div v-if="showInstallButton" class="install-app-section">
            <button class="install-app-btn btn btn-primary" @click="installApp">
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

          <div class="footer-info">
            <p class="copyright">© <span id="year">{{ currentYear }}</span> جميع الحقوق محفوظة.</p>
            <p class="developer-info">
              تم التصميم والتطوير بواسطة | <strong class="developer-name">أيمن حافظ</strong> 💻
              <span class="footer-separator">|</span>
              <span class="version-badge">v2.2.7</span>
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

onMounted(() => {
  store.initializeAuth();
  handleInstallPromptLogic();
});

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
  } catch (error) {
    logger.error('LoginView: Error during app installation:', error);
    window.deferredPrompt = null;
    showInstallButton.value = false;
  }
};
</script>

<style scoped>
/* =========================================
   1. التخطيط العام والخلفيات
   ========================================= */
.login-wrapper {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  min-height: 100dvh; /* لدعم الهواتف الحديثة */
  width: 100%;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
  overflow-x: hidden;
  position: relative;
}

/* خلفية متحركة تحسين الأداء */
.animated-bg {
  content: '';
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 121, 101, 0.05) 0%, rgba(0, 121, 101, 0) 70%);
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
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
  padding: 60px 40px;
  width: 100%;
  max-width: 480px;
  text-align: center;
  position: relative;
  border: 1px solid rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
  filter: drop-shadow(0 5px 15px rgba(0, 121, 101, 0.2));
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.app-name {
  font-size: 34px;
  font-weight: 800;
  color: var(--primary, #007965);
  margin: 0 0 10px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #64748b;
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
  background: linear-gradient(135deg, #007965 0%, #00a080 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(0, 121, 101, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.google-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(0, 121, 101, 0.3);
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
  color: #94a3b8;
}

.privacy-policy a {
  color: var(--primary, #007965);
  text-decoration: none;
  font-weight: 600;
}

.privacy-divider {
  width: 100%;
  height: 1px;
  background: #f1f5f9;
  border: none;
  margin: 30px 0;
}

/* =========================================
   5. زر التثبيت
   ========================================= */
.install-app-section {
  width: 100%;
  display: flex;
  justify-content: center;
}

.install-app-btn {
  width: 100%;
  max-width: 320px;
  height: 80px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.2s ease;
}

.install-app-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.install-app-icon {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.install-app-icon img { width: 28px; height: 28px; }

.install-btn-content {
  flex: 1;
  text-align: right;
  display: flex;
  flex-direction: column;
}

.install-btn-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.install-btn-subtitle { font-size: 12px; color: #64748b; }

.download-icon { color: var(--primary, #007965); font-size: 18px; }

/* =========================================
   6. الفوتر
   ========================================= */
.footer-info {
  margin-top: 40px;
  font-size: 12px;
  color: #94a3b8;
  width: 100%;
}

.developer-name { color: #475569; font-weight: 700; }

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* =========================================
   7. استجابة الهواتف (مهم جداً للتحرر)
   ========================================= */
@media (max-width: 600px) {
  .login-container {
    padding: 0; /* إلغاء الحواف في الموبايل */
  }

  .login-card {
    border-radius: 0; /* الكارد يملأ الزوايا */
    min-height: 100vh;
    min-height: 100dvh;
    padding: 40px 25px;
    box-shadow: none;
    border: none;
    max-width: none;
  }

  .logo-img { height: 70px; }
  .app-name { font-size: 28px; }
  
  .footer-info {
    margin-top: auto; /* دفع الفوتر لأسفل الشاشة */
    padding-bottom: 20px;
  }
}
</style>