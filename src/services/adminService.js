import { authService } from './authService.js'

export const adminService = {
  async getStats() {
    const [usersRes, pendingRes, activeRes, cancelledRes, expiredRes, revenueRes] = await Promise.all([
      authService.supabase.from('users').select('*', { count: 'exact', head: true }),
      authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
      authService.supabase.rpc('calculate_total_revenue')
    ]);

    return {
      totalUsers: usersRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      activeSubscriptions: activeRes.count || 0,
      cancelled: cancelledRes.count || 0,
      expired: expiredRes.count || 0,
      totalRevenue: revenueRes.data || 0
    };
  },

  async getMonthlyChartData() {
    const { data } = await authService.supabase
      .from('subscriptions')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (!data) return { labels: [], values: [] };

    const monthsCount = {};
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const last5Months = [];

    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      last5Months.push(key);
      monthsCount[key] = 0;
    }

    data.forEach(sub => {
      const d = new Date(sub.created_at);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (monthsCount[key] !== undefined) {
        monthsCount[key]++;
      }
    });

    return {
      labels: last5Months,
      values: last5Months.map(k => monthsCount[k])
    };
  },

  async getPendingSubscriptions() {
    const { data } = await authService.supabase
      .from('subscriptions')
      .select(`
        *,
        users:user_id (full_name, email),
        subscription_plans:plan_id (name, name_ar, price_egp)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return data || [];
  },

  async getAllSubscriptions(filters = {}) {
    let query = authService.supabase
      .from('subscriptions')
      .select(`
        *,
        users:user_id (full_name, email),
        subscription_plans:plan_id (name, name_ar, price_egp)
      `)
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.planType && filters.planType !== 'all') {
      query = query.eq('plan_id', filters.planType);
    }

    const { data } = await query;
    return data || [];
  },

  async getUsers() {
    const { data, error } = await authService.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    const { data: activeSubs, error: subsError } = await authService.supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching active subscriptions:', subsError);
    }

    const activeUserIds = new Set(activeSubs?.map(s => s.user_id) || []);

    return (data || []).map(user => ({
      ...user,
      hasActiveSub: activeUserIds.has(user.id)
    }));
  },

  async handleSubscriptionAction(id, action) {
    let updateData = {};

    switch(action) {
      case 'approve':
        const { data: sub } = await authService.supabase.from('subscriptions').select('plan_id').eq('id', id).single();
        const { data: plan } = await authService.supabase.from('subscription_plans').select('duration_months').eq('id', sub.plan_id).single();

        const start = new Date();
        const end = new Date(start);
        end.setMonth(start.getMonth() + (plan?.duration_months || 1));

        updateData = { status: 'active', start_date: start, end_date: end };
        break;
      case 'reject':
      case 'cancel':
        updateData = { status: action === 'reject' ? 'cancelled' : 'cancelled', end_date: new Date() };
        break;
      case 'reactivate':
        updateData = { status: 'active' };
        break;
      case 'delete':
        break;
    }

    if (action === 'reject' || action === 'delete') {
      await authService.supabase.from('subscriptions').delete().eq('id', id);
    } else {
      await authService.supabase.from('subscriptions').update(updateData).eq('id', id);
    }

    return { success: true };
  },

  async activateManualSubscription(userId, days) {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + Number(days));

    await authService.supabase.from('subscriptions').delete().eq('user_id', userId).eq('status', 'pending');

    const { error } = await authService.supabase.from('subscriptions').insert({
      user_id: userId,
      plan_name: 'اشتراك يدوي',
      plan_period: `${days} يوم`,
      price: 0,
      status: 'active',
      start_date: start,
      end_date: end,
      transaction_id: `MANUAL-${Date.now()}`
    });

    return { error };
  }
}

export default adminService
