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
  // إعدادات Supabase
  supabaseUrl: getConfigValue('SUPABASE_URL', "https://altnvsolaqphpndyztup.supabase.co"),

  supabaseAnonKey: getConfigValue('SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaG5keXp0dXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzQxMDM5NSwiZXhwIjoyMDQzMDA5Mzk1fQ.test-anon-key"),

  // إعدادات Google OAuth
  googleClientId: getConfigValue('GOOGLE_CLIENT_ID', "170733685760-a1rgqkpr8sq4ktdki47iqtimjg55vc4o.apps.googleusercontent.com"),

  googleRedirectUri: getConfigValue('GOOGLE_REDIRECT_URI', "https://collect-pro.vercel.app/auth/v1/callback"),

  // إعدادات API
  apiEndpoint: getConfigValue('API_ENDPOINT', "/api"),

  // إعدادات الأمان
  csrfSecret: getConfigValue('CSRF_SECRET', "default-csrf-secret-change-in-production"),

  // إعدادات البريد الإلكتروني
  emailService: getConfigValue('EMAIL_SERVICE', "sendgrid"),
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
