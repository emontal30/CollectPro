import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';
import { apiInterceptor } from '@/services/apiInterceptor';

/**
 * TimeService: Centralized time handling for the application.
 * Ensures consistent use of Server Time (Supabase) with a fallback to Device Time,
 * always formatted in the Cairo Timezone (UTC+2/UTC+3).
 */
export const TimeService = {
    /**
     * Returns the current date as a YYYY-MM-DD string in Cairo timezone.
     * Tries to fetch from server first, falls back to local device time.
     * @returns {Promise<string>} Date string (e.g., "2024-01-01")
     */
    async getCairoDate() {
        try {
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                // Create a timeout promise (Reduced to 2s for better UX)
                const timeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Server time fetch timed out')), 2000);
                });

                // Race the API call against the timeout
                const { data, error } = await Promise.race([
                    apiInterceptor(supabase.rpc('get_server_time')),
                    timeout
                ]);

                if (!error && data) {
                    return this.formatToCairoDate(new Date(data));
                }
            }
        } catch (error) {
            // Log as info since this is an expected fallback scenario
            logger.info('TimeService: Using device time (Server time fetch took too long).');
        }

        // Fallback: Use local device time, but still force Cairo formatting
        return this.formatToCairoDate(new Date());
    },

    /**
     * Helper to format any Date object to YYYY-MM-DD in Cairo Time.
     * @param {Date} date 
     * @returns {string}
     */
    formatToCairoDate(date) {
        return date.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    },

    /**
     * Returns the current timestamp in ISO format, but corrected for Cairo timezone if needed
     * or simply UTC if the backend expects UTC. 
     * Usually, for `created_at` fields, `new Date().toISOString()` (UTC) is standard 
     * and DB handles display. But if we want specifically "Cairo Time" for display:
     */
    getCairoTimeISO() {
        return new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    }
};
