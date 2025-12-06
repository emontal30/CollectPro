import { createClient } from '@supabase/supabase-js'

// إعداد Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export { supabase }

// دوال التوثيق
export const auth = {
  // تسجيل الدخول باستخدام جوجل
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    return { data, error }
  },

  // تسجيل الخروج
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // مراقبة حالة التوثيق
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // جلب المستخدم الحالي
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // جلب جلسة التوثيق
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // التحقق من حالة التوثيق
  async isAuthenticated() {
    const { session } = await supabase.auth.getSession()
    return session !== null
  }
}

// دوال بيانات المستخدم
export const user = {
  // جلب بيانات المستخدم
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    return { user: data.user, error }
  },

  // تحديث بيانات المستخدم
  async updateUser(updates) {
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  },

  // مزامنة ملف المستخدم
  async syncUserProfile(userData) {
    try {
      const { error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.id)
        .single();

      // إذا لم يكن المستخدم موجوداً، قم بإضافته
      if (error && error.code === 'PGRST116') {
        const fullName = userData.user_metadata?.full_name || userData.email;
        const { error: insertError } = await supabase.from('users').insert({
          id: userData.id,
          full_name: fullName,
          email: userData.email,
          password_hash: '' // حقل مطلوب في قاعدة بياناتك القديمة
        });
        return { error: insertError };
      }
      return { error };
    } catch (err) {
      return { error: err };
    }
  }
}

// دوال الاشتراكات
export const subscriptions = {
  // جلب خطط الاشتراك
  async getPlans() {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true })

    return { plans: data, error }
  },

  // اختيار خطة اشتراك
  async selectPlan(userId, planId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    return { data, error }
  },

  // جلب اشتراك المستخدم
  async getSubscription(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (name, name_ar)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return { subscription: data, error }
  },

  // جلب سجل الاشتراكات
  async getSubscriptionHistory(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (name, name_ar)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { history: data, error }
  },

  // تحديث حالة الاشتراك
  async updateSubscriptionStatus(subscriptionId, status) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    return { data, error }
  }
}

