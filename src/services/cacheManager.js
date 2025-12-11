/**
 * Cache Manager - نظام إدارة الكاش الاحترافي
 * يدير: localStorage, IndexedDB, Memory Cache
 * مع آليات تنظيف تلقائية ومنع التراكم
 */

import localforage from 'localforage';

// تكوين حدود التخزين
const CACHE_CONFIG = {
  localStorage: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxItems: 100,
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 أيام
  },
  indexedDB: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxItems: 1000,
    ttl: 30 * 24 * 60 * 60 * 1000 // 30 يوم
  },
  memory: {
    maxItems: 50,
    ttl: 60 * 60 * 1000 // ساعة واحدة
  }
};

// متاجر محلية
const memoryCache = new Map();
const cacheMetadata = {
  localStorage: new Map(),
  indexedDB: new Map()
};

/**
 * حساب حجم البيانات بالبايتات
 */
function calculateSize(data) {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
}

/**
 * Safe deep clone: try structuredClone, fallback to JSON clone
 */
export function safeDeepClone(data) {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(data);
    }
  } catch (e) {
    // fall through to JSON fallback
  }

  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.warn('⚠️ safeDeepClone failed, returning original data:', err);
    return data;
  }
}

/**
 * تنظيف البيانات المنتهية الصلاحية
 */
async function cleanExpiredCache() {
  const now = Date.now();
  
  // تنظيف localStorage
  try {
    for (const [key, metadata] of cacheMetadata.localStorage) {
      if (now - metadata.timestamp > CACHE_CONFIG.localStorage.ttl) {
        localStorage.removeItem(key);
        cacheMetadata.localStorage.delete(key);
        console.log(`🗑️ تم حذف (localStorage): ${key}`);
      }
    }
  } catch (err) {
    console.error('❌ خطأ في تنظيف localStorage:', err);
  }

  // تنظيف IndexedDB
  try {
    for (const [key, metadata] of cacheMetadata.indexedDB) {
      if (now - metadata.timestamp > CACHE_CONFIG.indexedDB.ttl) {
        await localforage.removeItem(key);
        cacheMetadata.indexedDB.delete(key);
        console.log(`🗑️ تم حذف (IndexedDB): ${key}`);
      }
    }
  } catch (err) {
    console.error('❌ خطأ في تنظيف IndexedDB:', err);
  }

  // تنظيف Memory Cache
  for (const [key, metadata] of memoryCache) {
    if (now - metadata.timestamp > CACHE_CONFIG.memory.ttl) {
      memoryCache.delete(key);
      console.log(`🗑️ تم حذف (Memory): ${key}`);
    }
  }
}

/**
 * تنظيف البيانات الزائدة (LRU - Least Recently Used)
 */
async function evictLRU(storage) {
  const config = CACHE_CONFIG[storage];
  const metadata = cacheMetadata[storage];

  if (metadata.size <= config.maxSize) return;

  // ترتيب حسب آخر استخدام
  const sorted = Array.from(metadata.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

  // حذف 20% من البيانات الأقل استخداماً
  const toDelete = Math.ceil(sorted.length * 0.2);
  for (let i = 0; i < toDelete; i++) {
    const [key] = sorted[i];
    if (storage === 'localStorage') {
      localStorage.removeItem(key);
    } else {
      await localforage.removeItem(key);
    }
    metadata.delete(key);
    console.log(`♻️ تم حذف (LRU ${storage}): ${key}`);
  }
}

/**
 * حفظ في localStorage
 */
export async function setLocalStorageCache(key, data, metadata = {}) {
  try {
    // التحقق من الحد الأقصى للعناصر
    if (cacheMetadata.localStorage.size >= CACHE_CONFIG.localStorage.maxItems) {
      await evictLRU('localStorage');
    }

    const size = calculateSize(data);
    const now = Date.now();

    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: now,
      metadata
    }));

    cacheMetadata.localStorage.set(key, {
      size,
      timestamp: now,
      lastAccessed: now
    });

    console.log(`✅ حفظ (localStorage): ${key} (${Math.round(size / 1024)}KB)`);
    return true;
  } catch (err) {
    console.error(`❌ خطأ في حفظ (localStorage): ${key}`, err);
    return false;
  }
}

