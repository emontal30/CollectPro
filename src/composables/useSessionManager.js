import { useRouter } from 'vue-router'
import logger from '@/utils/logger.js'

// ثوابت الجلسة
const SESSION_TIMEOUT = 48 * 60 * 60 * 1000 // 48 ساعة
const STORAGE_KEY_LAST_ACTIVE = 'app_last_active'
const STORAGE_KEY_LAST_PAGE = 'app_last_page'

export function useSessionManager() {
  const router = useRouter()
  
  /**
   * تحديث توقيت آخر نشاط
   */
  function updateLastActivity() {
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString())
  }

  /**
   * التحقق من صلاحية الجلسة محلياً
   */
  function isSessionValidLocal() {
    const lastActive = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE)
    if (!lastActive) return false

    const now = Date.now()
    const diff = now - Number(lastActive)

    if (diff > SESSION_TIMEOUT) {
      logger.warn('⏰ انتهت الجلسة محلياً (تجاوزت 48 ساعة)')
      return false
    }
    return true
  }

  /**
   * تهيئة مستمعي النشاط
   */
  function setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => updateLastActivity()

    // استخدام passive لتحسين الأداء
    events.forEach(evt => window.addEventListener(evt, handler, { passive: true }))

    // إرجاع دالة للتنظيف
    return () => {
      events.forEach(evt => window.removeEventListener(evt, handler))
    }
  }

  /**
   * حفظ الصفحة الحالية
   */
  function saveCurrentPage(path) {
    if (path && !path.includes('login') && path !== '/') {
      localStorage.setItem(STORAGE_KEY_LAST_PAGE, path)
    }
  }

  /**
   * استرجاع آخر صفحة
   */
  function getLastPage() {
    return localStorage.getItem(STORAGE_KEY_LAST_PAGE) || '/app/dashboard'
  }

  /**
   * تنظيف الجلسة المحلية
   */
  function clearLocalSession() {
    localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE)
    localStorage.removeItem(STORAGE_KEY_LAST_PAGE)
  }

  return {
    updateLastActivity,
    isSessionValidLocal,
    setupActivityListeners,
    saveCurrentPage,
    getLastPage,
    clearLocalSession
  }
}