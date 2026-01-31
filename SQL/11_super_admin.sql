-- ====================================================================
-- COLLECTPRO DATABASE - FILE 11: SUPER ADMIN CONTROLS
-- ====================================================================

/**
 * manage_admin_role
 * 
 * Allows the Super Admin (hardcoded email) to promote or demote users.
 * 
 * @param target_email TEXT - The email of the user to update
 * @param action TEXT - 'promote' | 'demote'
 */
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
    -- 1. Verify Authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify Caller Identity (Super Admin Check)
    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
    
    IF caller_email IS NULL OR caller_email != 'emontal.33@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: You are not authorized to perform this action.';
    END IF;

    -- 3. Validate Inputs
    IF target_email IS NULL OR target_email = '' THEN
        RAISE EXCEPTION 'Target email is required';
    END IF;

    IF action NOT IN ('promote', 'demote') THEN
        RAISE EXCEPTION 'Invalid action. Use "promote" or "demote".';
    END IF;

    -- 4. Find Target User
    SELECT id INTO target_user_id FROM public.users WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        -- Try searching in auth.users if not found in public.users (edge case)
        SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
        IF target_user_id IS NULL THEN
            RETURN json_build_object('success', false, 'message', 'User not found with this email');
        END IF;
    END IF;

    -- Determine new role
    IF action = 'promote' THEN
        new_role := 'admin';
    ELSE
        new_role := 'user';
    END IF;

    -- 5. Perform Update
    UPDATE public.users 
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true, 
        'message', CASE WHEN action = 'promote' THEN 'User promoted to Admin' ELSE 'User demoted to regular User' END,
        'user_id', target_user_id,
        'new_role', new_role
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
