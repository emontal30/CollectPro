# إعداد Google OAuth ووضع الاختبار

## نظرة عامة
تم إعداد النظام بحيث يمكن التحكم في Google OAuth ووضع الاختبار من خلال متغيرات البيئة.

## متغيرات البيئة المتعلقة بـ Google OAuth

### 1. تعطيل Google OAuth
```env
DISABLE_GOOGLE_OAUTH=true
```
- `true`: يعطل Google OAuth ويستخدم وضع الاختبار
- `false`: يفعل Google OAuth (الافتراضي)

### 2. وضع الاختبار العام
```env
TEST_MODE=true
```
- `true`: يفعل وضع الاختبار لجميع الميزات
- `false`: وضع الإنتاج (الافتراضي)

## كيفية عمل النظام

### في وضع التطوير (المحلي)
- إذا كانت إعدادات Supabase غير مكتملة، سيعود النظام تلقائياً إلى وضع الاختبار
- يمكنك اختبار تسجيل الدخول بـ Google دون الحاجة لإعدادات حقيقية

### في وضع الإنتاج (Vercel)
- تأكد من تعيين `DISABLE_GOOGLE_OAUTH=false` لتفعيل Google OAuth
- تأكد من أن جميع إعدادات Supabase و Google OAuth صحيحة
- إذا أردت تعطيل Google OAuth في الإنتاج، عيّن `DISABLE_GOOGLE_OAUTH=true`

## خطوات إعداد Google OAuth للإنتاج

### 1. إعداد Google Cloud Console
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر موجود
3. فعّل Google+ API
4. أنشئ OAuth 2.0 credentials
5. أضف redirect URI: `https://collect-pro.vercel.app/auth-callback.html`

### 2. إعداد Supabase
1. اذهب إلى Supabase Dashboard
2. اختر مشروعك
3. اذهب إلى Authentication > Providers
4. فعّل Google Provider
5. أدخل Client ID و Client Secret
6. أضف redirect URL: `https://collect-pro.vercel.app/auth-callback.html`

### 3. تحديث متغيرات البيئة في Vercel
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://collect-pro.vercel.app/auth-callback.html
DISABLE_GOOGLE_OAUTH=false
TEST_MODE=false
```

## التحقق من الإعدادات

### في وضع التطوير
- افتح أدوات المطور (F12)
- اذهب إلى Console
- ستجد رسائل debug تظهر حالة الإعدادات

### في وضع الإنتاج
- إذا كان Google OAuth معطلاً، سيظهر زر "تسجيل الدخول بحساب Google" في وضع الاختبار
- إذا كان مفعلاً، سيتم إعادة توجيه المستخدم إلى Google للمصادقة

## استكشاف الأخطاء

### مشكلة: Google OAuth لا يعمل في الإنتاج
1. تأكد من أن `DISABLE_GOOGLE_OAUTH=false`
2. تأكد من أن `TEST_MODE=false`
3. تحقق من إعدادات Supabase و Google OAuth
4. تأكد من أن redirect URI صحيح

### مشكلة: Google OAuth يعمل في وضع الاختبار
1. هذا متوقع - في وضع الاختبار، يتم تجاوز Google OAuth
2. لتعطيل وضع الاختبار، عيّن `TEST_MODE=false` و `DISABLE_GOOGLE_OAUTH=false`

## الأمان
- لا تشارك Client Secret في الأماكن العامة
- استخدم HTTPS فقط في الإنتاج
- راجع إعدادات OAuth بانتظام