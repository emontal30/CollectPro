/**
 * نظام إدارة الحالة (State Manager) لتطبيق CollectPro
 * يقلل من استدعاءات الشبكة ويحسن الأداء
 */

// نظام إدارة الحالة
const StateManager = {
  state: {},
  listeners: {},
  cache: new Map(),
  cacheTimeout: 5 * 60 * 1000, // 5 دقائق

  /**
   * تعيين قيمة في الحالة
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    // إشعار المستمعين
    this.notifyListeners(key, value, oldValue);

    // حفظ في localStorage للحالة المهمة
    if (this.isPersistentState(key)) {
      this.saveToStorage(key, value);
    }

    console.log('تم تحديث الحالة:', key, value);
  },

  /**
   * الحصول على قيمة من الحالة
   */
  get(key, defaultValue = null) {
    return this.state[key] !== undefined ? this.state[key] : defaultValue;
  },

  /**
   * تحديث جزء من الحالة
   */
  update(key, updater) {
    const currentValue = this.get(key, {});
    const newValue = typeof updater === 'function' ? updater(currentValue) : { ...currentValue, ...updater };
    this.set(key, newValue);
  },

  /**
   * إضافة مستمع للتغييرات
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(callback);

    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      this.listeners[key].delete(callback);
    };
  },

  /**
   * إشعار المستمعين بالتغييرات
   */
  notifyListeners(key, newValue, oldValue) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error('خطأ في مستمع الحالة:', error);
        }
      });
    }
  },

  /**
   * حفظ البيانات في التخزين المحلي
   */
  saveToStorage(key, value) {
    try {
      const dataToStore = {
        value,
        timestamp: Date.now()
      };
      localStorage.setItem(`state_${key}`, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('خطأ في حفظ الحالة:', error);
    }
  },

  /**
   * تحميل البيانات من التخزين المحلي
   */
  loadFromStorage(key) {
    try {
      const stored = localStorage.getItem(`state_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        // التحقق من صلاحية البيانات (5 دقائق)
        if (Date.now() - data.timestamp < this.cacheTimeout) {
          return data.value;
        } else {
          localStorage.removeItem(`state_${key}`);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل الحالة:', error);
    }
    return null;
  },

  /**
   * التحقق من أن الحالة يجب أن تُحفظ محلياً
   */
  isPersistentState(key) {
    const persistentKeys = [
      'user',
      'settings',
      'preferences',
      'harvestData',
      'clientData',
      'masterLimit'
    ];
    return persistentKeys.includes(key);
  },

  /**
   * تحميل الحالة المحفوظة
   */
  loadPersistedState() {
    const persistentKeys = [
      'user',
      'settings',
      'preferences',
      'harvestData',
      'clientData',
      'masterLimit'
    ];

    persistentKeys.forEach(key => {
      const value = this.loadFromStorage(key);
      if (value !== null) {
        this.state[key] = value;
      }
    });
  },

  /**
   * مسح الحالة
   */
  clear(key) {
    if (key) {
      delete this.state[key];
      localStorage.removeItem(`state_${key}`);
    } else {
      this.state = {};
      this.clearAllStorage();
    }
  },

  /**
   * مسح جميع البيانات المحفوظة
   */
  clearAllStorage() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('state_')) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * الحصول على البيانات من الشبكة مع التخزين المؤقت
   */
  async fetchWithCache(url, options = {}) {
    const cacheKey = `network_${url}`;

    // التحقق من وجود البيانات في التخزين المؤقت
    const cached = this.getCache(cacheKey);
    if (cached && !options.forceRefresh) {
      console.log('إرجاع البيانات من التخزين المؤقت:', url);
      return cached;
    }

    try {
      console.log('جلب البيانات من الشبكة:', url);
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // حفظ في التخزين المؤقت
      this.setCache(cacheKey, data);

      return data;
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);

      // في حالة الخطأ، جرب إرجاع البيانات المحفوظة
      if (cached) {
        console.log('إرجاع البيانات المحفوظة بسبب خطأ في الشبكة');
        return cached;
      }

      throw error;
    }
  },

  /**
   * تعيين البيانات في التخزين المؤقت
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  /**
   * الحصول على البيانات من التخزين المؤقت
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  },

  /**
   * تنظيف التخزين المؤقت
   */
  clearCache() {
    this.cache.clear();
  },

  /**
   * تهيئة النظام
   */
  init() {
    // تحميل الحالة المحفوظة
    this.loadPersistedState();

    // تنظيف التخزين المؤقت كل 10 دقائق
    setInterval(() => {
      this.clearExpiredCache();
    }, 10 * 60 * 1000);

    console.log('تم تهيئة نظام إدارة الحالة');
  },

  /**
   * تنظيف التخزين المؤقت المنتهي الصلاحية
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
};

// تهيئة النظام
document.addEventListener('DOMContentLoaded', () => {
  StateManager.init();
});

// تصدير النظام
window.StateManager = StateManager;