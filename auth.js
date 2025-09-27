// نظام المصادقة المحسن والمتكامل
const auth = {
  // =================================================================
  // 1. الوظائف الأساسية لإدارة الجلسة
  // =================================================================

  /**
   * حفظ معلومات جلسة المستخدم بشكل آمن.
   * @param {Object} user - بيانات المستخدم من Supabase أو غيره.
   * @param {boolean} remember - هل يجب تذكر المستخدم (localStorage) أم لا (sessionStorage).
   */
  saveUserSession: function (user, remember) {
    if (!user || !user.id || !user.email) {
      console.error("Auth Error: بيانات المستخدم غير مكتملة للحفظ.", user);
      throw new Error('بيانات المستخدم غير مكتملة');
    }

    const userData = {
      id: user.id,
      name: user.user_metadata?.name || user.email.split('@')[0],
      email: user.email,
      avatar: user.user_metadata?.avatar_url || '',
      token: user.token,
      provider: user.app_metadata?.provider || 'email',
      loginTime: new Date().toISOString(),
    };

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('user', btoa(JSON.stringify(userData))); // تشفير بسيط
    console.log("🛡️ Auth: تم حفظ الجلسة بنجاح.", `المستخدم: ${userData.email}, التذكر: ${remember}`);
  },

  /**
   * جلب جلسة المستخدم المحفوظة وفك تشفيرها.
   * @returns {Object|null} بيانات المستخدم أو null.
   */
  getStoredSession: function () {
    const encryptedData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!encryptedData) return null;

    try {
      const userData = JSON.parse(atob(encryptedData));
      // التحقق من أن البيانات ليست قديمة جدًا (صلاحية 7 أيام)
      const loginTime = new Date(userData.loginTime);
      const hoursDiff = (new Date() - loginTime) / (1000 * 60 * 60);
      if (hoursDiff > 168) { // 7 أيام
        console.warn("🛡️ Auth: الجلسة المحفوظة منتهية الصلاحية.");
        this.clearUserSession();
        return null;
      }
      return userData;
    } catch (error) {
      console.error("🛡️ Auth Error: فشل في فك تشفير بيانات الجلسة.", error);
      this.clearUserSession(); // مسح البيانات التالفة
      return null;
    }
  },

  /**
   * مسح جميع بيانات جلسة المستخدم.
   */
  clearUserSession: function () {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    console.log("🛡️ Auth: تم مسح بيانات الجلسة من التخزين.");
  },

  /**
   * تسجيل الخروج الكامل للمستخدم.
   */
  logout: async function () {
    console.log("🛡️ Auth: بدء عملية تسجيل الخروج...");
    this.clearUserSession();
    if (window.supabaseClient) {
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) {
        console.error("🛡️ Auth Error: خطأ أثناء تسجيل الخروج من Supabase.", error);
      }
    }
    this.redirectToLogin("تم تسجيل الخروج بنجاح.");
  },

  // =================================================================
  // 2. الوظائف الأساسية للتحقق من المستخدم والصلاحيات
  // =================================================================

  /**
   * [مهم] التحقق من جلسة المستخدم الحالية (من الخادم أو التخزين المحلي).
   * هذه هي الدالة الأساسية لمعرفة ما إذا كان المستخدم مسجلاً للدخول.
   * @returns {Promise<Object|null>} بيانات المستخدم أو null.
   */
  checkUserSession: async function () {
    // الخطوة 1: التحقق من وجود جلسة محلية صالحة أولاً لتسريع التحميل
    const storedUser = this.getStoredSession();
    if (storedUser) {
      console.log("🛡️ Auth: تم العثور على جلسة محلية صالحة.", storedUser.email);
      return storedUser;
    }

    // الخطوة 2: إذا لم تكن هناك جلسة محلية، تحقق من Supabase مباشرة
    console.log("🛡️ Auth: لا توجد جلسة محلية، جاري التحقق من Supabase...");
    if (!window.supabaseClient) {
      console.warn("🛡️ Auth: Supabase client غير متاح.");
      return null;
    }

    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.error("🛡️ Auth Error: خطأ في جلب الجلسة من Supabase.", error);
        return null;
      }

      if (!session) {
        console.log("🛡️ Auth: لا توجد جلسة نشطة في Supabase.");
        return null;
      }

      console.log("🛡️ Auth: تم العثور على جلسة نشطة في Supabase.", session.user.email);
      // حفظ الجلسة الجديدة محليًا
      this.saveUserSession(session.user, true); // نفترض التذكر دائمًا عند التحقق من الخادم
      return session.user;

    } catch (error) {
      console.error("🛡️ Auth Error: خطأ فادح أثناء التحقق من جلسة Supabase.", error);
      return null;
    }
  },

  /**
   * التحقق مما إذا كان المستخدم الحالي لديه صلاحيات المدير.
   * @param {Object} user - كائن المستخدم للتحقق منه.
   * @returns {boolean}
   */
  isAdmin: function (user) {
    if (!user || !user.email) return false;
    
    // **مهم**: في تطبيق حقيقي، يجب أن تأتي الصلاحيات من الخادم.
    // هنا، نعتمد على قائمة بريد إلكتروني محددة كمسؤولين.
    const adminEmails = ["admin@example.com", "aymanhafez@example.com"]; // أضف الإيميلات هنا
    
    return adminEmails.includes(user.email);
  },

  // =================================================================
  // 3. وظائف الحماية وإعادة التوجيه (Auth Guard)
  // =================================================================

  /**
   * [دالة الحماية الموحدة] تتحقق من صلاحية وصول المستخدم للصفحة الحالية.
   * تقوم بإعادة التوجيه تلقائيًا إذا لم يكن الوصول مسموحًا.
   * @returns {Promise<boolean>} `true` إذا كان الوصول مسموحًا، `false` إذا تم إعادة التوجيه.
   */
  checkPageAccess: async function () {
    const user = await this.checkUserSession();
    const currentPage = window.location.pathname.split('/').pop();

    // الحالة 1: المستخدم غير مسجل الدخول
    if (!user) {
      // إذا كان المستخدم بالفعل في صفحة تسجيل الدخول، لا تفعل شيئًا
      if (currentPage === 'login.html') {
        return true;
      }
      console.warn("🛡️ Auth Guard: لا يوجد مستخدم مسجل. إعادة توجيه إلى login.html");
      this.redirectToLogin("يجب تسجيل الدخول للوصول إلى هذه الصفحة.");
      return false;
    }

    // الحالة 2: المستخدم مسجل دخوله ويحاول الوصول لصفحة تسجيل الدخول
    if (currentPage === 'login.html') {
      console.log("🛡️ Auth Guard: المستخدم مسجل بالفعل. إعادة توجيه إلى dashboard.html");
      window.location.href = 'dashboard.html';
      return false;
    }

    // الحالة 3: التحقق من صلاحيات صفحة الإدارة
    if (currentPage === 'admin.html') {
      if (!this.isAdmin(user)) {
        console.warn(`🛡️ Auth Guard: المستخدم (${user.email}) ليس لديه صلاحية الوصول إلى admin.html.`);
        this.redirectToHome("ليس لديك الصلاحية للوصول لهذه الصفحة.");
        return false;
      }
    }

    // إذا مرت جميع الفحوصات، فالدخول مسموح
    console.log(`🛡️ Auth Guard: المستخدم (${user.email}) لديه صلاحية الوصول إلى ${currentPage}.`);
    return true;
  },

  /**
   * إعادة التوجيه إلى صفحة تسجيل الدخول مع رسالة.
   * @param {string} reason - سبب إعادة التوجيه.
   */
  redirectToLogin: function (reason = '') {
    // منع إعادة التوجيه المتكرر
    if (window.location.pathname.includes('login.html')) return;

    let redirectUrl = 'login.html';
    if (reason) {
      redirectUrl += `?reason=${encodeURIComponent(reason)}`;
    }
    window.location.href = redirectUrl;
  },

  /**
   * إعادة التوجيه إلى الصفحة الرئيسية مع رسالة.
   * @param {string} reason - سبب إعادة التوجيه.
   */
  redirectToHome: function (reason = '') {
    let redirectUrl = 'index.html';
    if (reason) {
      // يمكن استخدام query parameter أو نظام تنبيهات لعرض الرسالة
      alert(reason); // استخدام alert كحل مؤقت
    }
    window.location.href = redirectUrl;
  }
};

// تصدير الكائن ليصبح متاحًا عالميًا
window.auth = auth;