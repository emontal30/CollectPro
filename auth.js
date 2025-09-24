// نظام المصادقة
const auth = {
  /**
   * حفظ معلومات جلسة المستخدم
   * @param {Object} user - بيانات المستخدم
   * @param {boolean} remember - تذكر المستخدم
   */
  saveUserSession: function (user, remember) {
    // الحصول على معلومات المستخدم الضرورية
    const userData = {
      id: user.id,
      name: user.name || user.displayName,
      email: user.email,
      avatar: user.avatar || user.photoURL,
      token: user.token || user.accessToken,
      provider: user.provider || 'email'
    };

    // التخزين في localStorage أو sessionStorage
    if (remember) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
    }

    // حفظ الوقت الحالي لمراجعة صلاحية الجلسة لاحقاً
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // صلاحية لمدة 24 ساعة
    localStorage.setItem('session_expiry', expiryTime.toISOString());

    return userData;
  },

  /**
   * التحقق من وجود جلسة مستخدم نشطة
   * @returns {Object|null} بيانات المستخدم أو null
   */
  checkUserSession: function () {
    // التحقق من وجود بيانات في التخزين
    let userData = JSON.parse(localStorage.getItem('user') || 'null');
    if (!userData) {
      userData = JSON.parse(sessionStorage.getItem('user') || 'null');
    }

    // التحقق من صلاحية الجلسة
    if (userData) {
      const expiryTime = new Date(localStorage.getItem('session_expiry') || '');
      const currentTime = new Date();

      if (expiryTime > currentTime) {
        return userData;
      } else {
        // إزالة البيانات منتهية الصلاحية
        this.logout();
        return null;
      }
    }

    return null;
  },

  /**
   * تسجيل خروج المستخدم
   */
  logout: function () {
    // إزالة بيانات المستخدم من التخزين المحلي
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('session_expiry');

    // محاولة تسجيل الخروج من Supabase إذا كانت المكتبة متاحة
    if (window.supabase && window.supabase.auth) {
      try {
        window.supabase.auth.signOut();
      } catch (error) {
        console.warn("فشل تسجيل الخروج من Supabase:", error);
      }
    }

    return true;
  },

  /**
   * إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
   * @param {string} reason سبب إعادة التوجيه
   */
  redirectToLogin: function (reason = '') {
    if (window.location.pathname.indexOf('login.html') === -1) {
      let redirectUrl = 'login.html';
      if (reason) {
        redirectUrl += `?reason=${encodeURIComponent(reason)}`;
      }
      window.location.href = redirectUrl;
    }
  },

  /**
   * الحصول على رمز الوصول الخاص بالمستخدم
   * @returns {string|null} رمز الوصول أو null
   */
  getToken: function () {
    const user = this.checkUserSession();
    return user ? user.token : null;
  },

  /**
   * التحقق من وجود دور محدد للمستخدم
   * @param {string|string[]} roles - الدور أو مجموعة الأدوار المطلوبة
   * @returns {boolean} إذا كان للمستخدم الدور المطلوب
   */
  hasRole: function (roles) {
    const user = this.checkUserSession();
    if (!user || !user.roles) return false;

    if (Array.isArray(roles)) {
      return roles.some(role => user.roles.includes(role));
    }
    
    return user.roles.includes(roles);
  }
};

// تصدير كائن auth
window.auth = auth;
