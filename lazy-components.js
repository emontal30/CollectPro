/**
 * نظام التحميل الكسول للمكونات الثقيلة
 * يحسن أداء التطبيق بتحميل المكونات عند الحاجة فقط
 */

// نظام التحميل الكسول
const LazyComponents = {
  loadedComponents: new Set(),

  /**
   * تحميل مكون بطريقة كسولة
   */
  async loadComponent(componentName, element) {
    if (this.loadedComponents.has(componentName)) {
      return;
    }

    try {
      switch (componentName) {
        case 'charts':
          await this.loadChartsLibrary(element);
          break;
        case 'calendar':
          await this.loadCalendarLibrary(element);
          break;
        case 'maps':
          await this.loadMapsLibrary(element);
          break;
        case 'editor':
          await this.loadRichTextEditor(element);
          break;
        case 'pdf-viewer':
          await this.loadPDFViewer(element);
          break;
        default:
          console.log('مكون غير معروف:', componentName);
      }

      this.loadedComponents.add(componentName);
    } catch (error) {
      console.error('خطأ في تحميل المكون:', componentName, error);
    }
  },

  /**
   * تحميل مكتبة المخططات
   */
  async loadChartsLibrary(element) {
    if (window.Chart) return; // مكتبة موجودة بالفعل

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {
        console.log('تم تحميل Chart.js بنجاح');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * تحميل مكتبة التقويم
   */
  async loadCalendarLibrary(element) {
    if (window.FullCalendar) return;

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@5/main.min.css';

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@5/main.min.js';
      script.onload = () => {
        console.log('تم تحميل FullCalendar بنجاح');
        resolve();
      };
      script.onerror = reject;

      document.head.appendChild(link);
      document.head.appendChild(script);
    });
  },

  /**
   * تحميل مكتبة الخرائط
   */
  async loadMapsLibrary(element) {
    if (window.google && window.google.maps) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
      script.onload = () => {
        console.log('تم تحميل Google Maps بنجاح');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * تحميل محرر النصوص المتقدم
   */
  async loadRichTextEditor(element) {
    if (window.TinyMCE || window.CKEditor) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
      script.onload = () => {
        console.log('تم تحميل TinyMCE بنجاح');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * تحميل عارض PDF
   */
  async loadPDFViewer(element) {
    if (window.PDFJS) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        console.log('تم تحميل PDF.js بنجاح');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * مراقبة العناصر التي تحتاج تحميل كسول
   */
  observeLazyElements() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const componentName = element.dataset.lazyComponent;

          if (componentName) {
            this.loadComponent(componentName, element);
            observer.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '100px'
    });

    // مراقبة العناصر التي تحتوي على data-lazy-component
    document.querySelectorAll('[data-lazy-component]').forEach(element => {
      observer.observe(element);
    });
  },

  /**
   * تحميل المكونات الكسولة للصفحة الحالية
   */
  loadPageComponents(pageName) {
    const pageComponents = {
      dashboard: ['charts'],
      harvest: ['calendar'],
      archive: ['pdf-viewer'],
      admin: ['charts', 'editor'],
      subscriptions: ['calendar'],
      payment: ['charts']
    };

    const components = pageComponents[pageName] || [];

    components.forEach(component => {
      // البحث عن العناصر التي تحتاج هذا المكون
      document.querySelectorAll(`[data-lazy-component="${component}"]`).forEach(element => {
        this.loadComponent(component, element);
      });
    });
  },

  /**
   * تهيئة النظام
   */
  init() {
    this.observeLazyElements();

    // تحميل المكونات الخاصة بالصفحة الحالية
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
    this.loadPageComponents(currentPage);

    console.log('تم تهيئة نظام التحميل الكسول');
  }
};

// تهيئة النظام
document.addEventListener('DOMContentLoaded', () => {
  LazyComponents.init();
});

// تصدير النظام
window.LazyComponents = LazyComponents;