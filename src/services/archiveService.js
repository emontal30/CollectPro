import { authService } from './authService.js'

export const archiveService = {
  async getAvailableDates(userId) {
    const { data, error } = await authService.supabase
      .from('archive_data')
      .select('archive_date')
      .eq('user_id', userId)
      .order('archive_date', { ascending: true })

    return { dates: data?.map(item => item.archive_date) || [], error }
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
