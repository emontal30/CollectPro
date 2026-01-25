-- ====================================================================
-- COLLECTPRO DATABASE - FILE 6: PERFORMANCE OPTIMIZATION
-- Recommendations audit fix: Adding GIN indexes and performance btree
-- ====================================================================

-- 1. JSONB INDEXING (GIN)
-- Improves search performance inside JSON arrays/objects
-- ====================================================================

-- Index for Archive Search (searching for specific shop/code in history)
CREATE INDEX IF NOT EXISTS idx_daily_archives_data_gin ON public.daily_archives USING GIN (data);

-- Index for Live Harvest (improves admin read/merge performance)
CREATE INDEX IF NOT EXISTS idx_live_harvest_rows_gin ON public.live_harvest USING GIN (rows);

-- 2. PERFORMANCE INDEXES for Dashboard Stats
-- ====================================================================

-- Index for counting active users last N days (used in get_admin_stats)
CREATE INDEX IF NOT EXISTS idx_daily_archives_updated_at ON public.daily_archives(updated_at DESC);

-- Index for subscription status counts
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 3. CLEANUP & VERIFICATION
-- ====================================================================

-- Verify if stats triggers are still hanging around (just in case)
DROP TRIGGER IF EXISTS trigger_update_stats_subs ON public.subscriptions;
DROP TRIGGER IF EXISTS trigger_update_stats_users ON public.users;

ANALYZE public.daily_archives;
ANALYZE public.subscriptions;
ANALYZE public.live_harvest;

-- Finished Performance Optimizations