/**
 * قراءة من localStorage
 */
export function getLocalStorageCache(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);
    const metadata = cacheMetadata.localStorage.get(key);
    
    if (metadata) {
      metadata.lastAccessed = Date.now();
    }

    console.log(`📖 قراءة (localStorage): ${key}`);
    return parsed.data;
  } catch (err) {
    console.error(`❌ خطأ في قراءة (localStorage): ${key}`, err);
    return null;
  }
}

/**
 * حفظ في IndexedDB
 */
export async function setIndexedDBCache(key, data, metadata = {}) {
  try {
    // تنظيف البيانات باستخدام safeDeepClone (structuredClone -> JSON fallback)
    const cleanData = safeDeepClone(data);

    // التحقق من الحد الأقصى للعناصر
    if (cacheMetadata.indexedDB.size >= CACHE_CONFIG.indexedDB.maxItems) {
      await evictLRU('indexedDB');
    }

    const size = calculateSize(cleanData);
    const now = Date.now();

    await localforage.setItem(key, {
      data: cleanData,
      timestamp: now,
      metadata
    });

    cacheMetadata.indexedDB.set(key, {
      size,
      timestamp: now,
      lastAccessed: now
    });

    console.log(`✅ حفظ (IndexedDB): ${key} (${Math.round(size / 1024)}KB)`);
    return true;
  } catch (err) {
    console.error(`❌ خطأ في حفظ (IndexedDB): ${key}`, err);
    return false;
  }
}

/**
 * قراءة من IndexedDB
 */
export async function getIndexedDBCache(key) {
  try {
    const item = await localforage.getItem(key);
    if (!item) return null;

    const metadata = cacheMetadata.indexedDB.get(key);
    if (metadata) {
      metadata.lastAccessed = Date.now();
    }

    console.log(`📖 قراءة (IndexedDB): ${key}`);
    return item.data;
  } catch (err) {
    console.error(`❌ خطأ في قراءة (IndexedDB): ${key}`, err);
    return null;
  }
}

/**
 * حفظ في Memory Cache
 */
