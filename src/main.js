import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/variables.css'
import './assets/css/base.css'
import './assets/css/utilities.css'
import './assets/css/buttons.css'
import './assets/css/forms.css'
import './assets/css/tables.css'
import './assets/css/components.css'
import './assets/css/unified-dark-mode.css' /* Single source of truth for dark mode */
import { startAutoCleaning } from './services/cacheManager'
import { setupCacheMonitor } from './services/cacheMonitor'
import logger from '@/utils/logger.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Global PWA Install Prompt Handler
// Capture beforeinstallprompt event at the application level to prevent race conditions
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event');
  e.preventDefault(); // Prevent the default browser prompt
  window.deferredPrompt = e; // Store the event globally for components to use
});

// 🚀 بدء نظام إدارة الكاش الذكي
logger.info('🧠 تفعيل نظام إدارة الكاش الذكي');
startAutoCleaning(5 * 60 * 1000); // تنظيف كل 5 دقائق

// 🧪 تفعيل مراقب الكاش (للتطوير)
if (import.meta.env.DEV) {
  setupCacheMonitor();
}

app.mount('#app')

