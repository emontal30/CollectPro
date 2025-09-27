// supabaseClient.js

// متغير لتخزين عميل Supabase
let supabase = null;

/**
 * إنشاء عميل Supabase
 */
function initializeSupabaseClient() {
  if (
    typeof window !== 'undefined' &&
    window.supabase &&
    window.supabase.createClient &&
    window.appConfig
  ) {
    supabase = window.supabase.createClient(
      window.appConfig.supabaseUrl,
      window.appConfig.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }
    );

    // حفظ العميل في window لاستخدامه في أي مكان
    window.supabase = supabase;
    window.supabaseClient = supabase;

    console.log('✅ تم إنشاء عميل Supabase بنجاح');
    return supabase;
  }
  return null;
}

/**
 * التأكد من جاهزية عميل Supabase
 */
function ensureSupabaseClient() {
  if (supabase) return supabase;

  if (
    typeof window !== 'undefined' &&
    window.supabase &&
    window.supabase.createClient &&
    window.appConfig
  ) {
    return initializeSupabaseClient();
  }

  return null;
}

/**
 * بدء إنشاء العميل عند تحميل الصفحة
 */
if (typeof window !== 'undefined') {
  const checkSupabase = () => {
    if (window.supabase && window.supabase.createClient && window.appConfig) {
      initializeSupabaseClient();
    } else {
      setTimeout(checkSupabase, 100);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkSupabase);
  } else {
    checkSupabase();
  }
}

/**
 * كلاس لمساعدة عمليات المصادقة
 */
class AuthHelper {
  // تسجيل الدخول بـ Google
  static async signInWithGoogle() {
    try {
      const { data, error } = await ensureSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.appConfig?.googleRedirectUri || `${window.location.origin}/auth/v1/callback`,
        },
      });

      if (error) throw error;

      console.log('✅ تم تحويل المستخدم لـ Google:', data);
      return data;
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول بـ Google:', error.message);
      throw error;
    }
  }

  // تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  static async signInWithEmail(email, password) {
    try {
      const { data, error } = await ensureSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ تم تسجيل الدخول بنجاح:', data.user?.email);
      return data;
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error.message);
      throw error;
    }
  }

  // تسجيل الخروج
  static async signOut() {
    try {
      const { error } = await ensureSupabaseClient().auth.signOut();
      if (error) throw error;

      console.log('✅ تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error.message);
    }
  }

  // الحصول على المستخدم الحالي
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await ensureSupabaseClient().auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('❌ خطأ في الحصول على المستخدم:', error.message);
      return null;
    }
  }

  // التحقق من الجلسة الحالية
  static async checkSession() {
    try {
      const { data: { session }, error } = await ensureSupabaseClient().auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('❌ خطأ في فحص الجلسة:', error.message);
      return null;
    }
  }
}

// تصدير الدوال والكائنات للمتصفح
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.supabaseClient = supabase;
  window.AuthHelper = AuthHelper;
}
