-- ================================================================
-- ملحق نظام المشاركة (Collaboration System Extension)
-- اسم الملف: sync-harvest.sql
-- الوصف: يضيف جداول المشاركة، البروفايل، والبيانات الحية + صلاحيات المدير الشامل
-- الإصدار: v4.9 (مع تحسينات إعادة التشغيل)
-- ================================================================

-- 1. جدول البروفايل (للمعرفات الجديدة فقط - منفصل عن جدول users للحماية)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_code TEXT UNIQUE NOT NULL, 
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- دالة لتوليد كود المستخدم الجديد (EMP-xxxxxx)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.profiles (id, user_code, full_name)
    VALUES (
        NEW.id, 
        'EMP-' || substring(md5(random()::text) from 1 for 6), -- توليد كود عشوائي
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- تريجر يعمل بجانب التريجرز القديمة دون إلغائها
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- خطوة هامة: إنشاء معرفات للمستخدمين الحاليين (Backfill)
INSERT INTO public.profiles (id, user_code, full_name)
SELECT 
    id, 
    'EMP-' || substring(md5(id::text) from 1 for 6), 
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
ON CONFLICT (id) DO NOTHING;


-- 2. جدول طلبات المشاركة (منفصل تماماً)
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    receiver_code TEXT NOT NULL,
    receiver_id UUID REFERENCES auth.users(id),
    role TEXT CHECK (role IN ('viewer', 'editor')) DEFAULT 'editor',
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول البيانات الحية (للمزامنة - Live Sync)
CREATE TABLE IF NOT EXISTS public.live_harvest (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    rows JSONB DEFAULT '[]'::jsonb,
    master_limit NUMERIC DEFAULT 0,
    extra_limit NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    last_updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. تحديث عرض المدير (Admin View) فقط
DROP VIEW IF EXISTS public.admin_subscriptions_view;

CREATE OR REPLACE VIEW public.admin_subscriptions_view 
WITH (security_invoker = true) 
AS
SELECT
    s.id, 
    s.user_id,
    COALESCE(p.user_code, '---') AS user_code,
    COALESCE(u.full_name, u.email) AS user_name,
    u.email, 
    s.plan_id, 
    sp.name AS plan_name, 
    sp.name_ar AS plan_name_ar,
    s.status, 
    s.start_date, 
    s.end_date, 
    s.created_at, 
    sp.price_egp,
    s.transaction_id
FROM public.subscriptions s
LEFT JOIN public.users u ON s.user_id = u.id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN public.profiles p ON s.user_id = p.id;


-- 5. سياسات الأمان (RLS) - تم إضافة DROP لمنع الأخطاء عند التكرار
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_harvest ENABLE ROW LEVEL SECURITY;

-- سياسات profiles
DROP POLICY IF EXISTS "Public profiles view" ON public.profiles;
CREATE POLICY "Public profiles view" ON public.profiles FOR SELECT USING (true);

-- سياسات collaboration_requests
DROP POLICY IF EXISTS "Sender Manage Requests" ON public.collaboration_requests;
CREATE POLICY "Sender Manage Requests" ON public.collaboration_requests 
FOR ALL USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver View Requests" ON public.collaboration_requests;
CREATE POLICY "Receiver View Requests" ON public.collaboration_requests 
FOR SELECT USING (
    receiver_code IN (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    OR receiver_id = auth.uid()
);

DROP POLICY IF EXISTS "Receiver Respond Requests" ON public.collaboration_requests;
CREATE POLICY "Receiver Respond Requests" ON public.collaboration_requests 
FOR UPDATE USING (
    receiver_code IN (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    OR receiver_id = auth.uid()
);

-- سياسات live_harvest
DROP POLICY IF EXISTS "Owner Full Control" ON public.live_harvest;
CREATE POLICY "Owner Full Control" ON public.live_harvest 
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Collaborator Read" ON public.live_harvest;
CREATE POLICY "Collaborator Read" ON public.live_harvest 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_requests 
        WHERE sender_id = live_harvest.user_id 
        AND receiver_id = auth.uid() 
        AND status = 'accepted'
    )
);

DROP POLICY IF EXISTS "Collaborator Write" ON public.live_harvest;
CREATE POLICY "Collaborator Write" ON public.live_harvest 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_requests 
        WHERE sender_id = live_harvest.user_id 
        AND receiver_id = auth.uid() 
        AND status = 'accepted' 
        AND role = 'editor'
    )
);

DROP POLICY IF EXISTS "Owner Initial Insert" ON public.live_harvest;
CREATE POLICY "Owner Initial Insert" ON public.live_harvest 
FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- 6. سياسات المدير الشامل (Super Admin Policies) - تم إضافة DROP
-- ================================================================

-- أ) صلاحية كاملة على البيانات الحية
DROP POLICY IF EXISTS "Super Admin Full Access Live Harvest" ON public.live_harvest;
CREATE POLICY "Super Admin Full Access Live Harvest" ON public.live_harvest
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ب) صلاحية كاملة على طلبات المشاركة
DROP POLICY IF EXISTS "Super Admin Manage Requests" ON public.collaboration_requests;
CREATE POLICY "Super Admin Manage Requests" ON public.collaboration_requests
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ج) صلاحية تعديل البروفايلات
DROP POLICY IF EXISTS "Super Admin Manage Profiles" ON public.profiles;
CREATE POLICY "Super Admin Manage Profiles" ON public.profiles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());