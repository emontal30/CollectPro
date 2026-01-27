-- ====================================================================
-- COLLECTPRO DATABASE - FILE 1/3: SCHEMA & FUNCTIONS
-- Includes: Core Schema, Itinerary, Tracking, Collaboration, Admin RPC
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- SECTION: CORE SCHEMA (users, subscriptions, plans, stats)
-- ====================================================================

-- Clean up old functions/views
DROP VIEW IF EXISTS public.admin_subscriptions_view CASCADE;
DROP FUNCTION IF EXISTS public.calculate_total_revenue CASCADE;
DROP FUNCTION IF EXISTS public.update_statistics CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_archives CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.fix_missing_profiles CASCADE; -- Definition moved below to restore missing function
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.get_server_time CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_stats CASCADE;
DROP FUNCTION IF EXISTS public.handle_subscription_stats CASCADE;
DROP FUNCTION IF EXISTS public.can_write_data CASCADE;
DROP FUNCTION IF EXISTS public.protect_user_role CASCADE;

-- Tables
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

-- 8. Statistics table
CREATE TABLE IF NOT EXISTS public.statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Route Profiles (Itinerary Templates)
CREATE TABLE IF NOT EXISTS public.route_profiles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    profile_name TEXT,
    shops_order JSONB, -- Stores array of shop codes
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, slot_number)
);

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) AND NOT public.is_admin() THEN
        NEW.role := OLD.role;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMP WITH TIME ZONE LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT NOW();
$$;

CREATE OR REPLACE FUNCTION public.can_write_data()
RETURNS BOOLEAN SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
    enforced BOOLEAN;
    has_sub BOOLEAN;
BEGIN
    SELECT (value::text = 'true') INTO enforced FROM public.system_config WHERE key = 'enforce_subscription';
    IF enforced IS NOT TRUE THEN RETURN TRUE; END IF;
    SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = auth.uid() AND status = 'active') INTO has_sub;
    RETURN has_sub;
END;
$$;

-- [DEPRECATED] These functions caused lock contention on the statistics table.
-- Statistics are now calculated live via get_admin_stats().
DROP FUNCTION IF EXISTS public.handle_new_user_stats CASCADE;
DROP FUNCTION IF EXISTS public.handle_subscription_stats CASCADE;

-- handle_subscription_stats was here (removed)

-- Robust User Initialization (SECURITY DEFINER)
-- Handles both public.users and public.profiles creation atomically.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE 
    extracted_name TEXT;
    new_user_code TEXT;
