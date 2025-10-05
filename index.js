const redirectUri = window.location.origin;

/**
 * Creates a free subscription for a new user.
 * @param {Object} user The Supabase user object.
 */
async function createFreeSubscription(user) {
  if (!user) return;

  console.log(`✨ Creating free subscription for new user: ${user.id}`);
  try {
    const { data, error } = await supabase.from('subscriptions').insert([
      {
        user_id: user.id,
        email: user.email,
        subscription_type: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: null,
      },
    ]);

    if (error) {
      if (error.code === '23505') {
        console.warn(`⚠️ Free subscription might already exist for user: ${user.id}. Ignoring error.`);
      } else {
        throw error;
      }
    } else {
      console.log(`✅ Successfully created free subscription for user: ${user.id}`);
    }
  } catch (error) {
    console.error(`❌ Error creating free subscription for user ${user.id}:`, error);
  }
}


/**
 * Redirects the user based on their role and saves their data to storage.
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

    if (error && error.code === 'PGRST116') {
      console.log('👤 New user or no profile found. Creating free subscription...');
      await createFreeSubscription(user);
      console.log('Redirecting new user to dashboard page.');
      window.location.href = 'dashboard.html';
      return;
    }
    if (error) throw error;

    if (data && data.role === 'admin') {
      console.log('👑 Admin user detected. Redirecting to admin dashboard.');
      window.location.href = 'admin.html';
    } else {
      console.log('👤 Regular user detected. Redirecting to dashboard page.');
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    window.location.href = 'dashboard.html';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔧 Initializing login page...');

  // أولاً، تحقق من وجود جلسة نشطة عند تحميل الصفحة
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error checking for active session:", sessionError);
  }

  // إذا كان المستخدم مسجل دخوله بالفعل، قم بإعادة توجيهه فوراً
  if (session) {
    console.log('✅ Active session found, redirecting...');
    await redirectUser(session.user);
    return; // أوقف تنفيذ باقي السكربت
  }

  // إذا لم تكن هناك جلسة، اعرض صفحة تسجيل الدخول وانتظر الإجراء
  console.log('No active session. Waiting for user action.');
  const pageContent = document.getElementById('page-content');
  if(pageContent) pageContent.style.opacity = 1; // إظهار المحتوى

  // إعداد زر تسجيل الدخول
  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
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
  }

  // هذا المستمع سيعمل فقط عندما يعود المستخدم من صفحة جوجل بعد المصادقة
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User has returned from OAuth. Redirecting...');
      redirectUser(session.user);
    }
  });
});
