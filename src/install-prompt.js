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
        // Show prompt (top banner), but final decision also happens on DOMContentLoaded guard
        setTimeout(() => {
          tryShowAccordingToGuards();
        }, 1000);
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

      // Guards
      const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
      const path = (location.pathname || '').toLowerCase();
      const isAdminPage = path.endsWith('/admin.html') || path.endsWith('admin.html');
      const dismissed = localStorage.getItem('installPromptDismissed');
      const installed = localStorage.getItem('appInstalled');

      // Inject banner if missing
      if (!document.getElementById('install-prompt')) {
        const container = document.createElement('div');
        container.id = 'install-prompt';
        container.className = 'install-prompt';
        container.innerHTML = `
          <div class="install-prompt-content">
            <div class="install-icon">
              <img src="/web-app-manifest-512x512.png" alt="شعار CollectPro" />
            </div>
            <div class="install-text">
              <h3>ثبّت تطبيق Collect Pro</h3>
              <p>احصل على تجربة استخدام أفضل وأسرع! ثبّت التطبيق على هاتفك للوصول الفوري وميزات حصرية.</p>
            </div>
            <div class="install-buttons">
              <button id="install-btn" class="install-btn">تثبيت</button>
              <button id="dismiss-btn" class="dismiss-btn">لاحقاً</button>
            </div>
          </div>`;
        // Insert at top of body
        if (document.body.firstChild) {
          document.body.insertBefore(container, document.body.firstChild);
        } else {
          document.body.appendChild(container);
        }
      }

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

      // Decide initial visibility strictly by guards
      function tryShowAccordingToGuards() {
        const nowDismissed = localStorage.getItem('installPromptDismissed');
        const nowInstalled = localStorage.getItem('appInstalled');
        if (!isAdminPage && !isStandalone && !nowDismissed && !nowInstalled) {
          showInstallPrompt();
        } else {
          hideInstallPrompt();
        }
      }

      window.tryShowAccordingToGuards = tryShowAccordingToGuards; // debug helper

      // Show immediately according to guards (no auto-hide unless user acts)
      tryShowAccordingToGuards();
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