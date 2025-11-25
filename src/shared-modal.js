// Shared Modal System for consistent design across all pages - v2.8.4
import { getIconHtml } from './shared-icons.js';

export class SharedModal {
  constructor() {
    this.currentModal = null;
  }

  // Unified modal design matching login page style
  show(title, message, options = {}) {
    const {
      iconType = 'info',
      confirmText = 'تأكيد',
      cancelText = 'إلغاء',
      showCancel = true,
      onConfirm = null,
      onCancel = null,
      customButtons = null
    } = options;

    // Remove existing modal
    this.hide();

    // Create modal container
    this.currentModal = document.createElement('div');
    this.currentModal.className = 'modal';
    this.currentModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
      animation: fadeIn 0.3s ease;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 40px 30px;
      max-width: 90%;
      width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: slideUp 0.3s ease;
      position: relative;
    `;

    // Icon section with enhanced fallback
    const iconSection = document.createElement('div');
    iconSection.style.cssText = `
      margin-bottom: 25px;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    iconSection.innerHTML = getIconHtml(iconType, 80);
    
    // Additional fallback check - if icon fails to load after 2 seconds, show fallback
    setTimeout(() => {
      const img = iconSection.querySelector('img');
      if (img && img.naturalWidth === 0) {
        iconSection.innerHTML = `
          <div style="width:80px;height:80px;border-radius:16px;background:linear-gradient(135deg,#007965 0%,#00a080 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:bold;border:3px solid rgba(255,255,255,0.8);box-shadow: 0 10px 25px rgba(0, 121, 101, 0.3);">
            CP
          </div>
        `;
      }
    }, 2000);

    // Title
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      margin: 0 0 15px 0;
      color: #2c3e50;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
    `;

    // Message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.cssText = `
      margin: 0 0 30px 0;
      color: #6c757d;
      font-size: 16px;
      line-height: 1.6;
      font-weight: 400;
    `;

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    `;

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText = `
      background: linear-gradient(135deg, #007965 0%, #00a080 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3);
      min-width: 120px;
    `;

    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.transform = 'translateY(-2px)';
      confirmBtn.style.boxShadow = '0 6px 20px rgba(0, 121, 101, 0.4)';
    });

    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.transform = 'translateY(0)';
      confirmBtn.style.boxShadow = '0 4px 15px rgba(0, 121, 101, 0.3)';
    });

    // Cancel button (if shown)
    let cancelBtn = null;
    if (showCancel) {
      cancelBtn = document.createElement('button');
      cancelBtn.textContent = cancelText;
      cancelBtn.style.cssText = `
        background: #f8f9fa;
        color: #6c757d;
        border: 2px solid #e9ecef;
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 120px;
      `;

      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.transform = 'translateY(-2px)';
        cancelBtn.style.borderColor = '#007965';
        cancelBtn.style.color = '#007965';
      });

      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.borderColor = '#e9ecef';
        cancelBtn.style.color = '#6c757d';
      });
    }

    // Add event listeners
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm();
      this.hide();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        this.hide();
      });
    }

    // Close on backdrop click
    this.currentModal.addEventListener('click', (e) => {
      if (e.target === this.currentModal) {
        if (onCancel) onCancel();
        this.hide();
      }
    });

    // Assemble modal
    buttonsContainer.appendChild(confirmBtn);
    if (cancelBtn) buttonsContainer.appendChild(cancelBtn);

    modalContent.appendChild(iconSection);
    modalContent.appendChild(titleElement);
    modalContent.appendChild(messageElement);
    modalContent.appendChild(buttonsContainer);

    this.currentModal.appendChild(modalContent);
    document.body.appendChild(this.currentModal);

    // Add CSS animations
    if (!document.getElementById('shared-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'shared-modal-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .modal {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        @media (max-width: 480px) {
          .modal .modal-content {
            margin: 20px;
            padding: 30px 20px;
            width: calc(100% - 40px);
          }
          
          .modal .modal-content h3 {
            font-size: 20px;
          }
          
          .modal .modal-content p {
            font-size: 14px;
          }
          
          .modal .modal-content button {
            font-size: 14px;
            padding: 12px 20px;
            min-width: 100px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  hide() {
    if (this.currentModal) {
      this.currentModal.style.animation = 'fadeIn 0.3s ease reverse';
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentNode) {
          this.currentModal.parentNode.removeChild(this.currentModal);
        }
        this.currentModal = null;
      }, 300);
    }
  }

  // Predefined modal types
  success(title, message, options = {}) {
    this.show(title, message, { ...options, iconType: 'success', showCancel: false });
  }

  error(title, message, options = {}) {
    this.show(title, message, { ...options, iconType: 'error', showCancel: false });
  }

  warning(title, message, options = {}) {
    this.show(title, message, { ...options, iconType: 'warning' });
  }

  info(title, message, options = {}) {
    this.show(title, message, { ...options, iconType: 'info', showCancel: false });
  }

  confirm(title, message, onConfirm, options = {}) {
    this.show(title, message, { ...options, iconType: 'warning', onConfirm });
  }
}

// Create global instance
export const sharedModal = new SharedModal();

// Make available globally
window.sharedModal = sharedModal;

// Backward compatibility
window.showModal = (title, message, onConfirm, onCancel, iconType = 'info') => {
  sharedModal.show(title, message, { onConfirm, onCancel, iconType });
};
