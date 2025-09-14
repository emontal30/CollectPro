// ===== Supabase Auth Setup =====
// ضع الروابط والمفاتيح الخاصة بمشروعك هنا
const SUPABASE_URL = "https://edwtmohepfgyjqhnccrt.supabase.co"; // تم التحديث
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd3Rtb2hlcGZneWpxaG5jY3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2OTU1NTcsImV4cCI6MjA3MzI3MTU1N30.WVjP-eUQO3xaVY-XF_YDwR1viZRVFz6mOJ5oRrQWC_c"; // المفتاح العام (anon)

// تحقق من وجود مكتبة supabase من CDN
if (!window.supabase) {
  console.warn("Supabase JS SDK not loaded. Make sure to include the CDN script before this file.");
}

// عميل Supabase
window.supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : null;

// دوال مساعدة للمصادقة
// دالة مساعدة: الانتظار حتى تجهز الجلسة بعد العودة من OAuth
async function waitForSession(timeoutMs = 8000) {
  if (!window.supabaseClient) return null;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (data && data.session) return data.session;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

const auth = {
  // منع الوصول للصفحات المحمية إن لم يكن المستخدم مسجلًا
  ensureAuthenticated: async () => {
    const here = window.location.pathname.split('/').pop();
    // إذا لم يتم تهيئة Supabase → اعتبره غير مصرح وانقل لصفحة الدخول
    if (!window.supabaseClient) {
      if (here !== 'login.html') window.location.replace('login.html');
      return;
    }
    try {
      // انتظر الجلسة قليلًا في حالة العودة من OAuth
      const params = new URLSearchParams(window.location.search);
      const hasOAuthParams = params.has('code') || params.has('state') || window.location.hash.includes('access_token');
      let { data } = await window.supabaseClient.auth.getSession();
      if (!data.session && hasOAuthParams) {
        await waitForSession(8000);
        const res = await window.supabaseClient.auth.getSession();
        data = res.data;
      }
      if (!data.session) {
        // ليس مسجلًا → إلى صفحة الدخول مع رسالة خطأ
        if (here !== 'login.html') {
          window.location.replace('login.html?error=auth_required');
        }
      }
    } catch (e) {
      console.error('Auth check failed', e);
      if (here !== 'login.html') {
        window.location.replace('login.html?error=auth_failed');
      }
    }
  },

  // إذا كان المستخدم مسجلًا بالفعل وفي صفحة تسجيل الدخول → انقله للصفحة الرئيسية
  redirectIfLoggedIn: async () => {
    if (!window.supabaseClient) return;
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (data.session) {
        if (window.location.pathname.split('/').pop() === 'login.html') {
          window.location.replace('index.html');
        }
      }
    } catch (e) {
      console.error('Redirect if logged in failed', e);
    }
  },

  // تسجيل الدخول عبر جوجل
  loginWithGoogle: async () => {
    // عناصر واجهة التحميل في صفحة login.html إن وُجدت
    const overlay = document.getElementById('loadingOverlay');
    const card = document.getElementById('loginCard');
    const hideOverlay = () => {
      if (overlay) overlay.style.display = 'none';
      if (card) card.style.opacity = '';
    };

    try {
      const btn = document.getElementById('googleLoginBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'جارٍ تحويلك إلى جوجل...'; }

      // OAuth لا يعمل عند فتح الملفات مباشرة (file://)
      if (window.location.protocol === 'file:') {
        alert('تسجيل الدخول عبر جوجل لا يعمل من الملفات المحلية. شغّل خادم محلي (مثل Live Server) أو انشر التطبيق على نطاق http/https.');
        hideOverlay();
        return;
      }

      // إذا لم يتم تهيئة العميل لأي سبب، حاول التهيئة الآن
      if (!window.supabaseClient) {
        if (window.supabase) {
          window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              persistSession: true,
              detectSessionInUrl: true,
              autoRefreshToken: true,
              flowType: 'pkce',
            },
          });
        }
      }

      if (!window.supabaseClient) {
        alert('تعذّر تحميل مكتبة Supabase. تأكد من اتصال الإنترنت وعدم حظر CDN في الشبكة.');
        hideOverlay();
        return;
      }

      // Use a fixed path that matches Supabase configuration
      const redirectTo = `${window.location.origin}/index.html`;
      console.log('Google OAuth redirect URL:', redirectTo);
      
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) throw error;
    } catch (e) {
      console.error('Google sign-in failed', e);
      const errorMsg = `Google authentication error: ${e.message || e}`;
      console.error(errorMsg);
      // إظهار تنبيه ووضع رسالة الخطأ
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('error', 'auth_failed');
        window.history.replaceState({}, '', url);
      } catch {}
      alert(`تعذّر تسجيل الدخول عبر جوجل: ${e.message}\n\nتحقق من:\n1. إعدادات Google OAuth في Supabase\n2. تطابق رابط التوجيه (${typeof redirectTo !== 'undefined' ? redirectTo : window.location.origin + '/index.html'})\n3. صلاحيات المستخدم في مشروع جوجل`);
    } finally {
      const btn = document.getElementById('googleLoginBtn');
      if (btn) { btn.disabled = false; btn.textContent = 'تسجيل الدخول عبر جوجل'; }
      // إخفاء شاشة التحميل إن بقينا في نفس الصفحة ولم يحدث إعادة توجيه
      hideOverlay();
    }
  },

  // تسجيل الخروج مع مسح بيانات الجلسة المخزنة محليًا
  logoutAndRedirect: async () => {
    if (!window.supabaseClient) return;
    try {
      await window.supabaseClient.auth.signOut();
      // مسح التخزين المحلي بالكامل لتجنب آثار الجلسات القديمة
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      window.location.href = 'login.html?t=' + Date.now(); // Use timestamp to prevent caching
    }
  },
};

