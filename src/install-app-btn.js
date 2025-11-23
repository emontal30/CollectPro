/**
 * Install App Button Script
 * Handles the professional install button functionality
 */

(function() {
  'use strict';

  let deferredPrompt;

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Install app button script loaded');

    const installAppBtn = document.getElementById('install-app-btn');
    
    if (!installAppBtn) {
      console.log('📱 Install app button not found');
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      deferredPrompt = e;

      // Show pulse animation to draw attention
      installAppBtn.classList.add('pulse');
      
      // Remove pulse after 3 seconds
      setTimeout(() => {
        installAppBtn.classList.remove('pulse');
      }, 3000);
    });

    // Handle install button click
    installAppBtn.addEventListener('click', async () => {
      console.log('📱 Install app button clicked');
      
      if (deferredPrompt) {
        // Show loading state
        const originalContent = installAppBtn.innerHTML;
        installAppBtn.innerHTML = `
          <div class="install-app-icon">
            <div class="loading-spinner"></div>
          </div>
          <div class="install-app-text">
            <h4>جاري التثبيت...</h4>
            <p>يرجى الانتظار</p>
          </div>
          <div class="install-app-arrow">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
        `;
        installAppBtn.disabled = true;

        try {
          // Show the install prompt
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          
          console.log('📱 Install prompt outcome:', outcome);
          
          if (outcome === 'accepted') {
            // Success state
            installAppBtn.innerHTML = `
              <div class="install-app-icon">
                <i class="fas fa-check" style="color: white; font-size: 24px;"></i>
              </div>
              <div class="install-app-text">
                <h4>تم التثبيت بنجاح!</h4>
                <p>افتح التطبيق من الشاشة الرئيسية</p>
              </div>
              <div class="install-app-arrow">
                <i class="fas fa-check"></i>
              </div>
            `;
            
            // Mark as installed
            localStorage.setItem('appInstalled', 'true');
            localStorage.setItem('installPromptDismissed', 'true');
            
            // Hide the banner if exists
            const banner = document.getElementById('install-prompt');
            if (banner) {
              banner.classList.remove('show');
            }
            
          } else {
            // Rejected state
            installAppBtn.innerHTML = originalContent;
            installAppBtn.disabled = false;
          }
          
          deferredPrompt = null;
          
        } catch (error) {
          console.error('📱 Install error:', error);
          
          // Silent fallback - no instructions shown
          installAppBtn.innerHTML = originalContent;
          installAppBtn.disabled = false;
        }
        
      } else {
        // No deferred prompt - silent fallback
        console.log('📱 No deferred prompt available');
      }
    });

    // Check if app is already installed
    if (localStorage.getItem('appInstalled') === 'true') {
      installAppBtn.innerHTML = `
        <div class="install-app-icon">
          <i class="fas fa-check" style="color: white; font-size: 24px;"></i>
        </div>
        <div class="install-app-text">
          <h4>التطبيق مثبت</h4>
          <p>متوفر على الشاشة الرئيسية</p>
        </div>
        <div class="install-app-arrow">
          <i class="fas fa-check"></i>
        </div>
      `;
      installAppBtn.disabled = true;
      installAppBtn.style.opacity = '0.7';
    }

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed successfully');
      localStorage.setItem('appInstalled', 'true');
      
      // Update button state
      installAppBtn.innerHTML = `
        <div class="install-app-icon">
          <i class="fas fa-check" style="color: white; font-size: 24px;"></i>
        </div>
        <div class="install-app-text">
          <h4>تم التثبيت بنجاح!</h4>
          <p>افتح التطبيق من الشاشة الرئيسية</p>
        </div>
        <div class="install-app-arrow">
          <i class="fas fa-check"></i>
        </div>
      `;
      installAppBtn.disabled = true;
    });
  });

  // Show manual install instructions
  function showInstallInstructions() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isMobile) {
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        instructions = `لتثبيت التطبيق على iOS:
        
1. اضغط على أيقونة المشاركة ⎋ في أسفل الشاشة
2. اختر "إضافة إلى الشاشة الرئيسية"
3. اضغط على "إضافة" للتأكيد`;
      } else {
        instructions = `لتثبيت التطبيق على Android:
        
1. اضغط على قائمة المتصفح (⋮)
2. اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"
3. اضغط على "تثبيت"`;
      }
    } else {
      instructions = `لتثبيت التطبيق على الكمبيوتر:
      
1. اضغط على أيقونة التثبيت في شريط العنوان
أو
2. اضغط Ctrl+Shift+P
3. اكتب "Install" واختر "Install app"`;
    }

    // Create modal for instructions
    const modal = document.createElement('div');
    modal.className = 'install-instructions-modal';
    modal.innerHTML = `
      <div class="install-instructions-content">
        <div class="install-instructions-header">
          <h3>كيفية تثبيت التطبيق</h3>
          <button class="close-instructions">&times;</button>
        </div>
        <div class="install-instructions-body">
          <pre>${instructions}</pre>
        </div>
      </div>
    `;
    
    // Add modal styles
    if (!document.getElementById('install-instructions-styles')) {
      const styles = document.createElement('style');
      styles.id = 'install-instructions-styles';
      styles.textContent = `
        .install-instructions-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        }
        
        .install-instructions-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .install-instructions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }
        
        .install-instructions-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
        }
        
        .close-instructions {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        
        .close-instructions:hover {
          background: #f5f5f5;
          color: #333;
        }
        
        .install-instructions-body pre {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #495057;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          direction: rtl;
          text-align: right;
        }
        
        @media (max-width: 480px) {
          .install-instructions-content {
            padding: 20px;
            margin: 20px;
          }
          
          .install-instructions-body pre {
            font-size: 13px;
          }
        }
      `;
      document.head.appendChild(styles);
    }
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Handle close button
    const closeBtn = modal.querySelector('.close-instructions');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

})();
