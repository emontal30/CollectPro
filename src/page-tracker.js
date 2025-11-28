/**
 * Page Tracker for CollectPro
 * Tracks and saves the last visited page for session restoration
 */

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
    
    console.log('📍 Page saved:', currentPage);
  }

  /**
   * Setup tracking for page visibility changes
   */
  setupPageTracking() {
    // Track when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.saveCurrentPage();
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentPage();
    });

    // Track page focus
    window.addEventListener('focus', () => {
      this.saveCurrentPage();
    });
  }

  /**
   * Setup tracking for navigation events
   */
  setupNavigationTracking() {
    // Track all internal navigation clicks
    document.addEventListener('click', (event) => {
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
          
          console.log('🔗 Navigation tracked:', targetPath);
        }
      }
    });

    // Track SPA navigation if using history API
    let lastPushState = window.history.pushState;
    window.history.pushState = function(state, title, url) {
      lastPushState.call(this, state, title, url);
      
      // Save the new page
      if (window.pageTracker) {
        window.pageTracker.saveCurrentPage();
      }
    };

    // Track browser back/forward buttons
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.saveCurrentPage();
      }, 100);
    });
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
