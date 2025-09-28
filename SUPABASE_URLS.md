# إعداد عناوين Supabase - العناوين الصحيحة

## 📍 العناوين المطلوبة في Supabase Dashboard

### 1. Site URL (الرئيسي)
```
https://collect-pro.vercel.app
```

### 2. Redirect URLs (للمصادقة)
أضف هذه العناوين في قسم "Redirect URLs" في إعدادات المصادقة:

#### للإنتاج (Vercel):
```
https://collect-pro.vercel.app/auth-callback.html
```

#### للتطوير المحلي:
```
http://localhost:3000/auth-callback.html
http://localhost:8000/auth/callback.html
```

## ⚡ خطوات سريعة لإعداد Supabase:

### 1. اذهب إلى Supabase Dashboard
- اختر مشروعك
- اذهب إلى **Authentication** > **Settings**

### 2. أضف Site URL
- في قسم **URL Configuration**
- أضف: `https://collect-pro.vercel.app`

### 3. أضف Redirect URLs
- في نفس القسم، أضف العناوين التالية:
  ```
  https://collect-pro.vercel.app/auth-callback.html
  http://localhost:3000/auth-callback.html
  http://localhost:8000/auth/callback.html
  ```

### 4. تفعيل Google Provider
- اذهب إلى **Authentication** > **Providers**
- فعّل **Google Provider**
- أضف:
  - **Client ID**: `your-google-client-id`
  - **Client Secret**: `your-google-client-secret`
  - **Redirect URLs**: نفس العناوين أعلاه

## ✅ التحقق من الإعدادات:

### في Supabase Dashboard:
- تأكد من أن جميع العناوين تظهر في القائمة الخضراء
- تأكد من أن Google Provider مفعل ومحدث

### في Google Cloud Console:
- اذهب إلى Google Cloud Console
- تأكد من أن redirect URIs تطابق ما أضفته في Supabase

## 🎯 الآن يمكنك:
1. **نشر المشروع على Vercel** ✅
2. **إعداد Google OAuth في Supabase** ✅
3. **اختبار تسجيل الدخول** ✅

**العناوين جاهزة ومُحدثة في جميع ملفات المشروع!** 🎉