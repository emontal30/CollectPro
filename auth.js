// ========== وحدة المصادقة المتقدمة (مصححة) ========== //

/**
 * Helper: جلب اسم الصفحة الحالية بدون امتداد
 * لو المسار هو '/' نرجع 'index' كاسم افتراضي
 */
function getCurrentPageName() {
  const path = window.location.pathname || '/';
  if (path === '/' || path === '') return 'index';
  return path.split('/').pop().replace('.html', '');
}

/**
 * قراءة بيانات المستخدم من localStorage أو sessionStorage
 * يرجع null لو مفيش بيانات
 */
function checkUserSession() {
  try {
    const rawLocal = localStorage.getItem('user');
    const rawSession = sessionStorage.getItem('user');
    const raw = rawLocal || rawSession;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('خطأ في قراءة جلسة المستخدم من التخزين:', err);
    return null;
  }
}

/**
 * Helper: جلب قيمة sessionTime من نفس مكان حفظ الجلسة (local/session)
 * لو مش موجودة ترجع 0
 */
function getSavedSessionTime() {
  const rawLocal = localStorage.getItem('sessionTime');
  const rawSession = sessionStorage.getItem('sessionTime');
  const raw = rawLocal || rawSession;
  return parseInt(raw || '0', 10);
}

/**
 * Helper: تخزين sessionTime في نفس مكان حفظ الجلسة
 */
function storeSessionTime(timestamp, remember = false) {
  const value = String(timestamp);
  if (remember) {
    localStorage.setItem('sessionTime', value);
  } else {
    sessionStorage.setItem('sessionTime', value);
  }
}

/**
 * Helper: يصنع عميل Supabase بأمان بناءً على window.AppConfig
 * يتأكد من وجود المكتبة (window.supabase) أو كائن عالمي آخر اسمه supabase
 */
function getSupabaseClient() {
  const config = window.AppConfig || {};
  const supabaseUrl = config.supabase?.url;
  const supabaseAnonKey = config.supabase?.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('إعدادات Supabase غير متوفرة في AppConfig');
  }

  // أولاً: لو المكتبة محمّلة من CDN وتوجد كـ window.supabase
  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  }

  // ثانياً: لو فيه كائن عالمي اسمه supabase (بدون window)
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    return supabase.createClient(supabaseUrl, supabaseAnonKey);
  }

  throw new Error('مكتبة Supabase غير محمّلة - تأكد من تحميلها قبل استدعاء الدوال');
}

/**
 * التحقق من صلاحيات الوصول للصفحة الحالية
 * يعيد true لو مسموح، false لو مش مسموح (مع إعادة توجيه عند الضرورة)
 */
async function checkPageAccess() {
  const user = checkUserSession();
  const currentPage = getCurrentPageName();

  // صفحات لا تحتاج تسجيل دخول
  const publicPages = ['login', 'register', 'reset-password', 'index'];

  // صفحات متخصّصة
  const adminPages = ['admin'];
  const harvestPages = ['harvest', 'archive'];
  const subscriptionPages = ['subscriptions', 'my-subscription', 'payment'];

  // لو المستخدم مسجل الدخول وحاول يدخل صفحة login - نرجعه للـ index
  if (user && currentPage === 'login') {
    window.location.href = 'index.html';
    return false;
  }

  // صفحة الإدارة تتطلب صلاحيات خاصة
  if (adminPages.includes(currentPage)) {
    if (!user) {
      if (typeof showAlert === 'function') showAlert('الرجاء تسجيل الدخول للوصول إلى صفحة الإدارة', 'warning');
      window.location.href = 'login.html';
      return false;
    }
    // لو عندنا حقل is_admin أو استنادًا للإيميل
    const isAdminUser = user.is_admin === true || (user.email && user.email === 'emontal.33@gmail.com');
    if (!isAdminUser) {
      if (typeof showAlert === 'function') showAlert('غير مصرح لك بالوصول إلى صفحة الإدارة', 'error');
      window.location.href = 'index.html';
      return false;
    }
  }

  // صفحات التحصيل تتطلب تسجيل دخول
  if (harvestPages.includes(currentPage)) {
    if (!user) {
      if (typeof showAlert === 'function') showAlert('الرجاء تسجيل الدخول للوصول لصفحات التحصيل', 'warning');
      window.location.href = 'login.html';
      return false;
    }
  }

  // صفحات الاشتراكات - (في هذا الكود نسمح بالوصول بدون تسجيل، لو عايز تقيده شغّل الكود التالي)
  // if (subscriptionPages.includes(currentPage) && !user) {
  //   window.location.href = 'login.html';
  //   return false;
  // }

  // التحقق من انتهاء الجلسة (لو مُعرّف في AppConfig)
  try {
    if (window.AppConfig && window.AppConfig.app && window.AppConfig.app.security && window.AppConfig.app.security.sessionTimeout) {
      const sessionTimeoutSeconds = Number(window.AppConfig.app.security.sessionTimeout) || 0;
      if (sessionTimeoutSeconds > 0) {
        const sessionTime = getSavedSessionTime(); // من نفس مكان الحفظ
        if (sessionTime > 0) {
          const currentTime = Date.now();
          const sessionTimeoutMs = sessionTimeoutSeconds * 1000;
          if (currentTime - sessionTime > sessionTimeoutMs) {
            // انتهاء الجلسة
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            localStorage.removeItem('sessionTime');
            sessionStorage.removeItem('sessionTime');
            if (typeof showAlert === 'function') {
              showAlert('انتهت جلسة العمل، يرجى تسجيل الدخول مرة أخرى', 'warning');
            }
            window.location.href = 'login.html';
            return false;
          }
        }
        // لو مفيش sessionTime محفوظة لكن فيه جلسة (مثلاً جلسات قصيرة في الذاكرة) هنعتبرها صالحة بدون timeout
      }
    }
  } catch (err) {
    console.warn('خطأ أثناء التحقق من انتهاء الجلسة:', err);
  }

  return true;
}

