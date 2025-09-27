// متغيرات البيئة للتطبيق (محملة من متغيرات البيئة)
window.ENV = {
  // إعدادات Supabase - استخدم متغيرات البيئة
  SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',

  // إعدادات Google OAuth - استخدم متغيرات البيئة
  GOOGLE_CLIENT_ID: import.meta.env?.VITE_GOOGLE_CLIENT_ID || 'placeholder-client-id-12345',
  GOOGLE_CLIENT_SECRET: import.meta.env?.VITE_GOOGLE_CLIENT_SECRET || 'placeholder-client-secret-abcdef',
  GOOGLE_REDIRECT_URI: import.meta.env?.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth-callback.html',

  // إعدادات البريد الإلكتروني - استخدم متغيرات البيئة
  EMAIL_SERVICE: import.meta.env?.VITE_EMAIL_SERVICE || 'sendgrid',
  EMAIL_USER: import.meta.env?.VITE_EMAIL_USER || 'your-email@domain.com',
  EMAIL_PASS: import.meta.env?.VITE_EMAIL_PASS || 'your-app-password',
  EMAIL_FROM: import.meta.env?.VITE_EMAIL_FROM || 'noreply@yourdomain.com',
  EMAIL_TO: import.meta.env?.VITE_EMAIL_TO || 'your-email@domain.com',

  // إعدادات الاستضافة - استخدم متغيرات البيئة
  HOSTING_DOMAIN: import.meta.env?.VITE_HOSTING_DOMAIN || 'localhost:8080',
  API_ENDPOINT: import.meta.env?.VITE_API_ENDPOINT || 'http://localhost:8080/api',

  // إعدادات الأمان - استخدم متغيرات البيئة
  CSRF_SECRET: import.meta.env?.VITE_CSRF_SECRET || 'your-csrf-secret-key-here',
  JWT_SECRET: import.meta.env?.VITE_JWT_SECRET || 'your-jwt-secret-key-here',

  // CDN - استخدم متغيرات البيئة
  CDN_ENABLED: import.meta.env?.VITE_CDN_ENABLED === 'true' || false,
  CDN_URL: import.meta.env?.VITE_CDN_URL || 'http://localhost:8080/cdn'
};

// دالة للحصول على متغير البيئة
function getEnv(key) {
  return window.ENV[key] || null;
}

// دالة لتحديث متغير البيئة (للمطورين)
function setEnv(key, value) {
  window.ENV[key] = value;
}

// للسماح باستخدام getEnv في نطاق عام
window.getEnv = getEnv;
window.setEnv = setEnv;