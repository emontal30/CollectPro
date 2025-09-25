// إعدادات التطبيق
// يمكن تحديث هذه القيم من متغيرات البيئة في ملف .env
const CONFIG = {
  // إعدادات Supabase - احصل عليها من https://supabase.com
  supabase: {
    url: getEnv('SUPABASE_URL') || "https://your-project-id.supabase.co", // استبدل بـ URL مشروعك
    anonKey: getEnv('SUPABASE_ANON_KEY') || "your-supabase-anon-key", // استبدل بـ anon key من مشروعك
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY') || "your-service-role-key"
  },
  // إعدادات API
  api: {
    baseUrl: getEnv('API_ENDPOINT') || "https://api.yourservice.com" // استبدل بعنوان API الخاص بك
  },
  // إعدادات الأمان
  security: {
    csrfToken: getEnv('CSRF_SECRET') || "default-csrf-secret-change-in-production",
    jwtSecret: getEnv('JWT_SECRET') || "default-jwt-secret-change-in-production"
  },
  // إعدادات البريد الإلكتروني
  email: {
    service: getEnv('EMAIL_SERVICE') || "sendgrid",
    apiKey: getEnv('EMAIL_API_KEY') || "your-email-api-key",
    from: getEnv('EMAIL_FROM') || "noreply@yourdomain.com"
  }
};


// دالة الحصول على الإعدادات
function getConfig(key) {
  // تقسيم المفتاح (مثال: "supabase.url" -> ["supabase", "url"])
  const parts = key.split('.');

  // البدء من الكائن الرئيسي
  let result = CONFIG;

  // التنقل عبر الأجزاء
  for (const part of parts) {
    // إذا كان الجزء موجود، انتقل إليه
    if (result && typeof result === 'object' && part in result) {
      result = result[part];
    } else {
      // إذا لم يكن موجود، أرجع قيمة فارغة
      return null;
    }
  }

  return result;
}


// للسماح باستخدام getConfig في نطاق عام
window.getConfig = getConfig;
