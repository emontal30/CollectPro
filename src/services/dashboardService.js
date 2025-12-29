import { apiInterceptor } from './api.js';
import { supabase } from '@/supabase';

export const dashboardService = {
  async getDashboardData() {
    try {
      // Fetch daily visits
      const { data: dailyVisits, error: visitsError } = await apiInterceptor(
        supabase
          .from('daily_visits')
          .select('count')
          .single()
      );

      // Fetch total users
      const { count: totalUsers, error: usersError } = await apiInterceptor(
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
      );

      // Fetch active subscriptions
      const { count: activeSubscriptions, error: subsError } = await apiInterceptor(
        supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
      );

      // Fetch revenue statistics
      const { data: revenueStats, error: revenueError } = await apiInterceptor(
        supabase
          .from('subscription_payments')
          .select('amount, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      );

      const monthlyRevenue = revenueStats?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      return {
        data: {
          daily_visits: dailyVisits?.count || 0,
          total_users: totalUsers || 0,
          active_subscriptions: activeSubscriptions || 0,
          monthly_revenue: monthlyRevenue
        },
        error: visitsError || usersError || subsError || revenueError
      };
    } catch (error) {
      return { data: null, error };
    }
  }
};

export default dashboardService;