window.auth = auth;

// الاستماع لتغييرات حالة المصادقة للتوجيه التلقائي
if (window.supabaseClient && window.supabaseClient.auth) {
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    const here = window.location.pathname.split('/').pop();
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // بعد نجاح الدخول → انقل للصفحة الرئيسية
      const target = `${window.location.origin}/index.html`;
      if (here !== 'index.html') {
        // Add timestamp to prevent caching issues
        window.location.replace(`${target}?t=${Date.now()}`);
      }
    } else if (event === 'SIGNED_OUT') {
      // بعد تسجيل الخروج → ارجع لصفحة الدخول
      if (here !== 'login.html') {
        window.location.replace('login.html');
      }
    }
  });

  // في صفحة تسجيل الدخول: إن كان هناك جلسة فعليًا، انقل مباشرة
  (async () => {
    try {
      const here = window.location.pathname.split('/').pop();
      if (here === 'login.html') {
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) console.error('Session check error:', error);
        if (data?.session) window.location.replace(`index.html?t=${Date.now()}`);
      }
    } catch {}
  })();
}

// فرض الحماية على كل الصفحات (ما عدا صفحة الدخول) وإخفاء المحتوى لحين التحقق
(function enforceAuthEverywhere() {
  const here = window.location.pathname.split('/').pop();
  if (here === 'login.html') {
    // في صفحة الدخول: إن كان مسجلًا بالفعل، أعد التوجيه
    if (window.auth) window.auth.redirectIfLoggedIn();
    return;
  }
  // إخفاء المحتوى لمنع ظهور الصفحة قبل التحقق
  try { document.documentElement.style.visibility = 'hidden'; } catch {}
  (async () => {
    await auth.ensureAuthenticated();
    try {
      if (window.supabaseClient) {
        let { data } = await window.supabaseClient.auth.getSession();
        // في حال العودة من OAuth قد تتأخر الجلسة قليلًا
        if (!data.session) {
          const params = new URLSearchParams(window.location.search);
          const hasOAuthParams = params.has('code') || params.has('state') || window.location.hash.includes('access_token');
          if (hasOAuthParams) {
            await waitForSession(8000);
            const res = await window.supabaseClient.auth.getSession();
            data = res.data;
          }
        }
        if (data && data.session) {
          document.documentElement.style.visibility = '';
        } else {
          // إن لم توجد جلسة، أعد التوجيه صراحة
          window.location.replace('login.html?error=auth_required');
        }
      }
    } catch {
      // في حال أي خطأ، نبقى على صفحة الدخول
      window.location.replace('login.html?error=auth_failed');
    }
  })();
})();