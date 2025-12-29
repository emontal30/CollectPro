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

// 4. Global PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
  logger.info('🚀 Global: Captured beforeinstallprompt event. Preventing default behavior.');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredPrompt = e;
  // Optionally, send a custom event to notify the UI to show a custom install button.
  window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
});


// 5. Initialize Background Services
logger.info('🧠 Initializing Smart Cache System...');
// Automatically clean up old cache entries every 5 minutes.
startAutoCleaning(5 * 60 * 1000);

// In development mode, set up a cache monitor for debugging.
if (import.meta.env.DEV) {
  setupCacheMonitor();
}

// 6. Mount Application
app.mount('#app')
logger.info('✅ Application Mounted Successfully');
