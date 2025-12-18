import { apiInterceptor } from './api.js';
import { authService } from './authService.js';
import logger from '@/utils/logger.js';

export const archiveService = {
  /**
   * جلب التواريخ المتوفرة فقط (خفيف جداً وسريع)
   */
  async getAvailableDates(userId) {
    try {
      const { data, error } = await apiInterceptor(
        authService.supabase
          .from('daily_archives')
          .select('archive_date')
          .eq('user_id', userId)
          .order('archive_date', { ascending: false })
      );

      if (error) throw error;
      
      // إرجاع مصفوفة تواريخ فقط
      return { dates: data.map(item => item.archive_date), error: null };
    } catch (err) {
      logger.error('❌ Error fetching archive dates:', err);
      return { dates: [], error: err };
    }
  },

  /**
   * جلب بيانات يوم كامل (طلب واحد يعيد كل الصفوف)
   */
  async getArchiveByDate(userId, date) {
    try {
      const { data, error } = await apiInterceptor(
        authService.supabase
          .from('daily_archives')
          .select('data') // حقل JSONB
          .eq('user_id', userId)
          .eq('archive_date', date)
          .single()
      );

      if (error) throw error;
      
      // إرجاع البيانات مفكوكة من صيغة JSON
      return { data: data?.data || [], error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  /**
   * حفظ أرشيف اليوم (Upsert: إنشاء أو تحديث) + تنظيف القديم
   */
  async saveDailyArchive(userId, date, rows, totals) {
    try {
      // 1. الحفظ (مضغوط في سجل واحد)
      const { error } = await apiInterceptor(
        authService.supabase
          .from('daily_archives')
          .upsert({
            user_id: userId,
            archive_date: date,
            data: rows, // تخزين المصفوفة كاملة كـ JSON
            total_amount: totals?.net || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, archive_date' })
      );

      if (error) throw error;

      // 2. التنظيف التلقائي (أكثر من 31 يوم) - يتم في الخلفية
      this.cleanupOldArchives(userId).catch(e => logger.warn('Cleanup warning:', e));

      return { success: true };
    } catch (err) {
      logger.error('❌ Error saving archive:', err);
      return { error: err };
    }
  },

  /**
   * حذف السجلات القديمة (Retain only last 31 days)
   */
  async cleanupOldArchives(userId) {
    const retentionLimit = 31; // يوم
    
    // حساب التاريخ الحدي
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionLimit);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    await apiInterceptor(
      authService.supabase
        .from('daily_archives')
        .delete()
        .eq('user_id', userId)
        .lt('archive_date', cutoffStr) // Less than cutoff
    );
  },

  /**
   * حذف يوم محدد يدوياً
   */
  async deleteArchiveByDate(userId, date) {
    const { error } = await apiInterceptor(
      authService.supabase
        .from('daily_archives')
        .delete()
        .eq('user_id', userId)
        .eq('archive_date', date)
    );

    return { error };
  }
};

export default archiveService;