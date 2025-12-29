import { apiInterceptor } from './apiInterceptor.js';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';

export const userService = {
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  async updateUser(updates) {
    const { data, error } = await supabase.auth.updateUser(updates);
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
      // 1. محاولة جلب المستخدم الحالي من جدول users
      let { data: profile, error } = await apiInterceptor(
        supabase
          .from('users')
          .select('*')
          .eq('id', userData.id)
          .maybeSingle()
      );

      // إذا فشل الاتصال (Failed to fetch)
      if (error && (error.status === 'network_error' || error.message?.includes('fetch'))) {
        return { profile: null, error: null, isOffline: true };
      }

      // استخراج البيانات من userData القادمة من الـ Auth
      const meta = userData.user_metadata || {};
      // محاولة الحصول على الاسم من مصادر متعددة
      const fullName = meta.full_name || meta.name || meta.user_name || userData.email?.split('@')[0] || 'مستخدم';
      const email = userData.email;
      const providers = userData.app_metadata?.providers || [];

      // 2. إذا لم يكن موجوداً، قم بإنشائه
      if (!profile && !error) {
        
        const { data: newProfile, error: insertError } = await apiInterceptor(
          supabase.from('users').insert({
            id: userData.id,
            full_name: fullName,
            email: email,
            provider: providers,
            role: 'user' // القيمة الافتراضية
          }).select('*').single()
        );

        if (insertError) throw insertError;
        profile = newProfile;
        logger.info('🆕 New user profile created for:', email);
      }
      // 3. إذا كان موجوداً، تحقق مما إذا كان يحتاج لتحديث (البيانات الناقصة)
      else if (profile) {
        const updates = {};
        
        // تحديث الاسم إذا كان مفقوداً أو غير دقيق في القاعدة
        if (!profile.full_name || profile.full_name === 'مستخدم' || profile.full_name.trim() === '') {
            if (fullName && fullName !== 'مستخدم') {
                updates.full_name = fullName;
            }
        }
        
        // تحديث البريد الإلكتروني إذا كان مفقوداً
        if (!profile.email) {
            updates.email = email;
        }

        // تحديث المزود
        if ((!profile.provider || profile.provider.length === 0) && providers.length > 0) {
            updates.provider = providers;
        }

        // تنفيذ التحديث إذا وجدت تغييرات
        if (Object.keys(updates).length > 0) {
            logger.info('♻️ Updating user profile with missing data:', updates);
            const { data: updatedProfile, error: updateError } = await apiInterceptor(
              supabase
                .from('users')
                .update(updates)
                .eq('id', userData.id)
                .select('*')
                .single()
            );
            
            if (!updateError && updatedProfile) {
                profile = updatedProfile;
            }
        }
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
