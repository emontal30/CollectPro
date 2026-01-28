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

-- C. Index for Realtime Subscription Filters
-- Realtime listens often filter by status (pending/accepted). 
-- This combined with sender/receiver helps the realtime replication slot filter efficiently.
CREATE INDEX IF NOT EXISTS idx_collab_status_sender 
ON public.collaboration_requests(status, sender_id);

CREATE INDEX IF NOT EXISTS idx_collab_status_receiver 
ON public.collaboration_requests(status, receiver_id);

-- 3. ADMIN STATS & ARCHIVE Performance
-- --------------------------------------------------------------------
-- A. Optimizing get_admin_stats active_users count
-- The query: SELECT count(distinct user_id) FROM daily_archives WHERE updated_at >= ...
-- Needs an index on updated_at to filter range efficiently, and include user_id for index-only scan.
CREATE INDEX IF NOT EXISTS idx_daily_archives_updated_user 
ON public.daily_archives(updated_at, user_id);

-- B. Optimizing Archive Lookups (Date Range)
-- Common query: WHERE user_id = ? AND archive_date >= ?
CREATE INDEX IF NOT EXISTS idx_daily_archives_user_date 
ON public.daily_archives(user_id, archive_date);

-- 4. LIVE HARVEST Sync Performance
-- --------------------------------------------------------------------
-- Updates to live_harvest are frequent (upserts). 
-- JSONB index is already in file 06, but we ensure the PK is used efficiently.
-- No extra index needed for PK, but ensuring the lookup is fast for Admin View.
-- If Admins query by last_updated_by:
CREATE INDEX IF NOT EXISTS idx_live_harvest_last_updated 
ON public.live_harvest(last_updated_by);

-- 5. ADMIN UTILITY Performance
-- --------------------------------------------------------------------
-- A. App Errors Log
-- Admin view fetches last 100 errors ordered by time.
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at 
ON public.app_errors(created_at DESC);

-- B. Client Locations Map
-- Admin map fetches locations ordered by update time.
CREATE INDEX IF NOT EXISTS idx_client_routes_location_updated 
ON public.client_routes(location_updated_at DESC);

-- 6. ANALYZE to update query planner statistics immediately
-- --------------------------------------------------------------------
ANALYZE public.subscriptions;
ANALYZE public.collaboration_requests;
ANALYZE public.daily_archives;
ANALYZE public.live_harvest;
ANALYZE public.app_errors;
ANALYZE public.client_routes;

-- ====================================================================
-- End of Performance Tuning
-- ====================================================================
