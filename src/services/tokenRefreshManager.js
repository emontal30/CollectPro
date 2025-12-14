/**
 * Token Refresh Manager
 * Handles token refresh with retry/backoff logic to prevent false sign-outs
 */

import { supabase } from '@/supabase';
import logger from '@/utils/logger.js'

let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const INITIAL_DELAY = 500; // ms

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Refresh token with exponential backoff
 * Returns true if refresh succeeded, false otherwise
 */
export async function refreshTokenWithRetry() {
  refreshAttempts = 0;
  let delay = INITIAL_DELAY;

  while (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
    refreshAttempts++;
    try {
      logger.debug(`🔄 Token refresh attempt ${refreshAttempts}/${MAX_REFRESH_ATTEMPTS}...`);

      // Check if online
      if (!navigator.onLine) {
        logger.warn('⚠️ Offline — deferring token refresh');
        return false;
      }

      // Attempt refresh
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data?.session) {
        logger.info('✅ Token refreshed successfully');
        refreshAttempts = 0; // Reset on success
        return true;
      } else {
        throw new Error('No session returned from refresh');
      }
    } catch (err) {
      logger.warn(`❌ Token refresh failed (attempt ${refreshAttempts}):`, err.message);

      // If this was the last attempt, stop
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        logger.error('🚨 Token refresh failed after all attempts — session may be invalid');
        return false;
      }

      // Exponential backoff
      await sleep(delay);
      delay *= 2;
    }
  }

  return false;
}

/**
 * Check and refresh token if needed
 * Used in router guards or before API calls
 */
export async function ensureValidToken() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      logger.warn('⚠️ No valid session — attempting refresh...');
      return await refreshTokenWithRetry();
    }

    // Token is valid
    return true;
  } catch (err) {
    logger.error('Error checking token validity:', err);
    // On error, retry refresh
    return await refreshTokenWithRetry();
  }
}

/**
 * Reset attempts counter (call on successful refresh)
 */
export function resetRefreshAttempts() {
  refreshAttempts = 0;
}

/**
 * Get current refresh attempt count
 */
export function getRefreshAttempts() {
  return refreshAttempts;
}
