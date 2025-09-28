/**
 * نظام تحسين SEO لتطبيق CollectPro
 * يحسن محركات البحث و Core Web Vitals
 */

// نظام تحسين SEO
const SEOOptimizer = {
  /**
   * تهيئة نظام SEO
   */
  init() {
    this.addMetaTags();
    this.setupStructuredData();
    this.optimizeOpenGraph();
    this.setupCanonicalURLs();
    this.addSecurityHeaders();
    this.optimizePerformance();
  },

  /**
   * إضافة meta tags أساسية
   */
  addMetaTags() {
    const pageInfo = this.getPageInfo();

    // عنوان الصفحة
    document.title = pageInfo.title;

    // Meta Description
    this.setMetaTag('description', pageInfo.description);

    // Meta Keywords
    this.setMetaTag('keywords', pageInfo.keywords);

    // Meta Author
    this.setMetaTag('author', 'أيمن حافظ');

    // Meta Robots
    this.setMetaTag('robots', 'index, follow');

    // Viewport
    this.setMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no');

    // Theme Color
    this.setMetaTag('theme-color', '#007965');

    // Language
    this.setMetaTag('language', 'Arabic');

    // Charset
    this.ensureCharset();
  },

  /**
   * الحصول على معلومات الصفحة الحالية
   */
  getPageInfo() {
    const path = window.location.pathname;
    const pages = {
      '/': {
        title: 'CollectPro - نظام إدارة التحصيلات والاشتراكات',
        description: 'نظام متكامل لإدارة التحصيلات والاشتراكات والمدفوعات. حلول ذكية لإدارة الأعمال وتتبع البيانات المالية.',
        keywords: 'تحصيلات, إدارة الأعمال, اشتراكات, مدفوعات, نظام إدارة, تطبيق ويب, إدارة مالية'
      },
      '/dashboard': {
        title: 'إدخال البيانات - CollectPro',
        description: 'صفحة إدخال وإدارة البيانات في نظام CollectPro. أدوات متطورة لإدخال ومعالجة البيانات بكفاءة عالية.',
        keywords: 'إدخال البيانات, إدارة البيانات, معالجة البيانات, CollectPro, نظام إدارة'
      },
      '/harvest': {
        title: 'التحصيلات - CollectPro',
        description: 'إدارة التحصيلات والمحصلين في نظام CollectPro. تتبع وإدارة عمليات التحصيل بطريقة احترافية.',
        keywords: 'التحصيلات, المحصلين, إدارة التحصيل, تتبع التحصيل, CollectPro'
      },
      '/archive': {
        title: 'الأرشيف - CollectPro',
        description: 'عرض وإدارة الأرشيف في نظام CollectPro. حفظ وتنظيم البيانات التاريخية بأمان وكفاءة.',
        keywords: 'الأرشيف, البيانات المؤرشفة, حفظ البيانات, إدارة الأرشيف, CollectPro'
      },
      '/subscriptions': {
        title: 'الاشتراكات - CollectPro',
        description: 'إدارة الاشتراكات في نظام CollectPro. حلول شاملة لإدارة الاشتراكات والعملاء.',
        keywords: 'الاشتراكات, إدارة العملاء, اشتراكات العملاء, CollectPro'
      },
      '/my-subscription': {
        title: 'اشتراكي - CollectPro',
        description: 'إدارة اشتراكك الشخصي في نظام CollectPro. متابعة حالة الاشتراك والمدفوعات.',
        keywords: 'اشتراكي, إدارة الاشتراك, متابعة الاشتراك, CollectPro'
      },
      '/payment': {
        title: 'المدفوعات - CollectPro',
        description: 'إدارة المدفوعات في نظام CollectPro. معالجة وتتبع المدفوعات بأمان ودقة.',
        keywords: 'المدفوعات, معالجة المدفوعات, تتبع المدفوعات, CollectPro'
      },
      '/admin': {
        title: 'إدارة النظام - CollectPro',
        description: 'لوحة إدارة النظام في CollectPro. أدوات الإدارة والتحكم في النظام.',
        keywords: 'إدارة النظام, لوحة التحكم, إدارة المستخدمين, CollectPro'
      }
    };

    return pages[path] || pages['/'];
  },

  /**
   * تعيين meta tag
   */
  setMetaTag(name, content) {
    if (!content) return;

    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  },

  /**
   * تعيين meta property (للـ Open Graph)
   */
  setMetaProperty(property, content) {
    if (!content) return;

    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  },

  /**
   * إعداد البيانات المنظمة (Structured Data)
   */
  setupStructuredData() {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "CollectPro",
      "description": "نظام متكامل لإدارة التحصيلات والاشتراكات والمدفوعات",
      "url": window.location.origin,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "author": {
        "@type": "Person",
        "name": "أيمن حافظ"
      },
      "publisher": {
        "@type": "Person",
        "name": "أيمن حافظ"
      }
    };

    let script = document.querySelector('#structured-data');
    if (!script) {
      script = document.createElement('script');
      script.id = 'structured-data';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
  },

  /**
   * تحسين Open Graph
   */
  optimizeOpenGraph() {
    const pageInfo = this.getPageInfo();

    // Open Graph Title
    this.setMetaProperty('og:title', pageInfo.title);

    // Open Graph Description
    this.setMetaProperty('og:description', pageInfo.description);

    // Open Graph URL
    this.setMetaProperty('og:url', window.location.href);

    // Open Graph Type
    this.setMetaProperty('og:type', 'website');

    // Open Graph Site Name
    this.setMetaProperty('og:site_name', 'CollectPro');

    // Open Graph Locale
    this.setMetaProperty('og:locale', 'ar_SA');

    // Twitter Card
    this.setMetaTag('twitter:card', 'summary_large_image');
    this.setMetaTag('twitter:title', pageInfo.title);
    this.setMetaTag('twitter:description', pageInfo.description);
  },

  /**
   * إعداد Canonical URLs
   */
  setupCanonicalURLs() {
    const canonicalURL = window.location.origin + window.location.pathname;

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalURL;
  },

  /**
   * إضافة رؤوس الأمان
   */
  addSecurityHeaders() {
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', csp);

    // X-Frame-Options
    this.setMetaTag('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    this.setMetaTag('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    this.setMetaTag('referrer', 'strict-origin-when-cross-origin');
  },

  /**
   * تحسين الأداء
   */
  optimizePerformance() {
    // Preconnect للموارد الخارجية
    this.addPreconnectLink('https://fonts.googleapis.com');
    this.addPreconnectLink('https://fonts.gstatic.com');
    this.addPreconnectLink('https://cdnjs.cloudflare.com');

    // DNS Prefetch
    this.addDNSPrefetch('https://*.supabase.co');

    // Preload للموارد المهمة (تجنب preload للملفات المحلية لتجنب مشاكل CORS)
    // this.addPreloadLink('/script.js', 'script');
    // this.addPreloadLink('/style.css', 'style');
  },

  /**
   * إضافة رابط Preconnect
   */
  addPreconnectLink(href) {
    if (document.querySelector(`link[href="${href}"][rel="preconnect"]`)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  },

  /**
   * إضافة DNS Prefetch
   */
  addDNSPrefetch(href) {
    if (document.querySelector(`link[href="${href}"][rel="dns-prefetch"]`)) return;

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;
    document.head.appendChild(link);
  },

  /**
   * إضافة رابط Preload
   */
  addPreloadLink(href, as) {
    if (document.querySelector(`link[href="${href}"][rel="preload"]`)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  },

  /**
   * ضمان وجود charset
   */
  ensureCharset() {
    let charset = document.querySelector('meta[charset]');
    if (!charset) {
      charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.insertBefore(charset, document.head.firstChild);
    }
  },

  /**
   * تحديث meta tags عند تغيير الصفحة
   */
  updateForPage(path) {
    const pageInfo = this.getPageInfoForPath(path);
    this.setMetaTag('description', pageInfo.description);
    this.setMetaTag('keywords', pageInfo.keywords);
    document.title = pageInfo.title;

    // تحديث Open Graph
    this.setMetaProperty('og:title', pageInfo.title);
    this.setMetaProperty('og:description', pageInfo.description);
    this.setMetaProperty('og:url', window.location.origin + path);
  },

  /**
   * الحصول على معلومات الصفحة من path
   */
  getPageInfoForPath(path) {
    const pages = {
      '/': {
        title: 'CollectPro - نظام إدارة التحصيلات والاشتراكات',
        description: 'نظام متكامل لإدارة التحصيلات والاشتراكات والمدفوعات. حلول ذكية لإدارة الأعمال وتتبع البيانات المالية.',
        keywords: 'تحصيلات, إدارة الأعمال, اشتراكات, مدفوعات, نظام إدارة, تطبيق ويب, إدارة مالية'
      },
      '/dashboard': {
        title: 'إدخال البيانات - CollectPro',
        description: 'صفحة إدخال وإدارة البيانات في نظام CollectPro. أدوات متطورة لإدخال ومعالجة البيانات بكفاءة عالية.',
        keywords: 'إدخال البيانات, إدارة البيانات, معالجة البيانات, CollectPro, نظام إدارة'
      },
      '/harvest': {
        title: 'التحصيلات - CollectPro',
        description: 'إدارة التحصيلات والمحصلين في نظام CollectPro. تتبع وإدارة عمليات التحصيل بطريقة احترافية.',
        keywords: 'التحصيلات, المحصلين, إدارة التحصيل, تتبع التحصيل, CollectPro'
      },
      '/archive': {
        title: 'الأرشيف - CollectPro',
        description: 'عرض وإدارة الأرشيف في نظام CollectPro. حفظ وتنظيم البيانات التاريخية بأمان وكفاءة.',
        keywords: 'الأرشيف, البيانات المؤرشفة, حفظ البيانات, إدارة الأرشيف, CollectPro'
      }
    };

    return pages[path] || pages['/'];
  }
};

// تهيئة نظام SEO
document.addEventListener('DOMContentLoaded', () => {
  SEOOptimizer.init();
});

// تصدير النظام
window.SEOOptimizer = SEOOptimizer;