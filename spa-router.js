/**
 * نظام SPA Router لتطبيق CollectPro
 * يوفر انتقال سلس بين الصفحات بدون إعادة تحميل كاملة
 */

// نظام التوجيه للتطبيق المفرد
const SPARouter = {
  routes: {},
  currentRoute: null,

  /**
   * إضافة route جديد
   */
  addRoute(path, handler) {
    this.routes[path] = handler;
  },

  /**
   * التوجيه إلى صفحة محددة
   */
  navigate(path, addToHistory = true) {
    // إضافة / في البداية إذا لم يكن موجود
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // تحديث الرابط في المتصفح
    if (addToHistory && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }

    // تنفيذ route handler
    this.handleRoute(path);
  },

  /**
   * معالجة التوجيه
   */
  async handleRoute(path) {
    try {
      // إضافة مؤشر التحميل
      this.showLoadingIndicator();

      // البحث عن route handler
      let routeHandler = this.routes[path] || this.routes['*'];

      if (routeHandler) {
        await routeHandler(path);
      } else {
        // إذا لم يوجد handler، استخدم الطريقة التقليدية
        console.log('Route غير موجود في SPA، استخدام الطريقة التقليدية');
        window.location.href = path;
        return;
      }

      // تحديث العنوان
      this.updatePageTitle(path);

      // تحديث meta tags للـ SEO
      this.updateMetaTags(path);

      // تمييز العنصر النشط في القائمة
      this.highlightActiveMenuItem(path);

      this.currentRoute = path;

      console.log('تم التوجيه إلى:', path);

    } catch (error) {
      console.error('خطأ في التوجيه:', error);
      // في حالة الخطأ، استخدم الطريقة التقليدية
      window.location.href = path;
    } finally {
      this.hideLoadingIndicator();
    }
  },

  /**
   * عرض مؤشر التحميل
   */
  showLoadingIndicator() {
    let indicator = document.getElementById('spa-loading');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'spa-loading';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 121, 101, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: white;
          font-size: 18px;
        ">
          <div>
            <i class="fas fa-spinner fa-spin" style="margin-left: 10px;"></i>
            جاري التحميل...
          </div>
        </div>
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  },

  /**
   * إخفاء مؤشر التحميل
   */
  hideLoadingIndicator() {
    const indicator = document.getElementById('spa-loading');
    if (indicator) {
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 300);
    }
  },

  /**
   * تحديث عنوان الصفحة
   */
  updatePageTitle(path) {
    const titles = {
      '/': 'CollectPro - الرئيسية',
      '/dashboard': 'إدخال البيانات - CollectPro',
      '/harvest': 'التحصيلات - CollectPro',
      '/archive': 'الأرشيف - CollectPro',
      '/subscriptions': 'الاشتراكات - CollectPro',
      '/my-subscription': 'اشتراكي - CollectPro',
      '/payment': 'المدفوعات - CollectPro',
      '/admin': 'إدارة النظام - CollectPro'
    };

    const title = titles[path] || 'CollectPro';
    document.title = title;
  },

  /**
   * تحديث meta tags للـ SEO
   */
  updateMetaTags(path) {
    const metaTags = {
      '/': {
        description: 'نظام متكامل لإدارة التحصيلات والاشتراكات والمدفوعات',
        keywords: 'تحصيلات, إدارة, بيانات, اشتراكات, مدفوعات'
      },
      '/dashboard': {
        description: 'إدخال وإدارة البيانات في نظام CollectPro',
        keywords: 'إدخال البيانات, إدارة البيانات, CollectPro'
      },
      '/harvest': {
        description: 'إدارة التحصيلات والمحصلين في نظام CollectPro',
        keywords: 'تحصيلات, محصلين, إدارة التحصيل, CollectPro'
      },
      '/archive': {
        description: 'عرض وإدارة الأرشيف في نظام CollectPro',
        keywords: 'الأرشيف, البيانات المؤرشفة, CollectPro'
      }
    };

    const tags = metaTags[path] || metaTags['/'];

    // تحديث description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = tags.description;

    // تحديث keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = tags.keywords;
  },

  /**
   * تمييز العنصر النشط في القائمة
   */
  highlightActiveMenuItem(path) {
    // إزالة الفئة النشطة من جميع العناصر
    document.querySelectorAll('.nav-links a').forEach(item => {
      item.classList.remove('active');
    });

    // إضافة الفئة النشطة للعنصر المناسب
    const pageName = path.replace('/', '') || 'dashboard';
    const activeItem = document.querySelector(`.nav-links a[href="${pageName}.html"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  },

  /**
   * تهيئة نظام SPA
   */
  init() {
    // إعداد routes
    this.setupRoutes();

    // معالجة التوجيه الأولي
    this.handleInitialRoute();

    // إعداد مستمعي الأحداث
    this.setupEventListeners();

    console.log('تم تهيئة نظام SPA');
  },

  /**
   * إعداد routes
   */
  setupRoutes() {
    // Dashboard
    this.addRoute('/dashboard', async (path) => {
      await this.loadPageContent('dashboard');
    });

    // Harvest
    this.addRoute('/harvest', async (path) => {
      await this.loadPageContent('harvest');
    });

    // Archive
    this.addRoute('/archive', async (path) => {
      await this.loadPageContent('archive');
    });

    // Subscriptions
    this.addRoute('/subscriptions', async (path) => {
      await this.loadPageContent('subscriptions');
    });

    // My Subscription
    this.addRoute('/my-subscription', async (path) => {
      await this.loadPageContent('my-subscription');
    });

    // Payment
    this.addRoute('/payment', async (path) => {
      await this.loadPageContent('payment');
    });

    // Admin
    this.addRoute('/admin', async (path) => {
      await this.loadPageContent('admin');
    });

    // Default route
    this.addRoute('*', async (path) => {
      console.log('Route غير معروف، توجيه للصفحة الرئيسية');
      await this.loadPageContent('dashboard');
    });
  },

  /**
   * تحميل محتوى الصفحة
   */
  async loadPageContent(pageName) {
    try {
      // تحديث المحتوى الرئيسي
      const mainContent = document.querySelector('main');
      if (mainContent) {
        // يمكن إضافة منطق تحميل المحتوى الديناميكي هنا
        console.log('تحميل محتوى الصفحة:', pageName);
      }

      // تحديث العنوان
      const headerTitle = document.querySelector('header h1');
      if (headerTitle) {
        const titles = {
          dashboard: 'إدخال البيانات 📝',
          harvest: 'التحصيلات 💴',
          archive: 'الأرشيف 📂',
          subscriptions: 'الاشتراكات 📋',
          'my-subscription': 'اشتراكي 👤',
          payment: 'المدفوعات 💳',
          admin: 'إدارة النظام ⚙️'
        };
        headerTitle.textContent = titles[pageName] || 'CollectPro';
      }

    } catch (error) {
      console.error('خطأ في تحميل محتوى الصفحة:', error);
    }
  },

  /**
   * معالجة التوجيه الأولي
   */
  handleInitialRoute() {
    let path = window.location.pathname;

    // إذا كانت الصفحة الرئيسية، توجه للـ dashboard
    if (path === '/' || path === '') {
      path = '/dashboard';
    }

    this.handleRoute(path);
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // معالجة أزرار التنقل
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (link && link.href.includes('.html')) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const pageName = href.replace('.html', '');
        this.navigate('/' + pageName);
      }
    });

    // معالجة زر الرجوع في المتصفح
    window.addEventListener('popstate', (e) => {
      this.handleRoute(window.location.pathname);
    });

    // معالجة أزرار التنقل السفلية
    document.addEventListener('click', (e) => {
      if (e.target.closest('#prevPage') || e.target.closest('#nextPage')) {
        e.preventDefault();
        const target = e.target.closest('button');
        if (target && target.id === 'prevPage') {
          this.navigatePrevious();
        } else if (target && target.id === 'nextPage') {
          this.navigateNext();
        }
      }
    });
  },

  /**
   * التنقل للصفحة السابقة
   */
  navigatePrevious() {
    const pages = ['dashboard', 'harvest', 'archive'];
    const currentIndex = pages.indexOf(this.currentRoute.replace('/', ''));
    if (currentIndex > 0) {
      this.navigate('/' + pages[currentIndex - 1]);
    }
  },

  /**
   * التنقل للصفحة التالية
   */
  navigateNext() {
    const pages = ['dashboard', 'harvest', 'archive'];
    const currentIndex = pages.indexOf(this.currentRoute.replace('/', ''));
    if (currentIndex < pages.length - 1) {
      this.navigate('/' + pages[currentIndex + 1]);
    }
  }
};

// تهيئة نظام SPA
document.addEventListener('DOMContentLoaded', () => {
  SPARouter.init();
});

// تصدير النظام
window.SPARouter = SPARouter;