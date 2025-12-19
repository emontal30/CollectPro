import { apiInterceptor } from './api.js';
import { authService } from './authService.js';
import logger from '@/utils/logger.js';

export const adminService = {
  async getActiveUsersCount(periodInDays = 30) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - periodInDays);

    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .gte('updated_at', daysAgo.toISOString())
    );
    
    if (error) {
      logger.warn('Failed to fetch active users count:', error);
      return 0;
    }
    
    const uniqueUsers = new Set(data?.map(sub => sub.user_id) || []);
    return uniqueUsers.size;
  },

  async getStats(filters = {}) {
    const { activeUsersPeriod = 30 } = filters;

    const [usersRes, pendingRes, activeRes, cancelledRes, expiredRes, revenueRes, activeUsersCountRes] = await Promise.all([
      apiInterceptor(authService.supabase.from('users').select('*', { count: 'exact', head: true })),
      apiInterceptor(authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      apiInterceptor(authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      apiInterceptor(authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled')),
      apiInterceptor(authService.supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired')),
      apiInterceptor(authService.supabase.rpc('calculate_total_revenue')),
      this.getActiveUsersCount(activeUsersPeriod)
    ]);

    return {
      totalUsers: usersRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      activeSubscriptions: activeRes.count || 0,
      cancelled: cancelledRes.count || 0,
      expired: expiredRes.count || 0,
      totalRevenue: revenueRes.data || 0,
      activeUsers: activeUsersCountRes || 0
    };
  },

  async getMonthlyChartData() {
    const { data } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select('created_at')
        .order('created_at', { ascending: true })
    );

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
    const { data } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select(`
        *,
        users:user_id (full_name, email),
        subscription_plans:plan_id (name, name_ar, price_egp)
      `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    );

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

    if (filters.expiry === 'expiring_soon') {
      const today = new Date().toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('end_date', today);
      query = query.lte('end_date', sevenDaysFromNow);
    }

    const { data } = await apiInterceptor(query);
    return data || [];
  },

  async getUsers() {
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false })
    );

    if (error) {
      logger.error('Error fetching users:', error);
      return [];
    }

    const { data: activeSubs, error: subsError } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
    );

    if (subsError) {
      logger.error('Error fetching active subscriptions:', subsError);
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
        const { data: sub } = await apiInterceptor(authService.supabase.from('subscriptions').select('plan_id').eq('id', id).single());
        if (!sub) return { success: false, error: 'Subscription not found' };

        const { data: plan } = await apiInterceptor(authService.supabase.from('subscription_plans').select('duration_months').eq('id', sub.plan_id).single());

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
      await apiInterceptor(authService.supabase.from('subscriptions').delete().eq('id', id));
    } else {
      await apiInterceptor(authService.supabase.from('subscriptions').update(updateData).eq('id', id));
    }

    return { success: true };
  },

  // --- التعديل الرئيسي هنا: إصلاح تفعيل الاشتراك اليدوي ---
  async activateManualSubscription(userId, days) {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + Number(days));

    // 1. جلب معرف خطة صالح (لتجنب خطأ null value violates not-null constraint)
    // نأخذ أول خطة متاحة فقط كمرجع (placeholder)
    const { data: plan } = await apiInterceptor(
      authService.supabase
        .from('subscription_plans')
        .select('id')
        .limit(1)
        .single()
    );
    
    // إذا لم توجد خطط، لا يمكننا إنشاء اشتراك بسبب قيود قاعدة البيانات
    if (!plan) {
      logger.error("No plans found to assign to manual subscription");
      return { error: { message: "لا توجد خطط معرفة في النظام لربط الاشتراك بها" } };
    }

    // 2. حذف أي طلبات معلقة لتجنب التعارض
    await apiInterceptor(authService.supabase.from('subscriptions').delete().eq('user_id', userId).eq('status', 'pending'));

    // 3. إدراج الاشتراك الجديد مع plan_id الصالح
    const { error } = await apiInterceptor(authService.supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: plan.id, // تم إضافة هذا الحقل الضروري
      plan_name: 'اشتراك يدوي',
      plan_period: `${days} يوم`,
      price: 0,
      status: 'active',
      start_date: start,
      end_date: end,
      transaction_id: `MANUAL-${Date.now()}`
    }));

    return { error };
  }
}

export default adminService;