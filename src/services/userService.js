import { authService } from './authService.js'

export const userService = {
  async getUser() {
    const { data, error } = await authService.supabase.auth.getUser()
    return { user: data.user, error }
  },

  async updateUser(updates) {
    const { data, error } = await authService.supabase.auth.updateUser(updates)
    return { data, error }
  },

  async syncUserProfile(userData) {
    try {
      const { error } = await authService.supabase
        .from('users')
        .select('id')
        .eq('id', userData.id)
        .single();

      // If user doesn't exist, add them
      if (error && error.code === 'PGRST116') {
        const fullName = userData.user_metadata?.full_name || userData.email;
        const providers = userData.app_metadata?.providers || [];
        const { error: insertError } = await authService.supabase.from('users').insert({
          id: userData.id,
          full_name: fullName,
          email: userData.email,
          provider: providers,
          password_hash: '' // Required field in your old database
        });
        return { error: insertError };
      }
      return { error };
    } catch (err) {
      return { error: err };
    }
  }
}

export default userService
