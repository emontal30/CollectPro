import { ref } from 'vue';
import Swal from 'sweetalert2';

// نظام موحد احترافي للرسائل والإشعارات
export function useNotifications() {
  const notifications = ref([]);

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

    // إزالة الإشعار تلقائياً
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  // إزالة إشعار
  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  // رسالة تأكيد موحدة
  const confirm = async (options) => {
    const defaultOptions = {
      title: 'تأكيد',
      text: 'هل أنت متأكد؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#007965',
      cancelButtonColor: '#6c757d',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: false,
      allowEscapeKey: true,
      ...options
    };

    return await Swal.fire(defaultOptions);
  };

  // رسالة نجاح محسنة
  const success = (message, title = 'تم بنجاح') => {
    return Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#28a745',
      timer: 3000,
      timerProgressBar: true,
      allowOutsideClick: false
    });
  };

  // رسالة خطأ محسنة
  const error = (message, title = 'خطأ', options = {}) => {
    const defaultOptions = {
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: false,
      footer: options.suggestion ? `<small class="error-footer">${options.suggestion}</small>` : null,
      ...options
    };

    return Swal.fire(defaultOptions);
  };

  // رسالة تحذير محسنة
  const warning = (message, title = 'تحذير') => {
    return Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#ffc107',
      confirmButtonTextColor: '#000',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: false
    });
  };

  // رسالة معلومات محسنة
  const info = (message, title = 'معلومات') => {
    return Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#17a2b8',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: false
    });
  };

  // نافذة منبثقة للتفاصيل
  const showDetails = (title, html, options = {}) => {
    return Swal.fire({
      title,
      html,
      width: '600px',
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#007965',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: false,
      ...options
    });
  };

  // رسالة تحميل بدون زر
  const loading = (message = 'جاري المعالجة...') => {
    return Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      backdrop: 'rgba(0,0,0,0.4)',
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  // شريط تقدم محسن (للعمليات الطويلة)
  const progressBar = (message = 'جاري المعالجة...', onClose = null) => {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      backdrop: 'rgba(0,0,0,0.4)',
      didOpen: () => {
        Swal.showLoading();
      },
      willClose: () => {
        if (onClose) onClose();
      }
    });
  };

  // إغلاق رسالة التحميل
  const closeLoading = () => {
    Swal.close();
  };

  // رسائل محددة للعمليات الشائعة
  const messages = {
    // رسائل الحفظ
    save: {
      success: (item = 'البيانات') => {
        addNotification(`✅ تم حفظ ${item} بنجاح`, 'success', 3000);
      },
      error: (item = 'البيانات') => {
        addNotification(`❌ فشل في حفظ ${item}`, 'error', 4000);
      },
      loading: () => progressBar('جاري الحفظ...')
    },

    // رسائل الحذف
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

    // رسائل الأرشفة
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

    // رسائل التفعيل
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

    // رسائل التصدير
    export: {
      success: (type = 'البيانات') => {
        addNotification(`✅ تم تصدير ${type} بنجاح`, 'success', 3000);
      },
      error: (type = 'البيانات') => {
        addNotification(`❌ فشل في تصدير ${type}`, 'error', 4000);
      }
    },

    // رسائل تسجيل الخروج
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