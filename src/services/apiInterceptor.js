/**
 * API Interceptor - Token Refresh & Retry Logic
 * =====================================================
 * يعترض على جميع استدعاءات API ويتعامل مع أخطاء 401
 * (Token Expired) بمحاولة تحديث التوكن وإعادة الطلب مرة واحدة
 * 
 * يجب استخدامه قبل أي استدعاء API مهم
 */

import { supabase } from '@/supabase.js'
import { refreshTokenWithRetry } from './tokenRefreshManager.js'
import logger from '@/utils/logger.js'

/**
 * حالة المحاولة الإعادة - لمنع حلقات لا نهائية
 * نتجنب الإعادة الثانية إذا فشل التحديث في المرة الأولى
 */
let isRetrying = false

/**
 * تغليف استدعاء API مع اعتراض الأخطاء
 * @param {Function} apiCall - دالة الاستدعاء الأصلي
 * @returns {Promise} نتيجة الاستدعاء
 */
export async function withTokenRetry(apiCall) {
  try {
    // محاولة الاستدعاء الأول
    const result = await apiCall()

    // التحقق من الخطأ في النتيجة
    if (result?.error?.status === 401) {
      logger.warn('⚠️ استقبلنا خطأ 401 — سيتم محاولة تحديث التوكن...')
      
      // منع حلقات الإعادة اللا نهائية
      if (isRetrying) {
        logger.error('🚨 حلقة إعادة مكتشفة — سيتم التوقف')
        return result
      }

      // محاولة تحديث التوكن
      isRetrying = true
      // Track retry attempts for diagnostics
      totalRetryAttempts += 1
      const refreshed = await refreshTokenWithRetry()
      isRetrying = false

      if (refreshed) {
        logger.info('✅ تم تحديث التوكن بنجاح — إعادة محاولة الطلب الأصلي...')
        // محاولة الاستدعاء مرة أخرى
        return await apiCall()
      } else {
        logger.error('❌ فشل تحديث التوكن — سيتم إرجاع الخطأ الأصلي')
        return result
      }
    }

    return result
  } catch (err) {
    // في حالة الخطأ غير المتوقع
    logger.error('❌ خطأ غير متوقع في API Interceptor:', err)
    throw err
  }
}

/**
 * بديل محسّن للعمليات الروتينية (Select/Read)
 * يعيد محاولة تلقائياً على 401
 */
export async function supabaseQueryWithRetry(query) {
  return withTokenRetry(() => query)
}

/**
 * بديل محسّن للعمليات المعقدة (Insert/Update/Delete/Call)
 * يعيد محاولة تلقائياً على 401 ثم يعيد الخطأ الأصلي إذا فشل
 */
export async function supabaseMutationWithRetry(mutation) {
  return withTokenRetry(() => mutation)
}

/**
 * تحديث سريع: التحقق من التوكن قبل عملية حساسة
 * يضمن وجود توكن صحيح قبل بدء العملية
 */
export async function ensureTokenBeforeOperation() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.access_token) {
    logger.warn('⚠️ التوكن مفقود أو غير صحيح — سيتم محاولة التحديث...')
    const refreshed = await refreshTokenWithRetry()
    
    if (!refreshed) {
      throw new Error('فشل التحقق من الجلسة - يرجى تسجيل الدخول مرة أخرى')
    }
  }
  
  return true
}

/**
 * مثال على الاستخدام في services:
 * 
 * // BEFORE:
 * const { data, error } = await supabase.from('users').select('*').single()
 * 
 * // AFTER:
 * const { data, error } = await supabaseQueryWithRetry(
 *   supabase.from('users').select('*').single()
 * )
 * 
 * // أو مع withTokenRetry المخصص:
 * const { data, error } = await withTokenRetry(() =>
 *   supabase.from('users').select('*').single()
 * )
 */

/**
 * متغير حالة لتتبع عدد محاولات التحديث الإجمالية
 * (للتصحيح والتحليل)
 */
let totalRetryAttempts = 0

export function getTotalRetryAttempts() {
  return totalRetryAttempts
}

export function resetRetryAttempts() {
  totalRetryAttempts = 0
}
