# 📋 دليل إعداد Supabase Dashboard

## 🔧 خطوات الإعداد

### 1. إنشاء مشروع Supabase
1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. احفظ URL و API Keys

### 2. إعداد Authentication Providers

#### **Google OAuth:**
1. اذهب إلى **Authentication > Providers**
2. فعل **Google** provider
3. أدخل البيانات:

```bash
Client ID: YOUR_GOOGLE_CLIENT_ID_HERE
Client Secret: YOUR_GOOGLE_CLIENT_SECRET_HERE
```

#### **Authorized redirect URIs:**
```
https://collect-pro.vercel.app/auth/v1/callback
https://collect-pro.vercel.app/dashboard.html
```

#### **Authorized origins:**
```
https://collect-pro.vercel.app
```

### 3. إعداد Database Schema

#### **إنشاء جدول المستخدمين:**
```sql
-- جدول المستخدمين المحسن
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### **إنشاء جدول الجلسات:**
```sql
-- جدول تتبع الجلسات
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### 4. إعداد Email Templates

#### **Confirmation Email:**
- اذهب إلى **Authentication > Email Templates**
- حدث قالب تأكيد البريد الإلكتروني

#### **Password Reset:**
- حدث قالب استعادة كلمة المرور

### 5. إعداد Storage (اختياري)

```sql
-- إنشاء bucket للصور
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- سياسات التخزين
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. إعداد متغيرات البيئة

#### **في Vercel Dashboard:**
1. اذهب إلى مشروعك على Vercel
2. اذهب إلى **Settings > Environment Variables**
3. أضف المتغيرات:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

### 7. اختبار الإعداد

#### **اختبار Google OAuth:**
1. تأكد من أن زر "تسجيل الدخول بـ Google" يظهر
2. تأكد من أن التوجيه يعمل للصفحة الصحيحة
3. تأكد من حفظ بيانات المستخدم

#### **اختبار تسجيل الدخول:**
1. جرب تسجيل الدخول ببريد إلكتروني وكلمة مرور
2. تأكد من حفظ الجلسة
3. تأكد من تسجيل الخروج

### 8. إعدادات الأمان الإضافية

#### **تفعيل RLS:**
```sql
-- تفعيل RLS على جميع الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
```

#### **إعداد Rate Limiting:**
- في Supabase Dashboard: **Authentication > Settings**
- فعل **Enable rate limiting**
- حدد الحدود المناسبة

#### **إعداد CORS:**
- في Supabase Dashboard: **Settings > API**
- أضف النطاقات المسموحة

### 9. مراقبة الأداء

#### **تفعيل Analytics:**
- في Supabase Dashboard: **Settings > Analytics**
- فعل تتبع الأحداث

#### **إعداد Logging:**
```sql
-- جدول السجلات
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. النسخ الاحتياطي

#### **إعداد Backups:**
- في Supabase Dashboard: **Settings > Backups**
- فعل النسخ الاحتياطي التلقائي
- حدد جدولة مناسبة

---

## 🚨 ملاحظات مهمة

### **الأمان:**
- لا تشارك `SUPABASE_SERVICE_ROLE_KEY` مع أي شخص
- استخدم `SUPABASE_ANON_KEY` فقط في الواجهة الأمامية
- فعل RLS على جميع الجداول

### **الأداء:**
- استخدم pagination في الاستعلامات الكبيرة
- فعل caching للبيانات الثابتة
- راقب استخدام Rate Limits

### **الصيانة:**
- راقب Dashboard بانتظام
- تحقق من السجلات دورياً
- حدث المكتبات بانتظام

---

## ✅ قائمة فحص الإعداد

- [ ] مشروع Supabase منشأ
- [ ] Google OAuth مفعل ومكون
- [ ] Database schema منشأ
- [ ] RLS مفعل
- [ ] متغيرات البيئة مضبوطة
- [ ] Storage مكون (إذا مطلوب)
- [ ] Email templates محدثة
- [ ] Backups مفعلة
- [ ] Analytics مفعل
- [ ] Rate limiting مفعل

---

*آخر تحديث: 2025-01-26*