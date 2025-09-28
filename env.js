// متغيرات البيئة للتطبيق (محملة من متغيرات البيئة)
console.log('🔍 [DEBUG] تحميل متغيرات البيئة...');
console.log('🔍 [DEBUG] process.env متاح:', typeof process !== 'undefined' && process.env);

window.ENV = {
  // إعدادات Supabase - استخدم متغيرات البيئة
  SUPABASE_URL: (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) || 'https://your-project-id.supabase.co',
  SUPABASE_ANON_KEY: (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) || 'your-supabase-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: (typeof process !== 'undefined' && process.env && process.env.SUPABASE_SERVICE_ROLE_KEY) || 'your-service-role-key',

  // إعدادات Google OAuth - استخدم متغيرات البيئة
  GOOGLE_CLIENT_ID: (typeof process !== 'undefined' && process.env && process.env.GOOGLE_CLIENT_ID) || 'placeholder-client-id-12345',
  GOOGLE_CLIENT_SECRET: (typeof process !== 'undefined' && process.env && process.env.GOOGLE_CLIENT_SECRET) || 'placeholder-client-secret-abcdef',
  GOOGLE_REDIRECT_URI: (typeof process !== 'undefined' && process.env && process.env.GOOGLE_REDIRECT_URI) || (typeof window !== 'undefined' ? `${window.location.origin}/auth-callback.html` : null),

  // إعدادات البريد الإلكتروني - استخدم متغيرات البيئة
  EMAIL_SERVICE: (typeof process !== 'undefined' && process.env && process.env.EMAIL_SERVICE) || 'sendgrid',
  EMAIL_USER: (typeof process !== 'undefined' && process.env && process.env.EMAIL_USER) || 'your-email@domain.com',
  EMAIL_PASS: (typeof process !== 'undefined' && process.env && process.env.EMAIL_PASS) || 'your-app-password',
  EMAIL_FROM: (typeof process !== 'undefined' && process.env && process.env.EMAIL_FROM) || 'noreply@yourdomain.com',
  EMAIL_TO: (typeof process !== 'undefined' && process.env && process.env.EMAIL_TO) || 'your-email@domain.com',

  // إعدادات الاستضافة - استخدم متغيرات البيئة
  HOSTING_DOMAIN: (typeof process !== 'undefined' && process.env && process.env.HOSTING_DOMAIN) || 'localhost:8080',
  API_ENDPOINT: (typeof process !== 'undefined' && process.env && process.env.API_ENDPOINT) || 'http://localhost:8080/api',

  // إعدادات الأمان - استخدم متغيرات البيئة
  CSRF_SECRET: (typeof process !== 'undefined' && process.env && process.env.CSRF_SECRET) || 'your-csrf-secret-key-here',
  JWT_SECRET: (typeof process !== 'undefined' && process.env && process.env.JWT_SECRET) || 'your-jwt-secret-key-here',

  // CDN - استخدم متغيرات البيئة
  CDN_ENABLED: (typeof process !== 'undefined' && process.env && process.env.CDN_ENABLED === 'true') || false,
  CDN_URL: (typeof process !== 'undefined' && process.env && process.env.CDN_URL) || 'http://localhost:8080/cdn'
};

console.log('🔍 [DEBUG] window.ENV بعد التحميل:', {
  SUPABASE_URL: window.ENV.SUPABASE_URL,
  SUPABASE_ANON_KEY: window.ENV.SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
  GOOGLE_CLIENT_ID: window.ENV.GOOGLE_CLIENT_ID ? '[PRESENT]' : '[MISSING]',
  GOOGLE_REDIRECT_URI: window.ENV.GOOGLE_REDIRECT_URI
});

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