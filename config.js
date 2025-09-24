// إعدادات التطبيق
// يمكن تحديث هذه القيم من متغيرات البيئة في ملف .env
const CONFIG = {
  // إعدادات Supabase - احصل عليها من https://supabase.com
  supabase: {
    url: process.env.SUPABASE_URL || "https://your-project-id.supabase.co", // استبدل بـ URL مشروعك
    anonKey: process.env.SUPABASE_ANON_KEY || "your-supabase-anon-key" // استبدل بـ anon key من مشروعك
  },
  // إعدادات Google - احصل عليها من https://console.cloud.google.com
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com" // استبدل بـ Client ID من Google Console
  },
  // إعدادات API
  api: {
    baseUrl: process.env.API_ENDPOINT || "https://api.yourservice.com" // استبدل بعنوان API الخاص بك
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

/*
  تعليمات إعداد تسجيل الدخول بجوجل:

  1. إعداد Supabase:
     - اذهب إلى https://supabase.com
     - أنشئ مشروع جديد أو استخدم مشروع موجود
     - اذهب إلى Settings > API
     - انسخ Project URL وضعه في supabase.url
     - انسخ anon/public key وضعه في supabase.anonKey

  2. إعداد Google OAuth:
     - اذهب إلى https://console.cloud.google.com
     - أنشئ مشروع جديد أو استخدم مشروع موجود
     - فعل Google+ API
     - اذهب إلى Credentials > Create Credentials > OAuth 2.0 Client IDs
     - أضف المجالات المسموحة (Authorized JavaScript origins):
       * http://localhost:3000 (للتطوير المحلي)
       * https://yourdomain.com (للإنتاج)
     - أضف URIs المعاد توجيهها (Authorized redirect URIs):
       * http://localhost:3000/dashboard (للتطوير المحلي)
       * https://yourdomain.com/dashboard (للإنتاج)
     - انسخ Client ID وضعه في google.clientId

  3. تفعيل المصادقة في Supabase:
     - اذهب إلى Authentication > Providers
     - فعل Google provider
     - أضف Google Client ID و Client Secret
     - احفظ التغييرات

  4. تحديث ملف .env (إنشاء إذا لم يكن موجود):
     SUPABASE_URL=your-supabase-url
     SUPABASE_ANON_KEY=your-supabase-anon-key
     GOOGLE_CLIENT_ID=your-google-client-id
*/

// للسماح باستخدام getConfig في نطاق عام
window.getConfig = getConfig;
