// ========== مدير التخزين المؤقت ========== //

// التخزين المؤقت للبيانات
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.config = window.AppConfig?.app?.performance || {};
    this.cacheTimeout = this.config.cacheTimeout || 300000; // 5 دقائق افتراضيًا
  }

  // إنشاء مفتاح للتخزين المؤقت
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {});

    const paramsString = JSON.stringify(sortedParams);
    return `${endpoint}-${this.hashString(paramsString)}`;
  }

  // دالة تجزئة النصوص
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى عدد 32 بت
    }
    return Math.abs(hash).toString(36);
  }

  // التحقق من صلاحية التخزين المؤقت
  isCacheValid(cacheEntry) {
    if (!cacheEntry || !cacheEntry.timestamp) return false;

    const now = Date.now();
    const age = now - cacheEntry.timestamp;

    return age < this.cacheTimeout;
  }

  // الحصول من التخزين المؤقت
  get(endpoint, params = {}) {
    const key = this.generateCacheKey(endpoint, params);
    const entry = this.cache.get(key);

    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }

    return null;
  }

  // حفظ في التخزين المؤقت
  set(endpoint, params, data) {
    const key = this.generateCacheKey(endpoint, params);

    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // مسح التخزين المؤقت
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToRemove = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  // الحصول على حجم التخزين المؤقت
  size() {
    return this.cache.size;
  }

  // الحصول على إحصائيات التخزين المؤقت
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalAge = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;

      if (age < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }

      totalAge += age;
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      averageAge: totalAge / this.cache.size || 0
    };
  }
}

// إنشاء مثيل من مدير التخزين المؤقت
const cacheManager = new CacheManager();

// التخزين المؤقت للمصادقة
class AuthCache {
  constructor() {
    this.cacheKey = 'auth_cache';
    this.cache = this.load();
  }

  // تحميل التخزين المؤقت من localStorage
  load() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  }

  // حفظ التخزين المؤقت في localStorage
  save() {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch (e) {
      console.error('فشل حفظ التخزين المؤقت للمصادقة:', e);
    }
  }

  // الحصول من التخزين المؤقت
  get(userId) {
    const entry = this.cache[userId];
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    return null;
  }

  // حفظ في التخزين المؤقت
  set(userId, data) {
    this.cache[userId] = {
      data: data,
      timestamp: Date.now()
    };
    this.save();
  }

  // التحقق من صلاحية التخزين المؤقت
  isCacheValid(entry) {
    if (!entry || !entry.timestamp) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    const config = window.AppConfig?.app?.security || {};
    const sessionTimeout = config.sessionTimeout || 3600; // ساعة واحدة افتراضيًا

    return age < sessionTimeout * 1000;
  }

  // مسح التخزين المؤقت
  clear(userId = null) {
    if (!userId) {
      this.cache = {};
    } else {
      delete this.cache[userId];
    }
    this.save();
  }
}

// إنشاء مثيل من تخزين المصادقة
const authCache = new AuthCache();

// التخزين المؤقت للصفحة
class PageCache {
  constructor() {
    this.cacheKey = 'page_cache';
    this.cache = this.load();
  }

  // تحميل التخزين المؤقت من sessionStorage
  load() {
    try {
      const cached = sessionStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  }

  // حفظ التخزين المؤقت في sessionStorage
  save() {
    try {
      sessionStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch (e) {
      console.error('فشل حفظ التخزين المؤقت للصفحة:', e);
    }
  }

  // الحصول من التخزين المؤقت
  get(pageId) {
    const entry = this.cache[pageId];
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    return null;
  }

  // حفظ في التخزين المؤقت
  set(pageId, data) {
    this.cache[pageId] = {
      data: data,
      timestamp: Date.now()
    };
    this.save();
  }

  // التحقق من صلاحية التخزين المؤقت
  isCacheValid(entry) {
    if (!entry || !entry.timestamp) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    const config = window.AppConfig?.app?.performance || {};
    const pageTimeout = config.pageTimeout || 300000; // 5 دقائق افتراضيًا

    return age < pageTimeout;
  }

  // مسح التخزين المؤقت
  clear(pageId = null) {
    if (!pageId) {
      this.cache = {};
    } else {
      delete this.cache[pageId];
    }
    this.save();
  }
}

// إنشاء مثيل من تخزين الصفحة
const pageCache = new PageCache();

// تصدير وحدات التخزين المؤقت
window.CacheManager = {
  cache: cacheManager,
  authCache: authCache,
  pageCache: pageCache
};

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تنظيف التخزين المؤchtig القديم
  cacheManager.clear();

  // عرض إحصائيات التخزين المؤقت في وحدة التحكم (في وضع التطوير)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setInterval(() => {
      const stats = cacheManager.getStats();
      console.log('إحصائيات التخزين المؤقت:', stats);
    }, 60000); // تحديث كل دقيقة
  }
});
