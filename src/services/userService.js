import { apiInterceptor } from './apiInterceptor.js';
import { authService } from './authService.js';
import logger from '@/utils/logger.js';

export const userService = {
  async getUser() {
    const { data, error } = await authService.supabase.auth.getUser();
    return { user: data.user, error };
  },

  async updateUser(updates) {
    const { data, error } = await authService.supabase.auth.updateUser(updates);
    return { data, error };
  },

  /**
   * مزامنة بيانات المستخدم مع جدول public.users
   * وإرجاع بيانات الملف الشخصي (بما في ذلك الدور)
   */
  async syncUserProfile(userData) {
    // إذا لم يكن هناك إنترنت، لا تحاول المزامنة ولا تعتبرها خطأ قاتلاً
    if (!navigator.onLine) {
      return { profile: null, error: null, isOffline: true };
    }

    try {
      // 1. محاولة جلب المستخدم الحالي
      let { data: profile, error } = await apiInterceptor(
        authService.supabase
          .from('users')
          .select('*')
          .eq('id', userData.id)
          .maybeSingle()
      );

      // إذا فشل الاتصال (Failed to fetch)
      if (error && (error.status === 'network_error' || error.message?.includes('fetch'))) {
        return { profile: null, error: null, isOffline: true };
      }

      // 2. إذا لم يكن موجوداً، قم بإنشائه
      if (!profile && !error) {
        const fullName = userData.user_metadata?.full_name || userData.email?.split('@')[0] || 'مستخدم جديد';
        const providers = userData.app_metadata?.providers || [];
        
        const { data: newProfile, error: insertError } = await apiInterceptor(
          authService.supabase.from('users').insert({
            id: userData.id,
            full_name: fullName,
            email: userData.email,
            provider: providers,
            role: 'user' // القيمة الافتراضية
          }).select('*').single()
        );

        if (insertError) throw insertError;
        profile = newProfile;
        logger.info('🆕 New user profile created for:', userData.email);
      }

      return { profile, error: error };
    } catch (err) {
      // صمت أخطاء الشبكة المتوقعة
      if (err.message?.includes('fetch')) {
         return { profile: null, error: null, isOffline: true };
      }
      logger.error('❌ syncUserProfile Error:', err);
      return { profile: null, error: err };
    }
  }
};

export default userService;
