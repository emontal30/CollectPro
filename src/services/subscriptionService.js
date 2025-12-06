import { authService } from './authService.js'

export const subscriptionService = {
  async getPlans() {
    const { data, error } = await authService.supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true })

    return { plans: data, error }
  },

  async selectPlan(userId, planId) {
    const { data, error } = await authService.supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    return { data, error }
  },

  async getSubscription(userId) {
    const { data, error } = await authService.supabase
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

  async getSubscriptionHistory(userId) {
    const { data, error } = await authService.supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (name, name_ar)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { history: data, error }
  },

  async updateSubscriptionStatus(subscriptionId, status) {
    const { data, error } = await authService.supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    return { data, error }
  }
}

export default subscriptionService
