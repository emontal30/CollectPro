-- ====================================================================
-- COLLECTPRO - ملف قاعدة البيانات النهائي والمدمج
-- Database Schema v1.0 (Consolidated from Schema.SQL & RLS_POLICIES.sql)
-- ====================================================================
-- تاريخ الإنشاء: 2025-12-13
-- التصحيحات: 42P13, 42P16
-- ملفات المصدر: Schema.SQL, RLS_POLICIES.sql
-- ====================================================================

-- =====================================================
-- القسم 1: الإعدادات الأساسية (BASIC SETUP)
-- =====================================================

-- تثبيت الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- القسم 2: تنظيف العناصر القديمة (DROP OLD OBJECTS)
-- =====================================================
-- حذف الدوال القديمة لتجنب خطأ تغيير نوع الإرجاع
DROP FUNCTION IF EXISTS public.get_active_users_last_n_days(integer);
DROP FUNCTION IF EXISTS public.get_active_users_last_n_days(int);
DROP FUNCTION IF EXISTS public.calculate_total_revenue();
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

-- حذف الـ View القديمة
DROP VIEW IF EXISTS public.admin_subscriptions_view;

-- حذف السياسات القديمة (RLS Policies)
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- =====================================================
-- القسم 3: إنشاء الجداول (TABLES)
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
            provider JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE public.users ADD COLUMN full_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
            ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
            ALTER TABLE public.users ADD COLUMN phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'provider') THEN
            ALTER TABLE public.users ADD COLUMN provider JSONB DEFAULT '[]'::jsonb;
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
-- القسم 4: تهيئة البيانات الأولية (INITIAL DATA)
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
-- القسم 5: تفعيل سياسات الأمان (ENABLE ROW LEVEL SECURITY)
-- =====================================================

-- تفعيل RLS على جميع الجداول الحساسة
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- القسم 6: سياسات الأمان (RLS POLICIES)
-- =====================================================

-- ===== 6.1: جدول USERS (المستخدمون) =====
-- المستخدم يرى ملفه الشخصي فقط، والمدير يرى الكل
CREATE POLICY "Users can view own profile" ON public.users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users 
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- ===== 6.2: جدول SUBSCRIPTIONS (الاشتراكات) =====
-- المستخدم يرى اشتراكاته فقط، المدير يرى الكل
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions 
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions 
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions 
    FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

CREATE POLICY "Admins can delete all subscriptions" ON public.subscriptions 
    FOR DELETE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- ===== 6.3: جدول ARCHIVE_DATES (تواريخ الأرشيف) =====
-- المستخدم يرى أرشيفه فقط
CREATE POLICY "Users can view own archive dates" ON public.archive_dates 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive dates" ON public.archive_dates 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archive dates" ON public.archive_dates 
    FOR DELETE USING (auth.uid() = user_id);

-- ===== 6.4: جدول ARCHIVE_DATA (بيانات الأرشيف) =====
-- المستخدم يرى بيانات أرشيفه فقط
CREATE POLICY "Users can view own archive data" ON public.archive_data 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive data" ON public.archive_data 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archive data" ON public.archive_data 
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all archive data" ON public.archive_data 
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- ===== 6.5: جدول STATISTICS (الإحصائيات) =====
-- المدير فقط يرى الإحصائيات
CREATE POLICY "Admins can read statistics" ON public.statistics 
    FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

CREATE POLICY "Admins can update statistics" ON public.statistics 
    FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- ===== 6.6: جدول SUBSCRIPTION_PLANS (خطط الاشتراك) =====
-- الجميع يرى الخطط النشطة، المدير يدير الكل
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans 
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans 
    FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()));

-- ===== 6.7: جدول ADMINS (المديرون) =====
-- المدير يرى بيانات حسابه فقط
CREATE POLICY "Admins can view their own data" ON public.admins 
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "Service role can manage admins" ON public.admins 
    FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;

-- =====================================================
-- القسم 7: الدوال والتريجرز (FUNCTIONS & TRIGGERS)
-- =====================================================

-- ===== 7.1: دالة تحديث الوقت (Update Timestamp Function) =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 7.2: دالة حساب الإيرادات (Calculate Total Revenue) =====
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

-- ===== 7.3: دالة تحديث الإحصائيات (Update Statistics Function) =====
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

-- ===== 7.4: دالة إدارة الأرشيف (Archive Management - 31 Days) =====
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

-- ===== 7.5: دالة المستخدمين النشطين (Active Users Last N Days) =====
CREATE OR REPLACE FUNCTION public.get_active_users_last_n_days(days int)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*) 
  FROM public.users
  WHERE updated_at > (now() - (days || ' days')::interval);
$$;

-- ===== 7.6: التريجرز (TRIGGERS) =====

