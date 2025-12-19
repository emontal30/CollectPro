import { apiInterceptor } from './api.js';
import { authService } from './authService.js';
import logger from '@/utils/logger.js';

export const paymentService = {
  async getPlanDetails(planId) {
    const durationMap = {
      'monthly': { months: 1, period: 'شهريًا' },
      'quarterly': { months: 3, period: '3 شهور' },
      'yearly': { months: 12, period: 'سنويًا' }
    };

    const planInfo = durationMap[planId];
    if (!planInfo) throw new Error('خطة غير صالحة');

    const { data, error } = await apiInterceptor(
      authService.supabase
        .from('subscription_plans')
        .select('*')
        .eq('duration_months', planInfo.months)
        .limit(1)
        .maybeSingle()
    );

    if (error) {
      // Log the error but proceed with fallback
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
    // Check for active subscriptions
    const { data: activeSubs } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
    );

    if (activeSubs && activeSubs.length > 0) {
      // Cancel previous subscriptions
      await apiInterceptor(
        authService.supabase
          .from('subscriptions')
          .update({ status: 'cancelled', end_date: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('status', 'active')
      );
    }

    // Clean up previous pending requests
    await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending')
    );

    // Ensure user exists in users table
    const { error: userCheckError } = await apiInterceptor(
      authService.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
    );

    if (userCheckError) {
      // Add user if not exists
      await apiInterceptor(authService.supabase.from('users').upsert({
        id: userId,
        email: userData.email || 'user@example.com',
        full_name: userData.name || 'مستخدم'
      }));
    }

    // Insert new subscription
    const { error: insertError } = await apiInterceptor(
      authService.supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          plan_name: selectedPlan.name,
          plan_period: selectedPlan.period,
          price: selectedPlan.price,
          transaction_id: transactionId,
          status: 'pending'
        })
    );

    return { error: insertError };
  }
};

export default paymentService;
