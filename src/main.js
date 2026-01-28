
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { bootstrapApp } from './bootstrap';

/* --- Global Design System (Single Entry Point) --- */
import './assets/css/main.css';
import './assets/css/itinerary.css';
import './assets/css/admin.css';

// --- Stores ---
import { useSettingsStore } from './stores/settings';
import logger from './utils/logger';

// --- Initialize Core Application ---

// 1. Create App Instance
const app = createApp(App);
const pinia = createPinia();

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
app.use(pinia);
app.use(router);

// 4. Load & Apply Saved Settings (DarkMode, Zoom, etc.)
const settingsStore = useSettingsStore();
settingsStore.loadSettings();

// 5. Initialize Background Services & Global Listeners
bootstrapApp();

// 6. Mount Application & Cleanup Splash Screen
router.isReady().then(() => {
  app.mount('#app');

  // ⚡ CRITICAL: Remove splash screen with multiple methods
  setTimeout(() => {
    // Method 1: Add loaded class
    document.body.classList.add('loaded');

    // Method 2: Force remove element (backup)
    setTimeout(() => {
      const splash = document.getElementById('initial-loader');
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
        logger.info('✅ Splash screen forcefully removed');
      }
    }, 400);

    logger.info('✅ Application Mounted and Splash Screen Hidden');
  }, 100);

  // ⚡ CRITICAL FIX: Global error handlers to prevent crashes
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('❌ Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent console spam
  });

  window.addEventListener('error', (event) => {
    logger.error('❌ Global error:', event.error);
  });

  logger.info('✅ Global error handlers registered');
});