/**
 * تسجيل دخول المستخدم باستخدام Supabase
 * rememberMe = true -> يخزن في localStorage وإلا في sessionStorage
 */
async function loginUser(email, password, rememberMe = false) {
  try {
    if (!email || !password) {
      return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبة' };
    }

    const supabaseClient = getSupabaseClient();

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      // تسجيل محاولة فاشلة (مكان مخصص لذلك)
      await logFailedLoginAttempt(email);
      return { success: false, error: error.message || 'فشل تسجيل الدخول' };
    }

    // data.user قد يحتوي على البيانات
    const user = data?.user || null;
    if (!user) {
      await logFailedLoginAttempt(email);
      return { success: false, error: 'لم يتم استرجاع بيانات المستخدم بعد تسجيل الدخول' };
    }

    // بناء كائن المستخدم الموحد للتخزين
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      phone: user.user_metadata?.phone || '',
      is_verified: !!user.email_confirmed_at,
      is_admin: !!user.user_metadata?.is_admin,
      created_at: user.created_at || '',
      // token: ممكن تضيف هنا بيانات الجلسة لو احتجت (كن حذر مع التخزين)
    };

    // تخزين الجلسة
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(userData));
      storeSessionTime(Date.now(), true);
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
      storeSessionTime(Date.now(), false);
    }

    await logSuccessfulLoginAttempt(userData.id);

    return { success: true, user: userData };
  } catch (err) {
    console.error('خطأ في تسجيل الدخول:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

/**
 * تسجيل خروج المستخدم
 */
async function logoutUser() {
  try {
    // محاولة تسجيل الخروج من Supabase إذا كانت المكتبة موجودة
    try {
      const supabaseClient = getSupabaseClient();
      if (supabaseClient && typeof supabaseClient.auth.signOut === 'function') {
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      // تجاهل أخطاء إن لم تكن المكتبة محمّلة - لكن نكمل مسح التخزين محلياً
      console.warn('لم يتم الوصول إلى Supabase أثناء تسجيل الخروج:', err?.message || err);
    }

    // حفظ الـ user قبل مسحه لتسجيل حدث الخروج
    const user = checkUserSession();
    if (user && user.id) {
      await logLogoutAttempt(user.id);
    }

    // مسح الجلسة محليًا
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('sessionTime');
    sessionStorage.removeItem('sessionTime');

    return { success: true };
  } catch (err) {
    console.error('خطأ في تسجيل الخروج:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الخروج' };
  }
}

/**
 * تسجيل مستخدم جديد (Sign Up)
 * userData = { email, password, fullName, phone, avatarUrl }
 */
async function registerUser(userData = {}) {
  try {
    if (!userData.email || !userData.password) {
      return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبة' };
    }

    const supabaseClient = getSupabaseClient();

    const { data, error } = await supabaseClient.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName || '',
          phone: userData.phone || '',
          avatar_url: userData.avatarUrl || ''
        }
      }
    });

    if (error) {
      return { success: false, error: error.message || 'فشل إنشاء الحساب' };
    }

    // لو المرجع data.user موجود - نقدر نسجل دخول تلقائي أو نرجع رسالة تحقق
    if (data?.user) {
      // حاول تسجيل الدخول تلقائيًا (لو مطلوب)
      const loginResult = await loginUser(userData.email, userData.password, false);
      if (loginResult.success) {
        return { success: true, user: loginResult.user };
      }
      // وإلا نرجع رسالة الإنشاء ونتوقع التحقق عبر الإيميل
      return { success: true, message: 'تم إنشاء الحساب بنجاح، يرجى التحقق من بريدك الإلكتروني' };
    }

    return { success: true, message: 'تم إنشاء الحساب، تحقق من بريدك الإلكتروني' };
  } catch (err) {
    console.error('خطأ في إنشاء الحساب:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إنشاء الحساب' };
  }
}

