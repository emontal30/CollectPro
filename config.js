// config.js - ملف الإعدادات المحدث
// يستخدم process.env مباشرة بدلاً من getConfig

export const appConfig = {
  // إعدادات Supabase
  supabaseUrl: typeof process !== 'undefined' && process.env
    ? process.env.SUPABASE_URL || "https://your-project-id.supabase.co"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('SUPABASE_URL') || "https://your-project-id.supabase.co"
       : "https://your-project-id.supabase.co"),

  supabaseAnonKey: typeof process !== 'undefined' && process.env
    ? process.env.SUPABASE_ANON_KEY || "your-supabase-anon-key"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('SUPABASE_ANON_KEY') || "your-supabase-anon-key"
       : "your-supabase-anon-key"),

  // إعدادات Google OAuth
  googleClientId: typeof process !== 'undefined' && process.env
    ? process.env.GOOGLE_CLIENT_ID || "your-google-client-id"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('GOOGLE_CLIENT_ID') || "your-google-client-id"
       : "your-google-client-id"),

  // إعدادات API
  apiEndpoint: typeof process !== 'undefined' && process.env
    ? process.env.API_ENDPOINT || "/api"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('API_ENDPOINT') || "/api"
       : "/api"),

  // إعدادات الأمان
  csrfSecret: typeof process !== 'undefined' && process.env
    ? process.env.CSRF_SECRET || "default-csrf-secret-change-in-production"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('CSRF_SECRET') || "default-csrf-secret-change-in-production"
       : "default-csrf-secret-change-in-production"),

  // إعدادات البريد الإلكتروني
  emailService: typeof process !== 'undefined' && process.env
    ? process.env.EMAIL_SERVICE || "sendgrid"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('EMAIL_SERVICE') || "sendgrid"
       : "sendgrid"),
};

// دالة احتياطية للحصول على الإعدادات (للتوافق مع الكود القديم)
export function getConfig(key) {
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
}