export function setMemoryCache(key, data, metadata = {}) {
  try {
    // إذا تجاوزنا الحد الأقصى، احذف الأقل استخداماً
    if (memoryCache.size >= CACHE_CONFIG.memory.maxItems) {
      const sorted = Array.from(memoryCache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      memoryCache.delete(sorted[0][0]);
      console.log(`♻️ تم حذف (Memory LRU): ${sorted[0][0]}`);
    }

    const now = Date.now();
    memoryCache.set(key, {
      data,
      timestamp: now,
      lastAccessed: now,
      metadata
    });

    console.log(`✅ حفظ (Memory): ${key}`);
    return true;
  } catch (err) {
    console.error(`❌ خطأ في حفظ (Memory): ${key}`, err);
    return false;
  }
}

/**
 * قراءة من Memory Cache
 */
export function getMemoryCache(key) {
  try {
    const item = memoryCache.get(key);
    if (!item) return null;

    // تحديث آخر وصول
    item.lastAccessed = Date.now();

    console.log(`📖 قراءة (Memory): ${key}`);
    return item.data;
  } catch (err) {
    console.error(`❌ خطأ في قراءة (Memory): ${key}`, err);
    return null;
  }
}

/**
 * حفظ ذكي متدرج (حاول Memory، ثم IndexedDB، ثم localStorage)
 */
export async function setSmartCache(key, data, priority = 'auto') {
  const size = calculateSize(data);

  if (priority === 'memory' || (priority === 'auto' && size < 100 * 1024)) {
    return setMemoryCache(key, data);
  } else if (priority === 'indexedDB' || (priority === 'auto' && size < 5 * 1024 * 1024)) {
    return await setIndexedDBCache(key, data);
  } else {
    return await setLocalStorageCache(key, data);
  }
}

/**
 * قراءة ذكية متدرجة
 */
export async function getSmartCache(key) {
  // جرب Memory أولاً (الأسرع)
  let data = getMemoryCache(key);
  if (data) return data;

  // جرب IndexedDB (سريع)
  data = await getIndexedDBCache(key);
  if (data) {
    // احفظه في Memory للمرات القادمة
    setMemoryCache(key, data);
    return data;
  }

  // جرب localStorage (الأبطأ)
  data = getLocalStorageCache(key);
  if (data) {
    // احفظه في Memory للمرات القادمة
    setMemoryCache(key, data);
    return data;
  }

  return null;
}

/**
 * حذف من جميع المخزنات
 */
export async function removeFromAllCaches(key) {
  try {
    memoryCache.delete(key);
    localStorage.removeItem(key);
    await localforage.removeItem(key);
    cacheMetadata.localStorage.delete(key);
    cacheMetadata.indexedDB.delete(key);
    console.log(`🗑️ تم حذف من جميع المخزنات: ${key}`);
    return true;
  } catch (err) {
    console.error(`❌ خطأ في الحذف: ${key}`, err);
    return false;
  }
}

/**
 * تنظيف كامل (استخدم بحذر!)
 */
export async function clearAllCaches() {
  try {
    memoryCache.clear();
    localStorage.clear();
    await localforage.clear();
    cacheMetadata.localStorage.clear();
    cacheMetadata.indexedDB.clear();
    console.log('🧹 تم تنظيف جميع المخزنات');
    return true;
  } catch (err) {
    console.error('❌ خطأ في التنظيف الكامل:', err);
    return false;
  }
}

/**
 * إحصائيات الكاش
 */
export function getCacheStats() {
  return {
    memory: {
      items: memoryCache.size,
      max: CACHE_CONFIG.memory.maxItems
    },
    localStorage: {
      items: cacheMetadata.localStorage.size,
      max: CACHE_CONFIG.localStorage.maxItems
    },
    indexedDB: {
      items: cacheMetadata.indexedDB.size,
      max: CACHE_CONFIG.indexedDB.maxItems
    }
  };
}

/**
 * بدء التنظيف التلقائي المنتظم
 */
export function startAutoCleaning(interval = 5 * 60 * 1000) { // كل 5 دقائق
  console.log('⏱️ بدء التنظيف التلقائي للكاش');
  
  setInterval(() => {
    cleanExpiredCache().catch(err => {
      console.error('❌ خطأ في التنظيف التلقائي:', err);
    });
  }, interval);

  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    cleanExpiredCache().catch(console.error);
  });
}

/**
 * حذف كاش معين بناءً على Pattern
 */
export async function clearCacheByPattern(pattern) {
  try {
    const regex = new RegExp(pattern);
    let count = 0;

    // حذف من Memory
    for (const [key] of memoryCache) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        count++;
      }
    }

    // حذف من localStorage
    for (const [key, metadata] of cacheMetadata.localStorage) {
      if (regex.test(key)) {
        localStorage.removeItem(key);
        cacheMetadata.localStorage.delete(key);
        count++;
      }
    }

    // حذف من IndexedDB
    for (const [key, metadata] of cacheMetadata.indexedDB) {
      if (regex.test(key)) {
        await localforage.removeItem(key);
        cacheMetadata.indexedDB.delete(key);
        count++;
      }
    }

    console.log(`♻️ تم حذف ${count} عناصر بناءً على Pattern: ${pattern}`);
    return count;
  } catch (err) {
    console.error(`❌ خطأ في حذف الكاش بـ Pattern: ${pattern}`, err);
    return 0;
  }
}

export default {
  setLocalStorageCache,
  getLocalStorageCache,
  setIndexedDBCache,
  getIndexedDBCache,
  setMemoryCache,
  getMemoryCache,
  setSmartCache,
  getSmartCache,
  removeFromAllCaches,
  clearAllCaches,
  getCacheStats,
  startAutoCleaning,
  clearCacheByPattern,
  cleanExpiredCache,
  safeDeepClone
};

export { cleanExpiredCache };