// دوال لوحة التحكم
export const dashboard = {
  // جلب بيانات لوحة التحكم المجمعة
  async getDashboardData() {
    try {
      // جلب الزيارات اليومية
      const { data: dailyVisits, error: visitsError } = await supabase
        .from('daily_visits')
        .select('count')
        .single()

      // جلب إجمالي المستخدمين
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // جلب إجمالي الاشتراكات النشطة
      const { count: activeSubscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // جلب إحصائيات الإيرادات
      const { data: revenueStats, error: revenueError } = await supabase
        .from('subscription_payments')
        .select('amount, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const monthlyRevenue = revenueStats?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      return {
        data: {
          daily_visits: dailyVisits?.count || 0,
          total_users: totalUsers || 0,
          active_subscriptions: activeSubscriptions || 0,
          monthly_revenue: monthlyRevenue
        },
        error: visitsError || usersError || subsError || revenueError
      }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// دوال الإدارة
export const admin = {
  // جلب الإحصائيات
  async getStats() {
    const [usersRes, pendingRes, activeRes, cancelledRes, expiredRes, revenueRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
      supabase.rpc('calculate_total_revenue')
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

  // جلب بيانات المخطط الخطي
  async getMonthlyChartData() {
    const { data } = await supabase
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

  // جلب الاشتراكات المعلقة
  async getPendingSubscriptions() {
    const { data } = await supabase
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

  // جلب جميع الاشتراكات مع الفلترة
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
    if (filters.planType && filters.planType !== 'all') {
      query = query.eq('plan_id', filters.planType);
    }

    const { data } = await query;
    return data || [];
  },

  // جلب المستخدمين الذين قاموا بتسجيل دخول ناجح (جميع المستخدمين المسجلين)
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    const { data: activeSubs, error: subsError } = await supabase
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

  // إجراءات الاشتراك (تفعيل/رفض/حذف)
  async handleSubscriptionAction(id, action) {
    let updateData = {};
    let confirmMsg = '';

    switch(action) {
      case 'approve':
        const { data: sub } = await supabase.from('subscriptions').select('plan_id').eq('id', id).single();
        const { data: plan } = await supabase.from('subscription_plans').select('duration_months').eq('id', sub.plan_id).single();

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
      await supabase.from('subscriptions').delete().eq('id', id);
    } else {
      await supabase.from('subscriptions').update(updateData).eq('id', id);
    }

    return { success: true };
  },

  // تفعيل اشتراك يدوي
  async activateManualSubscription(userId, days) {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + Number(days));

    await supabase.from('subscriptions').delete().eq('user_id', userId).eq('status', 'pending');

    const { error } = await supabase.from('subscriptions').insert({
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

// دوال الأرشيف
export const archive = {
  // جلب التواريخ المتاحة
  async getAvailableDates(userId) {
    const { data, error } = await supabase
      .from('archive_data')
      .select('archive_date')
      .eq('user_id', userId)
      .order('archive_date', { ascending: true })

    return { dates: data?.map(item => item.archive_date) || [], error }
  },

  // جلب بيانات أرشيف تاريخ معين
  async getArchiveByDate(userId, date) {
    const { data, error } = await supabase
      .from('archive_data')
      .select('*')
      .eq('user_id', userId)
      .eq('archive_date', date)

    return { data, error }
  },

  // البحث في الأرشيف
  async searchArchive(userId, query) {
    const { data, error } = await supabase
      .from('archive_data')
      .select('*')
      .eq('user_id', userId)
      .or(`shop.ilike.%${query}%,code.ilike.%${query}%`)
      .order('archive_date', { ascending: false })

    return { data, error }
  },

  // حذف أرشيف تاريخ معين
  async deleteArchiveByDate(userId, date) {
    const { error } = await supabase
      .from('archive_data')
      .delete()
      .eq('user_id', userId)
      .eq('archive_date', date)

    return { error }
  }
}

// دوال عامة
export const general = {
  // تحديث عدد الزيارات اليومية
  async incrementDailyVisits() {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_visits')
      .upsert({
        date: today,
        count: 1
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })
      .select()

    if (!error && data) {
      // إذا كان السجل موجود، زد العداد
      await supabase
        .from('daily_visits')
        .update({ count: (data[0]?.count || 0) + 1 })
        .eq('date', today)
    }

    return { error }
  }
}

// دوال الدفع
export const payment = {
  // جلب تفاصيل الخطة
  async getPlanDetails(planId) {
    const durationMap = {
      'monthly': { months: 1, period: 'شهريًا' },
      'quarterly': { months: 3, period: '3 شهور' },
      'yearly': { months: 12, period: 'سنويًا' }
    };

    const planInfo = durationMap[planId];
    if (!planInfo) throw new Error('خطة غير صالحة');

    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('duration_months', planInfo.months)
      .limit(1)
      .maybeSingle();

    if (data) {
      return { ...data, period: planInfo.period };
    } else {
      const prices = { 'monthly': 30, 'quarterly': 80, 'yearly': 360 };
      return {
        id: planId,
        name: planInfo.months === 1 ? 'خطة شهرية' : planInfo.months === 3 ? 'خطة 3 شهور' : 'خطة سنوية',
        price: prices[planId],
        period: planInfo.period,
        duration_months: planInfo.months
      };
    }
  },

  // إرسال طلب دفع
  async submitPayment(userId, planId, transactionId, userData, selectedPlan) {
    // التحقق من الاشتراكات النشطة
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeSubs && activeSubs.length > 0) {
      // إلغاء الاشتراكات السابقة
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', end_date: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');
    }

    // تنظيف الطلبات المعلقة السابقة
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending');

    // التأكد من وجود المستخدم في جدول users
    const { error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userCheckError) {
      // إضافة المستخدم إذا لم يكن موجوداً
      await supabase.from('users').upsert({
        id: userId,
        email: userData.email || 'user@example.com',
        full_name: userData.name || 'مستخدم'
      });
    }

    // إدراج الاشتراك الجديد
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        plan_name: selectedPlan.name,
        plan_period: selectedPlan.period,
        price: selectedPlan.price,
        transaction_id: transactionId,
        status: 'pending'
      });

    return { error: insertError };
  }
}

// تصدير النظام الموحد
const api = {
  auth,
  user,
  subscriptions,
  dashboard,
  admin,
  archive,
  payment,
  general
}

export default api