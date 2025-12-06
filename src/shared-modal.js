// shared-modal.js - Common modal functionality for CollectPro

/**
 * Shows a modal dialog with title, message, and optional callback
 * @param {string} title - The modal title
 * @param {string} message - The modal message (supports HTML)
 * @param {function} onConfirm - Optional callback function for confirm button
 * @param {string} confirmText - Text for confirm button (default: "موافق")
 * @param {string} cancelText - Text for cancel button (default: "إلغاء")
 * @param {boolean} showCancel - Whether to show cancel button (default: true)
 */
function showModal(title, message, onConfirm = null, confirmText = "موافق", cancelText = "إلغاء", showCancel = true) {
  // Remove any existing modal
  const existingModal = document.getElementById('shared-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'shared-modal';
  modal.className = 'shared-modal-overlay';
  modal.innerHTML = `
    <div class="shared-modal">
      <div class="shared-modal-header">
        <h3>${title}</h3>
        <button class="shared-modal-close" aria-label="إغلاق">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="shared-modal-body">
        <p>${message}</p>
      </div>
      <div class="shared-modal-footer">
        ${showCancel ? `<button class="shared-modal-btn shared-modal-cancel">${cancelText}</button>` : ''}
        <button class="shared-modal-btn shared-modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.appendChild(modal);

  // Get elements
  const closeBtn = modal.querySelector('.shared-modal-close');
  const cancelBtn = modal.querySelector('.shared-modal-cancel');
  const confirmBtn = modal.querySelector('.shared-modal-confirm');

  // Show modal with animation
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });

  // Function to close modal
  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 300);
  }

  // Event listeners
  closeBtn.addEventListener('click', closeModal);
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  confirmBtn.addEventListener('click', () => {
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    }
    closeModal();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  return modal;
}

/**
 * Shows a simple confirmation dialog
 * @param {string} message - The confirmation message
 * @param {function} onConfirm - Callback function for confirm action
 * @param {string} title - Dialog title (default: "تأكيد")
 */
function showConfirm(message, onConfirm, title = "تأكيد") {
  return showModal(title, message, onConfirm, "نعم", "لا", true);
}

/**
 * Shows an alert dialog
 * @param {string} message - The alert message
 * @param {string} title - Dialog title (default: "تنبيه")
 * @param {function} onClose - Optional callback for close action
 */
function showAlertModal(message, title = "تنبيه", onClose = null) {
  return showModal(title, message, onClose, "موافق", null, false);
}

// Export functions for use in other modules
window.showModal = showModal;
window.showConfirm = showConfirm;
window.showAlertModal = showAlertModal;

// console.log('Shared modal system loaded'); // Removed for production

// Add log when modal is shown
const originalShowModal = showModal;
window.showModal = function(...args) {
    // console.log('Modal shown with args:', args); // Removed for production
    return originalShowModal.apply(this, args);
};
