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

          <div class="install-app-section">
            <button
              class="install-app-btn"
              @click="installApp"
            >
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
            <p>  <span id="year">{{ currentYear }}</span> جميع الحقوق محفوظة.</p>
            <p>تم التصميم والتطوير بواسطة | <strong style="color:#ff6600;">أيمن حافظ</strong> v2.8.4</p>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const store = useAuthStore();
const currentYear = ref(new Date().getFullYear());
const showInstallButton = ref(false);
const deferredPrompt = ref(null);

onMounted(() => {
  store.initializeAuth();
  checkInstallPrompt();
});

const checkInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallButton.value = true;
  });
};

const installApp = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    deferredPrompt.value = null;
    showInstallButton.value = false;
  }
};
</script>

<style scoped>
/* استيراد المتغيرات والخطوط الأساسية من style.css ضروري لعمل هذا الكود
   تأكد من استيراد style.css في main.js */

/* --- تنسيقات index.css الأصلية --- */

.login-wrapper {
  /* خلفية الصفحة بالكامل */
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  width: 100%;
  position: absolute; /* لتغطية الشاشة بالكامل */
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
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.login-card {
   background: white;
   border-radius: 16px;
   box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
   padding: 50px 40px;
   width: 90%;
   max-width: 450px;
   min-width: 450px;
   text-align: center;
   position: relative;
   overflow: hidden;
   border: 1px solid rgba(0,0,0,0.05);
   display: flex;
   flex-direction: column;
   justify-content: center;
   align-items: center;
}

/* الشعار والعنوان */
.logo-container {
  margin-bottom: 40px;
  position: relative;
  width: 100%;
}

.logo-img {
  height: 80px;
  width: auto;
  margin-bottom: 30px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

.btn-container {
  width: 350px;
  min-width: 350px;
  max-width: 350px;
  margin: 35px auto 0;
  margin-bottom: 25px;
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
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 20px rgba(0, 121, 101, 0.3);
  position: relative;
  overflow: hidden;
  font-family: 'Cairo', sans-serif;
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
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.google-login-btn span {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

/* زر التثبيت */
.install-app-section {
  margin-top: 20px;
  width: 100%;
}

.install-app-btn {
  width: 300px;
  max-width: 300px;
  min-width: 300px;
  height: 80px;
  max-height: 80px;
  min-height: 80px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--primary, #007965) 0%, #00a085 100%);
  border: none;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 121, 101, 0.3);
  position: relative;
  overflow: hidden;
}

.install-app-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 121, 101, 0.4);
}

.download-icon {
  width: 48px;
  max-width: 48px;
  min-width: 48px;
  height: 48px;
  max-height: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  order: 2;
}

.download-icon i {
  font-size: 24px;
  color: white;
}

.install-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  text-align: center;
  order: 1;
}

.install-btn-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.install-btn-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.install-app-icon {
  width: 48px;
  max-width: 48px;
  min-width: 48px;
  height: 48px;
  max-height: 48px;
  min-height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  order: 0;
}

.install-app-icon img {
  width: 32px;
  max-width: 32px;
  min-width: 32px;
  height: 32px;
  max-height: 32px;
  min-height: 32px;
  flex-shrink: 0;
}

.install-app-text {
  flex: 1;
  text-align: right;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
}

.install-app-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.install-app-text p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
}

.install-app-arrow {
  color: white;
  font-size: 20px;
  width: 20px;
  max-width: 20px;
  min-width: 20px;
  height: 20px;
  max-height: 20px;
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #808080;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.share-btn:hover {
  background: #696969;
}

.share-btn i {
  font-size: 16px;
}

/* الفوتر */
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

/* Animations */
@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes breathe {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(144, 238, 144, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(144, 238, 144, 0); }
}

/* Dark Mode Override */
:global(body.dark) .login-wrapper {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}
:global(body.dark) .login-card {
  background: linear-gradient(135deg, #1e1e1e 0%, #252525 100%);
  color: #f1f1f1;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border-color: rgba(0, 200, 150, 0.1);
}

:global(body.dark) .app-name { color: #00c896; }
:global(body.dark) .subtitle { color: #ccc; }
:global(body.dark) .privacy-policy { color: #aaa; }
:global(body.dark) .footer-info { color: #999; border-top-color: #333; }

/* Responsive */
@media (max-width: 480px) {
  .login-page { padding: 20px; }
  .login-card { padding: 30px 20px; }
  .logo-img { height: 60px; }
  .app-name { font-size: 24px; }
}
</style>