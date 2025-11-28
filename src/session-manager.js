/**
 * Session Manager for CollectPro
 * Handles 24-hour session persistence and prevents automatic logout
 */

class SessionManager {
  constructor() {
    this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.SESSION_KEY = 'collectpro_session';
    this.LAST_ACTIVITY_KEY = 'collectpro_last_activity';
    this.LAST_PAGE_KEY = 'collectpro_last_page';
    this.init();
  }

  init() {
    this.updateLastActivity();
    this.setupActivityListeners();
    this.startSessionMonitor();
    
    // Add logout button after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.addLogoutButton(), 1000);
      });
    } else {
      setTimeout(() => this.addLogoutButton(), 1000);
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
  }

  /**
   * Setup activity listeners to track user interaction
   */
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateLastActivity();
        this.checkSessionValidity();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.updateLastActivity();
    });

    // Setup periodic session extension
    setInterval(() => {
      this.extendSessionIfActive();
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  /**
   * Start session monitoring interval
   */
  startSessionMonitor() {
    // Check session every 5 minutes
    setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if current session is still valid
   */
  checkSessionValidity() {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    
    if (timeSinceLastActivity > this.SESSION_DURATION) {
      console.log('🕰️ Session expired due to inactivity');
      this.forceLogout();
      return false;
    }

    return true;
  }

  /**
   * Save current page for restoration
   */
  saveLastPage() {
    const currentPage = window.location.pathname;
    localStorage.setItem(this.LAST_PAGE_KEY, currentPage);
    console.log('📍 Last page saved:', currentPage);
  }

  /**
   * Get last saved page
   */
  getLastPage() {
    return localStorage.getItem(this.LAST_PAGE_KEY);
  }

  /**
   * Force logout with proper cleanup
   */
  async forceLogout() {
    console.log('🔐 Forcing logout due to session expiration');
    
    // Clear session data
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    
    // Sign out from Supabase
    try {
      await window.supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    // Redirect to login page
    window.location.href = '/index.html';
  }

  /**
   * Manual logout (user initiated)
   */
  async manualLogout() {
    console.log('👋 User initiated logout');
    
    // Clear all session data
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem(this.LAST_PAGE_KEY);
    
    // Sign out from Supabase
    try {
      await window.supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    // Redirect to login page
    window.location.href = '/index.html';
  }

  /**
   * Extend session manually
   */
  extendSession() {
    this.updateLastActivity();
    console.log('⏰ Session extended for 24 hours');
  }

  /**
   * Get session expiry time
   */
  getSessionExpiry() {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return null;
    
    return parseInt(lastActivity) + this.SESSION_DURATION;
  }

  /**
   * Get remaining session time in human readable format
   */
  getRemainingSessionTime() {
    const expiry = this.getSessionExpiry();
    if (!expiry) return '0:00:00';
    
    const remaining = expiry - Date.now();
    if (remaining <= 0) return '0:00:00';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if session is about to expire (within 1 hour)
   */
  isSessionExpiringSoon() {
    const expiry = this.getSessionExpiry();
    if (!expiry) return false;
    
    const oneHour = 60 * 60 * 1000;
    return (expiry - Date.now()) <= oneHour;
  }

  /**
   * Extend session if user is active
   */
  extendSessionIfActive() {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    const thirtyMinutes = 30 * 60 * 1000;
    
    // If user was active in the last 30 minutes, extend session
    if (timeSinceLastActivity < thirtyMinutes) {
      this.extendSession();
    }
  }

  /**
   * Add logout functionality to existing logout button
   */
  addLogoutButton() {
    // Check if existing logout button exists and add functionality
    const existingLogoutBtn = document.getElementById('logout-btn');
    if (existingLogoutBtn) {
      // Remove existing listeners to avoid duplicates
      const newLogoutBtn = existingLogoutBtn.cloneNode(true);
      existingLogoutBtn.parentNode.replaceChild(newLogoutBtn, existingLogoutBtn);
      
      // Add our enhanced logout functionality
      newLogoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.manualLogout();
      });
      
      console.log('✅ Enhanced existing logout button functionality');
      return;
    }
    
    // Fallback: Create logout button if none exists (for index.html)
    const sidebar = document.querySelector('.sidebar-content, .sidebar');
    if (sidebar) {
      const logoutItem = document.createElement('li');
      logoutItem.innerHTML = `
        <a href="#" id="logout-btn" style="color: #dc3545; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto;">
          <i class="fas fa-sign-out-alt"></i>
          <span>تسجيل الخروج</span>
        </a>
      `;
      
      const navLinks = sidebar.querySelector('.nav-links');
      if (navLinks) {
        navLinks.appendChild(logoutItem);
      }
      
      // Add click handler
      document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await this.manualLogout();
      });
    }
  }
}

// Initialize session manager
window.sessionManager = new SessionManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}
