# إعداد متغيرات البيئة في Vercel

بعد دفع المشروع إلى GitHub وربطه بـ Vercel، ستحتاج إلى إضافة متغيرات البيئة التالية يدويًا في لوحة تحكم Vercel:

## الخطوات

1. اذهب إلى لوحة تحكم Vercel: [vercel.com](https://vercel.com)
2. اختر مشروعك (collectpro-app)
3. اذهب إلى قسم "Settings"
4. اختر "Environment Variables" من القائمة الجانبية
5. أضف المتغيرات التالية واحدة تلو الأخرى:

### متغيرات البيئة المطلوبة

| الاسم | القيمة |
| ----- | ----- |
| SUPABASE_URL | https://altnvsolaqphpndyztup.supabase.co |
| SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI |
| SUPABASE_SERVICE_ROLE_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA2MjY4NSwiZXhwIjoyMDczNjM4Njg1fQ.yff-wZuWLtpyIEK7ncYH6Ya_ocBAiTVZQxiByB6HkN8 |
| GOOGLE_CLIENT_ID | 170733685760-a1rgqkpr8sq4ktdki47iqtimjg55vc4o.apps.googleusercontent.com |

6. بعد إضافة جميع المتغيرات، انقر على "Save"
7. أعد نشر المشروع من خلال النقر على "Deployments" ثم إعادة النشر

## ملاحظات هامة

- تأكد من إدخال قيم المتغيرات بدقة دون أي مسافات زائدة
- بعد إضافة متغيرات البيئة، قد تحتاج إلى إعادة نشر المشروع لتطبيق التغييرات
- متغيرات البيئة هذه ضرورية لتشغيل التطبيق بشكل صحيح، خاصة للاتصال بقاعدة بيانات Supabase
