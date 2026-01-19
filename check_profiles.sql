-- Script to check profiles table data
-- Run this in Supabase SQL Editor to verify user data

-- Check all profiles
SELECT 
    id,
    user_code,
    full_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- Check for profiles with NULL or empty full_name
SELECT 
    id,
    user_code,
    full_name,
    CASE 
        WHEN full_name IS NULL THEN 'NULL'
        WHEN full_name = '' THEN 'EMPTY'
        ELSE 'HAS_VALUE'
    END as name_status
FROM public.profiles
WHERE full_name IS NULL OR full_name = '';

-- Check auth.users to see what data is available
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as metadata_name,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
