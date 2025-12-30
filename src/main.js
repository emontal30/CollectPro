import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/* --- Global Design System (Single Entry Point) --- */
import './assets/css/main.css'

/* --- Services & Utils --- */
import { startAutoCleaning } from './services/cacheManager'
import { setupCacheMonitor } from './services/cacheMonitor'
import logger from '@/utils/logger.js'

// 1. Create App Instance
const app = createApp(App)
const pinia = createPinia()

// 2. Global Directives
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  },
});

// 3. Install Plugins
app.use(pinia)
app.use(router)

// 4. Global PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event.');
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
});

// 5. Initialize Background Services
startAutoCleaning(5 * 60 * 1000);

if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 6. Mount Application & Cleanup Splash Screen
// نستخدم الـ hook الخاص بالراوتر لضمان أن أول صفحة تم تحميلها قبل إخفاء الـ loader
router.isReady().then(() => {
  app.mount('#app');
  
  // إخفاء شاشة التحميل الأولية بسلاسة
  setTimeout(() => {
    document.body.classList.add('loaded');
    logger.info('✅ Application Mounted and Splash Screen Hidden');
  }, 100);
});
