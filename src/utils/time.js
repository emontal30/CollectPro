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
    },

    /**
     * حساب الأيام المتبقية حتى تاريخ محدد مع الأخذ في الاعتبار فارق التوقيت
     * @param {string|Date} endDate - تاريخ الانتهاء
     * @param {number} serverTimeOffset - فارق التوقيت بين السيرفر والعميل (بالميلي ثانية)
     * @returns {number} عدد الأيام المتبقية (عدد صحيح)
     */
    calculateDaysRemaining(endDate, serverTimeOffset = 0) {
        if (!endDate) return 0;

        // استخدام التوقيت الحالي مع إضافة فارق التوقيت
        const now = new Date(Date.now() + serverTimeOffset);
        const end = new Date(endDate);

        // تعيين الوقت إلى بداية اليوم (منتصف الليل)
        now.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // حساب الفرق بالأيام
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    },

    // Cache the offset in memory to avoid redundant API calls
    _cachedOffset: null,

    /**
     * احصل على فارق التوقيت بين السيرفر والعميل
     * @returns {Promise<number>} فارق التوقيت بالميلي ثانية
     */
    async getServerTimeOffset() {
        if (this._cachedOffset !== null) {
            return this._cachedOffset;
        }

        try {
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                const timeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Server time fetch timed out')), 2000);
                });

                const { data, error } = await Promise.race([
                    apiInterceptor(supabase.rpc('get_server_time')),
                    timeout
                ]);

                if (!error && data) {
                    this._cachedOffset = new Date(data).getTime() - Date.now();
                    return this._cachedOffset;
                }
            }
        } catch (error) {
            logger.info('TimeService: Could not fetch server time offset, using 0.');
        }

        return 0; // Default: no offset
    }
};
