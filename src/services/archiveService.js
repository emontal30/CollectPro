import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';

export const archiveService = {
  /**
   * جلب قائمة التواريخ المتوفرة في السحابة
   * يجلب فقط عمود التاريخ ليكون الطلب خفيفاً جداً
   */
  async getAvailableDates(userId) {
    try {
      const { data, error } = await supabase
        .from('daily_archives')
        .select('archive_date')
        .eq('user_id', userId)
        .order('archive_date', { ascending: false });

      if (error) throw error;

      // إرجاع مصفوفة من التواريخ النصية (Strings)
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
   * يقوم بفك ضغط JSONB وإرجاع المصفوفة الأصلية
   */
  async getArchiveByDate(userId, dateStr) {
    try {
      const { data, error } = await supabase
        .from('daily_archives')
        .select('data') // هذا العمود يحتوي على JSON المضغوط
        .eq('user_id', userId)
        .eq('archive_date', dateStr)
        .single();

      if (error) throw error;

      // إرجاع البيانات الموجودة داخل الحقل data
      return { 
        data: data?.data || [], 
        error: null 
      };
    } catch (err) {
      logger.error(`❌ فشل جلب بيانات الأرشيف للتاريخ ${dateStr}:`, err);
      return { data: null, error: err };
    }
  },

  /**
   * حفظ أو تحديث أرشيف اليوم (Upsert)
   * يتم تخزين البيانات كاملة في حقل واحد (data) لتقليل عدد الصفوف
   */
  async saveDailyArchive(userId, dateStr, harvestData) {
    try {
      const payload = {
        user_id: userId,
        archive_date: dateStr,
        data: harvestData, // المصفوفة كاملة كـ JSON
        updated_at: new Date().toISOString()
      };

      // استخدام Upsert: إذا وجد التاريخ يحدثه، وإذا لم يوجد ينشئه
      const { error } = await supabase
        .from('daily_archives')
        .upsert(payload, { onConflict: 'user_id, archive_date' });

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
      const { error } = await supabase
        .from('daily_archives')
        .delete()
        .eq('user_id', userId)
        .eq('archive_date', dateStr);

      if (error) throw error;
      
      return { success: true, error: null };
    } catch (err) {
      logger.error('❌ خطأ أثناء حذف الأرشيف:', err);
      return { success: false, error: err };
    }
  }
};

export default archiveService;