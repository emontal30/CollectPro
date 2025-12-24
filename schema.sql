-- ====================================================================
-- COLLECTPRO - MASTER SCHEMA (v3.9 - Fix Infinite Recursion)
-- ====================================================================

-- #####################################################
-- 1. التهيئة والتنظيف (Initial Setup & Cleanup)
-- #####################################################

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- تنظيف العروض والوظائف القديمة
DROP VIEW IF EXISTS public.admin_subscriptions_view CASCADE;
DROP FUNCTION IF EXISTS public.calculate_total_revenue CASCADE;
DROP FUNCTION IF EXISTS public.update_statistics CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_archives CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.fix_missing_profiles CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;

-- #####################################################
-- 2. تعريف الجداول (Tables Definitions)
-- #####################################################

CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    provider JSONB DEFAULT '["google"]'::jsonb,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL,
    duration_months INTEGER NOT NULL DEFAULT 1,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    external_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    plan_name TEXT,
    status TEXT CHECK (status IN ('pending', 'active', 'cancelled', 'expired')) DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_archives (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    archive_date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb, 
    total_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT daily_archives_user_date_unique UNIQUE(user_id, archive_date)
);

CREATE TABLE IF NOT EXISTS public.statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    total_users INTEGER DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- #####################################################
-- 3. الدوال (Functions) - تم تقديمها لتكون متاحة للسياسات
-- #####################################################

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من صلاحية المدير (تكسر حلقة التكرار اللانهائي)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_total_revenue()
RETURNS NUMERIC SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    RETURN (SELECT COALESCE(SUM(sp.price_egp), 0)
            FROM public.subscriptions s
            JOIN public.subscription_plans sp ON s.plan_id = sp.id
            WHERE s.status = 'active');
END;
$$;

CREATE OR REPLACE FUNCTION update_statistics()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.statistics
    SET 
        total_users = (SELECT COUNT(*) FROM public.users),
        active_subscriptions = (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'),
        total_revenue = (SELECT public.calculate_total_revenue()),
        pending_requests = (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'pending'),
        last_sync = NOW(),
        updated_at = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
  extracted_name TEXT;
BEGIN
    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, extracted_name, 'user')
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.users.full_name IS NULL OR public.users.full_name = '' THEN EXCLUDED.full_name 
            ELSE public.users.full_name 
        END;
        
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
    SELECT 
        id, 
        email, 
        COALESCE(
            raw_user_meta_data->>'full_name', 
            raw_user_meta_data->>'name', 
            raw_user_meta_data->>'user_name',
            split_part(email, '@', 1)
        ) as full_name,
        'user' as role,
        created_at,
        COALESCE(last_sign_in_at, created_at)
    FROM auth.users
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.users.full_name IS NULL OR public.users.full_name = '' OR public.users.full_name = 'مستخدم' 
            THEN EXCLUDED.full_name 
            ELSE public.users.full_name 
        END;
END;
$$;

-- #####################################################
-- 4. سياسات الأمان (Row Level Security)
-- #####################################################

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- تنظيف السياسات القديمة
DO $$ 
DECLARE pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- سياسات المستخدمين
CREATE POLICY "Allow users to view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
-- استخدام الدالة الآمنة لتجنب التكرار اللانهائي
CREATE POLICY "Allow admins to view all profiles" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "Allow admins to manage everything" ON public.users FOR ALL USING (public.is_admin());

-- سياسات الاشتراكات
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());

-- سياسات الأرشيف
CREATE POLICY "Users can manage own archives" ON public.daily_archives FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all archives" ON public.daily_archives FOR SELECT USING (public.is_admin());

-- سياسات الخطط
CREATE POLICY "Authenticated users can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL USING (public.is_admin());

-- #####################################################
-- 5. التريجرز (Triggers)
-- #####################################################

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subs_updated_at ON public.subscriptions;
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_stats_subs ON public.subscriptions;
CREATE TRIGGER trigger_update_stats_subs AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

DROP TRIGGER IF EXISTS trigger_update_stats_users ON public.users;
CREATE TRIGGER trigger_update_stats_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- #####################################################
-- 6. البيانات الأولية (Seed Data)
-- #####################################################

DO $$
BEGIN
    -- إضافة خطط الاشتراك
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'خطة شهرية', 'خطة أساسية للمبتدئين', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات", "الأرشيف"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'خطة 3 شهور', 'خطة متقدمة (توفير)', 80.00, 90, 3, '["جميع الميزات الأساسية", "عداد الأموال", "إحصائيات"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', 'خطة سنوية', 'خطة احترافية (أفضل قيمة)', 360.00, 365, 12, '["جميع الميزات", "دعم فني", "تحديثات مجانية"]'::jsonb, TRUE, 360.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.statistics (id, total_users, active_subscriptions, total_revenue, pending_requests, last_sync)
    VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 0, 0, 0, 0, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- تشغيل إصلاح المستخدمين
    PERFORM public.fix_missing_profiles();
    
    -- تعيين المدير
    UPDATE public.users SET role = 'admin' WHERE email = 'emontal.33@gmail.com';
END $$;

-- #####################################################
-- 7. العروض (Views)
-- #####################################################

CREATE OR REPLACE VIEW public.admin_subscriptions_view AS
SELECT
    s.id, s.user_id, COALESCE(u.full_name, u.email) AS user_name,
    s.plan_id, sp.name AS plan_name, sp.name_ar AS plan_name_ar,
    s.status, s.start_date, s.end_date, s.created_at, sp.price_egp, s.transaction_id
FROM public.subscriptions s
LEFT JOIN public.users u ON s.user_id = u.id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

-- منح الصلاحيات
GRANT SELECT ON public.admin_subscriptions_view TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