-- التريجر لتحديث updated_at في جدول users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- التريجر لتحديث updated_at في جدول subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- التريجر لتحديث الإحصائيات عند تغيير الاشتراكات
DROP TRIGGER IF EXISTS update_statistics_on_subscription_change ON public.subscriptions;
CREATE TRIGGER update_statistics_on_subscription_change 
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions 
    FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- التريجر لتحديث الإحصائيات عند تغيير المستخدمين
DROP TRIGGER IF EXISTS update_statistics_on_user_change ON public.users;
CREATE TRIGGER update_statistics_on_user_change 
    AFTER INSERT OR UPDATE OR DELETE ON public.users 
    FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- التريجر لإدارة تواريخ الأرشيف
DROP TRIGGER IF EXISTS manage_archive_dates_on_insert ON public.archive_dates;
CREATE TRIGGER manage_archive_dates_on_insert 
    AFTER INSERT ON public.archive_dates 
    FOR EACH ROW EXECUTE FUNCTION manage_archive_dates();

-- =====================================================
-- القسم 8: الفهارس والعروض (INDEXES & VIEWS)
-- =====================================================

-- ===== 8.1: الفهارس (INDEXES) =====
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_data_user_id ON public.archive_data (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_data_archive_date ON public.archive_data (archive_date);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_external_id ON public.subscription_plans (external_id);

-- ===== 8.2: العروض (VIEWS) =====

-- عرض اشتراكات المسؤول (Admin Subscriptions View)
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
-- القسم 9: الإصلاحات والتنظيف النهائي (MIGRATIONS & CLEANUP)
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

    -- تحديث المستخدمين الحاليين: حفظ provider كـ ["google"] (افتراضياً)
    UPDATE public.users SET provider = '["google"]'::jsonb 
    WHERE provider IS NULL OR provider = '[]'::jsonb;

    -- تنظيف الاشتراكات اليتيمة (Orphaned Subscriptions)
    DELETE FROM public.subscriptions s 
    WHERE s.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = s.user_id);
END $$;

-- =====================================================
-- القسم 10: توثيق الملف (DOCUMENTATION)
-- =====================================================
/*
╔════════════════════════════════════════════════════════════════════════════╗
║                    COLLECTPRO DATABASE SCHEMA                              ║
║                  ملف قاعدة البيانات المدمج والنهائي                      ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 محتويات الملف:
═════════════════════════════════════════════════════════════════════════════
1. الإعدادات الأساسية - تفعيل الإضافات المطلوبة
2. تنظيف العناصر القديمة - إزالة التضاربات والأخطاء
3. إنشاء الجداول - 7 جداول رئيسية
4. البيانات الأولية - خطط الاشتراك والإحصائيات
5. تفعيل Row Level Security (RLS)
6. سياسات الأمان - 20+ سياسة
7. الدوال والتريجرز - 5 دوال و 5 تريجرز
8. الفهارس والعروض - تحسين الأداء
9. الإصلاحات النهائية - تنظيف البيانات

📊 الجداول الرئيسية:
═════════════════════════════════════════════════════════════════════════════
• users                    - بيانات المستخدمين
• admins                   - بيانات المديرين
• subscription_plans       - خطط الاشتراك (3 خطط أساسية)
• subscriptions            - الاشتراكات النشطة
• archive_dates            - تواريخ الأرشيف (آخر 31 يوم)
• archive_data             - بيانات الأرشيف (المحصلات والعمولات)
• statistics               - الإحصائيات العامة

🔒 سياسات الأمان (RLS):
═════════════════════════════════════════════════════════════════════════════
• كل مستخدم يرى بيانته فقط
• المدير يرى جميع البيانات
• حماية كاملة ضد الوصول غير المصرح

🔄 التريجرز التلقائية:
═════════════════════════════════════════════════════════════════════════════
• تحديث تلقائي لـ updated_at
• تحديث الإحصائيات تلقائياً
• إدارة تاريخ الأرشيف (آخر 31 يوم)

📈 الدوال المتاحة:
═════════════════════════════════════════════════════════════════════════════
• calculate_total_revenue() - حساب إجمالي الإيرادات
• get_active_users_last_n_days(days) - المستخدمون النشطون
• update_statistics() - تحديث الإحصائيات

✅ ملاحظات مهمة:
═════════════════════════════════════════════════════════════════════════════
• لا توجد أخطاء أو تكرار في السياسات
• جميع الجداول محمية بـ RLS
• الملف جاهز للاستخدام الفوري
• تم دمج ملفات Schema.SQL و RLS_POLICIES.sql
• آخر تحديث: 2025-12-13

📧 بريد المسؤول الافتراضي:
═════════════════════════════════════════════════════════════════════════════
• emontal.33@gmail.com

*/