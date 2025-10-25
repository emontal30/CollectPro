// Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
  // Here you could send the error to a logging service
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
  // Here you could send the error to a logging service
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing login page...');

  const googleLoginBtn = document.getElementById('google-login-btn');

  // إخفاء زر تسجيل الدخول مبدئيًا لمنع الوميض
  googleLoginBtn.style.display = 'none';

  // onAuthStateChange هو المصدر الوحيد للحقيقة
  supabase.auth.onAuthStateChange((_event, session) => {
    // يتم استدعاء هذا عند التحميل الأولي وعندما تتغير حالة المصادقة.
    if (session) {
      // المستخدم مسجل دخوله.
      console.log('✅ Active session found, redirecting...');
      redirectUser(session.user);
    } else {
      // المستخدم غير مسجل دخوله.
      console.log('No active session. Showing login UI.');
      // إظهار زر تسجيل الدخول فقط عندما نتأكد من عدم وجود جلسة
      googleLoginBtn.style.display = 'flex'; 
    }
  });

  // إعداد مستمع النقر على زر تسجيل الدخول
  googleLoginBtn.addEventListener('click', async () => {
    console.log('🔧 Google login button clicked');
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوجيه...';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account' // يجبر جوجل يسألك تختار حساب من جديد
        }
      }
    });

    if (error) {
      console.error('❌ Error initiating Google login:', error.message);
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> تسجيل الدخول باستخدام جوجل';
      alert('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  });
});

/**
 * Redirects the user based on their role.
 * @param {Object} user The Supabase user object.
 */
async function redirectUser(user) {
   if (!user) return;

   console.log('🔍 Checking user role for redirection. User ID:', user.id);

   // التحقق من صلاحيات المدير بناءً على البريد الإلكتروني بدلاً من قاعدة البيانات
   const adminEmails = ['emontal.33@gmail.com']; // يمكن إضافة المزيد من عناوين البريد الإلكتروني للمديرين
   const isAdmin = adminEmails.includes(user.email);

   if (isAdmin) {
     console.log('👑 Admin user detected. Redirecting to data entry page.');
     window.location.href = 'dashboard.html';
   } else {
     // Check for last page
     const lastPage = localStorage.getItem('lastPage');
     if (lastPage) {
       console.log('👤 Regular user detected. Redirecting to last page:', lastPage);
       window.location.href = lastPage;
     } else {
       console.log('👤 Regular user detected. Redirecting to dashboard page.');
       window.location.href = 'dashboard.html';
     }
   }
}
