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
   * حفظ أو تحديث أرشيف اليوم (Upsert) - مع حماية من Deadlock
   */
  async saveDailyArchive(userId, dateStr, harvestData) {
    const queueKey = `${userId}-${dateStr}`;

    // Initialize queue map if not exists
    if (!this._saveQueue) {
      this._saveQueue = new Map();
    }

    // Wait for existing operation on same user-date
    if (this._saveQueue.has(queueKey)) {
      logger.info(`⏳ Waiting for existing save operation: ${dateStr}`);
      await this._saveQueue.get(queueKey);
    }

    // Create new promise for this operation
    const savePromise = this._saveDailyArchiveInternal(userId, dateStr, harvestData);
    this._saveQueue.set(queueKey, savePromise);

    try {
      const result = await savePromise;
      return result;
    } finally {
      // Clean up queue
      this._saveQueue.delete(queueKey);
    }
  },

  /**
   * Internal save implementation using safe RPC function
   */
  async _saveDailyArchiveInternal(userId, dateStr, harvestData) {
    try {
      const { data, error } = await apiInterceptor(
        withTimeout(
          supabase.rpc('upsert_daily_archive_safe', {
            p_user_id: userId,
            p_archive_date: dateStr,
            p_data: harvestData,
            p_updated_at: new Date().toISOString()
          }),
          60000, // 60s timeout
          'Archive save timed out'
        )
      );

      // Check RPC response
      if (error) throw error;

      // Check if RPC returned error in response
      if (data && data.success === false) {
        throw new Error(data.error || 'Unknown database error');
      }

      logger.info(`☁️ تم رفع أرشيف ${dateStr} بنجاح`);
      return { success: true, error: null };
    } catch (err) {
      // Check if this is a deadlock error
      if (err.code === '40P01' || (err.message && err.message.includes('deadlock'))) {
        logger.error('⚠️ Deadlock detected, will retry...', err);
        return { success: false, error: err, shouldRetry: true };
      }

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