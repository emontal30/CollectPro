/**
 * Cache Manager - نظام إدارة الكاش الاحترافي المعزول
 * يدير: localStorage, IndexedDB, Memory Cache
 * مع ميزات الأمان، ربط البيانات بالمستخدم، والتنظيف التلقائي
 */

import localforage from 'localforage';
import logger from '@/utils/logger.js'

// 1. تكوين حدود التخزين (Config)
const CACHE_CONFIG = {
  localStorage: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxItems: 150,
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 أيام
  },
  indexedDB: {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxItems: 2000,
    ttl: 30 * 24 * 60 * 60 * 1000 // 30 يوم
  },
  memory: {
    maxItems: 100,
    ttl: 60 * 60 * 1000 // ساعة واحدة
  }
};

// 2. المتاجر الداخلية (Internal Stores)
const memoryCache = new Map();
const cacheMetadata = {
  localStorage: new Map(),
  indexedDB: new Map()
};

// 3. وظائف المساعدة (Utility Functions)

/**
 * دالة للحصول على مفتاح معزول للمستخدم لضمان عدم تسريب البيانات بين الحسابات
 */
export function getScopedKey(key, userId) {
  if (!userId) return key;
  if (key.startsWith(`u_${userId}_`)) return key;
  return `u_${userId}_${key}`;
}

/**
 * حساب حجم البيانات بالبايتات
 */
export function calculateSize(data) {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
}

/**

 * Safe deep clone

 */

export function safeDeepClone(data) {

  try {

    if (typeof structuredClone === 'function') return structuredClone(data);

  } catch (e) {}

  try {

    return JSON.parse(JSON.stringify(data));

  } catch (err) {

    return data;

  }

}



// 3.5. وظائف التشفير البسيط (Obfuscation)

const SECRET_KEY = "M0mknCollectPro-@2024-StrongKey!";



function obfuscateData(data) {

  if (data === null || data === undefined) return data;

  try {

    const jsonString = JSON.stringify(data);

    const keyLen = SECRET_KEY.length;

    let obfuscated = '';

    for (let i = 0; i < jsonString.length; i++) {

      obfuscated += String.fromCharCode(jsonString.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % keyLen));

    }

    return btoa(obfuscated); // استخدام btoa لضمان عدم وجود محارف خاصة

  } catch (err) {

    logger.error('❌ Obfuscation failed:', err);

    return data; // في حالة الفشل، أرجع البيانات الأصلية

  }

}



function deobfuscateData(obfuscatedData) {

  if (typeof obfuscatedData !== 'string' || !obfuscatedData) return obfuscatedData;

  try {

    const byteString = atob(obfuscatedData);

    const keyLen = SECRET_KEY.length;

    let jsonString = '';

    for (let i = 0; i < byteString.length; i++) {

      jsonString += String.fromCharCode(byteString.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % keyLen));

    }

    return JSON.parse(jsonString);

  } catch (err) {

    // قد تفشل العملية إذا كانت البيانات غير مشفرة (بيانات قديمة)، لذا نعيدها كما هي

    return obfuscatedData;

  }

}





// 4. وظائف الصيانة والتنظيف (Maintenance)



/**

 * تنظيف البيانات المنتهية الصلاحية

 */

export async function cleanExpiredCache() {

  const now = Date.now();

  

  // تنظيف localStorage

  try {

    for (const [key, metadata] of cacheMetadata.localStorage) {

      if (now - metadata.timestamp > CACHE_CONFIG.localStorage.ttl) {

        localStorage.removeItem(key);

        cacheMetadata.localStorage.delete(key);

      }

    }

  } catch (err) {

    logger.error('❌ Error cleaning localStorage expiry:', err);

  }



  // تنظيف IndexedDB

  try {

    for (const [key, metadata] of cacheMetadata.indexedDB) {

      if (now - metadata.timestamp > CACHE_CONFIG.indexedDB.ttl) {

        await localforage.removeItem(key);

        cacheMetadata.indexedDB.delete(key);

      }

    }

  } catch (err) {

    logger.error('❌ Error cleaning IndexedDB expiry:', err);

  }



  // تنظيف Memory Cache

  for (const [key, metadata] of memoryCache) {

    if (now - metadata.timestamp > CACHE_CONFIG.memory.ttl) {

      memoryCache.delete(key);

    }

  }

}



/**

 * تنظيف البيانات الزائدة (LRU - Least Recently Used)

 */

export async function evictLRU(storage) {

  const config = CACHE_CONFIG[storage];

  const metadataMap = cacheMetadata[storage];



  if (metadataMap.size < config.maxItems) return;



  const sorted = Array.from(metadataMap.entries())

    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);



  const toDeleteCount = Math.ceil(sorted.length * 0.2); // حذف 20%

  for (let i = 0; i < toDeleteCount; i++) {

    const [key] = sorted[i];

    if (storage === 'localStorage') {

      localStorage.removeItem(key);

    } else {

      await localforage.removeItem(key);

    }

    metadataMap.delete(key);

    logger.info(`♻️ LRU Eviction (${storage}): ${key}`);

  }

}



