import { ref } from 'vue';
import Swal from 'sweetalert2';

// Global state to share notifications across all usages (Singleton Pattern)
const globalNotifications = ref([]);

// نظام موحد احترافي للرسائل والإشعارات
export function useNotifications() {
  // Use the global state
  const notifications = globalNotifications;

  // وظيفة داخلية لتحديد سمة الرسالة بناءً على الوضع الحالي
  const getAlertTheme = () => {
    const isDark = document.body.classList.contains('dark') ||
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';

    return {
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#1e293b',
      confirmButtonColor: '#007965',
      customClass: {
        popup: isDark ? 'dark-alert-popup' : '',
        title: isDark ? 'dark-alert-title' : '',
        htmlContainer: isDark ? 'dark-alert-text' : ''
      }
    };
  };

  // إضافة إشعار جديد (للإشعارات البسيطة فقط)
  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      duration,
      show: true
    };

    notifications.value.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  // رسالة تأكيد موحدة
  const confirm = async (options) => {
    const theme = getAlertTheme();
    const defaultOptions = {
      title: 'تأكيد',
      text: 'هل أنت متأكد؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: theme.confirmButtonColor,
      cancelButtonColor: '#64748b',
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      allowOutsideClick: false,
      allowEscapeKey: true,
      customClass: theme.customClass,
      ...options
    };

    return await Swal.fire(defaultOptions);
  };

  // رسالة نجاح محسنة
  const success = (message, title = 'تم بنجاح') => {
    const theme = getAlertTheme();
    return Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#10b981',
      background: theme.background,
      color: theme.color,
      timer: 3000,
      timerProgressBar: true,
      allowOutsideClick: false,
      customClass: theme.customClass
    });
  };

  // رسالة خطأ محسنة
  const error = (message, title = 'خطأ', options = {}) => {
    const theme = getAlertTheme();
    const defaultOptions = {
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#ef4444',
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      allowOutsideClick: false,
      footer: options.suggestion ? `<small class="error-footer">${options.suggestion}</small>` : null,
      customClass: theme.customClass,
      ...options
    };

    return Swal.fire(defaultOptions);
  };

  // رسالة تحذير محسنة
  const warning = (message, title = 'تحذير') => {
    const theme = getAlertTheme();
    return Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#f59e0b',
      confirmButtonTextColor: '#fff',
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      allowOutsideClick: false,
      customClass: theme.customClass
    });
  };

  // رسالة معلومات محسنة
  const info = (message, title = 'معلومات') => {
    const theme = getAlertTheme();
    return Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#3b82f6',
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      allowOutsideClick: false,
      customClass: theme.customClass
    });
  };

  const showDetails = (title, html, options = {}) => {
    const theme = getAlertTheme();
    return Swal.fire({
      title,
      html,
      width: '600px',
      confirmButtonText: 'إغلاق',
      confirmButtonColor: theme.confirmButtonColor,
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      allowOutsideClick: false,
      customClass: theme.customClass,
      ...options
    });
  };

  const loading = (message = 'جاري المعالجة...') => {
    const theme = getAlertTheme();
    return Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  const progressBar = (message = 'جاري المعالجة...', onClose = null) => {
    const theme = getAlertTheme();
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: theme.background,
      color: theme.color,
      backdrop: 'rgba(0,0,0,0.5)',
      didOpen: () => {
        Swal.showLoading();
      },
      willClose: () => {
        if (onClose) onClose();
      }
    });
  };

  const closeLoading = () => {
    Swal.close();
  };

  const messages = {
    save: {
      success: (item = 'البيانات') => {
        addNotification(`✅ تم حفظ ${item} بنجاح`, 'success', 3000);
      },
      error: (item = 'البيانات') => {
        addNotification(`❌ فشل في حفظ ${item}`, 'error', 4000);
      },
      loading: () => progressBar('جاري الحفظ...')
    },
    delete: {
      confirm: (item = 'العنصر') => confirm({
        title: 'تأكيد الحذف',
        text: `هل أنت متأكد من حذف ${item}؟`,
        icon: 'warning',
        confirmButtonText: 'حذف',
        confirmButtonColor: '#dc3545'
      }),
      success: (item = 'العنصر') => {
        addNotification(`✅ تم حذف ${item} بنجاح`, 'success', 3000);
      },
      error: (item = 'العنصر') => {
        addNotification(`❌ فشل في حذف ${item}`, 'error', 4000);
      }
    },
    archive: {
      confirm: (date) => confirm({
        title: 'تأكيد الأرشفة',
        text: `هل أنت متأكد من أرشفة بيانات ${date}؟`,
        icon: 'question'
      }),
      success: () => {
        addNotification('✅ تم الأرشفة بنجاح', 'success', 3000);
      },
      error: () => {
        addNotification('❌ فشل في الأرشفة', 'error', 4000);
      }
    },
    activate: {
      confirm: (user, days) => confirm({
        title: 'تأكيد التفعيل',
        text: `هل أنت متأكد من تفعيل اشتراك لمدة ${days} يوم للمستخدم ${user}؟`,
        icon: 'question'
      }),
      success: () => {
        addNotification('✅ تم تفعيل الاشتراك بنجاح', 'success', 3000);
      },
      error: () => {
        addNotification('❌ فشل في تفعيل الاشتراك', 'error', 4000);
      }
    },
    export: {
      success: (type = 'البيانات') => {
        addNotification(`✅ تم تصدير ${type} بنجاح`, 'success', 3000);
      },
      error: (type = 'البيانات') => {
        addNotification(`❌ فشل في تصدير ${type}`, 'error', 4000);
      }
    },
    logout: {
      confirm: () => confirm({
        title: 'تأكيد تسجيل الخروج',
        text: 'هل أنت متأكد من تسجيل الخروج؟',
        icon: 'question'
      })
    }
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    confirm,
    success,
    error,
    warning,
    info,
    showDetails,
    loading,
    progressBar,
    closeLoading,
    messages
  };
}