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
      // 1. جلب الإحصائيات الأساسية من جدول statistics
      const { data: statsData } = await apiInterceptor(
        supabase
          .from('statistics')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle()
      );

      // 2. حساب المستخدمين النشطين (الذين قاموا بعمليات إدخال بيانات خلال الفترة)
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - activeDays);
      
      const { data: activeUsersData } = await apiInterceptor(
        supabase
          .from('daily_archives')
          .select('user_id')
          .gte('updated_at', dateLimit.toISOString())
      );

      const uniqueActiveUsers = activeUsersData ? new Set(activeUsersData.map(u => u.user_id)).size : 0;

      // 3. جلب العدادات الأخرى بشكل مباشر لضمان الدقة 100%
      const [cancelledRes, expiredRes, pendingRes] = await Promise.all([
        apiInterceptor(supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled')),
        apiInterceptor(supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired')),
        apiInterceptor(supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'))
      ]);

      const stats = statsData || { total_users: 0, active_subscriptions: 0, pending_requests: 0, total_revenue: 0 };

      return {
        totalUsers: stats.total_users || 0,
        pendingRequests: pendingRes.count || 0, // جلب العدد الحقيقي المباشر
        activeSubscriptions: stats.active_subscriptions || 0,
        totalRevenue: stats.total_revenue || 0,
        cancelled: cancelledRes.count || 0,
        expired: expiredRes.count || 0,
        activeUsers: uniqueActiveUsers 
      };
    } catch (err) {
      logger.error('Error fetching admin stats:', err);
      return {};
    }
  },

  /**
   * 2. جلب طلبات الاشتراك المعلقة
   */
  async getPendingSubscriptions() {
    const { data } = await apiInterceptor(
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
    return data || [];
  },

  /**
   * 3. جلب جميع المستخدمين مع حالة اشتراكاتهم
   */
  async getUsers() {
    const { data, error } = await apiInterceptor(
      supabase
        .from('users')
        .select('*, subscriptions(id, status, end_date)')
        .order('created_at', { ascending: false })
    );

    if (error) return [];

    return (data || []).map(user => {
      const activeSub = user.subscriptions?.find(s => s.status === 'active');
      return {
        ...user,
        hasActiveSub: !!activeSub,
        activeSubId: activeSub?.id,
        expiryDate: activeSub?.end_date || null
      };
    });
  },

  /**
   * 4. جلب جميع الاشتراكات مع الفلترة
   */
  async getAllSubscriptions(filters = {}) {
    let query = supabase
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

    if (action === 'approve') {
      const { data: sub } = await apiInterceptor(
        supabase
          .from('subscriptions')
          .select('user_id, plan_id, subscription_plans(duration_months)')
          .eq('id', id)
          .single()
      );

      if (!sub) return { error: 'الطلب غير موجود' };

      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('user_id', sub.user_id)
        .eq('status', 'active');

      const months = sub?.subscription_plans?.duration_months || 1;
      const end = new Date(now);
      end.setMonth(now.getMonth() + months);

      return await apiInterceptor(
        supabase
          .from('subscriptions')
          .update({ 
            status: 'active', 
            start_date: now.toISOString(), 
            end_date: end.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', id)
      );
    } 
    
    if (action === 'reject' || action === 'delete') {
      return await apiInterceptor(supabase.from('subscriptions').delete().eq('id', id));
    } 
    
    if (action === 'cancel') {
      return await apiInterceptor(
        supabase
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: now.toISOString() })
          .eq('id', id)
      );
    }

    if (action === 'reactivate') {
        return await apiInterceptor(
          supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: now.toISOString() })
            .eq('id', id)
        );
    }
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