BEGIN
    -- 1. Determine Full Name
    extracted_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    IF extracted_name IS NULL OR extracted_name = '' THEN extracted_name := 'مستخدم'; END IF;

    -- 2. Generate Unique User Code (for Profiles/Collaboration)
    new_user_code := 'EMP-' || substring(md5(NEW.id::text || random()::text) from 1 for 6);

    -- 3. Create public.users record
    INSERT INTO public.users (id, email, full_name, role, provider)
    VALUES (
        NEW.id, 
        NEW.email, 
        extracted_name, 
        'user', 
        COALESCE(NEW.raw_app_meta_data->'providers', '["email"]'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email, 
        provider = EXCLUDED.provider, 
        updated_at = NOW();

    -- 4. Create public.profiles record
    INSERT INTO public.profiles (id, user_code, full_name, email)
    VALUES (NEW.id, new_user_code, extracted_name, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

    RETURN NEW;
END;
$$;

-- View: Admin Subscriptions View (Restored)
CREATE OR REPLACE VIEW public.admin_subscriptions_view WITH (security_invoker = true) AS
SELECT 
    s.id,
    s.user_id,
    p.user_code,
    u.full_name AS user_name,
    u.email AS user_email,
    s.plan_id,
    sp.name AS plan_name,
    sp.name_ar AS plan_name_ar,
    s.status,
    s.start_date,
    s.end_date,
    s.price,
    s.created_at,
    s.updated_at
FROM public.subscriptions s
JOIN public.users u ON s.user_id = u.id
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id;

-- Triggers for Core Schema
DROP TRIGGER IF EXISTS trigger_protect_user_role ON public.users;
CREATE TRIGGER trigger_protect_user_role BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.protect_user_role();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subs_updated_at ON public.subscriptions;
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Removed trigger_update_stats_subs
-- Removed trigger_update_stats_users

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- Seed Data (Core)
DO $$
BEGIN
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'خطة شهرية', 'خطة أساسية', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'خطة 3 شهور', 'خطة توفير', 80.00, 90, 3, '["جميع الميزات"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', 'خطة سنوية', 'خطة احترافية', 360.00, 365, 12, '["جميع الميزات"]'::jsonb, TRUE, 360.00)
    ON CONFLICT DO NOTHING;
    -- Statistics row removed from seeding, table is still there but deprecated.
    -- We keep the table for now to avoid breaking other views if any, but it's not updated anymore.
    INSERT INTO public.system_config (key, value) VALUES ('enforce_subscription', 'false'::jsonb) ON CONFLICT (key) DO NOTHING;
    UPDATE public.users SET role = 'admin' WHERE email = 'emontal.33@gmail.com';
END $$;


-- ====================================================================
-- SECTION: ITINERARY SCHEMA (route_profiles)
-- ====================================================================

-- Note: client_routes table is deprecated/local-only, removed from here.

CREATE TABLE IF NOT EXISTS public.route_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_number INTEGER NOT NULL,
    profile_name TEXT NOT NULL,
    shops_order JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_slot_per_user UNIQUE(user_id, slot_number)
);

DROP TRIGGER IF EXISTS update_route_profiles_modtime ON public.route_profiles;
CREATE TRIGGER update_route_profiles_modtime BEFORE UPDATE ON public.route_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ====================================================================
-- SECTION: TRACKING SCHEMA (user_actions)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON public.user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON public.user_actions(user_id);


-- ====================================================================
-- SECTION: COLLABORATION (sync-harvest.sql)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_code TEXT UNIQUE NOT NULL, 
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure email column exists if table was already created before
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Profiles trigger
-- Redundant Trigger "on_auth_user_created_profile" and function "handle_new_user_profile" removed (Merged into handle_new_user_registration)
DROP FUNCTION IF EXISTS public.handle_new_user_profile CASCADE;

-- Backfill profiles
INSERT INTO public.profiles (id, user_code, full_name, email)
SELECT id, 'EMP-' || substring(md5(id::text) from 1 for 6), COALESCE(raw_user_meta_data->>'full_name', email), email
FROM auth.users ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Ensure responded_at column exists in collaboration_requests (Fix for invitation acceptance)
ALTER TABLE public.collaboration_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_code TEXT NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'editor')) DEFAULT 'editor',
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')) DEFAULT 'pending',
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collab_receiver_code ON public.collaboration_requests(receiver_code, status);
CREATE INDEX IF NOT EXISTS idx_collab_sender ON public.collaboration_requests(sender_id);

-- Clean up existing duplicates before adding unique index (Fix for Error 23505)
-- This keeps only the LATEST invitation (by created_at) for each sender-receiver pair
DELETE FROM public.collaboration_requests
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY sender_id, receiver_id 
                   ORDER BY created_at DESC
               ) as r_num
        FROM public.collaboration_requests
        WHERE status IN ('pending', 'accepted')
    ) t
    WHERE t.r_num > 1
);

-- Prevent duplicate active invitations (pending or accepted) between same users
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_invitation 
ON public.collaboration_requests (sender_id, receiver_id) 
WHERE status IN ('pending', 'accepted');

