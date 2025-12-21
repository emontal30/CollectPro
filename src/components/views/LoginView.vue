<template>
  <div class="login-wrapper" :class="{ 'loading': store.isLoading }">
    
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
              <span class="version-badge">v2.8.4</span>
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
  // 1. التحقق أولاً: هل التطبيق مثبت بالفعل؟ (Standalone Mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    logger.info('LoginView: App is already installed (standalone mode)');
    showInstallButton.value = false;
    return;
  }

  // 2. التحقق من الحدث المخزن عالمياً (إذا حدث قبل تحميل المكون)
  if (window.deferredPrompt) {
    logger.info('LoginView: Found global deferredPrompt - showing install button');
    showInstallButton.value = true;
    return;
  }

  // 3. الاستماع للحدث محلياً كاحتياطي (للحالات النادرة)
  const handleInstallPrompt = (e) => {
    logger.info('LoginView: Captured beforeinstallprompt event (fallback)');
    e.preventDefault();
    window.deferredPrompt = e; // تخزين عالمي
    showInstallButton.value = true;
    // إزالة المستمع بعد التقاط الحدث
    window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  };

  window.addEventListener('beforeinstallprompt', handleInstallPrompt);

  // تنظيف في حال عدم ظهور الحدث (fallback بعد 3 ثوان)
  setTimeout(() => {
    if (!showInstallButton.value && !window.deferredPrompt) {
      logger.info('LoginView: No install prompt captured within 3 seconds');
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    }
  }, 3000);
};

const installApp = async () => {
  if (!window.deferredPrompt) {
    logger.warn('LoginView: No deferredPrompt available for installation');
    return;
  }

  try {
    // إظهار نافذة التثبيت الأصلية للمتصفح
    window.deferredPrompt.prompt();

    // انتظار رد المستخدم
    const { outcome } = await window.deferredPrompt.userChoice;

    logger.info(`LoginView: User response to install prompt: ${outcome}`);

    // تصفير المتغيرات لأن الحدث لا يستخدم إلا مرة واحدة
    window.deferredPrompt = null;
    showInstallButton.value = false;

    if (outcome === 'accepted') {
      logger.info('LoginView: App installation accepted');
    } else {
      logger.info('LoginView: App installation dismissed');
    }
  } catch (error) {
    logger.error('LoginView: Error during app installation:', error);
    // تصفير في حالة الخطأ أيضاً
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
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  font-family: 'Cairo', sans-serif;
  direction: rtl;
  overflow-x: hidden;
}

/* خلفية متحركة */
.login-wrapper::before {
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
  position: relative;
  justify-content: center;
  align-items: center;
  padding: 10px;
  box-sizing: border-box;
  z-index: 1;
}

.login-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  padding: 50px 40px;
  width: 90%;
  max-width: 450px;
  min-width: 320px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.05);
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
  height: 80px;
  width: auto;
  margin-bottom: 30px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 5px 10px rgba(0, 121, 101, 0.2));
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.logo-img:hover {
  transform: scale(1.05);
}

.app-name {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary, #007965);
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
  background: linear-gradient(90deg, transparent, var(--primary, #007965), transparent);
  border-radius: 3px;
}

.subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}

/* =========================================
   3. زر تسجيل الدخول (Google) - إصلاح السطر الواحد
   ========================================= */
.btn-container {
  width: 100%;
  max-width: 350px;
  margin: 35px auto 25px;
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(0, 121, 101, 0.3);
  position: relative;
  overflow: hidden;
  font-family: 'Cairo', sans-serif;

  /* Force Single Line Layout */
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  flex-wrap: nowrap !important;
  gap: 12px;
}

.google-login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.google-login-btn:hover:not(:disabled)::before {
  left: 100%;
}

.google-login-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #006d56 0%, #007965 100%);
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0, 121, 101, 0.4);
}

.google-login-btn i {
  /* أيقونة ثابتة الحجم لا تنكمش */
  font-size: 24px;
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #ea4335;
  flex-shrink: 0; /* هام جداً */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.google-login-btn span {
  white-space: nowrap; /* يمنع التفاف النص */
  overflow: hidden;
  text-overflow: ellipsis;
}

/* =========================================
   4. الروابط والفواصل
   ========================================= */
.privacy-policy {
  margin-top: 25px;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.privacy-policy a {
  color: var(--primary, #007965);
  text-decoration: none;
  font-weight: 500;
}

.privacy-divider {
  display: block;
  width: 85%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 121, 101, 0.2), transparent);
  border: none;
  margin: 30px auto;
}

/* =========================================
   5. زر التثبيت (Install App) - إصلاح السطر الواحد
   ========================================= */
.install-app-section {
  margin-top: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.install-app-btn {
  width: 100%;
  max-width: 280px; /* تقليل العرض ليكون أصغر */
  height: 80px;
  background: linear-gradient(135deg, var(--primary, #007965) 0%, #00a085 100%);
  border: none;
  border-radius: 16px;
  padding: 0 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.3);
  position: relative;
  overflow: hidden;

  /* Force Single Line Layout */
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: space-between !important; /* العودة للتوزيع للسماح بتوسيط النص */
  flex-wrap: nowrap !important;
  gap: 15px;
}

.install-app-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 121, 101, 0.4);
}

/* الأيقونة (يمين) */
.install-app-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0; /* لا تنكمش */
  order: 1;
}

.install-app-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

/* النصوص (وسط) */
.install-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center; /* توسيط النصوص */
  text-align: center; /* توسيط النص */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  order: 2;
}

.install-btn-title {
  font-size: 16px;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;
  white-space: nowrap; /* سطر واحد */
}

.install-btn-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap; /* سطر واحد */
}

/* سهم التحميل (يسار) */
.download-icon {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  order: 3;
}

.download-icon i {
  font-size: 20px;
  color: white;
  opacity: 0.8;
}

/* =========================================
   6. الفوتر والرسوم المتحركة
   ========================================= */
.footer-info {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 121, 101, 0.1);
  text-align: center;
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  width: 100%;
}

.footer-info p {
  margin: 8px 0;
}

.developer-name {
  color: var(--primary, #007965);
  font-weight: 700;
}

.footer-separator {
  margin: 0 5px;
  opacity: 0.5;
}

.version-badge {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* =========================================
   8. استجابة الشاشات الصغيرة (Mobile)
   ========================================= */
@media (max-width: 480px) {
  .login-page { padding: 20px; }
  .login-card { padding: 30px 20px; min-width: auto; width: 100%; }
  .logo-img { height: 60px; }
  .app-name { font-size: 24px; }
  
  .btn-container { max-width: 100%; margin-top: 25px; }
  .google-login-btn { padding: 12px 16px; font-size: 14px; }
  .google-login-btn i { width: 30px; height: 30px; font-size: 18px; min-width: 30px; }
  
  .install-app-btn { height: 70px; padding: 0 15px; }
  .install-app-icon { width: 40px; height: 40px; min-width: 40px; }
  .install-app-icon img { width: 24px; height: 24px; }
  .install-btn-title { font-size: 14px; }
  .install-btn-subtitle { font-size: 11px; }
}
</style>