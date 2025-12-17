/**
 * API Interceptor v2 - Unrecoverable Error Handler
 * =====================================================
 * This simplified interceptor wraps a Supabase query. It no longer attempts
 * to refresh tokens, relying instead on the Supabase client's built-in
 * session management.
 *
 * Its sole responsibility is to catch critical 401 (Unauthorized) errors,
 * which signify that the session is truly invalid and Supabase's automatic
 * refresh has failed. When this occurs, it triggers a global logout
 * to ensure the user is redirected to the login page and the app's
 * state is cleanly reset.
 */
import { useAuthStore } from '@/stores/auth';
import logger from '@/utils/logger.js';

/**
 * Wraps a Supabase API call and handles unrecoverable 401 errors.
 * @param {Promise} apiCall - A Supabase query promise, e.g., supabase.from(...).select(...).
 * @returns {Promise<Object>} The result from the Supabase query { data, error }.
 */
export async function apiInterceptor(apiCall) {
  const result = await apiCall;

  // Check for a 401 Unauthorized error.
  // We interpret this as a definitive session failure.
  if (result?.error?.status === 401) {
    logger.error('🚨 Interceptor caught a 401 Unauthorized error. Session is invalid. Forcing logout.');

    // Use a dynamic import for the store to avoid circular dependency issues
    // at the module level, as stores often import services that use this interceptor.
    const authStore = useAuthStore();
    
    // Trigger a global logout. The auth store will handle state cleanup
    // and redirection to the login page.
    await authStore.logout();
    
    // It's crucial to return the original error so the calling function
    // knows the request failed.
    return result;
  }

  // For any other case (success or other errors), return the result directly.
  return result;
}
