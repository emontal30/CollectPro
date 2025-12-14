/**
 * EXAMPLE: Token Interceptor Usage Patterns
 * =====================================================
 * أمثلة عملية لاستخدام نظام الاعتراض والإعادة التلقائية
 */

// ============================================
// 1. استخدام في Services
// ============================================

// في subscriptionService.js:
import { supabaseQueryWithRetry } from '@/services/apiInterceptor.js'
import { authService } from './authService.js'

export const subscriptionServiceExample = {
  // ✅ استعلام آمن مع Interceptor
  async getAllSubscriptions() {
    return supabaseQueryWithRetry(
      authService.supabase
        .from('subscriptions')
        .select('*')
    )
  },

  // ✅ استعلام واحد
  async getSubscriptionById(id) {
    return supabaseQueryWithRetry(
      authService.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()
    )
  }
}

// ============================================
// 2. استخدام في Stores
// ============================================

// في paymentStore.js:
import api, { withTokenRetry } from '@/services/api'

export const paymentStoreExample = {
  async fetchPayments() {
    try {
      const { data, error } = await withTokenRetry(() =>
        api.supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
      )

      if (error) throw error
      return data
    } catch (err) {
      console.error('Payment fetch failed:', err)
      throw err
    }
  }
}

// ============================================
// 3. استخدام مع دالة مخصصة
// ============================================

// في adminStore.js:
import { ensureTokenBeforeOperation, withTokenRetry } from '@/services/api'

export const adminStoreExample = {
  async performAdminAction(userId) {
    // التحقق من التوكن قبل العملية الحساسة
    await ensureTokenBeforeOperation()

    // ثم نفّذ العملية
    return withTokenRetry(() =>
      api.supabase
        .from('admin_logs')
        .insert({ admin_id: currentUserId, action: 'delete_user', target_id: userId })
    )
  }
}

// ============================================
// 4. معالجة الأخطاء المتقدمة
// ============================================

import { withTokenRetry } from '@/services/api'

export async function handleComplexOperation() {
  try {
    const result = await withTokenRetry(async () => {
      // عملية معقدة قد تحتاج إعادة محاولة
      const { data: user } = await api.supabase
        .from('users')
        .select('subscription_id')
        .eq('id', userId)
        .single()

      if (!user?.subscription_id) {
        throw new Error('No subscription found')
      }

      return api.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', user.subscription_id)
        .single()
    })

    if (result.error) {
      console.error('Operation failed:', result.error)
      return null
    }

    return result.data
  } catch (err) {
    console.error('Critical error:', err)
    // ربما إعادة توجيه للـ login؟
    throw err
  }
}

// ============================================
// 5. استخدام مع Vue Components
// ============================================

// في component:
import { defineComponent } from 'vue'
import { withTokenRetry } from '@/services/api'

export default defineComponent({
  async mounted() {
    try {
      const { data: users } = await withTokenRetry(() =>
        this.$supabase
          .from('users')
          .select('id, email')
      )
      this.users = users
    } catch (err) {
      this.error = 'Failed to load users'
      console.error(err)
    }
  }
})

// ============================================
// 6. استخدام في Router Guards
// ============================================

// في router/index.js:
import { ensureTokenBeforeOperation } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth) {
    try {
      // تأكد من التوكن قبل الدخول للصفحة
      await ensureTokenBeforeOperation()
      next()
    } catch (err) {
      // التوكن غير صالح — اذهب للـ login
      next('/login')
    }
  } else {
    next()
  }
})

// ============================================
// 7. Batch Operations مع Interceptor
// ============================================

export async function batchUpdateUsers(updates) {
  return withTokenRetry(async () => {
    // تحديث متعدد
    const promises = updates.map(update =>
      api.supabase
        .from('users')
        .update(update)
        .eq('id', update.id)
    )

    const results = await Promise.all(promises)
    
    // تحقق من الأخطاء
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      throw new Error(`${errors.length} updates failed`)
    }

    return results
  })
}

// ============================================
// 8. Monitoring & Logging
// ============================================

import { getTotalRetryAttempts, resetRetryAttempts } from '@/services/api'

export function logRetryStats() {
  const attempts = getTotalRetryAttempts()
  console.log(`📊 Total retry attempts this session: ${attempts}`)
  
  if (attempts > 10) {
    console.warn('⚠️ عدد محاولات إعادة التوكن مرتفع — قد يكون هناك مشكلة')
  }
}

// في Application Startup:
window.addEventListener('beforeunload', () => {
  logRetryStats()
  resetRetryAttempts()
})

// ============================================
// 9. Configuration Tips
// ============================================

/*
 * إذا كنت تريد تخصيص سلوك Interceptor:
 * 
 * 1. عدّل MAX_REFRESH_ATTEMPTS في apiInterceptor.js
 * 2. غيّر INITIAL_DELAY للتحكم بالتأخير
 * 3. أضف logging مخصص في withTokenRetry
 * 
 * مثال:
 */

export async function customWithTokenRetry(apiCall, maxRetries = 1) {
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      const result = await apiCall()
      
      if (result?.error?.status === 401) {
        attempts++
        console.log(`🔄 Attempt ${attempts} — refreshing token...`)
        
        // محاولة تحديث التوكن
        const refreshed = await refreshTokenWithRetry()
        if (!refreshed) break
      } else {
        return result
      }
    } catch (err) {
      console.error('Error in API call:', err)
      throw err
    }
  }
}

// ============================================
// 10. Best Practices
// ============================================

/*
 * ✅ DO:
 * - استخدم withTokenRetry في العمليات الحساسة
 * - استخدم ensureTokenBeforeOperation قبل العمليات المهمة
 * - راقب retry attempts في Production
 * - اختبر مع انتهاء التوكن فعلياً
 * 
 * ❌ DON'T:
 * - لا تستخدم Interceptor للعمليات البسيطة جداً
 * - لا تحاول إعادة المحاولة أكثر من مرة واحدة (حلقات!)
 * - لا تتجاهل 401 errors بدون محاولة
 * - لا تعتمد على Interceptor فقط (أضف error handling)
 */
