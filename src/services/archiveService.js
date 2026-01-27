import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';
import { apiInterceptor } from './apiInterceptor.js';
import { withTimeout } from '@/utils/promiseUtils';

export const archiveService = {
  /**
   * جلب قائمة التواريخ المتوفرة في السحابة
   */
  async getAvailableDates(userId) {
    try {
      const { data, error } = await apiInterceptor(
        withTimeout(
          supabase
            .from('daily_archives')
            .select('archive_date')
            .eq('user_id', userId)
            .order('archive_date', { ascending: false }),
          15000,
          'Archive dates fetch timed out'
        )
      );

      if (error) {
        if (error.silent) return { dates: [], error: null };
        throw error;
      }

      return {
        dates: data?.map(item => item.archive_date) || [],
        error: null
      };
    } catch (err) {
      logger.error('❌ فشل جلب تواريخ الأرشيف من السحابة:', err);
      return { dates: [], error: err };
    }
  },

  /**
   * جلب تفاصيل أرشيف يوم محدد
   */
  async getArchiveByDate(userId, dateStr) {
    try {
      const { data, error } = await apiInterceptor(
        withTimeout(
          supabase
            .from('daily_archives')
            .select('data')
            .eq('user_id', userId)
            .eq('archive_date', dateStr)
            .maybeSingle(),
          15000,
          'Archive data fetch timed out'
        )
      );

      if (error) {
        if (error.silent) return { data: null, error: null };
        throw error;
      }

      return {
        data: data?.data || [],
        error: null
      };
    } catch (err) {
      // Catch specific errors that slipped through
      if (err.code === 'PGRST116' || err.status === 406) {
        return { data: null, error: null };
      }
      logger.error(`❌ فشل جلب بيانات الأرشيف للتاريخ ${dateStr}:`, err);
      return { data: null, error: err };
    }
  },

  /**
   * حفظ أو تحديث أرشيف اليوم (Upsert)
   */
  async saveDailyArchive(userId, dateStr, harvestData) {
    try {
      const payload = {
        user_id: userId,
        archive_date: dateStr,
        data: harvestData,
        updated_at: new Date().toISOString()
      };

      const { error } = await apiInterceptor(
        withTimeout(
          supabase
            .from('daily_archives')
            .upsert(payload, { onConflict: 'user_id, archive_date' }),
          20000, // 20s for save (might be larger payload)
          'Archive save timed out'
        )
      );

      if (error) throw error;

      logger.info(`☁️ تم رفع أرشيف ${dateStr} بنجاح`);
      return { success: true, error: null };
    } catch (err) {
      logger.error('❌ خطأ أثناء رفع الأرشيف:', err);
      return { success: false, error: err };
    }
  },

  /**
   * حذف أرشيف يوم محدد يدوياً
   */
  async deleteArchiveByDate(userId, dateStr) {
    try {
      const { error } = await apiInterceptor(
        withTimeout(
          supabase
            .from('daily_archives')
            .delete()
            .eq('user_id', userId)
            .eq('archive_date', dateStr),
          15000,
          'Archive delete timed out'
        )
      );

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      logger.error('❌ خطأ أثناء حذف الأرشيف:', err);
      return { success: false, error: err };
    }
  },

  /**
   * [ADMIN] جلب قائمة التواريخ باستخدام RPC لتجاوز RLS
   */
  async getAvailableDatesAdmin(userId) {
    try {
      const { data, error } = await apiInterceptor(
        withTimeout(
          supabase.rpc('get_user_archive_dates_admin', { p_user_id: userId }),
          15000,
          'Admin archive dates fetch timed out'
        )
      );

      if (error) throw error;

      return {
        dates: (data || []).map(item => item.archive_date),
        error: null
      };
    } catch (err) {
      logger.error('❌ Admin Archive RPC Failed:', err);
      // Fallback to standard method if RPC doesn't exist yet
      return this.getAvailableDates(userId);
    }
  },

  /**
   * [ADMIN] جلب بيانات الأرشيف باستخدام RPC لتجاوز RLS
   */
  async getArchiveByDateAdmin(userId, dateStr) {
    try {
      const { data, error } = await apiInterceptor(
        withTimeout(
          supabase.rpc('get_user_archive_data_admin', { p_user_id: userId, p_date: dateStr }),
          15000,
          'Admin archive data fetch timed out'
        )
      );

      if (error) throw error;

      return {
        data: data || [],
        error: null
      };
    } catch (err) {
      logger.error('❌ Admin Archive Data RPC Failed:', err);
      // Fallback to standard method if RPC doesn't exist yet
      return this.getArchiveByDate(userId, dateStr);
    }
  }
};

export default archiveService;