CREATE TABLE IF NOT EXISTS public.live_harvest (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    rows JSONB DEFAULT '[]'::jsonb,
    master_limit NUMERIC DEFAULT 0,
    extra_limit NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    last_updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Functions
CREATE OR REPLACE FUNCTION public.notify_live_harvest_change()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('live_harvest_update', json_build_object('user_id', NEW.user_id, 'updated_by', NEW.last_updated_by, 'operation', TG_OP)::text);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_collaboration_change()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM pg_notify('collaboration_invite', json_build_object('request_id', NEW.id, 'receiver_code', NEW.receiver_code)::text);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    PERFORM pg_notify('collaboration_response', json_build_object('request_id', NEW.id, 'status', NEW.status)::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_harvest_notify_trigger ON public.live_harvest;
CREATE TRIGGER live_harvest_notify_trigger AFTER INSERT OR UPDATE ON public.live_harvest FOR EACH ROW EXECUTE FUNCTION public.notify_live_harvest_change();

DROP TRIGGER IF EXISTS collaboration_notify_trigger ON public.collaboration_requests;
CREATE TRIGGER collaboration_notify_trigger AFTER INSERT OR UPDATE ON public.collaboration_requests FOR EACH ROW EXECUTE FUNCTION public.notify_collaboration_change();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collab_updated_at ON public.collaboration_requests;
CREATE TRIGGER update_collab_updated_at BEFORE UPDATE ON public.collaboration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_harvest_updated_at ON public.live_harvest;
CREATE TRIGGER update_live_harvest_updated_at BEFORE UPDATE ON public.live_harvest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ====================================================================
-- SECTION: ADMIN RPC FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION get_admin_stats(active_days_period int default 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_users_count int;
  active_subscriptions_count int;
  total_revenue_val numeric;
  active_users_count int;
  pending_count int;
  cancelled_count int;
  expired_count int;
BEGIN
  -- Security Check
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied: Admin privileges required'; END IF;

  -- Intelligent Live Calculation: Optimized for performance using existing indexes.
  -- This replaces the cached statistics table to eliminate lock contention on high traffic.
  
  -- 1. Count Total Users
  SELECT count(*) INTO total_users_count FROM public.users;

  -- 2. Count Active Subscriptions
  SELECT count(*) INTO active_subscriptions_count FROM public.subscriptions WHERE status = 'active';

  -- 3. Calculate Total Revenue from Active Plans
  SELECT COALESCE(SUM(sp.price_egp), 0) INTO total_revenue_val 
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.status = 'active';

  -- 4. Count Active Users (last N days)
  SELECT count(distinct user_id) INTO active_users_count 
  FROM public.daily_archives 
  WHERE updated_at >= (now() - (active_days_period || ' days')::interval);

  -- 5. Status Breakdown
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'expired')
  INTO pending_count, cancelled_count, expired_count 
  FROM public.subscriptions;
  
  RETURN json_build_object(
    'totalUsers', total_users_count, 
    'activeSubscriptions', active_subscriptions_count, 
    'totalRevenue', total_revenue_val,
    'activeUsers', active_users_count, 
    'pendingRequests', pending_count, 
    'cancelled', cancelled_count, 
    'expired', expired_count
  );
END;
$$;

-- Frontend compatibility alias
CREATE OR REPLACE FUNCTION public.get_admin_stats_fixed(active_days_period int default 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.get_admin_stats(active_days_period);
END;
$$;

CREATE OR REPLACE FUNCTION get_users_with_details()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;
  
  -- Optimized Admin User Fetching: Bypasses RLS to ensure Admin sees all records.
  RETURN (
      SELECT json_agg(t) FROM (
          SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            p.user_code,
            u.role,
            u.created_at, 
            (CASE WHEN s.status = 'active' THEN true ELSE false END) as "hasActiveSub",
            s.id as "activeSubId", 
            s.end_date as "expiryDate",
            (
                SELECT json_agg(sub_details) 
                FROM (
                    SELECT id, status, end_date, price 
                    FROM public.subscriptions 
                    WHERE user_id = u.id
                    ORDER BY created_at DESC
                ) AS sub_details
            ) as subscriptions
          FROM public.users AS u
          LEFT JOIN public.profiles AS p ON u.id = p.id
          LEFT JOIN public.subscriptions AS s ON u.id = s.user_id AND s.status = 'active'
          ORDER BY u.created_at DESC
      ) t
  );
END;
$$;

-- Restore missing fix_missing_profiles function
CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS json SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
    users_count int := 0;
    profiles_count int := 0;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    -- 1. Restore missing public.users from auth.users
    INSERT INTO public.users (id, email, full_name, role, created_at)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'user', created_at
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;
    GET DIAGNOSTICS users_count = ROW_COUNT;

    -- 2. Restore missing public.profiles from auth.users
    INSERT INTO public.profiles (id, user_code, full_name, email)
    SELECT id, 'EMP-' || substring(md5(id::text) from 1 for 6), COALESCE(raw_user_meta_data->>'full_name', email), email
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    GET DIAGNOSTICS profiles_count = ROW_COUNT;

    RETURN json_build_object('success', true, 'users_restored', users_count, 'profiles_restored', profiles_count);
END;
$$;

CREATE OR REPLACE FUNCTION handle_subscription_action(p_subscription_id uuid, p_action text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub subscriptions;
  v_plan subscription_plans;
  v_user_id uuid;
  v_end_date timestamptz;
  v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;
  select * into v_sub from subscriptions where id = p_subscription_id;
  if v_sub is null then return json_build_object('error', json_build_object('message', 'Subscription not found')); end if;
  v_user_id := v_sub.user_id;

  if p_action = 'approve' then
    select * into v_plan from subscription_plans where id = v_sub.plan_id;
    update subscriptions set status = 'cancelled', updated_at = v_now where user_id = v_user_id and status = 'active';
    v_end_date := v_now + (v_plan.duration_months || ' months')::interval;
    update subscriptions set status = 'active', start_date = v_now, end_date = v_end_date, updated_at = v_now where id = p_subscription_id returning * into v_sub;
    return json_build_object('data', row_to_json(v_sub));
  elsif p_action = 'reject' or p_action = 'delete' then
    delete from subscriptions where id = p_subscription_id;
    return json_build_object('data', '{"message": "Subscription deleted"}');
  elsif p_action = 'cancel' then
    update subscriptions set status = 'cancelled', updated_at = v_now where id = p_subscription_id returning * into v_sub;
    return json_build_object('data', row_to_json(v_sub));
  elsif p_action = 'reactivate' then
    -- Smart Resume: Extend end_date by the duration of suspension (NOW - updated_at)
    -- This assumes updated_at was the time of cancellation.
    if v_sub.status = 'cancelled' then
       v_end_date := v_sub.end_date + (v_now - v_sub.updated_at);
       -- If end_date was already in the past, maybe we should start from NOW? 
       -- User request: "days continue as is". 
       -- If I had 5 days left, I should have 5 days left starting today.
       -- If (end_date - updated_at) > 0, that implies days remaining.
       -- So new_end_date = NOW() + (end_date - updated_at).
       -- Let's use that logic if end_date > updated_at.
       if v_sub.end_date > v_sub.updated_at then
          v_end_date := v_now + (v_sub.end_date - v_sub.updated_at);
       else
          -- If no days were remaining, just reactivate with old date (expired) or set to now?
          -- For safety, just keep strict shift logic:
          v_end_date := v_sub.end_date + (v_now - v_sub.updated_at);
       end if;
       
       update subscriptions 
       set status = 'active', 
           end_date = v_end_date, 
           updated_at = v_now 
       where id = p_subscription_id 
       returning * into v_sub;
    else
       -- Fallback for non-cancelled
       update subscriptions set status = 'active', updated_at = v_now where id = p_subscription_id returning * into v_sub;
    end if;
    return json_build_object('data', row_to_json(v_sub));
  else
    return json_build_object('error', json_build_object('message', 'Invalid action'));
  end if;
END;
$$;

-- 11. ADMIN SUBSCRIPTION FUNCTIONS (SECURITY DEFINER)
-- ====================================================================

-- RPC to fetch pending subscriptions with full details
CREATE OR REPLACE FUNCTION public.get_pending_subscriptions_admin()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    RETURN (
        SELECT json_agg(t) FROM (
            SELECT 
                s.id,
                s.user_id,
                s.plan_id,
                s.plan_name,
                s.status,
                s.transaction_id,
                s.price,
                s.created_at,
                json_build_object('full_name', u.full_name, 'email', u.email) as users,
                json_build_object(
                    'name', sp.name, 
                    'name_ar', sp.name_ar, 
                    'price_egp', sp.price_egp, 
                    'duration_months', sp.duration_months
                ) as subscription_plans,
                prof.user_code
            FROM public.subscriptions s
            JOIN public.users u ON s.user_id = u.id
            LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
            LEFT JOIN public.profiles prof ON s.user_id = prof.id
            WHERE s.status = 'pending'
            ORDER BY s.created_at DESC
        ) t
    );
END;
$$;

-- RPC to fetch all subscriptions with filters (replaces view direct access)
CREATE OR REPLACE FUNCTION public.get_all_subscriptions_admin(p_status text DEFAULT 'all', p_expiry text DEFAULT 'all')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    today_date timestamptz := now();
    seven_days_later timestamptz := now() + interval '7 days';
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    RETURN (
        SELECT json_agg(t) FROM (
            SELECT 
                s.id,
                s.user_id,
                u.full_name as user_name,
                u.email,
                prof.user_code,
                s.plan_id,
                COALESCE(sp.name_ar, s.plan_name) as plan_name,
                s.status,
                s.start_date,
                s.end_date,
                s.price,
                sp.price_egp,
                s.transaction_id,
                s.created_at,
                s.updated_at
            FROM public.subscriptions s
            JOIN public.users u ON s.user_id = u.id
            LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
            LEFT JOIN public.profiles prof ON s.user_id = prof.id
            WHERE (p_status = 'all' OR s.status = p_status)
              AND (p_expiry = 'all' OR (p_expiry = 'expiring_soon' AND s.end_date >= today_date AND s.end_date <= seven_days_later))
            ORDER BY s.created_at DESC
        ) t
    );
END;
$$;

-- RPC to fetch application errors with user details (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_app_errors_admin()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    RETURN (
        SELECT json_agg(t) FROM (
            SELECT 
                e.id,
                e.user_id,
                e.error_message,
                e.stack_trace,
                e.context,
                e.severity,
                e.is_resolved,
                e.created_at,
                json_build_object(
                    'email', u.email,
                    'full_name', u.full_name,
                    'role', u.role
                ) as users
            FROM public.app_errors e
            LEFT JOIN public.users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
            LIMIT 100
        ) t
    );
END;
$$;

-- RPC to fetch all client locations with user details (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_client_locations_admin()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    RETURN (
        SELECT json_agg(t) FROM (
            SELECT 
                cr.id,
                cr.user_id,
                cr.shop_code,
                cr.shop_name,
                cr.latitude,
                cr.longitude,
                cr.location_updated_at,
                cr.updated_at,
                u.full_name as user_name,
                u.email as user_email
            FROM public.client_routes cr
            JOIN public.users u ON cr.user_id = u.id
            ORDER BY cr.location_updated_at DESC NULLS LAST
        ) t
    );
END;
$$;

NOTIFY pgrst, 'reload config';

-- 10. AUTO-CLEANUP TRIGGER (31-Day Retention)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_user_archives()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete archives older than 31 days for the specific user
  DELETE FROM public.daily_archives
  WHERE user_id = NEW.user_id
    AND archive_date < (CURRENT_DATE - INTERVAL '31 days');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_old_archives ON public.daily_archives;
CREATE TRIGGER trigger_cleanup_old_archives
AFTER INSERT ON public.daily_archives
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_user_archives();