/**
 * إعادة تعيين كلمة المرور (Reset password)
 */
async function resetPassword(email) {
  try {
    if (!email) {
      return { success: false, error: 'البريد الإلكتروني مطلوب' };
    }

    const config = window.AppConfig || {};
    const supabaseClient = getSupabaseClient();

    // بناء رابط إعادة التوجيه (fallback إلى origin)
    const redirectBase = config.hosting?.domain ? config.hosting.domain : window.location.origin;
    const redirectTo = `${redirectBase.replace(/\/$/, '')}/reset-password.html`;

    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      return { success: false, error: error.message || 'فشل إرسال رابط إعادة التعيين' };
    }

    return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' };
  } catch (err) {
    console.error('خطأ في إعادة تعيين كلمة المرور:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور' };
  }
}

/** وظائف تسجيل الأحداث البسيطة - يمكن توسيعها لتخزين في جدول لوجز */
async function logFailedLoginAttempt(email) {
  try {
    console.log('محاولة تسجيل دخول فاشلة للبريد الإلكتروني:', email);
    // TODO: إضافة تخزين في DB إذا مطلوب
    return true;
  } catch (err) {
    console.error('خطأ في تسجيل محاولة دخول فاشلة:', err);
    return false;
  }
}

async function logSuccessfulLoginAttempt(userId) {
  try {
    console.log('محاولة تسجيل دخول ناجحة للمستخدم:', userId);
    // TODO: إضافة تخزين في DB إذا مطلوب
    return true;
  } catch (err) {
    console.error('خطأ في تسجيل محاولة دخول ناجحة:', err);
    return false;
  }
}

async function logLogoutAttempt(userId) {
  try {
    console.log('محاولة خروج للمستخدم:', userId);
    // TODO: إضافة تخزين في DB إذا مطلوب
    return true;
  } catch (err) {
    console.error('خطأ في تسجيل محاولة خروج:', err);
    return false;
  }
}

/**
 * دالة لحفظ معلومات الجلسة (يمكن استخدامها من أماكن أخرى)
 * user: كائن المستخدم الموحد (id, email, full_name, avatar_url, phone, is_verified, is_admin, created_at)
 * remember: boolean
 */
function saveUserSession(user, remember = false) {
  if (!user || !user.id) return false;
  const userData = {
    id: user.id,
    email: user.email || '',
    full_name: user.full_name || user.name || '',
    avatar_url: user.avatar_url || '',
    phone: user.phone || '',
    is_verified: !!user.is_verified,
    is_admin: !!user.is_admin,
    created_at: user.created_at || ''
  };

  if (remember) {
    localStorage.setItem('user', JSON.stringify(userData));
    storeSessionTime(Date.now(), true);
  } else {
    sessionStorage.setItem('user', JSON.stringify(userData));
    storeSessionTime(Date.now(), false);
  }
  return true;
}

/**
 * التحقق من صلاحيات الإدارة
 */
function isAdmin() {
  const user = checkUserSession();
  if (!user) return false;
  return user.is_admin === true || (user.email && user.email === 'emontal.33@gmail.com');
}

/**
 * تصدير الدوال للوصول من باقي أجزاء التطبيق
 */
window.auth = {
  checkUserSession,
  checkPageAccess,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  saveUserSession,
  isAdmin,
};
