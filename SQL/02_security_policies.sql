-- ====================================================================
-- COLLECTPRO DATABASE - FILE 2/3: SECURITY & POLICIES
-- Includes: RLS Policies, Security Fixes, View Permissions
-- ====================================================================

-- 1. HELPER FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.drop_all_policies_for_table(schema_name text, table_name text)
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql VOLATILE AS $$
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = schema_name AND tablename = table_name LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, schema_name, table_name);
    END LOOP;
END;
$$;


-- 2. COLLABORATION & LIVE HARVEST POLICIES (Supervision/Collaboration Mode)
-- ====================================================================
-- Logic: Owner full control. Supervisor can view/edit specific tables if accepted.
-- ====================================================================

ALTER TABLE public.live_harvest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Clean slate for these tables
    PERFORM public.drop_all_policies_for_table('public', 'live_harvest');
    PERFORM public.drop_all_policies_for_table('public', 'collaboration_requests');

    -- Collaboration Requests Policies
    -- ----------------------------------------------------
    CREATE POLICY "Sender can insert request" ON public.collaboration_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Related users can view requests" ON public.collaboration_requests FOR SELECT TO authenticated 
    USING (sender_id = auth.uid() OR receiver_code = (SELECT user_code FROM profiles WHERE id = auth.uid()) OR receiver_id = auth.uid());
    
    CREATE POLICY "Receiver can update status" ON public.collaboration_requests FOR UPDATE TO authenticated 
    USING (receiver_code = (SELECT user_code FROM profiles WHERE id = auth.uid()) OR receiver_id = auth.uid());
    
    CREATE POLICY "Related users can delete requests" ON public.collaboration_requests FOR DELETE TO authenticated 
    USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_code = (SELECT user_code FROM profiles WHERE id = auth.uid()));

    -- Live Harvest Policies
    -- ----------------------------------------------------
    CREATE POLICY "Owner full access" ON public.live_harvest FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

    -- Supervisor VIEW (If accepted)
    CREATE POLICY "Supervisor can view shared data" ON public.live_harvest FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM collaboration_requests WHERE sender_id = auth.uid() AND receiver_id = live_harvest.user_id AND status = 'accepted'));

    -- Supervisor EDIT (If accepted + Editor role)
    CREATE POLICY "Supervisor can update shared data" ON public.live_harvest FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM collaboration_requests WHERE sender_id = auth.uid() AND receiver_id = live_harvest.user_id AND status = 'accepted' AND role = 'editor'))
    WITH CHECK (EXISTS (SELECT 1 FROM collaboration_requests WHERE sender_id = auth.uid() AND receiver_id = live_harvest.user_id AND status = 'accepted' AND role = 'editor'));

    -- Add Realtime Publication safely
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_requests;
      ALTER PUBLICATION supabase_realtime ADD TABLE live_harvest;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

GRANT SELECT ON collaboration_requests TO authenticated;
GRANT SELECT ON live_harvest TO authenticated;


-- 3. OTHER MODULE POLICIES (Routes, Overdue, Actions, Config)
-- ====================================================================

