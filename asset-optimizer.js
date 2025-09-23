// ========== مدير تحسين الأصول ========== //

// تحميل الصور بشكل كسول
class LazyLoader {
  constructor() {
    this.observer = null;
    this.init();
  }

  // التهيئة
  init() {
    // التحقق من دعم IntersectionObserver
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      // مراقبة جميع الصور التي لها class="lazy"
      document.querySelectorAll('img.lazy').forEach(img => {
        this.observer.observe(img);
      });
    } else {
      // عدم دعم IntersectionObserver - تحميل جميع الصور فورًا
      document.querySelectorAll('img.lazy').forEach(img => {
        this.loadImage(img);
      });
    }
  }

  // تحميل الصورة
  loadImage(img) {
    const src = img.dataset.src || img.getAttribute('data-src');
    if (!src) return;

    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
    };
    tempImg.onerror = () => {
      img.classList.remove('lazy');
      img.classList.add('error');
    };
    tempImg.src = src;
  }
}

// تحسين الصور
class ImageOptimizer {
  constructor() {
    this.formats = ['webp', 'avif', 'jpeg', 'png'];
    this.qualities = [20, 40, 60, 80];
    this.sizes = ['small', 'medium', 'large'];
    this.init();
  }

  // التهيئة
  init() {
    // استبدال جميع الصور بتحسينات
    document.querySelectorAll('img').forEach(img => {
      this.optimizeImage(img);
    });

    // استبدال الخلفيات
    document.querySelectorAll('[style*="background-image"]').forEach(element => {
      this.optimizeBackground(element);
    });
  }

  // تحسين الصورة
  async optimizeImage(img) {
    if (img.dataset.optimized) return;

    const src = img.src;
    if (!src) return;

    // إنشاء مصفوفة من الأحجام والصيغ
    const variations = [];

    this.sizes.forEach(size => {
      this.formats.forEach(format => {
        this.qualities.forEach(quality => {
          variations.push({
            format,
            quality,
            size,
            url: this.generateOptimizedUrl(src, format, quality, size)
          });
        });
      });
    });

    // اختيار أفضل تنسيق مدعوم
    const bestFormat = this.getSupportedFormat();

    // تحديث src الصورة
    const bestVariation = variations.find(v => v.format === bestFormat);
    if (bestVariation) {
      img.dataset.originalSrc = src;
      img.src = bestVariation.url;
      img.dataset.optimized = 'true';
    }
  }

