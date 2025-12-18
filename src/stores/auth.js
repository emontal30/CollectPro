import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { useRouter } from 'vue-router'
import { useSessionManager } from '@/composables/useSessionManager'
import { useNotifications } from '@/composables/useNotifications'
import logger from '@/utils/logger.js'
import api from '@/services/api' 

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const authWarning = ref('')
  const router = useRouter()
  
  const { addNotification } = useNotifications()
  const { isSessionValidLocal, updateLastActivity, clearLocalSession } = useSessionManager()

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.email === 'emontal.33@gmail.com')

  // --- Actions ---

  async function syncUserProfile(userData) {
    if (!userData) return
    try {
      await api.user.syncUserProfile(userData)
      logger.debug('✅ User profile synced')
    } catch (err) {
      logger.error('Profile Sync Warning:', err)
    }
  }

  /**
   * تهيئة المصادقة
   */
  async function initializeAuth() {
    if (isInitialized.value) return
    
    isLoading.value = true
    try {
      logger.info('🚀 Initializing Auth...')

      // 🛑 التعديل الهام هنا:
      // التحقق مما إذا كان هذا هو رد تسجيل الدخول من جوجل (OAuth Callback)
      const isOAuthCallback = window.location.hash && window.location.hash.includes('access_token');

      // 1. التحقق من المهلة فقط إذا لم يكن تسجيل دخول جديد
      if (!isOAuthCallback && !isSessionValidLocal()) {
        logger.info('🛑 Session expired locally. Logging out.')
        await logout(false)
        return
      }

      // 2. استعادة الجلسة
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session?.user) {
        logger.debug('✅ Session restored/active for:', session.user.email)
        user.value = session.user
        updateLastActivity() // تحديث النشاط (هام جداً لتسجيل الدخول الجديد)
        
        // مزامنة البيانات
        syncUserProfile(session.user)
      } else {
        user.value = null
      }

      // 3. مراقب الحالة
      supabase.auth.onAuthStateChange(async (event, session) => {
        logger.debug(`🔔 Auth Event: ${event}`)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          user.value = session?.user || null
          if (user.value) {
            updateLastActivity() // تحديث التوقيت عند تسجيل الدخول
            await syncUserProfile(user.value)
          }
        } else if (event === 'SIGNED_OUT') {
          user.value = null
          clearLocalSession()
        }
      })

    } catch (err) {
      logger.error('💥 Auth Init Error:', err)
      authWarning.value = 'تعذر الاتصال بخدمة المصادقة'
      user.value = null
    } finally {
      isInitialized.value = true
      isLoading.value = false
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true
    authWarning.value = ''
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      if (error) throw error
    } catch (err) {
      logger.error('Login Error:', err)
      addNotification('فشل تسجيل الدخول: ' + err.message, 'error')
      authWarning.value = 'حدث خطأ أثناء الاتصال بجوجل'
      isLoading.value = false
    }
  }

  async function getUser() {
    if (user.value) return user.value
    try {
      const { data } = await supabase.auth.getUser()
      user.value = data.user
      return user.value
    } catch (e) {
      return null
    }
  }

  async function logout(redirect = true) {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
    } catch (err) {
      logger.warn('Logout warning:', err)
    } finally {
      user.value = null
      clearLocalSession()
      isInitialized.value = false
      isLoading.value = false
      if (redirect) router.replace('/')
    }
  }

  function clearAuthWarning() {
    authWarning.value = ''
  }

  return {
    user,
    isLoading,
    isInitialized,
    authWarning,
    isAuthenticated,
    isAdmin,
    initializeAuth,
    loginWithGoogle,
    getUser,
    logout,
    clearAuthWarning,
    syncUserProfile
  }
})