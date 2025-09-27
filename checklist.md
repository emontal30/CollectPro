# CollectPro - Vercel + Supabase Checklist

هذا المستند يوضح الخطوات التي يجب على وكيل الذكاء الاصطناعي مراجعتها للتأكد من أن المشروع متوافق مع Vercel و Supabase.

---

## 1. إعدادات Supabase
- تحقق من أن ملف `.env` يحتوي على:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- تأكد أن القيم مطابقة لما هو مضاف في **Supabase Authentication → Providers → Google**.
- تأكد أن **URL Configuration** في Supabase يحتوي على:
  - **Site URL** = `https://collect-pro.vercel.app`
  - **Redirect URLs** = 
    - `http://localhost:3000/auth/callback`
    - `https://collect-pro.vercel.app/auth/callback`

---

## 2. إعدادات Google Console
- تحقق أن **Authorized redirect URIs** هي نفسها الموجودة في `.env` وSupabase.
- تأكد أن **Authorized JavaScript origins** تحتوي على:
  - `http://localhost:3000`
  - `https://collect-pro.vercel.app`

---

## 3. إعدادات Vercel
- تحقق أن المشروع منظم كـ **static project** مع وضع الصور والملفات في `public/`.
- تأكد أن الصور والشعارات لا تختفي بعد النشر (أسماء الملفات وحالة الحروف صحيحة).
- تحقق من إعدادات `vercel.json` أو إعدادات Build في Vercel Dashboard.
- تأكد أن متغيرات البيئة `.env` مضافة في **Vercel Project → Settings → Environment Variables**.

---

## 4. التسجيل عبر Google
- اختبر تسجيل الدخول بجوجل في:
  - البيئة المحلية (localhost).
  - النسخة المنشورة على Vercel.
- تأكد أن Supabase يقوم بإنشاء المستخدم بشكل صحيح.
- راقب الأخطاء مثل:
  - `getConfig is not a function`
  - مشاكل Redirect URL.

---

## 5. قاعدة البيانات وسياسات Supabase
- تحقق من وجود الجداول الأساسية مثل `auth.users` و`profiles` (إن وجدت).
- تأكد أن **Row Level Security (RLS)** مفعلة.
- تحقق أن السياسات (`auth.uid()`) صحيحة للسماح بالوصول المناسب.

---

## 6. المخرجات المتوقعة
- تقرير يوضح:
  - ✅ ما هو صحيح وجاهز.
  - ⚠️ ما يحتاج تعديل (مع الخطوات).
- اقتراحات لتحسين الأمان والأداء مثل:
  - تدوير مفاتيح JWT/CSRF.
  - إعدادات CDN إذا كانت مستخدمة.
  - اختبار الروابط بعد النشر.

---
