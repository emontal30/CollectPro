// ========== وحدة تسجيل الأخطاء ========== //

// تسجيل خطأ
async function logError(error, context = {}) {
  try {
    const config = window.AppConfig || {};
    const supabaseUrl = config.supabase?.url;
    const supabaseAnonKey = config.supabase?.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('إعدادات Supabase غير مكتملة لتسجيل الأخطاء');
      return;
    }

    const user = checkUserSession();

    const errorData = {
      error_message: error.message || String(error),
      error_stack: error.stack || '',
      user_id: user ? user.id : null,
      page_url: window.location.href,
      ip_address: 'unknown',
      user_agent: navigator.userAgent,
      context: JSON.stringify(context),
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(errorData)
    });

    if (!response.ok) {
      console.error('فشل تسجيل الخطأ:', error);
    }
  } catch (loggingError) {
    console.error('خطأ في تسجيل الخطأ:', loggingError);
  }
}

// معالج الأخطاء العام
window.addEventListener('error', (event) => {
  logError(event.error, {
    type: 'javascript_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// معالج الأخطاء غير الملتقمة (Promise rejections)
window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, {
    type: 'promise_rejection'
  });
});

// تسجيل أخطاء API
async function logApiError(endpoint, error, requestData = {}) {
  await logError(error, {
    type: 'api_error',
    endpoint: endpoint,
    requestData: requestData
  });
}

// تسجيل أخطاء المصادقة
async function logAuthError(error, action) {
  await logError(error, {
    type: 'auth_error',
    action: action
  });
}

// تسجيل أخطاء التحقق من الصلاحيات
async function logPermissionError(requiredPermission) {
  await logError(new Error('نقص في الصلاحيات'), {
    type: 'permission_error',
    required_permission: requiredPermission
  });
}

// تسجيل أخطاء النسخ الاحتياطي
async function logBackupError(error, backupType) {
  await logError(error, {
    type: 'backup_error',
    backup_type: backupType
  });
}

// تسجيل أخطاء الأداء
async function logPerformanceError(metric, value, threshold) {
  await logError(new Error('مشكلة في الأداء'), {
    type: 'performance_error',
    metric: metric,
    value: value,
    threshold: threshold
  });
}

// تسجيل أخطاء التحقق من الصحة
async function logValidationError(field, value, rule) {
  await logError(new Error('فشل التحقق من الصحة'), {
    type: 'validation_error',
    field: field,
    value: value,
    rule: rule
  });
}

// تسجيل أخطاء الشبكة
async function logNetworkError(endpoint, status, statusText) {
  await logError(new Error('خطأ في الشبكة'), {
    type: 'network_error',
    endpoint: endpoint,
    status: status,
    statusText: statusText
  });
}

// تسجيل أخطاء التخزين
async function logStorageError(operation, key, error) {
  await logError(error, {
    type: 'storage_error',
    operation: operation,
    key: key
  });
}

// تسجيل أخطاء UI
async function logUIError(component, action, error) {
  await logError(error, {
    type: 'ui_error',
    component: component,
    action: action
  });
}

// تسجيل أخطاء الأمان
async function logSecurityError(type, details) {
  await logError(new Error('مشكلة أمنية'), {
    type: 'security_error',
    security_type: type,
    details: details
  });
}

// تسجيل أخطاء الأعمال
async function logBusinessError(type, details) {
  await logError(new Error('مشكلة في منطق الأعمال'), {
    type: 'business_error',
    business_type: type,
    details: details
  });
}

// تصدير وحدة تسجيل الأخطاء
window.ErrorLogger = {
  logError,
  logApiError,
  logAuthError,
  logPermissionError,
  logBackupError,
  logPerformanceError,
  logValidationError,
  logNetworkError,
  logStorageError,
  logUIError,
  logSecurityError,
  logBusinessError
};
