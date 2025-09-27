// config.js - ملف الإعدادات المحدث
// يستخدم process.env مباشرة بدلاً من getConfig

const appConfig = {
  // إعدادات Supabase
  supabaseUrl: typeof process !== 'undefined' && process.env
    ? process.env.SUPABASE_URL || "https://altnvsolaqphpndyztup.supabase.co"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('SUPABASE_URL') || "https://altnvsolaqphpndyztup.supabase.co"
       : "https://altnvsolaqphpndyztup.supabase.co"),

  supabaseAnonKey: typeof process !== 'undefined' && process.env
    ? process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaG5keXp0dXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzQxMDM5NSwiZXhwIjoyMDQzMDA5Mzk1fQ.test-anon-key"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaG5keXp0dXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzQxMDM5NSwiZXhwIjoyMDQzMDA5Mzk1fQ.test-anon-key"
       : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaG5keXp0dXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzQxMDM5NSwiZXhwIjoyMDQzMDA5Mzk1fQ.test-anon-key"),

  // إعدادات Google OAuth
  googleClientId: typeof process !== 'undefined' && process.env
    ? process.env.GOOGLE_CLIENT_ID || "170733685760-a1rgqkpr8sq4ktdki47iqtimjg55vc4o.apps.googleusercontent.com"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('GOOGLE_CLIENT_ID') || "170733685760-a1rgqkpr8sq4ktdki47iqtimjg55vc4o.apps.googleusercontent.com"
       : "170733685760-a1rgqkpr8sq4ktdki47iqtimjg55vc4o.apps.googleusercontent.com"),

  googleRedirectUri: typeof process !== 'undefined' && process.env
    ? process.env.GOOGLE_REDIRECT_URI || "https://collect-pro.vercel.app/auth/v1/callback"
    : (typeof window !== 'undefined' && window.getEnv
       ? window.getEnv('GOOGLE_REDIRECT_URI') || "https://collect-pro.vercel.app/auth/v1/callback"
       : "https://collect-pro.vercel.app/auth/v1/callback"),

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
