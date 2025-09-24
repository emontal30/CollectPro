// إعدادات التطبيق
const CONFIG = {
  // إعدادات Supabase
  supabase: {
    url: "https://your-supabase-url.supabase.co",
    anonKey: "your-supabase-anon-key"
  },
  // إعدادات Google
  google: {
    clientId: "your-google-client-id.apps.googleusercontent.com"
  },
  // إعدادات API
  api: {
    baseUrl: "https://api.yourservice.com"
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