// 5. وظائف التخزين والقراءة (Storage Operations)



export async function setLocalStorageCache(key, data, options = {}) {

  try {

    const { userId, metadata: customMetadata = {} } = options;

    const finalKey = getScopedKey(key, userId);



    if (cacheMetadata.localStorage.size >= CACHE_CONFIG.localStorage.maxItems) {

      await evictLRU('localStorage');

    }



    const size = calculateSize(data);

    const now = Date.now();

    const obfuscatedPayload = obfuscateData(data);



    localStorage.setItem(finalKey, JSON.stringify({

      isEncrypted: true,

      data: obfuscatedPayload,

      timestamp: now,

      metadata: customMetadata

    }));



    cacheMetadata.localStorage.set(finalKey, {

      size,

      timestamp: now,

      lastAccessed: now

    });



    return true;

  } catch (err) {

    logger.error(`❌ Error setting localStorage cache: ${key}`, err);

    return false;

  }

}



export function getLocalStorageCache(key, userId = null) {

  try {

    const finalKey = getScopedKey(key, userId);

    const item = localStorage.getItem(finalKey);

    if (!item) return null;



    const parsed = JSON.parse(item);

    const metadata = cacheMetadata.localStorage.get(finalKey);

    

    const now = Date.now();

    if (metadata) {

      metadata.lastAccessed = now;

    } else {

      cacheMetadata.localStorage.set(finalKey, {

        timestamp: parsed.timestamp || now,

        lastAccessed: now

      });

    }



    // فك التشفير إذا كانت البيانات مشفرة

    if (parsed.isEncrypted) {

      return deobfuscateData(parsed.data);

    }



    // للتعامل مع البيانات القديمة غير المشفرة

    return parsed.data;

  } catch (err) {

    return null;

  }

}



export async function setIndexedDBCache(key, data, options = {}) {

  try {

    const { userId, metadata: customMetadata = {} } = options;

    const finalKey = getScopedKey(key, userId);

    const cleanData = safeDeepClone(data);



    if (cacheMetadata.indexedDB.size >= CACHE_CONFIG.indexedDB.maxItems) {

      await evictLRU('indexedDB');

    }

    

    const obfuscatedPayload = obfuscateData(cleanData);

    const now = Date.now();



    await localforage.setItem(finalKey, {

      isEncrypted: true,

      data: obfuscatedPayload,

      timestamp: now,

      metadata: customMetadata

    });



    cacheMetadata.indexedDB.set(finalKey, {

      timestamp: now,

      lastAccessed: now

    });



    return true;

  } catch (err) {

    logger.error(`❌ Error setting IndexedDB cache: ${key}`, err);

    return false;

  }

}



export async function getIndexedDBCache(key, userId = null) {

  try {

    const finalKey = getScopedKey(key, userId);

    const item = await localforage.getItem(finalKey);

    if (!item) return null;



    const now = Date.now();

    const metadata = cacheMetadata.indexedDB.get(finalKey);

    if (metadata) {

      metadata.lastAccessed = now;

    } else {

      cacheMetadata.indexedDB.set(finalKey, {

        timestamp: item.timestamp || now,

        lastAccessed: now

      });

    }



    // فك التشفير إذا كانت البيانات مشفرة

    if (item.isEncrypted) {

      return deobfuscateData(item.data);

    }

    

    // للتعامل مع البيانات القديمة غير المشفرة

    return item.data;

  } catch (err) {
    return null;
  }
}

export function setMemoryCache(key, data, options = {}) {
  try {
    const { userId, metadata: customMetadata = {} } = options;
    const finalKey = getScopedKey(key, userId);

    if (memoryCache.size >= CACHE_CONFIG.memory.maxItems) {
      const oldestKey = memoryCache.keys().next().value;
      memoryCache.delete(oldestKey);
    }

    const now = Date.now();
    memoryCache.set(finalKey, {
      data,
      timestamp: now,
      lastAccessed: now,
      metadata: customMetadata
    });
    return true;
  } catch (err) {
    return false;
  }
}

export function getMemoryCache(key, userId = null) {
  const finalKey = getScopedKey(key, userId);
  const item = memoryCache.get(finalKey);
  if (!item) return null;
  item.lastAccessed = Date.now();
  return item.data;
}

// 6. الوظائف الذكية (Smart Functions)

