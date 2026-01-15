-- ================================================================
-- COLLECTPRO - FIX MISSING POLICIES (Final Safe Fix)
-- ================================================================
-- This script addresses "RLS Enabled No Policy" warnings without 
-- breaking existing functionality.
-- Usage: Run this in the Supabase SQL Editor.

-- 1. Helper Function to safely drop policies
CREATE OR REPLACE FUNCTION public.drop_all_policies_for_table(schema_name text, table_name text)
RETURNS void SECURITY DEFINER SET search_path = public LANGUAGE plpgsql VOLATILE AS $$
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = schema_name AND tablename = table_name 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, schema_name, table_name);
    END LOOP;
END;
$$;

-- ================================================================
-- GROUP A: ACTIVE TABLES (Need specific access logic)
-- ================================================================

-- A1. live_harvest (Used for Cloud Sync / Collaboration)
-- Logic: Owners can do everything. Collaborators (editors) can read/update.
DO $$ BEGIN
    PERFORM public.drop_all_policies_for_table('public', 'live_harvest');
    
    CREATE POLICY "Owner full control" ON public.live_harvest FOR ALL USING (auth.uid() = user_id);
    
    CREATE POLICY "Collaborator read" ON public.live_harvest FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collaboration_requests 
            WHERE sender_id = live_harvest.user_id 
            AND receiver_id = auth.uid() 
            AND status = 'accepted'
        )
    );
    
    CREATE POLICY "Collaborator write" ON public.live_harvest FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.collaboration_requests 
            WHERE sender_id = live_harvest.user_id 
            AND receiver_id = auth.uid() 
            AND status = 'accepted' 
            AND role = 'editor'
        )
    );
    
    CREATE POLICY "Admin access" ON public.live_harvest FOR ALL USING (public.is_admin());
END $$;

-- A2. collaboration_requests (Unique logic for invites)
-- Logic: Senders manage their invites. Receivers can view/respond.
DO $$ BEGIN
    PERFORM public.drop_all_policies_for_table('public', 'collaboration_requests');

    CREATE POLICY "Sender manage own" ON public.collaboration_requests FOR ALL USING (auth.uid() = sender_id);
    
    CREATE POLICY "Receiver view" ON public.collaboration_requests FOR SELECT USING (
        receiver_id = auth.uid() OR receiver_code = (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    );
    
    CREATE POLICY "Receiver respond" ON public.collaboration_requests FOR UPDATE USING (
        receiver_id = auth.uid() OR receiver_code = (SELECT user_code FROM public.profiles WHERE id = auth.uid())
    );
    
    CREATE POLICY "Admin access" ON public.collaboration_requests FOR ALL USING (public.is_admin());
END $$;

-- A3. pending_overdue_stores (Used for debt tracking)
-- Logic: Users manage their own data.
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'pending_overdue_stores') THEN
        ALTER TABLE public.pending_overdue_stores ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'pending_overdue_stores');
        
        CREATE POLICY "Users manage own overdue" ON public.pending_overdue_stores
        FOR ALL USING (auth.uid() = user_id);
        
        CREATE POLICY "Admin access" ON public.pending_overdue_stores FOR ALL USING (public.is_admin());
    END IF;
END $$;

-- A4. route_profiles (Used for itinerary templates)
-- Logic: Users manage their own profiles.
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'route_profiles') THEN
        ALTER TABLE public.route_profiles ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'route_profiles');
        
        CREATE POLICY "Users manage own profiles" ON public.route_profiles
        FOR ALL USING (auth.uid() = user_id);
        
        CREATE POLICY "Admin access" ON public.route_profiles FOR ALL USING (public.is_admin());
    END IF;
END $$;

-- A5. user_actions (Used for auditing)
-- Logic: Users insert. Admin reads.
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_actions') THEN
        ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
        PERFORM public.drop_all_policies_for_table('public', 'user_actions');
        
        CREATE POLICY "Users insert actions" ON public.user_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Admin view actions" ON public.user_actions FOR SELECT USING (public.is_admin());
    END IF;
END $$;

-- ================================================================
-- GROUP B: LEGACY/UNUSED TABLES (Admin Only Safety Net)
-- ================================================================
-- Including: harvests, shops, archive, daily_harvest, user_profiles, 
-- admins, app_settings, etc.
-- Providing "Admin Access" ensures that if any legacy code OR admin panel feature
-- still uses them, it won't break for the admin.

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
            -- Ensure RLS is on
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Clear old policies
            PERFORM public.drop_all_policies_for_table('public', tbl);
            
            -- Add Admin Only policy
            EXECUTE format('CREATE POLICY "Admin Safe Access" ON public.%I FOR ALL USING (public.is_admin())', tbl);
        END IF;
    END LOOP;
END $$;

-- ================================================================
-- FINAL CLEANUP
-- ================================================================
-- Refresh schema cache to prevent 406 errors immediately
NOTIFY pgrst, 'reload config';
