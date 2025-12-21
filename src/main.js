import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/* --- Global Design System (Visual Integrity) --- */
import './assets/css/variables.css'
import './assets/css/base.css'
import './assets/css/utilities.css'
import './assets/css/buttons.css'
import './assets/css/forms.css'
import './assets/css/tables.css'
import './assets/css/components.css'
import './assets/css/unified-dark-mode.css'

/* --- Services & Utils --- */
import { startAutoCleaning } from './services/cacheManager'
import { setupCacheMonitor } from './services/cacheMonitor'
import logger from '@/utils/logger.js'
import { clearSyncQueue } from './services/archiveSyncQueue';

// 1. Create App Instance
const app = createApp(App)
const pinia = createPinia()

// 2. Install Plugins
app.use(pinia)
app.use(router)

// --- One-Time Auto-Clear for Debugging ---
const hasClearedQueue = localStorage.getItem('has_cleared_sync_queue_v1');
if (!hasClearedQueue && import.meta.env.DEV) {
  logger.warn('⚠️ Performing a one-time automatic clear of the sync queue for debugging.');
  clearSyncQueue().then(() => {
    localStorage.setItem('has_cleared_sync_queue_v1', 'true');
    logger.info('✅ One-time clear complete.');
  });
}

// 3. Global PWA Handler
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event');
  e.preventDefault(); 
  window.deferredPrompt = e; 
});

// 4. Initialize Background Services
logger.info('🧠 Initializing Smart Cache System...');
startAutoCleaning(5 * 60 * 1000);

if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 5. Mount Application
app.mount('#app')
logger.info('✅ Application Mounted Successfully');
