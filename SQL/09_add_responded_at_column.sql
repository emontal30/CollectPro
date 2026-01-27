-- ====================================================================
-- MIGRATION: Add responded_at column to collaboration_requests
-- Purpose: Fix invitation acceptance issue where UPDATE fails
-- Date: 2026-01-27
-- ====================================================================

-- Add the responded_at column if it doesn't exist
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
        RAISE NOTICE '✅ Column responded_at successfully added to collaboration_requests table';
    ELSE
        RAISE EXCEPTION '❌ Failed to add responded_at column';
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
