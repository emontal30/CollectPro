-- ====================================================================
-- COLLECTPRO - MASTER SCHEMA (Fix: v3.2 - View Type Conflict Resolved)
-- الإصدار: 3.2 (تم إضافة DROP VIEW لحل تعارض الأنواع)
-- ====================================================================

-- #####################################################
-- 1. التهيئة والتنظيف (Initial Setup & Cleanup)
-- #####################################################

-- تفعيل التمديدات الضرورية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- تنظيف العروض القديمة أولاً (هام جداً لحل مشكلة الخطأ 42P16)
DROP VIEW IF EXISTS public.admin_subscriptions_view CASCADE;

-- تنظيف الجداول القديمة لضمان عدم حدوث تضارب
DROP TABLE IF EXISTS public.archive_data CASCADE;
DROP TABLE IF EXISTS public.archive_dates CASCADE;

-- تنظيف الدوال القديمة
DROP FUNCTION IF EXISTS public.manage_archive_dates CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_stats CASCADE;

-- #####################################################
-- 2. تعريف الجداول (Tables Definitions)
-- #####################################################

-- [1] جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    provider JSONB DEFAULT '["google"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- [2] جدول المديرين (Admins)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- [3] جدول خطط الاشتراك (Subscription Plans)
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
CREATE INDEX IF NOT EXISTS idx_subscription_plans_external_id ON public.subscription_plans (external_id);

-- [4] جدول الاشتراكات (Subscriptions)
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
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

-- [5] جدول الأرشيف الذكي (Daily Archives)
CREATE TABLE IF NOT EXISTS public.daily_archives (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    archive_date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb, 
    total_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- القيد الحاسم لعملية Upsert
    CONSTRAINT daily_archives_user_date_unique UNIQUE(user_id, archive_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_archives_lookup ON public.daily_archives (user_id, archive_date);
CREATE INDEX IF NOT EXISTS idx_daily_archives_date_desc ON public.daily_archives (archive_date DESC);

-- [6] جدول الإحصائيات (Statistics)
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
-- 3. البيانات الأولية (Seed Data)
-- #####################################################

DO $$
BEGIN
    -- إضافة المدير الافتراضي
    INSERT INTO public.admins (email, full_name) 
    VALUES ('emontal.33@gmail.com', 'Admin System')
    ON CONFLICT (email) DO NOTHING;

    -- إضافة خطط الاشتراك
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'خطة شهرية', 'خطة أساسية للمبتدئين', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات", "الأرشيف"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'خطة 3 شهور', 'خطة متقدمة (توفير)', 80.00, 90, 3, '["جميع الميزات الأساسية", "عداد الأموال", "إحصائيات"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', 'خطة سنوية', 'خطة احترافية (أفضل قيمة)', 360.00, 365, 12, '["جميع الميزات", "دعم فني", "تحديثات مجانية"]'::jsonb, TRUE, 360.00)
    ON CONFLICT DO NOTHING;

    -- تهيئة الإحصائيات
    INSERT INTO public.statistics (id, total_users, active_subscriptions, total_revenue, pending_requests, last_sync)
    VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 0, 0, 0, 0, NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- #####################################################
-- 4. سياسات الأمان (Row Level Security)
-- #####################################################

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- سياسات المستخدمين
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all users" ON public.users FOR SELECT 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- سياسات الاشتراكات
CREATE POLICY "Users view own subs" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all subs" ON public.subscriptions FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- سياسات الأرشيف
CREATE POLICY "Users manage own archives" ON public.daily_archives FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view archives" ON public.daily_archives FOR SELECT 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- سياسات عامة
CREATE POLICY "Public view active plans" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Admins manage stats" ON public.statistics FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Admins view self" ON public.admins FOR SELECT USING (auth.email() = email);

-- #####################################################
-- 5. الدوال والمنطق البرمجي
-- #####################################################

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_total_revenue()
RETURNS NUMERIC SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
    total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(sp.price_egp), 0) INTO total
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active';
    RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_archives()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.daily_archives
    WHERE user_id = NEW.user_id
    AND archive_date < (CURRENT_DATE - INTERVAL '31 days');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_active_users_last_n_days(days int)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(*) FROM public.users WHERE updated_at > (now() - (days || ' days')::interval);
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

-- #####################################################
-- 6. ربط التريجرز
-- #####################################################

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subs_updated_at ON public.subscriptions;
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_archives_updated_at ON public.daily_archives;
CREATE TRIGGER update_archives_updated_at BEFORE UPDATE ON public.daily_archives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_cleanup_archives ON public.daily_archives;
CREATE TRIGGER trigger_cleanup_archives 
AFTER INSERT ON public.daily_archives 
FOR EACH ROW EXECUTE FUNCTION cleanup_old_archives();

DROP TRIGGER IF EXISTS trigger_update_stats_subs ON public.subscriptions;
CREATE TRIGGER trigger_update_stats_subs AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

DROP TRIGGER IF EXISTS trigger_update_stats_users ON public.users;
CREATE TRIGGER trigger_update_stats_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- #####################################################
-- 7. العروض (Views)
-- #####################################################

CREATE VIEW public.admin_subscriptions_view AS
SELECT
    s.id, s.user_id, COALESCE(u.full_name, u.email) AS user_name,
    s.plan_id, sp.name AS plan_name, sp.name_ar AS plan_name_ar,
    s.status, s.start_date, s.end_date, s.created_at, sp.price_egp, s.transaction_id
FROM public.subscriptions s
LEFT JOIN public.users u ON s.user_id = u.id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

GRANT SELECT ON public.admin_subscriptions_view TO authenticated, service_role;

-- #####################################################
-- 8. إصلاحات البيانات
-- #####################################################

DO $$
BEGIN
    UPDATE public.users SET provider = '["google"]'::jsonb 
    WHERE provider IS NULL OR provider = '[]'::jsonb;
    
    DELETE FROM public.subscriptions s 
    WHERE s.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = s.user_id);
END $$;

-- =====================================================
-- تم التنفيذ بنجاح - النظام جاهز
-- =====================================================