  // تحسين الخلفيات
  async optimizeBackground(element) {
    if (element.dataset.optimized) return;

    const style = element.getAttribute('style');
    const match = style.match(/background-image:\s*url\(["']?(.*?)["']?\)/);

    if (!match || !match[1]) return;

    const originalUrl = match[1];
    const bestFormat = this.getSupportedFormat();
    const optimizedUrl = this.generateOptimizedUrl(originalUrl, bestFormat, 80, 'large');

    element.dataset.originalBackground = originalUrl;
    element.style.backgroundImage = `url(${optimizedUrl})`;
    element.dataset.optimized = 'true';
  }

  // إنشاء URL للصورة المحسنة
  generateOptimizedUrl(originalUrl, format, quality, size) {
    const config = window.AppConfig || {};
    const hosting = config.hosting || {};
    const cdnUrl = hosting.cdnEnabled ? `${hosting.domain}/cdn/` : '';

    // استخراج اسم الملف من الرابط الأصلي
    const filename = originalUrl.split('/').pop().split('?')[0];

    // إضافة البادئة واللاحقة
    const sizePrefix = size === 'small' ? 'thumb_' : size === 'medium' ? 'med_' : '';
    const formatExtension = format === 'jpeg' ? 'jpg' : format;

    return `${cdnUrl}${sizePrefix}${filename.split('.')[0]}.${formatExtension}?q=${quality}&format=${format}`;
  }

  // الحصول على أفضل تنسيق مدعوم
  getSupportedFormat() {
    const formats = ['avif', 'webp', 'jpeg', 'png'];

    for (const format of formats) {
      if (this.isFormatSupported(format)) {
        return format;
      }
    }

    return 'jpeg';
  }

  // التحقق من دعم تنسيق معين
  isFormatSupported(format) {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
  }
}

// إدارة الذاكرة المؤقتة للأصول
class AssetCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // الحد الأقصى لعدد الأصول المخزنة مؤقتًا
    this.init();
  }

  // التهيئة
  init() {
    // محاولة استخدام Cache API إذا كان مدعومًا
    if ('caches' in window) {
      this.cacheAPI = caches.open('asset-cache');
    }
  }

  // الحصول من التخزين المؤقت
  async get(url) {
    // التحقق من التخزين المؤقت الداخلي
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    // التحقق من Cache API
    if (this.cacheAPI) {
      const cache = await this.cacheAPI;
      const cached = await cache.match(url);
      if (cached) {
        const blob = await cached.blob();
        this.cache.set(url, blob);
        return blob;
      }
    }

    return null;
  }

  // حفظ في التخزين المؤقت
  async set(url, data) {
    // حفظ في التخزين المؤقت الداخلي
    this.cache.set(url, data);

    // الحفاظ على الحد الأقصى للحجم
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    // حفظ في Cache API
    if (this.cacheAPI) {
      const cache = await this.cacheAPI;
      await cache.put(url, new Response(data));
    }
  }

  // مسح التخزين المؤقت
  async clear() {
    this.cache.clear();

    if (this.cacheAPI) {
      const cache = await this.cacheAPI;
      await cache.delete('asset-cache');
    }
  }
}

// إدارة الطلب الموحد للملفات
class AssetLoader {
  constructor() {
    this.loadedAssets = new Set();
    this.loadingAssets = new Map();
    this.init();
  }

  // التهيئة
  init() {
    // تحميل الأصول الأساسية
    this.loadCriticalAssets();
  }

  // تحميل الأصول الأساسية
  async loadCriticalAssets() {
    const criticalAssets = [
      '/css/style.css',
      '/js/script.js',
      '/js/sidebar.js'
    ];

    const promises = criticalAssets.map(asset => this.loadAsset(asset));
    await Promise.all(promises);
  }

  // تحميل أصل معين
  async loadAsset(url) {
    // التحقق مما إذا كان الأصل قد تم تحميله بالفعل
    if (this.loadedAssets.has(url)) {
      return Promise.resolve();
    }

    // التحقق مما إذا كان الأصل قيد التحميل بالفعل
    if (this.loadingAssets.has(url)) {
      return this.loadingAssets.get(url);
    }

    // إنشاء وعد بالتحميل
    const promise = new Promise((resolve, reject) => {
      const element = this.createElement(url);

      element.onload = () => {
        this.loadedAssets.add(url);
        this.loadingAssets.delete(url);
        resolve();
      };

      element.onerror = () => {
        this.loadingAssets.delete(url);
        reject(new Error(`فشل تحميل الأصل: ${url}`));
      };

      // إضافة العنصر إلى الصفحة
      document.head.appendChild(element);
    });

    // تخزين الوعد
    this.loadingAssets.set(url, promise);

    return promise;
  }

  // إنشاء عنصر HTML بناءً على نوع الملف
  createElement(url) {
    const extension = url.split('.').pop().toLowerCase();

    if (extension === 'css') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      return link;
    } else if (['js', 'mjs'].includes(extension)) {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      return script;
    } else {
      // معالجة أنواع الملفات الأخرى
      const img = document.createElement('img');
      img.src = url;
      return img;
    }
  }
}

