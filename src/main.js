import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/* --- Global Design System (Single Entry Point) --- */
import './assets/css/main.css'
import './assets/css/itinerary.css'

/* --- Services & Utils --- */
import { startAutoCleaning, checkAppVersion } from './services/cacheManager'
import { setupCacheMonitor } from './services/cacheMonitor'
import logger from '@/utils/logger.js'

// --- Stores ---
import { useSettingsStore } from './stores/settings'

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

// 4. Load & Apply Saved Settings (DarkMode, Zoom, etc.)
// يتم استدعاؤها بعد app.use(pinia) لضمان جاهزية المخزن
const settingsStore = useSettingsStore()
settingsStore.loadSettings()

// 5. Global PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event.');
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
});

// 6. Initialize Background Services
checkAppVersion();
startAutoCleaning(5 * 60 * 1000);

if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 7. Mount Application & Cleanup Splash Screen
// نستخدم الـ hook الخاص بالراوتر لضمان أن أول صفحة تم تحميلها قبل إخفاء الـ loader
router.isReady().then(() => {
  app.mount('#app');
  
  // إخفاء شاشة التحميل الأولية بسلاسة
  setTimeout(() => {
    document.body.classList.add('loaded');
    logger.info('✅ Application Mounted and Splash Screen Hidden');
  }, 100);
});
