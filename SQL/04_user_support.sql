-- ====================================================================
-- COMBINED MIGRATION: USER SUPPORT & ERROR LOGGING SYSTEM
-- Includes:
-- 1. Error Logging Schema (formerly 04_error_logging.sql)
-- 2. User Support & Remote Commands (formerly 05_user_support.sql)
-- 3. Specific User Fix (formerly fix_specific_user.sql)
-- ====================================================================

-- ####################################################################
-- PART 1: ERROR LOGGING SYSTEM
-- ####################################################################

-- 0. Cleanup old table if exists (to apply FK changes)
DROP TABLE IF EXISTS public.app_errors CASCADE;

-- 1. Create the errors table
-- Changed Reference to PUBLIC.users to allow API Joins in Admin Dashboard
CREATE TABLE IF NOT EXISTS public.app_errors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Changed from auth.users
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::jsonb, -- Store route, browser info, metadata
    severity TEXT DEFAULT 'error', -- error, warning, critical
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Index for faster querying
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_app_errors_unresolved ON public.app_errors(is_resolved) WHERE is_resolved = FALSE;

-- 3. Row Level Security (RLS)
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Allow ANY authenticated or anonymous user to INSERT errors
CREATE POLICY "Anyone can insert errors" 
ON public.app_errors 
FOR INSERT 
WITH CHECK (
  auth.role() IN ('anon', 'authenticated') 
  AND severity IN ('error', 'warning', 'critical', 'info')
);

-- Allow ONLY Admins to SELECT/VIEW errors
CREATE POLICY "Admins can view errors" 
ON public.app_errors 
FOR SELECT 
USING (public.is_admin());

-- Allow ONLY Admins to UPDATE errors (mark as resolved)
CREATE POLICY "Admins can update errors" 
ON public.app_errors 
FOR UPDATE
USING (public.is_admin());

-- Allow ONLY Admins to DELETE errors
CREATE POLICY "Admins can delete errors" 
ON public.app_errors 
FOR DELETE
USING (public.is_admin());


-- 4. Cleanup Function to auto-delete old errors (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_errors()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete errors older than 30 days 
    DELETE FROM public.app_errors
    WHERE created_at < (NOW() - INTERVAL '30 days');
    RETURN NULL; -- Trigger is AFTER INSERT, so return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_errors ON public.app_errors;
CREATE TRIGGER trigger_cleanup_errors
AFTER INSERT ON public.app_errors
EXECUTE FUNCTION public.cleanup_old_errors();


-- ####################################################################
-- PART 2: USER SUPPORT & REMOTE COMMANDS
-- ####################################################################

-- 1. REMOTE ACTIONS TABLE
-- Allows admin to queue actions for users (e.g., "force_clear_cache")
CREATE TABLE IF NOT EXISTS public.admin_user_commands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Changed from auth.users (Preferred for consistency)
    command_type TEXT NOT NULL, -- 'clear_cache', 'force_logout', 'refresh_data'
    is_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);

-- Index for pending commands
CREATE INDEX IF NOT EXISTS idx_admin_cmds_user_pending ON public.admin_user_commands(user_id) WHERE is_executed = FALSE;

-- 2. SMART REPAIR FUNCTION (The "Magic Wand")
CREATE OR REPLACE FUNCTION public.repair_user_account(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    auth_user RECORD;
    res_msg TEXT := '';
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access Denied'; END IF;

    -- A. Check Auth User
    SELECT * INTO auth_user FROM auth.users WHERE id = target_user_id;
    
    IF auth_user IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found in Authentication system');
    END IF;

    -- B. Repair Public User
    INSERT INTO public.users (id, email, full_name, role, provider, created_at)
    VALUES (
        auth_user.id, 
        auth_user.email, 
        COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.raw_user_meta_data->>'name', 'User'), 
        'user', 
        COALESCE(auth_user.raw_app_meta_data->'providers', '["email"]'::jsonb),
        auth_user.created_at
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email, 
        full_name = EXCLUDED.full_name;
    
    res_msg := res_msg || 'User record synced. ';

    -- C. Repair Profile
    INSERT INTO public.profiles (id, user_code, full_name)
    VALUES (
        auth_user.id,
        'EMP-' || substring(md5(auth_user.id::text) from 1 for 6),
        COALESCE(auth_user.raw_user_meta_data->>'full_name', 'User')
    )
    ON CONFLICT (id) DO NOTHING;
    
    res_msg := res_msg || 'Profile synced. ';

    -- D. Fix Stuck "Pending" Subscriptions that are old (> 24 hours)
    UPDATE public.subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = target_user_id 
      AND status = 'pending' 
      AND created_at < (NOW() - INTERVAL '24 hours');

    -- E. Auto-resolve App Errors
    UPDATE public.app_errors 
    SET is_resolved = TRUE 
    WHERE user_id = target_user_id;

    res_msg := res_msg || 'Errors resolved. ';

    RETURN json_build_object('success', true, 'message', 'Account repaired successfully: ' || res_msg);
END;
$$;

-- 3. FUNCTION TO CONSUME COMMANDS (Run by User App)
CREATE OR REPLACE FUNCTION public.fetch_and_ack_commands()
RETURNS TABLE (command TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
BEGIN
    -- Return pending commands
    RETURN QUERY 
    UPDATE public.admin_user_commands
    SET is_executed = TRUE, executed_at = NOW()
    WHERE user_id = curr_user_id AND is_executed = FALSE
    RETURNING command_type AS command;
END;
$$;