// إدارة تحميل الموارد المسبق
class ResourcePreloader {
  constructor() {
    this.preloaded = new Set();
    this.criticalResources = [
      '/css/style.css',
      '/js/script.js',
      '/js/sidebar.js',
      '/js/auth.js'
    ];
    this.nonCriticalResources = [
      '/css/admin.css',
      '/css/login.css',
      '/css/payment.css',
      '/css/subscriptions.css'
    ];
  }

  // تحميل الموارد الحرجة
  preloadCritical() {
    this.criticalResources.forEach(resource => {
      this.preloadResource(resource, 'high');
    });
  }

  // تحميل الموارد غير الحرجة
  preloadNonCritical() {
    setTimeout(() => {
      this.nonCriticalResources.forEach(resource => {
        this.preloadResource(resource, 'low');
      });
    }, 2000);
  }

  // تحميل مورد معين
  preloadResource(url, priority = 'auto') {
    if (this.preloaded.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'preload';

    // تحديد نوع المورد
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
      case 'css':
        link.as = 'style';
        break;
      case 'js':
      case 'mjs':
        link.as = 'script';
        break;
      case 'woff2':
      case 'woff':
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        break;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'avif':
        link.as = 'image';
        break;
      default:
        link.as = 'fetch';
    }

    link.href = this.getCdnUrl(url);
    link.fetchPriority = priority;

    // إضافة إلى DOM
    document.head.appendChild(link);
    this.preloaded.add(url);

    // تتبع التحميل
    link.onload = () => {
      if (window.PerformanceMonitor?.eventTracker) {
        window.PerformanceMonitor.eventTracker.trackEvent('resource_preloaded', {
          url,
          priority,
          type: link.as
        });
      }
    };

    link.onerror = () => {
      console.warn(`فشل تحميل المورد المسبق: ${url}`);
    };
  }

  // الحصول على رابط CDN
  getCdnUrl(url) {
    const config = window.AppConfig?.hosting || {};
    if (config.cdnEnabled && config.domain) {
      return `${config.domain}${url}`;
    }
    return url;
  }

  // تحميل الموارد بناءً على الصفحة الحالية
  preloadPageResources() {
    const path = window.location.pathname;

    // موارد خاصة بكل صفحة
    const pageResources = {
      '/': ['/js/login.js'],
      '/login': ['/js/login.js'],
      '/register': ['/js/login.js'],
      '/dashboard': ['/js/script.js', '/js/sidebar.js'],
      '/admin': ['/js/admin.js', '/css/admin.css'],
      '/subscriptions': ['/js/subscriptions.js', '/css/subscriptions.css'],
      '/payment': ['/js/payment.js', '/css/payment.css'],
      '/harvest': ['/js/harvest.js', '/css/harvest.css']
    };

    const resources = pageResources[path];
    if (resources) {
      resources.forEach(resource => {
        this.preloadResource(resource, 'high');
      });
    }
  }
}

// إنشاء مثيلات من الفئات
const lazyLoader = new LazyLoader();
const imageOptimizer = new ImageOptimizer();
const assetCache = new AssetCache();
const assetLoader = new AssetLoader();
const resourcePreloader = new ResourcePreloader();

// تصدير وحدة تحسين الأصول
window.AssetOptimizer = {
  lazyLoader,
  imageOptimizer,
  assetCache,
  assetLoader,
  resourcePreloader
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تحميل الموارد الحرجة مسبقًا
  resourcePreloader.preloadCritical();

  // تحميل موارد الصفحة الحالية
  resourcePreloader.preloadPageResources();

  // تحميل الأصول غير الأساسية بشكل كسول
  setTimeout(() => {
    resourcePreloader.preloadNonCritical();

    const nonCriticalAssets = [
      '/css/admin.css',
      '/css/login.css',
      '/css/harvest.css'
    ];

    nonCriticalAssets.forEach(asset => {
      assetLoader.loadAsset(asset).catch(error => {
        console.error('فشل تحميل الأصول غير الأساسية:', error);
      });
    });
  }, 2000); // بعد ثانيتين من تحميل الصفحة
});
