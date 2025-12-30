import { apiInterceptor } from './apiInterceptor.js';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';

/**
 * General Service
 * Handles miscellaneous system-wide operations
 */
export const generalService = {
  /**
   * تسجيل زيارة يومية جديدة أو زيادة العداد
   * يستخدم RPC (Stored Procedure) إذا كان متاحاً لضمان الدقة، 
   * أو منطق Upsert كبديل.
   */
  async incrementDailyVisits() {
    const today = new Date().toISOString().split('T')[0];

    try {
      // محاولة الزيادة باستخدام منطق upsert بسيط
      // ملاحظة: في بيئة الإنتاج يفضل استخدام Postgres Function (RPC) لزيادة العداد بشكل ذري (Atomic)
      const { data, error } = await apiInterceptor(
        supabase
          .from('daily_visits')
          .select('count')
          .eq('date', today)
          .maybeSingle()
      );

      if (error) throw error;

      if (!data) {
        // إذا لم يكن موجوداً، قم بإنشائه
        return await apiInterceptor(
          supabase
            .from('daily_visits')
            .insert({ date: today, count: 1 })
        );
      } else {
        // إذا كان موجوداً، قم بزيادته
        return await apiInterceptor(
          supabase
            .from('daily_visits')
            .update({ count: data.count + 1 })
            .eq('date', today)
        );
      }
    } catch (err) {
      logger.warn('⚠️ Could not increment daily visits:', err.message);
      return { error: err };
    }
  }
};

export default generalService;