DO $$ BEGIN
    -- A. pending_overdue_stores
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'pending_overdue_stores') THEN
        ALTER TABLE public.pending_overdue_stores ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'pending_overdue_stores');
        CREATE POLICY "Users manage own overdue" ON public.pending_overdue_stores FOR ALL USING ((auth.uid() = user_id) AND public.can_write_data());
        CREATE POLICY "Admin access overdue" ON public.pending_overdue_stores FOR ALL USING (public.is_admin());
    END IF;

    -- B. route_profiles
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'route_profiles') THEN
        ALTER TABLE public.route_profiles ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'route_profiles');
        CREATE POLICY "Users manage own profiles" ON public.route_profiles FOR ALL USING ((auth.uid() = user_id) AND public.can_write_data());
        CREATE POLICY "Admin access profiles" ON public.route_profiles FOR ALL USING (public.is_admin());
    END IF;

    -- C. user_actions
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_actions') THEN
        ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'user_actions');
        CREATE POLICY "Users insert actions" ON public.user_actions FOR INSERT WITH CHECK ((auth.uid() = user_id) AND public.can_write_data());
        CREATE POLICY "Admin view actions" ON public.user_actions FOR SELECT USING (public.is_admin());
    END IF;
    
    -- D. system_config (Was system_settings)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_config') THEN
        ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'system_config');
        CREATE POLICY "Auth users read config" ON public.system_config FOR SELECT USING (auth.role() = 'authenticated');
        CREATE POLICY "Admin manage config" ON public.system_config FOR ALL USING (public.is_admin());
    END IF;

    -- E. subscriptions (Missing)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscriptions') THEN
        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'subscriptions');
        CREATE POLICY "Users view own subs" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users insert own subs" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Admin manage all subs" ON public.subscriptions FOR ALL USING (public.is_admin());
    END IF;

    -- F. subscription_plans (Missing)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_plans') THEN
        ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'subscription_plans');
        CREATE POLICY "Public view active plans" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);
        CREATE POLICY "Admin manage plans" ON public.subscription_plans FOR ALL USING (public.is_admin());
    END IF;

    -- G. statistics (Missing)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'statistics') THEN
        ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'statistics');
        CREATE POLICY "Admin view statistics" ON public.statistics FOR SELECT USING (public.is_admin());
    END IF;

    -- H. users (Core - Missing in consolidation)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'users');
        CREATE POLICY "Allow users to view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Allow admins to manage all profiles" ON public.users FOR ALL USING (public.is_admin());
    END IF;

    -- I. profiles (Core - Missing in consolidation)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'profiles');
        CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        -- Allow finding profiles by code for collaboration
        CREATE POLICY "Users sync by code" ON public.profiles FOR SELECT USING (true); 
        CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.is_admin());
    END IF;

    -- J. daily_archives (Fix for 403 Error)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'daily_archives') THEN
        ALTER TABLE public.daily_archives ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'daily_archives');
        CREATE POLICY "Users manage own archives" ON public.daily_archives FOR ALL USING ((auth.uid() = user_id) AND public.can_write_data());
    END IF;

    -- K. admin_user_commands (Security Fix)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_user_commands') THEN
        ALTER TABLE public.admin_user_commands ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'admin_user_commands');
        
        CREATE POLICY "Admins can manage all commands" ON public.admin_user_commands FOR ALL
        USING (public.is_admin());

        CREATE POLICY "Users can view their own commands" ON public.admin_user_commands FOR SELECT
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own commands" ON public.admin_user_commands FOR DELETE
        USING (auth.uid() = user_id);
    END IF;

    -- L. archive_search (Security Fix - No Policy)
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'archive_search') THEN
        ALTER TABLE public.archive_search ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'archive_search');
        
        -- Admin Access
        CREATE POLICY "Admin manage archive search" ON public.archive_search FOR ALL 
        USING (public.is_admin());
    END IF;
END $$;


-- 4. LEGACY TABLE SAFEGUARDS & VIEW FIXES
-- ====================================================================

DO $$ 
DECLARE 
    tbl text;
    legacy_tables text[] := ARRAY[
        'harvests', 'shops', 'archive', 'daily_harvest', 
        'user_profiles', 'admins', 'app_settings', 'activity_logs',
        'archive_records', 'audit_logs', 'backups', 'collectors', 
        'email_queue', 'error_logs', 'harvest_data', 'harvest_records', 
        'master_limits', 'messages', 'notification_settings', 'notifications', 
        'payments', 'subscription_payments', 'user_preferences', 'user_settings', 
        'user_subscriptions'
    ];
BEGIN
    FOREACH tbl IN ARRAY legacy_tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            PERFORM public.drop_all_policies_for_table('public', tbl);
            EXECUTE format('CREATE POLICY "Admin Safe Access" ON public.%I FOR ALL USING (public.is_admin())', tbl);
        END IF;
    END LOOP;

    -- Fix Views Security (Invoker)
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_access') THEN ALTER VIEW public.admin_access SET (security_invoker = true); END IF;
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_statistics_view') THEN ALTER VIEW public.admin_statistics_view SET (security_invoker = true); END IF;
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'harvest_daily_summary') THEN ALTER VIEW public.harvest_daily_summary SET (security_invoker = true); END IF;
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'admin_kpi_view') THEN ALTER VIEW public.admin_kpi_view SET (security_invoker = true); END IF;
    IF EXISTS (SELECT FROM pg_views WHERE viewname = 'user_subscription_status') THEN ALTER VIEW public.user_subscription_status SET (security_invoker = true); END IF;
END $$;

-- Fix Function Search Paths (Security Hardening)
DO $$
DECLARE
    r RECORD;
    target_functions TEXT[] := ARRAY[
        'log_audit_event', 'handle_email_queue_updated_at', 'handle_messages_updated_at', 'log_messages_activity',
        'log_email_queue_activity', 'handle_notification_settings_updated_at', 'clean_old_user_actions',
        'log_notification_settings_activity', 'update_updated_at_column', 'get_active_users_last_n_days',
        'diagnose_permissions', 'log_activity', 'handle_updated_at', 'handle_new_user', 'handle_notification_read_at',
        'get_admin_stats', 'get_admin_stats_fixed', 'get_users_with_details', 'fix_missing_profiles',
        'get_pending_subscriptions_admin', 'get_all_subscriptions_admin', 'get_app_errors_admin', 'get_client_locations_admin',
        'log_error', 'log_notifications_activity'
    ];
    func_name TEXT;
BEGIN
    FOREACH func_name IN ARRAY target_functions LOOP
        FOR r IN SELECT oid::regprocedure::text as func_sig FROM pg_proc WHERE proname = func_name AND pronamespace = 'public'::regnamespace LOOP
            EXECUTE 'ALTER FUNCTION ' || r.func_sig || ' SET search_path = public';
        END LOOP;
    END LOOP;
END $$;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload config';
