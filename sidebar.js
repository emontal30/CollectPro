// إدارة الشريط الجانبي
const sidebar = {
  /**
   * تهيئة الشريط الجانبي
   */
  init: function () {
    // التحقق مما إذا كان الشريط الجانبي موجود في الصفحة
    const sidebarElement = document.querySelector('.sidebar');
    if (!sidebarElement) return;

    // إضافة مستمعي الأحداث
    this.setupEventListeners();

    // تحديث معلومات المستخدم
    this.updateUserInfo();

    // تمييز العنصر النشط في القائمة
    this.highlightActiveMenuItem();

    // تحديث مؤشرات الإشعارات
    this.updateNotificationBadges();

    // التحقق من صلاحية الجلسة
    this.checkSessionExpiry();
  },

  /**
   * إعداد مستمعي الأحداث للشريط الجانبي
   */
  setupEventListeners: function () {
    // زر توسيع/طي الشريط الجانبي
    const toggleButton = document.getElementById('sidebar-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    // إغلاق القائمة الجانبية عند النقر خارجها
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');

      if (sidebar && !sidebar.contains(e.target) && e.target !== toggleButton) {
        if (!sidebar.classList.contains('sidebar-collapsed')) {
          this.closeSidebar();
        }
      }
    });

    // منع إغلاق القائمة عند النقر داخلها
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // إغلاق القائمة الجانبية عند الضغط على Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !sidebar.classList.contains('sidebar-collapsed')) {
          this.closeSidebar();
        }
      }
    });

    // زر تبديل الوضع المظلم
    const darkModeToggle = document.getElementById('toggleDark');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
    }

    // زر تسجيل الخروج
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => this.handleLogout());
    }

    // قائمة التنقل الرئيسية
    const menuLinks = document.querySelectorAll('.nav-links a');
    menuLinks.forEach(link => {
      link.addEventListener('click', (e) => this.handleMenuItemClick(e, link));
    });
  },

  /**
   * تبديل حالة الشريط الجانبي (مطوي/موسع)
   */
  toggleSidebar: function () {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');

    if (sidebar) {
      // تبديل حالة القائمة الجانبية
      sidebar.classList.toggle('sidebar-collapsed');
    }

    // تبديل حالة الجسم للتنسيقات الأخرى
    body.classList.toggle('sidebar-collapsed');

    // حفظ حالة الشريط الجانبي في التخزين المحلي
    const isCollapsed = body.classList.contains('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
  },

  closeSidebar: function () {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');

    if (sidebar) {
      sidebar.classList.add('sidebar-collapsed');
    }

    body.classList.add('sidebar-collapsed');

    // حفظ الحالة المغلقة
    localStorage.setItem('sidebar-collapsed', 'true');
  },

  /**
   * تبديل الوضع المظلم
   */
  toggleDarkMode: function () {
    const body = document.body;
    body.classList.toggle('dark');
    
    // حفظ تفضيل الوضع المظلم
    const isDarkMode = body.classList.contains('dark');
    localStorage.setItem('darkMode', isDarkMode ? 'on' : 'off');
  },

  /**
   * معالجة النقر على عناصر القائمة
   */
  handleMenuItemClick: function (event, link) {
    // إزالة الفئة النشطة من جميع العناصر
    document.querySelectorAll('.nav-links a').forEach(item => {
      item.classList.remove('active');
    });

    // إضافة الفئة النشطة إلى العنصر المنقور
    link.classList.add('active');
  },

  /**
   * معالجة تسجيل الخروج
   */
  handleLogout: function () {
    try {
      // إغلاق القائمة الجانبية أولاً
      this.closeSidebar();

      // استخدام وظيفة تسجيل الخروج من نظام المصادقة
      if (window.auth && typeof window.auth.logout === 'function') {
        const logoutResult = window.auth.logout();

        if (logoutResult !== false) {
          // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 100);
        } else {
          // إذا فشل تسجيل الخروج، أظهر رسالة خطأ
          console.error('فشل في تسجيل الخروج');
          if (typeof showAlert === 'function') {
            showAlert('حدث خطأ أثناء تسجيل الخروج', 'danger');
          } else {
            alert('حدث خطأ أثناء تسجيل الخروج');
          }
        }
      } else {
        // إذا لم يكن نظام المصادقة متاح، قم بمسح البيانات يدوياً
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('session_expiry');

        // مسح بيانات Supabase الجديدة
        localStorage.removeItem('supabaseUser');
        localStorage.removeItem('authProvider');

        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 100);
      }
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      if (typeof showAlert === 'function') {
        showAlert('حدث خطأ أثناء تسجيل الخروج', 'danger');
      } else {
        alert('حدث خطأ أثناء تسجيل الخروج');
      }
    }
  },

  /**
   * تحديث معلومات المستخدم في الشريط الجانبي
   */
  updateUserInfo: function () {
    if (!window.auth) return;

    // الحصول على بيانات المستخدم
    const user = window.auth.checkUserSession();
    if (!user) return;

    // تحديث اسم المستخدم
    const nameElement = document.querySelector('.sidebar-user-name');
    if (nameElement) {
      nameElement.textContent = user.name || 'المستخدم';
    }

    // تحديث صورة المستخدم
    const avatarElement = document.querySelector('.sidebar-user-avatar');
    if (avatarElement && user.avatar) {
      avatarElement.src = user.avatar;
      avatarElement.alt = user.name;
    }

    // تحديث البريد الإلكتروني
    const emailElement = document.querySelector('.sidebar-user-email');
    if (emailElement) {
      emailElement.textContent = user.email || '';
    }
  },

  /**
   * تمييز العنصر النشط في القائمة بناءً على الصفحة الحالية
   */
  highlightActiveMenuItem: function () {
    // الحصول على اسم الصفحة الحالية
    const currentPage = window.location.pathname.split('/').pop();

    // العثور على العنصر المطابق في القائمة
    const menuItems = document.querySelectorAll('.nav-links a');
    menuItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentPage || href === `/${currentPage}`) {
        item.classList.add('active');
      }
    });
  },

  /**
   * تحديث مؤشرات الإشعارات
   */
  updateNotificationBadges: function () {
    // يمكن تنفيذ هذا في المستقبل عند وجود نظام إشعارات
  },

  /**
   * التحقق من صلاحية جلسة المستخدم
   */
  checkSessionExpiry: function () {
    if (!window.auth) return;
    
    // الحصول على بيانات المستخدم
    const user = window.auth.checkUserSession();
    
    // إذا لم تكن هناك جلسة نشطة وهذه ليست صفحة تسجيل الدخول، إعادة التوجيه
    const isLoginPage = window.location.pathname.indexOf('login.html') !== -1;
    if (!user && !isLoginPage) {
      window.auth.redirectToLogin('session_expired');
    }
  }
};

// تصدير كائن sidebar
window.sidebar = sidebar;

// تهيئة الشريط الجانبي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تطبيق الوضع الليلي المحفوظ
  const isDarkMode = localStorage.getItem("darkMode") === "on";
  if (isDarkMode) {
    document.body.classList.add("dark");
  }

  // تطبيق حالة طي الشريط الجانبي المحفوظة
  const isSidebarCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  if (isSidebarCollapsed) {
    document.body.classList.add("sidebar-collapsed");
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add("sidebar-collapsed");
    }
  }
});