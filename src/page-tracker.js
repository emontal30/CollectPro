/**
 * Page Tracker for CollectPro
 * Tracks and saves the last visited page for session restoration
 */

import logger from '@/utils/logger.js'

class PageTracker {
  constructor() {
    this.init();
  }

  init() {
    // Save current page immediately
    this.saveCurrentPage();
    
    // Setup page tracking
    this.setupPageTracking();
    
    // Setup navigation tracking
    this.setupNavigationTracking();
  }

  /**
   * Save the current page to localStorage
   */
  saveCurrentPage() {
    const currentPage = window.location.pathname;
    
    // Use session manager if available, otherwise use localStorage directly
    if (window.sessionManager) {
      window.sessionManager.saveLastPage();
    } else {
      localStorage.setItem('collectpro_last_page', currentPage);
    }
    
    logger.info('📍 Page saved:', currentPage);
  }

  /**
   * Setup tracking for page visibility changes
   */
  setupPageTracking() {
    // Use passive listeners for better performance
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        this.saveCurrentPage();
      }
    };

    const handleBeforeUnload = () => {
      this.saveCurrentPage();
    };

    const handleFocus = () => {
      this.saveCurrentPage();
    };

    // Store cleanup functions
    this.cleanup = this.cleanup || [];
    this.cleanup.push(
      () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      () => window.removeEventListener('beforeunload', handleBeforeUnload),
      () => window.removeEventListener('focus', handleFocus)
    );

    // Add event listeners with passive option
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload, { passive: true });
    window.addEventListener('focus', handleFocus, { passive: true });
  }

  /**
   * Setup tracking for navigation events
   */
  setupNavigationTracking() {
    // Throttled click handler to prevent excessive calls
  let clickTimeout;
  const handleClick = (event) => {
    if (clickTimeout) return; // Throttle clicks

    const target = event.target.closest('a');
    if (target && target.href) {
      const url = new URL(target.href);

      // Only track internal navigation
      if (url.origin === window.location.origin) {
        // Save the target page before navigation
        const targetPath = url.pathname;
        if (window.sessionManager) {
          localStorage.setItem('collectpro_last_page', targetPath);
        } else {
          localStorage.setItem('collectpro_last_page', targetPath);
        }

        logger.info('🔗 Navigation tracked:', targetPath);
      }
    }

    // Reset throttle after 200ms (reduced frequency)
    clickTimeout = setTimeout(() => {
      clickTimeout = null;
    }, 200);
  };

    // Track browser back/forward buttons
  const handlePopState = () => {
    setTimeout(() => {
      this.saveCurrentPage();
    }, 200); // Increased delay to reduce frequency
  };

    // Store cleanup functions
    this.cleanup = this.cleanup || [];
    this.cleanup.push(
      () => document.removeEventListener('click', handleClick),
      () => window.removeEventListener('popstate', handlePopState)
    );

    // Add event listeners with passive option
    document.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('popstate', handlePopState, { passive: true });

    // Don't override pushState - it can interfere with Vue Router
    // Instead, use a more targeted approach with history API
  }

  /**
   * Get the last saved page
   */
  getLastPage() {
    if (window.sessionManager) {
      return window.sessionManager.getLastPage();
    }
    return localStorage.getItem('collectpro_last_page');
  }

  /**
   * Clear the last page (useful for logout)
   */
  clearLastPage() {
    if (window.sessionManager) {
      localStorage.removeItem('collectpro_last_page');
    } else {
      localStorage.removeItem('collectpro_last_page');
    }
  }

  /**
   * Cleanup all event listeners (call this during logout)
   */
  cleanup() {
    if (this.cleanup && Array.isArray(this.cleanup)) {
      this.cleanup.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          logger.warn('Error during page tracker cleanup:', error);
        }
      });
      this.cleanup = [];
    }
  }

  /**
   * Check if we should restore the last page
   * Don't restore if coming from login page
   */
  shouldRestorePage() {
    const referrer = document.referrer;
    const currentPage = window.location.pathname;
    
    // Don't restore if we're on the login page
    if (currentPage === '/' || currentPage === '/index.html') {
      return false;
    }
    
    // Don't restore if coming from login page
    if (referrer && (referrer.includes('/index.html') || referrer.endsWith('/'))) {
      return false;
    }
    
    return true;
  }
}

// Initialize page tracker
window.pageTracker = new PageTracker();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageTracker;
}
