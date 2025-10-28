-- Schema for CollectPro Database in Supabase
-- النسخة النهائية المُصححة - تاريخ: 27 أكتوبر 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES CREATION
-- =====================================================

-- Users table (extends Supabase auth.users)
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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN full_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Subscription plans table
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
        
        CREATE INDEX idx_subscription_plans_external_id ON public.subscription_plans (external_id);
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_days' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_months' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN duration_months INTEGER NOT NULL DEFAULT 1;
        ELSE
            ALTER TABLE public.subscription_plans ALTER COLUMN duration_months SET DEFAULT 1;
            UPDATE public.subscription_plans SET duration_months = 1 WHERE duration_months IS NULL;
            ALTER TABLE public.subscription_plans ALTER COLUMN duration_months SET NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'features' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN features JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'name_ar' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN name_ar TEXT NOT NULL DEFAULT '';
        ELSE
            ALTER TABLE public.subscription_plans ALTER COLUMN name_ar SET DEFAULT '';
            UPDATE public.subscription_plans SET name_ar = '' WHERE name_ar IS NULL;
            ALTER TABLE public.subscription_plans ALTER COLUMN name_ar SET NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'external_id' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN external_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subscription_plans' AND indexname = 'idx_subscription_plans_external_id') THEN
            CREATE INDEX idx_subscription_plans_external_id ON public.subscription_plans (external_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'is_active' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'created_at' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_egp' AND table_schema = 'public') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN price_egp DECIMAL(10,2) NOT NULL DEFAULT 0;
        ELSE
            ALTER TABLE public.subscription_plans ALTER COLUMN price_egp SET DEFAULT 0;
            UPDATE public.subscription_plans SET price_egp = price WHERE price_egp IS NULL;
            ALTER TABLE public.subscription_plans ALTER COLUMN price_egp SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Subscriptions table
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
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_id' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_name' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_period' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_period TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'price' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN price DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'transaction_id' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN transaction_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'status' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN status TEXT CHECK (status IN ('pending', 'active', 'cancelled', 'expired')) DEFAULT 'pending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'start_date' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'end_date' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'created_at' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Archive dates table
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
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_dates ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'archive_date' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_dates ADD COLUMN archive_date DATE NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'created_at' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_dates ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Archive data table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archive_data' AND table_schema = 'public') THEN
        CREATE TABLE public.archive_data (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            archive_date DATE NOT NULL,
            shop TEXT NOT NULL,
            code TEXT,
            amount DECIMAL(10,2) NOT NULL,
            extra DECIMAL(10,2) DEFAULT 0,
            collector DECIMAL(10,2) DEFAULT 0,
            net DECIMAL(10,2) GENERATED ALWAYS AS (collector - (extra + amount)) STORED,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'archive_date' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN archive_date DATE NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'shop' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN shop TEXT NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'code' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'amount' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'extra' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN extra DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'collector' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN collector DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'created_at' AND table_schema = 'public') THEN
            ALTER TABLE public.archive_data ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Statistics table
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
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'total_users' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN total_users INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'active_subscriptions' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN active_subscriptions INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'total_revenue' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN total_revenue DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'pending_requests' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN pending_requests INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'last_sync' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN last_sync TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'updated_at' AND table_schema = 'public') THEN
            ALTER TABLE public.statistics ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- =====================================================
-- DATA INITIALIZATION (حذف الاشتراكات أولاً ثم الخطط)
-- =====================================================

DO $$
BEGIN
    -- حذف جميع الاشتراكات التجريبية أولاً
    DELETE FROM public.subscriptions;
    RAISE NOTICE '✓ تم حذف جميع الاشتراكات التجريبية';
    
    -- الآن يمكن حذف الخطط بأمان
    DELETE FROM public.subscription_plans;
    RAISE NOTICE '✓ تم حذف جميع الخطط القديمة';
    
    -- إدراج الخطط الثلاثة الصحيحة فقط (30، 80، 360)
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'MONTH-1', 'خطة أساسية للمبتدئين', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات", "الأرشيف"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'MONTH-3', 'خطة متقدمة مع ميزات إضافية', 80.00, 90, 3, '["جميع الميزات الأساسية", "عداد الأموال", "إحصائيات مفصلة"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', '1-YEAR-1', 'خطة احترافية كاملة', 360.00, 365, 12, '["جميع الميزات", "دعم فني", "تحديثات مجانية"]'::jsonb, TRUE, 360.00);
        
    RAISE NOTICE '✓ تم إدراج الخطط الثلاثة الصحيحة (30، 80، 360)';
