-- ====================================================================
-- SECURITY FIXES SCRIPT (Run this in Supabase SQL Editor)
-- ====================================================================

-- 1. Fix "Exposed Auth Users" & "Security Definer View" issues
-- We change these views to use permissions of the caller (invoker) instead of the creator (definer).
-- This prevents 'anon' users from accessing data they shouldn't see through these views.

DO $$
BEGIN
    -- Fix: admin_access
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_access' AND schemaname = 'public') THEN
        ALTER VIEW public.admin_access SET (security_invoker = true);
    END IF;

    -- Fix: admin_statistics_view
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_statistics_view' AND schemaname = 'public') THEN
        ALTER VIEW public.admin_statistics_view SET (security_invoker = true);
    END IF;

    -- Fix: harvest_daily_summary
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'harvest_daily_summary' AND schemaname = 'public') THEN
        ALTER VIEW public.harvest_daily_summary SET (security_invoker = true);
    END IF;

    -- Fix: admin_kpi_view
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_kpi_view' AND schemaname = 'public') THEN
        ALTER VIEW public.admin_kpi_view SET (security_invoker = true);
    END IF;
    
    -- Fix: user_subscription_status
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'user_subscription_status' AND schemaname = 'public') THEN
        ALTER VIEW public.user_subscription_status SET (security_invoker = true);
    END IF;
END $$;

-- 2. Fix "RLS Disabled in Public"
-- We enable RLS on identified tables and add basic policies to ensure functionality isn't broken.

-- Table: public.subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
-- Policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());


-- Table: public.users
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
-- Policies for users
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.users;
CREATE POLICY "Allow users to view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins to manage all profiles" ON public.users;
CREATE POLICY "Allow admins to manage all profiles" ON public.users FOR ALL USING (public.is_admin());


-- Table: public.archive_search (Reported as missing RLS)
ALTER TABLE IF EXISTS public.archive_search ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'archive_search' AND schemaname = 'public') THEN
        -- Verify if user_id column exists to create a user-specific policy
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='archive_search' AND column_name='user_id') THEN
             EXECUTE 'DROP POLICY IF EXISTS "Users view own archive search" ON public.archive_search';
             EXECUTE 'CREATE POLICY "Users view own archive search" ON public.archive_search FOR ALL USING (auth.uid() = user_id)';
        ELSE
             -- Fallback: If no user_id, assumes it's shared data? Or maybe admin only? 
             -- Safest fallback for "search" is to allow read for authenticated users if no user_id is present, 
             -- BUT since it's "archive", it's likely private.
             -- Let's assume Admin Only if we can't map to user.
             EXECUTE 'DROP POLICY IF EXISTS "Admins manage archive search" ON public.archive_search';
             EXECUTE 'CREATE POLICY "Admins manage archive search" ON public.archive_search FOR ALL USING (public.is_admin())';
        END IF;
    END IF;
END $$;

-- Table: public.profiles (Reported as missing RLS)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
        -- Policy: Users can view their own profile
        BEGIN
             DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
             CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
        EXCEPTION WHEN OTHERS THEN
             NULL;
        END;

        -- Policy: Users can update their own profile
        BEGIN
             DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
             CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        EXCEPTION WHEN OTHERS THEN
             NULL;
        END;

        -- Policy: Admins manage all
        BEGIN
             DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
             CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.is_admin());
        EXCEPTION WHEN OTHERS THEN
             NULL;
        END;

        -- Explicitly GRANT permissions to ensure no 406/403 errors
        GRANT SELECT ON public.profiles TO authenticated;
        GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
        GRANT USAGE ON SCHEMA public TO authenticated;
        
    END IF;
END $$;

-- ====================================================================
-- 6. Refresh Schema Cache
-- ====================================================================
-- This is critical to fix 406 errors caused by stale PostgREST cache
NOTIFY pgrst, 'reload config';


-- Table: public.system_settings (Reported as missing RLS)
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
-- Policies for system_settings (Usually Read for All/Auth, Write for Admin)
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read system settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (public.is_admin());


-- 3. Double Check RLS on other reported tables if any
-- (All addressed above)


-- ====================================================================
-- 4. Fix "Function Search Path Mutable" (WARN)
-- ====================================================================
-- We explicitly set the search_path for these functions to 'public' to prevent
-- malicious users from hijacking the search path.

DO $$
DECLARE
    r RECORD;
    target_functions TEXT[] := ARRAY[
        'log_audit_event',
        'handle_email_queue_updated_at',
        'handle_messages_updated_at',
        'log_messages_activity',
        'log_email_queue_activity',
        'handle_notification_settings_updated_at',
        'clean_old_user_actions',
        'log_notification_settings_activity',
        'update_updated_at_column',
        'get_active_users_last_n_days',
        'diagnose_permissions',
        'log_activity',
        'handle_updated_at',
        'handle_new_user',
        'handle_notification_read_at',
        'get_admin_dashboard_statistics',
        'log_error',
        'log_notifications_activity',
        'get_admin_status'
    ];
    func_name TEXT;
BEGIN
    FOREACH func_name IN ARRAY target_functions
    LOOP
        -- Find all functions with this name in the public schema
        FOR r IN 
            SELECT oid::regprocedure::text as func_sig
            FROM pg_proc
            WHERE proname = func_name
            AND pronamespace = 'public'::regnamespace
        LOOP
            -- Execute the ALTER command dynamically using the exact signature found
            RAISE NOTICE 'Fixing search_path for: %', r.func_sig;
            EXECUTE 'ALTER FUNCTION ' || r.func_sig || ' SET search_path = public';
        END LOOP;
    END LOOP;
END $$;

