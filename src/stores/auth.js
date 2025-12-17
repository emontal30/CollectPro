import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import logger from '@/utils/logger.js'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const isInitializing = ref(false)
  let initPromise = null
  const router = useRouter()
  const authWarning = ref('')

  // نظام الإشعارات الموحد
  const { addNotification } = useNotifications()

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)

  // --- Private Helpers ---

  /**
   * إعداد جلسة المستخدم ومزامنة البيانات
   */
  async function setUserSession(session) {
    if (session?.user) {
      logger.debug('✅ Session active for:', session.user.email)
      user.value = session.user
      
      // مزامنة الملف الشخصي في الخلفية
      syncUserProfile(session.user).catch(err => logger.warn('Profile sync warning:', err))

      // تحميل بيانات الاشتراك مسبقاً للأداء
      preloadSubscriptionData(session.user.id)
    } else {
      logger.debug('❌ No active session found')
      user.value = null
    }
  }

  /**
   * تحميل بيانات الاشتراك وتخزينها مؤقتاً (Cache)
   */
  async function preloadSubscriptionData(userId) {
    if (!userId) return

    try {
      logger.debug('📋 Preloading subscription data...')
      const [subscriptionResult, historyResult] = await Promise.all([
        api.subscriptions.getSubscription(userId),
        api.subscriptions.getSubscriptionHistory(userId)
      ])

      const cacheData = {
        subscription: subscriptionResult.subscription,
        history: historyResult.history || [],
        user: user.value,
        timestamp: Date.now()
      }

      sessionStorage.setItem('preloadedSubscriptionData', JSON.stringify(cacheData))
      logger.debug('📋 Subscription data preloaded and cached')
    } catch (error) {
      logger.error('Error preloading subscription data:', error)
    }
  }

  // --- Actions ---

  /**
   * 1. تهيئة المصادقة (تعمل مرة واحدة فقط)
   */
  async function initializeAuth() {
    if (isInitialized.value) return Promise.resolve()
    if (isInitializing.value && initPromise) return initPromise

    isInitializing.value = true
    isLoading.value = true

    initPromise = (async () => {
      try {
        logger.debug('🚀 Initializing Auth...')

        // معالجة OAuth Redirect (إن وجد)
        await handleOAuthCallback()

        // جلب الجلسة الحالية
        const { session } = await api.auth.getSession()
        await setUserSession(session)

        // الاستماع لتغيرات حالة المصادقة
        api.auth.onAuthStateChange(async (event, session) => {
          logger.debug('🔔 Auth State Changed:', event)

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await setUserSession(session)
          } else if (event === 'SIGNED_OUT') {
            logger.info('🔒 User Signed Out — Cleaning state')
            user.value = null
            sessionStorage.clear() // تنظيف بيانات الجلسة المؤقتة فقط
            isInitialized.value = false
          }
        })

        isInitialized.value = true
      } catch (error) {
        logger.error('💥 Auth Initialization Error:', error)
        authWarning.value = 'تعذر الاتصال بخدمة المصادقة.'
      } finally {
        isLoading.value = false
        isInitializing.value = false
        initPromise = null
      }
    })()

    return initPromise
  }

  /**
   * 2. جلب المستخدم الحالي (مع التحديث)
   */
  async function getUser() {
    if (user.value) return user.value

    try {
      isLoading.value = true
      const { session } = await api.auth.getSession()
      await setUserSession(session)
    } catch (error) {
      logger.error('Failed to get user:', error)
      user.value = null
    } finally {
      isLoading.value = false
    }
    return user.value
  }

  /**
   * 3. معالجة الروابط العائدة من مزود الخدمة (Google)
   */
  async function handleOAuthCallback() {
    const hash = window.location.hash.substring(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    if (params.get('access_token') || params.get('type') === 'recovery') {
      logger.info('🔄 Processing OAuth Callback...')
      try {
        const { data } = await api.auth.getSession()
        if (data?.session) logger.info('✅ OAuth Login Successful')
      } catch (err) {
        logger.error('OAuth Handling Error:', err)
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }

  /**
   * 4. تسجيل الدخول باستخدام Google
   */
  async function loginWithGoogle() {
    isLoading.value = true
    // تأخير بسيط لإظهار حالة التحميل
    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      const { error } = await api.auth.signInWithGoogle()
      if (error) throw error
    } catch (error) {
      logger.error('Login Error:', error)
      addNotification(error.message, 'error')
      authWarning.value = 'حدث خطأ أثناء تسجيل الدخول.'
      isLoading.value = false
    }
    // ملاحظة: لا نعيد isLoading لـ false هنا لأن المتصفح سيقوم بإعادة التوجيه
  }

  /**
   * 5. تسجيل الخروج (Clean Logout)
   */
  async function logout() {
    logger.info('🔒 Starting logout process...')
    isLoading.value = true

    try {
      // 1. تنظيف التخزين المؤقت للجلسة (Safe)
      sessionStorage.clear()

      // 2. تصفير الحالة محلياً
      user.value = null
      isInitialized.value = false

      // 3. الطلب من Supabase إنهاء الجلسة (يمسح الكوكيز والتوكنز تلقائياً)
      const { error } = await api.auth.signOut()
      if (error) logger.warn('Supabase SignOut Warning:', error.message)

      logger.info('✅ Logout completed, redirecting...')
      router.push('/')

    } catch (error) {
      logger.error('❌ Logout Critical Error:', error)
      // إعادة تحميل إجبارية في حالة الخطأ الجسيم لضمان نظافة التطبيق
      window.location.reload()
    } finally {
      isLoading.value = false
    }
  }

  function clearAuthWarning() {
    authWarning.value = ''
  }

  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      await api.user.syncUserProfile(userData)
    } catch (err) {
      logger.error('Profile Sync Error:', err)
    }
  }

  return {
    // State
    user,
    isLoading,
    isInitialized,
    isInitializing,
    authWarning,

    // Getters
    isAuthenticated,

    // Actions
    initializeAuth,
    getUser,
    loginWithGoogle,
    logout,
    syncUserProfile,
    clearAuthWarning
  }
})