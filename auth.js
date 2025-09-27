// نظام المصادقة المحسن
const auth = {
  /**
   * حفظ معلومات جلسة المستخدم
   * @param {Object} user - بيانات المستخدم
   * @param {boolean} remember - تذكر المستخدم
   */
  saveUserSession: function (user, remember) {
    // التحقق من صحة البيانات
    if (!user || !user.id || !user.email) {
      throw new Error('بيانات المستخدم غير مكتملة');
    }

    // الحصول على معلومات المستخدم الضرورية
    const userData = {
      id: user.id,
      name: user.name || user.displayName || '',
      email: user.email,
      avatar: user.avatar || user.photoURL || '',
      token: user.token || user.accessToken || '',
      provider: user.provider || 'email',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // تشفير البيانات قبل الحفظ
    const encryptedData = this.encryptData(userData);

    // التخزين في localStorage أو sessionStorage
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('user', encryptedData);

    // حفظ الوقت الحالي لمراجعة صلاحية الجلسة لاحقاً
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + (remember ? 168 : 24)); // 7 أيام أو 24 ساعة
    localStorage.setItem('session_expiry', expiryTime.toISOString());

    return userData;
  },

  /**
   * تشفير البيانات قبل الحفظ
   * @param {Object} data - البيانات المراد تشفيرها
   * @returns {string} البيانات المشفرة
   */
  encryptData: function(data) {
    try {
      // استخدام base64 للتشفير البسيط
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('Encryption error:', error);
      return JSON.stringify(data);
    }
  },

  /**
   * فك تشفير البيانات
   * @param {string} encryptedData - البيانات المشفرة
   * @returns {Object} البيانات الأصلية
   */
  decryptData: function(encryptedData) {
    try {
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      // إذا فشل فك التشفير، جرب البيانات العادية
      try {
        return JSON.parse(encryptedData);
      } catch {
        return null;
      }
    }
  },

  /**
   * التحقق من صحة الجلسة
   * @param {Object} userData - بيانات المستخدم
   * @returns {boolean} صحة الجلسة
   */
  isValidSession: function (userData) {
    if (!userData || !userData.id || !userData.email) {
      return false;
    }

    // التحقق من صلاحية الجلسة
    const expiryTime = new Date(localStorage.getItem('session_expiry') || '');
    const currentTime = new Date();

    if (expiryTime && expiryTime <= currentTime) {
      return false;
    }

    return true;
  },

  /**
   * التحقق من صحة جلسة Supabase
   * @param {Object} userData - بيانات المستخدم من Supabase
   * @returns {boolean} صحة الجلسة
   */
  isValidSupabaseSession: function (userData) {
    if (!userData || !userData.id || !userData.email) {
      return false;
    }

    // التحقق من وجود access token
    if (!userData.access_token) {
      return false;
    }

    // التحقق من تاريخ انتهاء الصلاحية
    if (userData.expires_at) {
      const expiryTime = new Date(userData.expires_at * 1000); // Supabase يستخدم timestamp بالثواني
      const currentTime = new Date();

      if (expiryTime <= currentTime) {
        return false;
      }
    }

    // التحقق من أن وقت تسجيل الدخول ليس قديماً جداً (24 ساعة كحد أقصى)
    if (userData.login_time) {
      const loginTime = new Date(userData.login_time);
      const currentTime = new Date();
      const hoursDiff = (currentTime - loginTime) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        return false;
      }
    }

    return true;
  },

  /**
   * التحقق من وجود جلسة مستخدم نشطة
   * @returns {Object|null} بيانات المستخدم أو null
   */
  checkUserSession: function () {
    try {
      // التحقق من وجود بيانات Supabase محدثة أولاً
      const supabaseUserData = localStorage.getItem('supabaseUser');
      if (supabaseUserData) {
        try {
          const userData = JSON.parse(supabaseUserData);
          if (userData && userData.id && userData.email) {
            // التحقق من صلاحية الجلسة
            if (this.isValidSupabaseSession(userData)) {
              console.log('✅ تم العثور على جلسة Supabase صالحة');
              return userData;
            } else {
              console.log('⚠️ جلسة Supabase منتهية الصلاحية');
              localStorage.removeItem('supabaseUser');
              localStorage.removeItem('authProvider');
            }
          }
        } catch (error) {
          console.warn('خطأ في تحليل بيانات Supabase:', error);
          localStorage.removeItem('supabaseUser');
          localStorage.removeItem('authProvider');
        }
      }

      // التحقق من وجود بيانات في التخزين التقليدي
      let encryptedData = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!encryptedData) {
        // التحقق من جلسة Supabase إذا لم تكن هناك بيانات محلية
        return this.checkSupabaseSession();
      }

      // فك تشفير البيانات
      const userData = this.decryptData(encryptedData);
      if (!userData) {
        // إذا فشل فك التشفير، احذف البيانات التالفة
        console.warn('فشل في فك تشفير بيانات المستخدم، مسح البيانات التالفة');
        this.clearUserSession();
        return null;
      }

      // التحقق من صحة الجلسة
      if (!this.isValidSession(userData)) {
        console.warn('الجلسة غير صالحة، مسح البيانات');
        this.clearUserSession();
        return null;
      }

      // تحديث وقت آخر نشاط
      userData.lastActivity = new Date().toISOString();
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', this.encryptData(userData));

      return userData;
    } catch (error) {
      console.error('خطأ في فحص جلسة المستخدم:', error);
      // في حالة حدوث خطأ، مسح البيانات لتجنب المشاكل
      this.clearUserSession();
      return null;
    }
  },

  /**
   * التحقق من جلسة Supabase
   * @returns {Object|null} بيانات المستخدم أو null
   */
  checkSupabaseSession: async function () {
    try {
      // التحقق من وجود Supabase client
      if (typeof window.supabase === 'undefined') {
        return null;
      }

      // التحقق من وجود appConfig
      if (typeof window === 'undefined' || !window.appConfig) {
        console.error('appConfig غير متوفر. تأكد من تحميل config.js قبل auth.js');
        // انتظار تحميل config.js
        let attempts = 0;
        while ((typeof window === 'undefined' || !window.appConfig) && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        if (typeof window === 'undefined' || !window.appConfig) {
          console.error('فشل في تحميل config.js بعد عدة محاولات');
          return null;
        }
      }

      // الحصول على إعدادات Supabase من appConfig
      const config = window.appConfig;
      if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
        console.error('إعدادات Supabase غير متوفرة');
        return null;
      }

      // التحقق من أن الإعدادات ليست افتراضية
      if (config.supabaseUrl.includes('your-project-id') || config.supabaseAnonKey.includes('your-supabase-anon-key')) {
        console.warn('إعدادات Supabase لا تزال افتراضية');
        return null;
      }

      // استخدام supabaseClient الجديد
      if (typeof window.supabase === 'undefined') {
        console.error('مكتبة Supabase غير محملة');
        return null;
      }

      const { createClient } = window.supabase;
      const supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

      // الحصول على الجلسة الحالية
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error || !session || !session.user) {
        return null;
      }

      const user = session.user;

      // التحقق من صحة بيانات المستخدم
      if (!user.id || !user.email) {
        return null;
      }

      const userData = {
        id: user.id,
        name: user.user_metadata?.name || user.email.split('@')[0],
        email: user.email,
        avatar: user.user_metadata?.avatar_url || '',
        token: session.access_token,
        provider: user.app_metadata?.provider || 'email',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      // حفظ البيانات محلياً
      this.saveUserSession(userData, true);

      return userData;
    } catch (error) {
      console.error('Error checking Supabase session:', error);
      return null;
    }
  },

  /**
   * مسح بيانات جلسة المستخدم دون إعادة توجيه
   */
  clearUserSession: function () {
    try {
      // إزالة بيانات المستخدم من التخزين المحلي
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      localStorage.removeItem('session_expiry');

      // إزالة بيانات Supabase الجديدة
      localStorage.removeItem('supabaseUser');
      localStorage.removeItem('authProvider');

      // محاولة تسجيل الخروج من Supabase إذا كانت المكتبة متاحة
      if (window.supabase && window.supabase.auth) {
        window.supabase.auth.signOut().catch(error => {
          console.warn("فشل تسجيل الخروج من Supabase:", error);
        });
      }

      return true;
    } catch (error) {
      console.error('خطأ في مسح بيانات الجلسة:', error);
      return false;
    }
  },

  /**
   * تسجيل خروج المستخدم
   */
  logout: function () {
    try {
      // مسح بيانات الجلسة
      const clearResult = this.clearUserSession();

      // إعادة توجيه إلى صفحة تسجيل الدخول
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = 'login.html';
      }

      return clearResult;
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      return false;
    }
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
  },

  /**
   * التحقق من صلاحيات الإدارة
   * @returns {boolean} true إذا كان المستخدم مسؤولاً
   */
  isAdmin: function () {
    try {
      const user = this.checkUserSession();
      if (!user) return false;

      // في تطبيق حقيقي، سيتم التحقق من دور المستخدم من قاعدة البيانات
      // هنا نقوم بمحاكاة التحقق من صلاحيات الإدارة

      // مثال: التحقق من البريد الإلكتروني
      if (user.email === 'admin@example.com') return true;

      // مثال: التحقق من وجود خاصية admin في بيانات المستخدم
      if (user.role === 'admin') return true;

      // مثال: التحقق من وجود صلاحية محددة
      if (user.permissions && user.permissions.includes('admin')) return true;

      return false;
    } catch (error) {
      console.error('خطأ في فحص صلاحيات الإدارة:', error);
      return false;
    }
  }
};

// تصدير كائن auth
window.auth = auth;
