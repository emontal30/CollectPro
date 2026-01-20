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
DROP FUNCTION IF EXISTS public.fix_missing_profiles CASCADE;
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

CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.statistics SET total_users = total_users + 1, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.statistics SET total_users = total_users - 1, updated_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_subscription_stats()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
    price_diff DECIMAL(10,2) := 0;
    plan_price DECIMAL(10,2);
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
         SELECT price_egp INTO plan_price FROM public.subscription_plans WHERE id = NEW.plan_id;
         price_diff := COALESCE(plan_price, 0);
    ELSIF (TG_OP = 'DELETE') THEN
         SELECT price_egp INTO plan_price FROM public.subscription_plans WHERE id = OLD.plan_id;
         price_diff := COALESCE(plan_price, 0);
    END IF;

    -- Partial logic simplified for readability
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.statistics SET
            active_subscriptions = CASE WHEN NEW.status = 'active' THEN active_subscriptions + 1 ELSE active_subscriptions END,
            pending_requests = CASE WHEN NEW.status = 'pending' THEN pending_requests + 1 ELSE pending_requests END,
            total_revenue = CASE WHEN NEW.status = 'active' THEN total_revenue + price_diff ELSE total_revenue END,
            updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.statistics SET
            active_subscriptions = active_subscriptions + (CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END) - (CASE WHEN OLD.status = 'active' THEN 1 ELSE 0 END),
            pending_requests = pending_requests + (CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END) - (CASE WHEN OLD.status = 'pending' THEN 1 ELSE 0 END),
            total_revenue = total_revenue + (CASE WHEN NEW.status = 'active' THEN price_diff ELSE 0 END) - (CASE WHEN OLD.status = 'active' THEN price_diff ELSE 0 END),
            updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.statistics SET
            active_subscriptions = CASE WHEN OLD.status = 'active' THEN active_subscriptions - 1 ELSE active_subscriptions END,
            pending_requests = CASE WHEN OLD.status = 'pending' THEN pending_requests - 1 ELSE pending_requests END,
            total_revenue = CASE WHEN OLD.status = 'active' THEN total_revenue - price_diff ELSE total_revenue END,
            updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE extracted_name TEXT;
BEGIN
    extracted_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    if extracted_name IS NULL OR extracted_name = '' THEN extracted_name := 'مستخدم'; END IF;

    INSERT INTO public.users (id, email, full_name, role, provider)
    VALUES (NEW.id, NEW.email, extracted_name, 'user', COALESCE(NEW.raw_app_meta_data->'providers', '["google"]'::jsonb))
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, provider = EXCLUDED.provider, updated_at = NOW();
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

DROP TRIGGER IF EXISTS trigger_update_stats_subs ON public.subscriptions;
CREATE TRIGGER trigger_update_stats_subs AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION handle_subscription_stats();

DROP TRIGGER IF EXISTS trigger_update_stats_users ON public.users;
CREATE TRIGGER trigger_update_stats_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_stats();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Seed Data (Core)
DO $$
BEGIN
    INSERT INTO public.subscription_plans (name, name_ar, description, price, duration_days, duration_months, features, is_active, price_egp) 
    VALUES 
        ('MONTH-1', 'خطة شهرية', 'خطة أساسية', 30.00, 30, 1, '["إدخال البيانات", "التحصيلات"]'::jsonb, TRUE, 30.00),
        ('MONTH-3', 'خطة 3 شهور', 'خطة توفير', 80.00, 90, 3, '["جميع الميزات"]'::jsonb, TRUE, 80.00),
        ('YEAR-1', 'خطة سنوية', 'خطة احترافية', 360.00, 365, 12, '["جميع الميزات"]'::jsonb, TRUE, 360.00)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.statistics (id, total_users, active_subscriptions, total_revenue, pending_requests, last_sync)
    VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 0, 0, 0, 0, NOW())
    ON CONFLICT (id) DO NOTHING;
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.profiles (id, user_code, full_name)
    VALUES (
        NEW.id, 'EMP-' || substring(md5(random()::text) from 1 for 6),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    ) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill profiles
INSERT INTO public.profiles (id, user_code, full_name)
SELECT id, 'EMP-' || substring(md5(id::text) from 1 for 6), COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_code TEXT NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'editor')) DEFAULT 'editor',
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collab_receiver_code ON public.collaboration_requests(receiver_code, status);
CREATE INDEX IF NOT EXISTS idx_collab_sender ON public.collaboration_requests(sender_id);

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
  stats_json json;
  total_users_count int;
  active_subscriptions_count int;
  total_revenue_val numeric;
  active_users_count int;
  pending_count int;
  cancelled_count int;
  expired_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied: Admin privileges required'; END IF;
  select total_users, active_subscriptions, total_revenue into total_users_count, active_subscriptions_count, total_revenue_val
  from public.statistics where id = '00000000-0000-0000-0000-000000000001';
  select count(distinct user_id) into active_users_count from public.daily_archives where updated_at >= (now() - (active_days_period || ' days')::interval);
  select count(*) filter (where status = 'pending'), count(*) filter (where status = 'cancelled'), count(*) filter (where status = 'expired')
  into pending_count, cancelled_count, expired_count from public.subscriptions;
  
  return json_build_object(
    'totalUsers', total_users_count, 'activeSubscriptions', active_subscriptions_count, 'totalRevenue', total_revenue_val,
    'activeUsers', active_users_count, 'pendingRequests', pending_count, 'cancelled', cancelled_count, 'expired', expired_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_users_with_details()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;
  return (
      select json_agg(json_build_object(
            'id', u.id, 'full_name', p.full_name, 'email', u.email, 'user_code', p.user_code,
            'created_at', u.created_at, 'hasActiveSub', (case when s.status = 'active' then true else false end),
            'activeSubId', s.id, 'expiryDate', s.end_date,
            'subscriptions', (select json_agg(sub_details) from (select id, status, end_date from public.subscriptions where user_id = u.id) as sub_details)
          ) order by u.created_at desc)
      from auth.users as u
      left join public.profiles as p on u.id = p.id
      left join public.subscriptions as s on u.id = s.user_id and s.status = 'active'
  );
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
