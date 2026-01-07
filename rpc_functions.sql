-- Supabase Admin RPC Functions
-- These functions consolidate multiple client-side calls into single, efficient, and transactional database operations.

-- 1. Get Admin Statistics
-- Consolidates 5+ queries from the original `getStats` function into one.
create or replace function get_admin_stats(active_days_period int default 30)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  stats_json json;
  active_users_count int;
  pending_count int;
  cancelled_count int;
  expired_count int;
  total_users_count int;
  active_subscriptions_count int;
  total_revenue_val numeric;
begin
  -- Use the statistics table as a base, but verify with live counts
  select
    total_users, active_subscriptions, total_revenue
  into
    total_users_count, active_subscriptions_count, total_revenue_val
  from public.statistics
  where id = '00000000-0000-0000-0000-000000000001';

  -- Get live active users count
  select count(distinct user_id)
  into active_users_count
  from public.daily_archives
  where updated_at >= (now() - (active_days_period || ' days')::interval);

  -- Get live subscription counts for accuracy
  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'cancelled'),
    count(*) filter (where status = 'expired')
  into
    pending_count,
    cancelled_count,
    expired_count
  from public.subscriptions;

  -- Combine all stats into one JSON object
  return json_build_object(
    'totalUsers', total_users_count,
    'activeSubscriptions', active_subscriptions_count,
    'totalRevenue', total_revenue_val,
    'activeUsers', active_users_count,
    'pendingRequests', pending_count,
    'cancelled', cancelled_count,
    'expired', expired_count
  );
end;
$$;

-- 2. Get All Users with Subscription Details
-- Consolidates 3 queries from `getUsers` into a single, efficient JOIN.
-- It fetches user data, profile data (user_code), and active subscription status in one go.
create or replace function get_users_with_details()
returns json
language sql
security definer
set search_path = public
as $$
  select
    json_agg(
      json_build_object(
        'id', u.id,
        'full_name', p.full_name,
        'email', u.email,
        'user_code', p.user_code,
        'created_at', u.created_at,
        'hasActiveSub', (case when s.status = 'active' then true else false end),
        'activeSubId', s.id,
        'expiryDate', s.end_date,
        -- The original JS function expected a "subscriptions" array, let's provide a compatible one
        'subscriptions', (
            select json_agg(sub_details)
            from (
                select id, status, end_date
                from public.subscriptions
                where user_id = u.id
            ) as sub_details
        )
      )
      order by u.created_at desc
    )
  from auth.users as u
  left join public.profiles as p on u.id = p.id
  left join public.subscriptions as s on u.id = s.user_id and s.status = 'active';
$$;

-- 3. Handle Subscription Actions Transactionally
-- Consolidates multiple, non-atomic client-side writes into a single
-- transactional function. This is critical for preventing data corruption,
-- e.g., ensuring a user doesn't end up with no active subscription if one
-- of the steps in the approval process fails.
create or replace function handle_subscription_action(p_subscription_id uuid, p_action text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub subscriptions;
  v_plan subscription_plans;
  v_user_id uuid;
  v_end_date timestamptz;
  v_now timestamptz := now();
begin
  -- Fetch the target subscription to ensure it exists
  select * into v_sub from subscriptions where id = p_subscription_id;
  if v_sub is null then
    return json_build_object('error', json_build_object('message', 'Subscription not found'));
  end if;
  
  v_user_id := v_sub.user_id;

  if p_action = 'approve' then
    -- Get plan details to calculate end date
    select * into v_plan from subscription_plans where id = v_sub.plan_id;
    if v_plan is null then
        return json_build_object('error', json_build_object('message', 'Plan not found for subscription'));
    end if;

    -- Atomically deactivate any other active subscriptions for this user
    update subscriptions
    set status = 'cancelled', updated_at = v_now
    where user_id = v_user_id and status = 'active';

    -- Activate the new subscription
    v_end_date := v_now + (v_plan.duration_months || ' months')::interval;
    
    update subscriptions
    set 
      status = 'active', 
      start_date = v_now, 
      end_date = v_end_date,
      updated_at = v_now
    where id = p_subscription_id
    returning * into v_sub;

    return json_build_object('data', row_to_json(v_sub));

  elsif p_action = 'reject' or p_action = 'delete' then
    delete from subscriptions where id = p_subscription_id;
    return json_build_object('data', '{"message": "Subscription deleted"}');

  elsif p_action = 'cancel' then
    update subscriptions
    set status = 'cancelled', updated_at = v_now
    where id = p_subscription_id
    returning * into v_sub;
    return json_build_object('data', row_to_json(v_sub));
    
  elsif p_action = 'reactivate' then
    update subscriptions
    set status = 'active', updated_at = v_now
    where id = p_subscription_id
    returning * into v_sub;
    return json_build_object('data', row_to_json(v_sub));
  
  else
    return json_build_object('error', json_build_object('message', 'Invalid action specified'));
  end if;

end;
$$;
