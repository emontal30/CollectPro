-- ================================================================
-- ملحق نظام المشاركة (Collaboration System Extension)
-- متوافق مع schema.sql و itinerary_schema.sql
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
-- لن يؤثر على بياناتهم، فقط سينشئ لهم سجلات في الجدول الجديد
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
-- نقوم بحذفه وإعادة إنشائه لربط الجدول الجديد (profiles)
DROP VIEW IF EXISTS public.admin_subscriptions_view;

CREATE OR REPLACE VIEW public.admin_subscriptions_view 
WITH (security_invoker = true) 
AS
SELECT
    s.id, 
    s.user_id,
    -- الأولوية للكود الجديد، وإذا لم يوجد نضع علامة
    COALESCE(p.user_code, '---') AS user_code,
    -- البيانات القديمة كما هي
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
LEFT JOIN public.profiles p ON s.user_id = p.id; -- الربط الجديد الآمن


-- 5. سياسات الأمان (RLS) للجداول الجديدة فقط
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_harvest ENABLE ROW LEVEL SECURITY;

-- سياسات profiles
CREATE POLICY "Public profiles view" ON public.profiles FOR SELECT USING (true);

-- سياسات collaboration_requests
CREATE POLICY "Sender Manage Requests" ON public.collaboration_requests 
FOR ALL USING (auth.uid() = sender_id);

CREATE POLICY "Receiver View Requests" ON public.collaboration_requests 
FOR SELECT USING (
    receiver_code IN (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    OR receiver_id = auth.uid()
);

CREATE POLICY "Receiver Respond Requests" ON public.collaboration_requests 
FOR UPDATE USING (
    receiver_code IN (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    OR receiver_id = auth.uid()
);

-- سياسات live_harvest
CREATE POLICY "Owner Full Control" ON public.live_harvest 
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Collaborator Read" ON public.live_harvest 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_requests 
        WHERE sender_id = live_harvest.user_id 
        AND receiver_id = auth.uid() 
        AND status = 'accepted'
    )
);

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

CREATE POLICY "Owner Initial Insert" ON public.live_harvest 
FOR INSERT WITH CHECK (auth.uid() = user_id);