import { useAuthStore } from '@/stores/auth';
import logger from '@/utils/logger.js';

/**
 * Wraps a Supabase API call and handles critical errors like 401 (Unauthorized) 
 * or network connection failures.
 */
export async function apiInterceptor(apiCall) {
  // الحماية المبكرة: إذا كان الجهاز أوفلاين صراحةً، لا تحاول حتى إرسال الطلب
  if (!navigator.onLine) {
    return { 
      data: null, 
      error: { 
        message: 'لا يوجد اتصال بالإنترنت (وضع الأوفلاين نشط)', 
        status: 'offline',
        silent: true 
      } 
    };
  }

  try {
    const result = await apiCall;

    // 1. Handle 401 Unauthorized (Session expired/invalid)
    if (result?.error?.status === 401) {
      logger.error('🚨 401 Unauthorized: Session is invalid. Forcing logout.');
      const authStore = useAuthStore();
      await authStore.logout();
      return result;
    }

    // 2. Handle cases where Supabase returns an error object without status
    if (result?.error) {
      // تجاهل تحذيرات الشبكة العادية في الكونسول
      const isNetworkError = result.error.message === 'Failed to fetch' || 
                             result.error.message?.includes('Network Error') ||
                             result.error.status === 'ERR_NAME_NOT_RESOLVED';

      if (!isNetworkError) {
        logger.warn('⚠️ Supabase Error:', result.error.message);
      } else {
        return { 
          data: null, 
          error: { 
            message: 'فشل الاتصال بالخادم (مشكلة شبكة)', 
            status: 'network_error',
            silent: true
          } 
        };
      }
    }

    return result;
  } catch (err) {
    // 3. Handle Network/Fetch Errors (e.g., "Failed to fetch")
    const isNetworkErr = err.message?.includes('fetch') || 
                         err.name === 'TypeError' || 
                         err.message?.includes('Network');
                         
    if (isNetworkErr) {
      logger.info('ℹ️ Network info: Server unreachable, using local mode.');
      return { 
        data: null, 
        error: { 
          message: 'فشل الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت.', 
          status: 'network_error',
          silent: true
        } 
      };
    }

    logger.error('🔥 Unexpected API Interceptor Error:', err);
    return { data: null, error: err };
  }
}
