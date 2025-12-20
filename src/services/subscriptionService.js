import { apiInterceptor } from './api.js';
import { authService } from './authService.js';

export const subscriptionService = {
  async getPlans() {
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })
    );
    return { plans: data, error };
  },

  async selectPlan(userId, planId) {
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
    );
    return { data, error };
  },

  async getSubscription(userId) {
    // محاولة جلب الاشتراك النشط أولاً
    let { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select(`*, subscription_plans:plan_id (name, name_ar)`)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    // إذا لم يوجد نشط، نجلب الأحدث أياً كانت حالته
    if (!data) {
      const result = await apiInterceptor(
        authService.supabase
          .from('subscriptions')
          .select(`*, subscription_plans:plan_id (name, name_ar)`)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      data = result.data;
      error = result.error;
    }

    return { subscription: data, error };
  },

  async getSubscriptionHistory(userId) {
    // جلب جميع الاشتراكات السابقة مرتبة من الأحدث إلى الأقدم
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select(`*, subscription_plans:plan_id (name, name_ar)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );

    return { history: data || [], error };
  },

  async updateSubscriptionStatus(subscriptionId, status) {
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', subscriptionId)
    );
    return { data, error };
  },

  async getSubscriptionById(subscriptionId) {
    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()
    );
    return { data, error };
  }
};

export default subscriptionService;
