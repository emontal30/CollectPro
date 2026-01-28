-- ====================================================================
-- COLLECTPRO FIX SCRIPT: Restore Missing Admin RPC Functions
-- Run this in Supabase SQL Editor to fix "PGRST202" errors
-- Error: "Could not find the function public.get_user_archive_dates_admin"
-- ====================================================================

-- 1. Restore function to get archive dates
CREATE OR REPLACE FUNCTION public.get_user_archive_dates_admin(p_user_id UUID)
RETURNS TABLE (archive_date DATE) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
    -- Security Check: Only admins can call this
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

-- 2. Restore function to get archive data details
CREATE OR REPLACE FUNCTION public.get_user_archive_data_admin(p_user_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
    v_data JSONB;
BEGIN
    -- Security Check: Only admins can call this
    IF NOT public.is_admin() THEN 
        RAISE EXCEPTION 'Access Denied: Admin privileges required'; 
    END IF;

    SELECT data INTO v_data
    FROM public.daily_archives
    WHERE user_id = p_user_id AND archive_date = p_date;

    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.get_user_archive_dates_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_archive_data_admin(UUID, DATE) TO authenticated;

-- 4. Force Schema Cache Refresh (Critical for PGRST202 errors)
NOTIFY pgrst, 'reload config';
