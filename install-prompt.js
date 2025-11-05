/**
 * Install Prompt Script for PWA
 * This script handles the installation prompt for Progressive Web Apps
 */

(function() {
  'use strict';

  let deferredPrompt;

  // Function to show install prompt
  function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
      installPrompt.classList.add('show');
      console.log('📱 Showing install prompt');
    }
  }

  // Function to hide install prompt
  function hideInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
      installPrompt.classList.remove('show');
      console.log('📱 Hiding install prompt');
    }
  }

  // Check if PWA is supported and set up install prompt
  if ('serviceWorker' in navigator) {
    console.log('📱 Service Worker supported, checking for PWA features...');

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      deferredPrompt = e;

      // Check if prompt was previously dismissed or app installed
      const dismissed = localStorage.getItem('installPromptDismissed');
      const installed = localStorage.getItem('appInstalled');

      console.log('📱 Install prompt status - dismissed:', dismissed, 'installed:', installed);

      if (!dismissed && !installed) {
        // Show prompt after a short delay
        setTimeout(() => {
          showInstallPrompt();
        }, 3000); // Increased delay to ensure page is fully loaded
      } else {
        console.log('📱 Install prompt not shown - dismissed or already installed');
      }
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed successfully');
      localStorage.setItem('appInstalled', 'true');
      hideInstallPrompt();
    });

    // Set up all event listeners when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📱 DOMContentLoaded listener triggered for install prompt');

      // Set up button event listeners
      const installBtn = document.getElementById('install-btn');
      const dismissBtn = document.getElementById('dismiss-btn');

      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('📱 Install prompt outcome:', outcome);
            deferredPrompt = null;

            if (outcome === 'accepted') {
              localStorage.setItem('appInstalled', 'true');
            }
          }
          hideInstallPrompt();
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          console.log('📱 Install prompt dismissed');
          localStorage.setItem('installPromptDismissed', 'true');
          hideInstallPrompt();
        });
      }

      // Set up user interaction listeners for alternative install prompt
      let userInteracted = false;

      // Listen for user interactions
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, () => {
          userInteracted = true;
        }, { once: true });
      });

      // Force show prompt for debugging after 1 second, ignoring localStorage
      setTimeout(() => {
        console.log('📱 Forcing install prompt for debugging');
        showInstallPrompt();
      }, 1000);

      // Show prompt after user interaction if beforeinstallprompt didn't fire
      setTimeout(() => {
        if (userInteracted && !deferredPrompt) {
          const dismissed = localStorage.getItem('installPromptDismissed');
          const installed = localStorage.getItem('appInstalled');

          if (!dismissed && !installed) {
            console.log('📱 Showing install prompt after user interaction');
            setTimeout(() => {
              showInstallPrompt();
            }, 1000);
          }
        }
      }, 5000); // Wait 5 seconds for potential beforeinstallprompt event
    });

  } else {
    console.log('📱 PWA not fully supported, but Service Worker available');
  }

  // Expose functions globally for debugging
  window.installPromptUtils = {
    show: showInstallPrompt,
    hide: hideInstallPrompt,
    reset: function() {
      localStorage.removeItem('installPromptDismissed');
      localStorage.removeItem('appInstalled');
      console.log('📱 Install prompt state reset');
    },
    debug: function() {
      console.log('📱 Debug info:', {
        deferredPrompt: !!deferredPrompt,
        dismissed: localStorage.getItem('installPromptDismissed'),
        installed: localStorage.getItem('appInstalled'),
        serviceWorker: 'serviceWorker' in navigator,
        beforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
        userAgent: navigator.userAgent
      });
    }
  };

})();