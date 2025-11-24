/**
 * Install Prompt Script for PWA
 * This script handles the installation prompt for Progressive Web Apps
 */

(function() {
  'use strict';

  let deferredPrompt;
  
  // Make deferredPrompt globally accessible
  window.deferredPrompt = null;

  // Add unified CSS styles
  const unifiedStyles = `
    .install-prompt {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(15px);
      border-radius: 0 0 16px 16px;
      padding: 20px;
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      animation: slideDownFromTop 0.3s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .install-prompt.show {
      display: flex;
    }

    .install-prompt-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 15px;
      flex: 1;
      text-align: center;
    }

    .install-prompt-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #007965 0%, #00a080 100%);
      border-radius: 16px 16px 0 0;
    }

    .install-text {
      flex: 1;
      text-align: center;
    }

    .title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: nowrap;
    }

    .title-row span {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .inline-icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
    }

    .inline-icon img {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 121, 101, 0.3);
      border: none;
      animation: iconPulse 2s infinite ease-in-out, iconGlow 3s infinite alternate;
      transition: transform 0.3s ease;
      vertical-align: middle;
      object-fit: cover;
      background: transparent;
    }

    .inline-icon img.error {
      width: 30px;
      height: 30px;
      background: linear-gradient(135deg, #007965 0%, #00a080 100%);
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      font-weight: bold;
    }

    .inline-icon img.error::before {
      content: '📱';
    }

    .inline-icon img:hover {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 6px 20px rgba(0, 121, 101, 0.5);
    }

    @keyframes iconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    @keyframes iconGlow {
      0% { filter: brightness(1) drop-shadow(0 0 10px rgba(0, 121, 101, 0.3)); }
      100% { filter: brightness(1.2) drop-shadow(0 0 20px rgba(0, 121, 101, 0.6)); }
    }

    .install-text p {
      color: #e0e0e0;
      font-size: 14px;
      line-height: 1.4;
      margin: 0;
    }

    .install-buttons {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .install-btn, .dismiss-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 80px;
    }

    .install-btn {
      background: linear-gradient(135deg, #007965 0%, #00a080 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(0, 121, 101, 0.3);
    }

    .install-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 121, 101, 0.4);
    }

    .dismiss-btn {
      background: transparent;
      color: #999;
      border: 1px solid #ddd;
    }

    .dismiss-btn:hover {
      background: #f5f5f5;
      color: #666;
      transform: translateY(-1px);
    }

    @keyframes slideDownFromTop {
      from { opacity: 0; transform: translateY(-50px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Dark mode support */
    body.dark .install-prompt {
      background: rgba(30, 30, 30, 0.9);
      border-color: rgba(0, 200, 150, 0.3);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    body.dark .install-prompt-content::before {
      background: linear-gradient(90deg, rgba(0, 200, 150, 0.8) 0%, rgba(0, 150, 130, 0.9) 100%);
    }

    body.dark .dismiss-btn {
      background: transparent;
      color: #999;
      border-color: #555;
    }

    body.dark .dismiss-btn:hover {
      background: #333;
      color: #cccccc;
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .install-prompt {
        padding: 16px;
        border-radius: 0 0 12px 12px;
      }

      .install-prompt-content {
        gap: 12px;
      }

      .inline-icon img {
        width: 25px;
        height: 25px;
      }

      .title-row span {
        font-size: 18px;
      }

      .install-text p {
        font-size: 13px;
      }

      .install-buttons {
        gap: 8px;
      }

      .install-btn, .dismiss-btn {
        padding: 8px 12px;
        font-size: 13px;
      }
    }
  `;

  // Inject CSS styles
  if (!document.getElementById('install-prompt-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'install-prompt-styles';
    styleElement.textContent = unifiedStyles;
    document.head.appendChild(styleElement);
  }

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
      window.deferredPrompt = e; // Make it globally accessible

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

    // Import shared icons (make sure this is loaded first)
    import { getInlineIcon } from './shared-icons.js';

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
        
        // Get the correct base path for the icon
        const currentPath = window.location.pathname;
        
        // Use guaranteed icon display with shared icons
        const iconSvg = getInlineIcon('appIcon', 30);
        
        console.log('📍 Current path:', currentPath);
        console.log('🖼️ Using guaranteed shared icon');
        console.log('🌐 Origin:', window.location.origin);
        console.log('🌍 Hostname:', window.location.hostname);
        
        container.innerHTML = `
          <div class="install-prompt-content">
            <div class="install-text">
              <div class="title-row">
                <span>ثبّت تطبيق</span>
                <div class="inline-icon">
                  ${getInlineIcon('appIcon', 30)}
                </div>
                <span>Collect Pro</span>
              </div>
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
            window.deferredPrompt = null; // Reset global reference

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