END $$;

-- Insert initial statistics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.statistics) THEN
        INSERT INTO public.statistics (total_users, active_subscriptions, total_revenue, pending_requests, last_sync) 
        VALUES (0, 0, 0, 0, NOW());
        RAISE NOTICE '✓ تم إنشاء جدول الإحصائيات';
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "Users can view own archive dates" ON public.archive_dates;
DROP POLICY IF EXISTS "Users can insert own archive dates" ON public.archive_dates;
DROP POLICY IF EXISTS "Users can delete own archive dates" ON public.archive_dates;
DROP POLICY IF EXISTS "Admins can view all archive dates" ON public.archive_dates;

DROP POLICY IF EXISTS "Users can view own archive data" ON public.archive_data;
DROP POLICY IF EXISTS "Users can insert own archive data" ON public.archive_data;
DROP POLICY IF EXISTS "Users can delete own archive data" ON public.archive_data;
DROP POLICY IF EXISTS "Admins can view all archive data" ON public.archive_data;

DROP POLICY IF EXISTS "Admins can update statistics" ON public.statistics;
DROP POLICY IF EXISTS "Admins can read statistics" ON public.statistics;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON public.users 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users 
    FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions 
    FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions 
    FOR UPDATE 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- RLS Policies for archive_dates
CREATE POLICY "Users can view own archive dates" ON public.archive_dates 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive dates" ON public.archive_dates 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archive dates" ON public.archive_dates 
    FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all archive dates" ON public.archive_dates 
    FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- RLS Policies for archive_data
CREATE POLICY "Users can view own archive data" ON public.archive_data 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive data" ON public.archive_data 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archive data" ON public.archive_data 
    FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all archive data" ON public.archive_data 
    FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- RLS Policies for statistics
CREATE POLICY "Admins can read statistics" ON public.statistics 
    FOR SELECT 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update statistics" ON public.statistics 
    FOR ALL 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans 
    FOR SELECT 
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans 
    FOR ALL 
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total revenue (محسّن)
DROP FUNCTION IF EXISTS public.calculate_total_revenue() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_total_revenue()
RETURNS NUMERIC 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    total_revenue NUMERIC := 0;
BEGIN
    -- حساب مجموع price_egp للاشتراكات النشطة فقط
    SELECT COALESCE(SUM(sp.price_egp), 0)
    INTO total_revenue
    FROM public.subscriptions s
    INNER JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active'
      AND s.plan_id IS NOT NULL
      AND sp.id IS NOT NULL;

    RETURN COALESCE(total_revenue, 0);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في حساب الإيرادات: %', SQLERRM;
        RETURN 0;
END;
$$;

-- منح صلاحيات تنفيذ دالة الإيرادات
GRANT EXECUTE ON FUNCTION public.calculate_total_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_total_revenue() TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_total_revenue() TO service_role;

-- Function to update statistics
CREATE OR REPLACE FUNCTION update_statistics()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحديث أو إدراج الإحصائيات
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
    ON CONFLICT (id) 
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_subscriptions = EXCLUDED.active_subscriptions,
        total_revenue = EXCLUDED.total_revenue,
        pending_requests = EXCLUDED.pending_requests,
        last_sync = EXCLUDED.last_sync,
        updated_at = NOW();
    
    RETURN NULL;
END;
$$;

-- Function to manage archive dates (keep only 31 days per user)
CREATE OR REPLACE FUNCTION manage_archive_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- حذف التواريخ الأقدم إذا كان هناك أكثر من 31 تاريخ
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

-- Function to return dashboard stats in a single call
DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
    total_users BIGINT, 
    pending_requests BIGINT, 
    active_subscriptions BIGINT, 
    total_revenue NUMERIC
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT FROM public.users) AS total_users,
        (SELECT COUNT(*)::BIGINT FROM public.subscriptions WHERE status = 'pending') AS pending_requests,
        (SELECT COUNT(*)::BIGINT FROM public.subscriptions WHERE status = 'active') AS active_subscriptions,
        (SELECT public.calculate_total_revenue()) AS total_revenue;
END;
$$;

