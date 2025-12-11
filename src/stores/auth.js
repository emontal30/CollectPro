import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const isInitializing = ref(false) // Prevent multiple simultaneous initializations
  const router = useRouter()
  const authWarning = ref('')

  // نظام الإشعارات الموحد
  const { addNotification } = useNotifications()

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)

  // --- Private Helpers ---

  /**
   * دالة مركزية لتعيين المستخدم ومزامنة الملف الشخصي
   * تمنع تكرار الكود في initializeAuth و getUser
   */
  async function setUserSession(session) {
    if (session?.user) {
      console.debug('✅ Session active for:', session.user.email)
      user.value = session.user
      await syncUserProfile(session.user)

      // تحميل مسبق لبيانات الاشتراك لتحسين الأداء
      preloadSubscriptionData(session.user.id)
    } else {
      console.debug('❌ No active session found')
      user.value = null
    }
  }

  /**
   * تحميل مسبق لبيانات الاشتراك (في الخلفية)
   */
  async function preloadSubscriptionData(userId) {
    if (!userId) return

    try {
      console.debug('📋 Preloading subscription data...')
      // تحميل البيانات بشكل متزامن في الخلفية
      const [subscriptionResult, historyResult] = await Promise.all([
        api.subscriptions.getSubscription(userId),
        api.subscriptions.getSubscriptionHistory(userId)
      ])

      // حفظ في sessionStorage للمتاجر المعنية
      const cacheData = {
        subscription: subscriptionResult.subscription,
        history: historyResult.history || [],
        user: user.value,
        timestamp: Date.now()
      }

      sessionStorage.setItem('preloadedSubscriptionData', JSON.stringify(cacheData))
      console.debug('📋 Subscription data preloaded and cached')
    } catch (error) {
      console.error('Error preloading subscription data:', error)
    }
  }

  /**
   * تنظيف مخلفات جوجل والستوريج عند تسجيل الخروج
   */
  function clearLocalArtifacts() {
    const projectRef = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
    
    // 1. Clear Supabase specific token
    if (projectRef) {
      localStorage.removeItem(`sb-${projectRef}-auth-token`)
    }
    
    // 2. Clear Session Storage
    sessionStorage.clear()

    // 3. Clear Google/OAuth related LocalStorage items
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && /google|gauth|oauth/i.test(key)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // 4. Clear Cookies (Google related)
    document.cookie.split(";").forEach(cookie => {
      const name = cookie.split("=")[0].trim()
      if (/google|g_state|oauth/i.test(name)) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${window.location.hostname};`
      }
    })
  }

  // --- Actions ---

  /**
   * 1. تهيئة المصادقة عند بدء التطبيق
   */
  async function initializeAuth() {
    if (isInitialized.value) return

    // Prevent multiple simultaneous initializations
    if (isInitializing.value) {
      // Wait for ongoing initialization to complete
      while (isInitializing.value) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return
    }

    isInitializing.value = true
    isLoading.value = true

    try {
      console.debug('🚀 Initializing Auth...')

      // معالجة العودة من جوجل (OAuth Callback)
      await handleOAuthCallback()

      // جلب الجلسة الحالية
      console.log('🔍 Fetching session from API...')
      const { session } = await api.auth.getSession()
      console.log('🔍 Session fetched:', session ? 'exists' : 'null')
      await setUserSession(session)

      // إعداد مستمع لتغييرات الحالة (يتم تنفيذه مرة واحدة)
      api.auth.onAuthStateChange(async (event, session) => {
        try {
          console.debug('🔔 Auth State Changed:', event, { session })

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await setUserSession(session)
            // Reset loading state when successfully signed in
            isLoading.value = false
          } else if (event === 'SIGNED_OUT') {
            console.info('🔒 Received SIGNED_OUT event — clearing local artifacts and resetting user state')
            try { clearLocalArtifacts() } catch (e) { console.warn('Failed to clear local artifacts:', e) }
            user.value = null
            isInitialized.value = false
            isLoading.value = false
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err, { event, session })
        }
      })

      isInitialized.value = true
    } catch (error) {
      console.error('💥 Auth Initialization Error:', error)
      authWarning.value = 'تعذر الاتصال بخدمة المصادقة. قد يتأثر التزامن مع الخادم.'
    } finally {
      isLoading.value = false
      isInitializing.value = false
    }
  }

  /**
   * 2. الحصول على المستخدم الحالي (للاستخدام في الراوتر)
   */
  async function getUser() {
    if (user.value) return user.value

    isLoading.value = true
    try {
      const { session } = await api.auth.getSession()
      await setUserSession(session)
    } catch (error) {
      console.error('Failed to get user:', error)
      authWarning.value = 'فشل جلب بيانات المستخدم. تحقق من اتصال الشبكة.'
      user.value = null
    } finally {
      isLoading.value = false
    }
    return user.value
  }

  /**
   * 3. معالجة الرابط بعد العودة من جوجل
   */
  async function handleOAuthCallback() {
    const hash = window.location.hash.substring(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken || refreshToken || type === 'recovery') {
      console.log('🔄 Processing OAuth Callback...')
      try {
        // نترك Supabase يعالج التوكن تلقائياً، نحن فقط ننظف الرابط
        const { data, error } = await api.auth.getSession()
        if (!error && data?.session) {
          console.log('✅ OAuth Login Successful')
        }
      } catch (err) {
        console.error('OAuth Handling Error:', err)
      } finally {
        // تنظيف الرابط من التوكنز للحماية
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }

  /**
   * 4. تسجيل الدخول بجوجل
   */
  async function loginWithGoogle() {
    isLoading.value = true

    // Ensure loading state shows for at least 200ms to be visible
    await new Promise(resolve => setTimeout(resolve, 200))

    // Set up a timeout to reset loading state in case OAuth redirect fails
    const loadingTimeout = setTimeout(() => {
      isLoading.value = false
    }, 5000) // 5 seconds timeout

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
        throw new Error('إعدادات Supabase غير صحيحة في ملف .env')
      }

      const { error } = await api.auth.signInWithGoogle()
      if (error) throw error

      // If OAuth call succeeds, clear the timeout since loading will be handled by auth state change
      clearTimeout(loadingTimeout)

    } catch (error) {
      console.error('Login Error:', error)
      addNotification(error.message, 'error')
      authWarning.value = 'حدث خطأ أثناء تسجيل الدخول. تحقق من اتصال الشبكة.'
      isLoading.value = false
      clearTimeout(loadingTimeout)
    }
  }

  /**
   * 5. تسجيل الخروج
   */
  async function logout() {
    console.log('🔒 Starting logout process...')
    isLoading.value = true

    try {
      // 1. تنظيف المتصفح فوراً
      clearLocalArtifacts()

      // 2. تحديث الحالة فوراً
      user.value = null
      isInitialized.value = false

      // 3. تسجيل الخروج من Supabase (غير blocking)
      try {
        const { error } = await api.auth.signOut()
        if (error) console.warn('Supabase SignOut Warning:', error.message)
      } catch (signOutError) {
        console.warn('SignOut failed, but proceeding with logout:', signOutError)
      }

      console.log('✅ Logout completed, redirecting...')
      // 4. تعيين isLoading إلى false
      isLoading.value = false
      // 5. إعادة التوجيه إلى صفحة الدخول
      router.push('/')

    } catch (error) {
      console.error('❌ Logout Critical Error:', error)
      // في حالة الخطأ، نضمن إعادة التحميل
      user.value = null
      isLoading.value = false
      window.location.reload()
    }
  }

  function clearAuthWarning() {
    authWarning.value = ''
  }

  /**
   * 6. مزامنة بيانات المستخدم مع قاعدة البيانات
   */
  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      const { error } = await api.user.syncUserProfile(userData)
      if (error) console.error('Profile Sync Error:', error)
    } catch (err) {
      console.error('Profile Sync Unexpected Error:', err)
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
    syncUserProfile
    ,clearAuthWarning
  }
})