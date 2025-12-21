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

// 2. Install Plugins
app.use(pinia)
app.use(router)

// 3. Global PWA Handler
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
      // يمكن هنا إظهار إشعار بدلاً من التحديث التلقائي
      // window.location.reload(); 
    });

    // مراقبة التحديثات المتاحة
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
                  // سيقوم نظام الإشعارات في المكونات بالتعامل مع التنبيهات لاحقاً
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

// 4. Initialize Background Services
logger.info('🧠 Initializing Smart Cache System...');
startAutoCleaning(5 * 60 * 1000);
setupUpdateListener();

// Enable Cache Monitor in Development only
if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 5. Mount Application
app.mount('#app')
logger.info('✅ Application Mounted Successfully');
