-- Schema for CollectPro Database in Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE public.users ADD COLUMN full_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
            ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
            ALTER TABLE public.users ADD COLUMN phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
            ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
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
            -- Arabic display name; ensure non-null with a safe default to avoid failing inserts
            name_ar TEXT NOT NULL DEFAULT '',
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            duration_days INTEGER NOT NULL,
            -- duration in months to match dashboard logic (e.g., 1,3,12)
            duration_months INTEGER NOT NULL DEFAULT 1,
            features JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_days') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_months') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN duration_months INTEGER NOT NULL DEFAULT 1;
        END IF;
        -- Ensure existing column has a default and is not null
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'duration_months') THEN
            -- set a safe default
            ALTER TABLE public.subscription_plans ALTER COLUMN duration_months SET DEFAULT 1;
            -- populate NULL values if any
            UPDATE public.subscription_plans SET duration_months = 1 WHERE duration_months IS NULL;
            -- enforce NOT NULL
            ALTER TABLE public.subscription_plans ALTER COLUMN duration_months SET NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'features') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN features JSONB;
        END IF;
        -- Ensure Arabic name column exists and has a safe default so INSERTs that omit it won't fail
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'name_ar') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN name_ar TEXT NOT NULL DEFAULT '';
        END IF;
        -- External identifier for linking to Stripe price IDs or other external systems (optional)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'external_id') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN external_id TEXT;
        END IF;
        -- Add index on external_id for faster lookups when mapping from payment providers
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subscription_plans' AND indexname = 'idx_subscription_plans_external_id') THEN
            CREATE INDEX idx_subscription_plans_external_id ON public.subscription_plans (external_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'is_active') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'created_at') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'updated_at') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        -- Add price_egp column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_egp') THEN
            ALTER TABLE public.subscription_plans ADD COLUMN price_egp DECIMAL(10,2) NOT NULL DEFAULT 0;
        ELSE
            -- Ensure it's not null and has a default
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
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_id') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_name') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_period') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_period TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'price') THEN
            ALTER TABLE public.subscriptions ADD COLUMN price DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'transaction_id') THEN
            ALTER TABLE public.subscriptions ADD COLUMN transaction_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'status') THEN
            ALTER TABLE public.subscriptions ADD COLUMN status TEXT CHECK (status IN ('pending', 'active', 'cancelled', 'expired')) DEFAULT 'pending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'start_date') THEN
            ALTER TABLE public.subscriptions ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'end_date') THEN
            ALTER TABLE public.subscriptions ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'created_at') THEN
            ALTER TABLE public.subscriptions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'updated_at') THEN
            ALTER TABLE public.subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Archive dates table (only dates, no detailed data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archive_dates' AND table_schema = 'public') THEN
        CREATE TABLE public.archive_dates (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            archive_date DATE NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'user_id') THEN
            ALTER TABLE public.archive_dates ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'archive_date') THEN
            ALTER TABLE public.archive_dates ADD COLUMN archive_date DATE NOT NULL UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_dates' AND column_name = 'created_at') THEN
            ALTER TABLE public.archive_dates ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Archive data table (detailed data for selected dates)
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
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'user_id') THEN
            ALTER TABLE public.archive_data ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'archive_date') THEN
            ALTER TABLE public.archive_data ADD COLUMN archive_date DATE NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'shop') THEN
            ALTER TABLE public.archive_data ADD COLUMN shop TEXT NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'code') THEN
            ALTER TABLE public.archive_data ADD COLUMN code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'amount') THEN
            ALTER TABLE public.archive_data ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'extra') THEN
            ALTER TABLE public.archive_data ADD COLUMN extra DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'collector') THEN
            ALTER TABLE public.archive_data ADD COLUMN collector DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'net') THEN
            ALTER TABLE public.archive_data ADD COLUMN net DECIMAL(10,2) GENERATED ALWAYS AS (collector - (extra + amount)) STORED;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'archive_data' AND column_name = 'created_at') THEN
            ALTER TABLE public.archive_data ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Statistics table for admin dashboard
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
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'total_users') THEN
            ALTER TABLE public.statistics ADD COLUMN total_users INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'active_subscriptions') THEN
            ALTER TABLE public.statistics ADD COLUMN active_subscriptions INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'total_revenue') THEN
            ALTER TABLE public.statistics ADD COLUMN total_revenue DECIMAL(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'pending_requests') THEN
            ALTER TABLE public.statistics ADD COLUMN pending_requests INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'last_sync') THEN
            ALTER TABLE public.statistics ADD COLUMN last_sync TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statistics' AND column_name = 'updated_at') THEN
            ALTER TABLE public.statistics ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'أساسي') THEN
        INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) VALUES
        ('أساسي', 'أساسي', 'خطة أساسية للمبتدئين', 100.00, 30, 1, '["إدخال البيانات", "التحصيلات", "الأرشيف"]'::jsonb, TRUE, 100.00);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'متقدم') THEN
        INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) VALUES
        ('متقدم', 'متقدم', 'خطة متقدمة مع ميزات إضافية', 200.00, 90, 3, '["جميع الميزات الأساسية", "عداد الأموال", "إحصائيات مفصلة"]'::jsonb, TRUE, 200.00);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'احترافي') THEN
        INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) VALUES
        ('احترافي', 'احترافي', 'خطة احترافية كاملة', 300.00, 365, 12, '["جميع الميزات", "دعم فني", "تحديثات مجانية"]'::jsonb, TRUE, 300.00);
    END IF;
