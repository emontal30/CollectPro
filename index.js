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

  // إعداد رسالة تثبيت التطبيق
  setupInstallPrompt();

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

/**
 * Sets up the install prompt for PWA installation.
 */
function setupInstallPrompt() {
  const installPrompt = document.getElementById('install-prompt');
  const installBtn = document.getElementById('install-btn');
  const dismissBtn = document.getElementById('dismiss-btn');

  let deferredPrompt;

  // التحقق من دعم PWA
  if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
    console.log('📱 PWA supported, setting up install prompt...');

    // الاستماع لحدث beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      deferredPrompt = e;

      // التحقق من عدم إخفاء الرسالة مسبقاً
      const dismissed = localStorage.getItem('installPromptDismissed');
      const installed = localStorage.getItem('appInstalled');

      if (!dismissed && !installed) {
        // التحقق من أن المستخدم على جهاز محمول
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
          // تأخير إظهار الرسالة قليلاً لتحسين تجربة المستخدم
          setTimeout(() => {
            showInstallPrompt();
          }, 2000);
        }
      }
    });

    // الاستماع لحدث appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('📱 App installed successfully');
      localStorage.setItem('appInstalled', 'true');
      hideInstallPrompt();
    });

    // إعداد أزرار الرسالة
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('📱 Install prompt outcome:', outcome);
        deferredPrompt = null;

        if (outcome === 'accepted') {
          localStorage.setItem('appInstalled', 'true');
        }
      }
      hideInstallPrompt();
    });

    dismissBtn.addEventListener('click', () => {
      console.log('📱 Install prompt dismissed');
      localStorage.setItem('installPromptDismissed', 'true');
      hideInstallPrompt();
    });

  } else {
    console.log('📱 PWA not supported or not on mobile device');
  }

  function showInstallPrompt() {
    installPrompt.classList.add('show');
    console.log('📱 Showing install prompt');
  }

  function hideInstallPrompt() {
    installPrompt.classList.remove('show');
    console.log('📱 Hiding install prompt');
  }
}
