
import { startAutoCleaning, checkAppVersion } from './services/cacheManager';
import { setupCacheMonitor } from './services/cacheMonitor';
import logger from '@/utils/logger.js';

/**
 * Initializes background services and global event listeners.
 * This function is called once when the application starts.
 */
export function bootstrapApp() {
  logger.info('🚀 Bootstrapping application...');

  // 1. Initialize PWA Install Prompt Handler
  window.addEventListener('beforeinstallprompt', (e) => {
    logger.info('🔧 Global: Captured beforeinstallprompt event.');
    e.preventDefault();
    window.deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
  });

  // 2. Initialize Cache Management & Versioning
  checkAppVersion();
  startAutoCleaning(5 * 60 * 1000); // Clean cache every 5 minutes

  // 3. Initialize Developer-only Services
  if (import.meta.env.DEV) {
    setupCacheMonitor();
    logger.info('🛠️ Cache monitor enabled in development mode.');
  }

  logger.info('✅ Application bootstrapped successfully.');
}
