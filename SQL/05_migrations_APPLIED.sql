-- ====================================================================
-- COLLECTPRO DATABASE - FILE 5/5: MIGRATIONS & DATA FIXES
-- Consolidated from: 03_migrations_and_maintenance.sql, 09_add_responded_at_column.sql
-- Includes: Schema Migrations, Data Fixes, Verification Queries
-- ⚠️ RUN ONCE ONLY - Do not include in regular deployments
-- ====================================================================

-- ####################################################################
-- MIGRATION 1: ADD ARCHIVE DATE TO OVERDUE STORES
-- ####################################################################

DO $$ BEGIN
    -- Add the archive_date column
    ALTER TABLE public.pending_overdue_stores ADD COLUMN IF NOT EXISTS archive_date DATE;
    
    -- Set default value for existing records
    UPDATE public.pending_overdue_stores SET archive_date = CURRENT_DATE WHERE archive_date IS NULL;
    
    -- Enforce NOT NULL constraint
    ALTER TABLE public.pending_overdue_stores ALTER COLUMN archive_date SET NOT NULL;
    
    -- Add Performance Index
    CREATE INDEX IF NOT EXISTS idx_overdue_user_date ON public.pending_overdue_stores(user_id, archive_date DESC);
    
    COMMENT ON COLUMN public.pending_overdue_stores.archive_date IS 'The date when this overdue entry was archived.';
    
    RAISE NOTICE '✅ Migration 1 completed: archive_date column added to pending_overdue_stores';
END $$;

-- ####################################################################
-- MIGRATION 2: ADD RESPONDED_AT TO COLLABORATION REQUESTS
-- ####################################################################

ALTER TABLE public.collaboration_requests 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'collaboration_requests' 
        AND column_name = 'responded_at'
    ) THEN
        RAISE NOTICE '✅ Migration 2 completed: responded_at column added to collaboration_requests';
    ELSE
        RAISE EXCEPTION '❌ Failed to add responded_at column';
    END IF;
END $$;

-- ####################################################################
-- DATA FIX 1: SYNC PROFILE NAMES FROM AUTH
-- ####################################################################

UPDATE public.profiles p
SET full_name = COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE p.id = u.id AND (p.full_name IS NULL OR p.full_name = '');

-- ####################################################################
-- VERIFICATION QUERIES (Read-Only)
-- ####################################################################
-- Copy and run these manually if needed to verify data health.

/*
-- Check Profiles Status
SELECT id, user_code, full_name, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10;

-- Check Missing Names
SELECT count(*) as missing_names_count FROM public.profiles WHERE full_name IS NULL OR full_name = '';

-- Verify Overdue Migration
SELECT user_id, code, shop, net, archive_date FROM pending_overdue_stores ORDER BY user_id, archive_date DESC LIMIT 5;

-- Verify Collaboration Responded At
SELECT id, sender_id, receiver_id, status, responded_at FROM collaboration_requests WHERE status IN ('accepted', 'rejected') LIMIT 10;
*/

-- ====================================================================
-- RELOAD SCHEMA CACHE
-- ====================================================================

NOTIFY pgrst, 'reload config';

-- ====================================================================
-- END OF MIGRATIONS
-- ====================================================================

RAISE NOTICE '✅✅✅ All migrations completed successfully ✅✅✅';
