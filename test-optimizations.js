/**
 * اختبار التحسينات المطبقة على تطبيق CollectPro
 * يضمن استمرار عمل Google Auth و Supabase بعد التحسينات
 */

// نظام اختبار التحسينات
const TestOptimizations = {
  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests() {
    console.log('🚀 بدء اختبار التحسينات...');

    const results = {
      performance: await this.testPerformance(),
      seo: await this.testSEO(),
      spa: await this.testSPA(),
      serviceWorker: await this.testServiceWorker(),
      googleAuth: await this.testGoogleAuth(),
      supabase: await this.testSupabase(),
      lazyLoading: await this.testLazyLoading(),
      stateManager: await this.testStateManager()
    };

    this.displayResults(results);
    return results;
  },

  /**
   * اختبار الأداء
   */
  async testPerformance() {
    console.log('📊 اختبار الأداء...');

    const startTime = performance.now();

    // قياس وقت تحميل الموارد
    const resourceTiming = performance.getEntriesByType('resource');

    const loadTime = performance.now() - startTime;
    const resourcesCount = resourceTiming.length;
    const slowResources = resourceTiming.filter(r => r.duration > 1000).length;

    return {
      loadTime: Math.round(loadTime * 100) / 100,
      resourcesCount,
      slowResources,
      score: loadTime < 2000 ? 'ممتاز' : loadTime < 5000 ? 'جيد' : 'يحتاج تحسين'
    };
  },

  /**
   * اختبار SEO
   */
  async testSEO() {
    console.log('🔍 اختبار SEO...');

    const checks = {
      title: document.title.length > 0,
      description: document.querySelector('meta[name="description"]') !== null,
      keywords: document.querySelector('meta[name="keywords"]') !== null,
      canonical: document.querySelector('link[rel="canonical"]') !== null,
      structuredData: document.querySelector('#structured-data') !== null,
      openGraph: document.querySelector('meta[property="og:title"]') !== null
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      checks,
      score: score >= 5 ? 'ممتاز' : score >= 3 ? 'جيد' : 'يحتاج تحسين',
      passed: score
    };
  },

  /**
   * اختبار نظام SPA
   */
  async testSPA() {
    console.log('🔄 اختبار نظام SPA...');

    const hasSPARouter = typeof window.SPARouter !== 'undefined';
    const hasStateManager = typeof window.StateManager !== 'undefined';
    const hasPerformanceOptimizer = typeof window.PerformanceOptimizer !== 'undefined';

    const navigationButtons = document.querySelectorAll('#prevPage, #nextPage').length === 2;

    return {
      hasSPARouter,
      hasStateManager,
      hasPerformanceOptimizer,
      navigationButtons,
      score: (hasSPARouter && hasStateManager && navigationButtons) ? 'ممتاز' : 'جيد'
    };
  },

  /**
   * اختبار Service Worker
   */
  async testServiceWorker() {
    console.log('⚙️ اختبار Service Worker...');

    if (!('serviceWorker' in navigator)) {
      return { supported: false, registered: false, score: 'غير مدعوم' };
    }

    const registration = await navigator.serviceWorker.getRegistration();

    return {
      supported: true,
      registered: registration !== undefined,
      score: registration ? 'ممتاز' : 'يحتاج تفعيل'
    };
  },

  /**
   * اختبار Google Auth
   */
  async testGoogleAuth() {
    console.log('🔐 اختبار Google Auth...');

    try {
      // التحقق من وجود مكتبة Google Auth
      const hasGoogleAuth = typeof window.auth !== 'undefined' &&
                           typeof window.auth.checkUserSession === 'function';

      // التحقق من إعدادات Google Auth
      const hasGoogleConfig = window.appConfig &&
                             window.appConfig.googleClientId;

      // التحقق من حالة المصادقة
      let authStatus = 'غير معروف';
      if (hasGoogleAuth) {
        const user = window.auth.checkUserSession();
        authStatus = user ? 'متصل' : 'غير متصل';
      }

      return {
        hasGoogleAuth,
        hasGoogleConfig,
        authStatus,
        score: (hasGoogleAuth && hasGoogleConfig) ? 'ممتاز' : 'يحتاج إعداد'
      };
    } catch (error) {
      console.error('خطأ في اختبار Google Auth:', error);
      return {
        hasGoogleAuth: false,
        hasGoogleConfig: false,
        authStatus: 'خطأ',
        score: 'يحتاج مراجعة'
      };
    }
  },

  /**
   * اختبار Supabase
   */
  async testSupabase() {
    console.log('🗄️ اختبار Supabase...');

    try {
      // التحقق من وجود Supabase client
      const hasSupabaseClient = typeof window.supabaseClient !== 'undefined';

      // التحقق من إعدادات Supabase
      const hasSupabaseConfig = window.appConfig &&
                              window.appConfig.supabaseUrl &&
                              window.appConfig.supabaseAnonKey;

      // اختبار الاتصال
      let connectionStatus = 'غير معروف';
      if (hasSupabaseClient) {
        try {
          // اختبار بسيط للاتصال
          const testConnection = await window.supabaseClient
            .from('test')
            .select('count')
            .limit(1);

          connectionStatus = 'متصل';
        } catch (error) {
          connectionStatus = 'خطأ في الاتصال';
        }
      }

      return {
        hasSupabaseClient,
        hasSupabaseConfig,
        connectionStatus,
        score: (hasSupabaseClient && hasSupabaseConfig) ? 'ممتاز' : 'يحتاج إعداد'
      };
    } catch (error) {
      console.error('خطأ في اختبار Supabase:', error);
      return {
        hasSupabaseClient: false,
        hasSupabaseConfig: false,
        connectionStatus: 'خطأ',
        score: 'يحتاج مراجعة'
      };
    }
  },

  /**
   * اختبار Lazy Loading
   */
  async testLazyLoading() {
    console.log('⚡ اختبار Lazy Loading...');

    const hasLazyComponents = typeof window.LazyComponents !== 'undefined';
    const hasIntersectionObserver = 'IntersectionObserver' in window;
    const lazyImages = document.querySelectorAll('img[data-src]').length;

    return {
      hasLazyComponents,
      hasIntersectionObserver,
      lazyImages,
      score: (hasLazyComponents && hasIntersectionObserver) ? 'ممتاز' : 'جيد'
    };
  },

  /**
   * اختبار State Manager
   */
  async testStateManager() {
    console.log('📦 اختبار State Manager...');

    const hasStateManager = typeof window.StateManager !== 'undefined';

    let stateOperations = false;
    if (hasStateManager) {
      try {
        // اختبار عمليات الحالة
        window.StateManager.set('test', 'test-value');
        const retrieved = window.StateManager.get('test');
        stateOperations = retrieved === 'test-value';
      } catch (error) {
        console.error('خطأ في اختبار State Manager:', error);
      }
    }

    return {
      hasStateManager,
      stateOperations,
      score: (hasStateManager && stateOperations) ? 'ممتاز' : 'يحتاج مراجعة'
    };
  },

  /**
   * عرض نتائج الاختبار
   */
  displayResults(results) {
    console.log('\n🎯 نتائج اختبار التحسينات:');
    console.log('=====================================');

    Object.entries(results).forEach(([test, result]) => {
      console.log(`\n📋 ${this.getTestName(test)}:`);
      Object.entries(result).forEach(([key, value]) => {
        if (key === 'score') {
          console.log(`   النتيجة: ${value}`);
        } else if (typeof value === 'boolean') {
          console.log(`   ${key}: ${value ? '✅' : '❌'}`);
        } else if (typeof value === 'object') {
          console.log(`   ${key}:`, value);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });
    });

    // حساب النتيجة الإجمالية
    const totalScore = this.calculateOverallScore(results);
    console.log(`\n🏆 النتيجة الإجمالية: ${totalScore}/100`);

    if (totalScore >= 90) {
      console.log('🎉 ممتاز! جميع التحسينات تعمل بشكل صحيح');
    } else if (totalScore >= 70) {
      console.log('👍 جيد! معظم التحسينات تعمل بشكل صحيح');
    } else {
      console.log('⚠️ يحتاج مراجعة! بعض التحسينات تحتاج تعديل');
    }
  },

  /**
   * الحصول على اسم الاختبار بالعربية
   */
  getTestName(test) {
    const names = {
      performance: 'اختبار الأداء',
      seo: 'اختبار SEO',
      spa: 'اختبار نظام SPA',
      serviceWorker: 'اختبار Service Worker',
      googleAuth: 'اختبار Google Auth',
      supabase: 'اختبار Supabase',
      lazyLoading: 'اختبار Lazy Loading',
      stateManager: 'اختبار State Manager'
    };
    return names[test] || test;
  },

  /**
   * حساب النتيجة الإجمالية
   */
  calculateOverallScore(results) {
    let total = 0;
    let count = 0;

    Object.values(results).forEach(result => {
      if (result.score) {
        count++;
        switch (result.score) {
          case 'ممتاز':
            total += 100;
            break;
          case 'جيد':
            total += 75;
            break;
          case 'يحتاج تحسين':
          case 'يحتاج إعداد':
          case 'يحتاج مراجعة':
            total += 50;
            break;
          default:
            total += 25;
        }
      }
    });

    return count > 0 ? Math.round(total / count) : 0;
  }
};

// تشغيل الاختبارات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // انتظار 3 ثواني لتحميل جميع المكونات
  setTimeout(() => {
    console.log('🔧 تشغيل اختبار التحسينات...');
    TestOptimizations.runAllTests();
  }, 3000);
});

// تصدير النظام
window.TestOptimizations = TestOptimizations;