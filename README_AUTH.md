# نظام المصادقة - CollectPro

## نظرة عامة

تم تطوير نظام مصادقة شامل وآمن لتطبيق CollectPro يدعم:

- **تسجيل الدخول بالبريد الإلكتروني وكلمة المرور**
- **تسجيل الدخول بحساب Google عبر Supabase**
- **إدارة الجلسات الآمنة**
- **حماية من انتهاء صلاحية الجلسة**
- **دعم PWA (Progressive Web App)**

## المكونات الرئيسية

### 1. ملفات المصادقة

#### `auth-callback.html`
صفحة معالجة الرجوع من Google OAuth. تتعامل مع:
- استرجاع جلسة Supabase بعد المصادقة
- حفظ بيانات المستخدم في localStorage
- إعادة توجيه المستخدم للصفحة المناسبة
- عرض رسائل خطأ واضحة
- إمكانية إعادة المحاولة في حالة الفشل

#### `supabaseClient.js`
عميل Supabase المركزي يوفر:
- إعداد عميل Supabase مع التكوين الصحيح
- دعم PKCE للأمان المعزز
- إدارة الجلسات التلقائية
- معالجة الأخطاء الشاملة

#### `auth.js`
نظام إدارة الجلسات يدعم:
- حفظ وفك تشفير بيانات المستخدم
- التحقق من صحة الجلسات
- دعم جلسات Supabase الجديدة
- مسح البيانات بشكل آمن

#### `login.js`
واجهة تسجيل الدخول تتضمن:
- نماذج تسجيل الدخول بالبريد الإلكتروني
- تكامل Google OAuth
- التحقق من صحة البيانات
- إدارة حالات الخطأ

### 2. ملفات التكوين

#### `config.js`
نظام التكوين المركزي:
- تحميل متغيرات البيئة بشكل آمن
- دعم ES6 modules
- نظام fallback للبيئات المختلفة

#### `env.js`
إدارة متغيرات البيئة:
- تحميل التكوين من ملفات مختلفة
- دعم البيئات المحلية والإنتاجية

## كيفية الاستخدام

### 1. إعداد Supabase