export async function setSmartCache(key, data, options = {}) {
  const size = calculateSize(data);
  const { priority = 'auto' } = options;

  if (priority === 'memory' || (priority === 'auto' && size < 50 * 1024)) {
    return setMemoryCache(key, data, options);
  } else if (priority === 'indexedDB' || (priority === 'auto' && size < 2 * 1024 * 1024)) {
    return await setIndexedDBCache(key, data, options);
  } else {
    return await setLocalStorageCache(key, data, options);
  }
}

export async function getSmartCache(key, userId = null) {
  let data = getMemoryCache(key, userId);
  if (data) return data;

  data = await getIndexedDBCache(key, userId);
  if (data) {
    setMemoryCache(key, data, { userId });
    return data;
  }

  data = getLocalStorageCache(key, userId);
  if (data) {
    setMemoryCache(key, data, { userId });
    return data;
  }

  return null;
}

// 7. وظائف الحذف والمسح (Cleanup Operations)

export async function removeFromAllCaches(key, userId = null) {
  try {
    const finalKey = getScopedKey(key, userId);
    memoryCache.delete(finalKey);
    localStorage.removeItem(finalKey);
    await localforage.removeItem(finalKey);
    cacheMetadata.localStorage.delete(finalKey);
    cacheMetadata.indexedDB.delete(finalKey);
    return true;
  } catch (err) {
    return false;
  }
}

export async function clearAllCaches() {
  memoryCache.clear();
  localStorage.clear();
  await localforage.clear();
  cacheMetadata.localStorage.clear();
  cacheMetadata.indexedDB.clear();
  return true;
}

export async function clearCacheByPattern(pattern) {
  try {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const [key] of memoryCache) {
      if (regex.test(key)) { memoryCache.delete(key); count++; }
    }
    
    Object.keys(localStorage).forEach(key => {
      if (regex.test(key)) { localStorage.removeItem(key); count++; }
    });

    const keys = await localforage.keys();
    for (const key of keys) {
      if (regex.test(key)) { await localforage.removeItem(key); count++; }
    }

    return count;
  } catch (err) {
    return 0;
  }
}

export async function clearCacheOnVersionUpdate() {
  try {
    const SETTINGS_KEY = 'app_settings_v1';
    const ARCHIVE_PATTERN = /arch_data_/;
    memoryCache.clear();
    
    Object.keys(localStorage).forEach(key => {
      if (!ARCHIVE_PATTERN.test(key) && key !== SETTINGS_KEY && key !== 'app_version') {
        localStorage.removeItem(key);
      }
    });
    
    const keys = await localforage.keys();
    for (const key of keys) {
      if (!ARCHIVE_PATTERN.test(key) && !key.includes('harvest_rows')) {
        await localforage.removeItem(key);
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function clearCacheOnLogout(userId = null) {
  try {
    memoryCache.clear();
    const userPrefix = userId ? `u_${userId}_` : null;
    const ARCHIVE_PATTERN = /arch_data_/;

    if (userPrefix) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(userPrefix) && !ARCHIVE_PATTERN.test(key)) {
          localStorage.removeItem(key);
        }
      });
      const keys = await localforage.keys();
      for (const key of keys) {
        if (key.startsWith(userPrefix) && !ARCHIVE_PATTERN.test(key) && !key.includes('harvest_rows')) {
          await localforage.removeItem(key);
        }
      }
    } else {
      Object.keys(localStorage).forEach(key => {
        if (!ARCHIVE_PATTERN.test(key) && key !== 'app_version') {
          localStorage.removeItem(key);
        }
      });
    }
    return true;
  } catch (err) {
    return false;
  }
}

// 8. المراقبة والإصدار (Monitoring & Versioning)

export function getCacheStats() {
  return {
    memory: { items: memoryCache.size, max: CACHE_CONFIG.memory.maxItems },
    localStorage: { items: cacheMetadata.localStorage.size, max: CACHE_CONFIG.localStorage.maxItems },
    indexedDB: { items: cacheMetadata.indexedDB.size, max: CACHE_CONFIG.indexedDB.maxItems }
  };
}

export function startAutoCleaning(interval = 10 * 60 * 1000) {
  setInterval(() => {
    cleanExpiredCache().catch(() => {});
  }, interval);
}

export async function checkAppVersion() {
  try {
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    const savedVersion = localStorage.getItem('app_version');

    if (savedVersion && savedVersion !== currentVersion) {
      logger.info(`🔄 New version detected: ${currentVersion}. Cleaning cache...`);
      await clearCacheOnVersionUpdate();
    }
    localStorage.setItem('app_version', currentVersion);
  } catch (err) {
    logger.error('❌ Error checking app version:', err);
  }
}

// 9. التصدير الافتراضي (Default Export)
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
  clearCacheOnLogout,
  clearCacheOnVersionUpdate,
  getScopedKey,
  startAutoCleaning,
  cleanExpiredCache,
  getCacheStats,
  safeDeepClone,
  checkAppVersion,
  clearCacheByPattern
};
