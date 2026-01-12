-- 1. تفعيل الإضافات الضرورية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. تنظيف الجداول القديمة (تنظيف عميق)
-- ==========================================
DROP TABLE IF EXISTS public.route_profiles CASCADE;
DROP TABLE IF EXISTS public.client_routes CASCADE;

-- ==========================================
-- 3. دالة لتحديث وقت التعديل تلقائياً (Trigger Function)
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 4. [DISABLED] الجدول الأول: client_routes
-- تم تعطيل هذا الجدول لأن خط السير أصبح محلياً بالكامل (Local-First) ولا يتم حفظه في قاعدة البيانات.
-- تم الإبقاء على الكود كمرجع فقط.
-- ==========================================
/*
CREATE TABLE public.client_routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_code TEXT NOT NULL,
    shop_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NEW COLUMN
    sort_order INTEGER DEFAULT 9999,
    current_balance NUMERIC DEFAULT 0, -- (اختياري) يمكن إضافته للتوثيق فقط
    is_ignored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- قيد لمنع تكرار نفس العميل لنفس المستخدم
    CONSTRAINT unique_shop_code_per_user UNIQUE(user_id, shop_code)
);

-- إنشاء الفهارس لتحسين الأداء (Performance Indexes)
CREATE INDEX idx_client_routes_user_id ON public.client_routes(user_id);
CREATE INDEX idx_client_routes_shop_code ON public.client_routes(shop_code);
CREATE INDEX idx_client_routes_ignored ON public.client_routes(user_id, is_ignored);

-- تفعيل التحديث التلقائي للوقت
CREATE TRIGGER update_client_routes_modtime
    BEFORE UPDATE ON public.client_routes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/

-- ==========================================
-- 5. الجدول الثاني: route_profiles (قوالب الحفظ 1,2,3)
-- ==========================================
CREATE TABLE public.route_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_number INTEGER NOT NULL,
    profile_name TEXT NOT NULL,
    shops_order JSONB NOT NULL, -- مصفوفة الأكواد
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- قيد لمنع تكرار رقم القالب لنفس المستخدم
    CONSTRAINT unique_slot_per_user UNIQUE(user_id, slot_number)
);

-- تفعيل التحديث التلقائي للوقت
CREATE TRIGGER update_route_profiles_modtime
    BEFORE UPDATE ON public.route_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 6. إعدادات الأمان (Row Level Security - RLS)
-- ==========================================

-- تفعيل الحماية
-- ALTER TABLE public.client_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_profiles ENABLE ROW LEVEL SECURITY;

-- تنظيف السياسات القديمة إن وجدت
-- DROP POLICY IF EXISTS "Users can manage their own routes" ON public.client_routes;
DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.route_profiles;

-- سياسة جدول العملاء (شاملة: قراءة، كتابة، تعديل، حذف)
/*
CREATE POLICY "Users can manage their own routes"
ON public.client_routes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
*/

-- سياسة جدول القوالب
CREATE POLICY "Users can manage their own profiles"
ON public.route_profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 7. خطوة سحرية: تحديث كاش الـ API فوراً
-- ==========================================
NOTIFY pgrst, 'reload config';