1. **إنشاء مشروع Supabase**:
   - انتقل إلى [supabase.com](https://supabase.com)
   - أنشئ مشروع جديد
   - احصل على URL المشروع ومفتاح API

2. **تكوين Google OAuth**:
   - في Dashboard Supabase، انتقل إلى Authentication > Providers
   - فعل Google provider
   - أضف Client ID و Client Secret من Google Console

3. **تحديث متغيرات البيئة**:
   ```bash
   # نسخ ملف المثال
   cp .env.example .env.local

   # تحديث القيم
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 2. تكامل Google OAuth

#### خطوات المصادقة:

1. **المستخدم ينقر على "تسجيل الدخول بحساب Google"**
2. **يتم توجيهه إلى Google للمصادقة**
3. **بعد الموافقة، يعود إلى `auth-callback.html`**
4. **النظام يتحقق من الجلسة ويحفظ البيانات**
5. **إعادة توجيه المستخدم للصفحة الرئيسية**

#### مسار URL المطلوب:

```
https://your-domain.com/auth-callback.html
```

### 3. إدارة الجلسات

#### أنواع البيانات المحفوظة:

```javascript
// بيانات Supabase الجديدة
{
  id: "user-id",
  email: "user@example.com",
  name: "اسم المستخدم",
  avatar: "avatar-url",
  provider: "google",
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_at: 1234567890,
  login_time: "2024-01-01T00:00:00.000Z"
}

// بيانات النظام القديم
{
  id: "user-id",
  name: "اسم المستخدم",
  email: "user@example.com",
  token: "access-token",
  provider: "email|google"
}
```

### 4. معالجة الأخطاء

#### أنواع الأخطاء المدعومة:

1. **أخطاء التكوين**:
   - إعدادات Supabase غير صحيحة
   - متغيرات البيئة مفقودة

2. **أخطاء OAuth**:
   - رفض الوصول من Google
   - مشاكل في Client ID/Secret

3. **أخطاء الجلسة**:
   - انتهاء صلاحية الجلسة
   - tokens غير صالحة

4. **أخطاء الشبكة**:
   - مشاكل الاتصال
   - timeout في العمليات

## الأمان

### 1. تشفير البيانات
- استخدام base64 للتشفير البسيط
- حماية من التلاعب بالبيانات

### 2. إدارة الجلسات
- تحقق تلقائي من صلاحية الجلسة
- مسح تلقائي للبيانات منتهية الصلاحية
- timeout للعمليات الحساسة

### 3. حماية CSRF
- استخدام CSRF tokens
- التحقق من مصدر الطلبات

## استكشاف الأخطاء

### 1. مشاكل Google OAuth

**المشكلة**: "Invalid client" أو "redirect_uri_mismatch"

**الحل**:
1. تأكد من إعداد Google OAuth في Supabase
2. تحقق من Site URL في إعدادات Supabase
3. تأكد من أن `auth-callback.html` متاح على النطاق الصحيح

### 2. مشاكل الجلسة

**المشكلة**: "Session not found" أو "Invalid session"

**الحل**:
1. تحقق من إعدادات Supabase
2. تأكد من صحة API keys
3. فحص console للأخطاء التفصيلية

### 3. مشاكل PWA

**المشكلة**: عدم عمل الميزات offline

**الحل**:
1. تأكد من تثبيت Service Worker
2. فحص إعدادات manifest.json
3. تحقق من HTTPS أو localhost

### 4. مشكلة عدم ظهور الصور بعد النشر

**المشكلة**: الصور تظهر محلياً لكنها تختفي بعد النشر على Vercel

**الحلول**:

1. **فحص ملف .vercelignore**:
   ```text
   # إذا كان يحتوي على:
   public  # ❌ هذا يمنع نشر مجلد public

   # يجب أن يكون:
   # public (مجلد public مطلوب للصور والأصول الثابتة)
   ```

2. **فحص مسارات Service Worker**:
   ```javascript
   // في sw.js - يجب أن يكون:
   const STATIC_ASSETS = [
     'logoapp.png',      // ✅ بدون public/
     'logo-momkn.png'    // ✅ بدون public/
   ];
   ```

3. **فحص مسارات HTML**:
   ```html
   <!-- ✅ صحيح -->
   <img src="/logo-momkn.png" alt="شعار" />

   <!-- ❌ خاطئ -->
   <img src="/images/logo-momkn.png" alt="شعار" />
   ```

4. **خطوات التشخيص**:
   - افتح Developer Tools → Network
   - ابحث عن طلبات الصور (PNG/JPG)
   - إذا كان الوضع 404، فهناك مشكلة في المسار
   - تحقق من أن الملفات موجودة في مجلد public/

5. **للنشر على Vercel**:
   - ادفع التغييرات لـ GitHub
   - أعد نشر المشروع على Vercel
   - تحقق من أن مجلد public/ يظهر في deployment

## التطوير والاختبار

### 1. الوضع المحلي

```bash
# تشغيل الخادم المحلي
python -m http.server 8000

# أو
npx serve .

# الوصول للتطبيق
http://localhost:8000
```

### 2. اختبار OAuth محلياً

1. استخدم ngrok للنفق المحلي:
```bash
ngrok http 8000
```

2. أضف رابط ngrok إلى Site URL في Supabase

3. اختبر عملية OAuth الكاملة

### 3. فحص الأخطاء

افتح Developer Tools وانتقل إلى:
- **Console**: للأخطاء JavaScript
- **Network**: لفحص طلبات API
- **Application**: لفحص localStorage/sessionStorage

## النشر

### 1. متطلبات النشر

- **HTTPS**: مطلوب لـ PWA و OAuth
- **نطاق مخصص**: للإنتاج
- **إعدادات Supabase**: محدثة للنطاق الجديد

### 2. حل مشكلة الصور بعد النشر

**المشكلة الشائعة**: عدم ظهور الصور بعد النشر على Vercel

**الأسباب والحلول**:

1. **مسارات الصور**:
   ```html
   <!-- ✅ صحيح -->
   <img src="/logo-momkn.png" alt="شعار" />

   <!-- ❌ خاطئ -->
   <img src="/images/logo-momkn.png" alt="شعار" />
   <img src="public/logo-momkn.png" alt="شعار" />
   ```

2. **ملف .vercelignore**:
   ```text
   # ❌ خاطئ - يستثني مجلد public
   public

   # ✅ صحيح - يسمح بمجلد public
   # public (مجلد public مطلوب للصور والأصول الثابتة)
   ```

3. **ملف Service Worker**:
   ```javascript
   // ❌ خاطئ
   const STATIC_ASSETS = [
     'public/logoapp.png',
     'public/logo-momkn.png'
   ];

   // ✅ صحيح
   const STATIC_ASSETS = [
     'logoapp.png',
     'logo-momkn.png'
   ];
   ```

### 3. إعدادات Vercel (موصى بها)

1. ربط المشروع بـ Vercel
2. إضافة متغيرات البيئة:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. تحديث Site URL في Supabase Dashboard
4. التأكد من أن مجلد `public/` مشمول في النشر

### 4. إعدادات Netlify

1. ربط المشروع بـ Netlify
2. إضافة متغيرات البيئة في Site Settings
3. إضافة ملف `_redirects` في root المشروع:
   ```
   / /login.html 200
   /dashboard /dashboard.html 200
   /auth-callback /auth-callback.html 200
   ```

### 5. إعدادات أخرى

- **Firebase Hosting**: فعل PWA و HTTPS
- **AWS S3**: تكوين CORS و HTTPS
- **GitHub Pages**: استخدم workflow للـ SPA routing

## الدعم

للمساعدة أو الاستفسارات:

1. فحص console للأخطاء
2. مراجعة إعدادات Supabase
3. التأكد من متغيرات البيئة
4. اختبار الاتصال بالإنترنت

## التحديثات المستقبلية

- [ ] دعم المزيد من مزودي OAuth
- [ ] نظام إشعارات متقدم
- [ ] دعم 2FA
- [ ] إدارة الأدوار والصلاحيات
- [ ] لوحة تحكم للمستخدمين

---

*تم تطوير هذا النظام بواسطة أيمن حافظ - 2024*