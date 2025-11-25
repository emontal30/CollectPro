/**
 * Import icon utilities for consistent icon display
 */
import { SHARED_ICONS } from './shared-icons.js';

/**
 * Install Prompt Script for PWA
 * This script handles the installation prompt for Progressive Web Apps
 */

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
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 0 0 20px 20px;
    padding: 16px 20px;
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    animation: slideDownFromTop 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    direction: rtl;
  }

  .install-prompt.show {
    display: flex;
  }

  .install-prompt-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    width: 100%;
    max-width: 600px;
  }

  .install-prompt-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20%;
    right: 20%;
    height: 3px;
    background: linear-gradient(90deg, transparent, #007965, transparent);
    border-radius: 0 0 4px 4px;
    opacity: 0.8;
  }

  .install-info-wrapper {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
    text-align: right;
  }

  .inline-icon {
    flex-shrink: 0;
    position: relative;
    width: 48px;
    height: 48px;
  }

  .inline-icon img {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: iconPulse 3s infinite ease-in-out;
    object-fit: cover;
    background-color: #fff; /* خلفية بيضاء لضمان وضوح الشعار */
  }

  @keyframes iconPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3); }
    50% { transform: scale(1.05); box-shadow: 0 4px 25px rgba(0, 121, 101, 0.5); }
  }

  .install-text {
    flex: 1;
  }

  .title-row {
    margin-bottom: 4px;
  }

  .title-row span {
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    display: block;
  }

  .install-text p {
    color: #e0e0e0;
    font-size: 13px;
    line-height: 1.4;
    margin: 0;
    opacity: 0.9;
  }

  .install-buttons {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  .install-btn, .dismiss-btn {
    padding: 10px 18px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .install-btn {
    background: linear-gradient(135deg, #007965 0%, #00a080 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 121, 101, 0.3);
  }

  .install-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 121, 101, 0.5);
    background: linear-gradient(135deg, #008c76 0%, #00b38f 100%);
  }

  .install-btn:active {
    transform: translateY(0);
  }

  .dismiss-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .dismiss-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  @keyframes slideDownFromTop {
    from { opacity: 0; transform: translateY(-100%); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Dark mode enhancements */
  body.dark .install-prompt {
    background: rgba(20, 20, 20, 0.9);
    border-bottom: 1px solid rgba(0, 200, 150, 0.2);
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .install-prompt {
      padding: 12px 15px;
    }
    
    .install-prompt-content {
      flex-direction: column;
      gap: 12px;
    }
    
    .install-info-wrapper {
      width: 100%;
      text-align: right;
    }
    
    .install-buttons {
      width: 100%;
      justify-content: stretch;
    }
    
    .install-btn, .dismiss-btn {
      flex: 1;
      padding: 10px;
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

    if (!dismissed && !installed) {
      setTimeout(() => {
        tryShowAccordingToGuards();
      }, 2000); // Small delay to ensure UI is ready
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
    
    // Guards
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const path = (location.pathname || '').toLowerCase();
    const isAdminPage = path.includes('admin.html');
    const dismissed = localStorage.getItem('installPromptDismissed');
    const installed = localStorage.getItem('appInstalled');

    // Inject banner if missing
    if (!document.getElementById('install-prompt')) {
      const container = document.createElement('div');
      container.id = 'install-prompt';
      container.className = 'install-prompt';
      
      // استخدام مسار نسبي للصورة لضمان العمل عند النشر
      const iconSrc = '/manifest/icon-192x192.png';
      
      // استخدام أيقونة SVG الأصلية كبديل فوري في حال فشل التحميل
      // SHARED_ICONS.appIcon تحتوي على كود SVG Base64 للشعار الأصلي
      const fallbackIcon = SHARED_ICONS.appIcon; 

      container.innerHTML = `
        <div class="install-prompt-content">
          <div class="install-info-wrapper">
            <div class="inline-icon">
              <img id="pwa-install-icon" 
                   src="${iconSrc}" 
                   alt="CollectPro"
                   onerror="this.onerror=null; this.src='${fallbackIcon}';" />
            </div>
            <div class="install-text">
              <div class="title-row">
                <span>ثبّت تطبيق CollectPro</span>
              </div>
              <p>تجربة استخدام أسرع والوصول للميزات بدون إنترنت</p>
            </div>
          </div>
          <div class="install-buttons">
            <button id="install-btn" class="install-btn">تثبيت</button>
            <button id="dismiss-btn" class="dismiss-btn">ليس الآن</button>
          </div>
        </div>
      `;

      // إدراج العنصر في بداية الـ body
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
          window.deferredPrompt = null;

          if (outcome === 'accepted') {
            localStorage.setItem('appInstalled', 'true');
          }
        } else {
            // Fallback instruction if automatic prompt fails
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
               alert('لتثبيت التطبيق على iOS: اضغط على أيقونة المشاركة (Share) أسفل الشاشة ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)');
            } else {
               alert('لتثبيت التطبيق: اضغط على أيقونة القائمة في متصفحك ثم اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق"');
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

    // Function to verify if we should show the prompt
    window.tryShowAccordingToGuards = function() {
      const nowDismissed = localStorage.getItem('installPromptDismissed');
      const nowInstalled = localStorage.getItem('appInstalled');
      
      if (!isAdminPage && !isStandalone && !nowDismissed && !nowInstalled) {
        showInstallPrompt();
      } else {
        hideInstallPrompt();
      }
    };

    // Initial check
    tryShowAccordingToGuards();
  });
}

// Expose functions globally
window.installPromptUtils = {
  show: showInstallPrompt,
  hide: hideInstallPrompt,
  reset: function() {
    localStorage.removeItem('installPromptDismissed');
    localStorage.removeItem('appInstalled');
    console.log('📱 Install prompt state reset');
    alert('تم إعادة تعيين حالة التثبيت. قم بتحديث الصفحة.');
  }
};