# CollectPro - نظام إدارة التحصيلات

نظام متكامل لإدارة التحصيلات والاشتراكات والمدفوعات مع تكامل كامل مع Supabase.

## 🚀 الميزات الرئيسية

- ✅ **إدارة التحصيلات**: تتبع وإدارة عمليات التحصيل بكفاءة
- ✅ **نظام المصادقة**: تسجيل دخول آمن باستخدام Google OAuth
- ✅ **واجهة مستخدم متجاوبة**: تصميم حديث ومتجاوب مع جميع الأجهزة
- ✅ **تطبيق PWA**: يعمل بدون اتصال ويمكن تثبيته على الهاتف
- ✅ **أرشفة البيانات**: حفظ واستعراض البيانات التاريخية
- ✅ **إدارة الاشتراكات**: تتبع الاشتراكات والمدفوعات

## 🛠️ التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Build Tool**: Webpack 5
- **Backend**: Supabase (Database & Authentication)
- **Deployment**: Vercel
- **PWA**: Service Worker + Manifest

## 📋 متطلبات التشغيل

### 1. Node.js
```bash
# تحقق من تثبيت Node.js
node --version
# يجب أن يكون 16.0.0 أو أحدث
```

### 2. Supabase Account
1. اذهب إلى [Supabase](https://supabase.com)
2. أنشئ مشروع جديد
3. احصل على Project URL و API Key من Settings > API

### 3. إعداد متغيرات البيئة
1. انسخ ملف `.env.example` إلى `.env`
2. احصل على إعدادات Supabase من [Supabase Dashboard](https://supabase.com/dashboard)
3. حدث القيم في ملف `.env`:

```env
# Supabase (احصل على هذه القيم من لوحة تحكم Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# إعدادات أخرى (اختيارية)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### 4. إعداد Google OAuth في Supabase (اختياري)
1. اذهب إلى Authentication > Providers في Supabase Dashboard
2. فعل Google Provider
3. أضف Client ID و Client Secret من Google Cloud Console
4. أضف Redirect URLs:
   - `http://localhost:3000/auth-callback.html` (للتطوير)
   - `https://your-domain.vercel.app/auth-callback.html` (للإنتاج)

**ملاحظة**: إذا لم تقم بإعداد Google OAuth، سيعمل التطبيق في وضع الاختبار ولن يتطلب مصادقة حقيقية.

## ⚡ التثبيت والتشغيل

### 1. تثبيت Dependencies
```bash
npm install
```

### 2. تشغيل التطبيق محلياً
```bash
# تشغيل في وضع التطوير
npm run dev

# أو تشغيل خادم بسيط
npm run serve
```

### 3. البناء للإنتاج
```bash
npm run build
```

## 🌐 النشر

### Vercel (الموصى به)
```bash
# النشر التلقائي عبر Git
git push origin main

# أو نشر يدوي
vercel --prod
```

### Netlify
```bash
# بناء ونشر
npm run build
netlify deploy --prod --dir=dist
```

## 📱 استخدام التطبيق

### 1. تسجيل الدخول
- **في وضع الاختبار**: اضغط على "تسجيل الدخول بحساب Google" وسيتم تسجيل الدخول تلقائياً بمستخدم تجريبي
- **في وضع الإنتاج**: اضغط على "تسجيل الدخول بحساب Google" واتبع تعليمات Google للمصادقة
- سيتم توجيهك تلقائياً للصفحة الرئيسية

### 2. إدخال البيانات
- اذهب إلى صفحة "إدخال البيانات"
- ألصق بيانات التحصيل
- اضغط "استخراج البيانات"

### 3. مراجعة التحصيلات
- اذهب إلى صفحة "التحصيل"
- راجع وعدل البيانات
- احفظ التغييرات

### 4. الأرشفة
- اذهب إلى صفحة "الأرشيف"
- اختر التاريخ المطلوب
- راجع البيانات المحفوظة

## 🔧 التطوير

### هيكل المشروع
```
CollectPro/
├── public/              # ملفات static
│   ├── *.html          # صفحات HTML
│   ├── *.css           # ملفات الأنماط
│   ├── *.js            # ملفات JavaScript
│   └── assets/         # الصور والملفات الثابتة
├── src/                # ملفات المصدر (اختيارية)
├── .env                # متغيرات البيئة
├── package.json        # Dependencies
├── webpack.config.js   # إعدادات البناء
└── README.md          # هذا الملف
```

### إضافة صفحة جديدة
1. أنشئ ملف HTML في مجلد public
2. أنشئ ملف CSS مصاحب
3. أنشئ ملف JavaScript للوظائف
4. أضف الصفحة في webpack.config.js

### تخصيص الألوان
```css
:root {
  --primary-color: #007965;
  --secondary-color: #00a085;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
}
```

## 🔒 الأمان

- ✅ تشفير البيانات في localStorage
- ✅ حماية CSRF
- ✅ التحقق من صحة الجلسات
- ✅ إخفاء متغيرات البيئة
- ✅ تحديث دوري للمكتبات

## 📊 الأداء

- ✅ تحسين الصور (WebP)
- ✅ ضغط الملفات (Gzip)
- ✅ تحميل البيانات بالكسل
- ✅ Service Worker للتخزين المؤقت
- ✅ تحسين SEO

## 🔧 كيفية عمل النظام

### 1. تحميل متغيرات البيئة
- ملف `env.js` يحتوي على جميع متغيرات البيئة
- يتم تحميل هذا الملف قبل جميع الملفات الأخرى
- يوفر دوال `getEnv()` و `setEnv()` للوصول للمتغيرات

### 2. نظام المصادقة
- يستخدم Supabase Auth للمصادقة الحقيقية
- يدعم تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
- يدعم تسجيل الدخول بـ Google OAuth
- يحفظ جلسات المستخدم محلياً وفي Supabase

### 3. إدارة الجلسات
- التحقق من الجلسات المحلية أولاً
- التحقق من جلسات Supabase إذا لم تكن هناك جلسات محلية
- تحديث تلقائي للجلسات النشطة

## � استكشاف الأخطاء

### مشاكل شائعة:

**1. خطأ في تحميل متغيرات البيئة**
```bash
# تحقق من وجود ملف env.js
- تأكد من وجود ملف env.js في المجلد الرئيسي
- تحقق من أن الملف يتم تحميله في HTML
- راجع console للأخطاء
```

**2. خطأ في تسجيل الدخول بـ Google**
```bash
# تحقق من إعدادات Supabase
- تأكد من تفعيل Google Provider في Supabase Dashboard
- تحقق من Client ID و Client Secret
- راجع Authorized Redirect URIs
- تأكد من أن URL المعاد توجيه إليه صحيح

# إذا كنت في وضع التطوير
- النظام يعمل في وضع الاختبار افتراضياً
- لن يحتاج إلى إعدادات Google OAuth حقيقية
- اقرأ README_GOOGLE_OAUTH.md للمزيد من التفاصيل
```

**3. مشكلة في تحميل الصفحات**
```bash
# تحقق من ملف _redirects
- تأكد من وجود إعدادات SPA routing
- راجع إعدادات vercel.json
- تحقق من إعدادات webpack
```

**4. مشكلة في البناء**
```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
npm run build
```

**5. مشكلة في Supabase Connection**
```bash
# تحقق من الإعدادات
- تأكد من صحة SUPABASE_URL و SUPABASE_ANON_KEY
- تحقق من أن المشروع مفعل في Supabase
- راجع console للأخطاء المتعلقة بـ Supabase
```

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى:
1. إنشاء Fork للمشروع
2. إنشاء branch للميزة الجديدة
3. إضافة الكود مع التوثيق
4. إنشاء Pull Request

## 📄 الترخيص

MIT License - راجع ملف LICENSE للتفاصيل

## 📞 الدعم

للحصول على المساعدة:
- البريد الإلكتروني: support@collectpro.com
- التوثيق: [Supabase Docs](https://supabase.com/docs)
- المشاكل: [GitHub Issues](https://github.com/username/collectpro/issues)

## 🔐 إعداد Google OAuth ووضع الاختبار

### نظرة عامة
تم إعداد النظام بحيث يمكن التحكم في Google OAuth ووضع الاختبار من خلال متغيرات البيئة.

### للتطوير المحلي
- انسخ `vercel-development.env` إلى `.env.local`
- النظام سيعمل في وضع الاختبار تلقائياً
- لن يحتاج إلى إعدادات Google OAuth حقيقية

### للإنتاج على Vercel
- انسخ `vercel-production.env` إلى Vercel Dashboard
- عيّن `DISABLE_GOOGLE_OAUTH=false` و `TEST_MODE=false`
- تأكد من إعداد Google OAuth في Supabase و Google Console

### التحكم في الأوضاع
```env
# تعطيل Google OAuth (true = وضع اختبار، false = وضع إنتاج)
DISABLE_GOOGLE_OAUTH=false

# وضع الاختبار العام (true = وضع اختبار، false = وضع إنتاج)
TEST_MODE=false
```

📖 **[اقرأ دليل Google OAuth التفصيلي](./README_GOOGLE_OAUTH.md)**

---

**تم تطوير CollectPro بواسطة أيمن حافظ**