-- منح صلاحيات تنفيذ دالة الإحصائيات
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS update_statistics_updated_at ON public.statistics;
DROP TRIGGER IF EXISTS update_statistics_on_subscription_change ON public.subscriptions;
DROP TRIGGER IF EXISTS update_statistics_on_user_change ON public.users;
DROP TRIGGER IF EXISTS manage_archive_dates_on_insert ON public.archive_dates;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON public.subscription_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at 
    BEFORE UPDATE ON public.statistics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers to update statistics
CREATE TRIGGER update_statistics_on_subscription_change
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH STATEMENT 
    EXECUTE FUNCTION update_statistics();

CREATE TRIGGER update_statistics_on_user_change
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH STATEMENT 
    EXECUTE FUNCTION update_statistics();

-- Create trigger to manage archive dates
CREATE TRIGGER manage_archive_dates_on_insert
    AFTER INSERT ON public.archive_dates
    FOR EACH ROW 
    EXECUTE FUNCTION manage_archive_dates();

-- =====================================================
-- VIEWS
-- =====================================================

-- Clean up orphaned subscriptions first
DO $$
BEGIN
    DELETE FROM public.subscriptions s
    WHERE s.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = s.user_id);
    RAISE NOTICE '✓ تم تنظيف الاشتراكات اليتيمة';
END $$;

-- Create admin view for subscriptions
DROP VIEW IF EXISTS public.admin_subscriptions_view CASCADE;

CREATE VIEW public.admin_subscriptions_view AS
SELECT
    s.id,
    s.user_id,
    COALESCE(u.full_name, u.email, 'غير معروف') AS user_name,
    s.plan_id,
    sp.name AS plan_name,
    sp.name_ar AS plan_name_ar,
    sp.external_id AS plan_external_id,
    s.transaction_id,
    s.status,
    s.start_date,
    s.end_date,
    s.created_at,
    sp.price_egp AS plan_price
FROM public.subscriptions s
LEFT JOIN public.users u ON u.id = s.user_id
LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id;

-- Grant permissions on the view
GRANT SELECT ON public.admin_subscriptions_view TO authenticated;
GRANT SELECT ON public.admin_subscriptions_view TO service_role;

-- =====================================================
-- INDEXES
-- =====================================================

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_dates_user_id ON public.archive_dates (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_dates_archive_date ON public.archive_dates (archive_date);
CREATE INDEX IF NOT EXISTS idx_archive_data_user_id ON public.archive_data (user_id);
CREATE INDEX IF NOT EXISTS idx_archive_data_archive_date ON public.archive_data (archive_date);

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    plan_count INTEGER;
    basic_plan_price DECIMAL(10,2);
    advanced_plan_price DECIMAL(10,2);
    professional_plan_price DECIMAL(10,2);
BEGIN
    -- عد الخطط
    SELECT COUNT(*) INTO plan_count FROM public.subscription_plans;
    
    -- الحصول على أسعار الخطط
    SELECT price_egp INTO basic_plan_price FROM public.subscription_plans WHERE name = 'MONTH-1';
    SELECT price_egp INTO advanced_plan_price FROM public.subscription_plans WHERE name = 'MONTH-3';
    SELECT price_egp INTO professional_plan_price FROM public.subscription_plans WHERE name = 'YEAR-1';
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '                 تم الانتهاء من إعداد قاعدة البيانات';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'عدد الخطط المتاحة: %', plan_count;
    RAISE NOTICE '';
    RAISE NOTICE 'الخطط المُدرجة:';
    RAISE NOTICE '  1. أساسي: % ج.م (شهر واحد)', basic_plan_price;
    RAISE NOTICE '  2.( متقدم): % ج.م (3 أشهر)', advanced_plan_price;
    RAISE NOTICE '  3. احترافي: % ج.م (12 شهر)', professional_plan_price;
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '  ✓ جميع الجداول تم إنشاؤها';
    RAISE NOTICE '  ✓ جميع الدوال تم إنشاؤها';
    RAISE NOTICE '  ✓ جميع الـ Triggers تم إنشاؤها';
    RAISE NOTICE '  ✓ جميع سياسات RLS تم إنشاؤها';
    RAISE NOTICE '  ✓ جميع الفهارس تم إنشاؤها';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'للاختبار، نفّذ: SELECT calculate_total_revenue();';
    RAISE NOTICE 'النتيجة المتوقعة: 0 (لا توجد اشتراكات نشطة حالياً)';
    RAISE NOTICE '';
END $$;