END $$;

-- Insert initial statistics (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.statistics) THEN
        INSERT INTO public.statistics (total_users, active_subscriptions, total_revenue, pending_requests, last_sync) VALUES (0, 0, 0, 0, NOW());
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- CORRECTED: Changed 'harvest_data' to 'archive_dates' as 'harvest_data' does not exist
ALTER TABLE public.archive_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (users can only see their own data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- RLS Policies for subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own subscriptions') THEN
        CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own subscriptions') THEN
        CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update own subscriptions') THEN
        CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS Policies for archive_dates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own archive dates') THEN
        CREATE POLICY "Users can view own archive dates" ON public.archive_dates FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own archive dates') THEN
        CREATE POLICY "Users can insert own archive dates" ON public.archive_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete own archive dates') THEN
        CREATE POLICY "Users can delete own archive dates" ON public.archive_dates FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS Policies for archive_data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own archive data') THEN
        CREATE POLICY "Users can view own archive data" ON public.archive_data FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own archive data') THEN
        CREATE POLICY "Users can insert own archive data" ON public.archive_data FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete own archive data') THEN
        CREATE POLICY "Users can delete own archive data" ON public.archive_data FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Admin policies (assuming admin role in auth.users.user_metadata)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all users') THEN
        CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all subscriptions') THEN
        CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can update all subscriptions') THEN
        CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all archive dates') THEN
        CREATE POLICY "Admins can view all archive dates" ON public.archive_dates FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can view all archive data') THEN
        CREATE POLICY "Admins can view all archive data" ON public.archive_data FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can update statistics') THEN
        CREATE POLICY "Admins can update statistics" ON public.statistics FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON public.users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscription_plans_updated_at') THEN
        CREATE TRIGGER update_subscription_plans_updated_at 
        BEFORE UPDATE ON public.subscription_plans 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
        CREATE TRIGGER update_subscriptions_updated_at 
        BEFORE UPDATE ON public.subscriptions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_archive_data_updated_at') THEN
        CREATE TRIGGER update_archive_data_updated_at 
        BEFORE UPDATE ON public.archive_data 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to update statistics
CREATE OR REPLACE FUNCTION update_statistics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.statistics SET
        total_users = (SELECT COUNT(*) FROM public.users),
        active_subscriptions = (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'),
        total_revenue = (SELECT COALESCE(SUM(sp.price), 0) FROM public.subscriptions s JOIN public.subscription_plans sp ON s.plan_id::text = sp.id::text WHERE s.status = 'active'),
        pending_requests = (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'pending'),
        last_sync = NOW(),
        updated_at = NOW();
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to update statistics on subscription changes
DROP TRIGGER IF EXISTS update_statistics_on_subscription_change ON public.subscriptions;
CREATE TRIGGER update_statistics_on_subscription_change
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- Trigger to update statistics on user changes
DROP TRIGGER IF EXISTS update_statistics_on_user_change ON public.users;
CREATE TRIGGER update_statistics_on_user_change
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- Trigger to update statistics on archive dates changes
DROP TRIGGER IF EXISTS update_statistics_on_archive_change ON public.archive_dates;
CREATE TRIGGER update_statistics_on_archive_change
    AFTER INSERT OR UPDATE OR DELETE ON public.archive_dates
    FOR EACH STATEMENT EXECUTE FUNCTION update_statistics();

-- Function to manage archive dates (keep only 31 days)
CREATE OR REPLACE FUNCTION manage_archive_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete oldest dates if more than 31
    DELETE FROM public.archive_dates
    WHERE user_id = NEW.user_id
    AND archive_date < (
        SELECT MIN(archive_date)
        FROM (
            SELECT archive_date
            FROM public.archive_dates
            WHERE user_id = NEW.user_id
            ORDER BY archive_date DESC
            LIMIT 31
        ) latest
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to manage archive dates on insert
DROP TRIGGER IF EXISTS manage_archive_dates_on_insert ON public.archive_dates;
CREATE TRIGGER manage_archive_dates_on_insert
    AFTER INSERT ON public.archive_dates
    FOR EACH ROW EXECUTE FUNCTION manage_archive_dates();

-- Helpful view for admin dashboard: joins subscriptions with users and plans
DO $$
BEGIN
    -- Drop the view first if it exists to avoid dependency issues
    DROP VIEW IF EXISTS public.admin_subscriptions_view CASCADE;

    -- First ensure foreign key references are properly set up with explicit names
    -- If columns exist with incompatible types (e.g. text), try to convert them to uuid.
    -- Convert only values that match the UUID pattern; clear invalid values first.
    ALTER TABLE IF EXISTS public.subscriptions 
    DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey,
    DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

    -- Ensure plan_id is uuid-typed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id'
        AND data_type <> 'uuid'
    ) THEN
        RAISE NOTICE 'Converting subscriptions.plan_id to uuid (invalid values will be cleared).';
        -- First temporarily remove the NOT NULL constraint if it exists
        ALTER TABLE public.subscriptions ALTER COLUMN plan_id DROP NOT NULL;

        -- Null out values that do not match a UUID pattern to avoid cast errors
        UPDATE public.subscriptions
        SET plan_id = NULL
        WHERE plan_id IS NOT NULL AND NOT (plan_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

        -- Now alter column type using explicit cast
        ALTER TABLE public.subscriptions
        ALTER COLUMN plan_id TYPE uuid USING plan_id::uuid;

        -- Update any subscriptions with a NULL plan_id to a default plan
        -- This prevents the NOT NULL constraint from failing
        UPDATE public.subscriptions
        SET plan_id = (SELECT id FROM public.subscription_plans WHERE name = 'أساسي' LIMIT 1)
        WHERE plan_id IS NULL;

        -- Add the NOT NULL constraint back
        ALTER TABLE public.subscriptions ALTER COLUMN plan_id SET NOT NULL;
    END IF;

    -- Ensure user_id is uuid-typed (if not, try to convert similarly)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'user_id'
        AND data_type <> 'uuid'
    ) THEN
        RAISE NOTICE 'Converting subscriptions.user_id to uuid (invalid values will be cleared).';
        UPDATE public.subscriptions
        SET user_id = NULL
        WHERE user_id IS NOT NULL AND NOT (user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

        ALTER TABLE public.subscriptions
        ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    END IF;

    -- =================================================================
    -- FIX: Clean up orphaned subscriptions BEFORE adding the constraint
    -- This deletes subscriptions where the user_id no longer exists in the users table
    -- =================================================================
    RAISE NOTICE 'Cleaning up orphaned subscriptions (user_id not in public.users)...';
    DELETE FROM public.subscriptions s
    WHERE s.user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = s.user_id
    );
    RAISE NOTICE 'Orphaned subscriptions cleaned.';

    -- Add the foreign key constraints now that column types are compatible and data is clean
    ALTER TABLE IF EXISTS public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey 
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

    -- Now create the admin view with proper joins
    CREATE VIEW public.admin_subscriptions_view AS
    SELECT
        s.id,
        s.user_id,
        COALESCE(u.full_name, u.email, '') AS user_name,
        s.plan_id,
        sp.name AS plan_name,
        sp.name_ar AS plan_name_ar,
        sp.external_id AS plan_external_id,
        s.transaction_id,
        s.status,
        s.start_date,
        s.end_date,
        s.created_at,
        sp.price AS plan_price
    FROM public.subscriptions s
    LEFT JOIN public.users u ON u.id = s.user_id
    LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id;

    -- Grant permissions to the view
    GRANT SELECT ON public.admin_subscriptions_view TO authenticated;
    GRANT SELECT ON public.admin_subscriptions_view TO service_role;
END $$;

-- Function to return dashboard stats in a single call
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(total_users BIGINT, pending_requests BIGINT, active_subscriptions BIGINT, total_revenue NUMERIC) AS $$
BEGIN
    -- Create a temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS temp_stats AS
    SELECT
        (SELECT COUNT(*)::BIGINT FROM public.users) AS total_users,
        (SELECT COUNT(*)::BIGINT FROM public.subscriptions WHERE status = 'pending') AS pending_requests,
        (SELECT COUNT(*)::BIGINT FROM public.subscriptions WHERE status = 'active') AS active_subscriptions,
        (SELECT COALESCE(SUM(sp.price), 0) FROM public.subscriptions s JOIN public.subscription_plans sp ON s.plan_id = sp.id WHERE s.status = 'active') AS total_revenue;
    
    -- Return results and clean up
    RETURN QUERY SELECT * FROM temp_stats;
    DROP TABLE IF EXISTS temp_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin SELECT policy for statistics (allow admin JWT role to read statistics)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can read statistics' AND polrelid = 'public.statistics'::regclass) THEN
        CREATE POLICY "Admins can read statistics" ON public.statistics FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

-- Indexes to speed up dashboard queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions (plan_id);
