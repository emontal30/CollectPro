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
// Directive to handle clicking outside of an element
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      // Check if the click was outside the element and its children
      if (!(el === event.target || el.contains(event.target))) {
        // Call the method provided in the directive's value
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

// 4. Global PWA Handler
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event');
  e.preventDefault(); 
  window.deferredPrompt = e; 
});

/**
 * دالة ذكية للتحقق من وجود تحديثات جديدة
 * متوافقة مع بنية المشروع وتستخدم سجلات النظام
 */
function setupUpdateListener() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('♻️ New Service Worker Controller detected. Refreshing...');
    });

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  logger.info('✨ New content is available; please refresh.');
                }
              };
            }
          };
        }
      } catch (err) {
        logger.error('❌ Service Worker registration check failed:', err);
      }
    });
  }
}

// 5. Initialize Background Services
logger.info('🧠 Initializing Smart Cache System...');
startAutoCleaning(5 * 60 * 1000);
setupUpdateListener();

if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 6. Mount Application
app.mount('#app')
logger.info('✅ Application Mounted Successfully');
