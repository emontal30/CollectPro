/**
 * نظام تحسين الأداء لتطبيق CollectPro
 * يشمل Lazy Loading وتحسينات Core Web Vitals
 */

// نظام تحسين الأداء
const PerformanceOptimizer = {
  /**
   * تهيئة نظام تحسين الأداء
   */
  init() {
    this.setupLazyLoading();
    this.optimizeImages();
    this.setupIntersectionObserver();
    this.preloadCriticalResources();
    this.setupServiceWorker();
    this.optimizeFonts();
  },

  /**
   * إعداد Lazy Loading للمكونات الثقيلة
   */
  setupLazyLoading() {
    // Lazy load للصور
    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback للمتصفحات القديمة
      images.forEach(img => {
        img.src = img.dataset.src;
      });
    }
  },

  /**
   * تحسين الصور
   */
  optimizeImages() {
    const images = document.querySelectorAll('img');

    images.forEach(img => {
      // إضافة loading="lazy" للصور تحت خط الرؤية
      if (!img.hasAttribute('loading')) {
        const rect = img.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          img.setAttribute('loading', 'lazy');
        }
      }

      // إضافة decode للصور المهمة
      if (img.complete) {
        img.decode().catch(() => {});
      }
    });
  },

  /**
   * إعداد Intersection Observer للتحميل الكسول
   */
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    // Observer للتحميل الكسول للمحتوى
    this.contentObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          element.classList.add('loaded');

          // تحميل المحتوى المخفي
          if (element.dataset.loadContent) {
            this.loadContent(element, element.dataset.loadContent);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });

    // مراقبة العناصر التي تحتاج تحميل كسول
    document.querySelectorAll('[data-load-content]').forEach(element => {
      this.contentObserver.observe(element);
    });
  },

  /**
   * تحميل المحتوى الكسول
   */
  async loadContent(element, contentType) {
    try {
      switch (contentType) {
        case 'charts':
          // تحميل المخططات عند الحاجة
          await this.loadCharts(element);
          break;
        case 'tables':
          // تحميل الجداول الكبيرة عند الحاجة
          await this.loadLargeTables(element);
          break;
        default:
          console.log('نوع المحتوى غير معروف:', contentType);
      }
    } catch (error) {
      console.error('خطأ في تحميل المحتوى:', error);
    }
  },

  /**
   * تحميل المخططات
   */
  async loadCharts(element) {
    // يمكن إضافة مكتبات المخططات هنا عند الحاجة
    console.log('تحميل المخططات للعنصر:', element);
  },

  /**
   * تحميل الجداول الكبيرة
   */
  async loadLargeTables(element) {
    // تحميل بيانات الجداول الكبيرة عند الحاجة
    console.log('تحميل الجداول الكبيرة للعنصر:', element);
  },

  /**
   * تحميل الموارد الحرجة مسبقاً
   */
  preloadCriticalResources() {
    // تحميل خطوط Google Fonts مسبقاً
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap';
    fontLink.as = 'style';
    fontLink.onload = function() {
      this.onload = null;
      this.rel = 'stylesheet';
    };
    document.head.appendChild(fontLink);

    // تحميل Font Awesome مسبقاً
    const faLink = document.createElement('link');
    faLink.rel = 'preload';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    faLink.as = 'style';
    faLink.onload = function() {
      this.onload = null;
      this.rel = 'stylesheet';
    };
    document.head.appendChild(faLink);
  },

  /**
    * إعداد Service Worker للتخزين المؤقت
    */
   setupServiceWorker() {
     if ('serviceWorker' in navigator) {
       // فحص أن التطبيق يعمل على HTTP/HTTPS وليس file://
       if (window.location.protocol === 'file:') {
         console.log('Service Worker غير مدعوم في file:// protocol');
         return;
       }

       window.addEventListener('load', () => {
         navigator.serviceWorker.register('/sw.js')
           .then(registration => {
             console.log('Service Worker مسجل بنجاح:', registration);
           })
           .catch(error => {
             console.log('فشل في تسجيل Service Worker:', error);
           });
       });
     }
   },

  /**
   * تحسين الخطوط
   */
  optimizeFonts() {
    // استخدام font-display: swap لتحسين LCP
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Cairo';
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * مراقبة أداء الصفحة
   */
  monitorPerformance() {
    // مراقبة Core Web Vitals
    if ('web-vitals' in window) {
      // يمكن إضافة مراقبة Web Vitals هنا
    }

    // مراقبة أداء الموارد
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 1000) {
              console.warn('عنصر بطيء في التحميل:', entry.name, entry.duration + 'ms');
            }
          });
        });

        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('فشل في مراقبة الأداء:', error);
      }
    }
  }
};

// تهيئة نظام تحسين الأداء
document.addEventListener('DOMContentLoaded', () => {
  PerformanceOptimizer.init();
  PerformanceOptimizer.monitorPerformance();
});

// تصدير النظام
window.PerformanceOptimizer = PerformanceOptimizer;