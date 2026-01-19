import { apiInterceptor } from './api.js';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';

export const adminService = {
  /**
   * 1. جلب الإحصائيات العامة
   * @param {number} activeDays - عدد الأيام لحساب المستخدمين النشطين
   */
  async getStats(activeDays = 30) {
    try {
      // استخدام الدالة المحسّنة التي تتجاوز RLS
      const { data, error } = await apiInterceptor(
        supabase.rpc('get_admin_stats_fixed', { active_days_period: activeDays })
      );

      if (error) {
        logger.error('Error fetching admin stats:', error);
        return {};
      }

      return data || {};
    } catch (err) {
      logger.error('Error fetching admin stats:', err);
      return {};
    }
  },

  /**
   * 2. جلب طلبات الاشتراك المعلقة
   */
  async getPendingSubscriptions() {
    // Step 1: Fetch subscriptions with nested user data
    const { data: subsData, error: subsError } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('*, users:user_id (full_name, email), subscription_plans:plan_id (name, name_ar, price_egp, duration_months)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    );

    if (subsError || !subsData) return [];

    const userIds = subsData.map(s => s.user_id);
    if (userIds.length === 0) return [];

    const { data: profilesData, error: profilesError } = await apiInterceptor(
      supabase.from('profiles').select('id, user_code').in('id', userIds)
    );

    if (profilesError) logger.warn('Could not fetch profiles for pending subs.');

    const profilesMap = new Map(profilesData?.map(p => [p.id, p.user_code]) || []);

    return subsData.map(sub => ({ ...sub, user_code: profilesMap.get(sub.user_id) || null }));
  },

  /**
   * 3. جلب جميع المستخدمين مع حالة اشتراكاتهم
   */
  async getUsers() {
    const { data: usersData, error: usersError } = await apiInterceptor(
      supabase.from('users').select('*, subscriptions(id, status, end_date)').order('created_at', { ascending: false })
    );

    if (usersError) {
      logger.error('Error fetching users:', usersError);
      return [];
    }
    if (!usersData) return [];

    const userIds = usersData.map(u => u.id);
    const { data: profilesData, error: profilesError } = await apiInterceptor(
      supabase.from('profiles').select('id, user_code').in('id', userIds)
    );

    if (profilesError) logger.warn('Could not fetch user profiles, short codes will be missing.');

    const profilesMap = new Map(profilesData?.map(p => [p.id, p.user_code]) || []);

    return usersData.map(user => {
      const activeSub = user.subscriptions?.find(s => s.status === 'active');
      return { ...user, user_code: profilesMap.get(user.id) || null, hasActiveSub: !!activeSub, activeSubId: activeSub?.id, expiryDate: activeSub?.end_date || null };
    });
  },

  /**
   * 4. جلب جميع الاشتراكات مع الفلترة
   */
  async getAllSubscriptions(filters = {}) {
    let query = supabase.from('admin_subscriptions_view').select('*').order('created_at', { ascending: false });
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.expiry === 'expiring_soon') {
      const today = new Date().toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('end_date', today).lte('end_date', sevenDaysFromNow);
    }
    const { data } = await apiInterceptor(query);
    return data || [];
  },

  /**
   * 5. معالجة تفعيل/إلغاء الاشتراك
   */
  async handleSubscriptionAction(id, action) {
    const now = new Date();
    const updates = { updated_at: now.toISOString() };

    if (action === 'approve') {
      const { data: sub } = await apiInterceptor(supabase.from('subscriptions').select('user_id, plan_id, subscription_plans(duration_months)').eq('id', id).single());
      if (!sub) return { error: 'Request not found' };

      await supabase.from('subscriptions').update({ status: 'cancelled', ...updates }).eq('user_id', sub.user_id).eq('status', 'active');

      const months = sub?.subscription_plans?.duration_months || 1;
      const end = new Date(now);
      end.setMonth(now.getMonth() + months);

      return apiInterceptor(supabase.from('subscriptions').update({ status: 'active', start_date: now.toISOString(), end_date: end.toISOString(), ...updates }).eq('id', id).select().single());
    }
    if (action === 'reject' || action === 'delete') {
      return apiInterceptor(supabase.from('subscriptions').delete().eq('id', id).select().single());
    }
    if (action === 'cancel') {
      return apiInterceptor(supabase.from('subscriptions').update({ status: 'cancelled', ...updates }).eq('id', id).select().single());
    }
    if (action === 'reactivate') {
      return apiInterceptor(supabase.from('subscriptions').update({ status: 'active', ...updates }).eq('id', id).select().single());
    }
  },

  /**
   * 6. تفعيل يدوي أو إضافة أيام
   */
  async activateManualSubscription(userId, days) {
    const now = new Date();
    const { data: activeSub } = await apiInterceptor(supabase.from('subscriptions').select('id, end_date').eq('user_id', userId).eq('status', 'active').maybeSingle());

    if (activeSub) {
      let newEnd = new Date(activeSub.end_date);
      if (newEnd < now) newEnd = now;
      newEnd.setDate(newEnd.getDate() + Number(days));
      return apiInterceptor(supabase.from('subscriptions').update({ end_date: newEnd.toISOString(), updated_at: now.toISOString() }).eq('id', activeSub.id).select().single());
    } else {
      const end = new Date(now);
      end.setDate(now.getDate() + Number(days));
      const { data: plan } = await apiInterceptor(supabase.from('subscription_plans').select('id').limit(1).maybeSingle());
      if (!plan) return { error: { message: 'No plans defined' } };
      await supabase.from('subscriptions').delete().eq('user_id', userId).eq('status', 'pending');
      return apiInterceptor(supabase.from('subscriptions').insert({ user_id: userId, plan_id: plan.id, plan_name: 'Manual Subscription', price: 0, status: 'active', start_date: now.toISOString(), end_date: end.toISOString(), transaction_id: `MANUAL-${Date.now()}` }).select().single());
    }
  },

  /**
   * 7. جلب بيانات الرسم البياني الشهري
   */
  async getMonthlyChartData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })
    );

    if (!data) return { labels: [], values: [] };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsCount = {};
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
      if (monthsCount[key] !== undefined) monthsCount[key]++;
    });

    return { labels: last5Months, values: last5Months.map(k => monthsCount[k]) };
  }
}

export default adminService;
