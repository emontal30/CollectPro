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
      const { data, error } = await apiInterceptor(
        supabase.rpc('get_admin_stats', { active_days_period: activeDays })
      );

      if (error) {
        throw error;
      }
      
      // The RPC function returns the data in the exact format needed by the frontend.
      return data;
    } catch (err) {
      logger.error('Error fetching admin stats via RPC:', err);
      // Return a default structure on error to prevent frontend crashes
      return {
        totalUsers: 0,
        pendingRequests: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        cancelled: 0,
        expired: 0,
        activeUsers: 0
      };
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
        .select(`
          *,
          users:user_id (full_name, email),
          subscription_plans:plan_id (name, name_ar, price_egp, duration_months)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    );

    if (subsError || !subsData) return [];
    
    // Step 2: Fetch profiles for the found user_ids
    const userIds = subsData.map(s => s.user_id);
    if (userIds.length === 0) return [];

    const { data: profilesData, error: profilesError } = await apiInterceptor(
      supabase
        .from('profiles')
        .select('id, user_code')
        .in('id', userIds)
    );

    if (profilesError) {
      logger.warn('Could not fetch profiles for pending subs.');
    }
    const profilesMap = new Map(profilesData?.map(p => [p.id, p.user_code]) || []);
    
    // Step 3: Merge the data
    return subsData.map(sub => ({
      ...sub,
      user_code: profilesMap.get(sub.user_id) || null
    }));
  },

  /**
   * 3. جلب جميع المستخدمين مع حالة اشتراكاتهم
   */
  async getUsers() {
    try {
      const { data, error } = await apiInterceptor(
        supabase.rpc('get_users_with_details')
      );
      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      logger.error('Error fetching users via RPC:', err);
      return [];
    }
  },

  /**
   * 4. جلب جميع الاشتراكات مع الفلترة
   */
  async getAllSubscriptions(filters = {}) {
    // The new implementation uses the pre-built view for efficiency
    let query = supabase
      .from('admin_subscriptions_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
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
    return await apiInterceptor(
      supabase.rpc('handle_subscription_action', {
        p_subscription_id: id,
        p_action: action
      })
    );
  },

  /**
   * 6. تفعيل يدوي أو إضافة أيام
   */
  async activateManualSubscription(userId, days) {
    const now = new Date();
    
    const { data: activeSub } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('id, end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()
    );

    if (activeSub) {
      let newEnd = new Date(activeSub.end_date);
      if (newEnd < now) newEnd = now;
      newEnd.setDate(newEnd.getDate() + Number(days));

      return await apiInterceptor(
        supabase
          .from('subscriptions')
          .update({ 
            end_date: newEnd.toISOString(), 
            updated_at: now.toISOString() 
          })
          .eq('id', activeSub.id)
      );
    } else {
      const end = new Date(now);
      end.setDate(now.getDate() + Number(days));

      const { data: plan } = await apiInterceptor(
        supabase.from('subscription_plans').select('id').limit(1).maybeSingle()
      );
      
      if (!plan) return { error: { message: "لا توجد خطط معرفة" } };

      await supabase.from('subscriptions').delete().eq('user_id', userId).eq('status', 'pending');

      return await apiInterceptor(
        supabase.from('subscriptions').insert({
          user_id: userId,
          plan_id: plan.id,
          plan_name: 'اشتراك يدوي',
          price: 0,
          status: 'active',
          start_date: now.toISOString(),
          end_date: end.toISOString(),
          transaction_id: `MANUAL-${Date.now()}`
        })
      );
    }
  },

  async getMonthlyChartData() {
    const { data } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('created_at')
        .order('created_at', { ascending: true })
    );

    if (!data) return { labels: [], values: [] };

    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
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
