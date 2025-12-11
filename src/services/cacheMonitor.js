/**
 * Cache Stats Monitor - لوحة تحكم إحصائيات الكاش
 * يمكن استخدامها للتطوير والمراقبة
 */

import { getCacheStats, clearAllCaches, cleanExpiredCache } from '@/services/cacheManager';

export function setupCacheMonitor() {
  // عرض إحصائيات الكاش في Console
  window.showCacheStats = () => {
    const stats = getCacheStats();
    console.table({
      'Memory Cache': `${stats.memory.items}/${stats.memory.max}`,
      'LocalStorage': `${stats.localStorage.items}/${stats.localStorage.max}`,
      'IndexedDB': `${stats.indexedDB.items}/${stats.indexedDB.max}`
    });
    return stats;
  };

  // تنظيف جميع الكاش
  window.clearCache = async () => {
    await clearAllCaches();
    console.log('✅ تم تنظيف جميع الكاش');
  };

  // تنظيف البيانات المنتهية الصلاحية
  window.cleanExpiredCache = async () => {
    await cleanExpiredCache();
    console.log('✅ تم تنظيف البيانات المنتهية الصلاحية');
  };

  console.log('🧪 Cache Monitor Activated');
  console.log('استخدم: showCacheStats() - لعرض الإحصائيات');
  console.log('استخدم: clearCache() - لتنظيف جميع الكاش');
  console.log('استخدم: cleanExpiredCache() - لتنظيف المنتهي صلاحيته');
}
