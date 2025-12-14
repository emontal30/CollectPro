import { ref } from 'vue';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase';
import { useRouter } from 'vue-router';

const LAST_PAGE_KEY = 'collectpro_last_page';

export function useSessionManager() {
  const router = useRouter();
  const isSessionValid = ref(true);

  const saveCurrentPage = (path) => {
    const pagePath = path || router.currentRoute.value.fullPath;
    if (pagePath && pagePath !== '/' && !pagePath.includes('/login')) {
      localStorage.setItem(LAST_PAGE_KEY, pagePath);
    }
  };

  const getLastPage = () => localStorage.getItem(LAST_PAGE_KEY);
  const clearLastPage = () => localStorage.removeItem(LAST_PAGE_KEY);

  const checkSessionValidity = async () => {
    // If offline, assume session is valid to avoid forcing logout due to network errors
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !!session && !error;
    } catch (err) {
      logger.warn('checkSessionValidity: network error, assuming session valid for now', err)
      return true;
    }
  };

  const forceLogout = async () => {
    clearLastPage();
    await supabase.auth.signOut();
    router.push('/');
  };

  // Stubs for backward compatibility
  const initializeSession = () => logger.info('✅ Session persistence active');
  const cleanup = () => {};
  const updateLastActivity = () => {};
  const setupActivityListeners = () => () => {};

  return {
    isSessionValid, checkSessionValidity, forceLogout,
    saveCurrentPage, getLastPage, clearLastPage,
    initializeSession, cleanup, updateLastActivity, setupActivityListeners
  };
}