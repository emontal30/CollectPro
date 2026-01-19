-- Fix: Update profiles table with full_name from auth.users metadata
-- This will copy the names from auth.users to profiles table

UPDATE public.profiles p
SET full_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');

-- Verify the update
SELECT 
    p.id,
    p.user_code,
    p.full_name as profile_name,
    u.raw_user_meta_data->>'full_name' as metadata_name,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
