/**
 * Cache Stats Monitor - لوحة تحكم إحصائيات الكاش
 * يمكن استخدامها للتطوير والمراقبة
 */

import { getCacheStats, clearAllCaches, cleanExpiredCache } from '@/services/cacheManager';
import logger from '@/utils/logger.js'

export function setupCacheMonitor() {
  // عرض إحصائيات الكاش في Console
  window.showCacheStats = () => {
    const stats = getCacheStats();
    logger.info('Cache stats:', {
      memory: `${stats.memory.items}/${stats.memory.max}`,
      localStorage: `${stats.localStorage.items}/${stats.localStorage.max}`,
      indexedDB: `${stats.indexedDB.items}/${stats.indexedDB.max}`
    });
    return stats;
  };

  // تنظيف جميع الكاش
  window.clearCache = async () => {
    await clearAllCaches();
    logger.info('✅ تم تنظيف جميع الكاش');
  };

  // تنظيف البيانات المنتهية الصلاحية
  window.cleanExpiredCache = async () => {
    await cleanExpiredCache();
    logger.info('✅ تم تنظيف البيانات المنتهية الصلاحية');
  };

  logger.info('🧪 Cache Monitor Activated');
  logger.info('استخدم: showCacheStats() - لعرض الإحصائيات');
  logger.info('استخدم: clearCache() - لتنظيف جميع الكاش');
  logger.info('استخدم: cleanExpiredCache() - لتنظيف المنتهي صلاحيته');
}
