-- ====================================================================
-- COLLECTPRO DATABASE - FILE 8: PERFORMANCE TUNING (CRITICAL INDEXES)
-- Adds missing indexes found during comprehensive review to speed up RLS and Lookups
-- ====================================================================

-- 1. SUBSCRIPTIONS Performance
-- --------------------------------------------------------------------
-- Critical for can_write_data() which runs on every single INSERT/UPDATE
-- Previously required scanning the whole table to find user's active sub.
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions(user_id, status);

-- 2. COLLABORATION Performance
-- --------------------------------------------------------------------
-- A. Composite index for RLS checks on live_harvest
-- The policy checks: sender_id = uid AND receiver_id = target AND status = 'accepted'
-- This index makes that check instant instead of scanning rows.
CREATE INDEX IF NOT EXISTS idx_collab_rls_composite 
ON public.collaboration_requests(sender_id, receiver_id, status);

-- B. Index for receiving invites
-- When a user opens their "Invites" list, we query by receiver_id.
-- This was missing, causing full table scans for receivers.
CREATE INDEX IF NOT EXISTS idx_collab_receiver 
ON public.collaboration_requests(receiver_id);

-- 3. ANALYZE to update query planner statistics immediately
-- --------------------------------------------------------------------
ANALYZE public.subscriptions;
ANALYZE public.collaboration_requests;

-- ====================================================================
-- End of Performance Tuning
-- ====================================================================
