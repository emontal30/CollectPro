import { authService } from './authService.js'

export const archiveService = {
  async getAvailableDates(userId) {
    try {
      console.log('🔍 Fetching available archive dates for user:', userId);
      
      const { data, error } = await authService.supabase
        .from('archive_data')
        .select('archive_date')
        .eq('user_id', userId)
        .order('archive_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching archive dates:', error);
        return { dates: [], error };
      }

      const dates = [...new Set(data?.map(item => item.archive_date) || [])];
      console.log('✅ Archive dates fetched:', dates);
      return { dates, error };
    } catch (err) {
      console.error('❌ Exception in getAvailableDates:', err);
      return { dates: [], error: err };
    }
  },

  async getArchiveByDate(userId, date) {
    const { data, error } = await authService.supabase
      .from('archive_data')
      .select('*')
      .eq('user_id', userId)
      .eq('archive_date', date)

    return { data, error }
  },

  async searchArchive(userId, query) {
    const { data, error } = await authService.supabase
      .from('archive_data')
      .select('*')
      .eq('user_id', userId)
      .or(`shop.ilike.%${query}%,code.ilike.%${query}%`)
      .order('archive_date', { ascending: false })

    return { data, error }
  },

  async deleteArchiveByDate(userId, date) {
    const { error } = await authService.supabase
      .from('archive_data')
      .delete()
      .eq('user_id', userId)
      .eq('archive_date', date)

    return { error }
  }
}

export default archiveService
