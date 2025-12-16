import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/variables.css'
import './assets/css/base.css'
import './assets/css/main.css'
import './assets/css/_unified-components.css'
import './assets/css/unified-dark-mode.css' /* Single source of truth for dark mode */
import { startAutoCleaning } from './services/cacheManager'
import { setupCacheMonitor } from './services/cacheMonitor'
import logger from '@/utils/logger.js'

// --- Console → Logger bridge ---
// Capture original console methods to avoid recursion and hand them to the logger
const __originalConsole = {}
;[ 'log', 'info', 'warn', 'error', 'debug', 'assert', 'trace', 'group', 'groupCollapsed', 'groupEnd' ].forEach((m) => {
  if (typeof console !== 'undefined' && typeof console[m] === 'function') __originalConsole[m] = console[m].bind(console)
  else __originalConsole[m] = () => {}
})

// Provide original console to logger so it can call original methods (avoids infinite loops)
if (logger && typeof logger.setConsole === 'function') logger.setConsole(__originalConsole)

// Replace global console methods to forward to logger (map `log` → `info`)
if (typeof window !== 'undefined' && window.console) {
  ;[ 'log', 'info', 'warn', 'error', 'debug', 'assert', 'trace', 'group', 'groupCollapsed', 'groupEnd' ].forEach((m) => {
    try {
      window.console[m] = (...args) => {
        const level = m === 'log' ? 'info' : m
        if (logger && typeof logger[level] === 'function') {
          logger[level](...args)
        } else if (__originalConsole[m]) {
          __originalConsole[m](...args)
        }
      }
    } catch (e) {
      // ignore readonly console properties in some environments
    }
  })
}

// --- end bridge ---

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
