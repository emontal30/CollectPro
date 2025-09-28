// supabaseClient.js

// متغير لتخزين عميل Supabase
let supabase = null;

/**
 * إنشاء عميل Supabase
 */
function initializeSupabaseClient() {
  try {
    // التحقق من وجود المكتبة والإعدادات
    if (
      typeof window === 'undefined' ||
      !window.supabase ||
      !window.supabase.createClient
    ) {
      console.warn('⚠️ مكتبة Supabase غير متاحة بعد');
      return null;
    }
    
    if (!window.appConfig) {
      console.warn('⚠️ appConfig غير متاح');
      return null;
    }

    // استخدام الإعدادات من appConfig
    const supabaseUrl = window.appConfig?.supabaseUrl;
    const supabaseKey = window.appConfig?.supabaseAnonKey;

    console.log('🔍 [DEBUG] إعدادات Supabase في supabaseClient:', {
      supabaseUrl: supabaseUrl,
      supabaseKey: supabaseKey ? '[PRESENT]' : '[MISSING]',
      appConfigExists: typeof window.appConfig !== 'undefined'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ إعدادات Supabase غير مكتملة');
      return null;
    }

    // التحقق من أن الإعدادات ليست افتراضية
    if (supabaseUrl.includes('your-project-id') || supabaseKey.includes('your-supabase-anon-key')) {
      console.warn('⚠️ إعدادات Supabase افتراضية - سيتم استخدام وضع المحاكاة');
      return createMockSupabaseClient();
    }

    // إنشاء العميل الحقيقي
    supabase = window.supabase.createClient(
      supabaseUrl,
      supabaseKey,
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
  } catch (error) {
    console.error('❌ خطأ في إنشاء عميل Supabase:', error);
    return createMockSupabaseClient();
  }
}

/**
 * إنشاء عميل Supabase وهمي للاختبار
 */
function createMockSupabaseClient() {
  console.log('🔧 استخدام عميل Supabase وهمي للاختبار');

  // إنشاء كائن وهمي يحاكي Supabase client
  const mockClient = {
    auth: {
      signInWithPassword: async (credentials) => {
        console.log('🔧 محاكاة تسجيل الدخول:', credentials.email);
        return {
          data: {
            user: {
              id: 'mock-user-id',
              email: credentials.email,
              name: 'مستخدم تجريبي'
            },
            session: {
              access_token: 'mock-token',
              user: {
                id: 'mock-user-id',
                email: credentials.email
              }
            }
          },
          error: null
        };
      },
      signInWithOAuth: async (options) => {
        console.log('🔧 محاكاة تسجيل الدخول بـ Google');
        return {
          data: { url: `${window.location.origin}/login.html?mock=true` },
          error: null
        };
      },
      signOut: async () => {
        console.log('🔧 محاكاة تسجيل الخروج');
        return { error: null };
      },
      getUser: async () => {
        return {
          data: { user: null },
          error: null
        };
      },
      getSession: async () => {
        return {
          data: { session: null },
          error: null
        };
      }
    }
  };

  supabase = mockClient;
  window.supabase = mockClient;
  window.supabaseClient = mockClient;

  return mockClient;
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
    let supabaseReady = window.supabase && window.supabase.createClient;
    let configReady = window.appConfig;
    
    if (supabaseReady && configReady) {
      initializeSupabaseClient();
    } else {
      // عرض رسائل تصحيح أكثر تفصيلاً
      if (!supabaseReady) console.log('⏳ في انتظار تحميل مكتبة Supabase...');
      if (!configReady) console.log('⏳ في انتظار تحميل الإعدادات...');
      
      // إعادة المحاولة بعد فترة وجيزة
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
      const client = ensureSupabaseClient();
      if (!client || !client.auth) {
        throw new Error('Supabase client غير متاح');
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.appConfig?.googleRedirectUri || `${window.location.origin}/auth-callback.html`,
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
      const client = ensureSupabaseClient();
      if (!client || !client.auth) {
        throw new Error('Supabase client غير متاح');
      }

      const { data, error } = await client.auth.signInWithPassword({
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
      const client = ensureSupabaseClient();
      if (!client || !client.auth) {
        console.log('🔧 محاكاة تسجيل الخروج - عميل Supabase غير متاح');
        return;
      }

      const { error } = await client.auth.signOut();
      if (error) throw error;

      console.log('✅ تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error.message);
    }
  }

  // الحصول على المستخدم الحالي
  static async getCurrentUser() {
    try {
      const client = ensureSupabaseClient();
      if (!client || !client.auth) {
        return null;
      }

      const { data: { user }, error } = await client.auth.getUser();
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
      const client = ensureSupabaseClient();
      if (!client || !client.auth) {
        return null;
      }

      const { data: { session }, error } = await client.auth.getSession();
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
