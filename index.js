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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // خطأ يعني غالبًا عدم وجود ملف شخصي (مستخدم جديد)
    if (error && error.code === 'PGRST116') {
      console.log('👤 New user detected. Redirecting to dashboard.');
      window.location.href = 'dashboard.html';
      return;
    }
    if (error) throw error;

    // توجيه المسؤول إلى لوحة التحكم الخاصة به
    if (data && data.role === 'admin') {
      console.log('👑 Admin user detected. Redirecting to admin dashboard.');
      window.location.href = 'admin.html';
    } else {
      console.log('👤 Regular user detected. Redirecting to dashboard page.');
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error('❌ Error fetching user profile, redirecting to generic dashboard:', error);
    window.location.href = 'dashboard.html'; // توجيه احتياطي
  }
}
