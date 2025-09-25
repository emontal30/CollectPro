// متغيرات البيئة للتطبيق (محملة من ملف .env)
window.ENV = {
  // إعدادات Supabase - احصل عليها من https://supabase.com
  SUPABASE_URL: 'https://your-project-id.supabase.co', // استبدل بـ URL مشروعك
  SUPABASE_ANON_KEY: 'your-actual-anon-key', // استبدل بـ anon key من مشروعك
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key', // استبدل بـ service role key من مشروعك

  // إعدادات البريد الإلكتروني
  EMAIL_SERVICE: 'sendgrid',
  EMAIL_API_KEY: 'your-email-api-key',
  EMAIL_FROM: 'noreply@yourdomain.com',

  // إعدادات الاستضافة
  HOSTING_DOMAIN: 'localhost:3000',
  API_ENDPOINT: 'https://api.yourservice.com',

  // إعدادات الأمان
  CSRF_SECRET: 'your-csrf-secret-key-here',
  JWT_SECRET: 'your-jwt-secret-key-here',

  // CDN
  CDN_ENABLED: false,
  CDN_URL: 'https://cdn.yourdomain.com'
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