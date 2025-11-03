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
  if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
    console.log('📱 PWA supported, setting up install prompt...');

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      deferredPrompt = e;

      // Check if prompt was previously dismissed or app installed
      const dismissed = localStorage.getItem('installPromptDismissed');
      const installed = localStorage.getItem('appInstalled');

      if (!dismissed && !installed) {
        // Show prompt after a short delay
        setTimeout(() => {
          showInstallPrompt();
        }, 2000);
      }
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed successfully');
      localStorage.setItem('appInstalled', 'true');
      hideInstallPrompt();
    });

    // Set up button event listeners when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
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
    });

  } else {
    console.log('📱 PWA not supported');
  }

  // Expose functions globally for debugging
  window.installPromptUtils = {
    show: showInstallPrompt,
    hide: hideInstallPrompt,
    reset: function() {
      localStorage.removeItem('installPromptDismissed');
      localStorage.removeItem('appInstalled');
      console.log('📱 Install prompt state reset');
    }
  };

})();