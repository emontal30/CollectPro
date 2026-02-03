-- ====================================================================
-- COLLECTPRO DATABASE - FILE 3/5: ADMIN & SUPPORT FUNCTIONS
-- Consolidated from: 04_user_support.sql, 07_admin_archive_access.sql, 
--                    10_fix_admin_functions.sql, 11_super_admin.sql
-- Includes: Error Logging, User Support, Archive Access, Super Admin
-- ====================================================================

-- ####################################################################
-- PART 1: ERROR LOGGING SYSTEM
-- ####################################################################

DROP TABLE IF EXISTS public.app_errors CASCADE;

CREATE TABLE IF NOT EXISTS public.app_errors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    severity TEXT DEFAULT 'error',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_user_id ON public.app_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_app_errors_unresolved ON public.app_errors(is_resolved) WHERE is_resolved = FALSE;

-- Cleanup old errors (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_errors()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.app_errors
    WHERE created_at < (NOW() - INTERVAL '30 days');
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_errors ON public.app_errors;
CREATE TRIGGER trigger_cleanup_errors
AFTER INSERT ON public.app_errors
EXECUTE FUNCTION public.cleanup_old_errors();

-- ####################################################################
-- PART 2: USER SUPPORT & REMOTE COMMANDS
-- ####################################################################

CREATE TABLE IF NOT EXISTS public.admin_user_commands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    command_type TEXT NOT NULL,
    command TEXT,
    issued_by UUID REFERENCES auth.users(id),
    is_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_admin_cmds_user_pending ON public.admin_user_commands(user_id) WHERE is_executed = FALSE;

-- Repair User Account
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

    SELECT * INTO auth_user FROM auth.users WHERE id = target_user_id;
    
    IF auth_user IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found in Authentication system');
    END IF;

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

    INSERT INTO public.profiles (id, user_code, full_name, email)
    VALUES (
        auth_user.id,
        'EMP-' || substring(md5(auth_user.id::text) from 1 for 6),
        COALESCE(auth_user.raw_user_meta_data->>'full_name', 'User'),
        auth_user.email
    )
    ON CONFLICT (id) DO NOTHING;
    
    res_msg := res_msg || 'Profile synced. ';

    UPDATE public.subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = target_user_id 
      AND status = 'pending' 
      AND created_at < (NOW() - INTERVAL '24 hours');

    UPDATE public.app_errors 
    SET is_resolved = TRUE 
    WHERE user_id = target_user_id;

    res_msg := res_msg || 'Errors resolved. ';

    RETURN json_build_object('success', true, 'message', 'Account repaired successfully: ' || res_msg);
END;
$$;

-- Fetch and Acknowledge Commands
CREATE OR REPLACE FUNCTION public.fetch_and_ack_commands()
RETURNS TABLE (command TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY 
    UPDATE public.admin_user_commands
    SET is_executed = TRUE, executed_at = NOW()
    WHERE user_id = curr_user_id AND is_executed = FALSE
    RETURNING command_type AS command;
END;
$$;

-- ####################################################################
-- PART 3: ADMIN ARCHIVE ACCESS (من ملف 07 و 10 - نسخة واحدة فقط)
-- ####################################################################

-- IMPORTANT: Using version from FILE 10 (includes NOTIFY pgrst)

CREATE OR REPLACE FUNCTION public.get_user_archive_dates_admin(p_user_id UUID)
RETURNS TABLE (archive_date DATE) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
    IF NOT public.is_admin() THEN 
        RAISE EXCEPTION 'Access Denied: Admin privileges required'; 
    END IF;

    RETURN QUERY 
    SELECT da.archive_date 
    FROM public.daily_archives da
    WHERE da.user_id = p_user_id
    ORDER BY da.archive_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_archive_data_admin(p_user_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF NOT public.is_admin() THEN 
        RAISE EXCEPTION 'Access Denied: Admin privileges required'; 
    END IF;

    SELECT data INTO v_data
    FROM public.daily_archives
    WHERE user_id = p_user_id AND archive_date = p_date;

    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$;

-- ####################################################################
-- PART 4: SUPER ADMIN CONTROLS (من ملف 11)
-- ####################################################################

CREATE OR REPLACE FUNCTION public.manage_admin_role(target_email TEXT, action TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_email TEXT;
    target_user_id UUID;
    new_role TEXT;
    result_json json;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
    
    IF caller_email IS NULL OR caller_email != 'emontal.33@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: You are not authorized to perform this action.';
    END IF;

    IF target_email IS NULL OR target_email = '' THEN
        RAISE EXCEPTION 'Target email is required';
    END IF;

    IF action NOT IN ('promote', 'demote') THEN
        RAISE EXCEPTION 'Invalid action. Use "promote" or "demote".';
    END IF;

    SELECT id INTO target_user_id FROM public.users WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
        IF target_user_id IS NULL THEN
            RETURN json_build_object('success', false, 'message', 'User not found with this email');
        END IF;
    END IF;

    IF action = 'promote' THEN
        new_role := 'admin';
    ELSE
        new_role := 'user';
    END IF;

    UPDATE public.users 
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true, 
        'message', CASE WHEN action = 'promote' THEN 'User promoted to Admin' ELSE 'User demoted to regular User' END,
        'user_id', target_user_id,
        'new_role', new_role
    );

END;
$$;

-- ====================================================================
-- PERMISSIONS
-- ====================================================================

GRANT EXECUTE ON FUNCTION public.repair_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_and_ack_commands() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_archive_dates_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_archive_data_admin(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_admin_role(TEXT, TEXT) TO authenticated;

-- Realtime subscription
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE admin_user_commands;
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

-- ====================================================================
-- RELOAD SCHEMA CACHE
-- ====================================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
