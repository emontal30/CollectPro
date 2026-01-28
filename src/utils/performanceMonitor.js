/**
 * Performance Monitor for CollectPro
 * Monitors memory usage and performance to prevent freezing
 */

import logger from './logger.js'

class PerformanceMonitor {
  constructor() {
    this.isEnabled = false; // Disabled by default
    this.startTime = Date.now();
    this.memoryCheckInterval = null;
    this.maxMemoryUsage = 50 * 1024 * 1024; // 50MB threshold
  }

  /**
   * Enable monitoring only when needed (e.g., login, subscription)
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    logger.info('📊 Performance Monitor enabled');
    this.startMemoryMonitoring();
    this.setupErrorTracking();
  }

  /**
   * Disable monitoring to reduce overhead
   */
  disable() {
    this.isEnabled = false;
    this.cleanup();
  }

  /**
   * Start memory usage monitoring - only when enabled
   */
  startMemoryMonitoring() {
    if (!this.isEnabled || !('memory' in performance)) {
      return;
    }

    this.memoryCheckInterval = setInterval(() => {
      const memoryInfo = performance.memory;
      const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);

      // Only log if using more than 50MB (reduced logging)
      if (usedMB > 50) {
        logger.info(`💾 Memory: ${usedMB}MB / ${totalMB}MB`);
      }

      // Check for memory leaks
      if (memoryInfo.usedJSHeapSize > this.maxMemoryUsage) {
        logger.warn('⚠️ High memory usage detected:', {
          used: `${usedMB}MB`,
          total: `${totalMB}MB`,
          limit: `${Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)}MB`
        });
      }

    }, 60000); // Check every 60 seconds (reduced frequency)
  }

  /**
   * Setup error tracking to catch performance issues - only when enabled
   */
  setupErrorTracking() {
    if (!this.isEnabled) return;

    // Track unhandled promise rejections
    this.handleUnhandledRejection = (event) => {
      // logger.error is handled globally in main.js
      this.reportPerformanceIssue('unhandled-promise-rejection', event.reason);
    };

    // Track JavaScript errors
    this.handleError = (event) => {
      // logger.error is handled globally in main.js
      this.reportPerformanceIssue('javascript-error', event.error);
    };

    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.addEventListener('error', this.handleError);
  }

  /**
   * Report performance issues
   */
  reportPerformanceIssue(type, error) {
    if (!this.isEnabled) return;

    const performanceData = {
      type,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null,
      uptime: Math.round((Date.now() - this.startTime) / 1000)
    };

    logger.warn('📈 Performance Issue Detected:', performanceData);
  }

  /**
   * Track function execution time
   */
  trackExecution(fnName, fn) {
    return async (...args) => {
      if (!this.isEnabled) return fn(...args);

      const start = performance.now();
      try {
        const result = await fn(...args);
        const end = performance.now();
        const duration = Math.round(end - start);

        if (duration > 2000) { // Only log if function takes more than 2 seconds
          logger.warn(`⏱️ Slow function detected: ${fnName} took ${duration}ms`);
          this.reportPerformanceIssue('slow-function', `${fnName} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        const end = performance.now();
        const duration = Math.round(end - start);
        logger.error(`❌ Function ${fnName} failed after ${duration}ms:`, error);
        throw error;
      }
    };
  }

  /**
   * Cleanup monitoring
   */
  cleanup() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    // Remove event listeners
    if (this.handleUnhandledRejection) {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
      this.handleUnhandledRejection = null;
    }
    if (this.handleError) {
      window.removeEventListener('error', this.handleError);
      this.handleError = null;
    }

    logger.info('🧹 Performance Monitor cleaned up');
  }
}

// Initialize global performance monitor
window.performanceMonitor = new PerformanceMonitor();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}