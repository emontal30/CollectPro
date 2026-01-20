-- ====================================================================
-- COLLECTPRO DATABASE - FILE 3/3: MIGRATIONS & MAINTENANCE
-- Includes: Data Updates, Fixes, and Verification Queries
-- ====================================================================

-- 1. MIGRATION: ADD ARCHIVE DATE TO OVERDUE
-- ====================================================================

DO $$ BEGIN
    -- Add the archive_date column
    ALTER TABLE public.pending_overdue_stores ADD COLUMN IF NOT EXISTS archive_date DATE;
    
    -- Set default value used during migration
    UPDATE public.pending_overdue_stores SET archive_date = CURRENT_DATE WHERE archive_date IS NULL;
    
    -- Enforce NOT NULL
    ALTER TABLE public.pending_overdue_stores ALTER COLUMN archive_date SET NOT NULL;
    
    -- Add Performance Index
    CREATE INDEX IF NOT EXISTS idx_overdue_user_date ON public.pending_overdue_stores(user_id, archive_date DESC);
    
    COMMENT ON COLUMN public.pending_overdue_stores.archive_date IS 'The date when this overdue entry was archived.';
END $$;


-- 2. DATA FIX: SYNC PROFILES NAMES FROM AUTH META
-- ====================================================================

UPDATE public.profiles p
SET full_name = COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE p.id = u.id AND (p.full_name IS NULL OR p.full_name = '');


-- 3. VERIFICATION QUERIES (Read-Only)
-- ====================================================================
-- Copy and run these manually if needed to verify data health.

/*
-- Check Profiles Status
SELECT id, user_code, full_name, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10;

-- Check Missing Names
SELECT count(*) as missing_names_count FROM public.profiles WHERE full_name IS NULL OR full_name = '';

-- Verify Overdue Migration
SELECT user_id, code, shop, net, archive_date FROM pending_overdue_stores ORDER BY user_id, archive_date DESC LIMIT 5;
*/

-- End of Maintenance Scripts
