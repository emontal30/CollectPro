import { apiInterceptor } from './apiInterceptor.js';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';

export const subscriptionService = {

  async getUserSubscription(userId) {
    if (!userId) {
      logger.warn('getUserSubscription: userId is missing.');
      return { subscription: null, error: { message: 'User ID is required' } };
    }

    const { data, error } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', userId)
        // .eq('status', 'active') // Removed to fetch pending as well
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    return { subscription: data, error };
  },

  async getSubscriptionHistory(userId) {
    if (!userId) {
      logger.warn('getSubscriptionHistory: userId is missing.');
      return { history: [], error: { message: 'User ID is required' } };
    }

    const { data, error } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('*, subscription_plans(name_ar)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );

    return { history: data, error };
  },

  async getPlanDetails(planId) {
    const durationMap = {
      'monthly': { months: 1, period: 'شهريًا' },
      'quarterly': { months: 3, period: '3 شهور' },
      'yearly': { months: 12, period: 'سنويًا' }
    };

    const planInfo = durationMap[planId];
    if (!planInfo) throw new Error('خطة غير صالحة');

    const { data, error } = await apiInterceptor(
      supabase
        .from('subscription_plans')
        .select('*')
        .eq('duration_months', planInfo.months)
        .limit(1)
        .maybeSingle()
    );

    if (error) {
      logger.error("Error fetching plan from DB, using fallback.", error);
    }

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

  async submitPayment(userId, planId, transactionId, userData, selectedPlan) {
    const { data: activeSubs } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
    );

    if (activeSubs && activeSubs.length > 0) {
      await apiInterceptor(
        supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', userId)
          .eq('status', 'active')
      );
    }

    await apiInterceptor(
      supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending')
    );

    const { error: userCheckError } = await apiInterceptor(
      supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
    );

    if (userCheckError) {
      await apiInterceptor(supabase.from('users').upsert({
        id: userId,
        email: userData.email || 'user@example.com',
        full_name: userData.name || 'مستخدم'
      }));
    }

    const { error: insertError } = await apiInterceptor(
      supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          plan_name: selectedPlan.name,
          price: selectedPlan.price,
          transaction_id: transactionId,
          status: 'pending'
        })
    );

    return { error: insertError };
  }
};

export default subscriptionService;
