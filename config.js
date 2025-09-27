// config.js - ملف الإعدادات المحدث
// يستخدم process.env مباشرة بدلاً من getConfig

// دالة مساعدة للحصول على قيمة الإعدادات
function getConfigValue(envKey, defaultValue) {
  // في بيئة Node.js (Server-side)
  if (typeof process !== 'undefined' && process.env && process.env[envKey]) {
    return process.env[envKey];
  }

  // في المتصفح (Client-side)
  if (typeof window !== 'undefined') {
    // انتظر حتى يتم تحميل env.js
    if (typeof window.getEnv === 'function') {
      const envValue = window.getEnv(envKey);
      if (envValue) return envValue;
    }

    // قيم احتياطية للتطوير المحلي
    if (typeof window.ENV === 'object' && window.ENV[envKey]) {
      return window.ENV[envKey];
    }
  }

  return defaultValue;
}

const appConfig = {
  // إعدادات Supabase - استخدم متغيرات البيئة
  supabaseUrl: getConfigValue('SUPABASE_URL', "https://your-project-id.supabase.co"),
  supabaseAnonKey: getConfigValue('SUPABASE_ANON_KEY', "your-supabase-anon-key"),

  // إعدادات Google OAuth - استخدم متغيرات البيئة
  googleClientId: getConfigValue('GOOGLE_CLIENT_ID', "your-google-client-id"),
  googleRedirectUri: getConfigValue('GOOGLE_REDIRECT_URI', typeof window !== 'undefined' ? `${window.location.origin}/auth-callback.html` : null),

  // إعدادات API - استخدم متغيرات البيئة
  apiEndpoint: getConfigValue('API_ENDPOINT', "/api"),

  // إعدادات الأمان - استخدم متغيرات البيئة
  csrfSecret: getConfigValue('CSRF_SECRET', "default-csrf-secret-change-in-production"),

  // إعدادات البريد الإلكتروني - استخدم متغيرات البيئة
  emailService: getConfigValue('EMAIL_SERVICE', "sendgrid"),
  emailUser: getConfigValue('EMAIL_USER', "your-email@domain.com"),
  emailPass: getConfigValue('EMAIL_PASS', "your-app-password"),
  emailFrom: getConfigValue('EMAIL_FROM', "noreply@yourdomain.com"),
  emailTo: getConfigValue('EMAIL_TO', "your-email@domain.com"),
};

// دالة احتياطية للحصول على الإعدادات (للتوافق مع الكود القديم)
function getConfig(key) {
  if (typeof window !== 'undefined' && window.getEnv) {
    // استخدام getEnv الموجودة
    const keys = key.split('.');
    if (keys.length === 2) {
      const [category, setting] = keys;
      switch (category) {
        case 'supabase':
          if (setting === 'url') return appConfig.supabaseUrl;
          if (setting === 'anonKey') return appConfig.supabaseAnonKey;
          break;
        case 'api':
          if (setting === 'baseUrl') return appConfig.apiEndpoint;
          break;
      }
    }
  }

  // قيم افتراضية
  const defaults = {
    'supabase.url': appConfig.supabaseUrl,
    'supabase.anonKey': appConfig.supabaseAnonKey,
    'api.baseUrl': appConfig.apiEndpoint,
  };

  return defaults[key] || null;
}

// للتوافق مع الكود القديم
if (typeof window !== 'undefined') {
  window.getConfig = getConfig;
  window.appConfig = appConfig;
}
