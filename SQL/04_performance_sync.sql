-- ====================================================================
-- COLLECTPRO DATABASE - FILE 4/5: PERFORMANCE & SYNC OPTIMIZATION
-- Consolidated from: 06_performance_optimization.sql, 08_performance_tuning.sql, 12_deadlock_prevention.sql
-- Includes: GIN & B-tree Indexes, Deadlock Prevention, Advisory Locks
-- ====================================================================

-- ####################################################################
-- PART 1: JSONB INDEXING (GIN) - من ملف 06
-- ####################################################################

-- Improves search performance inside JSON arrays/objects
CREATE INDEX IF NOT EXISTS idx_daily_archives_data_gin ON public.daily_archives USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_live_harvest_rows_gin ON public.live_harvest USING GIN (rows);

-- Performance indexes for dashboard stats
CREATE INDEX IF NOT EXISTS idx_daily_archives_updated_at ON public.daily_archives(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Verify if stats triggers are still hanging around
DROP TRIGGER IF EXISTS trigger_update_stats_subs ON public.subscriptions;
DROP TRIGGER IF EXISTS trigger_update_stats_users ON public.users;

-- ####################################################################
-- PART 2: B-TREE PERFORMANCE INDEXES - من ملف 08
-- ####################################################################

-- 1. SUBSCRIPTIONS Performance (critical for can_write_data())
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions(user_id, status);

-- 2. COLLABORATION Performance
CREATE INDEX IF NOT EXISTS idx_collab_rls_composite 
ON public.collaboration_requests(sender_id, receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_collab_receiver 
ON public.collaboration_requests(receiver_id);

CREATE INDEX IF NOT EXISTS idx_collab_status_sender 
ON public.collaboration_requests(status, sender_id);

CREATE INDEX IF NOT EXISTS idx_collab_status_receiver 
ON public.collaboration_requests(status, receiver_id);

-- 3. ADMIN STATS & ARCHIVE Performance
CREATE INDEX IF NOT EXISTS idx_daily_archives_updated_user 
ON public.daily_archives(updated_at, user_id);

CREATE INDEX IF NOT EXISTS idx_daily_archives_user_date 
ON public.daily_archives(user_id, archive_date);

-- 4. LIVE HARVEST Sync Performance
CREATE INDEX IF NOT EXISTS idx_live_harvest_last_updated 
ON public.live_harvest(last_updated_by);

-- 5. ADMIN UTILITY Performance
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at 
ON public.app_errors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_routes_location_updated 
ON public.client_routes(location_updated_at DESC);

-- ####################################################################
-- PART 3: DEADLOCK PREVENTION (Advisory Locks) - من ملف 12
-- ####################################################################

-- Safe Upsert for Daily Archives
CREATE OR REPLACE FUNCTION public.upsert_daily_archive_safe(
    p_user_id UUID,
    p_archive_date DATE,
    p_data JSONB,
    p_updated_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lock_key BIGINT;
    result_row daily_archives;
BEGIN
    -- Generate unique lock key based on user_id + date
    lock_key := ('x' || substr(md5(p_user_id::text || p_archive_date::text), 1, 15))::bit(60)::bigint;
    
    -- Acquire advisory lock (will wait if another transaction holds it)
    PERFORM pg_advisory_xact_lock(lock_key);
    
    -- Now safe to upsert without deadlock risk
    INSERT INTO public.daily_archives (user_id, archive_date, data, updated_at)
    VALUES (p_user_id, p_archive_date, p_data, p_updated_at)
    ON CONFLICT (user_id, archive_date) 
    DO UPDATE SET 
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    RETURNING * INTO result_row;
    
    RETURN json_build_object(
        'success', true, 
        'id', result_row.id,
        'archive_date', result_row.archive_date
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Safe Upsert for Client Routes
CREATE OR REPLACE FUNCTION public.upsert_client_routes_safe(
    p_routes JSONB
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    route_item JSONB;
    lock_key BIGINT;
    success_count INT := 0;
    error_count INT := 0;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    FOR route_item IN SELECT * FROM jsonb_array_elements(p_routes) LOOP
        BEGIN
            lock_key := ('x' || substr(md5(
                current_user_id::text || 
                (route_item->>'shop_code')::text
            ), 1, 15))::bit(60)::bigint;
            
            PERFORM pg_advisory_xact_lock(lock_key);
            
            INSERT INTO public.client_routes (
                user_id, 
                shop_code, 
                shop_name, 
                current_balance,
                latitude,
                longitude,
                location_updated_at,
                sort_order,
                is_ignored,
                updated_at
            )
            VALUES (
                current_user_id,
                route_item->>'shop_code',
                route_item->>'shop_name',
                (route_item->>'current_balance')::NUMERIC,
                (route_item->>'latitude')::NUMERIC,
                (route_item->>'longitude')::NUMERIC,
                (route_item->>'location_updated_at')::TIMESTAMPTZ,
                COALESCE((route_item->>'sort_order')::INT, 0),
                COALESCE((route_item->>'is_ignored')::BOOLEAN, false),
                COALESCE((route_item->>'updated_at')::TIMESTAMPTZ, NOW())
            )
            ON CONFLICT (user_id, shop_code)
            DO UPDATE SET
                shop_name = EXCLUDED.shop_name,
                current_balance = EXCLUDED.current_balance,
                latitude = COALESCE(EXCLUDED.latitude, client_routes.latitude),
                longitude = COALESCE(EXCLUDED.longitude, client_routes.longitude),
                location_updated_at = COALESCE(EXCLUDED.location_updated_at, client_routes.location_updated_at),
                sort_order = EXCLUDED.sort_order,
                is_ignored = EXCLUDED.is_ignored,
                updated_at = EXCLUDED.updated_at;
            
            success_count := success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed', success_count,
        'errors', error_count
    );
END;
$$;

-- ####################################################################
-- PART 4: ADDITIONAL CONFLICT DETECTION INDEXES
-- ####################################################################

-- Note: Removed partial indexes with NOW() predicate (not IMMUTABLE)
-- Using full indexes instead for reliability

CREATE INDEX IF NOT EXISTS idx_daily_archives_user_date_conflict 
ON public.daily_archives(user_id, archive_date);

CREATE INDEX IF NOT EXISTS idx_client_routes_user_shop_conflict
ON public.client_routes(user_id, shop_code);

-- ====================================================================
-- PERMISSIONS
-- ====================================================================

GRANT EXECUTE ON FUNCTION public.upsert_daily_archive_safe(UUID, DATE, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_client_routes_safe(JSONB) TO authenticated;

-- ####################################################################
-- PART 5: ANALYZE TABLES
-- ####################################################################

ANALYZE public.daily_archives;
ANALYZE public.subscriptions;
ANALYZE public.live_harvest;
ANALYZE public.collaboration_requests;
ANALYZE public.app_errors;
ANALYZE public.client_routes;

-- ====================================================================
-- RELOAD SCHEMA CACHE
-- ====================================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
