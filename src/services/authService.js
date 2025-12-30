import { supabase } from '@/supabase.js'

/**
 * Authentication Service
 * Handles direct interactions with Supabase Auth
 */
export const authService = {
  /**
   * تسجيل الدخول باستخدام جوجل
   */
  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        }
      }
    })
  },

  /**
   * تسجيل الخروج
   */
  async signOut() {
    return await supabase.auth.signOut()
  },

  /**
   * الاستماع لتغيرات حالة المصادقة
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },

  /**
   * الحصول على بيانات المستخدم الحالي من الجلسة (أكثر أماناً)
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    return { user: data?.user, error }
  },

  /**
   * الحصول على الجلسة الحالية
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session, error }
  },

  /**
   * التحقق مما إذا كان المستخدم مسجلاً للدخول
   */
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  }
}

export default authService
