-- ====================================================================
-- ملف قاعدة البيانات النهائي والمصحح (Fixes 42P13 & 42P16)
-- ====================================================================

-- 1. الإعدادات الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. تنظيف العناصر القديمة لتجنب الأخطاء (DROP OLD OBJECTS)
-- حذف الدوال القديمة لتجنب خطأ تغيير نوع الإرجاع
DROP FUNCTION IF EXISTS public.get_active_users_last_n_days(integer);
DROP FUNCTION IF EXISTS public.get_active_users_last_n_days(int);
DROP FUNCTION IF EXISTS public.calculate_total_revenue();
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- حذف الـ View القديم لتجنب خطأ حذف الأعمدة (Fix for 42P16)
DROP VIEW IF EXISTS public.admin_subscriptions_view;

-- =====================================================
-- 3. إنشاء الجداول (TABLES)
-- =====================================================

-- جدول المستخدمين (Users)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        CREATE TABLE public.users (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            full_name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- إضافة الأعمدة الناقصة إن وجدت
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE public.users ADD COLUMN full_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
            ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;
        END IF;
         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
            ALTER TABLE public.users ADD COLUMN phone TEXT;
        END IF;
    END IF;
END $$;

-- جدول المديرين (Admins)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins' AND table_schema = 'public') THEN
        CREATE TABLE public.admins (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        -- المدير الافتراضي
        INSERT INTO public.admins (email, full_name) VALUES ('emontal.33@gmail.com', 'أيمن حافظ')
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;

-- جدول خطط الاشتراك (Subscription Plans)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans' AND table_schema = 'public') THEN
        CREATE TABLE public.subscription_plans (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT NOT NULL,
            name_ar TEXT NOT NULL DEFAULT '',
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            duration_days INTEGER NOT NULL,
            duration_months INTEGER NOT NULL DEFAULT 1,
            features JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
            external_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_subscription_plans_external_id ON public.subscription_plans (external_id);
    END IF;
END $$;

-- جدول الاشتراكات (Subscriptions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        CREATE TABLE public.subscriptions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            plan_id UUID REFERENCES public.subscription_plans(id),
            plan_name TEXT,
            plan_period TEXT,
            price DECIMAL(10,2),
            transaction_id TEXT,
            status TEXT CHECK (status IN ('pending', 'active', 'cancelled', 'expired')) DEFAULT 'pending',
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- جدول تواريخ الأرشيف (Archive Dates)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archive_dates' AND table_schema = 'public') THEN
        CREATE TABLE public.archive_dates (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            archive_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, archive_date)
        );
    END IF;
END $$;

-- جدول بيانات الأرشيف (Archive Data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archive_data' AND table_schema = 'public') THEN
        CREATE TABLE public.archive_data (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            data JSONB DEFAULT '{}'::jsonb,
            archive_date DATE NOT NULL,
            shop TEXT NOT NULL,
            code TEXT,
            amount DECIMAL(10,2) NOT NULL,
            extra DECIMAL(10,2) DEFAULT 0,
            collector DECIMAL(10,2) DEFAULT 0,
            net DECIMAL(10,2) GENERATED ALWAYS AS (collector - (extra + amount)) STORED,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- جدول الإحصائيات (Statistics)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'statistics' AND table_schema = 'public') THEN
        CREATE TABLE public.statistics (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            total_users INTEGER DEFAULT 0,
            active_subscriptions INTEGER DEFAULT 0,
            total_revenue DECIMAL(10,2) DEFAULT 0,
            pending_requests INTEGER DEFAULT 0,
            last_sync TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- =====================================================
-- 4. تهيئة البيانات الأولية (INITIAL DATA)
-- =====================================================
DO $$
BEGIN
    -- إدراج الخطط الأساسية
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'خطة شهرية', 'خطة أساسية للمبتدئين', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات", "الأرشيف"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'خطة 3 شهور', 'خطة متقدمة مع ميزات إضافية', 80.00, 90, 3, '["جميع الميزات الأساسية", "عداد الأموال", "إحصائيات مفصلة"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', 'خطة سنوية', 'خطة احترافية كاملة', 360.00, 365, 12, '["جميع الميزات", "دعم فني", "تحديثات مجانية"]'::jsonb, TRUE, 360.00)
    ON CONFLICT DO NOTHING;

    -- تهيئة الإحصائيات
    INSERT INTO public.statistics (id, total_users, active_subscriptions, total_revenue, pending_requests, last_sync)
    VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 0, 0, 0, 0, NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- =====================================================
-- 5. إعداد سياسات الأمان (RLS POLICIES)
-- =====================================================

-- تفعيل RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- إنشاء السياسات الجديدة
-- 1. Users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- 2. Subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Admins can delete all subscriptions" ON public.subscriptions FOR DELETE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- 3. Archive
CREATE POLICY "Users can view own archive dates" ON public.archive_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own archive dates" ON public.archive_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own archive dates" ON public.archive_dates FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own archive data" ON public.archive_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own archive data" ON public.archive_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own archive data" ON public.archive_data FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all archive data" ON public.archive_data FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- 4. Statistics & Plans
CREATE POLICY "Admins can read statistics" ON public.statistics FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Admins can update statistics" ON public.statistics FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- 5. Admins
CREATE POLICY "Admins can view their own data" ON public.admins FOR SELECT USING (auth.email() = email);
CREATE POLICY "Service role can manage admins" ON public.admins FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;

-- =====================================================
-- 6. الدوال والتريجرز (FUNCTIONS & TRIGGERS)
-- =====================================================

-- دالة تحديث الوقت
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة حساب الإيرادات
CREATE OR REPLACE FUNCTION public.calculate_total_revenue()
RETURNS NUMERIC 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    total_revenue NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(sp.price_egp), 0)
    INTO total_revenue
    FROM public.subscriptions s
    INNER JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active';
    RETURN COALESCE(total_revenue, 0);
EXCEPTION WHEN OTHERS THEN RETURN 0;
END;
$$;

-- دالة تحديث الإحصائيات
CREATE OR REPLACE FUNCTION update_statistics()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.statistics (id, total_users, active_subscriptions, total_revenue, pending_requests, last_sync, updated_at)
    VALUES (
        '00000000-0000-0000-0000-000000000001'::UUID,
        (SELECT COUNT(*) FROM public.users),
        (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'),
        (SELECT public.calculate_total_revenue()),
        (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'pending'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_subscriptions = EXCLUDED.active_subscriptions,
        total_revenue = EXCLUDED.total_revenue,
        pending_requests = EXCLUDED.pending_requests,
        last_sync = EXCLUDED.last_sync,
        updated_at = NOW();
    RETURN NULL;
END;
$$;

-- دالة إدارة الأرشيف (31 يوم)
CREATE OR REPLACE FUNCTION manage_archive_dates()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.archive_dates
    WHERE user_id = NEW.user_id
    AND archive_date NOT IN (
        SELECT archive_date
        FROM public.archive_dates
        WHERE user_id = NEW.user_id
        ORDER BY archive_date DESC
        LIMIT 31
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة المستخدمين النشطين
CREATE OR REPLACE FUNCTION public.get_active_users_last_n_days(days int)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*) 
  FROM public.users
  WHERE updated_at > (now() - (days || ' days')::interval);
$$;

-- إعادة بناء التريجرز
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_statistics_on_subscription_change ON public.subscriptions;
CREATE TRIGGER update_statistics_on_subscription_change AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

DROP TRIGGER IF EXISTS update_statistics_on_user_change ON public.users;
CREATE TRIGGER update_statistics_on_user_change AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

DROP TRIGGER IF EXISTS manage_archive_dates_on_insert ON public.archive_dates;
CREATE TRIGGER manage_archive_dates_on_insert AFTER INSERT ON public.archive_dates FOR EACH ROW EXECUTE FUNCTION manage_archive_dates();

-- =====================================================
-- 7. الفهارس والعروض (INDEXES & VIEWS)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_data_user_id ON public.archive_data (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_data_archive_date ON public.archive_data (archive_date);

-- إعادة إنشاء الـ View الخاص بالمدير (بعد حذفه في البداية)
CREATE OR REPLACE VIEW public.admin_subscriptions_view AS
SELECT
    s.id,
    s.user_id,
    COALESCE(u.full_name, u.email, 'غير معروف') AS user_name,
    s.plan_id,
    sp.name AS plan_name,
    sp.name_ar AS plan_name_ar,
    s.transaction_id,
    s.status,
    s.start_date,
    s.end_date,
    s.created_at,
    sp.price_egp AS plan_price
FROM public.subscriptions s
LEFT JOIN public.users u ON u.id = s.user_id
LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id;

GRANT SELECT ON public.admin_subscriptions_view TO authenticated;
GRANT SELECT ON public.admin_subscriptions_view TO service_role;

-- =====================================================
-- 8. إصلاحات نهائية (MIGRATIONS)
-- =====================================================
DO $$
BEGIN
    -- إصلاح اسم عمود التاريخ في الأرشيف
    IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'archive_date'
    ) THEN
        ALTER TABLE public.archive_data RENAME COLUMN "date" TO archive_date;
    END IF;

    -- تنظيف الاشتراكات اليتيمة
    DELETE FROM public.subscriptions s WHERE s.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = s.user_id);
END $$;